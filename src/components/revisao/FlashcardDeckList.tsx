"use client";

import { useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Flame,
  Layers,
  Sparkles,
} from "lucide-react";
import { useRevisao } from "./RevisaoProvider";
import { FlashcardPlayer } from "./FlashcardPlayer";

export function FlashcardDeckList() {
  const { flashcardsDoDia, flashcardsLoading, reloadFlashcards } = useRevisao();
  const [activeDeck, setActiveDeck] = useState<"dia" | null>(null);

  if (activeDeck === "dia") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setActiveDeck(null);
              reloadFlashcards();
            }}
            className="text-xs font-semibold text-[var(--signal)] hover:underline"
          >
            ← Voltar para lista de Decks
          </button>
        </div>

        <FlashcardPlayer
          onFinish={() => {
            setActiveDeck(null);
            reloadFlashcards();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Deck Principal: Deck do Dia */}
      <div className="rounded-[var(--radius)] border border-[var(--signal)]/30 bg-gradient-to-br from-[var(--signal-soft)]/50 to-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--signal)]">
              <Sparkles size={16} />
              Revisão Espaçada Diária
            </div>
            <h3 className="text-base font-bold text-[var(--ink)]">
              Deck do Dia
            </h3>
            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
              Cards programados pelo algoritmo com base na sua última recordação.
            </p>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold text-[var(--signal)]">
              {flashcardsLoading ? "..." : flashcardsDoDia.length}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
              Cards para hoje
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--line)]/50">
          <button
            type="button"
            disabled={flashcardsLoading || flashcardsDoDia.length === 0}
            onClick={() => setActiveDeck("dia")}
            className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
          >
            <BookOpen size={14} />
            {flashcardsDoDia.length > 0 ? "Iniciar Revisão Diária" : "Tudo revisado por hoje!"}
          </button>
        </div>
      </div>

      {/* Informativo de Metodologia */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ef4444]">
            <Flame size={14} />
            1. Erro ou Chute
          </div>
          <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
            Ao registrar no caderno, o flashcard entra na fila com repetição em 24h para fixação imediata.
          </p>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f59e0b]">
            <Calendar size={14} />
            2. Espaçamento
          </div>
          <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
            Acertando os cards, os intervalos expandem automaticamente para 4 a 7 dias e depois 15 a 30 dias.
          </p>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ok,#16a34a)]">
            <Layers size={14} />
            3. Zero Retrabalho
          </div>
          <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
            Sem necessidade de exportar para Anki ou criar cards manualmente. Tudo integrado ao FocoHub.
          </p>
        </div>
      </div>
    </div>
  );
}
