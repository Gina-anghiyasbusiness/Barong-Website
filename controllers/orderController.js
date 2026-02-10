const Order = require('./../models/orderModel');
const Transaction = require('./../models/transactionModel');
const SpecProd = require('./../models/specProdModel');
const Accessory = require('../models/accessoryModel');
const Shoe = require('../models/shoeModel');
const Discount = require('./../models/discountModel');
const User = require('./../models/userModel');
const GuestAddress = require('../models/guestAddressModel');
const Counter = require('../models/counterModel');

const AppError = require('../utilities/appError');
const catchAsync = require('../utilities/catchAsync');
const Email = require('../utilities/emailClass');
const { overwriteMiddlewareResult } = require('mongoose');


const priceAtPurchaseDiscount = require('../utilities/priceAtPurchase');
const categoryDiscountPrice = require('../utilities/categoryDiscountOnPurchase');
const checkoutVar = require('../utilities/checkoutVariable');


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const { client, paypal } = require('./../utilities/paypalUtility');


///			////////////////////////			///////////////////			///////////////////////
/// DONT FORGET TO ADD STRIPE WEBHOOK ROUTE TO APP.JS AND INCLUDE SCRIPT IN BASE	///
///			////////////////////////			///////////////////			///////////////////////



const calculateTotals = (totalNet) => {

	const delivery = totalNet < 50 ? 10 : 0;
	const subtotal = totalNet + delivery;
	const taxAmount = Math.round(subtotal * 0.1 * 100);

	return {
		delivery,
		subtotal,
		taxAmount
	}
}


let totalNet;


///			 				Checkout Session 		 						///


///-----------			PAYPAL			-----------///




/// 			BuyItNow PayPal Payment			///



exports.buyItNowItemPayPal = catchAsync(async (req, res, next) => {

	const { product, qty, variant } = req.params;

	let buyItNowProduct = await SpecProd.findById(product).populate('category');

	if (!buyItNowProduct) {

		buyItNowProduct = await Shoe.findById(product).populate('category');
	}

	if (!buyItNowProduct) {

		buyItNowProduct = await Accessory.findById(product).populate('category');
	}

	if (!buyItNowProduct) {

		return next(new AppError('Product not found', 404));
	}

	/// Find variant (rest of your code...)



	/// Find variant (using your method from Stripe)

	const buyItNowVariant = buyItNowProduct.variants.find(v => v.id === variant);

	if (!buyItNowVariant) return next(new AppError('No variant found', 400));



	/// Calculate discount/price 


	let totalNet;


	totalNet = await checkoutVar(buyItNowProduct, totalNet);



	/// Calculate totals (delivery/tax)


	const { delivery, subtotal, taxAmount } = calculateTotals(totalNet * qty);



	/// Prepare PayPal order


	const request = new paypal.orders.OrdersCreateRequest();

	request.prefer('return=representation');

	request.requestBody({

		intent: 'CAPTURE',

		purchase_units: [{

			amount: {
				currency_code: 'AUD',
				value: (((totalNet * qty) + delivery + taxAmount) / 10).toFixed(2)
			},

			description: `${buyItNowProduct.name} x ${qty}`

			/// Add shipping info here if required by PayPal for your region

		}]
	});

	try {

		const order = await client().execute(request);


		/// Return PayPal order ID to frontend

		res.status(201).json({ orderID: order.result.id });

	} catch (err) {

		next(err);
	}
});





/// 			Cart PayPal Payment			///



exports.cartItemsPayPal = catchAsync(async (req, res, next) => {

	const user = await User.findById(req.user.id)
		.populate('cart.product')
		.select('cart addresses ');

	if (!user || user.cart.length === 0) return next(new AppError('Cart is empty', 400));

	let price;
	let overallArr = [];
	let overallPrice = 0;


	await Promise.all(user.cart.map(async item => {

		const qty = item.quantity

		let product = await SpecProd.findById(item.product.id).populate('category');

		if (!product) {
			product = await Shoe.findById(item.product.id).populate('category');
		}

		if (!product) {
			product = await Accessory.findById(item.product.id).populate('category');
		}

		if (!product) {
			return next(new AppError('Product not found', 404));
		}



		if (!product.discount && !product.category) {

			price = product.currentPrice;

		}

		else if (!product.category || product.discount) {

			price = await priceAtPurchaseDiscount(product);

		}

		else if (!product.category.discount) {

			price = product.currentPrice;

		}

		else {

			price = await categoryDiscountPrice(product);
		}


		overallArr.push(price * qty);

	}))



	for (let i = 0; i < overallArr.length; i++) {

		overallPrice += overallArr[i];
	}



	const { delivery, subtotal, taxAmount } = calculateTotals(overallPrice);


	// /// Prepare PayPal order


	const request = new paypal.orders.OrdersCreateRequest();

	request.prefer('return=representation');

	request.requestBody({

		intent: 'CAPTURE',

		purchase_units: [{

			amount: {
				currency_code: 'AUD',
				value: (((overallPrice) + delivery + (taxAmount / 100))).toFixed(2)
			},

			description: `${user.cart[0].product.name} and ${user.cart.length - 1} more`
		}]
	});

	try {

		const order = await client().execute(request);

		/// Return PayPal order ID to frontend

		res.status(201).json({ orderID: order.result.id });

	} catch (err) {

		next(err);
	}
});









