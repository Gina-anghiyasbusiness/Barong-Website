
const mongoose = require('mongoose');

const validator = require('validator');


const customizationEnquirySchema = new mongoose.Schema({

	name: {

		type: String,
		required: [true, 'An Enquiry must have a name']
	},

	phone: {

		type: String
	},


	email: {

		type: String,
		required: [true, 'An Enquiry must have an Email'],
		lowercase: true,
		validate: [validator.isEmail, 'Please provide a valid Email']
	},



	outfit: {
		type: String,
		enum: ['barong', 'filipiniana', 'both']
	},


	event: {
		type: String,
		enum: ['wedding', 'graduation', 'oath-taking', 'formal-party', 'other']
	},


	preferredContactMethod: {
		type: String,
		enum: ['call', 'text', 'email']
	},

	message: {

		type: String
	}


},

	{
		timestamps: true
	}
)




const CustomizationEnquiry = mongoose.model('CustomizationEnquiry', customizationEnquirySchema);

module.exports = CustomizationEnquiry;