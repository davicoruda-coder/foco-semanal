-- Protege linhas role=owner em access_allowlist:
-- owners podem gerir members; não podem apagar/alterar outros owners
-- nem criar/promover owners pela API (só via SQL/service role).

drop policy if exists "access_allowlist_admin" on public.access_allowlist;

drop policy if exists "access_allowlist_select" on public.access_allowlist;
drop policy if exists "access_allowlist_insert" on public.access_allowlist;
drop policy if exists "access_allowlist_update" on public.access_allowlist;
drop policy if exists "access_allowlist_delete" on public.access_allowlist;

create policy "access_allowlist_select" on public.access_allowlist
  for select to authenticated
  using (public.current_user_is_access_admin());

create policy "access_allowlist_insert" on public.access_allowlist
  for insert to authenticated
  with check (
    public.current_user_is_access_admin()
    and role = 'member'
  );

create policy "access_allowlist_update" on public.access_allowlist
  for update to authenticated
  using (
    public.current_user_is_access_admin()
    and role = 'member'
  )
  with check (
    public.current_user_is_access_admin()
    and role = 'member'
  );

create policy "access_allowlist_delete" on public.access_allowlist
  for delete to authenticated
  using (
    public.current_user_is_access_admin()
    and role = 'member'
  );
