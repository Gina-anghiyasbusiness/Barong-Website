const mongoose = require('mongoose');

const counterProductSchema = new mongoose.Schema({

	name: {

		type: String,
		required: true,
		unique: true
	},

	seq: {

		type: Number,
		default: 0

	}
})


const CounterProd = mongoose.model('CounterProd', counterProductSchema);


module.exports = CounterProd;