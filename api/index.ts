require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const checkRoutes = require('./routes/check');
const parseFileRoutes = require('./routes/parse-file');
const artistsRoutes = require('./routes/artists');

const app = express();

app.set('port', (process.env.PORT || 8081));
app.use(bodyParser.json());
app.use('/api/check', checkRoutes);
app.use('/api/parse-file', parseFileRoutes);
app.use('/api/artists', artistsRoutes);

if (process.env.NODE_ENV !== 'production') {
	const port = process.env.PORT || 8081;

	app.listen(port, () => console.log('API listening on', port));
}

module.exports = app;
