const catchAsync = require('./../utilities/catchAsync');
const APIFeatures = require('./../utilities/apiFeatures');
const AppError = require('./../utilities/appError');


const Discount = require('./../models/discountModel');






exports.addNewDiscount = catchAsync(async (req, res, next) => {

	const newDiscount = await Discount.create(req.body);

	res.status(200).json({
		status: 'success',
		data: {
			discount: newDiscount
		}
	});
})



exports.updateDiscount = catchAsync(async (req, res, next) => {

	const discountId = req.params.id;

	const updatedDiscount = await Discount.findByIdAndUpdate(discountId, req.body,
		{
			new: true,
			runValidators: true
		})

	res.status(200).json({
		status: 'success',
		data: {
			discount: updatedDiscount
		}

	});
})



