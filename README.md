# BigMike

A 6-day push / pull / legs lifting app for iPhone. Install it from Safari: Share → Add to Home Screen.
Plain HTML and JavaScript with no build step. Data stays on the phone (localStorage), with a backup file in Settings.

To ship an update, edit the files, bump `CACHE` in `sw.js`, and push. The phone picks it up the next time BigMike is opened (sometimes it takes a second open).
