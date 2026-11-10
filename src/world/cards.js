// Canvas-drawn surfaces for the 3D world: dashboard, prescription, patent form, labels.
import * as THREE from 'three';
import { COLORS } from '../data.js';

export const DISPLAY = '"Bricolage Grotesque Variable", "Bricolage Grotesque", system-ui, sans-serif';
export const BODY = '"Schibsted Grotesk Variable", "Schibsted Grotesk", system-ui, sans-serif';
export const HAND = '"Caveat", "Segoe Script", cursive';

const SOLID = {
  cobalt: { bg: ['#1463ff', '#0244c8'], ink: '#ffffff', sub: 'rgba(255,255,255,.82)' },
  pink: { bg: ['#ffb7cb', '#ff8fae'], ink: '#3a0d1c', sub: 'rgba(58,13,28,.78)' },
  amber: { bg: ['#ffc061', '#f59a22'], ink: '#3a2203', sub: 'rgba(58,34,3,.8)' },
  teal: { bg: ['#16d9bf', '#02a596'], ink: '#02211e', sub: 'rgba(2,33,30,.8)' },
};

export function canvas(w, h, scale = 2) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const g = c.getContext('2d');
  g.scale(scale, scale);
  g.textBaseline = 'alphabetic';
  return { c, g, w, h };
}

export function texture(c, maxAniso = 8) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  return t;
}

/** A flat, unlit, alpha-blended plane that carries a drawn canvas. */
export function plane(tex, width, height, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, ...opts }),
  );
  return m;
}

const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const font = (g, weight, size, family = BODY) => { g.font = `${weight} ${size}px ${family}`; };
function text(g, str, x, y, { weight = 500, size = 14, family = BODY, color = '#fff', align = 'left', spacing = 0 } = {}) {
  font(g, weight, size, family);
  g.fillStyle = color;
  g.textAlign = align;
  if (spacing) g.letterSpacing = `${spacing}px`;
  g.fillText(str, x, y);
  if (spacing) g.letterSpacing = '0px';
}
function wrap(g, str, x, y, maxW, lh, opts) {
  font(g, opts.weight ?? 500, opts.size ?? 14, opts.family ?? BODY);
  const words = str.split(' ');
  let line = '';
  let yy = y;
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) { text(g, line, x, yy, opts); line = w; yy += lh; } else line = test;
  });
  if (line) text(g, line, x, yy, opts);
  return yy;
}

function glass(g, w, h, r = 28) {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, 'rgba(16,28,72,.94)');
  bg.addColorStop(1, 'rgba(5,10,32,.96)');
  rr(g, 1.5, 1.5, w - 3, h - 3, r);
  g.fillStyle = bg;
  g.fill();
  const st = g.createLinearGradient(0, 0, w, h);
  st.addColorStop(0, 'rgba(140,180,255,.75)');
  st.addColorStop(0.5, 'rgba(90,130,255,.18)');
  st.addColorStop(1, 'rgba(6,198,173,.6)');
  g.lineWidth = 2;
  g.strokeStyle = st;
  g.stroke();
}

function check(g, x, y, r, done) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  if (done) {
    g.fillStyle = COLORS.teal;
    g.fill();
    g.beginPath();
    g.moveTo(x - r * 0.42, y + r * 0.02);
    g.lineTo(x - r * 0.1, y + r * 0.36);
    g.lineTo(x + r * 0.46, y - r * 0.32);
    g.lineWidth = r * 0.26;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = '#04201c';
    g.stroke();
  } else {
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(160,185,255,.6)';
    g.stroke();
  }
}

