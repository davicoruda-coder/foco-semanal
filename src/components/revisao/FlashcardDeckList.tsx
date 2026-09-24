"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Flame,
  Layers,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Flashcard, MateriaRevisao } from "@/lib/revisao/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useRevisao } from "./RevisaoProvider";
import { FlashcardPlayer } from "./FlashcardPlayer";
import { AIFlashcardGenerator } from "./AIFlashcardGenerator";
import { FlashcardManagerModal } from "./FlashcardManagerModal";

type ActiveDeckState = {
  id: string;
  title: string;
  cards: Flashcard[];
} | null;

export function FlashcardDeckList() {
  const {
    flashcardsDoDia,
    allFlashcards,
    flashcardsLoading,
    reloadFlashcards,
    materias,
    addMateria,
    deleteMateria,
  } = useRevisao();

  const [activeDeck, setActiveDeck] = useState<ActiveDeckState>(null);
  const [showNewMateria, setShowNewMateria] = useState(false);
  const [newMateriaName, setNewMateriaName] = useState("");
  const [savingMateria, setSavingMateria] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [managingMateria, setManagingMateria] = useState<MateriaRevisao | null>(
    null,
  );

  /* Criar nova matéria */
  async function handleCreateMateria(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newMateriaName.trim();
    if (!trimmed) return;

    setSavingMateria(true);
    await addMateria(trimmed);
    setSavingMateria(false);
    setNewMateriaName("");
    setShowNewMateria(false);
  }

  const [pendingDeleteMateria, setPendingDeleteMateria] =
    useState<MateriaRevisao | null>(null);

  /* Excluir matéria */
  function handleDelete(materia: MateriaRevisao) {
    setPendingDeleteMateria(materia);
  }

  /* Se um deck estiver ativo, renderiza o Player focado */
  if (activeDeck) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveDeck(null);
              reloadFlashcards();
            }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--signal)] hover:underline"
          >
            <ArrowLeft size={16} /> Voltar para lista de Decks
          </button>
          <div className="text-xs font-semibold text-[color-mix(in_srgb,var(--ink)_60%,transparent)] uppercase tracking-wider">
            Deck: <span className="text-[var(--ink)] font-bold">{activeDeck.title}</span> ({activeDeck.cards.length} {activeDeck.cards.length === 1 ? "card" : "cards"})
          </div>
        </div>

        <FlashcardPlayer
          cards={activeDeck.cards}
          onFinish={() => {
            setActiveDeck(null);
            reloadFlashcards();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Deck Principal Geral: Deck do Dia */}
      <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--signal)_30%,var(--line))] bg-gradient-to-br from-[color-mix(in_srgb,var(--signal)_10%,var(--surface))] via-[var(--surface)] to-[color-mix(in_srgb,var(--signal)_4%,var(--surface))] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--signal)]">
              <Sparkles size={16} />
              Revisão Espaçada Geral
            </div>
            <h3 className="text-base font-bold text-[var(--ink)] sm:text-lg">
              Deck Global do Dia
            </h3>
            <p className="text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
              Todos os cartões de todas as matérias agendados para hoje pelo algoritmo.
            </p>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="text-2xl font-bold text-[var(--signal)] sm:text-3xl">
              {flashcardsLoading ? "..." : flashcardsDoDia.length}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
              Cards hoje
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--line)]/50">
          <button
            type="button"
            disabled={flashcardsLoading || flashcardsDoDia.length === 0}
            onClick={() =>
              setActiveDeck({
                id: "dia",
                title: "Deck Global do Dia",
                cards: flashcardsDoDia,
              })
            }
            className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
          >
            <BookOpen size={16} />
            {flashcardsDoDia.length > 0
              ? `Iniciar Revisão Geral (${flashcardsDoDia.length} cards)`
              : "Tudo revisado por hoje no Deck Geral!"}
          </button>
        </div>
      </div>

      {/* SEÇÃO: MATÉRIAS & DECKS ESPECÍFICOS */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-[var(--ink)] sm:text-lg">
              Decks por Matéria
            </h3>
            <p className="text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
              Organize seus cards em matérias e treine cada disciplina de forma isolada.
            </p>
          </div>

          {!showNewMateria && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAIGenerator(!showAIGenerator)}
                className={`inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border px-3 py-1.5 text-xs sm:text-sm font-semibold shadow-sm transition ${
                  showAIGenerator
                    ? "border-[var(--signal)] bg-[color-mix(in_srgb,var(--signal)_10%,var(--surface))] text-[var(--signal)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,#a855f7_70%,var(--ink))] hover:border-[color-mix(in_srgb,#a855f7_40%,var(--line))]"
                }`}
              >
                <Sparkles size={14} />
                Gerar com IA
              </button>
              <button
                type="button"
                onClick={() => setShowNewMateria(true)}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--signal)] shadow-sm hover:border-[var(--signal)] transition"
              >
                <Plus size={16} />
                Nova Matéria
              </button>
            </div>
          )}
        </div>

        {/* Formulário de Nova Matéria */}
        {showNewMateria && (
          <form
            onSubmit={handleCreateMateria}
            className="surface rounded-[var(--radius)] border border-[var(--signal)]/40 bg-[color-mix(in_srgb,var(--signal)_4%,var(--surface))] p-4 shadow-[var(--shadow-sm)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
                Cadastrar Matéria de Revisão
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowNewMateria(false);
                  setNewMateriaName("");
                }}
                className="text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:text-[var(--ink)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                autoFocus
                value={newMateriaName}
                onChange={(e) => setNewMateriaName(e.target.value)}
                placeholder="Nome da matéria (ex: Português, RLM, TI...)"
                required
                className="flex-1 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--signal)]"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingMateria || !newMateriaName.trim()}
                  className="rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-2 text-xs sm:text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {savingMateria ? "Salvando..." : "Salvar Matéria"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMateria(false);
                    setNewMateriaName("");
                  }}
                  className="rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs sm:text-sm font-medium text-[var(--ink)] hover:bg-[var(--mist)]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Painel de Geração com IA */}
        {showAIGenerator && (
          <div className="surface rounded-[var(--radius)] border border-[color-mix(in_srgb,#a855f7_25%,var(--line))] bg-[color-mix(in_srgb,#a855f7_3%,var(--surface))] p-4 sm:p-5 shadow-[var(--shadow-sm)]">
            <AIFlashcardGenerator
              onClose={() => {
                setShowAIGenerator(false);
                reloadFlashcards();
              }}
            />
          </div>
        )}

        {/* Grade de Matérias */}
        {materias.length === 0 ? (
          <div className="surface rounded-[var(--radius)] border border-dashed border-[var(--line)] p-8 text-center space-y-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-[var(--signal-soft)] text-[var(--signal)] mx-auto">
              <Layers size={24} />
            </div>
            <div className="max-w-md mx-auto">
              <h4 className="font-display text-sm sm:text-base font-bold text-[var(--ink)]">
                Nenhuma matéria cadastrada na revisão
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
                Cadastre suas matérias para organizar seus flashcards em decks separados e treinar uma disciplina de cada vez.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewMateria(true)}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              <Plus size={16} /> Cadastrar primeira matéria
            </button>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {materias.map((materia) => {
              const materiaNomeLower = materia.nome.toLowerCase();

              // Cards de hoje desta matéria (caderno ou IA)
              const cardsHoje = flashcardsDoDia.filter(
                (c) =>
                  c.questao?.disciplina?.toLowerCase() === materiaNomeLower ||
                  c.disciplina?.toLowerCase() === materiaNomeLower,
              );

              // Todos os cards desta matéria (caderno ou IA)
              const cardsTotal = allFlashcards.filter(
                (c) =>
                  c.questao?.disciplina?.toLowerCase() === materiaNomeLower ||
                  c.disciplina?.toLowerCase() === materiaNomeLower,
              );

              const hasCardsHoje = cardsHoje.length > 0;
              const hasTotalCards = cardsTotal.length > 0;

              return (
                <div
                  key={materia.id}
                  className="surface rounded-[var(--radius)] border border-[var(--line)] p-4 sm:p-5 flex flex-col justify-between gap-4 transition hover:border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] shadow-[var(--shadow-xs)]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)]">
                          <BookOpen size={18} />
                        </div>
                        <h4 className="font-display font-semibold text-base text-[var(--ink)] truncate max-w-[170px] sm:max-w-[200px]" title={materia.nome}>
                          {materia.nome}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(materia)}
                        title="Remover matéria da revisão"
                        className="text-[color-mix(in_srgb,var(--ink)_35%,transparent)] hover:text-[var(--warn)] p-1 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-semibold text-[11px] ${
                          hasCardsHoje
                            ? "bg-[var(--signal-soft)] text-[var(--signal)]"
                            : "bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_50%,transparent)]"
                        }`}
                      >
                        {hasCardsHoje
                          ? `${cardsHoje.length} para hoje`
                          : "0 para hoje"}
                      </span>

                      <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] font-medium">
                        {cardsTotal.length} {cardsTotal.length === 1 ? "card total" : "cards no total"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--line)]/50 space-y-2">
                    {hasCardsHoje ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDeck({
                              id: materia.id,
                              title: materia.nome,
                              cards: cardsHoje,
                            })
                          }
                          className="flex-1 rounded-[var(--radius-btn)] bg-[var(--signal)] py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
                        >
                          Treinar Hoje ({cardsHoje.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setManagingMateria(materia)}
                          title="Gerenciar, editar ou excluir flashcards"
                          aria-label="Gerenciar flashcards desta matéria"
                          className="rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] p-2 text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hover:border-[var(--signal)] hover:text-[var(--signal)] hover:bg-[var(--mist)] transition shrink-0"
                        >
                          <SlidersHorizontal size={16} />
                        </button>
                      </div>
                    ) : hasTotalCards ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDeck({
                              id: materia.id,
                              title: `${materia.nome} (Modo Livre)`,
                              cards: cardsTotal,
                            })
                          }
                          className="flex-1 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] py-2 text-xs sm:text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)] active:scale-95"
                        >
                          Praticar Todos ({cardsTotal.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setManagingMateria(materia)}
                          title="Gerenciar, editar ou excluir flashcards"
                          aria-label="Gerenciar flashcards desta matéria"
                          className="rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] p-2 text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hover:border-[var(--signal)] hover:text-[var(--signal)] hover:bg-[var(--mist)] transition shrink-0"
                        >
                          <SlidersHorizontal size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-center text-[11px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
                          Nenhum card cadastrado.
                        </p>
                        <button
                          type="button"
                          onClick={() => setManagingMateria(materia)}
                          className="w-full rounded-[var(--radius-btn)] border border-dashed border-[var(--line)] bg-[var(--surface)] py-1.5 text-xs font-semibold text-[var(--signal)] hover:border-[var(--signal)] hover:bg-[var(--mist)] transition flex items-center justify-center gap-1.5"
                        >
                          <Plus size={13} strokeWidth={2.5} /> Criar / Gerenciar Cards
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Informativo de Metodologia */}
      <div className="grid gap-3 sm:grid-cols-3 pt-2">
        <div className="surface rounded-[var(--radius)] border border-[var(--line)] p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ef4444]">
            <Flame size={14} />
            1. Erro ou Chute
          </div>
          <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
            Ao registrar no caderno, o flashcard entra no deck da matéria com repetição em 24h para fixação imediata.
          </p>
        </div>

        <div className="surface rounded-[var(--radius)] border border-[var(--line)] p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f59e0b]">
            <Calendar size={14} />
            2. Espaçamento
          </div>
          <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
            Acertando os cards, os intervalos expandem automaticamente para 4 a 7 dias e depois 15 a 30 dias.
          </p>
        </div>

        <div className="surface rounded-[var(--radius)] border border-[var(--line)] p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ok,#16a34a)]">
            <Layers size={14} />
            3. Treino Isolado
          </div>
          <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
            Treine uma disciplina específica antes da prova ou use o Deck Geral do Dia para fixar tudo junto.
          </p>
        </div>
      </div>
      {/* Diálogo de confirmação de exclusão */}
      <ConfirmDialog
        open={pendingDeleteMateria !== null}
        title="Remover matéria da revisão"
        message={`Deseja remover a matéria "${pendingDeleteMateria?.nome}" da revisão? Seus flashcards serão preservados.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={async () => {
          if (!pendingDeleteMateria) return;
          await deleteMateria(pendingDeleteMateria.id);
          setPendingDeleteMateria(null);
        }}
        onCancel={() => setPendingDeleteMateria(null)}
      />

      {/* Modal de gerenciamento de flashcards da matéria */}
      {managingMateria && (
        <FlashcardManagerModal
          materia={managingMateria}
          onClose={() => setManagingMateria(null)}
        />
      )}
    </div>
  );
}

