require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.set('port', (process.env.PORT || 8081));
app.use(bodyParser.json());

/*TODO For test purposes - remove later*/
app.get('/load-data', (req, res) => {
	res.send({ express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT' });
});

async function start() {
	try {
		app.listen(app.get('port'), function() {
			console.log('Express app vercel-express-react-demo is running on port', app.get('port'));
		});
	} catch (err) {
		console.error('Error initializing the app:', err);
	}
}

start();

module.exports = app;
