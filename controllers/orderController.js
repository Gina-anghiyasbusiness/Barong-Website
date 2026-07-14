const mongoose = require('mongoose');

const Order = require('./../models/orderModel');
const Transaction = require('./../models/transactionModel');
const SpecProd = require('./../models/specProdModel');
const Accessory = require('../models/accessoryModel');
const Bag = require('../models/bagModel');
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

const { client, paypal } = require('./../utilities/paypalUtility');

if (!process.env.STRIPE_SECRET_KEY) {

	throw new Error('STRIPE_SECRET_KEY environment variable is required');
}


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const { calculateTotals } = require('../utilities/newCheckoutTotals');



exports.getStripeOrderStatus = catchAsync(async (req, res, next) => {

	const { sessionId } = req.params;

	const session = await stripe.checkout.sessions.retrieve(sessionId);

	if (session.payment_status !== 'paid' || !session.payment_intent) {
		return res.status(200).json({ status: 'payment_pending' });
	}

	const transaction = await Transaction.findOne({
		transactionId: session.payment_intent
	});

	if (!transaction || !transaction.order) {
		return res.status(200).json({ status: 'processing' });
	}

	const order = await Order.findById(transaction.order);

	if (!order) {
		return res.status(200).json({ status: 'processing' });
	}

	if (!order.user || !order.user.equals(req.user._id)) {
		return next(new AppError('You do not have permission to view this order', 403));
	}

	return res.status(200).json({
		status: 'confirmed',
		orderUrl: `/user-order-number/${order.orderNum}`
	});
});


exports.getStripeGuestOrderStatus = catchAsync(async (req, res, next) => {

	const { sessionId } = req.params;

	const session = await stripe.checkout.sessions.retrieve(sessionId);

	if (session.payment_status !== 'paid' || !session.payment_intent) {
		return res.status(200).json({ status: 'payment_pending' });
	}

	const transaction = await Transaction.findOne({
		transactionId: session.payment_intent
	});

	if (!transaction || !transaction.order) {
		return res.status(200).json({ status: 'processing' });
	}

	const order = await Order.findById(transaction.order);

	if (!order) {
		return res.status(200).json({ status: 'processing' });
	}

	return res.status(200).json({
		status: 'confirmed',
		orderUrl: `/guest-order-number/${order._id}`
	});
});

///			////////////////////////			///////////////////			///////////////////////
/// DONT FORGET TO ADD STRIPE WEBHOOK ROUTE TO APP.JS AND INCLUDE SCRIPT IN BASE	///
///			////////////////////////			///////////////////			///////////////////////



const updateStockLevels = async (productId, variantId, qty) => {

	const productModels = [SpecProd, Shoe, Bag, Accessory];

	for (const ProductModel of productModels) {

		const product = await ProductModel.findById(productId).select('variants');

		if (!product) continue;

		if (!product.variants || product.variants.length === 0 || !variantId) {
			return;
		}

		const result = await ProductModel.updateOne(
			{
				_id: productId,
				'variants._id': variantId,
				'variants.inStock': { $gte: qty }
			},
			{
				$inc: { 'variants.$.inStock': -qty }
			}
		);

		if (result.modifiedCount === 0) {
			throw new Error('Not enough stock');
		}

		return;
	}

	throw new Error('Product not found');
};




///			 				Checkout Session 		 						///


///-----------			PAYPAL			-----------///




/// 			BuyItNow PayPal Payment			///



