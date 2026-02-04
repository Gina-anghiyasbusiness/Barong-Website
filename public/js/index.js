import '@babel/polyfill';

import { createReview } from './reviews';

import { showAlert } from './alert';

import { login, logout, signUpUser, resetEmailPasswordUser, setNewPasswordUser } from "./login";

import { updateOrders } from './backEndOrders';

import { createDiscountDB, updateDiscountDB } from './discount';

import { updateProductDB, createProductDB, discontinueProduct } from './barongs';
import { createShoesDB, updateShoeDB, discontinueShoes } from './shoes';
import { createAccessoriesDB, updateAccessoriesDB, discontinueAccs } from './accessories';

import { createCategoryDB, updateCategoryDB, deactivateCategoryDB } from './category';

import { userUpdateSettings, userUpdateAddress, userNewAddress, userdeleteAddress } from './frontEndUsers';

import { updateUserDB, createUserDB, deactivateUserDB, updateSettings, updateUserAddressDB } from './users';

import { addProductToUser, removeProductFromCart, removeProductFromWishlist, updateCart, saveAddressCheckout, saveAddressCheckoutGuest, buyItNowCheckout, buyItNowGuestCheckout } from './shopping';



//------- Lucide Icons on all pages --------//

/// icons from lucide npm package

import { createIcons, icons } from 'lucide';


document.addEventListener('DOMContentLoaded', () => {

	createIcons({ icons });
});




//----------------------------- FrontEnd -------------------------------//


/// 				FRONTEND Selectors 				///


/// Login / logout / signup / reset password


const loginBtn = document.querySelector('.login__form');
const logoutBtn = document.querySelector('.logout--btn');
const signupForm = document.querySelector('.signup__form');

const resetPasswordForm = document.getElementById('reset-password-form');
const setNewPasswordForm = document.getElementById('set-new-password-form');

const logoutAccountBtn = document.getElementById('my-account-logout');




//--------------------------- Functionality -----------------------------//



///-------------------- User Login / logout / Signup --------------///



if (loginBtn) {

	loginBtn.addEventListener('submit', e => {

		e.preventDefault();

		const email = document.getElementById('login-email').value;
		const password = document.getElementById('login-password').value;

		login(email, password);
	})
}



if (logoutBtn) {

	logoutBtn.addEventListener('click', e => {

		e.preventDefault();

		logout();
	})
}



if (logoutAccountBtn) {

	logoutAccountBtn.addEventListener('click', e => {

		e.preventDefault();

		logout();
	})
}




if (signupForm) {

	signupForm.addEventListener('submit', e => {

		e.preventDefault();

		const data = {

			name: document.getElementById('signup-name').value,
			email: document.getElementById('signup-email').value,
			password: document.getElementById('signup-password').value,
			passwordConfirm: document.getElementById('signup-passwordConfirm').value,
			phone: document.getElementById('signup-phone').value
		}

		signUpUser(data);
	})
}


///--------------	 Reset Password via email	 --------------///


if (resetPasswordForm) {

	resetPasswordForm.addEventListener('submit', e => {

		e.preventDefault();

		const email = document.getElementById('reset-password-email').value;

		resetEmailPasswordUser(email);
	})
}




if (setNewPasswordForm) {

	setNewPasswordForm.addEventListener('submit', e => {

		e.preventDefault();

		const data = {

			password: document.getElementById('set-new-password').value,
			passwordConfirm: document.getElementById('confirm-new-password-email').value
		}

		const token = window.location.pathname.split('/')[2];

		setNewPasswordUser(data, token)
	})
}






///--------- User Account - profile / orders / wishlist/ addresses ----------///


const myAccountMenu = document.getElementById('my-account-nav');


const overview = document.querySelector('.myAccount__main--overview');
const addresses = document.querySelector('.myAccount__main--addresses');
const orders = document.querySelector('.myAccount__main--orders');
const wishlist = document.querySelector('.myAccount__main--wishlist');
const cart = document.querySelector('.myAccount__main--cart');
const reviews = document.querySelector('.myAccount__main--reviews');
const support = document.querySelector('.myAccount__main--support');




/// 						Bubbling for Accounts Page						 ///


