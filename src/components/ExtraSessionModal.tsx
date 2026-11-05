"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckSquare,
  Clock,
  Layers,
  ListOrdered,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { DialogFrame } from "@/components/DialogFrame";
import { useApp } from "@/components/AppProvider";
import { useStudyFlow } from "@/components/StudyFlowProvider";
import {
  blockTotalMinutes,
  formatBlockSummary,
  packStudyBlock,
  subjectMinutes,
} from "@/lib/session-block";
import {
  buildExtraSessionQueue,
} from "@/lib/utils";
import { SubjectIcon } from "@/components/SubjectIcon";
import type { Subject } from "@/lib/types";

interface ExtraSessionModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExtraSessionModal({ open, onClose }: ExtraSessionModalProps) {
  const { data } = useApp();
  const flow = useStudyFlow();

  const [mode, setMode] = useState<"cycle" | "custom">("cycle");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // Matérias ativas com tempo (não livres), ordenadas pela ordem global do ciclo
  const activeCycleSubjects = useMemo(() => {
    return (data.subjects ?? [])
      .filter((s) => s.active && !s.is_free)
      .sort((a, b) => a.cycle_order - b.cycle_order);
  }, [data.subjects]);

  // Fila e bloco calculado para "Continuar Ciclo"
  const cycleQueue = useMemo(() => {
    return buildExtraSessionQueue(data.subjects ?? [], "cycle");
  }, [data.subjects]);

  const cyclePreview = useMemo(() => {
    return packStudyBlock(
      cycleQueue,
      flow.settings.minMinutes,
      flow.settings.maxMinutes,
      flow.settings.targetMinutes,
    );
  }, [cycleQueue, flow.settings]);

  // Fila calculada dinamicamente para "Selecionar Matérias" (intercalação ponderada)
  const customQueue = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return buildExtraSessionQueue(
      data.subjects ?? [],
      "custom",
      Array.from(selectedIds),
    );
  }, [data.subjects, selectedIds]);

  const toggleSubject = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(activeCycleSubjects.map((s) => s.id)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const handleStart = () => {
    if (mode === "cycle") {
      if (cyclePreview.length === 0) return;
      flow.startExtraSession("cycle");
    } else {
      if (customQueue.length === 0) return;
      flow.startExtraSession("custom", Array.from(selectedIds), {
        allSelected: true,
      });
    }
    onClose();
  };

  const isStartDisabled =
    mode === "cycle" ? cyclePreview.length === 0 : customQueue.length === 0;

  return (
    <DialogFrame
      open={open}
      onClose={onClose}
      closeOnOutsideClick
      labelledBy="extra-session-title"
      cardClassName="surface w-full max-w-lg overflow-hidden rounded-2xl p-0 shadow-[var(--shadow-lg)] border border-[var(--line)]"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--signal)_6%,var(--surface))] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--signal)] text-white shadow-xs">
            <Sparkles size={18} />
          </span>
          <div>
            <h2
              id="extra-session-title"
              className="text-base font-semibold tracking-tight text-[var(--ink)]"
            >
              Iniciar Sessão Extra
            </h2>
            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
              Estude fora da grade sem alterar suas regras semanais
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-[color-mix(in_srgb,var(--ink)_60%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] hover:text-[var(--ink)]"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
        {/* Seletor de Modo (Abas) */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] p-1">
          <button
            type="button"
            onClick={() => setMode("cycle")}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs md:text-sm font-medium transition ${
              mode === "cycle"
                ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs font-semibold"
                : "text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)]"
            }`}
          >
            <ListOrdered size={15} />
            Continuar Ciclo
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs md:text-sm font-medium transition ${
              mode === "custom"
                ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs font-semibold"
                : "text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)]"
            }`}
          >
            <CheckSquare size={15} />
            Escolher Matérias
          </button>
        </div>

        {/* MODO 1: Continuar Ciclo */}
        {mode === "cycle" && (
          <div className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                  Próximas Matérias do Ciclo
                </span>
                <span className="text-xs font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
                  {cyclePreview.length > 0
                    ? formatBlockSummary(cyclePreview)
                    : "Fila vazia"}
                </span>
              </div>

              {cyclePreview.length > 0 ? (
                <div className="space-y-2">
                  {cyclePreview.map((sub, index) => {
                    return (
                      <div
                        key={`${sub.id}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-xs font-bold text-[var(--ink)]">
                            {index + 1}
                          </span>
                          <SubjectIcon name={sub.name} icon={sub.icon} size={24} />
                          <span className="truncate text-sm font-medium text-[var(--ink)]">
                            {sub.name}
                          </span>
                          {(sub.weight ?? 1) > 1 && (
                            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              {sub.weight}x
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                          <Clock size={13} />
                          <span>{subjectMinutes(sub)} min</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                  Nenhuma matéria pendente encontrada no ciclo.
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODO 2: Escolher Matérias */}
        {mode === "custom" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                Escolha o que estudar agora
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-[var(--signal)] hover:underline font-medium"
                >
                  Todas
                </button>
                <span className="text-[color-mix(in_srgb,var(--ink)_30%,transparent)]">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:underline"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Lista com Checkboxes */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {activeCycleSubjects.map((sub) => {
                const isSelected = selectedIds.has(sub.id);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => toggleSubject(sub.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition ${
                      isSelected
                        ? "border-[var(--signal)] bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))]"
                        : "border-[var(--line)] bg-[var(--surface)] hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[var(--signal)]">
                        {isSelected ? (
                          <CheckSquare size={17} />
                        ) : (
                          <Square size={17} className="text-[color-mix(in_srgb,var(--ink)_40%,transparent)]" />
                        )}
                      </span>
                      <SubjectIcon name={sub.name} icon={sub.icon} size={24} />
                      <span className="truncate text-sm font-medium text-[var(--ink)]">
                        {sub.name}
                      </span>
                      {(sub.weight ?? 1) > 1 && (
                        <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          peso {sub.weight}x
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                      {subjectMinutes(sub)} min
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Preview da Sequência Balanceada com Intercalação Uniforme */}
            <div className="rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_3%,var(--surface))] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <Layers size={14} className="text-[var(--signal)]" />
                  Ordem Intercalada pelo FocoHub
                </span>
                {customQueue.length > 0 && (
                  <span className="font-medium text-[var(--signal)]">
                    {customQueue.length} {customQueue.length === 1 ? "bloco" : "blocos"} · ~{blockTotalMinutes(customQueue)} min
                  </span>
                )}
              </div>

              {customQueue.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {customQueue.map((sub, i) => {
                    return (
                      <span key={`${sub.id}-${i}`} className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--ink)] shadow-2xs"
                        >
                          <SubjectIcon name={sub.name} icon={sub.icon} size={18} />
                          <span>{sub.name}</span>
                          <span className="text-[10px] opacity-60">
                            {subjectMinutes(sub)}m
                          </span>
                        </span>
                        {i < customQueue.length - 1 && (
                          <ArrowRight size={11} className="text-[color-mix(in_srgb,var(--ink)_35%,transparent)] shrink-0" />
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)] italic">
                  Selecione ao menos 1 matéria acima para calcular a intercalação balanceada.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rodapé com Ações */}
      <div className="flex items-center justify-end gap-2.5 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_2%,var(--surface))] px-5 py-3.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs md:text-sm font-medium text-[var(--ink)] transition hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isStartDisabled}
          onClick={handleStart}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-sm transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Sparkles size={15} />
          Iniciar Sessão Extra
        </button>
      </div>
    </DialogFrame>
  );
}
