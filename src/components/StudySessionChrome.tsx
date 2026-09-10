"use client";

import { Pause, Play, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { DialogFrame } from "@/components/DialogFrame";
import { useStudyFlow } from "@/components/StudyFlowProvider";

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function StudySessionChrome() {
  const pathname = usePathname();
  const flow = useStudyFlow();
  const onHoje = pathname === "/hoje" || pathname.startsWith("/hoje/");

  const showBar =
    onHoje &&
    (flow.phase === "idle" ||
      flow.phase === "running" ||
      flow.phase === "paused");

  return (
    <>
      {showBar && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom)+0.5rem)] z-40 px-3 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[min(100%,22rem)] lg:px-0">
          <div className="pointer-events-auto mx-auto max-w-lg lg:mx-0">
            {flow.phase === "idle" ? (
              <button
                type="button"
                disabled={!flow.canStart}
                onClick={flow.startSession}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--signal)] px-4 py-3.5 text-left text-white shadow-[var(--shadow-md)] transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold tracking-tight">
                    Iniciar sessão
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-white/85">
                    {flow.canStart
                      ? flow.previewSummary
                      : "Nenhuma matéria com tempo na fila"}
                  </span>
                </span>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/20">
                  <Play
                    size={18}
                    fill="currentColor"
                    strokeWidth={0}
                    className="translate-x-px"
                  />
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 px-3 py-2.5 shadow-[var(--shadow-md)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={
                    flow.phase === "running"
                      ? flow.pauseSession
                      : flow.resumeSession
                  }
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--signal)] text-white"
                  title={
                    flow.phase === "running" ? "Pausar sessão" : "Retomar sessão"
                  }
                  aria-label={
                    flow.phase === "running" ? "Pausar sessão" : "Retomar sessão"
                  }
                >
                  {flow.phase === "running" ? (
                    <Pause size={16} fill="currentColor" strokeWidth={0} />
                  ) : (
                    <Play
                      size={16}
                      fill="currentColor"
                      strokeWidth={0}
                      className="translate-x-px"
                    />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {flow.phase === "paused" ? "Sessão pausada" : "Em sessão"}
                  </p>
                  <p className="truncate text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                    {flow.blockSummary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={flow.chooseFinish}
                  className="rounded-full p-2 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                  title="Finalizar estudos"
                  aria-label="Finalizar estudos"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <DialogFrame
        open={flow.phase === "block_done"}
        onClose={flow.chooseFinish}
        labelledBy="block-done-title"
        cardClassName="surface w-full max-w-sm p-6 shadow-[var(--shadow-lg)]"
      >
        <h2 id="block-done-title" className="font-display text-xl font-semibold">
          Bloco concluído
        </h2>
        <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
          {flow.blockSummary}. O que deseja fazer?
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            className="btn bg-[var(--signal)] text-white"
            onClick={flow.chooseRest}
          >
            Descansar ({flow.settings.restMinutes} min)
          </button>
          <button type="button" className="btn" onClick={flow.chooseContinue}>
            Continuar estudando
          </button>
          <button
            type="button"
            className="btn border-transparent bg-transparent text-[color-mix(in_srgb,var(--ink)_60%,transparent)]"
            onClick={flow.chooseFinish}
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
            <p className="mt-2 text-center text-sm text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
              Não conta nas estatísticas
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
