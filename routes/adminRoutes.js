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

router.route('/products')
	.get(productController.getAllProducts)
	.post(
		productController.uploadProductImages,
		productController.resizeProductImages,
		productController.createProduct);



router.route('/products/:id')
	.get(productController.getProduct)
	.patch(
		productController.uploadProductImages,
		productController.resizeProductImages,
		productController.updateProduct)
	.delete(
		authController.restrictTo('supervisor', 'owner'),
		productController.deleteProduct);




//// Restrict Routes for admin users


router.use(authController.restrictTo('supervisor', 'owner'));


router.route('/products/discontinued/:id')
	.patch(productController.discontinueProduct);



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