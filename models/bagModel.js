const mongoose = require('mongoose');
const base = require('./productBaseModel');


//---------	 Packages  ---------//

const slugify = require('slugify');



//---------------------- Schema ------------------------//
//------------------ (Changables) ----------------------//



const BagSchema = new mongoose.Schema({

	...base,


	///		Shoes Specific		/// 




	color: {
		type: String,
		enum: [
			'black',
			'white',
			'red',
			'blue',
			'green',
			'yellow',
			'pink',
			'purple',
			'orange',
			'grey',
			'brown',
			'old rose',
			'ethnic',
			'champagne',
			'beige',
			'mixed'],
		default: 'mixed'
	},

	///		If Ratings are used		///


	rating: {

		type: Number,
		default: 0,
		min: 0,
		max: 10,

		set: val => Math.round(val * 10) / 10

	},

	totalRatings: {

		type: Number,
		default: 0
	}
},


	//----------- Schema options  -----------///

	///  CreatedAt Indexed  ///

	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true }
	}
);



//--------------- Indexes -------------///


BagSchema.index({ category: 1, createdAt: -1 });

BagSchema.index({ category: 1, currentPrice: 1 });





//---------- Vitual Properties ----------///


/// populate thru middleware (populate review on product)


BagSchema.virtual('reviews', {

	ref: 'Review',
	foreignField: 'product',
	localField: '_id'
})





//---------------------------  Middleware  ---------------------------///
//--------------------------- (Changables) ---------------------------///



/// PRE HOOKS (work on save and create only) ///


BagSchema.pre('save', async function (next) {

	if (this.isModified('name')) {

		this.slug = slugify(this.name, { lower: true, strict: true });
	}

	if (!this.currentPrice) {

		this.currentPrice = this.originalPrice;
	}

	/// Generate tags dynamically from category, sex, and color

	const Category = mongoose.model('Category');

	const cat = await Category.findById(this.category);

	this.tags = [
		cat?.name?.toLowerCase(),
		this.color?.toLowerCase()
	].filter(Boolean);


	next();
});




/// PRE -find


BagSchema.pre(/^find/, function (next) {

	this.find({ discontinued: false });

	next();
})





const Bag = mongoose.model('Bag', BagSchema);


module.exports = Bag;