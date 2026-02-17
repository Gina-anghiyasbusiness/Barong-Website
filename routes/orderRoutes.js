const express = require('express');
const router = express.Router({ mergeParams: true });

const authController = require('../controllers/authController.js');
const productController = require('./../controllers/productController.js');

const orderController = require('../controllers/orderController.js');



/// Add Address route guest


router.post('/add-address-checkout-guest',
	orderController.addAddressToUserGuest
);


router.post('/checkout-session-bin-guest/:product/:qty/:variant',
	orderController.buyItNowGuestItem
);



///		Paypal buyitnow - guest routes


router.post('/paypal/buy-it-now-guest/:product/:qty/:variant', orderController.buyItNowItemPayPal);


///? PayPal "Capture Order" (finalizes order after approval)

router.post('/paypal/capture-order-guest/:orderID', orderController.capturePayPalOrder);




/// Set Restrictions 


/// Admin update order 



router.patch('/update-user-order/:orderstatus/:transstatus/:address/:ordernum',
	authController.protectRoute,
	authController.restrictTo('admin', 'supervisor', 'owner'),
	orderController.updateUserOrder)



//-------- Buy product routes for cart and buyitnow -------//


router.use(
	authController.protectRoute,
	authController.restrictTo('user'),
	productController.setProductUserIds
);






///			Paypal			///

///? PayPal "Buy It Now" (creates order)

router.post('/paypal/buy-it-now/:product/:qty/:variant', orderController.buyItNowItemPayPal);


///? PayPal "Cart" (creates order)

router.post('/paypal/cart', orderController.cartItemsPayPal);


///? PayPal "Capture Order" (finalizes order after approval)

router.post('/paypal/capture-order/:orderID', orderController.capturePayPalOrder);





///			Stripe			///

router.get('/checkout-session', orderController.buyCartItems);


router.get(
	'/checkout-session-bin/:product/:qty/:variant',
	orderController.buyItNowItem
);



/// Add Address route

router.post('/add-address-checkout', orderController.addAddressToUser)






module.exports = router;