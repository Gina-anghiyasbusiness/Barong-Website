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
	'CANONICAL_URL'
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