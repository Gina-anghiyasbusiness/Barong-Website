// --------------- NPM Packages ------------------ //

const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongooseSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');



// -------------- Custom Utilities ---------------- //

const AppError = require('./utilities/appError')





//--------------------  Routers -------------------- //


const discountRouter = require('./routes/discountRoutes');
const orderRouter = require('./routes/orderRoutes');
const categoryRouter = require('./routes/categoryRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const shoppingRouter = require('./routes/shoppingRoutes');
const productRouter = require('./routes/productRoutes');

const userRouter = require('./routes/userRoutes');
const adminRouter = require('./routes/adminRoutes');

const viewRouter = require('./routes/viewRoutes');




//-------------------  Controllers ------------------ //

const webhookController = require('./controllers/webhookController');

const errorController = require('./controllers/errorController');



//--------------------  APP.JS ---------------------- //

const app = express();




// ------------------- Middleware --------------------//




//-- Pug --/


app.set('view engine', 'pug');

app.set('views', path.join(__dirname, 'views'));


/// static file server


app.use(express.static(path.join(__dirname, 'public')));



const crypto = require('crypto');

app.use((req, res, next) => {
	res.locals.nonce = crypto.randomBytes(16).toString('base64');
	next();
});



//-- Helmet --/


app.use(
	helmet.contentSecurityPolicy({
		useDefaults: false,
		directives: {
			defaultSrc: [
				"'self'"
			],
			scriptSrc: [
				"'self'",
				"'sha256-GAjmaehDsJH2jDoKMtZaYsCWJI2Ugs8esNnVYk0k3f0='",
				'https://js.stripe.com',
				'https://www.paypal.com',
				'https://www.paypalobjects.com'   //  (PayPal needs it for widgets)
			],
			frameSrc: [
				"'self'",
				"https://js.stripe.com",
				"https://www.paypal.com",
				"https://www.sandbox.paypal.com",
				"https://www.paypalobjects.com"
			],
			connectSrc: [
				"'self'",
				"https://api.stripe.com",
				"https://js.stripe.com",
				"https://www.paypal.com",
				"https://www.paypalobjects.com",
				"https://www.sandbox.paypal.com"
			],
			styleSrc: [
				"'self'",
				"https://fonts.googleapis.com",
				"'unsafe-inline'"
			],
			fontSrc: [
				"'self'",
				'https://fonts.gstatic.com',
				'data:',
				'blob:'
			],
			imgSrc: [
				"'self'",
				'data:',
				'https://cdn.example.com',
				'https://www.paypal.com',
				'https://www.paypalobjects.com'
			],
			objectSrc: ["'none'"],
			upgradeInsecureRequests: []


		}
	})
);


///			////////////////////////			///////////////////			///////////////////////
/// DONT FORGET TO ADD STRIPE WEBHOOK ROUTE TO APP.JS AND INCLUDE SCRIPT IN BASE	///
///			////////////////////////			///////////////////			///////////////////////





//----------------  Stripe webhook route ---------------//

/// leave in app.js as ots not needed in a route.js file AND..

/// MUST GO BEFORE app.use(express.json()); AS ITS RAW FORMAT	

app.post('/webhook', express.raw({ type: 'application/json' }),

	webhookController.handleStripeWebhook
);




//----  Morgan ----//

app.use(morgan('dev'));




//---- render JSON to object ----///

app.use(express.json());




//---------  Cookie Parser  -------//

app.use(cookieParser());




//---- log API call time (with cookie) ----//

app.use((req, res, next) => {

	console.log(`API call logged at :${req.requestTime = new Date().toISOString()}`);

	// console.log(req.cookies);

	next();
})



//---- Express rate limiter ----//

const limiter = rateLimit(

	{
		/// Request amount 

		max: 100,

		/// in 1 hour

		windowMs: 60 * 60 * 1000,

		/// error message

		message: 'Too many requests from this IP. Please try again in 1 hour'
	}
)

app.use('/api', limiter)



// ---- Data sanitize NoSQL Injection -----//

app.use(mongooseSanitize());



// ---- Data sanitize XSS Attacks -----//


app.use(xss());


//---- Prevent Parameter Pollution ----//

app.use(hpp(
	{
		whitelist: ['tags', 'category']
	}
))







//------------------ Route Calls -------------------//


/// Dynamic Routes Commented Out


app.use('/api/v1/discounts', discountRouter);

app.use('/api/v1/orders', orderRouter);

app.use('/api/v1/reviews', reviewRouter);

app.use('/api/v1/shopping', shoppingRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/products', productRouter);


/// Static Routes

app.use('/api/v1/users', userRouter);
app.use('/api/v1/admin', adminRouter);


app.use('/', viewRouter);





//---------------- ERROR HANDLING ------------------//


/// use AFTER routes and called as invalid routes will skip and end up here:


//! match all routes that make it this far


app.all('*', (req, res, next) => {

	next(new AppError(`Cant find ${req.originalUrl} on this server`, 404));

});




/// Global error handling middleware

app.use(errorController.globalErrorHandler);

module.exports = app;