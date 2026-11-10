# Snatch

Snatch is an offline-first, single-player arcade game built with **Expo + React Native**. It is designed for iPhone first and Android as well.

## The game loop
- Survive an endless three-lane run.
- Swipe left/right or use the lane buttons to move.
- Collect coins, build combos and climb up to a 5x score multiplier.
- Dodge hazards; use the timed dash to pass through danger.
- Collect shields for an extra layer of protection.
- Speed and spawn pressure increase as your score and level rise.

## Reasons to return
- A daily seeded run: every player gets the same deterministic obstacle sequence for that calendar day.
- Daily contract: collect 35 coins, score 500 in a run, and dodge 5 hazards.
- Claim 75 coins + 100 XP after completing the contract.
- XP ranks, a daily streak, six achievements, personal-best history and unlockable runner skins.
- Five skins, bought with coins earned through play.

## Tech
- Expo SDK 54 / React Native 0.81
- AsyncStorage for local progression and settings
- Expo Haptics for tactile feedback
- Pure deterministic game engine separated from UI
- GitHub Actions runs the game-logic tests on pushes and pull requests

## Run locally
1. Install Node.js 22 LTS.
2. Clone this repository and run `npm install`.
3. Run `npx expo start`.
4. Scan the QR code with Expo Go, or open an iOS simulator from a Mac.

## Tests
Run `npm test` to execute deterministic engine and progression tests.

## iOS production build
1. Install EAS CLI: `npm install -g eas-cli`.
2. Sign in: `eas login`.
3. Confirm the bundle identifier and Apple signing credentials.
4. Build: `eas build --platform ios --profile production`.

## Honest current limitations
- Player setup asks only for a display name and age. There is no account, email, password, or social sign-in. Both fields stay on the device; age is never uploaded.
- Global daily leaderboard uses Supabase without user accounts. Only display name, score, run duration, game date, and a random installation ID are sent when a player submits a score.
- The leaderboard has basic database validation, not cheat-proof server verification. A determined player may manipulate client-submitted scores.
- Settings include Privacy Policy, Terms and Conditions, Cookie Policy, app review, profile clearing, and a full local-data reset. Online scores can be deleted separately from settings for the current installation.
- Privacy, terms, and cookie documents are in `PRIVACY.md`, `TERMS.md`, and `COOKIES.md`.
- This repository has not yet been verified on a physical iPhone or through an App Store build.
