const mongoose = require('mongoose');

const catchAsync = require('./../utilities/catchAsync');
const APIFeatures = require('./../utilities/apiFeatures');
const AppError = require('./../utilities/appError');

const priceAtPurchaseDiscount = require('../utilities/priceAtPurchase');
const categoryDiscountPrice = require('../utilities/categoryDiscountOnPurchase');
const missingDiscountCheck = require('../utilities/missingDiscountCheck');
const missingDiscountCheckLoop = require('../utilities/missingDiscountCheckLoop');


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

const { description } = require('../models/productBaseModel');



//------------------------ login Page ---------------------------


exports.loginPage = (req, res) => {

	res.status(200).render('login', {

		pageTitle: 'Login/Signup',
		pageDescription: 'Login Page',
		canonicalUrl: `${process.env.CANONICAL_URL}login`
	})
}


//------------------- Reset Password Page ----------------------


exports.resetPasswordPage = (req, res) => {

	res.status(200).render('reset-password', {

		pageTitle: 'Reset Your Password',
		pageDescription: 'Reset Password Page',
		canonicalUrl: `${process.env.CANONICAL_URL}reset-password`
	})
}





exports.setNewPasswordPage = (req, res) => {

	const token = req.params.token;


	res.status(200).render('set-new-password', {

		pageTitle: 'Set New Password',
		pageDescription: 'Set New Password Page',
		canonicalUrl: `${process.env.CANONICAL_URL}set-new-password`
	})
}





//------------------------ Home Page ---------------------------


exports.getHomePage = catchAsync(async (req, res, next) => {


	const products = await SpecProd.find().populate('category').populate('discount').sort({ createdAt: -1 }).limit(5);

	await Promise.all(products.map(async product => {

		await missingDiscountCheck(product);

	}));

	res.status(200).render('home-page', {

		pageTitle: 'Anghiyas | Filipino Clothing',
		pageDescription: 'Barong and filiniana Customization, rentals and Sales, ready to wear. Traditional filipino clothing',
		canonicalUrl: `${process.env.CANONICAL_URL}`,
		products

	});
})





//------------------- Shop Pages ------------------------//


///			Re-usable variant function -	for forms		///

/// Variants (Sizing)