if (myAccountMenu) {

	myAccountMenu.addEventListener('click', function (e) {

		e.preventDefault();

		const pageSections = [overview, addresses, orders, wishlist, cart, reviews, support];


		function activateSection(activeSection) {

			pageSections.forEach(section => {

				if (section === activeSection) {

					section.classList.add('content-active');
					section.classList.remove('content-hidden');

				} else {

					section.classList.remove('content-active');
					section.classList.add('content-hidden');
				}
			})
		}

		if (e.target.classList.contains('account-overview--btn')) {

			activateSection(overview);
		}

		if (e.target.classList.contains('account-address--btn')) {

			activateSection(addresses);
		}

		if (e.target.classList.contains('account-orders--btn')) {

			activateSection(orders);
		}

		if (e.target.classList.contains('account-wishlist--btn')) {

			enableRemoveFromWishlist();

			activateSection(wishlist);
		}

		if (e.target.classList.contains('account-cart--btn')) {

			enableRemoveFromCart();

			activateSection(cart);
		}

		if (e.target.classList.contains('account-reviews--btn')) {

			activateSection(reviews);
		}

		if (e.target.classList.contains('account-support--btn')) {

			activateSection(support);
		}
	})
}



///--- Logged In User Updates --- //


const userUpdateForm = document.getElementById('main-profile-form');

const passwordUpdateForm = document.getElementById('main-password-form');



/// update logged in user data


if (userUpdateForm) {

	userUpdateForm.addEventListener('submit', event => {

		event.preventDefault();

		const userId = userUpdateForm.dataset.user;

		const form = {

			email: document.getElementById('user-update-email').value,
			phone: document.getElementById('user-update-phone').value
		}

		userUpdateSettings(form, 'data', userId);
	})
}




/// update logged in current user password


if (passwordUpdateForm) {

	passwordUpdateForm.addEventListener('submit', event => {

		event.preventDefault();

		const userId = passwordUpdateForm.dataset.user;

		const form = {

			passwordCurrent: document.getElementById('password-current').value,
			password: document.getElementById('password').value,
			passwordConfirm: document.getElementById('password-confirm').value

		}

		userUpdateSettings(form, 'password', userId);
	})
}



/// update logged in current address selected


const updateAddressForm = document.querySelector('.user__address--update');


if (updateAddressForm) {

	const addressId = updateAddressForm.dataset.addressId;
	const userId = updateAddressForm.dataset.user;

	updateAddressForm.addEventListener('submit', (e) => {

		e.preventDefault();

		const isDefaultValue = document.querySelector('input[name="isDefault"]:checked')?.value;

		const isDefault = isDefaultValue === 'true'; // ✅ now a real Boolean


		const form = {
			type: document.getElementById('type').value,
			number: document.getElementById('number').value,
			street: document.getElementById('street').value,
			city: document.getElementById('city').value,
			state: document.getElementById('state').value,
			postcode: document.getElementById('postcode').value,
			isDefault
		};

		if (addressId) {

			userUpdateAddress(form, addressId, userId);

		} else {

			userNewAddress(form, userId);
		}
	});
}




/// select address based on type at checkout	///


document.addEventListener('DOMContentLoaded', () => {

	const addressType = document.getElementById('address-label');

	if (addressType) {

		addressType.addEventListener('change', () => {

			const product = addressType.dataset.product;
			const qty = addressType.dataset.qty;
			const variant = addressType.dataset.variant;

			const selectedLabel = addressType.value;

			if (!product) {

				window.location.href = `/checkout-page?label=${selectedLabel}`;

			} else {

				const productObj = JSON.parse(product);
				const variantObj = JSON.parse(variant);

				window.location.href = `/checkout-page/buy-it-now/${productObj.id}/${qty}/${variantObj.id}?label=${selectedLabel}`;

			}
		});
	}
});



/// delete an address


const deleteAddressBtns = document.querySelectorAll('.remove-address-btns');

deleteAddressBtns.forEach(btn => btn.addEventListener('click', e => {

	e.preventDefault();

	const addressId = btn.dataset.address;
	const userId = btn.dataset.user;

	if (confirm('Are you sure you want to remove this address?')) {

		userdeleteAddress(addressId, userId);
	}

}));



///								Reviews								///


///			submit review form			///


const reviewForm = document.getElementById('submit-review-form');

if (reviewForm) {

	reviewForm.addEventListener('submit', (e) => {

		e.preventDefault();

		const productId = reviewForm.dataset.productId;
		const slug = reviewForm.dataset.slug;

		const form = {

			rating: document.getElementById('review-rating').value,
			comment: document.getElementById('review-comment').value
		}

		createReview(form, productId, slug);
	})
}


/// 	Review dropdown 	///


const reviewBtn = document.getElementById('product-review-btn');
const reviewBox = document.querySelector('.productPage__reviews--bottom-box');
const cancelBtn = document.getElementById('review-cancel-btn');


