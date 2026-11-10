// Ethiack-style image treatment: photos render as a pixel-dithered duotone in brand colours,
// and "resolve" block by block into full colour when they become the focus.
import * as THREE from 'three';

const BAYER = /* glsl */ `
  float bayer4(vec2 p) {
    vec2 q = mod(floor(p), 4.0);
    float i = q.x + q.y * 4.0;
    // 4x4 ordered-dither matrix, row-major
    if (i < 0.5) return 0.0;   if (i < 1.5) return 8.0;   if (i < 2.5) return 2.0;   if (i < 3.5) return 10.0;
    if (i < 4.5) return 12.0;  if (i < 5.5) return 4.0;   if (i < 6.5) return 14.0;  if (i < 7.5) return 6.0;
    if (i < 8.5) return 3.0;   if (i < 9.5) return 11.0;  if (i < 10.5) return 1.0;  if (i < 11.5) return 9.0;
    if (i < 12.5) return 15.0; if (i < 13.5) return 7.0;  if (i < 14.5) return 13.0; return 5.0;
  }
  float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

export const MASK = { rect: 0, circle: 1, arch: 2 };

/**
 * @param map      texture (sRGB)
 * @param aspect   plane width / height
 * @param mask     MASK.rect | circle | arch
 * @param blocks   number of pixel blocks across the width
 */
export function ditherMaterial({ map, aspect = 1, mask = MASK.rect, radius = 0.06, blocks = 64, dark = '#06123f', mid = '#1d4fe0', light = '#7cf3e2', tint = '#ffffff' }) {
  const img = map.image;
  const ia = img ? img.width / img.height : 1;
  // cover-fit the photo inside the plane
  const sx = ia > aspect ? aspect / ia : 1;
  const sy = ia > aspect ? 1 : ia / aspect;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      map: { value: null },
      uUvT: { value: new THREE.Vector4(sx, sy, (1 - sx) / 2, (1 - sy) / 2) },
      uReveal: { value: 0 },
      uOpacity: { value: 1 },
      uBlocks: { value: blocks },
      uAspect: { value: aspect },
      uMask: { value: mask },
      uRadius: { value: radius },
      uTime: { value: 0 },
      uDark: { value: new THREE.Color(dark) },
      uMid: { value: new THREE.Color(mid) },
      uLight: { value: new THREE.Color(light) },
      uTint: { value: new THREE.Color(tint) },
    }]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform sampler2D map;
      uniform vec4 uUvT;
      uniform float uReveal, uOpacity, uBlocks, uAspect, uRadius, uTime;
      uniform int uMask;
      uniform vec3 uDark, uMid, uLight, uTint;
      varying vec2 vUv;
      ${BAYER}
      float roundedBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      void main() {
        // shape mask, in plane units (width = aspect, height = 1)
        vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
        float d;
        if (uMask == 1) d = length(p) - 0.5 * min(uAspect, 1.0);
        else if (uMask == 2) {
          float r = 0.5 * uAspect;
          float cy = 0.5 - r;
          d = p.y > cy ? length(p - vec2(0.0, cy)) - r : roundedBox(p, vec2(0.5 * uAspect, 0.5), 0.035);
        } else d = roundedBox(p, vec2(0.5 * uAspect, 0.5), uRadius);
        float aa = fwidth(d) * 1.2;
        float shape = 1.0 - smoothstep(-aa, aa, d);
        if (shape <= 0.001) discard;

        vec2 tuv = vUv * uUvT.xy + uUvT.zw;
        vec2 grid = vec2(uBlocks, uBlocks / uAspect);
        vec2 cell = floor(vUv * grid);
        vec2 puv = ((cell + 0.5) / grid) * uUvT.xy + uUvT.zw;

        vec3 full = texture2D(map, tuv).rgb * uTint;
        vec3 px = texture2D(map, puv).rgb;
        float l = pow(dot(px, vec3(0.299, 0.587, 0.114)), 0.8);
        float th = (bayer4(cell) + 0.5) / 16.0;
        float q = clamp(floor(l * 3.0 + th) / 3.0, 0.0, 1.0);
        vec3 duo = q < 0.5 ? mix(uDark, uMid, q * 2.0) : mix(uMid, uLight, (q - 0.5) * 2.0);
        // fine pixel grid between blocks
        vec2 f = fract(vUv * grid);
        float gridLine = step(0.9, max(f.x, f.y));
        duo *= 1.0 - gridLine * 0.35;

        // resolve block by block, with a bright leading edge
        float r = hash21(cell);
        float rv = smoothstep(r - 0.04, r + 0.04, uReveal * 1.08 - 0.04);
        float edge = smoothstep(0.0, 0.05, uReveal * 1.08 - 0.04 - r) * (1.0 - smoothstep(0.05, 0.14, uReveal * 1.08 - 0.04 - r));
        edge *= 1.0 - smoothstep(0.9, 1.0, uReveal); // no stray highlights once fully resolved
        vec3 col = mix(duo, full, rv) + uLight * edge * 0.35 * (1.0 - rv * 0.5);

        gl_FragColor = vec4(col, shape * uOpacity);
        #include <fog_fragment>
      }`,
  });
  mat.uniforms.map.value = map;
  mat.extensions = { derivatives: true };
  return mat;
}

/** Fresnel rim for glass spheres. */
export function rimMaterial(color, power = 2.6, strength = 1.2) {
  return new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(strength) }, uPower: { value: power }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uPower, uOpacity;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower) * uOpacity;
        gl_FragColor = vec4(uColor * f, f);
      }`,
  });
}

export function loadTexture(url, aniso = 8) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      resolve(t);
    }, undefined, reject);
  });
}
