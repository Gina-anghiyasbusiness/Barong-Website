const mongoose = require('mongoose');


//---------	 Packages  ---------//

const slugify = require('slugify');
const validator = require('validator');



const categorySchema = new mongoose.Schema({


	name: {

		type: String,
		required: [true, 'A category must have a name'],
		unique: true,
		trim: true
	},

	slug: {

		type: String,
		required: true,
		unique: true
	},

	description: {

		type: String,
		trim: true
	},

	image: String, // URL or filename for category thumbnail (optional)

	discount:

	{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Discount',
		default: null

	}
	,

	active: {

		type: Boolean,
		default: true,
		select: false
	}


},
	{
		timestamps: true
	}
)



//------------ Middleware --------------//


/// Hide deactivated Categories


categorySchema.pre(/^find/, function (next) {

	this.find({ active: true });

	next();
})





categorySchema.pre('validate', function (next) {

	if (this.isModified('name')) {

		this.slug = slugify(this.name, { lower: true, strict: true });
	}

	next();

});








const Category = mongoose.model('Category', categorySchema);


module.exports = Category;