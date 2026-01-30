//-----------  Product Pipeline ----------//


/// product pipeline for 10 newest poducts: ordered new - old


exports.newestTenPipeline = [

	{ $match: { discontinued: false } },

	{ $sort: { createdAt: -1 } },

	{
		$project: {
			name: 1,
			currentPrice: 1,
			createdAt: 1,
			color: 1,
			size: 1,
			style: 1
		}
	},

	{ $limit: 10 }

];


