-- The public mobile client only needs column-scoped reads and inserts.
-- Revoke table-wide privileges (notably TRUNCATE) that bypass row-level security.
revoke all privileges on table public.leaderboard_scores from anon, authenticated;

grant select (display_name, score, run_seconds, game_date, created_at)
  on table public.leaderboard_scores to anon, authenticated;

grant insert (player_id, display_name, score, run_seconds, game_date)
  on table public.leaderboard_scores to anon, authenticated;
