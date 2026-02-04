const SpecProd = require('../models/specProdModel');
const Accessory = require('../models/accessoryModel');
const Shoe = require('../models/shoeModel');
const CounterProd = require('../models/counterProduct');

const factory = require('./../controllers/handlerFactory');

const productAggregation = require('./../aggregations/productPipelines');

const AppError = require('./../utilities/appError');
const catchAsync = require('../utilities/catchAsync');
const filterObj = require('../utilities/filterObject');




//------------------ Set product and user ids for all routes -------------------//


exports.setProductUserIds = (req, res, next) => {

	if (!req.body.product) req.body.product = req.params.productId;
	if (!req.body.user) req.body.user = req.user.id;

	next();
}





//------------------ Image Uploading  -------------------//

const multer = require('multer');
const sharp = require('sharp');



// ------------- Multer Storage ------------- ///



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
		fileFilter: multerFilter
	}
);




/// When using multiple images: include imageCover


exports.uploadProductImages = upload.fields([

	{ name: 'imageCover', maxCount: 1 },
	{ name: 'imageUrls', maxCount: 3 }
]);



//--------------- Barong Image Upload ---------------- //



exports.resizeProductImages = catchAsync(async (req, res, next) => {

	/// ImageCover - set to Portrait 450 x 800

	if (req.files.imageCover) {

		const imageCoverFilename = `product-${Date.now()}.webp`;

		await sharp(req.files.imageCover[0].buffer)
			.resize(450, 800)
			.toFormat('webp', {
				quality: 80,
				nearLossless: false,
			})
			.toFile(`public/img/product_imgs/${imageCoverFilename}`);

		req.body.imageCover = imageCoverFilename;
	}


	/// Image Array - set to square 800 x 800

	if (req.files.imageUrls) {

		req.body.imageUrls = [];

		const timestamp = Date.now();

		await Promise.all(req.files.imageUrls.map(

			async (file, index) => {

				const filename = `product-${timestamp}-${index + 1}.webp`;

				await sharp(file.buffer)
					.resize(800, 800)
					.toFormat('webp', {
						quality: 65,
						nearLossless: false,
					})
					.toFile(`public/img/product_imgs/${filename}`);

				req.body.imageUrls.push(filename);
			}
		))
	}
	next();
})



//--------------- Shoes / Accessory Image Upload ---------------- //


exports.resizeOtherImages = catchAsync(async (req, res, next) => {

	/// ImageCover - set to Square 800 x 800

	if (req.files.imageCover) {

		const imageCoverFilename = `product-${Date.now()}.webp`;

		await sharp(req.files.imageCover[0].buffer)
			.resize(800, 800)
			.toFormat('webp', {
				quality: 80,
				nearLossless: false,
			})
			.toFile(`public/img/product_imgs/${imageCoverFilename}`);

		req.body.imageCover = imageCoverFilename;
	}


	/// Image Array - set to square 800 x 800

	if (req.files.imageUrls) {

		req.body.imageUrls = [];

		const timestamp = Date.now();

		await Promise.all(req.files.imageUrls.map(

			async (file, index) => {

				const filename = `product-${timestamp}-${index + 1}.webp`;

				await sharp(file.buffer)
					.resize(800, 800)
					.toFormat('webp', {
						quality: 65,
						nearLossless: false,
					})
					.toFile(`public/img/product_imgs/${filename}`);

				req.body.imageUrls.push(filename);
			}
		))
	}
	next();
})







//-------------  Factory function calls  -----------//



///     Barong Functionality			///



exports.createBarong = catchAsync(async (req, res, next) => {

	const counterProd = await CounterProd.findOneAndUpdate(
		{ name: 'product' },
		{ $inc: { seq: 1 } },
		{ new: true, upsert: true }
	)

	const productSku = String(counterProd.seq).padStart(4, '0');

	if (req.body.discount === '') req.body.discount = null;
	if (req.body.category === '') req.body.category = null;


	//----------------------- Variants ------------------------//

	///	Can Leave if no variants are required for the Product	//

	if (req.body.variants && typeof req.body.variants === 'string') {

		req.body.variants = JSON.parse(req.body.variants);
	}

	if (req.body.sex === 'female' && Array.isArray(req.body.variants)) {

		const sizeMapFemale = {

			S: '8',
			M: '10',
			L: '12',
			XL: '14',
			XXL: '16',
			XXXL: '18'
		};

		req.body.variants = req.body.variants.map(v => {

			const converted = sizeMapFemale[v.size] || v.size;

			return { ...v, size: converted };
		});
	}

	///		//////////////////////////////////////////////////////

	//---------------------- ---------- -----------------------//


	if (req.file) req.body.imageCover = req.file.filename;

	const data = filterObj(req.body,

		'name',
		'description',
		'originalPrice',
		'imageCover',
		'imageUrls',
		'category',
		'tags',

		//---------------------- Variants -----------------------//

		'color',
		'sex',
		'style',
		'variants'

		//---------------------- ------- -----------------------//
	);

	data.productSku = productSku;

	const newProduct = await SpecProd.create(data);

	res.status(200).json({
		status: 'success',
		data: {
			product: newProduct
		}
	});
});




