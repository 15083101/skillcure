import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-800.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './style.css';

import { CHAPTERS, PILLARS, EVENTS, EVENT_TYPES, TYPE_COLOR, CIRCLES, STORIES, SITE } from './data.js';
import { createWorld, loadAssets, webglAvailable } from './world/index.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const params = new URLSearchParams(location.search);
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const N = CHAPTERS.length;
const BASE = '../';
const SIGNUP = `${SITE}/signup/`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── build the five pillar chapters from the template ─────────────────────
const tpl = $('#pillar-tpl');
const eventsSec = $('#events');
PILLARS.forEach((p, k) => {
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.id = CHAPTERS[k + 1].id;
  node.dataset.station = String(k + 1);
  node.style.setProperty('--c', p.color);
  node.setAttribute('aria-labelledby', `${node.id}-h`);
  $('.steps', node).innerHTML = PILLARS.map((q, j) => `<li class="${j === k ? 'is-now' : ''}" style="--c:${q.color}">${q.n} ${q.name}</li>`).join('');
  $('.pillar__kicker', node).textContent = `${p.n} — ${p.kicker}`;
  const h = $('.pillar__name', node); h.id = `${node.id}-h`; h.textContent = `${p.name}.`;
  $('.pillar__body', node).textContent = p.body;
  $('.pillar__points', node).innerHTML = p.points.map((t) => `<li>${esc(t)}</li>`).join('');
  $('.pillar__stat b', node).textContent = p.stat;
  $('.pillar__stat span', node).textContent = p.statLabel;
  const cta = $('.pillar__cta', node);
  cta.innerHTML = `${esc(p.cta)} <span aria-hidden="true">→</span>`;
  cta.dataset.go = p.go;
  if (p.filter) cta.dataset.filter = p.filter;
  eventsSec.before(node);
});

const sections = $$('.station').sort((a, b) => +a.dataset.station - +b.dataset.station);
sections.forEach((sec) => $$('[data-r]', sec).forEach((el, i) => el.style.setProperty('--i', i)));
const tabs = $$('.tabs a');
const dots = $('#dots');
dots.innerHTML = CHAPTERS.map(() => '<li></li>').join('');
const dotEls = $$('li', dots);
const prevBtn = $('#prev'), nextBtn = $('#next'), hud = $('#hud');
const indexOf = (id) => Math.max(0, CHAPTERS.findIndex((c) => c.id === id));

// ── events panel ─────────────────────────────────────────────────────────
let world = null;
let filter = null, evIndex = 0;
const filters = $('#filters');
filters.innerHTML = EVENT_TYPES.map((t) => `<button type="button" role="tab" aria-selected="false" data-type="${t}" style="--c:${TYPE_COLOR[t]}"><i></i>${t}s <small>${EVENTS.filter((e) => e.type === t).length}</small></button>`).join('');
function showEvent(i, { fromWorld = false } = {}) {
  evIndex = ((i % EVENTS.length) + EVENTS.length) % EVENTS.length;
  const e = EVENTS[evIndex];
  if (filter && e.type !== filter) { filter = null; world?.filterEvents(null); syncFilters(); }
  const card = $('#event');
  card.classList.remove('is-swap'); void card.offsetWidth; card.classList.add('is-swap');
  card.style.setProperty('--c', TYPE_COLOR[e.type]);
  $('#ev-type').textContent = e.type;
  $('#ev-when').textContent = `${e.date} · ${e.time}`;
  $('#ev-count').textContent = `${String(evIndex + 1).padStart(2, '0')} / ${EVENTS.length}`;
  $('#ev-title').textContent = e.title;
  $('#ev-desc').textContent = e.description;
  const av = $('#ev-avatar'); av.textContent = e.speaker[3]; av.style.setProperty('--c', e.toneColor);
  $('#ev-speaker').textContent = e.speaker[0];
  $('#ev-role').textContent = `${e.speaker[1]} · ${e.speaker[2]} · ${e.mode}`;
  $('#ev-bar').style.width = `${Math.round((e.reg / e.seats) * 100)}%`;
  $('#ev-reg').textContent = `${e.reg} / ${e.seats} registered`;
  $('#ev-left').textContent = `${e.left} seats left`;
  $('#ev-tags').innerHTML = e.tags.map((t) => `<span>${esc(t)}</span>`).join('');
  $('#ev-register').setAttribute('aria-label', `Register for ${e.title}`);
  if (!fromWorld) world?.selectEvent(evIndex);
  if (chapter === 6) typeConsole(6);
}
function syncFilters() { $$('button', filters).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.type === filter))); }
filters.addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return;
  filter = filter === b.dataset.type ? null : b.dataset.type;
  world?.filterEvents(filter);
  syncFilters();
  if (filter) showEvent(EVENTS.findIndex((e) => e.type === filter));
});
const stepEvent = (d) => {
  if (!filter) return showEvent(evIndex + d);
  const list = EVENTS.map((e, i) => [e, i]).filter(([e]) => e.type === filter).map(([, i]) => i);
  const at = list.indexOf(evIndex);
  showEvent(list[(at + d + list.length) % list.length]);
};
$('#ev-prev').addEventListener('click', () => stepEvent(-1));
$('#ev-next').addEventListener('click', () => stepEvent(1));

