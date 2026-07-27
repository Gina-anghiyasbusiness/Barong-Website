const mongoose = require('mongoose');

const catchAsync = require('./../utilities/catchAsync');
const APIFeatures = require('./../utilities/apiFeatures');
const AppError = require('./../utilities/appError');

const priceAtPurchaseDiscount = require('../utilities/priceAtPurchase');
const categoryDiscountPrice = require('../utilities/categoryDiscountOnPurchase');
const missingDiscountCheck = require('../utilities/missingDiscountCheck');
const missingDiscountCheckLoop = require('../utilities/missingDiscountCheckLoop');


const CustomEnquiry = require('./../models/customizationEnquiryModel');
const Enquiry = require('./../models/enquiryModel');
const SpecProd = require('./../models/specProdModel');
const Shoe = require('./../models/shoeModel');
const Bag = require('../models/bagModel');
const Accessory = require('../models/accessoryModel');
const User = require('./../models/userModel');
const Category = require('./../models/categoryModel');
const Order = require('./../models/orderModel');
const Review = require('./../models/reviewModel');
const Transaction = require('./../models/transactionModel');
const Discount = require('./../models/discountModel');
const GuestAddress = require('../models/guestAddressModel');

const { verifyGuestOrderAccessToken } = require('../utilities/guestOrderAccess');

const { description } = require('../models/productBaseModel');

const { calculateTotals } = require('../utilities/newCheckoutTotals');


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



/// Product Schema for seo


const getProductDisplayPrice = product => {

	const currentPrice = product.currentPrice || product.originalPrice;
	const discountPrice = product.discountPrice;

	if (discountPrice && discountPrice < currentPrice) {

		return discountPrice;
	}

	return currentPrice;
};


const buildProductSchema = (product, productDescription, productPath) => {

	const canonicalBase = process.env.CANONICAL_URL;
	const productImages = [
		product.imageCover,
		...(product.imageUrls || [])
	]
		.filter(Boolean)
		.map(image => `${canonicalBase}img/product_imgs/${image}`);

	const price = getProductDisplayPrice(product);

	return {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: product.name,
		description: productDescription,
		image: productImages,
		sku: String(product.productSku),
		brand: {
			'@type': 'Brand',
			name: 'Ang Hiyas'
		},
		offers: {
			'@type': 'Offer',
			url: `${canonicalBase}${productPath}`,
			priceCurrency: 'AUD',
			price: Number(price).toFixed(2),
			availability: 'https://schema.org/InStock',
			itemCondition: 'https://schema.org/NewCondition',
			seller: {
				'@type': 'Organization',
				name: 'Ang Hiyas'
			}
		}
	};
};




//------------------------ login Page ---------------------------


exports.loginPage = (req, res) => {

	res.status(200).render('login', {

		pageTitle: 'Login or Sign Up | Ang Hiyas',
		pageDescription: 'Log in or create an Ang Hiyas account to manage orders, saved details, wishlist items and your Filipino clothing purchases.',
		canonicalUrl: `${process.env.CANONICAL_URL}login-page`,
		noIndex: true
	})
}


//------------------- Reset Password Page ----------------------


exports.resetPasswordPage = (req, res) => {

	res.status(200).render('reset-password', {

		pageTitle: 'Reset Password | Ang Hiyas',
		pageDescription: 'Reset your Ang Hiyas account password securely to regain access to your orders, wishlist and account details.',
		canonicalUrl: `${process.env.CANONICAL_URL}reset-password-page`,
		noIndex: true
	})
}





exports.setNewPasswordPage = (req, res) => {

	const token = req.params.token;


	res.status(200).render('set-new-password', {

		pageTitle: 'Set New Password | Ang Hiyas',
		pageDescription: 'Create a new password for your Ang Hiyas account and securely regain access to your customer profile.',
		canonicalUrl: `${process.env.CANONICAL_URL}set-new-password-page`,
		noIndex: true
	})
}





//------------------------ Home Page ---------------------------


exports.getHomePage = catchAsync(async (req, res, next) => {


	const products = await SpecProd.find().populate('category').populate('discount').sort({ createdAt: -1 }).limit(5);

	await Promise.all(products.map(async product => {

		await missingDiscountCheck(product);

	}));

	res.status(200).render('home-page', {

		pageTitle: 'Ang Hiyas | Barong Tagalog & Filipiniana Australia',
		pageDescription: 'Discover authentic Filipino clothing in Australia, including custom-made Barong Tagalog, Filipiniana, rentals and ready-to-wear styles for weddings and special occasions.',
		canonicalUrl: `${process.env.CANONICAL_URL}`,
		currentPage: 'home',

		products

	});
})




//----------------------		Re-usable Helper functions		-------------------//


/// breadcrumbs 


const makeBreadcrumbUrl = (basePath, params) => {

	const searchParams = new URLSearchParams();

	Object.entries(params).forEach(([key, value]) => {
		if (value) {
			searchParams.set(key, value);
		}
	});

	const queryString = searchParams.toString();

	return queryString ? `${basePath}?${queryString}` : basePath;
};







const getBarongSizeGroups = () => {
	return {
		adult: [
			...SpecProd.sizeGroups.adult,
			...SpecProd.sizeGroups.oneSize
		],
		boy: [
			...SpecProd.sizeGroups.boy,
			...SpecProd.sizeGroups.oneSize
		]
	};
};


const getBarongSizesForSex = sex => {
	const sizeGroups = getBarongSizeGroups();

	if (sex === 'boy') {
		return sizeGroups.boy;
	}

	return sizeGroups.adult;
};




const formVariants = async (variant, desiredOrder = null) => {

	const variantSearch = await SpecProd.aggregate([

		{ $match: { discontinued: { $ne: true } } },
		{ $unwind: '$variants' },
		{
			$match: {
				'variants.inStock': { $gt: 0 },
				[`variants.${variant}`]: { $ne: null }
			}
		},
		{ $group: { _id: `$variants.${variant}` } }
	])

	const Arr = variantSearch.map(v => v._id).filter(Boolean);

	if (!desiredOrder) return Arr;

	return desiredOrder.filter(v => Arr.includes(v));
}



/// top level (colors)


const formFields = async (field, desiredOrder = null) => {

	const fieldSearch = await SpecProd.aggregate([

		{ $group: { _id: `$${field}` } }
	]);

	const arr = fieldSearch.map(v => v._id).filter(Boolean);

	if (!desiredOrder) return arr;

	return desiredOrder.filter(v => arr.includes(v));
};




const formFieldsBags = async (field, desiredOrder = null) => {

	const fieldSearch = await Bag.aggregate([

		{ $group: { _id: `$${field}` } }
	]);

	const arr = fieldSearch.map(v => v._id).filter(Boolean);

	if (!desiredOrder) return arr;

	return desiredOrder.filter(v => arr.includes(v));
};




const formFieldsAccs = async (field, desiredOrder = null) => {

	const fieldSearch = await Accessory.aggregate([

		{ $group: { _id: `$${field}` } }
	]);

	const arr = fieldSearch.map(v => v._id).filter(Boolean);

	if (!desiredOrder) return arr;

	return desiredOrder.filter(v => arr.includes(v));
};





//------------------- Shop Pages ------------------------//


//----------------- Barong List Page --------------------//