const formVariants = async (variant, desiredOrder = null) => {

	const variantSearch = await SpecProd.aggregate([

		{ $unwind: '$variants' },
		{ $group: { _id: `$variants.${variant}` } }
	])

	const Arr = variantSearch.map(v => v._id);

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





//----------------- Barong List Page --------------------//


exports.getBarongListPage = catchAsync(async (req, res, next) => {


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


	///			Display Colors in dropdown			///

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
		'brown',
		'champagne',
		'old rose',
		'ethnic'
	];

	const colorList = await formFields('color', desiredColorOrder);

	///			Display Sex in dropdown			///


	const desiredSexOrder = [
		'male',
		'female',
		'boy',
		'girl',
		'unisex',
		'unisex-kids'

	];

	const sexList = await formFields('sex', desiredSexOrder);



	///			Display Category in dropdown			///



	const categoryIds = await SpecProd.distinct('category');

	const categoryList = await Category.find({
		_id: { $in: categoryIds }
	}).select('name').sort({ name: 1 }).lean();


	///			 Filtering			///

	const size = req.query.productSize;
	const selectedColor = req.query.color;
	const selectedSex = req.query.sex;
	const selectedcategory = req.query.category;

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

	res.status(200).render('barong-list-page', {
		pageTitle: 'Product List',
		pageDescription: 'Home Page for your website',
		canonicalUrl: `${process.env.CANONICAL_URL}`,
		productlist,
		sizeList,
		sexList,
		categoryList,
		colorList,
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

		pageTitle: `${product.name} | Template Website`,
		pageDescription: 'Product Page for your website',
		canonicalUrl: `${process.env.CANONICAL_URL}product-page/${product.slug}`,
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
		pageTitle: 'Shoe List',
		pageDescription: 'List os Shoes',
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

	const selectedOption = req.query.productSort || 'newest';
	const sortOption = parameterFilter[req.query.productSort] || { createdAt: -1 };


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

	// const desiredCategory = ['Premium', 'Standard'];

	// const categoryDocs = await Category.find({
	// 	name: { $in: desiredCategory }
	// }).select('name').lean();

	// const categoryList = desiredCategory
	// 	.map(name => categoryDocs.find(category => category.name === name))
	// 	.filter(Boolean);

	const categoryIds = await Accessory.distinct('category');

	const categoryList = await Category.find({
		_id: { $in: categoryIds }
	}).select('name').sort({ name: 1 }).lean();

	/// Filtering ///

	const selectedColor = req.query.color;
	const selectedcategory = req.query.category;

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

	res.status(200).render('accessories-list-page', {
		pageTitle: 'Accessories List',
		pageDescription: 'List of Accessories',
		canonicalUrl: `${process.env.CANONICAL_URL}accessories-list`,
		productlist,
		colorList,
		categoryList,
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

		pageTitle: `${product.name} | Template Website`,
		pageDescription: 'Product Page for your website',
		canonicalUrl: `${process.env.CANONICAL_URL}product-page/${product.slug}`,
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



	// const desiredCategory = ['Premium', 'Standard'];

	// const categoryDocs = await Category.find({
	// 	name: { $in: desiredCategory }
	// }).select('name').lean();

	// const categoryList = desiredCategory
	// 	.map(name => categoryDocs.find(category => category.name === name))
	// 	.filter(Boolean);

	const categoryIds = await Bag.distinct('category');

	const categoryList = await Category.find({
		_id: { $in: categoryIds }
	}).select('name').sort({ name: 1 }).lean();




	const selectedColor = req.query.color;
	const selectedcategory = req.query.category;

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

	res.status(200).render('bag-list-page', {
		pageTitle: 'Bags List',
		pageDescription: 'List of Bags',
		canonicalUrl: `${process.env.CANONICAL_URL}bags-list`,
		productlist,
		colorList,
		categoryList,
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

		pageTitle: `${product.name} | Template Website`,
		pageDescription: 'Product Page for your website',
		canonicalUrl: `${process.env.CANONICAL_URL}product-page/${product.slug}`,
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

		pageTitle: `Categories | Template Website`,
		pageDescription: 'Category Page for your website',
		canonicalUrl: `${process.env.CANONICAL_URL}categories-page`,
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

		pageTitle: `Category -  | Template Website`,
		pageDescription: `Category Page for your website`,
		canonicalUrl: `${process.env.CANONICAL_URL}category-page`,
		products,
		category
	});
})



//--------------------- Sales Page --------------------------//



exports.getSalesPage = (req, res) => {

	res.status(200).render('sales', {

		pageTitle: 'Sales',
		pageDescription: 'Sales Page',
		canonicalUrl: `${process.env.CANONICAL_URL}sales`
	})
}


//--------------------- Services Page --------------------------//



exports.getServicesPage = (req, res) => {

	res.status(200).render('services', {

		pageTitle: 'Services',
		pageDescription: 'Services Page',
		canonicalUrl: `${process.env.CANONICAL_URL}services`
	})
}



//--------------------- Customization Page --------------------------//



exports.getCustomizationPage = (req, res) => {

	res.status(200).render('custom', {

		pageTitle: 'Customizations',
		pageDescription: 'Customizations Page',
		canonicalUrl: `${process.env.CANONICAL_URL}custom`
	})
}


exports.getCustomContactPage = (req, res) => {

	res.status(200).render('custom-contact', {

		pageTitle: 'Customizations Enquiry',
		pageDescription: 'Customizations Enquiry Page',
		canonicalUrl: `${process.env.CANONICAL_URL}custom-contact`
	})
}


//--------------------- Rentals Page --------------------------//



exports.getRentalsPage = (req, res) => {

	res.status(200).render('rentals', {

		pageTitle: 'Rentals',
		pageDescription: 'Rentals Page',
		canonicalUrl: `${process.env.CANONICAL_URL}rentals`
	})
}


exports.getRentalGuidePage = (req, res) => {

	res.status(200).render('rental-guide', {

		pageTitle: 'Rental Guide',
		pageDescription: 'Rentals Guide Page',
		canonicalUrl: `${process.env.CANONICAL_URL}rental-guide`
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

		pageTitle: 'About',
		pageDescription: 'About Page',
		canonicalUrl: `${process.env.CANONICAL_URL}about`
	})
}



//--------------------- Contact Page --------------------------//



exports.getContactPage = (req, res) => {

	res.status(200).render('contact', {

		pageTitle: 'Contact',
		pageDescription: 'Contact Page',
		canonicalUrl: `${process.env.CANONICAL_URL}contact`
	})
}




//--------------------- Account Page --------------------------//



exports.getAccountPage = catchAsync(async (req, res, next) => {


	const user = await User.findById(req.user.id)
		.populate('addresses');

	if (!user) {

		return next(new AppError('User not found', 404));
	}



	/// Original Method


	// const populateProducts = async (items) => {

	// 	for (const item of items) {

	// 		let product = await SpecProd.findById(item.product).populate('category');
	// 		let productType = 'barong';

	// 		if (!product) {
	// 			product = await Shoe.findById(item.product).populate('category');
	// 			if (product) productType = 'shoe';
	// 		}

	// 		if (!product) {
	// 			product = await Bag.findById(item.product).populate('category');
	// 			if (product) productType = 'bag';
	// 		}

	// 		if (!product) {
	// 			product = await Accessory.findById(item.product).populate('category');
	// 			if (product) productType = 'accessory';
	// 		}

	// 		// Direct property assignment
	// 		item.product = product;
	// 		item.productType = productType;

	// 		// Force Mongoose to recognize the change
	// 		item.markModified('product');
	// 		item.markModified('productType');
	// 	}
	// };

	// await populateProducts(user.cart);
	// await populateProducts(user.wishlist);



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


	/// Original Method

	// for (const order of orders) {

	// 	for (const item of order.product) {

	// 		let productDoc = await SpecProd.findById(item.product);

	// 		if (!productDoc) {
	// 			productDoc = await Shoe.findById(item.product);
	// 		}

	// 		if (!productDoc) {
	// 			productDoc = await Bag.findById(item.product);
	// 		}

	// 		if (!productDoc) {
	// 			productDoc = await Accessory.findById(item.product);
	// 		}

	// 		item.product = productDoc; // Will be null if not found

	// 	}
	// }



	/// DRY Method


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
		pageTitle: 'My Account',
		pageDescription: 'Account Page',
		canonicalUrl: `${process.env.CANONICAL_URL}myAccount`,
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

		pageTitle: 'Address Form',
		pageDescription: 'Add or update delievry and billing addresses',
		canonicalUrl: `${process.env.CANONICAL_URL}address-form-page`,
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

		pageTitle: 'Address Form',
		pageDescription: 'Add or update delievry and billing addresses',
		canonicalUrl: `${process.env.CANONICAL_URL}address-form-page`,
		selectedAddress
	})
}





//---------------------- Checkout page ----------------------//


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

				return next(new AppError('No Variant Found', 404));
			}

			if (variant.inStock < qty) {

				return next(new AppError(`Not enough ${variant.size} in stock! Only ${variant.inStock} left.`, 400));
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


	const delivery = totalNet < 50 ? 10 : 0;
	const taxes = Math.round(((totalNet + delivery) * 0.1) * 10) / 10;
	const totalGross = (totalNet + delivery) + taxes;



	///  Buy ItNow total	

	const sitePreview = process.env.SITE_PREVIEW === 'true';


	if (!productId) {

		res.status(200).render('checkout', {

			pageTitle: 'Checkout',
			pageDescription: 'Checkout Page',
			canonicalUrl: `${process.env.CANONICAL_URL}checkout`,
			cart,
			totalNet,
			delivery,
			taxes,
			totalGross,
			defaultAddress: addressToRender,
			selectedLabel: selectedLabel,
			paypalClientId: `${process.env.PAYPAL_CLIENT_ID}`,
			sitePreview: process.env.SITE_PREVIEW === 'true'
		})

	} else {

		res.status(200).render('checkout', {

			pageTitle: 'Checkout',
			pageDescription: 'Checkout Page',
			canonicalUrl: `${process.env.CANONICAL_URL}checkout`,
			product,
			variant,
			qty,
			totalNet,
			delivery,
			taxes,
			totalGross,
			defaultAddress: addressToRender,
			selectedLabel: selectedLabel,
			paypalClientId: `${process.env.PAYPAL_CLIENT_ID}`,
			sitePreview
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

			return next(new AppError('No Variant Found', 404));
		}

		if (variant.inStock < qty) {

			return next(new AppError(`Not enough ${variant.size} in stock! Only ${variant.inStock} left.`, 400));
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

	const delivery = totalNet < 50 ? 10 : 0;
	const taxes = Math.round(((totalNet + delivery) * 0.1) * 10) / 10;
	const totalGross = (totalNet + delivery) + taxes;



	/// CHECKOUT SITE PREVIEW CONDITIONAL

	const sitePreview = process.env.SITE_PREVIEW === 'true';


	res.status(200).render('checkout', {

		pageTitle: 'Checkout',
		pageDescription: 'Checkout Page',
		canonicalUrl: `${process.env.CANONICAL_URL}checkout`,
		product,
		variant,
		qty,
		totalNet,
		delivery,
		taxes,
		totalGross,
		guest: true,
		paypalClientId: `${process.env.PAYPAL_CLIENT_ID}`,
		sitePreview
	})
})



//-------------------- Successful payment page --------------------------//



exports.getSuccessfulPaymentPage = (req, res) => {

	res.status(200).render('payment-success', {

		pageTitle: 'Successful Payment',
		pageDescription: 'Successful Payment Page',
		canonicalUrl: `${process.env.CANONICAL_URL}payment-success`
	})
}



exports.getSuccessfulPaymentPageGuest = (req, res) => {

	res.status(200).render('payment-success-guest', {

		pageTitle: 'Successful Payment',
		pageDescription: 'Successful Payment Page',
		canonicalUrl: `${process.env.CANONICAL_URL}payment-success-guest`
	})
}




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
		pageTitle: 'Order Page',
		pageDescription: 'Successful Payment Page',
		canonicalUrl: `${process.env.CANONICAL_URL}order-page`,
		order,
		products: order.product,
		transaction
	});
});




