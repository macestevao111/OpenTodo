import { useRef, useState } from "preact/hooks";
import { ImagePlus, X } from "lucide-preact";
import { minifyImageFile } from "../lib/minify-image";

type Props = {
  value: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
};

export function ImageAttach({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const dataUrl = await minifyImageFile(file);
      onChange(dataUrl);
    } catch (e) {
      setErr((e as Error).message);
      onChange("");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div class="image-attach">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        class="image-attach-input"
        disabled={disabled || busy}
        onChange={(e) => pick((e.target as HTMLInputElement).files?.[0])}
        aria-label="Anexar imagem"
      />
      <button
        type="button"
        class="btn btn-sm"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        title="Imagem é redimensionada ao mínimo antes de enviar"
      >
        <ImagePlus size={14} /> {busy ? "…" : "Img"}
      </button>
      {value && (
        <div class="image-attach-preview">
          <img src={value} alt="Pré-visualização" />
          <button
            type="button"
            class="btn btn-sm image-attach-clear"
            onClick={() => onChange("")}
            aria-label="Remover imagem"
          >
            <X size={12} />
          </button>
        </div>
      )}
      {err && <span class="image-attach-error">{err}</span>}
    </div>
  );
}
