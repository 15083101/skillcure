// Canvas artwork for the redesigned 3D community page: event cards, journal pages,
// guideline slabs, resume sheets, the session portal screen and the meeting-link chip.
import { canvas } from '../../world/cards.js';
import { POP, GEIST, MONO, rr, text, wrap, crosses, glass } from './art.js';
import { FORMAT_COLOR } from '../content.js';

// ── event card (industry or SkillCures) ─────────────────────────────────
export const ECARD = { w: 400, h: 560 };
export function drawEventCard(e, poster, index) {
  const { w, h } = ECARD;
  const { c, g } = canvas(w, h, 1.25);
  const tc = FORMAT_COLOR[e.type] ?? '#3b8bff';
  glass(g, w, h, 26, tc);
  const PH = 290;
  g.save(); rr(g, 10, 10, w - 20, PH, 18); g.clip();
  if (poster) {
    const ia = poster.width / poster.height, ba = (w - 20) / PH;
    let dw = w - 20, dh = PH;
    if (ia > ba) dw = PH * ia; else dh = (w - 20) / ia;
    g.drawImage(poster, 10 + (w - 20 - dw) / 2, 10 + (PH - dh) / 2, dw, dh);
  } else {
    const bg = g.createLinearGradient(10, 10, w, PH);
    bg.addColorStop(0, tc); bg.addColorStop(1, '#050b2c');
    g.fillStyle = bg; g.fillRect(10, 10, w - 20, PH);
    g.fillStyle = 'rgba(255,255,255,.1)';
    for (let yy = 26; yy < PH; yy += 16) for (let xx = 26; xx < w - 10; xx += 16) { g.beginPath(); g.arc(xx, yy, 1.2, 0, Math.PI * 2); g.fill(); }
    // date block
    const m = e.date.match(/(\d{1,2})[–\s-]*(?:\d{1,2})?\s*([A-Z][a-z]{2})/);
    text(g, m ? m[1] : '', 36, 150, { size: 92, weight: 800, family: POP, color: '#ffffff' });
    text(g, (m ? m[2] : '').toUpperCase(), 40, 188, { size: 22, weight: 600, family: MONO, color: 'rgba(255,255,255,.85)', spacing: 4 });
    if (e.speaker) {
      g.beginPath(); g.arc(w - 80, 110, 44, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.16)'; g.fill();
      text(g, e.speaker[3], w - 80, 124, { size: 34, weight: 700, family: POP, color: '#fff', align: 'center' });
      wrap(g, e.speaker[0], 36, 240, w - 72, 24, { size: 19, weight: 600, family: POP, color: '#fff' }, 1);
      text(g, e.speaker[1], 36, 268, { size: 12.5, weight: 500, family: MONO, color: 'rgba(230,238,255,.85)' });
    } else {
      text(g, e.where.toUpperCase(), 36, 262, { size: 13, weight: 600, family: MONO, color: 'rgba(255,255,255,.9)', spacing: 1 });
    }
  }
  g.restore();
  g.font = `600 12px ${MONO}`;
  const label = `${e.type}${e.source === 'Industry' ? ' · INDUSTRY' : ''}`.toUpperCase();
  const cw = g.measureText(label).width + 30;
  rr(g, 22, 22, cw, 28, 14); g.fillStyle = 'rgba(4,8,26,.82)'; g.fill();
  g.beginPath(); g.arc(35, 36, 4, 0, Math.PI * 2); g.fillStyle = tc; g.fill();
  text(g, label, 45, 40.5, { size: 12, weight: 600, family: MONO, color: '#fff', spacing: 1 });
  rr(g, w - 66, 22, 44, 28, 14); g.fillStyle = 'rgba(4,8,26,.82)'; g.fill();
  text(g, String(index + 1).padStart(2, '0'), w - 44, 40.5, { size: 12, weight: 600, family: MONO, color: 'rgba(230,238,255,.85)', align: 'center' });
  text(g, `${e.date.toUpperCase()}`, 24, PH + 46, { size: 13, weight: 600, family: MONO, color: tc, spacing: 0.6 });
  wrap(g, e.title, 24, PH + 80, w - 48, 27, { size: 21, weight: 600, family: POP, color: '#f4f7ff' }, 3);
  text(g, e.where, 24, h - 30, { size: 13, weight: 500, family: GEIST, color: 'rgba(214,226,255,.72)' });
  return c;
}

