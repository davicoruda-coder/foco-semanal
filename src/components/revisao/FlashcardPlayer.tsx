"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  RotateCw,
  Sparkles,
  Video,
  Volume2,
} from "lucide-react";
import type { Flashcard } from "@/lib/revisao/types";
import {
  RESPOSTA_LABEL,
  type RespostaRevisao,
  corNivelDominio,
} from "@/lib/revisao/spaced-repetition";
import { useRevisao } from "./RevisaoProvider";
import { FormattedRuleText } from "./FormattedRuleText";

export function FlashcardPlayer({
  cards,
  onFinish,
}: {
  cards?: Flashcard[];
  onFinish?: () => void;
}) {
  const { flashcardsDoDia, responderFlashcard } = useRevisao();
  const deck = cards || flashcardsDoDia;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentCard = deck[currentIndex];

  if (!deck || deck.length === 0 || currentIndex >= deck.length) {
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
            className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110"
          >
            Voltar ao início
          </button>
        )}
      </div>
    );
  }

  const handleResponse = async (resposta: RespostaRevisao) => {
    if (submitting || !currentCard) return;
    setSubmitting(true);
    try {
      await responderFlashcard(
        currentCard.id,
        currentCard.nivel_dominio,
        resposta,
      );
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Indicador de Progresso */}
      <div className="flex items-center justify-between text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
        <span>
          Card {currentIndex + 1} de {deck.length}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: corNivelDominio(currentCard.nivel_dominio) }}
        >
          Nível {currentCard.nivel_dominio}
        </span>
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
        onClick={() => setIsFlipped(!isFlipped)}
        className="group relative min-h-[260px] cursor-pointer rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] transition hover:border-[var(--signal)]"
      >
        <div className="absolute right-3.5 top-3.5 flex items-center gap-1 text-[10px] font-medium text-[color-mix(in_srgb,var(--ink)_45%,transparent)] group-hover:text-[var(--signal)]">
          <RotateCw size={12} />
          {isFlipped ? "Ver Frente" : "Clique para Virar"}
        </div>

        {!isFlipped ? (
          /* Frente */
          <div className="flex flex-col justify-center space-y-3 pt-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
              Desafio / Enunciado
            </span>
            <FormattedRuleText
              text={currentCard.frente}
              className="text-base font-medium text-[var(--ink)] leading-relaxed"
            />
          </div>
        ) : (
          /* Verso */
          <div className="flex flex-col justify-center space-y-3 pt-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ok,#16a34a)]">
              Regra Chave & Resolução
            </span>
            <FormattedRuleText text={currentCard.verso} />
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
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleResponse("errei")}
              className="rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,#ef4444_30%,transparent)] bg-[color-mix(in_srgb,#ef4444_10%,transparent)] px-3 py-2 text-xs font-semibold text-[#ef4444] transition hover:bg-[#ef4444] hover:text-white"
            >
              Errei
              <span className="block text-[10px] font-normal opacity-80">+1 dia</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleResponse("dificil")}
              className="rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,#f59e0b_30%,transparent)] bg-[color-mix(in_srgb,#f59e0b_10%,transparent)] px-3 py-2 text-xs font-semibold text-[#f59e0b] transition hover:bg-[#f59e0b] hover:text-white"
            >
              Difícil
              <span className="block text-[10px] font-normal opacity-80">+2 dias</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleResponse("bom")}
              className="rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,#3b82f6_30%,transparent)] bg-[color-mix(in_srgb,#3b82f6_10%,transparent)] px-3 py-2 text-xs font-semibold text-[#3b82f6] transition hover:bg-[#3b82f6] hover:text-white"
            >
              Bom
              <span className="block text-[10px] font-normal opacity-80">+4 a 7 dias</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleResponse("facil")}
              className="rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,#22c55e_30%,transparent)] bg-[color-mix(in_srgb,#22c55e_10%,transparent)] px-3 py-2 text-xs font-semibold text-[#22c55e] transition hover:bg-[#22c55e] hover:text-white"
            >
              Fácil / Dominado
              <span className="block text-[10px] font-normal opacity-80">+15 a 30 dias</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsFlipped(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] py-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-110"
        >
          <RotateCw size={14} />
          Mostrar Resposta (Espaço / Clique)
        </button>
      )}
    </div>
  );
}
