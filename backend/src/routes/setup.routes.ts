import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { successResponse } from '../utils/api-response.js';
import { hashPassword } from '../utils/password.js';
import { generateAccessToken } from '../utils/token.js';
import { env } from '../config/index.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' } },
});

router.use(setupLimiter);

function computeRefreshExpiry(): Date {
  const raw = env.JWT_REFRESH_EXPIRES_IN;
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(Date.now() + value * multipliers[unit]);
}

// GET /api/v1/setup/status — Check if first-time setup is needed + registration status
router.get(
  '/status',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const userCount = await prisma.user.count();
      let registrationDisabled = false;
      if (userCount > 0) {
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'hidePublicRegistration' } });
        if (setting) {
          registrationDisabled = JSON.parse(setting.value) === true;
        }
      }
      res.json(successResponse({ needsSetup: userCount === 0, registrationDisabled }));
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/setup/complete — Create first admin account + default workspace/project
const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

router.post(
  '/complete',
  validate({ body: setupSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      const passwordHash = await hashPassword(password);
      const refreshTokenValue = crypto.randomUUID();

      const user = await prisma.$transaction(async (tx: any) => {
        // Lock-and-check inside the transaction to prevent race conditions
        const userCount = await tx.user.count();
        if (userCount > 0) {
          throw ApiError.forbidden('Setup has already been completed');
        }

        // Create admin user (first user is always global admin)
        const created = await tx.user.create({
          data: { email, passwordHash, firstName, lastName, isGlobalAdmin: true },
        });

        // Create default workspace
        const workspace = await tx.workspace.create({
          data: {
            name: 'Default',
            slug: 'default',
            description: 'Default workspace',
            members: {
              create: {
                userId: created.id,
                role: 'OWNER',
              },
            },
          },
        });

        // Create default project with statuses
        await tx.project.create({
          data: {
            workspaceId: workspace.id,
            name: 'My First Project',
            key: 'MFP',
            description: 'Default project',
            members: {
              create: {
                userId: created.id,
                role: 'ADMIN',
              },
            },
            statuses: {
              createMany: {
                data: [
                  { name: 'Backlog', color: '#6B7280', category: 'NOT_STARTED', position: 0, isDefault: true },
                  { name: 'Todo', color: '#3B82F6', category: 'NOT_STARTED', position: 1 },
                  { name: 'In Progress', color: '#F59E0B', category: 'ACTIVE', position: 2 },
                  { name: 'In Review', color: '#8B5CF6', category: 'ACTIVE', position: 3 },
                  { name: 'Done', color: '#10B981', category: 'DONE', position: 4 },
                  { name: 'Cancelled', color: '#EF4444', category: 'CANCELLED', position: 5 },
                ],
              },
            },
          },
        });

        // Create refresh token
        await tx.refreshToken.create({
          data: {
            token: refreshTokenValue,
            userId: created.id,
            expiresAt: computeRefreshExpiry(),
          },
        });

        return created;
      });

      const safeUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isActive: true,
          isGlobalAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const accessToken = generateAccessToken({ sub: safeUser.id, email: safeUser.email });

      res.status(201).json(successResponse({
        user: safeUser,
        accessToken,
        refreshToken: refreshTokenValue,
      }));
    } catch (err) {
      next(err);
    }
  },
);

export { router as setupRoutes };