// ── Dashboard ────────────────────────────────────────────────────────────
export function drawDashboard(icon) {
  const { c, g, w, h } = canvas(940, 600);
  glass(g, w, h, 30);

  // app bar
  if (icon) g.drawImage(icon, 30, 22, 36, 36);
  text(g, 'SkillCures', 74, 47, { weight: 700, size: 19, family: DISPLAY, color: '#f4f7ff' });
  ['Home', 'Jobs', 'Courses', 'Mentors', 'Research'].forEach((t, i) => {
    const x = 250 + i * 92;
    if (i === 0) { rr(g, x - 16, 25, 70, 30, 15); g.fillStyle = 'rgba(2,83,235,.9)'; g.fill(); }
    text(g, t, x + 19, 45, { size: 13.5, weight: i === 0 ? 700 : 500, color: i === 0 ? '#fff' : 'rgba(214,224,255,.72)', align: 'center' });
  });
  rr(g, 720, 24, 150, 32, 16); g.fillStyle = 'rgba(255,255,255,.07)'; g.fill();
  text(g, 'Search SkillCures', 738, 45, { size: 12.5, color: 'rgba(214,224,255,.55)' });
  g.beginPath(); g.arc(896, 40, 16, 0, Math.PI * 2);
  const av = g.createLinearGradient(880, 24, 912, 56); av.addColorStop(0, COLORS.teal); av.addColorStop(1, COLORS.cobalt);
  g.fillStyle = av; g.fill();
  text(g, 'SA', 896, 45, { size: 12, weight: 700, align: 'center' });
  g.fillStyle = 'rgba(140,170,255,.16)'; g.fillRect(24, 76, w - 48, 1);

  // profile
  g.beginPath(); g.arc(66, 128, 30, 0, Math.PI * 2); g.fillStyle = av; g.fill();
  text(g, 'SA', 66, 136, { size: 21, weight: 700, family: DISPLAY, align: 'center' });
  text(g, 'Saksham Aggarwal', 112, 124, { size: 25, weight: 700, family: DISPLAY, color: '#f4f7ff' });
  text(g, 'B.Pharm, final year · Working towards Quality Assurance', 112, 148, { size: 14, color: 'rgba(214,224,255,.72)' });
  rr(g, 778, 108, 62, 24, 12); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill();
  text(g, 'EXAMPLE', 809, 124.5, { size: 10, weight: 700, color: 'rgba(230,236,255,.85)', align: 'center', spacing: 1 });
  text(g, 'One profile · one login', 880, 152, { size: 12.5, color: COLORS.teal, align: 'right', weight: 600 });

  // next steps
  const lx = 30, ly = 182, lw = 430, lh = 388;
  rr(g, lx, ly, lw, lh, 20); g.fillStyle = 'rgba(255,255,255,.045)'; g.fill();
  text(g, 'Your next steps', lx + 22, ly + 38, { size: 17, weight: 700, family: DISPLAY });
  text(g, '4 of 5 done', lx + lw - 22, ly + 38, { size: 13, weight: 600, color: COLORS.teal, align: 'right' });
  rr(g, lx + 22, ly + 54, lw - 44, 8, 4); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill();
  const pg = g.createLinearGradient(lx + 22, 0, lx + 22 + (lw - 44) * 0.8, 0); pg.addColorStop(0, COLORS.cobalt); pg.addColorStop(1, COLORS.teal);
  rr(g, lx + 22, ly + 54, (lw - 44) * 0.8, 8, 4); g.fillStyle = pg; g.fill();
  [['Profile created', 1], ['Started GMP Essentials', 1], ['Mentor session booked', 1], ['Applied: QA Officer', 1], ['Interview: Thu 11:00', 0]].forEach(([label, done], i) => {
    const y = ly + 102 + i * 56;
    if (!done) { rr(g, lx + 12, y - 26, lw - 24, 48, 14); g.fillStyle = 'rgba(2,83,235,.3)'; g.fill(); g.strokeStyle = 'rgba(90,140,255,.7)'; g.lineWidth = 1.5; g.stroke(); }
    check(g, lx + 40, y - 2, 12, !!done);
    text(g, label, lx + 66, y + 4, { size: 16, weight: done ? 500 : 700, color: done ? 'rgba(226,233,255,.8)' : '#fff' });
    if (!done) { rr(g, lx + lw - 86, y - 14, 58, 24, 12); g.fillStyle = '#fff'; g.fill(); text(g, 'NEXT', lx + lw - 57, y + 2.5, { size: 10.5, weight: 800, color: '#0244c8', align: 'center', spacing: 1 }); }
  });

  // this week
  const rx = 478, rw = 432;
  rr(g, rx, ly, rw, 216, 20); g.fillStyle = 'rgba(255,255,255,.045)'; g.fill();
  text(g, 'This week', rx + 22, ly + 38, { size: 17, weight: 700, family: DISPLAY });
  [['Tue', 'Mentor call · 6:00 pm', 'QA manager, 12 years in the role', COLORS.amber], ['Thu', 'Interview · 11:00 am', 'QA Officer, oral solid dosage', COLORS.cobalt], ['Fri', 'GMP Essentials, lesson 19', 'About 25 minutes', COLORS.pink]].forEach(([d, a, b, col], i) => {
    const y = ly + 60 + i * 50;
    rr(g, rx + 22, y, 46, 40, 11); g.fillStyle = col; g.fill();
    text(g, d, rx + 45, y + 25.5, { size: 13.5, weight: 800, color: i === 1 ? '#fff' : '#1c1205', align: 'center' });
    text(g, a, rx + 82, y + 17, { size: 15, weight: 700 });
    text(g, b, rx + 82, y + 35, { size: 12.5, color: 'rgba(214,224,255,.66)' });
  });

  // job matches
  const jy = ly + 232;
  rr(g, rx, jy, rw, 156, 20); g.fillStyle = 'rgba(255,255,255,.045)'; g.fill();
  text(g, 'Job matches', rx + 22, jy + 36, { size: 17, weight: 700, family: DISPLAY });
  [['QA Officer', 'Oral solid dosage · Entry level', 92], ['QC Analyst', 'Analytical lab · Entry level', 88]].forEach(([a, b, pct], i) => {
    const y = jy + 54 + i * 48;
    text(g, a, rx + 22, y + 17, { size: 15, weight: 700 });
    text(g, b, rx + 22, y + 35, { size: 12.5, color: 'rgba(214,224,255,.66)' });
    rr(g, rx + rw - 122, y + 4, 100, 30, 15); g.fillStyle = 'rgba(6,198,173,.16)'; g.fill();
    text(g, `${pct}% match`, rx + rw - 72, y + 24, { size: 13, weight: 700, color: '#4be8d2', align: 'center' });
  });
  return c;
}

