const express = require('express');
const router = express.Router();

const categoryController = require('./../controllers/categoryController.js');
const authController = require('./../controllers/authController.js');

const Category = require('../models/categoryModel.js');




router.route('/')
	.get(categoryController.getAllCategories)
	.post(
		authController.protectRoute,
		categoryController.createCategory)





router.route('/:id')
	.get(
		authController.protectRoute,
		categoryController.getCategory)
	.patch(
		authController.protectRoute,
		authController.restrictTo('supervisor', 'owner'),
		categoryController.updateCategory)
	.delete(
		authController.protectRoute,
		authController.restrictTo('supervisor', 'owner'),
		categoryController.deleteCategory);



module.exports = router;