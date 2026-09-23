-- =============================================================
-- Configurações Globais do Sistema & IA (Acesso Master)
-- Executar no Supabase SQL Editor
-- =============================================================

-- 1. Tabela para configurações gerais do sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 2. Políticas RLS: Apenas Master (owner) tem acesso total a system_settings
DROP POLICY IF EXISTS "system_settings_admin" ON public.system_settings;
CREATE POLICY "system_settings_admin" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.current_user_is_access_admin())
  WITH CHECK (public.current_user_is_access_admin());

-- 3. Função RPC segura para leitura das configurações pelo usuário
-- Se for Master (owner), retorna a configuração completa (inclusive a chave da IA).
-- Se for membro comum, retorna apenas configurações públicas (modelo, se o limite está ativo e o limite diário), NUNCA a API key.
CREATE OR REPLACE FUNCTION public.get_ai_config_for_user()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_is_admin boolean;
  v_config jsonb;
BEGIN
  -- Apenas usuários autenticados
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT value INTO v_config FROM public.system_settings WHERE key = 'ai_config';
  IF v_config IS NULL THEN
    RETURN NULL;
  END IF;

  v_is_admin := public.current_user_is_access_admin();

  -- Se for Master/Admin, expõe a configuração completa para gerenciar
  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'is_admin', true,
      'api_key', COALESCE(v_config ->> 'api_key', ''),
      'model', COALESCE(v_config ->> 'model', 'google/gemini-2.0-flash-001'),
      'limit_enabled', COALESCE((v_config ->> 'limit_enabled')::boolean, true),
      'daily_limit', COALESCE((v_config ->> 'daily_limit')::int, 15)
    );
  END IF;

  -- Se for membro comum, NUNCA expõe a chave da API
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
