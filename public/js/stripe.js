import axios from 'axios';

import { showAlert } from './alert';


const stripe = Stripe('pk_test_51QcESvI6jYGG65H8RbhtPmBE7YWbyCk7yixi8czswxoys4iXtvNmA4IAwM2OyNKEa26OzvB0K3agHmLslnb8xqjh00vtcFOYGX');





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

		const session = await axios(`/api/v1/orders/checkout-session-bin/${product}/${qty}/${variant}`);

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




export const buyItNowGuest = async (product, qty, guestAddressId, variant) => {

	try {

		const session = await axios(
			{
				method: 'POST',
				url: `/api/v1/orders/checkout-session-bin-guest/${product}/${qty}/${variant}`,
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

