# SPEC — Página de projeto (doc + issues + activities)

**Status:** implemented (v1 UI+API 2026-11-14)  
**Projeto board:** API Todo  
**App:** OpenTodo (Preact + Hono + Turso)  
**Data:** 2026-11-14

## 1. Objetivo

Substituir a experiência “só lista de projetos” por uma **página de projeto** que reúne:

1. **Painel de documentação** — descrição do projeto, editável, apresentada como bloco de doc/label (não como formulário permanente).
2. **Lista de issues** do projeto.
3. **Painel da issue selecionada** — descrição + **activities** (histórico e comentários).

Referência visual (ASCII aprovado):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Projetos                                                                 │
│  🔌 API Todo                                          [status ▾] [priority] │
│  lead · status · N issues                                                   │
├──────────────────────────────────┬───────────────────────────────────────────┤
│  DOCUMENTAÇÃO                    │  ISSUES                          [+ New] │
│  (view = doc/label; edit = box)  │  lista filtrada por project_id           │
│                                  │  ─ selecionada ────────────────────────  │
│                                  │  descrição da issue                      │
│                                  │  Activities (feed)                       │
└──────────────────────────────────┴───────────────────────────────────────────┘
```

Mobile: empilhar Documentação → Issues → Detail/Activities.

## 2. Problema

Hoje:

- `/?view=projects` mostra tabela; não há rota/página de detalhe.
- `projects.description` existe na API/DB mas quase não tem UI de doc.
- Comments existem por issue; não há feed de “activities” (create, status, label, comment).

Sem página de projeto, documentação e trabalho ficam dispersos (README externo vs board).

## 3. Solução

Nova view **`project`** (detalhe):

| Zona | Conteúdo | Fonte |
|------|----------|--------|
| Header | ícone, nome, lead, contagem, status, priority; voltar à lista | `GET /api/projects/:id` (novo ou expandir) |
| Esquerda ~36% | Documentação do projeto | `projects.description` |
| Direita ~64% | Issues do projeto + detalhe + activities | issues filtradas + feed |

## 4. Dentro / fora

### Dentro (v1)

- Navegação: clique no nome do projeto na lista → página de detalhe.
- URL: `/?view=project&id=<projectId>` (e opcional `&issue=<issueId>`).
- Painel Documentação:
  - **View mode:** tipografia de doc (títulos leves, texto contínuo); aparência “label/doc”, não inputs.
  - **Edit mode:** acionado por botão **Editar**; textarea (markdown plain text ok); **Guardar** / **Cancelar**.
  - Persistência: `PUT /api/projects/:id` com `{ description }`.
- Lista de issues: só `project_id` atual; botão **New** pré-preenche o projeto.
- Selecionar issue: mostra descrição + activities à direita (abaixo ou no lugar do empty state).
- Activities v1 (feed unificado, ordem cronológica asc ou desc — default **desc** = mais recente em cima):
  - Comentários existentes (`comments`).
  - Eventos de sistema gravados em nova tabela `activities` (ver §5).
- Auth: mesma sessão cookie; sem mudança de modelo de utilizadores.
- Layout desktop 2 colunas; mobile empilhado.
- Modo `/?agent`: alvos grandes nos botões Editar / New / Add comment (regras CSS atuais).

### Fora (v1)

- Markdown rich preview / WYSIWYG.
- Mentions, anexos, reactions.
- Activities de outros projetos num único feed global.
- Permissões por projeto (qualquer logado edita, como hoje).
- Kanban / board columns nesta página.
- Realtime (SSE/WebSocket).

## 5. Dados e API

### 5.1 Já existe

- `projects.description` TEXT
- `PUT /api/projects/:id` aceita `description`
- `GET /api/issues?project_id=`
- `GET /api/issues/:id` com `comments`
- Comments CRUD

### 5.2 Novo — `GET /api/projects/:id`

Resposta:

```json
{
  "project": { /* ProjectSchema + issue_count */ }
}
```

Hoje só há list/all/update/delete; falta get por id para a página.

### 5.3 Novo — tabela `activities`

```sql
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,          -- created | status_changed | priority_changed
                               -- label_added | label_removed | commented
  actor TEXT NOT NULL DEFAULT '',  -- estevao | thiago | agent | ''
  summary TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '{}', -- JSON opcional (from/to, label name, …)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activities_issue ON activities(issue_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id, created_at);
