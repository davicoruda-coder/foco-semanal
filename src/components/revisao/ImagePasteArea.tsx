"use client";

import { useCallback, useRef, useState, type DragEvent, type ClipboardEvent } from "react";
import { ImagePlus, X, Clipboard } from "lucide-react";

interface ImagePasteAreaProps {
  /** Base64 data URI da imagem selecionada, ou string vazia. */
  value: string;
  /** Chamado quando uma imagem é adicionada ou removida. */
  onChange: (base64DataUri: string) => void;
  /** Se true, desabilita interação. */
  disabled?: boolean;
}

/**
 * Área de paste/drop de imagens.
 * Suporta Ctrl+V (clipboard), drag & drop, e clique para selecionar arquivo.
 */
export function ImagePasteArea({ value, onChange, disabled }: ImagePasteAreaProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 4 * 1024 * 1024) {
        alert("A imagem é muito grande (máx 4MB). Tente uma imagem menor.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onChange(reader.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processFile(file);
          return;
        }
      }
    },
    [disabled, processFile],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer?.files?.[0];
      if (file) processFile(file);
    },
    [disabled, processFile],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset para permitir selecionar o mesmo arquivo novamente
      e.target.value = "";
    },
    [processFile],
  );

  if (value) {
    return (
      <div className="relative rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,var(--signal)_30%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_6%,var(--surface))] p-2.5">
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt="Print colado"
            className="max-h-20 max-w-[140px] rounded-lg border border-[var(--line)] object-contain bg-white dark:bg-black/30"
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <ImagePlus size={14} className="text-[var(--signal)]" /> Print anexado
            </span>
            <p className="mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] leading-relaxed">
              A imagem será enviada e analisada pela IA junto com o seu texto.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={disabled}
            className="shrink-0 flex items-center gap-1 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--warn)] transition hover:bg-[var(--warn-soft)] hover:border-[var(--warn)]/30 disabled:opacity-40"
            title="Remover print"
          >
            <X size={13} /> Remover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      className={`group cursor-pointer rounded-[var(--radius-btn)] border border-dashed transition-all duration-200 ${
        dragging
          ? "border-[var(--signal)] bg-[var(--signal-soft)] scale-[1.01]"
          : "border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_2%,var(--surface))] hover:border-[var(--signal)]/50 hover:bg-[var(--signal-soft)]/20"
      } ${disabled ? "opacity-40 pointer-events-none" : ""} px-4 py-2.5 text-center`}
    >
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-[var(--signal)] font-medium">
          <ImagePlus size={16} />
          <span>Anexar Print ou Imagem</span>
        </div>
        <span className="text-[color-mix(in_srgb,var(--ink)_40%,transparent)]">•</span>
        <span className="text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
          Pressione <strong className="font-semibold text-[var(--ink)]">Ctrl + V</strong> para colar direto ou clique para buscar
        </span>
        <span className="text-[10px] text-[color-mix(in_srgb,var(--ink)_40%,transparent)]">
          (PNG, JPG até 4MB)
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        tabIndex={-1}
      />
    </div>
  );
}
