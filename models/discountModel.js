const mongoose = require('mongoose');


const discountSchema = new mongoose.Schema(
	{
		code: {

			type: String,
			required: [true, 'Discount must have a code'],
			unique: true,
			uppercase: true,
			trim: true
		},

		percentage: {

			type: Number,
			min: 0,
			max: 100
		},

		amount: Number,


		// appliesToProducts: [
		// 	{
		// 		type: mongoose.Schema.Types.ObjectId,
		// 		ref: 'Product'
		// 	}
		// ],

		appliesToCategories: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Category'
			}
		],

		startDate: {

			type: Date,
			default: Date.now
		},

		endDate: Date,

		active: {
			type: Boolean,
			default: true
		}

	},

	{ timestamps: true }

);




const Discount = mongoose.model('Discount', discountSchema);


module.exports = Discount;