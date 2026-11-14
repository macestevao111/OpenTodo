#!/usr/bin/env node
/**
 * OpenTodo board CLI — login + R/W issues via HTTP cookie session.
 * Env: BOARD_URL, BOARD_USER, BOARD_PASS, BOARD_COOKIE_JAR (optional)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const BASE = (process.env.BOARD_URL || "https://opentodo-jet.vercel.app").replace(/\/$/, "");
const JAR =
  process.env.BOARD_COOKIE_JAR ||
  join(homedir(), ".cache", "opentodo-board-cookies.json");

function usage(code = 1) {
  console.error(`Usage: board.mjs <command> [options]

Commands:
  login
  me
  issues [--status S] [--project NAME] [--search Q] [--limit N]
  get <TASK-n|id>
  create --title T --description D [--priority P] [--status S] [--project NAME] [--labels a,b]
  update <TASK-n|id> [--title T] [--description D] [--status S] [--priority P] [--project NAME]
  comment <TASK-n|id> --body TEXT
  label <TASK-n|id> --add NAME | --remove NAME
  projects
  project-create --name NAME [--description D] [--icon I] [--lead USER]
  get-project <id|NAME>
  synthesize --project NAME [--body TEXT | --auto]   # ◇ Síntese
  labels

Env: BOARD_URL BOARD_USER BOARD_PASS [BOARD_COOKIE_JAR]
`);
  process.exit(code);
}

function loadJar() {
  try {
    if (!existsSync(JAR)) return {};
    return JSON.parse(readFileSync(JAR, "utf8"));
  } catch {
    return {};
  }
}

function saveJar(jar) {
  mkdirSync(dirname(JAR), { recursive: true });
  writeFileSync(JAR, JSON.stringify(jar, null, 2));
}

function cookieHeader() {
  const jar = loadJar();
  if (!jar.ot_session) return undefined;
  return `ot_session=${jar.ot_session}`;
}

function parseSetCookie(res) {
  const raw = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [];
  const fallback = res.headers.get("set-cookie");
  const list = raw.length ? raw : fallback ? [fallback] : [];
  for (const line of list) {
    const m = /(?:^|,\s*)ot_session=([^;]+)/.exec(line);
    if (m) {
      const jar = loadJar();
      jar.ot_session = m[1];
      saveJar(jar);
      return;
    }
  }
}

async function api(method, path, body, { auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const c = cookieHeader();
    if (c) headers.Cookie = c;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  parseSetCookie(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `${method} ${path} → ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

async function resolveIssueId(ref) {
  if (/^\d+$/.test(ref)) return Number(ref);
  const { issues } = await api("GET", "/api/issues?limit=100");
  const found = issues.find((i) => i.identifier === ref || i.identifier.toUpperCase() === ref.toUpperCase());
  if (!found) throw new Error(`Issue not found: ${ref}`);
  return found.id;
}

async function resolveProjectId(name) {
  if (!name) return null;
  if (/^\d+$/.test(name)) return Number(name);
  const { projects } = await api("GET", "/api/projects/all");
  const found = projects.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!found) throw new Error(`Project not found: ${name}`);
  return found.id;
}

async function resolveLabelIds(names) {
  if (!names) return [];
  const list = names.split(",").map((s) => s.trim()).filter(Boolean);
  const { labels } = await api("GET", "/api/labels/all");
  const ids = [];
  for (const n of list) {
    const found = labels.find((l) => l.name.toLowerCase() === n.toLowerCase());
    if (!found) throw new Error(`Label not found: ${n}`);
    ids.push(found.id);
  }
  return ids;
}

async function cmdLogin() {
  const username = process.env.BOARD_USER;
  const password = process.env.BOARD_PASS;
  if (!username || !password) {
    throw new Error("Set BOARD_USER and BOARD_PASS");
  }
  const data = await api(
    "POST",
    "/api/login",
    { username, password },
    { auth: false },
  );
  if (!loadJar().ot_session) {
    throw new Error("Login OK but no ot_session cookie captured");
  }
  console.log(JSON.stringify({ ok: true, user: data.user, jar: JAR }, null, 2));
}

async function cmdIssues(args) {
  const params = new URLSearchParams({ limit: String(args.limit || 50) });
  if (args.status) params.set("status", args.status);
  if (args.search) params.set("search", args.search);
  if (args.project) {
    const pid = await resolveProjectId(args.project);
    params.set("project_id", String(pid));
  }
  const data = await api("GET", `/api/issues?${params}`);
  console.log(JSON.stringify(data, null, 2));
}

async function cmdGet(ref) {
  const id = await resolveIssueId(ref);
  const data = await api("GET", `/api/issues/${id}`);
  console.log(JSON.stringify(data, null, 2));
}

async function cmdCreate(args) {
  if (!args.title || !args.description) {
    throw new Error("create requires --title and --description");
  }
  const body = {
    title: args.title,
    description: args.description,
    status: args.status || "backlog",
    priority: args.priority || "medium",
  };
  if (args.project) body.project_id = await resolveProjectId(args.project);
  else {
    try {
      body.project_id = await resolveProjectId("Colab Agent");
    } catch {
      /* optional */
    }
  }
  const { issue } = await api("POST", "/api/issues", body);
  if (args.labels) {
    const ids = await resolveLabelIds(args.labels);
    for (const lid of ids) {
      await api("POST", `/api/issues/${issue.id}/labels`, { label_id: lid });
    }
  }
  const full = await api("GET", `/api/issues/${issue.id}`);
  console.log(JSON.stringify(full, null, 2));
}

