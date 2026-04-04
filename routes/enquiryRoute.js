const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');

router.post('/', enquiryController.createEnquiry);

router.post('/customization', enquiryController.createCustomizationEnquiry);



module.exports = router;