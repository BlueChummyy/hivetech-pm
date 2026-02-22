import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { UsersService } from '../services/users.service.js';
import { ApiError } from '../utils/api-error.js';
import { successResponse, paginatedResponse } from '../utils/api-response.js';
import { env } from '../config/index.js';

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
      const { firstName, lastName, avatarUrl } = req.body;
      const user = await usersService.updateProfile(req.user!.id, { firstName, lastName, avatarUrl });
      res.status(200).json(successResponse(user));
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      await usersService.changePassword(req.user!.id, currentPassword, newPassword);
      res.status(200).json(successResponse({ message: 'Password changed successfully' }));
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page as number | undefined;
      const limit = req.query.limit as number | undefined;
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
      // Users can only update their own profile via this endpoint
      if (id !== req.user!.id) {
        throw ApiError.forbidden('You can only update your own profile');
      }
      const { firstName, lastName, avatarUrl } = req.body;
      const user = await usersService.update(id, { firstName, lastName, avatarUrl });
      res.status(200).json(successResponse(user));
    } catch (err) {
      next(err);
    }
  }

  async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw ApiError.badRequest('No file uploaded');

      // Build the URL path for the avatar
      const avatarUrl = `/api/v1/users/me/avatar/${req.file.filename}`;

      // Delete old avatar file if one exists
      const currentUser = await usersService.getById(req.user!.id);
      if (currentUser.avatarUrl && currentUser.avatarUrl.startsWith('/api/v1/users/me/avatar/')) {
        const oldFilename = currentUser.avatarUrl.split('/').pop();
        if (oldFilename) {
          const oldPath = path.join(env.UPLOAD_DIR, 'avatars', oldFilename);
          fs.unlink(oldPath, () => { /* ignore errors */ });
        }
      }

      const user = await usersService.updateProfile(req.user!.id, { avatarUrl });
      res.status(200).json(successResponse(user));
    } catch (err) {
      next(err);
    }
  }

  async removeAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = await usersService.getById(req.user!.id);
      if (currentUser.avatarUrl && currentUser.avatarUrl.startsWith('/api/v1/users/me/avatar/')) {
        const filename = currentUser.avatarUrl.split('/').pop();
        if (filename) {
          const filePath = path.join(env.UPLOAD_DIR, 'avatars', filename);
          fs.unlink(filePath, () => { /* ignore errors */ });
        }
      }

      const user = await usersService.clearAvatar(req.user!.id);
      res.status(200).json(successResponse(user));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      // Users can only delete their own account
      if (id !== req.user!.id) {
        throw ApiError.forbidden('You can only delete your own account');
      }
      await usersService.softDelete(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
