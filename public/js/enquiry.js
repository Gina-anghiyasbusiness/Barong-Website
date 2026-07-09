import axios from 'axios';

import { showAlert } from './alert';




//------- Axios Functions --------//


export const updateEnquiry = async (status, id) => {


	try {

		const result = await axios({

			method: 'PATCH',
			url: `/api/v1/admin/enquiries/status/${id}`,
			data: { status }

		});

		if (result.data.status === 'success') {

			showAlert('success', 'Enquiry Updated.');

			window.setTimeout(() => {

				location.assign(`/admin/be_enquiries/${id}`)
			}, 3000)
		}
	}

	catch (err) {

		showAlert('error', err.response?.data?.message || 'Update failed');
	}

}


export const updateCustomEnquiry = async (status, id) => {


	try {

		const result = await axios({

			method: 'PATCH',
			url: `/api/v1/admin/custom-enquiries/status/${id}`,
			data: { status }

		});

		if (result.data.status === 'success') {

			showAlert('success', 'Customization Enquiry Updated.');

			window.setTimeout(() => {

				location.assign(`/admin/be_custom-enquiries/${id}`)
			}, 3000)
		}
	}

	catch (err) {

		showAlert('error', err.response?.data?.message || 'Customization Update failed');
	}

}