import type { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service.js';
import { successResponse } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';
import { prisma } from '../prisma/client.js';

const searchService = new SearchService();

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, workspaceId } = req.query as { q?: string; workspaceId?: string };

      if (!q || !workspaceId) {
        throw ApiError.badRequest('Both q and workspaceId query parameters are required');
      }

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

      const results = await searchService.search(q, workspaceId, req.user!.id);
      res.json(successResponse(results));
    } catch (err) {
      next(err);
    }
  }
}
