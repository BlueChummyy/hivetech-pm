import type { Request, Response } from 'express';
import { ProjectsService } from '../services/projects.service.js';

const projectsService = new ProjectsService();

export class ProjectsController {
  async create(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call projectsService.create, return project
    res.status(501).json({ message: 'Not implemented' });
  }

  async list(req: Request, res: Response): Promise<void> {
    // TODO: Parse query params (workspaceId), call projectsService.list
    res.status(501).json({ message: 'Not implemented' });
  }

  async getById(req: Request, res: Response): Promise<void> {
    // TODO: Call projectsService.getById, return project
    res.status(501).json({ message: 'Not implemented' });
  }

  async update(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call projectsService.update, return project
    res.status(501).json({ message: 'Not implemented' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    // TODO: Call projectsService.delete
    res.status(501).json({ message: 'Not implemented' });
  }

  async addMember(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call projectsService.addMember
    res.status(501).json({ message: 'Not implemented' });
  }

  async updateMember(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call projectsService.updateMember
    res.status(501).json({ message: 'Not implemented' });
  }

  async removeMember(req: Request, res: Response): Promise<void> {
    // TODO: Call projectsService.removeMember
    res.status(501).json({ message: 'Not implemented' });
  }

  async listStatuses(req: Request, res: Response): Promise<void> {
    // TODO: Call projectsService.listStatuses
    res.status(501).json({ message: 'Not implemented' });
  }

  async createStatus(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call projectsService.createStatus
    res.status(501).json({ message: 'Not implemented' });
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call projectsService.updateStatus
    res.status(501).json({ message: 'Not implemented' });
  }

  async deleteStatus(req: Request, res: Response): Promise<void> {
    // TODO: Call projectsService.deleteStatus
    res.status(501).json({ message: 'Not implemented' });
  }
}
