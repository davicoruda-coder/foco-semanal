import { useState, useRef, useEffect } from "react";
import { Link2, X } from "lucide-react";
import { SubjectResource } from "@/lib/types";
import { ensureProtocolUrl, getResourceDisplayTitle } from "@/lib/utils";
import { newId } from "@/lib/demo-store";

interface Props {
  recursos?: SubjectResource[];
  onChange: (recursos: SubjectResource[]) => void;
  compact?: boolean;
}

export function SubjectResources({ recursos = [], onChange, compact }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  function handleSave() {
    const finalUrl = ensureProtocolUrl(url);
    if (!finalUrl) {
      setIsAdding(false);
      setUrl("");
      setTitle("");
      return;
    }
    const newItem: SubjectResource = {
      id: newId("rec"),
      title: title.trim() || undefined,
      url: finalUrl,
    };
    onChange([...recursos, newItem]);
    setIsAdding(false);
    setUrl("");
    setTitle("");
  }

  function handleRemove(id: string) {
    onChange(recursos.filter((r) => r.id !== id));
  }

  const hasItems = recursos.length > 0;

  return (
    <div className={`mt-1.5 ${compact ? "px-1" : ""}`}>
      {!hasItems && !isAdding && (
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex size-[22px] items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] transition hover:border-[var(--signal)] hover:text-[var(--signal)]"
            title="Adicionar recurso"
          >
            +
          </button>
        </div>
      )}

      {hasItems && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
            Recursos
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {recursos.map((r) => (
              <div
                key={r.id}
                className="group flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--signal)_25%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] py-1 pl-2.5 pr-1 text-xs font-medium text-[var(--ink)] transition hover:border-[var(--signal)]"
              >
                <a
                  href={ensureProtocolUrl(r.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 transition hover:text-[var(--signal)]"
                  title={r.url}
                >
                  <Link2 size={13} strokeWidth={2} />
                  <span className="truncate max-w-[150px]">
                    {getResourceDisplayTitle(r)}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => handleRemove(r.id)}
                  className="ml-0.5 rounded-full p-0.5 opacity-50 transition hover:bg-[color-mix(in_srgb,var(--warn)_20%,transparent)] hover:text-[var(--warn)] hover:opacity-100"
                  title="Remover recurso"
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            ))}
            {!isAdding && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="flex size-[22px] items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] transition hover:border-[var(--signal)] hover:text-[var(--signal)]"
                title="Adicionar recurso"
              >
                +
              </button>
            )}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="mt-2 rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--mist)] p-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={inputRef}
              type="text"
              placeholder="URL (ex: qconcursos.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setIsAdding(false);
              }}
              className="input w-full py-1.5 text-sm"
            />
            <input
              type="text"
              placeholder="Título (opcional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setIsAdding(false);
              }}
              className="input w-full py-1.5 text-sm sm:w-40"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                className="btn py-1.5 text-sm bg-[var(--signal)] text-white"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="btn py-1.5 text-sm border-transparent bg-transparent"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