/// 			Capture PayPal Order			///


exports.capturePayPalOrder = catchAsync(async (req, res, next) => {

	const { product, qty, variant } = req.body;

	const isCartCheckout = !product || !qty || !variant;


	let user = null;

	if (req.user && req.user.id) {

		user = await User.findById(req.user.id);
	}


	const orderID = req.params.orderID;

	const request = new paypal.orders.OrdersCaptureRequest(orderID);

	request.requestBody({});

	const capture = await client().execute(request);

	const orderData = capture.result;

	const amount = Number(orderData.purchase_units[0].payments.captures[0].amount.value);

	const currency = orderData.purchase_units[0].payments.captures[0].amount.currency_code;


	const payer = orderData.payer;

	const shipping = orderData.purchase_units[0].shipping;

	const suburbCity = `${shipping?.address?.address_line_1} : ${shipping?.address?.admin_area_2}`

	const shippingAddress = {

		label: 'PayPal',
		number: '',
		street: shipping?.address?.address_line_2 || '',
		city: suburbCity,
		state: shipping?.address?.admin_area_1 || '',
		postcode: shipping?.address?.postal_code || '',
	};


	let order, priceAtPurchase;


	if (isCartCheckout) {

		const cartArray = (await Promise.all(user.cart.map(async item => {

			if (!item.product || !item.product._id) return null;


			///			PriceAtPurchase Calc			///

			let product = await SpecProd.findById(item.product.id).populate('category');

			if (!product) {
				product = await Shoe.findById(item.product.id).populate('category');
			}

			if (!product) {
				product = await Accessory.findById(item.product.id).populate('category');
			}

			if (!product) {
				return next(new AppError('Product not found', 404));
			}



			priceAtPurchase = await checkoutVar(product, priceAtPurchase);

			return {

				product: item.product._id.toString(),

				selectedVariant: item.variant?._id?.toString(),

				quantity: item.quantity,

				priceAtPurchase

			};

		}))).filter(Boolean); // ⬅️ prevent nulls in DB!


		await Promise.all(cartArray.map(async item => {

			await updateStockLevels(item.product, item.selectedVariant, item.quantity);
		}));


		const counter = await Counter.findOneAndUpdate(

			{ name: 'order' },
			{ $inc: { seq: 1 } },
			{ new: true, upsert: true }
		);

		const orderNum = String(counter.seq).padStart(4, '0');


		order = await Order.create({

			orderNum,
			user: req.user.id,
			product: cartArray,
			shippingAddress,
			status: 'Paid',
			totalAmount: amount,
			paymentMethod: 'PayPal',
			currency
		});


	} else {


		priceAtPurchase = await checkoutVar(foundProduct, priceAtPurchase);


		if (typeof priceAtPurchase !== 'number' || isNaN(priceAtPurchase)) {

			return next(new AppError('Invalid price at purchase', 500));
		}


		await updateStockLevels(product, variant, qty);


		const counter = await Counter.findOneAndUpdate(

			{ name: 'order' },
			{ $inc: { seq: 1 } },
			{ new: true, upsert: true }
		);

		const orderNum = String(counter.seq).padStart(4, '0');



		/// order	

		order = await Order.create({

			orderNum,
			user: req.user ? req.user.id : undefined,
			product: [{
				product,
				quantity: qty,
				selectedVariant: selectedVariant._id,
				priceAtPurchase
			}],
			shippingAddress,
			status: 'Paid',
			totalAmount: amount,
			paymentMethod: 'PayPal',
			currency
		});


		if (!user) {

			await GuestAddress.create({

				order: order._id,
				email: payer.email_address,
				name: `${payer.name.given_name} ${payer.name.surname}`,
				number: '',
				street: shipping?.address?.address_line_2 || '',
				city: suburbCity,
				state: shipping?.address?.admin_area_1 || '',
				postcode: shipping?.address?.postal_code || ''

			});
		}

	}




	/// transaction	


	const captureData = orderData.purchase_units[0].payments.captures[0];


	if (!captureData) {

		return next(new AppError('PayPal did not return captured data', 500));
	}

	const transaction = await Transaction.create({

		order: order._id,
		transactionId: captureData.id,
		status: captureData.status === 'COMPLETED' ? 'Completed' : 'Pending',
		paidAt: new Date(captureData.create_time)
	});

	order.transaction = transaction._id;

	await order.save();

	const guestUser = {

		email: payer.email_address,
		name: `${payer.name.given_name} ${payer.name.surname}`
	};

	const urlConfirm = `${req.protocol}://${req.get('host')}/guest-order-number/${order._id}`;

	await new Email(guestUser, urlConfirm).orderConfirm();


	if (isCartCheckout) {

		await User.findByIdAndUpdate(

			user._id,
			{ cart: [] },
			{ new: true });
	}

	res.status(200).json({ success: true, order, transaction });
});




