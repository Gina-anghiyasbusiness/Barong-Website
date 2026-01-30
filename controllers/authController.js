const User = require('./../models/userModel');

const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');


const AppError = require('../utilities/appError');
const catchAsync = require('../utilities/catchAsync');

const Email = require('./../utilities/email');




//-----		 User SignUp		----//



/// JWT Token for auto login (reusable)


const signToken = userId => {

	return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY })

}


const createSendToken = (user, statusCode, res) => {

	const token = signToken(user._id);


	const cookieOptions = {

		expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRY * 24 * 60 * 60 * 1000),
		httpOnly: true
	}

	if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

	res.cookie('jwt', token, cookieOptions);

	user.password = undefined;

	res.status(statusCode).json({
		status: 'success',
		token,
		data: { user }
	})

}



//----- 	SignUp function	 ----//


exports.signup = catchAsync(async (req, res, next) => {

	const newUser = await User.create({

		name: req.body.name,
		email: req.body.email,
		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm,
		passwordChangedAt: req.body.passwordChangedAt,
		role: req.body.role
	});


	///			Send Welcome Email			///


	const url = `${req.protocol}://${req.get('host')}/me`

	/// 	Still need to add '/me' route to viewRoutes 	///

	await new Email(newUser, url).sendWelcome()


	createSendToken(newUser, 200, res);
})


//------	login function	-----//


exports.login = catchAsync(async (req, res, next) => {


	/// destructure email and password

	const { email, password } = req.body;

	if (!email || !password) return next(new AppError('Incorrect Login Credentials. Please try again', 404));

	const user = await User.findOne({ email: email }).select('+password');

	if (!user || !await user.correctPassword(password, user.password)) return next(new AppError('Incorrect Login Details', 401));

	user.lastLoggedIn = new Date();

	await user.save({ validateBeforeSave: false });


	/// if we get this far - create a jwt and send in response

	createSendToken(user, 200, res);



});




/// Check If IsLoggedIn



exports.isLoggedIn = async (req, res, next) => {

	if (req.cookies.jwt) {

		try {

			const decodedToken = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

			const existingUser = await User.findById(decodedToken.id);

			if (!existingUser) return next();

			if (existingUser.passwordChangedAfter(decodedToken.iat)) {

				return next();
			}

			res.locals.user = existingUser;
			req.user = existingUser;

			return next();

		} catch (err) {

			return next()
		}
	}
	next()
}



/// logout


exports.logout = (req, res) => {

	res.cookie('jwt', 'loggedOutToken', {

		expiresIn: new Date(Date.now() + 10 * 1000),
		httpOnly: true
	});
	res.status(200).json({
		status: 'success'
	})
}






//------	Route Protection	-----//



exports.protectRoute = catchAsync(async (req, res, next) => {

	let token;

	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {

		token = req.headers.authorization.split(' ')[1];

	} else if (req.cookies.jwt) {

		token = req.cookies.jwt

	}



	if (!token) return next(new AppError('No Token Exists!', 401));



	const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

	const existingUser = await User.findById(decoded.id);

	if (!existingUser) return next(new AppError('No Existing User for this token', 401));

	if (existingUser.passwordChangedAfter(decoded.iat)) {

		return next(new AppError('Password Recently Changed. Please login again', 401));
	}


	/// makes user available on protectedRoutes

	req.user = existingUser;

	next();
})




//-------------- Authorization -------------//


exports.restrictTo = (...roles) => {

	return (req, res, next) => {

		if (!roles.includes(req.user.role)) {

			return next(new AppError('You Do not have permission for this action', 403));
		}

		next();
	}
}



//----------------	Password Functionailty ---------------- //




exports.forgotPassword = catchAsync(async (req, res, next) => {

	const user = await User.findOne({ email: req.body.email });

	if (!user) {

		return next(new AppError('No user found with that email', 404));
	}

	const resetToken = user.createPasswordResetToken();

	await user.save({ validateBeforeSave: false });

	try {

		const resetUrl = `${resetToken}`;

		/// send email with data

		await new Email(user, resetUrl).resetPassword();

		res.status(200).json({

			status: "success",
			message: 'Token Sent'
		})
	}

	catch (err) {

		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;

		await user.save({ validateBeforeSave: false });

		return next(new AppError('Error sending email. Please try again', 500));
	}
});





exports.resetPassword = catchAsync(async (req, res, next) => {

	const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

	const user = await User.findOne({

		passwordResetToken: hashedToken,
		passwordResetExpires: { $gt: Date.now() }

	})

	if (!user) { return next(new AppError('Invalid Token'), 400) };

	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;

	user.passwordResetToken = undefined;
	user.passwordResetExpires = undefined;

	await user.save();



	await new Email(user).accountChanges();

	createSendToken(user, 200, res);
}
);






/// logged in users




exports.updatePassword = catchAsync(async (req, res, next) => {

	const user = await User.findById(req.user.id).select('+password');

	if (!user || !await user.correctPassword(req.body.passwordCurrent, user.password)) {

		return next(new AppError('No user or vaild password', 401));

	}

	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;

	await user.save();

	createSendToken(user, 200, res);

}
)