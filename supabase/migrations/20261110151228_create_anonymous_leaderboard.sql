create table public.leaderboard_scores (
  id bigint generated always as identity primary key,
  player_id uuid not null,
  display_name text not null check (char_length(display_name) between 2 and 18),
  score integer not null check (score between 0 and 500000),
  run_seconds integer not null check (run_seconds between 1 and 1800),
  game_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint leaderboard_score_plausibility check (score <= run_seconds * 250 + 500),
  constraint leaderboard_date_window check (game_date between current_date - 1 and current_date + 1)
);

create index leaderboard_scores_daily_idx
  on public.leaderboard_scores (game_date, score desc, created_at asc);

create index leaderboard_scores_player_idx
  on public.leaderboard_scores (player_id, created_at desc);

alter table public.leaderboard_scores enable row level security;

create policy "Anyone can read public leaderboard scores"
  on public.leaderboard_scores for select
  to anon, authenticated
  using (true);

create policy "Players can submit score entries"
  on public.leaderboard_scores for insert
  to anon, authenticated
  with check (
    char_length(display_name) between 2 and 18
    and score between 0 and 500000
    and run_seconds between 1 and 1800
    and score <= run_seconds * 250 + 500
    and game_date between current_date - 1 and current_date + 1
  );

create policy "Players can delete their own scores using their private local player id"
  on public.leaderboard_scores for delete
  to anon, authenticated
  using (
    player_id::text = (
      current_setting('request.headers', true)::json ->> 'x-snatch-player-id'
    )
  );

grant select (display_name, score, run_seconds, game_date, created_at)
  on public.leaderboard_scores to anon, authenticated;
grant insert (player_id, display_name, score, run_seconds, game_date)
  on public.leaderboard_scores to anon, authenticated;
grant delete on public.leaderboard_scores to anon, authenticated;
