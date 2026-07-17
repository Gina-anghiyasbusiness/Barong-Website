
const mongoose = require('mongoose');

const Order = require('../models/orderModel');
const Transaction = require('../models/transactionModel');
const StripePaymentLock = require('../models/stripePaymentLockModel');
const User = require('../models/userModel');
const Counter = require('../models/counterModel');

const SpecProd = require('../models/specProdModel');
const Accessory = require('../models/accessoryModel');
const Shoe = require('../models/shoeModel');
const Bag = require('../models/bagModel');

const Discount = require('../models/discountModel');
const GuestAddress = require('../models/guestAddressModel');


const Email = require('./../utilities/emailClass');

const { buildGuestOrderUrl } = require('../utilities/guestOrderAccess');

const priceAtPurchaseDiscount = require('../utilities/priceAtPurchase');
const categoryDiscountPrice = require('../utilities/categoryDiscountOnPurchase');


if (!process.env.STRIPE_SECRET_KEY) {

	throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { calculateTotals } = require('../utilities/newCheckoutTotals');





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
				variants: {
					$elemMatch: {
						_id: variantId,
						inStock: { $gte: qty }
					}
				}
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


///			////////////////////////			///////////////////			///////////////////////
/// DONT FORGET TO ADD STRIPE WEBHOOK ROUTE TO APP.JS AND INCLUDE SCRIPT IN BASE	///
///			////////////////////////			///////////////////			///////////////////////




exports.handleStripeWebhook = async (req, res) => {


	/// Declare All order variables for manipulation

	let event, cart, product, qty, variant, userId, shippingAddress, fulfilmentMethod;



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


	/// checkout cleanup


	if (event.type !== 'checkout.session.completed') {
		return res.status(200).json({
			received: true,
			ignored: true
		});
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

		try {

			const paidAmount = Number(session.amount_total);

			if (!Number.isInteger(paidAmount) || paidAmount <= 0) {
				throw new Error('Invalid Stripe payment amount');
			}

			if (!session.currency || session.currency.toUpperCase() !== 'AUD') {
				throw new Error('Invalid Stripe payment currency');
			}



			/// Retrieve the actual payment method used


			let paymentMethod = 'Stripe';

			if (session.payment_intent) {

				const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
				const actualMethod = paymentIntent.payment_method_types?.[0] || paymentIntent.charges?.data?.[0]?.payment_method_details?.type;

				if (actualMethod === 'afterpay_clearpay') paymentMethod = 'Afterpay';
			}



			/// Stripe Payment Lock ///


			let stripePaymentLock;

			const getStripeCheckoutType = () => {

				if (session.metadata?.cart) return 'logged-in-cart';
				if (session.metadata?.userId === 'guest') return 'guest-buy-now';

				return 'logged-in-buy-now';
			};

			const markStripeLockFailed = async err => {

				if (!stripePaymentLock?._id) return;

				try {

					await StripePaymentLock.findByIdAndUpdate(stripePaymentLock._id, {
						status: 'failed',
						errorMessage: err.message,
						failedAt: new Date()
					});

				} catch (lockErr) {

					console.error('Stripe payment lock failed-state update failed:', lockErr.message);
				}
			};




			/// ✅ Extract session data

			userId = session.metadata?.userId;

			fulfilmentMethod = session.metadata?.fulfilmentMethod === 'pickup' ? 'pickup' : 'delivery';

			if (!userId) {
				throw new Error('Missing metadata.userId');
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


				if (fulfilmentMethod === 'delivery') {

					if (!session.metadata?.address) throw new Error('Missing metadata.address');

					shippingAddress = JSON.parse(session.metadata.address);

					if (!shippingAddress || typeof shippingAddress !== 'object') {

						throw new Error('Invalid shipping address');
					}

					if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.postcode) {

						throw new Error('Missing shipping address fields');
					}

				} else {

					shippingAddress = undefined;
				}


			} catch (err) {

				throw new Error('Invalid Stripe metadata');
			}


			try {

				stripePaymentLock = await StripePaymentLock.create({

					stripeSessionId: session.id,
					paymentIntent: session.payment_intent,
					status: 'processing',
					checkoutType: getStripeCheckoutType(),
					customerEmail: session.customer_details?.email || session.customer_email,
					amount: paidAmount,
					currency: session.currency?.toUpperCase()
				});

			} catch (err) {

				if (err.code === 11000) {

					const existingLock = await StripePaymentLock.findOne({

						$or: [
							{ stripeSessionId: session.id },
							{ paymentIntent: session.payment_intent }
						]
					}).populate({ path: 'order', select: 'orderNum user' });

					return res.status(200).json({

						received: true,
						duplicate: true,
						lockStatus: existingLock?.status || 'unknown'
					});
				}

				throw err;
			}



			/// 🛑 Validate User type


			let user = null;

			const isGuest = userId === 'guest';


			if (!isGuest) {

				user = await User.findById(userId);

				if (!user) {

					console.error('❌ User not found:', userId);

					throw new Error('Invalid user ID');
				}

			}



			/// 🧾 Format products for Order model



			//------------------- Cart --------------------//



			if (cart) {

				if (isGuest) {

					throw new Error('Guest cart checkout is not supported');
				}

				if (!Array.isArray(cart) || cart.length === 0) {

					throw new Error('Cart metadata is empty or invalid');
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
					throw new Error('Cart contains an invalid product');
				}

				const expectedNetTotal = orderProducts.reduce((sum, item) => {
					return sum + item.priceAtPurchase * item.quantity;
				}, 0);


				if (!Number.isFinite(expectedNetTotal) || expectedNetTotal <= 0) {
					throw new Error('Invalid cart total');
				}


				const { delivery, taxAmount } = calculateTotals(expectedNetTotal, { fulfilmentMethod });

				const expectedAmount = Math.round((expectedNetTotal + delivery) * 100 + taxAmount);

				if (paidAmount !== expectedAmount) {
					throw new Error('Stripe payment amount does not match cart total');
				}


				/// 							Create Order 								///


				try {

					const counter = await Counter.findOneAndUpdate(
						{ name: 'order' },
						{ $inc: { seq: 1 } },
						{ new: true, upsert: true }
					);


					const orderNum = String(counter.seq).padStart(4, '0');


					const order = await Order.create({

						user: userId,
						product: orderProducts,
						shippingAddress,
						fulfilmentMethod,
						deliveryAmount: delivery,
						status: 'Pending',
						totalAmount: paidAmount / 100,
						paymentMethod,
						currency: session.currency.toUpperCase(),
						orderNum
					});


					const transaction = await Transaction.create({

						order: order._id,
						transactionId: session.payment_intent,
						status: 'Completed',
						paidAt: new Date()
					});


					order.transaction = transaction._id;

					await order.save();

					try {

						await StripePaymentLock.findByIdAndUpdate(stripePaymentLock._id, {
							order: order._id
						});

					} catch (lockErr) {

						console.error('Stripe payment lock order-link update failed:', lockErr.message);
					}

					for (const item of orderProducts) {

						await updateStockLevels(item.product, item.selectedVariant, item.quantity);
					}

					order.status = 'Paid';

					await order.save();

					const userUpdate = { cart: [] };

					if (fulfilmentMethod === 'delivery') {

						userUpdate.$addToSet = { addresses: shippingAddress };
					}

					try {

						await User.findByIdAndUpdate(userId, userUpdate);

					} catch (cartErr) {

						console.error('Stripe cart clear failed after paid order:', cartErr.message);
					}

					try {

						await StripePaymentLock.findByIdAndUpdate(stripePaymentLock._id, {

							status: 'completed',
							order: order._id,
							completedAt: new Date()

						});

					} catch (lockErr) {

						console.error('Stripe payment lock completed-state update failed:', lockErr.message);

					}

					const url = `${req.protocol}://${req.get('host')}/user-order-number/${orderNum}`;

					const adminOrderUrl = `${req.protocol}://${req.get('host')}/admin/be_order-page/${orderNum}`;

					res.status(200).json({ received: true });

					try {

						await new Email(user, url).orderConfirm();

					} catch (err) {

						console.error('Order confirmation email failed:', err.message);
					}

					try {

						await new Email(

							{ name: 'Ang Hiyas Orders', email: process.env.ORDER_ALERT_TO },
							adminOrderUrl
						).sendInternalOrderCreated({

							orderNum,
							orderId: order._id,
							paymentIntent: session.payment_intent,
							customerEmail: session.customer_details?.email || session.customer_email,
							totalAmount: order.totalAmount,
							currency: order.currency,
							fulfilmentMethod: order.fulfilmentMethod,
							paymentMethod: order.paymentMethod
						});

					} catch (err) {
						console.error('Internal order alert email failed:', err.message);
					}

					return;

				} catch (err) {

					console.error('Stripe order save failed:', err.message);

					throw err;

				}

			}


			//--------------- Buy It Now ----------------//


			else if (product) {

				/// mongoose check

				if (!mongoose.Types.ObjectId.isValid(product)) {

					throw new Error('Invalid product ID');
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

					throw new Error('Product not found');
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
					throw new Error('Invalid quantity');
				}



				let selectedVariant = null;


				if (productDoc.variants && productDoc.variants.length > 0) {

					const variantId = variant && variant !== 'null' ? variant : null;

					if (!variantId) {
						throw new Error('Missing product variant');
					}

					selectedVariant = productDoc.variants.id(variantId);

					if (!selectedVariant) {
						throw new Error('Invalid product variant');
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
					throw new Error('Invalid order total');
				}

				const { delivery, taxAmount } = calculateTotals(expectedNetTotal, { fulfilmentMethod });

				const expectedAmount = Math.round((expectedNetTotal + delivery) * 100 + taxAmount);

				if (paidAmount !== expectedAmount) {
					throw new Error('Stripe payment amount does not match order total');
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

							throw new Error('Missing guest address reference');
						}

						if (!mongoose.Types.ObjectId.isValid(session.client_reference_id)) {

							throw new Error('Invalid guest address reference');
						}


						guestAddress = await GuestAddress.findById(session.client_reference_id);

						if (!guestAddress) {
							throw new Error('Guest address not found');
						}
					}



					/// 💾 Save the Order to the Database


					const order = await Order.create({

						user: isGuest ? undefined : userId,
						product: orderProducts,
						shippingAddress,
						fulfilmentMethod,
						deliveryAmount: delivery,
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


					try {

						await StripePaymentLock.findByIdAndUpdate(stripePaymentLock._id, {

							status: 'completed',
							order: order._id,
							completedAt: new Date()
						});

					} catch (lockErr) {

						console.error('Stripe payment lock completed-state update failed:', lockErr.message);
					}




					const emailRecipient = isGuest ? guestAddress : user;

					const emailUrl = isGuest
						? `${req.protocol}://${req.get('host')}${buildGuestOrderUrl(order._id, guestAddress._id)}`
						: `${req.protocol}://${req.get('host')}/user-order-number/${orderNum}`;


					const adminOrderUrl = `${req.protocol}://${req.get('host')}/admin/be_order-page/${orderNum}`;

					/// Respond to Stripe before sending email so SMTP delays do not cause webhook retries.

					res.status(200).json({ received: true });

					try {

						await new Email(emailRecipient, emailUrl).orderConfirm();

					} catch (err) {

						console.error('Order confirmation email failed:', err.message);
					}

					try {

						await new Email(
							{ name: 'Ang Hiyas Orders', email: process.env.ORDER_ALERT_TO },
							adminOrderUrl
						).sendInternalOrderCreated({
							orderNum,
							orderId: order._id,
							paymentIntent: session.payment_intent,
							customerEmail: session.customer_details?.email || session.customer_email,
							totalAmount: order.totalAmount,
							currency: order.currency,
							fulfilmentMethod: order.fulfilmentMethod,
							paymentMethod: order.paymentMethod
						});

					} catch (err) {

						console.error('Internal order alert email failed:', err.message);
					}


					return;

				} catch (err) {

					console.error('Stripe order save failed:', err.message);


					throw err;
				}
			}
			throw new Error('No cart or product data found in session metadata');

		} catch (err) {

			await markStripeLockFailed(err);

			console.error('Paid Stripe webhook failed before order was fully created:', err.message);

			try {

				await new Email(
					{ name: 'Ang Hiyas Support', email: process.env.SUPPORT_ALERT_TO },
					null
				).sendStripeOrderFailureAlert({
					sessionId: session.id,
					paymentIntent: session.payment_intent,
					customerEmail: session.customer_details?.email || session.customer_email,
					amountTotal: session.amount_total,
					currency: session.currency,
					metadata: session.metadata,
					errorMessage: err.message
				});

			} catch (emailErr) {

				console.error('Stripe order failure alert email failed:', emailErr.message);
			}

			return res.status(500).send('Webhook processing failed');
		}
	}
}
