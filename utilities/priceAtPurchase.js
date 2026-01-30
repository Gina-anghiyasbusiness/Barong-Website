const Discount = require('../models/discountModel');


const priceAtPurchaseDiscount = async (product) => {


	const discount = await Discount.findById(product.discount);

	if (!discount) return product.currentPrice;

	return discount.percentage
		? product.currentPrice - (product.currentPrice * (discount.percentage / 100))
		: product.currentPrice - discount.amount;
};






module.exports = priceAtPurchaseDiscount;