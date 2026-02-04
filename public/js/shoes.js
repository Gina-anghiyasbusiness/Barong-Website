import axios from 'axios';

import { showAlert } from './alert';




export const createShoesDB = async form => {

	try {

		const result = await axios({

			method: 'POST',
			url: `/api/v1/admin/shoes/`,
			data: form,
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		});

		if (result.data.status === 'success') {

			showAlert('success', 'Product Created successfully!!');

			window.setTimeout(() => {

				location.assign('/admin/be_shoes-list');

			}, 2500);
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
};




export const updateShoeDB = async (data, id, slug) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/admin/shoes/${id}`,
			data,
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		})

		if (result.data.status === 'success') {

			showAlert('success', 'Product Updated successfully!!');

			window.setTimeout(() => {

				location.assign(`/admin/be_shoes-list`)

			}, 2500
			)
		}

	} catch (err) {

		showAlert('error', err.response.data.message)
	}
}




export const discontinueShoes = async (id) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/admin/shoes/discontinued/${id}`
		})

		if (result.data.status === 'success') {

			showAlert('success', `Product Successfully Discontinued!!`);

			window.setTimeout(() => {

				location.assign('/admin/be_shoes-list')

			}, 1000)
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}

