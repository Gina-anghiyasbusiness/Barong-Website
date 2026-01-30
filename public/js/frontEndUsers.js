import axios from 'axios';

import { showAlert } from './alert';




export const userUpdateSettings = async (data, type, userId) => {

	try {

		const url = type === 'password'
			? '/api/v1/users/updateMyPassword'
			: '/api/v1/users/updateMe'

		const result = await axios({

			method: "PATCH",
			url,
			data
		}
		)
		if (result.data.status === 'success') {

			showAlert('success', `${type.toUpperCase()} Updated Successfully!!`);

			window.setTimeout(() => {

				location.assign(`/my-account/${userId}`)

			}, 1500)
		}
	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}




export const userUpdateAddress = async (data, addressId, userId) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/users/updateMyAddress/${addressId}`,
			data
		})

		if (result.data.status === 'success') {

			showAlert('success', `Address Updated Successfully!!`);

			window.setTimeout(() => {

				location.assign(`/my-account/${userId}`)

			}, 1500)
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}




export const userNewAddress = async (data, userId) => {

	try {

		const result = await axios({

			method: "POST",
			url: `/api/v1/users/createNewAddress`,
			data
		})

		if (result.data.status === 'success') {

			showAlert('success', `Address Created Successfully!!`);

			window.setTimeout(() => {

				location.assign(`/my-account/${userId}`)

			}, 1500)
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}




/// delete user address




export const userdeleteAddress = async (addressId, userId) => {

	try {

		const result = await axios({

			method: "DELETE",
			url: `/api/v1/users/deleteAddress/${addressId}`
		})

		if (result.data.status === 'success') {

			showAlert('success', `Address Deleted Successfully!!`);

			window.setTimeout(() => {

				location.assign(`/my-account/${userId}`)

			}, 1500)
		}
	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}