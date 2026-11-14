# Guia: dois usuários + Agent no OpenTodo

Board ao vivo: https://opentodo-jet.vercel.app  
Modo Agent (UI): https://opentodo-jet.vercel.app/?agent  
API base: `https://opentodo-jet.vercel.app/api`

> Login obrigatório: `estevao` ou `thiago` (senhas em `AUTH_USERS` na Vercel). Cookie HttpOnly.

## Modelo mínimo (sem login)

O OpenTodo não tem contas. Para dois humanos + um Agent:

| Papel | Como representar |
|-------|------------------|
| Você | label `estevao` (azul) |
| Thiago | label `thiago` (verde) |
| Agent | label `agent` (roxo); comentários com prefixo `[agent]` |
| Projeto | um **Project** agrupa as demandas (ex.: “Colab Agent”) |

Convencão de demanda:

1. Agent (ou humano) cria a **issue** no projeto.
2. Coloca label de dono (`estevao` ou `thiago`).
3. Status: `backlog` → `todo` → `in_progress` → `done`.
4. Discussão nos **comments** (`[estevao] …`, `[thiago] …`, `[agent] …`).

### Formato da description (obrigatório)

Tom de sênior: breve, concreto, sem preâmbulo.

```
Problema: <o que está errado ou em falta>
Solução: <o resultado desejado, em uma frase>
Como:
1. <passo concreto>
2. <passo concreto>
3. <passo concreto>
```

Passos apontam comando, URL, arquivo ou ação na UI — não princípios abstratos.

## Convidar o amigo (código + board)

1. GitHub → `macestevao111/OpenTodo` → **Settings → Collaborators** → convidar.
2. Mandar a URL do board (e `/?agent` se ele também for usar Agent).
3. Código: branches/PRs; demandas: issues no board compartilhado (mesmo Turso).

## Como o Agent “define demandas automaticamente”

**Canónico:** skill [`skills/opentodo-board/`](../skills/opentodo-board/SKILL.md) (API + CLI). Espelhada em `.cursor/skills/`, `.claude/skills/`, `.agents/skills/`. Ver [`AGENTS.md`](../AGENTS.md).

```bash
export BOARD_URL=https://opentodo-jet.vercel.app
export BOARD_USER=estevao   # ou thiago
export BOARD_PASS='…'
pnpm board -- login
pnpm board -- create --title "…" --description "Problema: …"$'\n'"Solução: …"$'\n'"Como:"$'\n'"1. …" \
  --project "Colab Agent" --labels estevao
pnpm board -- issues --project "Colab Agent"
```

UI `/?agent` continua útil para demos no browser; para agentes de código use só a skill/CLI.

Prompt curto:

```text
Estruture as demandas deste trabalho no OpenTodo.
Use a skill opentodo-board (pnpm board). Projeto Colab Agent.
Description Problema / Solução / Como. Labels estevao ou thiago.
```

## Seed do projeto “Colab Agent”

No clone local (com rede):

```bash
pnpm seed:colab
# ou: BOARD_URL=https://opentodo-jet.vercel.app node scripts/seed-colab.mjs
```

Isso cria (se ainda não existirem) labels `estevao` / `amigo` / `agent`, o projeto **Colab Agent** e issues iniciais do guia.

## Fluxo diário sugerido

1. Humano descreve o objetivo no Cursor (“quero X com o amigo”).  
2. Agent quebra em issues no board (`seed` ou regra).  
3. Cada um pega issues com a própria label → `in_progress`.  
4. PR no GitHub fecha o código; issue → `done` + comentário com link do PR.

## Limitações conscientes

- Sem autenticação: qualquer um com a URL edita.  
- Sem assignee nativo: labels fazem o papel de “usuário”.  
- Agent não promove decisão de produto sozinho — só estrutura e registra.
