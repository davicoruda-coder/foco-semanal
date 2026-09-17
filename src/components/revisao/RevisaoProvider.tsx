"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  QuestaoCaderno,
  Flashcard,
  PerfilUsuario,
  QuickCapturePayload,
  CadernoFilters,
} from "@/lib/revisao/types";
import type { RevisaoStats } from "@/lib/revisao/revisao-store";

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
  deleteQuestao: (id: string) => Promise<void>;
  reloadQuestoes: (filters?: CadernoFilters) => Promise<void>;

  // Flashcards
  flashcardsDoDia: Flashcard[];
  flashcardsLoading: boolean;
  responderFlashcard: (
    id: string,
    nivelAtual: 0 | 1 | 2 | 3,
    resposta: "errei" | "dificil" | "bom" | "facil",
  ) => Promise<void>;
  reloadFlashcards: () => Promise<void>;

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
  const [flashcardsDoDia, setFlashcardsDoDia] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [stats, setStats] = useState<RevisaoStats | null>(null);

  const moduloAtivo = perfil?.modulos_ativos?.revisao ?? true;

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
      const data = await store.getFlashcardsDoDia();
      setFlashcardsDoDia(data);
    } catch (err) {
      console.warn("[revisao] load flashcards:", err);
    } finally {
      setFlashcardsLoading(false);
    }
  }, []);

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
    deleteQuestao: handleDeleteQuestao,
    reloadQuestoes,
    flashcardsDoDia,
    flashcardsLoading,
    responderFlashcard: handleResponderFlashcard,
    reloadFlashcards,
    stats,
    reloadStats,
    setModuloAtivo: handleSetModuloAtivo,
  };

  return (
    <RevisaoContext.Provider value={value}>{children}</RevisaoContext.Provider>
  );
}
