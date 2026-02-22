# Backend Audit Report

**Project:** HiveTech Project Management Tool
**Date:** 2026-02-21
**Auditor:** Backend Engineer (AI-assisted)
**Scope:** `backend/` directory -- Express.js/TypeScript/Prisma API server

---

## Architecture Overview

| Component       | Technology                        |
|-----------------|-----------------------------------|
| Framework       | Express.js v5                     |
| Language        | TypeScript 5.6+                   |
| Runtime         | Node.js 20 (Alpine Docker)        |
| ORM             | Prisma 6 + PostgreSQL             |
| Auth            | JWT (access + refresh tokens)     |
| Real-time       | Socket.IO 4.7                     |
| Validation      | Zod                               |
| Logging         | Pino                              |
| File Uploads    | Multer                            |

### Entry Points
- `src/index.ts` -- HTTP server + Socket.IO setup + graceful shutdown
- `src/app.ts` -- Express app factory with middleware + route mounting

### Route Modules (all under `/api/v1/`)
| Route File               | Base Path         | Auth Required |
|--------------------------|-------------------|---------------|
| `auth.routes.ts`         | `/auth`           | Partial       |
| `users.routes.ts`        | `/users`          | Yes           |
| `workspaces.routes.ts`   | `/workspaces`     | Yes           |
| `projects.routes.ts`     | `/projects`       | Yes           |
| `tasks.routes.ts`        | `/tasks`          | Yes           |
| `comments.routes.ts`     | `/comments`       | Yes           |
| `labels.routes.ts`       | `/labels`         | Yes           |
| `notifications.routes.ts`| `/notifications`  | Yes           |
| `attachments.routes.ts`  | `/attachments`    | Yes           |

---

## Issues Found and Fixed

### CRITICAL

#### 1. Production Dockerfile uses `db push --accept-data-loss`
- **File:** `backend/Dockerfile.prod:42`
- **Severity:** CRITICAL
- **Description:** The production CMD ran `prisma db push --accept-data-loss` which can silently drop columns and destroy production data on every container restart.
- **Fix:** Replaced with `prisma migrate deploy` which applies pending migrations safely.
- **Commit:** `2b2829b`

### HIGH

#### 2. Auth routes had no rate limiting (brute-force vulnerability)
- **File:** `backend/src/routes/auth.routes.ts`
- **Severity:** HIGH
- **Description:** Login, register, and refresh endpoints had no rate limiting, allowing unlimited brute-force attempts against user credentials.
- **Fix:** Added `express-rate-limit` with 20 requests per 15-minute window on auth routes.
- **Commit:** `492e2be`

#### 3. Attachment download path traversal risk
- **File:** `backend/src/services/attachments.service.ts:75-79`
- **Severity:** HIGH
- **Description:** The `getById` method used the `storagePath` from the database directly in `res.download()` without validating it was within the upload directory. A compromised database record could serve arbitrary files.
- **Fix:** Added path resolution and prefix check to ensure `storagePath` stays within `UPLOAD_DIR`.
- **Commit:** `0f51de1`

#### 4. Task update notification sent to wrong user
- **File:** `backend/src/services/tasks.service.ts:223`
- **Severity:** HIGH
- **Description:** When a task's assignee was changed, the notification suppression check compared against `existing.reporterId` (the task creator) instead of the user performing the update. This caused incorrect notification behavior: self-assigning still sent a notification, while a different user reassigning might incorrectly suppress it.
- **Fix:** Added `updatedByUserId` parameter to the `update` method and use it for the notification check.
- **Commit:** `1a71a0c`

### MEDIUM

#### 5. Notification mark-read and delete silently succeed on non-existent IDs
- **File:** `backend/src/services/notifications.service.ts:49-67`
- **Severity:** MEDIUM
- **Description:** `markAsRead` and `delete` used `updateMany`/`deleteMany` which return `{ count: 0 }` when the notification doesn't exist or doesn't belong to the user. No 404 error was returned.
- **Fix:** Added existence check with `findFirst` before update/delete, throwing `ApiError.notFound` if missing.
- **Commit:** `97a06da`

