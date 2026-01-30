const express = require('express');
const router = express.Router({ mergeParams: true });

const authController = require('../controllers/authController.js');
const productController = require('../controllers/productController.js');
const shoppingController = require('../controllers/shoppingController.js');


//---------- Add product - user cart  /wishlist -----------//


router.patch('/cart',
	authController.protectRoute,
	authController.restrictTo('user'),
	productController.setProductUserIds,
	shoppingController.addToCart)


router.patch('/cart/:cartId/update-cart-qty',
	authController.protectRoute,
	authController.restrictTo('user'),
	productController.setProductUserIds,
	shoppingController.updateCartQuantity)


router.patch('/wishlist',
	authController.protectRoute,
	authController.restrictTo('user'),
	productController.setProductUserIds,
	shoppingController.addToWishlist)





//---------- Remove product - user cart / wishlist -----------//



router.delete('/cart/:cartId',
	authController.protectRoute,
	authController.restrictTo('user'),
	productController.setProductUserIds,
	shoppingController.deleteCartItem);




router.delete('/wishlist/:wishlistId',
	authController.protectRoute,
	authController.restrictTo('user'),
	productController.setProductUserIds,
	shoppingController.deleteWishlistItem);










module.exports = router;