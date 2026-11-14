import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-800.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './style.css';

import {
  HERO, FEATURES, EVENTS_INTRO, ALL_EVENTS, EVENT_FORMATS, FORMAT_COLOR, SESSIONS, JOURNAL, AMBASSADORS, GUIDELINES, RESUMES, JOIN, SIGNUP,
} from './content.js';
import { wireForm, detectPlatform, icsHref } from './forms.js';
import { STATIONS } from './engine/layout.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const params = new URLSearchParams(location.search);
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const BASE = '../';

const CHAPTERS = [
  { id: 'hub', file: 'community.hub' }, { id: 'map', file: 'events.section' }, { id: 'events', file: 'events.section' },
  { id: 'sessions', file: 'sessions.section' }, { id: 'portal', file: 'sessions.section' }, { id: 'journal', file: 'journal.section' },
  { id: 'ambassadors', file: 'ambassadors.section' }, { id: 'guidelines', file: 'guidelines.section' }, { id: 'resumes', file: 'resumes.section' },
  { id: 'join', file: 'join.section' },
];
const N = CHAPTERS.length;
const indexOf = (id) => Math.max(0, CHAPTERS.findIndex((c) => c.id === id));
const sideClass = (i) => (STATIONS[i].side > 0 ? 'station--left' : STATIONS[i].side < 0 ? 'station--right' : 'station--center');
let world = null, chapter = -1, joined = false;

// ── fill panels ──────────────────────────────────────────────────────────
$('#hub-h').innerHTML = `${esc(HERO.title[0])} <span class="grad">${esc(HERO.title[1])}</span>`;
$('#hub-lede').textContent = 'Events from across the industry, sessions led by people who do the work, honest writing about the field, and real examples to learn from.';
$('#hub-features').innerHTML = FEATURES.map((f) => `<li><button type="button" data-go="${f.id === 'events' ? 'map' : f.id}" style="--c:${f.color}"><small>${f.n}</small>${esc(f.name)}</button></li>`).join('');
$('#map-h').textContent = EVENTS_INTRO.title;
$('#map-how').innerHTML = EVENTS_INTRO.how.map(([b, s]) => `<li><b>${esc(b)}</b><span>${esc(s)}</span></li>`).join('');
$('#ss-h').textContent = SESSIONS.title;
$('#ss-lede').textContent = 'If you’ve faced an audit, filed a dossier or processed a thousand case reports, someone here needs to hear how you did it.';
$('#ss-perks').innerHTML = SESSIONS.perks.map((p) => `<li>${esc(p)}</li>`).join('');
$('#pt-steps').innerHTML = SESSIONS.steps.map(([b, s]) => `<li><b>${esc(b)}</b><span>${esc(s)}</span></li>`).join('');
$('#ss-rules').innerHTML = SESSIONS.rules.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('');
$('#jr-h').textContent = JOURNAL.title;
$('#jr-lede').textContent = 'Plain-spoken writing about pharma careers, written and maintained by the SkillCures team.';
$('#am-h').textContent = AMBASSADORS.title;
$('#am-lede').textContent = AMBASSADORS.lede;
$('#am-get').innerHTML = AMBASSADORS.get.map(([t]) => `<li>${esc(t)}</li>`).join('');
$('#am-steps').innerHTML = AMBASSADORS.steps.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('');
$('#amb-guide').innerHTML = AMBASSADORS.guidelines.map(([t, d], k) => `<details${k === 0 ? ' open' : ''}><summary>${esc(t)}</summary><p>${esc(d)}</p></details>`).join('');
$('#amb-enf').textContent = AMBASSADORS.enforcement;
$('#gl-h').textContent = GUIDELINES.title;
$('#gl-enf').textContent = `${GUIDELINES.enforcement.map(([t]) => t).join(' → ')}. ${GUIDELINES.serious}`;
$('#rs-h').textContent = RESUMES.title;
$('#rs-sample').textContent = RESUMES.sampleNote;
$('#join-h').innerHTML = `${esc(JOIN.title.replace(' one connection.', ''))} <span class="grad">one connection.</span>`;
$('#join-ticks').innerHTML = JOIN.ticks.map((t) => `<li>${esc(t)}</li>`).join('');

