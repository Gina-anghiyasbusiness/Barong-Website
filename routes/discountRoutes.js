const express = require('express');
const router = express.Router();

const discountController = require('./../controllers/discountController.js');





///			Add new discount   

router.post('/new-discount-create', discountController.addNewDiscount);

router.patch('/update-discount/:id', discountController.updateDiscount);







module.exports = router;