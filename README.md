# Happy Birthday, Rop — Personal Birthday Website

A luxurious, animated birthday microsite built with plain HTML, CSS, and JavaScript. No build step, no framework, no dependencies beyond a Google Fonts import.

## Features

- Glassmorphism design in Deep Onyx, Spring Green, and Orange-Yellow, with monospace terminal-style section labels
- Profile photo centered at the top of the hero, with a soft glowing ring
- Animated falling petals, ambient sparkles, and floating hearts (canvas + DOM, all respecting `prefers-reduced-motion`)
- Premium loading screen tied to real asset-load completion (`window.load` + `document.fonts.ready`), not a fake timer
- Live countdown to the birthday with flip-style digit transitions
- "Leave a Wish" button opens a prefilled WhatsApp chat directly with Rop — no form, no backend round-trip
- Gift/payment form (`POST /api/payment`) with M-Pesa phone validation, live status polling (`GET /api/payment-status/:id`), honeypot spam-trap, and confetti on success
- Backend warm-up ping on page load and a 45s request timeout, to absorb Render free-tier cold starts without showing false failures
- Floating music player with fade in/out, volume control, browser-autoplay-safe behavior (starts only after a user click), and automatic graceful degradation if the track file is missing
- Favicon (SVG + ICO + PNG + apple-touch-icon), web manifest, and a matching 404 page
- Open Graph / Twitter card meta tags with a generated social preview image
- Optional, privacy-friendly, non-blocking event tracking (page views, gift submissions) — off by default
- Fully responsive, keyboard-accessible, and semantic markup throughout

## File structure

```
index.html            Markup for every section
style.css              Design tokens, layout, animations, responsive rules
script.js              Interactivity, backend calls, canvas/particle effects
profilepic.jpg          Hero profile photo
404.html               Friendly not-found page, matches the site's design
favicon.svg            Primary favicon (modern browsers)
favicon.ico            Multi-resolution fallback favicon (16/32/48/64px)
favicon-16.png
favicon-32.png
apple-touch-icon.png    iOS home-screen icon (180x180)
site.webmanifest        PWA/icon metadata referenced from <head>
og-image.png            1200x630 social preview image (Open Graph / Twitter)
audio/happy-birthday.mp3  Background music track
audio/README.md         Notes on the track and how to swap it
README.md               This file
```

Note: there's no `vercel.json` — it was intentionally removed. A plain static host (Vercel, Netlify, GitHub Pages, etc.) works fine without it; you just won't get the custom security headers/cache rules it used to set.

## Customizing the celebration

Open `script.js` and edit the `CONFIG` object near the top:

```js
const CONFIG = {
  celebrantName: 'Rop',
  birthdayISO: '2026-08-14T00:00:00',     // Countdown target — use local time
  apiBaseUrl: 'https://birthday-backend-s1b7.onrender.com',
  analyticsEndpoint: null,                // set to enable optional analytics
  socialLinks: [ /* GitHub, LinkedIn, Email */ ],
};
```

### The wish button

The "Leave a Wish" button is a plain link to:

```
https://wa.me/254723484552?text=<prefilled message>
```

To change the phone number or the prefilled message, edit the `href` on that button
directly in `index.html`. The message must stay URL-encoded.

### Gift amounts

The preset amount chips are hardcoded in `index.html` (`KES 200 / 500 / 1,000`). Add,
remove, or change them there — each chip just needs a `data-amount` value and label.

### Background music

The player uses `audio/happy-birthday.mp3`. See `audio/README.md` for details. If the
file is ever missing, the music button automatically greys itself out instead of
showing a broken control.

### Spam protection (gift form)

The gift form includes a honeypot field (invisible to real visitors, positioned
off-screen rather than `display:none` so basic bots that skip hidden fields still fall
for it) and a minimum-time-on-form check. This is purely front-end filtering to cut
down on the most common bot traffic — not a substitute for server-side validation and
rate limiting.

### Analytics (optional)

`CONFIG.analyticsEndpoint` is `null` by default, meaning no tracking happens. Set it to
a backend URL to receive fire-and-forget `POST` requests shaped like
`{ event, meta, path, ts }` for `page_view`, `gift_initiated`, `gift_success`, and
`gift_failed`. Failures are silently ignored so analytics can never break the page.

## Backend contract

The frontend expects a backend at `apiBaseUrl` exposing:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check, also used to warm up the backend on page load |
| POST | `/api/payment` | Body: `{ amount, phone }` — initiates an M-Pesa payment. Response envelope: `{ success, message, data: { reference, phone, amount } }` — `data.reference` is used as the transaction id |
| GET | `/api/payment-status/<transaction_id>` | Response envelope: `{ success, message, data: { status } }` where `status` is success/completed/failed/cancelled/etc. |
| POST | `/api/payhero/callback` | Server-to-server payment provider callback (not called from the browser) |

Requests time out after 45s (long enough to absorb a Render free-tier cold start). If a
request genuinely fails, the UI shows the real error reason instead of a generic
message — see `describeRequestError()` in `script.js`.

## Running locally

No build tools required. Either:

```bash
# Option 1: open directly
open index.html

# Option 2: serve locally (recommended, avoids some browser file:// restrictions)
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Deploying

Any static host works — Vercel, Netlify, GitHub Pages, etc. Just point it at this
folder; no build command or framework preset needed.

## Accessibility notes

- All interactive elements are reachable by keyboard, with a visible focus state
- Animations respect `prefers-reduced-motion: reduce` and fall back to instant, static states
- Form fields have associated labels and inline error messaging
- The payment status panel is dismissible via a close button once it resolves

## Browser support

Tested against current versions of Chrome, Firefox, Safari, Edge, and Opera. Backdrop blur (`backdrop-filter`) degrades gracefully to a solid translucent panel in browsers without support.

---

Made with ❤️ by Victor Kipruto Rop
