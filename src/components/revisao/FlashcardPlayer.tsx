/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Maximize2,
  Minimize2,
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
  badgeClasses: string;
  intervalClasses: string;
}

const RATING_BUTTONS: RatingOptionConfig[] = [
  {
    id: "errei",
    label: "Errei",
    interval: "+1 dia",
    shortcut: "1",
    baseClasses:
      "border-rose-300 bg-rose-50/90 text-rose-800 hover:bg-rose-100 hover:border-rose-400 dark:bg-rose-950/40 dark:border-rose-800/80 dark:text-rose-200 dark:hover:bg-rose-900/50 shadow-xs",
    selectedClasses:
      "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30 scale-[1.02] ring-2 ring-rose-400/50",
    badgeClasses:
      "bg-rose-200/90 text-rose-900 dark:bg-rose-900/80 dark:text-rose-100",
    intervalClasses:
      "text-rose-700/95 dark:text-rose-300",
  },
  {
    id: "dificil",
    label: "Difícil",
    interval: "+2 dias",
    shortcut: "2",
    baseClasses:
      "border-amber-300 bg-amber-50/90 text-amber-900 hover:bg-amber-100 hover:border-amber-400 dark:bg-amber-950/40 dark:border-amber-800/80 dark:text-amber-200 dark:hover:bg-amber-900/50 shadow-xs",
    selectedClasses:
      "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/30 scale-[1.02] ring-2 ring-amber-400/50",
    badgeClasses:
      "bg-amber-200/90 text-amber-950 dark:bg-amber-900/80 dark:text-amber-100",
    intervalClasses:
      "text-amber-800/95 dark:text-amber-300",
  },
  {
    id: "bom",
    label: "Bom",
    interval: "+4 a 7 dias",
    shortcut: "3",
    baseClasses:
      "border-blue-300 bg-blue-50/90 text-blue-800 hover:bg-blue-100 hover:border-blue-400 dark:bg-blue-950/40 dark:border-blue-800/80 dark:text-blue-200 dark:hover:bg-blue-900/50 shadow-xs",
    selectedClasses:
      "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30 scale-[1.02] ring-2 ring-blue-400/50",
    badgeClasses:
      "bg-blue-200/90 text-blue-950 dark:bg-blue-900/80 dark:text-blue-100",
    intervalClasses:
      "text-blue-700/95 dark:text-blue-300",
  },
  {
    id: "facil",
    label: "Fácil / Dominado",
    interval: "+15 a 30 dias",
    shortcut: "4",
    baseClasses:
      "border-emerald-300 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-200 dark:hover:bg-emerald-900/50 shadow-xs",
    selectedClasses:
      "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30 scale-[1.02] ring-2 ring-emerald-400/50",
    badgeClasses:
      "bg-emerald-200/90 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-100",
    intervalClasses:
      "text-emerald-800/95 dark:text-emerald-300",
  },
];

