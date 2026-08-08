/**
 * Express application configuration (MVC host)
 *
 * Request flow: Routes → Controllers → Services → Models → MongoDB
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const roomRoutes = require('./routes/roomRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'QuiZapp' });
});

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/room', roomRoutes);

app.get('/', (_req, res) => {
  res.sendFile(path.join(clientPath, 'pages', 'index.html'));
});

app.get('/:page.html', (req, res, next) => {
  const file = path.join(clientPath, 'pages', `${req.params.page}.html`);
  res.sendFile(file, (err) => {
    if (err) next();
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
