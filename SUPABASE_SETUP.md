# Snatch online leaderboard

The Snatch Supabase project is separate from Turzam AI and Uzlife.

## Design

- No Supabase Auth, accounts, email, passwords, or sign-up.
- Display name and optional age are local-only profile fields.
- Age is never uploaded.
- A random installation-specific UUID is stored locally and sent with score submissions so a player can request deletion of their own leaderboard entries.
- Only display name, score, run duration, game date, and the random player identifier are stored in the leaderboard.
- RLS is enabled. Anonymous clients can read public leaderboard columns and submit score rows subject to database constraints. They cannot update rows. Deletion requires the matching local player identifier in the `x-snatch-player-id` request header.
- The publishable key is safe to include in the app. Never add a Supabase secret/service-role key to the app or repository.

## Important limitation

This is an anonymous public leaderboard, not an identity-verified competition. A modified client can still fabricate plausible scores or impersonate display names. Database constraints reject obviously impossible values, but they are not full anti-cheat. A stronger anti-cheat design would need server-verified gameplay or platform app attestation.

## Database

Migration: `supabase/migrations/20261110142700_create_anonymous_leaderboard.sql`

The migration has been applied to the Snatch Supabase project.
