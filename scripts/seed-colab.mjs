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
      description:
        "Combinar o que é sucesso em 1–2 frases. Dono: os dois. Ref: docs/guia-colaboracao-agent.md",
      priority: "high",
      labelIds: [estevao.id, thiago.id],
    },
    {
      title: "Convidar thiago no GitHub (Collaborators)",
      description: "Repo macestevao111/OpenTodo → Settings → Collaborators.",
      priority: "high",
      labelIds: [estevao.id],
    },
    {
      title: "Configurar Agent no Cursor com a regra opentodo-board",
      description:
        "Usar .cursor/rules/opentodo-board.mdc e o prompt do guia para o Agent criar issues via API.",
      priority: "medium",
      labelIds: [estevao.id, agent.id],
    },
    {
      title: "Thiago: abrir board e pegar primeira issue com label thiago",
      description: "URL: https://opentodo-jet.vercel.app — mover para in_progress ao começar.",
      priority: "medium",
      labelIds: [thiago.id],
    },
    {
      title: "Definir primeira fatia de código (PR pequeno)",
      description:
        "Agent pode quebrar em subtarefas; humanos implementam em branches/PRs.",
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
