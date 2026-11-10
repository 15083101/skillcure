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

A second 3D page for the community, set in **Poppins** (headings), **Geist** (text) and **Geist Mono**
(labels, console, file tabs). Concept: *the community is a molecule*.

| # | Chapter       | 3D scene                                                                              |
|---|---------------|---------------------------------------------------------------------------------------|
| 0 | Hub           | the hero portrait as a sculpture of ~10k dithered pixels; six circles orbit the head as a benzene ring |
| 1–5 | Pillars     | Learn · Connect · Collaborate · Discover · Grow — five monoliths; the camera trucks along them |
| 6 | Events        | all 15 events on a ring you can drag, filter by type, or step through                 |
| 7 | Circles       | back to the molecule from above; pick a circle and it turns to face you              |
| 8 | Stories       | three verified member stories as arches; photos resolve from pixels into colour       |
| 9 | Join          | the portrait reassembles and a seventh atom — you — bonds to the ring                 |

Photos everywhere use a pixel-dither shader (`src/community/world/shaders.js`) that resolves into full
colour when that item is in focus. Between chapters you fly through statements taken from the page copy.

| What                                   | File                                   |
|----------------------------------------|----------------------------------------|
| All copy: pillars, events, circles, stories | `src/community/data.js`           |
| Page structure                         | `community/index.html`                 |
| Camera stops, rig, statements          | `src/community/world/index.js`         |
| Portrait / molecule / scenes           | `src/community/world/{portrait,molecule,scenes}.js` |
| Canvas artwork (cards, pillars)        | `src/community/world/art.js`           |
| Scroll, pickers, console, join form    | `src/community/main.js`                |
| Look and feel                          | `src/community/style.css`              |

Images live in `public/community/` (copied from the live site).

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
