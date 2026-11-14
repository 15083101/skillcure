// Orchestrator: two engines, one world.
//   Babylon.js  → the solid world (glass, light, glow, post-processing, set pieces)
//   three.js    → the member swarm + fly-through statements, on a transparent canvas above
// Both are driven every frame by one camera rig, so they line up exactly.
import * as THREE from 'three';
import { createStage } from './stage.js';
import { createPieces } from './pieces.js';
import { createSwarm } from './swarm.js';
import { buildFormations, PORTRAIT } from './formations.js';
import { STATIONS, N, IDX, camPos, D, slabPose, pagePose, sheetPose, toWorld } from './layout.js';
import { ALL_EVENTS, JOURNAL } from '../content.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const smoother = (x) => { const t = clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
const HOLD = 0.1;
const travel = (f) => smoother((f - HOLD) / (1 - 2 * HOLD));

export function webglAvailable() {
  try { return !!(window.WebGL2RenderingContext && document.createElement('canvas').getContext('webgl2')); } catch { return false; }
}
const loadImage = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

export async function loadAssets(base, onProgress = () => {}) {
  const urls = {
    portrait: `${base}community/hero/portrait.webp`,
    journal: JOURNAL.posts.map((p) => `${base}${p.img}`),
    posters: ALL_EVENTS.map((e) => (e.poster ? `${base}${e.poster}` : null)),
  };
  const all = [...new Set([urls.portrait, ...urls.journal, ...urls.posters.filter(Boolean)])];
  let done = 0;
  const imgs = new Map();
  await Promise.all(all.map((u) => loadImage(u).then((im) => { imgs.set(u, im); onProgress(++done / all.length); })));
  return {
    urls,
    portrait: imgs.get(urls.portrait),
    journalImgs: urls.journal.map((u) => imgs.get(u)),
    posters: urls.posters.map((u) => (u ? imgs.get(u) : null)),
  };
}

