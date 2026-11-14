# OpenTodo (Vercel + Turso)

Fork of [clawnify/OpenTodo](https://github.com/clawnify/OpenTodo) adapted to run on **Vercel Hobby (free)** with **Turso Free** as the SQLite database.

- **Produção:** https://opentodo-jet.vercel.app  
- **Agent mode:** https://opentodo-jet.vercel.app/?agent  
- **Repo:** https://github.com/macestevao111/OpenTodo  

> **Auth:** login com `estevao` ou `thiago` (cookie HttpOnly). Sem sessão → API 401.

## Stack

| Layer | Tech |
|-------|------|
| UI | Preact + Vite |
| API | Hono (Vercel Function) |
| DB | Turso (libSQL over HTTP) |

## Custo alvo

- Vercel Hobby: free
- Turso Free: free (sem cartão no plano free)
- Clawnify **não** é usado neste fork

## Quickstart local

Pré-requisitos: Node 20+, pnpm, conta [Turso](https://turso.tech).

```bash
git clone https://github.com/macestevao111/OpenTodo.git
cd OpenTodo
pnpm install
cp .env.example .env
# preencha TURSO_* , AUTH_SECRET e AUTH_USERS=estevao:…,thiago:…
pnpm db:migrate
pnpm dev
```

- UI: http://localhost:5174 (ou a porta do Vite)
- API: http://localhost:8787
- Modo Agent: http://localhost:5174/?agent

## Turso (uma vez)

```bash
# instalar CLI: https://docs.turso.tech/cli
turso auth login
turso db create opentodo
turso db show opentodo --url
turso db tokens create opentodo
```

Cole URL e token no `.env`, depois `pnpm db:migrate`.

## Deploy Vercel

```bash
npx vercel link
npx vercel env add TURSO_DATABASE_URL
npx vercel env add TURSO_AUTH_TOKEN
npx vercel env add AUTH_SECRET
npx vercel env add AUTH_USERS   # estevao:senha,thiago:senha
npx vercel --prod
```

Ou conecte o repo no dashboard da Vercel e configure as mesmas env vars (Production + Preview).

### Login via curl (Agent / scripts)

```bash
curl -sS -c /tmp/ot.txt -b /tmp/ot.txt -X POST https://opentodo-jet.vercel.app/api/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"estevao","password":"…"}'
curl -sS -c /tmp/ot.txt -b /tmp/ot.txt https://opentodo-jet.vercel.app/api/me
```

## Colaboração com um amigo

1. No GitHub: **Settings → Collaborators** → convidar o amigo no repo `macestevao111/OpenTodo`.
2. Compartilhar a URL de produção da Vercel (e `/?agent` se forem alimentar issues via Agent).
3. Código em paralelo via branches/PRs; issues no board compartilhado (mesmo Turso).

## Agent mode

Append `?agent` à URL para UI com alvos maiores e deletes explícitos (útil para browser agents).

## Dois usuários + Agent

Guia: [docs/guia-colaboracao-agent.md](docs/guia-colaboracao-agent.md).  
Skill portátil (Cursor / Claude / Codex / Gemini): [skills/opentodo-board/SKILL.md](skills/opentodo-board/SKILL.md).

```bash
export BOARD_USER=estevao BOARD_PASS='…'
pnpm board -- login
pnpm board -- issues --project "Colab Agent"
```

### Google Drive MD (viewer imbutido)

1. Criar service account no Google Cloud e partilhar uma pasta do Drive com o e-mail da SA (Editor).
2. Env: `GOOGLE_SERVICE_ACCOUNT_JSON` (JSON ou base64) + `DRIVE_FOLDER_ID`.
3. Citar nos textos: `[spec](gdrive:FILE_ID)` — clique abre modal markdown-it (só leitura).
4. Upload: `pnpm board -- drive-upload --name foo.md --file ./foo.md`

```bash
pnpm seed:colab   # cria labels estevao/amigo/agent, projeto "Colab Agent" e issues iniciais
```

No Cursor, ative a regra `.cursor/rules/opentodo-board.mdc` e peça para estruturar demandas — o Agent grava issues na API do board.
