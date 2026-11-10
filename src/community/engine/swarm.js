// three.js layer: the member swarm. ~14k particles morph between formations on the GPU,
// each on its own delayed, curving flight path, so the swarm streams alongside the camera.
// Rendered on a transparent canvas above the Babylon.js world, with the same camera.
import * as THREE from 'three';
import { texture } from '../../world/cards.js';
import { drawStatement } from './art.js';

const NOISE = /* glsl */ `
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(hash3(i), f), dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                   mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
               mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                   mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
  }
  vec3 flow(vec3 p) { return vec3(noise(p), noise(p + 31.7), noise(p + 71.3)); }
`;

export function createSwarm({ canvas, formations, count, calm }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 800);
  scene.add(camera);

  const geo = new THREE.BufferGeometry();
  const attr = (name, size) => { const a = new THREE.BufferAttribute(new Float32Array(count * size), size); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, a); return a; };
  const A = { pos: attr('position', 3), col: attr('aColA', 3), size: attr('aSizeA', 1), alpha: attr('aAlphaA', 1) };
  const B = { pos: attr('aPosB', 3), col: attr('aColB', 3), size: attr('aSizeB', 1), alpha: attr('aAlphaB', 1) };
  const seed = new Float32Array(count * 4);
  for (let k = 0; k < seed.length; k++) seed[k] = Math.random();
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uMix: { value: 0 }, uTime: { value: 0 }, uScale: { value: 600 }, uFlight: { value: calm ? 0 : 1 },
      uPointer: { value: new THREE.Vector3(1e4, 0, 0) }, uPointerOn: { value: 0 }, uFog: { value: 0.00032 },
      uFade: { value: 1 }, uBoost: { value: 1.3 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aPosB, aColA, aColB;
      attribute float aSizeA, aSizeB, aAlphaA, aAlphaB;
      attribute vec4 aSeed;
      uniform float uMix, uTime, uScale, uFlight, uPointerOn, uFog, uFade, uBoost;
      uniform vec3 uPointer;
      varying vec3 vCol; varying float vA;
      ${NOISE}
      void main() {
        // each particle leaves on its own beat, so the swarm streams rather than jumps
        float d = aSeed.x * 0.42;
        float k = smoothstep(d, d + 0.58, uMix);
        vec3 p = mix(position, aPosB, k);
        float air = sin(3.14159 * k);
        // curving flight: noise field + a lift, strongest mid-flight
        vec3 f = flow(p * 0.045 + vec3(aSeed.y * 7.0, uTime * 0.08, aSeed.z * 5.0));
        p += f * air * (5.0 + aSeed.w * 9.0) * uFlight;
        p.y += air * (1.5 + aSeed.y * 5.0) * uFlight;
        // alive at rest: a slow shimmer
        p += (flow(p * 0.6 + uTime * 0.15) * 0.035) * (1.0 - air);
        // the cursor parts the swarm
        vec3 toP = p - uPointer;
        float near = exp(-dot(toP, toP) * 0.9) * uPointerOn;
        p += normalize(toP + 1e-4) * near * 0.55;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        float size = mix(aSizeA, aSizeB, k);
        gl_PointSize = clamp(size * uScale * 0.085 / max(dist, 0.1) * (1.0 + air * 0.6), 1.6, 48.0);
        vCol = mix(aColA, aColB, k) * (1.0 + near * 1.5) * uBoost;
        float a = mix(aAlphaA, aAlphaB, k);
        a *= exp(-dist * dist * uFog) * smoothstep(0.4, 2.5, dist) * uFade;
        vA = a * (0.85 + 0.15 * sin(uTime * 2.0 + aSeed.x * 40.0));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCol; varying float vA;
      void main() {
        // square "pixel" with a soft edge — the swarm reads as digital matter
        vec2 c = abs(gl_PointCoord - 0.5);
        float m = max(c.x, c.y);
        float a = vA * (1.0 - smoothstep(0.32, 0.5, m));
        if (a < 0.003) discard;
        gl_FragColor = vec4(vCol * a, a);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  let legA = -1, legB = -1;
  function load(slot, f) {
    slot.pos.array.set(f.pos); slot.col.array.set(f.col); slot.size.array.set(f.size); slot.alpha.array.set(f.alpha);
    Object.values(slot).forEach((a) => { a.needsUpdate = true; });
  }
  /** pick the two formations for this leg (only uploads when the leg changes) */
  function setLeg(i, j) {
    if (i !== legA) { load(A, formations[i]); legA = i; }
    if (j !== legB) { load(B, formations[j]); legB = j; }
  }

  // ── fly-through statements (camera-attached, additive) ─────────────────
  const statements = {};
  function addStatement(leg, word, caption, aniso) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(17, 17 * (640 / 1800)), new THREE.MeshBasicMaterial({ map: texture(drawStatement(word, caption), aniso), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    m.visible = false;
    camera.add(m);
    statements[leg] = m;
  }

  let W = 1, H = 1;
  return {
    renderer, camera, scene, points, mat,
    setLeg,
    addStatement,
    resize(w, h, dpr) {
      W = w; H = h;
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      mat.uniforms.uScale.value = h * dpr;
    },
    /** apply the shared camera (positions/target/up as arrays) */
    setCamera(pos, target, up, fov) {
      camera.position.set(pos[0], pos[1], pos[2]);
      camera.up.set(up[0], up[1], up[2]);
      camera.lookAt(target[0], target[1], target[2]);
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
      camera.updateMatrixWorld();
    },
    statementsFrame(leg, f, ndcShift, aspect) {
      Object.entries(statements).forEach(([k, m]) => {
        const s = +k === leg ? (f - 0.17) / 0.56 : -1;
        if (s <= 0 || s >= 1) { m.visible = false; return; }
        m.visible = true;
        const z = 64 * (1 - s) ** 1.7 + 3.4;
        const th = Math.tan((camera.fov * Math.PI) / 360);
        const k2 = Math.min(1, aspect / 1.45);
        m.scale.setScalar(k2);
        m.position.set(-ndcShift[0] * z * th * aspect + (+k % 2 ? 1 : -1) * (1 - s) * 2 * k2, -ndcShift[1] * z * th + (1 - s) * 1.2 - 0.2, -z);
        const e = Math.min(1, s / 0.22), out = Math.max(0, (s - 0.7) / 0.3);
        m.material.opacity = e * e * (3 - 2 * e) * (1 - out * out * (3 - 2 * out)) * 0.92;
      });
    },
    setPointer(world, on) { if (world) mat.uniforms.uPointer.value.copy(world); mat.uniforms.uPointerOn.value += ((on ? 1 : 0) - mat.uniforms.uPointerOn.value) * 0.15; },
    render(t, mix) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uMix.value = mix;
      renderer.render(scene, camera);
    },
    project(v, out) {
      out.copy(v).project(camera);
      return { x: (out.x * 0.5 + 0.5) * W, y: (-out.y * 0.5 + 0.5) * H, z: out.z };
    },
  };
}
