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
		trim: true,

		validate: {

			validator: function (val) {
				return /^[\p{L}\p{N}][\p{L}\p{N}\s&'",.\-()]*$/u.test(val.trim());
			},

			message: 'Product name contains unsupported characters'
		}
	},


	description: {
		type: String,
		required: [true, 'A product must have a description'],
		trim: true,
		default: '',
		maxLength: [150, 'A product description must not be more than 150 characters long']
	},

	originalPrice: {
		type: Number,
		required: [true, 'A product must have an original price'],
		min: [1, 'Price must be 1 or above']
	},

	currentPrice: {
		type: Number,
		min: [1, 'Price must be 0 or above']
	},

	imageCover: {

		type: String,
		default: 'default.webp'

	},

	imageUrls: {
		type: [String],
		default: []
	},

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
