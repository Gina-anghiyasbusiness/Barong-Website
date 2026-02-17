
let product, qty, variant;


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
						body: JSON.stringify({ product, qty, variant: variantParam }),
						headers: { 'Content-Type': 'application/json' }
					});

					const orderData = await res.json();

					return orderData.orderID;

				} catch (err) {

					alert('There was an error creating the PayPal order.');

					throw err;
				}
			},

			onApprove: async function (data, actions) {

				try {

					const res = await fetch(`/api/v1/orders/paypal/capture-order-guest/${data.orderID}`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ product, qty, variant: variantParam })
					});

					const finalData = await res.json();

					window.location.assign('/order-success-guest');

				} catch (err) {

					alert('There was an error capturing your PayPal order.');
				}
			},

			onError: function (err) {

				alert('There was a PayPal error! Please try again or use another payment method.');
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
							headers: { 'Content-Type': 'application/json' }

						}
					);

					const orderData = await res.json();

					return orderData.orderID;


				} catch (err) {

					alert('There was an error creating the PayPal order.');

					throw err;
				}
			},

			onApprove: async function (data, actions) {

				try {

					const res = await fetch(`/api/v1/orders/paypal/capture-order/${data.orderID}`,
						{
							method: 'POST',
							headers: { 'Content-Type': 'application/json' }

						});


					const finalData = await res.json();

					window.location.assign('/order-success');

				} catch (err) {

					alert('There was an error capturing your PayPal order.');
				}
			},

			onError: function (err) {

				alert('There was a PayPal error! Please try again or use another payment method.');
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
						body: JSON.stringify({ product, qty, variant: variantParam }),
						headers: { 'Content-Type': 'application/json' }
					});

					const orderData = await res.json();

					return orderData.orderID;

				} catch (err) {

					alert('There was an error creating the PayPal order.');

					throw err;
				}
			},

			onApprove: async function (data, actions) {

				try {

					const res = await fetch(`/api/v1/orders/paypal/capture-order/${data.orderID}`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ product, qty, variant: variantParam })
					});

					const finalData = await res.json();

					window.location.assign('/order-success');

				} catch (err) {
					alert('There was an error capturing your PayPal order.');
				}
			},

			onError: function (err) {

				alert('There was a PayPal error! Please try again or use another payment method.');
			}
		}).render('#paypal-button-container');

	}

});