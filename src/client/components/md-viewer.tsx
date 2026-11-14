import { createContext, type ComponentChildren } from "preact";
import { useCallback, useContext, useEffect, useMemo, useState } from "preact/hooks";
import MarkdownIt from "markdown-it";
import { X } from "lucide-preact";
import { api } from "../api";

type MdViewerCtx = {
  openDriveMd: (fileId: string) => void;
};

const Ctx = createContext<MdViewerCtx>({ openDriveMd: () => {} });

export function useMdViewer() {
  return useContext(Ctx);
}

export function MdViewerProvider({ children }: { children: ComponentChildren }) {
  const [fileId, setFileId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const md = useMemo(() => new MarkdownIt({ html: false, linkify: true, breaks: true }), []);

  const openDriveMd = useCallback((id: string) => {
    setFileId(id);
    setTitle("");
    setHtml("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!fileId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<{ title: string; markdown: string }>("GET", `/api/drive/md/${encodeURIComponent(fileId)}`);
        if (cancelled) return;
        setTitle(data.title);
        setHtml(md.render(data.markdown || ""));
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileId, md]);

  const close = () => setFileId(null);

  return (
    <Ctx.Provider value={{ openDriveMd }}>
      {children}
      {fileId && (
        <div class="md-viewer-backdrop" onClick={close} role="presentation">
          <div
            class="md-viewer-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Markdown viewer"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="md-viewer-header">
              <div class="md-viewer-title">{title || "Markdown"}</div>
              <button type="button" class="btn btn-sm" onClick={close} aria-label="Fechar">
                <X size={14} />
              </button>
            </div>
            <div class="md-viewer-meta muted">gdrive:{fileId} · só leitura</div>
            <div class="md-viewer-body">
              {loading && <div class="loading-text">A carregar do Drive…</div>}
              {error && <div class="login-error">{error}</div>}
              {!loading && !error && (
                <div class="md-viewer-content" dangerouslySetInnerHTML={{ __html: html }} />
              )}
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
