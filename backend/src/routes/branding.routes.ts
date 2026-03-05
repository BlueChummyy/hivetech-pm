import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { BrandingController } from '../controllers/branding.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { env } from '../config/index.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router();
const controller = new BrandingController();

async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized('Authentication required'));
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!membership) return next(ApiError.forbidden('Admin access required'));
    next();
  } catch (err) {
    next(err);
  }
}

router.use(authenticate);

// Ensure branding upload directory exists
const brandingUploadDir = path.join(env.UPLOAD_DIR, 'branding');
fs.mkdirSync(brandingUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: brandingUploadDir,
  filename: (_req, file, cb) => {
    const safeName = path.basename(file.originalname);
    const ext = path.extname(safeName);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPEG, SVG, ICO, WebP) are allowed'));
    }
  },
});

// Note: authentication & admin check are applied by the parent admin router

// GET /api/v1/admin/branding
router.get('/', controller.get);

// PUT /api/v1/admin/branding (admin only)
router.put(
  '/',
  requireAdmin,
  validate({
    body: z.object({
      orgName: z.string().max(200).optional(),
      primaryColor: z.string().max(20).optional(),
      loginBackground: z.string().max(50).optional(),
      appBackground: z.string().max(50).optional(),
    }),
  }),
  controller.upsert,
);

// POST /api/v1/admin/branding/logo (admin only)
router.post('/logo', requireAdmin, upload.single('file'), controller.uploadLogo);

// POST /api/v1/admin/branding/favicon (admin only)
router.post('/favicon', requireAdmin, upload.single('file'), controller.uploadFavicon);

export { router as brandingRoutes };
