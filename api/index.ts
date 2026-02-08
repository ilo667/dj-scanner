require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const scanRoutes = require('./routes/scan');
const artistsRoutes = require('./routes/artists');
const ocrRoutes = require('./routes/ocr');

const app = express();

app.set('port', (process.env.PORT || 8081));
app.use(bodyParser.json());
app.use('/api/scan', scanRoutes);
app.use('/api/artists', artistsRoutes);
app.use('/api/ocr', ocrRoutes);

if (process.env.NODE_ENV !== 'production') {
	const port = process.env.PORT || 8081;

	app.listen(port, () => console.log('API listening on', port));
}

module.exports = app;
