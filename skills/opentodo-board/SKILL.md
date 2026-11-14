---
name: opentodo-board
description: >-
  Read and write OpenTodo demands (issues/projects/labels) via the HTTP API CLI,
  then refresh ◇ Síntese (project summary + log). Use when structuring, listing,
  creating, or updating board tasks for estevao/thiago — never invent scope or
  mark done without evidence.
---

# OpenTodo board (API) · ◇ Síntese

Operate the shared board through **`scripts/board.mjs`** (HTTP + session cookie). Do **not** drive the browser UI.

**Brand mark:** `◇ Síntese` — painel inferior da página de projeto: resumo gerado pela skill, **editável por humanos**, com log de cada atualização.

## When to use

- Estruturar / quebrar / registrar demandas
- Listar ou atualizar issues no OpenTodo
- Comentar ou etiquetar dono (`estevao` | `thiago` | `agent`)
- Atualizar a **◇ Síntese** de um projeto após mudanças no board

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
2. Read before write: `issues`, `projects`, `get-project`, `labels` as needed
3. Create/update with the description format below
4. Apply owner label
5. **◇ Síntese (obrigatório após writes no projeto):**  
   `synthesize --project "…" --auto`  
   (ou `--body` com resumo sênior curto). Isto grava o painel + entrada no **Log ◇**.
6. Reply in chat with `TASK-n` identifiers, board URL, and note that Síntese was refreshed

Prefer project **Colab Agent** or **API Todo** when relevant. Default new issue `status=backlog`.

## Description format (required for issues)

```
Problema: <o que está errado ou em falta>
Solução: <o resultado desejado, em uma frase>
Como:
1. <passo concreto>
2. <passo concreto>
3. <passo concreto>
```

Senior tone: short, concrete, no preamble.

## ◇ Síntese — rules

- Always refresh after creating/updating/commenting issues **of that project**
- `--auto` builds a factual snapshot from open issues; add `--body` for a human-quality note
- Humans may edit the panel in the UI; do not overwrite human prose without integrating it (read `get-project` first; if `synthesis` looks hand-edited, merge — keep their notes, update the snapshot block)
- Log entries are append-only via API (`kind=synthesis`); never delete the log

## Commands

```bash
node skills/opentodo-board/scripts/board.mjs login
node skills/opentodo-board/scripts/board.mjs me
node skills/opentodo-board/scripts/board.mjs issues [--status backlog] [--project "API Todo"] [--search …]
node skills/opentodo-board/scripts/board.mjs get TASK-12
node skills/opentodo-board/scripts/board.mjs create --title "…" --description "…" [--priority high] [--project "API Todo"] [--labels estevao,thiago]
node skills/opentodo-board/scripts/board.mjs update TASK-12 --status in_progress
node skills/opentodo-board/scripts/board.mjs comment TASK-12 --body "[agent] …"
node skills/opentodo-board/scripts/board.mjs label TASK-12 --add estevao
node skills/opentodo-board/scripts/board.mjs projects
node skills/opentodo-board/scripts/board.mjs get-project "API Todo"
node skills/opentodo-board/scripts/board.mjs project-create --name "API Todo" [--description "…"] [--icon "🔌"]
node skills/opentodo-board/scripts/board.mjs synthesize --project "API Todo" --auto
node skills/opentodo-board/scripts/board.mjs synthesize --project "API Todo" --body "…"
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
