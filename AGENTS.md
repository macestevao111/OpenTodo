# OpenTodo — agent guidance

## Board skill (demands R/W)

When structuring, listing, creating, or updating demands on the shared board, use the **opentodo-board** skill:

- Canonical: [`skills/opentodo-board/SKILL.md`](skills/opentodo-board/SKILL.md)
- CLI: `pnpm board -- <command>` or `node skills/opentodo-board/scripts/board.mjs <command>`
- API only (no browser). Auth via `BOARD_USER` / `BOARD_PASS`.

Description format: **Problema / Solução / Como**. Do not mark `done` without evidence.

After board writes on a project, refresh **◇ Síntese** (`pnpm board -- synthesize --project "…" --auto`). Humans may edit that panel; merge, don’t blind-overwrite.

## Tool paths

| Tool | Skill path |
|------|------------|
| Cursor | `.cursor/skills/opentodo-board` |
| Claude Code | `.claude/skills/opentodo-board` |
| Codex / ChatGPT | `.agents/skills/opentodo-board` |
| Gemini / plain GPT | read `skills/opentodo-board/SKILL.md` |

## Human guide

[`docs/guia-colaboracao-agent.md`](docs/guia-colaboracao-agent.md)
