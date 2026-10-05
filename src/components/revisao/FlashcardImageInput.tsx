/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useCallback,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import {
  ImagePlus,
  Loader2,
  Maximize2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { uploadFlashcardImage } from "@/lib/revisao/image-upload";
import { FlashcardImageLightbox } from "./FlashcardImageLightbox";

interface FlashcardImageInputProps {
  label: string;
  side: "frente" | "verso";
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function FlashcardImageInput({
  label,
  side,
  value,
  onChange,
  disabled = false,
}: FlashcardImageInputProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAndUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Selecione um arquivo de imagem válido (PNG, JPG, WebP).");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage("Imagem muito grande (máx 8MB). Reduza o tamanho.");
        return;
      }

      setErrorMessage(null);
      setUploading(true);

      try {
        const res = await uploadFlashcardImage(file, side);
        if (res.url) {
          onChange(res.url);
        } else {
          setErrorMessage(res.error || "Falha ao enviar imagem.");
        }
      } catch (err) {
        setErrorMessage("Erro ao processar imagem.");
        console.error(err);
      } finally {
        setUploading(false);
      }
    },
    [onChange, side],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled || uploading) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) void processAndUpload(file);
          return;
        }
      }
    },
    [disabled, uploading, processAndUpload],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled || uploading) return;

      const file = e.dataTransfer?.files?.[0];
      if (file) void processAndUpload(file);
    },
    [disabled, uploading, processAndUpload],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void processAndUpload(file);
      e.target.value = "";
    },
    [processAndUpload],
  );

  return (
    <div className="space-y-1.5" onPaste={handlePaste}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_75%,transparent)]">
          {label}
        </label>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] font-medium text-[var(--warn,#ef4444)] hover:underline inline-flex items-center gap-1"
          >
            <Trash2 size={11} /> Remover foto
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {value ? (
        /* Preview da imagem selecionada */
        <div className="relative group overflow-hidden rounded-[var(--radius-tag)] border border-[color-mix(in_srgb,var(--signal)_30%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_5%,var(--surface))] p-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              onClick={() => setPreviewZoom(value)}
              className="relative cursor-pointer shrink-0 rounded-md overflow-hidden border border-[var(--line)] bg-black/10 hover:opacity-90 transition"
              title="Clique para ampliar"
            >
              <img
                src={value}
                alt="Anexo do Flashcard"
                className="size-14 object-cover"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                <Maximize2 size={14} />
              </div>
            </div>

            <div className="min-w-0">
              <span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                <ImagePlus size={13} className="text-[var(--signal)] shrink-0" />
                Imagem anexada
              </span>
              <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] truncate">
                Otimizada em formato leve para estudo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setPreviewZoom(value)}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-1.5 text-[var(--ink)] hover:bg-[var(--mist)] transition"
              title="Visualizar em tamanho real"
            >
              <Maximize2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-1.5 text-[var(--warn,#ef4444)] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              title="Remover imagem"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* Área de Upload / Colar (Dropzone compacta) */
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`cursor-pointer rounded-[var(--radius-tag)] border border-dashed p-3 text-center transition-all duration-150 ${
            dragging
              ? "border-[var(--signal)] bg-[var(--signal-soft)] scale-[1.01]"
              : "border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_2%,var(--surface))] hover:border-[var(--signal)]/50 hover:bg-[var(--signal-soft)]/20"
          } ${disabled || uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--signal)] py-0.5">
              <Loader2 size={15} className="animate-spin" />
              <span>Otimizando e enviando imagem WebP...</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-[var(--signal)] font-medium">
                <UploadCloud size={15} />
                <span>Anexar Foto ou Print</span>
              </div>
              <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
                (ou cole com Ctrl+V)
              </span>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="text-[11px] font-medium text-[var(--warn,#ef4444)]">
          {errorMessage}
        </p>
      )}

      {previewZoom && (
        <FlashcardImageLightbox
          src={previewZoom}
          alt={`Preview ${label}`}
          onClose={() => setPreviewZoom(null)}
        />
      )}
    </div>
  );
}
