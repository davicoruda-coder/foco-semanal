-- Adiciona suporte ao modo 'intensivo' na tabela study_sessions
alter table public.study_sessions drop constraint if exists study_sessions_mode_check;
alter table public.study_sessions add constraint study_sessions_mode_check check (mode in ('ciclo', 'unica', 'intensivo'));