if (reviewBtn && reviewBox) {

	reviewBtn.addEventListener('click', e => {

		e.preventDefault();

		reviewBox.classList.remove('content-hidden');
		reviewBox.classList.add('content-active');

	});
}

if (cancelBtn && reviewBox) {

	cancelBtn.addEventListener('click', e => {

		e.preventDefault();

		reviewBox.classList.remove('content-active');
		reviewBox.classList.add('content-hidden');

	});
}




////------------ Reusable Product	Variants Function- ALL 	-----------////


let selectedVariant = null;

document.querySelectorAll('.product__size--btn')

	.forEach(btn => {

		btn.addEventListener('click', () => {

			document.querySelectorAll('.product__size--btn').forEach(

				b => b.classList.remove('selected'));

			btn.classList.add('selected');

			selectedVariant = btn.dataset.variant;
		})
	})


////------------------------- ---------------- ----------------------////


///								Buy It Now								///


///		Buy It Now - Single product Page	///


const buyItNowBtnId = document.getElementById('buy-it-now');


if (buyItNowBtnId) {

	buyItNowBtnId.addEventListener('click', async e => {

		e.preventDefault();

		const productId = buyItNowBtnId.dataset.productId;
		const qty = parseInt(document.getElementById('add-to-cart-qty').value) || 1;

		const userAddress = buyItNowBtnId.dataset.userObject;
		const userArray = JSON.parse(userAddress);

		if (!selectedVariant || !qty || userArray.length < 1 || !productId) {

			return showAlert('error', 'Please select a size or add an address first');
		}

		buyItNowCheckout(productId, qty, selectedVariant);
	})
}



///		Guest


const buyItNowBtnGuest = document.getElementById('buy-it-now-guest');

if (buyItNowBtnGuest) {

	buyItNowBtnGuest.addEventListener('click', async e => {

		e.preventDefault();

		const productId = buyItNowBtnGuest.dataset.productId;
		const qty = 1;


		if (!selectedVariant || !qty || !productId) {

			return showAlert('error', 'Please add an address first');
		}

		buyItNowGuestCheckout(productId, qty, selectedVariant);

	})
}





///		Buy It Now - Wishlist page	///



const buyItNowBtn = document.querySelectorAll('.wishlist-btn--bin');

if (buyItNowBtn) {

	buyItNowBtn.forEach(btn => {

		btn.addEventListener('click', async e => {

			e.preventDefault();

			const productId = btn.dataset.productId;

			const qtyInput = btn.closest('.myAccount__cart--item').querySelector('.add-to-cart-qty');
			const qty = parseInt(qtyInput?.value) || 1;

			const userAddress = btn.dataset.userObject;
			const userArray = JSON.parse(userAddress);

			if (!selectedVariant || !qty || userArray.length < 1 || !productId) {

				return showAlert('error', 'Please select a size or add an address first');
			}


			buyItNowCheckout(productId, qty, selectedVariant);
		})
	})
}



///				Add To Cart - Single product Page			///


const addToCartBtnId = document.getElementById('add-to-cart');

if (addToCartBtnId) {

	addToCartBtnId.addEventListener('click', function (e) {

		e.preventDefault();

		const id = addToCartBtnId.dataset.productId;
		const slug = addToCartBtnId.dataset.productSlug;

		const qty = parseInt(document.getElementById('add-to-cart-qty').value) || 1;


		////----- 	Variants ------////

		if (!selectedVariant) {

			showAlert('error', 'Please select a size first');
			return;
		}

		addProductToUser(id, selectedVariant, slug, 'cart', qty);

		////-------- ------- -------////
	})
}




///				Add To Cart - Wishlist Page			///


const addToCartBtn = document.querySelectorAll('.wishlist-btn--atc');


if (addToCartBtn) {

	addToCartBtn.forEach(btn =>

		btn.addEventListener('click', function (e) {

			e.preventDefault();

			const id = btn.dataset.productId;
			const slug = btn.dataset.productSlug;

			// const qty = parseInt(document.getElementById('add-to-cart-qty').value) || 1;

			/// This will get the quantity input for THIS product only

			const qtyInput = btn.closest('.myAccount__cart--item').querySelector('.add-to-cart-qty');

			const qty = parseInt(qtyInput?.value) || 1;


			////----- 	Variants ------////

			if (!selectedVariant) {

				showAlert('error', 'Please select a size first');
				return;
			}

			addProductToUser(id, selectedVariant, slug, 'cart', qty);

			////-------- ------- -------////
		})
	)
}




///			Update Cart	Quantity	///


