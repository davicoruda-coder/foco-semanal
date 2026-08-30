-- Tamanho da fonte por lembrete: 0 = máximo (padrão atual), 1–2 = menores.

alter table public.reminders
  add column if not exists font_size smallint not null default 0;

alter table public.reminders
  drop constraint if exists reminders_font_size_range;

alter table public.reminders
  add constraint reminders_font_size_range
  check (font_size between 0 and 2);
