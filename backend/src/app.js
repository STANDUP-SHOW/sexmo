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
const mediaRoutes = require('./routes/media.routes');
const photoAccessRoutes = require('./routes/photoAccess.routes');
const videoRoutes = require('./routes/videos.routes');
const galleryRoutes = require('./routes/gallery.routes');
const publicRoutes = require('./routes/public.routes');
const adminMembersRoutes = require('./routes/adminMembers.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3100', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Stockage local uniquement pour le logo du site (asset admin unique, faible
// volume) — les photos/vidéos des membres vivent sur le FTP (voir /media).
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
app.use('/media', mediaRoutes);
app.use('/api/photo-access', photoAccessRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin/members', adminMembersRoutes);

app.use(errorHandler);

module.exports = app;
