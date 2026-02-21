import type { Request, Response } from 'express';
import { TasksService } from '../services/tasks.service.js';

const tasksService = new TasksService();

export class TasksController {
  async create(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call tasksService.create, return task
    res.status(501).json({ message: 'Not implemented' });
  }

  async list(req: Request, res: Response): Promise<void> {
    // TODO: Parse query filters (projectId, statusId, assigneeId, priority), call tasksService.list
    res.status(501).json({ message: 'Not implemented' });
  }

  async getById(req: Request, res: Response): Promise<void> {
    // TODO: Call tasksService.getById, return task with relations
    res.status(501).json({ message: 'Not implemented' });
  }

  async update(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call tasksService.update, return task
    res.status(501).json({ message: 'Not implemented' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    // TODO: Call tasksService.softDelete
    res.status(501).json({ message: 'Not implemented' });
  }

  async addDependency(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call tasksService.addDependency
    res.status(501).json({ message: 'Not implemented' });
  }

  async removeDependency(req: Request, res: Response): Promise<void> {
    // TODO: Call tasksService.removeDependency
    res.status(501).json({ message: 'Not implemented' });
  }

  async updatePosition(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call tasksService.updatePosition
    res.status(501).json({ message: 'Not implemented' });
  }
}
