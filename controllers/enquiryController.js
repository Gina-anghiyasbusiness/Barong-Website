const Enquiry = require('./../models/enquiryModel');
const CustomizationEnquiry = require('./../models/customizationEnquiryModel');

const Email = require('./../utilities/emailClass');
const catchAsync = require('./../utilities/catchAsync');


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

	res.redirect(303, '/enquiry-success');

});

