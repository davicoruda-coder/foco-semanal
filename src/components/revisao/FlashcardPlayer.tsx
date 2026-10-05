"use client";

import { useEffect, useState } from "react";
import {
  RotateCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Flashcard } from "@/lib/revisao/types";
import {
  type RespostaRevisao,
  corNivelDominio,
} from "@/lib/revisao/spaced-repetition";
import { useRevisao } from "./RevisaoProvider";
import { FormattedRuleText } from "./FormattedRuleText";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface RatingOptionConfig {
  id: RespostaRevisao;
  label: string;
  interval: string;
  shortcut: string;
  baseClasses: string;
  selectedClasses: string;
}

const RATING_BUTTONS: RatingOptionConfig[] = [
  {
    id: "errei",
    label: "Errei",
    interval: "+1 dia",
    shortcut: "1",
    baseClasses:
      "border-[color-mix(in_srgb,#ef4444_30%,transparent)] bg-[color-mix(in_srgb,#ef4444_10%,transparent)] text-[#ef4444] hover:bg-[#ef4444] hover:text-white",
    selectedClasses:
      "bg-[#ef4444] text-white border-[#ef4444] shadow-md shadow-red-500/20 scale-[1.02] ring-2 ring-[#ef4444]/40 ring-offset-1 ring-offset-[var(--surface)]",
  },
  {
    id: "dificil",
    label: "Difícil",
    interval: "+2 dias",
    shortcut: "2",
    baseClasses:
      "border-[color-mix(in_srgb,#f59e0b_30%,transparent)] bg-[color-mix(in_srgb,#f59e0b_10%,transparent)] text-[#f59e0b] hover:bg-[#f59e0b] hover:text-white",
    selectedClasses:
      "bg-[#f59e0b] text-white border-[#f59e0b] shadow-md shadow-amber-500/20 scale-[1.02] ring-2 ring-[#f59e0b]/40 ring-offset-1 ring-offset-[var(--surface)]",
  },
  {
    id: "bom",
    label: "Bom",
    interval: "+4 a 7 dias",
    shortcut: "3",
    baseClasses:
      "border-[color-mix(in_srgb,#3b82f6_30%,transparent)] bg-[color-mix(in_srgb,#3b82f6_10%,transparent)] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white",
    selectedClasses:
      "bg-[#3b82f6] text-white border-[#3b82f6] shadow-md shadow-blue-500/20 scale-[1.02] ring-2 ring-[#3b82f6]/40 ring-offset-1 ring-offset-[var(--surface)]",
  },
  {
    id: "facil",
    label: "Fácil / Dominado",
    interval: "+15 a 30 dias",
    shortcut: "4",
    baseClasses:
      "border-[color-mix(in_srgb,#22c55e_30%,transparent)] bg-[color-mix(in_srgb,#22c55e_10%,transparent)] text-[#22c55e] hover:bg-[#22c55e] hover:text-white",
    selectedClasses:
      "bg-[#22c55e] text-white border-[#22c55e] shadow-md shadow-emerald-500/20 scale-[1.02] ring-2 ring-[#22c55e]/40 ring-offset-1 ring-offset-[var(--surface)]",
  },
];

