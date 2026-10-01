'use strict';

const CONFIG = window.BIRTHDAY_CONFIG;

/* ==========================================================================
   UTILITIES
   ========================================================================== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PENDING_PAYMENT_KEY = 'birthday_pending_payment';

function safeJSONParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

async function apiRequest(path, options = {}) {
  const url = `${CONFIG.apiBaseUrl}${path}`;
  const controller = new AbortController();
  // Callers can override this timeout for payment operations so a stalled
  // request fails fast instead of leaving the visitor behind a long spinner.
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

function showToast(type, message, duration = 3200) {
  const toast = $('#siteToast');
  const icon = $('#siteToastIcon');
  const messageEl = $('#siteToastMessage');
  if (!toast || !icon || !messageEl) return;

  if (type === 'success' || type === 'failed') {
    $('#paymentStatus')?.classList.remove('is-visible');
    clearTimeout(showPaymentStatus.dismissTimer);
  }

  clearTimeout(showToast.dismissTimer);
  toast.className = `site-toast toast-${type}`;
  icon.textContent = type === 'success' ? '✓' : type === 'failed' ? '✕' : 'ℹ';
  messageEl.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  showToast.dismissTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => { toast.hidden = true; }, 220);
  }, duration);
}

function createWhatsAppURL(message) {
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function openWhatsApp(message, eventName = 'whatsapp_opened') {
  const url = createWhatsAppURL(message);
  window.open(url, '_blank', 'noopener,noreferrer');
  showToast('info', 'WhatsApp is opening with your birthday message.');
  trackEvent(eventName);
  return url;
}

function initToast() {
  $('#siteToastClose')?.addEventListener('click', () => {
    clearTimeout(showToast.dismissTimer);
    const toast = $('#siteToast');
    toast.classList.remove('is-visible');
    setTimeout(() => { toast.hidden = true; }, 220);
  });
}

function savePendingPayment(reference, amount) {
  localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({ reference, amount, savedAt: Date.now() }));
}

function clearPendingPayment(reference = null) {
  const saved = safeJSONParse(localStorage.getItem(PENDING_PAYMENT_KEY) || '');
  if (!reference || saved?.reference === reference) localStorage.removeItem(PENDING_PAYMENT_KEY);
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
  const colors = ['#39F29A', '#FFD166', '#11B96C', '#F59E0B', '#E5FFF0'];

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
      showToast('failed', 'Music could not be played. Please try again.');
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
    player.classList.add('is-active');
    if (audio.paused) playMusic(); else pauseMusic();
  });

  volumeSlider.addEventListener('input', () => {
    audio.volume = Number(volumeSlider.value) / 100;
  });

  // Playback is intentionally started only by the dedicated music button.
  // Generic page clicks, key presses, and opening the link never start audio.
}

/* ==========================================================================
   COUNTDOWN
   ========================================================================== */
function initCountdown() {
  const start = new Date(CONFIG.submissionStartISO).getTime();
  const cutoff = new Date(CONFIG.submissionCutoffISO).getTime();
  const els = {
    days: $('#cd-days'), hours: $('#cd-hours'), minutes: $('#cd-minutes'), seconds: $('#cd-seconds'),
  };
  const caption = $('#countdownCaption');
  let previous = {};
  let timer;

  function pad(n) { return String(n).padStart(2, '0'); }

  function update() {
    const now = Date.now();
    const state = submissionWindowState(now);
    setSubmissionAvailability(state);

    if (state === 'closed') {
      els.days.textContent = '00';
      els.hours.textContent = '00';
      els.minutes.textContent = '00';
      els.seconds.textContent = '00';
      caption.textContent = 'The window for sending gifts and wishes has closed. Thank you for celebrating!';
      clearInterval(timer);
      return;
    }

    const target = state === 'upcoming' ? start : cutoff;
    const diff = target - now;
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
    caption.textContent = state === 'upcoming'
      ? 'Wishes and gifts are available now.'
      : 'Time remaining to send wishes and gifts.';
  }

  update();
  if (submissionWindowState() !== 'closed') timer = setInterval(update, 1000);
}

