// The pill crew — the four SkillCures mascots, rebuilt as real 3D geometry.
//   0 cobalt capsule · 1 pink tablet · 2 amber softgel · 3 teal capsule
import * as THREE from 'three';

const INK = 0x14182e;
const WHITE = 0xd4d9ea;

const glossy = (color, extra = {}) =>
  new THREE.MeshPhysicalMaterial({
    color, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.16, ...extra,
  });

const eyeMat = new THREE.MeshPhysicalMaterial({ color: INK, roughness: 0.12, clearcoat: 1 });
const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const mouthMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.5 });
const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fae, transparent: true, opacity: 0.78, depthWrite: false });

const eyeGeo = new THREE.SphereGeometry(0.085, 20, 16);
const glintGeo = new THREE.SphereGeometry(0.026, 10, 8);
const cheekGeo = new THREE.CircleGeometry(0.08, 24);
const Z = new THREE.Vector3(0, 0, 1);

/** Place `obj` on the front surface z = surf(x, y), facing along the surface normal. */
function stick(obj, surf, x, y, lift = 0.004) {
  const e = 0.01;
  const z = surf(x, y);
  const n = new THREE.Vector3(-(surf(x + e, y) - surf(x - e, y)) / (2 * e), -(surf(x, y + e) - surf(x, y - e)) / (2 * e), 1).normalize();
  obj.position.set(x, y, z).addScaledVector(n, lift);
  obj.quaternion.setFromUnitVectors(Z, n);
  return obj;
}

function makeFace(surf, { eyeY, eyeX, mouthY, cheeks = true, wink = false, size = 1 }) {
  const face = new THREE.Group();
  const eyes = [];

  [-1, 1].forEach((side) => {
    const holder = stick(new THREE.Group(), surf, side * eyeX, eyeY);
    if (wink && side === 1) {
      const arc = Math.PI * 0.8;
      const lid = new THREE.Mesh(new THREE.TorusGeometry(0.06 * size, 0.019 * size, 8, 16, arc), mouthMat);
      lid.rotation.z = Math.PI / 2 - arc / 2;
      lid.position.y = -0.02;
      holder.add(lid);
    } else {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.scale.set(size, 1.28 * size, 0.55 * size);
      const g1 = new THREE.Mesh(glintGeo, glintMat);
      g1.position.set(0.028 * size, 0.045 * size, 0.04 * size);
      const g2 = new THREE.Mesh(glintGeo, glintMat);
      g2.scale.setScalar(0.5);
      g2.position.set(-0.03 * size, -0.03 * size, 0.045 * size);
      const lidGroup = new THREE.Group();
      lidGroup.add(eye, g1, g2);
      holder.add(lidGroup);
      eyes.push(lidGroup);
    }
    face.add(holder);
  });

  const arc = Math.PI * 0.72;
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.105 * size, 0.021 * size, 8, 20, arc), mouthMat);
  const mouth = stick(new THREE.Group(), surf, 0, mouthY, 0.002);
  smile.rotation.z = -Math.PI / 2 - arc / 2;
  smile.position.y = 0.06 * size;
  mouth.add(smile);
  face.add(mouth);

  if (cheeks) {
    [-1, 1].forEach((side) => {
      const c = stick(new THREE.Mesh(cheekGeo, cheekMat), surf, side * (eyeX + 0.17 * size), eyeY - 0.13 * size, 0.006);
      c.scale.set(1.15 * size, 0.78 * size, 1);
      face.add(c);
    });
  }
  return { face, eyes };
}

function capsule(capColor) {
  const R = 0.5, RC = 0.525, H = 0.42;
  const arcPts = (r, y0, dir, n = 18) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 0.5;
      pts.push(new THREE.Vector2(Math.max(r * Math.cos(a), 0.0001), y0 + dir * r * Math.sin(a)));
    }
    return pts;
  };
  const top = new THREE.Mesh(
    new THREE.LatheGeometry([new THREE.Vector2(R - 0.02, -0.03), new THREE.Vector2(RC, -0.03), new THREE.Vector2(RC, 0.02), ...arcPts(RC, H, 1)], 48),
    glossy(capColor, { roughness: 0.22 }),
  );
  const bottomPts = [new THREE.Vector2(R, 0.02), ...arcPts(R, -H, -1)];
  const bottom = new THREE.Mesh(new THREE.LatheGeometry(bottomPts.reverse(), 48), glossy(WHITE, { roughness: 0.42, clearcoat: 0.7 }));
  const surf = (x, y) => {
    const dy = y < -H ? y + H : 0;
    return Math.sqrt(Math.max(R * R - x * x - dy * dy, 0.0001));
  };
  const { face, eyes } = makeFace(surf, { eyeY: -0.27, eyeX: 0.17, mouthY: -0.47 });
  const g = new THREE.Group();
  g.add(top, bottom, face);
  return { mesh: g, eyes, half: 0.93 };
}

