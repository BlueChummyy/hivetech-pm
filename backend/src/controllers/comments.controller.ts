import type { Request, Response } from 'express';
import { CommentsService } from '../services/comments.service.js';

const commentsService = new CommentsService();

export class CommentsController {
  async create(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call commentsService.create, return comment
    res.status(501).json({ message: 'Not implemented' });
  }

  async list(req: Request, res: Response): Promise<void> {
    // TODO: Parse query params (taskId), call commentsService.listByTask
    res.status(501).json({ message: 'Not implemented' });
  }

  async update(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call commentsService.update, return comment
    res.status(501).json({ message: 'Not implemented' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    // TODO: Call commentsService.softDelete
    res.status(501).json({ message: 'Not implemented' });
  }
}
