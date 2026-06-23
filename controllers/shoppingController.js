const mongoose = require('mongoose');
const User = require('./../models/userModel');

const SpecProd = require('./../models/specProdModel');
const Shoe = require('./../models/shoeModel');
const Accessory = require('../models/accessoryModel');
const Bag = require('../models/bagModel');

const AppError = require('../utilities/appError');
const catchAsync = require('../utilities/catchAsync');






//------------ Add to users cart ------------//



exports.addToCart = catchAsync(async (req, res, next) => {


	//---------------------- Variants -----------------------//


	const { product, variant, quantity } = req.body;

	const user = req.user.id;

	const qtyNum = Number(quantity);


	if (!product || !mongoose.Types.ObjectId.isValid(product)) {
		return next(new AppError('Invalid product', 400));
	}

	if (!Number.isInteger(qtyNum) || qtyNum < 1) {
		return next(new AppError('Quantity must be at least 1', 400));
	}


	const userCart = await User.findById(user).select('cart');

	if (!userCart) return next(new AppError('User not found', 404));


	/// duplicate check


	const requestedVariant = variant && variant !== 'null' && variant !== 'undefined'
		? variant.toString()
		: null;

	const duplicate = userCart.cart.some(

		item => item.product.toString() === product.toString() &&
			(item.variant ? item.variant.toString() : null) === requestedVariant
	);

	let foundProduct = await SpecProd.findById(product);

	let productModel = 'SpecProd';

	if (!foundProduct) {

		foundProduct = await Shoe.findById(product);

		if (foundProduct) productModel = 'Shoe';
	}

	if (!foundProduct) {

		foundProduct = await Bag.findById(product);

		if (foundProduct) productModel = 'Bag';
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

		if (selectedVariant.inStock < qtyNum) {

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
					cart: {
						product,
						productModel,
						variant: selectedVariant ? selectedVariant._id : null,
						quantity: qtyNum
					}
				}
			},
			{ new: true, runValidators: true }
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

	const qtyNum = Number(quantity);


	if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
		return next(new AppError('Invalid cart item', 400));
	}

	if (!Number.isInteger(qtyNum) || qtyNum < 1) {
		return next(new AppError('Quantity must be at least 1', 400));
	}


	const userCart = await User.findById(userId).select('cart');

	if (!userCart) return next(new AppError('User not found', 404));

	const cartItem = userCart.cart.id(cartItemId);

	if (!cartItem) return next(new AppError('Cart item not found', 404));


	let foundProduct;


	if (cartItem.productModel === 'SpecProd') foundProduct = await SpecProd.findById(cartItem.product);

	if (cartItem.productModel === 'Shoe') foundProduct = await Shoe.findById(cartItem.product);

	if (cartItem.productModel === 'Bag') foundProduct = await Bag.findById(cartItem.product);

	if (cartItem.productModel === 'Accessory') foundProduct = await Accessory.findById(cartItem.product);


	if (!foundProduct) return next(new AppError('Product not found', 404));


	if (foundProduct.variants && foundProduct.variants.length > 0) {

		if (!cartItem.variant) return next(new AppError('Cart item variant is missing', 400));

		const selectedVariant = foundProduct.variants.id(cartItem.variant);

		if (!selectedVariant) return next(new AppError('Variant not found in product', 404));

		if (selectedVariant.inStock < qtyNum) {
			return next(new AppError(`Not enough ${selectedVariant.size} in stock! Only ${selectedVariant.inStock} left.`, 400));
		}
	}


	const user = await User.findOneAndUpdate(

		{ _id: userId, 'cart._id': cartItemId },
		{
			$set: { 'cart.$.quantity': qtyNum }
		},
		{ new: true, runValidators: true }
	);

	if (!user) return next(new AppError('Cart item not found', 404));

	res.status(200).json({
		status: 'success',
		cart: user.cart
	});
});



//---------- Delete from users cart ------------//


exports.deleteCartItem = catchAsync(async (req, res, next) => {

	const user = req.user.id;

	const removeItem = req.params.cartId;

	if (!removeItem || !mongoose.Types.ObjectId.isValid(removeItem)) {
		return next(new AppError('Invalid cart item', 400));
	}


	const userCart = await User.findById(user).select('cart');

	if (!userCart) return next(new AppError('No Cart Found', 404))


	const cartItem = userCart.cart.find(item => item._id.toString() === removeItem);

	if (!cartItem) return next(new AppError('Cart item not found', 404));

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

	res.status(200).json({

		status: 'success',
	})
})




//------------ Add to wishlist --------------//


exports.addToWishlist = catchAsync(async (req, res, next) => {

	const user = req.user.id;

	const { product, variant } = req.body;


	if (!product || !mongoose.Types.ObjectId.isValid(product)) {

		return next(new AppError('Invalid product', 400));
	}


	const userWishlist = await User.findById(user).select('wishlist');

	if (!userWishlist) return next(new AppError('User not found', 404));


	let foundProduct = await SpecProd.findById(product);
	let productModel = 'SpecProd';

	if (!foundProduct) {
		foundProduct = await Shoe.findById(product);
		if (foundProduct) productModel = 'Shoe';
	}

	if (!foundProduct) {
		foundProduct = await Bag.findById(product);
		if (foundProduct) productModel = 'Bag';
	}

	if (!foundProduct) {
		foundProduct = await Accessory.findById(product);
		if (foundProduct) productModel = 'Accessory';
	}

	if (!foundProduct) return next(new AppError('Product not found', 404));


	let selectedVariant = null;

	if (foundProduct.variants && foundProduct.variants.length > 0) {

		if (!variant || variant === 'null' || variant === 'undefined') {
			return next(new AppError('Please select a size', 400));
		}

		selectedVariant = foundProduct.variants.id(variant);

		if (!selectedVariant) return next(new AppError('Variant not found in product', 404));
	}


	const requestedVariant = selectedVariant ? selectedVariant._id.toString() : null;

	const duplicate = userWishlist.wishlist.some(

		item => item.product.toString() === product.toString() &&
			(item.variant ? item.variant.toString() : null) === requestedVariant
	);


	let addWishlist;

	if (userWishlist.wishlist.length >= 10 || duplicate) {

		return next(new AppError('Cannot add this item to wishlist', 400));

	} else addWishlist = await User.findByIdAndUpdate(

		user,
		{
			$push: {
				wishlist: {
					product,
					productModel,
					variant: selectedVariant ? selectedVariant._id : null
				}
			}
		},
		{
			new: true,
			select: 'wishlist',
			runValidators: true
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

	const user = req.user.id;

	const removeItem = req.params.wishlistId;

	if (!removeItem || !mongoose.Types.ObjectId.isValid(removeItem)) {
		return next(new AppError('Invalid wishlist item', 400));
	}


	const userWishlist = await User.findById(user).select('wishlist');

	if (!userWishlist) return next(new AppError('No Cart Found', 404))


	const wishlistItem = userWishlist.wishlist.find(item => item._id.toString() === removeItem);

	if (!wishlistItem) return next(new AppError('Wishlist item not found', 404));

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

	res.status(200).json({

		status: 'success',
	})
})
