import type { Request, Response } from 'express';
import { AttachmentsService } from '../services/attachments.service.js';

const attachmentsService = new AttachmentsService();

export class AttachmentsController {
  async upload(req: Request, res: Response): Promise<void> {
    // TODO: Handle multer upload, call attachmentsService.create, return attachment
    res.status(501).json({ message: 'Not implemented' });
  }

  async list(req: Request, res: Response): Promise<void> {
    // TODO: Parse query params (taskId), call attachmentsService.listByTask
    res.status(501).json({ message: 'Not implemented' });
  }

  async getById(req: Request, res: Response): Promise<void> {
    // TODO: Call attachmentsService.getById, return attachment metadata
    res.status(501).json({ message: 'Not implemented' });
  }

  async download(req: Request, res: Response): Promise<void> {
    // TODO: Call attachmentsService.getById, stream file
    res.status(501).json({ message: 'Not implemented' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    // TODO: Call attachmentsService.delete, remove file from storage
    res.status(501).json({ message: 'Not implemented' });
  }
}