// ── circles panel ────────────────────────────────────────────────────────
let ciIndex = 0;
const picks = $('#circle-picks');
picks.innerHTML = CIRCLES.map((c, i) => `<button type="button" role="tab" aria-selected="false" data-i="${i}" style="--c:${c.color}"><small>Circle ${c.n}</small><b>${esc(c.name)}</b><span>${c.members.toLocaleString('en-IN')} members</span></button>`).join('');
function showCircle(i, { fromWorld = false } = {}) {
  ciIndex = i;
  const c = CIRCLES[i];
  const card = $('.circle');
  card.classList.remove('is-swap'); void card.offsetWidth; card.classList.add('is-swap');
  card.style.setProperty('--c', c.color);
  $$('button', picks).forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.i === i)));
  $('#ci-n').textContent = `circle ${c.n}`;
  const st = $('#ci-status'); st.textContent = c.status; st.classList.toggle('is-hot', c.status === 'Hot');
  $('#ci-name').textContent = c.name;
  $('#ci-body').textContent = c.body;
  $('#ci-tags').innerHTML = c.tags.map((t) => `<span>${esc(t)}</span>`).join('');
  $('#ci-lead').textContent = c.lead;
  $('#ci-members').textContent = c.members.toLocaleString('en-IN');
  const join = $('#ci-join'); join.textContent = `Join ${c.name}`; join.href = SIGNUP;
  if (!fromWorld) world?.selectCircle(i);
  atomEls.forEach((el, k) => el.classList.toggle('is-sel', k === i));
  if (chapter === 7) typeConsole(7);
}
picks.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (b) showCircle(+b.dataset.i); });

// ── stories panel ────────────────────────────────────────────────────────
let stIndex = 0;
function showStory(i, { fromWorld = false } = {}) {
  stIndex = ((i % STORIES.length) + STORIES.length) % STORIES.length;
  const s = STORIES[stIndex];
  const box = $('#story');
  box.classList.remove('is-swap'); void box.offsetWidth; box.classList.add('is-swap');
  box.style.setProperty('--c', s.color);
  $('#st-badge').textContent = `Their story · ${String(stIndex + 1).padStart(2, '0')} · ${s.badge}`;
  $('#st-lead').textContent = s.lead;
  $('#st-turn').textContent = s.turn;
  $('#st-intro').textContent = s.intro;
  $('#st-quote').textContent = s.quote;
  const av = $('#st-avatar'); av.textContent = s.initials; av.style.setProperty('--c', s.color);
  $('#st-author').textContent = s.author;
  $('#st-title').textContent = `${s.title} · ${s.inst}`;
  $('#st-journey').innerHTML = [['01 · Before joining', s.before], ['02 · Community catalyst', s.community], ['03 · Tangible result', s.result]]
    .map(([k, t], j) => `<li><b>${k}</b>${j === 2 ? `<strong>${esc(s.metric)}</strong>` : ''}${esc(t)}</li>`).join('');
  $('#st-count').textContent = `${stIndex + 1} / ${STORIES.length}`;
  if (!fromWorld) world?.selectStory(stIndex);
  if (chapter === 8) typeConsole(8);
}
$('#st-prev').addEventListener('click', () => showStory(stIndex - 1));
$('#st-next').addEventListener('click', () => showStory(stIndex + 1));

// ── atom labels ──────────────────────────────────────────────────────────
const atomsBox = $('#atoms');
atomsBox.innerHTML = CIRCLES.map((c, i) => `<div class="atom" data-i="${i}" style="--c:${c.color}"><i></i><span><b>${c.n}</b>${esc(c.name)}<small>${c.members.toLocaleString('en-IN')}</small></span></div>`).join('')
  + '<div class="atom atom--you" style="--c:#7ff5e4"><i></i><span>+ you</span></div>';
