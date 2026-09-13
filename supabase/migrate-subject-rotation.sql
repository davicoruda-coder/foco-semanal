-- Rodízio interno da matéria: {"items":[{"id","name","notes"}],"index":0}.
-- null = matéria comum (sem rodízio).
alter table public.subjects
  add column if not exists rotation jsonb;
