# Snatch

A fast, single-player arcade game built with Expo and React Native, designed for iPhone first and Android too.

## Gameplay
- Move between three lanes.
- Collect gold coins to increase your score.
- Dodge red traps.
- Survive as long as possible; the pace increases as your score grows.
- Pause and resume a run at any time.

## Run locally
1. Install Node.js (LTS).
2. Run `npm install`.
3. Run `npx expo start`.
4. Scan the QR code with Expo Go, or press `i` in the Expo terminal when using a Mac with Xcode.

## iOS production build
1. Install EAS CLI: `npm install -g eas-cli`.
2. Sign in: `eas login`.
3. Configure the iOS bundle identifier in `app.json` if needed.
4. Build: `eas build --platform ios --profile production`.

The game is currently an offline, single-player experience. No account or multiplayer connection is required.