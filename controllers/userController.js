const User = require('./../models/userModel');

const factory = require('./../controllers/handlerFactory')

const AppError = require('../utilities/appError');
const catchAsync = require('../utilities/catchAsync');
const filterObj = require('../utilities/filterObject');




///				Create				///


/// Backend user


exports.createBeUser = catchAsync(async (req, res, next) => {

	const user = await User.create({

		name: req.body.name,
		email: req.body.email,
		phone: req.body.phone,
		role: req.body.role,
		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm,

	});

	res.status(200).json({

		status: 'success',
		user
	})
}
)




/// User create address


exports.createNewAddress = catchAsync(async (req, res, next) => {

	const { type, number, street, city, state, postcode, isDefault } = req.body;

	const user = await User.findById(req.user.id);

	const duplicate = user.addresses.some(addr => addr.label === type);


	if (duplicate) {

		return next(new AppError(`You already have an address labeled '${type}'`, 400));
	}


	if (isDefault === true) {

		await User.updateOne(

			{ _id: req.user.id, 'addresses.isDefault': true },

			{ $set: { 'addresses.$[elem].isDefault': false } },

			{ arrayFilters: [{ 'elem.isDefault': true }], multi: true }
		);
	}

	const newAddress = await User.findByIdAndUpdate(

		req.user.id,

		{
			$push: {
				addresses: {
					label: type,
					number: number,
					street: street,
					city: city,
					state: state,
					postcode: postcode,
					isDefault: isDefault
				}
			}
		},

		{ new: true, runValidators: true }
	);

	res.status(200).json({

		status: 'success',
		newAddress
	})
})





//------ Read all ------ //


exports.getAllUsers = factory.getAll(User);


//----- Read one ----- //


/// need to set the req.params to the logged in user - getOne uses params, not the logged in user

exports.getMe = (req, res, next) => {

	req.params.id = req.user.id;

	next();

}

/// when this now queires the parameter - the user.id is set to it


exports.getUser = factory.getOne(User);


/// uses this:

///! router.get('/me',	authController.protectRoute, userController.getMe, userController.getUser );

///? When you call api/v1/users/me , the currently logged in user is returned in the response




//------ Update ------ //


/// dont use this to update passwords


exports.updateUser = factory.updateOne(User);




//------ Update my account by user ------//


exports.updateMe = catchAsync(async (req, res, next) => {

	if (req.body.password || req.body.passwordConfirm) {

		return next(new AppError('Do not update your password here. Please use Update My Password', 400))
	}

	const filteredBody = filterObj(req.body, 'name', 'email', 'phone');

	const updatedUser = await User.findByIdAndUpdate(
		req.user.id,
		filteredBody,
		{
			new: true,
			runValidators: true
		})

	res.status(200).json({

		status: "success",
		data: {
			updatedUser
		}
	})
})





exports.updateMyAddress = catchAsync(async (req, res, next) => {

	const { type, number, street, city, state, postcode, isDefault } = req.body;

	const addressId = req.params.addressId;

	const userId = req.params.userId || req.user.id;



	/// If isDefault value is true - remove current isDefault value

	if (isDefault === true) {

		await User.updateOne(

			{ _id: req.user.id, 'addresses.isDefault': true },

			{ $set: { 'addresses.$[elem].isDefault': false } },

			{ arrayFilters: [{ 'elem.isDefault': true }], multi: true }
		);
	}




	const addressUpdate = await User.updateOne(
		{
			_id: userId,
			'addresses._id': addressId
		},
		{
			/// $[elem] === addressId 

			$set: {
				'addresses.$[elem].type': type,
				'addresses.$[elem].number': number,
				'addresses.$[elem].street': street,
				'addresses.$[elem].city': city,
				'addresses.$[elem].state': state,
				'addresses.$[elem].postcode': postcode,
				'addresses.$[elem].isDefault': isDefault
			}
		},
		{
			/// $[elem] === addressId 

			arrayFilters: [{ 'elem._id': addressId }]
		}
	)

	res.status(200).json({

		status: 'success',
		addressUpdate
	})
})







//------ Delete -----//



/// delete user address by user


exports.deleteAnAddress = catchAsync(async (req, res, next) => {

	const addressId = req.params.addressId;


	await User.findOneAndUpdate(

		{ _id: req.user.id, 'addresses._id': addressId },

		{ $pull: { addresses: { _id: addressId } } },

		{ new: true }
	);

	res.status(200).json({

		status: 'success'
	})
}
)







/// delete user by admin


exports.deleteUser = factory.deleteOne(User);







exports.deactivateUser = catchAsync(async (req, res, next) => {

	await User.findByIdAndUpdate(req.params.id, { active: false },
		{
			new: true,
			runValidators: true
		});


	res.status(200).json({
		status: 'success'
	})
})



/// deactivate my account by user

exports.deleteMyAccount = catchAsync(async (req, res, next) => {

	await User.findByIdAndUpdate(req.user.id, { active: false });

	res.status(204).json({

		status: "success"
	})
})






