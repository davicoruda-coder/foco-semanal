-- Contas novas começam sem matérias, blocos nem colunas de lembretes.
-- Rode no SQL Editor do Supabase.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
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
