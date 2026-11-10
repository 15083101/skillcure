# SkillCures — cinematic 3D landing page

A single-page, real-time 3D rebuild of the skillcures.in landing page (Three.js + Vite, no framework).
All copy, the logo and the four pill mascots come from the live site; the mascots are rebuilt as real 3D models.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ — upload anywhere (Vercel, Netlify, S3, your current host)
npm run preview  # serve the production build locally
```

## The concept

**"Your whole pharma career, in one capsule."** The page explains SkillCures the way a pharmacist
reads a medicine: a glass capsule holds four labelled ingredients (Jobs, Courses, Mentors, Research)
and a "drug facts" label says who it is for, the dosage (one profile, one login) and the price.

- **Open** – the capsule arrives open, the four mascots drop in, it seals, the labels draw.
- **Journey** – scroll and it cracks open; the ingredients fly out and each one leads a chapter.
  Between chapters you fly through one word: FIND · PLAN · INVENT · BELONG · ASK · BEGIN.
- **Close** – at Join they fly back in and the capsule seals: "Your pharma career starts here."

## How it works

Each chapter lives in a different direction, so every transition is a different camera move:

| # | Chapter        | Camera move                    | 3D scene                                          |
|---|----------------|--------------------------------|---------------------------------------------------|
| 0 | What's inside  | dolly in (opening shot)        | the glass capsule + composition call-outs         |
| 1 | Your next step | truck right + yaw              | dashboard with Jobs / Courses / Mentor / Research |
| 2 | How it works   | dive down                      | live prescription + three packs                   |
| 3 | Patents        | sweep left and climb           | 5-step journey up to a filed Form 2               |
| 4 | Community      | push deep forward              | living network globe                              |
| 5 | Mentors        | crane up, look down            | mentor table                                      |
| 6 | Join           | pull back and rise             | the capsule seals around the crew + sign-up       |

Navigation: scroll / swipe (any deliberate scroll carries you to the next chapter), arrow keys,
PageUp/PageDown, Home/End, the chapter rail, the ↑ ↓ buttons, and deep links (`#patents`, `#join`, …).
Drag the background to look around; hover or tap a pill to make it jump.

## Community page (`community/index.html`)

Two engines render one world, driven by one camera rig:

- **Babylon.js** draws the solid world: glass atoms, glow, light cones, the radar, the event ring,
  photo arches, plus a filmic post-processing pipeline (bloom, ACES tone mapping, chromatic
  aberration, film grain, vignette) and a glow layer.
- **three.js** draws the *members*: a swarm of ~14,000 particles on a transparent canvas above,
  morphing between 15 formations on the GPU while the camera flies.

Typography: **Poppins** (headings), **Geist** (text), **Geist Mono** (labels, tabs, console).

| # | Section       | What the swarm becomes                | Babylon.js set piece                      |
|---|---------------|----------------------------------------|-------------------------------------------|
| 0 | Hub           | the hero portrait in pixels            | orbits with the six circles riding them   |
| 1 | Isolated      | one learner, everyone else far away    | a faint sonar                             |
| 2 | Connected     | a network of hundreds                  | —                                         |
| 3 | Learn         | a lecture hall facing one practitioner | stage, light cone, seat rows              |
| 4 | Connect       | a dot-matrix map of India              | city pins, arcs, travelling sparks        |
| 5 | Collaborate   | a flask and `</>` pulled together      | the bond and its spark                    |
| 6 | Discover      | radar rings                            | the sweep; opportunities light up         |
| 7 | Grow          | a double helix                         | rings of growth                           |
| 8 | Calendar      | a river of time, Oct → Jan             | month gates, 15 event beacons             |
| 9 | Events        | a halo                                 | ring of all 15 event cards (drag/filter)  |
|10 | Circles       | member clouds around each atom         | glass atoms with dithered photos          |
|11–13 | Stories    | each member's path drawn as light      | photo arch, journey nodes, outcome sticker |
|14 | Join          | a ring with a gap your size            | "you" flies in and fills it               |

Details (pillar bullet points, cities, journey steps) are labels pinned to 3D points, not text blocks.

| What                                   | File                                   |
|----------------------------------------|----------------------------------------|
| All copy and data                      | `src/community/data.js`                |
| Where each section sits + shared geometry | `src/community/engine/layout.js`    |
| Swarm formations                       | `src/community/engine/formations.js`   |
| Swarm renderer (three.js)              | `src/community/engine/swarm.js`        |
| Babylon stage, post, materials, dither shader | `src/community/engine/stage.js` |
| Babylon set pieces + labels            | `src/community/engine/pieces.js`       |
| Camera rig, picking, frame loop        | `src/community/engine/index.js`        |
| Page structure / scroll / panels       | `community/index.html`, `src/community/main.js`, `src/community/style.css` |

The engines load as a separate chunk after the page shell. Babylon's shaders are split into small
on-demand files, so `dist/` contains ~100 JS files (~650 KB gzipped in total including three.js).

## Where to change things

| What                                   | File                         |
|----------------------------------------|------------------------------|
| Copy, links, sections                  | `index.html`                 |
| Prescription rules, colleges, journey  | `src/data.js`                |
| Chapter positions + camera path        | `src/world/layout.js`        |
| What is in each 3D scene, pill poses   | `src/world/stations.js`      |
| Mascot models                          | `src/world/pills.js`         |
| The glass capsule                      | `src/world/capsule.js`       |
| Dashboard / Rx / patent form artwork   | `src/world/cards.js`         |
| Sky, dust, molecules                   | `src/world/env.js`           |
| Renderer, lights, camera rig, fly-through words, quality | `src/world/index.js` |
| Scroll, keyboard, forms, loader        | `src/main.js`                |
| Look and feel                          | `src/style.css`              |

## Built-in safeguards

- **Adaptive quality** – resolution, then bloom, step down automatically if the frame rate drops.
- **Phones** – scene on top, copy below; the camera pulls back so each scene still fits.
- **Reduced motion** – honours the OS setting (no parallax, twirls or idle drift; instant chapter jumps).
- **No WebGL** – falls back to a normal static page with the same content (`?static` to preview it).
- **Early-access form** – same behaviour as the live site: validates, then hands the email to `/signup/?email=…`.

Debug helpers: `?p=2.5` freezes the camera mid-flight, `?nointro` skips the opening shot, `?q=high` locks quality.
