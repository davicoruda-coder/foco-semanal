-- Dias da semana em que cada matéria aparece no ciclo (tela Hoje).
-- null = todos os dias. Array: 0=Seg … 6=Dom.
-- Rode no SQL Editor do Supabase se a migration remota ainda não foi aplicada.

alter table public.subjects
  add column if not exists study_days int[] null;

alter table public.subjects
  drop constraint if exists subjects_study_days_valid;

alter table public.subjects
  add constraint subjects_study_days_valid
  check (
    study_days is null
    or (
      cardinality(study_days) between 1 and 6
      and study_days <@ array[0, 1, 2, 3, 4, 5, 6]
    )
  );
