import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-800.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './style.css';

import { CHAPTERS, PILLARS, EVENTS, EVENT_TYPES, TYPE_COLOR, CIRCLES, STORIES, SITE } from './data.js';
import { STATIONS } from './engine/layout.js';

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
const indexOf = (id) => Math.max(0, CHAPTERS.findIndex((c) => c.id === id));
const sideClass = (i) => (STATIONS[i].side > 0 ? 'station--left' : STATIONS[i].side < 0 ? 'station--right' : 'station--center');

// ── build pillar + story chapters from data ──────────────────────────────
const calendarSec = $('#calendar');
PILLARS.forEach((p, k) => {
  const i = indexOf(['learn', 'connect', 'collaborate', 'discover', 'grow'][k]);
  const node = $('#pillar-tpl').content.firstElementChild.cloneNode(true);
  node.id = CHAPTERS[i].id;
  node.classList.add(sideClass(i));
  node.style.setProperty('--c', p.color);
  node.setAttribute('aria-labelledby', `${node.id}-h`);
  $('.steps', node).innerHTML = PILLARS.map((q, j) => `<li class="${j === k ? 'is-now' : ''}" style="--c:${q.color}">${q.n} ${q.name}</li>`).join('');
  $('.pillar__kicker', node).textContent = `${p.n} — ${p.kicker}`;
  const h = $('.pillar__name', node); h.id = `${node.id}-h`; h.textContent = `${p.name}.`;
  $('.pillar__body', node).textContent = p.body;
  $('.pillar__stat b', node).textContent = p.stat;
  $('.pillar__stat span', node).textContent = p.statLabel;
  const cta = $('.pillar__cta', node);
  cta.textContent = `${p.cta} →`;
  cta.dataset.go = p.go === 'stories' ? 'aman' : p.go;
  if (p.filter) cta.dataset.filter = p.filter;
  calendarSec.before(node);
});
const joinSec = $('#join');
STORIES.forEach((s, k) => {
  const i = indexOf(['aman', 'divya', 'karthik'][k]);
  const node = $('#story-tpl').content.firstElementChild.cloneNode(true);
  node.id = CHAPTERS[i].id;
  node.classList.add(sideClass(i));
  node.style.setProperty('--c', s.color);
  node.setAttribute('aria-label', `${s.author}: ${s.lead} ${s.turn}`);
  $('.story__badge', node).innerHTML = `<i class="dot"></i>Their story · ${String(k + 1).padStart(2, '0')} <span>— ${esc(s.badge)}</span>`;
  $('.story__lead', node).textContent = s.lead;
  $('.story__turn', node).textContent = s.turn;
  $('.story__quote p', node).textContent = s.quote;
  const av = $('.story__quote .avatar', node); av.textContent = s.initials; av.style.setProperty('--c', s.color);
  $('.story__quote b', node).textContent = s.author;
  $('.story__quote small', node).textContent = s.title;
  $('.steps', node).innerHTML = STORIES.map((q, j) => `<li class="${j === k ? 'is-now' : ''}" style="--c:${q.color}">${String(j + 1).padStart(2, '0')} ${q.author.split(' ')[0]}</li>`).join('');
  joinSec.before(node);
});
['hub', 'alone', 'together', 'calendar', 'events', 'circles', 'join'].forEach((id) => {
  const el = $(`#${id}`); el.classList.remove('station--left', 'station--right', 'station--center'); el.classList.add(sideClass(indexOf(id)));
});

const sections = CHAPTERS.map((c) => $(`#${c.id}`));
sections.forEach((sec, i) => { sec.dataset.station = String(i); $$('[data-r]', sec).forEach((el, k) => el.style.setProperty('--i', k)); });
const tabs = $$('.tabs a');
const dots = $('#dots');
dots.innerHTML = CHAPTERS.map(() => '<li></li>').join('');
const dotEls = $$('li', dots);
const prevBtn = $('#prev'), nextBtn = $('#next'), hud = $('#hud');