// ── Solid colour tile (Jobs / Courses / Mentor / Research, Rx packs) ─────
export function drawTile({ kind, title, detail, color }, { w = 400, h = 236 } = {}) {
  const { c, g } = canvas(w, h);
  const s = SOLID[color];
  const bg = g.createLinearGradient(0, 0, w * 0.6, h);
  bg.addColorStop(0, s.bg[0]); bg.addColorStop(1, s.bg[1]);
  rr(g, 0, 0, w, h, 30); g.fillStyle = bg; g.fill();
  const sh = g.createLinearGradient(0, 0, 0, h * 0.6);
  sh.addColorStop(0, 'rgba(255,255,255,.28)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  rr(g, 0, 0, w, h, 30); g.fillStyle = sh; g.fill();
  text(g, kind.toUpperCase(), 28, 48, { size: 15, weight: 800, color: s.sub, spacing: 2.2 });
  g.beginPath(); g.arc(w - 40, 42, 13, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.3)'; g.fill();
  text(g, '+', w - 40, 49, { size: 22, weight: 600, color: s.ink, align: 'center' });
  let size = 46;
  font(g, 700, size, DISPLAY);
  while (g.measureText(title).width > w - 56 && size > 24) { size -= 2; font(g, 700, size, DISPLAY); }
  text(g, title, 28, h * 0.5 + size * 0.42, { size, weight: 700, family: DISPLAY, color: s.ink });
  wrap(g, detail, 28, h - 34, w - 56, 22, { size: 18, weight: 600, color: s.sub });
  return c;
}

// ── Career prescription (redrawn live as the visitor edits the sentence) ─
export function drawPrescription(rx, icon, target) {
  const W = 560, H = 760;
  const { c, g } = target ?? canvas(W, H);
  g.clearRect(0, 0, W, H);
  rr(g, 0, 0, W, H, 22);
  const paper = g.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, '#eef2fb'); paper.addColorStop(1, '#dfe6f5');
  g.fillStyle = paper; g.fill();
  // header band
  g.save(); rr(g, 0, 0, W, H, 22); g.clip();
  const band = g.createLinearGradient(0, 0, W, 0); band.addColorStop(0, COLORS.cobalt); band.addColorStop(1, COLORS.deepteal);
  g.fillStyle = band; g.fillRect(0, 0, W, 84);
  g.restore();
  if (icon) { g.beginPath(); g.arc(50, 42, 24, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.drawImage(icon, 31, 23, 38, 38); }
  text(g, 'SkillCures', 88, 39, { size: 22, weight: 700, family: DISPLAY });
  text(g, 'CAREER PRESCRIPTION', 88, 60, { size: 11.5, weight: 700, color: 'rgba(255,255,255,.85)', spacing: 2 });
  text(g, 'EXAMPLE', W - 34, 49, { size: 11.5, weight: 800, color: 'rgba(255,255,255,.9)', align: 'right', spacing: 2 });

  text(g, 'Rx', 34, 172, { size: 78, weight: 800, family: DISPLAY, color: COLORS.cobalt });
  text(g, 'Your next steps in pharma', 150, 138, { size: 22, weight: 700, family: DISPLAY, color: '#0b1338' });
  text(g, 'Written by SkillCures from your three answers', 150, 164, { size: 13.5, color: '#4a5478' });

  const ink = '#12205e';
  const label = (s, x, y) => text(g, s.toUpperCase(), x, y, { size: 11, weight: 800, color: '#6c769a', spacing: 1.6 });
  const rule = (y) => { g.fillStyle = 'rgba(18,32,94,.16)'; g.fillRect(34, y, W - 68, 1.2); };

  label('For', 34, 222); text(g, rx.who, 34, 250, { size: 25, weight: 600, family: HAND, color: ink });
  label('Date', W - 190, 222);
  text(g, new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), W - 190, 250, { size: 25, weight: 600, family: HAND, color: ink });
  rule(266);

  label('Diagnosis', 34, 300);
  let dsize = 40;
  font(g, 700, dsize, HAND);
  while (g.measureText(rx.diagnosis).width > W - 68 && dsize > 24) { dsize -= 2; font(g, 700, dsize, HAND); }
  text(g, rx.diagnosis, 34, 342, { size: dsize, weight: 700, family: HAND, color: COLORS.cobalt });
  rule(364);

  const dots = [SOLID.pink.bg[1], SOLID.amber.bg[1], COLORS.cobalt];
  rx.lines.forEach((line, i) => {
    const y = 420 + i * 76;
    g.beginPath(); g.arc(54, y - 9, 20, 0, Math.PI * 2); g.fillStyle = dots[i]; g.fill();
    text(g, String(i + 1), 54, y - 2, { size: 19, weight: 800, family: DISPLAY, color: i === 2 ? '#fff' : '#2a1206', align: 'center' });
    let size = 29;
    font(g, 600, size, HAND);
    while (g.measureText(line).width > W - 130 && size > 19) { size -= 1; font(g, 600, size, HAND); }
    text(g, line, 90, y, { size, weight: 600, family: HAND, color: ink });
    g.fillStyle = 'rgba(18,32,94,.12)'; g.fillRect(90, y + 14, W - 124, 1);
  });

  label('Review', 34, 664); text(g, rx.review, 34, 694, { size: 27, weight: 600, family: HAND, color: ink });
  label('Signed', W - 190, 664);
  text(g, 'SkillCures', W - 190, 698, { size: 36, weight: 700, family: HAND, color: COLORS.cobalt });
  g.strokeStyle = COLORS.cobalt; g.lineWidth = 1.6; g.beginPath(); g.moveTo(W - 194, 708); g.quadraticCurveTo(W - 110, 720, W - 40, 702); g.stroke();
  text(g, 'Your own is written when SkillCures opens.', 34, H - 22, { size: 11.5, color: '#6c769a' });
  return c;
}

