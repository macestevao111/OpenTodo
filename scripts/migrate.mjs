import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL is required");
  process.exit(1);
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const schemaPath = resolve(__dirname, "../src/server/schema.sql");
const sql = readFileSync(schemaPath, "utf8");

// Strip line comments, then split on statement terminators.
const withoutComments = sql
  .split("\n")
  .map((line) => {
    const idx = line.indexOf("--");
    return idx >= 0 ? line.slice(0, idx) : line;
  })
  .join("\n");

const statements = withoutComments
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const statement of statements) {
  await client.execute(statement);
  console.log("ok:", statement.slice(0, 72).replace(/\s+/g, " ") + "…");
}

console.log("Schema applied.");
