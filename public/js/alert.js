


export const hideAlert = () => {

	const el = document.querySelector('.alert');

	if (el) el.parentElement.removeChild(el);
}



export const showAlert = (type, msg) => {

	hideAlert();

	const alert = document.createElement('div');

	alert.classList.add('alert');
	alert.classList.add(`alert--${type}`);
	alert.textContent = msg;

	document.querySelector('body').prepend(alert);

	window.setTimeout(hideAlert, 4000)
}