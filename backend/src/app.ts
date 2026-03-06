import express from 'express';
import path from 'node:path';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { env } from './config/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { successResponse } from './utils/api-response.js';
import { logger } from './utils/logger.js';

// Route imports
import { authRoutes } from './routes/auth.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { workspacesRoutes } from './routes/workspaces.routes.js';
import { projectsRoutes } from './routes/projects.routes.js';
import { tasksRoutes } from './routes/tasks.routes.js';
import { commentsRoutes } from './routes/comments.routes.js';
import { labelsRoutes } from './routes/labels.routes.js';
import { notificationsRoutes } from './routes/notifications.routes.js';
import { attachmentsRoutes, taskAttachmentsRoutes } from './routes/attachments.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { taskTemplatesRoutes } from './routes/task-templates.routes.js';
import { brandingRoutes } from './routes/branding.routes.js';
import { searchRoutes } from './routes/search.routes.js';
import { taskTimeEntriesRoutes, timeEntriesRoutes } from './routes/time-entries.routes.js';
import { ssoRoutes } from './routes/sso.routes.js';
import { setupRoutes } from './routes/setup.routes.js';
import { checklistRoutes } from './routes/checklist.routes.js';
import { taskTimerRoutes, timerRoutes } from './routes/timer.routes.js';

export function createApp() {
  const app = express();

  // Trust first proxy (nginx) so express-rate-limit gets real client IPs
  app.set('trust proxy', 1);

  // Global middleware
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Serve uploaded branding assets statically
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

  // Health check
  app.get('/health', (_req, res) => {
    res.json(successResponse({ status: 'ok', timestamp: new Date().toISOString() }));
  });

  // Public branding endpoint (no auth required, for login page)
  app.get('/api/v1/branding', async (_req, res, next) => {
    try {
      const { BrandingService } = await import('./services/branding.service.js');
      const branding = await new BrandingService().get();
      res.json(successResponse(branding));
    } catch (err) {
      next(err);
    }
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
  app.use('/api/v1/tasks/:taskId/attachments', taskAttachmentsRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/task-templates', taskTemplatesRoutes);
  app.use('/api/v1/admin/branding', brandingRoutes);
  app.use('/api/v1/search', searchRoutes);
  app.use('/api/v1/tasks/:taskId/time-entries', taskTimeEntriesRoutes);
  app.use('/api/v1/time-entries', timeEntriesRoutes);
  app.use('/api/v1/auth', ssoRoutes);
  app.use('/api/v1/setup', setupRoutes);
  app.use('/api/v1/tasks/:taskId/checklist', checklistRoutes);
  app.use('/api/v1/tasks/:taskId/timer', taskTimerRoutes);
  app.use('/api/v1/timer', timerRoutes);

  // 404 handler for undefined routes
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