exports.getBarongListPage = catchAsync(async (req, res, next) => {


	///			 Sort Results			///

	const parameterFilter = {

		newest: { createdAt: -1 },
		lowest: { currentPrice: 1 },
		highest: { currentPrice: -1 },
		alphabet: { name: 1 },

	}



	const selectedOption = parameterFilter[req.query.productSort] ? req.query.productSort : 'newest';

	const sortOption = parameterFilter[selectedOption];



	///			Display Sizes in dropdown			///


	const desiredSizeOrder = SpecProd.schema
		.path('variants')
		.schema
		.path('size')
		.enumValues;

	const sizeList = await formVariants('size', desiredSizeOrder);



	///			Display Colors			///

	const desiredColorOrder = SpecProd.schema.path('color').enumValues;

	const colorList = await formFields('color', desiredColorOrder);




	///			Display Sex			///


	const desiredSexOrder = SpecProd.schema.path('sex').enumValues;

	const sexList = await formFields('sex', desiredSexOrder);



	///			Display Category			///



	const categoryIds = await SpecProd.distinct('category');

	const categoryList = await Category.find({
		_id: { $in: categoryIds }
	}).select('name').sort({ name: 1 }).lean();


	///			 Filtering			///

	const size = req.query.productSize;
	const selectedColor = req.query.color;
	const selectedSex = req.query.sex;
	const selectedcategory = mongoose.Types.ObjectId.isValid(req.query.category) ? req.query.category : '';

	const formatBreadcrumbLabel = value => {

		return value
			.split('-')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};


	const selectedCategoryDoc = categoryList.find(category => {

		return category._id.toString() === selectedcategory;
	});


	const breadcrumbs = [
		{ label: 'Home', href: '/' },
		{ label: 'Barong and Filipiniana', href: '/barong-list' }
	];


	if (selectedSex) {
		breadcrumbs.push({
			label: formatBreadcrumbLabel(selectedSex),
			href: makeBreadcrumbUrl('/barong-list', {
				sex: selectedSex
			})
		});
	}

	if (selectedColor) {
		breadcrumbs.push({
			label: formatBreadcrumbLabel(selectedColor),
			href: makeBreadcrumbUrl('/barong-list', {
				sex: selectedSex,
				color: selectedColor
			})
		});
	}

	if (size) {
		breadcrumbs.push({
			label: size,
			href: makeBreadcrumbUrl('/barong-list', {
				sex: selectedSex,
				color: selectedColor,
				productSize: size
			})
		});
	}

	if (selectedCategoryDoc) {
		breadcrumbs.push({
			label: selectedCategoryDoc.name,
			href: makeBreadcrumbUrl('/barong-list', {
				sex: selectedSex,
				color: selectedColor,
				productSize: size,
				category: selectedcategory
			})
		});
	}


	const queryObj = {};

	if (selectedColor) {
		queryObj.color = selectedColor;
	}

	if (selectedSex) {
		queryObj.sex = selectedSex;
	}

	if (selectedcategory) {
		queryObj.category = selectedcategory;
	}

	if (size) {
		queryObj.variants = {
			$elemMatch: {
				size: size,
				inStock: { $gt: 0 }
			}
		};
	}

	let productlist = await SpecProd.find(queryObj)
		.sort(sortOption)
		.populate('category');

	await Promise.all(productlist.map(async product => {
		await missingDiscountCheck(product);
	}));

	const hasFilters = Object.keys(req.query).length > 0;


	res.status(200).render('barong-list-page', {

		pageTitle: 'Buy Barong Tagalog & Filipiniana Online Australia | Ang Hiyas',
		pageDescription: 'Shop Barong Tagalog and Filipiniana online at Ang Hiyas, a Filipino clothing store in Australia offering wedding attire, premium fabrics and authentic Filipino craftsmanship.',
		canonicalUrl: `${process.env.CANONICAL_URL}barong-list`,

		noIndex: hasFilters,

		productlist,
		sizeList,
		sexList,
		categoryList,
		colorList,
		breadcrumbs,
		selectedColor,
		selectedOption,
		selectedcategory,
		selectedSex: selectedSex || '',
		selectedSize: size || ''
	});
})





//------------------ Barong Page -----------------------//



exports.getBarongPage = catchAsync(async (req, res, next) => {

	const product = await SpecProd.findOne({ slug: req.params.slug }).populate({
		path: 'reviews',
		select: 'user rating comment'
	}).populate('category');

	if (!product) return next(new AppError('Product not found', 404));

	const productDescription = product.description ||
		`Shop ${product.name} from Ang Hiyas. Explore Barong Tagalog, Filipiniana and Filipino formal wear for weddings, events and special occasions in Australia.`;


	///			Discount Price			///

	await missingDiscountCheck(product);


	///			Reviewed			///

	let hasReviewed = false;


	if (req.user && product.reviews.length) {

		hasReviewed = product.reviews.some(

			rev => rev.user._id.toString() === req.user._id.toString()
		);
	}


	///			Purchased			///

	let hasPurchased = false;

	if (req.user) {

		const orders = await Order.find({ user: req.user.id });
		const productId = product._id.toString();

		hasPurchased = orders.some(order => order.product.some(prod => {

			return prod.product?._id?.toString() === productId;
		}))
	}


	res.status(200).render('barong-page', {

		pageTitle: `${product.name} | Barong Tagalog & Filipiniana Australia | Ang Hiyas`,
		pageDescription: productDescription,
		canonicalUrl: `${process.env.CANONICAL_URL}barong/${product.slug}`,
		currentPage: 'product',
		productPreloadImage: `/img/product_imgs/${product.imageCover}`,

		ogType: 'product',
		ogTitle: `${product.name} | Ang Hiyas`,
		ogDescription: productDescription,

		productSchema: buildProductSchema(product, productDescription, `barong/${product.slug}`),

		product,
		hasReviewed,
		hasPurchased

	});
})




//------------------ Shoe list  Page -----------------------//



exports.getShoeListPage = catchAsync(async (req, res, next) => {


	///			 Sort Results			///

	const parameterFilter = {

		newest: { createdAt: -1 },
		lowest: { currentPrice: 1 },
		highest: { currentPrice: -1 },
		alphabet: { name: 1 },

	}

	const selectedOption = req.query.productSort || 'newest';
	const sortOption = parameterFilter[req.query.productSort] || { createdAt: -1 };


	///			Display Sizes in dropdown			///


	const desiredSizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', '6', '8', '10', '12', '14', '16', '18'];

	const sizeList = await formVariants('size', desiredSizeOrder);


	///			 Filter By Size			///

	const size = req.query.productSize;

	let productlist;

	if (!size) {

		productlist = await Shoe.find().sort(sortOption).populate('category');

	} else productlist = await Shoe.find({ 'variants': { $elemMatch: { size: size, inStock: { $gt: 0 } } } }).sort(sortOption).populate('category');


	await Promise.all(productlist.map(async product => {

		await missingDiscountCheck(product);

	}));

	res.status(200).render('shoe-list-page', {
		pageTitle: 'Filipino Formal Shoes & Accessories | Ang Hiyas Australia',
		pageDescription: 'Shop formal shoes from Ang Hiyas Australia to complete your Barong Tagalog, Filipiniana or Filipino formal wear outfit for weddings and special occasions.',
		canonicalUrl: `${process.env.CANONICAL_URL}shoe-list`,
		productlist,
		sizeList,
		selectedOption,
		selectedSize: size || ''  // ← add this
	});
})



//------------------ Shoe Page -----------------------//



exports.getShoePage = catchAsync(async (req, res, next) => {

	const product = await Shoe.findOne({ slug: req.params.slug }).populate({
		path: 'reviews',
		select: 'user rating comment'
	}).populate('category');

	if (!product) return next(new AppError('Product not found', 404));

	///			Discount Price			///

	await missingDiscountCheck(product);


	///			Reviewed			///

	let hasReviewed = false;


	if (req.user && product.reviews.length) {

		hasReviewed = product.reviews.some(

			rev => rev.user._id.toString() === req.user._id.toString()
		);
	}


	///			Purchased			///

	let hasPurchased = false;

	if (req.user) {

		const orders = await Order.find({ user: req.user.id });
		const productId = product._id.toString();

		hasPurchased = orders.some(order => order.product.some(prod => {

			return prod.product?._id?.toString() === productId;
		}))
	}



	res.status(200).render('shoe-page', {

		pageTitle: `${product.name} | Template Website`,
		pageDescription: 'Product Page for your website',
		canonicalUrl: `${process.env.CANONICAL_URL}product-page/${product.slug}`,
		product,
		hasReviewed,
		hasPurchased
	});
})





//------------------ Accessories list  Page -----------------------//




