const Category = require('../models/categoryModel');
const Discount = require('../models/discountModel');


const categoryDiscountPrice = async (product) => {


	let price;


	const category = await Category.findById(product.category);

	const catDiscount = await Discount.findById(category.discount);

	const catPercent = catDiscount.percentage;

	const catAmount = catDiscount.amount;

	if (!category || !catDiscount) {

		return;
	}

	else if (catPercent > 0) {

		return price = product.currentPrice - (product.currentPrice * (catPercent / 100));

	} else {

		return price = product.currentPrice - catAmount;
	}
};



module.exports = categoryDiscountPrice;