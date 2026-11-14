# OpenTodo API reference (for the board skill)

Base: `{BOARD_URL}/api` (default `https://opentodo-jet.vercel.app/api`).

## Auth

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/login` | public | `{ "username", "password" }` → sets `ot_session` cookie |
| POST | `/logout` | public | clears cookie |
| GET | `/me` | cookie | `{ "user": { "username" } }` |
| GET | `/health` | public | liveness + `authConfigured` |

All other `/api/*` routes require a valid session cookie.

## Issues

| Method | Path | Notes |
|--------|------|-------|
| GET | `/issues?page=&limit=&search=&status=&project_id=` | list |
| POST | `/issues` | create: title, description, status, priority, project_id, due_date |
| GET | `/issues/:id` | detail + labels + comments |
| PUT | `/issues/:id` | partial update |
| DELETE | `/issues/:id` | delete |
| POST | `/issues/:id/labels` | `{ "label_id" }` |
| DELETE | `/issues/:id/labels/:lid` | remove label |
| GET/POST | `/issues/:id/comments` | list / `{ "content" }` |

Statuses: `backlog`, `todo`, `in_progress`, `done`, `cancelled`.  
Priorities: `none`, `low`, `medium`, `high`, `urgent`.

## Projects / labels / stats

| Method | Path |
|--------|------|
| GET | `/projects`, `/projects/all` |
| POST/PUT/DELETE | `/projects`, `/projects/:id` |
| GET | `/labels`, `/labels/all` |
| POST/PUT/DELETE | `/labels`, `/labels/:id` |
| GET | `/stats` |

OpenAPI dump: `GET /api/openapi.json` (may be public depending on deploy; prefer this skill’s CLI).

## Cookie jar

`board.mjs` stores `{ "ot_session": "…" }` in `BOARD_COOKIE_JAR` (default `/tmp/opentodo-board-cookies.json`).
