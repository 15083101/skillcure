// The community as a molecule: six circles bonded in a benzene ring.
// Each atom holds its circle's people (a dithered photo), its members orbit as particles,
// messages pulse along the bonds — and at the end a seventh atom, "you", bonds on.
import * as THREE from 'three';
import { ditherMaterial, rimMaterial, MASK } from './shaders.js';
import { drawGlow } from '../../world/cards.js';

const C3 = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const Y = new THREE.Vector3(0, 1, 0);
const YOU_SIDE = -1.15; // radians from front, toward screen-left

function bond(a, b, radius, mat) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 10, 1, true), mat);
  m.scale.y = d.length();
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(Y, d.clone().normalize());
  return m;
}

export function createMolecule({ circles, textures, R = 3.25, atomR = 0.62 }) {
  const root = new THREE.Group();      // placed by the caller (around the head)
  const tilt = new THREE.Group();      // fixed tilt of the ring plane
  const spin = new THREE.Group();      // rotates around the ring's axis
  root.add(tilt);
  tilt.add(spin);
  tilt.rotation.set(0.42, 0, -0.2);

  const glowTex = new THREE.CanvasTexture(drawGlow());
  const bondMat = new THREE.MeshBasicMaterial({ color: C3('#3f7bff', 1.6), transparent: true, opacity: 0.8 });
  const bondMat2 = new THREE.MeshBasicMaterial({ color: C3('#06c6ad', 1.5), transparent: true, opacity: 0.7 });

  const atoms = circles.map((c, i) => {
    const a = (i / circles.length) * Math.PI * 2;
    const pos = new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R);
    const g = new THREE.Group();
    g.position.copy(pos);

    // the people of this circle, on a billboard disc that always faces you
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(atomR * 1.62, atomR * 1.62), ditherMaterial({ map: textures[i], aspect: 1, mask: MASK.circle, blocks: 38, mid: c.color, dark: '#061038', light: '#d8fff8' }));
    disc.renderOrder = 4;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(atomR, 40, 28), rimMaterial(c.color, 2.4, 1.5));
    shell.renderOrder = 6;
    const tintBack = new THREE.Mesh(new THREE.SphereGeometry(atomR, 32, 20), new THREE.MeshBasicMaterial({ color: C3(c.color, 0.5), transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C3(c.color, 1), transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(atomR * 4.4);
    g.add(halo, tintBack, disc, shell);

    // members: one particle per ~12 people, in two tilted electron shells
    const n = Math.round(c.members / 12);
    const pts = new Float32Array(n * 3);
    const seeds = [];
    for (let k = 0; k < n; k++) {
      const shellR = atomR * (1.35 + (k % 3) * 0.16 + Math.random() * 0.08);
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      seeds.push({ shellR, th, ph, sp: 0.3 + Math.random() * 0.5 });
      pts[k * 3] = shellR * Math.sin(ph) * Math.cos(th);
      pts[k * 3 + 1] = shellR * Math.cos(ph);
      pts[k * 3 + 2] = shellR * Math.sin(ph) * Math.sin(th);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const cloud = new THREE.Points(pg, new THREE.PointsMaterial({ color: C3(c.color, 1.4), size: 0.075, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    const orbit = new THREE.Group();
    orbit.add(cloud);
    orbit.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    g.add(orbit);
    [0.9, -0.7].forEach((tz, k) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(atomR * (1.42 + k * 0.2), 0.006, 6, 90), new THREE.MeshBasicMaterial({ color: C3(c.color, 1.3), transparent: true, opacity: 0.35 }));
      ring.rotation.set(1.2 + k, tz, 0);
      g.add(ring);
    });

    spin.add(g);
    return { i, a, pos, group: g, disc, shell, halo, orbit, color: c.color, focus: 0, reveal: 0 };
  });

  // bonds: Kekulé structure — alternate single / double
  const bonds = [];
  atoms.forEach((A, i) => {
    const B = atoms[(i + 1) % atoms.length];
    const dir = new THREE.Vector3().subVectors(B.pos, A.pos).normalize();
    const a = A.pos.clone().addScaledVector(dir, atomR * 0.9);
    const b = B.pos.clone().addScaledVector(dir, -atomR * 0.9);
    spin.add(bond(a, b, 0.03, bondMat));
    if (i % 2 === 0) {
      const inward = A.pos.clone().add(B.pos).multiplyScalar(-0.5).normalize().multiplyScalar(0.17);
      const short = 0.16;
      spin.add(bond(a.clone().add(inward).lerp(b, short), b.clone().add(inward).lerp(a, short), 0.018, bondMat2));
    }
    bonds.push([a, b]);
  });

  // messages travelling the bonds
  const pulses = Array.from({ length: 9 }, (_, k) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: C3(k % 2 ? '#06c6ad' : '#ffffff', 2.4) }));
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C3('#7fd7ff', 1.2), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    h.scale.setScalar(0.55);
    m.add(h);
    spin.add(m);
    return { m, b: (k * 2) % bonds.length, t: k / 9, dir: k % 2 ? -1 : 1, sp: 0.35 + (k % 4) * 0.08 };
  });

  // ── you: the seventh atom, bonded to circle 01 as a substituent ─────────
  const you = new THREE.Group();
  const youDir = atoms[0].pos.clone().normalize();
  const youPos = atoms[0].pos.clone().addScaledVector(youDir, 2.1);
  you.position.copy(youPos);
  const youCore = new THREE.Mesh(new THREE.SphereGeometry(atomR * 0.62, 32, 20), new THREE.MeshBasicMaterial({ color: C3('#dffcff', 1.7) }));
  const youShell = new THREE.Mesh(new THREE.SphereGeometry(atomR * 0.92, 40, 28), rimMaterial('#7ff5e4', 2.2, 1.8));
  const youHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C3('#06c6ad', 1.2), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  youHalo.scale.setScalar(3.4);
  you.add(youHalo, youCore, youShell);
  const youBondA = atoms[0].pos.clone().addScaledVector(youDir, atomR * 0.9);
  const youBondB = youPos.clone().addScaledVector(youDir, -atomR * 0.85);
  const youBond = bond(youBondA, youBondB, 0.04, new THREE.MeshBasicMaterial({ color: C3('#7ff5e4', 2.2) }));
  const youBondLen = youBond.scale.y;
  const youBondMid = youBond.position.clone();
  spin.add(you, youBond);
  const youFrom = youPos.clone().add(new THREE.Vector3(0, 6, 9));

  let angle = 0;
  const tmp = new THREE.Vector3();
  const camLocal = new THREE.Vector3();
  const inv = new THREE.Matrix4();

  /** ring angle that brings atom (or "you", i = -1) closest to the camera */
  function angleFacing(i, camera, extra = 0) {
    tilt.updateMatrixWorld();
    inv.copy(tilt.matrixWorld).invert();
    camLocal.copy(camera.position).applyMatrix4(inv);
    const psi = Math.atan2(camLocal.z, camLocal.x);
    const phi = i < 0 ? atoms[0].a : atoms[i].a;
    // rotation.y = θ maps local angle φ to φ − θ
    let target = phi - psi - extra;
    const twoPi = Math.PI * 2;
    target = angle + ((((target - angle) % twoPi) + twoPi * 1.5) % twoPi) - Math.PI;
    return target;
  }

  /**
   * @param focusW   0 … 1 how strongly to face `focusIndex` toward the camera
   * @param joinK    0 … 1 how far "you" has flown in and bonded
   */
  function update(t, dt, { camera, freeSpin = 0.1, focusW = 0, focusIndex = 0, joinK = 0, reveal = 0, calm = false }) {
    if (focusW > 0.001) {
      // "you" bonds out to the side, into free space; a chosen circle turns to face you
      const target = angleFacing(focusIndex, camera, focusIndex < 0 ? YOU_SIDE : 0);
      angle += (target - angle) * Math.min(1, dt * 3.2 * focusW);
    }
    angle += freeSpin * dt * (1 - focusW) * (calm ? 0.3 : 1);
    spin.rotation.y = angle;

    atoms.forEach((A, i) => {
      const want = focusW > 0.5 && focusIndex === i ? 1 : 0;
      A.focus += (want - A.focus) * Math.min(1, dt * 4);
      A.reveal += ((want ? 1 : reveal) - A.reveal) * Math.min(1, dt * 2.2);
      A.disc.quaternion.copy(camera.quaternion);
      A.disc.material.uniforms.uReveal.value = A.reveal;
      A.group.scale.setScalar(1 + A.focus * 0.32);
      A.halo.material.opacity = 0.22 + A.focus * 0.35;
      A.orbit.rotation.y += dt * (0.35 + A.focus * 0.6) * (calm ? 0.3 : 1);
      A.orbit.rotation.x += dt * 0.12 * (calm ? 0.3 : 1);
      // the other atoms recede a little when one is chosen
      const dim = focusW > 0.5 && focusIndex !== i ? 0.55 : 1;
      A.disc.material.uniforms.uOpacity.value += (dim - A.disc.material.uniforms.uOpacity.value) * Math.min(1, dt * 4);
    });

    pulses.forEach((p) => {
      p.t += dt * p.sp * (calm ? 0.3 : 1);
      if (p.t > 1) { p.t = 0; p.b = (p.b + 1 + (p.dir > 0 ? 0 : bonds.length - 2)) % bonds.length; }
      const [a, b] = bonds[p.b];
      p.m.position.lerpVectors(a, b, p.dir > 0 ? p.t : 1 - p.t);
    });

    // "you": fly in, then the bond draws itself
    const fly = Math.min(1, joinK / 0.6);
    const e = 1 - (1 - fly) ** 3;
    you.visible = joinK > 0.001;
    youBond.visible = joinK > 0.55;
    you.position.lerpVectors(youFrom, youPos, e);
    you.scale.setScalar(0.3 + e * 0.7 + Math.sin(t * 2.4) * 0.03 * e);
    const bk = Math.max(0, Math.min(1, (joinK - 0.55) / 0.45));
    youBond.scale.y = Math.max(0.0001, youBondLen * bk);
    youBond.position.copy(youBondA).lerp(youBondMid, bk);
    youHalo.material.opacity = 0.35 + bk * 0.4 + Math.sin(t * 3) * 0.08 * bk;
  }

  /** World positions for label pinning: six atoms + you */
  function anchors(out) {
    atoms.forEach((A, i) => { (out[i] ??= new THREE.Vector3()); A.group.getWorldPosition(out[i]); });
    (out[6] ??= new THREE.Vector3());
    you.getWorldPosition(out[6]);
    return out;
  }

  return { root, tilt, spin, atoms, update, anchors, angleFacing, R, atomR, centerWorld: (v) => tilt.getWorldPosition(v ?? tmp) };
}
