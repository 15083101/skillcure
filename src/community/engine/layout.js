// Shared geometry for both engines. Right-handed, Y up (three.js convention; Babylon runs
// with useRightHandedSystem = true so the same numbers mean the same place in both).

export const D = Math.PI / 180;

//  F      where the section's subject lives
//  az/el  camera azimuth / elevation around F (degrees), dist = distance
//  side   +1 copy on the left (subject right) · -1 copy right · 0 centred copy
export const STATIONS = [
  { id: 'hub', F: [0, 0, 0], az: 0, el: 4, dist: 16, side: 1 },
  { id: 'map', F: [40, -10, -30], az: -10, el: 60, dist: 27, side: -1 },
  { id: 'events', F: [72, 4, -66], az: 20, el: 6, dist: 9.8, side: 1 },
  { id: 'sessions', F: [46, -2, -104], az: -22, el: 18, dist: 19.5, side: -1 },
  { id: 'portal', F: [12, 6, -128], az: 8, el: 4, dist: 15, side: 1 },
  { id: 'journal', F: [-24, 0, -110], az: -30, el: 12, dist: 15, side: -1 },
  { id: 'ambassadors', F: [-54, 10, -82], az: -50, el: 14, dist: 22, side: 1 },
  { id: 'guidelines', F: [-66, -4, -44], az: -70, el: 28, dist: 17.5, side: -1 },
  { id: 'resumes', F: [-42, 6, -12], az: -40, el: 3, dist: 13.5, side: 1 },
  { id: 'join', F: [-14, 2, 14], az: -25, el: 4, dist: 17, side: -1 },
];
export const N = STATIONS.length;
export const IDX = Object.fromEntries(STATIONS.map((s, i) => [s.id, i]));

export function camPos(s) {
  const a = s.az * D, e = s.el * D;
  return [s.F[0] + s.dist * Math.sin(a) * Math.cos(e), s.F[1] + s.dist * Math.sin(e), s.F[2] + s.dist * Math.cos(a) * Math.cos(e)];
}

/** Local → world for a station: rotate by the station's azimuth (so the set faces its camera), then translate. */
export function toWorld(i, x, y, z, out = [0, 0, 0]) {
  const s = STATIONS[i];
  const a = s.az * D;
  const c = Math.cos(a), sn = Math.sin(a);
  out[0] = s.F[0] + x * c + z * sn;
  out[1] = s.F[1] + y;
  out[2] = s.F[2] - x * sn + z * c;
  return out;
}

// ── India dot-map ─────────────────────────────────────────────────────────
// Simplified outline (lon, lat). It only needs to read as India at dot-matrix resolution.
export const INDIA = [
  [74.5, 37.0], [77.8, 35.5], [79.5, 32.5], [78.9, 31.0], [81.1, 30.2], [84.0, 28.6], [88.1, 27.9], [88.8, 27.3], [92.0, 27.8],
  [95.3, 29.0], [97.3, 28.2], [96.0, 27.0], [95.1, 26.5], [94.3, 25.2], [93.6, 24.0], [93.3, 22.7], [92.4, 23.6], [91.8, 23.0],
  [91.2, 23.7], [91.3, 24.9], [89.8, 25.3], [88.6, 26.4], [88.1, 25.6], [88.8, 24.2], [88.6, 22.3], [87.0, 21.5], [86.4, 20.0],
  [84.9, 19.3], [82.3, 16.6], [80.3, 15.9], [80.2, 13.4], [79.9, 11.0], [79.3, 10.2], [78.2, 8.9], [77.5, 8.1], [76.6, 8.9],
  [75.8, 11.4], [74.9, 12.9], [74.1, 14.8], [73.4, 16.4], [72.8, 19.0], [72.6, 21.4], [72.4, 22.2], [70.4, 20.9], [68.9, 22.4],
  [70.0, 23.3], [68.6, 23.9], [70.4, 24.8], [71.0, 26.2], [69.9, 27.0], [72.0, 28.5], [73.5, 29.9], [74.4, 31.0], [74.7, 32.5], [73.9, 34.0],
];
const MAP_K = 0.62;
/** lon/lat → local XZ on the map plane (map centred on 82.5E, 22N) */
export const mapXZ = (lon, lat) => [(lon - 82.5) * MAP_K, -(lat - 22) * MAP_K];
export function insideIndia(lon, lat) {
  let inside = false;
  for (let i = 0, j = INDIA.length - 1; i < INDIA.length; j = i++) {
    const [xi, yi] = INDIA[i], [xj, yj] = INDIA[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ── join ring ────────────────────────────────────────────────────────────
export const RING_R = 5.2;
export const GAP_ANGLE = -32 * D;  // where "you" fits in
export const YOU_LOCAL = [Math.cos(GAP_ANGLE) * RING_R, Math.sin(GAP_ANGLE) * RING_R, 0];

// ── sessions portal ──────────────────────────────────────────────────────
export const PORTAL_R = 1.9;
/** the four steps sit along the stream, from the link (left) to the room (right) */
export const PORTAL_STEPS = [[-7.2, -1.2, 0.6], [-3.8, -0.4, 0.4], [0, 0, 0], [4.6, 0.6, 0.4]];

// ── journal: pages fanned over an open book ─────────────────────────────
export function pagePose(k, n = 6) {
  const t = (k - (n - 1) / 2) / ((n - 1) / 2);   // -1 … 1
  return { pos: [t * 3.9, 0.1 + (1 - t * t) * 0.7, -Math.abs(t) * 1.4], rotY: -t * 0.45, rotZ: -t * 0.1 };
}

// ── guidelines: six monoliths in a circle ───────────────────────────────
export const SLAB_R = 4.6;
export function slabPose(k) {
  const a = (k / 6) * Math.PI * 2 + Math.PI / 2;
  return { pos: [Math.cos(a) * SLAB_R, 0, Math.sin(a) * SLAB_R], rotY: -a + Math.PI / 2, a };
}

// ── resumes: a gentle arc of sheets ─────────────────────────────────────
export function sheetPose(k, n = 6) {
  const t = (k - (n - 1) / 2) / ((n - 1) / 2);
  return { pos: [t * 4.4, 0.2, -Math.abs(t) * 1.8 - 0.4], rotY: -t * 0.38 };
}

/** quadratic bend so streams read as flows, not straight lines */
export function pathPoint(a, b, t, bend = 0.6) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + bend, mz = (a[2] + b[2]) / 2;
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * mx + t * t * b[0], u * u * a[1] + 2 * u * t * my + t * t * b[1], u * u * a[2] + 2 * u * t * mz + t * t * b[2]];
}
