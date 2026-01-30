import axios from 'axios';

import { showAlert } from './alert';



export const createDiscountDB = async (data) => {


	try {

		const result = await axios({

			method: "POST",
			url: '/api/v1/discounts/new-discount-create',
			data


		})


		if (result.data.status === 'success') {

			showAlert('success', 'Discount Created successfully!!');

			window.setTimeout(() => {

				location.assign('/admin/be_discount-list');

			}, 2500);
		}


	} catch (err) {

		showAlert('error', err.response.data.message);

	}


}

export const updateDiscountDB = async (data, discountId) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/discounts/update-discount/${discountId}`,
			data
		})

		if (result.data.status === 'success') {

			showAlert('success', 'Discount Updated successfully!!');

			window.setTimeout(() => {

				location.assign('/admin/be_discount-list');

			}, 2500);
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}