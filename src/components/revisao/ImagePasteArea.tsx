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
      <div className="relative rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface-soft,var(--mist))] p-2">
        <div className="flex items-start gap-2">
          <img
            src={value}
            alt="Print colado"
            className="max-h-48 max-w-full rounded-lg border border-[var(--line)] object-contain"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={disabled}
            className="shrink-0 grid size-7 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft,color-mix(in_srgb,var(--ink)_50%,transparent))] transition hover:bg-[var(--warn-soft)] hover:text-[var(--warn)] hover:border-[var(--warn)]/30 disabled:opacity-40"
            title="Remover imagem"
          >
            <X size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-[color-mix(in_srgb,var(--ink)_40%,transparent)]">
          Print anexado. Você pode adicionar texto acima para complementar.
        </p>
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
      className={`group cursor-pointer rounded-[var(--radius-btn)] border-2 border-dashed transition-all duration-200 ${
        dragging
          ? "border-[var(--signal)] bg-[var(--signal-soft)] scale-[1.01]"
          : "border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_2%,var(--surface))] hover:border-[var(--signal)]/50 hover:bg-[var(--signal-soft)]/30"
      } ${disabled ? "opacity-40 pointer-events-none" : ""} px-4 py-4 text-center`}
    >
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] group-hover:text-[var(--signal)] transition-colors">
          <ImagePlus size={18} />
          <Clipboard size={14} />
        </div>
        <p className="text-xs font-medium text-[color-mix(in_srgb,var(--ink)_55%,transparent)] group-hover:text-[var(--ink)] transition-colors">
          <span className="font-semibold text-[var(--signal)]">Ctrl + V</span>{" "}
          para colar print • ou clique para selecionar
        </p>
        <p className="text-[10px] text-[color-mix(in_srgb,var(--ink)_35%,transparent)]">
          PNG, JPG ou WEBP até 4MB
        </p>
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