document.querySelectorAll('.update-cart-quantity').forEach(form => {

	form.addEventListener('submit', async function (e) {

		e.preventDefault();

		const cartId = this.dataset.cartId;
		const user = this.dataset.user;

		const quantity = parseInt(this.querySelector('input[name="quantity"]').value);

		if (!cartId || !quantity || quantity < 1) {

			showAlert('error', 'Invalid quantity');

			return;
		}

		updateCart(cartId, quantity, user);
	});
});



///			Remove From Cart	(function for button usage)		///


function enableRemoveFromCart() {

	document.querySelectorAll('.remove-cart--item').forEach(btn => {

		btn.addEventListener('click', () => {

			const removeItem = btn.dataset.remove;
			const user = btn.dataset.user;

			if (confirm('Are you sure you want to remove this Product from cart?')) {

				removeProductFromCart(removeItem, user);

			}
		});
	});
}


///					 	Add To Wishlist			 			///


const addToWishlistBtn = document.getElementById('add-to-wishlist');

if (addToWishlistBtn) {

	addToWishlistBtn.addEventListener('click', (e) => {

		e.preventDefault();

		const id = addToWishlistBtn.dataset.productId;
		const slug = addToWishlistBtn.dataset.productSlug;



		////----- 	Variants ------////

		if (!selectedVariant) {

			showAlert('error', 'Please select a size first');

			return;
		}

		addProductToUser(id, selectedVariant, slug, 'wishlist');

		////-------- ------- -------////
	})
}





///					Remove from Wishlist					///



function enableRemoveFromWishlist() {

	document.querySelectorAll('.remove-wishlist--item').forEach(btn => {

		btn.addEventListener('click', () => {

			const removeItem = btn.dataset.remove;
			const user = btn.dataset.user;

			if (confirm('Are you sure you want to remove this Product from wishlist?')) {

				removeProductFromWishlist(removeItem, user);

			}
		});
	});
}




/// 					Place order					///



const addressForm = document.getElementById('checkout__form--address');


if (addressForm) {

	addressForm.addEventListener('submit', async (e) => {

		e.preventDefault();


		const product = addressForm.dataset.product || '';
		const variant = addressForm.dataset.variant || '';
		const qty = addressForm.dataset.qty || '';


		const data = {

			label: document.getElementById('address-label').value,
			number: document.getElementById('address-number').value,
			street: document.getElementById('address-street').value,
			city: document.getElementById('address-city').value,
			state: document.getElementById('address-state').value,
			postcode: document.getElementById('address-postcode').value

		}

		await saveAddressCheckout(data, product, qty, variant);

	})
}




const addressFormGuest = document.getElementById('checkout__form--address-guest');

if (addressFormGuest) {

	addressFormGuest.addEventListener('submit', async (e) => {

		e.preventDefault();

		const product = addressFormGuest.dataset.product || '';
		const variant = addressFormGuest.dataset.variant || '';
		const qty = addressFormGuest.dataset.qty || '';

		const data = {

			email: document.getElementById('address-email').value,
			name: document.getElementById('address-name').value,
			number: document.getElementById('address-number').value,
			street: document.getElementById('address-street').value,
			city: document.getElementById('address-city').value,
			state: document.getElementById('address-state').value,
			postcode: document.getElementById('address-postcode').value
		}

		await saveAddressCheckoutGuest(data, product, qty, variant);

	})
}








//------------------------ EXTRA FUNCTIONALITY	------------------------------//



/// 							Find page section using a URL parameter						 	///


document.addEventListener('DOMContentLoaded', () => {


	/// get the parameters from the url (?show=a-value)

	const params = new URLSearchParams(window.location.search);


	/// get the value of the 'show=' parameter (a-value)

	const show = params.get('show');


	if (show) {

		/// check for a button that has the id of 'a-value'

		const button = document.getElementById(show);


		/// if there is a button with that value - click it!

		if (button) button.click();

		/// call the button function for the conditional page selected

		setTimeout(() => {

			if (show === 'my-account-cart') {

				enableRemoveFromCart();

			} else if (show === 'my-account-wishlist') {

				enableRemoveFromWishlist();

			}
		}, 50);
	}
});





/// 			Filter and Sorting Product List				 	///



///			 Sorting		///


/// select user role






document.addEventListener('DOMContentLoaded', () => {

	const sortOption = document.getElementById('productSort');
	const sortForm = document.getElementById('form-product-sort');



	if (sortOption) sortOption.addEventListener('change', () => {


		sortForm.submit();
	});
});




///			 Filter			///


// const filterForm = document.getElementById('form-product-filter');


// if (filterForm) {

// 	filterForm.addEventListener('submit', e => {


// 		e.preventDefault();

// 		const productSize = document.getElementById('productSize').value;

