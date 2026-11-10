// "A clearer mind": the hero portrait rebuilt as a sculpture of ~10k dithered pixels.
// Each pixel sits at a depth set by its brightness, breathes, lifts toward the cursor,
// and disperses into the air when the camera leaves (then reassembles at the end).
import * as THREE from 'three';
import { C } from '../data.js';

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function createPortrait(image, { width = 6.2, cols = 118 } = {}) {
  const aspect = image.height / image.width;
  const rows = Math.round(cols * aspect);
  const cv = document.createElement('canvas');
  cv.width = cols; cv.height = rows;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, 0, 0, cols, rows);
  const data = g.getImageData(0, 0, cols, rows).data;
  const cell = width / cols;
  const height = rows * cell;

  const cells = [], lums = [], levels = [], rnd = [];
  let s = 11;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const a = data[i + 3] / 255;
      if (a < 0.5) continue;
      const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      // ordered dither to 4 tone levels
      const th = (BAYER4[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
      const lv = Math.min(3, Math.floor(Math.pow(l, 0.9) * 3 + th));
      cells.push((x + 0.5) * cell - width / 2, height / 2 - (y + 0.5) * cell);
      lums.push(l);
      levels.push(lv);
      rnd.push(rand(), rand(), rand());
    }
  }
  const count = levels.length;

  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index;
  geo.setAttribute('position', quad.getAttribute('position'));
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(new Float32Array(cells), 2));
  geo.setAttribute('aLum', new THREE.InstancedBufferAttribute(new Float32Array(lums), 1));
  geo.setAttribute('aLevel', new THREE.InstancedBufferAttribute(new Float32Array(levels), 1));
  geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(new Float32Array(rnd), 3));
  geo.instanceCount = count;

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 },
      uCell: { value: cell },
      uDepth: { value: 0.9 },
      uDisperse: { value: 0 },
      uPointer: { value: new THREE.Vector3(99, 99, 0) },
      uC0: { value: new THREE.Color('#0b2283') },
      uC1: { value: new THREE.Color('#1c54f0') },
      uC2: { value: new THREE.Color('#2fa8ef') },
      uC3: { value: new THREE.Color('#9ff7ea') },
    }]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      attribute vec2 aCell;
      attribute float aLum, aLevel;
      attribute vec3 aRand;
      uniform float uTime, uCell, uDepth, uDisperse;
      uniform vec3 uPointer;
      varying float vLevel, vGlow, vFade;
      void main() {
        vec3 base = vec3(aCell, (aLum - 0.5) * uDepth);
        // breathing wave travelling up the figure
        base.z += sin(uTime * 1.1 + aCell.y * 1.3 + aCell.x * 0.6) * 0.05;
        // pointer: pixels lift toward you
        float d = distance(aCell, uPointer.xy);
        float lift = exp(-d * d * 2.2) * uPointer.z;
        base.z += lift * 0.9;
        // disperse into the air, each pixel on its own path
        float k = clamp(uDisperse * (1.0 + aRand.x * 0.8) - aRand.y * 0.25, 0.0, 1.0);
        k = k * k * (3.0 - 2.0 * k);
        vec3 dir = normalize(vec3(aRand.x - 0.5 + aCell.x * 0.08, 0.35 + aRand.y, (aRand.z - 0.5) * 1.6));
        base += dir * k * (3.0 + aRand.z * 9.0);
        base.y += k * k * 2.0;
        float size = uCell * (0.84 - aLevel * 0.035) * (1.0 - k * 0.55);
        vec4 mvPosition = modelViewMatrix * vec4(base + position * size, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vLevel = aLevel;
        vGlow = lift;
        vFade = 1.0 - smoothstep(0.55, 1.0, k);
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 uC0, uC1, uC2, uC3;
      varying float vLevel, vGlow, vFade;
      void main() {
        vec3 col = vLevel < 0.5 ? uC0 : vLevel < 1.5 ? uC1 : vLevel < 2.5 ? uC2 : uC3;
        col += vec3(0.25, 0.9, 0.85) * vGlow * 0.55;
        if (vFade <= 0.01) discard;
        gl_FragColor = vec4(col, vFade);
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;

  // invisible plane for pointer picking
  const hit = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ visible: false }));

  const group = new THREE.Group();
  group.add(mesh, hit);

  // where the head is (image-relative → local), so the molecule can orbit it
  const head = new THREE.Vector3((0.42 - 0.5) * width, (0.5 - 0.26) * height, 0);
  const pointer = new THREE.Vector3(99, 99, 0);
  const pTarget = new THREE.Vector3(99, 99, 0);

  return {
    group, hit, head, width, height, count,
    setPointerLocal(x, y, on) { pTarget.set(x, y, on ? 1 : 0); },
    update(t, dt, disperse) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uDisperse.value = disperse;
      pointer.x += (pTarget.x - pointer.x) * Math.min(1, dt * 10);
      pointer.y += (pTarget.y - pointer.y) * Math.min(1, dt * 10);
      pointer.z += (pTarget.z - pointer.z) * Math.min(1, dt * 4);
      mat.uniforms.uPointer.value.copy(pointer);
      mesh.visible = disperse < 0.999;
    },
  };
}

export const PORTRAIT_COLORS = C;
