import { createClient } from "@libsql/client/web";

export type RunResult = { changes: number; lastInsertRowid: number };

type LibsqlClient = ReturnType<typeof createClient>;

let client: LibsqlClient | null = null;

function getClient(): LibsqlClient {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }
  client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return client;
}

function asArgs(params: unknown[]): Array<string | number | bigint | boolean | null | Uint8Array> {
  return params.map((p) => {
    if (p === undefined) return null;
    if (
      p === null ||
      typeof p === "string" ||
      typeof p === "number" ||
      typeof p === "bigint" ||
      typeof p === "boolean" ||
      p instanceof Uint8Array
    ) {
      return p;
    }
    throw new TypeError(`Unsupported SQL param type: ${typeof p}`);
  });
}

function normalizeRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = typeof value === "bigint" ? Number(value) : value;
  }
  return out as T;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getClient().execute({ sql, args: asArgs(params) });
  return result.rows.map((row) =>
    normalizeRow<T>(row as unknown as Record<string, unknown>),
  );
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
  const result = await getClient().execute({ sql, args: asArgs(params) });
  return {
    changes: result.rowsAffected,
    lastInsertRowid: Number(result.lastInsertRowid ?? 0),
  };
}
