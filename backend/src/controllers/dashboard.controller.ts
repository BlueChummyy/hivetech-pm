import type { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { successResponse } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';
import { prisma } from '../prisma/client.js';

const dashboardService = new DashboardService();

export class DashboardController {
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId as string;

      // Verify user is a member of this workspace
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: req.user!.id,
          },
        },
      });
      if (!membership) {
        throw ApiError.forbidden('You are not a member of this workspace');
      }

      const stats = await dashboardService.getStats(workspaceId);
      res.json(successResponse(stats));
    } catch (err) {
      next(err);
    }
  }
}