exports.getAccessoryListPage = catchAsync(async (req, res, next) => {

	/// Sort Results ///

	const parameterFilter = {
		newest: { createdAt: -1 },
		lowest: { currentPrice: 1 },
		highest: { currentPrice: -1 },
		alphabet: { name: 1 }
	};

	const selectedOption = parameterFilter[req.query.productSort] ? req.query.productSort : 'newest';
	const sortOption = parameterFilter[selectedOption];


	/// Display Colors in dropdown ///

	const desiredColorOrder = [
		'white',
		'black',
		'blue',
		'red',
		'green',
		'yellow',
		'pink',
		'purple',
		'orange',
		'grey',
		'brown'
	];

	const colorList = await formFieldsAccs('color', desiredColorOrder);


	/// Display Category in dropdown ///


	const categoryIds = await Accessory.distinct('category');

	const categoryList = await Category.find({
		_id: { $in: categoryIds }
	}).select('name').sort({ name: 1 }).lean();

	/// Filtering ///

	const selectedColor = req.query.color;
	const selectedcategory = mongoose.Types.ObjectId.isValid(req.query.category) ? req.query.category : '';


	const formatBreadcrumbLabel = value => {

		return value
			.split('-')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const selectedCategoryDoc = categoryList.find(category => {
		return category._id.toString() === selectedcategory;
	});

	const breadcrumbs = [
		{ label: 'Home', href: '/' },
		{ label: 'Accessories', href: '/accessories-list' }
	];

	if (selectedColor) {
		breadcrumbs.push({
			label: formatBreadcrumbLabel(selectedColor),
			href: makeBreadcrumbUrl('/accessories-list', {
				color: selectedColor
			})
		});
	}

	if (selectedCategoryDoc) {
		breadcrumbs.push({
			label: selectedCategoryDoc.name,
			href: makeBreadcrumbUrl('/accessories-list', {
				color: selectedColor,
				category: selectedcategory
			})
		});
	}


	const queryObj = {};

	if (selectedColor) {
		queryObj.color = selectedColor;
	}

	if (selectedcategory) {
		queryObj.category = selectedcategory;
	}

	let productlist = await Accessory.find(queryObj)
		.sort(sortOption)
		.populate('category');

	await Promise.all(productlist.map(async product => {
		await missingDiscountCheck(product);
	}));


	const hasFilters = Object.keys(req.query).length > 0;

	res.status(200).render('accessories-list-page', {
		pageTitle: 'Accessories & Giftware | Ang Hiyas Australia',
		pageDescription: 'Shop accessories, giftware and selected Filipino-inspired pieces from Ang Hiyas Australia for everyday use, gifting, cultural celebrations and special occasions.',
		canonicalUrl: `${process.env.CANONICAL_URL}accessories-list`,
		noIndex: hasFilters,


		productlist,
		colorList,
		categoryList,
		breadcrumbs,
		selectedColor,
		selectedcategory,
		selectedOption
	});
});



exports.getAccessoryPage = catchAsync(async (req, res, next) => {

	const product = await Accessory.findOne({ slug: req.params.slug }).populate({
		path: 'reviews',
		select: 'user rating comment'
	}).populate('category');

	if (!product) return next(new AppError('Product not found', 404));


	const productDescription = product.description ||
		`Shop ${product.name} from Ang Hiyas Australia, part of our Philippine-made accessories collection for Barong Tagalog, Filipiniana and Filipino formal wear.`;

	///			Discount Price			///

	await missingDiscountCheck(product);


	///			Reviewed			///

	let hasReviewed = false;


	if (req.user && product.reviews.length) {

		hasReviewed = product.reviews.some(

			rev => rev.user._id.toString() === req.user._id.toString()
		);
	}


	///			Purchased			///

	let hasPurchased = false;

	if (req.user) {

		const orders = await Order.find({ user: req.user.id });
		const productId = product._id.toString();

		hasPurchased = orders.some(order => order.product.some(prod => {

			return prod.product?._id?.toString() === productId;
		}))
	}



	res.status(200).render('accessories-page', {

		pageTitle: `${product.name} | Filipino Accessories | Ang Hiyas Australia`,
		pageDescription: productDescription,
		canonicalUrl: `${process.env.CANONICAL_URL}accessories/${product.slug}`,

		currentPage: 'product',
		productPreloadImage: `/img/product_imgs/${product.imageCover}`,

		ogType: 'product',
		ogTitle: `${product.name} | Ang Hiyas`,
		ogDescription: productDescription,

		productSchema: buildProductSchema(product, productDescription, `accessories/${product.slug}`),

		product,
		hasReviewed,
		hasPurchased

	});
})




//------------------  Bag list  Page -----------------------//



exports.getBagListPage = catchAsync(async (req, res, next) => {

	const parameterFilter = {
		newest: { createdAt: -1 },
		lowest: { currentPrice: 1 },
		highest: { currentPrice: -1 },
		alphabet: { name: 1 }
	};

	const selectedOption = req.query.productSort || 'newest';
	const sortOption = parameterFilter[req.query.productSort] || { createdAt: -1 };

	const desiredColorOrder = [
		'white',
		'black',
		'blue',
		'red',
		'green',
		'yellow',
		'pink',
		'purple',
		'orange',
		'grey',
		'brown'
	];

	const colorList = await formFieldsBags('color', desiredColorOrder);


	const categoryIds = await Bag.distinct('category');

	const categoryList = await Category.find({
		_id: { $in: categoryIds }
	}).select('name').sort({ name: 1 }).lean();




	const selectedColor = req.query.color;
	const selectedcategory = mongoose.Types.ObjectId.isValid(req.query.category) ? req.query.category : '';


	const formatBreadcrumbLabel = value => {

		return value
			.split('-')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const selectedCategoryDoc = categoryList.find(category => {
		return category._id.toString() === selectedcategory;
	});

	const breadcrumbs = [
		{ label: 'Home', href: '/' },
		{ label: 'Bags', href: '/bag-list' }
	];


	if (selectedColor) {
		breadcrumbs.push({
			label: formatBreadcrumbLabel(selectedColor),
			href: makeBreadcrumbUrl('/bag-list', {
				color: selectedColor
			})
		});
	}

	if (selectedCategoryDoc) {
		breadcrumbs.push({
			label: selectedCategoryDoc.name,
			href: makeBreadcrumbUrl('/bag-list', {
				color: selectedColor,
				category: selectedcategory
			})
		});
	}



	const queryObj = {};

	if (selectedColor) {
		queryObj.color = selectedColor;
	}

	if (selectedcategory) {
		queryObj.category = selectedcategory;
	}

	let productlist = await Bag.find(queryObj)
		.sort(sortOption)
		.populate('category');

	await Promise.all(productlist.map(async product => {
		await missingDiscountCheck(product);
	}));


	const hasFilters = Object.keys(req.query).length > 0;

	res.status(200).render('bag-list-page', {
		pageTitle: 'Bags for Every Occasion | Ang Hiyas Australia',
		pageDescription: 'Shop bags from Ang Hiyas Australia for everyday use, gifting, cultural celebrations, weddings and special occasions, with styles selected to complement Filipino clothing and events.',
		canonicalUrl: `${process.env.CANONICAL_URL}bag-list`,
		noIndex: hasFilters,

		productlist,
		colorList,
		categoryList,
		breadcrumbs,
		selectedColor,
		selectedcategory,
		selectedOption
	});
});




exports.getBagPage = catchAsync(async (req, res, next) => {

	const product = await Bag.findOne({ slug: req.params.slug }).populate({
		path: 'reviews',
		select: 'user rating comment'
	}).populate('category');

	if (!product) return next(new AppError('Product not found', 404));

	const productDescription = product.description ||
		`Shop ${product.name} from Ang Hiyas Australia, part of our formal bag collection for Barong Tagalog, Filipiniana and Filipino formal wear outfits.`;

	await missingDiscountCheck(product);

	let hasReviewed = false;

	if (req.user && product.reviews.length) {

		hasReviewed = product.reviews.some(

			rev => rev.user._id.toString() === req.user._id.toString()
		);
	}

	let hasPurchased = false;

	if (req.user) {

		const orders = await Order.find({ user: req.user.id });
		const productId = product._id.toString();


		hasPurchased = orders.some(order => order.product.some(prod => {

			return prod.product?._id?.toString() === productId;
		}))
	}



	res.status(200).render('bag-page', {

		pageTitle: `${product.name} | Filipino Formal Bags | Ang Hiyas Australia`,
		pageDescription: productDescription,
		canonicalUrl: `${process.env.CANONICAL_URL}bag/${product.slug}`,

		currentPage: 'product',
		productPreloadImage: `/img/product_imgs/${product.imageCover}`,

		ogType: 'product',
		ogTitle: `${product.name} | Ang Hiyas`,
		ogDescription: productDescription,

		productSchema: buildProductSchema(product, productDescription, `bag/${product.slug}`),

		product,
		hasReviewed,
		hasPurchased
	});
})




//--------------------- Categories Page ------------------------//



exports.getCategoriesPage = catchAsync(async (req, res, next) => {

	const categories = await Category.find().sort({ name: 1 });

	if (!categories) return next(new AppError('No Categories Found', 404));

	res.status(200).render('categories-page', {

		pageTitle: 'Shop Filipino Clothing Categories | Ang Hiyas',
		pageDescription: 'Browse Ang Hiyas product categories including Barong Tagalog, Filipiniana, accessories and formalwear selected for Filipino events and special occasions.',
		canonicalUrl: `${process.env.CANONICAL_URL}categories`,
		categories
	});
})




exports.getFrontEndCategoryPage = catchAsync(async (req, res, next) => {

	const categoryId = req.params.catId;

	if (!mongoose.Types.ObjectId.isValid(categoryId)) {

		return next(new AppError('Invalid category ID', 400));
	}


	const category = await Category.findById(categoryId);

	if (!category) return next(new AppError('Category not found', 404));


	const products = await SpecProd.find({ category: categoryId }).populate('category');


	await Promise.all(products.map(async product => {

		if (!product.category || !product.category.discount) {

			product.discountPrice = await priceAtPurchaseDiscount(product);

		} else product.discountPrice = await categoryDiscountPrice(product);

	}));


	res.status(200).render('category-page', {

		pageTitle: `${category.name} | Ang Hiyas`,
		pageDescription: `Shop ${category.name} from Ang Hiyas, with Filipino formalwear and occasion pieces selected for weddings, cultural events and special celebrations.`,
		canonicalUrl: `${process.env.CANONICAL_URL}categories/${category.id}`,
		products,
		category
	});
})



//--------------------- Sales Page --------------------------//



exports.getSalesPage = (req, res) => {

	res.status(200).render('sales', {

		pageTitle: 'Ready-Made Barong Tagalog & Filipiniana Australia | Ang Hiyas',
		pageDescription: 'Shop Barong Tagalog and Filipiniana online at Ang Hiyas, a Filipino clothing store in Australia offering ready-to-wear styles, premium fabrics and authentic Filipino craftsmanship.',
		canonicalUrl: `${process.env.CANONICAL_URL}static/sales`,
	})
}


//--------------------- Services Page --------------------------//



exports.getServicesPage = (req, res) => {

	res.status(200).render('services', {

		pageTitle: 'Custom Barong & Filipiniana Services | Ang Hiyas Australia',
		pageDescription: 'Explore Ang Hiyas custom Barong Tagalog and Filipiniana services, with rental options for Filipino formal wear, weddings, cultural events and special occasions.',
		canonicalUrl: `${process.env.CANONICAL_URL}static/services`,
	})
}



//--------------------- Customization Page --------------------------//



exports.getCustomizationPage = (req, res) => {

	res.status(200).render('custom', {

		pageTitle: 'Custom Barong Tagalog & Filipiniana Australia | Ang Hiyas',
		pageDescription: 'Order custom made Barong Tagalog and Filipiniana dresses near Brisbane for weddings, graduations, oath-taking ceremonies and formal Filipino events across Australia.',
		canonicalUrl: `${process.env.CANONICAL_URL}static/custom`,
	})
}


exports.getCustomContactPage = (req, res) => {

	res.status(200).render('custom-contact', {

		pageTitle: 'Custom Barong & Filipiniana Enquiry | Ang Hiyas Australia',
		pageDescription: 'Send a custom tailoring enquiry for Barong Tagalog, Filipiniana dresses, wedding attire and made-to-measure Filipino formal wear from Ang Hiyas Australia.',
		canonicalUrl: `${process.env.CANONICAL_URL}static/contact-custom`,
	})
}


//--------------------- Rentals Page --------------------------//



exports.getRentalsPage = (req, res) => {

	res.status(200).render('rentals', {

		pageTitle: 'Barong Tagalog & Filipiniana Rentals Australia | Ang Hiyas',
		pageDescription: 'Rent Barong Tagalog and Filipiniana outfits near Brisbane for weddings, graduations, oath-taking ceremonies, cultural events and formal occasions across Queensland and Australia.',
		canonicalUrl: `${process.env.CANONICAL_URL}static/rentals`,
	})
}


exports.getRentalGuidePage = (req, res) => {

	res.status(200).render('rental-guide', {

		pageTitle: 'Barong & Filipiniana Rental Guide | Ang Hiyas Australia',
		pageDescription: 'Read the Ang Hiyas rental guide for Barong Tagalog and Filipiniana hire, including bookings, sizing and special occasion rental details.',
		canonicalUrl: `${process.env.CANONICAL_URL}static/rental-guidelines`,
	})
}




//--------------------- Blog Page --------------------------//



exports.getBlogPage = (req, res) => {

	res.status(200).render('blog', {

		pageTitle: 'Blog',
		description: 'Blog Page',
		canonicalUrl: `${process.env.CANONICAL_URL}blog`
	})
}



//--------------------- About Page --------------------------//



exports.getAboutPage = (req, res) => {

	res.status(200).render('about', {

		pageTitle: 'About Ang Hiyas | Filipino Clothing Australia',
		pageDescription: 'Learn about Ang Hiyas, a Filipino fashion boutique in Australia offering authentic Barong Tagalog, Filipiniana, handcrafted Filipino clothing and heritage craftsmanship.',
		canonicalUrl: `${process.env.CANONICAL_URL}static/about`,
	})
}



//--------------------- Contact Page --------------------------//



exports.getContactPage = (req, res) => {

	res.status(200).render('contact', {

		pageTitle: 'Contact Ang Hiyas | Filipino Clothing Australia',
		pageDescription: 'Contact Ang Hiyas Australia for Barong Tagalog, Filipiniana, custom clothing enquiries, wedding attire consultations and Australia-wide Filipino formal wear support.',
		canonicalUrl: `${process.env.CANONICAL_URL}static/contact`,
	})
}


//--------------------- Privcay Page --------------------------//



exports.getPrivacyPage = (req, res) => {

	res.status(200).render('privacy', {

		pageTitle: 'Privacy Policy | Ang Hiyas Australia',
		pageDescription: 'Read how Ang Hiyas collects, uses and protects customer information for enquiries, accounts, orders and website services.',
		canonicalUrl: `${process.env.CANONICAL_URL}static/privacy`,
		noIndex: false
	})
}




//--------------------- Account Page --------------------------//



exports.getAccountPage = catchAsync(async (req, res, next) => {


	const user = await User.findById(req.user.id)
		.populate('addresses');

	if (!user) {

		return next(new AppError('User not found', 404));
	}




	/// DRY Method


	const productModels = {
		SpecProd: { model: SpecProd, type: 'barong' },
		Shoe: { model: Shoe, type: 'shoe' },
		Bag: { model: Bag, type: 'bag' },
		Accessory: { model: Accessory, type: 'accessory' }
	};



	const populateProducts = async (items) => {

		await Promise.all(items.map(async item => {

			const productConfig = productModels[item.productModel];

			if (!productConfig || !mongoose.Types.ObjectId.isValid(item.product)) {

				item.product = null;
				return;
			}

			item.product = await productConfig.model
				.findById(item.product)
				.populate('category');

			item.productType = productConfig.type;

			item.markModified('product');
			item.markModified('productType');
		}));
	};


	await Promise.all([
		populateProducts(user.cart),
		populateProducts(user.wishlist)
	]);






	//------------- Variants --------------//

	const enrichWithVariants = (list) => {
		list.forEach(item => {
			if (!item.product) return;
			const variant = item.product?.variants?.find(v => v._id.toString() === item.variant?.toString());
			item.variantDetails = variant;
		});
	};

	enrichWithVariants(user.cart);
	enrichWithVariants(user.wishlist);

	//------------- Get Default Address --------------//

	const getMainAddress = (addresses) => {
		return addresses.find(address => address.isDefault === true) || addresses[0] || {};
	};

	const homeAddress = getMainAddress(user.addresses);

	//------------- Render Orders --------------//

	const orders = await Order.find({ user: user.id })
		.sort({ createdAt: -1 });




	await Promise.all(orders.map(async order => {

		await Promise.all(order.product.map(async item => {

			const productConfig = productModels[item.productModel];

			if (!productConfig || !mongoose.Types.ObjectId.isValid(item.product)) {

				item.product = null;
				return;
			}

			item.product = await productConfig.model.findById(item.product);
			item.markModified('product');
		}));
	}));



	// ------------- Variants --------------//

	orders.forEach(order => {
		order.product.forEach(item => {
			if (item.product?.variants) {
				const variants = item.product.variants;
				const variantId = item.selectedVariant?.toString();
				const matchedVariant = variants.find(v => v._id.toString() === variantId);
				item.variantDetails = matchedVariant || null;
			} else {
				item.variantDetails = null;
			}
		});
	});

	//------------- Render Reviews --------------//

	const reviews = await Review.find({ user: req.user.id })
		.populate('product');

	//------------- Update Prices --------------//

	const updatePrice = async (productBase) => {
		await Promise.all(productBase.map(async item => {
			if (!item.product) return;
			await missingDiscountCheckLoop(item.product, item);
		}));
	};



	if (user.cart) await updatePrice(user.cart);
	if (user.wishlist) await updatePrice(user.wishlist);

	res.status(200).render('myAccount', {
		pageTitle: 'My Account | Ang Hiyas',
		pageDescription: 'View and manage your Ang Hiyas account details, orders, wishlist, cart and saved addresses.',
		canonicalUrl: `${process.env.CANONICAL_URL}my-account`,
		noIndex: true,
		cart: user.cart,
		wishlist: user.wishlist,
		addresses: user.addresses,
		homeAddress,
		orders,
		reviews
	});
});

//------------------ Get address form page --------------------//



/// Empty 			

exports.getEmptyAddressFormPage = async (req, res, next) => {

	const selectedAddress = {};

	res.status(200).render('address-form-page', {

		pageTitle: 'Add Address | Ang Hiyas',
		pageDescription: 'Add a delivery or billing address to your Ang Hiyas account.',
		canonicalUrl: `${process.env.CANONICAL_URL}address-form--user`,
		noIndex: true,
		selectedAddress
	})
}



/// Current user	

exports.getAddressFormPage = async (req, res, next) => {

	const addressId = req.params.addressId;
	const user = await User.findById(req.user.id);

	if (!addressId || !user) return next(new AppError('No user or address found', 404));


	const selectedAddress = user.addresses.find(address => address.id === addressId);

	if (!selectedAddress) return next(new AppError('Address not found', 404));


	res.status(200).render('address-form-page', {

		pageTitle: 'Update Address | Ang Hiyas',
		pageDescription: 'Update a saved delivery or billing address in your Ang Hiyas account.',
		canonicalUrl: `${process.env.CANONICAL_URL}address-form--user`,
		noIndex: true,
		selectedAddress
	})
}





//--------------------------------- Checkout page --------------------------------//



exports.getCheckoutPage = catchAsync(async (req, res, next) => {

	let qty = Number(req.params.qty);

	const selectedLabel = req.query.label || 'Home';

	const productId = req.params.productId;
	const productVariant = req.params.variant;

	if (productId && (!Number.isInteger(qty) || qty < 1)) {

		return next(new AppError('Invalid quantity', 400));
	}

	if (productId && !mongoose.Types.ObjectId.isValid(productId)) {

		return next(new AppError('Invalid product ID', 400));
	}


	const user = await User.findById(req.user.id);

	if (!user) return next(new AppError('User not found', 404));


	let cart;

	let product;

	if (!productId) {

		cart = await User.findById(user).populate('cart.product').select('cart');

		if (!cart.cart.some(item => item.product)) {

			return res.redirect(`/my-account/${user.id}?show=my-account-cart`);
		}

	}

	else {

		product = await SpecProd.findById(productId).populate('category');

		if (!product) {
			product = await Shoe.findById(productId).populate('category');
		}

		if (!product) {
			product = await Bag.findById(productId).populate('category');
		}

		if (!product) {
			product = await Accessory.findById(productId).populate('category');
		}

		if (!product) {
			return next(new AppError('Product not found', 404));
		}
	}


	let selectedAddress;

	if (selectedLabel) {

		selectedAddress = user.addresses.find(address => address.label === selectedLabel);
	}


	/// fallback if no selectedAddress or not found (select isDefault or 1st address)

	const addressToRender = selectedAddress || {};


	//-- Find the embedded VARIANT value inside the document --//

	let variant;

	if (!productId) {

		cart.cart.forEach(item => {

			if (item.product?.variants && item.product.variants.length > 0 && item.variant) {

				variant = item.product.variants.find(v => v._id.toString() === item.variant.toString());

				item.variantDetails = variant;

			} else {

				item.variantDetails = null;
			}
		});

	} else {

		if (product.variants && product.variants.length > 0) {

			variant = product.variants.find(v => v.id === productVariant);

			if (!variant) {

				return next(new AppError('Please Select a Size', 404));
			}

			if (variant.inStock < qty) {

				return next(new AppError(`Only ${variant.inStock} left in size ${variant.size}. Please choose a lower quantity.`, 400));
			}

		} else {

			variant = null;
		}
	}



	//--------------- --------------------------- ----------------


	/// cart total		

	let totalNet = 0;
	let totalArr = [];
	if (!product) {

		await Promise.all(cart.cart.map(async item => {

			let foundProduct;

			if (!item.product || !item.product._id) {

				return next(new AppError('A product in your cart is no longer available', 404));
			}

			foundProduct = await SpecProd.findById(item.product._id).populate('category');

			if (!foundProduct) {
				foundProduct = await Shoe.findById(item.product._id).populate('category');
			}

			if (!foundProduct) {
				foundProduct = await Bag.findById(item.product._id).populate('category');
			}

			if (!foundProduct) {
				foundProduct = await Accessory.findById(item.product._id).populate('category');
			}

			if (!foundProduct) return next(new AppError('No Product Found', 404));

			///							Cart Checkout								///

			if (!foundProduct.category && !foundProduct.discount) {

				item.discountPrice = foundProduct.currentPrice;
			}
			else if (!foundProduct.category || foundProduct.discount) {

				item.discountPrice = await priceAtPurchaseDiscount(foundProduct);
			}
			else if (!foundProduct.category.discount) {

				item.discountPrice = foundProduct.currentPrice;
			}
			else {

				item.discountPrice = await categoryDiscountPrice(foundProduct);
			}

			item.saleTotal = item.discountPrice * item.quantity;
			totalArr.push(item.saleTotal);

		}))

		///			BuyItNow Item Discount - Checkout			///

	} else {

		if (!product.discount && !product.category) {

			product.discountPrice = product.currentPrice

			totalNet = product.discountPrice * qty;
		}

		else if (!product.category || product.discount) {

			product.discountPrice = await priceAtPurchaseDiscount(product);

			totalNet = product.discountPrice * qty;
		}

		else if (!product.category.discount) {

			product.discountPrice = product.currentPrice

			totalNet = product.discountPrice * qty;
		}

		else {

			product.discountPrice = await categoryDiscountPrice(product);

			totalNet = product.discountPrice * qty;
		}
	}

	///			/////////////////////////		///

	for (let i = 0; i < totalArr.length; i++) {

		totalNet += totalArr[i];
	}


	if (typeof totalNet !== 'number' || Number.isNaN(totalNet) || totalNet <= 0) {

		return next(new AppError('Invalid checkout total', 400));
	}


	const { delivery, subtotal } = calculateTotals(totalNet);

	const totalGross = subtotal;


	///  Buy ItNow total	

	const sitePreview = process.env.SITE_PREVIEW === 'true';


	if (!productId) {

		res.status(200).render('checkout', {

			pageTitle: 'Checkout | Ang Hiyas',
			pageDescription: 'Review your Ang Hiyas order, delivery details and payment options before completing your purchase.',
			canonicalUrl: `${process.env.CANONICAL_URL}checkout-page`,
			noIndex: true,
			cart,
			totalNet,
			delivery,
			totalGross,
			defaultAddress: addressToRender,
			selectedLabel: selectedLabel,

			sitePreview,

			paypalClientId: sitePreview ? null : process.env.PAYPAL_CLIENT_ID,
			stripePublishableKey: sitePreview ? null : process.env.STRIPE_PUBLISHABLE_KEY
		})

	} else {

		res.status(200).render('checkout', {

			pageTitle: 'Checkout | Ang Hiyas',
			pageDescription: 'Review your Ang Hiyas order, delivery details and payment options before completing your purchase.',
			canonicalUrl: `${process.env.CANONICAL_URL}checkout-page`,
			noIndex: true,
			product,
			variant,
			qty,
			totalNet,
			delivery,
			totalGross,
			defaultAddress: addressToRender,
			selectedLabel: selectedLabel,

			sitePreview,

			paypalClientId: sitePreview ? null : process.env.PAYPAL_CLIENT_ID,
			stripePublishableKey: sitePreview ? null : process.env.STRIPE_PUBLISHABLE_KEY
		})
	}
})






exports.getCheckoutPageGuest = catchAsync(async (req, res, next) => {

	let qty = Number(req.params.qty);

	if (!Number.isInteger(qty) || qty < 1) {

		return next(new AppError('Invalid quantity', 400));
	}

	const productId = req.params.productId;
	const productVariant = req.params.variant;

	if (!mongoose.Types.ObjectId.isValid(productId)) {

		return next(new AppError('Invalid product ID', 400));
	}


	//---------- ✅ Multi-model lookup  ------------//


	let product = await SpecProd.findById(productId).populate('category');

	if (!product) {

		product = await Shoe.findById(productId).populate('category');
	}

	if (!product) {

		product = await Bag.findById(productId).populate('category');
	}

	if (!product) {

		product = await Accessory.findById(productId).populate('category');
	}

	if (!product) {

		return next(new AppError('No Product Found', 404));
	}

	let variant = null;

	if (product.variants && product.variants.length > 0) {

		variant = product.variants.find(v => v.id === productVariant);

		if (!variant) {

			return next(new AppError('Please Select a Size', 404));
		}

		if (variant.inStock < qty) {

			return next(new AppError(`Only ${variant.inStock} left in size ${variant.size}. Please choose a lower quantity.`, 400));
		}
	}



	//--------------- --------------------------- ----------------


	let totalNet;


	if (!product.discount && !product.category) {

		product.discountPrice = product.currentPrice
		totalNet = product.discountPrice * qty;
	}

	else if (!product.category || product.discount) {

		product.discountPrice = await priceAtPurchaseDiscount(product);
		totalNet = product.discountPrice * qty;
	}

	else if (!product.category.discount) {

		product.discountPrice = product.currentPrice
		totalNet = product.discountPrice * qty;
	}

	else {

		product.discountPrice = await categoryDiscountPrice(product);
		totalNet = product.discountPrice * qty;
	}

	if (typeof totalNet !== 'number' || Number.isNaN(totalNet) || totalNet <= 0) {

		return next(new AppError('Invalid checkout total', 400));
	}

	const { delivery, subtotal } = calculateTotals(totalNet);

	const totalGross = subtotal;



	/// CHECKOUT SITE PREVIEW CONDITIONAL

	const sitePreview = process.env.SITE_PREVIEW === 'true';


	res.status(200).render('checkout', {

		pageTitle: 'Guest Checkout | Ang Hiyas',
		pageDescription: 'Complete your Ang Hiyas guest checkout securely and review your selected item, delivery details and payment options.',
		canonicalUrl: `${process.env.CANONICAL_URL}checkout-page/buy-it-now-guest`,
		noIndex: true,
		product,
		variant,
		qty,
		totalNet,
		delivery,
		totalGross,
		guest: true,

		sitePreview,

		paypalClientId: sitePreview ? null : process.env.PAYPAL_CLIENT_ID,
		stripePublishableKey: sitePreview ? null : process.env.STRIPE_PUBLISHABLE_KEY
	})
})



//-------------------- Successful payment page --------------------------//

const isStripeCheckoutSessionId = (value) =>
	typeof value === 'string' && /^cs_(test|live)_[A-Za-z0-9_]+$/.test(value);

exports.getSuccessfulPaymentPage = catchAsync(async (req, res, next) => {

	const { session_id } = req.query;

	if (!isStripeCheckoutSessionId(session_id)) {

		return next(new AppError('Invalid Stripe session ID', 400));
	}

	res.status(200).render('payment-success', {
		pageTitle: 'Payment Received | Ang Hiyas',
		pageDescription: 'Your payment was received and your order is being confirmed.',
		canonicalUrl: `${process.env.CANONICAL_URL}order-success`,
		noIndex: true,
		sessionId: session_id
	});
});



exports.getSuccessfulPaymentPageGuest = catchAsync(async (req, res, next) => {

	const { session_id } = req.query;

	if (!isStripeCheckoutSessionId(session_id)) {

		return next(new AppError('Invalid Stripe session ID', 400));
	}

	res.status(200).render('payment-success-guest', {
		pageTitle: 'Payment Received | Ang Hiyas',
		pageDescription: 'Your payment was received and your order is being confirmed.',
		canonicalUrl: `${process.env.CANONICAL_URL}order-success-guest`,
		noIndex: true,
		sessionId: session_id
	});
});




//-------------------- 	Specific Order page 	--------------------------//



exports.getUserOrderPage = catchAsync(async (req, res, next) => {

	const orderNum = req.params.orderNum;

	const order = await Order.findOne({ orderNum });

	if (!order) return next(new AppError('Order not found', 404));

	if (!order.user.equals(req.user._id)) {
		return next(new AppError('You do not have permission to view this order', 403));
	}


	for (const item of order.product) {

		let productDoc = await SpecProd.findById(item.product);

		if (!productDoc) {
			productDoc = await Shoe.findById(item.product);
		}

		if (!productDoc) {
			productDoc = await Bag.findById(item.product);
		}

		if (!productDoc) {
			productDoc = await Accessory.findById(item.product);
		}

		item.product = productDoc;
		item.markModified('product');
	}

	const transaction = await Transaction.findById(order.transaction);

	if (!transaction) return next(new AppError('Transaction not found', 404));

	res.status(200).render('order-page', {
		pageTitle: 'Order Details | Ang Hiyas',
		pageDescription: 'View your Ang Hiyas order details, purchased items, delivery information and transaction summary.',
		canonicalUrl: `${process.env.CANONICAL_URL}user-order-number`,
		noIndex: true,
		order,
		products: order.product,
		transaction
	});
});




exports.getGuestOrderPage = catchAsync(async (req, res, next) => {

	const { orderId, accessToken } = req.params;

	if (!mongoose.Types.ObjectId.isValid(orderId)) {

		return next(new AppError('Invalid order ID', 400));
	}


	const order = await GuestAddress.findOne({ order: orderId }).populate('order');

	if (!order || !order.order) return next(new AppError('Order not found', 404));


	if (!verifyGuestOrderAccessToken(accessToken, order.order._id, order._id)) {

		return next(new AppError('Order not found', 404));
	}


	for (const item of order.order.product) {

		let productDoc = await SpecProd.findById(item.product);

		if (!productDoc) {
			productDoc = await Shoe.findById(item.product);
		}

		if (!productDoc) {
			productDoc = await Bag.findById(item.product);
		}

		if (!productDoc) {
			productDoc = await Accessory.findById(item.product);
		}

		item.product = productDoc;
	}


	const products = order.order.product;


	const transaction = await Transaction.findById(order.order.transaction);

	if (!transaction) return next(new AppError('Transaction not found', 404));

	res.status(200).render('guest-order-page', {

		pageTitle: 'Guest Order Details | Ang Hiyas',
		pageDescription: 'View your Ang Hiyas guest order details, purchased items, delivery information and transaction summary.',
		canonicalUrl: `${process.env.CANONICAL_URL}guest-order-number`,
		noIndex: true,
		order,
		products,
		transaction
	})
})


/// Successful enquiry 


exports.getEnquirySuccess = catchAsync(async (req, res, next) => {

	res.status(200).render('enquirySuccess', {

		pageTitle: 'Enquiry Sent | Ang Hiyas',
		pageDescription: 'Your Ang Hiyas enquiry has been sent successfully. We will be in touch soon to discuss your request.',
		canonicalUrl: `${process.env.CANONICAL_URL}enquiry-success`,
		noIndex: true
	});
});






//------------------------------------- ----- ---------------------------------------//
//------------------------------------- Admin ---------------------------------------//
//------------------------------------- ----- ---------------------------------------//



/// Home Page ///


exports.adminPage = (req, res) => {

	res.status(200).render('admin/be_home', {

		title: 'Admin'
	})
}




/// Enquiries Page ///


exports.adminEnquiriesPage = catchAsync(async (req, res) => {

	const enquiryList = await Enquiry.find().sort({ createdAt: -1 });

	res.status(200).render('admin/be_enquiries', {

		title: 'Admin-Enquiries',
		enquiryList
	})
}
)



/// Enquiry Page ///


exports.adminEnquiryPage = catchAsync(async (req, res, next) => {


	if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

		return next(new AppError('Invalid enquiry ID', 400));
	}

	const enquiry = await Enquiry.findById(req.params.id);

	if (!enquiry) {

		return next(new AppError('Enquiry not found', 404));
	}


	const enquiryStatusOptions = Enquiry.schema.path('status').enumValues;

	res.status(200).render('admin/be_enquiry', {
		title: 'Admin-Enquiry',
		enquiry,
		enquiryStatusOptions
	});
});





exports.adminCustomEnquiriesPage = catchAsync(async (req, res) => {

	const customEnquiryList = await CustomEnquiry.find().sort({ createdAt: -1 });

	res.status(200).render('admin/be_custom-enquiries', {

		title: 'Admin-Custom Enquiries',
		customEnquiryList
	})
}
)


exports.adminCustomEnquiryPage = catchAsync(async (req, res) => {

	if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

		return next(new AppError('Invalid custom enquiry ID', 400));
	}

	const enquiry = await CustomEnquiry.findById(req.params.id);

	if (!enquiry) {

		return next(new AppError('Custom enquiry not found', 404));
	}


	const enquiryStatusOptions = CustomEnquiry.schema.path('status').enumValues;

	res.status(200).render('admin/be_custom-enquiry', {
		title: 'Admin-Enquiry',
		enquiry,
		enquiryStatusOptions
	});
});






