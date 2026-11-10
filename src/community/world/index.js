// Community world: renderer, layout, camera rig, statements and the frame loop.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { C, CIRCLES, EVENTS, PILLARS, STORIES } from '../data.js';
import { createSky, createDust, createMolecules } from '../../world/env.js';
import { texture as cardTexture } from '../../world/cards.js';
import { createPortrait } from './portrait.js';
import { createMolecule } from './molecule.js';
import { createPillars, pillarPose, createEventRing, EVENT_CENTER, EVENT_R, createStories, STORY_CENTER } from './scenes.js';
import { drawStatement } from './art.js';
import { loadTexture } from './shaders.js';

const D = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const smoother = (x) => { const t = clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
const HOLD = 0.1;
const travel = (f) => smoother((f - HOLD) / (1 - 2 * HOLD));
const UP = new THREE.Vector3(0, 1, 0);

export function webglAvailable() {
  try { return !!(window.WebGL2RenderingContext && document.createElement('canvas').getContext('webgl2')); } catch { return false; }
}
const loadImage = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

/** Load every image the world needs. */
export async function loadAssets(base, onProgress = () => {}) {
  const jobs = [];
  const track = (p) => { jobs.push(p); return p; };
  let done = 0;
  const tick = (p) => p.then((v) => { done += 1; onProgress(done / jobs.length); return v; });
  const portrait = tick(track(loadImage(`${base}community/hero/portrait.webp`)));
  const circleTex = CIRCLES.map((c) => tick(track(loadTexture(`${base}${c.img}`))));
  const pillarTex = PILLARS.map((p) => tick(track(loadTexture(`${base}${p.img}`))));
  const storyTex = STORIES.map((s) => tick(track(loadTexture(`${base}${s.img}`))));
  const posters = EVENTS.map((e) => (e.poster ? tick(track(loadImage(`${base}${e.poster}`))) : Promise.resolve(null)));
  return {
    portrait: await portrait,
    circleTex: await Promise.all(circleTex),
    pillarTex: await Promise.all(pillarTex),
    storyTex: await Promise.all(storyTex),
    posters: await Promise.all(posters),
  };
}

export function createWorld({ canvas, assets, calm = false, quality = 'auto' }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  renderer.setClearColor(C.bg, 1);
  const mobileMQ = window.matchMedia('(max-width: 860px)');
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(C.bg, 0.026);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
  scene.add(camera);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-3.5, 5, 3);
  key.target.position.set(0, 0, -10);
  const rimA = new THREE.PointLight(C.cobalt, 240, 40, 2); rimA.position.set(7, -1.5, -11);
  const rimB = new THREE.PointLight(C.teal, 180, 40, 2); rimB.position.set(-8, 3.5, -12);
  camera.add(key, key.target, rimA, rimB);
  scene.add(new THREE.HemisphereLight(0x9db8ff, 0x04081a, 0.75));

  // ── content ────────────────────────────────────────────────────────────
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  [...assets.circleTex, ...assets.pillarTex, ...assets.storyTex].forEach((t) => { t.anisotropy = aniso; });
  const sky = createSky();
  const dust = createDust(coarse ? 1100 : 1900);
  const molecules = createMolecules([
    [-9, 6, -6, 0.9], [9, -6, -8, 0.8], [16, 4, -12, 1.0], [22, -9, -18, 0.9], [44, 2, -30, 1.1], [26, 6, -36, 0.8],
    [18, -2, -50, 1.0], [-2, 12, -56, 1.2], [20, 14, -70, 1.0], [-6, -4, -66, 0.9], [-12, 10, -44, 1.0], [-20, -6, -26, 1.1],
    [-40, 8, -38, 0.9], [-36, -6, -22, 1.0], [-18, 4, -8, 0.8], [8, 12, -24, 1.0],
  ]);
  const portrait = createPortrait(assets.portrait);
  portrait.group.position.set(0.4, -0.6, 0);
  const molecule = createMolecule({ circles: CIRCLES, textures: assets.circleTex });
  molecule.root.position.copy(portrait.head).add(portrait.group.position).add(new THREE.Vector3(0.1, -0.15, 0));
  const pillars = createPillars(PILLARS, assets.pillarTex, aniso);
  const events = createEventRing(EVENTS, assets.posters, aniso);
  const stories = createStories(STORIES, assets.storyTex, aniso);
  scene.add(sky.mesh, dust.points, molecules.group, portrait.group, molecule.root, pillars.group, events.group, stories.group);

  // ── layout: one camera stop per chapter ────────────────────────────────
  const hub = molecule.root.position.clone();
  const P = PILLARS.map((_, k) => pillarPose(k));
  const STATIONS = [
    { F: hub.clone().add(new THREE.Vector3(0, -1.0, 0)), az: 0, el: 4, dist: 15.5, side: 1 },
    ...P.map(({ pos, yaw }) => ({ F: pos.clone().add(new THREE.Vector3(0, -0.05, 0)), az: yaw / D, el: 3, dist: 8.3, side: 1 })),
    { F: EVENT_CENTER.clone().add(new THREE.Vector3(0, 0.05, EVENT_R + 0.55)), az: -12, el: 6, dist: 8.6, side: 1 },
    { F: hub.clone(), az: 16, el: 54, dist: 12.5, side: -1 },
    { F: STORY_CENTER.clone().add(new THREE.Vector3(0, 0.15, 0.5)), az: 6, el: 3, dist: 10.2, side: 1 },
    { F: hub.clone().add(new THREE.Vector3(0, -0.8, 0)), az: -14, el: 3, dist: 16.5, side: -1 },
  ];
  const N = STATIONS.length;
  const camPos = (s, out = new THREE.Vector3()) => out.set(
    s.F.x + s.dist * Math.sin(s.az * D) * Math.cos(s.el * D),
    s.F.y + s.dist * Math.sin(s.el * D),
    s.F.z + s.dist * Math.cos(s.az * D) * Math.cos(s.el * D),
  );
  const cams = STATIONS.map((s) => camPos(s));
  const legs = [];
  for (let i = 0; i < N - 1; i++) {
    const a = cams[i], b = cams[i + 1];
    const mid = a.clone().lerp(b, 0.5);
    const len = a.distanceTo(b);
    const pillarLeg = i >= 1 && i < 5;
    const via = pillarLeg
      ? mid.add(new THREE.Vector3(0, 0.6, 1.8))
      : mid.add(new THREE.Vector3(0, len * 0.14, 0)).add(new THREE.Vector3().crossVectors(UP, b.clone().sub(a)).normalize().multiplyScalar(len * 0.12 * (i % 2 ? 1 : -1)));
    legs.push(new THREE.CatmullRomCurve3([a, via, b], false, 'catmullrom', 0.5));
  }

  // ── statements on the long legs (copy from the live page) ──────────────
  const STATEMENTS = {
    0: ['LEARN. CONNECT. CREATE.', 'grow together'],
    5: ['WHAT’S HAPPENING', 'webinars · workshops · hackathons'],
    6: ['FIND YOUR PEOPLE', 'each circle led by someone in the field'],
    7: ['REAL PEOPLE.', 'real connections · measurable outcomes'],
    8: ['ONE CONNECTION.', 'could start your next opportunity'],
  };
  const statements = {};
  if (!calm) Object.entries(STATEMENTS).forEach(([leg, [word, cap]]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(17, 17 * (640 / 1800)), new THREE.MeshBasicMaterial({ map: cardTexture(drawStatement(word, cap), aniso), transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    m.visible = false; m.renderOrder = 1;
    camera.add(m);
    statements[leg] = m;
  });

  // ── post ───────────────────────────────────────────────────────────────
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: coarse ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.34, 0.6, 0.94);
  composer.addPass(bloom);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  composer.addPass(new OutputPass());

  // ── rig ────────────────────────────────────────────────────────────────
  const rig = { target: 0, p: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), roll: 0, prevYaw: null, px: 0, py: 0, dragX: 0, dragY: 0, dragging: false, intro: 0, started: false };
  const sel = { circle: 0, event: 0, story: 0 };
  const pointer = new THREE.Vector2();
  const v = new THREE.Vector3(), right = new THREE.Vector3(), off = new THREE.Vector3(), tmp = new THREE.Vector3();
  let W = 1, H = 1, aspect = 1, distK = 1, shiftMag = 0.2;
  const weights = new Array(N).fill(0);

  function resize() {
    W = window.innerWidth; H = window.innerHeight; aspect = W / H;
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    composer.setPixelRatio(dpr); composer.setSize(W, H);
    camera.aspect = aspect;
    const pad = clamp(W * 0.05, 20, 76);
    const free = 1 - (Math.min(560, W * 0.44) + pad + 40) / W - 0.01;
    shiftMag = 0.5 - free / 2;
    distK = mobileMQ.matches ? clamp(1.0 / aspect, 1, 2.3) : clamp(1.02 / (free * aspect), 1, 1.9);
    scene.fog.density = 0.024 / Math.pow(distK, 0.85);
    dust.mat.uniforms.uScale.value = H * 0.9;
  }

  function updateRig(t, dt) {
    rig.p += (rig.target - rig.p) * (1 - Math.exp(-dt * (calm ? 9 : 5.2)));
    if (Math.abs(rig.target - rig.p) < 0.0004) rig.p = rig.target;
    const p = clamp(rig.p, 0, N - 1);
    const i = Math.min(Math.floor(p), N - 2);
    const f = p - i;
    const e = travel(f);
    for (let k = 0; k < N; k++) weights[k] = 1 - smooth((Math.abs(p - k) - 0.06) / 0.42);

    legs[i].getPoint(e, rig.pos);
    rig.look.lerpVectors(STATIONS[i].F, STATIONS[i + 1].F, smoother(e * 1.3));

    // per-chapter focus: the camera follows what you picked
    off.set(0, 0, 0);
    if (weights[7] > 0) {
      const a = molecule.anchors(anchorsTmp)[sel.circle];
      off.addScaledVector(tmp.subVectors(a, hub), 0.3 * weights[7]);
    }
    if (weights[8] > 0) off.addScaledVector(stories.focusWorld(tmp).sub(STATIONS[8].F).setY(0), 0.75 * weights[8]);
    rig.look.add(off); rig.pos.add(off);

    const m = calm ? 0 : 1;
    rig.px += (pointer.x - rig.px) * Math.min(1, dt * 3);
    rig.py += (pointer.y - rig.py) * Math.min(1, dt * 3);
    if (!rig.dragging) { rig.dragX *= Math.exp(-dt * 3.2); rig.dragY *= Math.exp(-dt * 3.2); }
    const yawOff = -rig.px * 0.06 * m + rig.dragX + Math.sin(t * 0.21) * 0.03 * m;
    const pitchOff = rig.py * 0.04 * m + rig.dragY + Math.sin(t * 0.17 + 1) * 0.015 * m;
    v.subVectors(rig.pos, rig.look).multiplyScalar(distK * (1 - weights[7] * 0.12));
    v.applyAxisAngle(UP, yawOff);
    right.crossVectors(UP, v).normalize();
    v.applyAxisAngle(right, pitchOff);

    // opening shot: rise up out of the dust toward the portrait
    if (rig.started && rig.intro < 1) rig.intro = Math.min(1, rig.intro + dt / 3.4);
    const io = 1 - (1 - rig.intro) ** 4;
    v.multiplyScalar(1 + (1 - io) * 1.6);
    v.applyAxisAngle(UP, (1 - io) * 0.7);
    v.y -= (1 - io) * 6;

    camera.position.copy(rig.look).add(v);
    camera.up.copy(UP);
    camera.lookAt(rig.look);
    const yaw = Math.atan2(v.x, v.z);
    if (rig.prevYaw !== null && dt > 0) {
      let dy = yaw - rig.prevYaw;
      if (dy > Math.PI) dy -= Math.PI * 2; else if (dy < -Math.PI) dy += Math.PI * 2;
      const want = rig.dragging || calm ? 0 : clamp((dy / dt) * 0.1, -0.14, 0.14);
      rig.roll += (want - rig.roll) * Math.min(1, dt * 3.5);
    }
    rig.prevYaw = yaw;
    camera.rotateZ(rig.roll);

    // lens: shift the subject into the free side of the screen
    let sx = lerp(STATIONS[i].side * shiftMag, STATIONS[i + 1].side * shiftMag, e);
    let sy = 0;
    if (mobileMQ.matches) { sx = 0; sy = 0.24; }
    camera.fov = 38 + (calm ? 0 : Math.sin(e * Math.PI) * 9) + (1 - io) * 6;
    camera.setViewOffset(W, H, -sx * W, sy * H, W, H);

    // statements
    Object.entries(statements).forEach(([leg, mesh]) => {
      const s = +leg === i ? (f - 0.17) / 0.56 : -1;
      if (s <= 0 || s >= 1) { mesh.visible = false; return; }
      mesh.visible = true;
      const k2 = Math.min(1, aspect / 1.45);
      mesh.scale.setScalar(k2);
      // cancel the lens shift so the statement is always centred on screen
      const z = 64 * (1 - s) ** 1.7 + 3.4;
      const th = Math.tan((camera.fov * D) / 2);
      mesh.position.set(-2 * sx * z * th * aspect + (+leg % 2 ? 1 : -1) * (1 - s) * 2 * k2, -2 * sy * z * th + (1 - s) * 1.2 - 0.2, -z);
      mesh.rotation.z = -rig.roll * 1.5;
      mesh.material.opacity = smooth(s / 0.22) * (1 - smooth((s - 0.7) / 0.3)) * 0.92;
    });

    // visibility culling of far scenes
    pillars.group.visible = p > 0.05 && p < 6.9;
    events.group.visible = p > 4.2 && p < 7.9;
    stories.group.visible = p > 6.1 && p < 9;
    return { p, i, f, e };
  }
  const anchorsTmp = [];

  // ── pointer ────────────────────────────────────────────────────────────
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downAt = null, dragMode = null, hovered = null;
  const listeners = { event: () => {}, story: () => {}, circle: () => {} };
  const near = (k) => Math.abs(rig.p - k) < 0.35;
  function cast(ev) {
    ndc.set((ev.clientX / W) * 2 - 1, -(ev.clientY / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  }
  function pick(ev) {
    cast(ev);
    if (near(6)) { const h = ray.intersectObjects(events.hits, false)[0]; if (h) return { kind: 'event', i: h.object.userData.event }; }
    if (near(8)) { const h = ray.intersectObjects(stories.hits, false)[0]; if (h) return { kind: 'story', i: h.object.userData.story }; }
    if (near(7)) {
      const a = molecule.anchors(anchorsTmp);
      let best = -1, bd = 1e9;
      for (let k = 0; k < 6; k++) { const d = ray.ray.distanceSqToPoint(a[k]); if (d < bd) { bd = d; best = k; } }
      if (bd < (molecule.atomR * 1.5) ** 2) return { kind: 'circle', i: best };
    }
    return null;
  }
  window.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'touch') pointer.set((ev.clientX / W) * 2 - 1, (ev.clientY / H) * 2 - 1);
    if (downAt && dragMode === 'ring') {
      events.state.drag(((ev.clientX - downAt.lastX) / W) * 2.4);
      downAt.lastX = ev.clientX;
      downAt.moved = Math.max(downAt.moved, Math.abs(ev.clientX - downAt.x));
    } else if (downAt && dragMode === 'look') {
      rig.dragX = clamp(downAt.dx - ((ev.clientX - downAt.x) / W) * 2.2, -0.7, 0.7);
      rig.dragY = clamp(downAt.dy + ((ev.clientY - downAt.y) / H) * 1.2, -0.35, 0.35);
    }
    // portrait: pixels lift toward the cursor
    if (ev.pointerType !== 'touch' && (near(0) || near(9))) {
      cast(ev);
      const h = ray.intersectObject(portrait.hit, false)[0];
      if (h) { const l = portrait.hit.worldToLocal(h.point.clone()); portrait.setPointerLocal(l.x, l.y, true); } else portrait.setPointerLocal(99, 99, false);
    }
  }, { passive: true });
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch' || downAt) return;
    const h = pick(ev);
    const key = h ? `${h.kind}${h.i}` : null;
    if (key !== hovered) { hovered = key; canvas.style.cursor = h ? 'pointer' : near(6) ? 'ew-resize' : 'grab'; }
  }, { passive: true });
  canvas.addEventListener('pointerdown', (ev) => {
    downAt = { x: ev.clientX, y: ev.clientY, lastX: ev.clientX, dx: rig.dragX, dy: rig.dragY, moved: 0, hit: pick(ev) };
    dragMode = near(6) ? 'ring' : ev.pointerType === 'touch' ? null : 'look';
    if (dragMode) { rig.dragging = dragMode === 'look'; canvas.setPointerCapture?.(ev.pointerId); canvas.style.cursor = 'grabbing'; }
  });
  const release = () => {
    if (!downAt) return;
    const { hit, moved } = downAt;
    if (dragMode === 'ring') {
      if (moved > 6) listeners.event(events.state.release());
      else events.state.release();
    }
    if (moved < 6 && hit) {
      if (hit.kind === 'event') { events.state.setSelected(hit.i); listeners.event(hit.i); }
      if (hit.kind === 'story') { stories.setSelected(hit.i); listeners.story(hit.i); }
      if (hit.kind === 'circle') { sel.circle = hit.i; listeners.circle(hit.i); }
    }
    downAt = null; dragMode = null; rig.dragging = false; canvas.style.cursor = 'grab';
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', () => { release(); pointer.set(0, 0); });

  // ── loop ───────────────────────────────────────────────────────────────
  let last = 0, time = 0, running = false, raf = 0, onFrame = () => {};
  let slow = 0, fast = 0, tier = 0;
  function degrade() {
    tier += 1;
    if (tier === 1) dpr = Math.min(dpr, 1.5);
    else if (tier === 2) dpr = Math.min(dpr, 1.15);
    else if (tier === 3) bloom.enabled = false;
    else if (tier === 4) dpr = 1;
    resize();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const raw = (now - last) / 1000;
    last = now;
    const dt = Math.min(Math.max(raw, 0), 0.05);
    time += dt;
    const st = updateRig(time, dt);
    const p = st.p;

    // the portrait disperses as you leave the hub and reassembles for "join"
    const intoAir = smooth((p - 0.04) / 0.5);
    const back = smooth((p - 8.35) / 0.55);
    const introGather = 1 - smooth((rig.intro - 0.15) / 0.6);
    portrait.update(time, dt, Math.max(Math.min(intoAir, 1 - back), introGather));

    molecule.update(time, dt, {
      camera,
      calm,
      freeSpin: 0.12,
      focusW: Math.max(weights[7], weights[9]),
      focusIndex: weights[9] > weights[7] ? -1 : sel.circle,
      joinK: smooth((p - 8.45) / 0.5),
      reveal: 0,
    });
    pillars.update(time, dt, weights.slice(1, 6), calm);
    events.update(time, dt, calm);
    stories.update(time, dt, weights[8], calm);

    sky.mat.uniforms.uTime.value = time;
    dust.mat.uniforms.uTime.value = calm ? 0 : time;
    molecules.update(time, dt, calm);
    composer.render(dt);
    onFrame(p, time);

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
  canvas.style.cursor = 'grab';

  const projected = [];
  return {
    N,
    async warm() {
      [pillars.group, events.group, stories.group].forEach((g) => { g.visible = true; });
      updateRig(0, 0);
      [pillars.group, events.group, stories.group].forEach((g) => { g.visible = true; });
      try { await renderer.compileAsync(scene, camera); } catch { /* compile lazily */ }
    },
    start() { rig.started = true; play(); },
    skipIntro() { rig.started = true; rig.intro = 1; },
    setTarget(p) { rig.target = clamp(p, 0, N - 1); },
    jump(p) { rig.target = rig.p = clamp(p, 0, N - 1); rig.prevYaw = null; },
    get introDone() { return rig.intro >= 1; },
    onFrame(fn) { onFrame = fn; },
    on(kind, fn) { listeners[kind] = fn; },
    selectCircle(i) { sel.circle = i; },
    selectEvent(i) { sel.event = i; events.state.setSelected(i); },
    filterEvents(type) { events.state.setFilter(type); },
    selectStory(i) { sel.story = i; stories.setSelected(i); },
    /** screen positions of the six atoms + "you", with a visibility factor each */
    atomLabels() {
      const a = molecule.anchors(anchorsTmp);
      camera.updateMatrixWorld();
      molecule.centerWorld(tmp);
      const camD = camera.position.distanceTo(tmp);
      for (let k = 0; k < 7; k++) {
        const o = projected[k] ?? (projected[k] = {});
        v.copy(a[k]).project(camera);
        o.x = (v.x * 0.5 + 0.5) * W;
        o.y = (-v.y * 0.5 + 0.5) * H;
        // atoms behind the portrait / far side of the ring fade out
        const depth = camera.position.distanceTo(a[k]) - camD;
        o.front = 1 - smooth((depth + 0.6) / 2.2);
        // label pushes outward from the ring centre on screen
        right.copy(tmp).project(camera);
        o.dx = o.x - (right.x * 0.5 + 0.5) * W;
        o.dy = o.y - (-right.y * 0.5 + 0.5) * H;
      }
      return projected;
    },
  };
}
