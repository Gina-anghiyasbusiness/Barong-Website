const express = require('express');
const router = express.Router();

const seoController = require('./../controllers/seoController');


router.get('/robots.txt', seoController.getRobotsTxt);

router.get('/sitemap.xml', seoController.getSitemapIndex);

router.get('/sitemap-static.xml', seoController.getStaticSitemap);

router.get('/sitemap-products.xml', seoController.getProductSitemap);


module.exports = router;