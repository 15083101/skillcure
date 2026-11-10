// The seven scenes. Each is built in its own local frame (its +Z faces the chapter camera).
import * as THREE from 'three';
import { COLORS, JOURNEY } from '../data.js';
import { STATIONS, focusOf, yawOf } from './layout.js';
import * as draw from './cards.js';
import { createCapsule } from './capsule.js';

const D = Math.PI / 180;
const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const glow = (hex, k = 1.6, extra = {}) => new THREE.MeshBasicMaterial({ color: C(hex, k), ...extra });

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

/** A physical slab with a drawn face — cards have real thickness and catch light on their edges. */
function slab(tex, w, h, { depth = 0.07, radius = 0.12, color = 0x0b1648, rough = 0.35 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(roundedRect(w, h, radius), { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 8 });
  geo.translate(0, 0, -depth - 0.012);
  const body = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0.15, clearcoat: 0.6 }));
  const face = draw.plane(tex, w, h, { side: THREE.FrontSide });
  face.position.z = 0.004;
  face.renderOrder = 2;
  g.add(body, face);
  g.userData.face = face;
  return g;
}

function blob(size, opacity = 0.5, color = 'rgba(0,4,20,1)') {
  const m = draw.plane(new THREE.CanvasTexture(draw.drawGlow(color, color.replace(/[\d.]+\)$/, '0)'))), size, size, { opacity });
  m.rotation.x = -Math.PI / 2;
  return m;
}

