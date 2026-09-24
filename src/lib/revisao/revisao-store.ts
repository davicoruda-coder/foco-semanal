/* ------------------------------------------------------------------ */
/*  CRUD Supabase para o módulo Revisão (Caderno + Flashcards + Perfil)*/
/*  Segue o padrão de focus-sync.ts: lazy import do client.           */
/* ------------------------------------------------------------------ */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  QuestaoCaderno,
  Flashcard,
  PerfilUsuario,
  QuickCapturePayload,
  CadernoFilters,
  NivelDominio,
  MateriaRevisao,
  AIGeneratedCard,
} from "./types";
import { calcularProximaRevisao, type RespostaRevisao } from "./spaced-repetition";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function getAuthedClient(): Promise<{
  supabase: SupabaseClient;
  userId: string;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}

function assertOk(label: string, error: { message: string } | null) {
  if (error) throw new Error(`[revisao] ${label}: ${error.message}`);
}

/** Valida que URL começa com http(s):// — rejeita base64 e blobs. */
function sanitizeUrl(url: string | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed.slice(0, 500);
  return "";
}

/** Limita texto a N caracteres. */
function clampText(text: string | undefined, max: number): string {
  if (!text) return "";
  return text.trim().slice(0, max);
}

/* ------------------------------------------------------------------ */
/*  Gerar flashcard automaticamente a partir de uma questão            */
/* ------------------------------------------------------------------ */

function gerarFlashcard(
  q: QuickCapturePayload,
  questaoId: string,
): { frente: string; verso: string } {
  const bancaTag = q.banca ? `[${q.banca}] ` : "";
  const assuntoTag = q.assunto ? `${q.disciplina} › ${q.assunto}` : q.disciplina;

  const frente = `${bancaTag}${assuntoTag}\n\n${
    q.enunciado_texto
      ? q.enunciado_texto.slice(0, 300) + (q.enunciado_texto.length > 300 ? "…" : "")
      : q.codigo_questao
        ? `Questão ${q.codigo_questao}`
        : "Revise esta questão"
  }`;

  const partes: string[] = [];
  if (q.aprendizado_chave) partes.push(`📌 ${q.aprendizado_chave}`);
  if (q.link_questao) partes.push(`🔗 ${q.link_questao}`);
  if (q.link_video) partes.push(`🎬 ${q.link_video}`);

  const verso = partes.join("\n\n") || "Sem anotação de aprendizado.";

  return { frente, verso };
}

/* ------------------------------------------------------------------ */
/*  CRUD: Questões do Caderno                                          */
/* ------------------------------------------------------------------ */

export async function addQuestao(
  payload: QuickCapturePayload,
): Promise<{ questao: QuestaoCaderno; flashcard: Flashcard | null } | null> {
  const auth = await getAuthedClient();
  if (!auth) return null;

  const row = {
    user_id: auth.userId,
    codigo_questao: clampText(payload.codigo_questao, 50),
    link_questao: sanitizeUrl(payload.link_questao),
    link_video: sanitizeUrl(payload.link_video),
    enunciado_texto: clampText(payload.enunciado_texto, 5000),
    banca: clampText(payload.banca, 100),
    disciplina: clampText(payload.disciplina, 100),
    assunto: clampText(payload.assunto, 100),
    status_resultado: payload.status_resultado,
    causa_erro: payload.causa_erro,
    aprendizado_chave: clampText(payload.aprendizado_chave, 1500),
  };

  const { data: questao, error: qErr } = await auth.supabase
    .from("questoes_caderno")
    .insert(row)
    .select()
    .single();
  assertOk("insert questao", qErr);

  let flashcard: Flashcard | null = null;

  // Gerar flashcard apenas se solicitado
  if (payload.criar_flashcard) {
    const { frente, verso } = gerarFlashcard(payload, questao.id);
    const { data: fc, error: fErr } = await auth.supabase
      .from("flashcards")
      .insert({
        questao_id: questao.id,
        user_id: auth.userId,
        frente,
        verso,
        origem: "caderno",
        disciplina: clampText(payload.disciplina, 100),
      })
      .select()
      .single();
    assertOk("insert flashcard", fErr);
    flashcard = fc as Flashcard;
  }

  return { questao: questao as QuestaoCaderno, flashcard };
}

