-- Adiciona suporte a ciclo ponderado (pesos e repetições no ciclo)
alter table public.subjects
  add column if not exists weight int not null default 1,
  add column if not exists cycle_done int not null default 0;

alter table public.subjects
  drop constraint if exists subjects_weight_range,
  drop constraint if exists subjects_cycle_done_range;

alter table public.subjects
  add constraint subjects_weight_range check (weight between 1 and 10),
  add constraint subjects_cycle_done_range check (cycle_done >= 0);