export function FlashcardPlayer({
  cards,
  onFinish,
  onCardDeleted,
}: {
  cards?: Flashcard[];
  onFinish?: () => void;
  onCardDeleted?: (cardId: string) => void;
}) {
  const { flashcardsDoDia, responderFlashcard, deleteFlashcard } = useRevisao();
  const [sessionDeck, setSessionDeck] = useState<Flashcard[]>(cards || flashcardsDoDia);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRating, setSelectedRating] = useState<RespostaRevisao | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (cards) {
      setSessionDeck(cards);
    } else {
      setSessionDeck(flashcardsDoDia);
    }
  }, [cards, flashcardsDoDia]);

  const deck = sessionDeck;
  const currentCard =
    Array.isArray(deck) && currentIndex >= 0 && currentIndex < deck.length
      ? deck[currentIndex]
      : undefined;

  const isCompleted =
    !deck || deck.length === 0 || currentIndex >= deck.length || !currentCard;

  const handleResponse = async (resposta: RespostaRevisao) => {
    if (submitting || !currentCard) return;
    setSelectedRating(resposta);
    setSubmitting(true);
    try {
      await Promise.all([
        responderFlashcard(
          currentCard.id,
          currentCard.nivel_dominio ?? 0,
          resposta,
        ),
        // Feedback visual suave de 180ms para percepção tátil imediata antes de avançar
        new Promise((resolve) => setTimeout(resolve, 180)),
      ]);
      setIsFlipped(false);
      setSelectedRating(null);
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.warn("[FlashcardPlayer] erro ao responder:", err);
      setIsFlipped(false);
      setSelectedRating(null);
      setCurrentIndex((prev) => prev + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!currentCard || deleting) return;
    setDeleting(true);
    try {
      const cardId = currentCard.id;
      const ok = await deleteFlashcard(cardId);
      if (ok) {
        setSessionDeck((prev) => prev.filter((c) => c.id !== cardId));
        onCardDeleted?.(cardId);
        setIsFlipped(false);
        setSelectedRating(null);
        setShowDeleteConfirm(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        isCompleted ||
        showDeleteConfirm ||
        !currentCard ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped && !submitting) {
        if (e.key === "1") {
          e.preventDefault();
          void handleResponse("errei");
        } else if (e.key === "2") {
          e.preventDefault();
          void handleResponse("dificil");
        } else if (e.key === "3") {
          e.preventDefault();
          void handleResponse("bom");
        } else if (e.key === "4") {
          e.preventDefault();
          void handleResponse("facil");
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCompleted, isFlipped, submitting, showDeleteConfirm, currentCard]);

  if (isCompleted || !currentCard) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--signal-soft)] text-[var(--signal)]">
          <Sparkles size={24} />
        </div>
        <h3 className="text-base font-semibold text-[var(--ink)]">
          Deck Concluído!
        </h3>
        <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
          Não há flashcards pendentes para revisão no momento. Ótimo trabalho!
        </p>
        {onFinish && (
          <button
            type="button"
            onClick={onFinish}
            className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition"
          >
            Voltar ao início
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-8">
      {/* Indicador de Progresso e Ações */}
      <div className="flex items-center justify-between text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
        <span className="font-medium">
          Card {currentIndex + 1} de {deck.length}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs"
            style={{ backgroundColor: corNivelDominio(currentCard.nivel_dominio ?? 0) }}
          >
            Nível {currentCard.nivel_dominio ?? 0}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            title="Excluir flashcard"
            className="inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--line)_80%,transparent)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_60%,transparent)] transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 active:scale-95"
          >
            <Trash2 size={12} />
            <span>Excluir</span>
          </button>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--mist)]">
        <div
          className="h-full bg-[var(--signal)] transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / deck.length) * 100}%`,
          }}
        />
      </div>

      {/* Cartão Flashcard com Flip */}
      <div
        key={currentCard.id}
        onClick={() => setIsFlipped(!isFlipped)}
        className="group relative min-h-[260px] cursor-pointer rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-[var(--signal)] active:scale-[0.99] touch-manipulation select-none"
      >
        <div className="absolute right-3.5 top-3.5 flex items-center gap-1 text-[10px] font-medium text-[color-mix(in_srgb,var(--ink)_45%,transparent)] group-hover:text-[var(--signal)]">
          <RotateCw size={12} />
          {isFlipped ? "Ver Frente" : "Virar card"}
        </div>

        {!isFlipped ? (
          /* Frente */
          <div className="flex flex-col justify-center space-y-3 pt-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
              Desafio / Enunciado
            </span>
            <FormattedRuleText
              text={currentCard.frente || ""}
              className="text-base font-medium text-[var(--ink)] leading-relaxed"
            />
          </div>
        ) : (
          /* Verso */
          <div className="flex flex-col justify-center space-y-3 pt-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ok,#16a34a)]">
              Regra Chave & Resolução
            </span>
            <FormattedRuleText text={currentCard.verso || ""} />
          </div>
        )}
      </div>

      {/* Botões de Ação de Spaced Repetition (Somente no verso) */}
      {isFlipped ? (
        <div className="space-y-2 animate-in fade-in duration-200">
          <p className="text-center text-xs font-medium text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
            Como foi sua recordação?
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATING_BUTTONS.map((btn) => {
              const isSelected = selectedRating === btn.id;
              const isOtherSelected = selectedRating !== null && !isSelected;

              return (
                <button
                  key={btn.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleResponse(btn.id)}
                  aria-pressed={isSelected}
                  className={`group relative flex flex-col items-center justify-center rounded-[var(--radius-btn)] border px-3 py-2 sm:py-2.5 text-xs font-semibold select-none cursor-pointer transition-all duration-150 ease-out active:scale-95 touch-manipulation ${
                    isSelected
                      ? btn.selectedClasses
                      : isOtherSelected
                        ? "opacity-35 scale-[0.98] pointer-events-none border-[var(--line)] bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_50%,transparent)]"
                        : `${btn.baseClasses} hover:scale-[1.01]`
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <span>{btn.label}</span>
                    <span className="hidden sm:inline-block rounded px-1 py-0.5 text-[9px] font-mono opacity-50 bg-black/10 dark:bg-white/10 leading-none">
                      {btn.shortcut}
                    </span>
                  </span>
                  <span
                    className={`block text-[10px] font-normal transition-opacity ${
                      isSelected ? "text-white/90" : "opacity-80 group-hover:opacity-100"
                    }`}
                  >
                    {btn.interval}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsFlipped(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] py-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-[0.99] transition cursor-pointer"
        >
          <RotateCw size={14} />
          Mostrar Resposta
        </button>
      )}

      {/* Confirmação de exclusão do flashcard */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Excluir Flashcard"
        message="Conseguiu entender e fixar o conceito? Deseja prosseguir com a exclusão definitiva deste flashcard?"
        confirmLabel={deleting ? "Excluindo..." : "Sim, excluir"}
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDeleteCard}
        onCancel={() => {
          if (!deleting) setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
}