export async function listQuestoes(
  filters?: CadernoFilters,
): Promise<QuestaoCaderno[]> {
  const auth = await getAuthedClient();
  if (!auth) return [];

  let query = auth.supabase
    .from("questoes_caderno")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (filters?.banca) query = query.eq("banca", filters.banca);
  if (filters?.disciplina) query = query.eq("disciplina", filters.disciplina);
  if (filters?.assunto) query = query.eq("assunto", filters.assunto);
  if (filters?.status_resultado)
    query = query.eq("status_resultado", filters.status_resultado);
  if (filters?.causa_erro) query = query.eq("causa_erro", filters.causa_erro);
  if (filters?.search)
    query = query.or(
      `aprendizado_chave.ilike.%${filters.search}%,enunciado_texto.ilike.%${filters.search}%,codigo_questao.ilike.%${filters.search}%`,
    );

  const { data, error } = await query;
  assertOk("list questoes", error);
  return (data ?? []) as QuestaoCaderno[];
}

export async function deleteQuestao(id: string): Promise<void> {
  const auth = await getAuthedClient();
  if (!auth) return;
  const { error } = await auth.supabase
    .from("questoes_caderno")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);
  assertOk("delete questao", error);
}

export async function updateQuestao(
  id: string,
  updates: Partial<QuickCapturePayload>,
): Promise<void> {
  const auth = await getAuthedClient();
  if (!auth) return;

  const row: Record<string, unknown> = {};
  if (updates.codigo_questao !== undefined)
    row.codigo_questao = clampText(updates.codigo_questao, 50);
  if (updates.link_questao !== undefined)
    row.link_questao = sanitizeUrl(updates.link_questao);
  if (updates.link_video !== undefined)
    row.link_video = sanitizeUrl(updates.link_video);
  if (updates.enunciado_texto !== undefined)
    row.enunciado_texto = clampText(updates.enunciado_texto, 5000);
  if (updates.banca !== undefined)
    row.banca = clampText(updates.banca, 100);
  if (updates.disciplina !== undefined)
    row.disciplina = clampText(updates.disciplina, 100);
  if (updates.assunto !== undefined)
    row.assunto = clampText(updates.assunto, 100);
  if (updates.status_resultado !== undefined)
    row.status_resultado = updates.status_resultado;
  if (updates.causa_erro !== undefined)
    row.causa_erro = updates.causa_erro;
  if (updates.aprendizado_chave !== undefined)
    row.aprendizado_chave = clampText(updates.aprendizado_chave, 1500);

  const { error } = await auth.supabase
    .from("questoes_caderno")
    .update(row)
    .eq("id", id)
    .eq("user_id", auth.userId);
  assertOk("update questao", error);
}

/* ------------------------------------------------------------------ */
/*  CRUD: Flashcards                                                   */
/* ------------------------------------------------------------------ */

/** Retorna flashcards cuja revisão é hoje ou anterior (deck do dia), com dados da questão. */
export async function getFlashcardsDoDia(): Promise<
  (Flashcard & { questao?: QuestaoCaderno })[]
> {
  const auth = await getAuthedClient();
  if (!auth) return [];

  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await auth.supabase
    .from("flashcards")
    .select("*, questoes_caderno(*)")
    .eq("user_id", auth.userId)
    .lte("proxima_revisao", hoje)
    .order("proxima_revisao", { ascending: true });
  assertOk("flashcards do dia", error);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ...row,
    questao: row.questoes_caderno ?? undefined,
    questoes_caderno: undefined,
  })) as (Flashcard & { questao?: QuestaoCaderno })[];
}

/** Lista todos os flashcards, opcionalmente filtrados por disciplina/banca. */
export async function listFlashcards(filters?: {
  disciplina?: string;
  banca?: string;
}): Promise<(Flashcard & { questao?: QuestaoCaderno })[]> {
  const auth = await getAuthedClient();
  if (!auth) return [];

  let query = auth.supabase
    .from("flashcards")
    .select("*, questoes_caderno(*)")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  // Filtros via join
  if (filters?.disciplina)
    query = query.eq("questoes_caderno.disciplina", filters.disciplina);
  if (filters?.banca)
    query = query.eq("questoes_caderno.banca", filters.banca);

  const { data, error } = await query;
  assertOk("list flashcards", error);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ...row,
    questao: row.questoes_caderno ?? undefined,
    questoes_caderno: undefined,
  }));
}

/** Atualiza nível de domínio e próxima revisão após resposta. */
export async function responderFlashcard(
  id: string,
  nivelAtual: NivelDominio,
  resposta: RespostaRevisao,
): Promise<void> {
  const auth = await getAuthedClient();
  if (!auth) return;

  const { novoNivel, proximaRevisao } = calcularProximaRevisao(
    nivelAtual,
    resposta,
  );

  const { error } = await auth.supabase
    .from("flashcards")
    .update({
      nivel_dominio: novoNivel,
      proxima_revisao: proximaRevisao,
    })
    .eq("id", id)
    .eq("user_id", auth.userId);
  assertOk("responder flashcard", error);
}