const atomEls = $$('.atom', atomsBox);
atomsBox.addEventListener('click', (ev) => { const a = ev.target.closest('.atom[data-i]'); if (a) showCircle(+a.dataset.i); });
function paintAtoms(p) {
  const hubW = 1 - smooth((p - 0.05) / 0.3);
  const ciW = 1 - smooth((Math.abs(p - 7) - 0.05) / 0.3);
  const joinW = smooth((p - 8.75) / 0.2);
  const show = Math.max(hubW, ciW, joinW * 0.0);
  atomsBox.classList.toggle('is-pick', ciW > 0.6);
  if (show < 0.01 && joinW < 0.01) { atomEls.forEach((el) => { el.style.opacity = '0'; }); return; }
  const pts = world.atomLabels();
  const narrow = window.innerWidth < 860;
  atomEls.forEach((el, k) => {
    const q = pts[k];
    const isYou = k === 6;
    let o = isYou ? joinW : show * q.front * (narrow ? 0 : 1);
    if (!isYou && joinW > 0.01) o = Math.max(o, joinW * q.front * (k === 0 ? 0 : 0));
    el.style.opacity = o.toFixed(3);
    if (o < 0.01) return;
    const len = Math.hypot(q.dx, q.dy) || 1;
    const push = 34;
    const left = q.dx < 0;
    el.classList.toggle('is-left', left);
    const x = q.x + (q.dx / len) * push;
    const y = q.y + (q.dy / len) * push * 0.6;
    // keep labels on screen
    const lx = clamp(left ? x - el.offsetWidth : x, 8, window.innerWidth - el.offsetWidth - 8);
    el.style.transform = `translate3d(${lx.toFixed(1)}px, ${(y - 12).toFixed(1)}px, 0)`;
  });
}

// ── console (types a few facts about where you are) ─────────────────────
const consoleBody = $('#console-body'), consoleStep = $('#console-step');
function consoleLines(i) {
  const k = (s) => `<span class="c-k">${esc(s)}</span>`;
  const val = (s) => `<span class="c-v">${esc(s)}</span>`;
  if (i === 0) return [`> community.status()`, `${k('circles ')}  ${val('20+')}  led by practitioners`, `${k('colleges')}  ${val('700+')} & pharma hubs`, `${k('events  ')}  ${val(String(EVENTS.length))} upcoming`];
  if (i >= 1 && i <= 5) { const p = PILLARS[i - 1]; return [`> pillars[${p.n}].${p.name.toLowerCase()}()`, `${k('stat  ')}  ${val(p.stat)} ${p.statLabel.toLowerCase()}`, ...p.points.slice(0, 2).map((t) => `${k('+')} ${t}`)]; }
  if (i === 6) { const e = EVENTS[evIndex]; return [`> events.next(${filter ? `"${filter.toLowerCase()}"` : ''})`, `${k('date ')}  ${val(e.date)}`, `${k('seats')}  ${val(`${e.reg}/${e.seats}`)} · ${e.left} left`, `${k('host ')}  ${e.speaker[0]}`]; }
  if (i === 7) { const c = CIRCLES[ciIndex]; return [`> circles[${c.n}].open()`, `${k('name   ')}  ${val(c.name)}`, `${k('members')}  ${val(c.members.toLocaleString('en-IN'))} · ${c.status.toLowerCase()}`, `${k('lead   ')}  ${c.lead}`]; }
  if (i === 8) { const s = STORIES[stIndex]; return [`> stories[0${stIndex + 1}].verify()`, `${k('member ')}  ${s.author}`, `${k('outcome')}  ${val(s.metric)}`, `${k('status ')}  ${val('verified ✓')}`]; }
  return [`> you.connect()`, `${k('circles')}  ${val('20+')} from day one`, `${k('price  ')}  ${val('free')} for students`, `${k('bond   ')}  ${joined ? val('formed ✓') : 'waiting for you…'}`];
}
let typing = 0;
function typeConsole(i) {
  consoleStep.textContent = `${String(i).padStart(2, '0')}/${String(N - 1).padStart(2, '0')}`;
  const html = consoleLines(i).join('\n');
  cancelAnimationFrame(typing);
  if (calm) { consoleBody.innerHTML = `${html}<span class="c-cur"></span>`; return; }
  // type the plain text, then swap in the coloured version
  const tmp = document.createElement('div'); tmp.innerHTML = html;
  const plain = tmp.textContent;
  let n = 0;
  const step = () => {
    n += 3;
    if (n >= plain.length) { consoleBody.innerHTML = `${html}<span class="c-cur"></span>`; return; }
    consoleBody.textContent = plain.slice(0, n);
    typing = requestAnimationFrame(step);
  };
  step();
}

