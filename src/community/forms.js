// Shared form handling for the community pages.
// Validates in the browser, then POSTs JSON to FORM_ENDPOINT. Until an endpoint is configured
// the page says honestly that nothing was sent (preview mode).
import { FORM_ENDPOINT, SESSIONS } from './content.js';

const PLATFORM_NAMES = { 'zoom.us': 'Zoom', 'meet.google.com': 'Google Meet', 'teams.microsoft.com': 'Teams', 'teams.live.com': 'Teams', 'youtube.com': 'YouTube Live', 'youtu.be': 'YouTube Live', 'webex.com': 'Webex' };

export function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const k = SESSIONS.platforms.find((p) => host === p || host.endsWith(`.${p}`));
    return k ? PLATFORM_NAMES[k] : null;
  } catch { return null; }
}

function fieldError(input) {
  const v = input.value.trim();
  if (input.type === 'checkbox') return input.required && !input.checked ? 'Please confirm to continue.' : '';
  if (input.required && !v) return 'This field is required.';
  if (input.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Please enter a valid email address.';
  if (input.type === 'url' && v) {
    try { const u = new URL(v); if (!/^https?:$/.test(u.protocol)) throw new Error(); } catch { return 'Please enter a full link starting with https://'; }
  }
  return '';
}
function showError(input, msg) {
  const holder = input.closest('.field, .check');
  // single-line forms (e.g. join) report through their message line, so the layout never shifts under the cursor
  if (!holder) { if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); return; }
  let el = holder.querySelector('.field__err');
  if (msg) {
    input.setAttribute('aria-invalid', 'true');
    if (!el) { el = document.createElement('span'); el.className = 'field__err'; el.id = `${input.name}-err-${Math.random().toString(36).slice(2, 7)}`; holder.appendChild(el); input.setAttribute('aria-describedby', el.id); }
    el.textContent = msg;
  } else {
    input.removeAttribute('aria-invalid');
    el?.remove();
  }
}

/**
 * @param form       <form>
 * @param kind       'event' | 'session' | 'ambassador' | 'join'
 * @param onSuccess  optional callback (data)
 * @param successText message once the endpoint accepted it
 */
export function wireForm(form, { kind, successText, onSuccess, redirect } = {}) {
  const msg = form.querySelector('.form__msg');
  const baseClass = msg.className;
  const inputs = [...form.querySelectorAll('input, select, textarea')].filter((i) => i.name);
  inputs.forEach((i) => i.addEventListener('blur', () => { if (i.value || i.type === 'checkbox') showError(i, fieldError(i)); }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let first = null;
    inputs.forEach((i) => { const m = fieldError(i); showError(i, m); if (m && !first) first = i; });
    msg.className = baseClass;
    if (first) {
      msg.classList.add('err');
      msg.textContent = first.closest('.field, .check') ? 'Please fix the highlighted fields.' : fieldError(first);
      first.focus();
      return;
    }
    const data = Object.fromEntries(inputs.map((i) => [i.name, i.type === 'checkbox' ? i.checked : i.value.trim()]));
    if (redirect) { redirect(data, msg); return; }
    if (!FORM_ENDPOINT) {
      msg.classList.add('note');
      msg.textContent = 'Preview: your entry is valid, but nothing was sent. Connect FORM_ENDPOINT to start receiving these.';
      onSuccess?.(data);
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, ...data }) });
      if (!res.ok) throw new Error(res.status);
      msg.classList.add('ok'); msg.textContent = successText ?? 'Thank you. We’ll be in touch.';
      form.reset();
      onSuccess?.(data);
    } catch {
      msg.classList.add('err'); msg.textContent = 'Something went wrong sending this. Please try again in a moment.';
    } finally { btn.disabled = false; }
  });
}

// ── calendar (.ics) for listed events ────────────────────────────────────
const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
/** "23–26 Nov 2026" · "29 Oct 2026" · "12 Nov - 14 Nov 2026" · "09 Jan - 10 Jan 2027" → { start, end } */
export function parseRange(s) {
  const year = +(s.match(/(20\d\d)/) || [])[1];
  const parts = [...s.matchAll(/(\d{1,2})(?:\s+([A-Z][a-z]{2}))?/g)].map((m) => [+m[1], m[2]]).filter(([d]) => d < 32);
  const month = parts.find(([, m]) => m)?.[1];
  const a = parts[0], b = parts[parts.length - 1];
  const ma = MON[a[1] ?? month], mb = MON[b[1] ?? month];
  return { start: new Date(Date.UTC(year, ma, a[0])), end: new Date(Date.UTC(year, mb, b[0])) };
}
export function dayMonth(s) {
  const { start } = parseRange(s);
  return { d: start.getUTCDate(), m: Object.keys(MON)[start.getUTCMonth()] };
}
export function icsHref(ev) {
  const { start, end } = parseRange(ev.date);
  const f = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const endPlus = new Date(end.getTime() + 864e5);
  const esc = (t) => t.replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SkillCures//Community//EN', 'BEGIN:VEVENT',
    `UID:${f(start)}-${ev.title.replace(/\W+/g, '').slice(0, 24)}@skillcures.in`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${f(start)}`, `DTEND;VALUE=DATE:${f(endPlus)}`, `SUMMARY:${esc(ev.title)}`, `LOCATION:${esc(ev.where)}`, `DESCRIPTION:${esc(ev.description)}`,
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
