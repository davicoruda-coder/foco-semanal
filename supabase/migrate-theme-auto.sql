-- Permite tema "auto" (claro de dia / escuro à noite).
-- Rode no SQL Editor do Supabase (Dashboard → SQL → New query).

alter table public.profiles
  drop constraint if exists profiles_theme_check;

alter table public.profiles
  add constraint profiles_theme_check
  check (theme in ('light', 'dark', 'auto'));
