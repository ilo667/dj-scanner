require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const checkRoutes = require('./routes/check');
const parseFileRoutes = require('./routes/parse-file');

const app = express();

app.set('port', (process.env.PORT || 8081));
app.use(bodyParser.json());
app.use('/api/check', checkRoutes);
app.use('/api/parse-file', parseFileRoutes);

/*TODO For test purposes - remove later*/
app.get('/load-data', (req, res) => {
	res.send({ express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT' });
});

if (process.env.NODE_ENV !== 'production') {
	const port = process.env.PORT || 8081;

	app.listen(port, () => console.log('API listening on', port));
}

module.exports = app;