/// 	User Pages 	///


exports.getUserList = catchAsync(async (req, res) => {

	const roleFilter = req.query.role ? { role: req.query.role } : {};

	const userList = await User.find(roleFilter).select('+active');

	res.status(200).render('admin/be_user-list', {
		title: 'Admin-Users',
		userList,
		selectedRole: req.query.role || '',
		currentAdmin: req.user
	})
})




exports.getUserPage = catchAsync(async (req, res, next) => {

	if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

		return next(new AppError('Invalid user ID', 400));
	}

	const userPage = await User.findById(req.params.id);

	if (!userPage) return next(new AppError('User not found', 404));

	if (userPage.role === 'owner' && req.user.role !== 'owner') {

		return next(new AppError('Only owners can view owner accounts', 403));
	}

	if (req.user.role === 'admin' && userPage.role !== 'user') {

		return next(new AppError('Admins cannot edit staff accounts', 403));
	}


	/// Products for user page when cart/wishlist available

	// const wishlistArr = userPage.wishlist.map(item => item.product);
	// const products = await SpecProd.find({ _id: wishlistArr });

	// const cartArr = userPage.cart.map(item => item.product);
	// const cartProducts = await SpecProd.find({ _id: cartArr });	

	res.status(200).render('admin/be_user-page', {

		title: `Admin-User`,
		userPage,
		currentAdmin: req.user,
		// products,
		// cartProducts
	})
})



