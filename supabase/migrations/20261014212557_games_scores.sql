-- SPEC 06: catálogo de juegos, puntuaciones y vistas de ranking

-- Catálogo (id = slug de lib/games.ts)
create table public.games (
  id         text primary key,
  title      text not null,
  cat        text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  ranked     boolean not null default false,  -- true = el juego tiene motor y guarda en scores
  sort_order integer not null
);

-- Una fila por partida guardada
create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games (id),
  player_name text not null
    check (char_length(player_name) between 3 and 12 and player_name = upper(btrim(player_name))),
  score       integer not null check (score between 1 and 10000000),
  created_at  timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc, created_at);
create index scores_player_idx on public.scores (player_name);

alter table public.games  enable row level security;
alter table public.scores enable row level security;

-- Permisos mínimos por rol (sin UPDATE/DELETE; games es solo lectura desde la API)
grant select on public.games  to anon, authenticated;
grant select, insert on public.scores to anon, authenticated;

-- Políticas RLS
create policy "games_select_all" on public.games
  for select to anon, authenticated using (true);

create policy "scores_select_all" on public.scores
  for select to anon, authenticated using (true);

create policy "scores_insert_ranked_games" on public.scores
  for insert to anon, authenticated
  with check (exists (select 1 from public.games g where g.id = game_id and g.ranked));

-- best y plays por juego (los juegos sin partidas devuelven 0)
create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         coalesce(max(s.score), 0) as best,
         count(s.id)               as plays
  from public.games g left join public.scores s on s.game_id = g.id
  group by g.id;

-- ranking global: suma de la mejor marca de cada jugador en cada juego con ranking
create view public.global_leaderboard with (security_invoker = true) as
  select player_name,
         sum(best)    as total_score,
         count(*)     as games_played,
         max(last_at) as last_at
  from (
    select player_name, game_id, max(score) as best, max(created_at) as last_at
    from public.scores group by player_name, game_id
  ) b
  group by player_name;

grant select on public.game_stats, public.global_leaderboard to anon, authenticated;

-- Datos iniciales: las 9 entradas de lib/games.ts (solo asteroides tiene motor)
insert into public.games (id, title, cat, ranked, sort_order) values
  ('bloque-buster', 'BLOQUE BUSTER', 'ARCADE',  false, 1),
  ('caida',         'CAÍDA',         'PUZZLE',  false, 2),
  ('serpentina',    'SERPENTINA',    'ARCADE',  false, 3),
  ('gloton',        'GLOTÓN',        'ARCADE',  false, 4),
  ('invasores',     'INVASORES',     'SHOOTER', false, 5),
  ('rocas',         'ROCAS',         'SHOOTER', false, 6),
  ('asteroides',    'ASTEROIDES',    'SHOOTER', true,  7),
  ('ranaria',       'RANARIA',       'ARCADE',  false, 8),
  ('duelo-pixel',   'DUELO PIXEL',   'VERSUS',  false, 9);