CHAPTERS.forEach((c, i) => {
  const sec = $(`#${c.id}`);
  sec.classList.add(sideClass(i));
  sec.dataset.station = String(i);
  $$('[data-r]', sec).forEach((el, k) => el.style.setProperty('--i', k));
});
const sections = CHAPTERS.map((c) => $(`#${c.id}`));
const tabs = $$('.tabs a');
$('#dots').innerHTML = CHAPTERS.map(() => '<li></li>').join('');
const dotEls = $$('#dots li');
const prevBtn = $('#prev'), nextBtn = $('#next'), hud = $('#hud');

// ── events ───────────────────────────────────────────────────────────────
let evIndex = 0, filter = null;
const formats = EVENT_FORMATS.filter((f) => ALL_EVENTS.some((e) => e.type === f));
$('#filters').innerHTML = formats.map((f) => `<button type="button" aria-pressed="false" data-type="${f}" style="--c:${FORMAT_COLOR[f]}"><i></i>${f}s</button>`).join('');
function showEvent(i, { fromWorld = false } = {}) {
  evIndex = ((i % ALL_EVENTS.length) + ALL_EVENTS.length) % ALL_EVENTS.length;
  const e = ALL_EVENTS[evIndex];
  if (filter && e.type !== filter) { filter = null; world?.filterEvents(null); syncFilters(); }
  const card = $('#event');
  card.classList.remove('is-swap'); void card.offsetWidth; card.classList.add('is-swap');
  card.style.setProperty('--c', FORMAT_COLOR[e.type]);
  $('#ev-type').textContent = e.type;
  $('#ev-src').textContent = e.source === 'Industry' ? 'Industry' : 'SkillCures';
  $('#ev-count').textContent = `${String(evIndex + 1).padStart(2, '0')}/${ALL_EVENTS.length}`;
  $('#ev-title').textContent = e.title;
  $('#ev-desc').textContent = e.description;
  $('#ev-where').textContent = `${e.date} · ${e.where}`;
  const cal = $('#ev-cal'); cal.href = icsHref(e); cal.setAttribute('download', `${e.title.slice(0, 40)}.ics`);
  $('#ev-reg').hidden = e.source !== 'SkillCures';
  if (!fromWorld) world?.selectEvent(evIndex);
  if (chapter === indexOf('events')) typeConsole(chapter);
}
function syncFilters() { $$('#filters button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === filter))); }
$('#filters').addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return;
  filter = filter === b.dataset.type ? null : b.dataset.type;
  world?.filterEvents(filter); syncFilters();
  if (filter) showEvent(ALL_EVENTS.findIndex((e) => e.type === filter));
});
const stepEvent = (d) => {
  if (!filter) return showEvent(evIndex + d);
  const list = ALL_EVENTS.map((e, i) => [e, i]).filter(([e]) => e.type === filter).map(([, i]) => i);
  showEvent(list[(list.indexOf(evIndex) + d + list.length) % list.length]);
};
$('#ev-prev').addEventListener('click', () => stepEvent(-1));
$('#ev-next').addEventListener('click', () => stepEvent(1));

// ── journal ──────────────────────────────────────────────────────────────
let pageIndex = 0;
$('#jr-list').innerHTML = JOURNAL.posts.map((p, k) => `<li><button type="button" data-page="${k}" style="--c:${p.color}"><small>${esc(p.tag)} · ${p.mins} min</small><b>${esc(p.title)}</b></button></li>`).join('');
function showPage(k, { fromWorld = false } = {}) {
  pageIndex = k;
  $$('#jr-list button').forEach((b) => b.classList.toggle('is-sel', +b.dataset.page === k));
  if (!fromWorld) world?.selectPage(k);
}
function openArticle(k) {
  const p = JOURNAL.posts[k];
  $('#read-tag').textContent = p.tag;
  $('#read-h').textContent = p.title;
  $('#read-meta').textContent = `${p.mins} min read · SkillCures Journal`;
  $('#read-body').innerHTML = p.body.map((t) => `<p>${esc(t)}</p>`).join('');
  openDialog('dlg-read');
}
$('#jr-list').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const k = +b.dataset.page; if (k === pageIndex) openArticle(k); else showPage(k); });
$('#jr-list').addEventListener('dblclick', (e) => { const b = e.target.closest('button'); if (b) openArticle(+b.dataset.page); });