// ── scroll → progress, with a gentle settle onto the nearest chapter ─────
const track = $('#track');
const scroll = { seg: 1, auto: 0, dir: 1, lastY: 0, touching: false, holding: false, idle: 0, dest: 0, lastW: 0 };
const free = params.has('p');
function layout() {
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
  cancelAuto(); clearTimeout(scroll.idle);
  const from = window.scrollY, to = i * scroll.seg;
  if (Math.abs(to - from) < 1) return;
  if (instant || calm) { window.scrollTo(0, to); return; }
  const dur = clamp(700 + (Math.abs(to - from) / scroll.seg) * 380, 700, 2400);
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
  const T = 0.03;
  flyTo(scroll.dir > 0 ? (f > T ? base + 1 : base) : (f < 1 - T ? base : base + 1));
}
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
window.addEventListener('pointerdown', (e) => { if (e.target === document.documentElement) { scroll.holding = true; cancelAuto(); } });
window.addEventListener('pointerup', () => { if (scroll.holding) { scroll.holding = false; clearTimeout(scroll.idle); scroll.idle = setTimeout(settle, 150); } });
window.addEventListener('resize', layout);

window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const here = scroll.auto ? scroll.dest : Math.round(progressNow());
  let to = null;
  if (e.key === 'ArrowDown' || e.key === 'PageDown') to = here + 1;
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') to = here - 1;
  else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    // inside a chapter with choices, left/right browse them
    const d = e.key === 'ArrowRight' ? 1 : -1;
    if (here === 6) { e.preventDefault(); stepEvent(d); return; }
    if (here === 7) { e.preventDefault(); showCircle((ciIndex + d + CIRCLES.length) % CIRCLES.length); return; }
    if (here === 8) { e.preventDefault(); showStory(stIndex + d); return; }
    to = here + d;
  } else if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A') to = here + (e.shiftKey ? -1 : 1);
  else if (e.key === 'Home') to = 0;
  else if (e.key === 'End') to = N - 1;
  if (to === null) return;
  e.preventDefault();
  flyTo(to);
});
document.addEventListener('click', (e) => {
  const el = e.target.closest?.('[data-go]');
  if (!el) return;
  e.preventDefault();
  if (el.dataset.filter) { filter = el.dataset.filter; world?.filterEvents(filter); syncFilters(); showEvent(EVENTS.findIndex((x) => x.type === filter)); }
  flyTo(indexOf(el.dataset.go));
});
prevBtn.addEventListener('click', () => flyTo((scroll.auto ? scroll.dest : Math.round(progressNow())) - 1));
nextBtn.addEventListener('click', () => flyTo((scroll.auto ? scroll.dest : Math.round(progressNow())) + 1));

// ── per frame: move the copy with the camera ─────────────────────────────
// how the copy leaves on each leg (opposite to the camera move)
const LEG = [
  { x: -1, y: 0, z: 0 }, { x: -0.7, y: 0, z: 0 }, { x: -0.7, y: 0, z: 0 }, { x: -0.7, y: 0, z: 0 }, { x: -0.7, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: -1 },
];
let chapter = -1, joined = false;
function setChapter(i) {
  if (i === chapter) return;
  chapter = i;
  const file = CHAPTERS[i].file;
  tabs.forEach((a) => (a.dataset.file === file ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  dotEls.forEach((d, k) => d.classList.toggle('is-now', k === i));
  prevBtn.disabled = i === 0;
  nextBtn.disabled = i === N - 1;
  try { history.replaceState(null, '', i === 0 ? location.pathname + location.search : `#${CHAPTERS[i].id}`); } catch { /* sandboxed */ }
  typeConsole(i);
}
function paint(p) {
  const travelPx = Math.min(window.innerWidth, window.innerHeight) * 0.16;
  sections.forEach((sec, i) => {
    const d = p - i, ad = Math.abs(d);
    const o = 1 - smooth((ad - 0.1) / 0.2);
    const on = o > 0.002;
    if (on !== sec._on) { sec._on = on; sec.classList.toggle('is-on', on); sec.toggleAttribute('inert', !on); }
    const active = on && ad < 0.2;
    if (active !== sec._active) { sec._active = active; sec.classList.toggle('is-active', active); }
    if (!on) return;
    const away = 1 - o;
    const leg = d > 0 ? LEG[i] : LEG[i - 1];
    const sign = d > 0 ? 1 : -1;
    sec.style.setProperty('--o', o.toFixed(3));
    sec.style.setProperty('--tx', leg ? `${(leg.x * sign * away * travelPx).toFixed(1)}px` : '0px');
    sec.style.setProperty('--ty', leg ? `${(leg.y * sign * away * travelPx).toFixed(1)}px` : '0px');
    sec.style.setProperty('--s', leg ? (1 + leg.z * sign * away * 0.3).toFixed(3) : '1');
  });
  setChapter(clamp(Math.round(p), 0, N - 1));
}

// ── join ─────────────────────────────────────────────────────────────────
const joinForm = $('#join-form'), joinMsg = $('#join-msg');
joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = joinForm.email.value.trim();
  joinMsg.className = 'joinform__msg';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    joinMsg.textContent = 'Please enter a valid email address.';
    joinForm.email.setAttribute('aria-invalid', 'true');
    joinForm.email.focus();
    return;
  }
  joinForm.email.removeAttribute('aria-invalid');
  joined = true;
  typeConsole(N - 1);
  const url = `${SIGNUP}?email=${encodeURIComponent(email)}`;
  joinMsg.classList.add('ok');
  joinMsg.innerHTML = `Bond formed — taking you to sign-up… <a href="${url}">Continue</a>`;
  setTimeout(() => { try { window.location.assign(url); } catch { /* preview frames block navigation */ } }, 900);
});

