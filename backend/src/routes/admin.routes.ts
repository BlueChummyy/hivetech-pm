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

// ── Middleware: require admin or owner in ANY workspace (global) ─────
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
            workspaceMembers: {
              select: {
                role: true,
                workspace: { select: { id: true, name: true } },
              },
            },
            projectMembers: {
              select: {
                role: true,
                project: { select: { id: true, name: true } },
              },
            },
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
  workspaceRole: z.enum(['ADMIN', 'PROJECT_MANAGER', 'MEMBER', 'VIEWER']).optional().default('MEMBER'),
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

// ── POST /api/v1/admin/users/:id/reset-password ─────────────────────
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
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'MEMBER', 'VIEWER']),
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

// ── DELETE /api/v1/admin/users/:id — Soft-delete a user ─────────────
router.delete(
  '/users/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id as string;

      if (userId === req.user!.id) {
        throw ApiError.forbidden('You cannot delete your own account');
      }

      const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user) throw ApiError.notFound('User not found');

      // Check if user is an owner of any workspace
      const ownerMembership = await prisma.workspaceMember.findFirst({
        where: { userId, role: 'OWNER' },
      });
      if (ownerMembership) {
        throw ApiError.forbidden('Cannot delete a workspace owner. Transfer ownership first.');
      }

      await prisma.$transaction(async (tx: any) => {
        // Soft-delete the user
        await tx.user.update({
          where: { id: userId },
          data: { deletedAt: new Date(), isActive: false },
        });

        // Remove all workspace memberships
        await tx.workspaceMember.deleteMany({ where: { userId } });

        // Remove all project memberships
        await tx.projectMember.deleteMany({ where: { userId } });

        // Revoke all refresh tokens
        await tx.refreshToken.deleteMany({ where: { userId } });
      });

      res.json(successResponse({ message: 'User deleted successfully' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/v1/admin/users/:id/deactivate — Toggle user active ───
router.patch(
  '/users/:id/deactivate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id as string;

      if (userId === req.user!.id) {
        throw ApiError.forbidden('You cannot deactivate your own account');
      }

      const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user) throw ApiError.notFound('User not found');

      const newStatus = !user.isActive;
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: newStatus },
      });

      // If deactivating, revoke refresh tokens so they're logged out
      if (!newStatus) {
        await prisma.refreshToken.deleteMany({ where: { userId } });
      }

      res.json(successResponse({
        message: newStatus ? 'User activated' : 'User deactivated',
        isActive: newStatus,
      }));
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/v1/admin/users/:id/assign-workspace — Add user to workspace ──
const assignWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'MEMBER', 'VIEWER']),
});

router.post(
  '/users/:id/assign-workspace',
  validate({ body: assignWorkspaceSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id as string;
      const { workspaceId, role } = req.body;

      const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user) throw ApiError.notFound('User not found');

      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) throw ApiError.notFound('Workspace not found');

      const existing = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });
      if (existing) throw ApiError.conflict('User is already a member of this workspace');

      const member = await prisma.workspaceMember.create({
        data: { workspaceId, userId, role },
        include: { user: true, workspace: true },
      });

      res.status(201).json(successResponse(member));
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/v1/admin/users/:id/remove-workspace — Remove user from workspace
const removeWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
});

router.post(
  '/users/:id/remove-workspace',
  validate({ body: removeWorkspaceSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id as string;
      const { workspaceId } = req.body;

      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });
      if (!membership) throw ApiError.notFound('User is not a member of this workspace');
      if (membership.role === 'OWNER') throw ApiError.forbidden('Cannot remove a workspace owner');

      await prisma.workspaceMember.delete({
        where: { workspaceId_userId: { workspaceId, userId } },
      });

      // Also remove from projects in that workspace
      const projectIds = await prisma.project.findMany({
        where: { workspaceId },
        select: { id: true },
      });
      if (projectIds.length > 0) {
        await prisma.projectMember.deleteMany({
          where: { userId, projectId: { in: projectIds.map((p) => p.id) } },
        });
      }

      res.json(successResponse({ message: 'User removed from workspace' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/v1/admin/workspaces — List all workspaces ───────────────
router.get(
  '/workspaces',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaces = await prisma.workspace.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { members: true, projects: true } },
          members: {
            where: { role: 'OWNER' },
            select: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
            take: 1,
          },
        },
      });

      res.json(successResponse(workspaces));
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/v1/admin/workspaces/:id — Delete a workspace ─────────
router.delete(
  '/workspaces/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = req.params.id as string;

      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) throw ApiError.notFound('Workspace not found');

      // Cascade delete handles members, but we need to be careful about projects
      await prisma.workspace.delete({ where: { id: workspaceId } });

      res.json(successResponse({ message: 'Workspace deleted successfully' }));
    } catch (err) {
      next(err);
    }
  },
);

export { router as adminRoutes };
