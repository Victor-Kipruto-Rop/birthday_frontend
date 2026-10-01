'use strict';

const CONFIG = {
  celebrantName: 'Rop',
  apiBaseUrl: 'https://birthday-backend-s1b7.onrender.com',
  analyticsEndpoint: null,
  socialLinks: [
    { label: 'GitHub', href: 'https://github.com/Victor-Kipruto-Rop', external: true },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/victor-kipruto-rop', external: true },
    { label: 'Email', href: 'mailto:kiprutovictor39@gmail.com', external: false },
  ],
};

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
const PENDING_PAYMENT_KEY = 'birthday_pending_payment';

function showToast(type, message, duration = 4000) {
  const toast = $('#siteToast');
  const icon = $('#siteToastIcon');
  const messageEl = $('#siteToastMessage');
  if (!toast || !icon || !messageEl) return;
  toast.className = `site-toast toast-${type}`;
  icon.textContent = type === 'success' ? '✓' : type === 'failed' ? '✕' : 'ℹ';
  messageEl.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => { toast.hidden = true; }, 220);
  }, duration);
}

async function apiRequest(path, options = {}) {
  const { timeoutMs = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}${path}`, {
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', ...(fetchOptions.headers || {}) },
      signal: controller.signal,
      ...fetchOptions,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `Request failed with status ${response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function normalizePhone(value) {
  let phone = value.replace(/\s+/g, '');
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('0')) phone = `254${phone.slice(1)}`;
  return phone;
}

function isValidPhone(value) {
  return /^(?:\+254|254|0)?[17]\d{8}$/.test(value.replace(/\s+/g, ''));
}

function setFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId)?.closest('.field');
  const error = document.getElementById(errorId);
  if (!field || !error) return;
  field.classList.toggle('has-error', Boolean(message));
  error.textContent = message || '';
}

function setButtonLoading(button, loading) {
  button.classList.toggle('is-loading', loading);
  button.disabled = loading;
}

function celebrateSuccess(message = 'Success! Thank you for celebrating.') {
  showToast('success', message);
  const root = $('#confettiRoot');
  if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 36; i += 1) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = ['#00E676', '#FFB020', '#FF8800', '#FFFFFF'][i % 4];
    piece.style.animationDuration = `${2 + Math.random() * 2}s`;
    root.appendChild(piece);
    setTimeout(() => piece.remove(), 4500);
  }
}

function initWishForm() {
  const form = $('#wishForm');
  if (!form) return;
  const name = $('#wishName');
  const phone = $('#wishPhone');
  const message = $('#wishMessage');
  const button = $('#wishSubmitBtn');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    let valid = true;
    if (name.value.trim().length < 2) {
      setFieldError('wishName', 'wishNameError', 'Enter your name.');
      valid = false;
    } else setFieldError('wishName', 'wishNameError', '');
    if (!isValidPhone(phone.value)) {
      setFieldError('wishPhone', 'wishPhoneError', 'Enter a valid phone number.');
      valid = false;
    } else setFieldError('wishPhone', 'wishPhoneError', '');
    if (message.value.trim().length < 1) {
      setFieldError('wishMessage', 'wishMessageError', 'Write a birthday message.');
      valid = false;
    } else setFieldError('wishMessage', 'wishMessageError', '');
    if (!valid) return;

    setButtonLoading(button, true);
    try {
      await apiRequest('/api/wish', {
        method: 'POST',
        body: JSON.stringify({
          name: name.value.trim(),
          phone: normalizePhone(phone.value),
          message: message.value.trim(),
        }),
      });
      form.reset();
      celebrateSuccess('Your birthday wish was sent successfully.');
    } catch (error) {
      showToast('failed', error.name === 'AbortError' ? 'The request timed out. Please try again.' : error.message);
    } finally {
      setButtonLoading(button, false);
    }
  });
}