//




///--------			STRIPE			--------///


/// 			Buy It Now Item 				///





exports.buyItNowItem = catchAsync(async (req, res, next) => {


	/// get values

	const { product, qty, variant } = req.params;
	const user = await User.findById(req.body.user).select('addresses');



	/// find Product and Variant	


	let buyItNowProduct = await SpecProd.findById(product).populate('category');

	if (!buyItNowProduct) {
		buyItNowProduct = await Shoe.findById(product).populate('category');
	}

	if (!buyItNowProduct) {
		buyItNowProduct = await Accessory.findById(product).populate('category');
	}

	if (!buyItNowProduct) {
		return next(new AppError('Product not found', 404));
	}


	const buyItNowVariant = buyItNowProduct.variants.find(v => v.id === variant);


	if (!user || !buyItNowProduct || !buyItNowVariant) {

		return next(new AppError('Missing required data', 400));

	}

	/// find the discount 	


	if (!buyItNowProduct.discount && !buyItNowProduct.category) {

		totalNet = buyItNowProduct.currentPrice;

	}

	else if (!buyItNowProduct.category || buyItNowProduct.discount) {

		totalNet = await priceAtPurchaseDiscount(buyItNowProduct);

	}

	else if (!buyItNowProduct.category.discount) {

		totalNet = buyItNowProduct.currentPrice;

	}

	else {

		totalNet = await categoryDiscountPrice(buyItNowProduct);
	}






	/// Calculate the totals

	const { delivery, subtotal, taxAmount } = calculateTotals(totalNet * qty);



	/// get address for delivery

	const defaultAddress = user.addresses?.find(addr => addr.isDefault);
	const shippingAddress = defaultAddress || user.addresses[0];



	/// throw error if no user or product

	if (!user || !buyItNowProduct) return next(new AppError('No Products Present', 400));


	const line_items = [
		{
			price_data: {
				currency: 'aud',
				unit_amount: totalNet * 100,

				product_data: {
					name: buyItNowProduct.name,
					description: buyItNowProduct.description,

					/// ONLY WORKS IN PRODUCTION - USE PRODUCTION URL

					images: [
						`http://127.0.0.1:5000/img/product_imgs/${buyItNowProduct.imageCover}`
					]
				}
			},
			quantity: qty
		}
	];



	/// 		Add delivery		///

	if (delivery > 0) {

		line_items.push({

			price_data: {
				currency: 'aud',
				unit_amount: delivery * 100,

				product_data: {
					name: 'Delivery Fee',
					description: 'Flat rate delivery under $50'
				}
			},
			quantity: 1
		});
	} else line_items.push({

		price_data: {
			currency: 'aud',
			unit_amount: 0,

			product_data: {
				name: 'Delivery Fee',
				description: 'Orders over $50 qualify for free delivery'
			}
		},

		quantity: 1
	});




	///	 Add tax 	 ///


	line_items.push(
		{
			price_data: {
				currency: 'aud',
				unit_amount: taxAmount,
				product_data: {
					name: 'GST',
					description: '10% Goods & Services Tax'
				}
			},
			quantity: 1
		});




	/// create session


	const session = await stripe.checkout.sessions.create({

		payment_method_types: ['card'],
		mode: 'payment',

		success_url: `${req.protocol}://${req.get('host')}/order-success`,
		cancel_url: `${req.protocol}://${req.get('host')}/my-account/${user.id}`,

		customer_email: req.user.email,
		client_reference_id: req.user.id,

		/////////////////////

		line_items,


		///	 metadata instead		

		metadata: {

			userId: req.user.id,
			product: product.toString(),
			qty: qty.toString(),
			variant: buyItNowVariant.id.toString(),
			address: JSON.stringify(shippingAddress)
		}
	});



	res.status(200).json({

		status: 'success',
		session
	});

})




