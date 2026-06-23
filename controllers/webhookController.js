
const mongoose = require('mongoose');

const Order = require('../models/orderModel');
const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');
const Counter = require('../models/counterModel');

const SpecProd = require('../models/specProdModel');
const Accessory = require('../models/accessoryModel');
const Shoe = require('../models/shoeModel');
const Bag = require('../models/bagModel');

const Discount = require('../models/discountModel');
const GuestAddress = require('../models/guestAddressModel');


const Email = require('./../utilities/emailClass');
const priceAtPurchaseDiscount = require('../utilities/priceAtPurchase');
const categoryDiscountPrice = require('../utilities/categoryDiscountOnPurchase');


if (!process.env.STRIPE_SECRET_KEY) {

	throw new Error('STRIPE_SECRET_KEY environment variable is required');
}


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



const calculateTotals = (totalNet) => {

	const delivery = totalNet < 50 ? 10 : 0;
	const subtotal = totalNet + delivery;
	const taxAmount = Math.round(subtotal * 0.1 * 100);

	return {
		delivery,
		subtotal,
		taxAmount
	};
}


const updateStockLevels = async (productId, variantId, qty) => {


	let product = await SpecProd.findById(productId);

	if (!product) {
		product = await Shoe.findById(productId);
	}

	if (!product) {
		product = await Bag.findById(productId);
	}

	if (!product) {
		product = await Accessory.findById(productId);
	}

	if (!product) {
		throw new Error('Product not found');
	}

	if (!product.variants || product.variants.length === 0 || !variantId) {
		return;
	}

	const variant = product.variants.id(variantId); // ✅ Now safe to call

	if (!variant) throw new Error('Variant not found');
	if (variant.inStock < qty) throw new Error('Not enough stock');

	variant.inStock -= qty;

	await product.save();
};



///			////////////////////////			///////////////////			///////////////////////
/// DONT FORGET TO ADD STRIPE WEBHOOK ROUTE TO APP.JS AND INCLUDE SCRIPT IN BASE	///
///			////////////////////////			///////////////////			///////////////////////




