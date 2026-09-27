"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";
import { DialogFrame } from "@/components/DialogFrame";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";
import { useApp } from "@/components/AppProvider";
import { useStudyFlow } from "@/components/StudyFlowProvider";
import type { RotationItem, Subject, SubjectResource } from "@/lib/types";
import {
  isExclusiveSoloDay,
  normalizeRotation,
  rotationJustStudied,
  rotationWithItemNotes,
  rotationWithItemRecursos,
  todayIndex,
} from "@/lib/utils";
import { SubjectResources } from "@/components/SubjectResources";
import { SynapticNetwork } from "@/components/SynapticNetwork";

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function NotesBlock({
  subject,
  rotationItem,
  draft,
  onChange,
  onChangeRecursos,
}: {
  subject: Subject;
  rotationItem: RotationItem | null;
  draft: string;
  onChange: (value: string) => void;
  onChangeRecursos: (recursos: SubjectResource[]) => void;
}) {
  return (
    <div className="mt-4 rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--mist)]/75 dark:bg-[var(--mist)]/50 p-4 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid size-6 shrink-0 place-items-center rounded-md bg-[var(--signal-soft)] text-[var(--signal)]">
            <FileText size={13} strokeWidth={2.2} />
          </div>
          <span className="truncate text-sm font-semibold text-[var(--ink)]">
            {subject.name}
            {rotationItem ? (
              <span className="text-[var(--signal)] font-medium"> · {rotationItem.name}</span>
            ) : null}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[color-mix(in_srgb,var(--ink)_55%,transparent)] border border-[color-mix(in_srgb,var(--line)_80%,transparent)] shadow-2xs">
          Salva ao avançar
        </span>
      </div>

      <AutoGrowTextarea
        className="mt-3 w-full rounded-[10px] border border-[color-mix(in_srgb,var(--line)_80%,transparent)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-snug text-[var(--ink)] placeholder:text-[color-mix(in_srgb,var(--ink)_38%,transparent)] transition-all focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal)]/15 focus:outline-none"
        value={draft}
        onChange={onChange}
        placeholder="Onde parou? (ex: aula 2.3, pág 45, próximo passo…)"
        minPx={72}
        maxPx={140}
      />
      <div className="mt-2.5">
        <SubjectResources
          compact
          recursos={rotationItem ? rotationItem.recursos : subject.recursos}
          onChange={onChangeRecursos}
        />
      </div>
    </div>
  );
}

function ExtraTimePrompt({
  subjectName,
  onExtend,
}: {
  subjectName?: string;
  onExtend: (mins: number) => void;
}) {
  return (
    <div className="mt-4 rounded-[var(--radius-tag)] border border-[color-mix(in_srgb,var(--signal)_28%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_6%,var(--surface))] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)]">
          <Clock size={14} className="text-[var(--signal)]" />
          Precisa de mais tempo{subjectName ? ` em ${subjectName}` : ""}?
        </span>
        <span className="text-[11px] font-semibold text-[var(--signal)]">
          Estender foco
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {[2, 5, 10].map((mins) => (
          <button
            key={mins}
            type="button"
            onClick={() => onExtend(mins)}
            className="inline-flex items-center justify-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] bg-[var(--surface)] py-1.5 text-xs font-semibold text-[var(--ink)] shadow-2xs transition hover:border-[var(--signal)] hover:bg-[var(--signal)] hover:text-white active:scale-95 cursor-pointer"
          >
            +{mins} min
          </button>
        ))}
      </div>
    </div>
  );
}

