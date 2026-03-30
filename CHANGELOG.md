# Changelog

All notable changes to the Staark API are documented here.  
We follow [Semantic Versioning](https://semver.org/).

---

## [v1.5.0] — 2026-03-31

### Added
- `GET /v1/ssh/connections` — list SSH connections
- `PUT /v1/ssh/connections/:id` — create or update a connection
- `DELETE /v1/ssh/connections/:id` — remove a connection
- `POST /v1/ssh/connections/sync` — bulk sync connections
- New SSH panel in dashboard with full CRUD interface
- Auto-deploy via GitHub `registry_package` webhook on every push to `main`
- CI/CD pipeline with GitHub Actions — build & push to GHCR automatically
- New design system with custom color palette across all public pages

### Fixed
- Corrected endpoint count from 32 to 29 in documentation

---

## [v1.4.2] — 2026-03-04

### Added
- `task.deleted` webhook event
- Webhook payloads now include `actor_id` field

### Fixed
- Fixed pagination on `GET /tasks` returning duplicate items
- `due_date` now correctly accepts ISO 8601 format

---

## [v1.4.1] — 2026-02-18

### Performance
- Optimized `GET /projects` query — up to 40% faster on large datasets

### Added
- `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers on all responses

### Fixed
- API keys are now compared using constant-time comparison

---

## [v1.4.0] — 2026-01-30

### Added
- `POST /webhooks` — register endpoint for real-time events
- HMAC-SHA256 signature verification via `X-Staark-Signature`
- Automatic retry with exponential backoff (Pro only)
- Supported events: `task.created`, `task.updated`, `project.archived`, `member.invited`

---

## [v1.3.0] — 2025-12-12

### Breaking Changes
- Auth header must now use `Bearer` prefix explicitly — plain token no longer accepted
- Pagination response shape changed — `total` moved inside `meta` object

### Added
- Cursor-based pagination on `GET /tasks`

### Removed
- Deprecated `/v0` endpoints
