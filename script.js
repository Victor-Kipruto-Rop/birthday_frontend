'use strict';

/* ==========================================================================
   CONFIG — edit these values to personalize the site
   ========================================================================== */
const CONFIG = {
  celebrantName: 'Rop',
  birthdayISO: '2026-08-14T00:00:00', // target date/time for the countdown
  apiBaseUrl: 'https://birthday-backend-s1b7.onrender.com',

  // Optional: POST { event, meta } here for lightweight, non-blocking analytics.
  // Leave as null to disable analytics calls entirely.
  analyticsEndpoint: null, // e.g. 'https://birthday-backend-s1b7.onrender.com/api/analytics'

  socialLinks: [
    { label: 'GitHub', href: 'https://github.com/Victor-Kipruto-Rop', external: true },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/victor-kipruto-rop', external: true },
    { label: 'Email', href: 'mailto:kiprutovictor39@gmail.com', external: false },
  ],

};

/* ==========================================================================
   UTILITIES
   ========================================================================== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function safeJSONParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

async function apiRequest(path, options = {}) {
  const url = `${CONFIG.apiBaseUrl}${path}`;
  const controller = new AbortController();
  // Render's free tier spins down idle services; the first request after a
  // period of inactivity can take 30–50s to cold-start. 15s was too tight
  // and made every "first" submission look like a failure. Individual
  // callers can override this via options.timeoutMs where a shorter,
  // more specific limit makes sense (e.g. "sending the prompt" is capped
  // at 30s so a stuck request fails fast instead of leaving the visitor
  // staring at a spinner for the full 45s).
  const { timeoutMs = 45000, ...fetchOptions } = options;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...fetchOptions,
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// Pulls the first matching key from a response object, since backend field
// naming can vary (snake_case vs camelCase) without a confirmed contract.
function pickField(obj, keys) {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

// Turns a thrown error into a message that's safe to show a visitor.
// Network-level failures (timeout, unreachable, CORS, DNS, etc.) never reveal
// what actually went wrong — that's noise or confusing to a non-technical
// visitor, and "the server is unreachable" is not something they can act on
// anyway. Real validation errors from the backend (e.g. "invalid phone
// number") still come through as-is since those ARE actionable.
function describeRequestError(err) {
  if (err && err.name === 'AbortError') {
    return 'Something went wrong. Please try again later.';
  }
  if (err instanceof TypeError) {
    return 'Something went wrong. Please try again later.';
  }
  if (err && err.message) {
    return err.message;
  }
  return 'Something went wrong. Please try again later.';
}

/* ==========================================================================
   ANALYTICS (lightweight, privacy-friendly, opt-in via CONFIG.analyticsEndpoint)
   ========================================================================== */
function trackEvent(event, meta = {}) {
  if (!CONFIG.analyticsEndpoint) return;
  // Fire-and-forget: never blocks the UI, never throws to the caller.
  fetch(CONFIG.analyticsEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, meta, path: window.location.pathname, ts: Date.now() }),
    keepalive: true,
  }).catch(() => { /* analytics failures are silently ignored */ });
}

/* ==========================================================================
   LOADER
   ========================================================================== */
function initLoader() {
  const loader = $('#loader');
  const fill = $('#loaderBarFill');
  const MIN_DISPLAY_MS = 1200;
  const startTime = performance.now();
  document.body.style.overflow = 'hidden';

  // Creep the bar toward 85% while real assets are still loading, so it never
  // looks stalled even if the network is slow.
  let creepProgress = 0;
  const creepInterval = setInterval(() => {
    creepProgress = Math.min(85, creepProgress + Math.random() * 10);
    fill.style.width = `${creepProgress}%`;
  }, 220);

  const windowLoaded = new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve, { once: true });
  });
  const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

  Promise.all([windowLoaded, fontsReady]).then(() => {
    clearInterval(creepInterval);
    const elapsed = performance.now() - startTime;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    fill.style.width = '100%';
    setTimeout(() => {
      loader.classList.add('is-hidden');
      document.body.style.overflow = '';
      startPostLoadAnimations();
    }, remaining + 250);
  });
}

function startPostLoadAnimations() {
  document.body.style.overflow = '';
  initRevealAnimations();
}

/* ==========================================================================
   SCROLL REVEAL (Intersection Observer)
   ========================================================================== */
