const Enquiry = require('./../models/enquiryModel');
const CustomizationEnquiry = require('./../models/customizationEnquiryModel');

const Email = require('./../utilities/emailClass');
const catchAsync = require('./../utilities/catchAsync');
const AppError = require('./../utilities/appError');


exports.createEnquiry = catchAsync(async (req, res, next) => {


	/// Hidden field check

	if (req.body.website && req.body.website.trim() !== '') {

		console.log('Honeypot spam enquiry blocked:', {

			time: new Date().toISOString(),
			name: req.body.name,
			email: req.body.email
		});

		return res.redirect(303, '/enquiry-success');
	}


	/// Form Messsage text

	const message = (req.body.message || '').toLowerCase();


	/// phrases to check

	const seoSpamPhrases = [
		'seo services',
		'improve your seo',
		'seo agency',
		'search engine optimization',
		'seo packages',
		'may i send you seo',
		'seo performance',
		'seo support',
		'search visibility',
		'improve search',
		'improve seo'
	];



	/// Match message against spam phrases

	const matchedSpamPhrase = seoSpamPhrases.find((phrase) =>
		message.includes(phrase)
	);


	/// if message matches any spam phrases - log to console 


	if (matchedSpamPhrase) {

		console.log('SEO spam enquiry blocked:', {
			time: new Date().toISOString(),
			name: req.body.name,
			email: req.body.email,
			matchedPhrase: matchedSpamPhrase
		});

		return res.redirect(303, '/enquiry-success');
	}


	/// Send Enquiry

	const enquiry = await Enquiry.create({

		name: req.body.name,
		phone: req.body.phone,
		email: req.body.email,
		enquiry: req.body.enquiry,
		preferredContactMethod: req.body.preferredContactMethod,
		message: req.body.message

	});


	await new Email({ email: req.body.email, name: req.body.name }).sendEnquiryEmail(enquiry);
	await new Email({ email: req.body.email, name: req.body.name }).sendEnquiryConfirmation();



	res.redirect(303, '/enquiry-success');
});





exports.createCustomizationEnquiry = catchAsync(async (req, res, next) => {


	/// Hidden field check

	if (req.body.website && req.body.website.trim() !== '') {

		console.log('Honeypot spam enquiry blocked:', {

			time: new Date().toISOString(),
			name: req.body.name,
			email: req.body.email
		});

		return res.redirect(303, '/enquiry-success');
	}


	/// Form Messsage text

	const message = (req.body.message || '').toLowerCase();


	/// phrases to check

	const seoSpamPhrases = [
		'seo services',
		'improve your seo',
		'seo agency',
		'search engine optimization',
		'seo packages',
		'may i send you seo',
		'seo performance',
		'seo support',
		'search visibility',
		'improve search',
		'improve seo'
	];



	/// Match message against spam phrases

	const matchedSpamPhrase = seoSpamPhrases.find((phrase) =>
		message.includes(phrase)
	);


	/// if message matches any spam phrases - log to console 


	if (matchedSpamPhrase) {

		console.log('SEO spam enquiry blocked:', {
			time: new Date().toISOString(),
			name: req.body.name,
			email: req.body.email,
			matchedPhrase: matchedSpamPhrase
		});

		return res.redirect(303, '/enquiry-success');
	}


	const customizationEnquiry = await CustomizationEnquiry.create({

		name: req.body.name,
		phone: req.body.phone,
		email: req.body.email,
		outfit: req.body.outfit,
		event: req.body.event,
		message: req.body.message,
		preferredContactMethod: req.body.preferredContactMethod,

	});

	await new Email({ email: req.body.email, name: req.body.name }).sendCustomizationEnquiryEmail(customizationEnquiry);
	await new Email({ email: req.body.email, name: req.body.name }).sendCustomizationEnquiryConfirmation();



	res.redirect(303, '/enquiry-success');

});





exports.updateCustomEnquiryStatus = catchAsync(async (req, res, next) => {

	const allowedStatuses = CustomizationEnquiry.schema.path('status').enumValues;

	if (!allowedStatuses.includes(req.body.status)) {

		return next(new AppError('Invalid enquiry status', 400));
	}

	const { status } = req.body;

	const update = { status };

	if (status === 'read') {
		update.readAt = Date.now();
	}

	if (status === 'responded') {
		update.respondedAt = Date.now();
		update.readAt = Date.now();
	}

	if (status === 'new') {
		update.readAt = undefined;
		update.respondedAt = undefined;
	}


	const enquiry = await CustomizationEnquiry.findByIdAndUpdate(req.params.id, update, {

		new: true,
		runValidators: true
	});

	if (!enquiry) {

		return next(new AppError('No enquiry found with that ID', 404));
	}

	res.status(200).json({

		status: 'success',
		data: {
			enquiry
		}
	});
});




exports.updateEnquiryStatus = catchAsync(async (req, res, next) => {

	const allowedStatuses = Enquiry.schema.path('status').enumValues;

	if (!allowedStatuses.includes(req.body.status)) {

		return next(new AppError('Invalid enquiry status', 400));
	}

	const { status } = req.body;

	const update = { status };

	if (status === 'read') {
		update.readAt = Date.now();
	}

	if (status === 'responded') {
		update.respondedAt = Date.now();
		update.readAt = Date.now();
	}

	if (status === 'new') {
		update.readAt = undefined;
		update.respondedAt = undefined;
	}


	const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, update, {

		new: true,
		runValidators: true
	});

	if (!enquiry) {

		return next(new AppError('No enquiry found with that ID', 404));
	}

	res.status(200).json({

		status: 'success',
		data: {
			enquiry
		}
	});
});