function tablet(color) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.66, 0, Math.PI * 2, false);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.11, bevelSize: 0.12, bevelSegments: 10, curveSegments: 56 });
  geo.translate(0, 0, -0.07);
  const body = new THREE.Mesh(geo, glossy(color, { roughness: 0.42, clearcoat: 0.6, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5 }));
  const score = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.026, 0.02), new THREE.MeshStandardMaterial({ color: 0xf07a9c, roughness: 0.6 }));
  score.position.set(0.02, 0.34, 0.176);
  score.rotation.z = -0.1;
  const surf = () => 0.18;
  const { face, eyes } = makeFace(surf, { eyeY: 0.0, eyeX: 0.155, mouthY: -0.2, cheeks: true, size: 1.05 });
  const g = new THREE.Group();
  g.add(body, score, face);
  return { mesh: g, eyes, half: 0.78 };
}

function softgel(color) {
  const A = 0.56, B = 0.78, C = 0.46;
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 36),
    glossy(color, { roughness: 0.12, clearcoatRoughness: 0.05, emissive: new THREE.Color(0xb85a00), emissiveIntensity: 0.22, sheen: 1, sheenColor: new THREE.Color(0xffe2a8), sheenRoughness: 0.35 }),
  );
  body.scale.set(A, B, C);
  const surf = (x, y) => C * Math.sqrt(Math.max(1 - (x * x) / (A * A) - (y * y) / (B * B), 0.0001));
  const { face, eyes } = makeFace(surf, { eyeY: 0.03, eyeX: 0.16, mouthY: -0.2, wink: true });
  const g = new THREE.Group();
  g.add(body, face);
  return { mesh: g, eyes, half: B };
}

export function createCrew() {
  const specs = [
    { name: 'cobalt', build: () => capsule(0x3f5cff) },
    { name: 'pink', build: () => tablet(0xffb4c9) },
    { name: 'amber', build: () => softgel(0xf7a233) },
    { name: 'teal', build: () => capsule(0x12c79b) },
  ];
  const group = new THREE.Group();
  const pills = specs.map((s, i) => {
    const { mesh, eyes, half } = s.build();
    const root = new THREE.Group(); // pose (owned by the rig)
    const body = new THREE.Group(); // life: bob, look, squash
    body.add(mesh);
    root.add(body);
    group.add(root);
    // Generous invisible hit target so hovering feels forgiving.
    const hit = new THREE.Mesh(new THREE.SphereGeometry(half * 1.05, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.pill = i;
    root.add(hit);
    return {
      name: s.name, root, body, eyes, half, hit,
      phase: i * 1.7 + 0.4, blinkAt: 1.5 + i * 0.9, blink: 0,
      hop: 0, hopV: 0, spin: 0, spinV: 0, look: new THREE.Vector2(), appear: 0,
    };
  });

  function poke(i) {
    const p = pills[i];
    if (!p || p.hop > 0.25) return;
    p.hopV = 4.2;
    p.spinV = (i % 2 ? -1 : 1) * 13;
  }

  function update(t, dt, pointer, calm) {
    pills.forEach((p) => {
      // blink
      if (t > p.blinkAt) { p.blink = 1; p.blinkAt = t + 2.2 + Math.random() * 3.5; }
      p.blink = Math.max(0, p.blink - dt * 7);
      const lid = 1 - Math.sin(Math.min(p.blink, 1) * Math.PI) * 0.92;
      p.eyes.forEach((e) => { e.scale.y = lid; });

      // hop spring (when poked)
      p.hopV -= 14 * dt;
      p.hop += p.hopV * dt;
      if (p.hop < 0) { p.hop = 0; p.hopV = 0; }
      p.spinV *= Math.exp(-dt * 3.2);
      p.spin += p.spinV * dt;
      if (p.hop === 0 && Math.abs(p.spinV) < 2) {
        // settle to nearest full turn
        const target = Math.round(p.spin / (Math.PI * 2)) * Math.PI * 2;
        p.spin += (target - p.spin) * Math.min(1, dt * 8);
      }

      // idle life
      const k = calm ? 0.25 : 1;
      const bob = Math.sin(t * 1.25 + p.phase) * 0.07 * k;
      const squash = 1 + Math.sin(t * 2.5 + p.phase) * 0.012 * k - Math.max(0, 0.12 - p.hop) * (p.hopV < 0 ? 0.25 : 0);
      p.body.position.y = bob + p.hop;
      p.body.scale.set(2 - squash, squash, 2 - squash).multiplyScalar(p.appear);
      p.look.x += (pointer.x * 0.38 - p.look.x) * Math.min(1, dt * 4);
      p.look.y += (-pointer.y * 0.22 - p.look.y) * Math.min(1, dt * 4);
      p.body.rotation.set(p.look.y + Math.sin(t * 0.9 + p.phase) * 0.04 * k, p.look.x + p.spin, Math.sin(t * 0.8 + p.phase * 2) * 0.05 * k);
    });
  }

  return { group, pills, update, poke, hits: pills.map((p) => p.hit) };
}
