const Enquiry = require('./../models/enquiryModel');
const CustomizationEnquiry = require('./../models/customizationEnquiryModel');
const catchAsync = require('./../utilities/catchAsync');


exports.createEnquiry = catchAsync(async (req, res, next) => {

	await Enquiry.create({

		name: req.body.name,
		phone: req.body.phone,
		email: req.body.email,
		enquiry: req.body.enquiry,
		preferredContactMethod: req.body.preferredContactMethod,
		message: req.body.message
	});


	res.redirect(303, '/enquiry-success');

});




exports.createCustomizationEnquiry = catchAsync(async (req, res, next) => {

	await CustomizationEnquiry.create({

		name: req.body.name,
		phone: req.body.phone,
		email: req.body.email,
		outfit: req.body.outfit,
		event: req.body.event,
		message: req.body.message,
		preferredContactMethod: req.body.preferredContactMethod,

	});


	res.redirect(303, '/enquiry-success');

});

