// Canvas artwork for the community world, set in Poppins (display), Geist (text) and Geist Mono (labels).
import { canvas } from '../../world/cards.js';
import { C, TYPE_COLOR } from '../data.js';

export const POP = 'Poppins, ui-sans-serif, system-ui, sans-serif';
export const GEIST = '"Geist Variable", Geist, ui-sans-serif, system-ui, sans-serif';
export const MONO = '"Geist Mono Variable", "Geist Mono", ui-monospace, monospace';

const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
function text(g, s, x, y, { size = 14, weight = 500, family = GEIST, color = '#fff', align = 'left', spacing = 0 } = {}) {
  g.font = `${weight} ${size}px ${family}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.letterSpacing = `${spacing}px`;
  g.fillText(s, x, y);
  g.letterSpacing = '0px';
}
function wrap(g, s, x, y, maxW, lh, o, maxLines = 9) {
  g.font = `${o.weight ?? 500} ${o.size ?? 14}px ${o.family ?? GEIST}`;
  const words = s.split(' ');
  let line = '', yy = y, n = 0;
  for (let k = 0; k < words.length; k++) {
    const test = line ? `${line} ${words[k]}` : words[k];
    if (g.measureText(test).width > maxW && line) {
      n += 1;
      if (n === maxLines) { text(g, `${line}…`, x, yy, o); return yy; }
      text(g, line, x, yy, o); line = words[k]; yy += lh;
    } else line = test;
  }
  if (line) text(g, line, x, yy, o);
  return yy;
}
/** Ethiack-style crosshair corner marks */
function crosses(g, x, y, w, h, color = 'rgba(160,190,255,.55)', s = 9) {
  g.strokeStyle = color; g.lineWidth = 1.2;
  [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy]) => {
    g.beginPath(); g.moveTo(cx - s, cy); g.lineTo(cx + s, cy); g.moveTo(cx, cy - s); g.lineTo(cx, cy + s); g.stroke();
  });
}
function glass(g, w, h, r, accent = C.sky) {
  const bg = g.createLinearGradient(0, 0, w * 0.4, h);
  bg.addColorStop(0, 'rgba(14,26,70,.96)');
  bg.addColorStop(1, 'rgba(4,9,30,.98)');
  rr(g, 1, 1, w - 2, h - 2, r); g.fillStyle = bg; g.fill();
  const st = g.createLinearGradient(0, 0, w, h);
  st.addColorStop(0, `${accent}cc`); st.addColorStop(0.5, 'rgba(110,150,255,.16)'); st.addColorStop(1, 'rgba(6,198,173,.5)');
  g.lineWidth = 1.6; g.strokeStyle = st; g.stroke();
}

// ── Pillar monolith face ─────────────────────────────────────────────────
export const PILLAR = { w: 360, h: 640, photo: { x: 180, y: 250, r: 128 } };
export function drawPillar(p) {
  const { w, h } = PILLAR;
  const { c, g } = canvas(w, h, 2);
  glass(g, w, h, 30, p.color);
  // top label
  text(g, p.n, 28, 48, { size: 15, weight: 600, family: MONO, color: p.color });
  g.fillStyle = 'rgba(160,190,255,.35)'; g.fillRect(58, 43, 46, 1.2);
  text(g, p.kicker.toUpperCase(), 114, 48, { size: 11, weight: 500, family: MONO, color: 'rgba(214,226,255,.72)', spacing: 1.2 });
  // ring around the photo window
  const { x, y, r } = PILLAR.photo;
  g.beginPath(); g.arc(x, y, r + 10, 0, Math.PI * 2); g.strokeStyle = `${p.color}aa`; g.lineWidth = 1.5; g.stroke();
  g.setLineDash([2, 6]);
  g.beginPath(); g.arc(x, y, r + 22, 0, Math.PI * 2); g.strokeStyle = 'rgba(160,190,255,.35)'; g.lineWidth = 1; g.stroke();
  g.setLineDash([]);
  // name + stat
  text(g, p.name, 28, 452, { size: 52, weight: 700, family: POP, color: '#f4f7ff', spacing: -1.5 });
  const sg = g.createLinearGradient(28, 0, 300, 0);
  sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, p.color);
  g.font = `800 88px ${POP}`; g.fillStyle = sg; g.textAlign = 'left'; g.letterSpacing = '-3px';
  g.fillText(p.stat, 24, 556); g.letterSpacing = '0px';
  wrap(g, p.statLabel, 28, 590, w - 56, 18, { size: 13.5, weight: 500, family: MONO, color: 'rgba(214,226,255,.78)' }, 2);
  crosses(g, 14, 14, w - 28, h - 28);
  return c;
}

// ── Event card ───────────────────────────────────────────────────────────
export const CARD = { w: 400, h: 580 };
export function drawEvent(e, poster, index) {
  const { w, h } = CARD;
  const { c, g } = canvas(w, h, 1.25);
  const tc = TYPE_COLOR[e.type];
  glass(g, w, h, 26, tc);
  const PH = 300;
  g.save(); rr(g, 10, 10, w - 20, PH, 18); g.clip();
  if (poster) {
    const ia = poster.width / poster.height, ba = (w - 20) / PH;
    let dw = w - 20, dh = PH;
    if (ia > ba) dw = PH * ia; else dh = (w - 20) / ia;
    g.drawImage(poster, 10 + (w - 20 - dw) / 2, 10 + (PH - dh) / 2, dw, dh);
    const sh = g.createLinearGradient(0, 10, 0, PH + 10);
    sh.addColorStop(0.55, 'rgba(4,8,26,0)'); sh.addColorStop(1, 'rgba(4,8,26,.55)');
    g.fillStyle = sh; g.fillRect(10, 10, w - 20, PH);
  } else {
    // generated poster: type colour field, oversized type word, speaker monogram, dot grid
    const bg = g.createLinearGradient(10, 10, w, PH);
    bg.addColorStop(0, e.toneColor); bg.addColorStop(1, '#050b2c');
    g.fillStyle = bg; g.fillRect(10, 10, w - 20, PH);
    g.fillStyle = 'rgba(255,255,255,.09)';
    for (let yy = 26; yy < PH; yy += 16) for (let xx = 26; xx < w - 10; xx += 16) { g.beginPath(); g.arc(xx, yy, 1.2, 0, Math.PI * 2); g.fill(); }
    g.save(); g.translate(26, PH - 10); g.rotate(-Math.PI / 2);
    text(g, e.type.toUpperCase(), 0, 0, { size: 64, weight: 800, family: POP, color: 'rgba(255,255,255,.12)', spacing: 2 });
    g.restore();
    g.beginPath(); g.arc(w - 92, 132, 62, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
    g.beginPath(); g.arc(w - 92, 132, 46, 0, Math.PI * 2); g.fillStyle = tc; g.fill();
    text(g, e.speaker[3], w - 92, 148, { size: 38, weight: 700, family: POP, color: '#06102e', align: 'center' });
    wrap(g, e.speaker[0], 36, 216, 210, 26, { size: 21, weight: 600, family: POP, color: '#fff' }, 2);
    text(g, e.speaker[1], 36, 276, { size: 13, weight: 500, family: MONO, color: 'rgba(230,238,255,.8)' });
  }
  g.restore();
  // type chip + index
  g.font = `600 12px ${MONO}`;
  const cw = g.measureText(e.type.toUpperCase()).width + 30;
  rr(g, 22, 22, cw, 28, 14); g.fillStyle = 'rgba(4,8,26,.82)'; g.fill();
  g.beginPath(); g.arc(35, 36, 4, 0, Math.PI * 2); g.fillStyle = tc; g.fill();
  text(g, e.type.toUpperCase(), 45, 40.5, { size: 12, weight: 600, family: MONO, color: '#fff', spacing: 1 });
  rr(g, w - 66, 22, 44, 28, 14); g.fillStyle = 'rgba(4,8,26,.82)'; g.fill();
  text(g, String(index + 1).padStart(2, '0'), w - 44, 40.5, { size: 12, weight: 600, family: MONO, color: 'rgba(230,238,255,.85)', align: 'center' });

  // info
  text(g, `${e.date.toUpperCase()}  ·  ${e.time.split(' - ')[0]}`, 24, PH + 46, { size: 12.5, weight: 600, family: MONO, color: tc, spacing: 0.6 });
  wrap(g, e.title, 24, PH + 80, w - 48, 27, { size: 21, weight: 600, family: POP, color: '#f4f7ff' }, 3);
  text(g, `${e.speaker[0]} · ${e.mode}`, 24, h - 74, { size: 13, weight: 500, family: GEIST, color: 'rgba(214,226,255,.72)' });
  // seats bar
  const k = e.reg / e.seats;
  rr(g, 24, h - 52, w - 48, 6, 3); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill();
  const bg2 = g.createLinearGradient(24, 0, 24 + (w - 48) * k, 0); bg2.addColorStop(0, C.cobalt); bg2.addColorStop(1, C.teal);
  rr(g, 24, h - 52, (w - 48) * k, 6, 3); g.fillStyle = bg2; g.fill();
  text(g, `${e.reg} registered`, 24, h - 24, { size: 12, weight: 500, family: MONO, color: 'rgba(214,226,255,.65)' });
  text(g, `${e.left} seats left`, w - 24, h - 24, { size: 12, weight: 600, family: MONO, color: '#7ff5e4', align: 'right' });
  return c;
}

// ── Story pieces ─────────────────────────────────────────────────────────
export function drawCaption(n, caption) {
  const s = `${String(n).padStart(2, '0')} · ${caption}`;
  const { c: tmp, g: tg } = canvas(10, 10, 1);
  tg.font = `600 13px ${MONO}`;
  const w = Math.ceil(tg.measureText(s.toUpperCase()).width + 40);
  void tmp;
  const { c, g } = canvas(w, 36, 2);
  rr(g, 0, 0, w, 36, 18); g.fillStyle = 'rgba(244,247,255,.95)'; g.fill();
  text(g, s.toUpperCase(), w / 2, 23, { size: 13, weight: 600, family: MONO, color: '#0a1440', align: 'center', spacing: 0.6 });
  return { c, aspect: w / 36 };
}
export function drawVerified() {
  const { c, g } = canvas(150, 40, 2);
  rr(g, 0, 0, 150, 40, 20); g.fillStyle = C.cobalt; g.fill();
  g.beginPath(); g.arc(24, 20, 9, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
  g.strokeStyle = C.cobalt; g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(20, 20); g.lineTo(23, 23.5); g.lineTo(28.5, 16.5); g.stroke();
  text(g, 'VERIFIED', 88, 25.5, { size: 13.5, weight: 700, family: MONO, color: '#fff', align: 'center', spacing: 1.6 });
  return c;
}
/** round "sticker" with the measurable outcome, text on a circle */
export function drawSticker(metric, label, color) {
  const S = 260;
  const { c, g } = canvas(S, S, 2);
  g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
  const bg = g.createRadialGradient(S * 0.35, S * 0.3, 10, S / 2, S / 2, S / 2);
  bg.addColorStop(0, '#13246e'); bg.addColorStop(1, '#050b2c');
  g.fillStyle = bg; g.fill();
  g.lineWidth = 3; g.strokeStyle = color; g.stroke();
  // ring text
  const ring = `${label.toUpperCase()} · VERIFIED OUTCOME · `;
  g.font = `600 13px ${MONO}`; g.fillStyle = 'rgba(214,226,255,.8)';
  const R = S / 2 - 22;
  const step = (Math.PI * 2) / ring.length;
  for (let k = 0; k < ring.length; k++) {
    g.save(); g.translate(S / 2, S / 2); g.rotate(k * step); g.translate(0, -R);
    g.textAlign = 'center'; g.fillText(ring[k], 0, 0); g.restore();
  }
  // metric
  const words = metric.split(' ');
  const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [metric];
  let size = 30;
  g.font = `700 ${size}px ${POP}`;
  while (Math.max(...lines.map((l) => g.measureText(l).width)) > S - 92 && size > 16) { size -= 1; g.font = `700 ${size}px ${POP}`; }
  lines.forEach((l, k) => text(g, l, S / 2, S / 2 + size * 0.36 + (k - (lines.length - 1) / 2) * size * 1.1, { size, weight: 700, family: POP, color: '#fff', align: 'center' }));
  return c;
}

// ── Fly-through statement: Poppins headline inside an Ethiack crosshair frame ─
export function drawStatement(word, caption) {
  const W = 1800, H = 640;
  const { c, g } = canvas(W, H, 1);
  let size = 260;
  g.font = `800 ${size}px ${POP}`;
  g.letterSpacing = '-6px';
  while (g.measureText(word).width > W - 220 && size > 90) { size -= 8; g.font = `800 ${size}px ${POP}`; }
  const tw = g.measureText(word).width;
  const grd = g.createLinearGradient((W - tw) / 2, 0, (W + tw) / 2, 0);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.6, '#c7e3ff'); grd.addColorStop(1, '#5ff0dc');
  g.textAlign = 'center'; g.fillStyle = grd;
  g.fillText(word, W / 2, 300 + size * 0.36);
  g.letterSpacing = '0px';
  const bx = (W - tw) / 2 - 60, bw = tw + 120;
  crosses(g, bx, 120, bw, 360, 'rgba(170,200,255,.9)', 22);
  text(g, caption.toUpperCase(), W / 2, 560, { size: 34, weight: 500, family: MONO, color: 'rgba(210,230,255,.92)', align: 'center', spacing: 8 });
  return c;
}
