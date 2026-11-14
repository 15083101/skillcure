import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-800.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './style.css';

import {
  HERO, FEATURES, EVENTS_INTRO, ALL_EVENTS, EVENT_FORMATS, FORMAT_COLOR, SESSIONS, JOURNAL, AMBASSADORS, GUIDELINES, RESUMES, JOIN, SIGNUP,
} from '../content.js';
import { wireForm, detectPlatform, icsHref, dayMonth } from '../forms.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BASE = '../';

// ── hero + index ─────────────────────────────────────────────────────────
$('#hero-kicker').textContent = HERO.kicker;
$('#hero-h').innerHTML = `${esc(HERO.title[0])} <span class="grad">${esc(HERO.title[1])}</span>`;
$('#hero-lede').textContent = HERO.lede;
$('#hero-stats').innerHTML = HERO.stats.map(([v, l]) => `<div><dt>${esc(v)}</dt><dd>${esc(l)}</dd></div>`).join('');
$('#index').innerHTML = FEATURES.map((f) => `<li data-in style="--c:${f.color}"><a href="#${f.id}"><small>${f.n}</small><b>${esc(f.name)}</b><span>${esc(f.line)}</span></a></li>`).join('');

// ── 01 events ────────────────────────────────────────────────────────────
$('#events-h').textContent = EVENTS_INTRO.title;
$('#events-lede').textContent = EVENTS_INTRO.lede;
$('#events-how').innerHTML = EVENTS_INTRO.how.map(([b, s]) => `<li><b>${esc(b)}</b><span>${esc(s)}</span></li>`).join('');
$('#events-note').textContent = EVENTS_INTRO.note;
const formats = EVENT_FORMATS.filter((f) => ALL_EVENTS.some((e) => e.type === f));
$('#ev-formats').innerHTML = `<button type="button" data-f="" aria-pressed="true" style="--c:#f4f7ff">All</button>${formats.map((f) => `<button type="button" data-f="${f}" aria-pressed="false" style="--c:${FORMAT_COLOR[f]}"><i></i>${f}s</button>`).join('')}`;
const cities = [...new Set(ALL_EVENTS.map((e) => e.city))].sort((a, b) => (a === 'Online') - (b === 'Online') || a.localeCompare(b));
$('#ev-city').insertAdjacentHTML('beforeend', cities.map((c) => `<option>${esc(c)}</option>`).join(''));
const evState = { f: '', city: '', src: '', all: false };
const EV_PAGE = 8;
function renderEvents() {
  const list = ALL_EVENTS.filter((e) => (!evState.f || e.type === evState.f) && (!evState.city || e.city === evState.city) && (!evState.src || e.source === evState.src));
  $('#ev-count').textContent = `${list.length} event${list.length === 1 ? '' : 's'}`;
  const shown = evState.all ? list : list.slice(0, EV_PAGE);
  $('#ev-more').hidden = shown.length === list.length;
  $('#ev-more button').textContent = `Show all ${list.length} events`;
  $('#ev-list').innerHTML = list.length ? shown.map((e) => {
    const { d, m } = dayMonth(e.date);
    const c = FORMAT_COLOR[e.type];
    return `<li class="ev" style="--c:${c}">
      <div class="ev__date"><b>${d}</b><span>${m}</span></div>
      <div class="ev__body">
        <div class="ev__tags"><span class="tag tag--c">${esc(e.type)}</span>${e.source === 'Industry' ? '<span class="tag tag--ind">Industry</span>' : '<span class="tag">SkillCures</span>'}${e.online ? '<span class="tag">Online</span>' : ''}</div>
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.description)}</p>
        <div class="ev__foot"><span>${esc(e.date)} · ${esc(e.where)}</span><a href="${icsHref(e)}" download="${esc(e.title.slice(0, 40))}.ics">Add to calendar</a>${e.source === 'SkillCures' ? `<a href="${SIGNUP}">Register →</a>` : ''}</div>
      </div></li>`;
  }).join('') : `<li class="empty"><img src="${BASE}brand/crew/softgel-amber.webp" alt="" /><p>Nothing matches those filters yet.</p></li>`;
}
$('#ev-formats').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; evState.f = b.dataset.f; $$('button', $('#ev-formats')).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); renderEvents(); });
$('#ev-more button').addEventListener('click', () => { evState.all = true; renderEvents(); });
$('#ev-city').addEventListener('change', (e) => { evState.city = e.target.value; renderEvents(); });
$$('.seg button').forEach((b) => b.addEventListener('click', () => { evState.src = b.dataset.src; $$('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); renderEvents(); }));
renderEvents();
const fmtSelect = $('#form-event select[name="format"]');
fmtSelect.insertAdjacentHTML('beforeend', EVENT_FORMATS.map((f) => `<option>${f}</option>`).join(''));
wireForm($('#form-event'), { kind: 'event', successText: 'Thanks! We’ll review your listing within two working days.' });

// ── 02 sessions ──────────────────────────────────────────────────────────
$('#sessions-h').textContent = SESSIONS.title;
$('#sessions-lede').textContent = SESSIONS.lede;
$('#ss-steps').innerHTML = SESSIONS.steps.map(([b, s], k) => `<li><b><small>0${k + 1}</small>${esc(b)}</b><span>${esc(s)}</span></li>`).join('');
$('#ss-formats').innerHTML = SESSIONS.formats.map(([n, t, s]) => `<li><small>${esc(t)}</small><b>${esc(n)}</b><span>${esc(s)}</span></li>`).join('');
$('#ss-upcoming').innerHTML = SESSIONS.upcoming.map((u) => `<li><img src="${BASE}${u.photo}" alt="" width="46" height="46" /><div><b>${esc(u.title)}</b><span>${esc(u.host)} · ${esc(u.role)}</span></div><em>${esc(u.date.replace(/ 20\d\d/, ''))}</em></li>`).join('');
$('#ss-perks').innerHTML = SESSIONS.perks.map((p) => `<li>${esc(p)}</li>`).join('');
$('#ss-rules').innerHTML = SESSIONS.rules.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('');
$('#form-session select[name="format"]').innerHTML = SESSIONS.formats.map(([n, t]) => `<option value="${esc(n)}">${esc(n)} · ${esc(t)}</option>`).join('');
const linkInput = $('#form-session input[name="link"]'), platform = $('#ss-platform');
linkInput.addEventListener('input', () => { const p = detectPlatform(linkInput.value.trim()); platform.textContent = p ? `${p} ✓` : ''; platform.classList.toggle('is-on', !!p); });
wireForm($('#form-session'), { kind: 'session', successText: 'Proposal received. We’ll reply within 48 hours.' });

// ── 03 journal ───────────────────────────────────────────────────────────
$('#journal-h').textContent = JOURNAL.title;
$('#journal-lede').textContent = JOURNAL.lede;
$('#posts').innerHTML = JOURNAL.posts.map((p, k) => `
  <button type="button" class="post${k === 0 ? ' post--feature' : ''}" data-post="${k}" style="--c:${p.color}" data-in>
    <div class="post__art" aria-hidden="true"><img src="${BASE}${p.img}" alt="" /><span style="--fs:${Math.min(3.2, 19 / p.tag.split(' ')[0].length).toFixed(2)}rem">${esc(p.tag.split(' ')[0])}</span></div>
    <div class="post__body">
      <p class="post__meta"><b>${esc(p.tag)}</b><span>${p.mins} min read</span></p>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.excerpt)}</p>
      <span class="post__more">Read the article →</span>
    </div>
  </button>`).join('');
const reader = $('#reader');
function openPost(k) {
  const p = JOURNAL.posts[k];
  $('#reader-tag').textContent = p.tag;
  $('#reader-h').textContent = p.title;
  $('#reader-meta').textContent = `${p.mins} min read · SkillCures Journal`;
  $('#reader-body').innerHTML = p.body.map((t) => `<p>${esc(t)}</p>`).join('');
  if (typeof reader.showModal === 'function') reader.showModal(); else reader.setAttribute('open', '');
  try { history.replaceState(null, '', `#journal/${p.slug}`); } catch { /* sandboxed */ }
}
$('#posts').addEventListener('click', (e) => { const b = e.target.closest('[data-post]'); if (b) openPost(+b.dataset.post); });
$('.reader__close').addEventListener('click', () => reader.close());
reader.addEventListener('click', (e) => { if (e.target === reader) reader.close(); });
reader.addEventListener('close', () => { try { history.replaceState(null, '', '#journal'); } catch { /* sandboxed */ } });

// ── 04 ambassadors ───────────────────────────────────────────────────────
$('#amb-h').textContent = AMBASSADORS.title;
$('#amb-lede').textContent = AMBASSADORS.lede;
$('#amb-who').innerHTML = AMBASSADORS.who.map((t) => `<li>${esc(t)}</li>`).join('');
$('#amb-do').innerHTML = AMBASSADORS.do.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('');
$('#amb-get').innerHTML = AMBASSADORS.get.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('');
$('#amb-steps').innerHTML = AMBASSADORS.steps.map(([t, d]) => `<li><div><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join('');
$('#amb-guide').innerHTML = AMBASSADORS.guidelines.map(([t, d], k) => `<details${k === 0 ? ' open' : ''}><summary>${esc(t)}</summary><p>${esc(d)}</p></details>`).join('');
$('#amb-enf').textContent = AMBASSADORS.enforcement;
wireForm($('#form-amb'), { kind: 'ambassador', successText: 'Application received. We’ll get back to you within a week.' });

// ── 05 guidelines ────────────────────────────────────────────────────────
const ICONS = {
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  cross: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 7h6"/>',
  scale: '<path d="M12 4v16M6 20h12M4 9l3-5 3 5a3 3 0 0 1-6 0zM14 9l3-5 3 5a3 3 0 0 1-6 0zM7 4h10"/>',
  megaphone: '<path d="M4 10v4l11 5V5zM15 9a3 3 0 0 1 0 6M7 15l1 5h3"/>',
};
$('#gl-h').textContent = GUIDELINES.title;
$('#gl-lede').textContent = GUIDELINES.lede;
$('#gl-rules').innerHTML = GUIDELINES.rules.map((r) => `<li class="rule" data-in><span class="rule__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[r.icon]}</svg></span><small>${r.n}</small><h3>${esc(r.name)}</h3><p>${esc(r.body)}</p></li>`).join('');
$('#gl-ladder').innerHTML = GUIDELINES.enforcement.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('');
$('#gl-serious').textContent = GUIDELINES.serious;
$('#gl-report').textContent = GUIDELINES.report;

// ── 06 resumes ───────────────────────────────────────────────────────────
$('#rs-h').textContent = RESUMES.title;
$('#rs-lede').textContent = RESUMES.lede;
$('#rs-sample').textContent = RESUMES.sampleNote;
$('#rs-check').innerHTML = RESUMES.checklist.map((t) => `<li>${esc(t)}</li>`).join('');
$('#rs-tabs').innerHTML = RESUMES.samples.map((r, k) => `<button type="button" role="tab" aria-selected="${k === 0}" data-r="${k}">${esc(r.role)}</button>`).join('');
function renderResume(k) {
  const r = RESUMES.samples[k];
  const noteFor = (sec) => { const i = r.notes.findIndex(([s]) => s === sec); return i < 0 ? '' : ` data-note="${i}"`; };
  const pinFor = (sec) => { const i = r.notes.findIndex(([s]) => s === sec); return i < 0 ? '' : `<span class="pin" aria-hidden="true">${i + 1}</span>`; };
  const paper = $('#rs-paper');
  paper.classList.remove('is-swap'); void paper.offsetWidth; paper.classList.add('is-swap');
  paper.setAttribute('aria-label', `Sample resume: ${r.role}`);
  paper.innerHTML = `
    <span class="paper__badge">Sample · anonymised</span>
    <header${noteFor('headline')}>${pinFor('headline')}<h3>${esc(r.initials)}</h3><p class="ph-line">${esc(r.headline)}</p><p class="ph-line">${esc(r.level)}</p></header>
    <section${noteFor('summary')}>${pinFor('summary')}<h4>Summary</h4><p>${esc(r.summary)}</p></section>
    <section${noteFor('experience')}>${pinFor('experience')}<h4>Experience &amp; projects</h4>${r.experience.map(([t, d, pts]) => `<div class="exp"><p class="exp-head">${esc(t)}<span>${esc(d)}</span></p><ul>${pts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`).join('')}</section>
    <section><h4>Education</h4>${r.education.map(([t, d]) => `<p class="exp-head">${esc(t)}<span>${esc(d)}</span></p>`).join('')}</section>
    <section${noteFor('skills')}>${pinFor('skills')}<h4>Skills</h4><div class="skills">${r.skills.map((s) => `<span>${esc(s)}</span>`).join('')}</div></section>
    <section><h4>Training</h4><p>${r.certs.map(esc).join(' · ')}</p></section>`;
  $('#rs-notes').innerHTML = r.notes.map(([sec, t], i) => `<li data-n="${i}"><b>${esc(sec)}</b>${esc(t)}</li>`).join('');
  $$('button', $('#rs-tabs')).forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.r === k)));
}
$('#rs-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) renderResume(+b.dataset.r); });
const hl = (n, on) => { $$(`#rs-paper [data-note="${n}"]`).forEach((el) => el.classList.toggle('is-hl', on)); $$(`#rs-notes li[data-n="${n}"]`).forEach((el) => el.classList.toggle('is-hl', on)); };
$('#rs-notes').addEventListener('mouseover', (e) => { const li = e.target.closest('li'); $$('#rs-notes li').forEach((x) => hl(x.dataset.n, false)); if (li) hl(li.dataset.n, true); });
$('#rs-notes').addEventListener('mouseleave', () => $$('#rs-notes li').forEach((x) => hl(x.dataset.n, false)));
$('#rs-notes').addEventListener('click', (e) => { const li = e.target.closest('li'); if (!li) return; const el = $(`#rs-paper [data-note="${li.dataset.n}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); hl(li.dataset.n, true); });
renderResume(0);

// ── join ─────────────────────────────────────────────────────────────────
$('#join-h').innerHTML = `${esc(JOIN.title.replace(' one connection.', ''))} <span class="grad">one connection.</span>`;
$('#join-lede').textContent = JOIN.lede;
$('#join-ticks').innerHTML = JOIN.ticks.map((t) => `<li>${esc(t)}</li>`).join('');
wireForm($('#form-join'), {
  kind: 'join',
  redirect: (data, msg) => {
    const url = `${SIGNUP}?email=${encodeURIComponent(data.email)}`;
    msg.className = 'form__msg ok';
    msg.innerHTML = `Taking you to sign-up… <a href="${url}">Continue</a>`;
    try { window.location.assign(url); } catch { /* preview frames block navigation */ }
  },
});

// ── page chrome: progress, active nav, reveal, menu ─────────────────────
const progress = $('#progress');
const onScroll = () => { const h = document.documentElement; progress.style.transform = `scaleX(${(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)).toFixed(4)})`; };
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
const navLinks = $$('.top__nav a');
const secObs = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('is-now', a.getAttribute('href') === `#${en.target.id}`));
}), { rootMargin: '-45% 0px -50% 0px' });
FEATURES.forEach((f) => { const s = document.getElementById(f.id); if (s) secObs.observe(s); });
const revealObs = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); revealObs.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('[data-in]').forEach((el, k) => { el.style.transitionDelay = `${Math.min(k % 6, 5) * 60}ms`; revealObs.observe(el); });
const menuBtn = $('.top__menu'), drawer = $('#drawer');
menuBtn.addEventListener('click', () => { const open = drawer.hidden; drawer.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); });
drawer.addEventListener('click', (e) => { if (e.target.closest('a')) { drawer.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } });
// deep link to an article: #journal/<slug>
const m = location.hash.match(/^#journal\/(.+)$/);
if (m) { const k = JOURNAL.posts.findIndex((p) => p.slug === m[1]); if (k >= 0) setTimeout(() => openPost(k), 300); }
