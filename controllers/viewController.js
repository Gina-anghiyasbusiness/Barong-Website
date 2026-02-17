const catchAsync = require('./../utilities/catchAsync');
const APIFeatures = require('./../utilities/apiFeatures');
const AppError = require('./../utilities/appError');

const priceAtPurchaseDiscount = require('../utilities/priceAtPurchase');
const categoryDiscountPrice = require('../utilities/categoryDiscountOnPurchase');
const missingDiscountCheck = require('../utilities/missingDiscountCheck');
const missingDiscountCheckLoop = require('../utilities/missingDiscountCheckLoop');


const SpecProd = require('./../models/specProdModel');
const Shoe = require('./../models/shoeModel');
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

		pageTitle: 'Home',
		pageDescription: 'Home Page for your website',
		canonicalUrl: `${process.env.CANONICAL_URL}`,
		products

	});
})





//------------------- Shop Pages ------------------------//


///			Re-usable variant function -	for forms		///

const formVariants = async (variant, desiredOrder = null) => {

	const variantSearch = await SpecProd.aggregate([

		{ $unwind: '$variants' },
		{ $group: { _id: `$variants.${variant}` } }
	])

	const Arr = variantSearch.map(v => v._id);

	if (!desiredOrder) return Arr;

	return desiredOrder.filter(v => Arr.includes(v));
}





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


	const desiredSizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '6', '8', '10', '12', '14', '16', '18'];

	const sizeList = await formVariants('size', desiredSizeOrder);


	///			 Filter By Size			///

	const size = req.query.productSize;

	let productlist;

	if (!size) {

		productlist = await SpecProd.find().sort(sortOption).populate('category');

	} else productlist = await SpecProd.find({ 'variants': { $elemMatch: { size: size, inStock: { $gt: 0 } } } }).sort(sortOption).populate('category');


	await Promise.all(productlist.map(async product => {

		await missingDiscountCheck(product);

	}));

	res.status(200).render('barong-list-page', {
		pageTitle: 'Product List',
		pageDescription: 'Home Page for your website',
		canonicalUrl: `${process.env.CANONICAL_URL}`,
		productlist,
		sizeList,
		selectedOption,
		selectedSize: size || ''  // ← add this
	});
})





//------------------ Barong Page -----------------------//



exports.getBarongPage = catchAsync(async (req, res, next) => {

	const product = await SpecProd.findOne({ slug: req.params.slug }).populate({
		path: 'reviews',
		select: 'user rating comment'
	}).populate('category');



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

		if (!productId || !orders) {

			return;

		} else {

			hasPurchased = orders.some(order => order.product.some(prod => {

				return prod.product?._id?.toString() === productId;
			}))
		}
	}

	if (!product) return next(new AppError('No product Found', 404));



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


	const desiredSizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '6', '8', '10', '12', '14', '16', '18'];

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

		if (!productId || !orders) {

			return;

		} else {

			hasPurchased = orders.some(order => order.product.some(prod => {

				return prod.product?._id?.toString() === productId;
			}))
		}
	}

	if (!product) return next(new AppError('No product Found', 404));

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


	const desiredSizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '6', '8', '10', '12', '14', '16', '18'];

	const sizeList = await formVariants('size', desiredSizeOrder);


	///			 Filter By Size			///

	const size = req.query.productSize;

	let productlist;

	if (!size) {

		productlist = await Accessory.find().sort(sortOption).populate('category');

	} else productlist = await Accessory.find({ 'variants': { $elemMatch: { size: size, inStock: { $gt: 0 } } } }).sort(sortOption).populate('category');


	await Promise.all(productlist.map(async product => {

		await missingDiscountCheck(product);

	}));

	res.status(200).render('accessories-list-page', {
		pageTitle: 'Accessories List',
		pageDescription: 'List of Shoes',
		canonicalUrl: `${process.env.CANONICAL_URL}accessories-list`,
		productlist,
		sizeList,
		selectedOption,
		selectedSize: size || ''  // ← add this
	});
})






