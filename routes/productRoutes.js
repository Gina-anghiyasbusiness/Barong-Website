const express = require('express');
const router = express.Router({ mergeParams: true });

const reviewRouter = require('./../routes/reviewRoutes');
const orderRouter = require('./../routes/orderRoutes');
const shoppingRouter = require('./../routes/shoppingRoutes');

const productController = require('./../controllers/productController.js');
const authController = require('./../controllers/authController.js');


//---------- Aggregation Pipeline Routes -----------//


router.get('/top-ten-newest', productController.getNewestProducts);





//---------- Create a review on a product -----------//


/// use product route to add a review using user / product info

router.use('/:productId/reviews', reviewRouter);



//---------- Create an order on a product -----------//

/// use product route to add product to an order 

router.use('/:productId/orders', orderRouter);




//---------- Add product - user cart / wishlist -----------//

/// use product route to add product user cart 

router.use('/:productId/shopping', shoppingRouter);




/// Product API calls


router.route('/')
	.get(productController.getAllProducts)
	.post(
		authController.protectRoute,
		authController.restrictTo('supervisor', 'owner'),
		productController.createProduct);



router.route('/:id')
	.get(productController.getProduct)
	.delete(
		authController.protectRoute,
		authController.restrictTo('supervisor', 'owner'),
		productController.deleteProduct)
	.patch(
		authController.protectRoute,
		authController.restrictTo('supervisor', 'owner'),
		productController.updateProduct);



module.exports = router;