// 		console.log(productSize);



// 	})
// }



///			 Size guide button			///



const sizeGuideBtn = document.querySelector('.size-guide--btn');
const sizeGuideBox = document.querySelector('.productPage__variant-size-guide--box')


if (sizeGuideBtn) {

	sizeGuideBtn.addEventListener('click', function (e) {

		e.preventDefault();

		if (sizeGuideBox) {

			sizeGuideBox.classList.toggle('size_guide--active')
		}
		else { return }
	})
}





///------------------------------- ------- -------------------------------///
///------------------------------- BACKEND -------------------------------///
///------------------------------- ------- -------------------------------///


/// 				BACKEND STUFF				 ///


/// Users     

const createUser = document.querySelector('.user__form--create');
const updateUser = document.querySelector('.user__form--update');

const deactivateUser = document.getElementById('deactivateUser');



/// Products  

const productForm = document.querySelector('.product__form');
const productFormCreate = document.querySelector('.product__form--create');
const discontinueBtn = document.getElementById('discontinue-btn');


/// Shoes  

const shoeFormCreate = document.querySelector('.shoe__form--create');





/// Accessories  







/// Update User Data

const updateDataForm = document.querySelector('.user__form--data');
const updatePasswordForm = document.querySelector('.user__form--password');



/// Categories   

const createCategory = document.querySelector('.category__form--create');
const updateCategory = document.querySelector('.category__form--update');
const deactivateCategory = document.getElementById('deactivateCategory');




///------------------- Users --------------------///



/// select user role


document.addEventListener('DOMContentLoaded', () => {

	const roleSelect = document.getElementById('roleSelected');
	const roleForm = document.getElementById('selectRole');

	/// if role select changes 

	if (roleSelect) roleSelect.addEventListener('change', () => {

		/// resubmit form

		roleForm.submit();
	});
});






/// Create user


if (createUser) {

	createUser.addEventListener('submit', e => {

		e.preventDefault();

		const data = {

			name: document.getElementById('name').value,
			email: document.getElementById('email').value,
			phone: document.getElementById('phone').value,
			password: document.getElementById('password').value,
			passwordConfirm: document.getElementById('password_confirm').value,
			role: document.getElementById('role').value
		}
		createUserDB(data);
	})
}



/// Update user


if (updateUser) {

	updateUser.addEventListener('submit', e => {

		e.preventDefault();

		const id = updateUser.dataset.id;

		const data = {

			name: document.getElementById('name').value,
			email: document.getElementById('email').value,
			phone: document.getElementById('phone').value,
			role: document.getElementById('role').value,


		}


		updateUserDB(data, id);

	})
}





/// Address form


const updateUserAddress = document.querySelectorAll('.address__form--update');

updateUserAddress.forEach(btn => {

	btn.addEventListener('submit', e => {


		e.preventDefault();

		const form = e.target;
		const addressId = form.dataset.addressId;
		const userId = form.dataset.id;

		const data = {

			label: form.querySelector('.label').value,
			number: form.querySelector('.number').value,
			street: form.querySelector('.street').value,
			city: form.querySelector('.city').value,
			state: form.querySelector('.state').value,
			postcode: form.querySelector('.postcode').value,
			isDefault: form.querySelector('.default').value,

		}

		updateUserAddressDB(data, addressId, userId);
	})

})



/// Cart form





/// Deactivate User


if (deactivateUser) {

	deactivateUser.addEventListener('click', e => {

		e.preventDefault();

		const userId = e.currentTarget.dataset.userId;

		deactivateUserDB(userId);
	})
}


///--- Logged In User admin


/// update logged in user data


if (updateDataForm) {

	updateDataForm.addEventListener('submit', event => {

		event.preventDefault();

		const form = {

			name: document.getElementById('user__form--name').value,
			email: document.getElementById('user__form--email').value,
			phone: document.getElementById('user__form--phone').value

		}
		updateSettings(form, 'data');
	})
}



/// update  logged in current user password


if (updatePasswordForm) {

	updatePasswordForm.addEventListener('submit', event => {

		event.preventDefault();

		const form = {

			passwordCurrent: document.getElementById('password-current').value,
			password: document.getElementById('password').value,
			passwordConfirm: document.getElementById('password-confirm').value

		}

		updateSettings(form, 'password');
	})
}




///---------------	 Products 	----------------///




/// ----------	 Barongs 	------------//