// ── guidelines ───────────────────────────────────────────────────────────
let ruleIndex = 0;
$('#gl-picks').innerHTML = GUIDELINES.rules.map((r, k) => `<button type="button" role="tab" aria-selected="false" data-rule="${k}">${r.n}</button>`).join('');
function showRule(k, { fromWorld = false } = {}) {
  ruleIndex = k;
  const r = GUIDELINES.rules[k];
  const card = $('.rulecard'); card.classList.remove('is-swap'); void card.offsetWidth; card.classList.add('is-swap');
  $('#gl-n').textContent = `Guideline ${r.n} of 06`;
  $('#gl-name').textContent = r.name;
  $('#gl-body').textContent = r.body;
  $$('#gl-picks button').forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.rule === k)));
  if (!fromWorld) world?.selectSlab(k);
  if (chapter === indexOf('guidelines')) typeConsole(chapter);
}
$('#gl-picks').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showRule(+b.dataset.rule); });

// ── resumes ──────────────────────────────────────────────────────────────
let sheetIndex = 0;
$('#rs-tabs').innerHTML = RESUMES.samples.map((r, k) => `<button type="button" role="tab" aria-selected="false" data-sheet="${k}">${esc(r.role)}</button>`).join('');
function showSheet(k, { fromWorld = false } = {}) {
  sheetIndex = k;
  const r = RESUMES.samples[k];
  $$('#rs-tabs button').forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.sheet === k)));
  const list = $('#rs-notes'); list.classList.remove('is-swap'); void list.offsetWidth; list.classList.add('is-swap');
  list.innerHTML = r.notes.map(([sec, t]) => `<li><b>${esc(sec)}</b>${esc(t)}</li>`).join('');
  if (!fromWorld) world?.selectSheet(k);
  if (chapter === indexOf('resumes')) typeConsole(chapter);
}
$('#rs-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showSheet(+b.dataset.sheet); });

// ── dialogs + forms ──────────────────────────────────────────────────────
function openDialog(id, focus) {
  const d = $(`#${id}`);
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  if (focus) $(`#${id === 'dlg-amb' ? 'dlg-guide' : 'dlg-rules'}`)?.scrollIntoView({ block: 'start' });
}
document.addEventListener('click', (e) => {
  const o = e.target.closest('[data-open]');
  if (o) { e.preventDefault(); openDialog(o.dataset.open, o.dataset.focus); return; }
  if (e.target.closest('.dlg__x')) e.target.closest('dialog').close();
  if (e.target.tagName === 'DIALOG') e.target.close();
});
$('#form-event select[name="format"]').insertAdjacentHTML('beforeend', EVENT_FORMATS.map((f) => `<option>${f}</option>`).join(''));
$('#form-session select[name="format"]').innerHTML = SESSIONS.formats.map(([n, t]) => `<option value="${esc(n)}">${esc(n)} · ${esc(t)}</option>`).join('');
const linkInput = $('#form-session input[name="link"]'), platform = $('#ss-platform');
linkInput.addEventListener('input', () => { const p = detectPlatform(linkInput.value.trim()); platform.textContent = p ? `${p} ✓` : ''; platform.classList.toggle('is-on', !!p); });
wireForm($('#form-event'), { kind: 'event', successText: 'Thanks! We’ll review your listing within two working days.' });
wireForm($('#form-session'), { kind: 'session', successText: 'Proposal received. We’ll reply within 48 hours.' });
wireForm($('#form-amb'), { kind: 'ambassador', successText: 'Application received. We’ll get back to you within a week.' });
wireForm($('#form-join'), {
  kind: 'join',
  redirect: (data, msg) => {
    joined = true; typeConsole(N - 1); world?.joined();
    const url = `${SIGNUP}?email=${encodeURIComponent(data.email)}`;
    msg.className = 'form__msg joinform__msg ok';
    msg.innerHTML = `Bond formed — taking you to sign-up… <a href="${url}">Continue</a>`;
    setTimeout(() => { try { window.location.assign(url); } catch { /* preview frames block navigation */ } }, 1100);
  },
});

// ── pins ─────────────────────────────────────────────────────────────────
const pinsBox = $('#pins');
let pinEls = [];
function buildPins(anchors) {
  pinsBox.innerHTML = '';
  pinEls = anchors.map((a) => {
    const el = document.createElement('div');
    el.className = `pin pin--${a.kind ?? 'tag'}`;
    if (a.color) el.style.setProperty('--c', a.color);
    el.innerHTML = `<span>${esc(a.text)}${a.sub ? `<small>${esc(a.sub)}</small>` : ''}</span>`;
    pinsBox.appendChild(el);
    return { el, a, o: -1 };
  });
}
function paintPins() {
  const w = world.weights;
  const narrow = window.innerWidth < 860;
  pinEls.forEach((p) => {
    let o = 0;
    p.a.stations.forEach((s) => { o = Math.max(o, smooth((w[s] - 0.55) / 0.4)); });
    if (p.a.sheet !== undefined && p.a.sheet !== sheetIndex) o = 0;
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
  const k = (s) => `<span class="c-k">${esc(s)}</span>`, v = (s) => `<span class="c-v">${esc(s)}</span>`;
  const inds = ALL_EVENTS.filter((e) => e.source === 'Industry').length;
  switch (id) {
    case 'hub': return ['> community.status()', `${k('features')}  ${v('6')} ways to take part`, `${k('events  ')}  ${v(String(ALL_EVENTS.length))} this season`, `${k('price   ')}  ${v('free')} for students`];
    case 'map': return ['> events.where()', `${k('cities  ')}  ${v('New Delhi · Mumbai · Pune · Hyderabad')}`, `${k('online  ')}  ${v(String(ALL_EVENTS.filter((e) => e.city === 'Online').length))}`, `${k('industry')}  ${v(String(inds))} · community ${ALL_EVENTS.length - inds}`];
    case 'events': { const e = ALL_EVENTS[evIndex]; return [`> events.open(${String(evIndex + 1).padStart(2, '0')})`, `${k('type ')}  ${v(e.type)} · ${e.source}`, `${k('date ')}  ${v(e.date)}`, `${k('where')}  ${e.where}`]; }
    case 'sessions': return ['> sessions.host()', ...SESSIONS.formats.slice(0, 3).map(([n, t]) => `${k('+')} ${n} · ${t}`)];
    case 'portal': return ['> sessions.propose(link)', ...SESSIONS.steps.slice(0, 3).map(([n], j) => `${k(`0${j + 1}`)} ${n}`)];
    case 'journal': { const p = JOURNAL.posts[pageIndex]; return ['> journal.open()', `${k('title')}  ${v(p.title.slice(0, 34))}…`, `${k('tag  ')}  ${p.tag}`, `${k('read ')}  ${p.mins} min`]; }
    case 'ambassadors': return ['> ambassadors.apply()', `${k('time ')}  ${v('4–5 h')} a month`, `${k('term ')}  one semester, renewable`, `${k('fee  ')}  ${v('none, ever')}`];
    case 'guidelines': { const r = GUIDELINES.rules[ruleIndex]; return [`> guidelines[${r.n}]`, `${k('rule ')}  ${v(r.name)}`, `${k('mods ')}  review reports in ~24 h`, `${k('scope')}  everywhere`]; }
    case 'resumes': { const r = RESUMES.samples[sheetIndex]; return ['> resumes.open()', `${k('role ')}  ${v(r.role)}`, `${k('level')}  ${r.level}`, `${k('notes')}  ${r.notes.length} annotations`]; }
    default: return ['> you.connect()', `${k('circles')}  ${v('20+')} from day one`, `${k('price  ')}  ${v('free')} for students`, `${k('bond   ')}  ${joined ? v('formed ✓') : 'waiting for you…'}`];
  }
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
  const step = () => { n += 3; if (n >= plain.length) { consoleBody.innerHTML = `${html}<span class="c-cur"></span>`; return; } consoleBody.textContent = plain.slice(0, n); typing = requestAnimationFrame(step); };
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
  if (free || scroll.touching || scroll.holding || scroll.auto || document.querySelector('dialog[open]')) return;
  const p = progressNow();
  const base = Math.floor(p), f = p - base;
  if (f < 0.003 || f > 0.997) { scroll.dest = Math.round(p); return; }
  flyTo(scroll.dir > 0 ? (f > 0.03 ? base + 1 : base) : (f < 0.97 ? base : base + 1));
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
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const here = scroll.auto ? scroll.dest : Math.round(progressNow());
  let to = null;
  if (e.key === 'ArrowDown' || e.key === 'PageDown') to = here + 1;
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') to = here - 1;
  else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    const d = e.key === 'ArrowRight' ? 1 : -1;
    const id = CHAPTERS[here].id;
    if (id === 'events') { e.preventDefault(); stepEvent(d); return; }
    if (id === 'journal') { e.preventDefault(); showPage((pageIndex + d + 6) % 6); return; }
    if (id === 'guidelines') { e.preventDefault(); showRule((ruleIndex + d + 6) % 6); return; }
    if (id === 'resumes') { e.preventDefault(); showSheet((sheetIndex + d + 6) % 6); return; }
    to = here + d;
  } else if (e.key === 'Enter' && CHAPTERS[here].id === 'journal' && tag !== 'BUTTON' && tag !== 'A') { e.preventDefault(); openArticle(pageIndex); return; }
  else if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A') to = here + (e.shiftKey ? -1 : 1);
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
  flyTo(indexOf(el.dataset.go));
});
prevBtn.addEventListener('click', () => flyTo((scroll.auto ? scroll.dest : Math.round(progressNow())) - 1));
nextBtn.addEventListener('click', () => flyTo((scroll.auto ? scroll.dest : Math.round(progressNow())) + 1));

// ── per frame: copy rides along with the camera ─────────────────────────
const LEG = STATIONS.slice(0, -1).map((s, i) => { const a = s.side, b = STATIONS[i + 1].side; return { x: a === b ? -0.8 : -a, y: 0, z: 0 }; });
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
    sec.style.setProperty('--ty', '0px');
    sec.style.setProperty('--s', '1');
  });
  setChapter(clamp(Math.round(p), 0, N - 1));
}

