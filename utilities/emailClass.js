const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text');




module.exports = class Email {

	constructor(user, url = null) {

		this.to = user.email;
		this.firstname = user.name.split(' ')[0];

		this.url = url;
		this.from = `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`;
	}


	newTransport() {

		const requiredSmtpVars = [
			'SMTP_HOST',
			'SMTP_PORT',
			'SMTP_LOGIN',
			'SMTP_PASSWORD',
			'EMAIL_FROM',
			'EMAIL_FROM_NAME',
			'ENQUIRY_TO'
		];

		const missingSmtpVars = requiredSmtpVars.filter(envVar => !process.env[envVar]);

		if (missingSmtpVars.length > 0) {
			throw new Error(`Missing SMTP environment variables: ${missingSmtpVars.join(', ')}`);
		}

		return nodemailer.createTransport({

			host: process.env.SMTP_HOST,
			port: Number(process.env.SMTP_PORT),
			secure: Number(process.env.SMTP_PORT) === 465,

			auth: {
				user: process.env.SMTP_LOGIN,
				pass: process.env.SMTP_PASSWORD
			}
		});
	}


	/// Send from Mail

	async send(template, subject, throwOnError = false) {

		const html = pug.renderFile(`${__dirname}/../views/emails/${template}.pug`,
			{
				firstname: this.firstname,
				url: this.url,
				subject,
				logoUrl: `${process.env.CANONICAL_URL}img/logo/default-logo.png`
			}
		);

		const mailOptions = {

			from: this.from,
			to: this.to,
			subject,
			html,
			text: convert(html)
		}

		try {
			await this.newTransport().sendMail(mailOptions);

		} catch (err) {

			console.error('❌ Email failed:', err.response || err);

			if (throwOnError) throw err;
		}
	}



	/// Read Enquiry from mail


	async sendEnquiry(template, subject, enquiryData, throwOnError = false) {

		const html = pug.renderFile(`${__dirname}/../views/emails/${template}.pug`, {
			subject,
			enquiry: enquiryData,
			logoUrl: `${process.env.CANONICAL_URL}img/logo/default-logo.png`
		});

		const mailOptions = {

			from: this.from,
			to: process.env.ENQUIRY_TO,
			cc: process.env.ENQUIRY_CC || undefined,
			replyTo: enquiryData.email,
			subject,
			html,
			text: convert(html)

		};

		try {

			await this.newTransport().sendMail(mailOptions);

		} catch (err) {

			console.error('Email failed:', err.response || err);

			if (throwOnError) throw err;

		}
	}


	/// workspace helper



	async sendInternal(template, subject, data, to, throwOnError = false) {

		if (!to) {
			throw new Error(`Missing recipient for internal email: ${subject}`);
		}

		const html = pug.renderFile(`${__dirname}/../views/emails/${template}.pug`, {
			subject,
			data,
			url: this.url,
			logoUrl: `${process.env.CANONICAL_URL}img/logo/default-logo.png`
		});

		const mailOptions = {
			from: this.from,
			to,
			subject,
			html,
			text: convert(html)
		};

		try {

			await this.newTransport().sendMail(mailOptions);

		} catch (err) {

			console.error('Internal email failed:', err.response || err);

			if (throwOnError) throw err;
		}
	}



	/// Template send functions


	/// User emails

	async sendWelcome() {

		await this.send('welcome', 'Welcome to our website')
	};

	async resetPassword() {

		await this.send('resetPassword', 'Reset Password', true);
	};

	async accountChanges() {

		await this.send('accountChanges', 'Your account has been updated');
	};

	async passwordUpdated() {
		await this.send('passwordUpdated', 'Your Ang Hiyas password was updated');
	};


	/// user enquiry emails

	async sendEnquiryConfirmation() {

		await this.send('enquiryConfirmation', 'Thanks for your enquiry | Ang Hiyas');
	}

	async sendCustomizationEnquiryConfirmation() {

		await this.send('customizationEnquiryConfirmation', 'Thanks for your custom enquiry | Ang Hiyas');
	}

	/// user order emails

	async orderConfirm() {

		await this.send('orderConfirm', 'Order details')
	};




	/// Template send enquiry functions to ang hiyas


	async sendEnquiryEmail(enquiryData) {

		await this.sendEnquiry('enquiry', 'New Enquiry', enquiryData, true);
	};


	async sendCustomizationEnquiryEmail(enquiryData) {

		await this.sendEnquiry('customizationEnquiry', 'New Customization Enquiry', enquiryData, true);
	};



	/// workspace support


	// / Stripe

	async sendInternalOrderCreated(orderData) {

		await this.sendInternal(
			'internalOrderCreated',
			`New paid order created: #${orderData.orderNum}`,
			orderData,
			process.env.ORDER_ALERT_TO
		);
	};


	async sendStripeOrderFailureAlert(failureData) {

		const alertIdSource = failureData.paymentIntent || failureData.sessionId || 'unknown';
		const alertId = alertIdSource === 'unknown' ? alertIdSource : alertIdSource.slice(-8);

		await this.sendInternal(
			'internalStripeOrderFailed',
			`URGENT: Paid Stripe order failed - ${alertId}`,
			failureData,
			process.env.SUPPORT_ALERT_TO
		);
	};



	// / Paypal

	async sendPayPalOrderFailureAlert(failureData) {

		const alertIdSource = failureData.paypalCaptureId || failureData.paypalOrderId || 'unknown';

		const alertId = alertIdSource === 'unknown' ? alertIdSource : alertIdSource.slice(-8);

		await this.sendInternal(
			'internalPayPalOrderFailed',
			`URGENT: Paid PayPal order failed - ${alertId}`,
			failureData,
			process.env.SUPPORT_ALERT_TO
		);
	};




}

