import axios from 'axios';

import { showAlert } from './alert';




//------- Axios Functions --------//


export const login = async (email, password) => {

	try {

		const result = await axios({

			method: 'POST',
			url: '/api/v1/users/login',
			data: { email, password }

		});

		const role = result.data.data.user.role;


		if (result.data.status === 'success' && ['admin', 'supervisor', 'owner'].includes(role)) {

			showAlert('success', 'Logged in successfully');

			window.setTimeout(() => {

				location.assign('/admin/be_home');

			}, 1500);

		} else if (result.data.status === 'success') {

			showAlert('success', 'Logged in successfully');

			window.setTimeout(() => {

				location.assign('/');
			}, 1500);
		}

	} catch (err) {

		showAlert('error', err.response?.data?.message || 'Login failed');
	}
};



export const logout = async () => {

	try {

		const res = await axios({

			method: 'GET',
			url: '/api/v1/users/logout'
		})

		if (res.data.status === 'success') {

			showAlert('success', 'Logged out successfully');

			window.setTimeout(() => {

				location.assign('/')
			}, 3000
			)
		}
	} catch (err) {

		showAlert('error', 'Error logging out ..... Try Again!!');
	}
}



export const signUpUser = async (data) => {


	try {

		const result = await axios({

			method: "POST",
			url: '/api/v1/users/signup',
			data

		})

		if (result.data.status === 'success') {

			showAlert('success', 'SignUp Successful');

			window.setTimeout(() => {

				location.assign('/')
			}, 3000)
		}

	} catch (err) {

		showAlert('error', 'Error Signing up ..... Try Again!!');
	}
}




export const resetEmailPasswordUser = async (email) => {

	try {

		const result = await axios({

			method: "POST",
			url: `/api/v1/users/forgotPassword`,
			data: { email }

		})

		if (result.data.status === 'success') {

			showAlert('success', 'Reset Password Email sent. Please check your inbox.');

			window.setTimeout(() => {

				location.assign('/login-page')
			}, 3000)
		}

	} catch (err) {

		showAlert('error', 'Error Password Reset ..... Try Again!!');
	}
}




export const setNewPasswordUser = async (data, token) => {

	try {

		const result = await axios({

			method: "PATCH",
			url: `/api/v1/users/resetPassword/${token}`,
			data

		})

		if (result.data.status === 'success') {

			showAlert('success', 'Password reset. Please log in!');

			window.setTimeout(() => {

				location.assign('/login-page')
			}, 3000)
		}

	} catch (err) {

		showAlert('error', 'Error Password Reset ..... Try Again!!');
	}
}


