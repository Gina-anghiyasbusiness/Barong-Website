

//--------------------- Modules --------------------//

const AppError = require('./../utilities/appError');



//---------- Mongoose Error Handlers ---------------//


const handleCastErrorDB = (error) => {

	return new AppError(`Invalid ${error.path} : ${error.value}`, 400);
}


const handleMongoErrorDB = (error) => {

	return new AppError(`Duplicate field value: ${error.keyValue.name}. Please use another value`, 400);
}


const handleValidationErrorDB = (error) => {

	const errors = Object.values(error.errors).map(el => el.message);

	return new AppError(`Invalid input data. ${errors.join('. ')}`, 400);
}


///			JWT ERRORS - later			///


const handleJWTErrorDB = () => new AppError('Invalid Token. Please Login Again', 401)
const handleJWTExpiryErrorDB = () => new AppError('Expired Token. Please Try Again', 401)



//----------- Environment Error Handlers ------------//


const sendErrorDev = (err, req, res) => {


	if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {

		return res.status(err.statusCode).json({
			status: err.status,
			error: err,
			message: err.message,
			stack: err.stack
		})
	}



	/// Render front end error page	


	const user = req.user || null;


	if (!user) {

		return res.status(err.statusCode || 500).render('error', {

			title: "Something went wrong...",
			errMsg: err.message || "An unexpected error occurred."
		});
	}


	if (user.role === 'user') {

		return res.status(err.statusCode).render('error', {

			title: "Something went wrong....",
			errMsg: err.message
		})


		/// Render back end error page		


	} else {

		return res.status(err.statusCode).render('admin/be_error', {
			title: "Something went wrong....",
			errMsg: err.message

		})
	}
}




const sendErrorProd = (err, req, res) => {

	if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {

		if (err.isOperational) {

			return res.status(err.statusCode).json({
				status: err.status,
				message: err.message

			})
		}

		console.error('ERROR 💥', err);

		return res.status(500).json({
			status: 'error',
			message: 'Something went wrong!'
		})
	}


	if (err.isOperational) {

		return res.status(err.statusCode).render('error', {

			title: "Something went wrong....",
			errMsg: err.message
		})
	}

	console.error('ERROR 💥', err);


	/// Render front end error page


	if (req.user.role === 'user') {

		return res.status(err.statusCode).render('error', {

			title: "Something went wrong....",
			errMsg: 'Please try again later'
		})


		/// Render back end error page		

	} else {

		return res.status(err.statusCode).render('admin/be_error', {

			title: "Something went wrong....",
			errMsg: 'Please try again later'
		})
	}
}




//--------------- Global Error Handler ----------------//


exports.globalErrorHandler = (err, req, res, next) => {

	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'error';

	if (process.env.NODE_ENV === 'development') {

		sendErrorDev(err, req, res);

	} else if (process.env.NODE_ENV === 'production') {

		let error = { ...err };

		error.message = err.message;
		error.name = err.name;

		if (error.name === 'CastError') error = handleCastErrorDB(error);
		if (error.code === 11000) error = handleMongoErrorDB(error);
		if (error.name === 'ValidationError') error = handleValidationErrorDB(error);


		if (error.name === 'JsonWebTokenError') error = handleJWTErrorDB(error);
		if (error.name === 'TokenExpiredError') error = handleJWTExpiryErrorDB(error);




		sendErrorProd(error, req, res);
	}
}


