import type { Request, Response } from 'express';
import { UsersService } from '../services/users.service.js';

const usersService = new UsersService();

export class UsersController {
  async list(req: Request, res: Response): Promise<void> {
    // TODO: Parse query params, call usersService.list, return paginated users
    res.status(501).json({ message: 'Not implemented' });
  }

  async getById(req: Request, res: Response): Promise<void> {
    // TODO: Call usersService.getById, return user
    res.status(501).json({ message: 'Not implemented' });
  }

  async update(req: Request, res: Response): Promise<void> {
    // TODO: Validate input, call usersService.update, return updated user
    res.status(501).json({ message: 'Not implemented' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    // TODO: Call usersService.softDelete
    res.status(501).json({ message: 'Not implemented' });
  }
}
