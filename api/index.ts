require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser'); // TODO: replace with express.json() and remove body-parser dependency
const cookieParser = require('cookie-parser');
const scanRoutes = require('./routes/scan');
const artistsRoutes = require('./routes/artists');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const app = express();

app.set('port', (process.env.PORT || 8081));
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/api/scan', scanRoutes);
app.use('/api/artists', artistsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

if (process.env.NODE_ENV !== 'production') {
	const port = process.env.PORT || 8081;

	app.listen(port, () => console.log('API listening on', port));
}

module.exports = app;
