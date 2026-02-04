import axios from 'axios';

import { showAlert } from './alert';




export const createProductDB = async form => {

	try {

		const result = await axios({

			method: 'POST',
			url: `/api/v1/admin/barongs/`,
			data: form,
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		});

		if (result.data.status === 'success') {

			showAlert('success', 'Product Created successfully!!');

			window.setTimeout(() => {

				location.assign('/admin/be_barongs-list');

			}, 2500);
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
};




export const updateProductDB = async (data, id, slug) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/admin/barongs/${id}`,
			data,
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		})

		if (result.data.status === 'success') {

			showAlert('success', 'Product Updated successfully!!');

			window.setTimeout(() => {

				location.assign(`/admin/be_barongs-list`)

			}, 2500
			)
		}

	} catch (err) {

		showAlert('error', err.response.data.message)
	}
}



export const discontinueProduct = async (id) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/admin/barongs/discontinued/${id}`
		})

		if (result.data.status === 'success') {

			showAlert('success', `Product Successfully Discontinued!!`);

			window.setTimeout(() => {

				location.assign('/admin/be_barongss-list')

			}, 1000)
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}

