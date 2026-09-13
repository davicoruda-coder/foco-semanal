-- Dias exclusivos por matéria + temporizador da lateral (Hoje).
-- Rode no SQL Editor do Supabase se a migration remota ainda não foi aplicada.

alter table public.subjects
  add column if not exists exclusive_days int[] null;

alter table public.subjects
  drop constraint if exists subjects_exclusive_days_valid;

alter table public.subjects
  add constraint subjects_exclusive_days_valid
  check (
    exclusive_days is null
    or (
      cardinality(exclusive_days) between 1 and 7
      and exclusive_days <@ array[0, 1, 2, 3, 4, 5, 6]
    )
  );

alter table public.session_settings
  add column if not exists sidebar_timer_name text not null default 'Temporizador';

alter table public.session_settings
  add column if not exists sidebar_timer_minutes int not null default 40;

alter table public.session_settings
  drop constraint if exists session_settings_sidebar_timer_minutes_range;

alter table public.session_settings
  add constraint session_settings_sidebar_timer_minutes_range
  check (sidebar_timer_minutes between 1 and 180);
