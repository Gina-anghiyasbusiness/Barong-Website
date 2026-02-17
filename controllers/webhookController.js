const Order = require('../models/orderModel');
const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');
const Counter = require('../models/counterModel');
const SpecProd = require('../models/specProdModel');
const Accessory = require('../models/accessoryModel');
const Shoe = require('../models/shoeModel');
const Discount = require('../models/discountModel');
const GuestAddress = require('../models/guestAddressModel');


const Email = require('./../utilities/email');
const priceAtPurchaseDiscount = require('../utilities/priceAtPurchase');
const categoryDiscountPrice = require('../utilities/categoryDiscountOnPurchase');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



const updateStockLevels = async (productId, variantId, qty) => {


	let product = await SpecProd.findById(productId);

	if (!product) {
		product = await Shoe.findById(productId);
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

	let event, cart, product, qty, variant, userId, shippingAddress, price;


	/// 🧾 Get Stripe's signature from headers to verify the request

	const sig = req.headers['stripe-signature'];


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

		// Retrieve the actual payment method used

		let paymentMethod = 'Stripe';

		if (session.payment_intent) {

			const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
			const actualMethod = paymentIntent.payment_method_types?.[0] || paymentIntent.charges?.data?.[0]?.payment_method_details?.type;

			if (actualMethod === 'afterpay_clearpay') paymentMethod = 'Afterpay';
		}


		/// ✅ Extract session data

		userId = session.metadata.userId;


		if (!session.metadata.product) {

			/// Cart			

			cart = session.metadata?.cart ? JSON.parse(session.metadata.cart) : null;

		} else {

			/// BuyItNow	

			product = session.metadata.product;
			qty = parseInt(session.metadata.qty, 10) || 1;
			variant = session.metadata.variant;
		}


		if (!session.metadata?.address) return res.status(400).send('Missing metadata.address');
		shippingAddress = JSON.parse(session.metadata.address);



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

			const orderProducts = await Promise.all(

				cart.map(async item => {

					let productDoc = await SpecProd.findById(item.productId).populate('category');

					if (!productDoc) {
						productDoc = await Shoe.findById(item.productId).populate('category');
					}

					if (!productDoc) {
						productDoc = await Accessory.findById(item.productId).populate('category');
					}

					if (!productDoc) {
						console.error('❌ Product not found:', item.productId);
						return null;
					}


					if (!productDoc.category && !productDoc.discount) {

						price = productDoc.currentPrice;

					} else if (!productDoc.category || productDoc.discount) {

						price = await priceAtPurchaseDiscount(productDoc);

					} else if (!productDoc.category.discount) {

						price = productDoc.currentPrice;

					} else {

						price = await categoryDiscountPrice(productDoc);
					}

					return {

						product: item.productId,
						productModel: productDoc.constructor.modelName,
						quantity: item.quantity,
						priceAtPurchase: price,
						selectedVariant: item.variantId || null

					};
				}));

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
					totalAmount: session.amount_total / 100,
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

				return res.status(500).send('Webhook processing failed');
			}
		}


		//--------------- Buy It Now ----------------//


		else if (product) {

			let productDoc = await SpecProd.findById(product).populate('category');

			let productModel = 'SpecProd';

			if (!productDoc) {
				productDoc = await Shoe.findById(product).populate('category');
				if (productDoc) productModel = 'Shoe';
			}

			if (!productDoc) {
				productDoc = await Accessory.findById(product).populate('category');
				if (productDoc) productModel = 'Accessory';
			}

			if (!productDoc) {

				console.error('❌ Product not found:', product);

				return res.status(404).send('Product not found');
			}



			if (!productDoc.category && !productDoc.discount) {

				price = productDoc.currentPrice;

			} else if (!productDoc.category || productDoc.discount) {

				price = await priceAtPurchaseDiscount(productDoc);

			} else if (!productDoc.category.discount) {

				price = productDoc.currentPrice;

			} else {

				price = await categoryDiscountPrice(productDoc);
			}

			const orderProducts = [
				{
					product: product,
					productModel: productModel,
					quantity: qty,
					priceAtPurchase: price,

					//------------- Variant -------------//

					selectedVariant: variant && variant !== 'null' ? variant : null

					//------------- ------- -------------//
				}
			]


			/// 							Create Order 								///


			try {


				await updateStockLevels(product, variant && variant !== 'null' ? variant : null, qty);


				/// Create custom order number

				const counter = await Counter.findOneAndUpdate(

					{ name: 'order' },
					{ $inc: { seq: 1 } },
					{ new: true, upsert: true }
				)

				const orderNum = String(counter.seq).padStart(4, '0');



				/// 💾 Save the Order to the Database

				const order = await Order.create({

					user: isGuest ? undefined : userId,
					product: orderProducts,
					shippingAddress,
					status: 'Paid',
					totalAmount: session.amount_total / 100,
					paymentMethod,
					currency: session.currency.toUpperCase(),
					orderNum

				});


				let guestAddress;

				if (isGuest) {

					await GuestAddress.findByIdAndUpdate(session.client_reference_id, {

						order: order._id
					});

					guestAddress = await GuestAddress.findById(session.client_reference_id);

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

				return res.status(500).send('Webhook processing failed');
			}
		}
	}

	return res.status(400).send('No cart or product data found in session metadata');
}