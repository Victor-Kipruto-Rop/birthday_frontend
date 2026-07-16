# A Celebration, Just for You — Premium Birthday Website

A luxurious, animated birthday microsite built with plain HTML, CSS, and JavaScript. No build step, no framework, no dependencies beyond a Google Fonts import.

## Features

- Glassmorphism design in Midnight Navy, Deep Indigo, Royal Purple, Rose Pink, and Gold
- Animated falling petals, ambient sparkles, and floating hearts (canvas + DOM, all respecting `prefers-reduced-motion`)
- Premium loading screen tied to real asset-load completion (`window.load` + `document.fonts.ready`), not a fake timer
- Hero section with floating balloons and shimmering name treatment
- Live countdown to the birthday with flip-style digit transitions
- Birthday wishes form (`POST /api/wish`) with floating labels, validation, a character counter, honeypot spam-trap, and a 20-second resend cooldown
- Gift/payment form (`POST /api/payment`) with M-Pesa phone validation, live status polling (`GET /api/payment-status/:id`), honeypot spam-trap, and confetti on success
- Masonry gallery with lightbox preview and responsive `srcset` images
- Recent wishes wall, populated from the backend with a graceful fallback
- Floating music player with fade in/out, volume control, browser-autoplay-safe behavior (starts only after a user click), and automatic graceful degradation if the track file is missing
- Favicon (SVG + ICO + PNG + apple-touch-icon), web manifest, and a matching 404 page
- Open Graph / Twitter card meta tags with a generated social preview image
- Optional, privacy-friendly, non-blocking event tracking (page views, wish/gift submissions) — off by default
- Fully responsive, keyboard-accessible, and semantic markup throughout

## File structure

```
index.html            Markup for every section
style.css              Design tokens, layout, animations, responsive rules
script.js              Interactivity, backend calls, canvas/particle effects
404.html               Friendly not-found page, matches the site's design
favicon.svg            Primary favicon (modern browsers)
favicon.ico            Multi-resolution fallback favicon (16/32/48/64px)
favicon-16.png
favicon-32.png
apple-touch-icon.png    iOS home-screen icon (180x180)
site.webmanifest        PWA/icon metadata referenced from <head>
og-image.png            1200x630 social preview image (Open Graph / Twitter)
audio/README.md         Instructions for sourcing the background music track
README.md               This file
vercel.json             Static hosting configuration for Vercel
```

## Customizing the celebration

Open `script.js` and edit the `CONFIG` object near the top:

```js
const CONFIG = {
  celebrantName: 'Amara',                 // Shown in the hero and page title
  birthdayISO: '2026-08-14T00:00:00',     // Countdown target — use local time
  apiBaseUrl: 'https://birthday-backend-xqh2.onrender.com',
  galleryImages: [ /* { src, alt } pairs */ ],
  fallbackRecentWishes: [ /* shown if the backend has no wishes yet */ ],
};
```

To use your own photos in the gallery, replace the `src` values with your own image URLs (or local paths if you add an `/images` folder and update the links).

### Background music

The player expects a file at `audio/happy-birthday.mp3`. **This file is not included** —
see `audio/README.md` for a direct link to a free, commercially-licensed track and
instructions for dropping it in. If the file is missing, the music button automatically
greys itself out instead of showing a broken control.

### Social links

Edit `CONFIG.socialLinks` in `script.js` to point at your real GitHub, LinkedIn, and
email. The LinkedIn URL currently has a placeholder handle (`PUT-YOUR-LINKEDIN-HANDLE-HERE`)
that needs replacing before deploy.

### Spam protection

Both forms include a honeypot field (invisible to real visitors, positioned off-screen
rather than `display:none` so basic bots that skip hidden fields still fall for it) and
a minimum-time-on-form check. The wish form also has a 20-second client-side cooldown
between successful submissions. None of this requires backend changes — it's purely
front-end filtering to cut down on the most common bot traffic. It is not a substitute
for server-side validation and rate limiting.

### Analytics (optional)

`CONFIG.analyticsEndpoint` is `null` by default, meaning no tracking happens. Set it to
a backend URL to receive fire-and-forget `POST` requests shaped like
`{ event, meta, path, ts }` for `page_view`, `wish_submitted`, `gift_initiated`,
`gift_success`, and `gift_failed`. Failures are silently ignored so analytics can never
break the page.

## Backend contract

The frontend expects a backend at `apiBaseUrl` exposing:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check, also used to confirm the backend is reachable before loading recent wishes |
| POST | `/api/wish` | Body: `{ name, phone, message }` — stores a new birthday wish |
| GET | `/api/wish` | Returns `{ wishes: [{ name, message, time }] }` for the "Recent Wishes" wall (optional — falls back to sample content if unavailable) |
| POST | `/api/payment` | Body: `{ amount, phone }` — initiates an M-Pesa payment, expected to return a `transaction_id` |
| GET | `/api/payment-status/<transaction_id>` | Returns `{ status: "success" \| "failed" \| "pending" }` |
| POST | `/api/payhero/callback` | Server-to-server payment provider callback (not called from the browser) |

If a request fails or times out (15s), the UI shows a friendly inline error and never leaves the visitor without feedback.

## Running locally

No build tools required. Either:

```bash
# Option 1: open directly
open index.html

# Option 2: serve locally (recommended, avoids some browser file:// restrictions)
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Deploying to Vercel

This repo ships with a `vercel.json` for static hosting.

```bash
npm i -g vercel
vercel
```

Or connect the repository in the Vercel dashboard and deploy — no framework preset or build command is needed since this is static HTML/CSS/JS.

## Accessibility notes

- All interactive elements are reachable by keyboard, with a visible focus state
- Animations respect `prefers-reduced-motion: reduce` and fall back to instant, static states
- Form fields have associated labels and inline error messaging
- The lightbox and payment status panels are dismissible via `Escape` or a close button

## Browser support

Tested against current versions of Chrome, Firefox, Safari, Edge, and Opera. Backdrop blur (`backdrop-filter`) degrades gracefully to a solid translucent panel in browsers without support.

---

Made with ❤️ by Victor Kipruto Rop