exports.buyItNowItemPayPal = catchAsync(async (req, res, next) => {

	const { product, qty, variant } = req.params;

	const fulfilmentMethod = req.body.fulfilmentMethod === 'pickup' ? 'pickup' : 'delivery';


	let buyItNowProduct = await SpecProd.findById(product).populate('category');

	if (!buyItNowProduct) {

		buyItNowProduct = await Shoe.findById(product).populate('category');
	}

	if (!buyItNowProduct) {

		buyItNowProduct = await Bag.findById(product).populate('category');
	}

	if (!buyItNowProduct) {

		buyItNowProduct = await Accessory.findById(product).populate('category');
	}

	if (!buyItNowProduct) {

		return next(new AppError('Product not found', 404));
	}


	/// qtyNum

	const qtyNum = Number(qty);

	if (!Number.isInteger(qtyNum) || qtyNum < 1) {

		return next(new AppError('Invalid quantity', 400));
	}


	/// Find variant (using your method from Stripe)

	let buyItNowVariant = null;


	if (buyItNowProduct.variants && buyItNowProduct.variants.length > 0) {

		const actualVariant = (variant && variant !== 'null') ? variant : null;

		if (actualVariant) {

			buyItNowVariant = buyItNowProduct.variants.find(v => v.id === actualVariant);

			if (!buyItNowVariant) {

				return next(new AppError('Variant not found', 404));
			}
		}
	}




	/// Calculate discount/price 


	let totalNet;


	totalNet = await checkoutVar(buyItNowProduct, totalNet);


	if (typeof totalNet !== 'number' || Number.isNaN(totalNet) || totalNet <= 0) {

		return next(new AppError('Invalid product price', 400));
	}



	/// Calculate totals (delivery/tax)


	const { delivery, subtotal, taxAmount } = calculateTotals(totalNet * qtyNum, { fulfilmentMethod });



	/// Prepare PayPal order


	const request = new paypal.orders.OrdersCreateRequest();

	request.prefer('return=representation');

	request.requestBody({

		intent: 'CAPTURE',

		purchase_units: [{

			amount: {
				currency_code: 'AUD',
				value: ((totalNet * qtyNum) + delivery + (taxAmount / 100)).toFixed(2)
			},

			description: `${buyItNowProduct.name} x ${qtyNum}`

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

	const fulfilmentMethod = req.body.fulfilmentMethod === 'pickup' ? 'pickup' : 'delivery';

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
			product = await Bag.findById(item.product.id).populate('category');
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


	if (typeof overallPrice !== 'number' || Number.isNaN(overallPrice) || overallPrice <= 0) {

		return next(new AppError('Invalid cart total', 400));
	}



	const { delivery, subtotal, taxAmount } = calculateTotals(overallPrice, { fulfilmentMethod });


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

	const { product, qty, variant, fulfilmentMethod: fulfilmentMethodRaw } = req.body;

	const fulfilmentMethod = fulfilmentMethodRaw === 'pickup' ? 'pickup' : 'delivery';


	const isGuestRoute = req.originalUrl.includes('capture-order-guest');

	const isCartCheckout = !isGuestRoute && !product && !qty;

	const isBuyItNowCheckout = Boolean(product && qty);


	if (isGuestRoute && (!product || !qty)) {

		return next(new AppError('Guest PayPal checkout requires product and quantity', 400));
	}

	if (!isGuestRoute && !isCartCheckout && !isBuyItNowCheckout) {

		return next(new AppError('Invalid PayPal checkout data', 400));
	}


	if (isBuyItNowCheckout) {

		if (!mongoose.Types.ObjectId.isValid(product)) {

			return next(new AppError('Invalid product ID', 400));
		}

		const qtyNum = Number(qty);

		if (!Number.isInteger(qtyNum) || qtyNum < 1) {

			return next(new AppError('Invalid quantity', 400));
		}
	}


	let user = null;

	if (req.user && req.user.id) {

		user = await User.findById(req.user.id)
			.populate('cart.product')
			.select('cart addresses name email');
	}



	if (isCartCheckout && !user) {

		return next(new AppError('Please log in to complete PayPal cart checkout', 401));
	}


	if (isCartCheckout && (!user.cart || user.cart.length === 0)) {

		return next(new AppError('Cart is empty', 400));
	}




	const orderID = req.params.orderID;

	if (!orderID || typeof orderID !== 'string') {

		return next(new AppError('Missing PayPal order ID', 400));
	}


	const request = new paypal.orders.OrdersCaptureRequest(orderID);

	request.requestBody({});

	const capture = await client().execute(request);

	const orderData = capture.result;


	const captureData = orderData.purchase_units?.[0]?.payments?.captures?.[0];


	if (!captureData) {

		return next(new AppError('PayPal did not return captured payment data', 500));
	}

	if (!captureData.id) {

		return next(new AppError('PayPal capture ID is missing', 500));
	}

	if (captureData.status !== 'COMPLETED') {

		return next(new AppError('PayPal payment was not completed', 400));
	}



	const amount = Number(captureData.amount?.value);

	const currency = captureData.amount?.currency_code;


	if (!Number.isFinite(amount) || amount <= 0) {

		return next(new AppError('Invalid PayPal payment amount', 400));
	}

	if (currency !== 'AUD') {

		return next(new AppError('Invalid PayPal payment currency', 400));
	}



	const payer = orderData.payer;

	const shipping = orderData.purchase_units?.[0]?.shipping;

	const suburbCity = `${shipping?.address?.address_line_1} : ${shipping?.address?.admin_area_2}`;



	const shippingAddress = {

		label: 'PayPal',
		number: '',
		street: shipping?.address?.address_line_2 || '',
		city: suburbCity,
		state: shipping?.address?.admin_area_1 || '',
		postcode: shipping?.address?.postal_code || '',
	};


	if (fulfilmentMethod === 'delivery' && (!shippingAddress.city || !shippingAddress.state || !shippingAddress.postcode)) {

		return next(new AppError('PayPal shipping address is incomplete', 400));
	}


	/// check for existing order


	const existingTransaction = await Transaction.findOne({
		transactionId: captureData.id
	});

	if (existingTransaction) {

		return next(new AppError('This PayPal payment has already been processed', 409));
	}


	let order, priceAtPurchase;


	if (isCartCheckout) {

		try {


			const cartArray = (await Promise.all(user.cart.map(async item => {

				if (!item.product || !item.product._id) return null;


				///			PriceAtPurchase Calc			///

				let product = await SpecProd.findById(item.product.id).populate('category');

				if (!product) {
					product = await Shoe.findById(item.product.id).populate('category');
				}

				if (!product) {
					product = await Bag.findById(item.product.id).populate('category');
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
					productModel: product.constructor.modelName,
					selectedVariant: item.variant?._id?.toString(),
					quantity: item.quantity,
					priceAtPurchase
				};

			}))).filter(Boolean); // ⬅️ prevent nulls in DB!



			/// check expected amounts


			if (cartArray.length === 0) {

				return next(new AppError('Cart is empty', 400));
			}


			const expectedNetTotal = cartArray.reduce((sum, item) => {

				return sum + item.priceAtPurchase * item.quantity;

			}, 0);

			const { delivery, taxAmount } = calculateTotals(expectedNetTotal, { fulfilmentMethod });

			const expectedAmount = Number((expectedNetTotal + delivery + taxAmount / 100).toFixed(2));

			if (Math.abs(amount - expectedAmount) > 0.01) {
				return next(new AppError('PayPal payment amount does not match order total', 400));
			}


			for (const item of cartArray) {

				await updateStockLevels(item.product, item.selectedVariant, item.quantity);
			}


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
				shippingAddress: fulfilmentMethod === 'delivery' ? shippingAddress : undefined,
				fulfilmentMethod,
				deliveryAmount: delivery,
				status: 'Paid',
				totalAmount: amount,
				paymentMethod: 'PayPal',
				currency
			});



		} catch (err) {

			console.error('=== CART ERROR ===', err.message);

			console.error(err.stack);

			return next(err);
		}

	} else {

		const actualVariant = (variant && variant !== 'null') ? variant : null;

		try {


			/// 1. Find the product

			let foundProduct = await SpecProd.findById(product).populate('category');
			if (!foundProduct) foundProduct = await Shoe.findById(product).populate('category');
			if (!foundProduct) foundProduct = await Bag.findById(product).populate('category');
			if (!foundProduct) foundProduct = await Accessory.findById(product).populate('category');
			if (!foundProduct) return next(new AppError('Product not found', 404));


			/// 2. Find the variant

			const selectedVariant = actualVariant ? foundProduct.variants?.find(v => v.id === actualVariant) : null;

			if (foundProduct.variants && foundProduct.variants.length > 0) {

				if (!actualVariant) {

					return next(new AppError('Missing product variant', 400));
				}

				if (!selectedVariant) {

					return next(new AppError('Invalid product variant', 400));
				}
			}


			/// 3. Calculate price

			priceAtPurchase = await checkoutVar(foundProduct, priceAtPurchase);

			if (typeof priceAtPurchase !== 'number' || isNaN(priceAtPurchase)) {

				return next(new AppError('Invalid price at purchase', 500));
			}


			const qtyNum = Number(qty);

			if (!Number.isInteger(qtyNum) || qtyNum < 1) {

				return next(new AppError('Invalid quantity', 400));
			}



			const expectedNetTotal = priceAtPurchase * qtyNum;


			const { delivery, taxAmount } = calculateTotals(expectedNetTotal, { fulfilmentMethod });

			const expectedAmount = Number((expectedNetTotal + delivery + taxAmount / 100).toFixed(2));

			if (Math.abs(amount - expectedAmount) > 0.01) {
				return next(new AppError('PayPal payment amount does not match order total', 400));
			}




			/// 4. Update stock (only if variant exists)


			if (selectedVariant) {

				await updateStockLevels(product, selectedVariant._id.toString(), qtyNum);

			}

			/// 5. Create order number

			const counter = await Counter.findOneAndUpdate(
				{ name: 'order' },
				{ $inc: { seq: 1 } },
				{ new: true, upsert: true }
			);
			const orderNum = String(counter.seq).padStart(4, '0');


			/// 6. Create order

			order = await Order.create({
				orderNum,
				user: req.user ? req.user.id : undefined,
				product: [{
					product,
					productModel: foundProduct.constructor.modelName,
					quantity: qtyNum,
					selectedVariant: selectedVariant ? selectedVariant._id : null,
					priceAtPurchase
				}],
				shippingAddress: fulfilmentMethod === 'delivery' ? shippingAddress : undefined,
				fulfilmentMethod,
				deliveryAmount: delivery,
				status: 'Paid',
				totalAmount: amount,
				paymentMethod: 'PayPal',
				currency
			});


			/// 7. Guest address (if no logged-in user)

			if (!user) {
				await GuestAddress.create({
					order: order._id,
					email: payer.email_address,
					name: `${payer.name.given_name} ${payer.name.surname}`,
					number: '',
					street: fulfilmentMethod === 'delivery' ? shipping?.address?.address_line_2 || '' : '',
					city: fulfilmentMethod === 'delivery' ? suburbCity : '',
					state: fulfilmentMethod === 'delivery' ? shipping?.address?.admin_area_1 || '' : '',
					postcode: fulfilmentMethod === 'delivery' ? shipping?.address?.postal_code || '' : ''
				});
			}
		}

		catch (err) {
			console.error('=== BUYITNOW ERROR ===', err.message);
			console.error(err.stack);
			return next(err);
		}
	}


	/// transaction	



	const transaction = await Transaction.create({

		order: order._id,
		transactionId: captureData.id,
		status: captureData.status === 'COMPLETED' ? 'Completed' : 'Pending',
		paidAt: new Date(captureData.create_time)
	});

	order.transaction = transaction._id;

	await order.save();


	if (user) {

		const urlConfirm = `${req.protocol}://${req.get('host')}/user-order-number/${order.orderNum}`;
		await new Email(user, urlConfirm).orderConfirm();

	} else {

		const guestUser = {
			email: payer.email_address,
			name: `${payer.name.given_name} ${payer.name.surname}`

		};

		const urlConfirm = `${req.protocol}://${req.get('host')}/guest-order-number/${order._id}`;

		await new Email(guestUser, urlConfirm).orderConfirm();
	}


	if (isCartCheckout) {

		await User.findByIdAndUpdate(

			user._id,
			{ cart: [] },
			{ new: true });
	}

	res.status(200).json({ success: true, order, transaction });
});



///------------------------------	--------------	--------------------------------///
///------------------------------			STRIPE			--------------------------------///
///------------------------------	--------------	--------------------------------///


/// 			Buy It Now Item 				///

exports.buyItNowItem = catchAsync(async (req, res, next) => {

	const { product, qty, variant } = req.params;


	if (!mongoose.Types.ObjectId.isValid(product)) {

		return next(new AppError('Invalid product ID', 400));
	}


	const user = await User.findById(req.user.id).select('addresses');

	if (!user) {

		return next(new AppError('User not found', 404));
	}


	const qtyNum = Number(qty);

	if (!Number.isInteger(qtyNum) || qtyNum < 1) {

		return next(new AppError('Invalid quantity', 400));
	}



	/// find Product and Variant	

	let buyItNowProduct = await SpecProd.findById(product).populate('category');

	if (!buyItNowProduct) {

		buyItNowProduct = await Shoe.findById(product).populate('category');
	}

	if (!buyItNowProduct) {

		buyItNowProduct = await Bag.findById(product).populate('category');
	}

	if (!buyItNowProduct) {

		buyItNowProduct = await Accessory.findById(product).populate('category');
	}

	if (!buyItNowProduct) {

		return next(new AppError('Product not found', 404));
	}


	let buyItNowVariant = null;

	if (buyItNowProduct.variants && buyItNowProduct.variants.length > 0) {

		buyItNowVariant = buyItNowProduct.variants.find(v => v.id === variant);

		if (!buyItNowVariant) {

			return next(new AppError('Variant not found', 404));
		}

		if (buyItNowVariant.inStock < qtyNum) {

			return next(new AppError(`Not enough ${buyItNowVariant.size} in stock! Only ${buyItNowVariant.inStock} left.`, 400));
		}

	}


	let totalNet;


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


	if (typeof totalNet !== 'number' || Number.isNaN(totalNet) || totalNet <= 0) {

		return next(new AppError('Invalid product price', 400));
	}



	/// Calculate the totals

	const fulfilmentMethod = req.body.fulfilmentMethod === 'pickup' ? 'pickup' : 'delivery';

	const { delivery } = calculateTotals(totalNet * qtyNum, { fulfilmentMethod });



	/// get address for delivery

	const defaultAddress = user.addresses?.find(addr => addr.isDefault);
	const shippingAddress = defaultAddress || user.addresses[0];

	if (fulfilmentMethod === 'delivery' && !shippingAddress) {

		return next(new AppError('Please add a delivery address before checkout', 400));
	}


	const line_items = [
		{
			price_data: {
				currency: 'aud',
				unit_amount: Math.round(totalNet * 100),

				product_data: {
					name: buyItNowVariant ? `${buyItNowProduct.name} - Size ${buyItNowVariant.size}` : buyItNowProduct.name,
					description: buyItNowProduct.description,

					/// ONLY WORKS IN PRODUCTION - USE PRODUCTION URL

					images: [
						`${process.env.SITE_URL}img/product_imgs/${buyItNowProduct.imageCover}`
					]

				}
			},
			quantity: qtyNum
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
					description: 'Flat rate delivery under $150'
				}
			},

			quantity: 1
		});
	}


	/// create session


	const session = await stripe.checkout.sessions.create({

		payment_method_types: ['card', 'afterpay_clearpay'],
		mode: 'payment',

		...(fulfilmentMethod === 'delivery' && {
			shipping_address_collection: {
				allowed_countries: ['AU'],
			}
		}),


		success_url: `${req.protocol}://${req.get('host')}/order-success?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${req.protocol}://${req.get('host')}/my-account/${user.id}`,

		customer_email: req.user.email,
		client_reference_id: req.user.id,

		/////////////////////

		line_items,


		///	 metadata instead		

		metadata: {

			userId: req.user.id,
			fulfilmentMethod,
			product: product.toString(),
			qty: qtyNum.toString(),
			variant: buyItNowVariant ? buyItNowVariant.id.toString() : null,
			size: buyItNowVariant ? buyItNowVariant.size : '',
			address: fulfilmentMethod === 'delivery' ? JSON.stringify(shippingAddress) : ''
		}
	});



	res.status(200).json({

		status: 'success',
		session
	});

})



