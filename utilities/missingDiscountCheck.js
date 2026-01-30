const Category = require('../models/categoryModel');
const Discount = require('../models/discountModel');

const priceAtPurchaseDiscount = require('../utilities/priceAtPurchase');
const categoryDiscountPrice = require('../utilities/categoryDiscountOnPurchase');




const missingDiscountCheck = async (product) => {


	if (!product.discount && !product.category) {

		product.discountPrice = product.currentPrice;
	}

	else if (!product.category || product.discount) {

		product.discountPrice = await priceAtPurchaseDiscount(product);
	}

	else if (!product.category.discount) {

		product.discountPrice = product.currentPrice;
	}

	else product.discountPrice = await categoryDiscountPrice(product);
}



module.exports = missingDiscountCheck;