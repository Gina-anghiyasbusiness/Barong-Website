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

		if (process.env.NODE_ENV === 'development') {

			return nodemailer.createTransport(
				{
					host: process.env.EMAIL_HOST,
					port: Number(process.env.EMAIL_PORT),
					auth: {

						user: process.env.EMAIL_USERNAME,
						pass: process.env.EMAIL_PASSWORD

					}
				}
			)
		}


		/// (WORKSPACE)

		if (process.env.NODE_ENV === 'production') {

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


	/// Template send functions


	async sendWelcome() {

		await this.send('welcome', 'Welcome to our website')
	}


	async orderConfirm() {

		await this.send('orderConfirm', 'Order details')
	}


	async resetPassword() {

		await this.send('resetPassword', 'Reset Password', true);
	}


	async accountChanges() {

		await this.send('accountChanges', 'Your account has been updated');
	}


	/// Template send enquiry functions

	async sendEnquiryEmail(enquiryData) {

		await this.sendEnquiry('enquiry', 'New Enquiry', enquiryData, true);
	}

	async sendCustomizationEnquiryEmail(enquiryData) {

		await this.sendEnquiry('customizationEnquiry', 'New Customization Enquiry', enquiryData, true);
	}


}

