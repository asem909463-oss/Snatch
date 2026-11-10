drop policy if exists "Players can delete their own scores using their private local player id" on public.leaderboard_scores;
revoke delete on public.leaderboard_scores from anon, authenticated;