exports.getAccessoryPage = catchAsync(async (req, res, next) => {

	const product = await Accessory.findOne({ slug: req.params.slug }).populate({
		path: 'reviews',
		select: 'user rating comment'
	}).populate('category');



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

		if (!productId || !orders) {

			return;

		} else {

			hasPurchased = orders.some(order => order.product.some(prod => {

				return prod.product?._id?.toString() === productId;
			}))
		}
	}

	if (!product) return next(new AppError('No product Found', 404));

	res.status(200).render('accessories-page', {

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
	const category = await Category.findById(categoryId);
	const products = await SpecProd.find({ category: categoryId }).populate('category');

	await Promise.all(products.map(async product => {

		if (!product.category.discount) {

			product.discountPrice = await priceAtPurchaseDiscount(product);

		} else product.discountPrice = await categoryDiscountPrice(product);

	}));

	if (!products) return next(new AppError('No Category Found', 404));

	res.status(200).render('category-page', {

		pageTitle: `Category -  | Template Website`,
		pageDescription: `Category Page for your website`,
		canonicalUrl: `${process.env.CANONICAL_URL}category-page`,
		products,
		category
	});
})



//--------------------- Services Page --------------------------//



exports.getServicesPage = (req, res) => {

	res.status(200).render('services', {

		pageTitle: 'Services',
		pageDescription: 'Services Page',
		canonicalUrl: `${process.env.CANONICAL_URL}services`
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

	const populateProducts = async (items) => {

		for (const item of items) {
			let product = await SpecProd.findById(item.product).populate('category');
			let productType = 'barong';

			if (!product) {
				product = await Shoe.findById(item.product).populate('category');
				if (product) productType = 'shoe';
			}

			if (!product) {
				product = await Accessory.findById(item.product).populate('category');
				if (product) productType = 'accessory';
			}

			// Direct property assignment
			item.product = product;
			item.productType = productType;

			// Force Mongoose to recognize the change
			item.markModified('product');
			item.markModified('productType');
		}
	};

	await populateProducts(user.cart);
	await populateProducts(user.wishlist);



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


	for (const order of orders) {

		for (const item of order.product) {

			let productDoc = await SpecProd.findById(item.product);

			if (!productDoc) {
				productDoc = await Shoe.findById(item.product);
			}

			if (!productDoc) {
				productDoc = await Accessory.findById(item.product);
			}

			item.product = productDoc; // Will be null if not found

		}
	}

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

	const getSelectedAddress = (addresses) => {

		return addresses.find(address => address.id === addressId) || 'No Address Found';
	};

	const selectedAddress = getSelectedAddress(user.addresses);

	res.status(200).render('address-form-page', {

		pageTitle: 'Address Form',
		pageDescription: 'Add or update delievry and billing addresses',
		canonicalUrl: `${process.env.CANONICAL_URL}address-form-page`,
		selectedAddress
	})
}



//---------------------- Checkout page ----------------------//


exports.getCheckoutPage = catchAsync(async (req, res, next) => {

	let qty = Number(req.params.qty) || 1;

	const selectedLabel = req.query.label || 'Home';

	const productId = req.params.productId;
	const productVariant = req.params.variant;

	const user = await User.findById(req.user.id);

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
		// Cart checkout
		cart.cart.forEach(item => {
			// Only find variant if product has variants
			if (item.product.variants && item.product.variants.length > 0) {
				variant = item.product.variants.find(v => v._id.toString() === item.variant.toString());
				item.variantDetails = variant;
			} else {
				item.variantDetails = null; // Accessory has no variants
			}
		});

	} else {
		// BuyItNow checkout
		if (product.variants && product.variants.length > 0) {
			variant = product.variants.find(v => v.id === productVariant) || {};

			if (!variant) {
				return next(new AppError('No Variant Found', 404));
			}

			if (variant.inStock < qty) {
				console.log('Stock insufficient, throwing error');
				return next(new AppError(`Not enough ${variant.size} in stock! Only ${variant.inStock} left.`, 400));
			}
		} else {
			variant = null; // Accessory has no variants
		}
	}



	//--------------- --------------------------- ----------------


	/// cart total		

	let totalNet = 0;
	let totalArr = [];
	if (!product) {

		await Promise.all(cart.cart.map(async item => {

			let foundProduct; // Changed from 'product' to 'foundProduct'

			foundProduct = await SpecProd.findById(item.product._id).populate('category');

			if (!foundProduct) {
				foundProduct = await Shoe.findById(item.product._id).populate('category');
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

	const delivery = totalNet < 50 ? 10 : 0;
	const taxes = Math.round(((totalNet + delivery) * 0.1) * 10) / 10;
	const totalGross = (totalNet + delivery) + taxes;

	///  Buy ItNow total	


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
			paypalClientId: `${process.env.PAYPAL_CLIENT_ID}`
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
			paypalClientId: `${process.env.PAYPAL_CLIENT_ID}`
		})
	}
})






exports.getCheckoutPageGuest = catchAsync(async (req, res, next) => {

	let qty = Number(req.params.qty) || 1;

	const productId = req.params.productId;
	const productVariant = req.params.variant;


	//---------- ✅ Multi-model lookup  ------------//


	let product = await SpecProd.findById(productId).populate('category');

	if (!product) {

		product = await Shoe.findById(productId).populate('category');
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

	const delivery = totalNet < 50 ? 10 : 0;
	const taxes = Math.round(((totalNet + delivery) * 0.1) * 10) / 10;
	const totalGross = (totalNet + delivery) + taxes;

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
		paypalClientId: `${process.env.PAYPAL_CLIENT_ID}`
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

	if (!order.user.equals(req.user._id)) {
		return next(new AppError('You do not have permission to view this order', 403));
	}

	for (const item of order.product) {
		let productDoc = await SpecProd.findById(item.product);

		if (!productDoc) {
			productDoc = await Shoe.findById(item.product);
		}

		if (!productDoc) {
			productDoc = await Accessory.findById(item.product);
		}

		item.product = productDoc;
		item.markModified('product');
	}

	const transaction = await Transaction.findById(order.transaction);

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
	const order = await GuestAddress.findOne({ order: orderId }).populate('order');

	const products = order.order.product;

	const transaction = await Transaction.findById(order.transaction)

	res.status(200).render('guest-order-page', {

		pageTitle: 'Order Page',
		pageDescription: 'Successful Payment Page',
		canonicalUrl: `${process.env.CANONICAL_URL}guest-order-page`,
		order,
		products,
		transaction
	})
})







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
		selectedRole: req.query.role || ''
	})
})




exports.getUserPage = catchAsync(async (req, res) => {

	const userPage = await User.findById(req.params.id);

	const wishlistArr = userPage.wishlist.map(item => item.product);
	const products = await SpecProd.find({ _id: wishlistArr });

	const cartArr = userPage.cart.map(item => item.product);
	const cartProducts = await SpecProd.find({ _id: cartArr });

	res.status(200).render('admin/be_user-page', {

		title: `Admin-User`,
		userPage,
		products,
		cartProducts
	})
})



exports.getNewUserPage = catchAsync(async (req, res) => {


	res.status(200).render('admin/be_user-new', {

		title: `Admin-New-User`,

	})
})



exports.getUserSearch = catchAsync(async (req, res) => {

	const userEmail = req.query.userEmailSearch;

	const userSearch = await User.findOne({ email: userEmail }).select('+active');

	res.status(200).render('admin/be_user-search', {

		title: `Admin-User-Results`,
		userSearch

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
			select: 'name'
		})
		.sort({ createdAt: -1 });

	res.status(200).render('admin/be_barongs-list', {
		title: 'Admin-Barong-Products',
		productList
	})
})



exports.getBarong = catchAsync(async (req, res) => {

	const product = await SpecProd.findOne({ slug: req.params.slug }).populate(
		{
			path: 'category',
			select: 'name'
		}
	);

	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');

	res.status(200).render('admin/be_barong', {

		title: `Admin-${product.name}`,
		product,
		categories,
		discounts
	})
})



exports.createBarongPage = catchAsync(async (req, res) => {

	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');

	const product = {};

	res.status(200).render('admin/be_barong-create', {

		title: 'Admin- Create Product',
		product,
		categories,
		discounts
	})
})




exports.getBarongSearch = catchAsync(async (req, res) => {

	const productSku = req.query.productSearch;

	const product = await SpecProd.findOne({ productSku }).populate(
		{
			path: 'category',
			select: 'name'
		});

	const categories = await Category.find().select('name');
	const discounts = await Discount.find().select('code');


	res.status(200).render('admin/be_barong', {

		title: `Admin-Barong`,
		product,
		categories,
		discounts
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



exports.getShoe = catchAsync(async (req, res) => {

	const product = await Shoe.findOne({ slug: req.params.slug }).populate(
		{
			path: 'category',
			select: 'name'
		}
	);

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



exports.getAccessory = catchAsync(async (req, res) => {

	const product = await Accessory.findOne({ slug: req.params.slug }).populate(
		{
			path: 'category',
			select: 'name'
		}
	);

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




exports.getCategoryPage = catchAsync(async (req, res) => {

	const categoryPage = await Category.findById(req.params.id);
	const discounts = await Discount.find().select('code');

	const selectedDiscount = categoryPage.discount
		? categoryPage.discount._id.toString()
		: '';

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

	const formattedAddress = `${shippingAddress.number} ${shippingAddress.street},${shippingAddress.city},${shippingAddress.state},${shippingAddress.postcode}`;
	const renderedAddress = formattedAddress.replaceAll(",", "\n");

	res.status(200).render('admin/be_order-page', {
		title: `Admin-Order`,
		order,
		renderedAddress,
		addressFilter,
		shippingAddress
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

				return next(new AppError('No User or Guest found with that email.'));
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

			return next(new AppError('No orders found for that email.'));
		}
	}

	res.status(200).render('admin/be_order-search', {

		title: `Admin-Order Search`,
		order,
		orders,
	})
})











// exports.getOrderSearch = catchAsync(async (req, res, next) => {

// 	let order, orders, transaction;

// 	if (req.query.orderNumSearch) {

// 		const orderNum = req.query.orderNumSearch;

// 		order = await Order.findOne({ orderNum })
// 			.populate('transaction')
// 			.populate({
// 				path: 'product.product',
// 				select: 'name'
// 			})
// 			.populate('user');

// 		if (!order) {
// 			return next(new AppError('No Order Found with that Order Number', 404))
// 		}
// 	}


// 	if (req.query.emailSearch) {

// 		const orderEmail = req.query.emailSearch;
// 		const user = await User.findOne({ email: orderEmail });

// 		if (!user) {
// 			return next(new AppError('No User Found. Please Try Again', 404))
// 		}

// 		orders = await Order.find({ user: user._id })
// 			.populate('transaction')
// 			.populate({
// 				path: 'product.product',
// 				select: 'name'
// 			})
// 			.populate('user');

// 		if (!orders || orders.length === 0) {

// 			return next(new AppError('Invalid Email! Try Again'))
// 		}
// 	}

// 	res.status(200).render('admin/be_order-search', {

// 		title: `Admin-Order Search`,
// 		order,
// 		orders,
// 	})
// })





/// 	 Transactions Pages	 ///


exports.getTransactionList = catchAsync(async (req, res, next) => {

	const transactions = await Transaction.find();


	res.status(200).render('admin/be_transaction-list', {

		title: `Admin-Transaction list`,
		transactions
	})

})



exports.getTransactionSearch = catchAsync(async (req, res, next) => {

	const orderNum = req.query.transactionSearch;


	const order = await Order.findOne({ orderNum })

	const transaction = await Transaction.findById(order.transaction);


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

	const discount = await Discount.findById(discountId);


	res.status(200).render('admin/be_discount-update-page', {

		title: `Admin-Discount Update`,
		discount,
		startDate: formatDateInput(discount.startDate),
		endDate: formatDateInput(discount.endDate)

	})

})


