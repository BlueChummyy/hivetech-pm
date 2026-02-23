import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { UsersController } from '../controllers/users.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/index.js';

const router = Router();
const controller = new UsersController();

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

// Avatar upload storage
const avatarDir = path.join(env.UPLOAD_DIR, 'avatars');
fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: avatarDir,
  filename: (_req, file, cb) => {
    const safeName = path.basename(file.originalname);
    const ext = path.extname(safeName);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
    }
  },
});

// Public route: serve avatar files (no auth needed for img tags)
router.get('/me/avatar/:filename', (req, res, next) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(avatarDir, filename);
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(avatarDir);
  if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
    res.status(403).json({ success: false, error: { message: 'Access denied' } });
    return;
  }
  res.sendFile(resolvedPath, (err) => {
    if (err) {
      res.status(404).json({ success: false, error: { message: 'Avatar not found' } });
    }
  });
});

// All remaining user routes require authentication
router.use(authenticate);

// /me routes — must be defined before /:id to avoid conflicts
// GET /api/v1/users/me — Get current user profile
router.get('/me', controller.getMe);

// PATCH /api/v1/users/me — Update own profile
router.patch('/me', validate({ body: updateProfileSchema }), controller.updateMe);

// POST /api/v1/users/me/password — Change own password
router.post('/me/password', validate({ body: changePasswordSchema }), controller.changePassword);

// POST /api/v1/users/me/avatar — Upload avatar image
router.post('/me/avatar', avatarUpload.single('avatar'), controller.uploadAvatar);

// DELETE /api/v1/users/me/avatar — Remove avatar
router.delete('/me/avatar', controller.removeAvatar);

// GET /api/v1/users — List users (with search/filter)
router.get('/', validate({ query: listQuerySchema }), controller.list);

// GET /api/v1/users/:id — Get user by ID
router.get('/:id', validate({ params: userIdParamsSchema }), controller.getById);

// PATCH /api/v1/users/:id — Update user profile
router.patch('/:id', validate({ params: userIdParamsSchema, body: updateProfileSchema }), controller.update);

// DELETE /api/v1/users/:id — Soft delete user
router.delete('/:id', validate({ params: userIdParamsSchema }), controller.delete);

export { router as usersRoutes };
