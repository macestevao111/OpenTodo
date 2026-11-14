---
name: opentodo-board
description: >-
  Read and write OpenTodo demands (issues/projects/labels) via the HTTP API CLI.
  Use when the user asks to structure, list, create, update, or comment on board
  tasks for estevao/thiago collaboration — never invent scope or mark done without evidence.
---

# OpenTodo board (API)

Operate the shared board through **`scripts/board.mjs`** (HTTP + session cookie). Do **not** drive the browser UI.

## When to use

- Estruturar / quebrar / registrar demandas
- Listar ou atualizar issues no OpenTodo
- Comentar ou etiquetar dono (`estevao` | `thiago` | `agent`)

## Setup (env)

```bash
export BOARD_URL=https://opentodo-jet.vercel.app   # or local
export BOARD_USER=estevao                          # or thiago
export BOARD_PASS='…'                              # from AUTH_USERS
# optional: BOARD_COOKIE_JAR=/tmp/ot-cookies.json
```

Credentials live in env / secrets — never commit passwords.

## Workflow

1. `node skills/opentodo-board/scripts/board.mjs login`
2. Read before write: `issues`, `projects`, `labels` as needed
3. Create/update with the description format below
4. Apply owner label
5. Reply in chat with `TASK-n` identifiers and board URL

Prefer project **Colab Agent**. Default new issue `status=backlog`.

## Description format (required)

```
Problema: <o que está errado ou em falta>
Solução: <o resultado desejado, em uma frase>
Como:
1. <passo concreto>
2. <passo concreto>
3. <passo concreto>
```

Senior tone: short, concrete, no preamble.

## Commands

```bash
node skills/opentodo-board/scripts/board.mjs login
node skills/opentodo-board/scripts/board.mjs me
node skills/opentodo-board/scripts/board.mjs issues [--status backlog] [--project "Colab Agent"] [--search …]
node skills/opentodo-board/scripts/board.mjs get TASK-12
node skills/opentodo-board/scripts/board.mjs create --title "…" --description "…" [--priority high] [--project "Colab Agent"] [--labels estevao,thiago]
node skills/opentodo-board/scripts/board.mjs update TASK-12 --status in_progress [--title …] [--description …] [--priority …]
node skills/opentodo-board/scripts/board.mjs comment TASK-12 --body "[agent] …"
node skills/opentodo-board/scripts/board.mjs label TASK-12 --add estevao
node skills/opentodo-board/scripts/board.mjs label TASK-12 --remove thiago
node skills/opentodo-board/scripts/board.mjs projects
node skills/opentodo-board/scripts/board.mjs labels
```

From repo root; if cwd differs, use the absolute path to `board.mjs`.  
Package script: `pnpm board -- <args>` (same CLI).

## Rules

- Always API/CLI — never `/?agent` browser automation for this skill
- Do not mark `done` without evidence (PR link, screenshot, or human confirm)
- Do not invent product scope beyond the user request
- Comments from the agent: prefix `[agent]`
- Details: `references/api.md`

## Tool mirrors

Canonical: `skills/opentodo-board/`. Symlinked for Cursor / Claude Code / Codex:

- `.cursor/skills/opentodo-board`
- `.claude/skills/opentodo-board`
- `.agents/skills/opentodo-board`

Gemini / plain GPT: follow this `SKILL.md` (pointed from `AGENTS.md` / `GEMINI.md`).