export function createStations({ icon, aniso }) {
  const root = new THREE.Group();
  const floaters = [];   // things that bob
  const spinners = [];   // things that rotate
  const tickers = [];    // custom per-frame callbacks
  const tex = (c) => draw.texture(c, aniso);

  const groups = STATIONS.map((s, i) => {
    const g = new THREE.Group();
    g.position.copy(focusOf(i));
    g.rotation.y = yawOf(i);
    root.add(g);
    return g;
  });
  const float = (obj, amp = 0.08, speed = 0.8, rot = 0.02) => {
    floaters.push({ obj, y: obj.position.y, rx: obj.rotation.x, rz: obj.rotation.z, amp, speed, rot, ph: floaters.length * 1.31 });
    return obj;
  };

  // ── 00 · HERO — one glass capsule, four ingredients sealed inside ───────
  const capsules = {};
  {
    const g = groups[0];
    const cap = createCapsule();
    cap.group.position.set(0, 0.05, 0);
    cap.group.rotation.z = 0.045;
    g.add(cap.group);
    capsules.hero = cap;
    tickers.push((t) => { cap.group.position.y = 0.05 + Math.sin(t * 0.7) * 0.05; cap.group.rotation.z = 0.045 + Math.sin(t * 0.45) * 0.012; });

    const under = blob(13, 0.5, 'rgba(2,83,235,1)');
    under.position.y = -2.6;
    const inner = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(draw.drawGlow()), color: C(COLORS.cobalt, 1.1), transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    inner.scale.set(11, 7, 1); inner.position.z = -1.8;
    g.add(under, inner);

    // electron orbits — the capsule as the nucleus
    [[4.5, 62, 24, COLORS.teal, 0.42], [5.0, 50, -38, COLORS.cobalt, -0.33], [4.1, 74, 96, COLORS.pink, 0.5]].forEach(([r, tiltX, tiltZ, col, speed], k) => {
      const orbit = new THREE.Group();
      orbit.rotation.set(tiltX * D, 0, tiltZ * D);
      orbit.position.y = 0.1;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 160), glow(col, 1.2, { transparent: true, opacity: 0.26 }));
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), glow(col, 2.6));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(draw.drawGlow()), color: C(col, 1.2), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.setScalar(0.7);
      e.add(halo);
      orbit.add(ring, e);
      g.add(orbit);
      tickers.push((t) => { const a = t * speed + k * 2.1; e.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); });
    });
  }

  // ── 01 · DASHBOARD — one profile, four things orbiting it ───────────────
  {
    const g = groups[1];
    const dash = slab(tex(draw.drawDashboard(icon)), 4.3, 4.3 * (600 / 940), { radius: 0.14 });
    dash.position.set(0, 0.05, 0);
    dash.rotation.set(-0.03, -0.1, 0.01);
    g.add(float(dash, 0.05, 0.6, 0.012));
    const tiles = [
      [{ kind: 'Jobs', title: '2 matches', detail: 'QA Officer, QC Analyst', color: 'cobalt' }, [-1.95, 1.42, 0.8], [0.04, 0.2, 0.05]],
      [{ kind: 'Courses', title: '72%', detail: 'GMP Essentials', color: 'pink' }, [-2.05, -1.42, 1.1], [-0.05, 0.22, -0.04]],
      [{ kind: 'Mentor', title: 'Tue 6 pm', detail: 'Call with a QA manager', color: 'amber' }, [1.95, 1.45, 0.75], [0.04, -0.2, -0.05]],
      [{ kind: 'Research', title: 'In review', detail: 'Paediatric suspension paper', color: 'teal' }, [2.05, -1.4, 1.05], [-0.05, -0.22, 0.04]],
    ];
    const edge = { cobalt: 0x0244c8, pink: 0xf07a9c, amber: 0xd98312, teal: 0x02968a };
    tiles.forEach(([spec, p, r]) => {
      const t = slab(tex(draw.drawTile(spec)), 1.5, 1.5 * (236 / 400), { radius: 0.12, depth: 0.09, color: edge[spec.color] });
      t.position.set(...p); t.rotation.set(...r);
      g.add(float(t, 0.09, 0.9, 0.03));
    });
    const back = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(draw.drawGlow()), color: C(COLORS.cobalt, 1), transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
    back.scale.set(11, 8, 1); back.position.z = -1.5;
    g.add(back);
  }

  // ── 02 · PRESCRIPTION — a live Rx and its three "packs" ─────────────────
  const rxState = { paper: null, paperCanvas: null, packs: [], flip: 0 };
  {
    const g = groups[2];
    const cv = draw.canvas(560, 760);
    rxState.paperCanvas = cv;
    rxState.paperTex = tex(cv.c);
    const paper = slab(rxState.paperTex, 2.5, 2.5 * (760 / 560), { radius: 0.1, depth: 0.03, color: 0xdfe5f4, rough: 0.8 });
    const holder = new THREE.Group();
    holder.position.set(-1.15, 0.05, 0);
    holder.rotation.set(0.02, 0.2, -0.035);
    holder.add(paper);
    g.add(float(holder, 0.07, 0.7, 0.015));
    rxState.paper = paper;

    const edge = [0xf07a9c, 0xd98312, 0x0244c8];
    [[1.45, 1.28, 0.35, -0.22, 0.05], [1.75, 0.02, 0.8, -0.32, -0.03], [1.45, -1.25, 0.45, -0.24, 0.04]].forEach(([x, y, z, ry, rz], i) => {
      const cvp = draw.canvas(400, 236);
      const t = tex(cvp.c);
      const pack = slab(t, 1.66, 1.66 * (236 / 400), { radius: 0.11, depth: 0.34, color: edge[i], rough: 0.5 });
      pack.position.set(x, y, z); pack.rotation.set(0, ry, rz);
      g.add(float(pack, 0.08, 0.85 + i * 0.1, 0.025));
      rxState.packs.push({ pack, cv: cvp, tex: t, body: pack.children[0] });
    });
    const back = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(draw.drawGlow()), color: C(COLORS.deepteal, 1), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
    back.scale.set(10, 9, 1); back.position.z = -1.6;
    g.add(back);
    tickers.push((t, dt) => {
      if (rxState.flip > 0) {
        rxState.flip = Math.max(0, rxState.flip - dt * 1.5);
        const k = rxState.flip;
        const e = 1 - (1 - k) * (1 - k);
        rxState.paper.rotation.y = e * Math.PI * 2;
        rxState.paper.scale.setScalar(1 + Math.sin((1 - k) * Math.PI) * 0.06);
        rxState.packs.forEach(({ pack }, i) => { pack.scale.setScalar(1 + Math.sin(Math.min(1, Math.max(0, (1 - k) * 1.6 - i * 0.18)) * Math.PI) * 0.12); });
      }
    });
  }
  const PACK_EDGE = { cobalt: 0x0244c8, pink: 0xf07a9c, amber: 0xd98312, teal: 0x02968a };
  function setRx(rx, animate = true) {
    draw.drawPrescription(rx, icon, rxState.paperCanvas);
    rxState.paperTex.needsUpdate = true;
    rx.cards.forEach((card, i) => {
      const p = rxState.packs[i];
      const c = draw.drawTile({ kind: card.kind, title: card.short ?? card.title, detail: card.detail, color: card.color });
      p.cv.g.clearRect(0, 0, 400, 236);
      p.cv.g.drawImage(c, 0, 0, 400, 236);
      p.tex.needsUpdate = true;
      p.body.material.color.set(PACK_EDGE[card.color]);
    });
    if (animate) rxState.flip = 1;
  }

  // ── 03 · PATENTS — five steps climbing to a filed Form 2 ────────────────
  {
    const g = groups[3];
    const pts = [];
    JOURNEY.forEach((row, i) => {
      const state = i < 2 ? 'done' : i === 2 ? 'now' : 'todo';
      const step = slab(tex(draw.drawStep(i + 1, row, state)), 2.36, 2.36 * (150 / 520), { radius: 0.115, depth: 0.1, color: i === 2 ? 0x0244c8 : 0x0b1648 });
      const p = new THREE.Vector3(-2.35 + i * 0.4, -2.25 + i * 1.02, 1.1 - i * 0.55);
      step.position.copy(p);
      step.rotation.set(0, 0.22, 0);
      g.add(float(step, 0.045, 0.7 + i * 0.07, 0.01));
      pts.push(p.clone().add(new THREE.Vector3(-1.32, 0, 0.02)));
    });
    // the climbing line + a spark that runs up to "Filed"
    const curve = new THREE.CatmullRomCurve3([pts[0].clone().add(new THREE.Vector3(-0.2, -0.9, 0.3)), ...pts, pts[4].clone().add(new THREE.Vector3(0.3, 0.9, -0.4))]);
    const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.012, 6), glow(COLORS.cobalt, 1.5, { transparent: true, opacity: 0.7 }));
    g.add(line);
    pts.forEach((p, i) => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), glow(i <= 2 ? COLORS.teal : COLORS.cobalt, i <= 2 ? 2.4 : 1.2));
      dot.position.copy(p); g.add(dot);
    });
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), glow('#ffffff', 2.4));
    const sHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(draw.drawGlow()), color: C(COLORS.teal, 1.5), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    sHalo.scale.setScalar(0.8); spark.add(sHalo);
    g.add(spark);
    tickers.push((t) => {
      const k = (t * 0.22) % 1.25;
      const u = Math.min(1, k) * 0.565; // stops at step 3 of 5 — "Filed"
      spark.position.copy(curve.getPoint(u));
      spark.scale.setScalar(k > 1 ? 1 + Math.sin((k - 1) * 4 * Math.PI) * 0.8 : 1);
    });

    const form = slab(tex(draw.drawPatentForm()), 2.2, 2.2 * (760 / 560), { radius: 0.06, depth: 0.03, color: 0xd9deea, rough: 0.85 });
    form.position.set(1.55, -0.25, 0.3);
    form.rotation.set(-0.02, -0.3, 0.04);
    g.add(float(form, 0.07, 0.6, 0.015));
    const back = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(draw.drawGlow()), color: C(COLORS.cobalt, 1), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
    back.scale.set(12, 10, 1); back.position.z = -2;
    g.add(back);
  }

  // ── 04 · COMMUNITY — a living network of people ─────────────────────────
  {
    const g = groups[4];
    const globe = new THREE.Group();
    const R = 2.65, COUNT = 170;
    const palette = [COLORS.cobalt, '#4f8bff', COLORS.teal, COLORS.teal, COLORS.pink, COLORS.amber, '#ffffff'];
    const nodes = [];
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * Math.PI * (3 - Math.sqrt(5));
      const jitter = 1 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.07;
      nodes.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(R * jitter));
    }
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial(), COUNT);
    const m4 = new THREE.Matrix4();
    nodes.forEach((p, i) => {
      const big = i % 17 === 0;
      const s = big ? 0.13 : 0.04 + ((i * 7) % 5) * 0.008;
      m4.makeScale(s, s, s).setPosition(p);
      inst.setMatrixAt(i, m4);
      inst.setColorAt(i, C(palette[i % palette.length], big ? 2.4 : 1.5));
    });
    globe.add(inst);
    // edges to nearest neighbours
    const edges = [];
    const verts = [];
    nodes.forEach((a, i) => {
      nodes.map((b, j) => [a.distanceToSquared(b), j]).sort((x, y) => x[0] - y[0]).slice(1, 4).forEach(([, j]) => {
        if (j > i || !edges.some(([p, q]) => p === j && q === i)) { edges.push([i, j]); verts.push(a.x, a.y, a.z, nodes[j].x, nodes[j].y, nodes[j].z); }
      });
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    globe.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: C('#3f7bff', 1.1), transparent: true, opacity: 0.42 })));
    const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.96, 40, 28), new THREE.MeshBasicMaterial({ color: 0x050d2e, transparent: true, opacity: 0.72 }));
    globe.add(core);
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(draw.drawGlow()), color: C(COLORS.cobalt, 1.1), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    aura.scale.setScalar(R * 4.6); aura.position.z = -1;
    g.add(aura);
    // messages travelling the network
    const pulses = Array.from({ length: 16 }, (_, k) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glow(k % 2 ? COLORS.teal : '#ffffff', 2.6));
      globe.add(mesh);
      return { mesh, e: (k * 37) % edges.length, t: k / 16, sp: 0.5 + (k % 5) * 0.12 };
    });
    tickers.push((t, dt) => {
      pulses.forEach((p) => {
        p.t += dt * p.sp;
        if (p.t > 1) { p.t = 0; p.e = (p.e + 53) % edges.length; }
        const [a, b] = edges[p.e];
        p.mesh.position.lerpVectors(nodes[a], nodes[b], p.t);
      });
    });
    globe.rotation.z = 0.25;
    g.add(globe);
    spinners.push({ obj: globe, speed: 0.09 });

    [['Learn', 'From industry experts.', COLORS.cobalt, [-2.75, 2.25, 2.3], 0.25], ['Create', 'Ideas into patents.', COLORS.amber, [1.9, 0.3, 2.9], -0.22], ['Connect', 'Mentors & peers.', COLORS.teal, [-2.5, -2.2, 2.4], 0.25]].forEach(([a, b, col, p, ry]) => {
      const chip = slab(tex(draw.drawChip(a, b, col)), 2.1, 2.1 * (116 / 420), { radius: 0.13, depth: 0.06 });
      chip.position.set(...p); chip.rotation.y = ry;
      g.add(float(chip, 0.09, 0.8, 0.02));
    });
  }

  // ── 05 · MENTORS — a table where students and professionals meet ────────
  {
    const g = groups[5];
    const white = new THREE.MeshPhysicalMaterial({ color: 0x0f2068, roughness: 0.3, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.2, emissive: C(COLORS.cobalt, 0.1), envMapIntensity: 0.6 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.14, 72), white);
    top.position.y = 0;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.96, 0.03, 10, 96), glow(COLORS.teal, 1.9));
    lip.rotation.x = Math.PI / 2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 1.7, 24), new THREE.MeshPhysicalMaterial({ color: 0x9fb0e0, roughness: 0.3, metalness: 0.5 }));
    stem.position.y = -0.9;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.1, 48), new THREE.MeshPhysicalMaterial({ color: 0x1a2a6a, roughness: 0.4, metalness: 0.3 }));
    foot.position.y = -1.78;
    const floorGlow = blob(13, 0.6, 'rgba(2,83,235,1)');
    floorGlow.position.y = -1.86;
    const ringF = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.012, 8, 120), glow(COLORS.teal, 1.8, { transparent: true, opacity: 0.7 }));
    ringF.rotation.x = Math.PI / 2; ringF.position.y = -1.82;
    const logo = draw.plane(tex(icon), 0.9, 0.9, { opacity: 0.95 });
    logo.rotation.x = -Math.PI / 2; logo.position.y = 0.075;
    g.add(top, lip, stem, foot, floorGlow, ringF, logo);

    const seatCol = [0x3f5cff, 0xffb4c9, 0xf7a233, 0x12c79b];
    const screenCol = ['#3f6bff', '#ff9fbb', '#f6a53a', '#16d9bf'];
    MENTOR_SEATS.forEach((deg, i) => {
      const a = deg * D;
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const stool = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.12, 32), new THREE.MeshPhysicalMaterial({ color: seatCol[i], roughness: 0.35, clearcoat: 0.8 }));
      seat.position.y = -0.36;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 12), stem.material);
      leg.position.y = -1.1;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.05, 28), foot.material);
      disc.position.y = -1.8;
      stool.add(seat, leg, disc);
      stool.position.copy(dir).multiplyScalar(2.72);
      g.add(stool);

      const laptop = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.42), new THREE.MeshPhysicalMaterial({ color: 0xb8c3e6, roughness: 0.3, metalness: 0.7 }));
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.025), deck.material);
      const scr = draw.plane(tex(draw.drawScreen(screenCol[i])), 0.57, 0.37, { side: THREE.FrontSide, color: C('#ffffff', 1.25) });
      scr.position.z = 0.014;
      const hinge = new THREE.Group();
      hinge.add(lid, scr);
      lid.position.y = 0.21; scr.position.y = 0.21;
      hinge.position.set(0, 0.015, -0.2);
      hinge.rotation.x = -0.32;
      laptop.add(deck, hinge);
      laptop.position.copy(dir).multiplyScalar(1.28).setY(0.09);
      laptop.rotation.y = a; // screen faces the seat
      g.add(laptop);
    });

    const chip = slab(tex(draw.drawChip('Tue · 6:00 pm', 'QC analyst · 12 years', COLORS.amber, { badge: 'Booked' })), 2.3, 2.3 * (116 / 420), { radius: 0.14, depth: 0.06 });
    chip.position.set(0.1, 2.25, -0.4);
    chip.rotation.x = -STATIONS[5].el * D;
    g.add(float(chip, 0.1, 0.8, 0.02));
  }

  // ── 06 · JOIN — the ingredients fly back in and the capsule seals ───────
  {
    const g = groups[6];
    const cap = createCapsule();
    cap.group.scale.setScalar(JOIN_SCALE);
    cap.group.position.set(0, JOIN_Y, 0);
    g.add(cap.group);
    capsules.join = cap;
    tickers.push((t) => { cap.group.position.y = JOIN_Y + Math.sin(t * 0.7) * 0.04; });

    [[3.1, COLORS.teal, 0.45, 0.25], [3.7, COLORS.cobalt, 0.32, -0.18], [4.5, COLORS.cobalt, 0.18, 0.12]].forEach(([r, col, op, sp]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.01, 6, 140, Math.PI * 1.6), glow(col, 1.6, { transparent: true, opacity: op }));
      ring.position.set(0, JOIN_Y, -1.6);
      g.add(ring);
      spinners.push({ obj: ring, speed: sp, axis: 'z' });
    });
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(draw.drawGlow()), color: C(COLORS.cobalt, 1.2), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    aura.scale.set(14, 9, 1); aura.position.set(0, JOIN_Y, -2.2);
    g.add(aura);
  }

  /** k = 0 sealed … 1 fully open */
  function setCapsules(heroOpen, joinOpen) {
    capsules.hero.setOpen(heroOpen);
    capsules.join.setOpen(joinOpen);
  }

  function update(t, dt, calm) {
    const k = calm ? 0.2 : 1;
    floaters.forEach((f) => {
      f.obj.position.y = f.y + Math.sin(t * f.speed + f.ph) * f.amp * k;
      f.obj.rotation.x = f.rx + Math.sin(t * f.speed * 0.8 + f.ph * 2) * f.rot * k;
      f.obj.rotation.z = f.rz + Math.cos(t * f.speed * 0.7 + f.ph) * f.rot * k;
    });
    spinners.forEach((s) => { s.obj.rotation[s.axis ?? 'y'] += s.speed * dt * (calm ? 0.3 : 1); });
    tickers.forEach((fn) => fn(t, dt));
  }

  return { root, groups, update, setRx, setCapsules };
}