/** CTA / status da sessão — fica dentro do card Ciclo de Estudos. */
export function StudySessionBar() {
  const flow = useStudyFlow();
  const { data } = useApp();
  const day = todayIndex();
  const exclusiveSoloToday = isExclusiveSoloDay(data.subjects, day);
  const currentLive =
    flow.currentSubjectId == null
      ? null
      : (data.subjects ?? []).find((s) => s.id === flow.currentSubjectId) ??
        flow.block[flow.currentIndex] ??
        null;
  const currentIsLibre = Boolean(currentLive?.is_free);
  const [bursting, setBursting] = useState(false);
  const prevPhase = useRef(flow.phase);

  // Burst no play ao iniciar sessão (idle → running) e ao despausar (paused → running)
  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = flow.phase;
    if ((prev !== "idle" && prev !== "paused") || flow.phase !== "running") return;
    setBursting(false);
    const raf = requestAnimationFrame(() => {
      setBursting(true);
    });
    const id = window.setTimeout(() => setBursting(false), 1400);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(id);
    };
  }, [flow.phase]);

  type ConfirmAction = "skip" | "reset" | "finish";
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const wasRunningRef = useRef(false);

  // Fecha qualquer confirmação se a sessão sair de running/paused
  useEffect(() => {
    if (flow.phase !== "running" && flow.phase !== "paused") {
      setConfirmAction(null);
    }
  }, [flow.phase]);

  function requestAction(action: ConfirmAction) {
    if (flow.phase === "running") {
      wasRunningRef.current = true;
      flow.pauseSession();
    } else {
      wasRunningRef.current = false;
    }
    setConfirmAction(action);
  }

  function handleCancelConfirm() {
    const shouldResume = wasRunningRef.current;
    setConfirmAction(null);
    if (shouldResume && flow.phase === "paused") {
      flow.resumeSession();
    }
  }

  function handleExecuteConfirm() {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === "skip") {
      flow.completeCurrentSubjectEarly();
    } else if (action === "reset") {
      flow.resetSession();
    } else if (action === "finish") {
      flow.chooseFinish();
    }
  }

  const confirmProps = useMemo(() => {
    const currentName = currentLive?.name?.trim();
    if (confirmAction === "skip") {
      return {
        title: "Concluir matéria e avançar?",
        message: currentName
          ? `Deseja concluir "${currentName}" e avançar no ciclo de estudos?`
          : "Deseja concluir a matéria atual e avançar no ciclo de estudos?",
        confirmLabel: "Avançar",
        cancelLabel: "Cancelar",
        confirmVariant: "signal" as const,
      };
    }
    if (confirmAction === "reset") {
      return {
        title: "Reiniciar bloco de estudos?",
        message:
          "Os cronômetros e o progresso das matérias deste bloco voltarão ao início. Deseja recomeçar?",
        confirmLabel: "Reiniciar bloco",
        cancelLabel: "Cancelar",
        confirmVariant: "warn" as const,
      };
    }
    if (confirmAction === "finish") {
      return {
        title: "Encerrar sessão de estudos?",
        message:
          "A sessão de estudos em andamento será interrompida e o bloco atual será encerrado. Deseja realmente finalizar?",
        confirmLabel: "Encerrar sessão",
        cancelLabel: "Cancelar",
        confirmVariant: "danger" as const,
      };
    }
    return {
      title: "",
      message: "",
      confirmLabel: "Confirmar",
      cancelLabel: "Cancelar",
      confirmVariant: "warn" as const,
    };
  }, [confirmAction, currentLive?.name]);

  if (
    flow.phase !== "idle" &&
    flow.phase !== "running" &&
    flow.phase !== "paused"
  ) {
    return null;
  }

  if (flow.phase === "idle") {
    if (exclusiveSoloToday) return null;
    return (
      <div className="border-b border-[var(--line)] px-4 py-3 md:px-5">
        <button
          type="button"
          disabled={!flow.canStart}
          onClick={flow.startSession}
          className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-btn)] bg-[var(--signal)] px-3.5 py-2.5 text-left text-white shadow-[var(--shadow-sm)] transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 md:px-4 md:py-3"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight md:text-[15px]">
              Iniciar sessão
            </span>
            <span className="mt-0.5 block truncate text-xs text-white/80">
              {flow.canStart
                ? flow.previewSummary
                : "Nenhuma matéria com tempo na fila"}
            </span>
          </span>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 md:size-10">
            <Play
              size={16}
              fill="currentColor"
              strokeWidth={0}
              className="translate-x-px"
            />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--line)] px-4 py-2.5 md:px-5">
      <div
        className={`synaptic-flow flex items-center gap-1.5 rounded-[var(--radius-tag)] border border-[color-mix(in_srgb,var(--signal)_28%,var(--line))] px-2 py-1.5 sm:gap-2 ${
          flow.phase === "paused" ? "is-paused" : ""
        } ${bursting ? "is-bursting" : ""}`}
      >
        <SynapticNetwork
          isRunning={flow.phase === "running"}
          isBursting={bursting}
        />
        <button
          type="button"
          onClick={
            flow.phase === "running" ? flow.pauseSession : flow.resumeSession
          }
          className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--signal)] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]"
          title={flow.phase === "running" ? "Pausar sessão" : "Retomar sessão"}
          aria-label={
            flow.phase === "running" ? "Pausar sessão" : "Retomar sessão"
          }
        >
          {flow.phase === "running" ? (
            <Pause size={14} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play
              size={14}
              fill="currentColor"
              strokeWidth={0}
              className="translate-x-px"
            />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[var(--signal)]">
            {flow.phase === "paused" ? "Sessão pausada" : "Em sessão"}
          </p>
          <p className="truncate text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
            {flow.blockSummary}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => requestAction("skip")}
            className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] hover:text-[var(--signal)] active:scale-95 cursor-pointer"
            title="Concluir matéria atual e avançar"
            aria-label="Concluir matéria atual e avançar"
          >
            <SkipForward size={16} strokeWidth={2} />
          </button>
          <span
            className="h-3.5 w-px bg-[color-mix(in_srgb,var(--line)_80%,transparent)] mx-0.5"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => requestAction("reset")}
            className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] hover:text-[var(--warn)] active:scale-95 cursor-pointer"
            title="Resetar sessão (recomeça o bloco)"
            aria-label="Resetar sessão e recomeçar o bloco"
          >
            <RotateCcw size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => requestAction("finish")}
            className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 active:scale-95 cursor-pointer"
            title="Finalizar estudos"
            aria-label="Finalizar estudos"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmProps.title}
        message={confirmProps.message}
        confirmLabel={confirmProps.confirmLabel}
        cancelLabel={confirmProps.cancelLabel}
        confirmVariant={confirmProps.confirmVariant}
        onConfirm={handleExecuteConfirm}
        onCancel={handleCancelConfirm}
      />
    </div>
  );
}

