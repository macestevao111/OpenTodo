# Login Cookie Implementation Plan

> **For agentic workers:** implement task-by-task. Steps use checkbox syntax.

**Goal:** Protect OpenTodo with cookie session and a simple login UI for `estevao` / `thiago`.

**Architecture:** HMAC-signed cookie from env users; Hono middleware on `/api/*`; SPA gates on `/api/me`.

**Tech Stack:** Hono, Preact, Node `crypto`, Vercel env.

## Global Constraints

- No new npm deps for auth.
- `credentials: "include"` on all client fetches.
- Fail closed if `AUTH_USERS` / `AUTH_SECRET` missing.

---

### Task 1: Server auth module + routes

**Files:**
- Create: `src/server/auth.ts`
- Modify: `src/server/index.ts`
- Modify: `.env.example`

- [ ] Auth helpers (parse users, sign/verify, cookie name)
- [ ] Middleware + login/logout/me
- [ ] Smoke with curl cookie jar

### Task 2: Client login gate

**Files:**
- Modify: `src/client/api.ts`
- Create: `src/client/components/login.tsx`
- Modify: `src/client/app.tsx`, `hooks/use-app.ts`, `context.tsx`, `sidebar.tsx`, `styles.css`

- [ ] credentials include + 401 handling
- [ ] Login screen + logout in sidebar

### Task 3: Docs + deploy env

**Files:**
- Modify: `README.md`, `docs/guia-colaboracao-agent.md`
- Vercel env + redeploy

- [ ] Document AUTH_* and curl login
- [ ] Set env on Vercel; verify production gate
