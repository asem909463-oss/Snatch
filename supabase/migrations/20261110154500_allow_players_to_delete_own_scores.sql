create policy "Players can delete their own submitted scores"
  on public.leaderboard_scores for delete
  to anon, authenticated
  using (
    player_id::text = (
      select current_setting('request.headers', true)::json ->> 'x-snatch-player-id'
    )
  );
grant delete on public.leaderboard_scores to anon, authenticated;