function initRevealAnimations() {
  const targets = $$('.reveal-up');
  if (!('IntersectionObserver' in window) || prefersReducedMotion) {
    targets.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay;
        if (delay) entry.target.style.setProperty('--delay', delay);
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(el => observer.observe(el));
}

/* ==========================================================================
   SCROLL PROGRESS + BACK TO TOP + SCROLL INDICATOR
   ========================================================================== */
function initScrollUI() {
  const progressBar = $('#scrollProgress');
  const backToTop = $('#backToTop');

  function onScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = `${pct}%`;
    backToTop.classList.toggle('is-visible', scrollTop > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  $('#scrollIndicator')?.addEventListener('click', () => {
    $('#countdown')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
}

/* ==========================================================================
   FALLING PETALS (canvas)
   ========================================================================== */
function initPetals() {
  const canvas = $('#petalsCanvas');
  if (!canvas || prefersReducedMotion) return;
  const ctx = canvas.getContext('2d');
  let width, height, petals = [];
  const PETAL_COUNT = window.innerWidth < 640 ? 14 : 26;
  const colors = ['#00E676', '#FFB020', '#FF8800', '#6EE7B7', '#FFE29A'];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function makePetal(initial) {
    return {
      x: Math.random() * width,
      y: initial ? Math.random() * height : -20,
      size: 6 + Math.random() * 10,
      speedY: 0.4 + Math.random() * 1.1,
      speedX: (Math.random() - 0.5) * 0.6,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 2,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.01 + Math.random() * 0.02,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 0.5 + Math.random() * 0.4,
    };
  }

  for (let i = 0; i < PETAL_COUNT; i++) petals.push(makePetal(true));

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    petals.forEach(p => {
      p.sway += p.swaySpeed;
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.sway) * 0.6;
      p.rotation += p.rotationSpeed;
      if (p.y > height + 20) Object.assign(p, makePetal(false));
      drawPetal(p);
    });
    requestAnimationFrame(animate);
  }
  animate();
}

/* ==========================================================================
   SPARKLES + FLOATING HEARTS (ambient DOM particles)
   ========================================================================== */
function initSparkles() {
  const layer = $('#sparkles');
  if (!layer || prefersReducedMotion) return;
  const COUNT = window.innerWidth < 640 ? 12 : 24;
  for (let i = 0; i < COUNT; i++) {
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.animationDelay = `${Math.random() * 3}s`;
    s.style.animationDuration = `${2 + Math.random() * 2.5}s`;
    layer.appendChild(s);
  }
}

function initFloatingHearts() {
  const layer = $('#hearts');
  if (!layer || prefersReducedMotion) return;
  function spawnHeart() {
    const h = document.createElement('span');
    h.className = 'float-heart';
    h.textContent = '♥';
    h.style.left = `${Math.random() * 100}%`;
    h.style.fontSize = `${14 + Math.random() * 14}px`;
    const duration = 8 + Math.random() * 6;
    h.style.animationDuration = `${duration}s`;
    layer.appendChild(h);
    setTimeout(() => h.remove(), duration * 1000 + 500);
  }
  setInterval(spawnHeart, 3500);
  spawnHeart();
}

/* ==========================================================================
   MUSIC PLAYER
   ========================================================================== */
function initMusicPlayer() {
  const player = $('#musicPlayer');
  const toggle = $('#musicToggle');
  const audio = $('#bgMusic');
  const volumeSlider = $('#volumeSlider');
  let hasInteracted = false;

  audio.volume = Number(volumeSlider.value) / 100;

  function fadeAudio(target, duration = 600) {
    const start = audio.volume;
    const startTime = performance.now();
    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      audio.volume = start + (target - start) * t;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function playMusic() {
    audio.volume = 0;
    audio.play().then(() => {
      fadeAudio(Number(volumeSlider.value) / 100);
      toggle.classList.add('is-playing');
      toggle.setAttribute('aria-pressed', 'true');
      toggle.setAttribute('aria-label', 'Pause birthday music');
    }).catch(() => {
      /* Autoplay may still be blocked; user can retry via the button */
    });
  }

  function pauseMusic() {
    fadeAudio(0, 400);
    setTimeout(() => audio.pause(), 420);
    toggle.classList.remove('is-playing');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Play birthday music');
  }

  toggle.addEventListener('click', () => {
    hasInteracted = true;
    player.classList.add('is-active');
    if (audio.paused) playMusic(); else pauseMusic();
  });

  volumeSlider.addEventListener('input', () => {
    audio.volume = Number(volumeSlider.value) / 100;
  });

  // Attempt a muted-friendly first interaction pattern: only start on explicit click,
  // per browser autoplay policy — no auto-start on load.
  document.addEventListener('click', () => { hasInteracted = true; }, { once: true, capture: true });
}

/* ==========================================================================
   COUNTDOWN
   ========================================================================== */
function initCountdown() {
  const target = new Date(CONFIG.birthdayISO).getTime();
  const els = {
    days: $('#cd-days'), hours: $('#cd-hours'), minutes: $('#cd-minutes'), seconds: $('#cd-seconds'),
  };
  const caption = $('#countdownCaption');
  let previous = {};

  function pad(n) { return String(n).padStart(2, '0'); }

  function update() {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      els.days.textContent = '00';
      els.hours.textContent = '00';
      els.minutes.textContent = '00';
      els.seconds.textContent = '00';
      caption.textContent = `The celebration has begun — happy birthday, ${CONFIG.celebrantName}!`;
      clearInterval(timer);
      return;
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const values = { days: pad(days), hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
    Object.entries(values).forEach(([key, val]) => {
      if (previous[key] !== val) {
        els[key].textContent = val;
        if (!prefersReducedMotion) {
          els[key].classList.remove('is-flipping');
          void els[key].offsetWidth;
          els[key].classList.add('is-flipping');
        }
      }
    });
    previous = values;
    caption.textContent = `Every second brings us closer to celebrating ${CONFIG.celebrantName}.`;
  }

  update();
  const timer = setInterval(update, 1000);
}

/* ==========================================================================
   MAGNETIC BUTTONS
   ========================================================================== */
function initMagneticButtons() {
  if (prefersReducedMotion) return;
  $$('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.3}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

/* ==========================================================================
   FORM VALIDATION HELPERS
   ========================================================================== */
function setFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId).closest('.field');
  const errorEl = document.getElementById(errorId);
  if (message) {
    field.classList.add('has-error');
    errorEl.textContent = message;
  } else {
    field.classList.remove('has-error');
    errorEl.textContent = '';
  }
}

function isValidPhone(value) {
  const cleaned = value.replace(/\s+/g, '');
  return /^(?:\+254|254|0)?7\d{8}$/.test(cleaned) || /^(?:\+254|254|0)?1\d{8}$/.test(cleaned);
}

function normalizePhone(value) {
  let cleaned = value.replace(/\s+/g, '');
  if (cleaned.startsWith('0')) cleaned = `254${cleaned.slice(1)}`;
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  return cleaned;
}

/* ==========================================================================
   SPAM PROTECTION
   Two lightweight, no-backend-changes-required signals:
   1. Honeypot field — real visitors never see or fill it, most bots do.
   2. Minimum time-on-form — a submission faster than a human could type
      is treated as automated.
   ========================================================================== */
const formRenderTimes = new WeakMap();
function markFormRendered(form) { formRenderTimes.set(form, Date.now()); }
function isLikelyBot(form, honeypotInput) {
  if (honeypotInput && honeypotInput.value.trim() !== '') return true;
  const renderedAt = formRenderTimes.get(form);
  if (renderedAt && Date.now() - renderedAt < 1500) return true;
  return false;
}

/* ==========================================================================
   GIFT / PAYMENT FORM
   ========================================================================== */
function initGiftForm() {
  const form = $('#giftForm');
  if (!form) return;
  const amountInput = $('#giftAmount');
  const phoneInput = $('#giftPhone');
  const submitBtn = $('#giftSubmitBtn');
  const chips = $$('.amount-chip');
  const honeypot = $('#giftWebsite');
  markFormRendered(form);

  // Second chance to warm the backend: if the page-load ping happened to
  // fail (or the visitor waited a long time before interacting), this
  // gives it another shot well before the real submission.
  form.addEventListener('focusin', warmUpBackend, { once: true });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('is-selected'));
      chip.classList.add('is-selected');
      amountInput.value = chip.dataset.amount;
      amountInput.dispatchEvent(new Event('input'));
    });
  });
  amountInput.addEventListener('input', () => {
    chips.forEach(c => c.classList.toggle('is-selected', c.dataset.amount === amountInput.value));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isLikelyBot(form, honeypot)) return;

    let valid = true;
    const amount = Number(amountInput.value);
    if (!amount || amount < 10) {
      setFieldError('giftAmount', 'giftAmountError', 'Enter an amount of at least KES 10.');
      valid = false;
    } else setFieldError('giftAmount', 'giftAmountError', '');

    if (!isValidPhone(phoneInput.value.trim())) {
      setFieldError('giftPhone', 'giftPhoneError', 'Enter a valid M-Pesa phone number.');
      valid = false;
    } else setFieldError('giftPhone', 'giftPhoneError', '');

    if (!valid) return;

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    showPaymentStatus('preparing', 'Preparing payment...');
    trackEvent('gift_initiated', { amount });

    const payload = { amount, phone: normalizePhone(phoneInput.value.trim()) };

    // If the initial request takes a while (cold backend, slow network),
    // update the message instead of leaving a static line up for up to 45s
    // with no sign anything is happening — that stillness is what reads as
    // "frozen" or "slow" even when the request is actually progressing fine.
    const slowHint = setTimeout(() => {
      showPaymentStatus('preparing', 'Still preparing your payment — almost there...');
    }, 6000);

    try {
      // Capped at 30s specifically for sending the M-Pesa prompt: if it
      // hasn't gone out by then, fail fast and let the visitor retry
      // rather than leaving them staring at a spinner indefinitely.
      const initRes = await apiRequest('/api/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: 30000,
      });
      clearTimeout(slowHint);
      // Response envelope is { success, message, data: { reference, phone, amount } }.
      const transactionId = initRes?.data?.reference;

      showPaymentStatus('waiting', 'Waiting for confirmation on your phone...');

      if (transactionId) {
        await pollPaymentStatus(transactionId);
      } else {
        // No transaction id returned — treat the initial request as sufficient confirmation.
        showPaymentStatus('success', 'Payment request sent. Thank you for your gift!');
        launchConfetti(60);
        trackEvent('gift_success', { amount });
      }
      form.reset();
      chips.forEach(c => c.classList.remove('is-selected'));
    } catch (err) {
      clearTimeout(slowHint);
      console.error('Payment initiation failed:', err);
      const message = err?.name === 'AbortError'
        ? 'Sending the M-Pesa prompt timed out. Please try again.'
        : describeRequestError(err);
      showPaymentStatus('failed', message);
      trackEvent('gift_failed', { amount });
    } finally {
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
    }
  });
}