if (productFormCreate) {

	productFormCreate.addEventListener('submit', e => {

		e.preventDefault();

		const form = new FormData();

		form.append('name', document.getElementById('name').value);
		form.append('description', document.getElementById('description').value);
		form.append('originalPrice', document.getElementById('original-price').value);
		form.append('category', document.getElementById('category').value);
		form.append('sex', document.getElementById('sex').value);
		form.append('color', document.getElementById('color').value);
		form.append('style', document.getElementById('style').value);


		/// ✅ Image Cover


		const cover = document.getElementById('product-image-cover');

		if (cover && cover.files[0]) {

			form.append('imageCover', cover.files[0]);
		}


		/// ✅ Image Array (no event listener!)

		const extrasInput = document.getElementById('product-image-array');

		if (extrasInput && extrasInput.files.length > 0) {

			for (let i = 0; i < extrasInput.files.length; i++) {
				form.append('imageUrls', extrasInput.files[i]);
			}
		}


		//---------------------- Variants -----------------------//


		const variants = [];

		const sizeFields = document.querySelectorAll('[name^="variant-size-"]');
		const stockFields = document.querySelectorAll('[name^="variant-inStock-"]');

		for (let i = 0; i < sizeFields.length; i++) {
			const size = sizeFields[i].value;
			const inStock = parseInt(stockFields[i].value, 10) || 0;

			if (size) {
				variants.push({ size, inStock });
			}
		}

		form.append('variants', JSON.stringify(variants));

		//---------------------- ------- -----------------------//

		createProductDB(form);
	});
}




if (productForm) {

	productForm.addEventListener('submit', e => {

		e.preventDefault();

		const id = productForm.dataset.id;
		const slug = productForm.dataset.slug;

		const form = new FormData();

		form.append('name', document.getElementById('name').value);
		form.append('description', document.getElementById('description').value);
		form.append('originalPrice', document.getElementById('original-price').value);
		form.append('currentPrice', document.getElementById('current-price').value);
		form.append('tags', document.getElementById('tags').value);
		form.append('discount', document.getElementById('discount').value);
		form.append('category', document.getElementById('category').value);
		form.append('sex', document.getElementById('sex').value);
		form.append('color', document.getElementById('color').value);
		form.append('style', document.getElementById('style').value);


		/// ✅ Image Cover

		const cover = document.getElementById('product-image-cover');

		if (cover && cover.files[0]) {

			form.append('imageCover', cover.files[0]);
		}


		/// ✅ Image Array (no event listener!)

		const extrasInput = document.getElementById('product-image-array');

		if (extrasInput && extrasInput.files.length > 0) {

			for (let i = 0; i < extrasInput.files.length; i++) {
				form.append('imageUrls', extrasInput.files[i]);
			}
		}

		//---------------------- Variants -----------------------//


		const sizeFields = document.querySelectorAll('[name^="variant-size-"]');
		const stockFields = document.querySelectorAll('[name^="variant-inStock-"]');

		for (let i = 0; i < sizeFields.length; i++) {
			const size = sizeFields[i].value;
			const inStock = parseInt(stockFields[i].value, 10) || 0;

			if (size) {
				form.append(`variants[${i}][size]`, size);
				form.append(`variants[${i}][inStock]`, inStock);
			}
		}

		//---------------------- ------- -----------------------//

		updateProductDB(form, id, slug);
	});
}



if (discontinueBtn) {

	discontinueBtn.addEventListener('click', e => {

		e.preventDefault();

		const productId = e.currentTarget.dataset.productId;

		if (confirm('Are you sure you want to discontinue this Product? This action is hard to undo.')) {
			discontinueProduct(productId);
		}
	})
}





/// ----------- Shoes ------------- ///




if (shoeFormCreate) {

	shoeFormCreate.addEventListener('submit', e => {

		e.preventDefault();

		const form = new FormData();

		form.append('name', document.getElementById('name').value);
		form.append('description', document.getElementById('description').value);
		form.append('originalPrice', document.getElementById('original-price').value);
		form.append('category', document.getElementById('category').value);
		form.append('sex', document.getElementById('sex').value);
		form.append('color', document.getElementById('color').value);
		form.append('style', document.getElementById('style').value);


		/// ✅ Image Cover


		const cover = document.getElementById('shoe-image-cover');

		if (cover && cover.files[0]) {

			form.append('imageCover', cover.files[0]);
		}


		/// ✅ Image Array (no event listener!)

		const extrasInput = document.getElementById('shoe-image-array');

		if (extrasInput && extrasInput.files.length > 0) {

			for (let i = 0; i < extrasInput.files.length; i++) {
				form.append('imageUrls', extrasInput.files[i]);
			}
		}


		//---------------------- Variants -----------------------//


		const variants = [];

		const sizeFields = document.querySelectorAll('[name^="variant-size-"]');
		const stockFields = document.querySelectorAll('[name^="variant-inStock-"]');

		for (let i = 0; i < sizeFields.length; i++) {
			const size = sizeFields[i].value;
			const inStock = parseInt(stockFields[i].value, 10) || 0;

			if (size) {
				variants.push({ size, inStock });
			}
		}

		form.append('variants', JSON.stringify(variants));

		//---------------------- ------- -----------------------//

		createShoesDB(form);

	});
}





