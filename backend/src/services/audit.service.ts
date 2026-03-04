import { prisma } from '../prisma/client.js';

export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'restored'
  | 'hard_deleted'
  | 'commented'
  | 'comment_deleted'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'cloned'
  | 'closed'
  | 'reopened'
  | 'logged_time'
  | 'deleted_time_entry';

export type AuditEntityType = 'project' | 'task' | 'space' | 'comment' | 'workspace' | 'time_entry';

interface AuditEntry {
  workspaceId: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit entry. Fire-and-forget — never blocks the caller.
 */
export function logAudit(entry: AuditEntry): void {
  prisma.activityLog
    .create({
      data: {
        workspaceId: entry.workspaceId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ?? undefined,
      },
    })
    .catch((err: unknown) => {
      console.error('[audit] Failed to log activity:', err);
    });
}

/**
 * Query audit logs with filtering and pagination.
 */
export async function queryAuditLogs(params: {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  page?: number;
  limit?: number;
}) {
  const { workspaceId, entityType, entityId, userId, action, page = 1, limit = 50 } = params;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (workspaceId) where.workspaceId = workspaceId;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        workspace: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
