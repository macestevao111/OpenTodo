/** Extract Google Drive file ids from citations. */

export function extractDriveFileId(input: string): string | null {
  const s = input.trim();
  const gdrive = /^gdrive:([a-zA-Z0-9_-]+)$/i.exec(s);
  if (gdrive) return gdrive[1];
  const fromUrl =
    /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*?id=)([a-zA-Z0-9_-]+)/i.exec(s) ||
    /docs\.google\.com\/.*?\/d\/([a-zA-Z0-9_-]+)/i.exec(s);
  if (fromUrl) return fromUrl[1];
  return null;
}

export type TextPart =
  | { type: "text"; value: string }
  | { type: "drive"; fileId: string; label: string };

const MD_LINK =
  /\[([^\]]+)\]\((gdrive:[a-zA-Z0-9_-]+|https?:\/\/(?:drive|docs)\.google\.com\/[^)\s]+)\)/gi;
const BARE_GDRIVE = /(?:^|[\s(])(gdrive:[a-zA-Z0-9_-]+)/gi;

/** Split plain text into text + drive citation parts for clickable UI. */
export function splitDriveCitations(text: string): TextPart[] {
  if (!text) return [];
  const marks: { start: number; end: number; fileId: string; label: string }[] = [];

  for (const m of text.matchAll(MD_LINK)) {
    const full = m[0];
    const label = m[1];
    const href = m[2];
    const fileId = extractDriveFileId(href);
    if (!fileId || m.index === undefined) continue;
    marks.push({ start: m.index, end: m.index + full.length, fileId, label });
  }
  for (const m of text.matchAll(BARE_GDRIVE)) {
    const token = m[1];
    const fileId = extractDriveFileId(token);
    if (!fileId || m.index === undefined) continue;
    const start = m.index + (m[0].length - token.length);
    const end = start + token.length;
    if (marks.some((x) => start < x.end && end > x.start)) continue;
    marks.push({ start, end, fileId, label: token });
  }

  marks.sort((a, b) => a.start - b.start);
  const parts: TextPart[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start < cursor) continue;
    if (mark.start > cursor) parts.push({ type: "text", value: text.slice(cursor, mark.start) });
    parts.push({ type: "drive", fileId: mark.fileId, label: mark.label });
    cursor = mark.end;
  }
  if (cursor < text.length) parts.push({ type: "text", value: text.slice(cursor) });
  return parts.length ? parts : [{ type: "text", value: text }];
}
