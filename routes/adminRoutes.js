const express = require('express');
const router = express.Router();

const authController = require('./../controllers/authController.js');
const productController = require('./../controllers/productController');
const userController = require('./../controllers/userController');
const categoryController = require('./../controllers/categoryController');




//------  Global admin protection -----//

router.use(authController.protectRoute);

router.use(authController.restrictTo('admin', 'owner', 'supervisor'));



//---------- Product Routes ------------//


///	 Barongs 	


router.route('/barongs')
	.get(productController.getAllProducts)
	.post(
		productController.uploadProductImages,
		productController.resizeProductImages,
		productController.createBarong);



router.route('/barongs/:id')
	.get(productController.getProduct)
	.patch(
		productController.uploadProductImages,
		productController.resizeProductImages,
		productController.updateProduct)
	.delete(
		authController.restrictTo('supervisor', 'owner'),
		productController.deleteProduct);



///	 Shoes 	


router.route('/shoes')
	.get(productController.getAllProducts)
	.post(
		productController.uploadProductImages,
		productController.resizeOtherImages,
		productController.createShoes);



router.route('/shoes/:id')
	.get(productController.getProduct)
	.patch(
		productController.uploadProductImages,
		productController.resizeOtherImages,
		productController.updateShoe)
	.delete(
		authController.restrictTo('supervisor', 'owner'),
		productController.deleteShoe);



///	 Accessories 	


router.route('/accessories')
	.get(productController.getAllProducts)
	.post(
		productController.uploadProductImages,
		productController.resizeOtherImages,
		productController.createAccessories);


router.route('/accessories/:id')
	.get(productController.getProduct)
	.patch(
		productController.uploadProductImages,
		productController.resizeOtherImages,
		productController.updateAccessory)
	.delete(
		authController.restrictTo('supervisor', 'owner'),
		productController.deleteAccs);





//---------- Product Routes - NON admin ------------//


//// Restrict Routes for admin users


router.use(authController.restrictTo('supervisor', 'owner'));


router.route('/barongs/discontinued/:id')
	.patch(productController.discontinueProduct);


router.route('/shoes/discontinued/:id')
	.patch(productController.discontinueShoes);


router.route('/accessories/discontinued/:id')
	.patch(productController.discontinueAccs);



//------------- User Routes ------------//


router.route('/users').get(userController.getAllUsers);


router.route('/users/:id')
	.get(userController.getUser)
	.patch(userController.updateUser)
	.delete(userController.deactivateUser);






//------------- Category Routes ------------//


router.route('/category')
	.get(categoryController.getAllCategories)
	.post(
		categoryController.uploadCategoryImage,
		categoryController.resizeCategoryImage,
		categoryController.createCategory);



router.route('/category/:id')
	.get(categoryController.getCategory)
	.patch(
		categoryController.uploadCategoryImage,
		categoryController.resizeCategoryImage,
		categoryController.updateCategory)
	.delete(categoryController.deactivateCategory);





module.exports = router;