// ── Where the crew stands in each chapter (local to the chapter's frame) ──
const IN_S = 0.8;                      // mascot scale inside the capsule
const JOIN_SCALE = 0.86, JOIN_Y = 0.05;
//                    x      y     ry    rz      (0 cobalt · 1 pink · 2 amber · 3 teal)
const IN_CAPSULE = [[-1.62, 0.0, 0.2, 0.08], [-0.6, -0.12, 0.08, -0.05], [0.52, 0.06, -0.08, 0.07], [1.55, -0.02, -0.2, -0.07]];
const HALF = [0.93, 0.78, 0.78, 0.93];

/** Composition call-outs for the hero: where each leader line starts (a) and ends (b), in hero-local space. */
export const HERO_CALLOUTS = IN_CAPSULE.map(([x, y], k) => {
  const dir = k % 2 === 0 ? 1 : -1; // alternate above / below the capsule
  return { a: [x, 0.05 + y + dir * (HALF[k] * IN_S * 0.96), 0], b: [x + dir * 0.1, 0.05 + dir * 2.12, 0], dir };
});
const MENTOR_SEATS = [205, 285, 75, 155]; // cobalt, pink, amber, teal — degrees around the table
const seat = (i, half, s, ry) => {
  const a = MENTOR_SEATS[i] * D;
  return { p: [Math.sin(a) * 2.72, -0.3 + half * s, Math.cos(a) * 2.72], ry: ry ?? a + Math.PI, s };
};