// ── journal page ─────────────────────────────────────────────────────────
export const PAGE = { w: 420, h: 540 };
export function drawPage(p, n, photo) {
  const { w, h } = PAGE;
  const { c, g } = canvas(w, h, 1.4);
  rr(g, 0, 0, w, h, 18); g.fillStyle = '#f7f8fd'; g.fill();
  // cover band: photo, duotone toward the article colour
  g.save(); rr(g, 14, 14, w - 28, 230, 12); g.clip();
  g.fillStyle = p.color; g.fillRect(14, 14, w - 28, 230);
  if (photo) {
    const ia = photo.width / photo.height, ba = (w - 28) / 230;
    let dw = w - 28, dh = 230; if (ia > ba) dw = 230 * ia; else dh = (w - 28) / ia;
    g.globalCompositeOperation = 'multiply'; g.filter = 'grayscale(1) contrast(1.1)';
    g.drawImage(photo, 14 + (w - 28 - dw) / 2, 14 + (230 - dh) / 2, dw, dh);
    g.filter = 'none'; g.globalCompositeOperation = 'source-over';
  }
  text(g, p.tag.split(' ')[0], 30, 226, { size: Math.min(44, 520 / p.tag.split(' ')[0].length), weight: 800, family: POP, color: 'rgba(255,255,255,.95)' });
  g.restore();
  text(g, `${String(n).padStart(2, '0')} · ${p.tag.toUpperCase()} · ${p.mins} MIN`, 30, 284, { size: 12, weight: 600, family: MONO, color: '#0253eb', spacing: 1 });
  const y = wrap(g, p.title, 30, 322, w - 60, 30, { size: 24, weight: 700, family: POP, color: '#0b1238' }, 3);
  wrap(g, p.excerpt, 30, y + 34, w - 60, 21, { size: 14.5, weight: 400, family: GEIST, color: '#3b4570' }, 4);
  text(g, 'Read the article →', 30, h - 28, { size: 14, weight: 600, family: GEIST, color: '#0253eb' });
  return c;
}

