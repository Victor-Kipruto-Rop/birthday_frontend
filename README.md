# A Celebration, Just for You — Premium Birthday Website

A luxurious, animated birthday microsite built with plain HTML, CSS, and JavaScript. No build step, no framework, no dependencies beyond a Google Fonts import.

## Features

- Glassmorphism design in Midnight Navy, Deep Indigo, Royal Purple, Rose Pink, and Gold
- Animated falling petals, ambient sparkles, and floating hearts (canvas + DOM, all respecting `prefers-reduced-motion`)
- Premium loading screen with progress animation
- Hero section with floating balloons and shimmering name treatment
- Live countdown to the birthday with flip-style digit transitions
- Birthday wishes form (`POST /api/wish`) with floating labels, validation, and a character counter
- Gift/payment form (`POST /api/payment`) with M-Pesa phone validation, live status polling (`GET /api/payment-status/:id`), and confetti on success
- Masonry gallery with lightbox preview
- Recent wishes wall, populated from the backend with a graceful fallback
- Floating music player with fade in/out, volume control, and browser-autoplay-safe behavior (starts only after a user click)
- Fully responsive, keyboard-accessible, and semantic markup throughout

## File structure

```
index.html    Markup for every section
style.css     Design tokens, layout, animations, responsive rules
script.js     Interactivity, backend calls, canvas/particle effects
README.md     This file
vercel.json   Static hosting configuration for Vercel
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

To change the background music track, replace the `<source>` URL inside the `<audio id="bgMusic">` element in `index.html` with a track you have the rights to use.

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
