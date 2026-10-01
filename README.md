# Happy Birthday, Limo — Personal Birthday Website

A luxurious, animated birthday microsite built with plain HTML, CSS, and JavaScript. No build step, no framework, no dependencies beyond a Google Fonts import.

## Features

- Glassmorphism design in deep emerald, mint, and gold, with monospace terminal-style section labels
- Profile photo centered at the top of the hero, with a soft glowing ring
- Animated falling petals, ambient sparkles, and floating hearts (canvas + DOM, all respecting `prefers-reduced-motion`)
- Premium loading screen tied to real asset-load completion (`window.load` + `document.fonts.ready`), not a fake timer
- Live countdown to the submission-window close: submissions are open now through Saturday, October 3 at 12:00 AM East Africa Time
- Configurable birthday-wish cards that open WhatsApp with a pre-filled message; the visitor reviews and sends it in WhatsApp
- Optional sender-name field for wishes; no phone number, account, or wish text is collected by the website
- Configurable gift-method cards, with M-Pesa checkout handled by the secure backend and other methods arranged via WhatsApp
- Gift/payment form (`POST /api/payment`) with M-Pesa phone validation, live status polling (`GET /api/payment-status/:id`), honeypot spam-trap, and confetti on success
- Backend warm-up ping on page load and a 45s request timeout, to absorb Render free-tier cold starts without showing false failures
- Floating music player with fade in/out, volume control, explicit user-triggered playback, and automatic graceful degradation if the track file is missing
- Favicon (SVG + ICO + PNG + apple-touch-icon), web manifest, and a matching 404 page
- Open Graph / Twitter card meta tags with a generated social preview image
- Optional, privacy-friendly, non-blocking event tracking (page views, gift submissions) — off by default
- Fully responsive, keyboard-accessible, and semantic markup throughout

## File structure

```
index.html            Markup for every section
config.js              Recipient, WhatsApp, birthday, wishes, gift methods, and presets
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

Open `config.js` to personalize the recipient, WhatsApp number, birthday, wish messages, gift methods, amount presets, and social links:

```js
window.BIRTHDAY_CONFIG = {
  celebrantName: 'Limo',
  recipientName: 'Timothy Kiplimo',
  whatsappNumber: '254745365075',
  birthday: { title: 'Happy Birthday, Limo', year: 2026 },
  wishes: [ /* predefined WhatsApp messages */ ],
  gifts: [ /* enabled gift methods */ ],
  apiBaseUrl: 'https://birthday-backend-s1b7.onrender.com',
  giftPresets: [50, 200, 500],
};
```

### API base URL resolution

`config.js` calls `resolveApiBaseUrl()` instead of hardcoding one host, so the same
build works locally and in production. First match wins:

1. `window.BIRTHDAY_API_BASE_URL` — explicit override, set before `config.js` loads
2. `localStorage.getItem('birthday_api')` — per-browser override
3. Served from `localhost` / `127.0.0.1` → `http://localhost:5000` (local Flask backend)
4. Anything else → the deployed production backend

Rule 3 is deliberate: without it, running the site locally would silently send test
wishes and gift records to the **production** database.

To point a deployed build at a different backend, set the override in the console:

```js
localStorage.setItem('birthday_api', 'http://localhost:5000');
location.reload();
```

### The wish form

Wishes are not submitted to the backend. Visitors choose one of the predefined
messages, optionally add a name, then review and send it in WhatsApp. The website
does not claim that a wish was delivered. The shared submission window is still
enforced; configure `submissionStartISO` and `submissionCutoffISO` in `config.js`
and the backend environment using `SUBMISSION_START_ISO` and `SUBMISSION_CUTOFF_ISO`.

### Gift amounts

Edit `giftPresets` in `config.js` to add, remove, or change the amount chips.
Gift methods are also configured there. Do not put payment-provider credentials
or private payment secrets in frontend configuration; M-Pesa checkout remains
server-side.

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
| GET | `/api/availability` | Returns `start_iso`, `cutoff_iso`, and whether submissions are currently open |
| POST | `/api/payment` | Body: `{ amount, phone }` — initiates an M-Pesa payment. Response envelope: `{ success, message, data: { reference, amount } }` — `data.reference` is used as the transaction id |
| GET | `/api/payment-status/<transaction_id>` | Response envelope: `{ success, message, data: { status } }` where `status` is success/completed/failed/cancelled/etc. |
| POST | `/api/payhero/callback` | Server-to-server payment provider callback (not called from the browser) |

Payment initiation requests time out after 45s (long enough to absorb a Render free-tier cold start). If a
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