//------------		BuyItNow-GUEST  Item		-------------//



exports.buyItNowGuestItem = catchAsync(async (req, res, next) => {

	const { guestAddressId, fulfilmentMethod: fulfilmentMethodRaw } = req.body;

	const fulfilmentMethod = fulfilmentMethodRaw === 'pickup' ? 'pickup' : 'delivery';


	const { product, qty, variant } = req.params;


	if (!mongoose.Types.ObjectId.isValid(guestAddressId)) {

		return next(new AppError('Invalid guest address ID', 400));
	}

	if (!mongoose.Types.ObjectId.isValid(product)) {

		return next(new AppError('Invalid product ID', 400));
	}


	const qtyNum = Number(qty);

	if (!Number.isInteger(qtyNum) || qtyNum < 1) {

		return next(new AppError('Invalid quantity', 400));
	}


	let buyItNowProduct = await SpecProd.findById(product).populate('category');

	if (!buyItNowProduct) {
		buyItNowProduct = await Shoe.findById(product).populate('category');
	}

	if (!buyItNowProduct) {
		buyItNowProduct = await Bag.findById(product).populate('category');
	}

	if (!buyItNowProduct) {
		buyItNowProduct = await Accessory.findById(product).populate('category');
	}

	if (!buyItNowProduct) {
		return next(new AppError('Product not found', 404));
	}

	let buyItNowVariant = null;


	if (buyItNowProduct.variants && buyItNowProduct.variants.length > 0) {

		buyItNowVariant = buyItNowProduct.variants.find(v => v.id === variant);

		if (!buyItNowVariant) {
			return next(new AppError('Variant not found', 404));
		}

		if (buyItNowVariant.inStock < qtyNum) {

			return next(new AppError(`Not enough ${buyItNowVariant.size} in stock! Only ${buyItNowVariant.inStock} left.`, 400));
		}
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


	if (typeof totalNet !== 'number' || Number.isNaN(totalNet) || totalNet <= 0) {

		return next(new AppError('Invalid product price', 400));
	}

	const { delivery } = calculateTotals(totalNet * qtyNum, { fulfilmentMethod });


	/// Line items

	const line_items = [
		{
			price_data: {
				currency: 'aud',
				unit_amount: Math.round(totalNet * 100),
				product_data: {
					name: buyItNowVariant ? `${buyItNowProduct.name} - Size ${buyItNowVariant.size}` : buyItNowProduct.name,
					description: buyItNowProduct.description,
					images: [`${process.env.SITE_URL}img/product_imgs/${buyItNowProduct.imageCover}`]
				}
			},
			quantity: qtyNum
		}

	];

	if (delivery > 0) {

		line_items.push({

			price_data: {
				currency: 'aud',
				unit_amount: delivery * 100,

				product_data: {
					name: 'Delivery Fee',
					description: 'Flat rate delivery under $150'
				}
			},
			quantity: 1
		});
	}

	try {
		const session = await stripe.checkout.sessions.create({

			payment_method_types: ['card', 'afterpay_clearpay'],
			mode: 'payment',

			...(fulfilmentMethod === 'delivery' && {
				shipping_address_collection: {
					allowed_countries: ['AU'],
				}
			}),

			success_url: `${req.protocol}://${req.get('host')}/order-success-guest?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${req.protocol}://${req.get('host')}/guest-cancel`,

			customer_email: undefined,
			client_reference_id: guestAddressId,

			line_items,

			metadata: {
				userId: 'guest',
				fulfilmentMethod,
				product: product.toString(),
				qty: qtyNum.toString(),
				variant: buyItNowVariant ? buyItNowVariant.id.toString() : 'null',
				size: buyItNowVariant ? buyItNowVariant.size : '',
				address: fulfilmentMethod === 'delivery' ? JSON.stringify(guestAddress) : ''
			}
		});

		res.status(200).json({
			status: 'success',
			session
		});

	} catch (stripeError) {
		console.error('STRIPE ERROR:', stripeError);
		console.error('STRIPE ERROR MESSAGE:', stripeError.message);
		console.error('STRIPE ERROR TYPE:', stripeError.type);
		return next(new AppError(`Stripe error: ${stripeError.message}`, 500));
	}
});


//----------------			Buy Carts Items 		 	---------------//


exports.buyCartItems = catchAsync(async (req, res, next) => {

	const user = await User.findById(req.user.id).select('cart addresses');

	if (!user) {

		return next(new AppError('User not found', 404));
	}

	if (!user.cart || user.cart.length === 0) {

		return next(new AppError('Cart is empty', 400));
	}

	const fulfilmentMethod = req.body.fulfilmentMethod === 'pickup' ? 'pickup' : 'delivery';


	for (const item of user.cart) {

		if (!mongoose.Types.ObjectId.isValid(item.product)) {

			return next(new AppError('Invalid cart product ID', 400));
		}

		let foundProduct = await SpecProd.findById(item.product).populate('category');

		if (!foundProduct) {
			foundProduct = await Shoe.findById(item.product).populate('category');
		}

		if (!foundProduct) {
			foundProduct = await Bag.findById(item.product).populate('category');
		}

		if (!foundProduct) {
			foundProduct = await Accessory.findById(item.product).populate('category');
		}


		if (!foundProduct) {

			return next(new AppError('A product in your cart is no longer available', 404));
		}


		item.product = foundProduct;
		item.markModified('product');

	}


	const defaultAddress = user.addresses?.find(addr => addr.isDefault);

	const shippingAddress = defaultAddress || user.addresses[0];

	if (fulfilmentMethod === 'delivery' && !shippingAddress) {

		return next(new AppError('Please add a delivery address before checkout', 400));
	}


	let overallArr = [];
	let overallPrice = 0;


	const line_items = await Promise.all(user.cart.map(async item => {

		const qty = Number(item.quantity);

		if (!Number.isInteger(qty) || qty < 1) {

			return next(new AppError('Invalid cart item quantity', 400));
		}


		const product = item.product;

		if (!product) {

			return next(new AppError('A product in your cart is no longer available', 404));
		}


		let selectedVariant = null;

		if (product.variants && product.variants.length > 0) {

			if (!item.variant) {

				return next(new AppError('Cart item variant is missing', 400));
			}

			selectedVariant = product.variants.id(item.variant);

			if (!selectedVariant) {

				return next(new AppError('Variant not found in product', 404));
			}

			if (selectedVariant.inStock < qty) {

				return next(new AppError(`Not enough ${selectedVariant.size} in stock! Only ${selectedVariant.inStock} left.`, 400));
			}
		}



		let price;

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

		if (typeof price !== 'number' || Number.isNaN(price) || price <= 0) {

			return next(new AppError('Invalid cart item price', 400));
		}


		overallArr.push(price * qty);

		return {

			price_data: {

				currency: 'aud',
				unit_amount: Math.round(price * 100),
				product_data: {
					name: selectedVariant ? `${product.name} - Size ${selectedVariant.size}` : product.name,
					description: product.description
				}
			},
			quantity: qty

		};
	}));


	for (let i = 0; i < overallArr.length; i++) {

		overallPrice += overallArr[i];
	}

	if (typeof overallPrice !== 'number' || Number.isNaN(overallPrice) || overallPrice <= 0) {

		return next(new AppError('Invalid cart total', 400));
	}


	const { delivery } = calculateTotals(overallPrice, { fulfilmentMethod });


	/// 		Add delivery		///

	if (delivery > 0) {

		line_items.push({

			price_data: {
				currency: 'aud',
				unit_amount: delivery * 100,
				product_data: {
					name: 'Delivery Fee',
					description: 'Flat rate delivery under $150'
				}
			},
			quantity: 1
		});
	}



	/// 			webhook local session				///


	const session = await stripe.checkout.sessions.create({


		payment_method_types: ['card', 'afterpay_clearpay'],
		mode: 'payment',

		...(fulfilmentMethod === 'delivery' && {
			shipping_address_collection: {
				allowed_countries: ['AU'],
			}
		}),
		success_url: `${req.protocol}://${req.get('host')}/order-success?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${req.protocol}://${req.get('host')}/my-account/${user.id}`,

		customer_email: req.user.email,
		client_reference_id: req.user.id,

		line_items,


		/// metadata instead


		metadata: {

			userId: req.user.id,

			fulfilmentMethod,

			cart: JSON.stringify(

				user.cart.map(item => ({

					productId: item.product._id.toString(),

					//-----------  Variants ------------//

					variantId: item.variant ? item.variant.toString() : 'null',

					//-----------  ------- ------------//

					size: item.variant && item.product.variants
						? item.product.variants.id(item.variant)?.size || ''
						: '',

					quantity: item.quantity,

					price: item.product.currentPrice

				}))

			),
			address: fulfilmentMethod === 'delivery' ? JSON.stringify(shippingAddress) : ''
		}
	});

	res.status(200).json({

		status: 'success',
		session
	});
});






//----------------- Add address as part of order	-----------------//



exports.addAddressToUser = catchAsync(async (req, res, next) => {
	const {
		label,
		number,
		street,
		city,
		state,
		postcode,
		fulfilmentMethod: fulfilmentMethodRaw
	} = req.body;

	const fulfilmentMethod = fulfilmentMethodRaw === 'pickup' ? 'pickup' : 'delivery';

	if (
		fulfilmentMethod === 'delivery' &&
		(!street || !city || !postcode)
	) {
		return next(new AppError('Please fill in street, city, and postcode.', 401));
	}

	if (fulfilmentMethod === 'pickup') {
		return res.status(200).json({
			status: 'success',
			message: 'Local pickup selected'
		});
	}


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
	const {
		email,
		name,
		number,
		street,
		city,
		state,
		postcode,
		fulfilmentMethod: fulfilmentMethodRaw
	} = req.body;

	const fulfilmentMethod = fulfilmentMethodRaw === 'pickup' ? 'pickup' : 'delivery';

	if (!email || !name) {
		return next(new AppError('Name and email are required.', 400));
	}

	if (
		fulfilmentMethod === 'delivery' &&
		(!number || !street || !city || !state || !postcode)
	) {
		return next(new AppError('All address fields are required.', 400));
	}

	const guestAddress = await GuestAddress.create({
		email,
		name,
		number: fulfilmentMethod === 'delivery' ? number : '',
		street: fulfilmentMethod === 'delivery' ? street : '',
		city: fulfilmentMethod === 'delivery' ? city : '',
		state: fulfilmentMethod === 'delivery' ? state : '',
		postcode: fulfilmentMethod === 'delivery' ? postcode : ''
	});

	res.status(200).json({
		status: 'success',
		message: 'Guest address saved',
		guestAddressId: guestAddress._id
	});
});








exports.updateUserOrder = catchAsync(async (req, res, next) => {

	const orderNum = req.params.ordernum;

	const orderStatus = req.params.orderstatus;
	const transactionStatus = req.params.transstatus;
	const addressString = decodeURIComponent(req.params.address);


	let address;

	try {

		address = JSON.parse(addressString);

	} catch (err) {

		return next(new AppError('Invalid shipping address data', 400));
	}



	if (!orderStatus || !transactionStatus || !address || !orderNum) {

		return next(new AppError('Missing Order Data... Please Try Again!', 404))
	}

	if (typeof address !== 'object' || Array.isArray(address)) {
		return next(new AppError('Invalid shipping address data', 400));
	}

	if (!address.street || !address.city || !address.postcode) {
		return next(new AppError('Shipping address is incomplete', 400));
	}



	const allowedOrderStatuses = Order.schema.path('status').enumValues;

	const allowedTransactionStatuses = Transaction.schema.path('status').enumValues;


	if (!allowedOrderStatuses.includes(orderStatus)) {
		return next(new AppError('Invalid order status', 400));
	}

	if (!allowedTransactionStatuses.includes(transactionStatus)) {
		return next(new AppError('Invalid transaction status', 400));
	}


	const order = await Order.findOneAndUpdate(
		{ orderNum },
		{ status: orderStatus, shippingAddress: address },
		{ new: true, runValidators: true }
	);

	if (!order) return next(new AppError('Order not found', 404));



	const transactionNum = order.transaction;

	if (!transactionNum) return next(new AppError('Order transaction not found', 404));

	const transaction = await Transaction.findByIdAndUpdate(
		transactionNum,
		{ status: transactionStatus },
		{ new: true, runValidators: true }
	);

	if (!transaction) return next(new AppError('Transaction not found', 404));


	res.status(200).json({
		status: 'success',

	});

})

