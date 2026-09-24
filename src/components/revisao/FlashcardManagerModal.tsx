"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  BookOpen,
  Calendar,
  Check,
  Edit3,
  ExternalLink,
  Layers,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Flashcard, MateriaRevisao, NivelDominio } from "@/lib/revisao/types";
import { NIVEL_DOMINIO_LABEL } from "@/lib/revisao/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useRevisao } from "./RevisaoProvider";

interface FlashcardManagerModalProps {
  materia: MateriaRevisao;
  onClose: () => void;
}

export function FlashcardManagerModal({
  materia,
  onClose,
}: FlashcardManagerModalProps) {
  const {
    allFlashcards,
    updateFlashcard,
    deleteFlashcard,
    addFlashcardManual,
  } = useRevisao();

  const [search, setSearch] = useState("");
  const [showNewCard, setShowNewNewCard] = useState(false);
  const [newFrente, setNewFrente] = useState("");
  const [newVerso, setNewVerso] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  // Edição inline
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFrente, setEditFrente] = useState("");
  const [editVerso, setEditVerso] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Confirmação de exclusão
  const [pendingDeleteCard, setPendingDeleteCard] = useState<Flashcard | null>(
    null,
  );

  const materiaNomeLower = materia.nome.toLowerCase();

  // Filtrar cartões desta matéria
  const materiaCards = useMemo(() => {
    return allFlashcards.filter((c) => {
      const cardDisciplina = (
        c.questao?.disciplina ||
        c.disciplina ||
        ""
      ).toLowerCase();
      return cardDisciplina === materiaNomeLower;
    });
  }, [allFlashcards, materiaNomeLower]);

  // Filtrar pela busca
  const filteredCards = useMemo(() => {
    if (!search.trim()) return materiaCards;
    const term = search.toLowerCase();
    return materiaCards.filter(
      (c) =>
        c.frente.toLowerCase().includes(term) ||
        c.verso.toLowerCase().includes(term),
    );
  }, [materiaCards, search]);

  // Criar novo card manual
  async function handleCreateManual(e: React.FormEvent) {
    e.preventDefault();
    if (!newFrente.trim() || !newVerso.trim()) return;

    setSavingNew(true);
    await addFlashcardManual(materia.nome, newFrente.trim(), newVerso.trim());
    setSavingNew(false);
    setNewFrente("");
    setNewVerso("");
    setShowNewNewCard(false);
  }

  // Iniciar edição
  function startEditing(card: Flashcard) {
    setEditingCardId(card.id);
    setEditFrente(card.frente);
    setEditVerso(card.verso);
  }

  // Salvar edição
  async function handleSaveEdit(cardId: string) {
    if (!editFrente.trim() || !editVerso.trim()) return;

    setSavingEdit(true);
    await updateFlashcard(cardId, {
      frente: editFrente.trim(),
      verso: editVerso.trim(),
    });
    setSavingEdit(false);
    setEditingCardId(null);
  }

  // Confirmar exclusão
  async function handleConfirmDelete() {
    if (!pendingDeleteCard) return;
    await deleteFlashcard(pendingDeleteCard.id);
    setPendingDeleteCard(null);
    if (editingCardId === pendingDeleteCard.id) {
      setEditingCardId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="surface max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[var(--radius)] border border-[var(--line)] shadow-2xl flex flex-col">
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-[var(--line)] p-4 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid size-9 place-items-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)] shrink-0">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-bold text-[var(--ink)] truncate">
                {materia.nome}
              </h3>
              <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                {materiaCards.length}{" "}
                {materiaCards.length === 1 ? "flashcard cadastrado" : "flashcards cadastrados"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!showNewCard && (
              <button
                type="button"
                onClick={() => setShowNewNewCard(true)}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Novo Card</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de Busca & Ações */}
        <div className="border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--mist)_30%,var(--surface))] p-3 sm:px-6">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_45%,transparent)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pergunta ou resposta..."
              className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] py-1.5 pl-9 pr-3 text-xs text-[var(--ink)] placeholder:text-[color-mix(in_srgb,var(--ink)_40%,transparent)] outline-none focus:border-[var(--signal)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] hover:text-[var(--ink)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Formulário: Adicionar Novo Card Manual */}
        {showNewCard && (
          <form
            onSubmit={handleCreateManual}
            className="border-b border-[var(--signal)]/30 bg-[color-mix(in_srgb,var(--signal)_4%,var(--surface))] p-4 sm:px-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
                Criar Flashcard Manual
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowNewNewCard(false);
                  setNewFrente("");
                  setNewVerso("");
                }}
                className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:text-[var(--ink)]"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)] mb-1">
                  Frente (Pergunta / Conceito / Enunciado):
                </label>
                <textarea
                  rows={2}
                  value={newFrente}
                  onChange={(e) => setNewFrente(e.target.value)}
                  placeholder="Ex: O que é o princípio da insignificância no Direito Penal?"
                  required
                  className="w-full rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] p-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--signal)] resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)] mb-1">
                  Verso (Resposta / Explicação correta):
                </label>
                <textarea
                  rows={2}
                  value={newVerso}
                  onChange={(e) => setNewVerso(e.target.value)}
                  placeholder="Ex: Causa supralegal de exclusão da tipicidade material quando a conduta é de mínima ofensividade..."
                  required
                  className="w-full rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] p-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--signal)] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowNewNewCard(false);
                  setNewFrente("");
                  setNewVerso("");
                }}
                className="rounded-[var(--radius-btn)] border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--mist)] transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingNew || !newFrente.trim() || !newVerso.trim()}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
              >
                {savingNew ? "Salvando..." : "Salvar Flashcard"}
              </button>
            </div>
          </form>
        )}

        {/* Lista de Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredCards.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] p-8 text-center space-y-2">
              <p className="text-xs sm:text-sm font-semibold text-[var(--ink)]">
                {search ? "Nenhum flashcard encontrado com essa busca." : "Nenhum flashcard nesta matéria ainda."}
              </p>
              <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                {search
                  ? "Tente buscar por outras palavras-chave."
                  : "Crie um novo cartão manual acima ou gere automaticamente com a IA."}
              </p>
              {!search && !showNewCard && (
                <button
                  type="button"
                  onClick={() => setShowNewNewCard(true)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                >
                  <Plus size={14} /> Criar Primeiro Card
                </button>
              )}
            </div>
          ) : (
            filteredCards.map((card, idx) => {
              const isEditing = editingCardId === card.id;
              const isAI = card.origem === "ia" || !card.questao_id;
              const isCaderno = Boolean(card.questao_id);
              const nivel = (card.nivel_dominio ?? 0) as NivelDominio;

              return (
                <div
                  key={card.id}
                  className="surface rounded-[var(--radius-tag)] border border-[var(--line)] p-3.5 space-y-2.5 transition hover:border-[color-mix(in_srgb,var(--signal)_30%,var(--line))] shadow-xs"
                >
                  {/* Cabeçalho do Card (Badges & Ações) */}
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--line)]/50 pb-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                      <span className="text-[color-mix(in_srgb,var(--ink)_45%,transparent)] font-mono-num font-semibold">
                        #{idx + 1}
                      </span>

                      {/* Badge de Origem */}
                      {isAI ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,#a855f7_12%,transparent)] px-2 py-0.5 text-[#a855f7] dark:text-[#c084fc]">
                          <Sparkles size={10} /> IA
                        </span>
                      ) : isCaderno ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400">
                          <BookOpen size={10} /> Caderno
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
                          <Pencil size={10} /> Manual
                        </span>
                      )}

                      {/* Badge de Domínio */}
                      <span className="rounded-full bg-[var(--mist)] px-2 py-0.5 text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
                        {NIVEL_DOMINIO_LABEL[nivel] || "Novo"}
                      </span>

                      {/* Próxima revisão */}
                      {card.proxima_revisao && (
                        <span className="inline-flex items-center gap-1 text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
                          <Calendar size={10} />
                          <span>
                            {card.proxima_revisao.split("-").reverse().join("/")}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startEditing(card)}
                          title="Editar este cartão"
                          className="rounded p-1 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--signal)] transition"
                        >
                          <Pencil size={13} strokeWidth={2} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDeleteCard(card)}
                        title="Excluir este cartão"
                        className="rounded p-1 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--warn-soft)] hover:text-[var(--warn)] transition"
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  {/* Conteúdo do Card */}
                  {isEditing ? (
                    <div className="space-y-2 pt-1">
                      <div>
                        <span className="block text-[10px] uppercase font-bold tracking-wider text-[var(--signal)] mb-0.5">
                          Frente (Pergunta):
                        </span>
                        <textarea
                          rows={2}
                          value={editFrente}
                          onChange={(e) => setEditFrente(e.target.value)}
                          className="w-full rounded-[var(--radius-tag)] border border-[var(--signal)]/50 bg-[var(--surface)] p-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--signal)]"
                        />
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">
                          Verso (Resposta):
                        </span>
                        <textarea
                          rows={2}
                          value={editVerso}
                          onChange={(e) => setEditVerso(e.target.value)}
                          className="w-full rounded-[var(--radius-tag)] border border-emerald-500/50 bg-[var(--surface)] p-2 text-xs text-[var(--ink)] outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingCardId(null)}
                          className="rounded-[var(--radius-btn)] border border-[var(--line)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--mist)]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={savingEdit || !editFrente.trim() || !editVerso.trim()}
                          onClick={() => handleSaveEdit(card.id)}
                          className="inline-flex items-center gap-1 rounded-[var(--radius-btn)] bg-[var(--signal)] px-3 py-1 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                        >
                          <Check size={13} strokeWidth={2.5} />
                          {savingEdit ? "Salvando..." : "Salvar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      {/* Frente */}
                      <div className="rounded-[var(--radius-tag)] bg-[color-mix(in_srgb,var(--mist)_60%,var(--surface))] p-2.5 border border-[var(--line)]/50">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--signal)] mb-1">
                          Pergunta:
                        </span>
                        <p className="whitespace-pre-wrap text-[var(--ink)] leading-relaxed line-clamp-4">
                          {card.frente}
                        </p>
                      </div>

                      {/* Verso */}
                      <div className="rounded-[var(--radius-tag)] bg-[color-mix(in_srgb,var(--ok,#16a34a)_6%,var(--surface))] p-2.5 border border-[color-mix(in_srgb,var(--ok,#16a34a)_20%,transparent)]">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                          Resposta:
                        </span>
                        <p className="whitespace-pre-wrap text-[var(--ink)] leading-relaxed line-clamp-4">
                          {card.verso}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--mist)_20%,var(--surface))] p-3 sm:px-6 flex justify-between items-center text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
          <span>{filteredCards.length} de {materiaCards.length} cards listados</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-4 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--mist)] transition"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Confirmação de exclusão de card */}
      <ConfirmDialog
        open={pendingDeleteCard !== null}
        title="Excluir Flashcard"
        message="Deseja realmente excluir este cartão? O histórico de repetição espaçada deste card será apagado."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteCard(null)}
      />
    </div>
  );
}
