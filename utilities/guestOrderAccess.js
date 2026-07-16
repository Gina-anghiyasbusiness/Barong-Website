const crypto = require('crypto');


const normalizeId = id => {
	if (!id) return '';

	return id.toString();
};



const getGuestOrderAccessSecret = () => {
	const secret = process.env.GUEST_ORDER_ACCESS_SECRET;

	if (!secret) {
		throw new Error('Guest order access secret is not configured');
	}

	return secret;
};


const createGuestOrderAccessToken = (orderId, guestAddressId) => {
	const orderIdString = normalizeId(orderId);
	const guestAddressIdString = normalizeId(guestAddressId);

	if (!orderIdString || !guestAddressIdString) {
		throw new Error('Guest order access token requires order and guest address ids');
	}

	return crypto
		.createHmac('sha256', getGuestOrderAccessSecret())
		.update(`${orderIdString}:${guestAddressIdString}:guest-order-access`)
		.digest('hex');
};



const verifyGuestOrderAccessToken = (candidateToken, orderId, guestAddressId) => {
	if (!candidateToken || typeof candidateToken !== 'string') return false;

	const expectedToken = createGuestOrderAccessToken(orderId, guestAddressId);

	const expectedBuffer = Buffer.from(expectedToken, 'hex');
	const candidateBuffer = Buffer.from(candidateToken, 'hex');

	if (expectedBuffer.length !== candidateBuffer.length) return false;

	return crypto.timingSafeEqual(expectedBuffer, candidateBuffer);
};



const buildGuestOrderUrl = (orderId, guestAddressId) => {
	return `/guest-order-number/${normalizeId(orderId)}/${createGuestOrderAccessToken(orderId, guestAddressId)}`;
};


module.exports = {
	createGuestOrderAccessToken,
	verifyGuestOrderAccessToken,
	buildGuestOrderUrl
};