# BigMike

A 6-day push / pull / legs lifting app for iPhone. Plain HTML and JavaScript, no build step. Workouts and logs stay on the phone (localStorage), with a backup file in Settings.

## Install on iPhone

1. Open https://23mccabemi.github.io/WorkoutAppStandalone/ in Safari.
2. Tap Share, then Add to Home Screen, then Add.
3. Always open it from the home screen icon. Safari tabs keep separate data.

## Updating

Edit the files, bump `CACHE` in `sw.js`, and push to main. The phone picks up the new version the next time BigMike is opened (sometimes it takes a second open).

## Tests

`tests/playtest.py` runs a full play test in a phone-sized Chromium (Python Playwright). Serve the folder on port 8765 first: `python3 -m http.server 8765`.
