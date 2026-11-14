export type RunResult = { changes: number; lastInsertRowid: number };

type PipelineResult = {
  results?: Array<{
    type: string;
    response?: {
      type: string;
      result?: {
        cols?: Array<{ name: string }>;
        rows?: Array<Array<{ type: string; value: string | null }>>;
        affected_row_count?: number;
        last_insert_rowid?: string | null;
      };
    };
    error?: { message?: string };
  }>;
};

function endpoint(): string {
  const raw = process.env.TURSO_DATABASE_URL;
  if (!raw) throw new Error("TURSO_DATABASE_URL is not set");
  return `${raw.replace(/^libsql:\/\//, "https://").replace(/\/$/, "")}/v2/pipeline`;
}

function authHeader(): string {
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!token) throw new Error("TURSO_AUTH_TOKEN is not set");
  return `Bearer ${token}`;
}

function asArgs(params: unknown[]): Array<string | number | null> {
  return params.map((p) => {
    if (p === undefined || p === null) return null;
    if (typeof p === "string" || typeof p === "number") return p;
    if (typeof p === "bigint") return Number(p);
    if (typeof p === "boolean") return p ? 1 : 0;
    throw new TypeError(`Unsupported SQL param type: ${typeof p}`);
  });
}

function cellValue(cell: { type: string; value: string | null }): unknown {
  if (cell.value === null) return null;
  if (cell.type === "integer" || cell.type === "float") return Number(cell.value);
  return cell.value;
}

async function pipeline(sql: string, params: unknown[]): Promise<NonNullable<PipelineResult["results"]>[number]> {
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          type: "execute",
          stmt: {
            sql,
            args: asArgs(params).map((v) =>
              v === null
                ? { type: "null" }
                : typeof v === "number"
                  ? { type: Number.isInteger(v) ? "integer" : "float", value: String(v) }
                  : { type: "text", value: v },
            ),
          },
        },
        { type: "close" },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SERVER_ERROR: Server returned HTTP status ${res.status}`);
  }

  const data = JSON.parse(text) as PipelineResult;
  const first = data.results?.[0];
  if (!first) throw new Error("Empty Turso response");
  if (first.type === "error") {
    throw new Error(first.error?.message || "Turso execute error");
  }
  return first;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const first = await pipeline(sql, params);
  const result = first.response?.result;
  if (!result) return [];
  const cols = result.cols?.map((c) => c.name) ?? [];
  return (result.rows ?? []).map((row) => {
    const out: Record<string, unknown> = {};
    row.forEach((cell, i) => {
      out[cols[i] ?? String(i)] = cellValue(cell);
    });
    return out as T;
  });
}

export async function get<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export async function run(
  sql: string,
  params: unknown[] = [],
): Promise<RunResult> {
  const first = await pipeline(sql, params);
  const result = first.response?.result;
  return {
    changes: result?.affected_row_count ?? 0,
    lastInsertRowid: Number(result?.last_insert_rowid ?? 0),
  };
}
