// Babylon.js set pieces — the solid, lit, glowing part of every section.
// Built in each station's local frame (same frame the swarm formations use).
import { Vector3, MeshBuilder, Color3 } from './bjs.js';
import { col } from './stage.js';
import {
  STATIONS, IDX, D, CITY_XZ, pathPoint, riverPoint, dayT, DAY0, DAY1, atomLocal, storyGraph, RING_R, YOU_LOCAL,
} from './layout.js';
import { PORTRAIT } from './formations.js';
import { CIRCLES, CITIES, CITY_LINKS, EVENTS, eventDay, PILLARS, STORIES, TYPE_COLOR } from '../data.js';
import * as art from './art.js';

const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

export function createPieces(stage, assets) {
  const { scene, glow } = stage;
  const { emissive, glass, dither, canvasMaterial, glowSprite, node } = stage.mats;
  const anchors = [];
  const updaters = [];
  const pick = { events: [], atoms: [], stories: [] };

  const roots = [];
  const root = (i) => {
    const s = STATIONS[i];
    const n = node(`st${i}`);
    roots.push([i, n]);
    n.position.set(s.F[0], s.F[1], s.F[2]);
    n.rotation.y = s.az * D;
    return n;
  };
  /** register a label pinned to a local point of a station (or a live mesh) */
  const pin = (stations, target, text, opts = {}) => anchors.push({ stations: [].concat(stations), target, text, ...opts });
  const worldOf = (n, local) => { n.computeWorldMatrix(true); return Vector3.TransformCoordinates(new Vector3(...local), n.getWorldMatrix()); };
  const tube = (name, path, r, mat, parent) => {
    const m = MeshBuilder.CreateTube(name, { path: path.map((p) => new Vector3(p[0], p[1], p[2])), radius: r, tessellation: 8, cap: 0 }, scene);
    m.material = mat; m.parent = parent; m.isPickable = false;
    return m;
  };
  const sphere = (name, d, mat, parent, pos = [0, 0, 0]) => {
    const m = MeshBuilder.CreateSphere(name, { diameter: d, segments: 20 }, scene);
    m.material = mat; m.parent = parent; m.position.set(...pos); m.isPickable = false;
    return m;
  };
  const torus = (name, diameter, thickness, mat, parent, pos = [0, 0, 0]) => {
    const m = MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 96 }, scene);
    m.material = mat; m.parent = parent; m.position.set(...pos); m.isPickable = false;
    return m;
  };
  /** expanding "sonar" rings — axis 'z' faces the camera, otherwise they lie flat */
  function pulses(parent, pos, hex, { count = 3, max = 3, period = 2.4, axis = 'y', thickness = 0.02 } = {}) {
    const rings = Array.from({ length: count }, (_, k) => {
      const t = torus(`pulse${k}`, 1, thickness, emissive(hex, 1.6, 1), parent, pos);
      t.material = t.material.clone(`pm${Math.random()}`); t.material.alphaMode = 1;
      if (axis === 'z') t.rotation.x = Math.PI / 2;
      return t;
    });
    return (time, on) => rings.forEach((r, k) => {
      const u = ((time / period + k / count) % 1);
      r.scaling.setAll(0.2 + u * max);
      r.material.alpha = (1 - u) * on;
      r.setEnabled(on > 0.01);
    });
  }

  // ── 00 hub: orbits around the portrait's head, the six circles riding them ─
  {
    const i = IDX.hub; const r = root(i);
    const head = [PORTRAIT.x - 0.5, 0.8, 0];
    const back = glowSprite('#0253eb', 16, 0.35, r); back.position.set(head[0], 0, -3);
    const orbits = [[3.5, 64, 22, 0.42], [4.0, 52, -36, -0.32], [3.2, 76, 98, 0.5]];
    const riders = [];
    orbits.forEach(([R, tx, tz, speed], k) => {
      const o = node(`orbit${k}`, r);
      o.position.set(...head);
      o.rotation.set(tx * D, 0, tz * D);
      const t = torus('orb', R * 2, 0.012, emissive(['#06c6ad', '#3b7bff', '#ff9fbb'][k], 1.4, 0.5), o);
      t.rotation.x = 0;
      [0, 1].forEach((h) => {
        const ci = k * 2 + h;
        const a = sphere('rider', 0.26, emissive(CIRCLES[ci].color, 2.2), o);
        const halo = glowSprite(CIRCLES[ci].color, 1.6, 0.6, a);
        void halo;
        riders.push({ a, R, speed, phase: h * Math.PI + k * 1.3 });
      });
    });
    riders.forEach((rd, k) => pin(i, rd.a, CIRCLES[k].name, { sub: CIRCLES[k].members.toLocaleString('en-IN'), color: CIRCLES[k].color, kind: 'orbit' }));
    updaters.push((t) => riders.forEach((rd) => { const a = t * rd.speed + rd.phase; rd.a.position.set(Math.cos(a) * rd.R, 0, Math.sin(a) * rd.R); }));
  }

  // ── 01/02 alone → together: sonar from the lone learner ─────────────────
  {
    const i = IDX.alone; const r = root(i);
    const core = sphere('lone', 0.16, emissive('#dffcff', 2.4), r);
    glowSprite('#7ff5e4', 2.2, 0.7, core);
    const sonar = pulses(r, [0, 0, 0], '#7ff5e4', { count: 3, max: 2.4, period: 3.2, axis: 'z', thickness: 0.008 });
    updaters.push((t, dt, w) => sonar(t, Math.max(w[IDX.alone], w[IDX.together] * 0.5) * 0.5));
    pin(IDX.alone, [0, 0, 0], 'you', { kind: 'you', local: r });
    pin(IDX.together, [0, 0, 0], 'you, connected', { kind: 'you', local: r });
  }

  // ── 03 learn: a stage, a light cone, rows of learners ───────────────────
  {
    const i = IDX.learn; const r = root(i);
    const M = [0, 1.7, -4.2];
    const stageDisc = MeshBuilder.CreateDisc('stage', { radius: 1.5, tessellation: 64 }, scene);
    stageDisc.parent = r; stageDisc.rotation.x = Math.PI / 2; stageDisc.position.set(M[0], 1.0, M[2]);
    stageDisc.material = emissive('#3a2203', 1, 0.6);
    torus('stageRim', 3.0, 0.03, emissive('#f6a53a', 2), r, [M[0], 1.0, M[2]]);
    const cone = MeshBuilder.CreateCylinder('cone', { diameterTop: 0.15, diameterBottom: 3.6, height: 7, tessellation: 48, cap: 0 }, scene);
    cone.parent = r; cone.position.set(M[0], 4.5, M[2]); cone.material = emissive('#f6a53a', 0.9, 0.07); cone.isPickable = false;
    glow.addExcludedMesh(cone);
    glowSprite('#f6a53a', 4, 0.55, r).position.set(...M);
    const live = pulses(r, [M[0], 1.02, M[2]], '#f6a53a', { count: 2, max: 3.2, period: 2.2 });
    for (let row = 0; row < 8; row++) {
      const R = 3.2 + row * 1.05, span = 64 + row * 2;
      const path = [];
      for (let s = 0; s <= 40; s++) { const a = (-span + (2 * span * s) / 40) * D; path.push([M[0] + Math.sin(a) * R, -1.75 + row * 0.32, M[2] + Math.cos(a) * R]); }
      tube(`row${row}`, path, 0.008, emissive('#3b7bff', 1.2, 0.5), r);
    }
    updaters.push((t, dt, w) => live(t, w[i]));
    const p = PILLARS[0];
    pin(i, [M[0], M[1] + 1.2, M[2]], p.points[0], { kind: 'tag', color: '#f6a53a', local: r });
    pin(i, [-6.2, -0.6, 2.0], p.points[1], { kind: 'tag', color: '#3b8bff', local: r });
    pin(i, [6.2, -0.4, 1.4], p.points[2], { kind: 'tag', color: '#06c6ad', local: r });
  }

  // ── 04 connect: pins + arcs over the India dot-map ──────────────────────
  {
    const i = IDX.connect; const r = root(i);
    const pins = CITY_XZ.map(([x, z], k) => {
      const stem = MeshBuilder.CreateCylinder('pin', { height: 0.9, diameter: 0.035, tessellation: 8 }, scene);
      stem.parent = r; stem.position.set(x, 0.45, z); stem.material = emissive('#7ff5e4', 1.6); stem.isPickable = false;
      const head = sphere('pinHead', 0.16, emissive('#dffcff', 2.2), r, [x, 0.95, z]);
      return head;
    });
    const arcs = CITY_LINKS.map(([a, b]) => {
      const A = [CITY_XZ[a][0], 0, CITY_XZ[a][1]], B = [CITY_XZ[b][0], 0, CITY_XZ[b][1]];
      const len = Math.hypot(A[0] - B[0], A[2] - B[2]);
      const path = Array.from({ length: 28 }, (_, s) => pathPoint(A, B, s / 27, len * 0.32));
      tube('arc', path, 0.014, emissive('#06c6ad', 1.5, 0.75), r);
      return path;
    });
    const sparks = arcs.map((path, k) => ({ m: sphere('spark', 0.1, emissive('#ffffff', 2.6), r), path, t: k / arcs.length, sp: 0.18 + (k % 4) * 0.05 }));
    updaters.push((t, dt) => sparks.forEach((s) => {
      s.t = (s.t + dt * s.sp) % 1;
      const f = s.t * (s.path.length - 1), k0 = Math.floor(f), u = f - k0;
      const a = s.path[k0], b = s.path[Math.min(k0 + 1, s.path.length - 1)];
      s.m.position.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u);
    }));
    [0, 1, 2, 3, 5, 4].forEach((k) => pin(i, pins[k], CITIES[k][0], { kind: 'city' }));
    const p = PILLARS[1];
    pin(i, [-8.6, 0.5, -6.2], p.points[0], { kind: 'tag', color: '#06c6ad', local: r });
    pin(i, [7.4, 0.5, -4.4], p.points[1], { kind: 'tag', color: '#3b8bff', local: r });
    pin(i, [6.6, 0.5, 6.4], p.points[2], { kind: 'tag', color: '#9ff7ea', local: r });
  }

  // ── 05 collaborate: the bond between scientist and coder ────────────────
  {
    const i = IDX.collaborate; const r = root(i);
    tube('bondL', Array.from({ length: 20 }, (_, s) => pathPoint([-2.3, 0, 0], [0, 0, 0.4], s / 19, 0.3)), 0.03, emissive('#7ff5e4', 2), r);
    tube('bondR', Array.from({ length: 20 }, (_, s) => pathPoint([0, 0, 0.4], [2.1, 0, 0], s / 19, 0.3)), 0.03, emissive('#3b8bff', 2), r);
    const spark = sphere('spark', 0.36, emissive('#ffffff', 2.4), r, [0, 0.1, 0.4]);
    glowSprite('#9ff7ea', 3.4, 0.8, spark);
    const ring = pulses(r, [0, 0.1, 0.4], '#ffffff', { count: 3, max: 4.5, period: 2.6, axis: 'z' });
    updaters.push((t, dt, w) => { ring(t, w[i]); spark.scaling.setAll(1 + Math.sin(t * 4) * 0.12); });
    const p = PILLARS[2];
    pin(i, [-3.6, 2.6, 0], 'Formulation scientists', { kind: 'tag', color: '#06c6ad', local: r });
    pin(i, [3.6, 2.2, 0], 'Coders', { kind: 'tag', color: '#3b8bff', local: r });
    pin(i, [0, 1.0, 0.4], p.points[0], { kind: 'tag', color: '#ffffff', local: r });
    pin(i, [-2.6, -2.9, 0.4], p.points[1], { kind: 'tag', color: '#9ff7ea', local: r });
    pin(i, [2.8, -2.6, 0.4], p.points[2], { kind: 'tag', color: '#9ff7ea', local: r });
  }

  // ── 06 discover: radar sweep, opportunities light up as it passes ──────
  {
    const i = IDX.discover; const r = root(i);
    const base = MeshBuilder.CreateDisc('radarBase', { radius: 8.3, tessellation: 96 }, scene);
    base.parent = r; base.rotation.x = Math.PI / 2; base.position.y = -0.03; base.material = emissive('#061440', 1, 0.55); base.isPickable = false;
    glow.addExcludedMesh(base);
    torus('radarRim', 16.6, 0.04, emissive('#06c6ad', 1.4), r);
    const sweepNode = node('sweep', r);
    const sweep = MeshBuilder.CreateDisc('sweepDisc', { radius: 8, tessellation: 48, arc: 0.12 }, scene);
    sweep.parent = sweepNode; sweep.rotation.x = Math.PI / 2; sweep.material = emissive('#06c6ad', 0.9, 0.11); sweep.isPickable = false;
    const arm = MeshBuilder.CreateBox('arm', { width: 8, height: 0.02, depth: 0.03 }, scene);
    arm.parent = sweepNode; arm.position.x = 4; arm.material = emissive('#9ff7ea', 2.2); arm.isPickable = false;
    const blipSpots = [[34, 5.6], [118, 3.4], [205, 6.6], [262, 2.4], [300, 5.0], [160, 7.2], [75, 2.0], [230, 4.2], [12, 3.0]];
    const blips = blipSpots.map(([deg, R], k) => {
      const m = sphere('blip', 0.32, emissive(k < 3 ? '#9ff7ea' : '#3b8bff', 2.4).clone(`blip${k}`), r, [Math.cos(deg * D) * R, 0.16, -Math.sin(deg * D) * R]);
      return { m, deg, lit: 0 };
    });
    updaters.push((t, dt) => {
      const a = (t * 0.9) % (Math.PI * 2);
      sweepNode.rotation.y = a;
      const sweepDeg = (a / D) % 360;
      blips.forEach((b) => {
        const diff = ((sweepDeg - b.deg) % 360 + 360) % 360;
        if (diff < 6) b.lit = 1;
        b.lit = Math.max(0, b.lit - dt * 0.45);
        b.m.scaling.setAll(0.6 + b.lit * 0.9);
        b.m.material.emissiveColor = col('#9ff7ea', 0.4 + b.lit * 2.2);
      });
    });
    PILLARS[3].points.forEach((pt, k) => pin(i, blips[k].m, pt, { kind: 'tag', color: '#9ff7ea' }));
  }

  // ── 07 grow: rings of growth climbing the helix ─────────────────────────
  {
    const i = IDX.grow; const r = root(i);
    const levels = [-3.2, 0, 3.2];
    const rings = levels.map((y, k) => torus(`grow${k}`, 4.8 + k * 0.3, 0.035, emissive(['#3b8bff', '#06c6ad', '#9ff7ea'][k], 1.8), r, [0, y, 0]));
    const crown = torus('crown', 6.4, 0.06, emissive('#ffffff', 2), r, [0, 5.9, 0]);
    glowSprite('#9ff7ea', 6, 0.5, r).position.set(0, 6, 0);
    updaters.push((t) => { rings.forEach((g, k) => { g.rotation.z = Math.sin(t * 0.6 + k) * 0.12; g.rotation.x = Math.cos(t * 0.5 + k) * 0.1; }); crown.rotation.y = t * 0.3; });
    PILLARS[4].points.forEach((pt, k) => pin(i, [2.7 + k * 0.2, levels[k], 0], pt, { kind: 'tag', color: ['#3b8bff', '#06c6ad', '#9ff7ea'][k], local: r }));
  }

  // ── 08 calendar: month gates and event beacons along the river ─────────
  {
    const i = IDX.calendar; const r = root(i);
    const months = [['OCT 2026', Date.UTC(2026, 9, 20) / 864e5], ['NOV', Date.UTC(2026, 10, 1) / 864e5], ['DEC', Date.UTC(2026, 11, 1) / 864e5], ['JAN 2027', Date.UTC(2027, 0, 1) / 864e5]];
    months.forEach(([name, day], k) => {
      const t = Math.max(0.01, dayT(Math.max(DAY0, Math.min(DAY1, day))));
      const p = riverPoint(t);
      const g = torus(`gate${k}`, 5.6, 0.035, emissive(k % 2 ? '#3b8bff' : '#06c6ad', 1.6), r, [p[0], p[1] + 0.6, p[2]]);
      g.rotation.x = Math.PI / 2;
      pin(i, [p[0], p[1] + 3.6, p[2]], name, { kind: 'month', local: r });
    });
    EVENTS.forEach((e, k) => {
      const p = riverPoint(dayT(eventDay(e)));
      const beam = MeshBuilder.CreateCylinder('beam', { height: 1.8, diameter: 0.03, tessellation: 6 }, scene);
      beam.parent = r; beam.position.set(p[0], p[1] + 1.05, p[2]); beam.material = emissive(TYPE_COLOR[e.type], 2); beam.isPickable = false;
      sphere('beacon', 0.18, emissive(TYPE_COLOR[e.type], 2.4), r, [p[0], p[1] + 2.0, p[2]]);
      void k;
    });
  }

  // ── 09 events: the ring of cards ───────────────────────────────────────
  const ring = (() => {
    const i = IDX.events; const r = root(i);
    const center = node('ringCenter', r); center.position.set(0, 0, -6);
    const spin = node('ringSpin', center);
    const n = EVENTS.length, step = (Math.PI * 2) / n, R = 5.6;
    const W = 2.0, H = W * (art.CARD.h / art.CARD.w);
    const cards = EVENTS.map((e, k) => {
      const pivot = node(`pv${k}`, spin); pivot.rotation.y = -k * step;
      const holder = node(`cd${k}`, pivot); holder.position.z = R;
      const back = MeshBuilder.CreatePlane('cardBack', { width: W + 0.06, height: H + 0.06 }, scene);
      back.parent = holder; back.position.z = -0.02; back.material = emissive(TYPE_COLOR[e.type], 0.5, 0.6); back.isPickable = false;
      const face = MeshBuilder.CreatePlane('card', { width: W, height: H, sideOrientation: 0 }, scene);
      face.parent = holder; face.material = canvasMaterial(art.drawEvent(e, assets.posters[k], k));
      face.metadata = { event: k };
      glow.addExcludedMesh(face);
      pick.events.push(face);
      return { holder, face, back, focus: 0, dim: 1 };
    });
    torus('ringFloor', R * 2 + 0.6, 0.02, emissive('#3b7bff', 1.4, 0.7), center, [0, -H / 2 - 0.3, 0]);
    glowSprite('#0253eb', 18, 0.32, center).position.set(0, 0, -1);
    const st = { angle: 0, target: 0, vel: 0, selected: 0, filter: null, dragging: false };
    updaters.push((t, dt, w, calm) => {
      if (!st.dragging) st.angle += (st.target - st.angle) * Math.min(1, dt * (calm ? 10 : 4.5));
      spin.rotation.y = st.angle;
      cards.forEach((c, k) => {
        const sel = k === st.selected ? 1 : 0;
        c.focus += (sel - c.focus) * Math.min(1, dt * 5);
        const inF = !st.filter || EVENTS[k].type === st.filter;
        c.dim += ((inF ? 1 : 0.25) - c.dim) * Math.min(1, dt * 5);
        c.holder.position.z = R + c.focus * 0.55;
        c.holder.position.y = c.focus * 0.12 + (calm ? 0 : Math.sin(t * 0.8 + k) * 0.04);
        c.holder.scaling.setAll(1 + c.focus * 0.08);
        c.face.material.alpha = c.dim;
        c.back.material.alpha = c.dim * (0.25 + c.focus * 0.6);
      });
    });
    return {
      st, step, n,
      select(k) {
        st.selected = ((k % n) + n) % n;
        const d = ((((st.selected * step - st.angle) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        st.target = st.angle + d;
      },
      filter(type) { st.filter = type; },
      drag(da) { st.dragging = true; st.angle += da; st.target = st.angle; st.vel = da * 60; },
      release() { st.dragging = false; const k = Math.round((st.angle + st.vel * 0.12) / step); st.target = k * step; st.selected = ((k % n) + n) % n; return st.selected; },
    };
  })();

  // ── 10 circles: the molecule (glass atoms with their people inside) ─────
  const molecule = (() => {
    const i = IDX.circles; const r = root(i);
    const atoms = CIRCLES.map((c, k) => {
      const pos = atomLocal(k);
      const a = node(`atom${k}`, r); a.position.set(...pos);
      const shell = MeshBuilder.CreateSphere('shell', { diameter: 1.3, segments: 32 }, scene);
      shell.parent = a; shell.material = glass(c.color, 1.2); shell.metadata = { atom: k };
      pick.atoms.push(shell);
      const disc = MeshBuilder.CreatePlane('photo', { size: 1.04 }, scene);
      disc.parent = a; disc.billboardMode = 7; disc.isPickable = false;
      disc.material = dither(assets.circleTex[k], { aspect: 1, mask: 1, blocks: 34, mid: c.color, dark: '#061038', light: '#d8fff8', imgAspect: assets.circleAspect[k] });
      glow.addExcludedMesh(disc);
      const orbit = torus('eorbit', 1.9, 0.008, emissive(c.color, 1.6, 0.6), a);
      orbit.rotation.set(1.1 + k * 0.3, k * 0.7, 0);
      glowSprite(c.color, 3.2, 0.25, a);
      pin(i, a, `${c.n} ${c.name}`, { sub: c.members.toLocaleString('en-IN'), color: c.color, kind: 'atom', atom: k });
      return { a, shell, disc, orbit, focus: 0, reveal: 0 };
    });
    for (let k = 0; k < 6; k++) {
      const A = atomLocal(k), B = atomLocal((k + 1) % 6);
      const dir = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
      const L = Math.hypot(...dir); const u = dir.map((v) => v / L);
      const a = A.map((v, j) => v + u[j] * 0.66), b = B.map((v, j) => v - u[j] * 0.66);
      tube('bond', [a, b], 0.035, emissive('#3f7bff', 1.7), r);
      if (k % 2 === 0) {
        const inward = [-(A[0] + B[0]) / 2, -(A[1] + B[1]) / 2, -(A[2] + B[2]) / 2];
        const il = Math.hypot(...inward); const o = inward.map((v) => (v / il) * 0.2);
        tube('bond2', [a.map((v, j) => v + o[j] + (b[j] - a[j]) * 0.15), b.map((v, j) => v + o[j] - (b[j] - a[j]) * 0.15)], 0.02, emissive('#06c6ad', 1.6), r);
      }
    }
    const st = { selected: 0 };
    updaters.push((t, dt, w, calm) => {
      const on = w[i] > 0.5;
      atoms.forEach((A, k) => {
        const sel = on && k === st.selected ? 1 : 0;
        A.focus += (sel - A.focus) * Math.min(1, dt * 4);
        A.reveal += (sel - A.reveal) * Math.min(1, dt * 2.4);
        A.disc.material.setReveal(A.reveal);
        A.disc.material.setOpacity(on && !sel ? 0.55 : 1);
        A.a.scaling.setAll(1 + A.focus * 0.35);
        A.orbit.rotation.y += dt * (0.4 + A.focus) * (calm ? 0.3 : 1);
      });
    });
    return { st, atomWorld: (k) => worldOf(r, atomLocal(k)) };
  })();

  // ── 11–13 stories: photo arch + the member's path as light ──────────────
  STORIES.forEach((s, si) => {
    const i = IDX[['aman', 'divya', 'karthik'][si]]; const r = root(i);
    const g = storyGraph(s.shape);
    const AW = 3.1, AH = AW * (4 / 3);
    const arch = MeshBuilder.CreatePlane('arch', { width: AW, height: AH }, scene);
    arch.parent = r; arch.position.set(0.2, 0.7, -2.4);
    arch.material = dither(assets.storyTex[si], { aspect: AW / AH, mask: 2, blocks: 54, mid: s.color, dark: '#050d36', light: '#e6fffb', imgAspect: assets.storyAspect[si] });
    arch.metadata = { story: si }; glow.addExcludedMesh(arch);
    pick.stories.push(arch);
    const frame = MeshBuilder.CreatePlane('archGlow', { width: AW + 0.5, height: AH + 0.5 }, scene);
    frame.parent = r; frame.position.set(0.2, 0.7, -2.5); frame.material = emissive(s.color, 0.6, 0.18); frame.isPickable = false;
    glow.addExcludedMesh(frame);
    const ver = MeshBuilder.CreatePlane('verified', { width: 1.0, height: 0.27 }, scene);
    ver.parent = r; ver.position.set(0.2 + AW / 2 - 0.7, 0.7 + AH / 2 - AW / 2 + 0.25, -2.36); ver.material = canvasMaterial(art.drawVerified()); ver.isPickable = false;
    glow.addExcludedMesh(ver);
    const sticker = MeshBuilder.CreatePlane('sticker', { size: 1.5 }, scene);
    const end = g.nodes[g.ends[Math.floor(g.ends.length / 2)]];
    sticker.parent = r; sticker.position.set(end[0] + 0.6, end[1] + 1.25, end[2] + 0.2); sticker.material = canvasMaterial(art.drawSticker(s.metric, s.metricLabel, s.color)); sticker.isPickable = false;
    glow.addExcludedMesh(sticker);
    const nodes = g.nodes.map((p, k) => {
      const isEnd = g.ends.includes(k);
      const m = sphere('jn', isEnd ? 0.3 : 0.24, emissive(isEnd ? '#ffffff' : s.color, 2.2), r, p);
      if (!isEnd || g.ends.length < 4) torus('jr', isEnd ? 0.8 : 0.62, 0.018, emissive(s.color, 1.8), m);
      return m;
    });
    const beat = pulses(r, g.nodes[g.ends[0]], '#ffffff', { count: 2, max: 2.6, period: 2, axis: 'z' });
    updaters.push((t, dt, w, calm) => {
      beat(t, w[i]);
      sticker.rotation.z = calm ? 0 : -t * 0.25;
      arch.material.setReveal(Math.min(1, arch.material.state.reveal + (w[i] > 0.5 ? dt * 0.45 : -dt * 2)));
      nodes.forEach((m, k) => m.scaling.setAll(1 + Math.sin(t * 2.4 + k) * 0.08));
    });
    // labels on the path
    const L = s.path;
    if (s.shape === 'fan') {
      pin(i, g.nodes[0], L[0], { kind: 'node', color: s.color, local: r });
      pin(i, g.nodes[1], L[1], { kind: 'node', color: s.color, local: r });
      pin(i, [3.0, 2.6, g.nodes[2][2]], L[2], { kind: 'node', color: '#ffffff', local: r });
    } else {
      g.nodes.forEach((p, k) => { if (L[k]) pin(i, p, L[k], { kind: 'node', color: g.ends.includes(k) ? '#ffffff' : s.color, local: r }); });
    }
  });

  // ── 14 join: the ring with a gap your size, and you ─────────────────────
  const you = (() => {
    const i = IDX.join; const r = root(i);
    torus('joinRing', RING_R * 2, 0.025, emissive('#3b8bff', 1.3, 0.55), r).rotation.x = Math.PI / 2;
    glowSprite('#0253eb', 22, 0.28, r).position.set(0, 0, -2);
    const holder = node('you', r);
    const core = sphere('youCore', 0.5, emissive('#dffcff', 2.6), holder);
    const shell = MeshBuilder.CreateSphere('youShell', { diameter: 1.1, segments: 32 }, scene);
    shell.parent = holder; shell.material = glass('#7ff5e4', 1.6); shell.isPickable = false;
    glowSprite('#06c6ad', 3.6, 0.7, holder);
    const orb = torus('youOrbit', 1.6, 0.012, emissive('#7ff5e4', 2), holder);
    const from = [YOU_LOCAL[0] + 6, YOU_LOCAL[1] - 5, YOU_LOCAL[2] + 9];
    const st = { k: 0, joined: 0 };
    updaters.push((t, dt, w) => {
      const k = smooth((w[i] - 0.2) / 0.8);
      st.k += (k - st.k) * Math.min(1, dt * 2.5);
      const e = 1 - (1 - st.k) ** 3;
      holder.position.set(from[0] + (YOU_LOCAL[0] - from[0]) * e, from[1] + (YOU_LOCAL[1] - from[1]) * e, from[2] + (YOU_LOCAL[2] - from[2]) * e);
      st.joined = Math.max(0, st.joined - dt * 0.6);
      holder.scaling.setAll((0.2 + e * 0.8) * (1 + st.joined * 0.6 + Math.sin(t * 2.6) * 0.04));
      holder.setEnabled(st.k > 0.01);
      orb.rotation.x = t * 1.2; orb.rotation.z = t * 0.7;
      core.material.emissiveColor = col('#dffcff', 2.2 + st.joined * 2);
    });
    pin(i, holder, '+ you', { kind: 'you' });
    return { pulse() { st.joined = 1; } };
  })();

  // resolve "local" anchor targets now that the station roots exist
  anchors.forEach((a) => {
    if (Array.isArray(a.target) && a.local) { a.world = worldOf(a.local, a.target); }
  });

  return {
    anchors, pick, ring, molecule, you,
    update(t, dt, w, calm) { updaters.forEach((u) => u(t, dt, w, calm)); },
    /** only the sections near the camera exist — keeps the glow layer from leaking far scenes and saves GPU */
    cull(p) {
      roots.forEach(([i, n]) => {
        const near = Math.abs(p - i) < 1.25 || (i === IDX.alone && Math.abs(p - IDX.together) < 1.25);
        if (n.isEnabled() !== near) n.setEnabled(near);
      });
    },
    anchorWorld(a, out) {
      if (a.world) return out.set(a.world.x, a.world.y, a.world.z);
      if (Array.isArray(a.target)) return out.set(...a.target);
      const p = a.target.getAbsolutePosition();
      return out.set(p.x, p.y, p.z);
    },
    Color3,
  };
}