exports.getNewUserPage = catchAsync(async (req, res) => {


	res.status(200).render('admin/be_user-new', {

		title: `Admin-New-User`,

	})
})




exports.getUserSearch = catchAsync(async (req, res, next) => {

	const userEmail = req.query.userEmailSearch;

	const userSearch = await User.findOne({ email: userEmail }).select('+active');


	if (!userSearch) return next(new AppError('User not found', 404));


	res.status(200).render('admin/be_user-search', {

		title: `Admin-User-Results`,
		userSearch,
		currentAdmin: req.user

	})
})



exports.getMyDetails = catchAsync(async (req, res) => {


	res.status(200).render('admin/be_user-details', {

		title: `Admin-User`,

	})
})






// ------------- 	Product Pages 	-------------	///




///		Barongs		


exports.getProductsDashboard = catchAsync(async (req, res) => {

	res.status(200).render('admin/be_products-dashboard', {

		title: 'Admin-Products-Dashboard',
	})
})




exports.getBarongsList = catchAsync(async (req, res) => {

	const productList = await SpecProd.find()
		.populate('discount')
		.populate({
			path: 'category',
			select: 'name discount'
		})
		.sort({ createdAt: -1 });


	await Promise.all(productList.map(async product => {

		await missingDiscountCheck(product);
	}));

	res.status(200).render('admin/be_barongs-list', {
		title: 'Admin-Barong-Products',
		productList
	})
})



