"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "@/components/AppProvider";
import {
  clearDirectoryHandle,
  ensureDirectoryPermission,
  filesFromFileList,
  listAudioFromDirectory,
  loadDirectoryHandle,
  mapFilesToDays,
  pickLocalFolder,
  type LocalAudioFile,
} from "@/lib/local-music";
import { todayIndex } from "@/lib/utils";

type MusicPlayerContextValue = {
  ready: boolean;
  playing: boolean;
  trackName: string | null;
  sourceLabel: string;
  canPlay: boolean;
  needsFolderPermission: boolean;
  localSupported: boolean;
  error: string | null;
  toggle: () => void;
  pause: () => void;
  playNext: () => void;
  playPrev: () => void;
  pickFolder: () => Promise<boolean>;
  loadFilesFromInput: (files: FileList | File[]) => void;
  restoreLocalFolder: () => Promise<boolean>;
  clearLocalFolder: () => Promise<void>;
  localFileCount: number;
};

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

const LAST_KEY = "foco_semanal_music_last_v1";

type LastPlayed = { name: string; pos: number };

function readLastPlayed(): LastPlayed | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as LastPlayed) : null;
  } catch {
    return null;
  }
}

function writeLastPlayed(value: LastPlayed) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const { data, updateMusic, setData } = useApp();
  const music = data.music_settings;
  const day = todayIndex();
  const dayTrack = data.music_day_map.find((m) => m.day === day);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const filesRef = useRef<LocalAudioFile[]>([]);
  const currentTrackRef = useRef<string | null>(null);
  const lastPlayedRef = useRef<LastPlayed | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [localFiles, setLocalFiles] = useState<LocalAudioFile[]>([]);
  const [needsFolderPermission, setNeedsFolderPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSupported, setLocalSupported] = useState(false);
  const [lastPlayedName, setLastPlayedName] = useState<string | null>(null);

  useEffect(() => {
    setLocalSupported(
      typeof window !== "undefined" && "showDirectoryPicker" in window,
    );
    const saved = readLastPlayed();
    lastPlayedRef.current = saved;
    setLastPlayedName(saved?.name ?? null);

    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const persist = (pos: number) => {
      const name = currentTrackRef.current;
      if (!name) return;
      const value = { name, pos };
      lastPlayedRef.current = value;
      writeLastPlayed(value);
    };

    let lastSaveAt = 0;
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      persist(audio.currentTime);
    };
    const onEnded = () => {
      setPlaying(false);
      persist(0);
    };
    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastSaveAt < 3000) return;
      lastSaveAt = now;
      persist(audio.currentTime);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    setReady(true);
    return () => {
      persist(audio.currentTime);
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      audioRef.current = null;
    };
  }, []);

  const applyLocalFiles = useCallback(
    (files: LocalAudioFile[], folderName: string | null) => {
      filesRef.current = files;
      setLocalFiles(files);
      const map = mapFilesToDays(files);
      updateMusic({
        source: "local",
        local_folder_name: folderName,
      });
      setData((prev) => ({ ...prev, music_day_map: map }));
      setNeedsFolderPermission(false);
      setError(null);
    },
    [setData, updateMusic],
  );

  const restoreLocalFolder = useCallback(async () => {
    const handle = await loadDirectoryHandle();
    if (!handle) return false;
    const ok = await ensureDirectoryPermission(handle);
    if (!ok) {
      setNeedsFolderPermission(true);
      return false;
    }
    try {
      const files = await listAudioFromDirectory(handle);
      filesRef.current = files;
      setLocalFiles(files);
      setNeedsFolderPermission(false);
      if (!music.local_folder_name) {
        updateMusic({ local_folder_name: handle.name, source: "local" });
      }
      if (!data.music_day_map.length && files.length) {
        setData((prev) => ({
          ...prev,
          music_day_map: mapFilesToDays(files),
        }));
      }
      return true;
    } catch {
      setError("Não foi possível ler a pasta local.");
      return false;
    }
  }, [
    data.music_day_map.length,
    music.local_folder_name,
    setData,
    updateMusic,
  ]);

  useEffect(() => {
    if (!ready) return;
    if (music.source === "local") {
      void restoreLocalFolder();
    }
  }, [ready, music.source]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickFolder = useCallback(async () => {
    try {
      const result = await pickLocalFolder();
      if (!result) {
        setError(
          "Este navegador não permite escolher pasta. Use Chrome/Edge no PC, ou Google Drive no celular.",
        );
        return false;
      }
      applyLocalFiles(result.files, result.handle.name);
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return false;
      setError("Não foi possível abrir a pasta.");
      return false;
    }
  }, [applyLocalFiles]);

  const loadFilesFromInput = useCallback(
    (list: FileList | File[]) => {
      const files = filesFromFileList(list);
      if (!files.length) {
        setError("Nenhum áudio encontrado (mp3, m4a, wav…).");
        return;
      }
      applyLocalFiles(files, "Arquivos selecionados");
    },
    [applyLocalFiles],
  );

  const clearLocalFolder = useCallback(async () => {
    audioRef.current?.pause();
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    currentTrackRef.current = null;
    filesRef.current = [];
    setLocalFiles([]);
    await clearDirectoryHandle();
    updateMusic({
      source: music.source === "local" ? "none" : music.source,
      local_folder_name: null,
    });
    if (music.source === "local") {
      setData((prev) => ({ ...prev, music_day_map: [] }));
    }
  }, [music.source, setData, updateMusic]);

  /** Prioridade: última tocada → faixa do dia → primeiro arquivo. */
  const resolvedLocal = useMemo((): LocalAudioFile | null => {
    if (music.source !== "local" || !localFiles.length) return null;
    if (lastPlayedName) {
      const last = localFiles.find((f) => f.name === lastPlayedName);
      if (last) return last;
    }
    if (dayTrack?.file_name) {
      const dayFile = localFiles.find((f) => f.name === dayTrack.file_name);
      if (dayFile) return dayFile;
    }
    return localFiles[0];
  }, [music.source, localFiles, lastPlayedName, dayTrack?.file_name]);

  const trackName = useMemo(() => {
    if (music.source === "local") {
      return resolvedLocal?.name ?? music.local_folder_name;
    }
    if (music.source === "drive") {
      return dayTrack?.file_name ?? music.drive_folder_name;
    }
    return null;
  }, [music, dayTrack, resolvedLocal]);

  const sourceLabel = useMemo(() => {
    if (music.source === "local") return "Pasta local";
    if (music.source === "drive") return "Google Drive";
    return "Desligado";
  }, [music.source]);

  const canPlay = useMemo(() => {
    if (music.source === "local") {
      return Boolean(resolvedLocal) && !needsFolderPermission;
    }
    if (music.source === "drive") {
      // Streaming real depende do OAuth; no demo ainda não toca arquivo
      return false;
    }
    return false;
  }, [music.source, resolvedLocal, needsFolderPermission]);

  const ensureAudioSrc = useCallback(
    async (fileOverride?: LocalAudioFile | null): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio) return false;

      if (music.source === "local") {
        const file = fileOverride ?? resolvedLocal;
        if (!file) {
          setError("Nenhuma faixa mapeada. Abra Gerenciar.");
          return false;
        }

        // Mesma faixa já carregada → só retomar de onde está
        if (
          !fileOverride &&
          currentTrackRef.current === file.name &&
          audio.src
        ) {
          setError(null);
          return true;
        }

        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const url = URL.createObjectURL(file.file);
        objectUrlRef.current = url;
        audio.src = url;
        currentTrackRef.current = file.name;

        const saved = lastPlayedRef.current;
        const shouldResume =
          !fileOverride &&
          saved &&
          saved.name === file.name &&
          saved.pos > 1;
        if (shouldResume && saved) {
          const seek = () => {
            try {
              audio.currentTime = saved.pos;
            } catch {
              /* ignore */
            }
          };
          if (audio.readyState >= 1) seek();
          else audio.addEventListener("loadedmetadata", seek, { once: true });
        } else {
          audio.currentTime = 0;
        }

        setLastPlayedName(file.name);
        lastPlayedRef.current = {
          name: file.name,
          pos: shouldResume && saved ? saved.pos : 0,
        };
        writeLastPlayed(lastPlayedRef.current);
        setError(null);
        return true;
      }

      if (music.source === "drive") {
        setError(
          "Drive no modo local só mapeia nomes. Toque real com Google conectado.",
        );
        return false;
      }

      setError("Escolha uma fonte em Gerenciar.");
      return false;
    },
    [music.source, resolvedLocal],
  );

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    const ok = await ensureAudioSrc();
    if (!ok) return;
    try {
      await audio.play();
      setError(null);
    } catch {
      setError("Não foi possível tocar. Interaja de novo ou escolha outra faixa.");
    }
  }, [ensureAudioSrc]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const skipBy = useCallback(
    async (delta: number) => {
      if (music.source !== "local" || !localFiles.length) return;
      const currentName = currentTrackRef.current ?? resolvedLocal?.name;
      const idx = Math.max(
        0,
        localFiles.findIndex((f) => f.name === currentName),
      );
      const next =
        localFiles[(idx + delta + localFiles.length) % localFiles.length];
      if (!next) return;
      const ok = await ensureAudioSrc(next);
      if (!ok) return;
      try {
        await audioRef.current?.play();
      } catch {
        setError("Não foi possível tocar esta faixa.");
      }
    },
    [music.source, localFiles, resolvedLocal, ensureAudioSrc],
  );

  const playNext = useCallback(() => {
    void skipBy(1);
  }, [skipBy]);

  const playPrev = useCallback(() => {
    void skipBy(-1);
  }, [skipBy]);

  const value = useMemo(
    () => ({
      ready,
      playing,
      trackName,
      sourceLabel,
      canPlay,
      needsFolderPermission,
      localSupported,
      error,
      toggle,
      pause,
      playNext,
      playPrev,
      pickFolder,
      loadFilesFromInput,
      restoreLocalFolder,
      clearLocalFolder,
      localFileCount: localFiles.length || filesRef.current.length,
    }),
    [
      ready,
      playing,
      trackName,
      sourceLabel,
      canPlay,
      needsFolderPermission,
      localSupported,
      error,
      toggle,
      pause,
      playNext,
      playPrev,
      pickFolder,
      loadFilesFromInput,
      restoreLocalFolder,
      clearLocalFolder,
      localFiles.length,
    ],
  );

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error("useMusicPlayer deve estar dentro de MusicPlayerProvider");
  }
  return ctx;
}
