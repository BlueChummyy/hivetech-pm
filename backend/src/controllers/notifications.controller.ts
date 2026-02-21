import type { Request, Response, NextFunction } from 'express';
import { NotificationsService } from '../services/notifications.service.js';
import { successResponse, paginatedResponse } from '../utils/api-response.js';

const notificationsService = new NotificationsService();

export class NotificationsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as any;

      const result = await notificationsService.listForUser(req.user!.id, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json(paginatedResponse(result.notifications, result.pagination));
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationsService.markAsRead(req.params.id as string, req.user!.id);
      res.json(successResponse({ id: req.params.id as string, isRead: true }));
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationsService.markAllAsRead(req.user!.id);
      res.json(successResponse({ count: result.count }));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationsService.delete(req.params.id as string, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
