const mongoose = require('mongoose');
const User = require('./../models/userModel')


const transactionSchema = new mongoose.Schema(
	{
		order: {

			type: mongoose.Schema.Types.ObjectId,
			ref: 'Order',
			required: true
		},

		status: {

			type: String,
			enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
			default: 'Pending'
		},

		transactionId: {

			type: String,
			required: true,
			unique: true
		},

		paidAt: {

			type: Date,
			default: Date.now
		}
	},

	{
		timestamps: true
	}

);


transactionSchema.pre(/^find/, function (next) {

	this.populate({ path: 'order', select: ' orderNum totalAmount status paymentMethod ' })

	next();
})




const Transaction = mongoose.model('Transaction', transactionSchema);


module.exports = Transaction;