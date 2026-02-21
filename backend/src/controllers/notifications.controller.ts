import type { Request, Response } from 'express';
import { NotificationsService } from '../services/notifications.service.js';

const notificationsService = new NotificationsService();

export class NotificationsController {
  async list(req: Request, res: Response): Promise<void> {
    // TODO: Parse query params, call notificationsService.listForUser
    res.status(501).json({ message: 'Not implemented' });
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    // TODO: Call notificationsService.markAsRead
    res.status(501).json({ message: 'Not implemented' });
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    // TODO: Call notificationsService.markAllAsRead
    res.status(501).json({ message: 'Not implemented' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    // TODO: Call notificationsService.delete
    res.status(501).json({ message: 'Not implemented' });
  }
}