// Rotates the "waiting for confirmation" message as polling goes on, so a
// visitor sees continuous signs of progress during what can legitimately be
// up to a minute of waiting for an M-Pesa STK push to be answered, instead
// of one static line that makes the whole thing look stuck.
function waitingMessageFor(attempts) {
  if (attempts < 3) return 'Waiting for confirmation on your phone...';
  if (attempts < 7) return 'Still waiting — check your phone for the M-Pesa prompt.';
  if (attempts < 13) return 'This can take a little longer sometimes — hang tight.';
  return 'Still working on it — thanks for your patience.';
}

// Tracks the transaction currently being polled so the manual "Check again"
// button can re-check it on demand after the automatic window gives up.
let lastPolledTransactionId = null;

async function pollPaymentStatus(transactionId, attempts = 0) {
  // OPTIMIZED: Poll every 1 second instead of 3 seconds (3x faster confirmation)
  // ~60 seconds total (1s * 60). M-Pesa STK confirmations are usually within 5-10 seconds.
  // This gives fast feedback while maintaining 60-second timeout for edge cases.
  const MAX_ATTEMPTS = 60;
  const INTERVAL_MS = 1000;  // Changed from 3000ms to 1000ms - 3x faster!
  lastPolledTransactionId = transactionId;

  if (attempts >= MAX_ATTEMPTS) {
    // Genuinely unknown at this point — NOT a failure. The payment may still
    // complete on M-Pesa's side; we just stopped auto-checking. Let the
    // visitor manually check again instead of telling them it failed.
    showPaymentStatus('pending', "Still processing. If you approved the M-Pesa prompt, your gift should go through shortly — tap \u201cCheck again\u201d in a moment.");
    return;
  }

  // Show countdown timer for better UX: "Waiting... (1s)", "(2s)", etc.
  const countdownMsg = attempts > 0 ? `${waitingMessageFor(attempts)} (${attempts}s)` : waitingMessageFor(attempts);
  showPaymentStatus('waiting', countdownMsg);

  try {
    const res = await apiRequest(`/api/payment-status/${encodeURIComponent(transactionId)}`);
    
    // DEBUG: Log the full response to help diagnose issues
    console.log(`[Payment Status Poll #${attempts + 1}] Response:`, res);
    
    // Response envelope is { success, message, data: { status, reference, amount, ... } }.
    const rawStatus = res?.data?.status;
    const status = String(rawStatus ?? '').toLowerCase().trim();
    
    console.log(`[Payment Status Poll #${attempts + 1}] Raw Status: "${rawStatus}", Normalized: "${status}"`);

    // Statuses indicating success
    const successStates = ['success', 'completed', 'complete', 'paid', '0'];
    
    // Statuses indicating failure
    const failedStates = ['failed', 'cancelled', 'canceled', 'declined', 'error'];
    
    // CRITICAL: Check if transaction has been finalized_at timestamp (means it's complete)
    const finalizedAt = res?.data?.finalized_at;
    const hasBeenFinalized = finalizedAt !== null && finalizedAt !== undefined;
    
    console.log(`[Payment Status Poll #${attempts + 1}] Finalized: ${hasBeenFinalized}, Amount: ${res?.data?.amount}`);

    // SUCCESS CHECK 1: Status is explicitly "success"
    if (successStates.includes(status)) {
      console.log(`✅ [Payment Status Poll #${attempts + 1}] SUCCESS: Status is "${status}"`);
      showPaymentStatus('success', 'Payment successful. Thank you for your gift!');
      launchConfetti(60);
      trackEvent('gift_success');
      return;
    }
    
    // SUCCESS CHECK 2: Transaction was finalized AND amount exists (alternative success indicator)
    if (hasBeenFinalized && res?.data?.amount) {
      console.log(`✅ [Payment Status Poll #${attempts + 1}] SUCCESS: Finalized with amount ${res?.data?.amount}`);
      showPaymentStatus('success', 'Payment successful. Thank you for your gift!');
      launchConfetti(60);
      trackEvent('gift_success');
      return;
    }

    // FAILURE CHECK: Status is explicitly failed
    if (failedStates.includes(status)) {
      console.log(`❌ [Payment Status Poll #${attempts + 1}] FAILED: Status is "${status}"`);
      showPaymentStatus('failed', 'Payment failed. Please try again.');
      trackEvent('gift_failed');
      return;
    }
    
    // PENDING: Keep polling
    console.log(`⏳ [Payment Status Poll #${attempts + 1}] Still pending, will retry...`);
    await new Promise(r => setTimeout(r, INTERVAL_MS));
    return pollPaymentStatus(transactionId, attempts + 1);
    
  } catch (err) {
    // Network error - keep retrying but show countdown feedback
    console.log(`[Payment Status Poll #${attempts + 1}] Error:`, err.message);
    await new Promise(r => setTimeout(r, INTERVAL_MS));
    return pollPaymentStatus(transactionId, attempts + 1);
  }
}

