import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/caveat/latin-600.css';
import '@fontsource/caveat/latin-700.css';
import './style.css';

import { CHAPTERS, COLLEGES, SITE, prescribe } from './data.js';
import { N, LEG_MOTION, smooth } from './world/layout.js';
import { createWorld, webglAvailable } from './world/index.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const params = new URLSearchParams(location.search);
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const sections = $$('.station');
const railLinks = $$('.rail a');
const hud = $('#hud'), hudNum = $('#hud-num'), hudName = $('#hud-name');
const prevBtn = $('#prev'), nextBtn = $('#next');

// ── static content ────────────────────────────────────────────────────────
sections.forEach((sec) => $$('[data-r]', sec).forEach((el, i) => el.style.setProperty('--i', i)));
$('#marquee').innerHTML = [...COLLEGES, ...COLLEGES].map(([n, c]) => `<li>${n}<small>${c}</small></li>`).join('');

// rotating headline words ("has a home. / future. / power.")
$$('.swap').forEach((el) => {
  const words = el.dataset.words.split('|');
  let k = 0;
  // reserve room for the longest word so the headline never reflows when it changes
  const fit = () => {
    const now = el.textContent;
    el.style.minWidth = '';
    const w = Math.max(...words.map((word) => { el.textContent = word; return el.getBoundingClientRect().width; }));
    el.textContent = now;
    el.style.minWidth = `${Math.ceil(w)}px`;
  };
  document.fonts.ready.then(fit);
  window.addEventListener('resize', fit);
  if (calm) return;
  setInterval(() => {
    if (document.hidden) return;
    k = (k + 1) % words.length;
    const out = el.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-0.35em)' }], { duration: 320, easing: 'ease-in', fill: 'forwards' });
    out.onfinish = () => {
      el.textContent = words[k];
      const back = el.animate([{ opacity: 0, transform: 'translateY(0.4em)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
      out.cancel();
      back.onfinish = () => back.cancel();
    };
  }, 2800);
});

// ── scroll → progress, with a gentle settle onto the nearest chapter ──────
const track = $('#track');
const scroll = { seg: 1, auto: 0, dir: 1, lastY: 0, touching: false, holding: false, idle: 0, dest: 0, lastW: 0 };
const free = params.has('p'); // dev: ?p=2.5 freezes the camera mid-flight

function layout() {
  // On phones the URL bar resizes the viewport constantly; only re-measure when the width changes.
  if (scroll.lastW === window.innerWidth && scroll.seg > 1 && window.matchMedia('(pointer: coarse)').matches) return;
  const keep = progressNow();
  scroll.lastW = window.innerWidth;
  scroll.seg = Math.max(480, Math.round(window.innerHeight));
  track.style.height = `calc(${scroll.seg * (N - 1)}px + 100vh)`;
  track.style.height = `calc(${scroll.seg * (N - 1)}px + 100lvh)`;
  if (keep > 0.001) window.scrollTo(0, keep * scroll.seg);
}
function progressNow() { return clamp(window.scrollY / scroll.seg, 0, N - 1); }
function cancelAuto() { if (scroll.auto) { cancelAnimationFrame(scroll.auto); scroll.auto = 0; } }
function flyTo(index, { instant = false } = {}) {
  const i = clamp(Math.round(index), 0, N - 1);
  scroll.dest = i;
  cancelAuto();
  clearTimeout(scroll.idle);
  const from = window.scrollY, to = i * scroll.seg;
  if (Math.abs(to - from) < 1) return;
  if (instant || calm) { window.scrollTo(0, to); return; }
  const dur = clamp(700 + (Math.abs(to - from) / scroll.seg) * 420, 700, 2200);
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
    window.scrollTo(0, from + (to - from) * e);
    scroll.auto = k < 1 ? requestAnimationFrame(step) : 0;
  };
  scroll.auto = requestAnimationFrame(step);
}
function settle() {
  if (free || scroll.touching || scroll.holding || scroll.auto) return;
  const p = progressNow();
  const base = Math.floor(p), f = p - base;
  if (f < 0.003 || f > 0.997) { scroll.dest = Math.round(p); return; }
  const T = 0.03; // any deliberate scroll carries you to the next chapter
  const to = scroll.dir > 0 ? (f > T ? base + 1 : base) : (f < 1 - T ? base : base + 1);
  flyTo(to);
}
let world = null;
function onScroll() {
  world?.setTarget(progressNow());
  hud.classList.toggle('is-moved', window.scrollY > 40);
  if (scroll.auto) return;
  const y = window.scrollY;
  if (y !== scroll.lastY) scroll.dir = y > scroll.lastY ? 1 : -1;
  scroll.lastY = y;
  clearTimeout(scroll.idle);
  scroll.idle = setTimeout(settle, 150);
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('wheel', cancelAuto, { passive: true });
window.addEventListener('touchstart', () => { scroll.touching = true; cancelAuto(); }, { passive: true });
window.addEventListener('touchend', () => { scroll.touching = false; clearTimeout(scroll.idle); scroll.idle = setTimeout(settle, 180); }, { passive: true });
window.addEventListener('touchcancel', () => { scroll.touching = false; }, { passive: true });
// dragging the native scrollbar: don't fight it
window.addEventListener('pointerdown', (e) => { if (e.target === document.documentElement) { scroll.holding = true; cancelAuto(); } });
window.addEventListener('pointerup', () => { if (scroll.holding) { scroll.holding = false; clearTimeout(scroll.idle); scroll.idle = setTimeout(settle, 150); } });
window.addEventListener('resize', layout);

// keyboard: arrows / page keys / space move one chapter
window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const here = scroll.auto ? scroll.dest : Math.round(progressNow());
  let to = null;
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'ArrowRight') to = here + 1;
  else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') to = here - 1;
  else if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A') to = here + (e.shiftKey ? -1 : 1);
  else if (e.key === 'Home') to = 0;
  else if (e.key === 'End') to = N - 1;
  if (to === null) return;
  e.preventDefault();
  flyTo(to);
});

