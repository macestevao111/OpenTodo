# Login cookie (estevao / thiago) — design

**Status:** approved 2026-11-14  
**App:** OpenTodo (Vercel + Turso)

## Goal

Gate the board with a simple login screen. Two users (`estevao`, `thiago`), passwords in Vercel env, session via HttpOnly cookie. API protected except health + login.

## Decisions

- Users: only `estevao` and `thiago` (labels on the board stay separate).
- Passwords: `AUTH_USERS=estevao:pass,thiago:pass` + `AUTH_SECRET` (HMAC).
- Session: cookie `ot_session` (HttpOnly, Secure in prod, SameSite=Lax, ~7 days).
- Endpoints: `POST /api/login`, `POST /api/logout`, `GET /api/me`.
- Protected: all other `/api/*` including OpenAPI.
- Public: `GET /api/health`, `POST /api/login`.
- UI: login form when `/api/me` → 401; sidebar shows user + Logout.
- Out of scope: OAuth, signup, password reset, rate limit, Agent bypass.

## Success

Unauthenticated browser cannot list/create issues. After login as `estevao` or `thiago`, board works as today.
