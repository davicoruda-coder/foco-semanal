-- Recursos / links úteis da matéria: [{"id": "...", "title": "...", "url": "..."}].
-- null = nenhum recurso (vazio).
alter table public.subjects
  add column if not exists recursos jsonb;
