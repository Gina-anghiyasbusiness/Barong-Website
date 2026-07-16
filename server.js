const mongoose = require('mongoose');
const dotenv = require('dotenv');



/// 	THIS MUST GO ABOVE APP		///

dotenv.config({ path: './config.env' });



/// Check for all env values before site loads

const requiredEnvVars = [
	'NODE_ENV',
	'SITE_PREVIEW',
	'CONNECTION_STRING',
	'JWT_SECRET',
	'JWT_EXPIRY',
	'JWT_COOKIE_EXPIRY',
	'SITE_URL',
	'CANONICAL_URL',
	'GUEST_ORDER_ACCESS_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);


if (missingEnvVars.length > 0) {

	throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

if (!['development', 'production'].includes(process.env.NODE_ENV)) {

	throw new Error('NODE_ENV must be either development or production');
}

if (!['true', 'false'].includes(process.env.SITE_PREVIEW)) {

	throw new Error('SITE_PREVIEW must be either true or false');
}

if (!process.env.GUEST_ORDER_ACCESS_SECRET || process.env.GUEST_ORDER_ACCESS_SECRET.length < 32) {

	throw new Error('GUEST_ORDER_ACCESS_SECRET must be at least 32 characters');
}



/// Only run if all envs are for live site if preview mode off


if (process.env.SITE_PREVIEW === 'false') {

	const livePaymentEnvVars = [
		'STRIPE_SECRET_KEY',
		'STRIPE_PUBLISHABLE_KEY',
		'STRIPE_WEBHOOK_SECRET',
		'PAYPAL_CLIENT_ID',
		'PAYPAL_SECRET_KEY',
		'PAYPAL_MODE'
	];

	const missingLivePaymentEnvVars = livePaymentEnvVars.filter(envVar => !process.env[envVar]);

	if (missingLivePaymentEnvVars.length > 0) {

		throw new Error(`SITE_PREVIEW=false requires live payment environment variables: ${missingLivePaymentEnvVars.join(', ')}`);
	}

	if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {

		throw new Error('SITE_PREVIEW=false requires a live Stripe secret key');
	}

	if (!process.env.STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_')) {

		throw new Error('SITE_PREVIEW=false requires a live Stripe publishable key');
	}

	if (!process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {

		throw new Error('SITE_PREVIEW=false requires a Stripe webhook signing secret');
	}

	if (process.env.PAYPAL_MODE !== 'live') {

		throw new Error('SITE_PREVIEW=false requires PAYPAL_MODE=live');
	}

	for (const envVar of ['SITE_URL', 'CANONICAL_URL']) {

		const value = process.env[envVar].toLowerCase();

		if (value.includes('localhost') || value.includes('127.0.0.1')) {

			throw new Error(`SITE_PREVIEW=false requires ${envVar} to use the live website URL`);
		}
	}
}





for (const envVar of ['SITE_URL', 'CANONICAL_URL']) {

	const value = process.env[envVar];

	let parsedUrl;

	try {

		parsedUrl = new URL(value);

	} catch {

		throw new Error(`${envVar} must be a valid URL`);
	}

	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {

		throw new Error(`${envVar} must use HTTP or HTTPS`);
	}

	if (!value.endsWith('/')) {

		throw new Error(`${envVar} must end with /`);
	}
}


if (process.env.JWT_SECRET.length < 32) {

	throw new Error('JWT_SECRET must be at least 32 characters');
}


if (!/^\d+(ms|s|m|h|d|w|y)$/i.test(process.env.JWT_EXPIRY)) {

	throw new Error('JWT_EXPIRY must include a valid time unit, such as 90d');
}


const jwtCookieExpiry = Number(process.env.JWT_COOKIE_EXPIRY);

if (!Number.isFinite(jwtCookieExpiry) || jwtCookieExpiry <= 0) {

	throw new Error('JWT_COOKIE_EXPIRY must be a positive number of days');
}




//----  Uncaught Exception Error handling  ----//


process.on('uncaughtException', err => {

	console.log('Uncaught Exception:', err.name, err.message);
	console.log('Shutting Down......');

	process.exit(1);

});



const app = require('./app');



mongoose.connect(process.env.CONNECTION_STRING)
	.then(() => {

		console.log(`DB Connected: ${process.env.NODE_ENV.toUpperCase()} MODE`);
	});


const port = process.env.PORT || 5000;


const server = app.listen(port, () => {

	console.log(`Server Started on port: ${port}`);
});





//----  UnhandledRejection Error handling  ----- //


process.on('unhandledRejection', err => {

	console.log('Unhandled Rejection:', err.name, err.message);
	console.log('Shutting Down......');

	server.close(() => {

		process.exit(1);
	});
});




//----  Render Graceful Shutdown  ----- //


process.on('SIGTERM', () => {

	console.log('SIGTERM received. Shutting down gracefully');

	server.close(async () => {

		await mongoose.connection.close();

		console.log('Process terminated');

		process.exit(0);
	});
});