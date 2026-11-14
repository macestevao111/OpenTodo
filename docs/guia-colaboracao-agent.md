# Guia: dois usuários + Agent no OpenTodo

Board ao vivo: https://opentodo-jet.vercel.app  
Modo Agent (UI): https://opentodo-jet.vercel.app/?agent  
API base: `https://opentodo-jet.vercel.app/api`

> O board está **aberto sem senha**. Trate a URL como semi-privada.

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

## Convidar o Thiago (código + board)

1. GitHub → `macestevao111/OpenTodo` → **Settings → Collaborators** → convidar.
2. Mandar a URL do board (e `/?agent` se ele também for usar Agent).
3. Código: branches/PRs; demandas: issues no board compartilhado (mesmo Turso).

## Como o Agent “define demandas automaticamente”

Há três jeitos. O mais estável no Cursor é o **B**.

### A) UI Agent (browser)

1. Abrir https://opentodo-jet.vercel.app/?agent  
2. Pedir ao Agent de browser (OpenClaw, Browser Use, etc.) para criar issues/projetos pelos botões grandes.  
3. Bom para demos; mais frágil que a API.

### B) API REST (recomendado no Cursor)

O Agent chama HTTP no mesmo origin/produção. Exemplos:

```bash
# Criar projeto
curl -sS -X POST https://opentodo-jet.vercel.app/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Colab Agent","icon":"🤝","description":"Demandas compartilhadas","lead":"estevao"}'

# Criar demanda
curl -sS -X POST https://opentodo-jet.vercel.app/api/issues \
  -H 'Content-Type: application/json' \
  -d '{"title":"Definir escopo do MVP","description":"…","status":"backlog","priority":"high","project_id":1}'

# Etiquetar dono (depois de saber o id da label)
curl -sS -X POST https://opentodo-jet.vercel.app/api/issues/1/labels \
  -H 'Content-Type: application/json' \
  -d '{"label_id":1}'
```

Endpoints úteis: `/api/stats`, `/api/issues`, `/api/projects`, `/api/labels`, `/api/issues/:id/comments`.  
OpenAPI: `/api/openapi.json`.

### C) Regra no Cursor (este repo)

Arquivo [`.cursor/rules/opentodo-board.mdc`](../.cursor/rules/opentodo-board.mdc): quando o humano pedir para **estruturar / quebrar demandas**, o Agent cria issues no board via API (não só no chat).

Prompt curto que você pode colar:

```text
Estruture as demandas deste trabalho no OpenTodo (https://opentodo-jet.vercel.app).
Crie issues no projeto "Colab Agent", status backlog, prioridade coerente.
Marque dono com label estevao ou thiago. Não invente conclusão — só quebre o trabalho.
Siga .cursor/rules/opentodo-board.mdc.
```

## Seed do projeto “Colab Agent”

No clone local (com rede):

```bash
pnpm seed:colab
# ou: BOARD_URL=https://opentodo-jet.vercel.app node scripts/seed-colab.mjs
```

Isso cria (se ainda não existirem) labels `estevao` / `thiago` / `agent`, o projeto **Colab Agent** e issues iniciais do guia.

## Fluxo diário sugerido

1. Humano descreve o objetivo no Cursor (“quero X com o Thiago”).  
2. Agent quebra em issues no board (`seed` ou regra).  
3. Cada um pega issues com a própria label → `in_progress`.  
4. PR no GitHub fecha o código; issue → `done` + comentário com link do PR.

## Limitações conscientes

- Sem autenticação: qualquer um com a URL edita.  
- Sem assignee nativo: labels fazem o papel de “usuário”.  
- Agent não promove decisão de produto sozinho — só estrutura e registra.
