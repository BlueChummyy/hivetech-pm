# Database Audit Report

**Project:** HiveTech Project Management Tool
**Date:** 2026-02-21
**Auditor:** Database Expert (Claude Opus 4.6)
**ORM:** Prisma 6.x with PostgreSQL
**Schema Location:** `backend/src/prisma/schema.prisma`

---

## Executive Summary

Audited the full data layer including Prisma schema (15 models, 6 enums), 9 service files, seed data, connection configuration, and authorization utilities. Found 8 issues (2 high, 4 medium, 2 low severity). Implemented fixes for all actionable items across 4 commits. Two prior fix commits (bec1fc8, 6402b80) had already addressed many index and onDelete issues.

---

## Audit Scope

| Area | Files Reviewed |
|------|---------------|
| Schema | `backend/src/prisma/schema.prisma` |
| Client | `backend/src/prisma/client.ts` |
| Seed | `backend/src/prisma/seed.ts` |
| Services | `auth`, `tasks`, `projects`, `users`, `comments`, `attachments`, `labels`, `workspaces`, `notifications` |
| Config | `backend/src/config/index.ts` |
| Auth utils | `backend/src/utils/authorization.ts` |

---

## Issues Found & Fixes Applied

### 1. [HIGH] Soft-deleted tasks counted in project task counts

| Field | Value |
|-------|-------|
| **Table/Field** | `tasks.deleted_at` / `projects._count` |
| **File** | `backend/src/services/projects.service.ts` |
| **Description** | `_count: { select: { tasks: true } }` in `list()`, `getById()`, and `create()` counted ALL tasks including soft-deleted ones, inflating displayed counts. |
| **Fix** | Changed to `_count: { select: { tasks: { where: { deletedAt: null } }, members: true } }` in all 3 locations. |
| **Commit** | `d0d3dda` |

### 2. [HIGH] Shallow circular dependency detection

| Field | Value |
|-------|-------|
| **Table/Field** | `task_dependencies` |
| **File** | `backend/src/services/tasks.service.ts:addDependency()` |
| **Description** | Only detected direct A<->B cycles. Transitive cycles (A->B->C->A) were silently allowed, which could cause infinite loops in dependency resolution on the frontend or in any future scheduling logic. |
| **Fix** | Replaced single reverse-lookup with BFS traversal that walks the full `dependedOnBy` chain to detect any path from `taskId` back to `dependsOnTaskId`. |
| **Commit** | `80c1f13` |

### 3. [MEDIUM] Missing index on `task_dependencies.depends_on_task_id`

| Field | Value |
|-------|-------|
| **Table/Field** | `task_dependencies.depends_on_task_id` |
| **File** | `backend/src/prisma/schema.prisma` |
| **Description** | The `dependedOnBy` relation queries use this column for reverse lookups, and the new BFS circular dependency detection traverses it. Without an index, these queries do full table scans. |
| **Fix** | Added `@@index([dependsOnTaskId])` to `TaskDependency` model. Migration: `20260221_add_missing_indexes`. |
| **Commit** | `ad6bb6c` |

### 4. [MEDIUM] Missing composite index on `notifications(user_id, created_at)`

| Field | Value |
|-------|-------|
| **Table/Field** | `notifications.user_id`, `notifications.created_at` |
| **File** | `backend/src/prisma/schema.prisma` |
| **Description** | `NotificationsService.listForUser()` filters by `userId` and sorts by `createdAt desc`. The existing `[userId, isRead]` index helps filtered-read queries but not the primary listing query. |
| **Fix** | Added `@@index([userId, createdAt])` to `Notification` model. Migration: `20260221_add_missing_indexes`. |
| **Commit** | `ad6bb6c` |

### 5. [MEDIUM] No expired refresh token cleanup

| Field | Value |
|-------|-------|
| **Table/Field** | `refresh_tokens.expires_at` |
| **File** | `backend/src/services/auth.service.ts` |
| **Description** | Expired refresh tokens accumulated indefinitely. Only the specific token used in a failed refresh attempt was deleted. Over time this would bloat the table. |
| **Fix** | Added opportunistic `deleteMany` of all expired tokens at the start of each `refresh()` call, leveraging the existing `expiresAt` index. |
| **Commit** | `8d4fab9` |

### 6. [MEDIUM] No migration files for schema changes

