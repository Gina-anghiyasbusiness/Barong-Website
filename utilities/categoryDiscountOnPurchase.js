const Category = require('../models/categoryModel');
const Discount = require('../models/discountModel');


const categoryDiscountPrice = async (product) => {

	const category = await Category.findById(product.category);

	if (!category || !category.discount) return product.currentPrice;


	const catDiscount = await Discount.findById(category.discount);

	if (!catDiscount) return product.currentPrice;


	const now = new Date();

	const startDate = catDiscount.startDate ? new Date(catDiscount.startDate) : null;

	const endDate = catDiscount.endDate ? new Date(catDiscount.endDate) : null;

	if (endDate) { endDate.setHours(23, 59, 59, 999); }

	const isActiveDiscount =
		catDiscount.active === true &&
		(!startDate || startDate <= now) &&
		(!endDate || endDate >= now);


	if (!isActiveDiscount) return product.currentPrice;


	const catPercent = catDiscount.percentage;

	const catAmount = catDiscount.amount;


	if (catPercent > 0) {

		return product.currentPrice - (product.currentPrice * (catPercent / 100));
	}

	if (catAmount > 0) {

		return product.currentPrice - catAmount;
	}

	return product.currentPrice;
};



module.exports = categoryDiscountPrice;