function initGiftForm() {
  const form = $('#giftForm');
  if (!form) return;
  const amount = $('#giftAmount');
  const phone = $('#giftPhone');
  const button = $('#giftSubmitBtn');
  const status = $('#paymentStatus');
  const statusText = $('#paymentText');
  const chips = $$('.amount-chip');
  let activeReference = null;

  chips.forEach((chip) => chip.addEventListener('click', () => {
    chips.forEach((item) => item.classList.remove('is-selected'));
    chip.classList.add('is-selected');
    amount.value = chip.dataset.amount;
  }));

  function paymentStatus(state, message) {
    if (!status || !statusText) return;
    status.classList.remove('state-success', 'state-failed', 'state-pending');
    status.classList.add('is-visible');
    if (state) status.classList.add(`state-${state}`);
    statusText.textContent = message;
  }

  async function poll(reference) {
    activeReference = reference;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const response = await apiRequest(`/api/payment-status/${encodeURIComponent(reference)}`, { timeoutMs: 8000 });
        const data = response?.data || {};
        const state = String(data.status ?? data.payment_status ?? '').toLowerCase();
        if (['success', 'successful', 'completed', 'complete', 'paid', '0', 'true'].includes(state)) {
          localStorage.removeItem(PENDING_PAYMENT_KEY);
          paymentStatus('success', 'Gift payment confirmed. Thank you!');
          celebrateSuccess('Your gift was sent successfully.');
          return;
        }
        if (['failed', 'cancelled', 'canceled', 'declined', 'error'].includes(state)) {
          localStorage.removeItem(PENDING_PAYMENT_KEY);
          paymentStatus('failed', 'Payment was not completed. You can try again.');
          return;
        }
      } catch (_) {
        // Keep polling; payment providers can briefly be unavailable.
      }
      paymentStatus('pending', 'M-Pesa prompt sent. Approve it on your phone...');
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    paymentStatus('pending', 'Payment is still processing. Please check again shortly.');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const numericAmount = Number(amount.value);
    let valid = true;
    if (!Number.isFinite(numericAmount) || numericAmount < 10) {
      setFieldError('giftAmount', 'giftAmountError', 'Enter an amount of at least KES 10.');
      valid = false;
    } else setFieldError('giftAmount', 'giftAmountError', '');
    if (!isValidPhone(phone.value)) {
      setFieldError('giftPhone', 'giftPhoneError', 'Enter a valid M-Pesa phone number.');
      valid = false;
    } else setFieldError('giftPhone', 'giftPhoneError', '');
    if (!valid) return;

    const confirmation = $('#paymentConfirmation');
    const confirmationAmount = $('#confirmationAmount');
    if (confirmationAmount) confirmationAmount.textContent = `KES ${numericAmount.toLocaleString('en-KE')}`;
    if (confirmation) confirmation.hidden = false;
    const proceed = confirmation ? await new Promise((resolve) => {
      const yes = $('#confirmationProceed');
      const no = $('#confirmationCancel');
      const close = $('#confirmationClose');
      const finish = (value) => {
        confirmation.hidden = true;
        yes?.removeEventListener('click', onYes);
        no?.removeEventListener('click', onNo);
        close?.removeEventListener('click', onNo);
        resolve(value);
      };
      const onYes = () => finish(true);
      const onNo = () => finish(false);
      yes?.addEventListener('click', onYes);
      no?.addEventListener('click', onNo);
      close?.addEventListener('click', onNo);
    }) : true;
    if (!proceed) return;

    setButtonLoading(button, true);
    paymentStatus('pending', 'Preparing your M-Pesa payment...');
    try {
      const response = await apiRequest('/api/payment', {
        method: 'POST',
        timeoutMs: 30000,
        body: JSON.stringify({ amount: numericAmount, phone: normalizePhone(phone.value) }),
      });
      const reference = response?.data?.reference || response?.reference || response?.data?.transaction_id;
      if (!reference) {
        celebrateSuccess('Your gift request was received.');
      } else {
        localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({ reference, amount: numericAmount }));
        await poll(reference);
      }
      form.reset();
      chips.forEach((chip) => chip.classList.remove('is-selected'));
    } catch (error) {
      paymentStatus('failed', '');
      showToast('failed', error.name === 'AbortError' ? 'The payment request timed out. Please try again.' : error.message);
    } finally {
      setButtonLoading(button, false);
    }
  });

  const pending = JSON.parse(localStorage.getItem(PENDING_PAYMENT_KEY) || 'null');
  if (pending?.reference) poll(pending.reference);
}

function initCountdown() {
  const caption = $('#countdownCaption');
  const target = new Date('2026-12-31T23:59:59+03:00').getTime();
  const fields = { days: $('#cd-days'), hours: $('#cd-hours'), minutes: $('#cd-minutes'), seconds: $('#cd-seconds') };
  const update = () => {
    const diff = Math.max(0, target - Date.now());
    const values = [Math.floor(diff / 86400000), Math.floor(diff / 3600000) % 24, Math.floor(diff / 60000) % 60, Math.floor(diff / 1000) % 60];
    ['days', 'hours', 'minutes', 'seconds'].forEach((key, index) => { if (fields[key]) fields[key].textContent = String(values[index]).padStart(2, '0'); });
    if (caption) caption.textContent = 'The celebration is open — send a wish or gift anytime.';
  };
  update();
  setInterval(update, 1000);
}

function initFooterLinks() {
  const container = $('#footerLinks');
  if (!container) return;
  CONFIG.socialLinks.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.className = 'footer-link';
    anchor.href = link.href;
    anchor.textContent = link.label;
    if (link.external) { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; }
    container.appendChild(anchor);
  });
}

function initToast() {
  $('#siteToastClose')?.addEventListener('click', () => {
    const toast = $('#siteToast');
    toast?.classList.remove('is-visible');
    if (toast) toast.hidden = true;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const name = $('#celebrantName');
  if (name) name.textContent = CONFIG.celebrantName;
  document.title = `Happy Birthday, ${CONFIG.celebrantName}`;
  initWishForm();
  initGiftForm();
  initCountdown();
  initFooterLinks();
  initToast();
});
