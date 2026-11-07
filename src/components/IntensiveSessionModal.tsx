"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowRight, Check, Clock, Sparkles, X, Zap } from "lucide-react";
import { DialogFrame } from "@/components/DialogFrame";
import { useApp } from "@/components/AppProvider";
import { useStudyFlow } from "@/components/StudyFlowProvider";
import { SubjectIcon } from "@/components/SubjectIcon";
import { todayIndex, nextCycleSubjectId } from "@/lib/utils";

interface IntensiveSessionModalProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_DURATIONS = [15, 20, 25, 30, 45, 60];

export function IntensiveSessionModal({ open, onClose }: IntensiveSessionModalProps) {
  const { data } = useApp();
  const flow = useStudyFlow();

  // Matérias ativas de ciclo (não livres)
  const activeSubjects = useMemo(() => {
    return (data.subjects ?? [])
      .filter((s) => s.active && !s.is_free)
      .sort((a, b) => a.cycle_order - b.cycle_order);
  }, [data.subjects]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [durationType, setDurationType] = useState<"default" | "custom">("default");
  const [customMinutes, setCustomMinutes] = useState<number>(30);

  // Inicializa a matéria selecionada com a próxima do ciclo quando o modal abre
  useEffect(() => {
    if (!open) return;
    const day = todayIndex();
    const nextId = nextCycleSubjectId(data.subjects ?? [], day);
    if (nextId && activeSubjects.some((s) => s.id === nextId)) {
      setSelectedSubjectId(nextId);
    } else if (activeSubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(activeSubjects[0].id);
    }
  }, [open, data.subjects, activeSubjects, selectedSubjectId]);

  const selectedSubject = useMemo(() => {
    return activeSubjects.find((s) => s.id === selectedSubjectId) ?? null;
  }, [activeSubjects, selectedSubjectId]);

  const effectiveMinutes =
    durationType === "default"
      ? flow.settings.targetMinutes
      : Math.max(1, Math.min(180, customMinutes || 30));

  const handleStart = () => {
    if (!selectedSubjectId) return;
    flow.startIntensiveSession(selectedSubjectId, effectiveMinutes);
    onClose();
  };

  return (
    <DialogFrame
      open={open}
      onClose={onClose}
      cardClassName="surface w-full max-w-lg p-5 sm:p-6 shadow-[var(--shadow-xl)] animate-fade-in"
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-2xs">
              <Zap size={20} className="fill-current" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[var(--ink)]">
                Modo Intensivo
              </h2>
              <p className="mt-0.5 text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
                Foque 100% em uma única matéria para sprints ou véspera de prova.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)] cursor-pointer"
            title="Fechar"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Escolha da matéria */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
              1. Escolha a matéria
            </label>
            <span className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
              {activeSubjects.length} disponível(is)
            </span>
          </div>

          <div className="max-h-52 overflow-y-auto rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] divide-y divide-[var(--line)]/60 scrollbar-subtle">
            {activeSubjects.length === 0 ? (
              <p className="p-4 text-center text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                Nenhuma matéria ativa encontrada.
              </p>
            ) : (
              activeSubjects.map((sub) => {
                const isSelected = sub.id === selectedSubjectId;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/10 dark:bg-amber-500/15 text-[var(--ink)] font-semibold"
                        : "hover:bg-[var(--mist)]/70 text-[var(--ink)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SubjectIcon name={sub.name} icon={sub.icon} size={16} />
                      <span className="truncate text-sm">{sub.name}</span>
                    </div>
                    <div
                      className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${
                        isSelected
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "border-[color-mix(in_srgb,var(--line)_80%,transparent)] bg-[var(--surface)]"
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Duração da sessão */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
            2. Duração da sessão
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Duração Padrão dos Ajustes */}
            <button
              type="button"
              onClick={() => setDurationType("default")}
              className={`flex flex-col items-start gap-1 rounded-[var(--radius-tag)] border p-3 text-left transition cursor-pointer ${
                durationType === "default"
                  ? "border-[var(--signal)] bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] ring-1 ring-[var(--signal)]/30"
                  : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--mist)]/50"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-[var(--ink)]">
                  Padrão dos Ajustes
                </span>
                <span className="rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Recomendado
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-base font-bold text-[var(--signal)]">
                <Clock size={15} />
                <span>{flow.settings.targetMinutes} min</span>
              </div>
              <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                Tempo configurado em Ajustes
              </span>
            </button>

            {/* Duração Personalizada */}
            <button
              type="button"
              onClick={() => setDurationType("custom")}
              className={`flex flex-col items-start gap-1 rounded-[var(--radius-tag)] border p-3 text-left transition cursor-pointer ${
                durationType === "custom"
                  ? "border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 ring-1 ring-amber-500/30"
                  : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--mist)]/50"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-[var(--ink)]">
                  Personalizar tempo
                </span>
                <span className="text-[10px] font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
                  1 a 180 min
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-base font-bold text-amber-600 dark:text-amber-400">
                <Clock size={15} />
                <span>{customMinutes || 30} min</span>
              </div>
              <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                Defina o tempo desejado
              </span>
            </button>
          </div>

          {/* Seletor numérico e presets quando duração customizada estiver ativa */}
          {durationType === "custom" && (
            <div className="rounded-[var(--radius-tag)] border border-amber-500/20 bg-amber-500/5 p-3 space-y-2.5 animate-fade-in">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="custom-minutes-input"
                  className="text-xs font-medium text-[var(--ink)] shrink-0"
                >
                  Minutos:
                </label>
                <input
                  id="custom-minutes-input"
                  type="number"
                  min={1}
                  max={180}
                  value={customMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setCustomMinutes(isNaN(val) ? 0 : Math.max(1, Math.min(180, val)));
                  }}
                  className="w-24 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm font-semibold text-[var(--ink)] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                  minutos
                </span>
              </div>

              {/* Presets rápidos */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)] mr-1">
                  Atalhos:
                </span>
                {PRESET_DURATIONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomMinutes(preset)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition cursor-pointer ${
                      customMinutes === preset
                        ? "bg-amber-500 text-white font-semibold shadow-2xs"
                        : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--mist)]"
                    }`}
                  >
                    {preset}m
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nota informativa de retorno inteligente ao ciclo */}
        <div className="flex items-start gap-2.5 rounded-[var(--radius-tag)] border border-blue-500/20 bg-blue-500/8 dark:bg-blue-950/30 p-3 text-xs text-blue-900 dark:text-blue-200">
          <Sparkles size={15} className="shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <p className="leading-relaxed">
            Ao encerrar o Modo Intensivo, <strong>{selectedSubject?.name || "a matéria"}</strong>{" "}
            ficará registrada como concluída no ciclo de hoje, e o ciclo avançará para a matéria
            seguinte para não repetir o mesmo conteúdo.
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-btn)] px-4 py-2.5 text-xs sm:text-sm font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selectedSubjectId || effectiveMinutes < 1}
            onClick={handleStart}
            className="btn flex items-center gap-2 rounded-[var(--radius-btn)] bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Zap size={15} className="fill-current" />
            <span>Iniciar Modo Intensivo ({effectiveMinutes} min)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}