$('#legend').innerHTML = EVENT_TYPES.map((t) => `<li style="--c:${TYPE_COLOR[t]}"><i></i><b>${t}s</b><span>${EVENTS.filter((e) => e.type === t).length} upcoming</span></li>`).join('');

// ── events ───────────────────────────────────────────────────────────────
let world = null, filter = null, evIndex = 0, chapter = -1, joined = false;
const filters = $('#filters');
filters.innerHTML = EVENT_TYPES.map((t) => `<button type="button" role="tab" aria-selected="false" data-type="${t}" style="--c:${TYPE_COLOR[t]}"><i></i>${t}s</button>`).join('');
function showEvent(i, { fromWorld = false } = {}) {
  evIndex = ((i % EVENTS.length) + EVENTS.length) % EVENTS.length;
  const e = EVENTS[evIndex];
  if (filter && e.type !== filter) { filter = null; world?.filterEvents(null); syncFilters(); }
  const card = $('#event');
  card.classList.remove('is-swap'); void card.offsetWidth; card.classList.add('is-swap');
  card.style.setProperty('--c', TYPE_COLOR[e.type]);
  $('#ev-type').textContent = e.type;
  $('#ev-when').textContent = `${e.date} · ${e.time.split(' - ')[0]}`;
  $('#ev-count').textContent = `${String(evIndex + 1).padStart(2, '0')}/${EVENTS.length}`;
  $('#ev-title').textContent = e.title;
  const av = $('#ev-avatar'); av.textContent = e.speaker[3]; av.style.setProperty('--c', e.toneColor);
  $('#ev-speaker').textContent = e.speaker[0];
  $('#ev-role').textContent = `${e.speaker[1]} · ${e.mode}`;
  $('#ev-bar').style.width = `${Math.round((e.reg / e.seats) * 100)}%`;
  $('#ev-reg').textContent = `${e.reg}/${e.seats} registered`;
  $('#ev-left').textContent = `${e.left} seats left`;
  $('#ev-register').setAttribute('aria-label', `Register for ${e.title}`);
  if (!fromWorld) world?.selectEvent(evIndex);
  if (chapter === indexOf('events')) typeConsole(chapter);
}
function syncFilters() { $$('button', filters).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.type === filter))); }
filters.addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return;
  filter = filter === b.dataset.type ? null : b.dataset.type;
  world?.filterEvents(filter); syncFilters();
  if (filter) showEvent(EVENTS.findIndex((e) => e.type === filter));
});
const stepEvent = (d) => {
  if (!filter) return showEvent(evIndex + d);
  const list = EVENTS.map((e, i) => [e, i]).filter(([e]) => e.type === filter).map(([, i]) => i);
  showEvent(list[(list.indexOf(evIndex) + d + list.length) % list.length]);
};
$('#ev-prev').addEventListener('click', () => stepEvent(-1));
$('#ev-next').addEventListener('click', () => stepEvent(1));

// ── circles ──────────────────────────────────────────────────────────────
let ciIndex = 0;
let pinEls = [];
const picks = $('#circle-picks');
picks.innerHTML = CIRCLES.map((c, i) => `<button type="button" role="tab" aria-selected="false" data-i="${i}" style="--c:${c.color}"><small>${c.n} · ${c.members.toLocaleString('en-IN')}</small><b>${esc(c.name)}</b></button>`).join('');
function showCircle(i, { fromWorld = false } = {}) {
  ciIndex = i;
  const c = CIRCLES[i];
  const card = $('.circle');
  card.classList.remove('is-swap'); void card.offsetWidth; card.classList.add('is-swap');
  card.style.setProperty('--c', c.color);
  $$('button', picks).forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.i === i)));
  $('#ci-body').textContent = c.body;
  $('#ci-lead').textContent = c.lead;
  const st = $('#ci-status'); st.textContent = `${c.status} · ${c.members.toLocaleString('en-IN')} members`; st.classList.toggle('is-hot', c.status === 'Hot');
  const join = $('#ci-join'); join.textContent = `Join ${c.name} →`; join.href = SIGNUP;
  if (!fromWorld) world?.selectCircle(i);
  pinEls.forEach((p) => p.el.classList.toggle('is-sel', p.a.atom === i));
  if (chapter === indexOf('circles')) typeConsole(chapter);
}
picks.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (b) showCircle(+b.dataset.i); });

