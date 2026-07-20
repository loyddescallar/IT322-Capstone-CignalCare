const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const loadRoutes = require('./routes/loadRoutes');
const loadRequestRoutes = require('./routes/loadRequestRoutes');
const customerRoutes = require('./routes/customerRoutes');
const troubleshootRoutes = require('./routes/troubleshootRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

const {
  payMongoWebhookController,
} = require('./controllers/loadRequestController');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction =
  String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';

const configuredOrigins = Array.from(
  new Set(
    [process.env.CORS_ORIGIN, process.env.FRONTEND_URL]
      .filter(Boolean)
      .flatMap((value) => String(value).split(','))
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean)
  )
);

// Development remains convenient when no origin is configured. Production
// browser requests must match CORS_ORIGIN or FRONTEND_URL explicitly.
const allowAnyOrigin = !isProduction && configuredOrigins.length === 0;

app.use(
  cors({
    origin(origin, callback) {
      // Browser-less tools and same-origin requests may not send Origin.
      const normalizedOrigin = String(origin || '').replace(/\/$/, '');

      if (
        !origin ||
        allowAnyOrigin ||
        configuredOrigins.includes(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      return callback(new Error('Origin is not allowed by CORS.'));
    },
  })
);
app.use(morgan(isProduction ? 'combined' : 'dev'));

if (isProduction && configuredOrigins.length === 0) {
  console.warn(
    'CORS WARNING: Set CORS_ORIGIN or FRONTEND_URL before serving the production frontend.'
  );
}

/*
  PayMongo webhook must be before express.json().
  These two routes are both supported:
  1. /api/load-requests/paymongo/webhook
  2. /api/load-requests/paymongo-webhook
*/
app.post(
  '/api/load-requests/paymongo/webhook',
  express.raw({ type: 'application/json', limit: '2mb' }),
  payMongoWebhookController
);

app.post(
  '/api/load-requests/paymongo-webhook',
  express.raw({ type: 'application/json', limit: '2mb' }),
  payMongoWebhookController
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'CignalCare+ API' });
});

app.use(
  '/uploads/messages',
  express.static(path.join(__dirname, 'uploads', 'messages'))
);

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/load', loadRoutes);
app.use('/api/load-requests', loadRequestRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/troubleshoot', troubleshootRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  if (err.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({
      error: 'Origin is not allowed by CORS.',
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Attachment must be 5MB or smaller',
    });
  }

  if (
    err.message &&
    err.message.includes('attachments are allowed')
  ) {
    return res.status(400).json({
      error: err.message,
    });
  }

  return res.status(500).json({
    error: 'Server error',
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
