# Snatch Supabase setup

Project: snatch
Project ref: bodothdfkqunumtysdae
Region: ap-southeast-2

## No account system
Snatch does not use Supabase Auth. Player name and age remain in AsyncStorage. Age is never sent to Supabase. A random installation ID is generated locally and used to associate score submissions.

## Leaderboard
Apply the migrations in order: `20261110151228_create_anonymous_leaderboard.sql`, `20261110151644_remove_public_score_delete_policy.sql`, then `20261110151835_allow_players_to_delete_own_scores.sql`. The table has RLS enabled. Public reads expose only display name, score, duration, date, and submission time. Players can delete scores belonging to their installation using a random local installation ID.

## Client configuration
The publishable key is designed for public clients and is included in `src/lib/leaderboard.js`. Never add a Supabase secret or service_role key to the app.

## Important limitation
Anonymous client score submission can be manipulated by a determined user. Database constraints reject obviously implausible submissions but are not strong anti-cheat. Do not describe this leaderboard as cheat-proof.

## Data removal
Local reset does not delete public leaderboard records. Add a deletion workflow and a real support contact before launch.
