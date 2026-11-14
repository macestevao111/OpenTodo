import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import type { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

export const COOKIE_NAME = "ot_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days
const ALLOWED = new Set(["estevao", "thiago"]);

export type AuthUser = { username: string };

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function secret(): string {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s) throw new Error("AUTH_SECRET not configured");
  return s;
}

/** Parse AUTH_USERS=user:pass,user2:pass2 → Map */
export function parseUsers(raw = process.env.AUTH_USERS || ""): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const i = trimmed.indexOf(":");
    if (i <= 0) continue;
    const user = trimmed.slice(0, i).trim().toLowerCase();
    const pass = trimmed.slice(i + 1);
    if (ALLOWED.has(user) && pass) map.set(user, pass);
  }
  return map;
}

export function authConfigured(): boolean {
  try {
    return Boolean(process.env.AUTH_SECRET?.trim()) && parseUsers().size > 0;
  } catch {
    return false;
  }
}

function hashPass(password: string): Buffer {
  return createHash("sha256").update(password, "utf8").digest();
}

export function verifyCredentials(username: string, password: string): boolean {
  const users = parseUsers();
  const user = username.trim().toLowerCase();
  const expected = users.get(user);
  if (!expected) return false;
  const a = hashPass(expected);
  const b = hashPass(password);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signSession(username: string): string {
  const payload = b64url(
    Buffer.from(JSON.stringify({ u: username, exp: Date.now() + MAX_AGE_SEC * 1000 }), "utf8"),
  );
  const sig = b64url(createHmac("sha256", secret()).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined): AuthUser | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  let expected: string;
  try {
    expected = b64url(createHmac("sha256", secret()).update(payload).digest());
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      u?: string;
      exp?: number;
    };
    if (!data.u || !ALLOWED.has(data.u) || typeof data.exp !== "number") return null;
    if (Date.now() > data.exp) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

export function setSessionCookie(c: Context, username: string): void {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  setCookie(c, COOKIE_NAME, signSession(username), {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
}

export function readSession(c: Context): AuthUser | null {
  return verifySession(getCookie(c, COOKIE_NAME));
}

const PUBLIC = new Set(["/api/health", "/api/login", "/api/logout"]);

export async function requireAuth(c: Context, next: Next) {
  const path = new URL(c.req.url).pathname;
  if (PUBLIC.has(path) || c.req.method === "OPTIONS") {
    return next();
  }
  if (!authConfigured()) {
    return c.json({ error: "Auth not configured" }, 503);
  }
  const user = readSession(c);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", user);
  return next();
}
