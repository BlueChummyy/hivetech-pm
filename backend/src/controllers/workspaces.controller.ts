import type { Request, Response } from 'express';
import { WorkspacesService } from '../services/workspaces.service.js';

const workspacesService = new WorkspacesService();

export class WorkspacesController {
  async create(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call workspacesService.create, return workspace
    res.status(501).json({ message: 'Not implemented' });
  }

  async list(req: Request, res: Response): Promise<void> {
    // TODO: Call workspacesService.listForUser, return workspaces
    res.status(501).json({ message: 'Not implemented' });
  }

  async getById(req: Request, res: Response): Promise<void> {
    // TODO: Call workspacesService.getById, return workspace
    res.status(501).json({ message: 'Not implemented' });
  }

  async update(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call workspacesService.update, return workspace
    res.status(501).json({ message: 'Not implemented' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    // TODO: Call workspacesService.delete
    res.status(501).json({ message: 'Not implemented' });
  }

  async addMember(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call workspacesService.addMember
    res.status(501).json({ message: 'Not implemented' });
  }

  async updateMember(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call workspacesService.updateMember
    res.status(501).json({ message: 'Not implemented' });
  }

  async removeMember(req: Request, res: Response): Promise<void> {
    // TODO: Call workspacesService.removeMember
    res.status(501).json({ message: 'Not implemented' });
  }
}
