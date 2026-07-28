const express = require('express');
const router = express.Router();

const authController = require('./../controllers/authController.js');
const productController = require('./../controllers/productController.js');
const viewController = require('./../controllers/viewController.js');

const blockPreviewPaymentSuccess = require('../middleware/blockPreviewPaymentSuccess.js');



//----------------  CLIENT ROUTES (FRONTEND) -----------------///



/// IS LOGGED IN CHECK ON ALL ROUTES


router.use(authController.isLoggedIn);



/// view my account email link guard 


router.get('/me', (req, res) => {
	if (req.user) {
		return res.redirect(`/my-account/${req.user.id}`);
	}

	res.redirect('/login-page');
});



/// block admin staff from front end pages


router.use((req, res, next) => {

	if (req.user && req.user.role !== 'user' && !req.originalUrl.startsWith('/admin')) {

		return res.redirect('/admin/be_home');
	}

	next();
});


//// Auth

router.get('/', viewController.getHomePage);

router.get('/login-page', viewController.loginPage);

router.get('/reset-password-page', viewController.resetPasswordPage);

router.get('/set-new-password-page/:token', viewController.setNewPasswordPage);





//------------		 Product Pages		--------------//


router.get('/static/sales', viewController.getSalesPage);


/// Barongs

router.get('/barong-list', viewController.getBarongListPage);

router.get('/barong/:slug', viewController.getBarongPage);



/// bags

router.get('/bag-list', viewController.getBagListPage);

router.get('/bag/:slug', viewController.getBagPage);



/// Shoes - redirect to sales whilst not selling


router.get('/shoe-list', (req, res) => res.redirect(301, '/static/sales'));
router.get('/shoe/:slug', (req, res) => res.redirect(301, '/static/sales'));



/// Accessories

router.get('/accessories-list', viewController.getAccessoryListPage);

router.get('/accessories/:slug', viewController.getAccessoryPage);




//------------		Service Pages		--------------//


/// Services

router.get('/static/services', viewController.getServicesPage);


/// Customization


router.get('/static/custom', viewController.getCustomizationPage);


router.get('/static/contact-custom', viewController.getCustomContactPage);


/// Rentals


router.get('/static/rentals', viewController.getRentalsPage);


router.get('/static/rental-guidelines', viewController.getRentalGuidePage);








//------------	Other	Static Pages		--------------//


/// About

router.get('/static/about', viewController.getAboutPage);




/// Contact

router.get('/static/contact', viewController.getContactPage);



///	Enquiry Success Route 

router.get('/enquiry-success', viewController.getEnquirySuccess);



/// Privacy Policy

router.get('/static/privacy', viewController.getPrivacyPage);




//---------- Categories and blog not added yet!! ----------//



/// Categories

router.get('/categories', viewController.getCategoriesPage);

router.get('/categories/:catId', viewController.getFrontEndCategoryPage);




/// Blog

///? THROWS ERROR AS PAGE IS EMPTY

// router.get('/static/blog', viewController.getBlogPage);






/// User Pages

/// guest


/// guest Checkout - but it now


router.get('/order-success-guest',
	blockPreviewPaymentSuccess,
	viewController.getSuccessfulPaymentPageGuest
);


router.get('/checkout-page/buy-it-now-guest/:productId/:qty/:variant', viewController.getCheckoutPageGuest);



router.get('/guest-order-number/:orderId/:accessToken',
	viewController.getGuestOrderPage);




/// Render Order page for user


router.get('/user-order-number/:orderNum',
	(req, res, next) => {
		if (!req.user) {
			return res.redirect('/login-page');
		}

		next();
	},
	authController.restrictTo('user'),
	productController.setProductUserIds,
	viewController.getUserOrderPage);






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
	blockPreviewPaymentSuccess,
	productController.setProductUserIds,
	viewController.getSuccessfulPaymentPage);





//-------------------  ---------------------- ------------------///
//-------------------  ADMIN ROUTES (BACKEND) ------------------///
//-------------------  ---------------------- ------------------///


router.use(
	authController.protectRoute,
	authController.restrictTo('admin', 'supervisor', 'owner'));



router.get('/admin/be_home', viewController.adminPage);


router.get('/admin/be_enquiries', viewController.adminEnquiriesPage);


router.get('/admin/be_enquiries/:id', viewController.adminEnquiryPage);





router.get('/admin/be_custom-enquiries', viewController.adminCustomEnquiriesPage);

router.get('/admin/be_custom-enquiries/:id', viewController.adminCustomEnquiryPage);


//------------- 	Render Pages	 ------------//



///	 Users	 ///

router.get('/admin/my-details', viewController.getMyDetails)

router.get('/admin/be_user-list', viewController.getUserList);

router.get('/admin/be_user-page/:id', viewController.getUserPage);

router.get('/admin/be_new-user-page',
	authController.restrictTo('supervisor', 'owner'),
	viewController.getNewUserPage
);


router.get('/admin/be_user-search', viewController.getUserSearch);





// ------------ 	Products	----------- ///


router.get('/admin/be_products-dashboard', viewController.getProductsDashboard)



/// Barongs	

router.get('/admin/be_barongs-list', viewController.getBarongsList);

router.get('/admin/be_barong-item/:slug', viewController.getBarong);

router.get('/admin/be_barong-create', viewController.createBarongPage);

router.get('/admin/be_barong-search', viewController.getBarongSearch);



/// Shoes	


// router.get('/admin/be_shoes-list', viewController.getShoesList);

// router.get('/admin/be_shoe-item/:slug', viewController.getShoe);

// router.get('/admin/be_shoes-create', viewController.createShoesPage);



/// Bags	


router.get('/admin/be_bag-list', viewController.getBagList);

router.get('/admin/be_bag-item/:slug', viewController.getBag);

router.get('/admin/be_bag-create', viewController.createBagPage);

router.get('/admin/be_bag-search', viewController.getBagSearch);






/// Accessories	


router.get('/admin/be_accessories-list', viewController.getAccessoriesList);

router.get('/admin/be_accessories-item/:slug', viewController.getAccessory);

router.get('/admin/be_accessories-create', viewController.createAccessoriesPage);

router.get('/admin/be_accessories-search', viewController.getAccessorySearch);







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