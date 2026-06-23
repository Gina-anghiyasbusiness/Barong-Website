const express = require('express');
const router = express.Router();

const authController = require('./../controllers/authController.js');
const discountController = require('./../controllers/discountController.js');




/// protection

router.use(authController.protectRoute);

router.use(authController.restrictTo('admin', 'owner', 'supervisor'));




///			Add new discount   

router.post('/new-discount-create', discountController.addNewDiscount);

router.patch('/update-discount/:id', discountController.updateDiscount);







module.exports = router;