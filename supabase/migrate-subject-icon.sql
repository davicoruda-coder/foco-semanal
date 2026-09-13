-- Ícone da matéria: preset:<id> ou data URL (upload); null = inicial do nome.
alter table public.subjects
  add column if not exists icon text;
