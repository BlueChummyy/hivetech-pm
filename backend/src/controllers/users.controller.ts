import type { Request, Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service.js';
import { successResponse, paginatedResponse } from '../utils/api-response.js';

const usersService = new UsersService();

export class UsersController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getById(req.user!.id);
      res.status(200).json(successResponse(user));
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { displayName, avatarUrl } = req.body;
      const user = await usersService.updateProfile(req.user!.id, { displayName, avatarUrl });
      res.status(200).json(successResponse(user));
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { oldPassword, newPassword } = req.body;
      await usersService.changePassword(req.user!.id, oldPassword, newPassword);
      res.status(200).json(successResponse({ message: 'Password changed successfully' }));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const result = await usersService.list({ search, page, limit });
      res.status(200).json(paginatedResponse(result.data, result.pagination));
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = await usersService.getById(id);
      res.status(200).json(successResponse(user));
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { displayName, avatarUrl } = req.body;
      const user = await usersService.update(id, { displayName, avatarUrl });
      res.status(200).json(successResponse(user));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await usersService.softDelete(id);
      res.status(200).json(successResponse({ message: 'User deleted successfully' }));
    } catch (err) {
      next(err);
    }
  }
}
