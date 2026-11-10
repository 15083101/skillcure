// Chapter scenes: five pillars, the events ring, and the story arches.
import * as THREE from 'three';
import { texture, drawGlow } from '../../world/cards.js';
import { ditherMaterial, MASK } from './shaders.js';
import * as art from './art.js';
import { TYPE_COLOR } from '../data.js';

const C3 = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const glowTex = () => new THREE.CanvasTexture(drawGlow());

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
function slabBody(w, h, depth, r, color) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(w, h, r), { depth, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -depth - 0.015);
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
}
function facePlane(tex, w, h, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, ...opts }));
  m.renderOrder = 2;
  return m;
}

// ── Pillars ──────────────────────────────────────────────────────────────
export const PILLAR_BASE = new THREE.Vector3(32, -3, -24);
export function pillarPose(k) {
  const o = k - 2;
  return {
    pos: PILLAR_BASE.clone().add(new THREE.Vector3(o * 7.6, Math.sin(k * 1.7) * 0.25, -(Math.abs(o) ** 1.2) * 2.2)),
    yaw: -o * 0.15,
  };
}
export function createPillars(pillars, photos, aniso) {
  const group = new THREE.Group();
  const W = 2.5, H = W * (art.PILLAR.h / art.PILLAR.w);
  const items = pillars.map((p, k) => {
    const { pos, yaw } = pillarPose(k);
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = yaw;
    const body = slabBody(W, H, 0.34, 0.16, 0x0a1546);
    const face = facePlane(texture(art.drawPillar(p), aniso), W, H);
    face.position.z = 0.004;
    const pr = (art.PILLAR.photo.r / art.PILLAR.w) * W;
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(pr * 2, pr * 2), ditherMaterial({ map: photos[k], aspect: 1, mask: MASK.circle, blocks: 54, mid: p.color, dark: '#050d36', light: '#e3fffa' }));
    photo.position.set(0, H / 2 - (art.PILLAR.photo.y / art.PILLAR.h) * H, 0.012);
    photo.renderOrder = 3;
    // light spilling from behind + a plinth line on the floor
    const back = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: C3(p.color, 1), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    back.scale.set(W * 3.2, H * 1.6, 1); back.position.z = -0.9;
    const line = new THREE.Mesh(new THREE.BoxGeometry(W * 1.1, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: C3(p.color, 2) }));
    line.position.set(0, -H / 2 - 0.12, 0.2);
    g.add(back, body, face, photo, line);
    group.add(g);
    return { g, photo, back, line, face, reveal: 0, y: pos.y };
  });
  // a shared reflective floor strip
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 9), new THREE.MeshBasicMaterial({ color: C3('#0b1a5c', 1), transparent: true, opacity: 0.35, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.copy(PILLAR_BASE).add(new THREE.Vector3(0, -H / 2 - 0.15, 0));
  group.add(floor);

  function update(t, dt, weights, calm) {
    items.forEach((it, k) => {
      const w = weights[k] ?? 0;
      it.reveal += (w - it.reveal) * Math.min(1, dt * 2.6);
      it.photo.material.uniforms.uReveal.value = it.reveal;
      it.back.material.opacity = 0.14 + it.reveal * 0.3;
      // pillars you are not looking at step back into the dark
      it.face.material.opacity = 0.14 + it.reveal * 0.86;
      it.photo.material.uniforms.uOpacity.value = 0.12 + it.reveal * 0.88;
      it.g.position.y = it.y + (calm ? 0 : Math.sin(t * 0.6 + k) * 0.05) + it.reveal * 0.12;
    });
  }
  return { group, update, size: { W, H } };
}

// ── Events ring ──────────────────────────────────────────────────────────
export const EVENT_CENTER = new THREE.Vector3(8, 5, -64);
export const EVENT_R = 5.6;
export function createEventRing(events, posters, aniso) {
  const group = new THREE.Group();
  group.position.copy(EVENT_CENTER);
  const spin = new THREE.Group();
  group.add(spin);
  const n = events.length;
  const step = (Math.PI * 2) / n;
  const W = 2.0, H = W * (art.CARD.h / art.CARD.w);
  const cards = events.map((e, k) => {
    const a = k * step;
    const pivot = new THREE.Group();
    pivot.rotation.y = -a;
    const card = new THREE.Group();
    card.position.z = EVENT_R;
    const body = slabBody(W, H, 0.06, 0.13, 0x0a1546);
    const face = facePlane(texture(art.drawEvent(e, posters[k], k), aniso), W, H);
    face.position.z = 0.003;
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.5, 0.025), new THREE.MeshBasicMaterial({ color: C3(TYPE_COLOR[e.type], 2.2), transparent: true }));
    edge.position.set(0, -H / 2 - 0.12, 0);
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.event = k;
    card.add(body, face, edge, hit);
    pivot.add(card);
    spin.add(pivot);
    return { card, face, body, edge, hit, focus: 0, dim: 1 };
  });
  // a light ring on the floor + core glow
  const floorRing = new THREE.Mesh(new THREE.TorusGeometry(EVENT_R, 0.012, 6, 160), new THREE.MeshBasicMaterial({ color: C3('#3f7bff', 1.6), transparent: true, opacity: 0.6 }));
  floorRing.rotation.x = Math.PI / 2; floorRing.position.y = -H / 2 - 0.25;
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: C3('#0253eb', 1.2), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  core.scale.set(16, 9, 1);
  group.add(floorRing, core);

  let angle = 0, vel = 0, target = 0, filter = null, selected = 0, dragging = false;
  const state = {
    get selected() { return selected; },
    setSelected(k, snap = true) {
      selected = ((k % n) + n) % n;
      if (snap) {
        // shortest rotation to bring card k to the front
        let want = selected * step;
        const d = ((((want - angle) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        target = angle + d;
        want = target; void want;
      }
    },
    setFilter(type) { filter = type; },
    drag(dAngle) { dragging = true; angle += dAngle; target = angle; vel = dAngle * 60; },
    release() {
      dragging = false;
      // carry momentum, then snap to the nearest card
      const coast = angle + vel * 0.12;
      const k = Math.round(coast / step);
      target = k * step;
      selected = ((k % n) + n) % n;
      return selected;
    },
  };

  function update(t, dt, calm) {
    if (!dragging) angle += (target - angle) * Math.min(1, dt * (calm ? 10 : 4.5));
    spin.rotation.y = angle;
    cards.forEach((c, k) => {
      const isSel = k === selected;
      c.focus += ((isSel ? 1 : 0) - c.focus) * Math.min(1, dt * 5);
      const inFilter = !filter || events[k].type === filter;
      c.dim += ((inFilter ? 1 : 0.32) - c.dim) * Math.min(1, dt * 5);
      c.card.position.z = EVENT_R + c.focus * 0.55;
      c.card.position.y = c.focus * 0.12 + (calm ? 0 : Math.sin(t * 0.8 + k) * 0.04);
      c.card.scale.setScalar(1 + c.focus * 0.08);
      c.face.material.opacity = c.dim;
      c.face.material.color.setScalar(0.55 + 0.45 * Math.max(c.focus, c.dim > 0.9 ? 0.75 : 0));
      c.edge.material.opacity = 0.3 + c.focus * 0.7;
    });
  }
  return { group, update, state, hits: cards.map((c) => c.hit), step, count: n, frontWorld: () => EVENT_CENTER.clone().add(new THREE.Vector3(0, 0, EVENT_R + 0.55)) };
}

// ── Story arches ─────────────────────────────────────────────────────────
export const STORY_CENTER = new THREE.Vector3(-31, 2, -32);
export function createStories(stories, photos, aniso) {
  const group = new THREE.Group();
  group.position.copy(STORY_CENTER);
  const W = 2.5, H = W * (4 / 3);
  const verifiedTex = texture(art.drawVerified(), aniso);
  const items = stories.map((s, k) => {
    const g = new THREE.Group();
    const x = (k - 1) * 3.25;
    g.position.set(x, 0, -Math.abs(k - 1) * 0.6);
    g.rotation.y = -(k - 1) * 0.16;
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.14, H + 0.14), ditherMaterial({ map: photos[k], aspect: (W + 0.14) / (H + 0.14), mask: MASK.arch, blocks: 2, mid: s.color, dark: s.color, light: s.color }));
    frame.material.uniforms.uReveal.value = 0; frame.material.uniforms.uOpacity.value = 0.55;
    frame.position.z = -0.01;
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(W, H), ditherMaterial({ map: photos[k], aspect: W / H, mask: MASK.arch, blocks: 56, mid: s.color, dark: '#050d36', light: '#e6fffb' }));
    photo.renderOrder = 3;
    const cap = art.drawCaption(k + 1, s.caption);
    const capH = 0.24;
    const caption = facePlane(texture(cap.c, aniso), capH * cap.aspect, capH);
    caption.position.set(0, -H / 2 + 0.3, 0.02);
    const ver = facePlane(verifiedTex, 0.9, 0.24);
    ver.position.set(W / 2 - 0.62, H / 2 - W / 2 + 0.3, 0.02);
    const sticker = facePlane(texture(art.drawSticker(s.metric, s.metricLabel, s.color), aniso), 1.05, 1.05);
    sticker.position.set(-W / 2 + 0.12, -H * 0.06, 0.05);
    sticker.renderOrder = 4;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: C3(s.color, 1), transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(W * 3, H * 2, 1); glow.position.z = -0.8;
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.story = k;
    g.add(glow, frame, photo, caption, ver, sticker, hit);
    group.add(g);
    return { g, photo, sticker, glow, caption, ver, hit, x, z: g.position.z, focus: 0 };
  });
  let selected = 0;
  function update(t, dt, active, calm) {
    items.forEach((it, k) => {
      const isSel = k === selected;
      it.focus += ((isSel ? 1 : 0) - it.focus) * Math.min(1, dt * 4);
      it.photo.material.uniforms.uReveal.value += ((isSel ? active : 0) - it.photo.material.uniforms.uReveal.value) * Math.min(1, dt * 2.4);
      it.g.position.z = it.z + it.focus * 0.9;
      it.g.position.y = it.focus * 0.1 + (calm ? 0 : Math.sin(t * 0.7 + k * 2) * 0.05);
      it.g.scale.setScalar(0.9 + it.focus * 0.14);
      it.sticker.rotation.z = calm ? 0 : t * 0.25;
      it.glow.material.opacity = 0.1 + it.focus * 0.3;
      const o = 0.45 + it.focus * 0.55;
      it.photo.material.uniforms.uOpacity.value = o;
      it.caption.material.opacity = o; it.ver.material.opacity = o; it.sticker.material.opacity = o;
    });
  }
  return {
    group, update, hits: items.map((i) => i.hit),
    get selected() { return selected; },
    setSelected(k) { selected = ((k % items.length) + items.length) % items.length; },
    focusWorld(out = new THREE.Vector3()) { return out.copy(STORY_CENTER).add(new THREE.Vector3(items[selected].x, 0, items[selected].z + 0.9)); },
  };
}
