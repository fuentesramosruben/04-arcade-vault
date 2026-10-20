-- SPEC 12: perfiles de usuario y puntuaciones ligadas a la cuenta

-- Perfil: una fila por usuario de auth.users
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique
    check (char_length(username) between 3 and 12 and username = upper(btrim(username))),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select on public.profiles to anon, authenticated;
grant insert on public.profiles to authenticated;

create policy "profiles_select_all" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
-- sin UPDATE ni DELETE (el nombre no se cambia en este spec)

-- Trigger: crea el perfil en el registro por correo (raw_user_meta_data.username).
-- En OAuth no hay 'username' en los metadatos: el perfil se crea desde /auth/nombre.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles (id, username)
    values (new.id, upper(btrim(new.raw_user_meta_data ->> 'username')));
  end if;
  return new;
end;
$$;

-- Solo la ejecuta el trigger: no se expone como RPC
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Scores: se liga a la cuenta (filas antiguas: user_id null, invitados anteriores a este spec)
alter table public.scores add column user_id uuid references auth.users (id);
create index scores_user_idx on public.scores (user_id);

-- El insert pasa a exigir sesión y nombre de perfil
drop policy "scores_insert_ranked_games" on public.scores;
revoke insert on public.scores from anon;
create policy "scores_insert_own_profile" on public.scores
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.games g where g.id = game_id and g.ranked)
    and player_name = (select p.username from public.profiles p where p.id = auth.uid())
  );
