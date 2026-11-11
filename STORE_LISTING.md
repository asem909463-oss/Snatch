# Snatch — App Store Listing

## Product metadata
- App name: Snatch
- Subtitle: Dodge. Dash. Beat your best.
- Primary category: Games
- Secondary category: Action
- Suggested age rating: Complete the App Store Connect age-rating questionnaire truthfully. The public leaderboard contains user-generated display names and has report/hide controls.
- Privacy policy URL: https://github.com/asem909463-oss/Snatch/blob/main/PRIVACY.md
- Support URL: https://github.com/asem909463-oss/Snatch/issues
- Marketing URL: https://github.com/asem909463-oss/Snatch

## Promotional text
One runner. Three lanes. Endless pressure. Chase your personal best, complete daily contracts and climb the global leaderboard.

## Description
Run solo. Think fast. Stay alive.

Snatch is a fast-paced, single-player lane runner where every second gets harder. Switch lanes, dodge hazards, dash through danger and collect coins as the pace ramps up.

FEATURES
- Endless three-lane arcade gameplay
- Swipe controls and quick lane movement
- Timed dash and shield protection
- Rare battery pickups that recharge your dash
- Combo scoring, Perfect Streak near-miss bonuses and up to a 5x multiplier
- Daily seeded challenge with the same run for everyone
- Perfect Streak near-miss bonuses and a personal streak record
- Daily contracts, XP ranks and achievements
- Unlockable runner skins
- Daily, weekly and all-time global leaderboards
- Shareable run results
- Offline gameplay and local progress
- No account, email, password or social sign-in

Your optional display name and age are saved locally. Neither is required to play; age is not uploaded. If you submit a leaderboard score, your display name and gameplay result are sent to the leaderboard provider. You can report inappropriate names or block a player on your device.

## Keywords
arcade,runner,endless,reflex,dash,coins,daily,challenge,score,offline,action

## App Review notes
- No account creation or sign-in is required.
- No profile details are required to play. A display name and age are optional; age stays on device.
- Gameplay works offline; leaderboard features require internet.
- Display names are filtered, reportable, and locally blockable.
- Online score deletion is handled manually through the public support issue tracker; local reset does not delete remote scores.
- Global leaderboard scores are not cheat-proof and should not be presented as verified competitive results.
- A physical iPhone test is still required before final submission.

## App Privacy questionnaire — implementation facts
Use these facts when completing App Store Connect; answer its exact questions based on the final binary:
- Display name: sent only when a player submits a score; publicly visible on the leaderboard.
- Gameplay data: submitted score, run duration and game date.
- Identifier: a random app installation ID is sent with leaderboard submissions.
- Age: stored only on the device and never uploaded.
- No email, phone number, account credentials, precise location, contacts, photos, advertising ID, or analytics events are collected by the current app.
- No advertising tracking is used.
- The leaderboard data is stored by Supabase. Review Apple's current definitions to decide whether each item is linked to the user/device before selecting the final privacy-label options.
