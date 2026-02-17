
const User = require('./../models/userModel');
const SpecProd = require('./../models/specProdModel');
const Shoe = require('./../models/shoeModel');
const Accessory = require('../models/accessoryModel');

const factory = require('./../controllers/handlerFactory')

const AppError = require('../utilities/appError');
const catchAsync = require('../utilities/catchAsync');
const filterObj = require('../utilities/filterObject');





//------------ Add to users cart ------------//



exports.addToCart = catchAsync(async (req, res, next) => {

	//---------------------- Variants -----------------------//

	const { user, product, variant, quantity } = req.body;

	const userCart = await User.findById(user).select('cart');

	const duplicate = userCart.cart.some(
		item => item.product.toString() === product.toString() &&
			item.variant?.toString() === variant.toString()
	);

	if (!user || !product || !quantity || quantity < 1) {
		return next(new AppError('No product, user or variant! Please try again', 404));
	}


	let foundProduct = await SpecProd.findById(product);

	let productModel = 'SpecProd';

	if (!foundProduct) {

		foundProduct = await Shoe.findById(product);

		if (foundProduct) productModel = 'Shoe';
	}

	if (!foundProduct) {

		foundProduct = await Accessory.findById(product);

		if (foundProduct) productModel = 'Accessory';
	}

	if (!foundProduct) {
		return next(new AppError('Product not found', 404));
	}


	let selectedVariant = null;

	if (foundProduct.variants && foundProduct.variants.length > 0) {

		// Product HAS variants (SpecProd, Shoe)

		if (!variant || variant === 'null' || variant === 'undefined') {

			return next(new AppError('Please select a size', 400));
		}

		// ✅ variants exists, safe to call .id()

		selectedVariant = foundProduct.variants.id(variant);

		if (!selectedVariant) {

			return next(new AppError('Variant not found in product', 404));
		}

		if (selectedVariant.inStock < quantity) {

			return next(new AppError(`Not enough ${selectedVariant.size} in stock! Only ${selectedVariant.inStock} left.`, 400));
		}
	}



	//---------------------- ------- -----------------------//

	let addCart;

	if (userCart.cart.length >= 10 || duplicate) {
		return next(new AppError('Cannot add this item to cart', 400));
	} else {
		addCart = await User.findByIdAndUpdate(
			user,
			{
				$push: {
					cart: { product, productModel, variant, quantity } // Add productModel here
				}
			},
			{ new: true }
		);
	}

	res.status(200).json({
		status: 'success',
		cart: addCart
	});
});





//---------- Update quantity users cart ------------//

exports.updateCartQuantity = catchAsync(async (req, res, next) => {

	const userId = req.user.id;

	const cartItemId = req.params.cartId;

	const { quantity } = req.body;


	if (!quantity || quantity < 1) return next(new AppError('Quantity must be at least 1', 400));


	const user = await User.findOneAndUpdate(

		{ _id: userId, 'cart._id': cartItemId },
		{
			$set: { 'cart.$.quantity': quantity }
		},
		{ new: true }
	);

	if (!user) return next(new AppError('Cart item not found', 404));

	res.status(200).json({
		status: 'success',
		cart: user.cart
	});
});









//---------- Delete from users cart ------------//


exports.deleteCartItem = catchAsync(async (req, res, next) => {

	const user = req.body.user;

	const removeItem = req.params.cartId;

	if (!removeItem) return next(new AppError('No Item to remove', 404))


	const userCart = await User.findById(user).select('cart');

	if (!userCart) return next(new AppError('No Cart Found', 404))

	if (userCart) {

		await User.findByIdAndUpdate(user,
			{
				$pull:
				{
					cart:
						{ _id: removeItem }
				}
			},
			{ new: true }
		)
	}
	res.status(200).json({

		status: 'success',
	})
})




//------------ Add to wishlist --------------//


exports.addToWishlist = catchAsync(async (req, res, next) => {

	const { user, product, variant } = req.body;

	const userWishlist = await User.findById(user).select('wishlist');


	const duplicate = userWishlist.wishlist.some(

		item => item.product.toString() === product.toString() &&
			item.variant?.toString() === variant.toString()
	);

	if (!user || !product) return next(new AppError('No product or user Please try again', 404));


	let addWishlist;

	if (userWishlist.wishlist.length >= 10 || duplicate) {

		return next(new AppError('Cannot add this item to cart', 400));

	} else addWishlist = await User.findByIdAndUpdate(

		user,
		{
			$push: {
				wishlist: { product, variant }
			}
		},
		{
			new: true,
			select: 'wishlist'
		}
	)

	res.status(200).json({
		status: 'success',
		data: {
			wishlist: addWishlist.wishlist
		}
	})

})



exports.deleteWishlistItem = catchAsync(async (req, res, next) => {

	const user = req.body.user;

	const removeItem = req.params.wishlistId;

	if (!removeItem) return next(new AppError('No Item to remove', 404))


	const userWishlist = await User.findById(user).select('wishlist');

	if (!userWishlist) return next(new AppError('No Cart Found', 404))

	if (userWishlist) {

		await User.findByIdAndUpdate(user,
			{
				$pull:
				{
					wishlist:
						{ _id: removeItem }
				}
			},
			{ new: true }
		)
	}
	res.status(200).json({

		status: 'success',
	})
})