exports.getBarong = catchAsync(async (req, res, next) => {

	const product = await SpecProd.findOne({ slug: req.params.slug }).populate(
		{
			path: 'category',
			select: 'name discount'
		}
	);

	if (!product) return next(new AppError('Product not found', 404));

	await missingDiscountCheck(product);


	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');

	const colors = SpecProd.schema.path('color').enumValues;
	const sexes = SpecProd.schema.path('sex').enumValues;
	const features = SpecProd.schema.path('features').caster.enumValues;


	const sizes = getBarongSizesForSex(product.sex);

	const variantMap = new Map(
		product.variants.map(variant => [variant.size, variant])
	);

	const variants = sizes.map(size => {
		const existingVariant = variantMap.get(size);

		return {
			size,
			inStock: existingVariant ? existingVariant.inStock : 0
		};
	});



	res.status(200).render('admin/be_barong', {

		title: `Admin-${product.name}`,
		product,
		categories,
		discounts,
		colors,
		sexes,
		features,
		variants

	})
})





exports.createBarongPage = catchAsync(async (req, res) => {

	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');

	const colors = SpecProd.schema.path('color').enumValues;
	const sexes = SpecProd.schema.path('sex').enumValues;
	const features = SpecProd.schema.path('features').caster.enumValues;
	const sizeGroups = getBarongSizeGroups();

	const product = {};

	res.status(200).render('admin/be_barong-create', {

		title: 'Admin- Create Product',
		product,
		categories,
		discounts,
		colors,
		sexes,
		features,
		sizeGroups
	});
});



