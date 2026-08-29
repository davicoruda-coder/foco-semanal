-- P4/P5: sticky mesmo dono, search_path seguro, fecha RPC demo para anon.
-- Owner seed: sem e-mail pessoal no schema versionado (ver SETUP.md).

-- 1) sticky_notes.column_id deve pertencer ao mesmo user_id
create or replace function public.sticky_notes_same_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.note_columns c
    where c.id = new.column_id
      and c.user_id = new.user_id
  ) then
    raise exception 'sticky_notes.column_id must belong to the same user';
  end if;
  return new;
end;
$$;

drop trigger if exists sticky_notes_same_owner_trg on public.sticky_notes;
create trigger sticky_notes_same_owner_trg
  before insert or update of column_id, user_id
  on public.sticky_notes
  for each row
  execute function public.sticky_notes_same_owner();

-- 2) handle_new_user com search_path vazio
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_email_allowed(new.email) then
    return new;
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  insert into public.session_settings (user_id) values (new.id);

  insert into public.focus_timers (user_id, name, minutes, accent, sort_order) values
    (new.id, 'Sessão', 40, 'var(--signal)', 0),
    (new.id, 'Estudo', 10, 'var(--accent-2)', 1);

  return new;
end;
$$;

-- 3) UI usa WhatsApp; RPC de pedido não precisa ser pública
revoke execute on function public.request_demo_access(text) from anon;
revoke execute on function public.request_demo_access(text) from authenticated;
revoke execute on function public.request_demo_access(text) from public;
