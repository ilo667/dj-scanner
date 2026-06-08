require('dotenv').config();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is required');
}

if (!process.env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY environment variable is required');
}

const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const scanRoutes = require('./routes/scan');
const artistsRoutes = require('./routes/artists');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const genresRoutes = require('./routes/genres');
const countriesRoutes = require('./routes/countries');
const app = express();

app.set('port', (process.env.PORT || 8081));
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use('/api/scan', scanRoutes);
app.use('/api/artists', artistsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/genres', genresRoutes);
app.use('/api/countries', countriesRoutes);

if (process.env.NODE_ENV !== 'production') {
	const port = process.env.PORT || 8081;

	app.listen(port, () => console.log('API listening on', port));
}

module.exports = app;
