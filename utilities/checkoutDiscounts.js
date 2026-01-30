const Category = require('../models/categoryModel');
const Discount = require('../models/discountModel');

const priceAtPurchaseDiscount = require('../utilities/priceAtPurchase');
const categoryDiscountPrice = require('../utilities/categoryDiscountOnPurchase');




const checkoutDiscounts = async (product, qty) => {



	if (!product.discount && !product.category) {

		product.discountPrice = product.currentPrice;

		totalNet = product.discountPrice * qty;


	}

	else if (!product.category || product.discount) {

		product.discountPrice = await priceAtPurchaseDiscount(product);
		totalNet = product.discountPrice * qty;

	}

	else if (!product.category.discount) {

		product.discountPrice = await priceAtPurchaseDiscount(product);
		totalNet = product.discountPrice * qty;

	} else {

		product.discountPrice = await categoryDiscountPrice(product);
		totalNet = product.discountPrice * qty;
	}

	return totalNet;

}


module.exports = checkoutDiscounts;
