// The member swarm's 15 formations. Each returns, for all N particles, a world position,
// colour, size and alpha. The swarm morphs from one to the next as the camera travels.
import { CIRCLES } from '../data.js';
import {
  STATIONS, toWorld, IDX, INDIA, mapXZ, insideIndia, CITY_XZ, riverPoint, dayT, atomLocal, MOL_R,
  storyGraph, pathPoint, RING_R, GAP_ANGLE, D,
} from './layout.js';
import { CITY_LINKS, EVENTS, eventDay, STORIES } from '../data.js';

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const P = {
  navy: hex('#0b2283'), cobalt: hex('#1c54f0'), sky: hex('#3b8bff'), cyan: hex('#2fa8ef'), teal: hex('#06c6ad'),
  mint: hex('#9ff7ea'), white: [1, 1, 1], amber: hex('#f6a53a'), pink: hex('#ff9fbb'), violet: hex('#8f7bff'),
};
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const gauss = (r) => { const u = Math.max(1e-6, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/** Formation builder: fills particles in order; anything not placed becomes faint dust. */
class F {
  constructor(n, station, seed) {
    this.n = n; this.i = 0; this.st = station; this.r = rng(seed);
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3);
    this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    this.w = [0, 0, 0];
  }
  get full() { return this.i >= this.n; }
  add(x, y, z, c, size = 1, alpha = 1) {
    if (this.i >= this.n) return false;
    toWorld(this.st, x, y, z, this.w);
    const k = this.i++;
    this.pos.set(this.w, k * 3); this.col.set(c, k * 3);
    this.size[k] = size; this.alpha[k] = alpha;
    return true;
  }
  /** fill the rest with dust in a shell around the subject */
  dust(r0 = 10, r1 = 34, alpha = 0.12, size = 0.6) {
    const r = this.r;
    while (this.i < this.n) {
      const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), rad = r0 + (r1 - r0) * Math.pow(r(), 0.6);
      this.add(rad * Math.sin(ph) * Math.cos(th), rad * Math.cos(ph) * 0.6, rad * Math.sin(ph) * Math.sin(th),
        r() < 0.5 ? P.sky : P.teal, size * (0.5 + r()), alpha * (0.4 + r()));
    }
    return this;
  }
  blob(x, y, z, rad, count, c, size = 1, alpha = 1) {
    for (let k = 0; k < count; k++) this.add(x + gauss(this.r) * rad, y + gauss(this.r) * rad, z + gauss(this.r) * rad, c, size, alpha);
  }
  line(a, b, count, c, size = 0.8, alpha = 0.5, jitter = 0.03, bend = 0) {
    for (let k = 0; k < count; k++) {
      const t = (k + this.r()) / count;
      const p = bend ? pathPoint(a, b, t, bend) : [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      this.add(p[0] + gauss(this.r) * jitter, p[1] + gauss(this.r) * jitter, p[2] + gauss(this.r) * jitter, c, size, alpha);
    }
  }
  out() { return { pos: this.pos, col: this.col, size: this.size, alpha: this.alpha }; }
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** sample an image (alpha + luminance) into a grid of pixels */
function sampleImage(img, cols) {
  const rows = Math.round(cols * (img.height / img.width));
  const cv = document.createElement('canvas'); cv.width = cols; cv.height = rows;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, cols, rows);
  const d = g.getImageData(0, 0, cols, rows).data;
  const px = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = (y * cols + x) * 4;
    if (d[i + 3] < 128) continue;
    const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    const lv = Math.min(3, Math.floor(Math.pow(l, 0.9) * 3 + (BAYER4[(y % 4) * 4 + (x % 4)] + 0.5) / 16));
    px.push([x, y, l, lv]);
  }
  return { px, cols, rows };
}
/** sample text / a drawn shape into points */
function sampleDrawing(w, h, draw, step = 3) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true });
  draw(g);
  const d = g.getImageData(0, 0, w, h).data;
  const pts = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (d[(y * w + x) * 4 + 3] > 128) pts.push([x / w - 0.5, 0.5 - y / h]);
  return pts;
}

export const PORTRAIT = { width: 6.4, x: 0.6, y: -0.9 };
const LEVEL = [P.navy, P.cobalt, P.cyan, P.mint];

