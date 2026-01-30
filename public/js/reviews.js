import axios from 'axios';

import { showAlert } from './alert';


export const createReview = async (data, productId, slug) => {

	try {

		const result = await axios(
			{

				method: "POST",
				url: `/api/v1/products/${productId}/reviews`,
				data
			})

		if (result.data.status === 'success') {

			showAlert('success', `Review Added Successfully!!`);

			window.setTimeout(() => {

				location.assign(`/product/${slug}`);

			}, 2500);


		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}