// ── pins: labels attached to points in the 3D world ─────────────────────
const pinsBox = $('#pins');
function buildPins(anchors) {
  pinsBox.innerHTML = '';
  pinEls = anchors.map((a) => {
    const el = document.createElement('div');
    el.className = `pin pin--${a.kind ?? 'tag'}`;
    if (a.color) el.style.setProperty('--c', a.color);
    el.innerHTML = `<span>${esc(a.text)}${a.sub ? `<small>${esc(a.sub)}</small>` : ''}</span>`;
    if (a.atom !== undefined) el.dataset.atom = a.atom;
    pinsBox.appendChild(el);
    return { el, a, o: -1 };
  });
}
pinsBox.addEventListener('click', (ev) => { const p = ev.target.closest('.pin[data-atom]'); if (p) showCircle(+p.dataset.atom); });
function paintPins() {
  const w = world.weights;
  pinsBox.classList.toggle('is-pick', w[indexOf('circles')] > 0.6);
  const narrow = window.innerWidth < 860;
  pinEls.forEach((p) => {
    let o = 0;
    p.a.stations.forEach((s) => { o = Math.max(o, smooth((w[s] - 0.55) / 0.4)); });
    if (narrow && (p.a.kind === 'tag' || p.a.kind === 'orbit')) o = 0;
    if (o < 0.01) { if (p.o !== 0) { p.el.style.opacity = '0'; p.o = 0; } return; }
    const s = world.projectAnchor(p.a);
    if (s.behind) { p.el.style.opacity = '0'; p.o = 0; return; }
    p.el.style.opacity = o.toFixed(3); p.o = o;
    const x = clamp(s.x - 4, 6, window.innerWidth - p.el.offsetWidth - 6);
    p.el.style.transform = `translate3d(${x.toFixed(1)}px, ${(s.y - 10).toFixed(1)}px, 0)`;
  });
}