export function buildFormations(n, { portrait }) {
  const out = [];
  const S = (id) => IDX[id];

  // 00 hub — the portrait as a pixel sculpture ("a clearer mind")
  {
    const f = new F(n, S('hub'), 1);
    const { px, cols, rows } = sampleImage(portrait, 128);
    const cell = PORTRAIT.width / cols;
    // keep the best-lit pixels if there are more than particles
    const list = px.length > n * 0.86 ? px.filter((_, k) => k % Math.ceil(px.length / (n * 0.86)) === 0) : px;
    list.forEach(([x, y, l, lv]) => f.add(PORTRAIT.x + (x + 0.5) * cell - PORTRAIT.width / 2, PORTRAIT.y + (rows / 2 - y) * cell, (l - 0.5) * 0.9, LEVEL[lv], 1.05, 1));
    f.dust(7, 28, 0.1);
    out.push(f.out());
  }

  // 01 alone — one learner in the dark; everyone else is a distant star
  {
    const f = new F(n, S('alone'), 2);
    f.add(0, 0, 0, P.white, 3, 1);
    f.blob(0, 0, 0, 0.06, 40, P.mint, 1.2, 0.8);
    f.dust(22, 80, 0.1, 0.9);
    out.push(f.out());
  }

  // 02 together — the same learner, now one node of a network of hundreds
  {
    const f = new F(n, S('together'), 3);
    const r = f.r;
    f.add(0, 0, 0, P.white, 3, 1);
    f.blob(0, 0, 0, 0.06, 40, P.mint, 1.4, 0.9);
    const K = 110, nodes = [[0, 0, 0]];
    for (let k = 1; k < K; k++) {
      const y = 1 - (k / (K - 1)) * 2, rad = Math.sqrt(1 - y * y), th = k * Math.PI * (3 - Math.sqrt(5));
      const R = 10.5 * (0.55 + 0.45 * r());
      nodes.push([Math.cos(th) * rad * R, y * R * 0.72, Math.sin(th) * rad * R]);
    }
    const palette = [P.cobalt, P.sky, P.teal, P.teal, P.mint, P.pink, P.amber];
    nodes.forEach((p, k) => { if (k) f.blob(p[0], p[1], p[2], 0.14, 34, palette[k % palette.length], 2.2, 1); });
    const edges = [];
    nodes.forEach((a, i) => nodes.map((b, j) => [(a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2, j]).sort((x, y) => x[0] - y[0]).slice(1, 4)
      .forEach(([, j]) => { if (!edges.some(([p, q]) => (p === j && q === i))) edges.push([i, j]); }));
    // the centre learner gets extra bonds
    for (let k = 1; k <= 6; k++) edges.push([0, k * 9]);
    const per = Math.floor((n - f.i) * 0.9 / edges.length);
    edges.forEach(([i, j]) => f.line(nodes[i], nodes[j], per, i === 0 ? P.mint : P.sky, 1.2, i === 0 ? 0.9 : 0.5, 0.02));
    f.dust(16, 50, 0.08);
    out.push(f.out());
  }

  // 03 learn — a masterclass: one practitioner, rows of learners
  {
    const f = new F(n, S('learn'), 4);
    const r = f.r;
    const M = [0, 1.7, -4.2];
    f.blob(M[0], M[1], M[2], 0.32, 900, P.amber, 1.1, 1);
    const seats = [];
    for (let row = 0; row < 8; row++) {
      const R = 3.2 + row * 1.05;
      const span = 64 + row * 2;
      const count = Math.round((2 * span * D * R) / 0.78);
      for (let s = 0; s <= count; s++) {
        const a = (-span + (2 * span * s) / count) * D;
        const p = [M[0] + Math.sin(a) * R, -1.6 + row * 0.32, M[2] + Math.cos(a) * R];
        seats.push(p);
      }
    }
    seats.forEach((p, k) => f.blob(p[0], p[1], p[2], 0.07, 16, k % 5 === 0 ? P.teal : P.sky, 0.95, 0.9));
    // knowledge streams from the stage to learners
    for (let k = 0; k < 46; k++) f.line(M, seats[Math.floor(r() * seats.length)], 34, P.amber, 0.7, 0.4, 0.02, 0.5);
    f.dust(14, 40, 0.08);
    out.push(f.out());
  }

  // 04 connect — India as a dot-matrix; members light up the cities
  {
    const f = new F(n, S('connect'), 5);
    const r = f.r;
    const STEP = 0.135;
    for (let lat = 37; lat > 6; lat -= STEP / 0.62) {
      for (let lon = 68; lon < 98; lon += STEP / 0.62) {
        if (!insideIndia(lon, lat)) continue;
        const [x, z] = mapXZ(lon, lat);
        const near = Math.min(...CITY_XZ.map(([cx, cz]) => Math.hypot(cx - x, cz - z)));
        const glow = Math.max(0, 1 - near / 2.2);
        f.add(x, 0, z, mix3(P.cobalt, P.mint, 0.25 + glow * 0.75), 1.25 + glow * 0.6, 0.75 + glow * 0.25);
      }
    }
    CITY_XZ.forEach(([x, z]) => f.blob(x, 0.12, z, 0.1, 70, P.mint, 1.2, 1));
    CITY_LINKS.forEach(([a, b]) => {
      const A = [CITY_XZ[a][0], 0, CITY_XZ[a][1]], B = [CITY_XZ[b][0], 0, CITY_XZ[b][1]];
      const len = Math.hypot(A[0] - B[0], A[2] - B[2]);
      f.line(A, B, Math.round(len * 26), P.teal, 0.7, 0.55, 0.015, len * 0.32);
    });
    void r;
    f.dust(18, 46, 0.07);
    out.push(f.out());
  }

  // 05 collaborate — a formulation flask and code, pulled into one project
  {
    const f = new F(n, S('collaborate'), 6);
    const flask = sampleDrawing(220, 260, (g) => {
      g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(88, 20); g.lineTo(132, 20); g.lineTo(132, 96); g.lineTo(200, 230); g.quadraticCurveTo(206, 248, 186, 248);
      g.lineTo(34, 248); g.quadraticCurveTo(14, 248, 20, 230); g.lineTo(88, 96); g.closePath(); g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.moveTo(98, 30); g.lineTo(122, 30); g.lineTo(122, 100); g.lineTo(186, 226); g.lineTo(34, 226); g.lineTo(98, 100); g.closePath(); g.fill();
      g.globalCompositeOperation = 'source-over';
      g.fillRect(40, 170, 140, 56); // liquid
      g.fillRect(74, 8, 72, 16);
    }, 3);
    const code = sampleDrawing(300, 220, (g) => {
      g.fillStyle = '#fff'; g.font = '800 170px Poppins, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('</>', 150, 116);
    }, 3);
    const r = f.r;
    flask.forEach(([x, y]) => f.add(-3.3 + x * 3.6, y * 4.2, (r() - 0.5) * 0.4, y < -0.12 ? P.teal : P.mint, 1, 0.95));
    code.forEach(([x, y]) => f.add(3.2 + x * 4.0, y * 3.2, (r() - 0.5) * 0.4, P.sky, 1, 0.95));
    f.blob(0, 0, 0.4, 0.22, 700, P.white, 1.2, 1);
    for (let k = 0; k < 14; k++) {
      const a = [-2.2, (r() - 0.5) * 2.6, 0], b = [2.0, (r() - 0.5) * 2.2, 0];
      f.line(a, [0, 0, 0.4], 40, P.mint, 0.7, 0.45, 0.02, (r() - 0.5) * 1.2);
      f.line([0, 0, 0.4], b, 40, P.sky, 0.7, 0.45, 0.02, (r() - 0.5) * 1.2);
    }
    f.dust(12, 40, 0.08);
    out.push(f.out());
  }

  // 06 discover — a radar of opportunities (rings + spokes; the sweep and blips are Babylon)
  {
    const f = new F(n, S('discover'), 7);
    const r = f.r;
    [1.6, 3.2, 4.8, 6.4, 8].forEach((R, k) => {
      const count = Math.round(R * 160);
      for (let s = 0; s < count; s++) { const a = (s / count) * Math.PI * 2; f.add(Math.cos(a) * R, 0, Math.sin(a) * R, k === 4 ? P.teal : P.cyan, 0.8, k === 4 ? 0.9 : 0.55); }
    });
    for (let s = 0; s < 16; s++) { const a = (s / 16) * Math.PI * 2; f.line([0, 0, 0], [Math.cos(a) * 8, 0, Math.sin(a) * 8], 110, P.cobalt, 0.6, 0.35, 0.01); }
    for (let k = 0; k < 2200; k++) { const a = r() * Math.PI * 2, R = Math.sqrt(r()) * 8; f.add(Math.cos(a) * R, (r() - 0.5) * 0.05, Math.sin(a) * R, P.navy, 0.6, 0.3); }
    f.dust(14, 44, 0.07);
    out.push(f.out());
  }

  // 07 grow — a double helix climbing toward confidence
  {
    const f = new F(n, S('grow'), 8);
    const H = 11, turns = 3.4, R = 1.7;
    for (let k = 0; k < 5200; k++) {
      const t = k / 5200, a = t * turns * Math.PI * 2, y = -H / 2 + t * H;
      const c = mix3(mix3(P.cobalt, P.teal, Math.min(1, t * 1.6)), P.white, Math.max(0, t * 1.4 - 0.6));
      [0, Math.PI].forEach((o) => f.add(Math.cos(a + o) * R + gauss(f.r) * 0.04, y, Math.sin(a + o) * R + gauss(f.r) * 0.04, c, 1, 0.95));
    }
    for (let k = 0; k < 44; k++) {
      const t = (k + 0.5) / 44, a = t * turns * Math.PI * 2, y = -H / 2 + t * H;
      f.line([Math.cos(a) * R, y, Math.sin(a) * R], [Math.cos(a + Math.PI) * R, y, Math.sin(a + Math.PI) * R], 40, mix3(P.sky, P.mint, t), 0.7, 0.55, 0.012);
    }
    f.dust(12, 40, 0.08);
    out.push(f.out());
  }

  // 08 calendar — a river of time from October to January
  {
    const f = new F(n, S('calendar'), 9);
    const r = f.r;
    for (let k = 0; k < Math.floor(n * 0.62); k++) {
      const t = r();
      const p = riverPoint(t);
      const w = (r() - 0.5) * 2.4 * (0.5 + 0.5 * Math.sin(t * 9) ** 2);
      f.add(p[0] + w, p[1] + gauss(r) * 0.05, p[2] + (r() - 0.5) * 0.3, mix3(P.sky, P.teal, t), 1.15, 0.5 + r() * 0.5);
    }
    EVENTS.forEach((e) => { const p = riverPoint(dayT(eventDay(e))); f.blob(p[0], p[1] + 0.15, p[2], 0.08, 60, P.mint, 1.2, 1); });
    f.dust(14, 46, 0.07);
    out.push(f.out());
  }

  // 09 events — a halo of attendees around the ring of events
  {
    const f = new F(n, S('events'), 10);
    const r = f.r;
    for (let k = 0; k < Math.floor(n * 0.5); k++) {
      const a = r() * Math.PI * 2, R = 6.4 + gauss(r) * 0.35;
      f.add(Math.cos(a) * R, -1.9 + Math.abs(gauss(r)) * 0.25, -5.9 + Math.sin(a) * R, mix3(P.cobalt, P.cyan, r()), 0.8, 0.5);
    }
    f.dust(10, 40, 0.08);
    out.push(f.out());
  }

  // 10 circles — each circle's members as an electron cloud, bonds as streams
  {
    const f = new F(n, S('circles'), 11);
    const r = f.r;
    const total = CIRCLES.reduce((s, c) => s + c.members, 0);
    const budget = Math.floor(n * 0.62);
    CIRCLES.forEach((c, k) => {
      const [x, y, z] = atomLocal(k);
      const cnt = Math.round((c.members / total) * budget);
      for (let i = 0; i < cnt; i++) {
        const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), R = 0.95 + r() * 0.55;
        f.add(x + R * Math.sin(ph) * Math.cos(th), y + R * Math.cos(ph), z + R * Math.sin(ph) * Math.sin(th), hex(c.color), 0.85, 0.75);
      }
    });
    for (let k = 0; k < 6; k++) f.line(atomLocal(k), atomLocal((k + 1) % 6), 220, P.sky, 0.7, 0.55, 0.025);
    void MOL_R;
    f.dust(12, 40, 0.08);
    out.push(f.out());
  }

  // 11–13 stories — each member's path drawn as light
  STORIES.forEach((s, si) => {
    const f = new F(n, S(['aman', 'divya', 'karthik'][si]), 12 + si);
    const g = storyGraph(s.shape);
    const col = hex(s.color);
    const per = Math.floor((n * 0.55) / g.paths.length);
    g.paths.forEach(([a, b], k) => f.line(g.nodes[a], g.nodes[b], per, k === 0 || s.shape === 'merge' && k < 2 ? P.sky : col, 0.9, 0.7, 0.07, 0.5));
    g.nodes.forEach((p, k) => f.blob(p[0], p[1], p[2], g.ends.includes(k) ? 0.16 : 0.1, g.ends.includes(k) ? 220 : 120, g.ends.includes(k) ? P.white : P.mint, 1.1, 1));
    f.dust(10, 40, 0.08);
    out.push(f.out());
  });

  // 14 join — the community as one ring, with a gap exactly your size
  {
    const f = new F(n, S('join'), 15);
    const r = f.r;
    const ringN = Math.floor(n * 0.7);
    for (let k = 0; k < ringN; k++) {
      let a = r() * Math.PI * 2;
      const gap = Math.abs(Math.atan2(Math.sin(a - GAP_ANGLE), Math.cos(a - GAP_ANGLE)));
      if (gap < 11 * D) a += (gap < 0 ? -1 : 1) * 22 * D;
      const R = RING_R + gauss(r) * 0.16, z = gauss(r) * 0.16;
      const t = (Math.sin(a * 3) + 1) / 2;
      f.add(Math.cos(a) * R, Math.sin(a) * R, z, mix3(P.cobalt, P.teal, t), 0.95, 0.9);
    }
    f.dust(12, 44, 0.08);
    out.push(f.out());
  }

  if (out.length !== STATIONS.length) throw new Error(`formations: ${out.length} ≠ ${STATIONS.length}`);
  return out;
}