function submissionWindowState(now = Date.now()) {
  if (now < new Date(CONFIG.submissionStartISO).getTime()) return 'upcoming';
  if (now >= new Date(CONFIG.submissionCutoffISO).getTime()) return 'closed';
  return 'open';
}

function setSubmissionAvailability(state) {
  const isOpen = state === 'open';
  const wishLink = $('#wishLink');
  const giftLink = $('#giftLink');
  const form = $('#giftPaymentForm');
  const closedMessage = $('#submissionClosedMessage');
  const wishOptions = $('#wishOptions');

  [wishLink, giftLink].forEach(link => {
    if (!link) return;
    link.classList.toggle('is-disabled', !isOpen);
    link.setAttribute('aria-disabled', String(!isOpen));
    if (!link.dataset.windowGuard) {
      link.addEventListener('click', (event) => {
        if (submissionWindowState() !== 'open') event.preventDefault();
      });
      link.dataset.windowGuard = 'true';
    }
  });
  [form, wishOptions].forEach(container => {
    if (!container) return;
    container.classList.toggle('is-disabled', !isOpen);
    container.querySelectorAll('input, textarea, button').forEach(control => {
      const isSubmitting = control.matches('button[type="submit"]')
        && control.classList.contains('is-loading');
      control.disabled = !isOpen || isSubmitting;
    });
  });

  if (closedMessage) {
    closedMessage.hidden = isOpen;
    closedMessage.textContent = state === 'upcoming'
      ? 'Wishes and gifts are available now.'
      : 'Gifts and wishes are no longer being accepted. Thank you for celebrating!';
  }
}

function ensureSubmissionOpen() {
  const state = submissionWindowState();
  if (state === 'open') return true;

  setSubmissionAvailability(state);
  showToast(
    'info',
    state === 'upcoming'
      ? 'Wishes and gifts are available now.'
      : 'Gifts and wishes are no longer being accepted.'
  );
  return false;
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

let confirmationResolve = null;

function requestPaymentConfirmation(amount) {
  const modal = $('#paymentConfirmation');
  const amountEl = $('#confirmationAmount');
  if (!modal || !amountEl) return Promise.resolve(true);

  amountEl.textContent = `KES ${amount.toLocaleString('en-KE')}`;
  modal.hidden = false;
  document.body.classList.add('confirmation-open');
  $('#confirmationProceed')?.focus();

  return new Promise(resolve => {
    confirmationResolve = resolve;
  });
}

function closePaymentConfirmation(confirmed) {
  const modal = $('#paymentConfirmation');
  if (!modal || !confirmationResolve) return;

  modal.hidden = true;
  document.body.classList.remove('confirmation-open');
  const resolve = confirmationResolve;
  confirmationResolve = null;
  resolve(confirmed);
}

function initPaymentConfirmation() {
  $('#confirmationProceed')?.addEventListener('click', () => closePaymentConfirmation(true));
  $('#confirmationCancel')?.addEventListener('click', () => closePaymentConfirmation(false));
  $('#confirmationClose')?.addEventListener('click', () => closePaymentConfirmation(false));
  $('#paymentConfirmation')?.addEventListener('click', (event) => {
    if (event.target.id === 'paymentConfirmation') closePaymentConfirmation(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('#paymentConfirmation')?.hidden) {
      closePaymentConfirmation(false);
    }
  });
}

/* ==========================================================================
   GIFT / PAYMENT FORM
   ========================================================================== */
function initGiftForm() {
  const form = $('#giftPaymentForm');
  if (!form) return;
  const amountInput = $('#giftAmount');
  const phoneInput = $('#giftPhone');
  const submitBtn = $('#giftSubmitBtn');
  const presets = $('#amountPresets');
  presets.replaceChildren();
  CONFIG.giftPresets.forEach(amount => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'amount-chip';
    chip.dataset.amount = String(amount);
    chip.textContent = `KES ${Number(amount).toLocaleString('en-KE')}`;
    presets.appendChild(chip);
  });
  const chips = $$('.amount-chip', presets);
  const honeypot = $('#giftWebsite');
  markFormRendered(form);

  setSubmissionAvailability(submissionWindowState());

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

    if (!ensureSubmissionOpen()) return;

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

    const confirmed = await requestPaymentConfirmation(amount);
    if (!confirmed) return;
    if (!ensureSubmissionOpen()) return;

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    showPaymentStatus('preparing', 'Preparing payment...');
    trackEvent('gift_initiated', { amount });

    const payload = { amount, phone: normalizePhone(phoneInput.value.trim()) };

    // If the initial request takes a few seconds, show progress instead of
    // leaving a static message that looks frozen.
    const slowHint = setTimeout(() => {
      showPaymentStatus('preparing', 'Still preparing your payment. Almost there...');
    }, 6000);

    try {
      // Allow time for the backend to wake from a free-tier cold start.
      const initRes = await apiRequest('/api/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: 45000,
      });
      clearTimeout(slowHint);
      // Response envelope is { success, message, data: { reference, phone, amount } }.
      const transactionId = initRes?.data?.reference;

      showPaymentStatus('waiting', 'M-Pesa prompt sent. Enter your PIN to approve the gift...');

      if (transactionId) {
        savePendingPayment(transactionId, amount);
        await pollPaymentStatus(transactionId);
      } else {
        // No transaction id returned — show the result once as a toast.
        celebrateSuccess();
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
      showToast('failed', message);
      trackEvent('gift_failed', { amount });
    } finally {
      submitBtn.classList.remove('is-loading');
      setSubmissionAvailability(submissionWindowState());
    }
  });
}

