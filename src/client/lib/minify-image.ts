/** Resize + compress image to a small data-URL for Turso storage. */
const MAX_EDGE = 640;
const MAX_CHARS = 180_000;

export async function minifyImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Ficheiro tem de ser uma imagem");
  }
  const bitmap = await createImageBitmap(file);
  let edge = MAX_EDGE;
  let quality = 0.62;
  let dataUrl = "";

  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível");
      ctx.drawImage(bitmap, 0, 0, w, h);
      dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_CHARS) {
        bitmap.close();
        return dataUrl;
      }
      quality = Math.max(0.4, quality - 0.08);
      edge = Math.round(edge * 0.75);
    }
  } finally {
    try {
      bitmap.close();
    } catch {
      /* already closed */
    }
  }
  throw new Error("Imagem ainda grande demais após compressão");
}
