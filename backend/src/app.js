const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const env = require('./config/env');
const routes = require('./routes');
const errorMiddleware = require('./middleware/error');
const requestLogger = require('./middleware/logger');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(requestLogger);

app.use('/api', rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max:      env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
}));


app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

if (env.NODE_ENV !== 'production') {
  const swaggerUi   = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use('/api', routes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found', path: _req.originalUrl }));

// Serve React frontend in production
if (env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
}

app.use(errorMiddleware);

module.exports = app;