function initWishOptions() {
  const container = $('#wishOptions');
  if (!container) return;
  const senderName = $('#wishSenderName');
  container.replaceChildren();

  CONFIG.wishes.forEach((wish, index) => {
    const card = document.createElement('article');
    card.className = 'wish-option glass';

    const heading = document.createElement('h3');
    heading.className = 'wish-option-title';
    const icon = document.createElement('span');
    icon.className = 'wish-option-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = wish.icon;
    const title = document.createElement('span');
    title.textContent = wish.title;
    heading.append(icon, title);

    const preview = document.createElement('p');
    preview.className = 'wish-option-preview';
    preview.textContent = wish.preview;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-primary wish-send-btn';
    button.textContent = 'Send via WhatsApp';
    button.setAttribute('aria-label', `Send ${wish.title} via WhatsApp`);
    button.addEventListener('click', () => {
      if (!ensureSubmissionOpen()) return;
      const name = senderName.value.trim();
      const message = name ? `${wish.message}\n\nFrom: ${name}` : wish.message;
      openWhatsApp(message, 'birthday_wish_clicked');
      trackEvent('birthday_wish_sent_to_whatsapp', { option: index + 1 });
    });

    card.append(heading, preview, button);
    container.appendChild(card);
  });
  setSubmissionAvailability(submissionWindowState());
}

let activeGiftOption = null;
let previousGiftTrigger = null;

function closeGiftInfo() {
  const modal = $('#giftInfoModal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('gift-modal-open');
  previousGiftTrigger?.focus();
}

function initGiftOptions() {
  const container = $('#giftMethods');
  const modal = $('#giftInfoModal');
  if (!container || !modal) return;
  container.replaceChildren();

  CONFIG.gifts.filter(gift => gift.enabled).forEach(gift => {
    const card = document.createElement('article');
    card.className = 'gift-method glass';
    const icon = document.createElement('span');
    icon.className = 'gift-method-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = gift.icon;
    const heading = document.createElement('h3');
    heading.textContent = gift.title;
    const description = document.createElement('p');
    description.textContent = gift.description;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-gold gift-method-button';
    button.dataset.giftId = gift.id;
    button.textContent = gift.buttonText;
    button.addEventListener('click', () => {
      if (!ensureSubmissionOpen()) return;
      activeGiftOption = gift;
      previousGiftTrigger = button;
      $('#giftInfoIcon').textContent = gift.icon;
      $('#giftInfoTitle').textContent = `Send a Gift via ${gift.title}`;
      $('#giftInfoDescription').textContent = gift.id === 'mpesa'
        ? 'Choose an amount and enter the M-Pesa number that should receive the secure payment prompt. Confirm the recipient, then approve the prompt on your phone. Payment processing stays on the secure backend.'
        : gift.description;
      $('#giftInfoAction').textContent = gift.id === 'mpesa'
        ? 'Continue to secure M-Pesa checkout'
        : 'Continue via WhatsApp';
      modal.hidden = false;
      document.body.classList.add('gift-modal-open');
      $('#giftInfoAction').focus();
    });
    card.append(icon, heading, description, button);
    container.appendChild(card);
  });

  $('#giftInfoClose')?.addEventListener('click', closeGiftInfo);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeGiftInfo();
  });
  modal.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = $$('button:not(:disabled)', modal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  $('#giftInfoAction')?.addEventListener('click', () => {
    if (!activeGiftOption) return;
    if (!ensureSubmissionOpen()) {
      closeGiftInfo();
      return;
    }
    const gift = activeGiftOption;
    closeGiftInfo();
    if (gift.action === 'checkout') {
      $('#giftPaymentForm')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      $('#giftAmount')?.focus({ preventScroll: true });
      trackEvent('gift_method_selected', { method: gift.id });
      return;
    }
    openWhatsApp(gift.whatsappMessage.replace(/\{recipient\}/g, CONFIG.recipientName), 'gift_arrangement_clicked');
    trackEvent('gift_confirmation_clicked', { method: gift.id });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeGiftInfo();
  });
}

