const mongoose = require('mongoose');
const User = require('./../models/userModel');

const factory = require('./../controllers/handlerFactory')

const AppError = require('../utilities/appError');
const catchAsync = require('../utilities/catchAsync');

const Email = require('./../utilities/emailClass');

const filterObj = require('../utilities/filterObject');




///				Create				///


/// Backend user


exports.createBeUser = catchAsync(async (req, res, next) => {

	const requestedRole = req.body.role || 'admin';


	if (requestedRole === 'user') {

		return next(new AppError('Customer accounts must be created through signup', 403));
	}

	if (requestedRole === 'owner' && req.user.role !== 'owner') {

		return next(new AppError('Only owners can create owner accounts', 403));
	}


	const user = await User.create({

		name: req.body.name,
		email: req.body.email,
		phone: req.body.phone,
		role: requestedRole,
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

	const defaultValue = isDefault === true || isDefault === 'true';

	if (!['Home', 'Work', 'Other'].includes(type)) {

		return next(new AppError('Invalid address label', 400));
	}


	const user = await User.findById(req.user.id);

	if (!user) return next(new AppError('User not found', 404));


	const duplicate = user.addresses.some(addr => addr.label === type);


	if (duplicate) {

		return next(new AppError(`You already have an address labeled '${type}'`, 400));
	}


	if (defaultValue) {

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
					isDefault: defaultValue
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


exports.preventPasswordUpdate = (req, res, next) => {

	if (req.body.password || req.body.passwordConfirm) {

		return next(new AppError('Do not update your password here. Please use Update My Password', 400));
	}

	next();
};


exports.preventOwnerRoleUpdate = (req, res, next) => {

	if (req.body.role === 'owner' && req.user.role !== 'owner') {

		return next(new AppError('Only owners can assign owner role', 403));
	}

	next();
};


exports.preventOwnerDelete = catchAsync(async (req, res, next) => {

	const targetUser = await User.findById(req.params.id).select('role');

	if (!targetUser) return next(new AppError('User not found', 404));

	if (targetUser.role === 'owner' && req.user.role !== 'owner') {
		return next(new AppError('Only owners can delete owner accounts', 403));
	}

	next();
});



exports.preventStaffUserUpdate = catchAsync(async (req, res, next) => {

	const targetUserId = req.params.id || req.params.userId;

	const targetUser = await User.findById(targetUserId).select('role');


	if (!targetUser) return next(new AppError('User not found', 404));

	if (targetUser.role === 'owner' && req.user.role !== 'owner') {
		return next(new AppError('Only owners can update owner accounts', 403));
	}

	if (req.user.role === 'admin' && targetUser.role !== 'user') {
		return next(new AppError('Admins cannot update staff accounts', 403));
	}

	next();
});



exports.preventSelfAdminAction = (req, res, next) => {

	if (req.params.id === req.user.id) {

		return next(new AppError('You cannot perform this action on your own account', 400));
	}

	next();
};



exports.filterAdminUserUpdateBody = (req, res, next) => {

	req.body = filterObj(req.body, 'name', 'email', 'phone', 'role');

	next();
};



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


	await new Email(updatedUser).accountChanges();

	res.status(200).json({

		status: "success",
		data: {
			updatedUser
		}
	})
})





exports.updateMyAddress = catchAsync(async (req, res, next) => {

	const { type, number, street, city, state, postcode, isDefault } = req.body;

	const defaultValue = isDefault === true || isDefault === 'true';

	if (!['Home', 'Work', 'Other'].includes(type)) {

		return next(new AppError('Invalid address label', 400));
	}


	const addressId = req.params.addressId;

	if (!mongoose.Types.ObjectId.isValid(addressId)) {

		return next(new AppError('Invalid address ID', 400));
	}


	const userId = req.params.userId || req.user.id;

	if (userId && !mongoose.Types.ObjectId.isValid(userId)) {

		return next(new AppError('Invalid user ID', 400));
	}



	/// If isDefault value is true - remove current isDefault value

	if (defaultValue) {

		await User.updateOne(

			{ _id: userId, 'addresses.isDefault': true },

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
				'addresses.$[elem].label': type,
				'addresses.$[elem].number': number,
				'addresses.$[elem].street': street,
				'addresses.$[elem].city': city,
				'addresses.$[elem].state': state,
				'addresses.$[elem].postcode': postcode,
				'addresses.$[elem].isDefault': defaultValue
			}
		},
		{
			/// $[elem] === addressId 

			arrayFilters: [{ 'elem._id': addressId }],
			runValidators: true
		}
	)


	if (addressUpdate.matchedCount === 0) {

		return next(new AppError('Address not found', 404));
	}


	const user = await User.findById(userId);

	if (user) {

		await new Email(user).accountChanges();
	}


	res.status(200).json({

		status: 'success',
		addressUpdate
	})
})







//------ Delete -----//



/// delete user address by user



exports.deleteAnAddress = catchAsync(async (req, res, next) => {

	const addressId = req.params.addressId;

	if (!mongoose.Types.ObjectId.isValid(addressId)) {

		return next(new AppError('Invalid address ID', 400));
	}


	const updatedUser = await User.findOneAndUpdate(

		{ _id: req.user.id, 'addresses._id': addressId },

		{ $pull: { addresses: { _id: addressId } } },

		{ new: true }
	);

	if (!updatedUser) {

		return next(new AppError('Address not found', 404));
	}

	res.status(200).json({

		status: 'success'
	})
}
)







/// delete user by admin


exports.deleteUser = factory.deleteOne(User);




exports.deactivateUser = catchAsync(async (req, res, next) => {

	const user = await User.findByIdAndUpdate(req.params.id, { active: false },
		{
			new: true,
			runValidators: true
		});

	if (!user) return next(new AppError('User not found', 404));

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






