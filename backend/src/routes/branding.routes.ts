import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { BrandingController } from '../controllers/branding.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/index.js';

const router = Router({ mergeParams: true });
const controller = new BrandingController();

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for branding assets
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPEG, SVG, ICO, WebP) are allowed'));
    }
  },
});

router.use(authenticate);

// GET /api/v1/workspaces/:workspaceId/branding
router.get('/', controller.get);

// PUT /api/v1/workspaces/:workspaceId/branding
router.put(
  '/',
  validate({
    body: z.object({
      orgName: z.string().max(200).optional(),
      primaryColor: z.string().max(20).optional(),
    }),
  }),
  controller.upsert,
);

// POST /api/v1/workspaces/:workspaceId/branding/logo
router.post('/logo', upload.single('file'), controller.uploadLogo);

// POST /api/v1/workspaces/:workspaceId/branding/favicon
router.post('/favicon', upload.single('file'), controller.uploadFavicon);

export { router as brandingRoutes };
