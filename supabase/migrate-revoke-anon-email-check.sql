-- Impede enumeração da allowlist por clientes anônimos.
-- is_email_allowed continua usável internamente por funções SECURITY DEFINER
-- (request_demo_access, handle_new_user). Login usa current_user_has_access
-- após autenticar.

revoke execute on function public.is_email_allowed(text) from anon;
revoke execute on function public.is_email_allowed(text) from authenticated;
revoke execute on function public.is_email_allowed(text) from public;

-- Mantém apenas o dono da função (postgres/supabase_admin) e chamadas internas.
-- authenticated ainda precisa de current_user_has_access / is_access_admin.
grant execute on function public.current_user_has_access() to authenticated;
grant execute on function public.current_user_is_access_admin() to authenticated;