/** Atualiza frente e/ou verso de um flashcard existente. */
export async function updateFlashcard(
  id: string,
  updates: { frente?: string; verso?: string },
): Promise<boolean> {
  const auth = await getAuthedClient();
  if (!auth) return false;

  const patch: Record<string, string> = {};
  if (updates.frente !== undefined) patch.frente = clampText(updates.frente, 5000);
  if (updates.verso !== undefined) patch.verso = clampText(updates.verso, 5000);

  const { error } = await auth.supabase
    .from("flashcards")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.userId);
  assertOk("update flashcard", error);
  return true;
}

/** Exclui um flashcard específico. */
export async function deleteFlashcard(id: string): Promise<boolean> {
  const auth = await getAuthedClient();
  if (!auth) return false;

  const { error } = await auth.supabase
    .from("flashcards")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);
  assertOk("delete flashcard", error);
  return true;
}

/** Cria um flashcard manual para uma matéria (opcionalmente vinculado a uma questão). */
export async function addFlashcardManual(
  disciplina: string,
  frente: string,
  verso: string,
  questaoId?: string,
): Promise<Flashcard | null> {
  const auth = await getAuthedClient();
  if (!auth) return null;

  const hoje = new Date().toISOString().slice(0, 10);
  const row: Record<string, unknown> = {
    user_id: auth.userId,
    frente: clampText(frente, 5000),
    verso: clampText(verso, 5000),
    disciplina: clampText(disciplina, 100),
    origem: questaoId ? ("caderno" as const) : ("manual" as const),
    proxima_revisao: hoje,
    nivel_dominio: 0,
  };

  if (questaoId) {
    row.questao_id = questaoId;
  }

  const { data, error } = await auth.supabase
    .from("flashcards")
    .insert(row)
    .select()
    .single();
  assertOk("insert manual flashcard", error);
  return data as Flashcard;
}

/* ------------------------------------------------------------------ */
/*  Perfil / Módulos                                                   */
/* ------------------------------------------------------------------ */

export async function loadPerfil(): Promise<PerfilUsuario | null> {
  const auth = await getAuthedClient();
  if (!auth) return null;

  const { data, error } = await auth.supabase
    .from("perfis")
    .select("*")
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (error) {
    console.warn("[revisao] load perfil:", error.message);
    return null;
  }
  return data as PerfilUsuario | null;
}

export async function ensurePerfil(): Promise<PerfilUsuario | null> {
  const auth = await getAuthedClient();
  if (!auth) return null;

  // Tenta carregar
  const existing = await loadPerfil();
  if (existing) return existing;

  // Cria se não existe
  const { data, error } = await auth.supabase
    .from("perfis")
    .insert({ user_id: auth.userId })
    .select()
    .single();
  if (error) {
    console.warn("[revisao] ensure perfil:", error.message);
    return null;
  }
  return data as PerfilUsuario;
}

export async function setModuloAtivo(
  modulo: string,
  ativo: boolean,
): Promise<void> {
  const auth = await getAuthedClient();
  if (!auth) return;

  const perfil = await ensurePerfil();
  if (!perfil) return;

  const ativos = { ...perfil.modulos_ativos, [modulo]: ativo };

  const { error } = await auth.supabase
    .from("perfis")
    .update({ modulos_ativos: ativos })
    .eq("user_id", auth.userId);
  assertOk("set modulo ativo", error);
}

/* ------------------------------------------------------------------ */
/*  Estatísticas rápidas                                               */
/* ------------------------------------------------------------------ */

export interface RevisaoStats {
  totalQuestoes: number;
  porDisciplina: Record<string, number>;
  porBanca: Record<string, number>;
  porCausa: Record<string, number>;
  porResultado: Record<string, number>;
  flashcardsPendentes: number;
}

