"use client";

import { useId, useState, useMemo } from "react";
import {
  Download,
  Calendar,
  Sparkles,
  Clock,
  BookOpen,
  Layers,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { DialogFrame } from "@/components/DialogFrame";
import type {
  FocusReportSections,
  FocusReportFlashcardSummary,
  FocusReportAiSummary,
} from "@/lib/focus-report";
import type { Subject } from "@/lib/types";

export type ReportRange = "dia" | "semana" | "mes" | "ano";

export interface ReportConfigModalProps {
  open: boolean;
  onClose: () => void;
  // Período atual da tela
  initialRange: ReportRange;
  initialPeriodLabel: string;
  // Períodos e controles de navegação
  onDownload: (config: {
    periodRange: ReportRange;
    periodOffset: number; // 0 = atual, -1 = anterior, etc.
    subjectFilter: string | null;
    sections: FocusReportSections;
  }) => Promise<void>;
  subjects: Subject[];
  hasAiAnalysis: boolean;
  hasFlashcards: boolean;
}

export function ReportConfigModal({
  open,
  onClose,
  initialRange,
  initialPeriodLabel,
  onDownload,
  subjects,
  hasAiAnalysis,
  hasFlashcards,
}: ReportConfigModalProps) {
  const titleId = useId();

  // Estados locais de configuração do relatório
  const [selectedRange, setSelectedRange] = useState<ReportRange>(initialRange);
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  const [sections, setSections] = useState<FocusReportSections>({
    summary: true,
    subjects: true,
    timeSlots: true,
    sessionDiary: true,
    flashcards: hasFlashcards,
    aiAnalysis: hasAiAnalysis,
  });

  const [generating, setGenerating] = useState(false);

  // Toggle de seção individual
  const toggleSection = (key: keyof FocusReportSections) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Marcar / Desmarcar todas
  const allChecked = Object.values(sections).every(Boolean);
  const handleToggleAll = () => {
    const nextVal = !allChecked;
    setSections({
      summary: nextVal,
      subjects: nextVal,
      timeSlots: nextVal,
      sessionDiary: nextVal,
      flashcards: hasFlashcards ? nextVal : false,
      aiAnalysis: hasAiAnalysis ? nextVal : false,
    });
  };

  // Estimativa de páginas
  const estimatedPages = useMemo(() => {
    let count = 0;
    if (sections.summary) count += 0.3;
    if (sections.subjects) count += 0.4;
    if (sections.timeSlots) count += 0.4;
    if (sections.flashcards && hasFlashcards) count += 0.3;
    if (sections.sessionDiary) count += 0.8;
    if (sections.aiAnalysis && hasAiAnalysis) count += 0.8;
    return Math.max(1, Math.ceil(count));
  }, [sections, hasFlashcards, hasAiAnalysis]);

  // Label do período com offset
  const displayPeriodLabel = useMemo(() => {
    if (periodOffset === 0) {
      if (selectedRange === initialRange) return initialPeriodLabel;
      switch (selectedRange) {
        case "dia":
          return "Hoje";
        case "semana":
          return "Esta semana";
        case "mes":
          return "Este mês";
        case "ano":
          return "Este ano";
      }
    }
    const abs = Math.abs(periodOffset);
    const direction = periodOffset < 0 ? "anterior" : "seguinte";
    switch (selectedRange) {
      case "dia":
        return `${abs} dia(s) ${direction}`;
      case "semana":
        return `${abs} semana(s) ${direction}`;
      case "mes":
        return `${abs} mês(es) ${direction}`;
      case "ano":
        return `${abs} ano(s) ${direction}`;
    }
  }, [periodOffset, selectedRange, initialRange, initialPeriodLabel]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onDownload({
        periodRange: selectedRange,
        periodOffset,
        subjectFilter: selectedSubject === "all" ? null : selectedSubject,
        sections,
      });
      onClose();
    } catch (err) {
      console.error("[ReportConfigModal] erro:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DialogFrame
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      cardClassName="max-w-xl w-full p-0 overflow-hidden shadow-2xl"
      closeOnOutsideClick={!generating}
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 bg-[var(--surface)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)]">
              <FileText size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 id={titleId} className="text-base font-semibold text-[var(--ink)]">
                Exportar Relatório PDF
              </h2>
              <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                Escolha o período, filtros e quais seções devem constar no documento.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo com scroll suave */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
          {/* 1. Seleção de Período */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_60%,transparent)] flex items-center gap-1.5">
              <Calendar size={13} />
              1. Período do Relatório
            </label>

            <div className="grid grid-cols-4 gap-2">
              {(["dia", "semana", "mes", "ano"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setSelectedRange(r);
                    setPeriodOffset(0);
                  }}
                  className={`btn py-2 text-xs font-semibold justify-center transition-all ${
                    selectedRange === r
                      ? "bg-[var(--signal)] text-white shadow-xs"
                      : "bg-[var(--mist)] hover:bg-[var(--line)] text-[var(--ink)]"
                  }`}
                >
                  {r === "dia"
                    ? "Dia"
                    : r === "semana"
                    ? "Semana"
                    : r === "mes"
                    ? "Mês"
                    : "Ano"}
                </button>
              ))}
            </div>

            {/* Navegador de intervalo */}
            <div className="flex items-center justify-between rounded-xl bg-[var(--mist)] px-3 py-2 text-xs">
              <button
                type="button"
                onClick={() => setPeriodOffset((prev) => prev - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--surface)] text-[var(--ink)] transition-colors"
                title="Período anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="font-medium text-[var(--ink)] text-center">
                <span>{displayPeriodLabel}</span>
                {periodOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setPeriodOffset(0)}
                    className="ml-2 text-[10px] text-[var(--signal)] underline"
                  >
                    (Voltar ao atual)
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPeriodOffset((prev) => prev + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--surface)] text-[var(--ink)] transition-colors"
                title="Próximo período"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* 2. Escopo de Matérias */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_60%,transparent)] flex items-center gap-1.5">
              <BookOpen size={13} />
              2. Escopo de Matérias
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setSelectedSubject("all")}
                className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                  selectedSubject === "all"
                    ? "border-[var(--signal)] bg-[var(--signal-soft)] text-[var(--signal)] font-medium"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--mist)]"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    selectedSubject === "all"
                      ? "border-[var(--signal)] bg-[var(--signal)] text-white"
                      : "border-[var(--line)]"
                  }`}
                >
                  {selectedSubject === "all" && <Check size={10} strokeWidth={3} />}
                </div>
                <span className="text-xs">Todas as matérias e atividades</span>
              </button>

              <div className="flex-1 flex items-center gap-2 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] focus-within:border-[var(--signal)]">
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    selectedSubject !== "all"
                      ? "border-[var(--signal)] bg-[var(--signal)] text-white"
                      : "border-[var(--line)]"
                  }`}
                >
                  {selectedSubject !== "all" && <Check size={10} strokeWidth={3} />}
                </div>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-transparent text-xs text-[var(--ink)] w-full outline-hidden cursor-pointer"
                >
                  <option value="all">Escolha uma matéria específica...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Seções do Documento */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_60%,transparent)] flex items-center gap-1.5">
                <Layers size={13} />
                3. Seções a Incluir no PDF
              </label>
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-[11px] text-[var(--signal)] hover:underline font-medium"
              >
                {allChecked ? "Desmarcar todas" : "Marcar todas"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Resumo Geral */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                  sections.summary
                    ? "border-[var(--signal)] bg-[var(--signal-soft)]/30 text-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!sections.summary}
                  onChange={() => toggleSection("summary")}
                  className="mt-0.5 h-4 w-4 rounded accent-[var(--signal)] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <Clock size={12} className="text-[var(--signal)]" />
                    Resumo Geral
                  </div>
                  <div className="text-[11px] opacity-75">
                    Tempo total e voltas completas do ciclo
                  </div>
                </div>
              </label>

              {/* Distribuição por Matéria */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                  sections.subjects
                    ? "border-[var(--signal)] bg-[var(--signal-soft)]/30 text-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!sections.subjects}
                  onChange={() => toggleSection("subjects")}
                  className="mt-0.5 h-4 w-4 rounded accent-[var(--signal)] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <BookOpen size={12} className="text-[var(--signal)]" />
                    Distribuição por Matéria
                  </div>
                  <div className="text-[11px] opacity-75">
                    Tabela com horas e porcentagens dedicadas
                  </div>
                </div>
              </label>

              {/* Grade de Horários */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                  sections.timeSlots
                    ? "border-[var(--signal)] bg-[var(--signal-soft)]/30 text-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!sections.timeSlots}
                  onChange={() => toggleSection("timeSlots")}
                  className="mt-0.5 h-4 w-4 rounded accent-[var(--signal)] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <Clock size={12} className="text-[var(--signal)]" />
                    Horários de Foco
                  </div>
                  <div className="text-[11px] opacity-75">
                    Turnos e faixas de horas com estudo ativo
                  </div>
                </div>
              </label>

              {/* Diário de Sessões */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                  sections.sessionDiary
                    ? "border-[var(--signal)] bg-[var(--signal-soft)]/30 text-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!sections.sessionDiary}
                  onChange={() => toggleSection("sessionDiary")}
                  className="mt-0.5 h-4 w-4 rounded accent-[var(--signal)] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText size={12} className="text-[var(--signal)]" />
                    Diário de Sessões
                  </div>
                  <div className="text-[11px] opacity-75">
                    Histórico detalhado com horários e durações
                  </div>
                </div>
              </label>

              {/* Flashcards */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border select-none transition-all ${
                  !hasFlashcards
                    ? "opacity-40 cursor-not-allowed border-[var(--line)] bg-[var(--mist)]"
                    : sections.flashcards
                    ? "cursor-pointer border-[var(--signal)] bg-[var(--signal-soft)]/30 text-[var(--ink)]"
                    : "cursor-pointer border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!hasFlashcards}
                  checked={!!sections.flashcards}
                  onChange={() => toggleSection("flashcards")}
                  className="mt-0.5 h-4 w-4 rounded accent-[var(--signal)] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <Layers size={12} className="text-[var(--signal)]" />
                    Flashcards & Retenção
                  </div>
                  <div className="text-[11px] opacity-75">
                    {hasFlashcards
                      ? "Totais e distribuição por nível de domínio"
                      : "Nenhum flashcard registrado ainda"}
                  </div>
                </div>
              </label>

              {/* Parecer da IA */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border select-none transition-all ${
                  !hasAiAnalysis
                    ? "opacity-40 cursor-not-allowed border-[var(--line)] bg-[var(--mist)]"
                    : sections.aiAnalysis
                    ? "cursor-pointer border-[var(--signal)] bg-[var(--signal-soft)]/30 text-[var(--ink)]"
                    : "cursor-pointer border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!hasAiAnalysis}
                  checked={!!sections.aiAnalysis}
                  onChange={() => toggleSection("aiAnalysis")}
                  className="mt-0.5 h-4 w-4 rounded accent-[var(--signal)] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles size={12} className="text-[var(--signal)]" />
                    Parecer Pedagógico (IA)
                  </div>
                  <div className="text-[11px] opacity-75">
                    {hasAiAnalysis
                      ? "Incluir análise e sugestões da IA"
                      : "Gere a análise na tela antes de exportar"}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3.5 bg-[var(--mist)]">
          <div className="text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
            Estimativa:{" "}
            <span className="font-semibold text-[var(--ink)]">
              ~{estimatedPages} {estimatedPages === 1 ? "página A4" : "páginas A4"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              className="btn px-4 py-2 text-xs font-medium bg-[var(--surface)] hover:bg-[var(--line)] text-[var(--ink)] shadow-2xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="btn px-4 py-2 text-xs font-semibold bg-[var(--signal)] hover:opacity-90 text-white shadow-xs gap-1.5"
            >
              <Download size={14} strokeWidth={2.2} />
              <span>{generating ? "Exportando PDF..." : "Exportar PDF"}</span>
            </button>
          </div>
        </div>
      </div>
    </DialogFrame>
  );
}
