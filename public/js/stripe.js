import axios from 'axios';

import { showAlert } from './alert';


const stripe = Stripe('pk_test_51Sv7UbJGnb8O9t51PR8Y22riJBvEZBsuSnRnXqlNYCEYfNbWLr7FOs80Q2iG4dwxbvas5YnfAdjmj1EkAUizCXpo00gQwXLWxA');





export const buyCart = async () => {

	try {



		/// create the checkout session on orderRoute which calls orderController.buyCartItem

		const session = await axios(`/api/v1/orders/checkout-session`);


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





export const buyItNow = async (product, qty, variant) => {

	try {

		const variantParam = variant || 'null';

		const session = await axios(`/api/v1/orders/checkout-session-bin/${product}/${qty}/${variantParam}`);

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



export const buyItNowGuest = async (product, qty, guestAddressId, variant) => {

	const variantParam = variant || 'null';

	try {

		const session = await axios(
			{
				method: 'POST',
				url: `/api/v1/orders/checkout-session-bin-guest/${product}/${qty}/${variantParam}`,
				data: { guestAddressId }
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

