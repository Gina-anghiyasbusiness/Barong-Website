const mongoose = require('mongoose');
const SpecProd = require('../models/specProdModel');


const reviewSchema = new mongoose.Schema(
	{
		user: {

			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},

		product: {

			type: mongoose.Schema.Types.ObjectId,
			ref: 'SpecProd',
			required: true
		},

		rating: {

			type: Number,
			required: true,
			min: 1,
			max: 10
		},

		comment: {

			type: String,
			trim: true,
			maxlength: 1000
		}
	},

	{
		timestamps: true,

		toJSON: { virtuals: true },

		toObject: { virtuals: true }
	}
);



//-------- Indexing -----------//


/// Indexing to prevent duplicates

reviewSchema.index({ product: 1, user: 1 }, { unique: true });





//-------------------- Middleware -------------------//




//----- populate user and product on the review -----//


reviewSchema.pre(/^find/, function (next) {

	this
		.populate({ path: 'user', select: ' _id name ' })
		.populate({ path: 'product', select: 'name description currentPrice imageCover slug' });

	next();
});





//-------- Calculate Average Ratings per product -------//


reviewSchema.statics.calcAverageRatings = async function (productId) {

	const ratingStats = await this.aggregate([

		{ $match: { product: productId } },

		{
			$group: {
				_id: '$product',
				numReviews: { $sum: 1 },
				avgRating: { $avg: '$rating' }
			}
		}
	]
	)


	if (ratingStats.length > 0) {


		await SpecProd.findByIdAndUpdate(productId,
			{
				rating: ratingStats[0].avgRating,
				totalRatings: ratingStats[0].numReviews
			}
		)
	} else {

		await SpecProd.findByIdAndUpdate(productId, {
			rating: 0,
			totalRatings: 0
		});
	}
}



//// calculate reviews

reviewSchema.post('save', async function () {

	await this.constructor.calcAverageRatings(this.product);

});



/// if review is updated or deleted - the overall will get adjusted (Only thru API 

reviewSchema.post(/^findOneAnd/, async function (doc) {

	if (doc) {

		await doc.constructor.calcAverageRatings(doc.product);
	}
});





const Review = mongoose.model('Review', reviewSchema);


module.exports = Review;