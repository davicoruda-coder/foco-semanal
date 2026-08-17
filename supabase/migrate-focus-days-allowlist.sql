-- Reforça RLS de focus_days: dono + allowlist, só para authenticated.
-- Rode no SQL Editor se a migration antiga de focus_days já foi aplicada.

drop policy if exists "focus_days_own" on public.focus_days;
create policy "focus_days_own" on public.focus_days
  for all to authenticated
  using (auth.uid() = user_id and public.current_user_has_access())
  with check (auth.uid() = user_id and public.current_user_has_access());
