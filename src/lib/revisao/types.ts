/* ------------------------------------------------------------------ */
/*  Tipos do módulo Revisão — isolados do restante do sistema          */
/* ------------------------------------------------------------------ */

/** Resultado da questão capturada. */
export type StatusResultado = "erro" | "chute" | "pegadinha";

/** Causa raiz do erro (tags rápidas). */
export type CausaErro = "atencao" | "teoria" | "interpretacao";

/** Nível de domínio na revisão espaçada. */
export type NivelDominio = 0 | 1 | 2 | 3;

/** Labels amigáveis para UI. */
export const STATUS_RESULTADO_LABEL: Record<StatusResultado, string> = {
  erro: "Errei",
  chute: "Acertei no Chute",
  pegadinha: "Pegadinha da Banca",
};

export const CAUSA_ERRO_LABEL: Record<CausaErro, string> = {
  atencao: "Falta de Atenção",
  teoria: "Teoria / Conceito",
  interpretacao: "Interpretação",
};

export const NIVEL_DOMINIO_LABEL: Record<NivelDominio, string> = {
  0: "Novo",
  1: "Difícil",
  2: "Bom",
  3: "Dominado",
};

/** Bancas pré-sugeridas (autocomplete — campo livre). */
export const BANCAS_SUGERIDAS = [
  "FGV",
  "Cebraspe",
  "FCC",
  "Vunesp",
  "IBFC",
  "CESPE",
  "Quadrix",
  "IDECAN",
  "AOCP",
] as const;

/* ------------------------------------------------------------------ */
/*  Interfaces de dados                                                */
/* ------------------------------------------------------------------ */

export interface QuestaoCaderno {
  id: string;
  user_id: string;
  codigo_questao: string;
  link_questao: string;
  link_video: string;
  enunciado_texto: string;
  banca: string;
  disciplina: string;
  assunto: string;
  status_resultado: StatusResultado;
  causa_erro: CausaErro;
  aprendizado_chave: string;
  created_at: string;
}

export interface MateriaRevisao {
  id: string;
  nome: string;
  created_at: string;
}

export interface Flashcard {
  id: string;
  questao_id: string;
  user_id: string;
  frente: string;
  verso: string;
  proxima_revisao: string; // "YYYY-MM-DD"
  nivel_dominio: NivelDominio;
  created_at: string;
  questao?: QuestaoCaderno;
  origem?: "caderno" | "ia" | "manual";
  disciplina?: string; // usado para cards de IA (sem questão vinculada)
}

/** Card gerado pela IA antes de ser salvo no banco. */
export interface AIGeneratedCard {
  frente: string;
  verso: string;
}

export interface PerfilUsuario {
  id: string;
  user_id: string;
  nome: string | null;
  concurso_alvo: string | null;
  plano: "free" | "pro" | "pro_ai";
  api_key_custom: string | null;
  modulos_ativos: {
    revisao: boolean;
    [key: string]: boolean;
  };
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Payload para criação (Quick Capture)                               */
/* ------------------------------------------------------------------ */

export interface QuickCapturePayload {
  codigo_questao?: string;
  link_questao?: string;
  link_video?: string;
  enunciado_texto?: string;
  banca: string;
  disciplina: string;
  assunto: string;
  status_resultado: StatusResultado;
  causa_erro: CausaErro;
  aprendizado_chave: string;
}

/* ------------------------------------------------------------------ */
/*  Filtros para listagem do caderno                                   */
/* ------------------------------------------------------------------ */

export interface CadernoFilters {
  banca?: string;
  disciplina?: string;
  assunto?: string;
  status_resultado?: StatusResultado;
  causa_erro?: CausaErro;
  search?: string;
}