// ── boot ─────────────────────────────────────────────────────────────────
const loader = $('#loader'), bar = $('#loader-bar'), pct = $('#loader-pct'), label = $('#loader-label'), log = $('#loader-log');
let shown = 0, goal = 0.05;
const loadTick = setInterval(() => {
  shown += (goal - shown) * 0.2;
  bar.style.transform = `scaleX(${shown.toFixed(3)})`;
  pct.textContent = String(Math.round(shown * 100)).padStart(3, '0');
}, 50);
const say = (line) => { log.textContent += `\n${line}`; };
const timeout = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  layout();
  showEvent(0); showCircle(0); showStory(0);
  if (!webglAvailable() || params.has('static')) {
    document.body.classList.add('no-webgl', 'is-in');
    clearInterval(loadTick);
    return;
  }
  const glyphs = 'AaRx→·’—%&₹✓';
  const fonts = Promise.all([
    document.fonts.load('800 80px Poppins', glyphs), document.fonts.load('700 40px Poppins', glyphs), document.fonts.load('600 20px Poppins', glyphs),
    document.fonts.load('500 16px "Geist Variable"', glyphs), document.fonts.load('500 14px "Geist Mono Variable"', glyphs),
  ]).catch(() => {});
  const assets = await Promise.all([loadAssets(BASE, (k) => { goal = 0.08 + k * 0.5; }), Promise.race([fonts, timeout(5000)])]).then(([a]) => a);
  say(`  ${CIRCLES.length} circles · ${EVENTS.length} events · ${STORIES.length} stories`);
  goal = 0.66; label.textContent = 'Building the molecule';
  await timeout(30);
  world = createWorld({ canvas: $('#world'), assets, calm, quality: params.get('q') ?? 'auto' });
  world.on('event', (i) => showEvent(i, { fromWorld: true }));
  world.on('circle', (i) => showCircle(i));
  world.on('story', (i) => showStory(i, { fromWorld: true }));
  world.filterEvents(filter);
  world.selectEvent(evIndex); world.selectCircle(ciIndex); world.selectStory(stIndex);
  world.onFrame((p) => { paint(p); paintAtoms(p); });
  say('  bonds ............ ok');
  goal = 0.88; label.textContent = 'Warming up';
  await world.warm();

  const startAt = free ? +params.get('p') : indexOf(location.hash.slice(1));
  if (startAt > 0) { window.scrollTo(0, startAt * scroll.seg); world.jump(startAt); world.skipIntro(); }
  if (params.has('nointro')) world.skipIntro();
  world.setTarget(progressNow());
  say('> ready');
  goal = 1; label.textContent = 'Ready';
  await timeout(350);
  clearInterval(loadTick);
  bar.style.transform = 'scaleX(1)'; pct.textContent = '100';
  loader.classList.add('is-done');
  world.start();
  setTimeout(() => document.body.classList.add('is-in'), world.introDone ? 60 : 1400);
}
boot().catch((err) => {
  console.error(err);
  clearInterval(loadTick);
  loader.classList.add('is-done');
  document.body.classList.add('no-webgl', 'is-in');
});
