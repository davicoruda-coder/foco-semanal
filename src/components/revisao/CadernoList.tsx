"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ExternalLink,
  Filter,
  GraduationCap,
  Pencil,
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
  Bot,
  Layers,
  Plus,
  Loader2,
  BookOpen,
  LayoutGrid,
  List,
  RotateCcw,
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

function getCardContent(q: QuestaoCaderno) {
  const rawLines = (q.aprendizado_chave || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const meaningfulLines = rawLines.filter((l) => !/^[=\-_*~#]{3,}$/.test(l));

  const cleanPrefixes = (text: string) =>
    text
      .replace(
        /^(Pegadinha\s*(\/|e)\s*Regra\s*:\s*|Pegadinha\s*:\s*|Regra\s*:\s*|Atenção\s*:\s*|Dica\s*:\s*|Conceito-Chave\s*:\s*)/i,
        "",
      )
      .trim();

  const firstLine = meaningfulLines[0] || "";
  const isHeaderLine = /^(FICHA RESUMO|RESUMO|MAPA|REGRA CHAVE|CONCEITO CHAVE)[\s:–-]/i.test(firstLine);

  let title = (q.assunto || "").trim();
  let summary = "";

  // Se tem assunto definido
  if (title) {
    if (isHeaderLine && meaningfulLines.length > 1) {
      summary = meaningfulLines.slice(1).map(cleanPrefixes).join(" ");
    } else {
      summary = meaningfulLines.map(cleanPrefixes).join(" ");
    }
  } else if (isHeaderLine) {
    title = firstLine.replace(/^(FICHA RESUMO|RESUMO|MAPA|REGRA CHAVE|CONCEITO CHAVE)[\s:–-]+\s*/i, "").trim() || firstLine;
    summary = meaningfulLines.slice(1).map(cleanPrefixes).join(" ");
  } else {
    // Se não tem assunto explícito, usa a primeira frase/termo como título
    const firstClean = cleanPrefixes(firstLine);
    const titleMatch = firstClean.split(/[.:;–—]/)[0]?.trim();
    title = titleMatch && titleMatch.length <= 65 ? titleMatch : firstClean.slice(0, 60);
    summary = meaningfulLines.slice(1).map(cleanPrefixes).join(" ") || firstClean;
  }

  if (!summary) {
    summary = cleanPrefixes(firstLine) || "Clique para ver a ficha completa com detalhes e resolução.";
  }

  return {
    title: title || "Anotação de Estudo",
    summary,
  };
}

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
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem("foco_semanal_caderno_view") as "grid" | "list") || "grid";
  });

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("foco_semanal_caderno_view", mode);
    } catch {}
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
    disciplinaFiltro !== "todas" ||
    bancaFiltro !== "todas" ||
    causaFiltro !== "todas" ||
    resultadoFiltro !== "todas"
  );

  const handleClearFilters = () => {
    setSearch("");
    setDisciplinaFiltro("todas");
    setBancaFiltro("todas");
    setCausaFiltro("todas");
    setResultadoFiltro("todas");
  };
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
      {/* Barra de Busca e Filtros Rápidos Compacta */}
      <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-2.5 sm:p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Campo de Busca Compacto com largura contida */}
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_45%,transparent)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, regra, assunto..."
              className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] py-1.5 pl-8 pr-8 text-xs sm:text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_40%,transparent)] focus:border-[var(--signal)] focus:bg-[var(--surface)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_40%,transparent)] hover:text-[var(--ink)] p-0.5"
                title="Limpar busca"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Toggle Grade / Lista e Contador de Resultados */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            <span className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)] font-medium">
              {questoesFiltradas.length === 1
                ? "1 anotação"
                : `${questoesFiltradas.length} anotações`}
            </span>

            {/* Alternador de Visualização: Grade vs Lista */}
            <div className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--mist)] p-0.5 text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
              <button
                type="button"
                onClick={() => handleViewModeChange("grid")}
                title="Visualização em Grade (Fichas)"
                aria-label="Visualização em Grade"
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition ${
                  viewMode === "grid"
                    ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs"
                    : "hover:text-[var(--ink)]"
                }`}
              >
                <LayoutGrid size={13} />
                <span className="hidden md:inline">Grade</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("list")}
                title="Visualização em Lista"
                aria-label="Visualização em Lista"
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition ${
                  viewMode === "list"
                    ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs"
                    : "hover:text-[var(--ink)]"
                }`}
              >
                <List size={13} />
                <span className="hidden md:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros em Linha Compacta */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[color-mix(in_srgb,var(--line)_50%,transparent)]">
          <div className="flex items-center gap-1.5 text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)] shrink-0 mr-1">
            <Filter size={13} />
            <span className="text-[11px] font-medium hidden sm:inline">Filtros:</span>
          </div>

          <select
            value={disciplinaFiltro}
            onChange={(e) => setDisciplinaFiltro(e.target.value)}
            className="min-w-0 max-w-[160px] truncate rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1 text-xs text-[var(--ink)] outline-none cursor-pointer hover:border-[var(--signal)] transition"
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
            className="min-w-0 max-w-[140px] truncate rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1 text-xs text-[var(--ink)] outline-none cursor-pointer hover:border-[var(--signal)] transition"
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
            className="min-w-0 max-w-[150px] truncate rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1 text-xs text-[var(--ink)] outline-none cursor-pointer hover:border-[var(--signal)] transition"
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
            className="min-w-0 max-w-[140px] truncate rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1 text-xs text-[var(--ink)] outline-none cursor-pointer hover:border-[var(--signal)] transition"
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

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-rose-600 hover:bg-rose-500/10 transition"
              title="Limpar todos os filtros"
            >
              <RotateCcw size={11} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Lista ou Grade de Registros */}
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
            Use o botão &apos;+ Anotar no Caderno&apos; acima para registrar seus erros ou dúvidas de exercícios, simulados e provas.
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5"
              : "space-y-2.5 max-w-4xl"
          }
        >
          {questoesFiltradas.map((q) => {
            const { title: cardTitle, summary: cardSummary } = getCardContent(q);
            const cardsCount = cardsVinculados.get(q.id) || 0;

            return (
              <div
                key={q.id}
                onClick={() => setReadingQuestao(q)}
                className={`group relative cursor-pointer border border-[var(--line)] bg-[var(--surface)] transition-all duration-200 hover:border-[var(--signal)] hover:shadow-md hover:-translate-y-0.5 active:scale-[0.995] overflow-hidden border-l-[3.5px] border-l-[var(--signal)] ${
                  viewMode === "grid"
                    ? "flex flex-col justify-between min-h-[165px] sm:min-h-[175px] rounded-l-sm rounded-r-2xl sm:rounded-r-3xl p-3.5 pl-9 sm:p-4 sm:pl-10 shadow-xs"
                    : "flex items-center justify-between rounded-l-sm rounded-r-xl p-3 pl-9 sm:pl-10"
                }`}
              >
                {/* Coluna de Espiral Wire-o do Caderno (Micro-anéis metálicos acetinados e furos vazados) */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-7 sm:w-7.5 bg-[color-mix(in_srgb,var(--mist)_70%,var(--surface))] dark:bg-[color-mix(in_srgb,var(--mist)_35%,var(--surface))] flex flex-col justify-around items-center py-3.5 sm:py-4 border-r border-dashed border-[var(--line)]/80 select-none pointer-events-none z-10"
                  aria-hidden="true"
                  title={`Caderno: ${q.disciplina}`}
                >
                  {Array.from({ length: viewMode === "grid" ? 5 : 3 }).map((_, ringIdx) => (
                    <div
                      key={ringIdx}
                      className="relative flex items-center justify-center w-full"
                    >
                      {/* Sombra suave de contato sob o arame */}
                      <div className="absolute left-0.5 w-3.5 h-1.5 bg-black/15 dark:bg-black/45 rounded-full blur-[0.5px]" />

                      {/* Anel de metal acetinado Wire-o (Loop metálico entrando no furo) */}
                      <div className="absolute -left-1 sm:-left-0.5 w-4 sm:w-4.5 h-1.5 sm:h-2 rounded-full border border-slate-300 dark:border-zinc-500 bg-gradient-to-r from-slate-200 via-white to-slate-300 dark:from-zinc-600 dark:via-zinc-200 dark:to-zinc-500 shadow-[0_1px_2px_rgba(0,0,0,0.25)] z-10" />

                      {/* Furo vazado com efeito de perfuração profunda */}
                      <div className="w-2.5 h-2.5 sm:w-2.5 sm:h-2.5 rounded-full bg-black/25 dark:bg-black/75 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.65)] border border-black/10 dark:border-white/10" />
                    </div>
                  ))}
                </div>

                <div className="flex-1 flex flex-col justify-between min-w-0">
                  {/* Topo do Card: Apenas o Nome da Matéria em Destaque (Visual Limpo e Arejado) */}
                  <div className="flex items-center justify-between gap-2 text-xs pb-2.5 border-b border-[var(--line)]/50 min-w-0">
                    <span
                      className="font-bold text-[var(--signal)] text-[13px] sm:text-[14px] truncate min-w-0"
                      title={q.disciplina}
                    >
                      {q.disciplina}
                    </span>

                    {cardsCount > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] px-2 py-0.5 text-[10px] font-semibold text-[var(--signal)] border border-[color-mix(in_srgb,var(--signal)_25%,transparent)] shrink-0 whitespace-nowrap ml-auto"
                        title={`${cardsCount} flashcard(s) criado(s)`}
                      >
                        <Layers size={10} />
                        {cardsCount}
                      </span>
                    )}
                  </div>

                  {/* Miolo do Caderno: Assunto em Destaque Central Arejado */}
                  <div className="my-auto py-3 min-h-[56px] flex items-center">
                    <h3
                      className="font-bold text-[var(--ink)] leading-snug group-hover:text-[var(--signal)] transition-colors text-sm sm:text-base line-clamp-3"
                      title={cardTitle}
                    >
                      {cardTitle}
                    </h3>
                  </div>

                  {/* Rodapé do Caderno: Dica de clique + Ações Rápidas */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-[color-mix(in_srgb,var(--line)_50%,transparent)] text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
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
                      title="Criar flashcard manual"
                      aria-label="Criar flashcard manual"
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
                  <span className="text-[color-mix(in_srgb,var(--ink)_65%,transparent)] font-medium text-[13px] inline-flex items-center gap-1">
                    <ChevronRight size={12} className="shrink-0 opacity-50 text-[var(--signal)]" />
                    <span>{readingQuestao.assunto}</span>
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
              {readingQuestao.assunto && (
                <div className="pb-2.5 border-b border-[var(--line)]/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--signal)]">
                    Assunto / Tópico
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--ink)] mt-0.5">
                    {readingQuestao.assunto}
                  </h2>
                </div>
              )}

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
                      {readingQuestao.link_questao.includes("qconcursos")
                        ? "Ver no QConcursos"
                        : "Abrir link da questão"}
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
                  <span>+ Flashcard</span>
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
                    <Bot size={13} />
                    <span>
                      Gerar Flashcards <span className="hidden sm:inline">com IA</span>
                    </span>
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
      <DialogFrame
        open={editingQuestao !== null}
        onClose={() => setEditingQuestao(null)}
        labelledBy="edit-dialog-title"
        cardClassName="surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-0 shadow-[var(--shadow-lg)] border border-[var(--line)] rounded-[var(--radius)]"
      >
        {editingQuestao && (
          <div className="flex flex-col h-full max-h-[90vh] min-h-0">
            {/* Header fixo do Modal */}
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--mist)]/40 px-5 py-3.5 shrink-0">
              <div>
                <h2 id="edit-dialog-title" className="text-base font-bold text-[var(--ink)]">
                  Editar Anotação do Caderno
                </h2>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                  Atualize os dados, assunto ou a regra aprendida
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

            {/* Conteúdo com Scroll interno perfeito */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <QuickCaptureForm
                initialData={editingQuestao}
                onCancel={() => setEditingQuestao(null)}
                onSuccess={() => setEditingQuestao(null)}
              />
            </div>
          </div>
        )}
      </DialogFrame>

      {/* Modal de Criação de Card Manual a partir do Caderno */}
      <DialogFrame
        open={manualCardQuestao !== null}
        onClose={() => setManualCardQuestao(null)}
        labelledBy="manual-card-dialog-title"
        cardClassName="surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-0 shadow-[var(--shadow-lg)] border border-[var(--line)] rounded-[var(--radius)]"
      >
        {manualCardQuestao && (
          <div className="flex flex-col h-full max-h-[90vh] min-h-0">
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--mist)]/40 px-5 py-3.5 shrink-0">
              <div>
                <h2 id="manual-card-dialog-title" className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Contexto da questão */}
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[var(--mist)] p-2 text-xs">
                <span className="font-semibold text-[var(--signal)]">{manualCardQuestao.disciplina}</span>
                {manualCardQuestao.banca && (
                  <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 border border-[var(--line)] text-[var(--ink)]">
                    {manualCardQuestao.banca}
                  </span>
                )}
                {manualCardQuestao.assunto && (
                  <span className="text-[color-mix(in_srgb,var(--ink)_65%,transparent)] inline-flex items-center gap-1">
                    <ChevronRight size={12} className="shrink-0 opacity-50 text-[var(--signal)]" />
                    <span>{manualCardQuestao.assunto}</span>
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
            </div>

            <div className="flex items-center justify-end gap-2 p-3 sm:px-5 border-t border-[var(--line)] bg-[var(--surface)] shrink-0">
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
        )}
      </DialogFrame>

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
