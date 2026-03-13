
module.exports = (req, res, next) => {

	if (process.env.SITE_PREVIEW === 'true') {
		return res.status(403).json({
			status: 'fail',
			message: 'Preview only. Checkout is not active yet.'
		});
	}

	next();
};