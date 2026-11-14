# OpenTodo board skill (API + CLI) — design

**Status:** approved 2026-11-14  
**Approach:** B — agentskills.io `SKILL.md` + `scripts/board.mjs`

## Goal

Portable skill for Cursor, Claude Code, Claude, Codex, ChatGPT, Gemini, GPT: read/write demands on OpenTodo via HTTP API (not browser UI).

## Layout

```
skills/opentodo-board/
├── SKILL.md
├── references/api.md
└── scripts/board.mjs
```

Mirrors: `.cursor/skills/`, `.claude/skills/`, `.agents/skills/` (symlinks to canonical).

## CLI

Env: `BOARD_URL`, `BOARD_USER`, `BOARD_PASS`, optional `BOARD_COOKIE_JAR`.

Commands: `login`, `me`, `issues`, `get`, `create`, `update`, `comment`, `label`, `projects`, `labels`.

## Rules

- Description format: Problema / Solução / Como
- No `done` without evidence
- Prefer project Colab Agent
- Owners via labels `estevao` | `thiago` | `agent`