#### 6. Workspace delete emitted event before database deletion
- **File:** `backend/src/services/workspaces.service.ts:94-99`
- **Severity:** MEDIUM
- **Description:** `emitToWorkspace('workspace:deleted')` was called before `prisma.workspace.delete()`. If the delete failed (constraint error), clients had already received the deletion event.
- **Fix:** Moved the emit call after the successful database delete.
- **Commit:** `b0f841a`

#### 7. No 404 handler for undefined API routes
- **File:** `backend/src/app.ts`
- **Severity:** MEDIUM
- **Description:** Requests to non-existent routes fell through to the error handler and returned a generic 500 Internal Server Error instead of a proper 404.
- **Fix:** Added explicit 404 route handler before the error handler middleware.
- **Commit:** `bf9f47f`

#### 8. No HTTP request logging
- **File:** `backend/src/app.ts`
- **Severity:** MEDIUM
- **Description:** Despite having Pino configured, no request/response logging middleware was in place. All HTTP traffic was invisible for debugging and monitoring.
- **Fix:** Added `pino-http` middleware with health check endpoint excluded from auto-logging.
- **Commit:** `33f0ad6`

### LOW

#### 9. Redundant parseInt on Zod-coerced query parameters
- **File:** `backend/src/controllers/users.controller.ts:41-42`
- **Severity:** LOW
- **Description:** The validation middleware with `z.coerce.number()` already converts query params to numbers. The controller then called `parseInt()` on the already-numeric values, which unnecessarily converts to string first.
- **Fix:** Cast directly to `number | undefined` since Zod has already done the conversion.
- **Commit:** `3478a41`

#### 10. Unused `uuid` dependency
- **File:** `backend/package.json`
- **Severity:** LOW
- **Description:** The `uuid` and `@types/uuid` packages were listed as dependencies but never imported. The codebase uses Node's built-in `crypto.randomUUID()`.
- **Fix:** Removed both packages.
- **Commit:** `84a7ec7`

---

## Previously Fixed Issues (by other team members)

These issues were identified during the audit but had already been resolved in prior commits:

| Issue | Commit | Description |
|-------|--------|-------------|
| Read-only `req.query` in Express 5 | `9f7b9b7` | Validated query broke due to Express 5 read-only properties |
| Missing `requireRole` middleware was a no-op | `1792669` | Removed misleading middleware that didn't actually enforce roles |
| Unused `generateRefreshToken`/`verifyRefreshToken` | `c09b77b` | Dead code removed |
| Status update/delete didn't verify project ownership | `c36d57d` | statusId now verified against URL project |
| Task listing allowed unauthorized cross-project access | `8b297f7` | Added project membership check |
| Graceful shutdown didn't await `server.close` | `a9a4917` | Fixed async shutdown flow |
| Expired refresh token accumulation | `8d4fab9` | Opportunistic cleanup on refresh |
| Circular dependency detection only 1-level deep | `80c1f13` | Extended to detect transitive cycles |

---

## Items Not Fixed (Out of Scope / Flagged)

### Database Schema Items (flagged for Database Expert)
- No issues identified beyond what the Database Expert has already addressed.

### Potential Improvements (not bugs, not implemented)
- **File upload MIME type validation**: Multer accepts any file type. Consider restricting to allowed MIME types for security.
- **Webhook/event audit logging**: The `ActivityLog` model exists in the schema but is never populated by any service. Consider integrating activity logging for compliance.
- **Token blacklisting**: On logout, all refresh tokens for the user are deleted. Consider implementing access token blacklisting for immediate session invalidation.
- **Pagination cap enforcement**: Some list endpoints don't enforce minimum page values (e.g., page=0 would produce skip=-25).

---

## Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| Critical | 1     | 1     |
| High     | 3     | 3     |
| Medium   | 4     | 4     |
| Low      | 2     | 2     |
| **Total**| **10**| **10**|

All identified issues have been fixed and committed individually with descriptive commit messages.
