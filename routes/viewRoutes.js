const express = require('express');
const router = express.Router();

const authController = require('./../controllers/authController.js');
const productController = require('./../controllers/productController.js');
const viewController = require('./../controllers/viewController.js');



//----------------  CLIENT ROUTES (FRONTEND-----------------///


/// IS LOGGED IN CHECK ON ALL ROUTES


router.use(authController.isLoggedIn);


//// Auth

router.get('/', viewController.getHomePage);

router.get('/login-page', viewController.loginPage);

router.get('/reset-password-page', viewController.resetPasswordPage);

router.get('/set-new-password-page/:token', viewController.setNewPasswordPage);





///		 Product Pages			


/// Barongs

router.get('/barong-list', viewController.getBarongListPage);

router.get('/barong/:slug', viewController.getBarongPage);



/// Shoes

router.get('/shoe-list', viewController.getShoeListPage);

router.get('/shoe/:slug', viewController.getShoePage);



/// Accessories

router.get('/accessories-list', viewController.getAccessoryListPage);

router.get('/accessories/:slug', viewController.getAccessoryPage);




/// Product Filter / Sort









/// Categories

router.get('/categories', viewController.getCategoriesPage);

router.get('/categories/:catId', viewController.getFrontEndCategoryPage);




/// Services



router.get('/static/services', viewController.getServicesPage);


/// Blog


///? THROWS ERROR AS PAGE IS EMPTY


router.get('/static/blog', viewController.getBlogPage);



/// About


///? THROWS ERROR AS PAGE IS EMPTY


router.get('/static/about', viewController.getAboutPage);


/// Contact



router.get('/static/contact', viewController.getContactPage);






/// User Pages

/// guest


/// guest Checkout - but it now


router.get('/order-success-guest',
	viewController.getSuccessfulPaymentPageGuest);


router.get('/checkout-page/buy-it-now-guest/:productId/:qty/:variant', viewController.getCheckoutPageGuest);


router.get('/guest-order-number/:orderId',
	viewController.getGuestOrderPage);



router.use(authController.protectRoute);

router.get('/address-form--user/:addressId', viewController.getAddressFormPage);

router.get('/address-form--user/', viewController.getEmptyAddressFormPage);

router.get('/my-account/:id', viewController.getAccountPage);







//-------- Placing orders ------//



/// Render Checkout page


router.get('/checkout-page',
	authController.restrictTo('user'),
	productController.setProductUserIds,
	viewController.getCheckoutPage);


/// Render Checkout page for buy it now


router.get('/checkout-page/buy-it-now/:productId/:qty/:variant',
	authController.restrictTo('user'),
	productController.setProductUserIds,
	viewController.getCheckoutPage);




/// Render Order success page


router.get('/order-success',
	authController.restrictTo('user'),
	productController.setProductUserIds,
	viewController.getSuccessfulPaymentPage);



/// Render Order page


router.get('/user-order-number/:orderNum',
	authController.restrictTo('user'),
	productController.setProductUserIds,
	viewController.getUserOrderPage);








//-------------------  ---------------------- ------------------///
//-------------------  ADMIN ROUTES (BACKEND) ------------------///
//-------------------  ---------------------- ------------------///


router.use(
	authController.protectRoute,
	authController.restrictTo('admin', 'supervisor', 'owner'));



router.get('/admin/be_home', viewController.adminPage);



//------------- 	Render Pages	 ------------//



///	 Users	 ///


router.get('/admin/be_user-list', viewController.getUserList);

router.get('/admin/be_user-page/:id', viewController.getUserPage);

router.get('/admin/be_new-user-page', viewController.getNewUserPage);

router.get('/my-details', viewController.getMyDetails)

router.get('/admin/be_user-search', viewController.getUserSearch);





// ------------ 	Products	----------- ///


router.get('/admin/be_products-dashboard', viewController.getProductsDashboard)



/// Barongs	

router.get('/admin/be_barongs-list', viewController.getBarongsList);

router.get('/admin/be_barong-item/:slug', viewController.getBarong);

router.get('/admin/be_barong-create', viewController.createBarongPage);

router.get('/admin/be_barong-search', viewController.getBarongSearch);



/// Shoes	


router.get('/admin/be_shoes-list', viewController.getShoesList);

router.get('/admin/be_shoe-item/:slug', viewController.getShoe);

router.get('/admin/be_shoes-create', viewController.createShoesPage);




/// Accessories	


router.get('/admin/be_accessories-list', viewController.getAccessoriesList);

router.get('/admin/be_accessories-item/:slug', viewController.getAccessory);

router.get('/admin/be_accessories-create', viewController.createAccessoriesPage);








// ------------ ----------	----------- ///





// ------------ 	Categories	----------- ///



router.get('/admin/be_category-list', viewController.getCategoryList);

router.get('/admin/be_new-category-page', viewController.getNewCategoryPage);

router.get('/admin/be_category-page/:id', viewController.getCategoryPage);





// ------------ 	Orders	----------- ///


router.get('/admin/be_order-list', viewController.getOrderList);

router.get('/admin/be_order-page/:orderNum', viewController.getOrderPage);

router.get('/admin/be_order-search', viewController.getOrderSearch);




// ------------ 	Transactions	----------- ///


router.get('/admin/be_transaction-list', viewController.getTransactionList);

router.get('/admin/be_transaction-search', viewController.getTransactionSearch);




// ------------ 	Discounts	----------- ///


router.get('/admin/be_discount-list', viewController.getDiscountList);

router.get('/admin/be_discount-create', viewController.createDiscountPage);

router.get('/admin/be_discount-update/:id', viewController.updateDiscountPage);





module.exports = router;