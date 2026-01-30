import axios from 'axios';

import { showAlert } from './alert';




export const createProductDB = async form => {

	try {

		const result = await axios({

			method: 'POST',
			url: `/api/v1/admin/products/`,
			data: form,
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		});

		if (result.data.status === 'success') {

			showAlert('success', 'Product Created successfully!!');

			window.setTimeout(() => {

				location.assign('/admin/be_products-list');

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
			url: `/api/v1/admin/products/${id}`,
			data,
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		})

		if (result.data.status === 'success') {

			showAlert('success', 'Product Updated successfully!!');

			window.setTimeout(() => {

				location.assign(`/admin/be_product-item/${slug}`)

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
			url: `/api/v1/admin/products/discontinued/${id}`
		})

		if (result.data.status === 'success') {

			showAlert('success', `Product Successfully Discontinued!!`);

			window.setTimeout(() => {

				location.assign('/admin/be_products-list')

			}, 1000)
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}

