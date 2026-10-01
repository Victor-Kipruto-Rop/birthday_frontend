'use strict';

/* ==========================================================================
   API BASE URL RESOLUTION
   --------------------------------------------------------------------------
   Local development runs the Flask backend on http://localhost:5000 and the
   static site on http://localhost:8080. Production uses the deployed Render
   backend.

   Resolution order (first match wins):
     1. window.BIRTHDAY_API_BASE_URL  - explicit override, set before config.js
     2. localStorage 'birthday_api'   - per-browser override while testing
     3. page served from localhost/127.0.0.1 -> local Flask backend
     4. otherwise -> the deployed production backend

   This matters for more than convenience: pointing a local test run at the
   production API would write test wishes and gift records into the real
   database. Auto-detection keeps local runs isolated by default.
   ========================================================================== */
function resolveApiBaseUrl() {
  // 1. Explicit global override.
  if (typeof window.BIRTHDAY_API_BASE_URL === 'string' && window.BIRTHDAY_API_BASE_URL) {
    return window.BIRTHDAY_API_BASE_URL.replace(/\/+$/, '');
  }

  // 2. Per-browser override (handy for testing a deployed build locally).
  try {
    const stored = window.localStorage.getItem('birthday_api');
    if (stored) return stored.replace(/\/+$/, '');
  } catch (err) {
    // Private mode / storage disabled - fall through to auto-detection.
  }

  // 3. Auto-detect a local static server.
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return 'http://localhost:5000';
  }

  // 4. Production.
  return 'https://birthday-backend-s1b7.onrender.com';
}

window.BIRTHDAY_CONFIG = {
  celebrantName: 'Limo',
  recipientName: 'Timothy Kiplimo',
  whatsappNumber: '254745365075',
  birthday: {
    title: 'Happy Birthday, Limo',
    year: 2026,
  },
  messages: {
    siteInquiry: 'Hi {recipient}, I am interested in a website like this. Can we talk?',
  },
  submissionStartISO: '2026-10-01T00:00:00+03:00',
  submissionCutoffISO: '2026-10-03T00:00:00+03:00',
  apiBaseUrl: resolveApiBaseUrl(),
  analyticsEndpoint: null,
  giftPresets: [50, 200, 500],
  wishes: [
    {
      icon: '🎉',
      title: 'Birthday Wish',
      preview: 'Wishing you an amazing birthday and a wonderful year ahead!',
      message: 'Happy Birthday! 🎉 Wishing you an amazing birthday and a wonderful year ahead!',
    },
    {
      icon: '🎂',
      title: 'Special Wish',
      preview: 'May this new chapter bring happiness, success, and beautiful moments.',
      message: 'Happy Birthday! 🎂 May this new chapter bring you happiness, success, great memories and many beautiful moments!',
    },
    {
      icon: '🥳',
      title: 'Celebration',
      preview: 'Have an incredible day and an even better year ahead!',
      message: 'Happy Birthday! 🥳 Have an incredible day and an even better year ahead!',
    },
    {
      icon: '✨',
      title: 'Personal',
      preview: 'Wishing you continued success, happiness, and many more amazing years.',
      message: 'Happy Birthday! 🎉 Wishing you continued success, happiness and many more amazing years ahead!',
    },
  ],
  gifts: [
    {
      id: 'mpesa',
      enabled: true,
      icon: '📱',
      title: 'M-Pesa',
      description: 'Send a secure M-Pesa prompt for the amount you choose.',
      action: 'checkout',
      buttonText: 'Continue with M-Pesa',
    },
    {
      id: 'gift-card',
      enabled: true,
      icon: '🎁',
      title: 'Gift or Gift Card',
      description: 'Arrange a gift card or a personal gift directly.',
      action: 'whatsapp',
      buttonText: 'Arrange a gift',
      whatsappMessage: 'Hi {recipient}! 🎁 I would love to send you a birthday gift or gift card. Let me know what would make your day. Happy Birthday! 🎉',
    },
  ],
  socialLinks: [
    { label: 'GitHub', href: 'https://github.com/Victor-Kipruto-Rop', external: true },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/victor-kipruto-rop', external: true },
    { label: 'Email', href: 'mailto:kiprutovictor39@gmail.com', external: false },
  ],
};