export async function getRevisaoStats(): Promise<RevisaoStats> {
  const auth = await getAuthedClient();
  const empty: RevisaoStats = {
    totalQuestoes: 0,
    porDisciplina: {},
    porBanca: {},
    porCausa: {},
    porResultado: {},
    flashcardsPendentes: 0,
  };
  if (!auth) return empty;

  const [questoesRes, pendentesRes] = await Promise.all([
    auth.supabase
      .from("questoes_caderno")
      .select("disciplina, banca, causa_erro, status_resultado")
      .eq("user_id", auth.userId),
    auth.supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.userId)
      .lte("proxima_revisao", new Date().toISOString().slice(0, 10)),
  ]);

  const stats = { ...empty };
  if (questoesRes.data) {
    stats.totalQuestoes = questoesRes.data.length;
    for (const q of questoesRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = q as any;
      if (row.disciplina)
        stats.porDisciplina[row.disciplina] =
          (stats.porDisciplina[row.disciplina] || 0) + 1;
      if (row.banca)
        stats.porBanca[row.banca] = (stats.porBanca[row.banca] || 0) + 1;
      if (row.causa_erro)
        stats.porCausa[row.causa_erro] =
          (stats.porCausa[row.causa_erro] || 0) + 1;
      if (row.status_resultado)
        stats.porResultado[row.status_resultado] =
          (stats.porResultado[row.status_resultado] || 0) + 1;
    }
  }
  stats.flashcardsPendentes = pendentesRes.count ?? 0;
  return stats;
}

/* ------------------------------------------------------------------ */
/*  CRUD: Matérias cadastradas para Revisão                           */
/* ------------------------------------------------------------------ */

const LOCAL_STORAGE_KEY_MATERIAS = "foco_revisao_materias_v1";

export async function listMateriasRevisao(): Promise<MateriaRevisao[]> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MATERIAS);
      if (raw) {
        return JSON.parse(raw) as MateriaRevisao[];
      }
    } catch {}
  }

  const auth = await getAuthedClient();
  if (auth) {
    try {
      const perfil = await ensurePerfil();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list = (perfil?.modulos_ativos as any)?.materias_revisao;
      if (Array.isArray(list) && list.length > 0) {
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEY_MATERIAS, JSON.stringify(list));
        }
        return list;
      }
    } catch {}
  }

  return [];
}

export async function addMateriaRevisao(
  nome: string,
): Promise<MateriaRevisao | null> {
  const trimmed = nome.trim();
  if (!trimmed) return null;

  const current = await listMateriasRevisao();
  const exists = current.find(
    (m) => m.nome.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exists) return exists;

  const nova: MateriaRevisao = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),
    nome: trimmed,
    created_at: new Date().toISOString(),
  };

  const updated = [...current, nova];
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_KEY_MATERIAS, JSON.stringify(updated));
  }

  const auth = await getAuthedClient();
  if (auth) {
    try {
      const perfil = await ensurePerfil();
      const modulos = perfil?.modulos_ativos ?? { revisao: true };
      await auth.supabase
        .from("perfis")
        .update({
          modulos_ativos: {
            ...modulos,
            materias_revisao: updated,
          },
        })
        .eq("user_id", auth.userId);
    } catch (err) {
      console.warn("[revisao] sync materia supabase:", err);
    }
  }

  return nova;
}

export async function deleteMateriaRevisao(id: string): Promise<void> {
  const current = await listMateriasRevisao();
  const updated = current.filter((m) => m.id !== id);

  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_KEY_MATERIAS, JSON.stringify(updated));
  }

  const auth = await getAuthedClient();
  if (auth) {
    try {
      const perfil = await ensurePerfil();
      const modulos = perfil?.modulos_ativos ?? { revisao: true };
      await auth.supabase
        .from("perfis")
        .update({
          modulos_ativos: {
            ...modulos,
            materias_revisao: updated,
          },
        })
        .eq("user_id", auth.userId);
    } catch (err) {
      console.warn("[revisao] delete materia supabase:", err);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Flashcards gerados por IA                                          */
/* ------------------------------------------------------------------ */

/** Insere flashcards gerados por IA em lote (sem questão vinculada). */
export async function addFlashcardsBatchIA(
  cards: AIGeneratedCard[],
  disciplina: string,
): Promise<Flashcard[]> {
  const auth = await getAuthedClient();
  if (!auth) return [];

  const rows = cards.map((c) => ({
    user_id: auth.userId,
    frente: clampText(c.frente, 1000),
    verso: clampText(c.verso, 2000),
    origem: "ia" as const,
    disciplina: clampText(disciplina, 100),
  }));

  const { data, error } = await auth.supabase
    .from("flashcards")
    .insert(rows)
    .select();
  assertOk("batch insert IA flashcards", error);

  return (data ?? []) as Flashcard[];
}

/** Conta gerações de IA nas últimas 24h para rate limiting na UI. */
export async function getAIGenerationsToday(): Promise<number> {
  const auth = await getAuthedClient();
  if (!auth) return 0;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await auth.supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.userId)
    .gte("created_at", oneDayAgo);

  if (error) {
    console.warn("[revisao] count ai generations:", error.message);
    return 0;
  }
  return count ?? 0;
}
