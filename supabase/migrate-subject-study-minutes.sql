-- Tempo de estudo (minutos) por matéria — usado no play do ciclo.

alter table public.subjects
  add column if not exists study_minutes int not null default 25;

alter table public.subjects
  drop constraint if exists subjects_study_minutes_range;

alter table public.subjects
  add constraint subjects_study_minutes_range
  check (study_minutes between 1 and 999);
