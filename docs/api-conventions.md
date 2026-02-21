# HiveTech API Conventions

## Base URL

All API endpoints are prefixed with:

```
/api/v1/
```

The frontend Vite dev server proxies `/api` requests to the backend at `http://localhost:3000`.

---

## Response Shape

All API responses follow a consistent envelope structure.

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 100,
      "totalPages": 4
    }
  }
}
```

- `data` contains the response payload (object or array).
- `meta` is optional and included when the response is paginated.

### Success Response (Single Resource)

```json
{
  "success": true,
  "data": {
    "id": "clxyz123abc",
    "name": "My Task",
    "createdAt": "2026-02-21T10:00:00.000Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Must be a valid email" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ]
  }
}
```

- `error.code` is a machine-readable error identifier (UPPER_SNAKE_CASE).
- `error.message` is a human-readable summary.
- `error.details` is optional and provides field-level validation errors.

---

## HTTP Status Codes

| Code | Meaning | When Used | Error Code(s) |
|------|---------|-----------|----------------|
| 200 | OK | Successful GET, PATCH, PUT | -- |
| 201 | Created | Successful POST that creates a resource | -- |
| 204 | No Content | Successful DELETE | -- |
| 400 | Bad Request | Invalid input or malformed request | `VALIDATION_ERROR`, `BAD_REQUEST` |
| 401 | Unauthorized | Missing or invalid authentication | `UNAUTHORIZED`, `TOKEN_EXPIRED` |
| 403 | Forbidden | Authenticated but insufficient permissions | `FORBIDDEN` |
| 404 | Not Found | Resource does not exist | `NOT_FOUND` |
| 409 | Conflict | Duplicate resource or state conflict | `CONFLICT` |
| 429 | Too Many Requests | Rate limit exceeded | `RATE_LIMITED` |
| 500 | Internal Server Error | Unhandled server error | `INTERNAL_ERROR` |

### Error Code Reference

| Error Code | Description |
|-----------|-------------|
| `VALIDATION_ERROR` | Request body or query params failed Zod validation |
| `BAD_REQUEST` | General bad request (not validation-specific) |
| `UNAUTHORIZED` | No token provided or token is invalid |
| `TOKEN_EXPIRED` | Access token has expired (client should refresh) |
| `FORBIDDEN` | User lacks the required role or permission |
| `NOT_FOUND` | The requested resource was not found |
| `CONFLICT` | Duplicate entry (e.g., email already registered) |
| `RATE_LIMITED` | Too many requests from this IP |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| URL paths | kebab-case, plural nouns | `/api/v1/workspace-members` |
| JSON fields | camelCase | `createdAt`, `taskNumber`, `projectId` |
| Database columns | snake_case | `created_at`, `task_number`, `project_id` |
| Enums | UPPER_SNAKE_CASE | `NOT_STARTED`, `ADMIN`, `HIGH` |
| Query params | camelCase | `?sortBy=createdAt&order=desc` |
| Route params | camelCase | `/workspaces/:workspaceId/projects/:projectId` |

Prisma maps between snake_case database columns and camelCase TypeScript fields automatically via `@map` and `@@map` directives in the schema.

---

## Authentication

### Header Format

```
Authorization: Bearer <access_token>
```

All endpoints require authentication unless explicitly listed as public.

### Public Endpoints (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Log in with email and password |
| POST | `/api/v1/auth/register` | Create a new account |
| POST | `/api/v1/auth/refresh` | Refresh an expired access token |

### Token Refresh

When the client receives a `401` with error code `TOKEN_EXPIRED`, it should:

1. Call `POST /api/v1/auth/refresh` with the refresh token
2. Retry the original request with the new access token
3. If refresh also fails, redirect to the login page

---

## Pagination

### Request Parameters

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `page` | number | 1 | -- | Page number (1-indexed) |
| `limit` | number | 25 | 100 | Items per page |

### Example Request

```
GET /api/v1/tasks?page=2&limit=10
```

### Response Meta

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 2,
      "limit": 10,
      "total": 47,
      "totalPages": 5
    }
  }
}
```

---

## Filtering and Sorting

### Filtering

Filter by field values using query parameters:

```
GET /api/v1/tasks?status=active&priority=HIGH&assigneeId=clxyz123
```

Multiple values for the same field use comma separation:

```
GET /api/v1/tasks?priority=HIGH,MEDIUM
```

### Sorting

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sort` | string | `createdAt` | Field to sort by |
| `order` | string | `desc` | Sort direction: `asc` or `desc` |

```
GET /api/v1/tasks?sort=createdAt&order=desc
GET /api/v1/projects?sort=name&order=asc
```

### Searching

Free-text search across relevant fields:

```
GET /api/v1/tasks?search=login+bug
```

The search parameter performs a case-insensitive partial match against the resource's searchable fields (e.g., task title, description).

---

## Rate Limiting

| Scope | Limit | Window | Description |
|-------|-------|--------|-------------|
| Global | 100 requests | 1 minute | Per IP address |
| Auth endpoints | 10 requests | 1 minute | Per IP address (login, register, refresh) |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708520400
```

