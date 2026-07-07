import axios from 'axios';

import { showAlert } from './alert';


const getStripe = () => {

	if (typeof Stripe !== 'function') {

		throw new Error('Stripe.js failed to load');
	}

	if (!window.stripePublishableKey) {

		throw new Error('Stripe publishable key is missing');
	}

	return Stripe(window.stripePublishableKey);
};




export const buyCart = async (fulfilmentMethod = 'delivery') => {

	try {

		const stripe = getStripe();

		/// create the checkout session on orderRoute which calls orderController.buyCartItem

		const session = await axios.post(`/api/v1/orders/checkout-session`, { fulfilmentMethod });


		/// store the result

		const result = await stripe.redirectToCheckout(
			{
				sessionId: session.data.session.id
			}
		)

		if (result.error) {

			showAlert('error', result.error.message);
		}

	} catch (err) {

		showAlert('error', err);
	}
}





export const buyItNow = async (product, qty, variant, fulfilmentMethod = 'delivery') => {

	try {

		const stripe = getStripe();

		const variantParam = variant || 'null';

		const session = await axios.post(`/api/v1/orders/checkout-session-bin/${product}/${qty}/${variantParam}`, { fulfilmentMethod });

		const result = await stripe.redirectToCheckout(
			{
				sessionId: session.data.session.id
			}
		)

		if (result.error) {

			showAlert('error', result.error.message);
		}

	} catch (err) {

		showAlert('error', err);
	}
}



export const buyItNowGuest = async (product, qty, guestAddressId, variant, fulfilmentMethod = 'delivery') => {

	const variantParam = variant || 'null';

	try {

		const stripe = getStripe();

		const session = await axios(
			{
				method: 'POST',
				url: `/api/v1/orders/checkout-session-bin-guest/${product}/${qty}/${variantParam}`,
				data: { guestAddressId, fulfilmentMethod }
			}
		);

		const result = await stripe.redirectToCheckout(
			{
				sessionId: session.data.session.id
			}
		);

		if (result.error) {

			showAlert('error', result.error.message);
		}

	} catch (err) {

		showAlert('error', err);
	}
};

