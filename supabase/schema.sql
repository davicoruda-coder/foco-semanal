-- Schema Foco Semanal (versão atual)
-- Cole no SQL Editor do Supabase (Dashboard → SQL → New query) e rode tudo.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  theme text not null default 'light' check (theme in ('light', 'dark', 'auto')),
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null check (status in ('ok', 'prox')) default 'prox',
  notes text not null default '',
  cycle_order int not null default 0,
  active boolean not null default true,
  -- null = todos os dias; senão 0=Seg … 6=Dom (1–6 dias)
  study_days int[] null,
  created_at timestamptz not null default now(),
  constraint subjects_study_days_valid check (
    study_days is null
    or (
      cardinality(study_days) between 1 and 6
      and study_days <@ array[0, 1, 2, 3, 4, 5, 6]
    )
  )
);

create table if not exists public.week_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day int not null check (day between 0 and 6),
  label text not null,
  type text not null check (type in ('trabalho', 'estudo', 'reuniao', 'pessoal', 'outro')),
  sort_order int not null default 0,
  color text
);

create table if not exists public.session_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  focus_minutes int not null default 40,
  break_short_minutes int not null default 5,
  break_long_minutes int not null default 10
);

create table if not exists public.focus_timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  minutes int not null default 25,
  accent text not null default 'var(--signal)',
  sort_order int not null default 0
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  subject_name text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes int not null default 0,
  mode text not null check (mode in ('ciclo', 'unica')) default 'ciclo',
  completed boolean not null default false
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text not null default '',
  notify_at timestamptz not null,
  remind_minutes_before int not null default 10,
  done_at timestamptz,
  active boolean not null default true,
  has_alarm boolean not null default false,
  color text not null default '#FDE68A'
);

create table if not exists public.note_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  color text not null default '#FDE68A',
  sort_order int not null default 0
);

create table if not exists public.sticky_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  column_id uuid not null references public.note_columns(id) on delete cascade,
  text text not null default '',
  color text not null default '#FDE047',
  sort_order int not null default 0
);

-- Histórico de foco (Estatísticas / Foco hoje). Relógios continuam locais.
create table if not exists public.focus_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  seconds int not null default 0 check (seconds >= 0),
  by_hour int[] not null default array_fill(0, array[24]),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

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

create or replace function public.is_email_allowed(p_email text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.access_allowlist
    where email = lower(trim(p_email))
  );
$$;

create or replace function public.current_user_has_access()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.access_allowlist
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.current_user_is_access_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.access_allowlist
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'owner'
  );
$$;

create or replace function public.request_demo_access(p_email text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  normalized text := lower(trim(p_email));
begin
  if normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'E-mail inválido';
  end if;
  if not public.is_email_allowed(normalized) then
    insert into public.access_requests (email) values (normalized)
    on conflict (email) do update set requested_at = now();
  end if;
  return true;
end;
$$;

grant execute on function public.request_demo_access(text) to anon, authenticated;
grant execute on function public.current_user_has_access() to authenticated;
grant execute on function public.current_user_is_access_admin() to authenticated;
-- is_email_allowed: sem grant a anon/authenticated (só uso interno SECURITY DEFINER)

insert into public.access_allowlist (email, role)
values ('davicoruda@gmail.com', 'owner')
on conflict (email) do update set role = 'owner';

-- RLS
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.week_blocks enable row level security;
alter table public.session_settings enable row level security;
alter table public.focus_timers enable row level security;
alter table public.study_sessions enable row level security;
alter table public.reminders enable row level security;
alter table public.note_columns enable row level security;
alter table public.sticky_notes enable row level security;
alter table public.focus_days enable row level security;
alter table public.access_allowlist enable row level security;
alter table public.access_requests enable row level security;

create policy "profiles_own" on public.profiles for all to authenticated using (auth.uid() = id and public.current_user_has_access()) with check (auth.uid() = id and public.current_user_has_access());
create policy "subjects_own" on public.subjects for all to authenticated using (auth.uid() = user_id and public.current_user_has_access()) with check (auth.uid() = user_id and public.current_user_has_access());
create policy "week_blocks_own" on public.week_blocks for all to authenticated using (auth.uid() = user_id and public.current_user_has_access()) with check (auth.uid() = user_id and public.current_user_has_access());
create policy "session_settings_own" on public.session_settings for all to authenticated using (auth.uid() = user_id and public.current_user_has_access()) with check (auth.uid() = user_id and public.current_user_has_access());
create policy "focus_timers_own" on public.focus_timers for all to authenticated using (auth.uid() = user_id and public.current_user_has_access()) with check (auth.uid() = user_id and public.current_user_has_access());
create policy "study_sessions_own" on public.study_sessions for all to authenticated using (auth.uid() = user_id and public.current_user_has_access()) with check (auth.uid() = user_id and public.current_user_has_access());
create policy "reminders_own" on public.reminders for all to authenticated using (auth.uid() = user_id and public.current_user_has_access()) with check (auth.uid() = user_id and public.current_user_has_access());
create policy "note_columns_own" on public.note_columns for all to authenticated using (auth.uid() = user_id and public.current_user_has_access()) with check (auth.uid() = user_id and public.current_user_has_access());
create policy "sticky_notes_own" on public.sticky_notes for all to authenticated using (auth.uid() = user_id and public.current_user_has_access()) with check (auth.uid() = user_id and public.current_user_has_access());
create policy "focus_days_own" on public.focus_days for all to authenticated using (auth.uid() = user_id and public.current_user_has_access()) with check (auth.uid() = user_id and public.current_user_has_access());
create policy "access_allowlist_select" on public.access_allowlist for select to authenticated using (public.current_user_is_access_admin());
create policy "access_allowlist_insert" on public.access_allowlist for insert to authenticated with check (public.current_user_is_access_admin() and role = 'member');
create policy "access_allowlist_update" on public.access_allowlist for update to authenticated using (public.current_user_is_access_admin() and role = 'member') with check (public.current_user_is_access_admin() and role = 'member');
create policy "access_allowlist_delete" on public.access_allowlist for delete to authenticated using (public.current_user_is_access_admin() and role = 'member');
create policy "access_requests_admin" on public.access_requests for all to authenticated using (public.current_user_is_access_admin()) with check (public.current_user_is_access_admin());

-- Auto profile + defaults on signup
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
    (new.id, 'Estudo', 10, 'var(--accent-2)', 1);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
