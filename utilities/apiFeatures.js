
//---------- API Class ---------//


class APIFeatures {

	constructor(query, queryString) {


		this.query = query;

		this.queryString = queryString;

	}


	filter() {

		/// Create a shallow copy of the query string to avoid modifying the original

		const queryObj = { ...this.queryString };


		/// Define fields to be excluded from the query (pagination, sorting, limiting, field selection)

		const excludedFields = ['page', 'sort', 'limit', 'fields'];


		/// Remove the excluded fields from the query object

		excludedFields.forEach((el) => delete queryObj[el]);


		/// Convert the remaining query object into a JSON string for further processing

		let queryStr = JSON.stringify(queryObj);


		/// Replace operators (gte, gt, lte, lt) with MongoDB's format ($gte, $gt, etc.)

		queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);


		/// Update the query to include the filtered conditions

		this.query = this.query.find(JSON.parse(queryStr));


		/// Return `this` to allow method chaining

		return this;
	}



	sort() {

		if (this.queryString.sort) {

			const sortby = this.queryString.sort.split(',').join(' ');

			this.query = this.query.sort(sortby);

		} else this.query = this.query.sort('name');

		return this;

	}


	limitFields() {


		if (this.queryString.fields) {

			const fields = this.queryString.fields.split(',').join(' ');

			this.query = this.query.select(fields);

		} else this.query = this.query.select('-__v');

		return this;

	}

	paginate() {

		const page = this.queryString.page * 1 || 1;
		const limit = this.queryString.limit * 1 || 100;
		const skip = (page - 1) * limit;

		this.query = this.query.skip(skip).limit(limit);

		return this;

	}

}


module.exports = APIFeatures;