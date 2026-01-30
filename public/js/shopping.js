import axios from 'axios';

import { showAlert } from './alert';

import { buyCart, buyItNow, buyItNowGuest } from './stripe';



//---------- Buy It Now - to checkout -----------//



export const buyItNowCheckout = async (productId, qty, selectedVariant) => {

	try {
		await axios({

			method: 'GET',
			url: `/checkout-page/buy-it-now/${productId}/${qty}/${selectedVariant}`
		})

		window.setTimeout(() => {

			location.assign(`/checkout-page/buy-it-now/${productId}/${qty}/${selectedVariant}`);

		}, 2500);

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}


/// guest

export const buyItNowGuestCheckout = async (productId, qty, selectedVariant) => {

	try {
		await axios({

			method: 'GET',
			url: `/checkout-page/buy-it-now-guest/${productId}/${qty}/${selectedVariant}`
		})

		window.setTimeout(() => {

			location.assign(`/checkout-page/buy-it-now-guest/${productId}/${qty}/${selectedVariant}`)

		}, 2500);

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}







//------ Save Address from user checkout / Call Payment Functions -------//


export const saveAddressCheckoutGuest = async (data, product, qty, variant) => {

	try {

		const result = await axios({

			method: 'POST',
			url: '/api/v1/orders/add-address-checkout-guest',
			data
		})

		if (result.data.status === 'success') {

			const msg = result.data.message;

			if (msg === 'Guest address saved') {

				showAlert('success', 'Address added successfully!');

				const purchaseCart = document.getElementById('checkout-submit--stripe-guest');

				const guestAddressId = result.data.guestAddressId;

				purchaseCart.textContent = "Processing....";

				buyItNowGuest(product, qty, guestAddressId, variant);

			} else {

				console.log('No address saved');
			}
		}

	} catch (err) {

		const msg = err.response && err.response.data && err.response.data.message
			? err.response.data.message
			: 'An error occurred. Please try again.';

		showAlert('error', msg);
	}
}



export const saveAddressCheckout = async (data, product, qty, variant) => {

	try {

		const result = await axios({

			method: 'POST',
			url: '/api/v1/orders/add-address-checkout',
			data
		})

		if (result.data.status === 'success') {

			const msg = result.data.message;

			if (msg === 'Duplicate address') {

				console.log('No new address added (duplicate).');

			} else {

				showAlert('success', 'Address added successfully!');
			}



			/// call buyCart or BuyitNow functions

			if (!product || !variant) {

				const purchaseCart = document.getElementById('checkout-submit--stripe');

				purchaseCart.textContent = "Processing....";

				buyCart();

			} else {

				const purchaseCart = document.getElementById('checkout-submit--stripe');

				purchaseCart.textContent = "Processing....";

				buyItNow(product, qty, variant);


			}
		}
	} catch (err) {

		showAlert('error', err);
	}
}





//---------- Add product - user cart -----------//


export const addProductToUser = async (id, selectedVariant, slug, type, quantity = 1) => {

	const url = type === 'cart' ? `/api/v1/products/${id}/shopping/cart` : `/api/v1/products/${id}/shopping/wishlist`

	try {

		const result = await axios({

			method: "PATCH",
			url,
			data: {
				variant: selectedVariant,
				quantity
			}
		})

		if (result.data.status === 'success') {

			showAlert('success', `Product Added to ${type} successfully!!`);

			window.setTimeout(() => {

				location.assign(`/product/${slug}`);

			}, 2500);
		}
	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}





//---------- Remove product - user cart -----------//


export const removeProductFromCart = async (removeItem, user) => {

	try {

		const result = await axios({

			method: "DELETE",
			url: `/api/v1/shopping/cart/${removeItem}`


		})

		if (result.data.status === 'success') {

			showAlert('success', 'Product Deleted from Cart successfully!!');

			window.setTimeout(() => {

				location.assign(`/my-account/${user}?show=my-account-cart`);

			}, 2500);

		}
	} catch (err) {

		showAlert('error', err);
	}
}



//---------- Remove product - user wishlist -----------//


export const removeProductFromWishlist = async (removeItem, user) => {

	try {

		const result = await axios({

			method: "DELETE",
			url: `/api/v1/shopping/wishlist/${removeItem}`


		})

		if (result.data.status === 'success') {

			showAlert('success', 'Product Deleted from wishlist successfully!!');

			window.setTimeout(() => {

				location.assign(`/my-account/${user}?show=my-account-wishlist`);

			}, 2500);

		}
	} catch (err) {

		showAlert('error', err);
	}
}




//------------------ Update cart Qty -------------------//


export const updateCart = async (cartId, quantity, user) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/shopping/cart/${cartId}/update-cart-qty`,
			data: { quantity }

		});

		if (result.data.status === 'success') {

			showAlert('success', 'Quantity Changed successfully!!');

			window.setTimeout(() => {

				location.assign(`/my-account/${user}?show=my-account-cart`);

			}, 2500);
		}

	} catch (err) {

		console.error(err);

		showAlert('error', err.response?.data?.message || 'Something went wrong');
	}
}


