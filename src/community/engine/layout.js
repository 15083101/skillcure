// Shared geometry for both engines. Right-handed, Y up (three.js convention; Babylon runs
// with useRightHandedSystem = true so the same numbers mean the same place in both).
import { CITIES, EVENTS, eventDay } from '../data.js';

export const D = Math.PI / 180;

//  F      where the section's subject lives
//  az/el  camera azimuth / elevation around F (degrees), dist = distance
//  side   +1 copy on the left (subject right) · -1 copy right · 0 centred copy
export const STATIONS = [
  { id: 'hub', F: [0, 0, 0], az: 0, el: 4, dist: 16, side: 1 },
  { id: 'alone', F: [8, -4, -44], az: 0, el: 0, dist: 7.5, side: 0 },
  { id: 'together', F: [8, -4, -44], az: 28, el: 14, dist: 30, side: 0 },
  { id: 'learn', F: [44, -2, -66], az: 22, el: 16, dist: 15.5, side: 1 },
  { id: 'connect', F: [72, -12, -38], az: -10, el: 60, dist: 27, side: -1 },
  { id: 'collaborate', F: [92, 4, -80], az: 30, el: 3, dist: 16, side: 1 },
  { id: 'discover', F: [66, 16, -110], az: 0, el: 46, dist: 24, side: -1 },
  { id: 'grow', F: [32, 8, -128], az: -20, el: -9, dist: 16, side: 1 },
  { id: 'calendar', F: [-6, 0, -150], az: 0, el: 13, dist: 15, side: 1 },
  { id: 'events', F: [-44, 6, -170], az: -15, el: 6, dist: 9.8, side: 1 },
  { id: 'circles', F: [-76, -4, -146], az: 16, el: 50, dist: 14, side: -1 },
  { id: 'aman', F: [-100, 2, -112], az: -30, el: 4, dist: 12.5, side: 1 },
  { id: 'divya', F: [-110, 8, -78], az: -50, el: 6, dist: 12.5, side: 1 },
  { id: 'karthik', F: [-104, 14, -44], az: -70, el: 8, dist: 12.5, side: 1 },
  { id: 'join', F: [-44, 4, -8], az: -25, el: 4, dist: 17, side: -1 },
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
export const CITY_XZ = CITIES.map(([, lon, lat]) => mapXZ(lon, lat));

// ── calendar river ───────────────────────────────────────────────────────
const DAYS = EVENTS.map(eventDay);
export const DAY0 = Math.min(...DAYS) - 6;   // a little lead-in before the first event
export const DAY1 = Math.max(...DAYS) + 6;
/** t: 0 (nearest, October) … 1 (farthest, January) → local point on the river */
export function riverPoint(t) {
  const z = 6 - t * 44;
  return [Math.sin(t * Math.PI * 2.2) * 2.6, Math.sin(t * Math.PI * 1.3) * 0.8 - 1.4, z];
}
export const dayT = (day) => (day - DAY0) / (DAY1 - DAY0);

// ── the molecule (circles) ───────────────────────────────────────────────
export const MOL_R = 3.4;
const TILT_X = 0.42, TILT_Z = -0.2;
/** atom k (0–5) in the station's local frame; ring lies in a tilted plane */
export function atomLocal(k) {
  const a = (k / 6) * Math.PI * 2;
  let x = Math.cos(a) * MOL_R, y = 0, z = Math.sin(a) * MOL_R;
  // tilt about X, then Z
  const cx = Math.cos(TILT_X), sx = Math.sin(TILT_X);
  [y, z] = [y * cx - z * sx, y * sx + z * cx];
  const cz = Math.cos(TILT_Z), sz = Math.sin(TILT_Z);
  [x, y] = [x * cz - y * sz, x * sz + y * cz];
  return [x, y, z];
}

// ── story journeys (station-local) ───────────────────────────────────────
// Each story is drawn as paths of light. Returns { nodes: [[x,y,z],…], paths: [[from,to],…] }.
export function storyGraph(shape) {
  const z = 1.1;
  if (shape === 'merge') {
    const n = [[-4.4, -2.1, z], [-4.4, 0.5, z], [-0.2, -0.6, z + 0.3], [4.1, 1.3, z]];
    return { nodes: n, paths: [[0, 2], [1, 2], [2, 3]], ends: [3] };
  }
  if (shape === 'split') {
    const n = [[-4.4, -1.4, z], [-0.4, -0.5, z + 0.3], [4.1, 1.6, z], [4.1, -1.2, z]];
    return { nodes: n, paths: [[0, 1], [1, 2], [1, 3]], ends: [2, 3] };
  }
  // fan: one path into twelve
  const n = [[-4.4, -1.6, z], [-0.8, -0.4, z + 0.3]];
  const paths = [[0, 1]];
  for (let k = 0; k < 12; k++) {
    const a = (-55 + (k / 11) * 110) * D;
    n.push([3.0 + Math.cos(a) * 1.7, 0.3 + Math.sin(a) * 1.9, z + Math.sin(a * 2) * 0.4]);
    paths.push([1, n.length - 1]);
  }
  return { nodes: n, paths, ends: n.map((_, i) => i).slice(2) };
}
/** quadratic bend so paths read as flows, not straight lines */
export function pathPoint(a, b, t, bend = 0.6) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + bend, mz = (a[2] + b[2]) / 2;
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * mx + t * t * b[0], u * u * a[1] + 2 * u * t * my + t * t * b[1], u * u * a[2] + 2 * u * t * mz + t * t * b[2]];
}

// ── join ring ────────────────────────────────────────────────────────────
export const RING_R = 5.2;
export const GAP_ANGLE = -32 * D;  // where "you" fits in
export const YOU_LOCAL = [Math.cos(GAP_ANGLE) * RING_R, Math.sin(GAP_ANGLE) * RING_R, 0];