/// Update shoes		


const shoeForm = document.querySelector('.shoe__form');


if (shoeForm) {

	shoeForm.addEventListener('submit', e => {

		e.preventDefault();

		const id = shoeForm.dataset.id;
		const slug = shoeForm.dataset.slug;

		const form = new FormData();

		form.append('name', document.getElementById('name').value);
		form.append('description', document.getElementById('description').value);
		form.append('originalPrice', document.getElementById('original-price').value);
		form.append('currentPrice', document.getElementById('current-price').value);
		form.append('tags', document.getElementById('tags').value);
		form.append('discount', document.getElementById('discount').value);
		form.append('category', document.getElementById('category').value);
		form.append('sex', document.getElementById('sex').value);
		form.append('color', document.getElementById('color').value);
		form.append('style', document.getElementById('style').value);


		/// ✅ Image Cover

		const cover = document.getElementById('shoe-image-cover');

		if (cover && cover.files[0]) {

			form.append('imageCover', cover.files[0]);
		}


		/// ✅ Image Array (no event listener!)

		const extrasInput = document.getElementById('shoe-image-array');

		if (extrasInput && extrasInput.files.length > 0) {

			for (let i = 0; i < extrasInput.files.length; i++) {
				form.append('imageUrls', extrasInput.files[i]);
			}
		}

		//---------------------- Variants -----------------------//


		const sizeFields = document.querySelectorAll('[name^="variant-size-"]');
		const stockFields = document.querySelectorAll('[name^="variant-inStock-"]');

		for (let i = 0; i < sizeFields.length; i++) {
			const size = sizeFields[i].value;
			const inStock = parseInt(stockFields[i].value, 10) || 0;

			if (size) {
				form.append(`variants[${i}][size]`, size);
				form.append(`variants[${i}][inStock]`, inStock);
			}
		}

		//---------------------- ------- -----------------------//


		updateShoeDB(form, id, slug);
	});
}



/// discontinue  

const discontinueShoesBtn = document.getElementById('discontinue-shoes-btn');

if (discontinueShoesBtn) {

	discontinueShoesBtn.addEventListener('click', e => {

		e.preventDefault();

		const productId = e.currentTarget.dataset.productId;

		if (confirm('Are you sure you want to discontinue this Product? This action is hard to undo.')) {
			discontinueShoes(productId);
		}
	})
}



/// ----------- Accessories ------------- ///


const accsFormCreate = document.querySelector('.accs__form--create');

if (accsFormCreate) {

	accsFormCreate.addEventListener('submit', e => {

		e.preventDefault();

		const form = new FormData();

		form.append('name', document.getElementById('name').value);
		form.append('description', document.getElementById('description').value);
		form.append('originalPrice', document.getElementById('original-price').value);
		form.append('category', document.getElementById('category').value);
		form.append('color', document.getElementById('color').value);



		/// ✅ Image Cover


		const cover = document.getElementById('accs-image-cover');

		if (cover && cover.files[0]) {

			form.append('imageCover', cover.files[0]);
		}


		/// ✅ Image Array (no event listener!)

		const extrasInput = document.getElementById('accs-image-array');

		if (extrasInput && extrasInput.files.length > 0) {

			for (let i = 0; i < extrasInput.files.length; i++) {
				form.append('imageUrls', extrasInput.files[i]);
			}
		}

		createAccessoriesDB(form);
	});
}




/// Update Accessory		


const accsForm = document.querySelector('.accs__form');


if (accsForm) {

	accsForm.addEventListener('submit', e => {

		e.preventDefault();

		const id = accsForm.dataset.id;
		const slug = accsForm.dataset.slug;

		const form = new FormData();

		form.append('name', document.getElementById('name').value);
		form.append('description', document.getElementById('description').value);
		form.append('originalPrice', document.getElementById('original-price').value);
		form.append('currentPrice', document.getElementById('current-price').value);
		form.append('tags', document.getElementById('tags').value);
		form.append('discount', document.getElementById('discount').value);
		form.append('category', document.getElementById('category').value);
		form.append('color', document.getElementById('color').value);



		/// ✅ Image Cover

		const cover = document.getElementById('accs-image-cover');

		if (cover && cover.files[0]) {

			form.append('imageCover', cover.files[0]);
		}


		/// ✅ Image Array (no event listener!)

		const extrasInput = document.getElementById('accs-image-array');

		if (extrasInput && extrasInput.files.length > 0) {

			for (let i = 0; i < extrasInput.files.length; i++) {
				form.append('imageUrls', extrasInput.files[i]);
			}
		}

		updateAccessoriesDB(form, id, slug);
	});
}



