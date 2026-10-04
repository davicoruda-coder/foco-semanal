"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[FocoHub GlobalError]:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[var(--surface,#ffffff)] text-[var(--ink,#111827)] flex items-center justify-center p-6 antialiased">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h2 className="text-xl font-bold tracking-tight">
            Ops, ocorreu um erro inesperado
          </h2>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Houve uma falha ao carregar a página. Isso pode acontecer devido a uma oscilação na rede móvel ou porque uma nova versão do app foi publicada.
          </p>

          {error?.message && (
            <div className="mt-3 max-h-24 w-full overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-2 text-left font-mono text-xs text-gray-600 dark:text-gray-300">
              {error.message}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-xl bg-[#6d5ef8] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 cursor-pointer"
            >
              Tentar novamente
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              className="rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-xs font-semibold text-inherit transition hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 cursor-pointer"
            >
              Recarregar aplicativo
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="rounded-xl px-3 py-2 text-xs font-medium text-gray-500 hover:text-[#6d5ef8] cursor-pointer"
            >
              Início
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
