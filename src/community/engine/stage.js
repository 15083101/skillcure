// Babylon.js stage: engine, scene, camera driven by the shared rig, lighting, sky,
// glow layer and a filmic post-processing pipeline. Also the material helpers the pieces use.
import {
  Engine, Scene, TargetCamera, Vector3, Vector4, Matrix, Color3, Color4, MeshBuilder, StandardMaterial, ShaderMaterial,
  FresnelParameters, Effect, DynamicTexture, HemisphericLight, GlowLayer, DefaultRenderingPipeline,
  ImageProcessingConfiguration, Constants, TransformNode,
} from './bjs.js';

export const col = (hex, k = 1) => Color3.FromHexString(hex).scale(k);

Effect.ShadersStore.skyVertexShader = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  uniform mat4 worldViewProjection;
  varying vec3 vDir;
  void main() { vDir = normalize(position); gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore.skyFragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform float uTime;
  uniform vec3 uBase, uA, uB;
  float blob(vec3 d, vec3 c, float s) { return pow(max(dot(d, normalize(c)), 0.0), s); }
  void main() {
    vec3 d = normalize(vDir);
    float t = uTime * 0.025;
    vec3 c = uBase;
    c += uA * 0.30 * blob(d, vec3(cos(t), -0.2, -1.0), 3.0);
    c += uB * 0.22 * blob(d, vec3(-1.0, 0.5 + sin(t) * 0.2, 0.3), 4.0);
    c += uA * 0.18 * blob(d, vec3(0.8, 0.9, 0.4), 5.0);
    c += uB * 0.10 * blob(d, vec3(0.2, -1.0, 0.2), 3.0);
    c += uA * 0.05 * exp(-abs(d.y) * 6.0);
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    c += (n - 0.5) * 0.012;
    gl_FragColor = vec4(c, 1.0);
  }`;

// Ethiack-style photo treatment: dithered duotone that resolves block by block into colour.
Effect.ShadersStore.ditherVertexShader = /* glsl */ `
  precision highp float;
  attribute vec3 position; attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main() { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore.ditherFragmentShader = /* glsl */ `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform vec4 uUvT;
  uniform float uReveal, uOpacity, uBlocks, uAspect, uMask, uRadius;
  uniform vec3 uDark, uMid, uLight;
  float bayer4(vec2 p) {
    vec2 q = mod(floor(p), 4.0); float i = q.x + q.y * 4.0;
    if (i < 0.5) return 0.0;   if (i < 1.5) return 8.0;   if (i < 2.5) return 2.0;   if (i < 3.5) return 10.0;
    if (i < 4.5) return 12.0;  if (i < 5.5) return 4.0;   if (i < 6.5) return 14.0;  if (i < 7.5) return 6.0;
    if (i < 8.5) return 3.0;   if (i < 9.5) return 11.0;  if (i < 10.5) return 1.0;  if (i < 11.5) return 9.0;
    if (i < 12.5) return 15.0; if (i < 13.5) return 7.0;  if (i < 14.5) return 13.0; return 5.0;
  }
  float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float roundedBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    vec2 p = vec2((vUV.x - 0.5) * uAspect, vUV.y - 0.5);
    float d;
    if (uMask > 0.5 && uMask < 1.5) d = length(p) - 0.5 * min(uAspect, 1.0);
    else if (uMask > 1.5) { float r = 0.5 * uAspect; float cy = 0.5 - r; d = p.y > cy ? length(p - vec2(0.0, cy)) - r : roundedBox(p, vec2(0.5 * uAspect, 0.5), 0.035); }
    else d = roundedBox(p, vec2(0.5 * uAspect, 0.5), uRadius);
    float aa = fwidth(d) * 1.2;
    float shape = 1.0 - smoothstep(-aa, aa, d);
    if (shape <= 0.001) discard;
    vec2 tuv = vUV * uUvT.xy + uUvT.zw;
    vec2 grid = vec2(uBlocks, uBlocks / uAspect);
    vec2 cell = floor(vUV * grid);
    vec2 puv = ((cell + 0.5) / grid) * uUvT.xy + uUvT.zw;
    vec3 full = texture2D(textureSampler, tuv).rgb;
    vec3 px = texture2D(textureSampler, puv).rgb;
    float l = pow(dot(px, vec3(0.299, 0.587, 0.114)), 0.8);
    float q = clamp(floor(l * 3.0 + (bayer4(cell) + 0.5) / 16.0) / 3.0, 0.0, 1.0);
    vec3 duo = q < 0.5 ? mix(uDark, uMid, q * 2.0) : mix(uMid, uLight, (q - 0.5) * 2.0);
    vec2 f = fract(vUV * grid);
    duo *= 1.0 - step(0.9, max(f.x, f.y)) * 0.35;
    float r = hash21(cell);
    float x = uReveal * 1.08 - 0.04;
    float rv = smoothstep(r - 0.04, r + 0.04, x);
    float edge = smoothstep(0.0, 0.05, x - r) * (1.0 - smoothstep(0.05, 0.14, x - r)) * (1.0 - smoothstep(0.9, 1.0, uReveal));
    vec3 c = mix(duo, full, rv) + uLight * edge * 0.35;
    gl_FragColor = vec4(c, shape * uOpacity);
  }`;

export function createStage({ canvas, dpr, calm, quality }) {
  const engine = new Engine(canvas, true, { stencil: true, powerPreference: 'high-performance', preserveDrawingBuffer: false, premultipliedAlpha: false }, false);
  engine.setHardwareScalingLevel(1 / dpr);
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new Color4(0.016, 0.031, 0.102, 1);
  scene.ambientColor = new Color3(0.2, 0.25, 0.45);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = new Color3(0.016, 0.031, 0.102);
  scene.fogDensity = 0.016;
  scene.skipPointerMovePicking = true;
  scene.autoClear = true;

  // camera: the shared rig hands us position / target / up / fov every frame
  const camera = new TargetCamera('cam', new Vector3(0, 0, 20), scene);
  camera.minZ = 0.1; camera.maxZ = 800;
  const tgt = new Vector3(), up = new Vector3(0, 1, 0);
  camera._isSynchronizedViewMatrix = () => false;
  camera._getViewMatrix = function getView() {
    Matrix.LookAtRHToRef(this.position, tgt, up, this._viewMatrix);
    return this._viewMatrix;
  };
  function setCamera(p, t, u, fovDeg) {
    camera.position.set(p[0], p[1], p[2]);
    tgt.set(t[0], t[1], t[2]);
    up.set(u[0], u[1], u[2]);
    camera.fov = (fovDeg * Math.PI) / 180;
  }

  const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.4), scene);
  hemi.intensity = 0.7; hemi.diffuse = col('#9db8ff'); hemi.groundColor = col('#04081a');

  // sky dome
  const sky = MeshBuilder.CreateSphere('sky', { diameter: 900, segments: 24, sideOrientation: 2 }, scene);
  const skyMat = new ShaderMaterial('skyMat', scene, { vertex: 'sky', fragment: 'sky' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'uTime', 'uBase', 'uA', 'uB'] });
  skyMat.setColor3('uBase', col('#04081a', 0.9)); skyMat.setColor3('uA', col('#0253eb')); skyMat.setColor3('uB', col('#018f9d'));
  skyMat.backFaceCulling = false;
  skyMat.disableDepthWrite = true;
  sky.material = skyMat; sky.infiniteDistance = true; sky.isPickable = false; sky.applyFog = false;
  sky.renderingGroupId = 0;

  // glow: anything emissive and marked glows
  const glow = new GlowLayer('glow', scene, { mainTextureFixedSize: quality === 'low' ? 256 : 512, blurKernelSize: 48 });
  glow.intensity = 0.85;
  glow.addExcludedMesh(sky);

  // filmic finish
  const pipe = new DefaultRenderingPipeline('film', true, scene, [camera]);
  pipe.samples = quality === 'low' ? 1 : 4;
  pipe.fxaaEnabled = quality === 'low';
  pipe.bloomEnabled = true; pipe.bloomThreshold = 0.72; pipe.bloomWeight = 0.38; pipe.bloomKernel = 64; pipe.bloomScale = 0.5;
  pipe.imageProcessingEnabled = true;
  const ip = pipe.imageProcessing;
  ip.toneMappingEnabled = true; ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 1.15; ip.contrast = 1.22;
  ip.vignetteEnabled = true; ip.vignetteWeight = 2.4; ip.vignetteStretch = 0.4; ip.vignetteColor = new Color4(0.008, 0.016, 0.06, 0);
  pipe.chromaticAberrationEnabled = !calm && quality !== 'low';
  pipe.chromaticAberration.aberrationAmount = 16; pipe.chromaticAberration.radialIntensity = 1.2;
  pipe.grainEnabled = quality !== 'low';
  pipe.grain.intensity = 7; pipe.grain.animated = !calm;

  // ── material helpers ───────────────────────────────────────────────────
  const cache = new Map();
  /** unlit, emissive — glows through the glow layer */
  function emissive(hex, k = 1, alpha = 1) {
    const key = `e${hex}${k}${alpha}`;
    if (cache.has(key)) return cache.get(key);
    const m = new StandardMaterial(key, scene);
    m.disableLighting = true; m.emissiveColor = col(hex, k); m.alpha = alpha;
    if (alpha < 1) m.alphaMode = Constants.ALPHA_ADD;
    m.fogEnabled = true;
    cache.set(key, m);
    return m;
  }
  /** glass: transparent centre, bright fresnel rim */
  function glass(hex, k = 1) {
    const m = new StandardMaterial(`glass${hex}${Math.random()}`, scene);
    m.diffuseColor = Color3.Black(); m.specularColor = new Color3(0.9, 0.95, 1); m.specularPower = 96;
    m.emissiveColor = col(hex, 0.12 * k);
    m.alpha = 0.22;
    m.emissiveFresnelParameters = new FresnelParameters({ bias: 0.15, power: 2.4, leftColor: col(hex, 1.1 * k), rightColor: Color3.Black() });
    m.opacityFresnelParameters = new FresnelParameters({ bias: 0.12, power: 2.2, leftColor: Color3.White(), rightColor: Color3.Black() });
    m.backFaceCulling = false;
    return m;
  }
  /** dithered photo */
  function dither(texture, { aspect = 1, mask = 0, blocks = 56, mid = '#1d4fe0', dark = '#06123f', light = '#7cf3e2', imgAspect = 1, radius = 0.06 } = {}) {
    const m = new ShaderMaterial(`dither${Math.random()}`, scene, { vertex: 'dither', fragment: 'dither' }, {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'uUvT', 'uReveal', 'uOpacity', 'uBlocks', 'uAspect', 'uMask', 'uRadius', 'uDark', 'uMid', 'uLight'],
      samplers: ['textureSampler'],
      needAlphaBlending: true,
    });
    const sx = imgAspect > aspect ? aspect / imgAspect : 1;
    const sy = imgAspect > aspect ? 1 : imgAspect / aspect;
    m.setTexture('textureSampler', texture);
    m.setVector4('uUvT', new Vector4(sx, sy, (1 - sx) / 2, (1 - sy) / 2));
    m.setFloat('uReveal', 0); m.setFloat('uOpacity', 1); m.setFloat('uBlocks', blocks); m.setFloat('uAspect', aspect);
    m.setFloat('uMask', mask); m.setFloat('uRadius', radius);
    m.setColor3('uDark', col(dark)); m.setColor3('uMid', col(mid)); m.setColor3('uLight', col(light));
    m.backFaceCulling = false;
    m.alphaMode = Constants.ALPHA_COMBINE;
    m.state = { reveal: 0, opacity: 1 };
    m.setReveal = (v) => { if (Math.abs(v - m.state.reveal) > 0.001) { m.state.reveal = v; m.setFloat('uReveal', v); } };
    m.setOpacity = (v) => { if (Math.abs(v - m.state.opacity) > 0.001) { m.state.opacity = v; m.setFloat('uOpacity', v); } };
    return m;
  }
  /** a canvas drawing on a plane (labels, cards, stickers) */
  function canvasMaterial(canvasEl, { alpha = 1, add = false } = {}) {
    const dt = new DynamicTexture(`dt${Math.random()}`, { width: canvasEl.width, height: canvasEl.height }, scene, true);
    dt.hasAlpha = true;
    dt.getContext().drawImage(canvasEl, 0, 0);
    dt.update(true, true);
    dt.anisotropicFilteringLevel = 8;
    const m = new StandardMaterial(`cm${Math.random()}`, scene);
    m.disableLighting = true; m.emissiveTexture = dt; m.opacityTexture = dt; m.diffuseColor = Color3.Black();
    m.alpha = alpha; m.backFaceCulling = false;
    if (add) m.alphaMode = Constants.ALPHA_ADD;
    m.dt = dt;
    return m;
  }
  /** soft radial light sprite */
  let glowTex = null;
  function glowSprite(hex, size, alpha = 0.5, parent = null) {
    if (!glowTex) {
      glowTex = new DynamicTexture('glowTex', { width: 128, height: 128 }, scene, true);
      const g = glowTex.getContext();
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128); glowTex.update(); glowTex.hasAlpha = true;
    }
    const p = MeshBuilder.CreatePlane('sprite', { size }, scene);
    const m = new StandardMaterial(`sp${Math.random()}`, scene);
    m.disableLighting = true; m.emissiveColor = col(hex); m.opacityTexture = glowTex; m.alpha = alpha;
    m.alphaMode = Constants.ALPHA_ADD; m.backFaceCulling = false; m.disableDepthWrite = true;
    p.material = m; p.billboardMode = 7; p.isPickable = false;
    glow.addExcludedMesh(p);
    if (parent) p.parent = parent;
    return p;
  }
  function node(name, parent) { const n = new TransformNode(name, scene); if (parent) n.parent = parent; return n; }

  return {
    engine, scene, camera, glow, pipe, sky, skyMat,
    setCamera,
    mats: { emissive, glass, dither, canvasMaterial, glowSprite, node },
    resize(dprNow) { engine.setHardwareScalingLevel(1 / dprNow); engine.resize(); },
    setQuality(tier) {
      if (tier >= 1) pipe.chromaticAberrationEnabled = false;
      if (tier >= 2) { pipe.grainEnabled = false; pipe.samples = 1; pipe.fxaaEnabled = true; }
      if (tier >= 3) { glow.intensity = 0.6; pipe.bloomEnabled = false; }
    },
  };
}