/// Discontinue Accessory

const discontinueAccsBtn = document.getElementById('discontinue-accs-btn');


if (discontinueAccsBtn) {

	discontinueAccsBtn.addEventListener('click', e => {

		e.preventDefault();

		const productId = e.currentTarget.dataset.productId;

		if (confirm('Are you sure you want to discontinue this Product? This action is hard to undo.')) {
			discontinueAccs(productId);
		}
	})
}






///------------------- Categories --------------------///


if (createCategory) {


	createCategory.addEventListener('submit', e => {

		e.preventDefault();

		const form = new FormData();

		form.append('name', document.getElementById('name').value);
		form.append('description', document.getElementById('description').value);


		const cover = document.getElementById('category-image-cover');

		if (cover && cover.files[0]) {

			form.append('image', cover.files[0]);
		}

		createCategoryDB(form);
	})
}



if (updateCategory) {

	updateCategory.addEventListener('submit', e => {

		e.preventDefault();

		const form = new FormData;

		form.append('name', document.getElementById('name').value)
		form.append('description', document.getElementById('description').value)
		form.append('slug', document.getElementById('slug').value)
		form.append('discount', document.getElementById('discounts').value);

		const cover = document.getElementById('category-image-cover');

		if (cover && cover.files[0]) {

			form.append('image', cover.files[0]);
		}

		const id = updateCategory.dataset.categoryId;

		updateCategoryDB(form, id);
	})
}




if (deactivateCategory) {

	deactivateCategory.addEventListener('click', e => {

		e.preventDefault();

		const id = e.currentTarget.dataset.categoryId;

		deactivateCategoryDB(id);
	})
}



///------------------- Orders --------------------///


/// 			Change adddress on order 			///

document.addEventListener('DOMContentLoaded', () => {

	const shipAddress = document.getElementById('shipaddress');
	const shippingAddressForm = document.getElementById('admin-order-form');


	if (shipAddress) {

		shipAddress.addEventListener('change', () => {

			shippingAddressForm.submit();

		})
	}
})




///			Update Order 			///


const updateOrderForm = document.getElementById('admin-order-form');


if (updateOrderForm) {

	updateOrderForm.addEventListener('submit', e => {

		e.preventDefault();

		const orderStatus = document.getElementById('admin-order-status').value;
		const transStatus = document.getElementById('admin-transaction-status').value;
		const addressObject = updateOrderForm.dataset.updateshipping;
		const orderNum = updateOrderForm.dataset.ordernum;


		updateOrders(orderStatus, transStatus, addressObject, orderNum);

	})
}




///------------------- Discounts --------------------///


const createDiscount = document.getElementById('create-discount');

const trueRadio = document.getElementById('radioTrue');
const falseRadio = document.getElementById('radioFalse');


if (createDiscount) {

	createDiscount.addEventListener('submit', e => {

		e.preventDefault();

		const form = {

			code: document.getElementById('code').value,
			percentage: document.getElementById('percentage').value,
			amount: document.getElementById('amount').value,
			startDate: document.getElementById('startdate').value,
			endDate: document.getElementById('enddate').value
		}

		form.active = falseRadio.checked;

		if (trueRadio.checked) {

			form.active = true
		}
		else if (falseRadio.checked) {

			form.active = false
		}

		createDiscountDB(form);
	})
}





const updateDiscount = document.getElementById('update-discount');

if (updateDiscount) {

	updateDiscount.addEventListener('submit', e => {

		const discountId = updateDiscount.dataset.discountId;

		e.preventDefault();


		const form = {

			code: document.getElementById('code').value,
			percentage: document.getElementById('percentage').value,
			amount: document.getElementById('amount').value,
			// appliesToCategories: document.getElementById('category').value,
			startDate: document.getElementById('startdate').value,
			endDate: document.getElementById('enddate').value
		}

		form.active = falseRadio.checked;

		if (trueRadio.checked) {

			form.active = true
		}
		else if (falseRadio.checked) {

			form.active = false
		}


		updateDiscountDB(form, discountId);

		// console.log(form, discountId);

	})
}

