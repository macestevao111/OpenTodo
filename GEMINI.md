# OpenTodo — Gemini

For board demands (list/create/update issues), follow:

**[`skills/opentodo-board/SKILL.md`](skills/opentodo-board/SKILL.md)**

```bash
export BOARD_URL=https://opentodo-jet.vercel.app
export BOARD_USER=estevao   # or thiago
export BOARD_PASS='…'
pnpm board -- login
pnpm board -- issues --project "Colab Agent"
```

API only. Description format: Problema / Solução / Como.
