// Where everything lives, and how the camera gets there.
// The world is not a vertical strip: each chapter sits in a different direction,
// so every leg of the journey is a different camera move.
import * as THREE from 'three';

const D = Math.PI / 180;

//  F     focus point (where the chapter's 3D subject lives)
//  az/el camera azimuth / elevation around the focus, dist = distance
//  shift where the subject sits on screen (fraction of viewport; +x right, +y up)
export const STATIONS = [
  { F: [0, 0, 0], az: 0, el: 4, dist: 10.6, shift: [0.2, -0.02] },         // 00 hero
  { F: [17, 1, -6], az: 32, el: 7, dist: 10.8, shift: [-0.215, 0] },        // 01 dashboard   → truck right
  { F: [14, -14, -11], az: -30, el: -4, dist: 10.6, shift: [0.2, 0] },     // 02 prescription ↓ dive down
  { F: [-11, -3, -27], az: -38, el: 9, dist: 11.6, shift: [-0.2, 0] },     // 03 patents     ↖ sweep left + climb
  { F: [-4, 8, -54], az: 12, el: 2, dist: 12.6, shift: [0.2, 0] },         // 04 community   ↑ push deep forward
  { F: [19, 12, -45], az: 52, el: 33, dist: 10.8, shift: [-0.225, -0.02] },  // 05 mentors     ↗ crane up, look down
  { F: [4, 31, -30], az: 0, el: -5, dist: 11.4, shift: [0, 0.25] },        // 06 join        ⤴ pull back + rise
];

// One sculpted waypoint per leg so the path arcs instead of sliding in a straight line.
const VIAS = [
  [12, 3.5, 11],
  [21, -6, 4],
  [-5, -12, -5],
  [-13, 5, -31],
  [13, 9, -33],
  [19, 28, -24],
];

// How the HTML copy leaves the screen on each leg (it moves opposite to the camera).
//   x,y in screen space (+y is down), z > 0 = flies past you, z < 0 = recedes.
export const LEG_MOTION = [
  { x: -1, y: 0, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0.8, y: 0.6, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: -0.8, y: 0.6, z: 0 },
  { x: 0, y: 0.5, z: -1 },
];

export const N = STATIONS.length;

export function camPos(s, out = new THREE.Vector3()) {
  const a = s.az * D, e = s.el * D;
  return out.set(
    s.F[0] + s.dist * Math.sin(a) * Math.cos(e),
    s.F[1] + s.dist * Math.sin(e),
    s.F[2] + s.dist * Math.cos(a) * Math.cos(e),
  );
}

export const focusOf = (i) => new THREE.Vector3(...STATIONS[i].F);
export const yawOf = (i) => STATIONS[i].az * D;

/** Per-leg camera curves (start cam → via → end cam). */
export function buildLegs() {
  const legs = [];
  for (let i = 0; i < N - 1; i++) {
    const a = camPos(STATIONS[i]);
    const b = camPos(STATIONS[i + 1]);
    legs.push(new THREE.CatmullRomCurve3([a, new THREE.Vector3(...VIAS[i]), b], false, 'catmullrom', 0.5));
  }
  return legs;
}

export const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
export const smoother = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * t * (t * (t * 6 - 15) + 10); };

/** Scroll progress within a leg → travel amount, with a rest plateau at each chapter. */
export const HOLD = 0.1;
export const travel = (f) => smoother((f - HOLD) / (1 - 2 * HOLD));
