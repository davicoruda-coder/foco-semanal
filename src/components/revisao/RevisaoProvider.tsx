"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  QuestaoCaderno,
  Flashcard,
  PerfilUsuario,
  QuickCapturePayload,
  CadernoFilters,
  MateriaRevisao,
} from "@/lib/revisao/types";
import type { RevisaoStats } from "@/lib/revisao/revisao-store";
import { useApp } from "@/components/AppProvider";
import { normalizeRotation } from "@/lib/utils";

const LOCAL_STORAGE_KEY_HIDDEN_MATERIAS = "foco_revisao_materias_hidden_v1";

function getHiddenMateriaNames(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_HIDDEN_MATERIAS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed)
        ? parsed.map((s: string) => String(s).toLowerCase())
        : [],
    );
  } catch {
    return new Set();
  }
}

function addHiddenMateriaName(nome: string) {
  if (typeof window === "undefined") return;
  try {
    const hidden = getHiddenMateriaNames();
    hidden.add(nome.toLowerCase());
    localStorage.setItem(
      LOCAL_STORAGE_KEY_HIDDEN_MATERIAS,
      JSON.stringify(Array.from(hidden)),
    );
  } catch {}
}

function removeHiddenMateriaName(nome: string) {
  if (typeof window === "undefined") return;
  try {
    const hidden = getHiddenMateriaNames();
    hidden.delete(nome.toLowerCase());
    localStorage.setItem(
      LOCAL_STORAGE_KEY_HIDDEN_MATERIAS,
      JSON.stringify(Array.from(hidden)),
    );
  } catch {}
}

/* ------------------------------------------------------------------ */
/*  Context shape                                                      */
/* ------------------------------------------------------------------ */

type RevisaoContextValue = {
  ready: boolean;
  perfil: PerfilUsuario | null;
  moduloAtivo: boolean;

  // Caderno
  questoes: QuestaoCaderno[];
  questoesLoading: boolean;
  addQuestao: (p: QuickCapturePayload) => Promise<boolean>;
  updateQuestao: (
    id: string,
    updates: Partial<QuickCapturePayload>,
  ) => Promise<boolean>;
  deleteQuestao: (id: string) => Promise<void>;
  reloadQuestoes: (filters?: CadernoFilters) => Promise<void>;

  // Flashcards
  flashcardsDoDia: (Flashcard & { questao?: QuestaoCaderno })[];
  flashcardsLoading: boolean;
  allFlashcards: (Flashcard & { questao?: QuestaoCaderno })[];
  responderFlashcard: (
    id: string,
    nivelAtual: 0 | 1 | 2 | 3,
    resposta: "errei" | "dificil" | "bom" | "facil",
  ) => Promise<void>;
  reloadFlashcards: () => Promise<void>;

  // Matérias
  materias: MateriaRevisao[];
  materiasLoading: boolean;
  addMateria: (nome: string) => Promise<MateriaRevisao | null>;
  deleteMateria: (id: string) => Promise<void>;
  reloadMaterias: () => Promise<void>;

  // Stats
  stats: RevisaoStats | null;
  reloadStats: () => Promise<void>;

  // Module toggle
  setModuloAtivo: (ativo: boolean) => Promise<void>;
};

const RevisaoContext = createContext<RevisaoContextValue | null>(null);

