"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RotateCw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[FocoHub AppError]:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--warn,#f59e0b)_12%,var(--surface))] text-[var(--warn,#f59e0b)] shadow-sm">
        <AlertTriangle size={28} />
      </div>

      <h2 className="font-display text-lg font-bold text-[var(--ink)] sm:text-xl">
        Ops, algo deu errado nesta tela
      </h2>

      <p className="mt-2 text-xs leading-relaxed text-[color-mix(in_srgb,var(--ink)_65%,transparent)] sm:text-sm">
        Pode ter ocorrido uma oscilação momentânea de conexão ou uma nova atualização do sistema foi publicada.
      </p>

      {error?.message && (
        <div className="mt-3 max-h-24 w-full overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--mist)]/50 p-2 text-left text-[11px] font-mono text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
          {error.message}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 cursor-pointer"
        >
          <RotateCw size={14} />
          Tentar novamente
        </button>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--mist)] active:scale-95 cursor-pointer"
        >
          Recarregar página
        </button>

        <button
          type="button"
          onClick={() => (window.location.href = "/hoje")}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] text-xs font-medium text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--signal)] px-3 py-2 cursor-pointer"
        >
          <Home size={14} />
          Início
        </button>
      </div>
    </div>
  );
}