// One-off check for the manual "Check again" button — does not restart the
// full automatic polling loop, just asks once and reflects whatever comes
// back, including "still pending" so the visitor can check again later.
async function recheckPaymentStatus() {
  if (!lastPolledTransactionId) return;
  const recheckBtn = $('#paymentRecheck');
  recheckBtn.disabled = true;
  showPaymentStatus('waiting', 'Checking...');

  try {
    const res = await apiRequest(`/api/payment-status/${encodeURIComponent(lastPolledTransactionId)}`);
    const rawStatus = res?.data?.status;
    const status = String(rawStatus ?? '').toLowerCase();
    const successStates = ['success', 'completed', 'complete', '0'];
    const failedStates = ['failed', 'cancelled', 'canceled', 'error'];

    if (successStates.includes(status)) {
      showPaymentStatus('success', 'Payment successful. Thank you for your gift!');
      launchConfetti(60);
      trackEvent('gift_success');
    } else if (failedStates.includes(status)) {
      showPaymentStatus('failed', 'Payment failed. Please try again.');
      trackEvent('gift_failed');
    } else {
      showPaymentStatus('pending', "Still processing — no confirmation yet. You're welcome to check again in a moment.");
    }
  } catch {
    showPaymentStatus('pending', "Couldn't check just now — please try again in a moment.");
  } finally {
    recheckBtn.disabled = false;
  }
}