export function createWorld({ babylonCanvas, threeCanvas, assets, calm = false, quality = 'auto' }) {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const mobileMQ = window.matchMedia('(max-width: 860px)');
  let dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.6 : 1.75);
  const tierStart = quality === 'low' || coarse ? 'low' : 'high';

  // ── engines ────────────────────────────────────────────────────────────
  const stage = createStage({ canvas: babylonCanvas, dpr, calm, quality: tierStart });
  const pieces = createPieces(stage, { posters: assets.posters, journalImgs: assets.journalImgs });
  const COUNT = coarse ? 8000 : 14000;
  const formations = buildFormations(COUNT, { portrait: assets.portrait });
  const swarm = createSwarm({ canvas: threeCanvas, formations, count: COUNT, calm });
  const aniso = 8;
  if (!calm) {
    swarm.addStatement(0, 'EVERY EVENT', 'from across India, in one calendar', aniso);
    swarm.addStatement(2, 'TEACH WHAT YOU KNOW', 'host a session · bring your own link', aniso);
    swarm.addStatement(4, 'FIELD NOTES', 'written by the SkillCures team', aniso);
    swarm.addStatement(5, 'YOUR CAMPUS', 'bring the community to it', aniso);
    swarm.addStatement(6, 'HOW WE BEHAVE', 'useful · respectful · safe', aniso);
    swarm.addStatement(7, 'LEARN FROM WHAT WORKED', 'resumes that got the interview', aniso);
    swarm.addStatement(8, 'ONE CONNECTION.', 'could start your next opportunity', aniso);
  }

  // ── camera rig ─────────────────────────────────────────────────────────
  const cams = STATIONS.map((s) => new THREE.Vector3(...camPos(s)));
  const focus = STATIONS.map((s) => new THREE.Vector3(...s.F));
  const UP = new THREE.Vector3(0, 1, 0);
  const legs = [];
  for (let i = 0; i < N - 1; i++) {
    const a = cams[i], b = cams[i + 1];
    const len = a.distanceTo(b);
    const same = STATIONS[i].F.join() === STATIONS[i + 1].F.join();
    const mid = a.clone().lerp(b, 0.5);
    const via = same ? mid.add(new THREE.Vector3(0, len * 0.1, 0))
      : mid.add(new THREE.Vector3(0, len * 0.16, 0)).add(new THREE.Vector3().crossVectors(UP, b.clone().sub(a)).normalize().multiplyScalar(len * 0.14 * (i % 2 ? 1 : -1)));
    legs.push(new THREE.CatmullRomCurve3([a, via, b], false, 'catmullrom', 0.5));
  }
  const rig = { target: 0, p: 0, roll: 0, prevYaw: null, px: 0, py: 0, dragX: 0, dragY: 0, dragging: false, intro: 0, started: false };
  const weights = new Array(N).fill(0);
  const pointer = new THREE.Vector2();
  const pos = new THREE.Vector3(), look = new THREE.Vector3(), v = new THREE.Vector3(), right = new THREE.Vector3(), camUp = new THREE.Vector3(), fwd = new THREE.Vector3(), off = new THREE.Vector3(), tmp = new THREE.Vector3();
  let W = 1, H = 1, aspect = 1, distK = 1, shiftMag = 0.2;
  const sel = { slab: 0 };
  const ndcShift = [0, 0];

  function resize() {
    W = window.innerWidth; H = window.innerHeight; aspect = W / H;
    stage.resize(dpr);
    swarm.resize(W, H, dpr);
    const pad = clamp(W * 0.05, 20, 76);
    const free = 1 - (Math.min(520, W * 0.42) + pad + 40) / W - 0.01;
    shiftMag = 0.5 - free / 2;
    distK = mobileMQ.matches ? clamp(1.0 / aspect, 1, 2.3) : clamp(1.05 / (free * aspect), 1, 1.9);
    // when the camera pulls back (narrow screens), thin the fog so wide scenes stay legible
    swarm.mat.uniforms.uFog.value = 0.00032 / (distK * distK);
    stage.scene.fogDensity = 0.016 / distK;
  }

  function updateRig(t, dt) {
    rig.p += (rig.target - rig.p) * (1 - Math.exp(-dt * (calm ? 9 : 4.6)));
    if (Math.abs(rig.target - rig.p) < 0.0004) rig.p = rig.target;
    const p = clamp(rig.p, 0, N - 1);
    const i = Math.min(Math.floor(p), N - 2);
    const f = p - i;
    const e = travel(f);
    for (let k = 0; k < N; k++) weights[k] = 1 - smooth((Math.abs(p - k) - 0.06) / 0.42);

    legs[i].getPoint(e, pos);
    look.lerpVectors(focus[i], focus[i + 1], smoother(e * 1.25));

    // the camera leans toward what you picked
    off.set(0, 0, 0);
    const lean = (id, local, k) => {
      if (weights[IDX[id]] <= 0) return;
      const a = toWorld(IDX[id], ...local);
      off.add(tmp.set(a[0], a[1], a[2]).sub(focus[IDX[id]]).multiplyScalar(k * weights[IDX[id]]));
    };
    lean('journal', pagePose(pieces.pages.selected).pos, 0.55);
    lean('resumes', sheetPose(pieces.sheets.selected).pos, 0.6);
    if (weights[IDX.guidelines] > 0) {
      const a = toWorld(IDX.guidelines, ...slabPose(sel.slab).pos);
      off.add(tmp.set(a[0], a[1], a[2]).sub(focus[IDX.guidelines]).multiplyScalar(0.3 * weights[IDX.guidelines]));
    }
    look.add(off); pos.add(off);

    const m = calm ? 0 : 1;
    rig.px += (pointer.x - rig.px) * Math.min(1, dt * 3);
    rig.py += (pointer.y - rig.py) * Math.min(1, dt * 3);
    if (!rig.dragging) { rig.dragX *= Math.exp(-dt * 3.2); rig.dragY *= Math.exp(-dt * 3.2); }
    v.subVectors(pos, look).multiplyScalar(distK * (1 - weights[IDX.guidelines] * 0.1));
    v.applyAxisAngle(UP, -rig.px * 0.06 * m + rig.dragX + Math.sin(t * 0.21) * 0.03 * m);
    right.crossVectors(UP, v).normalize();
    v.applyAxisAngle(right, rig.py * 0.04 * m + rig.dragY + Math.sin(t * 0.17 + 1) * 0.015 * m);

    // opening: rise out of the dust
    if (rig.started && rig.intro < 1) rig.intro = Math.min(1, rig.intro + dt / 3.6);
    const io = 1 - (1 - rig.intro) ** 4;
    v.multiplyScalar(1 + (1 - io) * 1.4);
    v.applyAxisAngle(UP, (1 - io) * 0.6);
    v.y -= (1 - io) * 5;
    pos.copy(look).add(v);

    // bank into turns
    const yaw = Math.atan2(v.x, v.z);
    if (rig.prevYaw !== null && dt > 0) {
      let dy = yaw - rig.prevYaw;
      if (dy > Math.PI) dy -= Math.PI * 2; else if (dy < -Math.PI) dy += Math.PI * 2;
      const want = rig.dragging || calm ? 0 : clamp((dy / dt) * 0.1, -0.14, 0.14);
      rig.roll += (want - rig.roll) * Math.min(1, dt * 3.5);
    }
    rig.prevYaw = yaw;

    // frame the subject on the free side of the screen: truck camera + target sideways
    const fov = 38 + (calm ? 0 : Math.sin(e * Math.PI) * 9) + (1 - io) * 6;
    let sx = lerp(STATIONS[i].side * shiftMag, STATIONS[i + 1].side * shiftMag, e);
    let sy = 0;
    if (mobileMQ.matches) { sx = 0; sy = 0.22; }
    ndcShift[0] = sx * 2; ndcShift[1] = sy * 2;
    fwd.subVectors(look, pos);
    const dist = fwd.length(); fwd.normalize();
    right.crossVectors(fwd, UP).normalize();
    camUp.crossVectors(right, fwd).normalize();
    const th = Math.tan((fov * D) / 2);
    const dx = -ndcShift[0] * dist * th * aspect, dy = -ndcShift[1] * dist * th;
    pos.addScaledVector(right, dx).addScaledVector(camUp, dy);
    look.addScaledVector(right, dx).addScaledVector(camUp, dy);
    camUp.applyAxisAngle(fwd, rig.roll);

    const P = [pos.x, pos.y, pos.z], T = [look.x, look.y, look.z], U = [camUp.x, camUp.y, camUp.z];
    stage.setCamera(P, T, U, fov);
    swarm.setCamera(P, T, U, fov);
    swarm.setLeg(i, i + 1);
    return { p, i, f, e };
  }

  // ── pointer: parallax, drag-to-look, ring drag, picking ────────────────
  let downAt = null, dragMode = null, hovered = null;
  const listeners = { event: () => {}, page: () => {}, slab: () => {}, sheet: () => {} };
  const near = (k) => Math.abs(rig.p - k) < 0.35;
  const hubPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(ev) {
    const rect = babylonCanvas.getBoundingClientRect();
    const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    let list = null, kind = null;
    if (near(IDX.events)) { list = pieces.pick.events; kind = 'event'; }
    else if (near(IDX.journal)) { list = pieces.pick.pages; kind = 'page'; }
    else if (near(IDX.guidelines)) { list = pieces.pick.slabs; kind = 'slab'; }
    else if (near(IDX.resumes)) { list = pieces.pick.sheets; kind = 'sheet'; }
    if (!list) return null;
    const res = stage.scene.pick(x, y, (m) => list.includes(m));
    if (!res?.hit) return null;
    const md = res.pickedMesh.metadata;
    return { kind, i: md[kind] ?? md.event };
  }
  window.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'touch') pointer.set((ev.clientX / W) * 2 - 1, (ev.clientY / H) * 2 - 1);
    if (downAt && dragMode === 'ring') {
      pieces.ring.drag(((ev.clientX - downAt.lastX) / W) * 2.4);
      downAt.lastX = ev.clientX; downAt.moved = Math.max(downAt.moved, Math.abs(ev.clientX - downAt.x));
    } else if (downAt && dragMode === 'look') {
      rig.dragX = clamp(downAt.dx - ((ev.clientX - downAt.x) / W) * 2.2, -0.7, 0.7);
      rig.dragY = clamp(downAt.dy + ((ev.clientY - downAt.y) / H) * 1.2, -0.35, 0.35);
      downAt.moved = Math.max(downAt.moved, Math.abs(ev.clientX - downAt.x));
    }
    // the swarm parts around the cursor
    if (ev.pointerType !== 'touch') {
      ndc.set((ev.clientX / W) * 2 - 1, -(ev.clientY / H) * 2 + 1);
      ray.setFromCamera(ndc, swarm.camera);
      const st = STATIONS[Math.round(clamp(rig.p, 0, N - 1))];
      hubPlane.normal.set(Math.sin(st.az * D), 0, Math.cos(st.az * D));
      hubPlane.constant = -hubPlane.normal.dot(tmp.set(...st.F));
      const hit = ray.ray.intersectPlane(hubPlane, tmp);
      swarm.setPointer(hit, !!hit);
    }
  }, { passive: true });
  babylonCanvas.parentElement.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch' || downAt) return;
    const h = pick(ev);
    const key = h ? `${h.kind}${h.i}` : null;
    if (key !== hovered) { hovered = key; babylonCanvas.style.cursor = h ? 'pointer' : near(IDX.events) ? 'ew-resize' : 'grab'; }
  }, { passive: true });
  babylonCanvas.addEventListener('pointerdown', (ev) => {
    downAt = { x: ev.clientX, y: ev.clientY, lastX: ev.clientX, dx: rig.dragX, dy: rig.dragY, moved: 0, hit: pick(ev) };
    dragMode = near(IDX.events) ? 'ring' : ev.pointerType === 'touch' ? null : 'look';
    if (dragMode) { rig.dragging = dragMode === 'look'; babylonCanvas.setPointerCapture?.(ev.pointerId); babylonCanvas.style.cursor = 'grabbing'; }
  });
  const release = () => {
    if (!downAt) return;
    const { hit, moved } = downAt;
    if (dragMode === 'ring') { const k = pieces.ring.release(); if (moved > 6) listeners.event(k); }
    if (moved < 6 && hit) {
      if (hit.kind === 'event') { pieces.ring.select(hit.i); listeners.event(hit.i); }
      if (hit.kind === 'page') { pieces.pages.selected = hit.i; listeners.page(hit.i); }
      if (hit.kind === 'slab') { sel.slab = hit.i; pieces.slabs.st.selected = hit.i; listeners.slab(hit.i); }
      if (hit.kind === 'sheet') { pieces.sheets.selected = hit.i; listeners.sheet(hit.i); }
    }
    downAt = null; dragMode = null; rig.dragging = false; babylonCanvas.style.cursor = 'grab';
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', () => { release(); pointer.set(0, 0); });

  // ── loop ───────────────────────────────────────────────────────────────
  let last = 0, time = 0, running = false, raf = 0, onFrame = () => {};
  let slow = 0, fast = 0, tier = tierStart === 'low' ? 1 : 0;
  if (tier) stage.setQuality(2);
  function degrade() {
    tier += 1;
    stage.setQuality(tier);
    if (tier === 2) dpr = Math.min(dpr, 1.25);
    if (tier >= 4) dpr = 1;
    resize();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const raw = (now - last) / 1000;
    last = now;
    const dt = Math.min(Math.max(raw, 0), 0.05);
    time += dt;
    const st = updateRig(time, dt);
    pieces.cull(st.p);
    pieces.update(time, dt, weights, calm);
    stage.skyMat.setFloat('uTime', time);
    stage.engine.beginFrame();
    stage.scene.render();
    stage.engine.endFrame();
    swarm.mat.uniforms.uFade.value = Math.min(1, rig.intro * 1.6 + 0.05);
    swarm.statementsFrame(st.i, st.f, ndcShift, aspect);
    swarm.render(time, st.e);
    onFrame(st.p, time);
    if (quality === 'auto' && rig.intro >= 1 && tier < 4) {
      if (raw > 1 / 28) slow += 1; else fast += 1;
      if (slow + fast >= 70) { if (slow > 45) degrade(); slow = 0; fast = 0; }
    }
  }
  function play() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function pause() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  window.addEventListener('resize', resize);
  mobileMQ.addEventListener?.('change', resize);
  resize();
  babylonCanvas.style.cursor = 'grab';

  const proj = new THREE.Vector3(), wp = new THREE.Vector3();
  return {
    N,
    async warm() {
      updateRig(0, 0);
      await stage.scene.whenReadyAsync().catch(() => {});
      swarm.renderer.compile(swarm.scene, swarm.camera);
    },
    start() { rig.started = true; play(); },
    skipIntro() { rig.started = true; rig.intro = 1; },
    setTarget(p) { rig.target = clamp(p, 0, N - 1); },
    jump(p) { rig.target = rig.p = clamp(p, 0, N - 1); rig.prevYaw = null; },
    get introDone() { return rig.intro >= 1; },
    get weights() { return weights; },
    onFrame(fn) { onFrame = fn; },
    on(kind, fn) { listeners[kind] = fn; },
    selectPage(k) { pieces.pages.selected = k; },
    selectSlab(k) { sel.slab = k; pieces.slabs.st.selected = k; },
    selectSheet(k) { pieces.sheets.selected = k; },
    selectEvent(k) { pieces.ring.select(k); },
    filterEvents(type) { pieces.ring.filter(type); },
    joined() { pieces.you.pulse(); },
    anchors: pieces.anchors,
    /** project an anchor to screen; returns {x, y, behind} */
    projectAnchor(a) {
      pieces.anchorWorld(a, wp);
      const s = swarm.project(wp, proj);
      return { x: s.x, y: s.y, behind: s.z > 1 };
    },
    stationIndex: IDX,
    portrait: PORTRAIT,
  };
}