export function FlashcardPlayer({
  cards,
  materiaNome,
  onFinish,
  onCardDeleted,
}: {
  cards?: Flashcard[];
  materiaNome?: string;
  onFinish?: () => void;
  onCardDeleted?: (cardId: string) => void;
}) {
  const { flashcardsDoDia, responderFlashcard, deleteFlashcard } = useRevisao();
  const [mounted, setMounted] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRating, setSelectedRating] = useState<RespostaRevisao | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloqueia a rolagem do body quando estiver em modo ampliado/tela cheia
  useEffect(() => {
    if (!isImmersiveMode) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isImmersiveMode]);

  const baseDeck = cards ?? flashcardsDoDia;
  const deck = useMemo(
    () => baseDeck.filter((c) => !deletedIds.includes(c.id)),
    [baseDeck, deletedIds],
  );
  const currentCard =
    Array.isArray(deck) && currentIndex >= 0 && currentIndex < deck.length
      ? deck[currentIndex]
      : undefined;

  const subjectName =
    materiaNome ||
    currentCard?.disciplina ||
    currentCard?.questao?.disciplina ||
    null;

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
        setDeletedIds((prev) => [...prev, cardId]);
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

      if (e.key === "Escape" && isImmersiveMode) {
        e.preventDefault();
        setIsImmersiveMode(false);
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
  }, [isCompleted, isFlipped, submitting, showDeleteConfirm, isImmersiveMode, currentCard]);

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
            className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition cursor-pointer"
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
        <div className="flex items-center gap-1.5 min-w-0">
          {subjectName && (
            <span className="font-bold text-[var(--ink)] truncate max-w-[160px] sm:max-w-[240px]">
              {subjectName}
            </span>
          )}
          {subjectName && (
            <span className="text-[color-mix(in_srgb,var(--ink)_35%,transparent)]">•</span>
          )}
          <span className="font-medium whitespace-nowrap">
            Card {currentIndex + 1} de {deck.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs"
            style={{ backgroundColor: corNivelDominio(currentCard.nivel_dominio ?? 0) }}
          >
            Nível {currentCard.nivel_dominio ?? 0}
          </span>
          <button
            type="button"
            onClick={() => setIsImmersiveMode(true)}
            title="Entrar no Modo Foco (Tela Cheia)"
            className="inline-flex items-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--line)_80%,transparent)] bg-[var(--surface)] px-2.5 py-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_75%,transparent)] transition hover:border-[var(--signal)] hover:text-[var(--signal)] active:scale-95 cursor-pointer"
          >
            <Maximize2 size={12} className="text-[var(--signal)]" />
            <span>Modo Foco</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            title="Excluir flashcard"
            className="inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--line)_80%,transparent)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_60%,transparent)] transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 active:scale-95 cursor-pointer"
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

            {currentCard.frente_imagem_url && (
              <div
                className="relative my-1 max-h-72 w-full overflow-hidden rounded-lg border border-[var(--line)] bg-black/5 dark:bg-black/25 flex items-center justify-center transition hover:border-[var(--signal)] select-none"
              >
                <img
                  src={currentCard.frente_imagem_url}
                  alt="Imagem da Frente"
                  className="max-h-72 w-auto max-w-full object-contain pointer-events-none"
                  draggable={false}
                />
              </div>
            )}

            {currentCard.frente && (
              <FormattedRuleText
                text={currentCard.frente}
                className="text-base font-medium text-[var(--ink)] leading-relaxed"
              />
            )}
          </div>
        ) : (
          /* Verso */
          <div className="flex flex-col justify-center space-y-3 pt-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ok,#16a34a)]">
              Regra Chave & Resolução
            </span>

            {currentCard.verso_imagem_url && (
              <div
                className="relative my-1 max-h-72 w-full overflow-hidden rounded-lg border border-[var(--line)] bg-black/5 dark:bg-black/25 flex items-center justify-center transition hover:border-emerald-500 select-none"
              >
                <img
                  src={currentCard.verso_imagem_url}
                  alt="Imagem do Verso"
                  className="max-h-72 w-auto max-w-full object-contain pointer-events-none"
                  draggable={false}
                />
              </div>
            )}

            {currentCard.verso && <FormattedRuleText text={currentCard.verso} />}
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
                  className={`group relative flex flex-col items-center justify-center rounded-[var(--radius-btn)] border px-3 py-2.5 sm:py-3 text-xs font-bold select-none cursor-pointer transition-all duration-150 ease-out active:scale-95 touch-manipulation ${
                    isSelected
                      ? btn.selectedClasses
                      : isOtherSelected
                        ? "opacity-25 scale-[0.98] pointer-events-none border-[var(--line)] bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_50%,transparent)]"
                        : `${btn.baseClasses} hover:-translate-y-0.5`
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <span>{btn.label}</span>
                    <span
                      className={`hidden sm:inline-block rounded px-1.5 py-0.5 text-[9px] font-mono font-bold leading-none ${
                        isSelected
                          ? "bg-white/25 text-white"
                          : btn.badgeClasses
                      }`}
                    >
                      {btn.shortcut}
                    </span>
                  </span>
                  <span
                    className={`block text-[11px] font-semibold mt-0.5 transition-opacity ${
                      isSelected ? "text-white/95" : btn.intervalClasses
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

      {/* Modo Treino Ampliado / Foco Imersivo (Portal) */}
      {isImmersiveMode &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="dark fixed inset-0 z-[80] flex flex-col justify-between bg-neutral-950/95 sm:bg-neutral-950/90 sm:backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200 select-none overflow-hidden"
          >
            {isCompleted || !currentCard ? (
              <div className="m-auto w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/95 p-8 text-center text-white shadow-2xl">
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-[var(--signal-soft)] text-[var(--signal)]">
                  <Sparkles size={28} />
                </div>
                <h3 className="text-lg font-bold">Deck Concluído!</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  Não há mais flashcards pendentes para revisão no momento. Excelente trabalho!
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsImmersiveMode(false);
                      onFinish?.();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--signal)] px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition cursor-pointer"
                  >
                    Voltar ao Início
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsImmersiveMode(false)}
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-neutral-300 hover:bg-white/10 transition cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Cabeçalho do Modo Treino Ampliado */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2 text-white">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 rounded-full bg-[var(--signal-soft)] text-[var(--signal)] px-2.5 py-0.5 text-xs font-semibold">
                      <Sparkles size={13} /> {subjectName || "Treino Ampliado"}
                    </span>
                    <span className="text-xs font-medium text-neutral-400">
                      Card {currentIndex + 1} de {deck.length}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs"
                      style={{
                        backgroundColor: corNivelDominio(currentCard.nivel_dominio ?? 0),
                      }}
                    >
                      Nível {currentCard.nivel_dominio ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFlipped((prev) => !prev)}
                      className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                    >
                      <RotateCw size={13} />
                      <span>{isFlipped ? "Ver Frente" : "Virar card"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsImmersiveMode(false)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-neutral-200 hover:bg-white/20 hover:text-white transition cursor-pointer"
                      title="Sair do modo ampliado (ESC)"
                    >
                      <Minimize2 size={13} />
                      <span className="hidden sm:inline">Minimizar</span>
                      <span className="sm:hidden text-xs">Sair</span>
                    </button>
                  </div>
                </div>

                {/* Barra sutil de progresso */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/10 mb-2">
                  <div
                    className="h-full bg-[var(--signal)] transition-all duration-300"
                    style={{
                      width: `${((currentIndex + 1) / deck.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Corpo do Cartão Ampliado (clique para virar) */}
                <div
                  key={`immersive-${currentCard.id}`}
                  onClick={() => setIsFlipped((prev) => !prev)}
                  className="relative flex-1 min-h-0 flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-neutral-900/85 p-3 sm:p-6 shadow-2xl cursor-pointer overflow-y-auto transition hover:border-[var(--signal)]/50 active:scale-[0.995]"
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-medium text-neutral-400 sm:hidden">
                    <RotateCw size={12} />
                    {isFlipped ? "Ver Frente" : "Virar card"}
                  </div>

                  {!isFlipped ? (
                    /* Frente Ampliada */
                    <div className="flex flex-col items-center justify-center space-y-3 w-full my-auto text-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--signal)]">
                        Desafio / Enunciado
                      </span>

                      {currentCard.frente_imagem_url && (
                        <div className="relative max-h-[50vh] sm:max-h-[56vh] w-full flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40 p-1">
                          <img
                            src={currentCard.frente_imagem_url}
                            alt="Imagem da Frente"
                            className="max-h-[48vh] sm:max-h-[54vh] w-auto max-w-full object-contain rounded-lg select-none pointer-events-none"
                            draggable={false}
                          />
                        </div>
                      )}

                      {currentCard.frente && (
                        <div className="max-w-2xl px-2">
                          <FormattedRuleText
                            text={currentCard.frente}
                            className="text-base sm:text-lg font-medium text-neutral-100 leading-relaxed text-center sm:text-left"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Verso Ampliado */
                    <div className="flex flex-col items-center justify-center space-y-3 w-full my-auto text-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Regra Chave & Resolução
                      </span>

                      {currentCard.verso_imagem_url && (
                        <div className="relative max-h-[46vh] sm:max-h-[52vh] w-full flex items-center justify-center overflow-hidden rounded-xl border border-emerald-500/20 bg-black/40 p-1">
                          <img
                            src={currentCard.verso_imagem_url}
                            alt="Imagem do Verso"
                            className="max-h-[44vh] sm:max-h-[50vh] w-auto max-w-full object-contain rounded-lg select-none pointer-events-none"
                            draggable={false}
                          />
                        </div>
                      )}

                      {currentCard.verso && (
                        <div className="max-w-2xl px-2">
                          <FormattedRuleText
                            text={currentCard.verso}
                            className="text-base sm:text-lg text-neutral-200 leading-relaxed text-center sm:text-left"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Rodapé com Ações de Treino */}
                <div className="pt-2 sm:pt-3" onClick={(e) => e.stopPropagation()}>
                  {!isFlipped ? (
                    <button
                      type="button"
                      onClick={() => setIsFlipped(true)}
                      className="w-full max-w-md mx-auto flex items-center justify-center gap-2 rounded-xl bg-[var(--signal)] py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-semibold text-white shadow-lg hover:brightness-110 active:scale-[0.99] transition cursor-pointer"
                    >
                      <RotateCw size={15} />
                      <span>Mostrar Resposta</span>
                    </button>
                  ) : (
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <p className="text-center text-xs font-medium text-neutral-400">
                        Como foi sua recordação?
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 max-w-3xl mx-auto">
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
                              className={`group relative flex flex-col items-center justify-center rounded-xl border p-2.5 sm:py-3 text-xs font-bold select-none cursor-pointer transition-all duration-150 ease-out active:scale-95 touch-manipulation ${
                                isSelected
                                  ? btn.selectedClasses
                                  : isOtherSelected
                                    ? "opacity-25 scale-[0.98] pointer-events-none border-neutral-700 bg-neutral-800 text-neutral-400"
                                    : `${btn.baseClasses} hover:-translate-y-0.5`
                              }`}
                            >
                              <span className="flex items-center gap-1.5 font-bold">
                                <span>{btn.label}</span>
                                <span
                                  className={`hidden sm:inline-block rounded px-1.5 py-0.5 text-[9px] font-mono font-bold leading-none ${
                                    isSelected
                                      ? "bg-white/25 text-white"
                                      : btn.badgeClasses
                                  }`}
                                >
                                  {btn.shortcut}
                                </span>
                              </span>
                              <span
                                className={`block text-[11px] font-semibold mt-0.5 transition-opacity ${
                                  isSelected ? "text-white/95" : btn.intervalClasses
                                }`}
                              >
                                {btn.interval}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
