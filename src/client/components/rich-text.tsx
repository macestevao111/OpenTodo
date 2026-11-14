import { splitDriveCitations } from "../lib/drive-links";
import { useMdViewer } from "./md-viewer";

/** Plain text with clickable gdrive / Drive URL citations → embedded MD viewer. */
export function RichText({ text, class: className }: { text: string; class?: string }) {
  const { openDriveMd } = useMdViewer();
  const parts = splitDriveCitations(text);

  return (
    <div class={className}>
      {parts.map((p, i) => {
        if (p.type === "text") {
          return <span key={i}>{p.value}</span>;
        }
        return (
          <button
            key={i}
            type="button"
            class="drive-md-link"
            onClick={() => openDriveMd(p.fileId)}
            title={`Abrir ${p.fileId} no viewer`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