// Rotates the "waiting for confirmation" message as polling goes on, so a
// visitor sees continuous signs of progress during what can legitimately be
// up to a minute of waiting for an M-Pesa STK push to be answered, instead
// of one static line that makes the whole thing look stuck.
function waitingMessageFor(attempts) {
  if (attempts < 3) return 'M-Pesa prompt sent. Waiting for your PIN confirmation...';
  if (attempts < 7) return 'Still waiting. Check your phone for the M-Pesa prompt.';
  if (attempts < 13) return 'This can take a little longer sometimes. Hang tight.';
  return 'Waiting for PayHero to confirm your M-Pesa payment...';
}

// Tracks the transaction currently being polled so the manual "Check again"
// button can re-check it on demand after the automatic window gives up.
let lastPolledTransactionId = null;

// Single source of truth for interpreting a /api/payment-status response.
// Used by both the automatic poller and the manual "Check again" button so
// their logic can never drift apart the way it did here before.
//
// Failure is checked FIRST and always wins. A "finalized" transaction with
// an unrecognized status is surfaced as pending (not success) - "finalized"
// only means the backend is done processing, not that it succeeded.
function interpretPaymentStatus(res, pollLabel) {
  const statusData = res?.data || {};
  const event = String(statusData.event || '').toUpperCase();
  const rawStatus = statusData.status
    ?? statusData.Status
    ?? statusData.payment_status
    ?? statusData.PaymentStatus
    ?? statusData.provider_status;
  const status = String(rawStatus ?? '').toLowerCase().trim();
  const reason = String(statusData.reason ?? '').toLowerCase().trim();
  if (pollLabel) console.log(`[${pollLabel}] Raw Status: "${rawStatus}", Normalized: "${status}"`);

  const successStates = ['success', 'successful', 'completed', 'complete', 'paid', '0', 'true'];
  const failedStates = ['failed', 'cancelled', 'canceled', 'declined', 'error'];

  if (event === 'CANCELLED') return 'cancelled';
  if (event === 'SUCCESS') return 'success';
  if (['INSUFFICIENT_FUNDS', 'INVALID_PIN', 'FAILED'].includes(event)) return 'failed';
  if (['cancelled', 'canceled'].includes(status) || ['cancelled', 'canceled'].includes(reason)) return 'cancelled';
  if (failedStates.includes(status)) return 'failed';
  if (successStates.includes(status)) return 'success';

  const finalizedAt = res?.data?.finalized_at;
  const hasBeenFinalized = finalizedAt !== null && finalizedAt !== undefined;
  if (hasBeenFinalized) return 'unrecognized-finalized';

  return 'pending';
}

function paymentStatusMessage(res, outcome) {
  const serverMessage = String(res?.data?.status_message || '').trim();
  if (serverMessage) return serverMessage;
  if (outcome === 'success') return 'Payment confirmed successfully. Thank you for your gift!';
  if (outcome === 'cancelled') return 'Payment cancelled. No money was sent.';
  if (outcome === 'failed') return 'Payment failed. No gift payment was confirmed.';
  return 'Payment prompt sent. Waiting for M-Pesa confirmation.';
}