exports.getBarongSearch = catchAsync(async (req, res, next) => {

	const productSku = req.query.productSearch;

	const colors = SpecProd.schema.path('color').enumValues;
	const sexes = SpecProd.schema.path('sex').enumValues;
	const features = SpecProd.schema.path('features').caster.enumValues;

	const product = await SpecProd.findOne({ productSku }).populate(
		{
			path: 'category',
			select: 'name discount'
		}
	);

	if (!product) return next(new AppError('Product not found', 404));

	await missingDiscountCheck(product);


	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');


	res.status(200).render('admin/be_barong', {

		title: `Admin-Barong`,
		product,
		categories,
		discounts,
		colors,
		sexes,
		features
	})
})



///		Shoes	


exports.getShoesList = catchAsync(async (req, res) => {

	const productList = await Shoe.find()
		.populate('discount')
		.populate({
			path: 'category',
			select: 'name'
		})
		.sort({ createdAt: -1 });


	res.status(200).render('admin/be_shoes-list', {

		title: 'Admin-Shoe-Products',
		productList
	})
})



exports.getShoe = catchAsync(async (req, res, next) => {

	const product = await Shoe.findOne({ slug: req.params.slug }).populate(
		{
			path: 'category',
			select: 'name'
		}
	);

	if (!product) return next(new AppError('Product not found', 404));

	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');

	res.status(200).render('admin/be_shoe', {

		title: `Admin-${product.name}`,
		product,
		categories,
		discounts
	})
})






exports.createShoesPage = catchAsync(async (req, res) => {

	const categories = await Category.find().select('name');
	// const discounts = await Discount.find().select('code');

	const product = {};

	res.status(200).render('admin/be_shoes-create', {

		title: 'Admin- Create Shoes',
		product,
		categories,
		// discounts
	})
})




///		Bags	


exports.getBagList = catchAsync(async (req, res) => {

	const productList = await Bag.find()
		.populate('discount')
		.populate({
			path: 'category',
			select: 'name'
		})
		.sort({ createdAt: -1 });


	res.status(200).render('admin/be_bag-list', {
		title: 'Admin-Bag-Products',
		productList

	})
})



exports.getBag = catchAsync(async (req, res, next) => {

	const product = await Bag.findOne({ slug: req.params.slug }).populate(
		{
			path: 'category',
			select: 'name'
		}
	);

	if (!product) return next(new AppError('Product not found', 404));

	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');

	res.status(200).render('admin/be_bag', {

		title: `Admin-${product.name}`,
		product,
		categories,
		discounts
	})
})



exports.createBagPage = catchAsync(async (req, res) => {

	const categories = await Category.find().select('name');
	// const discounts = await Discount.find().select('code');

	const product = {};

	res.status(200).render('admin/be_bag-create', {

		title: 'Admin- Create Bag',
		product,
		categories,
		// discounts
	})
})



exports.getBagSearch = catchAsync(async (req, res, next) => {

	const productSku = req.query.productSearch;

	const product = await Bag.findOne({ productSku }).populate(
		{
			path: 'category',
			select: 'name'
		});

	if (!product) return next(new AppError('Product not found', 404));

	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');


	res.status(200).render('admin/be_bag', {

		title: `Admin-Bag`,
		product,
		categories,
		discounts
	})
})





