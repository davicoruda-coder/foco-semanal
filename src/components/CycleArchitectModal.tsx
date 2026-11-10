"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  X,
  Clock,
  BookOpen,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  RotateCw,
  HelpCircle,
  Brain,
  Layers,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { DAYS, type Subject } from "@/lib/types";
import { newId } from "@/lib/demo-store";
import type {
  ArchitectSubjectRecommendation,
  CycleArchitectRequestPayload,
  CycleArchitectResponsePayload,
  DayTimeBudget,
  StudyPhase,
  SubjectAssessmentInput,
  SubjectNature,
} from "@/lib/cycle-architect-types";

type Step = "availability" | "subjects" | "assessment" | "phase" | "preview";

const PRESET_SCHEDULES = [
  {
    name: "Padrão (2h seg-sex, 3h sáb)",
    budgets: [120, 120, 120, 120, 120, 180, 0],
  },
  {
    name: "Intensivo (4h todos os dias)",
    budgets: [240, 240, 240, 240, 240, 240, 240],
  },
  {
    name: "Trabalho Integral (1h30 útil, 4h fds)",
    budgets: [90, 90, 90, 90, 90, 240, 180],
  },
];

export function CycleArchitectModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data, setData } = useApp();

  const [step, setStep] = useState<Step>("availability");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Orçamento diário (em minutos)
  const [dailyBudgets, setDailyBudgets] = useState<number[]>([
    120, 120, 120, 120, 120, 180, 0,
  ]);

  // 2. Catálogo de matérias para assessment
  const [subjectInputs, setSubjectInputs] = useState<SubjectAssessmentInput[]>(() => {
    const existing = (data.subjects ?? []).filter((s) => s.active && !s.is_free);
    if (existing.length > 0) {
      return existing.map((s) => ({
        id: s.id,
        name: s.name,
        difficulty: 3,
        exam_weight: s.weight && s.weight >= 2 ? s.weight + 1 : 3,
        nature: (s.study_minutes && s.study_minutes >= 45 ? "practical" : "conceptual") as SubjectNature,
        study_days: s.study_days ?? null,
      }));
    }
    return [
      { name: "Português", difficulty: 3, exam_weight: 4, nature: "conceptual" },
      { name: "Raciocínio Lógico", difficulty: 4, exam_weight: 4, nature: "practical" },
      { name: "Direito Constitucional", difficulty: 3, exam_weight: 5, nature: "conceptual" },
    ];
  });

  const [newSubjectName, setNewSubjectName] = useState("");

  // 3. Fase de Estudos & Observações
  const [studyPhase, setStudyPhase] = useState<StudyPhase>("intermediario_exercicios");
  const [userNotes, setUserNotes] = useState("");

  // 4. Resultado da IA / Heurística
  const [result, setResult] = useState<CycleArchitectResponsePayload | null>(null);
  const [editedSubjects, setEditedSubjects] = useState<ArchitectSubjectRecommendation[]>([]);

  if (!isOpen) return null;

  function updateDailyBudget(dayIdx: number, deltaMinutes: number) {
    setDailyBudgets((prev) => {
      const next = [...prev];
      next[dayIdx] = Math.max(0, Math.min(600, next[dayIdx] + deltaMinutes));
      return next;
    });
  }

  function applyPreset(budgets: number[]) {
    setDailyBudgets([...budgets]);
  }

  function handleAddSubject() {
    const clean = newSubjectName.trim();
    if (!clean) return;
    setSubjectInputs((prev) => [
      ...prev,
      {
        name: clean,
        difficulty: 3,
        exam_weight: 3,
        nature: "conceptual",
      },
    ]);
    setNewSubjectName("");
  }

  function handleRemoveSubject(index: number) {
    setSubjectInputs((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAssessment(
    index: number,
    field: keyof SubjectAssessmentInput,
    value: any,
  ) {
    setSubjectInputs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleGenerate() {
    if (subjectInputs.length === 0) {
      setError("Cadastre ao menos 1 disciplina para calcular o ciclo.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload: CycleArchitectRequestPayload = {
      study_phase: studyPhase,
      daily_budgets: dailyBudgets.map((mins, idx) => ({
        dayIndex: idx,
        availableMinutes: mins,
      })),
      subjects: subjectInputs,
      user_notes: userNotes.trim() || undefined,
    };

    try {
      const res = await fetch("/api/ciclo/arquiteto-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok && !json.architectResult) {
        throw new Error(json.error || "Erro ao consultar o Arquiteto de IA.");
      }

      const architectData: CycleArchitectResponsePayload = json.architectResult;
      setResult(architectData);
      setEditedSubjects([...architectData.subjects]);
      setStep("preview");
    } catch (err: any) {
      console.error("[CycleArchitectModal] erro:", err);
      setError(err.message || "Falha ao gerar o ciclo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleApplyCycle() {
    if (!result || editedSubjects.length === 0) return;

    setData((prev) => {
      const existingSubjects = [...(prev.subjects ?? [])];
      const updatedList: Subject[] = [];

      // Atualiza matérias existentes ou insere novas
      for (const rec of editedSubjects) {
        const foundIndex = existingSubjects.findIndex(
          (s) => (rec.id && s.id === rec.id) || s.name.trim().toLowerCase() === rec.name.trim().toLowerCase(),
        );

        if (foundIndex >= 0) {
          const s = existingSubjects[foundIndex];
          updatedList.push({
            ...s,
            weight: rec.weight,
            study_minutes: rec.study_minutes,
            study_days: rec.allowed_days ?? s.study_days,
            cycle_done: 0, // Reinicia contagem de voltas para calibrar com o novo ciclo
          });
          existingSubjects.splice(foundIndex, 1);
        } else {
          updatedList.push({
            id: newId("sub"),
            name: rec.name,
            status: "prox",
            notes: "",
            cycle_order: updatedList.length + 1,
            active: true,
            study_days: rec.allowed_days,
            exclusive_days: null,
            exclusive_status: "prox",
            study_minutes: rec.study_minutes,
            is_free: false,
            rotation: null,
            icon: null,
            weight: rec.weight,
            cycle_done: 0,
          });
        }
      }

      // Mantém matérias que não estavam na lista como estavam
      return {
        ...prev,
        subjects: [...updatedList, ...existingSubjects],
      };
    });

    onClose();
  }

  function updateEditedSubjectWeight(index: number, delta: number) {
    setEditedSubjects((prev) => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      const newWeight = Math.max(1, Math.min(4, target.weight + delta));
      next[index] = { ...target, weight: newWeight };
      return next;
    });
  }

  function updateEditedSubjectMinutes(index: number, delta: number) {
    setEditedSubjects((prev) => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      const newMins = Math.max(15, Math.min(90, target.study_minutes + delta));
      next[index] = { ...target, study_minutes: newMins };
      return next;
    });
  }

  const totalWeeklyHours = useMemo(() => {
    const mins = dailyBudgets.reduce((a, b) => a + b, 0);
    return (mins / 60).toFixed(1);
  }, [dailyBudgets]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="surface w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)] border border-[color-mix(in_srgb,var(--signal)_25%,transparent)] shadow-2xs">
              <Sparkles size={18} strokeWidth={2.3} />
            </div>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-[var(--ink)] tracking-tight flex items-center gap-2">
                Arquiteto de Ciclo de Estudos
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--signal-soft)] text-[var(--signal)]">
                  IA & Ciência
                </span>
              </h2>
              <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                {step === "availability" && "Passo 1/4: Horas reais disponíveis na semana"}
                {step === "subjects" && "Passo 2/4: Catálogo de disciplinas"}
                {step === "assessment" && "Passo 3/4: Dificuldade e natureza das matérias"}
                {step === "phase" && "Passo 4/4: Momento de preparação e cálculo"}
                {step === "preview" && "Revisão Interativa: Ajuste o ciclo antes de salvar"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:text-[var(--ink)] hover:bg-[var(--mist)] transition cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/25 bg-red-500/10 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-500" />
              <p>{error}</p>
            </div>
          )}

          {/* PASSO 1: DISPONIBILIDADE */}
          {step === "availability" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--mist)]/40 p-3.5 space-y-2">
                <p className="text-xs font-semibold text-[var(--ink)]">
                  Quantas horas líquidas você realmente consegue estudar por dia?
                </p>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
                  O ciclo contínuo não engessa horários no relógio, mas precisa saber seu volume real para calibrar o número ideal de voltas e matérias por dia.
                </p>

                {/* Atalhos rápidos */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_SCHEDULES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset.budgets)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--signal)] hover:text-[var(--signal)] transition cursor-pointer shadow-2xs"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ajuste dia a dia */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DAYS.map((dayName, idx) => {
                  const minutes = dailyBudgets[idx] || 0;
                  const hours = (minutes / 60).toFixed(1);
                  return (
                    <div
                      key={dayName}
                      className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] space-y-1.5 text-center shadow-2xs"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                        {dayName}
                      </span>
                      <div className="text-sm font-mono-num font-bold text-[var(--ink)]">
                        {minutes === 0 ? "Descanso" : `${hours}h (${minutes}m)`}
                      </div>
                      <div className="flex items-center justify-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => updateDailyBudget(idx, -30)}
                          className="size-6 grid place-items-center rounded-md border border-[var(--line)] bg-[var(--mist)] text-[var(--ink)] hover:bg-[var(--surface)] text-xs font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDailyBudget(idx, 30)}
                          className="size-6 grid place-items-center rounded-md border border-[var(--line)] bg-[var(--mist)] text-[var(--ink)] hover:bg-[var(--surface)] text-xs font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-right text-xs font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
                Total semanal programado: <span className="font-bold text-[var(--signal)]">{totalWeeklyHours} horas</span>
              </div>
            </div>
          )}

          {/* PASSO 2: MATÉRIAS */}
          {step === "subjects" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[var(--ink)]">
                  Quais disciplinas você precisa estudar neste ciclo?
                </p>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
                  Adicione ou remova disciplinas da sua rotina atual. O recomendável para concursos e faculdade é entre 4 e 8 matérias ativas no ciclo.
                </p>
              </div>

              {/* Adicionar Matéria Rápida */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nome da disciplina (ex: Português, RLM, Direito...)"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubject();
                    }
                  }}
                  className="input flex-1 text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddSubject}
                  className="btn btn-primary whitespace-nowrap text-xs sm:text-sm"
                >
                  <Plus size={15} /> Adicionar
                </button>
              </div>

              {/* Lista de Matérias Cadastradas */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {subjectInputs.map((sub, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-2xs text-xs"
                  >
                    <span className="font-semibold text-[var(--ink)]">{sub.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(idx)}
                      className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                      title="Remover matéria"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)] text-right">
                {subjectInputs.length} {subjectInputs.length === 1 ? "matéria selecionada" : "matérias selecionadas"}
              </p>
            </div>
          )}

          {/* PASSO 3: ASSESSMENT / COMPLEXIDADE */}
          {step === "assessment" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--ink)]">
                  Classificação de Dificuldade e Natureza Cognitiva
                </p>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
                  A IA usará esses fatores para calibrar a duração dos blocos (20 a 60m) e os pesos (1 a 4 passadas no ciclo).
                </p>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {subjectInputs.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-[var(--ink)]">{sub.name}</span>
                      <span className="text-[11px] font-semibold text-[var(--signal)]">
                        {sub.nature === "conceptual" ? "📖 Teórica/Densa" : sub.nature === "practical" ? "💻 Prática/Problemas" : "⚖️ Mista"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* Dificuldade */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                          Dificuldade (1 a 5)
                        </label>
                        <select
                          value={sub.difficulty}
                          onChange={(e) => updateAssessment(idx, "difficulty", Number(e.target.value))}
                          className="w-full p-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] text-xs"
                        >
                          <option value={1}>1 - Muito fácil</option>
                          <option value={2}>2 - Fácil</option>
                          <option value={3}>3 - Média</option>
                          <option value={4}>4 - Difícil</option>
                          <option value={5}>5 - Muito difícil</option>
                        </select>
                      </div>

                      {/* Peso no Edital / Relevância */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                          Peso no Edital / Meta
                        </label>
                        <select
                          value={sub.exam_weight}
                          onChange={(e) => updateAssessment(idx, "exam_weight", Number(e.target.value))}
                          className="w-full p-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] text-xs"
                        >
                          <option value={1}>1 - Baixo / Complementar</option>
                          <option value={2}>2 - Médio-baixo</option>
                          <option value={3}>3 - Importante</option>
                          <option value={4}>4 - Muito importante</option>
                          <option value={5}>5 - Prioridade máxima</option>
                        </select>
                      </div>

                      {/* Natureza */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                          Natureza da Matéria
                        </label>
                        <select
                          value={sub.nature}
                          onChange={(e) => updateAssessment(idx, "nature", e.target.value as SubjectNature)}
                          className="w-full p-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] text-xs"
                        >
                          <option value="conceptual">Conceitual (Leitura/Teoria)</option>
                          <option value="practical">Prática (Código/Problemas)</option>
                          <option value="mixed">Mista (Teoria + Questões)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 4: FASE DE ESTUDOS */}
          {step === "phase" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--ink)]">
                  Qual é o momento atual da sua preparação?
                </p>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
                  Isso orienta a estratégia de retenção (se devemos priorizar blocos de base ou alto espaçamento de revisão).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: "iniciante_teoria",
                    title: "Construção de Base",
                    desc: "Primeiro contato com a matéria, foco em teoria e entendimento inicial.",
                  },
                  {
                    id: "intermediario_exercicios",
                    title: "Intermediário & Prática",
                    desc: "Teoria consolidada, foco em fixação por exercícios e resolução de questões.",
                  },
                  {
                    id: "reta_final_revisao",
                    title: "Reta Final & Simulados",
                    desc: "Prévia de prova próxima, foco em flashcards, simulados e rotação rápida.",
                  },
                ].map((ph) => {
                  const isSelected = studyPhase === ph.id;
                  return (
                    <button
                      key={ph.id}
                      type="button"
                      onClick={() => setStudyPhase(ph.id as StudyPhase)}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer space-y-1.5 ${
                        isSelected
                          ? "border-[var(--signal)] bg-[var(--signal-soft)] shadow-2xs"
                          : "border-[var(--line)] bg-[var(--surface)] hover:border-[color-mix(in_srgb,var(--signal)_40%,var(--line))]"
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm text-[var(--ink)]">{ph.title}</div>
                      <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
                        {ph.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Observação Adicional Opcional */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-[var(--ink)]">
                  Observações ou metas específicas para a IA (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 'Quero focar em programação aos sábados' ou 'Dificuldade extrema em RLM'..."
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  className="input text-xs sm:text-sm w-full"
                />
              </div>
            </div>
          )}

          {/* PASSO 5: PRÉVIA INTERATIVA (FLEXIBLE OVERRIDES) */}
          {step === "preview" && result && (
            <div className="space-y-4">
              {/* Card Resumo da Estratégia */}
              <div className="p-4 rounded-xl border border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_5%,var(--surface))] space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-xs sm:text-sm text-[var(--signal)] flex items-center gap-1.5">
                    <Sparkles size={14} /> {result.strategy_summary.strategy_name}
                  </span>
                  <span className="text-[11px] font-semibold text-[color-mix(in_srgb,var(--ink)_75%,transparent)] font-mono-num">
                    ~{result.strategy_summary.estimated_weekly_rounds} voltas/semana
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-mono-num">
                  <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs">
                    <div className="text-[10px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] uppercase font-sans">
                      Tempo da Volta
                    </div>
                    <div className="font-bold text-[var(--ink)]">
                      {Math.round(result.strategy_summary.total_cycle_minutes / 60)}h {result.strategy_summary.total_cycle_minutes % 60}m
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs">
                    <div className="text-[10px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] uppercase font-sans">
                      Média / Bloco
                    </div>
                    <div className="font-bold text-[var(--ink)]">{result.strategy_summary.average_block_minutes} min</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs">
                    <div className="text-[10px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] uppercase font-sans">
                      Slots no Ciclo
                    </div>
                    <div className="font-bold text-[var(--ink)]">
                      {editedSubjects.reduce((acc, s) => acc + s.weight, 0)} blocos
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs">
                    <div className="text-[10px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] uppercase font-sans">
                      Saúde do Ciclo
                    </div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">100% Equilibrado</div>
                  </div>
                </div>
              </div>

              {/* Alerta Preventivo se houver */}
              {result.pedagogical_guidance.caution_warning && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                  <p>{result.pedagogical_guidance.caution_warning}</p>
                </div>
              )}

              {/* Tabela Interativa de Matérias com Controles Rápidos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--ink)]">
                    Disciplinas do Ciclo (Ajuste fino disponível)
                  </span>
                  <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
                    Você pode alterar pesos e minutos livremente
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {editedSubjects.map((sub, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--ink)] text-xs sm:text-sm truncate">
                            {sub.name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_75%,transparent)]">
                            {sub.nature === "conceptual" ? "📖 Teórica" : sub.nature === "practical" ? "💻 Prática" : "⚖️ Mista"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_60%,transparent)] leading-relaxed italic">
                          {sub.pedagogical_reason}
                        </p>
                      </div>

                      {/* Controles de Peso e Minutos */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center font-mono-num">
                        {/* Peso */}
                        <div className="flex items-center gap-1 bg-[var(--mist)] px-2 py-1 rounded-lg border border-[var(--line)]">
                          <span className="text-[10px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] font-sans mr-0.5">
                            Peso:
                          </span>
                          <button
                            type="button"
                            onClick={() => updateEditedSubjectWeight(idx, -1)}
                            className="size-5 grid place-items-center rounded bg-[var(--surface)] font-bold text-[var(--ink)] hover:text-[var(--signal)] cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs text-[var(--ink)] px-1">{sub.weight}x</span>
                          <button
                            type="button"
                            onClick={() => updateEditedSubjectWeight(idx, 1)}
                            className="size-5 grid place-items-center rounded bg-[var(--surface)] font-bold text-[var(--ink)] hover:text-[var(--signal)] cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Tempo */}
                        <div className="flex items-center gap-1 bg-[var(--mist)] px-2 py-1 rounded-lg border border-[var(--line)]">
                          <Clock size={11} className="text-[color-mix(in_srgb,var(--ink)_55%,transparent)] mr-0.5" />
                          <button
                            type="button"
                            onClick={() => updateEditedSubjectMinutes(idx, -5)}
                            className="size-5 grid place-items-center rounded bg-[var(--surface)] font-bold text-[var(--ink)] hover:text-[var(--signal)] cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs text-[var(--ink)] px-1">{sub.study_minutes}m</span>
                          <button
                            type="button"
                            onClick={() => updateEditedSubjectMinutes(idx, 5)}
                            className="size-5 grid place-items-center rounded bg-[var(--surface)] font-bold text-[var(--ink)] hover:text-[var(--signal)] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gatilhos de Modo Intensivo */}
              {result.intensive_triggers && result.intensive_triggers.length > 0 && (
                <div className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <Zap size={14} className="fill-current text-amber-500" />
                    <span>Gatilhos Estratégicos para Modo Intensivo</span>
                  </div>
                  <div className="space-y-1">
                    {result.intensive_triggers.map((t, idx) => (
                      <p key={idx} className="text-[11px] text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed">
                        • <strong className="text-[var(--ink)]">{t.subject_name} ({t.recommended_sprint_minutes}m):</strong> {t.condition}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Orientação Pedagógica Geral */}
              <div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--mist)]/40 space-y-1 text-xs">
                <span className="font-bold text-[var(--ink)]">💡 Orientação do Arquiteto:</span>
                <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
                  {result.pedagogical_guidance.key_advice}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--line)] bg-[var(--surface)]">
          {step !== "availability" && step !== "preview" ? (
            <button
              type="button"
              onClick={() => {
                if (step === "subjects") setStep("availability");
                if (step === "assessment") setStep("subjects");
                if (step === "phase") setStep("assessment");
              }}
              className="btn btn-secondary text-xs sm:text-sm flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Voltar
            </button>
          ) : step === "preview" ? (
            <button
              type="button"
              onClick={() => setStep("phase")}
              className="btn btn-secondary text-xs sm:text-sm flex items-center gap-1.5"
            >
              <RotateCw size={14} /> Recalibrar
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs sm:text-sm"
            >
              Cancelar
            </button>
          )}

          {step === "availability" && (
            <button
              type="button"
              onClick={() => setStep("subjects")}
              className="btn btn-primary text-xs sm:text-sm flex items-center gap-1.5"
            >
              Próximo: Disciplinas <ArrowRight size={14} />
            </button>
          )}

          {step === "subjects" && (
            <button
              type="button"
              disabled={subjectInputs.length === 0}
              onClick={() => setStep("assessment")}
              className="btn btn-primary text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              Próximo: Diagnóstico <ArrowRight size={14} />
            </button>
          )}

          {step === "assessment" && (
            <button
              type="button"
              onClick={() => setStep("phase")}
              className="btn btn-primary text-xs sm:text-sm flex items-center gap-1.5"
            >
              Próximo: Fase de Estudos <ArrowRight size={14} />
            </button>
          )}

          {step === "phase" && (
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="btn btn-primary text-xs sm:text-sm flex items-center gap-2 font-bold shadow-md shadow-purple-500/10 cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw size={15} className="animate-spin" />
                  Calculando ciclo científico...
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Calcular Ciclo Ideal
                </>
              )}
            </button>
          )}

          {step === "preview" && (
            <button
              type="button"
              onClick={handleApplyCycle}
              className="btn btn-primary text-xs sm:text-sm flex items-center gap-1.5 font-bold shadow-md shadow-emerald-500/15"
            >
              <CheckCircle2 size={16} /> Aplicar Ciclo Recomendado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