async function pollPaymentStatus(transactionId, attempts = 0, quiet = false) {
  // Show the waiting state for three seconds, then continue checking quietly
  // so a late success or cancellation still reaches the user immediately.
  const ADVICE_AFTER_ATTEMPTS = 6;
  const MAX_ATTEMPTS = 60;
  const INTERVAL_MS = 500;
  lastPolledTransactionId = transactionId;

  if (attempts >= MAX_ATTEMPTS) {
    // Genuinely unknown at this point — NOT a failure. The payment may still
    // complete on M-Pesa's side; we just stopped auto-checking. Let the
    // visitor manually check again instead of telling them it failed.
    showPaymentStatus('pending', 'No final response yet. Tap Check again if you approved the prompt, or retry if you cancelled it.');
    showToast('info', 'The prompt was not confirmed within three seconds. Check again or retry your gift.');
    return;
  }

  if (!quiet && attempts < ADVICE_AFTER_ATTEMPTS) {
    showPaymentStatus('waiting', waitingMessageFor(attempts));
  } else if (!quiet) {
    showPaymentStatus('pending', 'No final response yet. You can check again or wait for the result.');
    showToast('info', 'We are still checking quietly. You can check again later.');
    quiet = true;
  }

  const pollLabel = `Payment Status Poll #${attempts + 1}`;
  try {
    const res = await apiRequest(`/api/payment-status/${encodeURIComponent(transactionId)}`, { timeoutMs: 4000 });
    console.log(`[${pollLabel}] Response:`, res);

    const outcome = interpretPaymentStatus(res, pollLabel);

    if (outcome === 'failed') {
      console.log(`❌ [${pollLabel}] FAILED`);
      clearPendingPayment(transactionId);
      showToast('failed', paymentStatusMessage(res, outcome));
      trackEvent('gift_failed');
      return;
    }
    if (outcome === 'cancelled') {
      console.log(`↩️ [${pollLabel}] CANCELLED`);
      clearPendingPayment(transactionId);
      showToast('failed', paymentStatusMessage(res, outcome));
      trackEvent('gift_cancelled');
      return;
    }
    if (outcome === 'success') {
      console.log(`✅ [${pollLabel}] SUCCESS`);
      clearPendingPayment(transactionId);
      celebrateSuccess(paymentStatusMessage(res, outcome));
      trackEvent('gift_success');
      return;
    }
    if (outcome === 'unrecognized-finalized') {
      console.log(`⚠️ [${pollLabel}] Finalized with an unrecognized status - treating as pending, not success`);
      showPaymentStatus('pending', paymentStatusMessage(res, outcome));
      return;
    }

    console.log(`⏳ [${pollLabel}] Still pending, will retry...`);
    await new Promise(r => setTimeout(r, INTERVAL_MS));
    return pollPaymentStatus(transactionId, attempts + 1, quiet);
  } catch (err) {
    console.log(`[${pollLabel}] Error (will retry):`, err.message);
    await new Promise(r => setTimeout(r, INTERVAL_MS));
    return pollPaymentStatus(transactionId, attempts + 1, quiet);
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
    const res = await apiRequest(`/api/payment-status/${encodeURIComponent(lastPolledTransactionId)}`, { timeoutMs: 4000 });
    const outcome = interpretPaymentStatus(res);

    if (outcome === 'success') {
      clearPendingPayment(lastPolledTransactionId);
      celebrateSuccess(paymentStatusMessage(res, outcome));
      trackEvent('gift_success');
    } else if (outcome === 'cancelled') {
      clearPendingPayment(lastPolledTransactionId);
      showToast('failed', paymentStatusMessage(res, outcome));
      trackEvent('gift_cancelled');
    } else if (outcome === 'failed') {
      clearPendingPayment(lastPolledTransactionId);
      showToast('failed', paymentStatusMessage(res, outcome));
      trackEvent('gift_failed');
    } else if (outcome === 'unrecognized-finalized') {
      showPaymentStatus('pending', paymentStatusMessage(res, outcome));
    } else {
      showPaymentStatus('pending', paymentStatusMessage(res, outcome));
    }
  } catch {
    showPaymentStatus('pending', "Couldn't check just now. Please try again in a moment.");
  } finally {
    recheckBtn.disabled = false;
  }
}

