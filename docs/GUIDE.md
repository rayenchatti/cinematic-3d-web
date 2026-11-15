# Cinematic 3D Web — User guide

How to get the scene you picture with as few rounds as possible, and how to use everything in
the skill.

## Contents

1. [How a session goes](#1-how-a-session-goes)
2. [Describing a scene well](#2-describing-a-scene-well)
3. [Using references](#3-using-references)
4. [Reading and approving the plan](#4-reading-and-approving-the-plan)
5. [Giving feedback that works](#5-giving-feedback-that-works)
6. [Three ways to work: new site, existing site, portfolio](#6-three-ways-to-work)
7. [Scripts reference](#7-scripts-reference)
8. [Running, checking and deploying](#8-running-checking-and-deploying)
9. [Troubleshooting](#9-troubleshooting)
10. [Cheat sheet: words that get precise results](#10-cheat-sheet-words-that-get-precise-results)

---

## 1. How a session goes

1. **You describe** what you want, as loosely or precisely as you like. A reference helps a lot.
2. **Claude replies with a scene spec**: a table of what's on screen at each stretch of scroll
   (camera, motion, light/effects, text), the key moment, the choices it made, and 2–3 questions
   with default answers.
3. **You approve or correct it.** "Yes, go" is enough. Corrections here are cheap; nothing has
   been built yet.
4. **Claude builds** in layers (blockout → motion → look → polish), runs lint and the build, and,
   if it has a browser tool, screenshots each beat and checks it against the plan.
5. **You react, Claude refines.** It translates "feels cheap" or "too much" into a specific change.

If you say "just build it" or Claude can't wait for an answer, it goes ahead with its defaults
and puts the spec in its final message, so you can still redirect precisely.

## 2. Describing a scene well

You don't need special words; the skill translates. But the first result gets much closer when
your description covers these points. One sentence each is plenty:

| Tell it… | Example |
|---|---|
| **What the page is for** | "Launch page for our new sneaker" |
| **The subject** | "The shoe itself, front and centre" |
| **What happens as you scroll** | "It assembles from floating pieces, then the camera circles it" |
| **The key moment**: the one frame that must land | "The moment it's complete and lights up" |
| **The style** | "Realistic, like an ancient ruin", "clean product shot", "neon", "toon". If you skip it, Claude asks you to pick one |
| **The feeling** | "Futuristic, but clean, not cluttered" |
| **The text** | "Four features appear while it turns" |
| **Constraints** | "Brand colour #D4FF3A, our site is Next.js, must work on phones" |
| **What you *don't* want** | "No bouncy, cartoony motion" |

### Templates you can copy

**A new page**
> Build a [landing page / hero / section] for [what]. As you scroll, [what happens, in order].
> The key moment is [the frame that must land]. It should feel [feeling]. Colours: [brand colours
> or "your call"]. Text: [what copy appears, or "placeholders"].

**A single effect on your site**
> On my [Next.js / React] site (in this folder), make [element] [what it does] as you scroll.
> Keep everything else the same.

**Plan only**
> I want [scene]. Don't build anything yet; tell me exactly what you'd do so I can approve it.

## 3. Using references

A reference is the fastest way to share a style or a motion. When the creator of this skill
built their own site, a reference video was what finally made the AI understand the look.

- **Website you like**: paste the URL and say *which part* you mean ("the way the camera moves
  through the product", "the colours and the glowing background").
- **Image / screenshot**: attach it and say whether you want the *style* (colour, light, type)
  or the *composition*.
- **Video** (screen recording, film clip, trailer): put the file in your project and ask Claude
  to study it. It will run:

  ```bash
  node <skill-dir>/scripts/video-frames.mjs ref.mp4 --every 0.25 --out frames
  ```

  and read the frames in order: what's on screen, what moves and how, camera moves, cuts, colour.
  That becomes the first draft of the plan. For a fast moment it zooms in with
  `--every 0.04 --from 3.2 --to 4.0`.

  This needs **ffmpeg**: `winget install Gyan.FFmpeg` (Windows), `brew install ffmpeg` (macOS),
  `sudo apt install ffmpeg` (Linux). Open a new terminal afterwards.

**Recording a reference:** use your OS screen recorder (Win+Alt+R on Windows, Cmd+Shift+5 on macOS)
while scrolling the site slowly and steadily. 10–20 seconds is plenty.

Always say whether you want the reference's **style**, its **choreography** (what moves when), or
both. People usually mean one of them.

## 4. Reading and approving the plan

The spec looks like this (one scene):

| Scroll | On screen | Camera | Motion & change | Light / FX | Text |
|---|---|---|---|---|---|
| 0–8% | Parts float as wireframe holograms | Wide, slightly high | Idle bob and spin | Grid floor scan band | Big outlined title |
| 8–45% | Parts assemble one by one | Slow push-in to 3/4 view | Each backs off, glows, then flies home and snaps in | Ring of light on each snap | Assembly counter |
| **49–53%** | **Ignition: light runs heel to toe** | Holds on profile | Flash, pulse ring across the floor | — | Title rises out of a mask |

What to check, in order of importance:

1. **The key moment.** Is that the frame you imagined? This is the one to get right.
2. **Pacing.** Percentages are shares of the scene's scroll. "Section length: 9 screens" means
   about eight full scrolls. Too long feels slow; too short and things flash past.
3. **Order of events.** Does it build up, hit the moment, then let you breathe?
4. **"Choices I made"**: colours, materials, placeholder text, a stand-in model. Correct any you
   disagree with.
5. **The questions.** Answer them, or say "defaults are fine".

Good corrections are specific: *"Make the assembly faster, about half as long, and hold longer on
the finished shoe before the orbit."*

## 5. Giving feedback that works

Claude translates vague feedback, but naming *what* and *which direction* saves a round:

| Instead of… | Try… |
|---|---|
| "It feels cheap" | "The explosion has no build-up" / "the materials look flat" / "the text appears too abruptly" |
| "Too much" | "Fewer particles" / "slower camera" / "only one effect at a time" |
| "Not dramatic enough" | "Bigger scale difference" / "add a flash on impact" / "darker before the reveal" |
| "Make it smoother" | "The camera jitters when I scroll fast" / "the text pops in, make it fade" |
| "I don't like it" | "I imagined the camera *inside* the tunnel, not watching it from outside" |

Change one or two things per round when you're unsure, so you can tell what helped.

## 6. Three ways to work

### A. A new site or page

Claude starts a project with `create-site.mjs` and builds the scenes into it. You get a Next.js
app with a dark cinematic base, an animated background, fonts and lint already set up.

### B. Your existing site

Claude works in your project. It follows a strict rule: **change only what the effect needs**,
match your stack and styling, keep your text real and accessible, and tell you exactly what it
moved. Works best with React/Next.js; other stacks can host a scene as a React island.

### C. A full portfolio

Ask for a portfolio and Claude starts from the bundled template, a complete 3D portfolio:
- living-portrait hero;
- laptop scene;
- experience timeline;
- skills orbits;
- burning project logos;
- black-hole achievements tunnel;
- contact section with a working form.

It fills in your content from a CV or a short brief and recolours it to your accent. See
[`references/portfolio.md`](../skills/cinematic-3d-web/references/portfolio.md). Empty sections
(no awards, no CV, no photo) disappear cleanly.

## 7. Scripts reference

All scripts are plain Node.js (20.9+), no install needed. Paths are relative to the skill folder.

### `scripts/create-site.mjs`: start a new page

```bash
node scripts/create-site.mjs ../volt-x --title "VOLT X" --scene Assembly --beats 4
```

| Option | Meaning |
|---|---|
| `--title` | Page title and hero heading |
| `--scene Name` | Also scaffold a first scene and put it on the page |
| `--beats N` | Beats in that first scene (default 4) |
| `--no-background` | Skip the animated colour-band background |

The project gets its own copies of `new-scene.mjs` and `retheme.mjs` in `scripts/`.

### `scripts/new-scene.mjs`: scaffold a scene

```bash
node scripts/new-scene.mjs . Reveal --beats 5            # pinned section + timeline + 3D canvas
node scripts/new-scene.mjs . Shred --beats 2 --no-canvas # same, without WebGL (for DOM effects)
```

Generates `RevealSection.tsx` (pinned stage, captions, counter, progress rail, reduced-motion
version), `RevealScene.tsx` (camera rig with damping, pointer lean, placeholder object, glow) and
`revealTimeline.ts` (every timing number, shared by both). Options: `--beats`, `--screens`
(section length), `--id` (anchor id).

### `scripts/video-frames.mjs`: study a reference video

```bash
node scripts/video-frames.mjs ref.mp4 --every 0.25 --from 0 --to 12 --width 960 --out frames
```

Writes numbered JPEGs and `index.txt` with each frame's timestamp. Needs ffmpeg.

### `scripts/create-portfolio.mjs`: the full portfolio

```bash
node scripts/create-portfolio.mjs ../my-portfolio
```

Then edit `src/content.ts` (see `references/content-guide.md`).

### `scripts/retheme.mjs`: change the accent colour

```bash
node scripts/retheme.mjs ../my-portfolio --accent "#14B8A6"          # main accent becomes exactly this
node scripts/retheme.mjs ../my-portfolio --accent "#14B8A6" --keep-brightness  # hue only, keep neon glow
node scripts/retheme.mjs --accent "#8B5CF6" --show "#FF3B3B" "#7A0000"  # just print the matching shades
```

Moves the whole family of ~16 accent shades (glows, shadows, shader colours) together, and can
be run again to switch colours. Gold/silver/bronze badges and greys are left alone.

## 8. Running, checking and deploying

```bash
npm install
npm run dev     # http://localhost:3000, live reload
npm run lint    # catches per-frame mistakes in 3D code
npm run build   # production build: type-checks and prerenders
```

**Check every scene, not just the top of the page.** Pinned scenes only show their content part
way through their scroll. Jump around from the browser console:

```js
go = (id, f) => { const el = document.getElementById(id); scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) * f) }
go('reveal', 0.5)   // halfway through the scene with id="reveal"
```

Also try a phone size (DevTools → device toolbar, 375×812) and reduced motion (DevTools →
Rendering → *Emulate CSS prefers-reduced-motion*).

**Deploy:** push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new); keep
the detected Next.js settings. Any static host that runs Next.js works.

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| A scene is blank / only shows the background | Scroll *into* the pinned section: content appears part way through. If it's still blank, check the browser console for WebGL errors. |
| Text in a scene stays half-visible | A range-array `useTransform` inside a pinned section. Ask Claude to switch it to a function transform (the skill's rule). |
| Lint error `react-hooks/immutability` | Per-frame changes must go through refs, not `useMemo` objects. Ask Claude to apply the ref pattern from `techniques.md`. |
| Camera jumps through the object on fast scroll | Orbits should damp the angle, not the position. The skill's orbit rig fixes it. |
| Laptop fans spin / phone gets hot | Too many particles or an un-paused canvas. Ask for the performance budget in `techniques.md` to be applied. |
| `video-frames.mjs` says ffmpeg is missing | Install it (section 3) and open a new terminal. |
| The 3D product looks generic | It's a stand-in. Give Claude a `.glb` model, ideally split into named parts. |
| The style isn't what you imagined | Give a reference and say "match the style of this". |

## 10. Cheat sheet: words that get precise results

You can always use plain language. These words just remove guesswork.

**Camera:** *push in / pull out* (move closer/away) · *orbit* (circle around) · *crane up*
(rise) · *truck* (slide sideways) · *fly through* (travel inside) · *hold* (stay still) ·
*long lens* (flat, premium) · *wide lens* (dramatic depth) · *handheld drift* (subtle life).

**Motion:** *ease-out* (fast start, soft landing: premium) · *ease-in* (slow start, fast exit:
falling, getting sucked in) · *spring / overshoot* (playful bounce) · *stagger* (one after
another) · *anticipation* (a small move back before the big one) · *hold* (pause to read).

**Transitions:** *crossfade* · *blur-through* · *mask wipe* · *morph* · *dissolve (burn away)* ·
*shatter* · *particle reform* · *vortex / consume* · *fly-through* · *flash on impact*.

**Light:** *rim light* (outline glow from behind) · *low-key* (dark, dramatic) · *high-key*
(bright, airy) · *emissive* (glows by itself) · *fog / haze* · *grain, vignette*.

**Pacing:** "about N scrolls" for a scene's length · "hold for one scroll on X" · "faster build,
longer hold".

The full vocabulary, with what each feeling-word usually means, is in
[`references/scene-language.md`](../skills/cinematic-3d-web/references/scene-language.md).
