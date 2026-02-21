import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/index.js';
import { prisma } from './prisma/client.js';
import { logger } from './utils/logger.js';

const app = createApp();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected');

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
  });
});

server.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
  });
  await prisma.$disconnect();
  logger.info('Database disconnected');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { io };
