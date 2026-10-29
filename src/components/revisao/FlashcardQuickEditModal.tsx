"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Pencil, X } from "lucide-react";
import type { Flashcard } from "@/lib/revisao/types";
import { DialogFrame } from "@/components/DialogFrame";
import { FlashcardSideComposer } from "./FlashcardSideComposer";
import { FlashcardImageLightbox } from "./FlashcardImageLightbox";

export interface FlashcardQuickEditModalProps {
  open: boolean;
  card?: Flashcard | null;
  onClose: () => void;
  onSave: (
    cardId: string,
    updates: {
      frente: string;
      verso: string;
      frente_imagem_url: string | null;
      verso_imagem_url: string | null;
    },
  ) => Promise<boolean>;
}

function QuickEditForm({
  card,
  onClose,
  onSave,
}: {
  card: Flashcard;
  onClose: () => void;
  onSave: FlashcardQuickEditModalProps["onSave"];
}) {
  const [frente, setFrente] = useState(() => card.frente ?? "");
  const [verso, setVerso] = useState(() => card.verso ?? "");
  const [frenteImg, setFrenteImg] = useState<string | null>(() => card.frente_imagem_url ?? null);
  const [versoImg, setVersoImg] = useState<string | null>(() => card.verso_imagem_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (saving) return;

    const trimmedFrente = frente.trim();
    const trimmedVerso = verso.trim();
    const hasFrente = Boolean(trimmedFrente || frenteImg);
    const hasVerso = Boolean(trimmedVerso || versoImg);

    if (!hasFrente) {
      setError("A frente do flashcard não pode ficar vazia (adicione texto ou imagem).");
      return;
    }

    if (!hasVerso) {
      setError("O verso do flashcard não pode ficar vazio (adicione texto ou imagem).");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const ok = await onSave(card.id, {
        frente: trimmedFrente,
        verso: trimmedVerso,
        frente_imagem_url: frenteImg,
        verso_imagem_url: versoImg,
      });

      if (ok) {
        onClose();
      } else {
        setError("Não foi possível salvar as alterações. Tente novamente.");
      }
    } catch (err) {
      console.error("[FlashcardQuickEditModal] erro ao salvar card:", err);
      setError("Ocorreu um erro ao salvar o flashcard.");
    } finally {
      setSaving(false);
    }
  }, [card.id, saving, frente, verso, frenteImg, versoImg, onSave, onClose]);

  // Atalhos de teclado no formulário: Ctrl+Enter para salvar, Esc para fechar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSave();
      } else if (e.key === "Escape" && !lightboxSrc) {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, onClose, lightboxSrc]);

  return (
    <>
      {/* Cabeçalho do Modal */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)]">
            <Pencil size={18} />
          </div>
          <div className="min-w-0">
            <h2
              id="quick-edit-flashcard-title"
              className="text-base font-bold text-[var(--ink)] truncate"
            >
              Editar Flashcard
            </h2>
            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)] truncate">
              Corrija erros ou aprimore o card sem interromper sua sessão.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-lg p-1 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition cursor-pointer"
          title="Fechar (Esc)"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Formulário com Frente e Verso */}
      <div className="space-y-4 py-4 max-h-[calc(85vh-140px)] overflow-y-auto pr-0.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FlashcardSideComposer
            side="frente"
            label="Frente (Pergunta / Enunciado)"
            textValue={frente}
            onTextChange={setFrente}
            imageUrl={frenteImg}
            onImageChange={setFrenteImg}
            disabled={saving}
            onLightboxOpen={setLightboxSrc}
            compact
          />
          <FlashcardSideComposer
            side="verso"
            label="Verso (Resposta / Explicação)"
            textValue={verso}
            onTextChange={setVerso}
            imageUrl={versoImg}
            onImageChange={setVersoImg}
            disabled={saving}
            onLightboxOpen={setLightboxSrc}
            compact
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-medium text-rose-600 dark:text-rose-400">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Rodapé com Ações */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3.5">
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
          Dica: pressione <kbd className="rounded border border-[var(--line)] bg-[var(--mist)] px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd> + <kbd className="rounded border border-[var(--line)] bg-[var(--mist)] px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> para salvar
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-[var(--radius-btn)] border border-[var(--line)] px-3.5 py-1.5 text-xs font-semibold text-[color-mix(in_srgb,var(--ink)_80%,transparent)] hover:bg-[var(--mist)] transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check size={13} />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lightbox para zoom de imagens no editor */}
      <FlashcardImageLightbox
        src={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
      />
    </>
  );
}

export function FlashcardQuickEditModal({
  open,
  card,
  onClose,
  onSave,
}: FlashcardQuickEditModalProps) {
  return (
    <DialogFrame
      open={open && Boolean(card)}
      onClose={onClose}
      labelledBy="quick-edit-flashcard-title"
      overlayClassName="!z-[90]"
      cardClassName="surface w-full max-w-2xl p-4 sm:p-6 shadow-[var(--shadow-lg)]"
    >
      {card ? (
        <QuickEditForm
          key={`${card.id}-${card.frente}-${card.verso}`}
          card={card}
          onClose={onClose}
          onSave={onSave}
        />
      ) : null}
    </DialogFrame>
  );
}