export function useRevisao() {
  const ctx = useContext(RevisaoContext);
  if (!ctx)
    throw new Error("useRevisao deve ser usado dentro de <RevisaoProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function RevisaoProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [questoes, setQuestoes] = useState<QuestaoCaderno[]>([]);
  const [questoesLoading, setQuestoesLoading] = useState(false);
  const [flashcardsDoDia, setFlashcardsDoDia] = useState<
    (Flashcard & { questao?: QuestaoCaderno })[]
  >([]);
  const [allFlashcards, setAllFlashcards] = useState<
    (Flashcard & { questao?: QuestaoCaderno })[]
  >([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [materias, setMaterias] = useState<MateriaRevisao[]>([]);
  const [materiasLoading, setMateriasLoading] = useState(false);
  const [stats, setStats] = useState<RevisaoStats | null>(null);
  const { data: appData } = useApp();
  const [hiddenNames, setHiddenNames] = useState<Set<string>>(() =>
    getHiddenMateriaNames(),
  );

  const moduloAtivo = perfil?.modulos_ativos?.revisao ?? true;

  // Combina as matérias salvas da revisão com as matérias e rodízios cadastrados no sistema
  const combinedMaterias = useMemo(() => {
    const map = new Map<string, MateriaRevisao>();

    // 1. Matérias manuais salvas em Revisão
    for (const m of materias) {
      const nome = m.nome.trim();
      const key = nome.toLowerCase();
      if (nome && !hiddenNames.has(key) && !map.has(key)) {
        map.set(key, m);
      }
    }

    // 2. Matérias e disciplinas do sistema (FocoHub)
    for (const s of appData.subjects) {
      const rot = normalizeRotation(s.rotation);
      if (rot && rot.items.length > 0) {
        for (const it of rot.items) {
          const nome = it.name.trim();
          const key = nome.toLowerCase();
          if (nome && !hiddenNames.has(key) && !map.has(key)) {
            map.set(key, {
              id: `sys-rot-${it.id}`,
              nome,
              created_at: new Date().toISOString(),
            });
          }
        }
        // Se a matéria pai com rodízio não tiver nome genérico ("revisão", "ciclo", "rodízio")
        const parentNome = s.name.trim();
        const parentKey = parentNome.toLowerCase();
        if (
          parentNome &&
          parentKey !== "revisão" &&
          parentKey !== "revisao" &&
          parentKey !== "ciclo" &&
          parentKey !== "rodízio" &&
          parentKey !== "rodizio" &&
          !hiddenNames.has(parentKey) &&
          !map.has(parentKey)
        ) {
          map.set(parentKey, {
            id: `sys-sub-${s.id}`,
            nome: parentNome,
            created_at: new Date().toISOString(),
          });
        }
      } else {
        const nome = s.name.trim();
        const key = nome.toLowerCase();
        if (nome && !hiddenNames.has(key) && !map.has(key)) {
          map.set(key, {
            id: `sys-sub-${s.id}`,
            nome,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // 3. Disciplinas de questões já registradas no caderno
    for (const q of questoes) {
      const nome = q.disciplina?.trim();
      if (nome) {
        const key = nome.toLowerCase();
        if (!hiddenNames.has(key) && !map.has(key)) {
          map.set(key, {
            id: `q-${key}`,
            nome,
            created_at: q.created_at || new Date().toISOString(),
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );
  }, [materias, appData.subjects, questoes, hiddenNames]);

  /* ---- Boot: carregar perfil ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const store = await import("@/lib/revisao/revisao-store");
        const p = await store.ensurePerfil();
        if (!cancelled) setPerfil(p);
      } catch (err) {
        console.warn("[revisao] boot perfil:", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Caderno ---- */
  const reloadQuestoes = useCallback(async (filters?: CadernoFilters) => {
    setQuestoesLoading(true);
    try {
      const store = await import("@/lib/revisao/revisao-store");
      const data = await store.listQuestoes(filters);
      setQuestoes(data);
    } catch (err) {
      console.warn("[revisao] load questoes:", err);
    } finally {
      setQuestoesLoading(false);
    }
  }, []);

  const handleAddQuestao = useCallback(
    async (payload: QuickCapturePayload): Promise<boolean> => {
      try {
        const store = await import("@/lib/revisao/revisao-store");
        const result = await store.addQuestao(payload);
        if (result) {
          setQuestoes((prev) => [result.questao, ...prev]);
          setFlashcardsDoDia((prev) => [result.flashcard, ...prev]);
          return true;
        }
        return false;
      } catch (err) {
        console.warn("[revisao] add questao:", err);
        return false;
      }
    },
    [],
  );

  const handleUpdateQuestao = useCallback(
    async (
      id: string,
      updates: Partial<QuickCapturePayload>,
    ): Promise<boolean> => {
      try {
        const store = await import("@/lib/revisao/revisao-store");
        await store.updateQuestao(id, updates);
        setQuestoes((prev) =>
          prev.map((q) => (q.id === id ? { ...q, ...updates } : q)),
        );
        return true;
      } catch (err) {
        console.warn("[revisao] update questao:", err);
        return false;
      }
    },
    [],
  );

  const handleDeleteQuestao = useCallback(async (id: string) => {
    try {
      const store = await import("@/lib/revisao/revisao-store");
      await store.deleteQuestao(id);
      setQuestoes((prev) => prev.filter((q) => q.id !== id));
      setFlashcardsDoDia((prev) => prev.filter((f) => f.questao_id !== id));
    } catch (err) {
      console.warn("[revisao] delete questao:", err);
    }
  }, []);

  /* ---- Flashcards ---- */
  const reloadFlashcards = useCallback(async () => {
    setFlashcardsLoading(true);
    try {
      const store = await import("@/lib/revisao/revisao-store");
      const [dia, todos] = await Promise.all([
        store.getFlashcardsDoDia(),
        store.listFlashcards(),
      ]);
      setFlashcardsDoDia(dia);
      setAllFlashcards(todos);
    } catch (err) {
      console.warn("[revisao] load flashcards:", err);
    } finally {
      setFlashcardsLoading(false);
    }
  }, []);

  /* ---- Matérias ---- */
  const reloadMaterias = useCallback(async () => {
    setMateriasLoading(true);
    try {
      const store = await import("@/lib/revisao/revisao-store");
      const list = await store.listMateriasRevisao();
      setMaterias(list);
    } catch (err) {
      console.warn("[revisao] load materias:", err);
    } finally {
      setMateriasLoading(false);
    }
  }, []);

  const handleAddMateria = useCallback(async (nome: string) => {
    const trimmed = nome.trim();
    if (!trimmed) return null;
    removeHiddenMateriaName(trimmed);
    setHiddenNames((prev) => {
      const next = new Set(prev);
      next.delete(trimmed.toLowerCase());
      return next;
    });
    try {
      const store = await import("@/lib/revisao/revisao-store");
      const nova = await store.addMateriaRevisao(trimmed);
      if (nova) {
        setMaterias((prev) =>
          prev.some((m) => m.id === nova.id) ? prev : [...prev, nova],
        );
      }
      return nova;
    } catch (err) {
      console.warn("[revisao] add materia:", err);
      return null;
    }
  }, []);

  const handleDeleteMateria = useCallback(
    async (id: string) => {
      const target = combinedMaterias.find((m) => m.id === id);
      if (target) {
        addHiddenMateriaName(target.nome);
        setHiddenNames((prev) => {
          const next = new Set(prev);
          next.add(target.nome.toLowerCase());
          return next;
        });
      }
      try {
        const store = await import("@/lib/revisao/revisao-store");
        await store.deleteMateriaRevisao(id);
        setMaterias((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        console.warn("[revisao] delete materia:", err);
      }
    },
    [combinedMaterias],
  );

  useEffect(() => {
    reloadMaterias();
  }, [reloadMaterias]);

  const handleResponderFlashcard = useCallback(
    async (
      id: string,
      nivelAtual: 0 | 1 | 2 | 3,
      resposta: "errei" | "dificil" | "bom" | "facil",
    ) => {
      try {
        const store = await import("@/lib/revisao/revisao-store");
        await store.responderFlashcard(id, nivelAtual, resposta);
        // Remove do deck do dia (foi respondido)
        setFlashcardsDoDia((prev) => prev.filter((f) => f.id !== id));
      } catch (err) {
        console.warn("[revisao] responder flashcard:", err);
      }
    },
    [],
  );

  /* ---- Stats ---- */
  const reloadStats = useCallback(async () => {
    try {
      const store = await import("@/lib/revisao/revisao-store");
      const s = await store.getRevisaoStats();
      setStats(s);
    } catch (err) {
      console.warn("[revisao] load stats:", err);
    }
  }, []);

  /* ---- Module toggle ---- */
  const handleSetModuloAtivo = useCallback(async (ativo: boolean) => {
    try {
      const store = await import("@/lib/revisao/revisao-store");
      await store.setModuloAtivo("revisao", ativo);
      setPerfil((prev) =>
        prev
          ? { ...prev, modulos_ativos: { ...prev.modulos_ativos, revisao: ativo } }
          : prev,
      );
    } catch (err) {
      console.warn("[revisao] toggle modulo:", err);
    }
  }, []);

  const value: RevisaoContextValue = {
    ready,
    perfil,
    moduloAtivo,
    questoes,
    questoesLoading,
    addQuestao: handleAddQuestao,
    updateQuestao: handleUpdateQuestao,
    deleteQuestao: handleDeleteQuestao,
    reloadQuestoes,
    flashcardsDoDia,
    flashcardsLoading,
    allFlashcards,
    responderFlashcard: handleResponderFlashcard,
    reloadFlashcards,
    materias: combinedMaterias,
    materiasLoading,
    addMateria: handleAddMateria,
    deleteMateria: handleDeleteMateria,
    reloadMaterias,
    stats,
    reloadStats,
    setModuloAtivo: handleSetModuloAtivo,
  };

  return (
    <RevisaoContext.Provider value={value}>{children}</RevisaoContext.Provider>
  );
}
