const mongoose = require('mongoose');

const stripePaymentLockSchema = new mongoose.Schema(
	{
		stripeSessionId: {
			type: String,
			required: true,
			unique: true,
			index: true
		},

		paymentIntent: {
			type: String,
			required: true,
			unique: true,
			index: true
		},

		status: {
			type: String,
			enum: ['processing', 'completed', 'failed'],
			default: 'processing'
		},

		order: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Order'
		},

		checkoutType: String,
		customerEmail: String,
		amount: Number,
		currency: String,
		errorMessage: String,
		completedAt: Date,
		failedAt: Date
	},
	{
		timestamps: true
	}
);

const StripePaymentLock = mongoose.model('StripePaymentLock', stripePaymentLockSchema);

module.exports = StripePaymentLock;