// ── guideline monolith face ──────────────────────────────────────────────
export const SLAB = { w: 320, h: 520 };
const GLYPH = {
  heart: (g) => { g.beginPath(); g.moveTo(0, 26); g.bezierCurveTo(-46, -6, -26, -46, 0, -22); g.bezierCurveTo(26, -46, 46, -6, 0, 26); g.stroke(); },
  lock: (g) => { rr(g, -26, -4, 52, 40, 8); g.stroke(); g.beginPath(); g.arc(0, -4, 17, Math.PI, 0); g.stroke(); },
  cross: (g) => { rr(g, -30, -30, 60, 60, 14); g.stroke(); g.beginPath(); g.moveTo(0, -16); g.lineTo(0, 16); g.moveTo(-16, 0); g.lineTo(16, 0); g.stroke(); },
  book: (g) => { g.beginPath(); g.moveTo(0, -20); g.quadraticCurveTo(-20, -30, -36, -24); g.lineTo(-36, 26); g.quadraticCurveTo(-20, 20, 0, 30); g.quadraticCurveTo(20, 20, 36, 26); g.lineTo(36, -24); g.quadraticCurveTo(20, -30, 0, -20); g.lineTo(0, 30); g.stroke(); },
  scale: (g) => { g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 30); g.moveTo(-22, 30); g.lineTo(22, 30); g.moveTo(-32, -18); g.lineTo(32, -18); g.stroke(); [-24, 24].forEach((x) => { g.beginPath(); g.moveTo(x - 12, 6); g.quadraticCurveTo(x, 18, x + 12, 6); g.lineTo(x, -18); g.closePath(); g.stroke(); }); },
  megaphone: (g) => { g.beginPath(); g.moveTo(-30, -8); g.lineTo(-30, 10); g.lineTo(14, 28); g.lineTo(14, -26); g.closePath(); g.stroke(); g.beginPath(); g.arc(18, 1, 14, -1, 1); g.stroke(); g.beginPath(); g.moveTo(-20, 12); g.lineTo(-14, 34); g.stroke(); },
};
export function drawSlab(r, color) {
  const { w, h } = SLAB;
  const { c, g } = canvas(w, h, 1.6);
  glass(g, w, h, 26, color);
  const cy = 150;
  g.beginPath(); g.arc(w / 2, cy, 70, 0, Math.PI * 2);
  const bg = g.createRadialGradient(w / 2, cy - 20, 10, w / 2, cy, 70); bg.addColorStop(0, `${color}55`); bg.addColorStop(1, `${color}11`);
  g.fillStyle = bg; g.fill(); g.lineWidth = 2; g.strokeStyle = `${color}cc`; g.stroke();
  g.save(); g.translate(w / 2, cy); g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#ffffff';
  (GLYPH[r.icon] ?? GLYPH.heart)(g); g.restore();
  text(g, r.n, w / 2, 274, { size: 15, weight: 600, family: MONO, color, align: 'center', spacing: 3 });
  g.font = `700 30px ${POP}`;
  const words = r.name.split(' ');
  const lines = []; let line = '';
  words.forEach((wd) => { const t = line ? `${line} ${wd}` : wd; if (g.measureText(t).width > w - 50) { lines.push(line); line = wd; } else line = t; });
  lines.push(line);
  lines.forEach((l, k) => text(g, l, w / 2, 318 + k * 36, { size: 30, weight: 700, family: POP, color: '#f4f7ff', align: 'center' }));
  crosses(g, 14, 14, w - 28, h - 28);
  return c;
}

// ── resume sheet ─────────────────────────────────────────────────────────
export const SHEET = { w: 440, h: 622 };
/** draws the resume and returns the y (0–1) of each annotated section, for pinning notes */
export function drawResume(r) {
  const { w, h } = SHEET;
  const { c, g } = canvas(w, h, 1.6);
  g.fillStyle = '#fbfcff'; g.fillRect(0, 0, w, h);
  const ys = {};
  const mark = (key, y) => { ys[key] = y / h; };
  const X = 34, W = w - 68;
  rr(g, w - 160, 18, 140, 22, 11); g.fillStyle = '#fff1dc'; g.fill();
  text(g, 'SAMPLE · ANONYMISED', w - 90, 33, { size: 9, weight: 700, family: MONO, color: '#9a5300', align: 'center', spacing: 1 });
  mark('headline', 64);
  text(g, r.initials, X, 74, { size: 30, weight: 700, family: POP, color: '#121a3d' });
  let y = wrap(g, r.headline, X, 98, W, 17, { size: 12.5, weight: 500, family: GEIST, color: '#4a5478' }, 2);
  text(g, r.level, X, y + 18, { size: 11.5, family: GEIST, color: '#4a5478' });
  y += 30; g.fillStyle = '#121a3d'; g.fillRect(X, y, W, 2);
  const head = (s) => { y += 26; text(g, s.toUpperCase(), X, y, { size: 10, weight: 700, family: MONO, color: '#0253eb', spacing: 2 }); y += 6; };
  head('Summary'); mark('summary', y);
  y = wrap(g, r.summary, X, y + 14, W, 15, { size: 11.5, family: GEIST, color: '#121a3d' }, 4);
  head('Experience & projects'); mark('experience', y);
  r.experience.forEach(([t, d, pts]) => {
    y += 16; text(g, t, X, y, { size: 12, weight: 600, family: GEIST, color: '#121a3d' }); text(g, d, X + W, y, { size: 11, family: GEIST, color: '#4a5478', align: 'right' });
    pts.forEach((p) => { y = wrap(g, `•  ${p}`, X + 4, y + 15, W - 8, 14, { size: 11, family: GEIST, color: '#121a3d' }, 2); });
  });
  head('Education');
  r.education.forEach(([t, d]) => { y += 16; text(g, t, X, y, { size: 12, weight: 600, family: GEIST, color: '#121a3d' }); text(g, d, X + W, y, { size: 11, family: GEIST, color: '#4a5478', align: 'right' }); });
  head('Skills'); mark('skills', y);
  let sx = X; y += 8;
  g.font = `500 10.5px ${GEIST}`;
  r.skills.forEach((s) => {
    const sw = g.measureText(s).width + 14;
    if (sx + sw > X + W) { sx = X; y += 22; }
    rr(g, sx, y, sw, 18, 5); g.fillStyle = '#eef2fb'; g.fill();
    text(g, s, sx + 7, y + 12.5, { size: 10.5, family: GEIST, color: '#121a3d' });
    sx += sw + 6;
  });
  y += 18;
  head('Training');
  wrap(g, r.certs.join(' · '), X, y + 14, W, 14, { size: 11, family: GEIST, color: '#121a3d' }, 2);
  return { c, ys };
}

