// The world: renderer, lights, the camera rig and the frame loop.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { COLORS } from '../data.js';
import { STATIONS, N, buildLegs, camPos, focusOf, yawOf, travel, smooth, smoother } from './layout.js';
import { createCrew } from './pills.js';
import { createStations, POSES, HERO_CALLOUTS } from './stations.js';
import { drawStatement, texture as cardTexture } from './cards.js';
import { createSky, createDust, createMolecules } from './env.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const UP = new THREE.Vector3(0, 1, 0);

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch { return false; }
}

export function createWorld({ canvas, icon, calm = false, quality = 'auto' }) {
  // ── renderer ───────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  renderer.setClearColor(COLORS.bg, 1);
  const mobileMQ = window.matchMedia('(max-width: 860px)');
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COLORS.bg, 0.026);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
  scene.add(camera);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  // Lights ride with the camera, so every chapter is lit like a product shot.
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(-3.5, 5, 3);
  key.target.position.set(0, 0, -10);
  const rimA = new THREE.PointLight(COLORS.cobalt, 260, 40, 2);
  rimA.position.set(7, -1.5, -11);
  const rimB = new THREE.PointLight(COLORS.teal, 200, 40, 2);
  rimB.position.set(-8, 3.5, -12);
  camera.add(key, key.target, rimA, rimB);
  scene.add(new THREE.HemisphereLight(0x9db8ff, 0x04081a, 0.75));

  // ── content ────────────────────────────────────────────────────────────
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const sky = createSky();
  const dust = createDust(coarse ? 1100 : 1900);
  const molecules = createMolecules();
  const stations = createStations({ icon, aniso });
  const crew = createCrew();
  scene.add(sky.mesh, dust.points, molecules.group, stations.root, crew.group);

  // ── fly-through statements: one verb per leg, attached to the camera so you always fly through it ──
  const STATEMENTS = [
    ['FIND', 'your next step'],
    ['PLAN', 'we write what’s next'],
    ['INVENT', 'idea to patent office'],
    ['BELONG', 'a clearer mind, a brighter you'],
    ['ASK', 'someone who’s taken the step'],
    ['BEGIN', 'your pharma career starts here'],
  ];
  const statements = calm ? [] : STATEMENTS.map(([word, caption], k) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(17, 17 * (620 / 1800)),
      new THREE.MeshBasicMaterial({ map: cardTexture(drawStatement(word, caption, `0${k + 1}`), aniso), transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }),
    );
    m.visible = false;
    m.renderOrder = 1;
    camera.add(m);
    return m;
  });

  // ── post ───────────────────────────────────────────────────────────────
  const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: coarse ? 2 : 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.32, 0.6, 0.96);
  composer.addPass(bloom);
  const output = new OutputPass();
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0; // applied once, in the OutputPass
  composer.addPass(output);

  // ── camera rig ─────────────────────────────────────────────────────────
  const legs = buildLegs();
  const focus = STATIONS.map((_, i) => focusOf(i));
  const cams = STATIONS.map((s) => camPos(s));
  const rig = {
    target: 0,           // where scroll says we should be (0 … N-1)
    p: 0,                // where the camera actually is (smoothed)
    pos: new THREE.Vector3(), look: new THREE.Vector3(),
    yaw: 0, roll: 0, prevYaw: null,
    px: 0, py: 0,        // pointer parallax (smoothed)
    dragX: 0, dragY: 0,  // drag-to-look offsets
    dragging: false,
    intro: 0, started: false,
  };
  const pointer = new THREE.Vector2(0, 0);
  const v = new THREE.Vector3(), right = new THREE.Vector3();
  let W = 1, H = 1, aspect = 1, distK = 1, shiftMag = 0.2;

  function resize() {
    W = window.innerWidth; H = window.innerHeight; aspect = W / H;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    composer.setPixelRatio(dpr);
    composer.setSize(W, H);
    camera.aspect = aspect;
    // Narrow screens: pull the camera back so the whole scene still fits across.
    // Wide screens: the copy column is a fixed width, so work out how much of the screen is
    // actually free for the 3D subject, centre the subject in it, and pull back until it fits.
    const pad = clamp(W * 0.05, 20, 76);
    const free = 1 - (Math.min(540, W * 0.43) + pad + 56) / W - 0.01;
    shiftMag = 0.5 - free / 2;
    distK = mobileMQ.matches ? clamp(1.02 / aspect, 1, 2.3) : clamp(1 / (free * aspect), 1, 1.9);
    scene.fog.density = 0.026 / Math.pow(distK, 0.85);
    dust.mat.uniforms.uScale.value = H * 0.9;
  }

  const A = { p: new THREE.Vector3(), ry: 0, rz: 0, s: 1 };
  const B = { p: new THREE.Vector3(), ry: 0, rz: 0, s: 1 };
  function poseAt(st, k, t, out) {
    const P = POSES[st][k](t);
    out.p.set(P.p[0], P.p[1], P.p[2]).applyAxisAngle(UP, yawOf(st)).add(focus[st]);
    out.ry = yawOf(st) + (P.ry ?? 0);
    out.rz = P.rz ?? 0;
    out.s = P.s ?? 1;
  }

  function updateRig(t, dt) {
    // 1 · ease toward the scroll target
    const rate = calm ? 9 : 5.2;
    rig.p += (rig.target - rig.p) * (1 - Math.exp(-dt * rate));
    if (Math.abs(rig.target - rig.p) < 0.0004) rig.p = rig.target;
    const p = clamp(rig.p, 0, N - 1);
    const i = Math.min(Math.floor(p), N - 2);
    const f = p - i;
    const e = travel(f);

    // 2 · position along this leg's curve, look target leads a little
    legs[i].getPoint(e, rig.pos);
    rig.look.lerpVectors(focus[i], focus[i + 1], smoother(e * 1.35));

    // 3 · human touches: pointer parallax, drag-to-look, slow breathing
    const m = calm ? 0 : 1;
    rig.px += (pointer.x - rig.px) * Math.min(1, dt * 3);
    rig.py += (pointer.y - rig.py) * Math.min(1, dt * 3);
    if (!rig.dragging) { rig.dragX *= Math.exp(-dt * 3.2); rig.dragY *= Math.exp(-dt * 3.2); }
    const yawOff = -rig.px * 0.07 * m + rig.dragX + Math.sin(t * 0.21) * 0.035 * m;
    const pitchOff = rig.py * 0.045 * m + rig.dragY + Math.sin(t * 0.17 + 1) * 0.018 * m;
    v.subVectors(rig.pos, rig.look).multiplyScalar(distK);
    v.applyAxisAngle(UP, yawOff);
    right.crossVectors(UP, v).normalize();
    v.applyAxisAngle(right, pitchOff);

    // 4 · opening shot: dolly in from far away
    if (rig.started && rig.intro < 1) rig.intro = Math.min(1, rig.intro + dt / 3.1);
    const io = 1 - (1 - rig.intro) ** 4;
    v.multiplyScalar(1 + (1 - io) * 2.4);
    v.applyAxisAngle(UP, (1 - io) * -0.9);
    v.y += (1 - io) * 7;

    camera.position.copy(rig.look).add(v);
    camera.up.copy(UP);
    camera.lookAt(rig.look);

    // 5 · bank into turns
    const yaw = Math.atan2(v.x, v.z);
    if (rig.prevYaw !== null && dt > 0) {
      let dy = yaw - rig.prevYaw;
      if (dy > Math.PI) dy -= Math.PI * 2; else if (dy < -Math.PI) dy += Math.PI * 2;
      const want = rig.dragging || calm ? 0 : clamp((dy / dt) * 0.11, -0.16, 0.16);
      rig.roll += (want - rig.roll) * Math.min(1, dt * 3.5);
    }
    rig.prevYaw = yaw;
    camera.rotateZ(rig.roll);

    // 6 · lens: widen in flight, shift the subject off-centre to make room for copy
    const s0 = STATIONS[i].shift, s1 = STATIONS[i + 1].shift;
    let sx = lerp(Math.sign(s0[0]) * shiftMag, Math.sign(s1[0]) * shiftMag, e), sy = lerp(s0[1], s1[1], e);
    if (mobileMQ.matches) { sx = 0; sy = lerp(i === N - 1 ? 0.3 : 0.23, i + 1 === N - 1 ? 0.3 : 0.23, e); }
    camera.fov = 38 + (calm ? 0 : Math.sin(e * Math.PI) * 9) + (1 - io) * 8;
    camera.setViewOffset(W, H, -sx * W, sy * H, W, H);

    // 7 · the crew flies with you
    crew.pills.forEach((pill, k) => {
      const ek = travel(clamp(f + (k - 1.5) * 0.035, 0, 1));
      poseAt(i, k, t, A);
      poseAt(i + 1, k, t, B);
      const arc = Math.sin(ek * Math.PI);
      pill.root.position.lerpVectors(A.p, B.p, ek);
      pill.root.position.y += arc * (0.8 + k * 0.35);
      const twirl = calm ? 0 : (k % 2 ? -1 : 1) * Math.PI * 2 * smooth(ek);
      pill.root.rotation.set(arc * 0.35, lerp(A.ry, B.ry, ek) + twirl, lerp(A.rz, B.rz, ek) + arc * (k % 2 ? 0.5 : -0.5));
      pill.root.scale.setScalar(lerp(A.s, B.s, ek));
      // staggered drop-in during the opening shot
      const ap = clamp((rig.intro - 0.25 - k * 0.09) / 0.3, 0, 1);
      pill.appear = ap === 0 ? 0.0001 : 1 + Math.sin(ap * Math.PI) * 0.18 * (1 - ap) - (1 - ap) ** 3;
    });

    // the capsule: sealed at rest, cracks open as you leave the hero, seals again as you arrive at Join
    const introOpen = 1 - smooth((rig.intro - 0.62) / 0.3);
    const heroOpen = Math.max(introOpen, smooth((p - 0.02) / 0.16));
    const joinOpen = 1 - smooth((p - (N - 1 - 0.12)) / 0.115);
    stations.setCapsules(heroOpen, joinOpen);
    rig.heroOpen = heroOpen;

    // statements: far away → rush past the lens, mid-flight only
    statements.forEach((m, k) => {
      const s = k === i ? (f - 0.17) / 0.56 : -1;
      if (s <= 0 || s >= 1) { m.visible = false; return; }
      m.visible = true;
      const z = -(64 * (1 - s) ** 1.7 + 3.4);
      const k2 = Math.min(1, aspect / 1.45);
      m.scale.setScalar(k2);
      m.position.set((k % 2 ? 1 : -1) * (1 - s) * 5 * k2, (1 - s) * 1.2 - 0.2, z);
      m.rotation.z = rig.roll * -1.5;
      m.material.opacity = smooth(s / 0.22) * (1 - smooth((s - 0.7) / 0.3)) * 0.92;
    });

    // only draw chapters that are near
    stations.groups.forEach((g, k) => { g.visible = Math.abs(p - k) < 1.25; });
    return { p, i, e };
  }

  // ── pointer: parallax, drag-to-look, poke a pill ───────────────────────
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = -1, downAt = null;
  const pick = (ev) => {
    ndc.set((ev.clientX / W) * 2 - 1, -(ev.clientY / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(crew.hits, false)[0];
    return hit ? hit.object.userData.pill : -1;
  };
  window.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    pointer.set((ev.clientX / W) * 2 - 1, (ev.clientY / H) * 2 - 1);
    if (rig.dragging && downAt) {
      rig.dragX = clamp(downAt.dx - ((ev.clientX - downAt.x) / W) * 2.2, -0.7, 0.7);
      rig.dragY = clamp(downAt.dy + ((ev.clientY - downAt.y) / H) * 1.2, -0.35, 0.35);
    }
  }, { passive: true });
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch' || rig.dragging) return;
    const h = pick(ev);
    if (h !== hovered) { hovered = h; canvas.style.cursor = h >= 0 ? 'pointer' : 'grab'; if (h >= 0) crew.poke(h); }
  }, { passive: true });
  canvas.addEventListener('pointerdown', (ev) => {
    const h = pick(ev);
    if (h >= 0) { crew.poke(h); return; }
    if (ev.pointerType === 'touch') return;
    rig.dragging = true;
    downAt = { x: ev.clientX, y: ev.clientY, dx: rig.dragX, dy: rig.dragY };
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture?.(ev.pointerId);
  });
  const release = () => { if (rig.dragging) { rig.dragging = false; downAt = null; canvas.style.cursor = 'grab'; } };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', () => { release(); pointer.set(0, 0); });

  // ── loop ───────────────────────────────────────────────────────────────
  let last = 0, time = 0, running = false, raf = 0, onFrame = () => {};
  let slow = 0, fast = 0, tier = 0;
  function degrade() {
    // keep it smooth on weaker GPUs: drop resolution first, then bloom
    tier += 1;
    if (tier === 1) dpr = Math.min(dpr, 1.5);
    else if (tier === 2) dpr = Math.min(dpr, 1.15);
    else if (tier === 3) { bloom.enabled = false; }
    else if (tier === 4) dpr = 1;
    resize();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const raw = (now - last) / 1000;
    last = now;
    const dt = Math.min(Math.max(raw, 0), 0.05); // rAF's first timestamp can precede play()
    time += dt;
    const state = updateRig(time, dt);
    sky.mat.uniforms.uTime.value = time;
    dust.mat.uniforms.uTime.value = calm ? 0 : time;
    molecules.update(time, dt, calm);
    stations.update(time, dt, calm);
    crew.update(time, dt, pointer, calm);
    composer.render(dt);
    onFrame(state.p, time);

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

  return {
    /** Warm up shaders so the first frame doesn't hitch. */
    async warm() {
      stations.groups.forEach((g) => { g.visible = true; });
      updateRig(0, 0);
      stations.groups.forEach((g) => { g.visible = true; });
      try { await renderer.compileAsync(scene, camera); } catch { /* older drivers: compile lazily */ }
    },
    start() { rig.started = true; play(); },
    skipIntro() { rig.started = true; rig.intro = 1; },
    setTarget(p) { rig.target = clamp(p, 0, N - 1); },
    jump(p) { rig.target = rig.p = clamp(p, 0, N - 1); rig.prevYaw = null; },
    get progress() { return rig.p; },
    get introDone() { return rig.intro >= 1; },
    setRx: stations.setRx,
    /** Screen positions (px) of the hero composition call-outs + how visible they should be. */
    callouts(out) {
      const g = stations.groups[0];
      camera.updateMatrixWorld();
      HERO_CALLOUTS.forEach((c, k) => {
        const o = out[k] ?? (out[k] = {});
        // phones: the copy sits right under the capsule, so every label goes above it, in two staggered rows
        const flip = mobileMQ.matches && c.dir < 0;
        ['a', 'b'].forEach((key) => {
          v.set(c[key][0], c[key][1], c[key][2]);
          if (flip) v.y = key === 'a' ? 0.1 - c.a[1] : 0.1 - c.b[1] + 0.62;
          g.localToWorld(v).project(camera);
          o[`${key}x`] = (v.x * 0.5 + 0.5) * W;
          o[`${key}y`] = (-v.y * 0.5 + 0.5) * H;
        });
        o.dir = flip ? 1 : c.dir;
      });
      return rig.intro >= 1 ? 1 - Math.min(1, rig.heroOpen * 3) : 0;
    },
    onFrame(fn) { onFrame = fn; },
    cams,
  };
}
