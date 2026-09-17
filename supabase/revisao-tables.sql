-- =============================================================
-- Módulo Revisão: Caderno de Erros + Flashcards + Perfis
-- Executar no Supabase SQL Editor
-- =============================================================

-- 1. Tabela de perfis (base para planos, BYOK e controle de módulos)
CREATE TABLE IF NOT EXISTS perfis (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT,
  concurso_alvo TEXT,
  plano      TEXT NOT NULL DEFAULT 'free'
             CHECK (plano IN ('free', 'pro', 'pro_ai')),
  api_key_custom TEXT,
  modulos_ativos JSONB NOT NULL DEFAULT '{"revisao": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY perfis_select ON perfis FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY perfis_insert ON perfis FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY perfis_update ON perfis FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY perfis_delete ON perfis FOR DELETE
  USING (user_id = auth.uid());


-- 2. Caderno de Erros
CREATE TABLE IF NOT EXISTS questoes_caderno (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo_questao    VARCHAR(50),
  link_questao      VARCHAR(500),
  link_video        VARCHAR(500),
  enunciado_texto   TEXT,
  banca             VARCHAR(100),
  disciplina        VARCHAR(100),
  assunto           VARCHAR(100),
  status_resultado  TEXT NOT NULL
                    CHECK (status_resultado IN ('erro', 'chute', 'pegadinha')),
  causa_erro        TEXT NOT NULL
                    CHECK (causa_erro IN ('atencao', 'teoria', 'interpretacao')),
  aprendizado_chave TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE questoes_caderno ENABLE ROW LEVEL SECURITY;

CREATE POLICY questoes_select ON questoes_caderno FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY questoes_insert ON questoes_caderno FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY questoes_update ON questoes_caderno FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY questoes_delete ON questoes_caderno FOR DELETE
  USING (user_id = auth.uid());


-- 3. Flashcards (1:1 com questão, gerado automaticamente)
CREATE TABLE IF NOT EXISTS flashcards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questao_id      UUID REFERENCES questoes_caderno(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frente          TEXT NOT NULL,
  verso           TEXT NOT NULL,
  proxima_revisao DATE NOT NULL DEFAULT CURRENT_DATE,
  nivel_dominio   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY flashcards_select ON flashcards FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY flashcards_insert ON flashcards FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY flashcards_update ON flashcards FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY flashcards_delete ON flashcards FOR DELETE
  USING (user_id = auth.uid());


-- 4. Índices úteis para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_questoes_user     ON questoes_caderno(user_id);
CREATE INDEX IF NOT EXISTS idx_questoes_disciplina ON questoes_caderno(user_id, disciplina);
CREATE INDEX IF NOT EXISTS idx_questoes_banca    ON questoes_caderno(user_id, banca);
CREATE INDEX IF NOT EXISTS idx_flashcards_user   ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_revisao ON flashcards(user_id, proxima_revisao);
CREATE INDEX IF NOT EXISTS idx_perfis_user       ON perfis(user_id);
