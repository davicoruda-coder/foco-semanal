"use client";

import { useRef } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { useMusicPlayer } from "@/components/MusicPlayerProvider";
import { DAYS, type MusicSource } from "@/lib/types";
import { newId } from "@/lib/demo-store";
import { supportsDirectoryPicker } from "@/lib/utils";

export default function MusicaPage() {
  const { data, updateMusic, setData, supabaseReady } = useApp();
  const music = data.music_settings;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    pickFolder,
    loadFilesFromInput,
    clearLocalFolder,
    localSupported,
    localFileCount,
    needsFolderPermission,
    restoreLocalFolder,
    error,
  } = useMusicPlayer();

  function setSource(source: MusicSource) {
    updateMusic({ source });
  }

  async function connectDrive() {
    if (!supabaseReady) {
      alert(
        "No modo local: use o mapa Seg–Dom abaixo. Com Google conectado, este botão abre o OAuth do Drive.",
      );
      return;
    }
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/musica`,
        scopes: "https://www.googleapis.com/auth/drive.readonly",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  function autoMapDriveDemo() {
    const sample = music.drive_folder_name?.trim() || "Músicas de estudo";
    updateMusic({
      source: "drive",
      drive_folder_id: "demo-folder",
      drive_folder_name: sample,
    });
    setData((prev) => ({
      ...prev,
      music_day_map: DAYS.map((name, day) => ({
        day,
        file_id: newId("file"),
        file_name: `${day + 2} - ${name}.mp3`,
      })),
    }));
  }

  const pickerOk = localSupported || supportsDirectoryPicker();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/hoje" className="text-sm text-[var(--signal)]">
          ← Hoje
        </Link>
        <h1 className="font-display mt-2 text-4xl font-semibold">Música</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["local", "Pasta local"],
            ["drive", "Google Drive"],
            ["none", "Desligado"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`btn ${music.source === value ? "btn-primary" : ""}`}
            onClick={() => setSource(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {music.source === "local" && (
        <section className="surface space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {pickerOk && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void pickFolder()}
              >
                Escolher pasta
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Escolher arquivos
            </button>
            {music.local_folder_name && (
              <button
                type="button"
                className="btn text-[var(--warn)]"
                onClick={() => void clearLocalFolder()}
              >
                Remover pasta
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) loadFilesFromInput(e.target.files);
              e.target.value = "";
            }}
          />

          {needsFolderPermission && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void restoreLocalFolder()}
            >
              Permitir acesso à pasta
            </button>
          )}

          {music.local_folder_name && (
            <p className="text-sm">
              Pasta: <strong>{music.local_folder_name}</strong>
              {localFileCount > 0 ? ` · ${localFileCount} áudios` : ""}
            </p>
          )}

          {error && <p className="text-sm text-[var(--warn)]">{error}</p>}

          <DayMapList />
        </section>
      )}

      {music.source === "drive" && (
        <section className="surface space-y-3 p-5">
          <button type="button" className="btn btn-primary" onClick={connectDrive}>
            Conectar Google Drive
          </button>
          <label className="block text-sm">
            Nome da pasta
            <input
              className="input mt-1"
              value={music.drive_folder_name ?? ""}
              onChange={(e) =>
                updateMusic({ drive_folder_name: e.target.value })
              }
              placeholder="Ex.: Musicas estudo"
            />
          </label>
          <button type="button" className="btn" onClick={autoMapDriveDemo}>
            Mapa Seg–Dom
          </button>
          <DayMapList />
        </section>
      )}
    </div>
  );
}

function DayMapList() {
  const { data } = useApp();
  const map = [...(data.music_day_map ?? [])].sort((a, b) => a.day - b.day);
  if (!map.length) {
    return (
      <p className="text-sm opacity-55">Nenhuma faixa mapeada ainda.</p>
    );
  }
  return (
    <ul className="space-y-1 text-sm opacity-80">
      {map.map((m) => (
        <li key={m.day}>
          {DAYS[m.day]}: {m.file_name || "—"}
        </li>
      ))}
    </ul>
  );
}
