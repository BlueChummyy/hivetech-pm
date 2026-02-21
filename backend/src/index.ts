import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/index.js';
import { prisma } from './prisma/client.js';
import { logger } from './utils/logger.js';
import { setSocketIO } from './utils/socket.js';

const app = createApp();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setSocketIO(io);

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected');

  // Join workspace rooms
  socket.on('join:workspace', (workspaceId: string) => {
    socket.join(`workspace:${workspaceId}`);
    logger.debug({ socketId: socket.id, workspaceId }, 'Joined workspace room');
  });

  // Join project rooms
  socket.on('join:project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    logger.debug({ socketId: socket.id, projectId }, 'Joined project room');
  });

  // Join user room (for notifications)
  socket.on('join:user', (userId: string) => {
    socket.join(`user:${userId}`);
  });

  // Leave rooms
  socket.on('leave:workspace', (workspaceId: string) => {
    socket.leave(`workspace:${workspaceId}`);
  });
  socket.on('leave:project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
  });

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
