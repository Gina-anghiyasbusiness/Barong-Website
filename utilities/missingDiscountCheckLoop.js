const Category = require('../models/categoryModel');
const Discount = require('../models/discountModel');

const priceAtPurchaseDiscount = require('../utilities/priceAtPurchase');
const categoryDiscountPrice = require('../utilities/categoryDiscountOnPurchase');




const missingDiscountCheckLoop = async (product, item) => {

	if (!product.discount && !product.category) {

		item.discountPrice = product.currentPrice;
	}

	else if (!product.category || product.discount) {

		item.discountPrice = await priceAtPurchaseDiscount(product);
	}

	else if (!product.category.discount) {

		item.discountPrice = product.currentPrice;
	}

	else item.discountPrice = await categoryDiscountPrice(product);
}


module.exports = missingDiscountCheckLoop;