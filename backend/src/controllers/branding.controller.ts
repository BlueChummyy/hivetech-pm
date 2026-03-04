import type { Request, Response, NextFunction } from 'express';
import { BrandingService } from '../services/branding.service.js';
import { successResponse } from '../utils/api-response.js';

const brandingService = new BrandingService();

export class BrandingController {
  async get(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const branding = await brandingService.get();
      res.json(successResponse(branding));
    } catch (err) {
      next(err);
    }
  }

  async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const branding = await brandingService.upsert(req.body);
      res.json(successResponse(branding));
    } catch (err) {
      next(err);
    }
  }

  async uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'No file uploaded' } });
        return;
      }
      const branding = await brandingService.uploadFile('logo', req.file);
      res.json(successResponse(branding));
    } catch (err) {
      next(err);
    }
  }

  async uploadFavicon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'No file uploaded' } });
        return;
      }
      const branding = await brandingService.uploadFile('favicon', req.file);
      res.json(successResponse(branding));
    } catch (err) {
      next(err);
    }
  }
}
