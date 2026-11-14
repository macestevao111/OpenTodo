#!/usr/bin/env node
/**
 * Seeds two "users" (labels), the Colab Agent project, and starter demands.
 * Usage: BOARD_URL=https://opentodo-jet.vercel.app node scripts/seed-colab.mjs
 */

const BASE = (process.env.BOARD_URL || "https://opentodo-jet.vercel.app").replace(/\/$/, "");

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${data.error || JSON.stringify(data)}`);
  }
  return data;
}

async function ensureLabel(name, color, existing) {
  const found = existing.find((l) => l.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  const { label } = await api("POST", "/api/labels", { name, color });
  console.log("label:", label.name, label.id);
  return label;
}

async function main() {
  console.log("Board:", BASE);

  const { labels: existingLabels } = await api("GET", "/api/labels/all");
  const estevao = await ensureLabel("estevao", "#3b82f6", existingLabels);
  const thiago = await ensureLabel("thiago", "#22c55e", existingLabels);
  const agent = await ensureLabel("agent", "#a855f7", existingLabels);

  const { projects } = await api("GET", "/api/projects/all");
  let project = projects.find((p) => p.name === "Colab Agent");
  if (!project) {
    const created = await api("POST", "/api/projects", {
      name: "Colab Agent",
      icon: "🤝",
      description:
        "Demandas compartilhadas entre dois humanos e o Agent. Guia: docs/guia-colaboracao-agent.md",
      status: "started",
      priority: "high",
      lead: "estevao",
    });
    project = created.project;
    console.log("project:", project.name, project.id);
  } else {
    console.log("project exists:", project.id);
  }

  const starters = [
    {
      title: "Alinhar objetivo do trabalho em paralelo",
      description: `Problema: sem objetivo comum, o trabalho em paralelo diverge.
Solução: escrever sucesso em 1–2 frases e partilhar no board.
Como:
1. Vocês dois alinham o resultado esperado (ex.: “MVP X em 1 semana”)
2. Registar num comentário desta issue ou no README do projeto
3. Mover para done quando os dois confirmarem`,
      priority: "high",
      labelIds: [estevao.id, thiago.id],
    },
    {
      title: "Convidar thiago no GitHub (Collaborators)",
      description: `Problema: o Thiago ainda não tem acesso ao repo no GitHub.
Solução: convite de Collaborator no fork macestevao111/OpenTodo.
Como:
1. GitHub → Settings → Collaborators → Add people
2. Convidar a conta do Thiago
3. Ele aceita o e-mail; depois clona e trabalha em branch/PR`,
      priority: "high",
      labelIds: [estevao.id],
    },
    {
      title: "Configurar Agent no Cursor com a regra opentodo-board",
      description: `Problema: o Agent só fala no chat e não grava demandas no board.
Solução: regra Cursor + API do OpenTodo.
Como:
1. Abrir o clone; garantir .cursor/rules/opentodo-board.mdc
2. Colar o prompt do docs/guia-colaboracao-agent.md
3. Pedir para estruturar demandas; conferir TASK novas no board`,
      priority: "medium",
      labelIds: [estevao.id, agent.id],
    },
    {
      title: "Thiago: abrir board e pegar primeira issue com label thiago",
      description: `Problema: o Thiago precisa entrar no fluxo sem fricção.
Solução: abrir o board, pegar uma issue com label thiago e avançar status.
Como:
1. Abrir https://opentodo-jet.vercel.app
2. Filtrar/encontrar issue com label thiago
3. Mudar para in_progress ao começar; done ao terminar`,
      priority: "medium",
      labelIds: [thiago.id],
    },
    {
      title: "Definir primeira fatia de código (PR pequeno)",
      description: `Problema: fatia grande demais bloqueia PR paralelo.
Solução: uma mudança pequena, reviewável, num PR.
Como:
1. Agent (ou humano) propõe o menor passo útil no comentário
2. Abrir branch a partir de main; implementar só esse passo
3. Abrir PR; marcar esta issue done com link do PR`,
      priority: "medium",
      labelIds: [agent.id, estevao.id],
    },
  ];

  const { issues } = await api("GET", "/api/issues?limit=100");
  const titles = new Set(issues.map((i) => i.title));

  for (const s of starters) {
    if (titles.has(s.title)) {
      console.log("skip issue:", s.title);
      continue;
    }
    const { issue } = await api("POST", "/api/issues", {
      title: s.title,
      description: s.description,
      status: "backlog",
      priority: s.priority,
      project_id: project.id,
    });
    for (const lid of s.labelIds) {
      await api("POST", `/api/issues/${issue.id}/labels`, { label_id: lid });
    }
    console.log("issue:", issue.identifier, issue.title);
  }

  const stats = await api("GET", "/api/stats");
  console.log("done. stats:", stats);
  console.log("open:", `${BASE}/?view=projects`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
