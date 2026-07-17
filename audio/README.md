# Background music track

`happy-birthday.mp3` is an original instrumental composed for this project (synthesized,
royalty-free, no third-party rights) — a short cheerful loop, not a re-recording of any
existing copyrighted song. `index.html` already points to it, so the music player works
out of the box.

## Swapping it for something else

If you'd rather use a specific track:

1. Get an MP3 you have the rights to use (e.g. a royalty-free track from
   https://pixabay.com/music/search/happy-birthday/ — free for commercial use, no
   attribution required under the Pixabay Content License).
2. Replace this file, keeping the name `happy-birthday.mp3` (or update the `<source>`
   path in `index.html` if you rename it).
3. Commit and push.

If the file is ever missing, the music player automatically greys itself out instead of
showing a broken control (see `initAudioFallback()` in `script.js`).