```

### 5.4 Endpoints activities

| Método | Path | Notas |
|--------|------|--------|
| GET | `/api/issues/:id/activities` | feed da issue (inclui comments materializados **ou** só rows `activities` se comment também gravar activity) |
| GET | `/api/projects/:id/activities` | opcional v1.1 — feed do projeto inteiro |

**Regra v1:** cada comentário cria também uma row `activities` (`kind=commented`, `summary` = preview do texto). Mudanças de status/priority/labels/create gravam activity no mesmo request do handler existente.

**Actor:** do cookie de sessão (`c.get("user").username`); operações via CLI usam o user logado. Prefixo `[agent]` no comment continua na UI; `actor` pode ser `agent` se o body começar com `[agent]` **ou** se `BOARD_USER`/sessão for mapeada — v1 simples: `actor = session.username`.

### 5.5 CLI skill

Estender `board.mjs` (fora do caminho crítico da UI, mas desejável no mesmo lote ou follow-up):

- `get-project <id|name>`
- `project-update <id|name> --description "…"`
- `activities TASK-n`

## 6. UI — comportamento

### 6.1 Header

- Botão ← volta a `view=projects`.
- Nome + ícone (nome editável inline opcional — **não obrigatório v1**; editar nome pode ficar na lista).
- Dropdowns status / priority (reutilizar padrão da lista atual).
- Meta: `lead` · contagem de issues.

### 6.2 Documentação (esquerda)

- Título da secção: **Documentação**.
- Empty state: “Sem documentação. Editar para adicionar objetivo, links e notas.”
- View: whitespace preservado (`white-space: pre-wrap`) ou quebras por linha; sem chrome de input.
- Edit: textarea full width da coluna; Guardar chama API; erro via `ErrorBanner` existente.

### 6.3 Issues (direita)

- Toolbar: “Issues” + count + New.
- Rows compactas: identifier, title, priority, status, labels.
- Click seleciona; URL atualiza `issue=`.
- Sem seleção: placeholder “Seleciona uma issue”.
- Com seleção:
  1. Título + badges
  2. Descrição da issue (read-only nesta página v1; edição continua no fluxo de issue detail atual **ou** link “Abrir detalhe completo” — **decisão:** nesta página a descrição da issue é **read-only**; edição de campos da issue via dropdowns status/priority + comments. Edição longa da description da issue fica no IssueDetail existente se o utilizador abrir a issue na view issues.)
  
**Decisão fechada v1:** na página de projeto, description da issue é read-only; activities + comment + mudanças rápidas de status/priority/labels. Doc editável = só a do **projeto**.

### 6.4 Activities

- Lista: timestamp · actor · summary.
- Kinds com ícone/texto distinto (created, status, label, comment).
- No fim (ou topo, se desc): input “Add comment” → `POST .../comments` (+ activity).

## 7. Critérios de aceite

| # | Critério | Como verificar |
|---|----------|----------------|
| A1 | Abrir projeto pela lista vai a `view=project&id=` | Manual / smoke UI |
| A2 | Doc do projeto: ver → editar → guardar → refresh mantém texto | Manual + `GET` project |
| A3 | Lista mostra só issues daquele `project_id` | Comparar com `pnpm board -- issues --project "API Todo"` |
| A4 | Selecionar issue mostra description + activities | UI |
| A5 | Novo comment aparece no feed activities | UI + `GET .../activities` |
| A6 | Mudar status da issue gera activity `status_changed` | UI + API |
| A7 | Sem sessão → login (comportamento atual) | Já coberto |
| A8 | Mobile: colunas empilham sem overflow horizontal destrutivo | Resize / viewport estreito |
| A9 | `/?agent` mantém botões grandes nos CTAs da página | Visual |

## 8. Implementação sugerida (ficheiros)

| Área | Ficheiros |
|------|-----------|
| Schema | `src/server/schema.sql` + migrate/scripts |
| API | `src/server/index.ts` — get project, activities, hooks nos handlers |
| UI | `src/client/components/project-page.tsx` (novo), ajustes `app.tsx`, `project-list.tsx`, `types.ts`, `styles.css`, `use-app.ts` |
| Skill | `skills/opentodo-board/…` (opcional mesmo PR) |

## 9. Riscos / dívidas

| Risco | Mitigação |
|-------|-----------|
| Activities históricas vazias (dados antigos) | Feed começa vazio + comments existentes podem ser backfill one-shot opcional |
| Description longa na coluna esquerda | Scroll interno na coluna doc |
| Duplicar IssueDetail | Aceitar read-only description na project page (decisão §6.3) |

## 10. Próximo passo

1. Humano valida esta spec (`draft` → aceite).
2. Implementar lote UI+API activities.
3. Smoke em produção no projeto **API Todo**.
