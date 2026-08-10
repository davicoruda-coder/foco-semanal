"use client";

import Link from "next/link";
import {
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
} from "lucide-react";
import { useMusicPlayer } from "@/components/MusicPlayerProvider";
import { useApp } from "@/components/AppProvider";

export function HomeMusicCard() {
  const { data } = useApp();
  const {
    playing,
    trackName,
    sourceLabel,
    canPlay,
    needsFolderPermission,
    error,
    toggle,
    restoreLocalFolder,
    playNext,
    playPrev,
    localFileCount,
  } = useMusicPlayer();

  const off = data.music_settings.source === "none";

  if (off) {
    return (
      <div className="surface flex items-center gap-3 px-4 py-3 md:px-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--signal-soft)] text-[var(--signal)]">
          <Music size={18} strokeWidth={1.75} />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">Música</p>
        <Link
          href="/musica"
          title="Gerenciar música"
          aria-label="Gerenciar música"
          className="shrink-0 rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)]"
        >
          <SlidersHorizontal size={16} strokeWidth={1.75} />
        </Link>
      </div>
    );
  }

  const showSkip = canPlay && localFileCount > 1;

  return (
    <div className="surface flex items-center gap-2 px-3 py-3 sm:gap-3 md:px-5">
      {showSkip && (
        <button
          type="button"
          onClick={playPrev}
          title="Anterior"
          aria-label="Música anterior"
          className="shrink-0 rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
        >
          <SkipBack size={16} strokeWidth={1.75} />
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          if (needsFolderPermission) {
            void restoreLocalFolder();
            return;
          }
          void toggle();
        }}
        disabled={!canPlay && !needsFolderPermission}
        title={
          needsFolderPermission ? "Permitir pasta" : playing ? "Pausar" : "Tocar"
        }
        aria-label={
          needsFolderPermission
            ? "Permitir acesso à pasta"
            : playing
              ? "Pausar música"
              : "Tocar música"
        }
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-40"
        style={{
          background:
            "linear-gradient(135deg, var(--signal), color-mix(in srgb, var(--signal) 55%, var(--accent-2)))",
        }}
      >
        {playing ? (
          <Pause size={18} fill="currentColor" strokeWidth={0} />
        ) : (
          <Play
            size={18}
            fill="currentColor"
            strokeWidth={0}
            className="translate-x-px"
          />
        )}
      </button>

      {showSkip && (
        <button
          type="button"
          onClick={playNext}
          title="Próxima"
          aria-label="Próxima música"
          className="shrink-0 rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
        >
          <SkipForward size={16} strokeWidth={1.75} />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {trackName
            ? trackName.replace(/\.[^.]+$/, "")
            : "Nenhuma faixa para hoje"}
        </p>
        {needsFolderPermission ? (
          <button
            type="button"
            className="text-xs font-medium text-[var(--signal)]"
            onClick={() => void restoreLocalFolder()}
          >
            Permitir acesso à pasta
          </button>
        ) : error ? (
          <p className="truncate text-xs text-[var(--warn)]">{error}</p>
        ) : (
          <p className="truncate text-xs opacity-55">{sourceLabel}</p>
        )}
      </div>

      <Link
        href="/musica"
        title="Gerenciar música"
        aria-label="Gerenciar música"
        className="shrink-0 rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)]"
      >
        <SlidersHorizontal size={16} strokeWidth={1.75} />
      </Link>
    </div>
  );
}
