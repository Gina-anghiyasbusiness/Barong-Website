const SpecProd = require('./../models/specProdModel');
const Bag = require('./../models/bagModel');
const Accessory = require('./../models/accessoryModel');
const catchAsync = require('./../utilities/catchAsync');


const escapeXml = (value = '') => {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
};

const sendXml = (res, xml) => {
	res.set('Content-Type', 'application/xml; charset=utf-8');
	res.status(200).send(xml.trim());
};


const buildUrl = (path = '') => {
	const baseUrl = process.env.CANONICAL_URL; // must end with /
	return `${baseUrl}${path}`;
};

const formatDate = (date) => {
	if (!date) return null;
	return new Date(date).toISOString().split('T')[0];
};



const createUrlEntry = ({ loc, lastmod, priority = '0.8', changefreq = 'weekly' }) => {
	return `
		<url>
			<loc>${escapeXml(loc)}</loc>
			${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}
			<changefreq>${escapeXml(changefreq)}</changefreq>
			<priority>${escapeXml(priority)}</priority>
		</url>
	`;
};

exports.getSitemapIndex = (req, res) => {
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
		<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
			<sitemap>
				<loc>${escapeXml(buildUrl('sitemap-static.xml'))}</loc>
			</sitemap>
			<sitemap>
				<loc>${escapeXml(buildUrl('sitemap-products.xml'))}</loc>
			</sitemap>
		</sitemapindex>`;

	sendXml(res, sitemap);
};




exports.getStaticSitemap = (req, res) => {

	const staticPages = [
		{
			path: '',
			priority: '1.0'
		},
		{
			path: 'barong-list',
			priority: '0.9'
		},
		{
			path: 'bag-list',
			priority: '0.8'
		},
		{
			path: 'accessories-list',
			priority: '0.8'
		},
		{
			path: 'static/sales',
			priority: '0.9'
		},
		{
			path: 'static/services',
			priority: '0.8'
		},
		{
			path: 'static/custom',
			priority: '0.9'
		},
		{
			path: 'static/contact-custom',
			priority: '0.7'
		},
		{
			path: 'static/rentals',
			priority: '0.9'
		},
		{
			path: 'static/rental-guidelines',
			priority: '0.7'
		},
		{
			path: 'static/about',
			priority: '0.7'
		},
		{
			path: 'static/contact',
			priority: '0.7'
		}
	];

	const staticUrls = staticPages.map((page) =>
		createUrlEntry({
			loc: buildUrl(page.path),
			priority: page.priority,
			changefreq: 'weekly'
		})
	);

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
		<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
			${staticUrls.join('')}
		</urlset>`;

	sendXml(res, sitemap);
};

exports.getProductSitemap = catchAsync(async (req, res, next) => {
	const [barongs, bags, accessories] = await Promise.all([
		SpecProd.find().select('slug updatedAt'),
		Bag.find().select('slug updatedAt'),
		Accessory.find().select('slug updatedAt')
	]);

	const barongUrls = barongs
		.filter((product) => product.slug)
		.map((product) =>
			createUrlEntry({
				loc: buildUrl(`barong/${product.slug}`),
				lastmod: formatDate(product.updatedAt),
				priority: '0.8',
				changefreq: 'weekly'
			})
		);

	const bagUrls = bags
		.filter((product) => product.slug)
		.map((product) =>
			createUrlEntry({
				loc: buildUrl(`bag/${product.slug}`),
				lastmod: formatDate(product.updatedAt),
				priority: '0.7',
				changefreq: 'weekly'
			})
		);

	const accessoryUrls = accessories
		.filter((product) => product.slug)
		.map((product) =>
			createUrlEntry({
				loc: buildUrl(`accessories/${product.slug}`),
				lastmod: formatDate(product.updatedAt),
				priority: '0.7',
				changefreq: 'weekly'
			})
		);

	const urls = [
		...barongUrls,
		...bagUrls,
		...accessoryUrls
	].join('');

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
		<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
			${urls}
		</urlset>`;

	sendXml(res, sitemap);
});


exports.getRobotsTxt = (req, res) => {
	const rules = [
		'User-agent: *',
		'Disallow: /admin/',
		'Disallow: /my-account/',
		'Disallow: /checkout-page/',
		'Disallow: /user-order-number/',
		'Disallow: /guest-order-number/',
		'Disallow: /address-form--user/',
		'Disallow: /login-page',
		'Disallow: /reset-password-page',
		'Disallow: /set-new-password-page',
		'Disallow: /shoe-list',
		'Disallow: /shoe/',
		'Disallow: /categories',
		'',
		`Sitemap: ${buildUrl('sitemap.xml')}`
	];

	res.set('Content-Type', 'text/plain; charset=utf-8');
	res.status(200).send(rules.join('\n'));
};