// ── boot ─────────────────────────────────────────────────────────────────
const loader = $('#loader'), bar = $('#loader-bar'), pct = $('#loader-pct'), label = $('#loader-label'), log = $('#loader-log');
let shown = 0, goal = 0.04;
const loadTick = setInterval(() => { shown += (goal - shown) * 0.2; bar.style.transform = `scaleX(${shown.toFixed(3)})`; pct.textContent = String(Math.round(shown * 100)).padStart(3, '0'); }, 50);
const say = (line) => { log.textContent += `\n${line}`; };
const timeout = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  layout();
  showEvent(0); showRule(0); showSheet(0); showPage(0);
  const engine = await import('./engine/index.js');
  goal = 0.1;
  if (!engine.webglAvailable() || params.has('static')) { document.body.classList.add('no-webgl', 'is-in'); clearInterval(loadTick); return; }
  const glyphs = 'AaRx→·’—%&₹✓…';
  const fonts = Promise.all([
    document.fonts.load('800 80px Poppins', glyphs), document.fonts.load('700 40px Poppins', glyphs), document.fonts.load('600 20px Poppins', glyphs),
    document.fonts.load('500 16px "Geist Variable"', glyphs), document.fonts.load('500 14px "Geist Mono Variable"', glyphs),
  ]).catch(() => {});
  say('  engines ........... babylon.js + three.js');
  const [assets] = await Promise.all([engine.loadAssets(BASE, (k) => { goal = 0.1 + k * 0.45; }), Promise.race([fonts, timeout(5000)])]);
  say(`  events ............ ${ALL_EVENTS.length} · journal ${JOURNAL.posts.length} · resumes ${RESUMES.samples.length}`);
  goal = 0.62; label.textContent = 'Building the world';
  await timeout(30);
  world = engine.createWorld({ babylonCanvas: $('#bjs'), threeCanvas: $('#swarm'), assets, calm, quality: params.get('q') ?? 'auto' });
  world.on('event', (i) => showEvent(i, { fromWorld: true }));
  world.on('page', (i) => { if (i === pageIndex) openArticle(i); showPage(i, { fromWorld: true }); });
  world.on('slab', (i) => showRule(i, { fromWorld: true }));
  world.on('sheet', (i) => showSheet(i, { fromWorld: true }));
  world.selectEvent(evIndex); world.selectPage(pageIndex); world.selectSlab(ruleIndex); world.selectSheet(sheetIndex);
  buildPins(world.anchors);
  world.onFrame((p) => { paint(p); paintPins(); });
  say('  sessions .......... ready for your link');
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
boot().catch((err) => { console.error(err); clearInterval(loadTick); loader.classList.add('is-done'); document.body.classList.add('no-webgl', 'is-in'); });
