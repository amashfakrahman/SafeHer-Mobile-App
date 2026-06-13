const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const { env } = require('./config/env');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.NODE_ENV === 'development' && env.CORS_ORIGINS.length === 0) return callback(null, true);
    if (env.CORS_ORIGINS.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.JSON_BODY_LIMIT }));
app.use(morgan(env.NODE_ENV === 'development' ? ':method :url :status :response-time ms - :res[content-length] req=:req[x-request-id]' : 'combined'));

app.use('/uploads', express.static(env.UPLOAD_DIR, {
  dotfiles: 'deny',
  index: false,
  maxAge: env.NODE_ENV === 'production' ? '7d' : 0,
}));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.GLOBAL_RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
  },
});

app.use('/api', globalLimiter, routes);
app.use(errorHandler);

module.exports = { app };
