const express = require('express');
const router = express.Router({ mergeParams: true });

const authController = require('../controllers/authController.js');
const productController = require('./../controllers/productController.js');

const orderController = require('../controllers/orderController.js');

const middlewareDisableCheckout = require('../middleware/previewCheckoutDisabled.js');




//---------- Disable Checkout Routes while in Development ---------------//


/// Guest Checkout


router.post('/add-address-checkout-guest',
	middlewareDisableCheckout,
	orderController.addAddressToUserGuest
);

router.post('/checkout-session-bin-guest/:product/:qty/:variant',
	middlewareDisableCheckout,
	orderController.buyItNowGuestItem
);

router.post('/paypal/buy-it-now-guest/:product/:qty/:variant',
	middlewareDisableCheckout,
	orderController.buyItNowItemPayPal
);

router.post('/paypal/capture-order-guest/:orderID',
	middlewareDisableCheckout,
	orderController.capturePayPalOrder
);



/// Set Restrictions 


/// Admin update order 



router.patch('/update-user-order/:orderstatus/:transstatus/:address/:ordernum',
	authController.protectRoute,
	authController.restrictTo('admin', 'supervisor', 'owner'),
	orderController.updateUserOrder)



//-------- Buy product routes for cart and buyitnow -------//



/// logged in user checkout


router.use(
	authController.protectRoute,
	authController.restrictTo('user'),
	productController.setProductUserIds
);


router.post('/paypal/buy-it-now/:product/:qty/:variant',
	middlewareDisableCheckout,
	orderController.buyItNowItemPayPal
);

router.post('/paypal/cart',
	middlewareDisableCheckout,
	orderController.cartItemsPayPal
);

router.post('/paypal/capture-order/:orderID',
	middlewareDisableCheckout,
	orderController.capturePayPalOrder
);

router.post('/checkout-session',
	middlewareDisableCheckout,
	orderController.buyCartItems
);

router.post('/checkout-session-bin/:product/:qty/:variant',
	middlewareDisableCheckout,
	orderController.buyItNowItem
);

router.post('/add-address-checkout',
	middlewareDisableCheckout,
	orderController.addAddressToUser
);


module.exports = router;