exports.handleStripeWebhook = async (req, res) => {


	/// Declare All order variables for manipulation

	let event, cart, product, qty, variant, userId, shippingAddress;



	/// 🧾 Get Stripe's signature from headers to verify the request

	const sig = req.headers['stripe-signature'];

	if (!process.env.STRIPE_WEBHOOK_SECRET) {

		return res.status(500).send('Stripe webhook secret is not configured');
	}



	/// ✅ Verify the request body and signature are valid					


	try {

		event = stripe.webhooks.constructEvent(
			req.body,
			sig,
			process.env.STRIPE_WEBHOOK_SECRET
		);

	} catch (err) {

		console.error('❌ Webhook signature verification failed:', err.message);

		return res.status(400).send(`Webhook Error: ${err.message}`);
	}



	/// ✅ Check which type of event was received		///


	if (event.type === 'checkout.session.completed') {

		const session = event.data.object;


		/// guard check


		if (!session.payment_intent) {
			return res.status(400).send('Missing payment intent');
		}

		const existingTransaction = await Transaction.findOne({
			transactionId: session.payment_intent
		});

		if (existingTransaction) {
			return res.status(200).json({
				received: true,
				duplicate: true
			});
		}

		/// check if paid


		if (session.payment_status !== 'paid') {
			return res.status(400).send('Stripe session is not paid');
		}



		const paidAmount = Number(session.amount_total);



		if (!Number.isInteger(paidAmount) || paidAmount <= 0) {
			return res.status(400).send('Invalid Stripe payment amount');
		}

		if (!session.currency || session.currency.toUpperCase() !== 'AUD') {
			return res.status(400).send('Invalid Stripe payment currency');
		}


		/// Retrieve the actual payment method used

		let paymentMethod = 'Stripe';

		if (session.payment_intent) {

			const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
			const actualMethod = paymentIntent.payment_method_types?.[0] || paymentIntent.charges?.data?.[0]?.payment_method_details?.type;

			if (actualMethod === 'afterpay_clearpay') paymentMethod = 'Afterpay';
		}


		/// ✅ Extract session data

		userId = session.metadata?.userId;

		if (!userId) {
			return res.status(400).send('Missing metadata.userId');
		}

		try {

			if (!session.metadata.product) {

				/// Cart			

				cart = session.metadata?.cart ? JSON.parse(session.metadata.cart) : null;

			} else {

				/// BuyItNow	

				product = session.metadata.product;
				qty = session.metadata.qty;
				variant = session.metadata.variant;
			}

			if (!session.metadata?.address) return res.status(400).send('Missing metadata.address');

			shippingAddress = JSON.parse(session.metadata.address);


			if (!shippingAddress || typeof shippingAddress !== 'object') {

				return res.status(400).send('Invalid shipping address');
			}

			if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.postcode) {
				return res.status(400).send('Missing shipping address fields');
			}


		} catch (err) {

			return res.status(400).send('Invalid Stripe metadata');
		}



		/// 🛑 Validate User type


		let user = null;

		const isGuest = userId === 'guest';


		if (!isGuest) {

			user = await User.findById(userId);

			if (!user) {

				console.error('❌ User not found:', userId);

				return res.status(400).send('Invalid user ID');
			}

		}



		/// 🧾 Format products for Order model



		//------------------- Cart --------------------//



		if (cart) {

			if (isGuest) {

				return res.status(400).send('Guest cart checkout is not supported');
			}

			if (!Array.isArray(cart) || cart.length === 0) {

				return res.status(400).send('Cart metadata is empty or invalid');
			}


			const orderProducts = await Promise.all(

				cart.map(async item => {

					/// mongoose check

					if (!mongoose.Types.ObjectId.isValid(item.productId)) {

						return null;
					}


					let productDoc = await SpecProd.findById(item.productId).populate('category');



					if (!productDoc) {
						productDoc = await Shoe.findById(item.productId).populate('category');
					}

					if (!productDoc) {
						productDoc = await Bag.findById(item.productId).populate('category');
					}

					if (!productDoc) {
						productDoc = await Accessory.findById(item.productId).populate('category');
					}

					if (!productDoc) {
						console.error('❌ Product not found:', item.productId);
						return null;
					}


					let itemPrice;


					if (!productDoc.category && !productDoc.discount) {


						itemPrice = productDoc.currentPrice;

					} else if (!productDoc.category || productDoc.discount) {

						itemPrice = await priceAtPurchaseDiscount(productDoc);

					} else if (!productDoc.category.discount) {

						itemPrice = productDoc.currentPrice;

					} else {

						itemPrice = await categoryDiscountPrice(productDoc);
					}



					const qtyNum = Number(item.quantity);

					if (!Number.isInteger(qtyNum) || qtyNum < 1) {
						return null;
					}



					let selectedVariant = null;

					if (productDoc.variants && productDoc.variants.length > 0) {

						const variantId = item.variantId || null;

						if (!variantId) {
							return null;
						}

						selectedVariant = productDoc.variants.id(variantId);

						if (!selectedVariant) {
							return null;
						}
					}



					return {

						product: item.productId,
						productModel: productDoc.constructor.modelName,
						quantity: qtyNum,
						priceAtPurchase: itemPrice,
						selectedVariant: selectedVariant ? selectedVariant._id : null


					};
				}));



			/// Expected total comparison


			if (orderProducts.some(item => !item)) {
				return res.status(400).send('Cart contains an invalid product');
			}

			const expectedNetTotal = orderProducts.reduce((sum, item) => {
				return sum + item.priceAtPurchase * item.quantity;
			}, 0);


			if (!Number.isFinite(expectedNetTotal) || expectedNetTotal <= 0) {
				return res.status(400).send('Invalid cart total');
			}


			const { delivery, taxAmount } = calculateTotals(expectedNetTotal);

			const expectedAmount = Math.round((expectedNetTotal + delivery) * 100 + taxAmount);

			if (paidAmount !== expectedAmount) {
				return res.status(400).send('Stripe payment amount does not match cart total');
			}


			/// 							Create Order 								///


			try {

				await Promise.all(orderProducts.map(item =>

					updateStockLevels(item.product, item.selectedVariant, item.quantity)

				));


				/// create an order number independant of ordering 	///


				/// find orderNum in counter


				const counter = await Counter.findOneAndUpdate(

					{ name: 'order' },
					{ $inc: { seq: 1 } },
					{ new: true, upsert: true }
				)

				const orderNum = String(counter.seq).padStart(4, '0');




				/// 💾 Save the Order to the Database


				const order = await Order.create({

					user: userId,
					product: orderProducts,
					shippingAddress,
					status: 'Paid',
					totalAmount: paidAmount / 100,
					paymentMethod,
					currency: session.currency.toUpperCase(),
					orderNum

				});


				/// 💳 Save the Transaction to the Database


				const transaction = await Transaction.create({

					order: order._id,
					transactionId: session.payment_intent,
					status: 'Completed',
					paidAt: new Date()

				});


				/// 🔗 Link transaction to order


				order.transaction = transaction._id;

				await order.save();


				/// 🧹 Optional: Clear user cart

				await User.findByIdAndUpdate(userId,
					{
						cart: [],
						$addToSet: { addresses: shippingAddress }
					}
				);



				///			Send Order confirmation Email			///


				const url = `${req.protocol}://${req.get('host')}/user-order-number/${orderNum}`

				await new Email(user, url).orderConfirm();


				res.status(200).json({ received: true });

				return;


			} catch (err) {

				console.error('❌ Failed to save order or transaction:', err);

				if (['Product not found', 'Variant not found', 'Not enough stock'].includes(err.message)) {

					return res.status(400).send(err.message);
				}

				return res.status(500).send('Webhook processing failed');
			}
		}


		//--------------- Buy It Now ----------------//


		else if (product) {

			/// mongoose check

			if (!mongoose.Types.ObjectId.isValid(product)) {

				return res.status(400).send('Invalid product ID');
			}

			let productDoc = await SpecProd.findById(product).populate('category');

			let productModel = 'SpecProd';

			if (!productDoc) {
				productDoc = await Shoe.findById(product).populate('category');
				if (productDoc) productModel = 'Shoe';
			}

			if (!productDoc) {
				productDoc = await Bag.findById(product).populate('category');
				if (productDoc) productModel = 'Bag';
			}

			if (!productDoc) {
				productDoc = await Accessory.findById(product).populate('category');
				if (productDoc) productModel = 'Accessory';
			}

			if (!productDoc) {

				console.error('❌ Product not found:', product);

				return res.status(404).send('Product not found');
			}


			let price;


			if (!productDoc.category && !productDoc.discount) {

				price = productDoc.currentPrice;

			} else if (!productDoc.category || productDoc.discount) {

				price = await priceAtPurchaseDiscount(productDoc);

			} else if (!productDoc.category.discount) {

				price = productDoc.currentPrice;

			} else {

				price = await categoryDiscountPrice(productDoc);
			}



			/// qtyNum


			const qtyNum = Number(qty);

			if (!Number.isInteger(qtyNum) || qtyNum < 1) {
				return res.status(400).send('Invalid quantity');
			}



			let selectedVariant = null;


			if (productDoc.variants && productDoc.variants.length > 0) {

				const variantId = variant && variant !== 'null' ? variant : null;

				if (!variantId) {
					return res.status(400).send('Missing product variant');
				}

				selectedVariant = productDoc.variants.id(variantId);

				if (!selectedVariant) {
					return res.status(400).send('Invalid product variant');
				}
			}



			const orderProducts = [
				{
					product: product,
					productModel: productModel,
					quantity: qtyNum,
					priceAtPurchase: price,

					//------------- Variant -------------//

					selectedVariant: selectedVariant ? selectedVariant._id : null

					//------------- ------- -------------//
				}
			]




			const expectedNetTotal = price * qtyNum;

			if (!Number.isFinite(expectedNetTotal) || expectedNetTotal <= 0) {
				return res.status(400).send('Invalid order total');
			}


			const { delivery, taxAmount } = calculateTotals(expectedNetTotal);

			const expectedAmount = Math.round((expectedNetTotal + delivery) * 100 + taxAmount);

			if (paidAmount !== expectedAmount) {
				return res.status(400).send('Stripe payment amount does not match order total');
			}



			/// 							Create Order 								///


			try {


				await updateStockLevels(product, selectedVariant ? selectedVariant._id : null, qtyNum);


				/// Create custom order number

				const counter = await Counter.findOneAndUpdate(

					{ name: 'order' },
					{ $inc: { seq: 1 } },
					{ new: true, upsert: true }
				)

				const orderNum = String(counter.seq).padStart(4, '0');


				/// Validate guest address before creating order


				let guestAddress;

				if (isGuest) {

					if (!session.client_reference_id) {

						return res.status(400).send('Missing guest address reference');
					}

					if (!mongoose.Types.ObjectId.isValid(session.client_reference_id)) {

						return res.status(400).send('Invalid guest address reference');
					}


					guestAddress = await GuestAddress.findById(session.client_reference_id);

					if (!guestAddress) {
						return res.status(400).send('Guest address not found');
					}
				}



				/// 💾 Save the Order to the Database


				const order = await Order.create({

					user: isGuest ? undefined : userId,
					product: orderProducts,
					shippingAddress,
					status: 'Paid',
					totalAmount: paidAmount / 100,
					paymentMethod,
					currency: session.currency.toUpperCase(),
					orderNum

				});


				if (isGuest) {

					await GuestAddress.findByIdAndUpdate(session.client_reference_id, {

						order: order._id
					});
				}


				/// 💳 Save the Transaction to the Database

				const transaction = await Transaction.create({

					order: order._id,
					transactionId: session.payment_intent,
					status: 'Completed',
					paidAt: new Date()

				});

				/// 🔗 Link transaction to order  

				order.transaction = transaction._id;

				await order.save();



				///			Send Order confirmation Email			///


				if (!isGuest) {

					const url = `${req.protocol}://${req.get('host')}/user-order-number/${orderNum}`

					await new Email(user, url).orderConfirm();

				} else {

					/// user orderId for guests

					const url = `${req.protocol}://${req.get('host')}/guest-order-number/${order._id}`;

					await new Email(guestAddress, url).orderConfirm();
				}


				res.status(200).json({ received: true });
				return;

			} catch (err) {

				console.error('❌ Failed to save order or transaction:', err);

				if (['Product not found', 'Variant not found', 'Not enough stock'].includes(err.message)) {

					return res.status(400).send(err.message);
				}

				return res.status(500).send('Webhook processing failed');
			}
		}
	}

	return res.status(400).send('No cart or product data found in session metadata');
}