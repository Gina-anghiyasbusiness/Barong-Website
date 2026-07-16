const mongoose = require('mongoose');

const paypalCaptureLockSchema = new mongoose.Schema(
	{
		paypalOrderId: {
			type: String,
			required: true,
			unique: true,
			index: true
		},

		paypalCaptureId: {
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

const PayPalCaptureLock = mongoose.model('PayPalCaptureLock', paypalCaptureLockSchema);

module.exports = PayPalCaptureLock;