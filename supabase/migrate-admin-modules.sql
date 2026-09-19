-- supabase/migrate-admin-modules.sql

alter table public.access_allowlist add column if not exists modulos_liberados jsonb not null default '{"revisao": true, "semana": true}'::jsonb;

create or replace function public.get_my_modules()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select modulos_liberados from public.access_allowlist
  where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

grant execute on function public.get_my_modules() to authenticated;