When rate limited, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later."
  }
}
```

---

## Resource Endpoints

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Log in with email and password |
| POST | `/auth/register` | Create a new user account |
| POST | `/auth/refresh` | Refresh access token using refresh token |
| POST | `/auth/logout` | Invalidate refresh token |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get current authenticated user profile |
| PATCH | `/users/me` | Update current user profile |
| GET | `/users/:id` | Get a user by ID (public profile) |

### Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workspaces` | Create a new workspace |
| GET | `/workspaces` | List workspaces for current user |
| GET | `/workspaces/:id` | Get workspace details |
| PATCH | `/workspaces/:id` | Update workspace |
| DELETE | `/workspaces/:id` | Delete workspace |
| GET | `/workspaces/:id/members` | List workspace members |
| POST | `/workspaces/:id/members` | Add member to workspace |
| PATCH | `/workspaces/:id/members/:userId` | Update member role |
| DELETE | `/workspaces/:id/members/:userId` | Remove member from workspace |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workspaces/:workspaceId/projects` | Create a project |
| GET | `/workspaces/:workspaceId/projects` | List projects in workspace |
| GET | `/projects/:id` | Get project details |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| GET | `/projects/:id/members` | List project members |
| POST | `/projects/:id/members` | Add member to project |
| PATCH | `/projects/:id/members/:userId` | Update project member role |
| DELETE | `/projects/:id/members/:userId` | Remove project member |
| GET | `/projects/:id/statuses` | List project statuses |
| POST | `/projects/:id/statuses` | Create a project status |
| PATCH | `/projects/:id/statuses/:statusId` | Update a project status |
| DELETE | `/projects/:id/statuses/:statusId` | Delete a project status |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/:projectId/tasks` | Create a task |
| GET | `/projects/:projectId/tasks` | List tasks in project (supports filtering, sorting, search) |
| GET | `/tasks/:id` | Get task details |
| PATCH | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Soft-delete task |
| POST | `/tasks/:id/subtasks` | Create a subtask |
| GET | `/tasks/:id/subtasks` | List subtasks |
| POST | `/tasks/:id/dependencies` | Add a task dependency |
| DELETE | `/tasks/:id/dependencies/:dependencyId` | Remove a task dependency |
| POST | `/tasks/:id/labels` | Add label to task |
| DELETE | `/tasks/:id/labels/:labelId` | Remove label from task |
| POST | `/tasks/bulk` | Bulk update tasks (status, assignee, priority) |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tasks/:taskId/comments` | Create a comment |
| GET | `/tasks/:taskId/comments` | List comments on a task |
| PATCH | `/comments/:id` | Update a comment |
| DELETE | `/comments/:id` | Soft-delete a comment |

### Labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/:projectId/labels` | Create a label |
| GET | `/projects/:projectId/labels` | List labels in project |
| PATCH | `/labels/:id` | Update a label |
| DELETE | `/labels/:id` | Delete a label |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications for current user |
| PATCH | `/notifications/:id` | Mark a notification as read |
| POST | `/notifications/read-all` | Mark all notifications as read |

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tasks/:taskId/attachments` | Upload a file attachment |
| GET | `/attachments/:id/download` | Download an attachment |
| DELETE | `/attachments/:id` | Delete an attachment |

---

## Request Body Conventions

### Creating Resources

Send a JSON body with the required fields:

```json
POST /api/v1/projects/:projectId/tasks
Content-Type: application/json

{
  "title": "Fix login redirect bug",
  "description": "Users are not redirected after login on Safari",
  "priority": "HIGH",
  "assigneeId": "clxyz123abc",
  "statusId": "clxyz456def"
}
```

### Updating Resources

Send only the fields to update (partial update):

```json
PATCH /api/v1/tasks/:id
Content-Type: application/json

{
  "priority": "MEDIUM",
  "assigneeId": null
}
```

Setting a field to `null` explicitly clears it.

### File Uploads

Use `multipart/form-data` for file uploads:

```
POST /api/v1/tasks/:taskId/attachments
Content-Type: multipart/form-data

file: <binary>
```

---

## Date Format

All dates are returned in ISO 8601 format with UTC timezone:

```json
{
  "createdAt": "2026-02-21T10:30:00.000Z",
  "updatedAt": "2026-02-21T14:15:00.000Z"
}
```

Clients should convert to the user's local timezone for display.

---

## Idempotency

- `GET`, `PUT`, `DELETE` are idempotent
- `POST` is not idempotent (creates new resources on each call)
- `PATCH` is idempotent (same partial update applied multiple times yields same result)

---

## CORS

In development, CORS is configured to allow requests from `http://localhost:5173` (the Vite dev server). In production, this should be set to the actual frontend domain via the `CORS_ORIGIN` environment variable.

Allowed methods: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`

Allowed headers: `Content-Type`, `Authorization`
