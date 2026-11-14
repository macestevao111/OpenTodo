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
  try {
    await run(`ALTER TABLE comments ADD COLUMN image_data TEXT DEFAULT ''`);
  } catch {
    /* exists */
  }
  try {
    await run(`ALTER TABLE activities ADD COLUMN image_data TEXT DEFAULT ''`);
  } catch {
    /* exists */
  }
}

/** Minified data-URL images only; keep Turso rows small. */
export const MAX_IMAGE_CHARS = 180_000;

export function normalizeImageData(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const s = raw.trim();
  if (!s) return "";
  if (!s.startsWith("data:image/")) {
    throw new Error("image_data must be a data:image/… URL");
  }
  if (s.length > MAX_IMAGE_CHARS) {
    throw new Error(`Image too large after minify (max ~${Math.round(MAX_IMAGE_CHARS / 1000)}k chars)`);
  }
  return s;
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
  imageData?: string;
}): Promise<void> {
  try {
    await run(
      `INSERT INTO activities (project_id, issue_id, kind, actor, summary, meta, image_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        opts.projectId ?? null,
        opts.issueId ?? null,
        opts.kind,
        opts.actor || "",
        opts.summary,
        JSON.stringify(opts.meta || {}),
        opts.imageData || "",
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
