const catchAsync = require('./../utilities/catchAsync');
const APIFeatures = require('./../utilities/apiFeatures');
const AppError = require('./../utilities/appError');
const filterObject = require('./../utilities/filterObject');

const mongoose = require('mongoose');


//-------------- 	Create ---------------	///


exports.createOne = (Model) => catchAsync(async (req, res, next) => {

	const doc = await Model.create(req.body);

	res.status(200).json({

		status: 'success',
		doc
	});
});



//------------------ Read  ---------------- //



///	 Read all		///

exports.getAll = (Model) => catchAsync(async (req, res) => {

	/// filter for reviews

	let productFilter = {};

	if (req.params.productId) productFilter = { product: req.params.productId }


	/// apply the APIFeatures from the URL query parameter 

	const features = new APIFeatures(Model.find(productFilter), req.query)
		.filter()
		.sort()
		.limitFields()
		.paginate();

	const doc = await features.query;

	res.status(200).json({

		status: "success",
		results: doc.length,
		doc

	})
})


/// 		Read one (findbyId) 		///


exports.getOne = (Model, popOptions) => catchAsync(async (req, res, next) => {

	let query = Model.findById(req.params.id);

	/// also checks if popOptions is an array of populates (which we need)

	if (popOptions) {

		if (Array.isArray(popOptions)) {

			popOptions.forEach(pop => query = query.populate(pop));

		} else {

			query = query.populate(popOptions);
		}
	}


	const doc = await query;

	if (!doc) return next(new AppError('Document not found', 404))

	res.status(200).json({

		status: "success",
		doc
	})
})





//-----------------	Update ------------------//



exports.updateOne = (Model) => catchAsync(async (req, res, next) => {

	///			CHECKS			///

	if (req.body.category === '' || req.body.category === undefined) req.body.category = null;
	if (req.body.discount === '' || req.body.discount === undefined) req.body.discount = null;

	if (req.file) {

		req.body.imageCover = req.file.filename;
	}

	if (req.body.discount && req.body.discount.length === 24) {

		req.body.discount = new mongoose.Types.ObjectId(req.body.discount);

	} else {

		req.body.discount = null;
	}

	///	////////////////////	///

	const doc = await Model.findByIdAndUpdate(

		req.params.id,
		req.body,
		{
			new: true,
			runValidators: true
		}
	)

	if (!doc) return next(new AppError('Document not found', 404))

	res.status(200).json({

		status: "success",
		doc
	})
})







//-----------------	Delete	---------------//



exports.deleteOne = (Model) => catchAsync(async (req, res, next) => {

	const doc = await Model.findByIdAndDelete(req.params.id)

	if (!doc) return next(new AppError('No Document Found', 404))

	res.status(204).json({

		status: 'success'
	});
})
