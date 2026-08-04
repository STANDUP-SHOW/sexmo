require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profiles.routes');
const photoRoutes = require('./routes/photos.routes');
const browseRoutes = require('./routes/browse.routes');
const likeRoutes = require('./routes/likes.routes');
const messageRoutes = require('./routes/messages.routes');
const reportRoutes = require('./routes/reports.routes');
const adminRoutes = require('./routes/admin.routes');
const aiRoutes = require('./routes/ai.routes');
const pageRoutes = require('./routes/pages.routes');
const testimonialRoutes = require('./routes/testimonials.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3100', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Photos servies statiquement (stockage local pour ce MVP ; utiliser un
// bucket S3/CDN en production avec URLs signées si des photos privées existent).
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/browse', browseRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/settings', settingsRoutes);

app.use(errorHandler);

module.exports = app;
