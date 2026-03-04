import type { Request, Response, NextFunction } from 'express';
import { BrandingService } from '../services/branding.service.js';
import { requireWorkspaceMember } from '../utils/authorization.js';
import { successResponse } from '../utils/api-response.js';

const brandingService = new BrandingService();

export class BrandingController {
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId as string;
      await requireWorkspaceMember(workspaceId, req.user!.id);

      const branding = await brandingService.get(workspaceId);
      res.json(successResponse(branding));
    } catch (err) {
      next(err);
    }
  }

  async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId as string;
      await requireWorkspaceMember(workspaceId, req.user!.id, ['OWNER', 'ADMIN']);

      const branding = await brandingService.upsert(workspaceId, req.body);
      res.json(successResponse(branding));
    } catch (err) {
      next(err);
    }
  }

  async uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId as string;
      await requireWorkspaceMember(workspaceId, req.user!.id, ['OWNER', 'ADMIN']);

      if (!req.file) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'No file uploaded' } });
        return;
      }

      const branding = await brandingService.uploadFile(workspaceId, 'logo', req.file);
      res.json(successResponse(branding));
    } catch (err) {
      next(err);
    }
  }

  async uploadFavicon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId as string;
      await requireWorkspaceMember(workspaceId, req.user!.id, ['OWNER', 'ADMIN']);

      if (!req.file) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'No file uploaded' } });
        return;
      }

      const branding = await brandingService.uploadFile(workspaceId, 'favicon', req.file);
      res.json(successResponse(branding));
    } catch (err) {
      next(err);
    }
  }
}