// ── console ──────────────────────────────────────────────────────────────
const consoleBody = $('#console-body'), consoleStep = $('#console-step');
function consoleLines(i) {
  const id = CHAPTERS[i].id;
  const k = (s) => `<span class="c-k">${esc(s)}</span>`, val = (s) => `<span class="c-v">${esc(s)}</span>`;
  if (id === 'hub') return ['> community.status()', `${k('circles ')}  ${val('20+')}  led by practitioners`, `${k('colleges')}  ${val('700+')} & pharma hubs`, `${k('events  ')}  ${val(String(EVENTS.length))} upcoming`];
  if (id === 'alone') return ['> learner.network()', `${k('peers   ')}  ${val('—')}`, `${k('mentors ')}  ${val('—')}`, `${k('status  ')}  isolated`];
  if (id === 'together') return ['> learner.join(community)', `${k('circles ')}  ${val('20+')}`, `${k('colleges')}  ${val('700+')}`, `${k('status  ')}  ${val('connected ✓')}`];
  const pi = CHAPTERS[i].pillar;
  if (pi !== undefined) { const p = PILLARS[pi]; return [`> pillars[${p.n}].${p.name.toLowerCase()}()`, `${k('stat ')}  ${val(p.stat)}`, ...p.points.map((t) => `${k('+')} ${t}`)]; }
  if (id === 'calendar') return ['> events.range()', `${k('from ')}  ${val('24 Oct 2026')}`, `${k('to   ')}  ${val('10 Jan 2027')}`, `${k('total')}  ${val(String(EVENTS.length))} · 5 types`];
  if (id === 'events') { const e = EVENTS[evIndex]; return [`> events.open(${String(evIndex + 1).padStart(2, '0')})`, `${k('date ')}  ${val(e.date)}`, `${k('seats')}  ${val(`${e.reg}/${e.seats}`)} · ${e.left} left`, `${k('host ')}  ${e.speaker[0]}`]; }
  if (id === 'circles') { const c = CIRCLES[ciIndex]; return [`> circles[${c.n}].open()`, `${k('name   ')}  ${val(c.name)}`, `${k('members')}  ${val(c.members.toLocaleString('en-IN'))} · ${c.status.toLowerCase()}`, `${k('lead   ')}  ${c.lead}`]; }
  const si = CHAPTERS[i].story;
  if (si !== undefined) { const s = STORIES[si]; return [`> stories[0${si + 1}].verify()`, `${k('member ')}  ${s.author}`, `${k('outcome')}  ${val(s.metric)}`, `${k('proof  ')}  ${s.metricLabel}`]; }
  return ['> you.connect()', `${k('circles')}  ${val('20+')} from day one`, `${k('price  ')}  ${val('free')} for students`, `${k('bond   ')}  ${joined ? val('formed ✓') : 'waiting for you…'}`];
}
let typing = 0;
function typeConsole(i) {
  consoleStep.textContent = `${String(i).padStart(2, '0')}/${String(N - 1).padStart(2, '0')}`;
  const html = consoleLines(i).join('\n');
  cancelAnimationFrame(typing);
  if (calm) { consoleBody.innerHTML = `${html}<span class="c-cur"></span>`; return; }
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

// ── scroll → progress, settling onto the nearest chapter ────────────────
const track = $('#track');
const scroll = { seg: 1, auto: 0, dir: 1, lastY: 0, touching: false, holding: false, idle: 0, dest: 0, lastW: 0 };
const free = params.has('p');
function layout() {
  if (scroll.lastW === window.innerWidth && scroll.seg > 1 && window.matchMedia('(pointer: coarse)').matches) return;
  const keep = progressNow();
  scroll.lastW = window.innerWidth;
  scroll.seg = Math.max(480, Math.round(window.innerHeight * 0.9));
  track.style.height = `calc(${scroll.seg * (N - 1)}px + 100vh)`;
  track.style.height = `calc(${scroll.seg * (N - 1)}px + 100lvh)`;
  if (keep > 0.001) window.scrollTo(0, keep * scroll.seg);
}
function progressNow() { return clamp(window.scrollY / scroll.seg, 0, N - 1); }
function cancelAuto() { if (scroll.auto) { cancelAnimationFrame(scroll.auto); scroll.auto = 0; } }
function flyTo(index, { instant = false } = {}) {
  const i = clamp(Math.round(index), 0, N - 1);
  scroll.dest = i; cancelAuto(); clearTimeout(scroll.idle);
  const from = window.scrollY, to = i * scroll.seg;
  if (Math.abs(to - from) < 1) return;
  if (instant || calm) { window.scrollTo(0, to); return; }
  const dur = clamp(800 + (Math.abs(to - from) / scroll.seg) * 300, 800, 2600);
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
    const d = e.key === 'ArrowRight' ? 1 : -1;
    if (here === indexOf('events')) { e.preventDefault(); stepEvent(d); return; }
    if (here === indexOf('circles')) { e.preventDefault(); showCircle((ciIndex + d + CIRCLES.length) % CIRCLES.length); return; }
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

// ── per frame: the copy rides along with the camera ─────────────────────
const LEG = STATIONS.slice(0, -1).map((s, i) => {
  const a = s.side, b = STATIONS[i + 1].side;
  if (a === 0 || b === 0) return { x: 0, y: 0, z: 1 };
  return { x: a === b ? -0.8 : -a, y: 0, z: 0 };
});
function setChapter(i) {
  if (i === chapter) return;
  chapter = i;
  const file = CHAPTERS[i].file;
  tabs.forEach((a) => (a.dataset.file === file ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  dotEls.forEach((d, k) => d.classList.toggle('is-now', k === i));
  prevBtn.disabled = i === 0; nextBtn.disabled = i === N - 1;
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
    joinForm.email.setAttribute('aria-invalid', 'true'); joinForm.email.focus();
    return;
  }
  joinForm.email.removeAttribute('aria-invalid');
  joined = true; typeConsole(N - 1); world?.joined();
  const url = `${SIGNUP}?email=${encodeURIComponent(email)}`;
  joinMsg.classList.add('ok');
  joinMsg.innerHTML = `Bond formed — taking you to sign-up… <a href="${url}">Continue</a>`;
  setTimeout(() => { try { window.location.assign(url); } catch { /* preview frames block navigation */ } }, 1100);
});

// ── boot ─────────────────────────────────────────────────────────────────
const loader = $('#loader'), bar = $('#loader-bar'), pct = $('#loader-pct'), label = $('#loader-label'), log = $('#loader-log');
let shown = 0, goal = 0.04;
const loadTick = setInterval(() => {
  shown += (goal - shown) * 0.2;
  bar.style.transform = `scaleX(${shown.toFixed(3)})`;
  pct.textContent = String(Math.round(shown * 100)).padStart(3, '0');
}, 50);
const say = (line) => { log.textContent += `\n${line}`; };
const timeout = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  layout();
  showEvent(0); showCircle(0);
  // the 3D engines load as a separate chunk so the page shell paints first
  const engine = await import('./engine/index.js');
  goal = 0.1;
  if (!engine.webglAvailable() || params.has('static')) {
    document.body.classList.add('no-webgl', 'is-in'); clearInterval(loadTick); return;
  }
  const glyphs = 'AaRx→·’—%&₹✓…';
  const fonts = Promise.all([
    document.fonts.load('800 80px Poppins', glyphs), document.fonts.load('700 40px Poppins', glyphs), document.fonts.load('600 20px Poppins', glyphs),
    document.fonts.load('500 16px "Geist Variable"', glyphs), document.fonts.load('500 14px "Geist Mono Variable"', glyphs),
  ]).catch(() => {});
  say('  engines ........... babylon.js + three.js');
  const [assets] = await Promise.all([engine.loadAssets(BASE, (k) => { goal = 0.1 + k * 0.45; }), Promise.race([fonts, timeout(5000)])]);
  say(`  members ........... ${CIRCLES.reduce((s, c) => s + c.members, 0).toLocaleString('en-IN')} in 6 circles`);
  goal = 0.62; label.textContent = 'Forming the swarm';
  await timeout(30);
  world = engine.createWorld({ babylonCanvas: $('#bjs'), threeCanvas: $('#swarm'), assets, calm, quality: params.get('q') ?? 'auto' });
  world.on('event', (i) => showEvent(i, { fromWorld: true }));
  world.on('circle', (i) => showCircle(i, { fromWorld: true }));
  world.filterEvents(filter); world.selectEvent(evIndex); world.selectCircle(ciIndex);
  buildPins(world.anchors);
  showCircle(ciIndex, { fromWorld: true });
  world.onFrame((p) => { paint(p); paintPins(); });
  say('  bonds ............. ok');
  goal = 0.86; label.textContent = 'Compiling shaders';
  await world.warm();
  const startAt = free ? +params.get('p') : indexOf(location.hash.slice(1));
  if (startAt > 0) { window.scrollTo(0, startAt * scroll.seg); world.jump(startAt); world.skipIntro(); }
  if (params.has('nointro')) world.skipIntro();
  world.setTarget(progressNow());
  say('> ready');
  goal = 1; label.textContent = 'Ready';
  await timeout(300);
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
