const mongoose = require('mongoose');



const orderSchema = new mongoose.Schema({

	orderNum: {

		type: Number,
		required: true,
		unique: true

	},

	user: {

		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: false
	},

	product: [
		{
			product: {

				type: mongoose.Schema.Types.ObjectId,
				refPath: 'product.productModel',
				required: true
			},

			productModel: {
				type: String,
				required: true,
				enum: ['SpecProd', 'Shoe', 'Accessory']
			},

			quantity: {
				type: Number,
				required: true,
				min: 1
			},

			//-------------------- Variant ----------------//

			selectedVariant: {

				type: mongoose.Schema.Types.ObjectId,

				required: false // optional if variant not always chosen

			},

			//-------------------- ------- ----------------//

			priceAtPurchase: {
				type: Number,
				required: true
			}
		}
	],


	shippingAddress: {


		label: String,
		number: String,
		street: String,
		city: String,
		state: String,
		postcode: String

		// country: { type: String, required: true }
	},

	status: {
		type: String,
		enum: ['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'],
		default: 'Pending'
	},


	totalAmount: {
		type: Number,
		required: true
	},


	paymentMethod: {
		type: String,
		enum: ['Stripe', 'PayPal', 'Afterpay', 'Cash'],
		required: true
	},

	currency: {

		type: String,
		default: 'AUD' // or USD, etc.
	},


	transaction: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Transaction'
	},


	discount: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Discount'
	}
},

	{
		timestamps: true
	}

)



orderSchema.pre(/^find/, function (next) {

	this
		.populate('user')
		.populate({ path: 'product.product', select: 'slug name _id imageCover color sex' })

	next();
})




const Order = mongoose.model('Order', orderSchema);


module.exports = Order;