const mongoose = require('mongoose');

const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');




const userSchema = new mongoose.Schema({

	name: {

		type: String,
		required: [true, 'A User must have a name']
	},

	email: {

		type: String,
		required: [true, 'A User must have an Email'],
		unique: true,
		lowercase: true,
		validate: [validator.isEmail, 'Please provide a valid Email']
	},


	phone: {

		type: String,
		validate: [validator.isMobilePhone, 'Please enter a valid phone number']
	},

	role: {

		type: String,
		enum: ['user', 'admin', 'supervisor', 'owner'],
		default: 'user'
	},


	password: {

		type: String,
		required: [true, 'A User must have a Password'],
		minLength: [8, 'Password must be at least 8 Characters'],

		select: false

	},

	passwordConfirm: {

		type: String,
		required: [true, 'Please confirm Password'],

		validate: function (pwConfirm) {

			return pwConfirm === this.password
		},

		message: 'Passwords do not match!'
	},


	passwordChangedAt: Date,

	passwordResetToken: String,

	passwordResetExpires: Date,

	lastLoggedIn: Date,

	active: {

		type: Boolean,
		default: true,
		select: false
	},


	/// User Specific ///

	addresses: {

		/// using type as were setting a default field

		type: [
			{
				label: {
					type: String,
					enum: ['Home', 'Work', 'Other'],
					required: true,
					default: 'Home'

				},
				number: {
					type: String,
					required: false
				},
				street: String,
				city: String,
				state: String,

				postcode: {
					type: String,
					minLength: 4,
					maxLength: 4
				},
				isDefault: {
					type: Boolean,
					default: false
				}
			}
		],
		default: []
	},


	wishlist: [

		/// not using type as were not setting a default field 

		{
			product: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'SpecProd',
				required: true
			},

			variant: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'SpecProd',
				required: true
			},

			quantity: {
				type: Number,
				default: 1,
				min: 1
			},

			addedAt: {
				type: Date,
				default: Date.now
			}
		}
	],

	cart: [
		{
			product: {

				type: mongoose.Schema.Types.ObjectId,
				ref: 'SpecProd',
				required: true
			},

			variant: {
				ref: 'SpecProd',
				type: mongoose.Schema.Types.ObjectId,
				required: true
			},

			quantity: {
				type: Number,
				default: 1,
				min: 1
			},

			addedAt: {
				type: Date,
				default: Date.now
			}
		}
	],

},

	{
		timestamps: true
	}
)





//-----				Indexing  		-----//


userSchema.index({ name: -1 });
userSchema.index({ role: -1 });
userSchema.index({ active: -1 });


//-----		Virtual Properties -----//



/// virtually populate the orders on the user


userSchema.virtual('orders', {
	ref: 'Order',
	foreignField: 'user',
	localField: '_id'
});


///? const user = await User.findById(req.params.userId).populate('orders');





//-----		Middleware -----//


/// Hide all inactive users from find queries


userSchema.pre(/^find/, function (next) {

	this.find({ active: true });

	next();
})





/// encrypt Password


userSchema.pre('save', async function (next) {

	if (!this.isModified('password')) return next();

	this.password = await bcrypt.hash(this.password, 12);

	this.passwordConfirm = undefined;

	next();
})



/// update passwordChangedAt property


userSchema.pre('save', function (next) {

	if (!this.isModified('password') || this.isNew) return next();

	this.passwordChangedAt = Date.now() - 1000;

	next();
})








//-------- INSTANCE METHOD ---------//


/// compare password for validation

userSchema.methods.correctPassword = async function (inputPassword, savedPassword) {

	return await bcrypt.compare(inputPassword, savedPassword);
}



/// check passwordChangedAt date


userSchema.methods.passwordChangedAfter = function (jwtIssuedAt) {

	if (this.passwordChangedAt) {

		const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

		return jwtIssuedAt < changedTimeStamp;
	}

	return false;
}



/// reset password


userSchema.methods.createPasswordResetToken = function () {

	const resetToken = crypto.randomBytes(32).toString('hex');

	this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
	this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

	return resetToken;
}






/// 			Statics			///



/// calculate cart total by quantity


userSchema.statics.calculateCartTotal = async function (userId) {

	const totalArr = await User.aggregate(
		[
			{ $unwind: '$cart' },

			{ $match: { _id: new mongoose.Types.ObjectId(userId) } },


			/// Join the SpecProd to the user as the cart only holds a reference to SpecProd

			{
				$lookup: {

					/// name of the SpecProd collection (lowercase + pluralized)

					from: 'specprods',

					localField: 'cart.product',
					foreignField: '_id',

					/// as: sets the field name the product gets stored in

					as: 'productDetails'
				}
			},

			/// Flatten the joined product details

			{ $unwind: '$productDetails' },

			{
				$group: {

					_id: null,

					total: {

						$sum: {

							$multiply: [

								'$productDetails.currentPrice',
								'$cart.quantity'
							]
						}
					}
				}
			}
		])
	return totalArr[0]?.total || 0;
}




const User = mongoose.model('User', userSchema);


module.exports = User;