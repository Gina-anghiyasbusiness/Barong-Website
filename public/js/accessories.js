import axios from 'axios';

import { showAlert } from './alert';



export const createAccessoriesDB = async form => {

	try {

		const result = await axios({

			method: 'POST',
			url: `/api/v1/admin/accessories/`,
			data: form,
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		});

		if (result.data.status === 'success') {

			showAlert('success', 'Accessory Created successfully!!');

			window.setTimeout(() => {

				location.assign('/admin/be_accessories-list');

			}, 2500);
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
};




export const updateAccessoriesDB = async (data, id, slug) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/admin/accessories/${id}`,
			data,
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		})

		if (result.data.status === 'success') {

			showAlert('success', 'Accessory Updated successfully!!');

			window.setTimeout(() => {

				location.assign(`/admin/be_accessories-list`)

			}, 2500
			)
		}

	} catch (err) {

		showAlert('error', err.response.data.message)
	}
}



export const discontinueAccs = async (id) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/admin/accessories/discontinued/${id}`
		})

		if (result.data.status === 'success') {

			showAlert('success', `Product Successfully Discontinued!!`);

			window.setTimeout(() => {

				location.assign('/admin/be_accessories-list')

			}, 1000)
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}


