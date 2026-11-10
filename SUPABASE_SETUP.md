# Snatch Supabase setup

Project: snatch
Project ref: bodothdfkqunumtysdae
Region: ap-southeast-2

## No account system
Snatch does not use Supabase Auth. Player name and age remain in AsyncStorage. Age is never sent to Supabase. A random installation ID is generated locally and used to associate score submissions.

## Leaderboard
Apply migration `supabase/migrations/20261110142700_create_anonymous_leaderboard.sql`. It creates the public leaderboard table and enables RLS. Only public leaderboard fields are granted for reads. Score writes are constrained by database checks and policies.

## Client configuration
The publishable key is designed for public clients and is included in `src/lib/leaderboard.js`. Never add a Supabase secret or service_role key to the app.

## Important limitation
Anonymous client score submission can be manipulated by a determined user. Database constraints reject obviously implausible submissions but are not strong anti-cheat. Do not describe this leaderboard as cheat-proof.

## Data removal
Local reset does not delete public leaderboard records. Add a deletion workflow and a real support contact before launch.
