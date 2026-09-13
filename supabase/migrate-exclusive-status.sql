-- Status do mini-ciclo em dias exclusivos (2+ matérias).
-- Independente do status do ciclo normal.

alter table public.subjects
  add column if not exists exclusive_status text not null default 'prox';

alter table public.subjects
  drop constraint if exists subjects_exclusive_status_valid;

alter table public.subjects
  add constraint subjects_exclusive_status_valid
  check (exclusive_status in ('ok', 'prox'));