function showPaymentStatus(state, message) {
  const statusEl = $('#paymentStatus');
  const textEl = $('#paymentText');
  const iconEl = $('#paymentIcon');

  statusEl.classList.remove('state-success', 'state-failed', 'state-pending', 'can-close', 'can-recheck');
  statusEl.classList.add('is-visible');
  textEl.textContent = message;

  if (state === 'success') {
    statusEl.classList.add('state-success', 'can-close');
    iconEl.textContent = '✓';
  } else if (state === 'failed') {
    statusEl.classList.add('state-failed', 'can-close');
    iconEl.textContent = '✕';
  } else if (state === 'pending') {
    statusEl.classList.add('state-pending', 'can-close', 'can-recheck');
    iconEl.textContent = '⏳';
  }
}

function initPaymentRecheck() {
  $('#paymentRecheck')?.addEventListener('click', recheckPaymentStatus);
}

function initPaymentStatusClose() {
  $('#paymentClose')?.addEventListener('click', () => {
    $('#paymentStatus').classList.remove('is-visible');
  });
}

/* ==========================================================================
   CONFETTI
   ========================================================================== */
function launchConfetti(count = 40) {
  if (prefersReducedMotion) return;
  const root = $('#confettiRoot');
  const colors = ['#00E676', '#FFB020', '#FF8800', '#FFFFFF', '#6EE7B7'];

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = 6 + Math.random() * 8;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.4}px`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${2.5 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    root.appendChild(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}

/* ==========================================================================
   HERO NAME + PERSONALIZATION
   ========================================================================== */
function applyPersonalization() {
  const nameEl = $('#celebrantName');
  if (nameEl) nameEl.textContent = CONFIG.celebrantName;
  document.title = `Happy Birthday, ${CONFIG.celebrantName}`;
}

function initFooterLinks() {
  const container = $('#footerLinks');
  if (!container) return;
  CONFIG.socialLinks.forEach(link => {
    const a = document.createElement('a');
    a.href = link.href;
    a.className = 'footer-link';
    a.textContent = link.label;
    a.setAttribute('aria-label', link.label);
    if (link.external) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    container.appendChild(a);
  });
}

/* ==========================================================================
   AUDIO FALLBACK
   If the configured track fails to load (e.g. the file hasn't been added
   yet), disable the music player instead of leaving a broken control.
   ========================================================================== */
function initAudioFallback() {
  const audio = $('#bgMusic');
  const player = $('#musicPlayer');
  if (!audio || !player) return;
  audio.addEventListener('error', () => {
    player.setAttribute('title', 'Music track not found — add audio/happy-birthday.mp3');
    player.style.opacity = '0.4';
    player.style.pointerEvents = 'none';
  }, true);
}

/* ==========================================================================
   BACKEND WARM-UP
   Render's free tier spins the backend down after inactivity. Ping it as
   soon as the page loads (well before anyone finishes filling out a form)
   so the real submission doesn't eat a 30–50s cold-start delay.
   ========================================================================== */
let backendWarmed = false;
function warmUpBackend() {
  if (backendWarmed) return;
  backendWarmed = true;
  apiRequest('/api/health').catch(() => {
    // Ignore — this is best-effort. If it fails, the real request will
    // still work, just with the usual cold-start wait built into its timeout.
    backendWarmed = false; // allow a retry on the next trigger
  });
}

/* ==========================================================================
   INIT
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  applyPersonalization();
  initFooterLinks();
  initLoader();
  initPetals();
  initSparkles();
  initFloatingHearts();
  initMusicPlayer();
  initAudioFallback();
  initScrollUI();
  initCountdown();
  initMagneticButtons();
  initGiftForm();
  initPaymentStatusClose();
  initPaymentRecheck();
  warmUpBackend();
  trackEvent('page_view');
});

