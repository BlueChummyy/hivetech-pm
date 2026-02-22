import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { successResponse } from '../utils/api-response.js';
import { hashPassword } from '../utils/password.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

// ── Middleware: require workspace admin or owner ──────────────────────
async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized('Authentication required'));

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!membership) {
      return next(ApiError.forbidden('Admin access required'));
    }

    next();
  } catch (err) {
    next(err);
  }
}

router.use(authenticate);
router.use(requireAdmin);

// ── GET /api/v1/admin/users — List all users ─────────────────────────
const listUsersSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

router.get(
  '/users',
  validate({ query: listUsersSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, page = 1, limit = 50 } = req.query as any;
      const skip = ((page as number) - 1) * (limit as number);

      const where: any = { deletedAt: null };
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit as number,
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
          include: {
            workspaceMembers: { select: { role: true, workspace: { select: { id: true, name: true } } } },
            projectMembers: { select: { role: true, project: { select: { id: true, name: true } } } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json(successResponse({
        users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / (limit as number)) },
      }));
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/v1/admin/users — Create a new user ────────────────────
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  workspaceRole: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional().default('MEMBER'),
});

router.post(
  '/users',
  validate({ body: createUserSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName, workspaceRole } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw ApiError.conflict('A user with this email already exists');

      const passwordHash = await hashPassword(password);

      const user = await prisma.$transaction(async (tx: any) => {
        const created = await tx.user.create({
          data: { email, passwordHash, firstName, lastName },
        });

        // Add to all workspaces the admin belongs to
        const adminMemberships = await tx.workspaceMember.findMany({
          where: { userId: req.user!.id, role: { in: ['OWNER', 'ADMIN'] } },
          select: { workspaceId: true },
        });

        for (const m of adminMemberships) {
          await tx.workspaceMember.create({
            data: { workspaceId: m.workspaceId, userId: created.id, role: workspaceRole },
          });
        }

        return created;
      });

      const fullUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          workspaceMembers: { select: { role: true, workspace: { select: { id: true, name: true } } } },
        },
      });

      res.status(201).json(successResponse(fullUser));
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/v1/admin/users/:id/reset-password — Reset user password
const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

router.post(
  '/users/:id/reset-password',
  validate({ body: resetPasswordSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id as string;
      const { newPassword } = req.body;

      const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user) throw ApiError.notFound('User not found');

      const passwordHash = await hashPassword(newPassword);
      await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

      // Revoke all refresh tokens so user must re-login
      await prisma.refreshToken.deleteMany({ where: { userId } });

      res.json(successResponse({ message: 'Password reset successfully' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/v1/admin/users/:id/role — Update user's workspace role
const updateRoleSchema = z.object({
  workspaceId: z.string().min(1),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

router.patch(
  '/users/:id/role',
  validate({ body: updateRoleSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id as string;
      const { workspaceId, role } = req.body;

      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });
      if (!membership) throw ApiError.notFound('User is not a member of this workspace');
      if (membership.role === 'OWNER') throw ApiError.forbidden('Cannot change the role of a workspace owner');

      const updated = await prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId } },
        data: { role },
        include: { user: true, workspace: true },
      });

      res.json(successResponse(updated));
    } catch (err) {
      next(err);
    }
  },
);

export { router as adminRoutes };
