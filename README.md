# OpenTodo (Vercel + Turso)

Fork of [clawnify/OpenTodo](https://github.com/clawnify/OpenTodo) adapted to run on **Vercel Hobby (free)** with **Turso Free** as the SQLite database.

- **Produção:** https://opentodo-jet.vercel.app  
- **Agent mode:** https://opentodo-jet.vercel.app/?agent  
- **Repo:** https://github.com/macestevao111/OpenTodo  

> **Aviso:** o board está **aberto sem senha**. Qualquer pessoa com a URL pode criar e editar issues.

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
# preencha TURSO_DATABASE_URL e TURSO_AUTH_TOKEN
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
npx vercel --prod
```

Ou conecte o repo no dashboard da Vercel e configure as mesmas env vars (Production + Preview).

## Colaboração com um amigo

1. No GitHub: **Settings → Collaborators** → convidar o amigo no repo `macestevao111/OpenTodo`.
2. Compartilhar a URL de produção da Vercel (e `/?agent` se forem alimentar issues via Agent).
3. Código em paralelo via branches/PRs; issues no board compartilhado (mesmo Turso).

## Agent mode

Append `?agent` à URL para UI com alvos maiores e deletes explícitos (útil para browser agents).
