import type { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function setSocketIO(server: SocketIOServer) {
  io = server;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToWorkspace(workspaceId: string, event: string, data: unknown) {
  if (io) io.to(`workspace:${workspaceId}`).emit(event, data);
}

export function emitToProject(projectId: string, event: string, data: unknown) {
  if (io) io.to(`project:${projectId}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: unknown) {
  if (io) io.to(`user:${userId}`).emit(event, data);
}
