"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ExternalLink,
  Filter,
  GraduationCap,
  Pencil,
  Play,
  Search,
  Trash2,
  Video,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  X,
  Sparkles,
  Layers,
  Plus,
  Loader2,
  BookOpen,
} from "lucide-react";
import { DialogFrame } from "@/components/DialogFrame";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { QuickCaptureForm } from "./QuickCaptureForm";
import { FormattedRuleText } from "./FormattedRuleText";
import {
  CAUSA_ERRO_LABEL,
  STATUS_RESULTADO_LABEL,
  type CausaErro,
  type QuestaoCaderno,
  type StatusResultado,
} from "@/lib/revisao/types";
import { useRevisao } from "./RevisaoProvider";

export function CadernoList({
  onGenerateWithAI,
}: {
  onGenerateWithAI?: (texto: string, disciplina: string) => void;
} = {}) {
  const { questoes, questoesLoading, deleteQuestao, allFlashcards, addFlashcardManual } = useRevisao();
  const [search, setSearch] = useState("");
  const [bancaFiltro, setBancaFiltro] = useState<string>("todas");
  const [disciplinaFiltro, setDisciplinaFiltro] = useState<string>("todas");
  const [causaFiltro, setCausaFiltro] = useState<string>("todas");
  const [resultadoFiltro, setResultadoFiltro] = useState<string>("todas");
  const [readingQuestao, setReadingQuestao] = useState<QuestaoCaderno | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [editingQuestao, setEditingQuestao] = useState<QuestaoCaderno | null>(null);
  const [pendingDeleteQuestao, setPendingDeleteQuestao] = useState<QuestaoCaderno | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estado para criação de card manual a partir da questão
  const [manualCardQuestao, setManualCardQuestao] = useState<QuestaoCaderno | null>(null);
  const [cardFrente, setCardFrente] = useState("");
  const [cardVerso, setCardVerso] = useState("");
  const [savingManualCard, setSavingManualCard] = useState(false);
  const [manualCardFeedback, setManualCardFeedback] = useState<string | null>(null);

  // Mapeamento de quantos flashcards existem para cada questão
  const cardsVinculados = useMemo(() => {
    const map = new Map<string, number>();
    allFlashcards.forEach((f) => {
      if (f.questao_id) {
        map.set(f.questao_id, (map.get(f.questao_id) || 0) + 1);
      }
    });
    return map;
  }, [allFlashcards]);

  const handleOpenManualCard = (q: QuestaoCaderno) => {
    setManualCardQuestao(q);
    const prefix = [q.banca ? `[${q.banca}]` : "", q.disciplina, q.assunto ? `› ${q.assunto}` : ""].filter(Boolean).join(" ");
    const detalhe = q.enunciado_texto ? `\n\n${q.enunciado_texto.slice(0, 250)}${q.enunciado_texto.length > 250 ? "…" : ""}` : q.codigo_questao ? `\n\nQuestão #${q.codigo_questao}` : "";
    setCardFrente(`${prefix}${detalhe}`);
    setCardVerso(`📌 ${q.aprendizado_chave}`);
    setManualCardFeedback(null);
  };

  const handleSaveManualCard = async () => {
    if (!manualCardQuestao || !cardFrente.trim() || !cardVerso.trim() || savingManualCard) return;
    setSavingManualCard(true);
    try {
      const card = await addFlashcardManual(
        manualCardQuestao.disciplina,
        cardFrente.trim(),
        cardVerso.trim(),
        manualCardQuestao.id,
      );
      if (card) {
        setManualCardFeedback("Flashcard criado com sucesso!");
        setTimeout(() => {
          setManualCardQuestao(null);
          setManualCardFeedback(null);
        }, 800);
      }
    } finally {
      setSavingManualCard(false);
    }
  };

  const handleGenerateAIForQuestao = (q: QuestaoCaderno) => {
    if (!onGenerateWithAI) return;
    const parts = [
      q.banca ? `Banca: ${q.banca}` : "",
      `Disciplina: ${q.disciplina}`,
      q.assunto ? `Assunto: ${q.assunto}` : "",
      q.codigo_questao ? `Código: #${q.codigo_questao}` : "",
      q.enunciado_texto ? `Enunciado:\n${q.enunciado_texto}` : "",
      `Regra Aprendida / Resumo:\n${q.aprendizado_chave}`,
    ].filter(Boolean).join("\n\n");
    onGenerateWithAI(parts, q.disciplina);
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback silencioso se área de transferência não estiver disponível
    }
  };

  // Extrair opções únicas para filtros
  const bancas = useMemo(() => {
    const set = new Set<string>();
    questoes.forEach((q) => {
      if (q.banca) set.add(q.banca);
    });
    return Array.from(set).sort();
  }, [questoes]);

  const disciplinas = useMemo(() => {
    const set = new Set<string>();
    questoes.forEach((q) => {
      if (q.disciplina) set.add(q.disciplina);
    });
    return Array.from(set).sort();
  }, [questoes]);

  // Filtragem local instantânea
  const questoesFiltradas = useMemo(() => {
    return questoes.filter((q) => {
      if (bancaFiltro !== "todas" && q.banca !== bancaFiltro) return false;
      if (disciplinaFiltro !== "todas" && q.disciplina !== disciplinaFiltro)
        return false;
      if (causaFiltro !== "todas" && q.causa_erro !== causaFiltro) return false;
      if (resultadoFiltro !== "todas" && q.status_resultado !== resultadoFiltro)
        return false;

      if (search.trim()) {
        const term = search.toLowerCase();
        const matchAprendizado = q.aprendizado_chave?.toLowerCase().includes(term);
        const matchCodigo = q.codigo_questao?.toLowerCase().includes(term);
        const matchEnunciado = q.enunciado_texto?.toLowerCase().includes(term);
        const matchAssunto = q.assunto?.toLowerCase().includes(term);
        if (!matchAprendizado && !matchCodigo && !matchEnunciado && !matchAssunto) {
          return false;
        }
      }
      return true;
    });
  }, [questoes, bancaFiltro, disciplinaFiltro, causaFiltro, resultadoFiltro, search]);

  // Navegação no Modal de Leitura
  const readingIndex = useMemo(() => {
    if (!readingQuestao) return -1;
    return questoesFiltradas.findIndex((q) => q.id === readingQuestao.id);
  }, [readingQuestao, questoesFiltradas]);

  const prevQuestao = readingIndex > 0 ? questoesFiltradas[readingIndex - 1] : null;
  const nextQuestao =
    readingIndex >= 0 && readingIndex < questoesFiltradas.length - 1
      ? questoesFiltradas[readingIndex + 1]
      : null;

  // Atalhos de teclado (setas ← / →) para folhear fichas no modal de leitura
  useEffect(() => {
    if (!readingQuestao) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === "ArrowLeft" && prevQuestao) {
        setReadingQuestao(prevQuestao);
      } else if (e.key === "ArrowRight" && nextQuestao) {
        setReadingQuestao(nextQuestao);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readingQuestao, prevQuestao, nextQuestao]);

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteQuestao) return;
    setDeletandoId(pendingDeleteQuestao.id);
    try {
      await deleteQuestao(pendingDeleteQuestao.id);
      if (readingQuestao?.id === pendingDeleteQuestao.id) {
        setReadingQuestao(null);
      }
      setPendingDeleteQuestao(null);
    } finally {
      setDeletandoId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Busca e Filtros Rápidos */}
      <div className="space-y-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_45%,transparent)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, regra, assunto..."
            className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_40%,transparent)] focus:border-[var(--signal)] focus:bg-[var(--surface)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={disciplinaFiltro}
            onChange={(e) => setDisciplinaFiltro(e.target.value)}
            className="w-full min-w-0 truncate rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1.5 text-xs text-[var(--ink)] outline-none"
          >
            <option value="todas">Todas Disciplinas</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={bancaFiltro}
            onChange={(e) => setBancaFiltro(e.target.value)}
            className="w-full min-w-0 truncate rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1.5 text-xs text-[var(--ink)] outline-none"
          >
            <option value="todas">Todas Bancas</option>
            {bancas.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={causaFiltro}
            onChange={(e) => setCausaFiltro(e.target.value)}
            className="w-full min-w-0 truncate rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1.5 text-xs text-[var(--ink)] outline-none"
          >
            <option value="todas">Todas Causas</option>
            {(Object.entries(CAUSA_ERRO_LABEL) as [CausaErro, string][]).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ),
            )}
          </select>

          <select
            value={resultadoFiltro}
            onChange={(e) => setResultadoFiltro(e.target.value)}
            className="w-full min-w-0 truncate rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1.5 text-xs text-[var(--ink)] outline-none"
          >
            <option value="todas">Todos Resultados</option>
            {(
              Object.entries(STATUS_RESULTADO_LABEL) as [StatusResultado, string][]
            ).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contador e Dica de Uso */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
        <span>
          {questoesFiltradas.length === 1
            ? "1 anotação encontrada"
            : `${questoesFiltradas.length} anotações encontradas`}
        </span>
        <span className="hidden sm:inline text-[11px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
          Clique no card para abrir a ficha completa
        </span>
      </div>

      {/* Lista de Registros Compactos */}
      {questoesLoading ? (
        <div className="py-12 text-center text-sm text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
          Carregando questões do caderno...
        </div>
      ) : questoesFiltradas.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] p-8 text-center">
          <GraduationCap
            size={36}
            className="mx-auto mb-2 text-[color-mix(in_srgb,var(--ink)_35%,transparent)]"
          />
          <p className="text-sm font-medium text-[var(--ink)]">
            Nenhuma questão encontrada
          </p>
          <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
            Use o botão de Captura Rápida acima para registrar seus erros de simulados ou baterias.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {questoesFiltradas.map((q) => {
            const rawLines = (q.aprendizado_chave || "")
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            const meaningfulLines = rawLines.filter(
              (l) => !/^[=\-_*~#]{3,}$/.test(l),
            );
            const primaryLine = meaningfulLines[0] || "Anotação de revisão";
            const secondarySnippet = meaningfulLines.slice(1).join(" ");
            const cardsCount = cardsVinculados.get(q.id) || 0;

            return (
              <div
                key={q.id}
                onClick={() => setReadingQuestao(q)}
                className="group relative cursor-pointer rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3.5 transition-all duration-150 hover:border-[var(--signal)] hover:shadow-xs active:scale-[0.999]"
              >
                {/* Header do Card com Chips */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
                    {q.banca && (
                      <span className="rounded-md bg-[var(--mist)] px-2 py-0.5 font-semibold text-[var(--ink)] border border-[var(--line)] shrink-0 text-[11px]">
                        {q.banca}
                      </span>
                    )}
                    <span className="font-semibold text-[var(--signal)] text-[12px]">
                      {q.disciplina}
                    </span>
                    {q.assunto && (
                      <span className="text-[color-mix(in_srgb,var(--ink)_65%,transparent)] font-medium text-[12px] truncate max-w-[200px] sm:max-w-[340px]">
                        › {q.assunto}
                      </span>
                    )}
                    {q.codigo_questao && (
                      <span className="font-mono text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)] shrink-0">
                        #{q.codigo_questao}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        q.status_resultado === "erro"
                          ? "bg-[color-mix(in_srgb,#ef4444_15%,transparent)] text-[#ef4444]"
                          : q.status_resultado === "chute"
                          ? "bg-[color-mix(in_srgb,#f59e0b_15%,transparent)] text-[#f59e0b]"
                          : "bg-[color-mix(in_srgb,#8b5cf6_15%,transparent)] text-[#8b5cf6]"
                      }`}
                    >
                      {STATUS_RESULTADO_LABEL[q.status_resultado]}
                    </span>

                    <span className="rounded-full bg-[var(--mist)] px-2 py-0.5 text-[10px] font-medium text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hidden sm:inline-block">
                      {CAUSA_ERRO_LABEL[q.causa_erro]}
                    </span>

                    {cardsCount > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] px-2 py-0.5 text-[10px] font-semibold text-[var(--signal)] border border-[color-mix(in_srgb,var(--signal)_25%,transparent)]"
                        title={`${cardsCount} flashcard(s) criado(s)`}
                      >
                        <Layers size={10} />
                        {cardsCount} {cardsCount === 1 ? "card" : "cards"}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Conteúdo do Card: Título + Snippet */}
                <div className="mt-2.5">
                  <h3 className="text-sm font-semibold text-[var(--ink)] leading-snug group-hover:text-[var(--signal)] transition-colors line-clamp-1">
                    {primaryLine}
                  </h3>
                  {secondarySnippet ? (
                    <p className="mt-1 line-clamp-2 text-xs text-[color-mix(in_srgb,var(--ink)_70%,transparent)] leading-relaxed">
                      {secondarySnippet}
                    </p>
                  ) : null}
                </div>

                {/* Rodapé do Card: Dica de clique + Ações Rápidas */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[color-mix(in_srgb,var(--line)_50%,transparent)] text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[11px] text-[var(--signal)] group-hover:underline">
                    <BookOpen size={12} />
                    Ver ficha completa
                  </span>

                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleCopy(q.id, q.aprendizado_chave)}
                      className="rounded p-1 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition"
                      title="Copiar regra"
                      aria-label="Copiar regra"
                    >
                      {copiedId === q.id ? (
                        <Check size={14} className="text-[var(--ok)]" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenManualCard(q)}
                      className="rounded p-1 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition"
                      title="Criar card manual"
                      aria-label="Criar card manual"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingQuestao(q)}
                      className="rounded p-1 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition"
                      title="Editar questão"
                      aria-label="Editar questão"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteQuestao(q)}
                      className="rounded p-1 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[color-mix(in_srgb,#ef4444_12%,transparent)] hover:text-[#ef4444] transition"
                      title="Excluir questão"
                      aria-label="Excluir questão"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Leitura Focada da Ficha Completa */}
      <DialogFrame
        open={readingQuestao !== null}
        onClose={() => setReadingQuestao(null)}
        labelledBy="reading-dialog-title"
        cardClassName="surface flex max-h-[90vh] w-full max-w-2xl sm:max-w-3xl flex-col overflow-hidden p-0 shadow-[var(--shadow-lg)] border border-[var(--line)] rounded-[var(--radius)]"
      >
        {readingQuestao && (
          <div className="flex flex-col h-full max-h-[90vh] min-h-0">
            {/* Top Bar com Navegação e Fechar */}
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--mist)]/40 px-4 py-2.5 sm:px-6">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-[11px] text-[color-mix(in_srgb,var(--ink)_60%,transparent)] font-medium">
                  {readingIndex >= 0
                    ? `Ficha ${readingIndex + 1} de ${questoesFiltradas.length}`
                    : "Ficha de Estudo"}
                </span>
                {questoesFiltradas.length > 1 && (
                  <div className="flex items-center gap-1 border-l border-[var(--line)] pl-2">
                    <button
                      type="button"
                      disabled={!prevQuestao}
                      onClick={() => prevQuestao && setReadingQuestao(prevQuestao)}
                      className="rounded p-1 text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Ficha anterior (←)"
                      aria-label="Ficha anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={!nextQuestao}
                      onClick={() => nextQuestao && setReadingQuestao(nextQuestao)}
                      className="rounded p-1 text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Próxima ficha (→)"
                      aria-label="Próxima ficha"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setReadingQuestao(null)}
                className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Badges / Header Contextual */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 sm:px-6 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0" id="reading-dialog-title">
                {readingQuestao.banca && (
                  <span className="rounded-md bg-[var(--mist)] px-2 py-0.5 font-semibold text-[var(--ink)] border border-[var(--line)] text-[11px]">
                    {readingQuestao.banca}
                  </span>
                )}
                <span className="font-semibold text-[var(--signal)] text-[13px]">
                  {readingQuestao.disciplina}
                </span>
                {readingQuestao.assunto && (
                  <span className="text-[color-mix(in_srgb,var(--ink)_65%,transparent)] font-medium text-[13px]">
                    › {readingQuestao.assunto}
                  </span>
                )}
                {readingQuestao.codigo_questao && (
                  <span className="font-mono text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
                    #{readingQuestao.codigo_questao}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    readingQuestao.status_resultado === "erro"
                      ? "bg-[color-mix(in_srgb,#ef4444_15%,transparent)] text-[#ef4444]"
                      : readingQuestao.status_resultado === "chute"
                      ? "bg-[color-mix(in_srgb,#f59e0b_15%,transparent)] text-[#f59e0b]"
                      : "bg-[color-mix(in_srgb,#8b5cf6_15%,transparent)] text-[#8b5cf6]"
                  }`}
                >
                  {STATUS_RESULTADO_LABEL[readingQuestao.status_resultado]}
                </span>

                <span className="rounded-full bg-[var(--mist)] px-2.5 py-0.5 text-[10px] font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
                  {CAUSA_ERRO_LABEL[readingQuestao.causa_erro]}
                </span>

                {cardsVinculados.get(readingQuestao.id) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--signal)] border border-[color-mix(in_srgb,var(--signal)_25%,transparent)]">
                    <Layers size={11} />
                    {cardsVinculados.get(readingQuestao.id)}{" "}
                    {cardsVinculados.get(readingQuestao.id) === 1 ? "card" : "cards"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--mist)] px-2 py-0.5 text-[10px] font-medium text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
                    Sem card
                  </span>
                )}
              </div>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-4">
              <FormattedRuleText
                text={readingQuestao.aprendizado_chave}
                className="text-sm sm:text-[15px] font-normal text-[var(--ink)] leading-relaxed select-text"
              />

              {readingQuestao.enunciado_texto && (
                <div className="mt-4 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)]/40 p-3 sm:p-4 text-xs space-y-1.5">
                  <p className="font-semibold uppercase tracking-wider text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
                    Enunciado / Trecho da Questão:
                  </p>
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[color-mix(in_srgb,var(--ink)_85%,transparent)] leading-relaxed bg-[var(--surface)] p-3 rounded border border-[var(--line)]">
                    {readingQuestao.enunciado_texto}
                  </p>
                </div>
              )}

              {(readingQuestao.link_questao || readingQuestao.link_video) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {readingQuestao.link_questao && (
                    <a
                      href={readingQuestao.link_questao}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface)] border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--signal)] hover:bg-[var(--signal-soft)] transition"
                    >
                      <ExternalLink size={13} />
                      Ver no Questões de Concursos
                    </a>
                  )}
                  {readingQuestao.link_video && (
                    <a
                      href={readingQuestao.link_video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface)] border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    >
                      <Video size={13} />
                      Vídeo Resolução
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Barra de Ações Fixa no Rodapé da Ficha */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--surface)] px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(readingQuestao.id, readingQuestao.aprendizado_chave)}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-[var(--signal)] hover:text-[var(--signal)] transition active:scale-95"
                >
                  {copiedId === readingQuestao.id ? (
                    <>
                      <Check size={13} className="text-[var(--ok)]" />
                      <span className="text-[var(--ok)] font-semibold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copiar Regra</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const q = readingQuestao;
                    setReadingQuestao(null);
                    handleOpenManualCard(q);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-[var(--signal)] hover:text-[var(--signal)] transition active:scale-95"
                  title="Criar flashcard manual para este item"
                >
                  <Plus size={13} />
                  <span>+ Card Manual</span>
                </button>

                {onGenerateWithAI && (
                  <button
                    type="button"
                    onClick={() => {
                      const q = readingQuestao;
                      setReadingQuestao(null);
                      handleGenerateAIForQuestao(q);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] text-[var(--signal)] border border-[color-mix(in_srgb,var(--signal)_30%,transparent)] px-3 py-1.5 text-xs font-semibold hover:brightness-110 transition active:scale-95"
                    title="Gerar flashcards com IA a partir deste aprendizado"
                  >
                    <Sparkles size={13} />
                    <span>Gerar Cards IA</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const q = readingQuestao;
                    setReadingQuestao(null);
                    setEditingQuestao(q);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_75%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--signal)] transition active:scale-95"
                >
                  <Pencil size={13} />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  disabled={deletandoId === readingQuestao.id}
                  onClick={() => {
                    const q = readingQuestao;
                    setReadingQuestao(null);
                    setPendingDeleteQuestao(q);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-transparent px-3 py-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[color-mix(in_srgb,#ef4444_12%,transparent)] hover:text-[#ef4444] transition active:scale-95"
                >
                  <Trash2 size={13} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogFrame>

      {/* Modal de Edição */}
      {editingQuestao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--ink)]">
                  Editar Questão
                </h2>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                  Atualize os dados e a regra aprendida
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuestao(null)}
                className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <QuickCaptureForm
              initialData={editingQuestao}
              onCancel={() => setEditingQuestao(null)}
              onSuccess={() => setEditingQuestao(null)}
            />
          </div>
        </div>
      )}

      {/* Modal de Criação de Card Manual a partir do Caderno */}
      {manualCardQuestao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
                  <Layers size={18} className="text-[var(--signal)]" />
                  Criar Flashcard Manual
                </h2>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                  Crie um flashcard personalizado a partir deste aprendizado do caderno
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualCardQuestao(null)}
                className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contexto da questão */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[var(--mist)] p-2 text-xs">
              <span className="font-semibold text-[var(--signal)]">{manualCardQuestao.disciplina}</span>
              {manualCardQuestao.banca && (
                <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 border border-[var(--line)] text-[var(--ink)]">
                  {manualCardQuestao.banca}
                </span>
              )}
              {manualCardQuestao.assunto && (
                <span className="text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
                  › {manualCardQuestao.assunto}
                </span>
              )}
            </div>

            {manualCardFeedback && (
              <div className="rounded-[var(--radius-btn)] bg-[color-mix(in_srgb,var(--ok)_12%,var(--surface))] p-2.5 text-xs font-semibold text-[var(--ok)] flex items-center gap-1.5">
                <Check size={14} />
                {manualCardFeedback}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                  Frente (Pergunta ou Contexto) *
                </label>
                <textarea
                  value={cardFrente}
                  onChange={(e) => setCardFrente(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)] leading-relaxed"
                  placeholder="Ex: Qual é a regra sobre..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                  Verso (Resposta ou Regra) *
                </label>
                <textarea
                  value={cardVerso}
                  onChange={(e) => setCardVerso(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)] leading-relaxed"
                  placeholder="Ex: Não ocorre crase..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => setManualCardQuestao(null)}
                className="rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--mist)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingManualCard || !cardFrente.trim() || !cardVerso.trim()}
                onClick={handleSaveManualCard}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
              >
                {savingManualCard ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {savingManualCard ? "Salvando…" : "Salvar Flashcard"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={pendingDeleteQuestao !== null}
        title="Excluir questão do caderno"
        message={`Tem certeza que deseja remover esta anotação do caderno (${pendingDeleteQuestao?.codigo_questao || pendingDeleteQuestao?.disciplina || "Item"})? O aprendizado registrado e os eventuais flashcards vinculados serão excluídos.`}
        confirmLabel={deletandoId ? "Excluindo…" : "Excluir"}
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDeleteQuestao(null)}
      />
    </div>
  );
}
