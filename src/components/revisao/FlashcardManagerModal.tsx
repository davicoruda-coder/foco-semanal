/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  Image as ImageIcon,
  Layers,
  Maximize2,
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
import { FlashcardImageInput } from "./FlashcardImageInput";
import { FlashcardImageLightbox } from "./FlashcardImageLightbox";

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
  const [newFrenteImg, setNewFrenteImg] = useState<string | null>(null);
  const [newVersoImg, setNewVersoImg] = useState<string | null>(null);
  const [savingNew, setSavingNew] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Edição inline
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFrente, setEditFrente] = useState("");
  const [editVerso, setEditVerso] = useState("");
  const [editFrenteImg, setEditFrenteImg] = useState<string | null>(null);
  const [editVersoImg, setEditVersoImg] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Lightbox para visualização de imagem em tamanho real
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

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

  // Criar novo card manual (permite texto, imagem, ou ambos)
  async function handleCreateManual(e: React.FormEvent) {
    e.preventDefault();
    const hasFront = Boolean(newFrente.trim() || newFrenteImg);
    const hasBack = Boolean(newVerso.trim() || newVersoImg);
    if (!hasFront || !hasBack) return;

    setSavingNew(true);
    setCreateError(null);
    try {
      const card = await addFlashcardManual(
        materia.nome,
        newFrente.trim(),
        newVerso.trim(),
        undefined,
        newFrenteImg,
        newVersoImg,
      );
      if (!card) {
        throw new Error(
          "Não foi possível salvar o flashcard. Verifique a conexão com o banco de dados.",
        );
      }
      setNewFrente("");
      setNewVerso("");
      setNewFrenteImg(null);
      setNewVersoImg(null);
      setShowNewNewCard(false);
      setSuccessNotice("Flashcard salvo com sucesso!");
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: unknown) {
      console.error("[FlashcardManagerModal] erro ao salvar card:", err);
      const msg =
        err instanceof Error ? err.message : "Erro ao salvar flashcard.";
      setCreateError(msg);
    } finally {
      setSavingNew(false);
    }
  }

  // Iniciar edição
  function startEditing(card: Flashcard) {
    setEditingCardId(card.id);
    setEditFrente(card.frente || "");
    setEditVerso(card.verso || "");
    setEditFrenteImg(card.frente_imagem_url || null);
    setEditVersoImg(card.verso_imagem_url || null);
    setEditError(null);
  }

  // Salvar edição
  async function handleSaveEdit(cardId: string) {
    const hasFront = Boolean(editFrente.trim() || editFrenteImg);
    const hasBack = Boolean(editVerso.trim() || editVersoImg);
    if (!hasFront || !hasBack) return;

    setSavingEdit(true);
    setEditError(null);
    try {
      const ok = await updateFlashcard(cardId, {
        frente: editFrente.trim(),
        verso: editVerso.trim(),
        frente_imagem_url: editFrenteImg,
        verso_imagem_url: editVersoImg,
      });
      if (!ok) {
        throw new Error("Não foi possível atualizar o flashcard.");
      }
      setEditingCardId(null);
    } catch (err: unknown) {
      console.error("[FlashcardManagerModal] erro ao editar:", err);
      const msg =
        err instanceof Error ? err.message : "Erro ao atualizar flashcard.";
      setEditError(msg);
    } finally {
      setSavingEdit(false);
    }
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

  const isNewCardValid =
    (Boolean(newFrente.trim()) || Boolean(newFrenteImg)) &&
    (Boolean(newVerso.trim()) || Boolean(newVersoImg));

  const isEditCardValid =
    (Boolean(editFrente.trim()) || Boolean(editFrenteImg)) &&
    (Boolean(editVerso.trim()) || Boolean(editVersoImg));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="surface max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[var(--radius)] border border-[var(--line)] shadow-2xl flex flex-col">
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-[var(--line)] p-4 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid size-9 place-items-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)] shrink-0">
              <Layers size={18} />
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
            className="border-b border-[var(--signal)]/30 bg-[color-mix(in_srgb,var(--signal)_4%,var(--surface))] p-4 sm:px-6 space-y-4 max-h-[60vh] overflow-y-auto"
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
                  setNewFrenteImg(null);
                  setNewVersoImg(null);
                  setCreateError(null);
                }}
                className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:text-[var(--ink)]"
              >
                Cancelar
              </button>
            </div>

            {createError && (
              <div className="flex items-center gap-2 rounded-[var(--radius-tag)] border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
                <AlertCircle size={15} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-3.5">
              {/* Frente */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_75%,transparent)]">
                  Frente (Pergunta / Conceito / Enunciado):
                </label>
                <textarea
                  rows={2}
                  value={newFrente}
                  onChange={(e) => setNewFrente(e.target.value)}
                  placeholder="Ex: O que é o princípio da insignificância? (ou deixe em branco se for só imagem)"
                  className="w-full rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] p-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--signal)] resize-none"
                />
                <FlashcardImageInput
                  label="Foto ou Print da Frente (Opcional):"
                  side="frente"
                  value={newFrenteImg}
                  onChange={setNewFrenteImg}
                  disabled={savingNew}
                />
              </div>

              {/* Verso */}
              <div className="space-y-1.5 pt-1 border-t border-[var(--line)]/50">
                <label className="block text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_75%,transparent)]">
                  Verso (Resposta / Explicação / Resolução):
                </label>
                <textarea
                  rows={2}
                  value={newVerso}
                  onChange={(e) => setNewVerso(e.target.value)}
                  placeholder="Ex: Causa supralegal de exclusão... (ou deixe em branco se for só imagem)"
                  className="w-full rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] p-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--signal)] resize-none"
                />
                <FlashcardImageInput
                  label="Foto ou Print do Verso (Opcional):"
                  side="verso"
                  value={newVersoImg}
                  onChange={setNewVersoImg}
                  disabled={savingNew}
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
                  setNewFrenteImg(null);
                  setNewVersoImg(null);
                  setCreateError(null);
                }}
                className="rounded-[var(--radius-btn)] border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--mist)] transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingNew || !isNewCardValid}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
              >
                {savingNew ? "Salvando..." : "Salvar Flashcard"}
              </button>
            </div>
          </form>
        )}

        {/* Lista de Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {successNotice && (
            <div className="flex items-center gap-2 rounded-[var(--radius-tag)] border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-400">
              <Check size={14} className="shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}
          {filteredCards.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] p-8 text-center space-y-2">
              <p className="text-xs sm:text-sm font-semibold text-[var(--ink)]">
                {search ? "Nenhum flashcard encontrado com essa busca." : "Nenhum flashcard nesta matéria ainda."}
              </p>
              <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                {search
                  ? "Tente buscar por outras palavras-chave."
                  : "Crie um novo cartão manual acima com texto ou imagens, ou gere automaticamente com a IA."}
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
              const hasImages = Boolean(card.frente_imagem_url || card.verso_imagem_url);

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

                      {/* Badge se contiver imagem */}
                      {hasImages && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-indigo-600 dark:text-indigo-400">
                          <ImageIcon size={10} /> Com Imagem
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
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1.5">
                        <span className="block text-[10px] uppercase font-bold tracking-wider text-[var(--signal)]">
                          Frente (Pergunta / Imagem):
                        </span>
                        <textarea
                          rows={2}
                          value={editFrente}
                          onChange={(e) => setEditFrente(e.target.value)}
                          placeholder="Texto da pergunta (ou deixe em branco se usar apenas imagem)..."
                          className="w-full rounded-[var(--radius-tag)] border border-[var(--signal)]/50 bg-[var(--surface)] p-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--signal)]"
                        />
                        <FlashcardImageInput
                          label="Foto ou Print da Frente:"
                          side="frente"
                          value={editFrenteImg}
                          onChange={setEditFrenteImg}
                          disabled={savingEdit}
                        />
                      </div>

                      <div className="space-y-1.5 pt-1 border-t border-[var(--line)]/50">
                        <span className="block text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                          Verso (Resposta / Imagem):
                        </span>
                        <textarea
                          rows={2}
                          value={editVerso}
                          onChange={(e) => setEditVerso(e.target.value)}
                          placeholder="Texto da resposta (ou deixe em branco se usar apenas imagem)..."
                          className="w-full rounded-[var(--radius-tag)] border border-emerald-500/50 bg-[var(--surface)] p-2 text-xs text-[var(--ink)] outline-none focus:border-emerald-500"
                        />
                        <FlashcardImageInput
                          label="Foto ou Print do Verso:"
                          side="verso"
                          value={editVersoImg}
                          onChange={setEditVersoImg}
                          disabled={savingEdit}
                        />
                      </div>

                      {editError && (
                        <div className="flex items-center gap-2 rounded-[var(--radius-tag)] border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>{editError}</span>
                        </div>
                      )}

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
                          disabled={savingEdit || !isEditCardValid}
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
                      <div className="rounded-[var(--radius-tag)] bg-[color-mix(in_srgb,var(--mist)_60%,var(--surface))] p-2.5 border border-[var(--line)]/50 space-y-1.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--signal)]">
                          Pergunta:
                        </span>
                        {card.frente_imagem_url && (
                          <div
                            onClick={() => setLightboxSrc(card.frente_imagem_url!)}
                            className="group/img relative cursor-pointer overflow-hidden rounded-md border border-[var(--line)] bg-black/5 hover:opacity-95 transition"
                            title="Clique para ampliar"
                          >
                            <img
                              src={card.frente_imagem_url}
                              alt="Imagem da Frente"
                              className="max-h-24 w-auto object-contain mx-auto"
                            />
                            <div className="absolute right-1 bottom-1 rounded bg-black/60 p-1 text-white opacity-0 group-hover/img:opacity-100 transition">
                              <Maximize2 size={11} />
                            </div>
                          </div>
                        )}
                        {card.frente ? (
                          <p className="whitespace-pre-wrap text-[var(--ink)] leading-relaxed line-clamp-4">
                            {card.frente}
                          </p>
                        ) : (
                          <p className="text-[11px] italic text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
                            (Card visual — baseado em imagem)
                          </p>
                        )}
                      </div>

                      {/* Verso */}
                      <div className="rounded-[var(--radius-tag)] bg-[color-mix(in_srgb,var(--ok,#16a34a)_6%,var(--surface))] p-2.5 border border-[color-mix(in_srgb,var(--ok,#16a34a)_20%,transparent)] space-y-1.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Resposta:
                        </span>
                        {card.verso_imagem_url && (
                          <div
                            onClick={() => setLightboxSrc(card.verso_imagem_url!)}
                            className="group/img relative cursor-pointer overflow-hidden rounded-md border border-[var(--line)] bg-black/5 hover:opacity-95 transition"
                            title="Clique para ampliar"
                          >
                            <img
                              src={card.verso_imagem_url}
                              alt="Imagem do Verso"
                              className="max-h-24 w-auto object-contain mx-auto"
                            />
                            <div className="absolute right-1 bottom-1 rounded bg-black/60 p-1 text-white opacity-0 group-hover/img:opacity-100 transition">
                              <Maximize2 size={11} />
                            </div>
                          </div>
                        )}
                        {card.verso ? (
                          <p className="whitespace-pre-wrap text-[var(--ink)] leading-relaxed line-clamp-4">
                            {card.verso}
                          </p>
                        ) : (
                          <p className="text-[11px] italic text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
                            (Card visual — baseado em imagem)
                          </p>
                        )}
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

      {/* Modal Lightbox para visualização em alta resolução */}
      {lightboxSrc && (
        <FlashcardImageLightbox
          src={lightboxSrc}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  );
}