// ── Patent Form 2 (specimen) ─────────────────────────────────────────────
export function drawPatentForm() {
  const W = 560, H = 760;
  const { c, g } = canvas(W, H);
  const serif = 'Georgia, "Times New Roman", serif';
  rr(g, 0, 0, W, H, 14); g.fillStyle = '#eef0f6'; g.fill();
  const t = (s, y, o = {}) => text(g, s, W / 2, y, { family: serif, color: '#161a2c', align: 'center', weight: 700, size: 17, ...o });
  t('FORM 2', 70, { size: 30 });
  t('THE PATENTS ACT, 1970', 104, { size: 16 });
  t('(39 of 1970)', 124, { size: 13, weight: 400 });
  t('&', 144, { size: 13, weight: 400 });
  t('THE PATENTS RULES, 2003', 166, { size: 16 });
  t('COMPLETE SPECIFICATION', 208, { size: 21 });
  t('(See section 10 and rule 13)', 230, { size: 13, weight: 400 });
  g.fillStyle = '#161a2c'; g.fillRect(48, 250, W - 96, 1.4);
  const L = (s, y) => text(g, s, 48, y, { family: serif, color: '#161a2c', weight: 700, size: 15 });
  L('1. TITLE OF THE INVENTION', 286);
  wrap(g, 'A TASTE-MASKED ORALLY DISINTEGRATING TABLET OF PARACETAMOL AND A PROCESS FOR ITS PREPARATION', 48, 314, W - 96, 23, { family: serif, color: '#161a2c', weight: 400, size: 16 });
  L('2. APPLICANT(S)', 412);
  text(g, '(a) NAME: SAKSHAM AGGARWAL', 48, 440, { family: serif, color: '#161a2c', weight: 400, size: 15.5 });
  text(g, '(b) NATIONALITY: INDIAN', 48, 464, { family: serif, color: '#161a2c', weight: 400, size: 15.5 });
  L('3. PREAMBLE TO THE DESCRIPTION', 512);
  wrap(g, 'The following specification particularly describes the invention and the manner in which it is to be performed.', 48, 540, W - 96, 23, { family: serif, color: '#161a2c', weight: 400, size: 15.5 });
  // drawing box
  g.strokeStyle = 'rgba(22,26,44,.45)'; g.lineWidth = 1.2; g.strokeRect(48, 610, 190, 110);
  g.beginPath(); g.ellipse(143, 665, 62, 26, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(88, 660); g.lineTo(198, 670); g.stroke();
  text(g, 'FIG. 1', 143, 712, { family: serif, size: 11, weight: 700, color: '#161a2c', align: 'center' });
  text(g, 'SPECIMEN', W - 48, 716, { family: BODY, size: 12, weight: 800, color: 'rgba(22,26,44,.5)', align: 'right', spacing: 3 });
  // stamp
  g.save();
  g.translate(W - 150, 640); g.rotate(-0.2);
  rr(g, -100, -44, 200, 88, 10); g.lineWidth = 4; g.strokeStyle = COLORS.cobalt; g.stroke();
  rr(g, -92, -36, 184, 72, 6); g.lineWidth = 1.4; g.stroke();
  text(g, 'FILED', 0, 6, { size: 40, weight: 800, family: DISPLAY, color: COLORS.cobalt, align: 'center', spacing: 4 });
  text(g, '07 NOV 2026', 0, 26, { size: 13, weight: 800, color: COLORS.cobalt, align: 'center', spacing: 2.5 });
  g.restore();
  return c;
}

// ── Patent journey step ──────────────────────────────────────────────────
export function drawStep(n, [title, sub, who], state) {
  const W = 520, H = 150;
  const { c, g } = canvas(W, H);
  glass(g, W, H, 26);
  const done = state === 'done', now = state === 'now';
  if (now) { rr(g, 1.5, 1.5, W - 3, H - 3, 26); g.fillStyle = 'rgba(2,83,235,.42)'; g.fill(); g.strokeStyle = 'rgba(120,170,255,.95)'; g.lineWidth = 2.5; g.stroke(); }
  g.beginPath(); g.arc(62, H / 2, 30, 0, Math.PI * 2);
  if (done) { g.fillStyle = COLORS.teal; g.fill(); check(g, 62, H / 2, 30, true); } else if (now) { g.fillStyle = '#fff'; g.fill(); text(g, `0${n}`, 62, H / 2 + 9, { size: 25, weight: 800, family: DISPLAY, color: COLORS.cobalt, align: 'center' }); } else { g.strokeStyle = 'rgba(160,185,255,.6)'; g.lineWidth = 2; g.stroke(); text(g, `0${n}`, 62, H / 2 + 9, { size: 25, weight: 700, family: DISPLAY, color: 'rgba(200,214,255,.8)', align: 'center' }); }
  text(g, title, 112, 68, { size: 32, weight: 700, family: DISPLAY, color: '#f4f7ff' });
  text(g, sub, 112, 102, { size: 18.5, color: 'rgba(214,224,255,.74)' });
  font(g, 700, 14, BODY);
  const ww = g.measureText(who).width + 26;
  rr(g, W - ww - 24, 22, ww, 30, 15); g.fillStyle = who === 'You' ? 'rgba(6,198,173,.22)' : 'rgba(255,255,255,.1)'; g.fill();
  text(g, who, W - 24 - ww / 2, 42, { size: 14, weight: 700, color: who === 'You' ? '#59ecd8' : 'rgba(226,233,255,.86)', align: 'center' });
  return c;
}

// ── Small glass chip (community pillars, mentor booking) ─────────────────
export function drawChip(title, sub, color = COLORS.teal, { w = 420, h = 116, badge } = {}) {
  const { c, g } = canvas(w, h);
  glass(g, w, h, 26);
  g.beginPath(); g.arc(56, h / 2, 24, 0, Math.PI * 2); g.fillStyle = color; g.fill();
  g.beginPath(); g.arc(56, h / 2, 9, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.92)'; g.fill();
  text(g, title, 98, h / 2 - 3, { size: 27, weight: 700, family: DISPLAY, color: '#f4f7ff' });
  text(g, sub, 98, h / 2 + 25, { size: 17, color: 'rgba(214,224,255,.76)' });
  if (badge) {
    font(g, 800, 13, BODY);
    const bw = g.measureText(badge).width + 26;
    rr(g, w - bw - 22, 20, bw, 28, 14); g.fillStyle = COLORS.amber; g.fill();
    text(g, badge, w - 22 - bw / 2, 39, { size: 13, weight: 800, color: '#2c1a02', align: 'center' });
  }
  return c;
}

// ── Laptop screen for the mentor table ───────────────────────────────────
export function drawScreen(color) {
  const { c, g, w, h } = canvas(256, 160, 1.5);
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#0d1c52'); bg.addColorStop(1, '#061033');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = color; rr(g, 14, 14, 86, 56, 8); g.fill();
  g.fillStyle = 'rgba(255,255,255,.75)'; rr(g, 112, 18, 120, 9, 4); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)';
  [36, 54].forEach((y) => { rr(g, 112, y, 96, 7, 3); g.fill(); });
  [88, 106, 124].forEach((y, i) => { rr(g, 14, y, 218 - i * 38, 8, 4); g.fill(); });
  return c;
}

/** Soft round sprite used for dust, glows and contact shadows. */
export function drawGlow(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 128) {
  const { c, g } = canvas(size, size, 1);
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner); grd.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.35)')); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  return c;
}