// any element with data-go flies the camera there
document.addEventListener('click', (e) => {
  const el = e.target.closest?.('[data-go]');
  if (!el) return;
  e.preventDefault();
  flyTo(+el.dataset.go);
});
prevBtn.addEventListener('click', () => flyTo((scroll.auto ? scroll.dest : Math.round(progressNow())) - 1));
nextBtn.addEventListener('click', () => flyTo((scroll.auto ? scroll.dest : Math.round(progressNow())) + 1));

// ── per-frame: move the copy with the camera ──────────────────────────────
let chapter = -1, counted = false;
function setChapter(i) {
  if (i === chapter) return;
  chapter = i;
  hudNum.textContent = String(i).padStart(2, '0');
  hudName.textContent = CHAPTERS[i].name;
  railLinks.forEach((a, k) => (k === i ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  prevBtn.disabled = i === 0;
  nextBtn.disabled = i === N - 1;
  nextBtn.classList.toggle('is-nudge', i === 0 && !calm);
  try { history.replaceState(null, '', i === 0 ? location.pathname + location.search : `#${CHAPTERS[i].id}`); } catch { /* sandboxed frame */ }
  if (i === N - 1 && !counted) { counted = true; countUp(); }
}
function paint(p) {
  const travelPx = Math.min(window.innerWidth, window.innerHeight) * 0.16;
  sections.forEach((sec, i) => {
    const d = p - i, ad = Math.abs(d);
    const o = 1 - smooth((ad - 0.1) / 0.2);
    const on = o > 0.002;
    if (on !== sec._on) {
      sec._on = on;
      sec.classList.toggle('is-on', on);
      sec.toggleAttribute('inert', !on);
    }
    const active = on && ad < 0.2;
    if (active !== sec._active) { sec._active = active; sec.classList.toggle('is-active', active); }
    if (!on) return;
    const away = 1 - o;
    const leg = d > 0 ? LEG_MOTION[i] : LEG_MOTION[i - 1];
    const sign = d > 0 ? 1 : -1;
    sec.style.setProperty('--o', o.toFixed(3));
    sec.style.setProperty('--tx', leg ? `${(leg.x * sign * away * travelPx).toFixed(1)}px` : '0px');
    sec.style.setProperty('--ty', leg ? `${(leg.y * sign * away * travelPx).toFixed(1)}px` : '0px');
    sec.style.setProperty('--s', leg ? (1 + leg.z * sign * away * 0.3).toFixed(3) : '1');
  });
  setChapter(clamp(Math.round(p), 0, N - 1));
}

// composition call-outs: pin each label to its ingredient inside the 3D capsule
const calloutBox = $('#callouts');
const calloutEls = $$('.callout').map((el) => ({ el, line: $('.callout__line', el), dot: $('.callout__dot', el) }));
const calloutPts = [];
let calloutOn = null;
function paintCallouts(p) {
  const heroO = 1 - smooth((Math.abs(p) - 0.03) / 0.1);
  const alpha = world.callouts(calloutPts) * heroO;
  const on = alpha > 0.01;
  if (on !== calloutOn) { calloutOn = on; calloutBox.classList.toggle('is-on', on); }
  if (!on) return;
  calloutBox.style.setProperty('--co', alpha.toFixed(3));
  calloutEls.forEach(({ el, line, dot }, k) => {
    const c = calloutPts[k];
    if (el._dir !== c.dir) { el._dir = c.dir; el.classList.toggle('is-up', c.dir > 0); el.classList.toggle('is-down', c.dir < 0); }
    const dx = c.ax - c.bx, dy = c.ay - c.by;
    el.style.transform = `translate3d(${c.bx.toFixed(1)}px, ${c.by.toFixed(1)}px, 0)`;
    line.style.height = `${Math.hypot(dx, dy).toFixed(1)}px`;
    line.style.transform = `rotate(${(Math.atan2(-dx, dy) * 180 / Math.PI).toFixed(2)}deg)`;
    dot.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
  });
}

function countUp() {
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count;
    if (calm) return;
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 1600);
      el.textContent = Math.round(to * (1 - (1 - k) ** 4)).toLocaleString('en-IN');
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// ── "Tell us where you are" → live prescription (DOM + the 3D paper) ──────
const rxForm = $('#rx-form');
function renderRx(animate) {
  const rx = prescribe(Object.fromEntries(new FormData(rxForm)));
  $('#rx-dx').textContent = rx.diagnosis;
  $('#rx-cards').innerHTML = rx.cards.map((c) => `<li class="k-${c.color}"><small>${c.kind}</small><b>${c.short ?? c.title}</b><span>${c.detail}</span></li>`).join('');
  world?.setRx(rx, animate);
}
rxForm.addEventListener('change', () => renderRx(true));

// ── early access: same behaviour as the live site (hands the email to /signup/) ─
const joinForm = $('#join-form'), joinMsg = $('#join-msg');
joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = joinForm.email.value.trim();
  joinMsg.className = 'join__msg';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    joinMsg.textContent = 'Please enter a valid email address.';
    joinForm.email.setAttribute('aria-invalid', 'true');
    joinForm.email.focus();
    return;
  }
  joinForm.email.removeAttribute('aria-invalid');
  const url = `${SITE}/signup/?email=${encodeURIComponent(email)}`;
  joinMsg.classList.add('ok');
  joinMsg.innerHTML = `Taking you to sign-up… <a href="${url}">Continue</a>`;
  try { window.location.assign(url); } catch { /* preview frames block navigation; the link above still works */ }
});