// ── portal screen: a session card ────────────────────────────────────────
export function drawSessionScreen(s) {
  const W = 520, H = 320;
  const { c, g } = canvas(W, H, 1.5);
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0f2a8a'); bg.addColorStop(1, '#04102e');
  rr(g, 0, 0, W, H, 22); g.fillStyle = bg; g.fill();
  rr(g, 22, 22, 74, 26, 13); g.fillStyle = '#ff4d6a'; g.fill();
  g.beginPath(); g.arc(38, 35, 4, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
  text(g, 'LIVE', 64, 40, { size: 12, weight: 700, family: MONO, color: '#fff', align: 'center', spacing: 2 });
  text(g, `${s.format.toUpperCase()} · ${s.date.toUpperCase()}`, 110, 40, { size: 12, weight: 600, family: MONO, color: '#7ff5e4', spacing: 1 });
  wrap(g, s.title, 22, 100, W - 44, 32, { size: 26, weight: 700, family: POP, color: '#fff' }, 3);
  g.beginPath(); g.arc(48, H - 52, 22, 0, Math.PI * 2); g.fillStyle = '#06c6ad'; g.fill();
  text(g, s.host.split(' ').filter((x) => /^[A-Z]/.test(x) && x.length > 2).map((x) => x[0]).slice(0, 2).join(''), 48, H - 45, { size: 16, weight: 700, family: POP, color: '#02211e', align: 'center' });
  text(g, s.host, 82, H - 56, { size: 15, weight: 600, family: GEIST, color: '#fff' });
  text(g, s.role, 82, H - 36, { size: 12, family: MONO, color: 'rgba(214,226,255,.7)' });
  return c;
}
export function drawLinkChip() {
  const W = 330, H = 56;
  const { c, g } = canvas(W, H, 2);
  rr(g, 0, 0, W, H, 28); g.fillStyle = 'rgba(244,247,255,.96)'; g.fill();
  g.beginPath(); g.arc(28, 28, 14, 0, Math.PI * 2); g.fillStyle = '#06c6ad'; g.fill();
  g.strokeStyle = '#02211e'; g.lineWidth = 2.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(22, 31); g.lineTo(34, 25); g.stroke();
  text(g, 'https://meet.your-link/session', 52, 34, { size: 15, weight: 500, family: MONO, color: '#0b1238' });
  return c;
}
