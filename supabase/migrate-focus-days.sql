-- Histórico de foco (Estatísticas / Foco hoje) na nuvem.
-- Rode no SQL Editor do Supabase (Dashboard → SQL → New query).

create table if not exists public.focus_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  seconds int not null default 0 check (seconds >= 0),
  by_hour int[] not null default array_fill(0, array[24]),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.focus_days enable row level security;

drop policy if exists "focus_days_own" on public.focus_days;
create policy "focus_days_own" on public.focus_days
  for all to authenticated
  using (auth.uid() = user_id and public.current_user_has_access())
  with check (auth.uid() = user_id and public.current_user_has_access());

create index if not exists focus_days_user_day_idx
  on public.focus_days (user_id, day desc);
