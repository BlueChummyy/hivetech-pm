import type { Request, Response } from 'express';
import { LabelsService } from '../services/labels.service.js';

const labelsService = new LabelsService();

export class LabelsController {
  async create(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call labelsService.create, return label
    res.status(501).json({ message: 'Not implemented' });
  }

  async list(req: Request, res: Response): Promise<void> {
    // TODO: Parse query params (projectId), call labelsService.listByProject
    res.status(501).json({ message: 'Not implemented' });
  }

  async update(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call labelsService.update, return label
    res.status(501).json({ message: 'Not implemented' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    // TODO: Call labelsService.delete
    res.status(501).json({ message: 'Not implemented' });
  }

  async attachToTask(req: Request, res: Response): Promise<void> {
    // TODO: Call labelsService.attachToTask
    res.status(501).json({ message: 'Not implemented' });
  }

  async detachFromTask(req: Request, res: Response): Promise<void> {
    // TODO: Call labelsService.detachFromTask
    res.status(501).json({ message: 'Not implemented' });
  }
}
