
const paypal = require('@paypal/checkout-server-sdk');



///------------  Set up the environment (Sandbox or Live) 	---------///


function environment() {

	let clientId = process.env.PAYPAL_CLIENT_ID;
	let clientSecret = process.env.PAYPAL_SECRET_KEY;


	/// Sandbox (testing) or live (real) depending on env variable


	if (process.env.PAYPAL_MODE === 'live') {


		/// Real payments

		return new paypal.core.LiveEnvironment(clientId, clientSecret);

	} else {

		/// Test/fake payments

		return new paypal.core.SandboxEnvironment(clientId, clientSecret);
	}
}


//--------------	 Create a PayPal client instance	--------------///


/// Used to send API requests to PayPal (create order, capture, etc)

function client() {

	return new paypal.core.PayPalHttpClient(environment());
}



module.exports = { client, paypal };