-- Acesso controlado ao Foco: lista autorizada, pedidos de demonstração e RLS.
-- Rode no SQL Editor do Supabase.

create table if not exists public.access_allowlist (
  email text primary key check (email = lower(trim(email))),
  role text not null default 'member' check (role in ('owner', 'member')),
  added_at timestamptz not null default now(),
  added_by uuid references auth.users(id) on delete set null
);

create table if not exists public.access_requests (
  email text primary key check (email = lower(trim(email))),
  requested_at timestamptz not null default now()
);

-- Preserva os usuários que já existiam antes desta migração.
insert into public.access_allowlist (email, role)
select
  lower(email),
  case when lower(email) = 'davicoruda@gmail.com' then 'owner' else 'member' end
from auth.users
where email is not null
on conflict (email) do update
set role = case
  when excluded.email = 'davicoruda@gmail.com' then 'owner'
  else public.access_allowlist.role
end;

-- Garante o e-mail proprietário mesmo antes de uma nova autenticação.
insert into public.access_allowlist (email, role)
values ('davicoruda@gmail.com', 'owner')
on conflict (email) do update set role = 'owner';

create or replace function public.is_email_allowed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.access_allowlist
    where email = lower(trim(p_email))
  );
$$;

create or replace function public.current_user_has_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.access_allowlist
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.current_user_is_access_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.access_allowlist
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'owner'
  );
$$;

create or replace function public.request_demo_access(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(trim(p_email));
begin
  if normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'E-mail inválido';
  end if;

  if not public.is_email_allowed(normalized) then
    insert into public.access_requests (email)
    values (normalized)
    on conflict (email) do update set requested_at = now();
  end if;
  return true;
end;
$$;

grant execute on function public.is_email_allowed(text) to anon, authenticated;
grant execute on function public.request_demo_access(text) to anon, authenticated;
grant execute on function public.current_user_has_access() to authenticated;
grant execute on function public.current_user_is_access_admin() to authenticated;

alter table public.access_allowlist enable row level security;
alter table public.access_requests enable row level security;

drop policy if exists "access_allowlist_admin" on public.access_allowlist;
create policy "access_allowlist_admin" on public.access_allowlist
  for all to authenticated
  using (public.current_user_is_access_admin())
  with check (public.current_user_is_access_admin());

drop policy if exists "access_requests_admin" on public.access_requests;
create policy "access_requests_admin" on public.access_requests
  for all to authenticated
  using (public.current_user_is_access_admin())
  with check (public.current_user_is_access_admin());

-- Quem não está autorizado pode até existir no Auth, mas não lê/grava dados.
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles for all to authenticated
  using (auth.uid() = id and public.current_user_has_access())
  with check (auth.uid() = id and public.current_user_has_access());

drop policy if exists "subjects_own" on public.subjects;
create policy "subjects_own" on public.subjects for all to authenticated
  using (auth.uid() = user_id and public.current_user_has_access())
  with check (auth.uid() = user_id and public.current_user_has_access());

drop policy if exists "week_blocks_own" on public.week_blocks;
create policy "week_blocks_own" on public.week_blocks for all to authenticated
  using (auth.uid() = user_id and public.current_user_has_access())
  with check (auth.uid() = user_id and public.current_user_has_access());

drop policy if exists "session_settings_own" on public.session_settings;
create policy "session_settings_own" on public.session_settings for all to authenticated
  using (auth.uid() = user_id and public.current_user_has_access())
  with check (auth.uid() = user_id and public.current_user_has_access());

drop policy if exists "focus_timers_own" on public.focus_timers;
create policy "focus_timers_own" on public.focus_timers for all to authenticated
  using (auth.uid() = user_id and public.current_user_has_access())
  with check (auth.uid() = user_id and public.current_user_has_access());

drop policy if exists "study_sessions_own" on public.study_sessions;
create policy "study_sessions_own" on public.study_sessions for all to authenticated
  using (auth.uid() = user_id and public.current_user_has_access())
  with check (auth.uid() = user_id and public.current_user_has_access());

drop policy if exists "reminders_own" on public.reminders;
create policy "reminders_own" on public.reminders for all to authenticated
  using (auth.uid() = user_id and public.current_user_has_access())
  with check (auth.uid() = user_id and public.current_user_has_access());

drop policy if exists "note_columns_own" on public.note_columns;
create policy "note_columns_own" on public.note_columns for all to authenticated
  using (auth.uid() = user_id and public.current_user_has_access())
  with check (auth.uid() = user_id and public.current_user_has_access());

drop policy if exists "sticky_notes_own" on public.sticky_notes;
create policy "sticky_notes_own" on public.sticky_notes for all to authenticated
  using (auth.uid() = user_id and public.current_user_has_access())
  with check (auth.uid() = user_id and public.current_user_has_access());

drop policy if exists "focus_days_own" on public.focus_days;
create policy "focus_days_own" on public.focus_days for all to authenticated
  using (auth.uid() = user_id and public.current_user_has_access())
  with check (auth.uid() = user_id and public.current_user_has_access());

-- Só cria os dados iniciais quando o e-mail já está autorizado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_email_allowed(new.email) then
    return new;
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  insert into public.session_settings (user_id) values (new.id);

  insert into public.focus_timers (user_id, name, minutes, accent, sort_order) values
    (new.id, 'Sessão', 40, 'var(--signal)', 0),
    (new.id, 'Estudo 1', 10, 'var(--accent-2)', 1),
    (new.id, 'Estudo 2', 5, 'var(--warn)', 2);

  insert into public.subjects (user_id, name, status, notes, cycle_order) values
    (new.id, 'Projetos', 'ok', 'Projeto Sistema Estudo', 0),
    (new.id, 'Python', 'prox', 'Revisão e continuidade', 1);

  insert into public.week_blocks (user_id, day, label, type, sort_order) values
    (new.id, 5, 'Trabalho', 'trabalho', 0),
    (new.id, 5, 'Estudo', 'estudo', 1),
    (new.id, 5, 'Reunião', 'reuniao', 2);

  insert into public.note_columns (user_id, title, color, sort_order) values
    (new.id, 'Faculdade', '#99F6E4', 0),
    (new.id, 'Python', '#FDE68A', 1),
    (new.id, 'Projetos', '#FBCFE8', 2),
    (new.id, 'Geral', '#BBF7D0', 3);

  return new;
end;
$$;
