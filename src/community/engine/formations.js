// The member swarm's formations, one per section of the community page.
// Each returns, for all N particles, a world position, colour, size and alpha.
import {
  STATIONS, toWorld, IDX, mapXZ, insideIndia, RING_R, GAP_ANGLE, D, PORTAL_R, PORTAL_STEPS, SLAB_R, pathPoint,
} from './layout.js';
import { ALL_EVENTS, EVENT_CITIES } from '../content.js';

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

  // 01 map — India as a dot-matrix; the cities where events happen light up
  {
    const f = new F(n, S('map'), 5);
    const cities = Object.entries(cityCounts()).map(([c, k]) => [mapXZ(...EVENT_CITIES[c]), k]);
    const STEP = 0.135;
    for (let lat = 37; lat > 6; lat -= STEP / 0.62) {
      for (let lon = 68; lon < 98; lon += STEP / 0.62) {
        if (!insideIndia(lon, lat)) continue;
        const [x, z] = mapXZ(lon, lat);
        const near = Math.min(...cities.map(([[cx, cz]]) => Math.hypot(cx - x, cz - z)));
        const glow = Math.max(0, 1 - near / 2.4);
        f.add(x, 0, z, mix3(P.cobalt, P.mint, 0.22 + glow * 0.78), 1.2 + glow * 0.7, 0.72 + glow * 0.28);
      }
    }
    cities.forEach(([[x, z], k]) => f.blob(x, 0.15, z, 0.12 + k * 0.02, 60 + k * 30, P.white, 1.3, 1));
    // online events: a halo floating over the map
    const r = f.r;
    for (let k = 0; k < 1400; k++) { const a = r() * Math.PI * 2; const R = 2.6 + gauss(r) * 0.1; f.add(Math.cos(a) * R, 5.2 + gauss(r) * 0.06, Math.sin(a) * R - 1, P.sky, 1, 0.7); }
    f.dust(18, 46, 0.07);
    out.push(f.out());
  }

  // 02 events — a halo of attendees around the ring of cards
  {
    const f = new F(n, S('events'), 10);
    const r = f.r;
    for (let k = 0; k < Math.floor(n * 0.5); k++) {
      const a = r() * Math.PI * 2, R = 6.6 + gauss(r) * 0.35;
      f.add(Math.cos(a) * R, -1.95 + Math.abs(gauss(r)) * 0.25, -6 + Math.sin(a) * R, mix3(P.cobalt, P.cyan, r()), 0.9, 0.55);
    }
    f.dust(10, 40, 0.08);
    out.push(f.out());
  }

  // 03 sessions — a lecture hall: one practitioner, rows of learners
  {
    const f = new F(n, S('sessions'), 4);
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

  // 04 portal — your link becomes a room: a vortex funnels into the portal, the room fills beyond
  {
    const f = new F(n, S('portal'), 6);
    const r = f.r;
    // funnel: a spiral from wide (the internet) to the portal mouth
    for (let k = 0; k < Math.floor(n * 0.42); k++) {
      const t = r();
      const x = -10 + t * 10;
      const R = PORTAL_R * (0.35 + (1 - t) * 1.9) + gauss(r) * 0.05;
      const a = t * 14 + r() * 0.4 + (k % 3) * 2.09;
      f.add(x, Math.cos(a) * R, Math.sin(a) * R, mix3(P.sky, P.mint, t), 0.9, 0.35 + t * 0.6);
    }
    // the room: rows of attendees fanning out after the portal
    for (let row = 0; row < 7; row++) {
      for (let s = 0; s < 22; s++) {
        const a = (-40 + (80 * s) / 21) * D, R = 3 + row * 0.75;
        f.blob(1.2 + Math.cos(a) * R, -1.6 + row * 0.18, Math.sin(a) * R, 0.05, 9, row % 3 ? P.teal : P.mint, 0.9, 0.85);
      }
    }
    PORTAL_STEPS.forEach(([x, y, z]) => f.blob(x, y, z, 0.1, 90, P.white, 1.2, 1));
    f.dust(12, 40, 0.07);
    out.push(f.out());
  }

  // 05 journal — an open book, its pages written in light
  {
    const f = new F(n, S('journal'), 7);
    const r = f.r;
    [-1, 1].forEach((side) => {
      for (let line = 0; line < 22; line++) {
        const v = line / 21;
        const len = 0.55 + 0.4 * ((line * 7) % 5) / 4;
        for (let s = 0; s < 120 * len; s++) {
          const u = 0.08 + (s / 120) * 0.84;
          const x = side * u * 4.2;
          const curl = Math.sin(u * Math.PI) * 0.55;
          f.add(x, -2.6 + curl * 0.6 + gauss(r) * 0.01, -1.2 + v * 3.2 - curl * 0.2, side < 0 ? mix3(P.sky, P.white, v * 0.5) : mix3(P.amber, P.white, v * 0.5), 0.85, 0.75);
        }
      }
      // page edges
      for (let k = 0; k < 500; k++) { const v = r(); f.add(side * 4.25, -2.6 + Math.sin(Math.PI) * 0.3, -1.3 + v * 3.4, P.white, 0.8, 0.6); }
    });
    for (let k = 0; k < 600; k++) f.add(gauss(r) * 0.03, -2.65, -1.3 + r() * 3.4, P.white, 0.9, 0.9);
    f.dust(10, 36, 0.08);
    out.push(f.out());
  }

  // 06 ambassadors — a globe of campuses; ambassador campuses glow
  {
    const f = new F(n, S('ambassadors'), 8);
    const R = 6.4, K = 4200;
    for (let k = 0; k < K; k++) {
      const y = 1 - (k / (K - 1)) * 2, rad = Math.sqrt(1 - y * y), th = k * Math.PI * (3 - Math.sqrt(5));
      const amb = k % 175 === 0;
      if (amb) f.blob(Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R, 0.08, 40, P.pink, 1.4, 1);
      else f.add(Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R, mix3(P.cobalt, P.cyan, (y + 1) / 2), 1, 0.85);
    }
    // latitude rings
    [-0.6, -0.2, 0.2, 0.6].forEach((yy) => { const rr = Math.sqrt(1 - yy * yy) * R * 1.01; for (let k = 0; k < 420; k++) { const a = (k / 420) * Math.PI * 2; f.add(Math.cos(a) * rr, yy * R, Math.sin(a) * rr, P.sky, 0.6, 0.35); } });
    f.dust(14, 44, 0.07);
    out.push(f.out());
  }

  // 07 guidelines — a protective dome over the six guidelines
  {
    const f = new F(n, S('guidelines'), 9);
    const R = SLAB_R + 2.4;
    for (let lat = 0; lat < 9; lat++) {
      const phi = (lat / 9) * Math.PI / 2, rr = Math.cos(phi) * R, y = Math.sin(phi) * R - 1.9;
      const cnt = Math.max(60, Math.round(rr * 90));
      for (let k = 0; k < cnt; k++) { const a = (k / cnt) * Math.PI * 2; f.add(Math.cos(a) * rr, y, Math.sin(a) * rr, mix3(P.violet, P.mint, lat / 8), 0.8, 0.6); }
    }
    for (let m = 0; m < 24; m++) {
      const a = (m / 24) * Math.PI * 2;
      for (let k = 0; k < 120; k++) { const phi = (k / 119) * Math.PI / 2; f.add(Math.cos(a) * Math.cos(phi) * R, Math.sin(phi) * R - 1.9, Math.sin(a) * Math.cos(phi) * R, P.violet, 0.7, 0.4); }
    }
    for (let k = 0; k < 1600; k++) { const a = f.r() * Math.PI * 2, rr = Math.sqrt(f.r()) * (R - 0.3); f.add(Math.cos(a) * rr, -1.95, Math.sin(a) * rr, P.navy, 0.8, 0.5); }
    f.dust(14, 44, 0.07);
    out.push(f.out());
  }

  // 08 resumes — a dotted wall behind the sheets, like a pinboard
  {
    const f = new F(n, S('resumes'), 11);
    for (let y = 0; y < 44; y++) for (let x = 0; x < 120; x++) {
      const u = x / 119, v = y / 43;
      const X = (u - 0.5) * 22, Z = -3.6 - Math.pow(Math.abs(u - 0.5) * 2, 2) * 3;
      f.add(X, -4.2 + v * 9, Z, mix3(P.navy, P.sky, v * 0.6), 0.8, 0.3 + v * 0.35);
    }
    f.dust(10, 40, 0.08);
    out.push(f.out());
  }

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

/** how many events happen in each city (online events are counted separately) */
export function cityCounts() {
  const m = {};
  ALL_EVENTS.forEach((e) => { const c = e.city === 'Delhi' ? 'New Delhi' : e.city; if (EVENT_CITIES[c]) m[c] = (m[c] ?? 0) + 1; });
  return m;
}
