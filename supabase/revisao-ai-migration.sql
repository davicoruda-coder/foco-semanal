-- =============================================================
-- Módulo Revisão: Suporte a Flashcards gerados por IA + Painel Master
-- Executar no Supabase SQL Editor
-- =============================================================

-- 1. Campo 'origem': diferenciar como o card foi criado
-- Cards existentes recebem 'caderno' automaticamente (DEFAULT)
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS
  origem TEXT NOT NULL DEFAULT 'caderno'
  CHECK (origem IN ('caderno', 'ia', 'manual'));

-- 2. Campo 'disciplina': para cards sem questão vinculada (gerados por IA)
-- Cards do caderno usam questao.disciplina; cards de IA precisam do campo direto
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS
  disciplina TEXT;

-- 3. Índice para buscar cards de IA por disciplina
CREATE INDEX IF NOT EXISTS idx_flashcards_disciplina
  ON flashcards(user_id, disciplina)
  WHERE disciplina IS NOT NULL;

-- 4. Log de gerações de IA (rate limiting)
CREATE TABLE IF NOT EXISTS ai_generation_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_used     INT NOT NULL DEFAULT 0,
  cards_generated INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_generation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_log_select ON ai_generation_log;
CREATE POLICY ai_log_select ON ai_generation_log FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_log_insert ON ai_generation_log;
CREATE POLICY ai_log_insert ON ai_generation_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_log_user_date
  ON ai_generation_log(user_id, created_at);

-- 5. Tabela de configurações do sistema (Acesso Master)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_admin" ON public.system_settings;
CREATE POLICY "system_settings_admin" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.current_user_is_access_admin())
  WITH CHECK (public.current_user_is_access_admin());

-- 6. RPC para leitura segura de configurações de IA (Master vê chave; membros veem apenas limites e status)
CREATE OR REPLACE FUNCTION public.get_ai_config_for_user()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_is_admin boolean;
  v_config jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT value INTO v_config FROM public.system_settings WHERE key = 'ai_config';
  IF v_config IS NULL THEN
    RETURN NULL;
  END IF;

  v_is_admin := public.current_user_is_access_admin();

  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'is_admin', true,
      'api_key', COALESCE(v_config ->> 'api_key', ''),
      'model', COALESCE(v_config ->> 'model', 'google/gemini-2.0-flash-001'),
      'limit_enabled', COALESCE((v_config ->> 'limit_enabled')::boolean, true),
      'daily_limit', COALESCE((v_config ->> 'daily_limit')::int, 15)
    );
  END IF;

  RETURN jsonb_build_object(
    'is_admin', false,
    'configured', (v_config ->> 'api_key') IS NOT NULL AND (v_config ->> 'api_key') != '',
    'model', COALESCE(v_config ->> 'model', 'google/gemini-2.0-flash-001'),
    'limit_enabled', COALESCE((v_config ->> 'limit_enabled')::boolean, true),
    'daily_limit', COALESCE((v_config ->> 'daily_limit')::int, 15)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_config_for_user() TO authenticated;
