import http from 'node:http';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/index.js';
import { prisma } from './prisma/client.js';
import { logger } from './utils/logger.js';
import { setSocketIO } from './utils/socket.js';

async function isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return !!member;
}

async function isProjectMemberOrWorkspaceMember(projectId: string, userId: string): Promise<boolean> {
  const projectMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (projectMember) return true;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
  if (!project) return false;
  return isWorkspaceMember(project.workspaceId, userId);
}

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

// JWT authentication middleware for Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; email: string };
    socket.data.userId = payload.sub;
    socket.data.email = payload.email;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id, userId: socket.data.userId }, 'Client connected');

  // Auto-join user's personal room for notifications
  socket.join(`user:${socket.data.userId}`);

  // Join workspace rooms (with membership check)
  socket.on('join:workspace', async (workspaceId: string) => {
    const isMember = await isWorkspaceMember(workspaceId, socket.data.userId);
    if (!isMember) {
      socket.emit('error', { message: 'Not a member of this workspace' });
      return;
    }
    socket.join(`workspace:${workspaceId}`);
    logger.debug({ socketId: socket.id, workspaceId }, 'Joined workspace room');
  });

  // Join project rooms (with membership check)
  socket.on('join:project', async (projectId: string) => {
    const isMember = await isProjectMemberOrWorkspaceMember(projectId, socket.data.userId);
    if (!isMember) {
      socket.emit('error', { message: 'Not a member of this project' });
      return;
    }
    socket.join(`project:${projectId}`);
    logger.debug({ socketId: socket.id, projectId }, 'Joined project room');
  });

  // Leave rooms
  socket.on('leave:workspace', (workspaceId: string) => {
    socket.leave(`workspace:${workspaceId}`);
  });
  socket.on('leave:project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id, userId: socket.data.userId }, 'Client disconnected');
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
