"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Bot,
  Layers,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
  Zap,
  Search,
  RotateCcw,
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
  materiaNome?: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyWithPendingCards, setOnlyWithPendingCards] = useState(false);

  // Mapeamento de contagem de cards de hoje por matéria (acelera filtragem)
  const materiaCountsHoje = useMemo(() => {
    const map = new Map<string, number>();
    (flashcardsDoDia || []).forEach((c) => {
      const disc = (c.questao?.disciplina || c.disciplina || "").trim().toLowerCase();
      if (disc) {
        map.set(disc, (map.get(disc) || 0) + 1);
      }
    });
    return map;
  }, [flashcardsDoDia]);

  // Quantidade de matérias que têm revisões pendentes agendadas para hoje
  const materiasWithPendingCount = useMemo(() => {
    let count = 0;
    materias.forEach((m) => {
      const nomeLower = (m.nome || "").trim().toLowerCase();
      if ((materiaCountsHoje.get(nomeLower) || 0) > 0) {
        count++;
      }
    });
    return count;
  }, [materias, materiaCountsHoje]);

  // Filtragem rápida de matérias por nome e por pendência de hoje
  const filteredMaterias = useMemo(() => {
    return materias.filter((m) => {
      const nomeLower = (m.nome || "").trim().toLowerCase();
      if (onlyWithPendingCards && (materiaCountsHoje.get(nomeLower) || 0) === 0) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        if (!nomeLower.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [materias, onlyWithPendingCards, searchTerm, materiaCountsHoje]);

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
    const activeCards = Array.isArray(activeDeck.cards) ? activeDeck.cards : [];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveDeck(null);
              reloadFlashcards();
            }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--signal)] hover:underline cursor-pointer"
          >
            <ArrowLeft size={16} /> Voltar para lista de Decks
          </button>
        </div>

        <FlashcardPlayer
          key={activeDeck.id}
          cards={activeCards}
          materiaNome={activeDeck.materiaNome}
          onCardDeleted={(deletedId) => {
            setActiveDeck((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                cards: (prev.cards || []).filter((c) => c.id !== deletedId),
              };
            });
          }}
          onCardUpdated={(updated) => {
            setActiveDeck((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                cards: (prev.cards || []).map((c) => (c.id === updated.id ? updated : c)),
              };
            });
          }}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--signal)_28%,var(--line))] bg-gradient-to-r from-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] via-[var(--surface)] to-[color-mix(in_srgb,var(--signal)_4%,var(--surface))] p-4 sm:p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--signal)] text-white shadow-sm">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-bold text-[var(--ink)] sm:text-lg">
                Deck Global do Dia
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--signal-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--signal)]">
                Revisão Espaçada
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
              {flashcardsLoading ? (
                <span>Carregando cartões...</span>
              ) : flashcardsDoDia.length > 0 ? (
                <span>
                  <strong className="font-semibold text-[var(--ink)]">
                    {flashcardsDoDia.length}
                  </strong>{" "}
                  {flashcardsDoDia.length === 1
                    ? "cartão agendado para hoje"
                    : "cartões agendados para hoje"}
                </span>
              ) : (
                <span className="font-medium text-[var(--ok,#16a34a)]">
                  ✓ Tudo revisado por hoje no Deck Geral
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end shrink-0">
          <button
            type="button"
            disabled={flashcardsLoading || flashcardsDoDia.length === 0}
            onClick={() =>
              setActiveDeck({
                id: "dia",
                title: "Deck Global do Dia",
                materiaNome: "Revisão Geral",
                cards: flashcardsDoDia,
              })
            }
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap size={15} className="fill-current" />
            {flashcardsDoDia.length > 0
              ? `Iniciar Revisão (${flashcardsDoDia.length})`
              : "Revisado"}
          </button>
        </div>
      </div>

      {/* SEÇÃO: MATÉRIAS & DECKS ESPECÍFICOS */}
      <section className="space-y-4">
        {/* Cabeçalho da Seção com Título, Busca Rápida e Ações */}
        <div className="space-y-3 border-b border-[var(--line)] pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-display text-base font-bold text-[var(--ink)] sm:text-lg">
                Decks
              </h3>
              <span className="rounded-full bg-[var(--mist)] px-2 py-0.5 text-xs font-mono font-semibold text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                {materias.length}
              </span>
            </div>

            {!showNewMateria && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAIGenerator(!showAIGenerator)}
                  className={`inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border px-3 py-1.5 text-xs sm:text-sm font-semibold shadow-xs transition ${
                    showAIGenerator
                      ? "border-[var(--signal)] bg-[var(--signal-soft)] text-[var(--signal)]"
                      : "border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] bg-[var(--surface)] text-[var(--signal)] hover:bg-[var(--signal-soft)] active:scale-95"
                  }`}
                >
                  <Bot size={14} />
                  <span>Gerar com IA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewMateria(true)}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--signal)] shadow-sm hover:border-[var(--signal)] transition active:scale-95"
                >
                  <Plus size={16} />
                  <span>Novo Deck</span>
                </button>
              </div>
            )}
          </div>

          {/* Barra de Busca e Filtro de Decks */}
          {materias.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              {/* Campo de Busca Rápida */}
              <div className="relative flex-1 max-w-full sm:max-w-xs">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] pointer-events-none"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar deck..."
                  className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] py-1.5 pl-8 pr-7 text-xs sm:text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_40%,transparent)] focus:border-[var(--signal)] focus:bg-[var(--surface)]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_40%,transparent)] hover:text-[var(--ink)] p-0.5 cursor-pointer"
                    title="Limpar busca"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Filtro: Só com cards hoje */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyWithPendingCards((prev) => !prev)}
                  aria-pressed={onlyWithPendingCards}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition border cursor-pointer ${
                    onlyWithPendingCards
                      ? "bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn)]/40 shadow-xs ring-1 ring-[var(--warn)]/20"
                      : "bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_70%,transparent)] border-[var(--line)] hover:border-[var(--line)]/80 hover:text-[var(--ink)]"
                  }`}
                  title={
                    onlyWithPendingCards
                      ? "Exibindo apenas decks com revisões hoje. Clique para ver todos."
                      : "Filtrar para ver apenas decks que têm cards agendados para hoje"
                  }
                >
                  <Zap
                    size={13}
                    className={
                      onlyWithPendingCards
                        ? "fill-current text-[var(--warn)]"
                        : "text-[color-mix(in_srgb,var(--ink)_45%,transparent)]"
                    }
                  />
                  <span>Só com cards hoje</span>
                  {materiasWithPendingCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold leading-none ${
                        onlyWithPendingCards
                          ? "bg-[var(--warn)] text-white"
                          : "bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]"
                      }`}
                    >
                      {materiasWithPendingCount}
                    </span>
                  )}
                </button>

                {(searchTerm || onlyWithPendingCards) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setOnlyWithPendingCards(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-rose-500 hover:underline px-1 py-1 font-medium cursor-pointer"
                    title="Limpar filtros"
                  >
                    <RotateCcw size={11} />
                    Limpar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Formulário de Novo Deck */}
        {showNewMateria && (
          <form
            onSubmit={handleCreateMateria}
            className="surface rounded-[var(--radius)] border border-[var(--signal)]/40 bg-[color-mix(in_srgb,var(--signal)_4%,var(--surface))] p-4 shadow-[var(--shadow-sm)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
                Cadastrar Novo Deck
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
                placeholder="Nome do deck (ex: Português, RLM, Vocabulário, Fórmulas...)"
                required
                className="flex-1 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--signal)]"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingMateria || !newMateriaName.trim()}
                  className="rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-2 text-xs sm:text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {savingMateria ? "Salvando..." : "Salvar Deck"}
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

        {/* Grade de Decks */}
        {materias.length === 0 ? (
          <div className="surface rounded-[var(--radius)] border border-dashed border-[var(--line)] p-8 text-center space-y-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-[var(--signal-soft)] text-[var(--signal)] mx-auto">
              <Layers size={24} />
            </div>
            <div className="max-w-md mx-auto">
              <h4 className="font-display text-sm sm:text-base font-bold text-[var(--ink)]">
                Nenhum deck cadastrado
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
                Crie seus decks para organizar seus flashcards por disciplina ou tema e treinar com repetição espaçada.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewMateria(true)}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              <Plus size={16} /> Criar primeiro deck
            </button>
          </div>
        ) : filteredMaterias.length === 0 ? (
          <div className="surface rounded-[var(--radius)] border border-dashed border-[var(--line)] p-8 text-center space-y-3">
            <Search
              size={32}
              className="mx-auto text-[color-mix(in_srgb,var(--ink)_35%,transparent)]"
            />
            <div className="max-w-md mx-auto">
              <h4 className="font-display text-sm sm:text-base font-bold text-[var(--ink)]">
                Nenhum deck encontrado
              </h4>
              <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)] leading-relaxed">
                {searchTerm && onlyWithPendingCards
                  ? `Nenhum deck com o termo "${searchTerm}" possui cards para revisar hoje.`
                  : searchTerm
                  ? `Nenhum deck encontrado com o termo "${searchTerm}".`
                  : "Nenhum deck possui flashcards agendados para revisão hoje."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setOnlyWithPendingCards(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] hover:bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition cursor-pointer"
            >
              <RotateCcw size={12} /> Limpar filtros e ver todos
            </button>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMaterias.map((materia) => {
              const materiaNome = typeof materia?.nome === "string" ? materia.nome : "";
              const materiaNomeLower = materiaNome.toLowerCase();

              // Cards de hoje desta matéria (caderno ou IA)
              const cardsHoje = (flashcardsDoDia || []).filter((c) => {
                const discQ = typeof c?.questao?.disciplina === "string" ? c.questao.disciplina.toLowerCase() : "";
                const discF = typeof c?.disciplina === "string" ? c.disciplina.toLowerCase() : "";
                return (discQ && discQ === materiaNomeLower) || (discF && discF === materiaNomeLower);
              });

              // Todos os cards desta matéria (caderno ou IA)
              const cardsTotal = (allFlashcards || []).filter((c) => {
                const discQ = typeof c?.questao?.disciplina === "string" ? c.questao.disciplina.toLowerCase() : "";
                const discF = typeof c?.disciplina === "string" ? c.disciplina.toLowerCase() : "";
                return (discQ && discQ === materiaNomeLower) || (discF && discF === materiaNomeLower);
              });

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
                          <Layers size={18} />
                        </div>
                        <h4 className="font-display font-semibold text-base text-[var(--ink)] truncate max-w-[170px] sm:max-w-[200px]" title={materia.nome}>
                          {materia.nome}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(materia)}
                        title="Remover deck"
                        className="text-[color-mix(in_srgb,var(--ink)_35%,transparent)] hover:text-[var(--warn)] p-1 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-semibold text-[11px] ${
                          hasCardsHoje
                            ? "bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/20"
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
                              materiaNome: materia.nome,
                              cards: cardsHoje,
                            })
                          }
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
                        >
                          <Zap size={13} className="fill-current" />
                          Treinar Hoje ({cardsHoje.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setManagingMateria(materia)}
                          title="Gerenciar, editar ou excluir flashcards"
                          aria-label="Gerenciar flashcards deste deck"
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
                              materiaNome: materia.nome,
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
                          aria-label="Gerenciar flashcards deste deck"
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


      {/* Diálogo de confirmação de exclusão */}
      <ConfirmDialog
        open={pendingDeleteMateria !== null}
        title="Remover deck"
        message={`Deseja remover o deck "${pendingDeleteMateria?.nome}"? Seus flashcards serão preservados.`}
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

