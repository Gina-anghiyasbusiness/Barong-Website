const mongoose = require('mongoose');
const base = require('./productBaseModel');


//---------	 Packages  ---------//

const slugify = require('slugify');




//---------------------- Schema ------------------------//
//------------------ (Changables) ----------------------//



const specProdSchema = new mongoose.Schema({

	...base,


	///		T-shirt Specific		/// 




	color: {
		type: String,
		enum: ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange', 'grey', 'brown']
	},


	style: {
		type: String,
		enum: ['Crew-Neck', 'V-neck', 'Polo', 'Tank', 'Singlet', 'Slim-fit', 'Fitted', 'Relaxed-fit', 'Crop-top', 'Slim-fit']
	},


	sex: {
		type: String,
		enum: ['unisex', 'male', 'female', 'boy', 'girl', 'unisex-kids'],
		default: 'unisex'
	},


	variants: [
		{
			size: {
				type: String,
				enum: ['6', '8', '10', '12', '14', '16', '18', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
				required: true
			},

			inStock: {
				type: Number,
				default: 0
			}

		}
	],


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


specProdSchema.index({ createdAt: -1 });

specProdSchema.index({ category: -1 });




//---------- Vitual Properties ----------///


/// populate thru middleware (populate review on product)

specProdSchema.virtual('reviews', {

	ref: 'Review',
	foreignField: 'product',
	localField: '_id'
})





//---------------------------  Middleware  ---------------------------///
//--------------------------- (Changables) ---------------------------///



/// PRE HOOKS (work on save and create only) ///


specProdSchema.pre('save', async function (next) {

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
		this.sex?.toLowerCase(),
		this.color?.toLowerCase()
	].filter(Boolean);


	next();
});




/// PRE -find


specProdSchema.pre(/^find/, function (next) {

	this.find({ discontinued: false });

	next();
})



//--------------- Virtual Properties --------------///


/// create a gbp conversion to each tee


specProdSchema.virtual('currentPriceGBP').get(function () {

	let conversion = this.currentPrice * 0.5;

	return Number(conversion.toFixed(2));
})




const SpecProd = mongoose.model('SpecProd', specProdSchema);


module.exports = SpecProd;