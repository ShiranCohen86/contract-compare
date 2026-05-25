require('dotenv').config();
const http = require('http');
const { Server: SocketServer } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { seedIfEmpty } = require('./seed/seed');
const socketService = require('./src/services/socket.service');

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

  // Register io so any service module can emit without importing app
  socketService.setIo(io);
  app.locals.io = io;

  io.on('connection', (socket) => {
    logger.debug('Socket connected', { id: socket.id, userId: socket.userId });

    // Auto-join personal room so services can push directly to this user
    if (socket.userId) socket.join(`user:${socket.userId}`);

    socket.on('contract:join', async ({ contractId }) => {
      if (!contractId) return;
      try {
        // Verify this user is actually a participant before letting them into the room
        const Contract = require('./src/models/Contract');
        const contract = await Contract.findById(contractId).select('ownerId participants').lean();
        if (!contract) return;
        const isParticipant =
          String(contract.ownerId) === socket.userId ||
          contract.participants.some((p) => String(p.userId) === socket.userId);
        if (!isParticipant) {
          logger.warn('Socket join rejected — not a participant', { contractId, userId: socket.userId });
          return;
        }
      } catch {
        return; // DB error — fail closed
      }

      socket.join(`contract:${contractId}`);
      if (!socket.contractIds) socket.contractIds = new Set();
      socket.contractIds.add(contractId);
      // Broadcast updated online list to everyone in this contract room
      const room = io.sockets.adapter.rooms.get(`contract:${contractId}`);
      const onlineUserIds = room
        ? [...room].map((sid) => io.sockets.sockets.get(sid)?.userId).filter(Boolean)
        : [];
      io.to(`contract:${contractId}`).emit('presence:update', { contractId, onlineUserIds });
      logger.debug('Socket joined contract room', { contractId, userId: socket.userId });
    });

    socket.on('contract:leave', ({ contractId }) => {
      if (!contractId) return;
      socket.leave(`contract:${contractId}`);
      socket.contractIds?.delete(contractId);
      const room = io.sockets.adapter.rooms.get(`contract:${contractId}`);
      const onlineUserIds = room
        ? [...room].map((sid) => io.sockets.sockets.get(sid)?.userId).filter(Boolean)
        : [];
      io.to(`contract:${contractId}`).emit('presence:update', { contractId, onlineUserIds });
    });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { id: socket.id });
      // Notify all contract rooms this socket was in
      if (socket.contractIds?.size) {
        for (const contractId of socket.contractIds) {
          const room = io.sockets.adapter.rooms.get(`contract:${contractId}`);
          const onlineUserIds = room
            ? [...room].map((sid) => io.sockets.sockets.get(sid)?.userId).filter(Boolean)
            : [];
          io.to(`contract:${contractId}`).emit('presence:update', { contractId, onlineUserIds });
        }
      }
    });
  });

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
