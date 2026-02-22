import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client.js';
import { ApiError } from '../utils/api-error.js';

/**
 * Project permissions by role.
 *
 * ADMIN:           Full project access
 * PROJECT_MANAGER: Manage tasks, assign, comment, change status, manage settings
 * TEAM_MEMBER:     View, comment, change status on own tasks
 * VIEWER:          View and comment only
 * GUEST:           View only, no comments
 */

export type ProjectPermission =
  | 'VIEW_TASKS'
  | 'COMMENT'
  | 'CHANGE_TASK_STATUS'
  | 'ASSIGN_TASK'
  | 'ASSIGN_DATE'
  | 'CREATE_TASK'
  | 'EDIT_TASK'
  | 'DELETE_TASK'
  | 'MANAGE_PROJECT';

const ROLE_HIERARCHY: Record<string, number> = {
  ADMIN: 5,
  PROJECT_MANAGER: 4,
  TEAM_MEMBER: 3,
  VIEWER: 2,
  GUEST: 1,
};

const PERMISSION_MIN_ROLE: Record<ProjectPermission, string> = {
  VIEW_TASKS: 'GUEST',
  COMMENT: 'VIEWER',
  CHANGE_TASK_STATUS: 'TEAM_MEMBER',
  CREATE_TASK: 'TEAM_MEMBER',
  EDIT_TASK: 'TEAM_MEMBER',
  DELETE_TASK: 'TEAM_MEMBER',
  ASSIGN_DATE: 'TEAM_MEMBER',
  ASSIGN_TASK: 'PROJECT_MANAGER',
  MANAGE_PROJECT: 'ADMIN',
};

function hasMinRole(userRole: string, requiredRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? Infinity);
}

/**
 * Extracts the projectId from the request.
 * Looks in req.body.projectId, req.params.projectId, or req.query.projectId.
 * For task routes, it may need to look up the task to get the projectId.
 */
async function resolveProjectId(req: Request): Promise<string | null> {
  // Direct projectId in body, params, or query
  if (req.body?.projectId) return req.body.projectId;
  if (req.params?.projectId) return req.params.projectId;
  if (req.query?.projectId) return req.query.projectId as string;

  // For task routes: if there's a task ID param, look up the task's project
  if (req.params?.id) {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { projectId: true },
    });
    if (task) return task.projectId;
  }

  // For comment routes: if there's a taskId in body or query
  const taskId = req.body?.taskId || (req.query?.taskId as string);
  if (taskId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { projectId: true },
    });
    if (task) return task.projectId;
  }

  return null;
}

/**
 * Resolves the user's project role, falling back to workspace role mapping.
 */
async function getUserProjectRole(projectId: string, userId: string): Promise<string | null> {
  // Check direct project membership
  const projectMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (projectMember) return projectMember.role;

  // Fall back to workspace membership
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) return null;

  const wsMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!wsMember) return null;

  // Map workspace roles to project-level access
  if (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN') return 'ADMIN';
  if (wsMember.role === 'MEMBER') return 'TEAM_MEMBER';
  if (wsMember.role === 'VIEWER') return 'VIEWER';

  return null;
}

/**
 * Middleware that checks if the user has the required permission on the project.
 */
export function requireProjectPermission(permission: ProjectPermission) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(ApiError.unauthorized('Authentication required'));
      }

      const projectId = await resolveProjectId(req);
      if (!projectId) {
        return next(ApiError.badRequest('Could not determine project context'));
      }

      const userRole = await getUserProjectRole(projectId, userId);
      if (!userRole) {
        return next(ApiError.forbidden('Not a member of this project'));
      }

      const requiredRole = PERMISSION_MIN_ROLE[permission];
      if (!hasMinRole(userRole, requiredRole)) {
        return next(ApiError.forbidden('Insufficient permissions for this action'));
      }

      // Store role on request for downstream use (e.g. checking own-task restrictions)
      (req as any).projectRole = userRole;
      (req as any).projectId = projectId;

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware to enforce own-task restriction for TEAM_MEMBER role.
 * TEAM_MEMBERs can only change status/dates on tasks assigned to them.
 * PROJECT_MANAGER+ can modify any task.
 */
export function requireOwnTaskOrManager() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userRole = (req as any).projectRole as string;
      const userId = req.user?.id;

      // PROJECT_MANAGER+ can modify any task
      if (hasMinRole(userRole, 'PROJECT_MANAGER')) {
        return next();
      }

      // TEAM_MEMBER can only modify their own assigned tasks
      if (userRole === 'TEAM_MEMBER' && req.params?.id) {
        const task = await prisma.task.findFirst({
          where: { id: req.params.id, deletedAt: null },
          select: { assigneeId: true, reporterId: true },
        });
        if (task && (task.assigneeId === userId || task.reporterId === userId)) {
          return next();
        }
        return next(ApiError.forbidden('You can only modify tasks assigned to you'));
      }

      return next(ApiError.forbidden('Insufficient permissions'));
    } catch (err) {
      next(err);
    }
  };
}
