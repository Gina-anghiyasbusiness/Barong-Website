const Enquiry = require('./../models/enquiryModel');
const catchAsync = require('./../utilities/catchAsync');


exports.createEnquiry = catchAsync(async (req, res, next) => {

	const newEnquiry = await Enquiry.create({

		name: req.body.name,
		email: req.body.email,
		enquiry: req.body.enquiryType,
		message: req.body.message
	});


	res.redirect(303, '/enquiry-success');

});
