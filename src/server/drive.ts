import { GoogleAuth } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/drive"];

export function driveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() && process.env.DRIVE_FOLDER_ID?.trim());
}

function parseCredentials(): Record<string, unknown> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
  try {
    if (raw.startsWith("{")) return JSON.parse(raw);
    // base64-encoded JSON
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON/base64");
  }
}

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    credentials: parseCredentials(),
    scopes: SCOPES,
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Failed to obtain Google access token");
  return token.token;
}

export function extractDriveFileId(input: string): string | null {
  const s = input.trim();
  const gdrive = /^gdrive:([a-zA-Z0-9_-]+)$/.exec(s);
  if (gdrive) return gdrive[1];
  const fromUrl =
    /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*?id=)([a-zA-Z0-9_-]+)/.exec(s) ||
    /docs\.google\.com\/.*?\/d\/([a-zA-Z0-9_-]+)/.exec(s);
  if (fromUrl) return fromUrl[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return null;
}

export async function downloadMarkdown(fileId: string): Promise<{ title: string; markdown: string }> {
  const token = await getAccessToken();
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!metaRes.ok) {
    const err = await metaRes.text();
    throw new Error(`Drive meta ${metaRes.status}: ${err.slice(0, 200)}`);
  }
  const meta = (await metaRes.json()) as { name?: string; mimeType?: string };
  const name = meta.name || fileId;
  const mime = meta.mimeType || "";
  const isMd =
    mime.includes("markdown") ||
    mime === "text/plain" ||
    name.toLowerCase().endsWith(".md") ||
    name.toLowerCase().endsWith(".markdown");
  if (!isMd && mime !== "application/octet-stream") {
    throw new Error(`File is not Markdown (mime=${mime}, name=${name})`);
  }

  const mediaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!mediaRes.ok) {
    const err = await mediaRes.text();
    throw new Error(`Drive download ${mediaRes.status}: ${err.slice(0, 200)}`);
  }
  const markdown = await mediaRes.text();
  if (markdown.length > 1_500_000) {
    throw new Error("Markdown file too large");
  }
  return { title: name, markdown };
}

export async function uploadMarkdown(opts: {
  name: string;
  content: string;
}): Promise<{ fileId: string; link: string; name: string }> {
  const folderId = process.env.DRIVE_FOLDER_ID?.trim();
  if (!folderId) throw new Error("DRIVE_FOLDER_ID not configured");
  const token = await getAccessToken();
  const filename = opts.name.endsWith(".md") ? opts.name : `${opts.name}.md`;
  const metadata = {
    name: filename,
    mimeType: "text/markdown",
    parents: [folderId],
  };
  const boundary = "opentodo_md_" + Date.now();
  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: text/markdown; charset=UTF-8\r\n\r\n" +
    `${opts.content}\r\n` +
    `--${boundary}--`;

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive upload ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id: string; name: string };
  return { fileId: data.id, name: data.name, link: `gdrive:${data.id}` };
}
