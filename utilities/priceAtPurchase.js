const Discount = require('../models/discountModel');


const priceAtPurchaseDiscount = async (product) => {

	const discount = await Discount.findById(product.discount);

	if (!discount) return product.currentPrice;


	const now = new Date();

	const startDate = discount.startDate ? new Date(discount.startDate) : null;

	const endDate = discount.endDate ? new Date(discount.endDate) : null;

	if (endDate) {
		endDate.setHours(23, 59, 59, 999);
	}


	const isActiveDiscount =
		discount.active === true &&
		(!startDate || startDate <= now) &&
		(!endDate || endDate >= now);

	if (!isActiveDiscount) return product.currentPrice;


	if (discount.percentage > 0) {

		return product.currentPrice - (product.currentPrice * (discount.percentage / 100));
	}

	if (discount.amount > 0) {

		return product.currentPrice - discount.amount;
	}

	return product.currentPrice;
};


module.exports = priceAtPurchaseDiscount;