///		Accessories	


exports.getAccessoriesList = catchAsync(async (req, res) => {

	const productList = await Accessory.find()
		.populate('discount')
		.populate({
			path: 'category',
			select: 'name'
		})
		.sort({ createdAt: -1 });


	res.status(200).render('admin/be_accessories-list', {
		title: 'Admin-Accessories-Products',
		productList

	})
})



exports.getAccessory = catchAsync(async (req, res, next) => {

	const product = await Accessory.findOne({ slug: req.params.slug }).populate(
		{
			path: 'category',
			select: 'name'
		}
	);

	if (!product) return next(new AppError('Product not found', 404));

	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');

	res.status(200).render('admin/be_accessory', {

		title: `Admin-${product.name}`,
		product,
		categories,
		discounts
	})
})



exports.createAccessoriesPage = catchAsync(async (req, res) => {

	const categories = await Category.find().select('name');
	// const discounts = await Discount.find().select('code');

	const product = {};

	res.status(200).render('admin/be_accessories-create', {

		title: 'Admin- Create Accessories',
		product,
		categories,
		// discounts
	})
})



exports.getAccessorySearch = catchAsync(async (req, res, next) => {

	const productSku = req.query.productSearch;

	const product = await Accessory.findOne({ productSku }).populate(
		{
			path: 'category',
			select: 'name'
		});

	if (!product) return next(new AppError('Product not found', 404));

	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');


	res.status(200).render('admin/be_accessory', {

		title: `Admin-Accesory`,
		product,
		categories,
		discounts
	})
})





/// 	Category Pages 	///



exports.getCategoryList = catchAsync(async (req, res) => {

	const categoryList = await Category.find().populate('discount');

	res.status(200).render('admin/be_category-list', {

		title: 'Admin-Categories',
		categoryList
	})
})





exports.getNewCategoryPage = catchAsync(async (req, res) => {


	res.status(200).render('admin/be_category-new', {

		title: `Admin-New-Category`,

	})
})




exports.getCategoryPage = catchAsync(async (req, res, next) => {

	if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

		return next(new AppError('Invalid category ID', 400));
	}

	const categoryPage = await Category.findById(req.params.id);

	if (!categoryPage) return next(new AppError('Category not found', 404));


	const discounts = await Discount.find().select('code');

	const selectedDiscount = categoryPage.discount ? categoryPage.discount.toString() : '';


	res.status(200).render('admin/be_category-page', {

		title: `Admin-Category`,
		categoryPage,
		discounts,
		selectedDiscount
	})
})





/// 	 Orders Pages	 ///



exports.getOrderList = catchAsync(async (req, res) => {

	const orders = await Order.find().sort({ createdAt: -1 })
		.populate('discount')
		.populate('transaction')
		.populate('user');

	const guestAddresses = await GuestAddress.find();
	const guestEmailMap = {};

	guestAddresses.forEach(guest => {

		if (guest.order) {

			guestEmailMap[guest.order.toString()] = guest.email;
		}
	});

	orders.forEach(order => {

		if (!order.user) {

			order.guestEmail = guestEmailMap[order._id.toString()] || 'Guest email missing';
		}
	});

	res.status(200).render('admin/be_order-list', {

		title: `Admin-Orders`,
		orders
	});
});




exports.getOrderPage = catchAsync(async (req, res, next) => {

	const orderNum = req.params.orderNum;

	const order = await Order.findOne({ orderNum })
		.populate('transaction')
		.populate({
			path: 'product.product',
			select: 'name'
		})
		.populate('user');


	if (!order) return next(new AppError('No order found with that order number!', 404));


	let guestAddress;

	if (!order.user) {

		guestAddress = await GuestAddress.findOne({ order: order._id });

		if (guestAddress) {

			order.guestName = guestAddress.name;
			order.guestEmail = guestAddress.email;
			order.guestPhone = 'Not Required';
		}
	}

	const addressFilter = req.query.shipaddress ? { label: req.query.shipaddress } : {};

	const userAddresses = order.user
		? await User.findOne({ email: order.user.email }, 'addresses')
		: null;


	let { shippingAddress } = order;



	if (addressFilter.label && userAddresses) {

		shippingAddress = userAddresses.addresses.find(address => address.label === addressFilter.label);
	}


	if (!shippingAddress) {

		shippingAddress = order.shippingAddress;
	}


	const isPickup = order.fulfilmentMethod === 'pickup';

	if (!shippingAddress && !isPickup) {

		return next(new AppError('Shipping address not found', 404));
	}


	const formattedAddress = isPickup
		? 'Local Pickup - no delivery address required'
		: `${shippingAddress.number} ${shippingAddress.street},${shippingAddress.city},${shippingAddress.state},${shippingAddress.postcode}`;

	const renderedAddress = formattedAddress.replaceAll(",", "\n");

	const shippingAddressData = isPickup
		? JSON.stringify({})
		: JSON.stringify(shippingAddress);



	res.status(200).render('admin/be_order-page', {
		title: `Admin-Order`,
		order,
		renderedAddress,
		addressFilter,
		shippingAddress,
		shippingAddressData
	});
});





exports.getOrderSearch = catchAsync(async (req, res, next) => {

	let order, orders;

	if (req.query.orderNumSearch) {

		const orderNum = req.query.orderNumSearch;

		order = await Order.findOne({ orderNum })
			.populate('transaction')
			.populate({
				path: 'product.product',
				select: 'name'
			})
			.populate('user');

		if (!order) {
			return next(new AppError('No Order Found with that Order Number', 404))
		}
	}


	if (req.query.emailSearch) {

		const orderEmail = req.query.emailSearch;


		const user = await User.findOne({ email: orderEmail });

		if (user) {

			orders = await Order.find({ user: user._id })
				.populate('transaction')
				.populate({
					path: 'product.product',
					select: 'name'
				})
				.populate('user');

		} else {

			const guestAddresses = await GuestAddress.find({ email: orderEmail });

			if (!guestAddresses || guestAddresses.length === 0) {

				return next(new AppError('No User or Guest found with that email.', 404));
			}

			const guestOrderIds = guestAddresses
				.filter(guest => guest.order)
				.map(guest => guest.order);

			orders = await Order.find({ _id: { $in: guestOrderIds } })
				.populate('transaction')
				.populate({
					path: 'product.product',
					select: 'name'
				});
		}

		if (!orders || orders.length === 0) {

			return next(new AppError('No orders found for that email.', 404));
		}
	}

	res.status(200).render('admin/be_order-search', {

		title: `Admin-Order Search`,
		order,
		orders,
	})
})





/// 	 Transactions Pages	 ///


exports.getTransactionList = catchAsync(async (req, res, next) => {

	const transactions = await Transaction.find().sort({ createdAt: -1 });


	res.status(200).render('admin/be_transaction-list', {

		title: `Admin-Transaction list`,
		transactions
	})

})



exports.getTransactionSearch = catchAsync(async (req, res, next) => {

	const orderNum = req.query.transactionSearch;

	const order = await Order.findOne({ orderNum })

	if (!order) return next(new AppError('Order not found', 404));


	const transaction = await Transaction.findById(order.transaction);

	if (!transaction) return next(new AppError('Transaction not found', 404));


	res.status(200).render('admin/be_transaction', {

		title: `Admin-Transaction list`,
		transaction
	})
})





/// 	 Discounts Pages	 ///


exports.getDiscountList = catchAsync(async (req, res, next) => {

	const discounts = await Discount.find();

	res.status(200).render('admin/be_discount-list', {

		title: `Admin-Discount list`,
		discounts

	})
})



exports.createDiscountPage = catchAsync(async (req, res, next) => {

	res.status(200).render('admin/be_discount-create-page', {

		title: `Admin-Discount Create`,

	})
})



exports.updateDiscountPage = catchAsync(async (req, res, next) => {

	function formatDateInput(date) {

		if (!date) return '';

		return new Date(date).toISOString().slice(0, 10);
	}

	const discountId = req.params.id;

	if (!mongoose.Types.ObjectId.isValid(discountId)) {

		return next(new AppError('Invalid discount ID', 400));
	}

	const discount = await Discount.findById(discountId);

	if (!discount) return next(new AppError('Discount not found', 404));


	res.status(200).render('admin/be_discount-update-page', {

		title: `Admin-Discount Update`,
		discount,
		startDate: formatDateInput(discount.startDate),
		endDate: formatDateInput(discount.endDate)

	})

})