function showPaymentStatus(state, message) {
  const statusEl = $('#paymentStatus');
  const textEl = $('#paymentText');
  const iconEl = $('#paymentIcon');

  clearTimeout(showPaymentStatus.dismissTimer);
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

  if (state === 'success' || state === 'failed') {
    showPaymentStatus.dismissTimer = setTimeout(() => {
      statusEl.classList.remove('is-visible');
    }, 3200);
  }
}

function initPaymentRecheck() {
  $('#paymentRecheck')?.addEventListener('click', recheckPaymentStatus);
}

function initPaymentStatusClose() {
  $('#paymentClose')?.addEventListener('click', () => {
    clearTimeout(showPaymentStatus.dismissTimer);
    $('#paymentStatus').classList.remove('is-visible');
  });
}

/* ==========================================================================
   CONFETTI
   ========================================================================== */
function launchConfetti(count = 40) {
  if (prefersReducedMotion) return;
  const root = $('#confettiRoot');
  const colors = ['#39F29A', '#FFD166', '#11B96C', '#FFFFFF', '#F59E0B'];

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

function launchCelebrationEffects(count = 22) {
  if (prefersReducedMotion) return;
  const root = $('#celebrationRoot');
  if (!root) return;

  const variants = ['balloon', 'flower', 'gift'];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    const variant = variants[Math.floor(Math.random() * variants.length)];
    particle.className = `celebration-particle celebration-${variant}`;
    const size = 18 + Math.random() * 22;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.opacity = `${0.8 + Math.random() * 0.2}`;
    particle.style.animationDuration = `${3.2 + Math.random() * 1.8}s`;
    particle.style.animationDelay = `${Math.random() * 0.6}s`;
    particle.style.transform = `translateX(${(-14 + Math.random() * 28)}px)`;
    root.appendChild(particle);
    setTimeout(() => particle.remove(), 7000);
  }
}

function celebrateSuccess(message = 'Payment confirmed successfully. Thank you for your gift!') {
  showToast('success', message);
  launchConfetti(48);
  launchCelebrationEffects(18);
}

/* ==========================================================================
   HERO NAME + PERSONALIZATION
   ========================================================================== */
function applyPersonalization() {
  const nameEl = $('#celebrantName');
  if (nameEl) nameEl.textContent = CONFIG.celebrantName;
  const recipientEl = $('#paymentRecipient');
  if (recipientEl) recipientEl.textContent = CONFIG.recipientName;
  const wishDescriptions = [$('#wishSectionDescription'), $('#wishIntroDescription')];
  wishDescriptions.forEach(description => {
    if (description) description.textContent = `Celebrate ${CONFIG.recipientName} by sending a birthday message directly on WhatsApp.`;
  });
  const giftDescription = $('#giftSectionDescription');
  if (giftDescription) giftDescription.textContent = `Choose the way you would like to celebrate ${CONFIG.recipientName}. Every contribution adds to a beautiful day.`;
  const buildLink = $('#buildLink');
  if (buildLink) {
    const inquiry = CONFIG.messages.siteInquiry.replace(/\{recipient\}/g, CONFIG.recipientName);
    buildLink.href = createWhatsAppURL(inquiry);
  }
  document.title = `${CONFIG.birthday.title} ${CONFIG.birthday.year}`;
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
    player.setAttribute('title', 'Music track not found. Add audio/happy-birthday.mp3.');
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

async function syncAvailability() {
  try {
    const response = await apiRequest('/api/availability', { timeoutMs: 3000 });
    const start = response?.data?.start_iso;
    const cutoff = response?.data?.cutoff_iso;
    if (start) CONFIG.submissionStartISO = start;
    if (cutoff) CONFIG.submissionCutoffISO = cutoff;
  } catch {
    // Keep the static fallback if the backend is waking up or unavailable.
  }
}

/* ==========================================================================
   INIT
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  await syncAvailability();
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
  initGiftOptions();
  initGiftForm();
  initWishOptions();
  initPaymentConfirmation();
  initPaymentStatusClose();
  initPaymentRecheck();
  initToast();
  warmUpBackend();
  trackEvent('page_view');
});
