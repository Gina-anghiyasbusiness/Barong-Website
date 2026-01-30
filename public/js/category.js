import axios from 'axios';

import { showAlert } from './alert';




export const createCategoryDB = async (data) => {

	try {

		const result = await axios({

			method: "POST",
			url: "/api/v1/admin/category",
			data
		})


		if (result.data.status === 'success') {

			showAlert('success', `Category Successfully Created!!`);

			window.setTimeout(() => {

				location.assign('/admin/be_category-list')

			}, 1000)
		}
	} catch (err) {

		showAlert('error', err.response.data.message);
	}

}



export const updateCategoryDB = async (data, id) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/admin/category/${id}`,
			data
		}
		)

		if (result.data.status === 'success') {

			showAlert('success', `Category Successfully Updated!!`);

			window.setTimeout(() => {

				location.assign('/admin/be_category-list')

			}, 1000)
		}


	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}




export const deactivateCategoryDB = async (id) => {

	try {

		const result = await axios({

			method: "DELETE",
			url: `/api/v1/admin/category/${id}`
		})

		if (result.data.status === 'success') {

			showAlert('success', 'Category Deactivated Successfully');

			setTimeout(() => {

				window.location.href = "/admin/be_category-list";

			}, 1500);
		}

	} catch (err) {

		showAlert('error', err.response.data.message);
	}
}