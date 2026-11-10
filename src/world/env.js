// Atmosphere: a deep-navy sky with brand-coloured light, drifting dust and floating molecules.
import * as THREE from 'three';
import { COLORS } from '../data.js';
import { drawGlow } from './cards.js';

export function createSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uBase: { value: new THREE.Color(COLORS.bg) },
      uA: { value: new THREE.Color(COLORS.cobalt) },
      uB: { value: new THREE.Color(COLORS.deepteal) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform float uTime;
      uniform vec3 uBase, uA, uB;
      float blob(vec3 d, vec3 c, float sharp) { return pow(max(dot(d, normalize(c)), 0.0), sharp); }
      void main() {
        vec3 d = normalize(vDir);
        float t = uTime * 0.03;
        vec3 col = uBase * 0.9;
        col += uA * 0.26 * blob(d, vec3(cos(t) * 0.9, -0.25, -1.0), 3.0);
        col += uB * 0.2 * blob(d, vec3(-1.0, 0.55 + sin(t) * 0.2, 0.3), 4.0);
        col += uA * 0.17 * blob(d, vec3(0.8, 0.9, 0.4), 5.0);
        col += uB * 0.12 * blob(d, vec3(0.2, -1.0, 0.2), 3.0);
        // faint horizon band + grain to avoid banding
        col += uA * 0.05 * exp(-abs(d.y) * 6.0);
        float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        col += (n - 0.5) * 0.012;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return { mesh, mat };
}

export function createDust(count = 1800) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  const pal = [new THREE.Color('#7ea2ff'), new THREE.Color(COLORS.teal), new THREE.Color('#ffffff'), new THREE.Color('#4a78ff')];
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < count; i++) {
    pos[i * 3] = -45 + rnd() * 100;
    pos[i * 3 + 1] = -32 + rnd() * 84;
    pos[i * 3 + 2] = -85 + rnd() * 115;
    const c = pal[Math.floor(rnd() * pal.length)];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    size[i] = rnd() < 0.06 ? 0.5 + rnd() * 0.5 : 0.08 + rnd() * 0.2;
    seed[i] = rnd() * 6.283;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uMap: { value: new THREE.CanvasTexture(drawGlow()) }, uScale: { value: 600 } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aSeed; attribute vec3 color;
      uniform float uTime, uScale;
      varying vec3 vCol; varying float vA;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.25 + aSeed) * 0.6;
        p.x += cos(uTime * 0.2 + aSeed * 1.7) * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        gl_PointSize = aSize * uScale / max(d, 0.1);
        // fade far (fog) and very near (so nothing pops in front of the lens)
        vA = smoothstep(0.6, 3.5, d) * exp(-d * d * 0.0007) * (0.55 + 0.45 * sin(uTime * 1.3 + aSeed * 3.0));
        vCol = color;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; varying vec3 vCol; varying float vA;
      void main() { float a = texture2D(uMap, gl_PointCoord).a * vA; gl_FragColor = vec4(vCol * a, a); }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, mat };
}

/** Ball-and-stick ring molecules scattered along the flight path. */
export function createMolecules(customSpots) {
  const group = new THREE.Group();
  const atomGeo = new THREE.SphereGeometry(0.16, 16, 12);
  const bondGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 8);
  const mats = [COLORS.cobalt, COLORS.teal, '#b9c8ff'].map((c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 1, emissive: new THREE.Color(c).multiplyScalar(0.25) }));
  const bondMat = new THREE.MeshStandardMaterial({ color: 0x9fb4f5, roughness: 0.5, transparent: true, opacity: 0.75 });
  const up = new THREE.Vector3(0, 1, 0);
  const bond = (a, b) => {
    const m = new THREE.Mesh(bondGeo, bondMat);
    const d = new THREE.Vector3().subVectors(b, a);
    m.scale.y = d.length();
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(up, d.normalize());
    return m;
  };
  const spots = customSpots ?? [
    [-10, 7, -9, 1.0], [7.5, -3.5, -6, 0.8], [9, 6, 2, 0.7], [24, -4, -8, 1.1], [5, -9, -4, 0.9], [22, -17, -16, 1.0],
    [2, -8, -20, 1.2], [-20, 4, -22, 0.9], [-4, -9, -34, 1.1], [-16, 12, -42, 1.0], [6, 14, -50, 1.3], [8, 2, -44, 0.8],
    [28, 18, -52, 1.1], [10, 20, -36, 0.9], [-6, 26, -34, 1.2], [14, 36, -36, 1.0], [-8, 34, -24, 0.8], [26, 4, -30, 1.0],
  ];
  const items = spots.map(([x, y, z, sc], k) => {
    const mol = new THREE.Group();
    const ring = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ring.push(new THREE.Vector3(Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0)); }
    ring.forEach((p, i) => {
      const atom = new THREE.Mesh(atomGeo, mats[(i + k) % 2 === 0 ? 0 : 1]);
      atom.position.copy(p);
      mol.add(atom, bond(p, ring[(i + 1) % 6]));
    });
    // two substituents
    [k % 6, (k + 3) % 6].forEach((i, n) => {
      const out = ring[i].clone().multiplyScalar(1.75).setZ(n ? 0.3 : -0.3);
      const atom = new THREE.Mesh(atomGeo, mats[2]);
      atom.position.copy(out); atom.scale.setScalar(0.8);
      mol.add(atom, bond(ring[i], out));
    });
    mol.position.set(x, y, z);
    mol.scale.setScalar(sc);
    mol.rotation.set(k * 1.1, k * 0.7, k * 0.3);
    group.add(mol);
    return { mol, sx: 0.07 + (k % 4) * 0.025, sy: 0.05 + (k % 3) * 0.03, y, ph: k * 1.9 };
  });
  function update(t, dt, calm) {
    const k = calm ? 0.25 : 1;
    items.forEach((m) => {
      m.mol.rotation.x += m.sx * dt * k;
      m.mol.rotation.y += m.sy * dt * k;
      m.mol.position.y = m.y + Math.sin(t * 0.3 + m.ph) * 0.5 * k;
    });
  }
  return { group, update };
}