| Field | Value |
|-------|-------|
| **Table/Field** | All tables |
| **File** | `backend/src/prisma/migrations/` (was empty) |
| **Description** | The project used `prisma db push` for all schema changes. This is unsafe for production as it can drop columns/data. Migration files provide a reviewable, version-controlled record of schema evolution. |
| **Fix** | Created `backend/src/prisma/migrations/20260221_add_missing_indexes/migration.sql` with idempotent `CREATE INDEX IF NOT EXISTS` statements. Recommend adopting `prisma migrate dev` workflow for future changes. |
| **Commit** | `ad6bb6c` |

### 7. [LOW] `Attachment.size` uses `Int` type

| Field | Value |
|-------|-------|
| **Table/Field** | `attachments.size` |
| **Description** | PostgreSQL `integer` max is ~2.1GB. With the current `MAX_FILE_SIZE` of 10MB this is not a problem, but if the limit is ever raised above 2GB, inserts would fail. |
| **Recommendation** | Consider changing to `BigInt` if file size limits are expected to grow. No fix applied since current config is safe. |

### 8. [LOW] No explicit connection pool configuration

| Field | Value |
|-------|-------|
| **Table/Field** | N/A (Prisma client config) |
| **File** | `backend/src/prisma/client.ts`, `backend/src/config/index.ts` |
| **Description** | PrismaClient uses default pool settings (`connection_limit = num_cpus * 2 + 1`). For production deployments with multiple replicas, this could exhaust PostgreSQL's default `max_connections` (100). |
| **Recommendation** | Add `?connection_limit=5` (or appropriate value) to `DATABASE_URL` in production. No code change needed; this is a deployment configuration concern. |

---

## Previously Fixed Issues (Commits bec1fc8, 6402b80)

These were already addressed before this audit:

| Issue | Severity | Commit |
|-------|----------|--------|
| Missing indexes on 10+ FK columns (WorkspaceMember.userId, ProjectMember.userId, Task.projectId, Task.reporterId, Comment.taskId, Comment.authorId, Attachment.taskId, Label.projectId, ActivityLog.userId, RefreshToken.expiresAt) | High | bec1fc8 |
| Missing `onDelete` constraints on Task.status, Task.assignee, Task.reporter, Task.parent, Comment.author, Attachment.uploadedBy, ActivityLog.user | High | bec1fc8 |
| Subtasks not soft-deleted when parent task is soft-deleted | High | 6402b80 |
| Users list query had no limit cap (unbounded queries) | Medium | 6402b80 |
| Attachments list had no pagination | Medium | 6402b80 |
| Status update/delete did not verify status belonged to URL project | Medium | c36d57d |

---

## Items Verified as Correct

- **Seed data**: Properly uses `upsert` for idempotency; default statuses cover all 4 categories
- **Transaction usage**: Task creation uses `$transaction` for atomic counter increment + task creation
- **Soft-delete consistency**: Tasks and comments both use `deletedAt` pattern; queries correctly filter
- **Pagination**: All list endpoints (tasks, comments, attachments, notifications, users) have pagination with limit caps
- **Authorization**: `requireWorkspaceMember` and `requireProjectMember` correctly check membership with role fallback
- **Password security**: bcrypt with 12 rounds; password hash never included in select projections
- **Prisma client singleton**: Properly cached in `globalForPrisma` for development HMR

---

## Cross-Team Notes

- **Backend Engineer**: The `_count` filter change in `projects.service.ts` returns `{ where: { deletedAt: null } }` which changes the Prisma response type slightly. If any controller code destructures `_count.tasks` as a plain number, it will still work -- Prisma resolves the filtered count to a number at runtime. No controller changes needed.
- **Frontend Engineer**: The project task count values will now be lower (correct) since soft-deleted tasks are excluded. No frontend changes required; the API response shape is unchanged.

---

## Recommendations for Future Work

1. **Adopt `prisma migrate dev` workflow** instead of `prisma db push` for all future schema changes
2. **Add database-level check constraint** on `Task.position` to ensure it is positive
3. **Consider a background job** for expired token cleanup instead of (or in addition to) the opportunistic approach, especially at scale
4. **Add `updatedAt` to `Notification` model** if notification editing or read-state toggling needs audit trails
5. **Add a `deletedAt` index on `comments`** table if comment soft-delete queries become frequent (currently covered by the `taskId` index since most queries filter by task first)
