-- Schema Foco Semanal (versão atual)
-- Cole no SQL Editor do Supabase (Dashboard → SQL → New query) e rode tudo.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  theme text not null default 'light' check (theme in ('light', 'dark')),
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
  created_at timestamptz not null default now()
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

create table if not exists public.music_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  source text not null check (source in ('local', 'drive', 'none')) default 'none',
  drive_folder_id text,
  drive_folder_name text,
  local_folder_name text
);

create table if not exists public.music_day_map (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day int not null check (day between 0 and 6),
  file_id text not null,
  file_name text not null,
  unique (user_id, day)
);

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
alter table public.music_settings enable row level security;
alter table public.music_day_map enable row level security;

create policy "profiles_own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "subjects_own" on public.subjects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "week_blocks_own" on public.week_blocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "session_settings_own" on public.session_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "focus_timers_own" on public.focus_timers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_sessions_own" on public.study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminders_own" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "note_columns_own" on public.note_columns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sticky_notes_own" on public.sticky_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "music_settings_own" on public.music_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "music_day_map_own" on public.music_day_map for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto profile + defaults on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  insert into public.session_settings (user_id) values (new.id);
  insert into public.music_settings (user_id) values (new.id);

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
