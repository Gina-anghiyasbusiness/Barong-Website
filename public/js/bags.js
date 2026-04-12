import axios from 'axios';

import { showAlert } from './alert';



export const createBagDB = async form => {

	try {

		const result = await axios({

			method: 'POST',
			url: `/api/v1/admin/bags/`,
			data: form,
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		});

		if (result.data.status === 'success') {

			showAlert('success', 'Bag Created successfully!!');

			window.setTimeout(() => {

				location.assign('/admin/be_bag-list');

			}, 2500);
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
};




export const updateBagDB = async (data, id, slug) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/admin/bags/${id}`,
			data,
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		})

		if (result.data.status === 'success') {

			showAlert('success', 'Bag Updated successfully!!');

			window.setTimeout(() => {

				location.assign(`/admin/be_bag-list`)

			}, 2500
			)
		}

	} catch (err) {

		showAlert('error', err.response.data.message)
	}
}



export const discontinueBag = async (id) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/admin/bags/discontinued/${id}`
		})

		if (result.data.status === 'success') {

			showAlert('success', `Product Successfully Discontinued!!`);

			window.setTimeout(() => {

				location.assign('/admin/be_bag-list')

			}, 1000)
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}


