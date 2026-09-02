-- Matérias livres: sem timer próprio e sem status no ciclo.
alter table public.subjects
  add column if not exists is_free boolean not null default false;