exports.getGuestOrderPage = catchAsync(async (req, res, next) => {

	const orderId = req.params.orderId;

	if (!mongoose.Types.ObjectId.isValid(orderId)) {

		return next(new AppError('Invalid order ID', 400));
	}


	const order = await GuestAddress.findOne({ order: orderId }).populate('order');

	if (!order || !order.order) return next(new AppError('Order not found', 404));


	const products = order.order.product;

	const transaction = await Transaction.findById(order.transaction);

	if (!transaction) return next(new AppError('Transaction not found', 404));

	res.status(200).render('guest-order-page', {

		pageTitle: 'Order Page',
		pageDescription: 'Successful Payment Page',
		canonicalUrl: `${process.env.CANONICAL_URL}guest-order-page`,
		order,
		products,
		transaction
	})
})


/// Successful enquiry 


exports.getEnquirySuccess = catchAsync(async (req, res, next) => {

	res.status(200).render('enquirySuccess', {

		pageTitle: 'Enquiry Sent | Widebay Web Wise',
		pageDescription: 'Your enquiry has been sent successfully. Widebay Web Wise will be in touch soon.',
		canonicalUrl: `${process.env.CANONICAL_URL}/enquiry-success`,
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

	res.status(200).render('admin/be_barong', {

		title: `Admin-${product.name}`,
		product,
		categories,
		discounts,
		colors,
		sexes,
		features

	})
})



exports.createBarongPage = catchAsync(async (req, res) => {

	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');

	const colors = SpecProd.schema.path('color').enumValues;
	const sexes = SpecProd.schema.path('sex').enumValues;
	const features = SpecProd.schema.path('features').caster.enumValues;

	const product = {};

	res.status(200).render('admin/be_barong-create', {

		title: 'Admin- Create Product',
		product,
		categories,
		discounts,
		colors,
		sexes,
		features
	})
})




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

	if (!shippingAddress) {

		return next(new AppError('Shipping address not found', 404));
	}


	const formattedAddress = `${shippingAddress.number} ${shippingAddress.street},${shippingAddress.city},${shippingAddress.state},${shippingAddress.postcode}`;

	const renderedAddress = formattedAddress.replaceAll(",", "\n");

	const shippingAddressData = JSON.stringify(shippingAddress);



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


