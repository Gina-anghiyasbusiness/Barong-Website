const mongoose = require('mongoose');

const Category = require('./../models/categoryModel');

const factory = require('./../controllers/handlerFactory')

const catchAsync = require('./../utilities/catchAsync');
const APIFeatures = require('./../utilities/apiFeatures');
const AppError = require('./../utilities/appError');

const filterObj = require('./../utilities/filterObject');



//------------------ Image Uploading  -------------------//

const multer = require('multer');
const sharp = require('sharp');


const multerStorage = multer.memoryStorage();


const multerFilter = (req, file, cb) => {

	if (file.mimetype.startsWith('image')) {

		cb(null, true);

	} else {

		cb(new AppError('Not an image - Please only upload images', 400), false);
	}
}


const upload = multer(
	{
		storage: multerStorage,
		fileFilter: multerFilter,
		limits: {
			fileSize: 10 * 1024 * 1024
		}
	}
);



exports.uploadCategoryImage = upload.fields([

	{ name: 'image', maxCount: 1 }
]);




exports.resizeCategoryImage = catchAsync(async (req, res, next) => {

	if (req.files.image) {

		const imageFilename = `product-${Date.now()}.webp`;

		await sharp(req.files.image[0].buffer)
			.resize(800, 800)
			.toFormat('webp', {
				quality: 65,
				nearLossless: false,
			})
			.toFile(`public/img/category_imgs/${imageFilename}`);

		req.body.image = imageFilename;

	}
	next();
})






/// create



exports.createCategory = catchAsync(async (req, res, next) => {

	if (req.file) req.body.image = req.file.filename;

	if (req.body.discount === '') req.body.discount = null;

	if (req.body.discount && !mongoose.Types.ObjectId.isValid(req.body.discount)) {

		return next(new AppError('Invalid discount ID', 400));
	}


	const filteredBody = filterObj(
		req.body,
		'name',
		'description',
		'image',
		'discount'
	);

	const newCategory = await Category.create(filteredBody);


	res.status(200).json({
		status: 'success',
		data: {
			category: newCategory
		}
	});


})



/// read all


exports.getAllCategories = factory.getAll(Category);


/// read one

exports.getCategory = factory.getOne(Category);



/// update


exports.updateCategory = catchAsync(async (req, res, next) => {

	if (req.file) req.body.image = req.file.filename;

	if (req.body.discount === '') req.body.discount = null;

	if (req.body.discount && !mongoose.Types.ObjectId.isValid(req.body.discount)) {

		return next(new AppError('Invalid discount ID', 400));
	}


	const filteredBody = filterObj(
		req.body,
		'name',
		'description',
		'image',
		'discount'
	);

	const category = await Category.findByIdAndUpdate(

		req.params.id,
		filteredBody,
		{ new: true, runValidators: true }
	)

	if (!category) return next(new AppError('Category not found', 404))

	res.status(200).json({

		status: "success",
		category
	})
})



/// delete 

exports.deleteCategory = factory.deleteOne(Category);




exports.deactivateCategory = catchAsync(async (req, res, next) => {

	if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

		return next(new AppError('Invalid category ID', 400));
	}


	const category = await Category.findByIdAndUpdate(req.params.id, { active: false },
		{
			new: true,
			runValidators: true
		});


	if (!category) {

		return next(new AppError('Category not found', 404));
	}

	res.status(200).json({
		status: 'success'
	})
})