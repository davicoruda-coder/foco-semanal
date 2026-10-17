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
  AlertCircle,
  HelpCircle,
  ImagePlus,
  Lightbulb,
  Loader2,
  Maximize2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { uploadFlashcardImage } from "@/lib/revisao/image-upload";
import { FlashcardImageLightbox } from "./FlashcardImageLightbox";

export interface FlashcardSideComposerProps {
  side: "frente" | "verso";
  label?: string;
  textValue: string;
  onTextChange: (text: string) => void;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  disabled?: boolean;
  minRows?: number;
  placeholderText?: string;
  placeholderWithImage?: string;
  onLightboxOpen?: (url: string) => void;
  compact?: boolean;
}

export function FlashcardSideComposer({
  side,
  label,
  textValue,
  onTextChange,
  imageUrl,
  onImageChange,
  disabled = false,
  minRows = 3,
  placeholderText,
  placeholderWithImage,
  onLightboxOpen,
  compact = false,
}: FlashcardSideComposerProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [internalLightbox, setInternalLightbox] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFrente = side === "frente";
  const defaultLabel = isFrente ? "Frente" : "Verso";
  const sideTitle = label || defaultLabel;

  // Determina o formato atual deste lado do flashcard
  const hasText = Boolean(textValue.trim());
  const hasImage = Boolean(imageUrl);

  let formatType: "hibrido" | "imagem" | "texto" | "vazio" = "vazio";
  if (hasText && hasImage) formatType = "hibrido";
  else if (hasImage) formatType = "imagem";
  else if (hasText) formatType = "texto";

  const defaultPlaceholder = isFrente
    ? "Ex: O que é o princípio da insignificância? (ou anexe imagem abaixo)"
    : "Ex: Causa supralegal de exclusão da tipicidade material... (ou anexe imagem abaixo)";

  const defaultPlaceholderWithImg = isFrente
    ? "Adicione uma pergunta ou contexto adicional (opcional com imagem)..."
    : "Adicione uma resposta, regra ou explicação (opcional com imagem)...";

  const currentPlaceholder = hasImage
    ? placeholderWithImage || defaultPlaceholderWithImg
    : placeholderText || defaultPlaceholder;

  // Processamento e upload da imagem
  const processAndUpload = useCallback(
    async (file: File) => {
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
      if (!isImage) {
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
          onImageChange(res.url);
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
    [onImageChange, side],
  );

  // Captura colar (Ctrl+V) de prints/fotos diretamente no campo
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

  // Arrastar e soltar arquivos na caixa
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

  const handleOpenPreview = () => {
    if (!imageUrl) return;
    if (onLightboxOpen) {
      onLightboxOpen(imageUrl);
    } else {
      setInternalLightbox(imageUrl);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative flex flex-col rounded-[var(--radius-tag)] border transition-all duration-150 ${
        dragging
          ? isFrente
            ? "border-[var(--signal)] bg-[var(--signal-soft)]/40 ring-2 ring-[var(--signal-soft)]"
            : "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
          : isFrente
            ? "border-[var(--line)] bg-[var(--surface)] focus-within:border-[var(--signal)] focus-within:ring-2 focus-within:ring-[var(--signal-soft)]"
            : "border-[var(--line)] bg-[var(--surface)] focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20"
      } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      {/* Input de arquivo invisível */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Mini Cabeçalho Acoplado: Lado + Chip de Formato (Híbrido/Texto/Imagem) */}
      <div className="flex items-center justify-between border-b border-[var(--line)]/50 px-3 py-1.5 bg-[color-mix(in_srgb,var(--mist)_35%,var(--surface))] rounded-t-[calc(var(--radius-tag)-1px)]">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isFrente
                ? "bg-[var(--signal-soft)] text-[var(--signal)]"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {isFrente ? (
              <HelpCircle size={11} strokeWidth={2.5} />
            ) : (
              <Lightbulb size={11} strokeWidth={2.5} />
            )}
            {sideTitle}
          </span>
        </div>

        {/* Formato Dinâmico */}
        <div className="flex items-center gap-1.5">
          {formatType === "hibrido" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,#a855f7_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[#a855f7] dark:text-[#c084fc]">
              <Sparkles size={10} /> Híbrido (Texto + Foto)
            </span>
          )}
          {formatType === "imagem" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              Só Imagem
            </span>
          )}
          {formatType === "texto" && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
              Texto
            </span>
          )}
          {formatType === "vazio" && (
            <span className="inline-flex items-center text-[10px] italic text-[color-mix(in_srgb,var(--ink)_40%,transparent)]">
              Preencha texto ou foto
            </span>
          )}
        </div>
      </div>

      {/* Área de Texto Sem Borda Própria */}
      <div className="p-2.5 pb-1">
        <textarea
          rows={compact ? 2 : minRows}
          value={textValue}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={currentPlaceholder}
          disabled={disabled || uploading}
          className="w-full resize-none border-0 bg-transparent p-0 text-xs sm:text-[13px] leading-relaxed text-[var(--ink)] placeholder:text-[color-mix(in_srgb,var(--ink)_40%,transparent)] outline-none"
        />
      </div>

      {/* Estado de Envio da Imagem (Loader) */}
      {uploading && (
        <div className="mx-2.5 mb-2 flex items-center gap-2 rounded-lg border border-[var(--signal)]/30 bg-[var(--signal-soft)]/30 px-3 py-2 text-xs text-[var(--signal)]">
          <Loader2 size={14} className="animate-spin shrink-0" />
          <span className="truncate">Otimizando e enviando imagem WebP...</span>
        </div>
      )}

      {/* Dock da Imagem Anexada (Compacta, Integrada na Área de Conteúdo) */}
      {imageUrl && !uploading && (
        <div className="mx-2.5 mb-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[color-mix(in_srgb,var(--mist)_40%,var(--surface))] p-1.5 transition">
          <div className="flex items-center gap-2 min-w-0">
            {/* Miniatura clicável para ampliar */}
            <div
              onClick={handleOpenPreview}
              className="group/thumb relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-md border border-[var(--line)] bg-black/5 hover:opacity-90 transition"
              title="Clique para ampliar"
            >
              <img
                src={imageUrl}
                alt="Miniatura anexada"
                className="size-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover/thumb:opacity-100 transition">
                <Maximize2 size={12} />
              </div>
            </div>

            <div className="min-w-0">
              <span className="block text-xs font-semibold text-[var(--ink)] truncate">
                Foto anexada
              </span>
              <button
                type="button"
                onClick={handleOpenPreview}
                className="text-[10px] text-[var(--signal)] hover:underline inline-flex items-center gap-0.5"
              >
                <Maximize2 size={9} /> Ver em alta resolução
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Trocar foto */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--ink)] hover:bg-[var(--mist)] transition"
              title="Substituir por outra imagem"
            >
              Trocar
            </button>

            {/* Excluir foto */}
            <button
              type="button"
              onClick={() => onImageChange(null)}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-1 text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition"
              title="Remover imagem"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Mensagem de Erro de Upload */}
      {errorMessage && (
        <div className="mx-2.5 mb-2 flex items-center gap-1.5 text-[11px] font-medium text-red-500">
          <AlertCircle size={13} className="shrink-0" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Barra Inferior Acoplada: Dica de Atalho à Esquerda e Botão de Imagem no Canto Inferior Direito */}
      <div className="flex items-center justify-between border-t border-[var(--line)]/40 px-2.5 py-1.5 bg-[color-mix(in_srgb,var(--mist)_15%,var(--surface))] rounded-b-[calc(var(--radius-tag)-1px)]">
        {/* Dica discreta à esquerda */}
        <span className="text-[10px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)] select-none">
          {imageUrl
            ? "Imagem acoplada ao card"
            : dragging
              ? "Solte a imagem aqui!"
              : "Cole com Ctrl+V ou arraste"}
        </span>

        {/* Botão de Anexar Foto no Canto Inferior Direito */}
        <button
          type="button"
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
            imageUrl
              ? "bg-[color-mix(in_srgb,var(--signal)_10%,transparent)] text-[var(--signal)] hover:bg-[color-mix(in_srgb,var(--signal)_18%,transparent)]"
              : "border border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_75%,transparent)] hover:border-[var(--signal)] hover:text-[var(--signal)] hover:bg-[var(--signal-soft)]/20 shadow-2xs"
          }`}
          title={
            imageUrl
              ? "Adicionar outra imagem ou substituir"
              : "Anexar foto ou print (ou cole com Ctrl+V)"
          }
        >
          <ImagePlus size={13} className="shrink-0 text-[var(--signal)]" />
          <span>{imageUrl ? "Substituir foto" : "Anexar foto ou print"}</span>
        </button>
      </div>

      {/* Lightbox interno caso não tenha sido passado por prop */}
      {internalLightbox && (
        <FlashcardImageLightbox
          src={internalLightbox}
          alt={`Visualização de ${sideTitle}`}
          onClose={() => setInternalLightbox(null)}
        />
      )}
    </div>
  );
}
