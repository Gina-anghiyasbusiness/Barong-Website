const DELIVERY_FEE = 10;
const FREE_DELIVERY_THRESHOLD = 150;



const normalizeFulfilmentMethod = method => {

	return method === 'pickup' ? 'pickup' : 'delivery';
};


const calculateTotals = (totalNet, options = {}) => {

	const fulfilmentMethod = normalizeFulfilmentMethod(options.fulfilmentMethod);

	if (!Number.isFinite(totalNet) || totalNet <= 0) {

		throw new Error('Invalid checkout total');
	}

	const delivery = fulfilmentMethod === 'pickup'
		? 0
		: totalNet < FREE_DELIVERY_THRESHOLD
			? DELIVERY_FEE
			: 0;


	const subtotal = totalNet + delivery;

	return {
		delivery,
		subtotal,
		taxAmount: 0,
		fulfilmentMethod
	};
};



module.exports = { calculateTotals, DELIVERY_FEE, FREE_DELIVERY_THRESHOLD };