async function cmdUpdate(ref, args) {
  const id = await resolveIssueId(ref);
  const body = {};
  if (args.title) body.title = args.title;
  if (args.description) body.description = args.description;
  if (args.status) body.status = args.status;
  if (args.priority) body.priority = args.priority;
  if (args.project) body.project_id = await resolveProjectId(args.project);
  if (!Object.keys(body).length) throw new Error("update needs at least one field");
  const data = await api("PUT", `/api/issues/${id}`, body);
  console.log(JSON.stringify(data, null, 2));
}

async function cmdComment(ref, args) {
  if (!args.body) throw new Error("comment requires --body");
  const id = await resolveIssueId(ref);
  const data = await api("POST", `/api/issues/${id}/comments`, { content: args.body });
  console.log(JSON.stringify(data, null, 2));
}

async function cmdLabel(ref, args) {
  const id = await resolveIssueId(ref);
  const { labels } = await api("GET", "/api/labels/all");
  if (args.add) {
    const found = labels.find((l) => l.name.toLowerCase() === String(args.add).toLowerCase());
    if (!found) throw new Error(`Label not found: ${args.add}`);
    await api("POST", `/api/issues/${id}/labels`, { label_id: found.id });
  } else if (args.remove) {
    const found = labels.find((l) => l.name.toLowerCase() === String(args.remove).toLowerCase());
    if (!found) throw new Error(`Label not found: ${args.remove}`);
    await api("DELETE", `/api/issues/${id}/labels/${found.id}`);
  } else {
    throw new Error("label requires --add NAME or --remove NAME");
  }
  const full = await api("GET", `/api/issues/${id}`);
  console.log(JSON.stringify(full, null, 2));
}

async function main() {
  let argv = process.argv.slice(2);
  // pnpm sometimes forwards a literal "--" before the command
  while (argv[0] === "--") argv = argv.slice(1);
  if (!argv.length || argv[0] === "-h" || argv[0] === "--help") usage(0);
  const cmd = argv[0];
  const args = parseArgs(argv.slice(1));

  try {
    switch (cmd) {
      case "login":
        await cmdLogin();
        break;
      case "me":
        console.log(JSON.stringify(await api("GET", "/api/me"), null, 2));
        break;
      case "issues":
        await cmdIssues(args);
        break;
      case "get":
        if (!args._[0]) throw new Error("get requires TASK-n or id");
        await cmdGet(args._[0]);
        break;
      case "create":
        await cmdCreate(args);
        break;
      case "update":
        if (!args._[0]) throw new Error("update requires TASK-n or id");
        await cmdUpdate(args._[0], args);
        break;
      case "comment":
        if (!args._[0]) throw new Error("comment requires TASK-n or id");
        await cmdComment(args._[0], args);
        break;
      case "label":
        if (!args._[0]) throw new Error("label requires TASK-n or id");
        await cmdLabel(args._[0], args);
        break;
      case "projects":
        console.log(JSON.stringify(await api("GET", "/api/projects/all"), null, 2));
        break;
      case "project-create": {
        if (!args.name) throw new Error("project-create requires --name");
        const body = {
          name: args.name,
          icon: args.icon || "📋",
          description: args.description || "",
          status: "started",
          priority: args.priority || "high",
          lead: args.lead || process.env.BOARD_USER || "estevao",
        };
        const data = await api("POST", "/api/projects", body);
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case "get-project": {
        const ref = args._[0] || args.project;
        if (!ref) throw new Error("get-project requires id or name");
        const id = await resolveProjectId(ref);
        const data = await api("GET", `/api/projects/${id}`);
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case "synthesize": {
        // ◇ Síntese — update project.synthesis + activity log
        if (!args.project) throw new Error("synthesize requires --project");
        const id = await resolveProjectId(args.project);
        let bodyText = args.body || "";
        if (args.auto || !bodyText) {
          const { issues } = await api("GET", `/api/issues?project_id=${id}&limit=100`);
          const byStatus = {};
          for (const iss of issues) {
            byStatus[iss.status] = (byStatus[iss.status] || 0) + 1;
          }
          const lines = [
            `◇ Síntese · ${args.project}`,
            `Atualizado: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
            "",
            `Issues: ${issues.length} · ` +
              Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(" · "),
            "",
            "Foco:",
            ...issues
              .filter((i) => i.status !== "done" && i.status !== "cancelled")
              .slice(0, 8)
              .map((i) => `- ${i.identifier} [${i.status}/${i.priority}] ${i.title}`),
          ];
          if (args.body) {
            lines.push("", "Nota do agent:", args.body);
          }
          bodyText = lines.join("\n");
        }
        const data = await api("PUT", `/api/projects/${id}`, {
          synthesis: bodyText,
          log_synthesis: true,
        });
        console.log(JSON.stringify({ brand: "◇ Síntese", ...data }, null, 2));
        break;
      }
      case "labels":
        console.log(JSON.stringify(await api("GET", "/api/labels/all"), null, 2));
        break;
      default:
        usage(1);
    }
  } catch (err) {
    console.error(JSON.stringify({ error: err.message, status: err.status || null }, null, 2));
    process.exit(1);
  }
}

main();
