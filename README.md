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

## Community pages

Two versions of the community page share one content file (`src/community/content.js`), so copy
changes show up in both.

| Page | What it is |
|------|------------|
| `community/index.html` | **2D** — the default. Clean editorial layout, light motion, fast and accessible. |
| `community/3d.html` | **3D** — Babylon.js (solid world, glow, post-processing) + three.js (a ~14k-particle member swarm), one camera rig. |

### The six features

1. **Events** — every pharma event in India in one calendar: industry expos and congresses plus
   SkillCures events. Filter by format, city and source; add to calendar (.ics); organisers submit
   events through a form.
2. **Mentor sessions** — anyone can propose a lecture, workshop, AMA or panel and bring their own
   meeting link (Zoom, Meet, Teams, YouTube Live and Webex are recognised). Four-step flow, host perks
   and host guidelines.
3. **The Journal** — articles written and maintained by the SkillCures team; six launch pieces with
   a full-text reader.
4. **Campus ambassadors** — who we look for, what ambassadors do and get, the selection steps, an
   application form and ambassador guidelines.
5. **Community guidelines** — six guidelines (including confidentiality and PvPI for suspected ADRs),
   the enforcement ladder and how to report.
6. **Resume library** — annotated resumes by role with numbered "why it works" notes, a checklist and
   a review CTA. Current resumes are **illustrative samples** and are labelled as such.

### Forms

All forms validate in the browser and POST JSON to `FORM_ENDPOINT` in `src/community/content.js`.
While it is `null`, the page says the entry is valid but **nothing was sent** — set it to your form
service (or API route) to start receiving submissions. The join form hands the email to `/signup/`.

### 3D sections

| # | Section | Swarm becomes | Babylon.js set piece |
|---|---------|---------------|----------------------|
| 0 | Hub | the hero portrait in pixels | the six features orbiting the head |
| 1 | Events map | India as a dot-matrix | beacons sized by events per city, an "Online" halo |
| 2 | Events | a halo | ring of all 18 event cards (drag / filter / step) |
| 3 | Sessions | a lecture hall | stage, light cone, the four formats |
| 4 | Your link | a vortex into a portal | the four steps along the stream, a live session screen |
| 5 | Journal | an open book | six article pages fanned above it (click to read) |
| 6 | Ambassadors | a globe of campuses | ambassador beacons |
| 7 | Guidelines | a protective dome | six monoliths, one per guideline |
| 8 | Resumes | a pinboard wall | six resume sheets with numbered notes |
| 9 | Join | a ring with a gap | "you" flies in and fills it |

| What | File |
|------|------|
| All copy (both pages) | `src/community/content.js` (+ `data.js` for the community event list) |
| Form handling, calendar files | `src/community/forms.js` |
| 2D page | `community/index.html`, `src/community/classic/` |
| 3D page | `community/3d.html`, `src/community/main3d.js`, `src/community/style.css` |
| 3D layout / formations / set pieces | `src/community/engine/{layout,formations,pieces}.js` |
| 3D canvas artwork | `src/community/engine/{art,art2}.js` |
| Engines, camera rig, picking | `src/community/engine/{stage,swarm,index}.js` |

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
