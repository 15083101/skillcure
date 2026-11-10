// The capsule — the idea the whole page hangs on: everything SkillCures offers, in one capsule.
// A big glass capsule that opens (to let the four "ingredients" out) and seals again at the end.
import * as THREE from 'three';
import { COLORS } from '../data.js';

const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);

// Cheap, good-looking glass in three layers (no transmission pass needed):
//   tint (alpha) + reflections only (additive) + a fresnel rim (additive)
function glassLayers(geo, tint, tintOpacity, rim) {
  const g = new THREE.Group();
  const back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: tintOpacity * 0.55, side: THREE.BackSide, depthWrite: false }));
  const front = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: tintOpacity, side: THREE.FrontSide, depthWrite: false }));
  const shine = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: 0x000000, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.75,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const fres = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { uColor: { value: C(rim, 1.15) }, uPower: { value: 3.4 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uPower;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
        gl_FragColor = vec4(uColor * f, f);
      }`,
  }));
  back.renderOrder = 3; front.renderOrder = 5; shine.renderOrder = 6; fres.renderOrder = 6;
  g.add(back, front, shine, fres);
  return g;
}

/**
 * @param R   radius
 * @param L   length of each half's straight section
 * Long axis is X. Half A (cobalt cap) sits on -X, half B (clear body) on +X.
 */
export function createCapsule({ R = 1.5, L = 1.25, slide = 1.75 } = {}) {
  const profile = [new THREE.Vector2(R, 0), new THREE.Vector2(R, L)];
  for (let i = 1; i <= 26; i++) {
    const a = (i / 26) * Math.PI * 0.5;
    profile.push(new THREE.Vector2(Math.max(R * Math.cos(a), 0.0001), L + R * Math.sin(a)));
  }
  const geo = new THREE.LatheGeometry(profile, 72);

  const group = new THREE.Group();
  const halves = [-1, 1].map((side) => {
    const half = new THREE.Group();
    const cap = side < 0;
    const body = glassLayers(geo, cap ? 0x1f5bff : 0x8fd8ff, cap ? 0.11 : 0.035, cap ? '#6f9bff' : '#7ff5e4');
    body.rotation.z = side < 0 ? Math.PI / 2 : -Math.PI / 2; // lathe axis (Y) → ∓X
    const seam = new THREE.Mesh(new THREE.TorusGeometry(R, 0.022, 10, 120), new THREE.MeshBasicMaterial({ color: C(cap ? COLORS.cobalt : COLORS.teal, cap ? 2.6 : 2.0) }));
    seam.rotation.y = Math.PI / 2;
    half.add(body, seam);
    group.add(half);
    return { half, side };
  });
  // a soft band where cap overlaps body, like a real two-piece capsule
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.012, R * 1.012, 0.34, 72, 1, true), new THREE.MeshBasicMaterial({ color: 0x2f6bff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  band.rotation.z = Math.PI / 2;
  band.position.x = -0.17;
  band.renderOrder = 4;
  group.add(band);

  let open = 0;
  function setOpen(k) {
    if (Math.abs(k - open) < 0.0005 && k !== 0 && k !== 1) return;
    open = k;
    halves.forEach(({ half, side }) => {
      half.position.set(side * slide * k, k * 0.35 * (side < 0 ? 1 : -1) * 0.6, 0);
      half.rotation.z = side * -0.32 * k;
      half.rotation.y = side * 0.25 * k;
    });
    band.material.opacity = 0.16 * (1 - Math.min(1, k * 4));
  }
  setOpen(0);
  return { group, setOpen, R, L };
}