//------------		BuyItNow-GUEST  Item		-------------//



exports.buyItNowGuestItem = catchAsync(async (req, res, next) => {


	const { guestAddressId } = req.body;

	const { product, qty, variant } = req.params;



	let buyItNowProduct = await SpecProd.findById(product).populate('category');

	if (!buyItNowProduct) {
		buyItNowProduct = await Shoe.findById(product).populate('category');
	}

	if (!buyItNowProduct) {
		buyItNowProduct = await Accessory.findById(product).populate('category');
	}

	if (!buyItNowProduct) {
		return next(new AppError('Product not found', 404));
	}
	const buyItNowVariant = buyItNowProduct.variants.find(v => v.id === variant);


	if (!buyItNowProduct || !buyItNowVariant) {

		return next(new AppError('Missing required data', 400));

	}




	const guestAddress = await GuestAddress.findById(guestAddressId).lean();

	if (!guestAddress) return next(new AppError('Guest address not found', 404));




	let totalNet;

	if (!buyItNowProduct.discount && !buyItNowProduct.category) {

		totalNet = buyItNowProduct.currentPrice;
	}

	else if (!buyItNowProduct.category || buyItNowProduct.discount) {

		totalNet = await priceAtPurchaseDiscount(buyItNowProduct);
	}

	else if (!buyItNowProduct.category.discount) {

		totalNet = buyItNowProduct.currentPrice;
	}

	else {

		totalNet = await categoryDiscountPrice(buyItNowProduct);
	}

	const { delivery, subtotal, taxAmount } = calculateTotals(totalNet * qty);


	// Line items
	const line_items = [
		{
			price_data: {
				currency: 'aud',
				unit_amount: totalNet * 100,
				product_data: {
					name: buyItNowProduct.name,
					description: buyItNowProduct.description,
					images: [`http://127.0.0.1:5000/img/product_imgs/${buyItNowProduct.imageCover}`]
				}
			},
			quantity: qty
		},
		{
			price_data: {
				currency: 'aud',
				unit_amount: delivery * 100,
				product_data: {
					name: 'Delivery Fee',
					description: delivery > 0
						? 'Flat rate delivery under $50'
						: 'Orders over $50 qualify for free delivery'
				}
			},
			quantity: 1
		},
		{
			price_data: {
				currency: 'aud',
				unit_amount: taxAmount,
				product_data: {
					name: 'GST',
					description: '10% Goods & Services Tax'
				}
			},
			quantity: 1
		}
	];


	/// Create Stripe session for 'guest'



	const session = await stripe.checkout.sessions.create(
		{
			payment_method_types: ['card'],
			mode: 'payment',

			success_url: `${req.protocol}://${req.get('host')}/order-success-guest`,
			cancel_url: `${req.protocol}://${req.get('host')}/guest-cancel`,

			customer_email: undefined,
			client_reference_id: guestAddressId,

			line_items,

			metadata: {

				userId: 'guest',
				product: product.toString(),
				qty: qty.toString(),
				variant: buyItNowVariant.id.toString(),
				address: JSON.stringify(guestAddress)
			}
		});


	res.status(200).json({
		status: 'success',
		session
	});
})










//----------------			Buy Carts Items 		 	---------------//



