'use strict';

const mongoose = require('mongoose');

const validator = require('validator');


const enquirySchema = new mongoose.Schema({

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


	enquiry: {

		type: String,
		required: [true, 'An Enquiry must have an enquiry']
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




const Enquiry = mongoose.model('Enquiry', enquirySchema);

module.exports = Enquiry;