const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text')

module.exports = class Email {

	constructor(user, url = null) {

		this.to = user.email;
		this.firstname = user.name.split(' ')[0];

		this.url = url;
		this.from = `Mark Beresford ${process.env.EMAIL_FROM}`;
	}


	newTransport() {

		if (process.env.NODE_ENV === 'development') {

			return nodemailer.createTransport(
				{
					host: process.env.EMAIL_HOST,
					port: process.env.EMAIL_PORT,
					auth: {

						user: process.env.EMAIL_USERNAME,
						pass: process.env.EMAIL_PASSWORD

					}
				}
			)
		}

		/// (Brevo)

		if (process.env.NODE_ENV === 'production') {

			return nodemailer.createTransport({

				host: process.env.BREVO_HOST,
				port: process.env.BREVO_PORT,

				/// use secure on port 587, dont on 465

				secure: false,
				auth: {

					user: process.env.BREVO_LOGIN,
					pass: process.env.BREVO_PASSWORD
				}
			});
		}
	}

	async send(template, subject) {

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

		await this.send('resetPassword', 'Reset Password')
	}


	async accountChanges() {

		await this.send('accountChanges', 'Your account has been updated');
	}
}