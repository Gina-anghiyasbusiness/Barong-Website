const express = require('express');
const router = express.Router({ mergeParams: true });

const authController = require('./../controllers/authController.js');
const reviewController = require('./../controllers/reviewController.js');
const productController = require('./../controllers/productController.js');



/// Protect All review routes so only logged in users have access to create a review


router.use(authController.protectRoute);


router.post('/',
	authController.restrictTo('user'),
	productController.setProductUserIds,
	reviewController.createReview);








//------- Back End -----//


/// Restrict access to supervisor and owner for reviews


router.use(authController.restrictTo('owner', 'supervisor'));

router.get('/', reviewController.getAllReviews);

router.route('/:id')
	.get(reviewController.getReview)
	.patch(reviewController.updateReview)
	.delete(reviewController.deleteReview);



module.exports = router;