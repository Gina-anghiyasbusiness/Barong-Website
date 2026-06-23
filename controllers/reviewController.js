const mongoose = require('mongoose');

const Review = require('./../models/reviewModel');

const factory = require('./../controllers/handlerFactory')

const AppError = require('./../utilities/appError');
const catchAsync = require('./../utilities/catchAsync');
const filterObj = require('./../utilities/filterObject');




/// create


// exports.createReview = factory.createOne(Review);



exports.createReview = catchAsync(async (req, res, next) => {

	if (!req.params.productId || !mongoose.Types.ObjectId.isValid(req.params.productId)) {

		return next(new AppError('Invalid product ID', 400));
	}

	const filteredBody = filterObj(req.body, 'rating', 'comment');

	filteredBody.product = req.params.productId;
	filteredBody.user = req.user.id;

	const review = await Review.create(filteredBody);

	res.status(200).json({
		status: 'success',
		data: {
			review
		}
	});
});






/// read all



/// get all reviews BUT if a productId is passed from the product route
/// - use that to get specific product reviews


exports.getAllReviews = factory.getAll(Review);



/// get one review - with no popOptions Array


exports.getReview = factory.getOne(Review);




/// 		Update		 ///

// exports.updateReview = factory.updateOne(Review);



exports.updateReview = catchAsync(async (req, res, next) => {

	if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

		return next(new AppError('Invalid review ID', 400));
	}

	const filteredBody = filterObj(req.body, 'rating', 'comment');

	const review = await Review.findByIdAndUpdate(
		req.params.id,
		filteredBody,
		{
			new: true,
			runValidators: true
		}
	);

	if (!review) {

		return next(new AppError('Review not found', 404));
	}

	res.status(200).json({
		status: 'success',
		data: {
			review
		}
	});
});




/// 		Delete		 ///

exports.deleteReview = factory.deleteOne(Review)