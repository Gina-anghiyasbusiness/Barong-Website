
const Category = require('../models/categoryModel');
const Discount = require('../models/discountModel');

const priceAtPurchaseDiscount = require('../utilities/priceAtPurchase');
const categoryDiscountPrice = require('../utilities/categoryDiscountOnPurchase');



const checkoutVar = async (product, value) => {


	if (!product.discount && !product.category) {

		value = product.currentPrice;

	}

	else if (!product.category || product.discount) {

		value = await priceAtPurchaseDiscount(product);

	}

	else if (!product.category.discount) {

		value = product.currentPrice;

	} else {

		value = await categoryDiscountPrice(product);
	}

	return value
}



module.exports = checkoutVar;