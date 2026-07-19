
let product, qty, variant;

const showPayPalMessage = msg => {

	const message = msg || 'PayPal could not start. Please try again or use card payment.';

	const alertBox = document.createElement('div');
	alertBox.classList.add('alert', 'alert--error');
	alertBox.textContent = message;

	const existing = document.querySelector('.alert');
	if (existing) existing.remove();

	document.body.prepend(alertBox);

	window.setTimeout(() => alertBox.remove(), 5000);
};



const getPayPalMessage = err => {
	return err?.message || 'PayPal could not start. Please try again or use card payment.';
};



const getFulfilmentMethod = () => {

	const select = document.getElementById('fulfilment-method') || document.getElementById('fulfilment-method-guest');

	return select && select.value === 'pickup' ? 'pickup' : 'delivery';
};



document.addEventListener('DOMContentLoaded', function () {

	if (typeof paypal === "undefined") return;



	/// GUEST CHECKOUT

	const guestContainer = document.getElementById('paypal-button-container-guest');


	if (guestContainer) {

		product = guestContainer.dataset.product;
		qty = guestContainer.dataset.qty;
		variant = guestContainer.dataset.variant;

		const variantParam = (variant && variant !== 'null' && variant !== '') ? variant : 'null';

		paypal.Buttons({

			createOrder: async function (data, actions) {

				try {

					const res = await fetch(`/api/v1/orders/paypal/buy-it-now-guest/${product}/${qty}/${variantParam}`, {
						method: 'POST',
						body: JSON.stringify({ product, qty, variant: variantParam, fulfilmentMethod: getFulfilmentMethod() }),
						headers: { 'Content-Type': 'application/json' }
					});

					const orderData = await res.json();

					if (!res.ok || !orderData.orderID) {

						throw new Error(orderData.message || 'There was an error creating the PayPal order.');
					}

					return orderData.orderID;

				} catch (err) {

					showPayPalMessage(getPayPalMessage(err));

					throw err;
				}
			},

			onApprove: async function (data, actions) {

				try {

					const res = await fetch(`/api/v1/orders/paypal/capture-order-guest/${data.orderID}`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ product, qty, variant: variantParam, fulfilmentMethod: getFulfilmentMethod() })
					});

					const finalData = await res.json();


					if (!res.ok || !finalData.success) {

						throw new Error(finalData.message || 'PayPal payment was not completed');
					}

					if (!finalData.orderUrl) {

						throw new Error('PayPal payment completed, but no order page was returned.');
					}

					window.location.assign(finalData.orderUrl);

				} catch (err) {

					showPayPalMessage(getPayPalMessage(err));
				}
			},

			onError: function (err) {

				if (document.querySelector('.alert')) return;

				showPayPalMessage('PayPal could not complete. Please try again or use card payment.');
			}

		}).render('#paypal-button-container-guest');

		return;

		/// ✅ Stop here for guest


	}

	const container = document.getElementById('paypal-button-container');

	if (!container) return;


	product = container.dataset.product;
	qty = container.dataset.qty;
	variant = container.dataset.variant;


	/// Cart Logic


	if (!product || !qty) {

		paypal.Buttons({

			createOrder: async function (data, actions) {

				try {

					const res = await fetch(`/api/v1/orders/paypal/cart`,
						{
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ fulfilmentMethod: getFulfilmentMethod() })

						}
					);

					const orderData = await res.json();

					if (!res.ok || !orderData.orderID) {

						throw new Error(orderData.message || 'There was an error creating the PayPal order.');
					}

					return orderData.orderID;


				} catch (err) {

					showPayPalMessage(getPayPalMessage(err));

					throw err;
				}
			},

			onApprove: async function (data, actions) {

				try {

					const res = await fetch(`/api/v1/orders/paypal/capture-order/${data.orderID}`,
						{
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ fulfilmentMethod: getFulfilmentMethod() })

						});


					const finalData = await res.json();


					if (!res.ok || !finalData.success) {

						throw new Error(finalData.message || 'PayPal payment was not completed');
					}

					if (!finalData.orderUrl) {

						throw new Error('PayPal payment completed, but no order page was returned.');
					}

					window.location.assign(finalData.orderUrl);

				} catch (err) {

					showPayPalMessage(getPayPalMessage(err));
				}
			},

			onError: function (err) {

				if (document.querySelector('.alert')) return;

				showPayPalMessage('PayPal could not complete. Please try again or use card payment.');
			}

		}).render('#paypal-button-container');


		/// BuyItNow Logic

	} else {

		const variantParam = (variant && variant !== 'null' && variant !== '') ? variant : 'null';

		paypal.Buttons({

			createOrder: async function (data, actions) {

				try {

					const res = await fetch(`/api/v1/orders/paypal/buy-it-now/${product}/${qty}/${variantParam}`, {

						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ product, qty, variant: variantParam, fulfilmentMethod: getFulfilmentMethod() })

					});

					const orderData = await res.json();

					if (!res.ok || !orderData.orderID) {

						throw new Error(orderData.message || 'There was an error creating the PayPal order.');
					}

					return orderData.orderID;

				} catch (err) {

					showPayPalMessage(getPayPalMessage(err));

					throw err;
				}
			},

			onApprove: async function (data, actions) {

				try {

					const res = await fetch(`/api/v1/orders/paypal/capture-order/${data.orderID}`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ product, qty, variant: variantParam, fulfilmentMethod: getFulfilmentMethod() })
					});

					const finalData = await res.json();

					if (!res.ok || !finalData.success) {

						throw new Error(finalData.message || 'PayPal payment was not completed');
					}

					if (!finalData.orderUrl) {

						throw new Error('PayPal payment completed, but no order page was returned.');
					}

					window.location.assign(finalData.orderUrl);

				} catch (err) {

					showPayPalMessage(getPayPalMessage(err));
				}
			},

			onError: function (err) {

				if (document.querySelector('.alert')) return;

				showPayPalMessage('PayPal could not complete. Please try again or use card payment.');
			}
		}).render('#paypal-button-container');

	}

});