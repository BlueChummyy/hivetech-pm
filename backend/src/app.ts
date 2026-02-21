import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { successResponse } from './utils/api-response.js';

// Route imports
import { authRoutes } from './routes/auth.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { workspacesRoutes } from './routes/workspaces.routes.js';
import { projectsRoutes } from './routes/projects.routes.js';
import { tasksRoutes } from './routes/tasks.routes.js';
import { commentsRoutes } from './routes/comments.routes.js';
import { labelsRoutes } from './routes/labels.routes.js';
import { notificationsRoutes } from './routes/notifications.routes.js';
import { attachmentsRoutes } from './routes/attachments.routes.js';

export function createApp() {
  const app = express();

  // Global middleware
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json(successResponse({ status: 'ok', timestamp: new Date().toISOString() }));
  });

  // API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/workspaces', workspacesRoutes);
  app.use('/api/v1/projects', projectsRoutes);
  app.use('/api/v1/tasks', tasksRoutes);
  app.use('/api/v1/comments', commentsRoutes);
  app.use('/api/v1/labels', labelsRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/attachments', attachmentsRoutes);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
