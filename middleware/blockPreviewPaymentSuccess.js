module.exports = (req, res, next) => {

	if (process.env.SITE_PREVIEW === 'true') {
		return res.redirect(303, '/');
	}

	next();
};