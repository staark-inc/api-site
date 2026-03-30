# Staark API

REST API for the Staark platform — handles authentication, projects, tasks, SSH connections, and API key management.

**Base URL:** `https://api.staark-app.cloud`

---

## Authentication

All protected endpoints require an API key passed as a Bearer token:

```
Authorization: Bearer <your-api-key>
```

Get an API key at `https://api.staark-app.cloud/v1/get-key`.

---

## Rate limits

| Plan  | Limit          | Window  |
|-------|----------------|---------|
| Free  | 500 requests   | 24 h    |
| Pro   | 5 000 requests | 1 min   |

Auth endpoints are limited to **10 requests / 15 min** per IP.  
Rate limit headers are included on every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## Endpoints

### Auth — `/v1/auth`

| Method | Path                    | Auth | Description              |
|--------|-------------------------|------|--------------------------|
| POST   | `/v1/auth/register`     | —    | Create account           |
| POST   | `/v1/auth/login`        | —    | Login, returns JWT       |
| POST   | `/v1/auth/verify-email` | —    | Verify email address     |
| POST   | `/v1/auth/forgot-password` | — | Send reset email         |
| POST   | `/v1/auth/reset-password`  | — | Reset password with token|
| POST   | `/v1/auth/refresh`      | ✓    | Refresh JWT              |
| POST   | `/v1/auth/logout`       | ✓    | Invalidate token         |

### API Keys — `/v1/keys`

| Method | Path               | Auth | Description       |
|--------|--------------------|------|-------------------|
| POST   | `/v1/keys`         | —    | Generate API key  |
| GET    | `/v1/keys/:user_id`| —    | List keys         |
| DELETE | `/v1/keys/:id`     | —    | Revoke key        |

### Projects — `/v1/projects` *(protected)*

| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/v1/projects`              | List all projects        |
| POST   | `/v1/projects`              | Create project           |
| GET    | `/v1/projects/:id`          | Get project by ID        |
| PUT    | `/v1/projects/:id`          | Update project           |
| DELETE | `/v1/projects/:id`          | Delete project           |
| GET    | `/v1/projects/:id/tasks`    | List tasks in project    |
| POST   | `/v1/projects/:id/tasks`    | Create task in project   |

### Tasks — `/v1/tasks` *(protected)*

| Method | Path             | Description   |
|--------|------------------|---------------|
| GET    | `/v1/tasks/:id`  | Get task      |
| PUT    | `/v1/tasks/:id`  | Update task   |
| DELETE | `/v1/tasks/:id`  | Delete task   |

### SSH Connections — `/v1/ssh/connections` *(protected)*

| Method | Path                         | Description           |
|--------|------------------------------|-----------------------|
| GET    | `/v1/ssh/connections`        | List connections      |
| PUT    | `/v1/ssh/connections/:id`    | Create or update      |
| DELETE | `/v1/ssh/connections/:id`    | Delete connection     |
| POST   | `/v1/ssh/connections/sync`   | Bulk sync             |

### Status — `/v1/status`

| Method | Path                     | Description                      |
|--------|--------------------------|----------------------------------|
| GET    | `/v1/status`             | Current platform status          |
| GET    | `/v1/status/history`     | Uptime history (`?days=90`)      |

---

## Error format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Cannot GET /v1/unknown",
    "docs": "https://api.staark-app.cloud"
  }
}
```

Common codes: `NOT_FOUND`, `UNAUTHORIZED`, `RATE_LIMIT_EXCEEDED`, `VALIDATION_ERROR`.

---

## Stack

- **Runtime:** Node.js 20
- **Framework:** Express
- **Database:** MySQL + SQLite
- **Auth:** JWT + bcrypt
- **Email:** Nodemailer
- **Container:** Docker