// ── boot ──────────────────────────────────────────────────────────────────
const loader = $('#loader'), bar = $('#loader-bar'), pct = $('#loader-pct'), label = $('#loader-label');
let shown = 0, goal = 0.08;
const loadTick = setInterval(() => {
  shown += (goal - shown) * 0.2;
  bar.style.transform = `scaleX(${shown.toFixed(3)})`;
  pct.textContent = String(Math.round(shown * 100)).padStart(3, '0');
}, 50);
const timeout = (ms) => new Promise((r) => setTimeout(r, ms));
const loadImage = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

async function boot() {
  layout();
  renderRx(false);

  if (!webglAvailable() || params.has('static')) {
    document.body.classList.add('no-webgl', 'is-in');
    clearInterval(loadTick);
    return;
  }

  const glyphs = 'AaRx→·’—%&é';
  const fonts = Promise.all([
    document.fonts.load('700 32px "Bricolage Grotesque Variable"', glyphs),
    document.fonts.load('500 16px "Schibsted Grotesk Variable"', glyphs),
    document.fonts.load('600 40px "JetBrains Mono Variable"', glyphs),
    document.fonts.load('600 28px "Caveat"', glyphs),
    document.fonts.load('700 28px "Caveat"', glyphs),
  ]).catch(() => {});
  const [icon] = await Promise.all([loadImage('./brand/icon.png'), Promise.race([fonts, timeout(5000)])]);
  goal = 0.55; label.textContent = 'Building the world';
  await timeout(30);

  world = createWorld({ canvas: $('#world'), icon, calm, quality: params.get('q') ?? 'auto' });
  renderRx(false);
  world.onFrame((p) => { paint(p); paintCallouts(p); });
  goal = 0.85; label.textContent = 'Warming up';
  await world.warm();

  // deep links: #patents etc. — or ?p= for a frozen camera position
  const startAt = free ? +params.get('p') : Math.max(0, CHAPTERS.findIndex((c) => `#${c.id}` === location.hash));
  if (startAt > 0) { window.scrollTo(0, startAt * scroll.seg); world.jump(startAt); world.skipIntro(); }
  if (params.has('nointro')) world.skipIntro();
  world.setTarget(progressNow());

  goal = 1; label.textContent = 'Ready';
  await timeout(380);
  clearInterval(loadTick);
  bar.style.transform = 'scaleX(1)'; pct.textContent = '100';
  loader.classList.add('is-done');
  world.start();
  setTimeout(() => document.body.classList.add('is-in'), world.introDone ? 60 : 1500);
}

boot().catch((err) => {
  console.error(err);
  clearInterval(loadTick);
  loader.classList.add('is-done');
  document.body.classList.add('no-webgl', 'is-in');
});
