-- Progresso de módulo/curso da matéria: {"unit_label": "...", "total": 10, "current": 0, "auto_detect": false, "auto_prefix": ""}
-- null = sem rastreamento de progresso.
alter table public.subjects
  add column if not exists progress jsonb;
