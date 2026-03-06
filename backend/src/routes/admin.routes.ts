import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';
import { successResponse } from '../utils/api-response.js';
import { hashPassword } from '../utils/password.js';
import { queryAuditLogs, logAudit } from '../services/audit.service.js';
import { getSmtpSettings, saveSmtpSettings, getMaskedSmtpSettings } from '../services/settings.service.js';
import { resetTransporter, isEmailConfigured, sendMailOrThrow, verifyConnection } from '../services/email.service.js';
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

      const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });
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

      // Audit log
      const adminMembershipForCreate = await prisma.workspaceMember.findFirst({
        where: { userId: req.user!.id, role: { in: ['OWNER', 'ADMIN'] } },
        select: { workspaceId: true },
      });
      if (adminMembershipForCreate) {
        logAudit({
          workspaceId: adminMembershipForCreate.workspaceId,
          userId: req.user!.id,
          action: 'user_created',
          entityType: 'user',
          entityId: user.id,
          metadata: { email, firstName, lastName, workspaceRole },
        });
      }

      res.status(201).json(successResponse(fullUser));
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/v1/admin/users/:id — Update user fields ────────────────
const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  '/users/:id',
  validate({ body: updateUserSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id as string;
      const { firstName, lastName, email, isActive } = req.body;

      const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user) throw ApiError.notFound('User not found');

      // Check for email conflict if email is being changed
      if (email && email !== user.email) {
        const existing = await prisma.user.findFirst({ where: { email, deletedAt: null, id: { not: userId } } });
        if (existing) throw ApiError.conflict('A user with this email already exists');
      }

      // Build changes object for audit log
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      if (firstName !== undefined && firstName !== user.firstName) changes.firstName = { from: user.firstName, to: firstName };
      if (lastName !== undefined && lastName !== user.lastName) changes.lastName = { from: user.lastName, to: lastName };
      if (email !== undefined && email !== user.email) changes.email = { from: user.email, to: email };
      if (isActive !== undefined && isActive !== user.isActive) changes.isActive = { from: user.isActive, to: isActive };

      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          workspaceMembers: {
            select: { role: true, workspace: { select: { id: true, name: true } } },
          },
        },
      });

      // If deactivating, revoke refresh tokens
      if (isActive === false && user.isActive) {
        await prisma.refreshToken.deleteMany({ where: { userId } });
      }

      // Audit log
      const adminMembership = await prisma.workspaceMember.findFirst({
        where: { userId: req.user!.id, role: { in: ['OWNER', 'ADMIN'] } },
        select: { workspaceId: true },
      });
      if (adminMembership) {
        logAudit({
          workspaceId: adminMembership.workspaceId,
          userId: req.user!.id,
          action: 'user_updated',
          entityType: 'user',
          entityId: userId,
          metadata: { targetUser: `${user.firstName} ${user.lastName}`, changes },
        });
      }

      res.json(successResponse(updated));
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

      // Audit log
      const adminMembershipForReset = await prisma.workspaceMember.findFirst({
        where: { userId: req.user!.id, role: { in: ['OWNER', 'ADMIN'] } },
        select: { workspaceId: true },
      });
      if (adminMembershipForReset) {
        logAudit({
          workspaceId: adminMembershipForReset.workspaceId,
          userId: req.user!.id,
          action: 'password_reset',
          entityType: 'user',
          entityId: userId,
          metadata: { targetUser: `${user.firstName} ${user.lastName}` },
        });
      }

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

      const oldRole = membership.role;
      const updated = await prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId } },
        data: { role },
        include: { user: true, workspace: true },
      });

      logAudit({
        workspaceId,
        userId: req.user!.id,
        action: 'workspace_role_changed',
        entityType: 'user',
        entityId: userId,
        metadata: { oldRole, newRole: role, workspace: updated.workspace.name },
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

      // Get admin workspace for audit before deleting memberships
      const adminMembershipForDelete = await prisma.workspaceMember.findFirst({
        where: { userId: req.user!.id, role: { in: ['OWNER', 'ADMIN'] } },
        select: { workspaceId: true },
      });

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

      if (adminMembershipForDelete) {
        logAudit({
          workspaceId: adminMembershipForDelete.workspaceId,
          userId: req.user!.id,
          action: 'user_deleted',
          entityType: 'user',
          entityId: userId,
          metadata: { targetUser: `${user.firstName} ${user.lastName}`, email: user.email },
        });
      }

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

      // Audit log
      const adminMembershipForDeactivate = await prisma.workspaceMember.findFirst({
        where: { userId: req.user!.id, role: { in: ['OWNER', 'ADMIN'] } },
        select: { workspaceId: true },
      });
      if (adminMembershipForDeactivate) {
        logAudit({
          workspaceId: adminMembershipForDeactivate.workspaceId,
          userId: req.user!.id,
          action: newStatus ? 'user_activated' : 'user_deactivated',
          entityType: 'user',
          entityId: userId,
          metadata: { targetUser: `${user.firstName} ${user.lastName}` },
        });
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
          where: { userId, projectId: { in: projectIds.map((p: { id: string }) => p.id) } },
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

// ── GET /api/v1/admin/spaces — List all spaces across all workspaces ─
router.get(
  '/spaces',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const spaces = await prisma.space.findMany({
        orderBy: { name: 'asc' },
        include: {
          workspace: { select: { id: true, name: true } },
          projects: { select: { id: true, name: true, key: true } },
          _count: { select: { projects: true } },
        },
      });

      res.json(successResponse(spaces));
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/v1/admin/projects — List all projects across all workspaces
router.get(
  '/projects',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await prisma.project.findMany({
        orderBy: { name: 'asc' },
        include: {
          workspace: { select: { id: true, name: true } },
          space: { select: { id: true, name: true } },
          _count: { select: { tasks: { where: { deletedAt: null, closedAt: null } }, members: true } },
        },
      });

      res.json(successResponse(projects));
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/v1/admin/projects/:id/space — Assign/move project to a space
const assignSpaceSchema = z.object({
  spaceId: z.string().nullable(),
});

router.patch(
  '/projects/:id/space',
  validate({ body: assignSpaceSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const { spaceId } = req.body;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw ApiError.notFound('Project not found');

      if (spaceId) {
        const space = await prisma.space.findUnique({ where: { id: spaceId } });
        if (!space) throw ApiError.notFound('Space not found');
      }

      const updated = await prisma.project.update({
        where: { id: projectId },
        data: { spaceId },
        include: {
          workspace: { select: { id: true, name: true } },
          space: { select: { id: true, name: true } },
          _count: { select: { tasks: { where: { deletedAt: null, closedAt: null } }, members: true } },
        },
      });

      res.json(successResponse(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/v1/admin/users/deleted — List soft-deleted users ────────
router.get(
  '/users/deleted',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: {
          workspaceMembers: {
            select: {
              role: true,
              workspace: { select: { id: true, name: true } },
            },
          },
        },
      });

      res.json(successResponse(users));
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/v1/admin/users/:id/restore — Restore a soft-deleted user
router.post(
  '/users/:id/restore',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id as string;

      const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: { not: null } },
      });
      if (!user) throw ApiError.notFound('Deleted user not found');

      await prisma.$transaction(async (tx: any) => {
        // Restore the user
        await tx.user.update({
          where: { id: userId },
          data: { deletedAt: null, isActive: true },
        });

        // Re-add to the admin's workspaces with MEMBER role
        const adminMemberships = await tx.workspaceMember.findMany({
          where: { userId: req.user!.id, role: { in: ['OWNER', 'ADMIN'] } },
          select: { workspaceId: true },
        });

        for (const m of adminMemberships) {
          const existing = await tx.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: m.workspaceId, userId } },
          });
          if (!existing) {
            await tx.workspaceMember.create({
              data: { workspaceId: m.workspaceId, userId, role: 'MEMBER' },
            });
          }
        }
      });

      const restored = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          workspaceMembers: {
            select: { role: true, workspace: { select: { id: true, name: true } } },
          },
        },
      });

      res.json(successResponse(restored));
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/v1/admin/users/:id/hard-delete — Permanently delete user
router.delete(
  '/users/:id/hard-delete',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id as string;

      if (userId === req.user!.id) {
        throw ApiError.forbidden('You cannot delete your own account');
      }

      const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: { not: null } },
      });
      if (!user) throw ApiError.notFound('Deleted user not found. Only soft-deleted users can be permanently deleted.');

      // Permanently delete - cascade will handle related records
      await prisma.user.delete({ where: { id: userId } });

      res.json(successResponse({ message: 'User permanently deleted' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/v1/admin/audit-log — Query audit logs ────────────────────
const auditLogSchema = z.object({
  workspaceId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

router.get(
  '/audit-log',
  validate({ query: auditLogSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await queryAuditLogs(req.query as any);
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/v1/admin/tasks/deleted — List soft-deleted tasks ─────────
router.get(
  '/tasks/deleted',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tasks = await prisma.task.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: 100,
        include: {
          project: { select: { id: true, name: true, key: true, workspaceId: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
          status: { select: { id: true, name: true, color: true } },
        },
      });
      res.json(successResponse(tasks));
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/v1/admin/tasks/:id/restore — Restore a soft-deleted task
router.post(
  '/tasks/:id/restore',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.id as string;
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: { not: null } },
        include: { project: { select: { workspaceId: true } } },
      });
      if (!task) throw ApiError.notFound('Deleted task not found');

      await prisma.task.update({
        where: { id: taskId },
        data: { deletedAt: null },
      });

      logAudit({ workspaceId: task.project.workspaceId, userId: req.user!.id, action: 'restored', entityType: 'task', entityId: taskId, metadata: { title: task.title } });

      res.json(successResponse({ message: 'Task restored successfully' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/v1/admin/tasks/:id/hard-delete — Permanently delete task
router.delete(
  '/tasks/:id/hard-delete',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.id as string;
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: { not: null } },
      });
      if (!task) throw ApiError.notFound('Deleted task not found. Only soft-deleted tasks can be permanently deleted.');

      await prisma.task.delete({ where: { id: taskId } });

      res.json(successResponse({ message: 'Task permanently deleted' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/v1/admin/projects/deleted — List soft-deleted projects ───
router.get(
  '/projects/deleted',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await prisma.project.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: {
          workspace: { select: { id: true, name: true } },
          space: { select: { id: true, name: true } },
          _count: { select: { tasks: { where: { deletedAt: null, closedAt: null } }, members: true } },
        },
      });
      res.json(successResponse(projects));
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/v1/admin/projects/:id/restore — Restore a soft-deleted project
router.post(
  '/projects/:id/restore',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const project = await prisma.project.findFirst({
        where: { id: projectId, deletedAt: { not: null } },
      });
      if (!project) throw ApiError.notFound('Deleted project not found');

      await prisma.project.update({
        where: { id: projectId },
        data: { deletedAt: null },
      });

      logAudit({ workspaceId: project.workspaceId, userId: req.user!.id, action: 'restored', entityType: 'project', entityId: projectId, metadata: { name: project.name } });

      res.json(successResponse({ message: 'Project restored successfully' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/v1/admin/projects/:id/hard-delete — Permanently delete project
router.delete(
  '/projects/:id/hard-delete',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const project = await prisma.project.findFirst({
        where: { id: projectId, deletedAt: { not: null } },
      });
      if (!project) throw ApiError.notFound('Deleted project not found. Only soft-deleted projects can be permanently deleted.');

      await prisma.project.delete({ where: { id: projectId } });

      res.json(successResponse({ message: 'Project permanently deleted' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/v1/admin/spaces/deleted — List soft-deleted spaces ───────
router.get(
  '/spaces/deleted',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const spaces = await prisma.space.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: {
          workspace: { select: { id: true, name: true } },
          _count: { select: { projects: true } },
        },
      });
      res.json(successResponse(spaces));
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/v1/admin/spaces/:id/restore — Restore a soft-deleted space
router.post(
  '/spaces/:id/restore',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const spaceId = req.params.id as string;
      const space = await prisma.space.findFirst({
        where: { id: spaceId, deletedAt: { not: null } },
      });
      if (!space) throw ApiError.notFound('Deleted space not found');

      await prisma.space.update({
        where: { id: spaceId },
        data: { deletedAt: null },
      });

      logAudit({ workspaceId: space.workspaceId, userId: req.user!.id, action: 'restored', entityType: 'space', entityId: spaceId, metadata: { name: space.name } });

      res.json(successResponse({ message: 'Space restored successfully' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/v1/admin/spaces/:id/hard-delete — Permanently delete space
router.delete(
  '/spaces/:id/hard-delete',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const spaceId = req.params.id as string;
      const space = await prisma.space.findFirst({
        where: { id: spaceId, deletedAt: { not: null } },
      });
      if (!space) throw ApiError.notFound('Deleted space not found. Only soft-deleted spaces can be permanently deleted.');

      await prisma.space.delete({ where: { id: spaceId } });

      res.json(successResponse({ message: 'Space permanently deleted' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/v1/admin/settings/app — Get app settings ───────────────
router.get(
  '/settings/app',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await prisma.systemSetting.findMany({
        where: { key: { in: ['hidePublicRegistration'] } },
      });
      const settings: Record<string, any> = { hidePublicRegistration: false };
      for (const row of rows) {
        settings[row.key] = JSON.parse(row.value);
      }
      res.json(successResponse(settings));
    } catch (err) {
      next(err);
    }
  },
);

// ── PUT /api/v1/admin/settings/app — Save app settings ──────────────
const appSettingsSchema = z.object({
  hidePublicRegistration: z.boolean().optional(),
});

router.put(
  '/settings/app',
  validate({ body: appSettingsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updates = req.body;
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          await prisma.systemSetting.upsert({
            where: { key },
            create: { key, value: JSON.stringify(value) },
            update: { value: JSON.stringify(value) },
          });
        }
      }
      res.json(successResponse({ message: 'App settings saved' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/v1/admin/settings/smtp — Get SMTP settings (password masked)
router.get(
  '/settings/smtp',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = getMaskedSmtpSettings();
      res.json(successResponse({
        configured: isEmailConfigured(),
        settings,
      }));
    } catch (err) {
      next(err);
    }
  },
);

// ── PUT /api/v1/admin/settings/smtp — Save SMTP settings ──────────────
const smtpSettingsSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  secure: z.boolean(),
  username: z.string(),
  password: z.string(),
  fromName: z.string(),
  fromEmail: z.string().email().or(z.literal('')),
});

router.put(
  '/settings/smtp',
  validate({ body: smtpSettingsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;

      // If password is masked placeholder, keep existing password
      if (data.password === '********') {
        const existing = getSmtpSettings();
        if (existing) {
          data.password = existing.password;
        }
      }

      saveSmtpSettings(data);
      resetTransporter();

      // Audit log
      const adminMembershipForSmtp = await prisma.workspaceMember.findFirst({
        where: { userId: req.user!.id, role: { in: ['OWNER', 'ADMIN'] } },
        select: { workspaceId: true },
      });
      if (adminMembershipForSmtp) {
        logAudit({
          workspaceId: adminMembershipForSmtp.workspaceId,
          userId: req.user!.id,
          action: 'settings_updated',
          entityType: 'settings',
          entityId: 'smtp',
          metadata: { settingType: 'smtp' },
        });
      }

      res.json(successResponse({ message: 'SMTP settings saved successfully' }));
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/v1/admin/settings/smtp/test — Send test email ───────────
router.post(
  '/settings/smtp/test',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isEmailConfigured()) {
        throw ApiError.badRequest('SMTP is not configured. Save your settings first.');
      }

      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) throw ApiError.notFound('User not found');

      // Reset transporter to pick up latest settings
      resetTransporter();

      try {
        await sendMailOrThrow(
          user.email,
          'SMTP Test - Project Management',
          `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#6366f1;">SMTP Test Successful</h2>
            <p>This is a test email from your Project Management application.</p>
            <p>If you are reading this, your SMTP settings are configured correctly.</p>
            <p style="color:#888;font-size:12px;">Sent at ${new Date().toISOString()}</p>
          </div>
          `,
        );
        res.json(successResponse({ message: `Test email sent to ${user.email}` }));
      } catch (sendErr) {
        const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
        throw ApiError.badRequest(`SMTP test failed: ${msg}`);
      }
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/v1/admin/auth-providers — List all OAuth provider configs ───
router.get(
  '/auth-providers',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const providers = await prisma.oAuthProvider.findMany({
        orderBy: { provider: 'asc' },
      });

      // Mask client secrets in response
      const masked = providers.map((p: any) => ({
        ...p,
        clientSecret: p.clientSecret ? '********' : '',
      }));

      res.json(successResponse(masked));
    } catch (err) {
      next(err);
    }
  },
);

// ── PUT /api/v1/admin/auth-providers — Upsert an OAuth provider config ──
const upsertAuthProviderSchema = z.object({
  provider: z.enum(['GOOGLE', 'MICROSOFT', 'OIDC']),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  tenantId: z.string().optional().nullable(),
  issuerUrl: z.string().optional().nullable(),
  enabled: z.boolean(),
});

router.put(
  '/auth-providers',
  validate({ body: upsertAuthProviderSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider, clientId, clientSecret, tenantId, issuerUrl, enabled } = req.body;

      // If secret is masked, keep existing secret
      let finalSecret = clientSecret;
      if (clientSecret === '********') {
        const existing = await prisma.oAuthProvider.findUnique({ where: { provider } });
        if (existing) {
          finalSecret = existing.clientSecret;
        } else {
          return next(ApiError.badRequest('Client secret is required for new provider'));
        }
      }

      const result = await prisma.oAuthProvider.upsert({
        where: { provider },
        create: {
          provider,
          clientId,
          clientSecret: finalSecret,
          tenantId: tenantId || null,
          issuerUrl: issuerUrl || null,
          enabled,
        },
        update: {
          clientId,
          clientSecret: finalSecret,
          tenantId: tenantId || null,
          issuerUrl: issuerUrl || null,
          enabled,
        },
      });

      // Audit log
      const adminMembershipForAuth = await prisma.workspaceMember.findFirst({
        where: { userId: req.user!.id, role: { in: ['OWNER', 'ADMIN'] } },
        select: { workspaceId: true },
      });
      if (adminMembershipForAuth) {
        logAudit({
          workspaceId: adminMembershipForAuth.workspaceId,
          userId: req.user!.id,
          action: 'settings_updated',
          entityType: 'settings',
          entityId: provider,
          metadata: { settingType: 'auth_provider', provider, enabled },
        });
      }

      res.json(successResponse({
        ...result,
        clientSecret: '********',
      }));
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/v1/admin/auth-providers/:provider — Remove an OAuth provider ──
router.delete(
  '/auth-providers/:provider',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = req.params.provider as string;
      const validProviders = ['GOOGLE', 'MICROSOFT', 'OIDC'];
      if (!validProviders.includes(provider)) {
        return next(ApiError.badRequest('Invalid provider'));
      }

      await prisma.oAuthProvider.deleteMany({ where: { provider: provider as any } });

      res.json(successResponse({ message: `${provider} provider removed` }));
    } catch (err) {
      next(err);
    }
  },
);

export { router as adminRoutes };
