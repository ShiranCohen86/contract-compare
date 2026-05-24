require('dotenv').config();
const http = require('http');
const { Server: SocketServer } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { seedIfEmpty } = require('./seed/seed');

async function bootstrap() {
  try {
    await connectDB();
    if (env.AUTO_SEED_IF_EMPTY) {
      try {
        const wasSeeded = await seedIfEmpty();
        if (wasSeeded) logger.info('Auto-seed ran — demo data created.');
      } catch (err) {
        logger.error('Auto-seed failed', { err: err.message });
      }
    }
  } catch (err) {
    logger.warn('MongoDB unavailable — server starting without DB. API calls will fail until MongoDB is up.', { err: err.message });
  }

  const httpServer = http.createServer(app);

  // Socket.io realtime
  const io = new SocketServer(httpServer, {
    cors: {
      origin: [env.FRONTEND_URL, 'http://localhost:5173'],
      credentials: true,
    },
  });

  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug('Socket connected', { id: socket.id, userId: socket.userId });

    socket.on('contract:join', ({ contractId }) => {
      if (!contractId) return;
      socket.join(`contract:${contractId}`);
    });

    socket.on('contract:leave', ({ contractId }) => {
      if (!contractId) return;
      socket.leave(`contract:${contractId}`);
    });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { id: socket.id });
    });
  });

  // Make io accessible to services via app.locals
  app.locals.io = io;

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} is already in use.`);
    } else {
      logger.error('HTTP server error', { err: err.message });
    }
    process.exit(1);
  });

  httpServer.listen(env.PORT, () => {
    logger.info(`ContractOS API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    if (env.NODE_ENV !== 'production') {
      logger.info(`Swagger docs: http://localhost:${env.PORT}/api/docs`);
    }
  });

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection', { err: err?.message });
  });
  process.on('SIGTERM', () => httpServer.close(() => process.exit(0)));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
