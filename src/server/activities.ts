import type { Context } from "hono";
import { get, run } from "./db.js";
import type { AuthUser } from "./auth.js";

export async function ensureActivitiesTable(): Promise<void> {
  await run(`CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    meta TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  await run(
    `CREATE INDEX IF NOT EXISTS idx_activities_issue ON activities(issue_id, created_at)`,
  );
  await run(
    `CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id, created_at)`,
  );
  // ◇ Síntese — human-editable skill summary on projects
  try {
    await run(`ALTER TABLE projects ADD COLUMN synthesis TEXT DEFAULT ''`);
  } catch {
    /* column already exists */
  }
}

export function actorFrom(c: Context<{ Variables: { user: AuthUser } }>): string {
  try {
    return c.get("user")?.username || "";
  } catch {
    return "";
  }
}

export async function recordActivity(opts: {
  projectId?: number | null;
  issueId?: number | null;
  kind: string;
  actor: string;
  summary: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await run(
      `INSERT INTO activities (project_id, issue_id, kind, actor, summary, meta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        opts.projectId ?? null,
        opts.issueId ?? null,
        opts.kind,
        opts.actor || "",
        opts.summary,
        JSON.stringify(opts.meta || {}),
      ],
    );
  } catch {
    /* never break the main write path */
  }
}

export async function issueProjectId(issueId: number): Promise<number | null> {
  const row = await get<{ project_id: number | null }>(
    "SELECT project_id FROM issues WHERE id = ?",
    [issueId],
  );
  return row?.project_id ?? null;
}
