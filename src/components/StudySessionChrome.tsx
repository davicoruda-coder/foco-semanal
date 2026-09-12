"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { DialogFrame } from "@/components/DialogFrame";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";
import { useApp } from "@/components/AppProvider";
import { useStudyFlow } from "@/components/StudyFlowProvider";
import type { Subject } from "@/lib/types";

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function NotesBlock({
  subject,
  draft,
  onChange,
}: {
  subject: Subject;
  draft: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-5 rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--mist)]/60 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
        Anotações
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
        {subject.name}
      </p>
      <p className="mt-0.5 text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
        Edite se quiser — grava ao continuar. Não conta no tempo de estudo.
      </p>
      <AutoGrowTextarea
        className="mt-2.5 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-snug text-[var(--ink)] focus:border-[var(--signal)]"
        value={draft}
        onChange={onChange}
        placeholder="Ex.: vídeo 12, próximo passo…"
        minPx={72}
        maxPx={140}
      />
    </div>
  );
}

/** CTA / status da sessão — fica dentro do card Ciclo de Estudos. */
export function StudySessionBar() {
  const flow = useStudyFlow();

  if (
    flow.phase !== "idle" &&
    flow.phase !== "running" &&
    flow.phase !== "paused"
  ) {
    return null;
  }

  if (flow.phase === "idle") {
    return (
      <div className="border-b border-[var(--line)] px-4 py-2.5 md:px-5">
        <button
          type="button"
          disabled={!flow.canStart}
          onClick={flow.startSession}
          className="flex w-full items-center justify-between gap-2.5 rounded-[var(--radius-tag)] bg-[var(--signal)] px-3 py-2 text-left text-white transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold tracking-tight">
              Iniciar sessão
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-white/75">
              {flow.canStart
                ? flow.previewSummary
                : "Nenhuma matéria com tempo na fila"}
            </span>
          </span>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20">
            <Play
              size={14}
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
        }`}
      >
        <button
          type="button"
          onClick={
            flow.phase === "running" ? flow.pauseSession : flow.resumeSession
          }
          className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--signal)] text-white"
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
        <button
          type="button"
          onClick={flow.resetSession}
          className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]"
          title="Resetar sessão (recomeça o bloco)"
          aria-label="Resetar sessão e recomeçar o bloco"
        >
          <RotateCcw size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={flow.chooseFinish}
          className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]"
          title="Finalizar estudos"
          aria-label="Finalizar estudos"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
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

  useEffect(() => {
    if (
      (flow.phase !== "subject_notes" && flow.phase !== "block_done") ||
      !notesSubject
    ) {
      return;
    }
    setNotesDraft(notesSubject.notes ?? "");
  }, [flow.phase, notesSubject?.id]);

  function persistNotes() {
    if (!notesSubject) return;
    upsertSubject({ ...notesSubject, notes: notesDraft });
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
        <h2
          id="subject-notes-title"
          className="font-display text-xl font-semibold"
        >
          Matéria concluída
        </h2>
        <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
          Anote onde parou antes da próxima. O tempo fica pausado.
        </p>
        {notesSubject ? (
          <NotesBlock
            subject={notesSubject}
            draft={notesDraft}
            onChange={setNotesDraft}
          />
        ) : null}
        <button
          type="button"
          className="btn mt-5 w-full bg-[var(--signal)] text-white"
          onClick={() => afterNotesThen(flow.continueToNextSubject)}
        >
          Continuar para a próxima
        </button>
      </DialogFrame>

      <DialogFrame
        open={flow.phase === "block_done"}
        onClose={() => afterNotesThen(flow.chooseFinish)}
        labelledBy="block-done-title"
        cardClassName="surface w-full max-w-md p-6 shadow-[var(--shadow-lg)]"
      >
        <h2 id="block-done-title" className="font-display text-xl font-semibold">
          Bloco concluído
        </h2>
        <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
          {flow.blockSummary}. O que deseja fazer?
        </p>

        {notesSubject ? (
          <NotesBlock
            subject={notesSubject}
            draft={notesDraft}
            onChange={setNotesDraft}
          />
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="btn bg-[var(--signal)] text-white"
            onClick={() => afterNotesThen(flow.chooseRest)}
          >
            Descansar ({flow.settings.restMinutes} min)
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => afterNotesThen(flow.chooseContinue)}
          >
            Continuar estudando
          </button>
          <button
            type="button"
            className="btn border-transparent bg-transparent text-[color-mix(in_srgb,var(--ink)_60%,transparent)]"
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
