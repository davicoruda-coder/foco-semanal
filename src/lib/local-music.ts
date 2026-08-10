import { DAYS, type MusicDayMap } from "@/lib/types";

const DB_NAME = "foco_semanal_music_v1";
const STORE = "handles";
const HANDLE_KEY = "local_folder";

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|wav|flac|webm)$/i;

export type LocalAudioFile = {
  name: string;
  file: File;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    const handle = await new Promise<FileSystemDirectoryHandle | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(HANDLE_KEY);
        req.onsuccess = () =>
          resolve((req.result as FileSystemDirectoryHandle) ?? null);
        req.onerror = () => reject(req.error);
      },
    );
    db.close();
    return handle;
  } catch {
    return null;
  }
}

export async function clearDirectoryHandle(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function ensureDirectoryPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const opts = { mode: "read" as const };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyHandle = handle as any;
  if ((await anyHandle.queryPermission?.(opts)) === "granted") return true;
  if ((await anyHandle.requestPermission?.(opts)) === "granted") return true;
  return false;
}

export async function pickLocalFolder(): Promise<{
  handle: FileSystemDirectoryHandle;
  files: LocalAudioFile[];
} | null> {
  if (!("showDirectoryPicker" in window)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = (await (window as any).showDirectoryPicker({
    id: "foco-music",
    mode: "read",
  })) as FileSystemDirectoryHandle;
  const files = await listAudioFromDirectory(handle);
  await saveDirectoryHandle(handle);
  return { handle, files };
}

export async function listAudioFromDirectory(
  handle: FileSystemDirectoryHandle,
): Promise<LocalAudioFile[]> {
  const files: LocalAudioFile[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const entry of (handle as any).values()) {
    if (entry.kind !== "file") continue;
    if (!AUDIO_EXT.test(entry.name)) continue;
    const file = await (entry as FileSystemFileHandle).getFile();
    files.push({ name: entry.name, file });
  }
  files.sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { numeric: true }),
  );
  return files;
}

export function filesFromFileList(list: FileList | File[]): LocalAudioFile[] {
  const files = Array.from(list)
    .filter((f) => AUDIO_EXT.test(f.name))
    .map((f) => ({ name: f.name, file: f }));
  files.sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { numeric: true }),
  );
  return files;
}

/** Mapeia até 7 áudios para Seg–Dom (por ordem ou nome do dia). */
export function mapFilesToDays(files: LocalAudioFile[]): MusicDayMap[] {
  const byDay = new Map<number, LocalAudioFile>();

  for (const f of files) {
    const lower = f.name.toLowerCase();
    for (let d = 0; d < DAYS.length; d++) {
      const dayName = DAYS[d].toLowerCase();
      if (lower.includes(dayName) || lower.includes(dayName.slice(0, 3))) {
        if (!byDay.has(d)) byDay.set(d, f);
      }
    }
  }

  if (byDay.size === 0) {
    return DAYS.map((_, day) => {
      const f = files[day];
      return {
        day,
        file_id: f?.name ?? `empty-${day}`,
        file_name: f?.name ?? "",
      };
    }).filter((m) => m.file_name);
  }

  return DAYS.map((_, day) => {
    const f = byDay.get(day) ?? files[day];
    if (!f) return null;
    return { day, file_id: f.name, file_name: f.name };
  }).filter(Boolean) as MusicDayMap[];
}
