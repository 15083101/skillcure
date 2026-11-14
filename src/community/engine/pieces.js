// Babylon.js set pieces for the community page — the solid, lit, glowing part of each section.
// Built in each station's local frame (the same frame the swarm formations use).
import { Vector3, MeshBuilder, Color3, Quaternion } from './bjs.js';
import { col } from './stage.js';
import { STATIONS, IDX, D, mapXZ, RING_R, YOU_LOCAL, PORTAL_R, PORTAL_STEPS, pagePose, slabPose, sheetPose } from './layout.js';
import { PORTRAIT, cityCounts } from './formations.js';
import { FEATURES, ALL_EVENTS, EVENT_CITIES, FORMAT_COLOR, SESSIONS, JOURNAL, AMBASSADORS, GUIDELINES, RESUMES } from '../content.js';
import * as art from './art2.js';

const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

export function createPieces(stage, assets) {
  const { scene, glow } = stage;
  const { emissive, glass, canvasMaterial, glowSprite, node } = stage.mats;
  const anchors = [];
  const updaters = [];
  const pick = { events: [], pages: [], slabs: [], sheets: [] };

  const roots = [];
  const root = (i) => {
    const s = STATIONS[i];
    const n = node(`st${i}`);
    roots.push([i, n]);
    n.position.set(s.F[0], s.F[1], s.F[2]);
    n.rotation.y = s.az * D;
    return n;
  };
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
  const plane = (name, w, h, mat, parent) => {
    const m = MeshBuilder.CreatePlane(name, { width: w, height: h }, scene);
    m.material = mat; m.parent = parent; m.isPickable = false;
    glow.addExcludedMesh(m);
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
  /** a set of items where the chosen one lifts toward you and the rest step back */
  function selectable(items, { lift = 0.8, scale = 0.12, dimTo = 0.45, onFrame } = {}) {
    const st = { selected: 0 };
    updaters.push((t, dt, w, calm) => items.forEach((it, k) => {
      const sel = k === st.selected ? 1 : 0;
      it.focus = (it.focus ?? 0) + (sel - (it.focus ?? 0)) * Math.min(1, dt * 4.5);
      it.holder.position.set(it.base[0], it.base[1] + it.focus * 0.15 + (calm ? 0 : Math.sin(t * 0.7 + k) * 0.05), it.base[2] + it.focus * lift);
      it.holder.scaling.setAll(1 + it.focus * scale);
      const a = dimTo + (1 - dimTo) * Math.max(it.focus, 0);
      if (it.face) it.face.material.alpha = a;
      onFrame?.(it, k, t);
    }));
    return st;
  }

  // ── 00 hub: the six community features orbit the portrait's head ───────
  {
    const i = IDX.hub; const r = root(i);
    const head = [PORTRAIT.x - 0.5, 0.8, 0];
    glowSprite('#0253eb', 16, 0.35, r).position.set(head[0], 0, -3);
    const orbits = [[3.5, 64, 22, 0.42], [4.0, 52, -36, -0.32], [3.2, 76, 98, 0.5]];
    const riders = [];
    orbits.forEach(([R, tx, tz, speed], k) => {
      const o = node(`orbit${k}`, r);
      o.position.set(...head);
      o.rotation.set(tx * D, 0, tz * D);
      torus('orb', R * 2, 0.012, emissive(['#06c6ad', '#3b7bff', '#ff9fbb'][k], 1.4, 0.5), o);
      [0, 1].forEach((h) => {
        const f = FEATURES[k * 2 + h];
        const a = sphere('rider', 0.26, emissive(f.color, 2.2), o);
        glowSprite(f.color, 1.6, 0.6, a);
        riders.push({ a, R, speed, phase: h * Math.PI + k * 1.3, f });
      });
    });
    riders.forEach((rd) => pin(i, rd.a, rd.f.name, { sub: rd.f.n, color: rd.f.color, kind: 'orbit' }));
    updaters.push((t) => riders.forEach((rd) => { const a = t * rd.speed + rd.phase; rd.a.position.set(Math.cos(a) * rd.R, 0, Math.sin(a) * rd.R); }));
  }

  // ── 01 map: a beacon wherever events happen; online events float above ─
  {
    const i = IDX.map; const r = root(i);
    Object.entries(cityCounts()).forEach(([city, k]) => {
      const [x, z] = mapXZ(...EVENT_CITIES[city]);
      const h = 0.8 + k * 0.7;
      const beam = MeshBuilder.CreateCylinder('beam', { height: h, diameter: 0.06, tessellation: 8 }, scene);
      beam.parent = r; beam.position.set(x, h / 2, z); beam.material = emissive('#7ff5e4', 1.8); beam.isPickable = false;
      const headM = sphere('beacon', 0.22 + k * 0.05, emissive('#ffffff', 2.4), r, [x, h, z]);
      glowSprite('#06c6ad', 1.6 + k * 0.3, 0.6, headM);
      const ring = pulses(r, [x, 0.05, z], '#7ff5e4', { count: 2, max: 1.6 + k * 0.4, period: 2.6 });
      updaters.push((t, dt, w) => ring(t, w[i]));
      pin(i, headM, city, { sub: `${k} event${k > 1 ? 's' : ''}`, color: '#7ff5e4', kind: 'city' });
    });
    const online = ALL_EVENTS.filter((e) => !EVENT_CITIES[e.city === 'Delhi' ? 'New Delhi' : e.city]).length;
    const halo = torus('online', 5.2, 0.025, emissive('#3b8bff', 1.5, 0.6), r, [0, 5.2, -1]);
    updaters.push((t) => { halo.rotation.y = t * 0.2; });
    pin(i, [0, 5.5, -3.6], 'Online', { sub: `${online} events`, color: '#3b8bff', kind: 'city', local: r });
  }

  // ── 02 events: the ring of every listed event ───────────────────────────
  const ring = (() => {
    const i = IDX.events; const r = root(i);
    const center = node('ringCenter', r); center.position.set(0, 0, -6);
    const spin = node('ringSpin', center);
    const n = ALL_EVENTS.length, step = (Math.PI * 2) / n, R = 6.0;
    const W = 2.0, H = W * (art.ECARD.h / art.ECARD.w);
    const cards = ALL_EVENTS.map((e, k) => {
      const pivot = node(`pv${k}`, spin); pivot.rotation.y = -k * step;
      const holder = node(`cd${k}`, pivot); holder.position.z = R;
      const back = plane('cardBack', W + 0.06, H + 0.06, emissive(FORMAT_COLOR[e.type], 0.5, 0.6), holder);
      back.position.z = -0.02;
      const face = MeshBuilder.CreatePlane('card', { width: W, height: H }, scene);
      face.parent = holder; face.material = canvasMaterial(art.drawEventCard(e, assets.posters[k], k));
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
        const inF = !st.filter || ALL_EVENTS[k].type === st.filter;
        c.dim += ((inF ? 1 : 0.25) - c.dim) * Math.min(1, dt * 5);
        c.holder.position.z = R + c.focus * 0.55;
        c.holder.position.y = c.focus * 0.12 + (calm ? 0 : Math.sin(t * 0.8 + k) * 0.04);
        c.holder.scaling.setAll(1 + c.focus * 0.08);
        c.face.material.alpha = c.dim;
        c.back.material.alpha = c.dim * (0.25 + c.focus * 0.6);
      });
    });
    return {
      st, n,
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

  // ── 03 sessions: a stage, a light cone, rows of learners ────────────────
  {
    const i = IDX.sessions; const r = root(i);
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
    pin(i, [M[0], M[1] + 1.3, M[2]], 'You, on stage', { kind: 'tag', color: '#f6a53a', local: r });
    const spots = [[-7, -0.8, 1.6], [-4, 0.2, 3.6], [4, 0.2, 3.6], [7, -0.6, 1.4]];
    SESSIONS.formats.forEach(([name, time], k) => pin(i, spots[k], name, { sub: time, kind: 'tag', color: ['#3b8bff', '#06c6ad', '#ff9fbb', '#8f7bff'][k], local: r }));
  }

  // ── 04 portal: your meeting link becomes a room ─────────────────────────
  {
    const i = IDX.portal; const r = root(i);
    const ringNode = node('portal', r);
    ringNode.rotation.y = Math.PI / 2;
    const rim = torus('portalRim', PORTAL_R * 2, 0.08, emissive('#7ff5e4', 2), ringNode);
    rim.rotation.x = Math.PI / 2;
    const rim2 = torus('portalRim2', PORTAL_R * 2 + 0.5, 0.02, emissive('#3b8bff', 1.6, 0.7), ringNode);
    rim2.rotation.x = Math.PI / 2;
    glowSprite('#06c6ad', 7, 0.45, ringNode);
    const screen = plane('screen', 3.4, 3.4 * (320 / 520), canvasMaterial(art.drawSessionScreen(SESSIONS.upcoming[0])), r);
    screen.position.set(2.4, 2.6, -0.6); screen.rotation.y = -0.25;
    const chip = plane('chip', 2.5, 2.5 * (56 / 330), canvasMaterial(art.drawLinkChip()), r);
    const path = [[-10, -1.6, 0.8], [-7.2, -1.2, 0.6], [-3.8, -0.4, 0.4], [-0.6, 0, 0.1]];
    PORTAL_STEPS.forEach((p, k) => {
      const m = sphere('step', 0.28, emissive(k === 3 ? '#ffffff' : '#7ff5e4', 2.2), r, p);
      torus('stepRing', 0.7, 0.016, emissive('#7ff5e4', 1.6), m).rotation.x = Math.PI / 2;
      pin(i, m, `${String(k + 1).padStart(2, '0')} ${SESSIONS.steps[k][0]}`, { kind: 'tag', color: k === 3 ? '#ffffff' : '#7ff5e4' });
    });
    updaters.push((t, dt, w, calm) => {
      rim2.rotation.z = t * 0.5;
      const u = calm ? 0.6 : (t * 0.22) % 1;
      const f = u * (path.length - 1), k0 = Math.floor(f), e = f - k0;
      const a = path[k0], b = path[Math.min(k0 + 1, path.length - 1)];
      chip.position.set(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e + 0.6, a[2] + (b[2] - a[2]) * e);
      chip.scaling.setAll(1 - smooth((u - 0.82) / 0.18) * 0.9);
      chip.material.alpha = 1 - smooth((u - 0.85) / 0.15);
      screen.position.y = 2.6 + (calm ? 0 : Math.sin(t * 0.8) * 0.08);
    });
  }

  // ── 05 journal: six article pages fanned over the open book ─────────────
  const pages = (() => {
    const i = IDX.journal; const r = root(i);
    const W = 2.2, H = W * (art.PAGE.h / art.PAGE.w);
    const items = JOURNAL.posts.map((p, k) => {
      const pose = pagePose(k);
      const holder = node(`pg${k}`, r);
      holder.rotation.set(0, pose.rotY, pose.rotZ);
      const face = MeshBuilder.CreatePlane('page', { width: W, height: H }, scene);
      face.parent = holder; face.material = canvasMaterial(art.drawPage(p, k + 1, assets.journalImgs[k]));
      face.metadata = { page: k };
      glow.addExcludedMesh(face);
      pick.pages.push(face);
      const edge = plane('pageGlow', W + 0.3, H + 0.3, emissive(p.color, 0.5, 0.25), holder);
      edge.position.z = -0.03;
      return { holder, face, base: pose.pos };
    });
    glowSprite('#f6a53a', 14, 0.25, r).position.set(0, 0, -3);
    const st = selectable(items, { lift: 1.0, scale: 0.14, dimTo: 0.55 });
    return st;
  })();

  // ── 06 ambassadors: light beacons rise from ambassador campuses ─────────
  {
    const i = IDX.ambassadors; const r = root(i);
    const R = 6.4, K = 4200;
    const beacons = [];
    for (let k = 0; k < K; k += 175) {
      const y = 1 - (k / (K - 1)) * 2, rad = Math.sqrt(1 - y * y), th = k * Math.PI * (3 - Math.sqrt(5));
      const p = [Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R];
      const dir = new Vector3(...p).normalize();
      const beam = MeshBuilder.CreateCylinder('ambBeam', { height: 1.6, diameterTop: 0.01, diameterBottom: 0.08, tessellation: 6 }, scene);
      beam.setPivotPoint(new Vector3(0, -0.8, 0));
      beam.parent = r; beam.position.set(p[0] + dir.x * 0.8, p[1] + dir.y * 0.8, p[2] + dir.z * 0.8);
      beam.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.Up(), dir, new Quaternion());
      beam.material = emissive('#ff9fbb', 1.8, 0.85); beam.isPickable = false;
      beacons.push(beam);
    }
    const core = glowSprite('#ff9fbb', 18, 0.22, r);
    void core;
    updaters.push((t) => beacons.forEach((b, k) => { b.scaling.y = 0.6 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.6 + k)); }));
    const spots = [[-8.6, 3.4, 1], [8.4, 2.6, 1], [-8.2, -3.0, 1], [8.6, -3.4, 1]];
    AMBASSADORS.do.forEach(([name, line], k) => pin(i, spots[k], name, { sub: line.split(' ').slice(0, 4).join(' ') + '…', kind: 'tag', color: '#ff9fbb', local: r }));
  }

  // ── 07 guidelines: six monoliths, one per guideline ─────────────────────
  const slabs = (() => {
    const i = IDX.guidelines; const r = root(i);
    const W = 1.7, H = W * (art.SLAB.h / art.SLAB.w);
    const colors = ['#ff9fbb', '#8f7bff', '#06c6ad', '#3b8bff', '#f6a53a', '#7ff5e4'];
    const items = GUIDELINES.rules.map((rule, k) => {
      const pose = slabPose(k);
      const holder = node(`sl${k}`, r);
      holder.rotation.y = pose.rotY;
      const face = MeshBuilder.CreatePlane('slab', { width: W, height: H }, scene);
      face.parent = holder; face.material = canvasMaterial(art.drawSlab(rule, colors[k]));
      face.metadata = { slab: k };
      glow.addExcludedMesh(face);
      pick.slabs.push(face);
      const back = MeshBuilder.CreateBox('slabBody', { width: W + 0.04, height: H + 0.04, depth: 0.16 }, scene);
      back.parent = holder; back.position.z = -0.1; back.material = glass(colors[k], 0.9); back.isPickable = false;
      const base = torus('slabBase', 1.4, 0.02, emissive(colors[k], 1.8), holder, [0, -H / 2 - 0.15, 0]);
      base.scaling.z = 0.4;
      return { holder, face, base: [pose.pos[0], pose.pos[1] - 0.3, pose.pos[2]] };
    });
    torus('council', 9.6, 0.03, emissive('#8f7bff', 1.4, 0.6), r, [0, -1.9, 0]);
    const core = sphere('core', 0.7, emissive('#dcd4ff', 2), r, [0, 0, 0]);
    glowSprite('#8f7bff', 6, 0.5, core);
    const st = selectable(items, { lift: 0, scale: 0.1, dimTo: 0.5 });
    // the selected guideline lifts out of the circle
    updaters.push((t, dt) => items.forEach((it, k) => { it.holder.position.y = it.base[1] + (it.focus ?? 0) * 0.5; void dt; void k; }));
    return { st, worldOf: (k) => worldOf(r, slabPose(k).pos) };
  })();

  // ── 08 resumes: six sheets on a pinboard; notes pinned to the sheet ─────
  const sheets = (() => {
    const i = IDX.resumes; const r = root(i);
    const W = 2.6, H = W * (art.SHEET.h / art.SHEET.w);
    const items = RESUMES.samples.map((res, k) => {
      const pose = sheetPose(k);
      const holder = node(`rs${k}`, r);
      holder.rotation.y = pose.rotY;
      const { c, ys } = art.drawResume(res);
      const face = MeshBuilder.CreatePlane('sheet', { width: W, height: H }, scene);
      face.parent = holder; face.material = canvasMaterial(c);
      face.metadata = { sheet: k };
      glow.addExcludedMesh(face);
      pick.sheets.push(face);
      const shadow = plane('sheetShadow', W + 0.4, H + 0.4, emissive('#000000', 1, 0.0), holder);
      shadow.position.z = -0.05;
      const tagHex = ['#3b8bff', '#06c6ad', '#8f7bff', '#ff9fbb', '#f6a53a', '#7ff5e4'][k];
      const clip = sphere('pinhead', 0.16, emissive(tagHex, 2.2), holder, [0, H / 2 + 0.02, 0.06]);
      void clip;
      // numbered markers at the annotated sections
      res.notes.forEach(([sec], n) => {
        const y = ys[sec] ?? 0.2;
        const m = node(`note${k}${n}`, holder);
        m.position.set(-W / 2 - 0.12, H / 2 - y * H - 0.06, 0.02);
        pin(i, m, String(n + 1), { kind: 'num', sheet: k, color: '#06c6ad' });
      });
      return { holder, face, base: pose.pos };
    });
    const st = selectable(items, { lift: 1.4, scale: 0.16, dimTo: 0.4 });
    return st;
  })();

  // ── 09 join: the ring with a gap your size, and you ─────────────────────
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

  anchors.forEach((a) => { if (Array.isArray(a.target) && a.local) a.world = worldOf(a.local, a.target); });

  return {
    anchors, pick, ring, pages, slabs, sheets, you,
    update(t, dt, w, calm) { updaters.forEach((u) => u(t, dt, w, calm)); },
    cull(p) { roots.forEach(([i, n]) => { const near = Math.abs(p - i) < 0.95; if (n.isEnabled() !== near) n.setEnabled(near); }); },
    anchorWorld(a, out) {
      if (a.world) return out.set(a.world.x, a.world.y, a.world.z);
      if (Array.isArray(a.target)) return out.set(...a.target);
      const p = a.target.getAbsolutePosition();
      return out.set(p.x, p.y, p.z);
    },
    Color3,
  };
}
