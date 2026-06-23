const mongoose = require('mongoose');

const AppError = require('./../utilities/appError');
const catchAsync = require('./../utilities/catchAsync');

const Discount = require('./../models/discountModel');

const filterObj = require('./../utilities/filterObject');





exports.addNewDiscount = catchAsync(async (req, res, next) => {

	const filteredBody = filterObj(
		req.body,
		'code',
		'percentage',
		'amount',
		'appliesToCategories',
		'startDate',
		'endDate',
		'active'
	);


	const newDiscount = await Discount.create(filteredBody);

	res.status(200).json({
		status: 'success',
		data: {
			discount: newDiscount
		}
	});
})





exports.updateDiscount = catchAsync(async (req, res, next) => {

	const discountId = req.params.id;

	if (!mongoose.Types.ObjectId.isValid(discountId)) {

		return next(new AppError('Invalid discount ID', 400));
	}


	const filteredBody = filterObj(
		req.body,
		'code',
		'percentage',
		'amount',
		'appliesToCategories',
		'startDate',
		'endDate',
		'active'
	);


	const updatedDiscount = await Discount.findByIdAndUpdate(discountId, filteredBody,
		{
			new: true,
			runValidators: true
		})


	if (!updatedDiscount) {

		return next(new AppError('Discount not found', 404));
	}

	res.status(200).json({
		status: 'success',
		data: {
			discount: updatedDiscount
		}

	});
})



