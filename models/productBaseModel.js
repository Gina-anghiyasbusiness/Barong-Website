const mongoose = require('mongoose');
const validator = require('validator');




const productBaseSchema = {

	productSku: {

		type: Number,
		unique: true
	},

	name: {

		type: String,
		required: [true, 'A product must have a name'],
		maxLength: [128, 'A product name must not be more than 128 characters long'],
		unique: true,
		trim: true,
		// validate: [validator.isAlpha, 'Product must only contain letters (SLUG)']

		validate: {

			validator: function (val) {

				return /^[A-Za-z\s]+$/.test(val);
			},

			message: 'Product name must only contain letters and spaces'
		}
	},


	description: {

		type: String,
		default: ''
	},

	originalPrice: {

		type: Number,
		required: true
	},

	currentPrice: Number,

	imageCover: {

		type: String,
		default: 'default.webp'

	},

	imageUrls: [String],

	category: {

		type: mongoose.Schema.Types.ObjectId,
		ref: 'Category'
	},

	slug: {

		type: String,
		unique: true,
		trim: true
	},



	discount:

	{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Discount',
		default: null

	}
	,


	tags: {

		type: [String],
		default: [],
		index: true
	},

	discontinued: {

		type: Boolean,
		default: false
	},

};



module.exports = productBaseSchema;