/// read All Products 

exports.getAllProducts = factory.getAll(SpecProd);



/// read one (findbyId and populate using popOptions Array)

exports.getProduct = factory.getOne(SpecProd, [

	{ path: 'category', select: 'name description image' }, {
		path: 'reviews', select: 'user rating comment -product',
		populate: [
			{ path: 'user', select: 'name' },
		]
	}])



exports.updateProduct = factory.updateOne(SpecProd);
exports.deleteProduct = factory.deleteOne(SpecProd);


/// Deactivate product


exports.discontinueProduct = catchAsync(async (req, res, next) => {

	const discontinue = await SpecProd.findByIdAndUpdate(

		req.params.id,
		{ discontinued: true },
		{
			new: true,
			runValidators: true
		}
	);

	if (!discontinue) {
		return next(new AppError('No product found with that ID', 404));
	}

	res.status(200).json({
		status: 'success',
		data: {
			discontinue
		}
	});
});



//--------- Aggregation Pipeline calls --------//

exports.getNewestProducts = catchAsync(async (req, res, next) => {

	const products = await SpecProd.aggregate(productAggregation.newestTenPipeline);

	res.status(200).json({
		status: 'success',
		results: products.length,
		data: products
	})
})






///     Shoe Functionality			///


exports.createShoes = catchAsync(async (req, res, next) => {

	const counterProd = await CounterProd.findOneAndUpdate(
		{ name: 'product' },
		{ $inc: { seq: 1 } },
		{ new: true, upsert: true }
	)

	const productSku = String(counterProd.seq).padStart(4, '0');

	if (req.body.discount === '') req.body.discount = null;
	if (req.body.category === '') req.body.category = null;


	//----------------------- Variants ------------------------//

	///	Can Leave if no variants are required for the Product	//

	if (req.body.variants && typeof req.body.variants === 'string') {

		req.body.variants = JSON.parse(req.body.variants);
	}

	///		//////////////////////////////////////////////////////

	//---------------------- ---------- -----------------------//

	if (req.file) req.body.imageCover = req.file.filename;

	const data = filterObj(req.body,

		'name',
		'description',
		'originalPrice',
		'imageCover',
		'imageUrls',
		'category',
		'tags',

		//---------------------- Variants -----------------------//

		'color',
		'sex',
		'style',
		'variants'

		//---------------------- ------- -----------------------//
	);

	data.productSku = productSku;

	const newProduct = await Shoe.create(data);

	res.status(200).json({
		status: 'success',
		data: {
			product: newProduct
		}
	});
});


exports.updateShoe = factory.updateOne(Shoe);
exports.deleteShoe = factory.deleteOne(Shoe);


exports.discontinueShoes = catchAsync(async (req, res, next) => {

	const discontinue = await Shoe.findByIdAndUpdate(
		req.params.id,

		{ discontinued: true },
		{
			new: true,
			runValidators: true
		}
	);

	if (!discontinue) {

		return next(new AppError('No product found with that ID', 404));
	}

	res.status(200).json({
		status: 'success',
		data: {
			discontinue
		}
	});
});


///     Accessories Functionality			///


exports.createAccessories = catchAsync(async (req, res, next) => {

	const counterProd = await CounterProd.findOneAndUpdate(

		{ name: 'product' },
		{ $inc: { seq: 1 } },
		{ new: true, upsert: true }
	)

	const productSku = String(counterProd.seq).padStart(4, '0');

	if (req.body.discount === '') req.body.discount = null;
	if (req.body.category === '') req.body.category = null;

	if (req.file) req.body.imageCover = req.file.filename;

	const data = filterObj(req.body,

		'name',
		'description',
		'originalPrice',
		'imageCover',
		'imageUrls',
		'category',
		'tags',
		'color'
	);

	data.productSku = productSku;

	const newProduct = await Accessory.create(data);

	res.status(200).json({
		status: 'success',
		data: {
			product: newProduct
		}
	});
});


exports.updateAccessory = factory.updateOne(Accessory);
exports.deleteAccs = factory.deleteOne(Accessory);

exports.discontinueAccs = catchAsync(async (req, res, next) => {

	const discontinue = await Accessory.findByIdAndUpdate(

		req.params.id,

		{ discontinued: true },
		{
			new: true,
			runValidators: true
		}
	);

	if (!discontinue) {

		return next(new AppError('No product found with that ID', 404));
	}

	res.status(200).json({
		status: 'success',
		data: {
			discontinue
		}
	});
});


