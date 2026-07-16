# Background music track

Place a royalty-free "Happy Birthday" instrumental here named `happy-birthday.mp3`.

I could not embed an actual audio file directly — this sandbox can't reliably fetch or
verify binary audio from external CDNs, and hotlinking a third-party URL I can't test
tends to break silently in production (dead links, rate limits, license changes).

## Recommended source

1. Go to https://pixabay.com/music/search/happy-birthday/ (free for commercial use, no
   attribution required under the Pixabay Content License).
2. Pick a track you like, download the MP3.
3. Rename it to `happy-birthday.mp3` and drop it in this folder.
4. Commit and push — `index.html` already points to `audio/happy-birthday.mp3`.

If the file is missing, the music player automatically greys itself out instead of
showing a broken control (see `initAudioFallback()` in `script.js`).
