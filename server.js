const mongoose = require('mongoose');
const dotenv = require('dotenv');


/// 	THIS MUST GO ABOVE APP		///

dotenv.config({ path: './config.env' });



//----  Uncaught Exception Error handling  ----//

process.on('uncaughtException', err => {

	console.log('Uncaught Exception:', err.name, err.message);
	console.log('Shutting Down......');

	process.exit(1);
})



const app = require('./app');



mongoose.connect(process.env.CONNECTION_STRING)
	.then(() => {

		console.log(`DB Connected: ${process.env.NODE_ENV.toUpperCase()} MODE`);
	}
	)


const port = process.env.PORT || 8080;


app.listen(port, () => {

	console.log(`Server Started on : ${port}`);

})



//----  UnhandledRejection Error handling  ----- //


process.on('unhandledRejection', err => {

	console.log('Unhandled Rejection:', err.name, err.message);
	console.log('Shutting Down......');

	server.close(() => {

		process.exit(1);
	});
})