/** POSES[chapter][pill](t) → { p, ry, rz, s }  — pills: 0 cobalt, 1 pink, 2 amber, 3 teal */
export const POSES = [
  // 00 hero — sealed inside the capsule, the four ingredients
  IN_CAPSULE.map(([x, y, ry, rz]) => () => ({ p: [x, 0.05 + y, 0], ry, rz, s: IN_S })),
  // 01 dashboard — each sits on its own tile
  [
    () => ({ p: [-2.2, 1.42 + 0.44 + 0.93 * 0.46, 0.85], ry: 0.25, rz: 0.1, s: 0.46 }),
    () => ({ p: [-2.2, -1.42 + 0.44 + 0.78 * 0.46, 1.15], ry: 0.3, rz: -0.1, s: 0.46 }),
    () => ({ p: [1.85, 1.45 + 0.44 + 0.78 * 0.46, 0.8], ry: -0.25, rz: 0.1, s: 0.46 }),
    () => ({ p: [2.0, -1.4 + 0.44 + 0.93 * 0.46, 1.1], ry: -0.3, rz: -0.1, s: 0.46 }),
  ],
  // 02 prescription — openings, course, mentor beside their packs; teal co-signs the Rx
  [
    () => ({ p: [2.6, -1.3, 0.75], ry: -0.4, rz: -0.12, s: 0.48 }),
    () => ({ p: [2.62, 1.42, 0.6], ry: -0.36, rz: 0.1, s: 0.48 }),
    () => ({ p: [2.85, 0.1, 1.0], ry: -0.42, rz: -0.06, s: 0.48 }),
    () => ({ p: [-2.35, -1.8, 0.9], ry: 0.38, rz: 0.14, s: 0.5 }),
  ],
  // 03 patents — four inventors around the filed form
  [
    () => ({ p: [0.55, 1.8, 0.75], ry: 0.1, rz: 0.16, s: 0.48 }),
    () => ({ p: [2.6, -1.65, 1.0], ry: -0.4, rz: -0.1, s: 0.48 }),
    () => ({ p: [2.55, 1.6, 0.5], ry: -0.4, rz: -0.14, s: 0.48 }),
    () => ({ p: [0.4, -1.95, 1.3], ry: 0.05, rz: 0.1, s: 0.5 }),
  ],
  // 04 community — in orbit around the network
  [0, 1, 2, 3].map((k) => (t) => {
    const a = t * 0.24 + k * Math.PI * 0.5;
    return { p: [Math.cos(a) * 3.55, Math.sin(a * 1.0 + k * 1.3) * 1.5, Math.sin(a) * 3.55], ry: -a + Math.PI / 2, rz: Math.sin(a) * 0.2, s: 0.5 };
  }),
  // 05 mentors — seated at the table
  [
    () => seat(0, 0.93, 0.66),
    () => seat(1, 0.78, 0.66, 0.75),
    () => seat(2, 0.78, 0.62, -0.75),
    () => seat(3, 0.93, 0.66),
  ],
  // 06 join — back inside, sealed
  IN_CAPSULE.map(([x, y, ry, rz]) => () => ({ p: [x * JOIN_SCALE, JOIN_Y + y * JOIN_SCALE, 0], ry, rz, s: IN_S * JOIN_SCALE })),
];