exports.buyCartItems = catchAsync(async (req, res, next) => {

	const user = await User.findById(req.user.id)
		.select('cart addresses'); // ✅ Remove .populate()


	for (const item of user.cart) {

		let foundProduct = await SpecProd.findById(item.product).populate('category');

		if (!foundProduct) {
			foundProduct = await Shoe.findById(item.product).populate('category');
		}

		if (!foundProduct) {
			foundProduct = await Accessory.findById(item.product).populate('category');
		}

		item.product = foundProduct;
		item.markModified('product');
	}

	const defaultAddress = user.addresses?.find(addr => addr.isDefault);
	const shippingAddress = defaultAddress || user.addresses[0];

	if (!user || user.cart.length === 0) return next(new AppError('Cart is empty', 400));

	let price;
	let overallArr = [];
	let overallPrice = 0;

	const line_items = await Promise.all(user.cart.map(async item => {

		const qty = Number(item.quantity) || 1;


		const product = item.product;

		if (!product) return null;



		///							Cart Checkout								///


		if (!product.category && !product.discount) {

			price = product.currentPrice;

		}
		else if (!product.category) {

			price = await priceAtPurchaseDiscount(product);
		}
		else if (!product.category.discount) {

			price = product.currentPrice;
		}
		else {

			price = await categoryDiscountPrice(product);
		}

		overallArr.push(price * qty);

		return {

			price_data: {

				currency: 'aud',
				unit_amount: price * 100,

				product_data: {

					name: product.name,
					description: product.description
				}
			},

			quantity: qty || 1

		};
	}));


	for (let i = 0; i < overallArr.length; i++) {

		overallPrice += overallArr[i];
	}


	const { delivery, subtotal, taxAmount } = calculateTotals(overallPrice);


	/// 		Add delivery		///

	if (delivery > 0) {

		line_items.push({

			price_data: {
				currency: 'aud',
				unit_amount: delivery * 100,

				product_data: {
					name: 'Delivery Fee',
					description: 'Flat rate delivery under $50'
				}
			},

			quantity: 1
		});
	}



	///	 Add tax 	 ///

	line_items.push({
		price_data: {
			currency: 'aud',
			unit_amount: taxAmount, // 450
			product_data: {
				name: 'GST',
				description: '10% Goods & Services Tax'
			}
		},
		quantity: 1
	});




	/// 			webhook local session				///


	const session = await stripe.checkout.sessions.create({

		payment_method_types: ['card'],
		mode: 'payment',

		success_url: `${req.protocol}://${req.get('host')}/order-success`,
		cancel_url: `${req.protocol}://${req.get('host')}/my-account/${user.id}`,

		customer_email: req.user.email,
		client_reference_id: req.user.id,

		line_items,


		/// metadata instead


		metadata: {

			userId: req.user.id,

			cart: JSON.stringify(

				user.cart.map(item => ({

					productId: item.product._id.toString(),

					//-----------  Variants ------------//


					variantId: item.variant?._id?.toString(),


					//-----------  ------- ------------//

					quantity: item.quantity,

					price: item.product.currentPrice

				}))

			),
			address: JSON.stringify(shippingAddress)
		}
	});

	res.status(200).json({

		status: 'success',
		session
	});
});







//----------------- Add address as part of order	-----------------//



exports.addAddressToUser = catchAsync(async (req, res, next) => {

	const { label, number, street, city, state, postcode } = req.body;

	if (!street || !city || !postcode) return next(new AppError('Please fill in street, city, and postcode.', 401));

	const newAddress = { label, number, street, city, state, postcode, isDefault: true };

	if (!newAddress) return next(new AppError('No Address Provided', 401));

	const user = await User.findById(req.user.id).select('addresses');


	const isDuplicate = user.addresses.some(

		addr => addr.label === label || (

			addr.number === number && addr.street.toLowerCase() === street.toLowerCase()
		)
	);

	let updatedUser;

	if (!isDuplicate) {

		await User.updateOne(

			{ _id: req.user.id, 'addresses.isDefault': true },
			{ $set: { 'addresses.$[elem].isDefault': false } },
			{
				arrayFilters: [{ 'elem.isDefault': true }],
				multi: true
			}
		);

		updatedUser = await User.findByIdAndUpdate(

			req.user.id,

			{ $push: { addresses: newAddress } },
			{ new: true, runValidators: true }
		);


		return res.status(200).json({
			status: 'success',
			message: 'Address added',
			updatedUser

		});
	}

	res.status(200).json({
		status: 'success',
		message: 'Duplicate address'
	});
})




exports.addAddressToUserGuest = catchAsync(async (req, res, next) => {

	const { email, name, number, street, city, state, postcode } = req.body;

	if (!name || !number || !street || !city || !state || !postcode) {

		return next(new AppError('All address fields are required.', 400));
	}

	const guestAddress = await GuestAddress.create(
		{
			email,
			name,
			number,
			street,
			city,
			state,
			postcode
		});

	res.status(200).json({
		status: 'success',
		message: 'Guest address saved',
		guestAddressId: guestAddress._id
	});

})








exports.updateUserOrder = catchAsync(async (req, res, next) => {

	const orderNum = req.params.ordernum;

	const orderStatus = req.params.orderstatus;
	const transactionStatus = req.params.transstatus;
	const addressString = req.params.address;

	const address = JSON.parse(addressString);


	if (!orderStatus || !transactionStatus || !address || !orderNum) {

		return next(new AppError('Missing Order Data... Please Try Again!', 404))
	}


	const order = await Order.findOneAndUpdate({ orderNum }, { status: orderStatus, shippingAddress: address });

	const transactionNum = order.transaction;

	await Transaction.findByIdAndUpdate(transactionNum, { status: transactionStatus });

	res.status(200).json({
		status: 'success',

	});

})