/** Diálogos pós-bloco / descanso (globais). */
export function StudySessionChrome() {
  const flow = useStudyFlow();
  const { data, upsertSubject } = useApp();
  const [notesDraft, setNotesDraft] = useState("");

  const notesSubject = useMemo(() => {
    if (flow.block.length === 0) return null;
    const fromBlock =
      flow.phase === "subject_notes"
        ? flow.block[flow.currentIndex]
        : flow.phase === "block_done"
          ? flow.block[flow.block.length - 1]
          : null;
    if (!fromBlock) return null;
    return (
      (data.subjects ?? []).find((s) => s.id === fromBlock.id) ?? fromBlock
    );
  }, [flow.phase, flow.block, flow.currentIndex, data.subjects]);

  // Matéria com rodízio: anota no item recém-estudado (o ponteiro já avançou).
  const notesRotationItem = useMemo(() => {
    if (!notesSubject) return null;
    const rot = normalizeRotation(notesSubject.rotation);
    if (!rot) return null;
    return rotationJustStudied(rot);
  }, [notesSubject]);

  useEffect(() => {
    if (
      (flow.phase !== "subject_notes" && flow.phase !== "block_done") ||
      !notesSubject
    ) {
      return;
    }
    setNotesDraft(notesRotationItem?.notes ?? notesSubject.notes ?? "");
  }, [flow.phase, notesSubject?.id]);

  function persistNotes() {
    if (!notesSubject) return;
    const rot = normalizeRotation(notesSubject.rotation);
    if (rot && notesRotationItem) {
      upsertSubject({
        ...notesSubject,
        rotation: rotationWithItemNotes(rot, notesRotationItem.id, notesDraft),
      });
      return;
    }
    upsertSubject({ ...notesSubject, notes: notesDraft });
  }

  function handleRecursosChange(recursos: SubjectResource[]) {
    if (!notesSubject) return;
    const rot = normalizeRotation(notesSubject.rotation);
    if (rot && notesRotationItem) {
      upsertSubject({
        ...notesSubject,
        rotation: rotationWithItemRecursos(rot, notesRotationItem.id, recursos),
      });
      return;
    }
    upsertSubject({ ...notesSubject, recursos });
  }

  function afterNotesThen(action: () => void) {
    persistNotes();
    action();
  }

  return (
    <>
      <DialogFrame
        open={flow.phase === "subject_notes"}
        onClose={() => afterNotesThen(flow.continueToNextSubject)}
        labelledBy="subject-notes-title"
        cardClassName="surface w-full max-w-md p-6 shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-start gap-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 ring-1 ring-emerald-500/25 shadow-2xs">
            <CheckCircle2 size={22} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <h2
                id="subject-notes-title"
                className="font-display text-xl font-bold tracking-tight text-[var(--ink)]"
              >
                Matéria concluída
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20">
                Feito ✓
              </span>
            </div>
            <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
              Anote onde parou antes da próxima. <strong className="font-medium text-[var(--ink)]">O tempo está pausado</strong> — respire à vontade.
            </p>
          </div>
        </div>

        {flow.cycleRoundCompleted != null && (
          <div className="mt-3.5 flex items-start gap-3 rounded-[var(--radius-tag)] border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 dark:border-emerald-500/30 p-3.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <Sparkles size={16} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200 leading-snug">
                {flow.cycleRoundCompleted}ª volta do ciclo concluída!
              </p>
              <p className="mt-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                Continue assim — vamos entrar na próxima rodada do ciclo!
              </p>
            </div>
          </div>
        )}

        {notesSubject ? (
          <NotesBlock
            subject={notesSubject}
            rotationItem={notesRotationItem}
            draft={notesDraft}
            onChange={setNotesDraft}
            onChangeRecursos={handleRecursosChange}
          />
        ) : null}

        <ExtraTimePrompt
          subjectName={notesSubject?.name}
          onExtend={(mins) => {
            persistNotes();
            flow.extendCurrentSubject(mins);
          }}
        />

        <button
          type="button"
          className="btn btn-primary mt-5 w-full py-3 text-sm font-semibold tracking-wide flex items-center justify-center gap-2 group cursor-pointer"
          onClick={() => afterNotesThen(flow.continueToNextSubject)}
        >
          <span>Continuar para a próxima</span>
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>
      </DialogFrame>

      <DialogFrame
        open={flow.phase === "block_done"}
        onClose={() => afterNotesThen(flow.chooseFinish)}
        labelledBy="block-done-title"
        cardClassName="surface w-full max-w-md p-6 shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-start gap-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--signal-soft)] text-[var(--signal)] ring-1 ring-[var(--signal)]/25 shadow-2xs">
            <Sparkles size={22} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="block-done-title" className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
              Bloco concluído
            </h2>
            <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
              {flow.blockSummary}. Excelente rendimento! O que deseja fazer agora?
            </p>
          </div>
        </div>

        {flow.cycleRoundCompleted != null && (
          <div className="mt-3.5 flex items-start gap-3 rounded-[var(--radius-tag)] border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 dark:border-emerald-500/30 p-3.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <Sparkles size={16} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200 leading-snug">
                {flow.cycleRoundCompleted}ª volta do ciclo concluída!
              </p>
              <p className="mt-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                Excelente rendimento no bloco. Hora de fazer uma pausa ou seguir no ritmo!
              </p>
            </div>
          </div>
        )}

        {notesSubject ? (
          <NotesBlock
            subject={notesSubject}
            rotationItem={notesRotationItem}
            draft={notesDraft}
            onChange={setNotesDraft}
            onChangeRecursos={handleRecursosChange}
          />
        ) : null}

        <ExtraTimePrompt
          subjectName={notesSubject?.name}
          onExtend={(mins) => {
            persistNotes();
            flow.extendCurrentSubject(mins);
          }}
        />

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            className="btn btn-primary py-3 text-sm font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer"
            onClick={() => afterNotesThen(flow.chooseRest)}
          >
            <span>Descansar ({flow.settings.restMinutes} min)</span>
          </button>
          <button
            type="button"
            className="btn py-2.5 text-sm font-medium hover:border-[var(--signal)] hover:text-[var(--signal)] cursor-pointer"
            onClick={() => afterNotesThen(flow.chooseContinue)}
          >
            Continuar estudando
          </button>
          <button
            type="button"
            className="btn border-transparent bg-transparent py-2 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
            onClick={() => afterNotesThen(flow.chooseFinish)}
          >
            Finalizar estudos
          </button>
        </div>
      </DialogFrame>

      <DialogFrame
        open={flow.phase === "resting" || flow.phase === "rest_done"}
        onClose={
          flow.phase === "rest_done" ? flow.dismissRestDone : flow.endRestEarly
        }
        labelledBy="rest-title"
        cardClassName="surface w-full max-w-sm p-6 shadow-[var(--shadow-lg)]"
      >
        {flow.phase === "resting" ? (
          <>
            <h2 id="rest-title" className="font-display text-xl font-semibold">
              Descanso
            </h2>
            <p className="mt-4 font-mono-num text-center text-4xl tracking-tight text-[var(--signal)]">
              {formatClock(flow.restSecondsLeft)}
            </p>
            <button
              type="button"
              className="btn mt-6 w-full"
              onClick={flow.endRestEarly}
            >
              Voltar aos estudos
            </button>
          </>
        ) : (
          <>
            <h2 id="rest-title" className="font-display text-xl font-semibold">
              Descanso encerrado
            </h2>
            <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
              Já pode retornar aos estudos.
            </p>
            <button
              type="button"
              className="btn mt-6 w-full bg-[var(--signal)] text-white"
              onClick={flow.dismissRestDone}
            >
              Ok
            </button>
          </>
        )}
      </DialogFrame>
    </>
  );
}
