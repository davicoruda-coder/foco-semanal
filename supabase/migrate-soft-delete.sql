-- Soft-delete para recuperação após wipe acidental
alter table public.subjects add column if not exists deleted_at timestamptz;
alter table public.week_blocks add column if not exists deleted_at timestamptz;
alter table public.reminders add column if not exists deleted_at timestamptz;
alter table public.note_columns add column if not exists deleted_at timestamptz;
alter table public.sticky_notes add column if not exists deleted_at timestamptz;
alter table public.focus_timers add column if not exists deleted_at timestamptz;

create index if not exists subjects_user_alive_idx
  on public.subjects (user_id) where deleted_at is null;
create index if not exists week_blocks_user_alive_idx
  on public.week_blocks (user_id) where deleted_at is null;
create index if not exists reminders_user_alive_idx
  on public.reminders (user_id) where deleted_at is null;
create index if not exists note_columns_user_alive_idx
  on public.note_columns (user_id) where deleted_at is null;
create index if not exists sticky_notes_user_alive_idx
  on public.sticky_notes (user_id) where deleted_at is null;
create index if not exists focus_timers_user_alive_idx
  on public.focus_timers (user_id) where deleted_at is null;
