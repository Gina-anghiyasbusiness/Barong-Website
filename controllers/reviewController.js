const Review = require('./../models/reviewModel');

const factory = require('./../controllers/handlerFactory')





/// create



exports.createReview = factory.createOne(Review);









/// read all



/// get all reviews BUT if a productId is passed from the product route
/// - use that to get specific product reviews


exports.getAllReviews = factory.getAll(Review);



/// get one review - with no popOptions Array


exports.getReview = factory.getOne(Review);




/// 		Update		 ///

exports.updateReview = factory.updateOne(Review);




/// 		Delete		 ///

exports.deleteReview = factory.deleteOne(Review)