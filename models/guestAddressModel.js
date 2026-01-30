const mongoose = require('mongoose');
const validator = require('validator');

const guestAddressSchema = new mongoose.Schema(
	{
		order: {

			type: mongoose.Schema.Types.ObjectId,
			ref: 'Order'
		},

		email: {

			type: String,
			required: [true, 'A User must have an Email'],
			lowercase: true,
			validate: [validator.isEmail, 'Please provide a valid Email']
		},

		name: {

			type: String,
			trim: true,
			required: true
		},

		number: String,
		street: String,
		city: String,
		state: String,
		postcode: String,

	},
	{
		timestamps: true
	}
);



guestAddressSchema.index({ order: 1 })



const GuestAddress = mongoose.model('GuestAddress', guestAddressSchema);


module.exports = GuestAddress;
