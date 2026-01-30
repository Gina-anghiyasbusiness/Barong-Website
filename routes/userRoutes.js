const express = require('express');
const router = express.Router();

const authController = require('./../controllers/authController.js');
const userController = require('./../controllers/userController.js');
const productController = require('./../controllers/productController.js');





//------------ Auth Controller -------------//



/// User Signup

router.post('/signup', authController.signup);



/// User Login/logout 

router.post('/login', authController.login);

router.get('/logout', authController.logout);




/// password functionality 

router.post('/forgotPassword', authController.forgotPassword);

router.patch('/resetPassword/:token', authController.resetPassword);




// ---------   Logged In User Functionality -------- //


//// 	Protect ALL subsequent routes	 ////


router.use(authController.protectRoute);


router.patch('/updateMe', userController.updateMe);

router.patch('/updateMyPassword', authController.updatePassword);



router.patch('/updateMyAddress/:addressId', userController.updateMyAddress);

router.patch('/updateUserAddress/:addressId/:userId', userController.updateMyAddress);


router.post('/createNewAddress', userController.createNewAddress);


router.delete('/deleteAddress/:addressId', userController.deleteAnAddress)




//---------- User Controller ------------ //


router.get('/me', userController.getMe, userController.getUser);

router.delete('/deleteMe', userController.deleteMyAccount);








//----------- User Routes -----------//


//// Restrict Routes


router.use(authController.restrictTo('supervisor', 'owner'));


router.route('/')
	.get(userController.getAllUsers)
	.post(userController.createBeUser);

router.route('/:id')
	.get(userController.getUser)
	.patch(userController.updateUser)
	.delete(userController.deleteUser);



module.exports = router;