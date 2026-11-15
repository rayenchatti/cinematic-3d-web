---
name: cinematic-3d-web
description: Direct and build cinematic, scroll-driven 3D scenes and websites (React Three Fiber, three.js, Framer Motion, Next.js) that match what the person actually pictures — first time, without rounds of "no, not like that". Turns loose descriptions ("make it epic", "the logo gets sucked into a vortex", "like an Apple product reveal", "everything should feel underwater") into a precise shot-by-shot scene spec, confirms it, then builds it on a proven pinned-scroll architecture with shaders, particles, camera moves and synced text. Includes a full production portfolio as a worked example and template. Use this whenever someone wants a 3D website, landing page, product reveal, portfolio, scroll animation, scroll-telling page, WebGL/three.js scene, "cutscene"-style transition, animated hero, or awwwards-style motion — even if they only describe the feeling they want and never say "3D" or "scroll".
---

# Cinematic 3D web scenes

People describing animation use feeling-words ("epic", "smooth", "it gets swallowed", "like a
movie"). Code needs exact decisions: what's on screen, where the camera is, what moves, how fast,
on which easing, lit how, and what the text does at each point of the scroll. When those
decisions are left to guesswork the result is technically fine but *not what they pictured* —
and each correction round costs more than getting it right up front.

This skill closes that gap in two moves: **direct before you build** (turn the description into
a precise, confirmed scene spec) and **build on a proven base** (an architecture and technique
library that make the spec reliable to implement and smooth to scroll).

It works for any scene and any style — realistic ruins, clean product shots, neon tech, toon
worlds, editorial minimalism. The bundled portfolio (a laptop that opens, an orbiting skills atom,
logos that ignite and burn, a black-hole tunnel) and the realistic ruin door in `examples/` are
worked examples of the method, not a menu to pick from.

## Files

```
references/scene-language.md   precise motion vocabulary + translations of vague words into specifics
references/scene-spec.md       the scene spec / storyboard format, with worked examples
references/techniques.md       how to build each kind of effect (camera, shaders, particles, text…)
references/architecture.md     the pinned-scroll scene pattern, timelines, performance, gotchas
references/styles.md           the style families (realistic, studio, neon, stylised, editorial, dreamy) and how to ask
references/house-style.md      the neon cinematic style as exact values, and how to pick up a style from references
references/effects.md          the template's finished scenes, dissected — copy or learn from them
examples/ruin-door/            a realistic scene: ancient stone door, fog, dust, real light (code + notes)
references/portfolio.md        building a full portfolio from the template
references/content-guide.md    the template's content fields
references/portrait-rig.md     the template's living-portrait hero
template/                      complete Next.js portfolio site (the worked example)
scripts/create-site.mjs        starts a new single-page site (Next.js, house background, ready for scenes)
scripts/new-scene.mjs          scaffolds a new pinned scene (section + timeline, + 3D canvas unless --no-canvas)
scripts/video-frames.mjs       pulls frames out of a reference video so you can study the motion
scripts/create-portfolio.mjs   copies the full portfolio template into a new folder
scripts/retheme.mjs            recolours the template's accent family
```

## The workflow

### 1. Understand what they picture

Read the request for: what the page is for, what each scene should *show*, the feeling, any
references (sites, videos, images, films, games), and any hard constraints (existing site,
framework, brand colours).

If they gave a reference, study it before anything else — it carries more information than any
description. Images: look at them. Video: run `scripts/video-frames.mjs` and look at the frames
in order (see "Reading a reference video" below). Website: if you can open it, scroll it and
screenshot it at intervals. Note the style (colour, light, type, background motion) separately
from the choreography (what moves when) — people usually want one or the other from a reference,
and you should ask which if it isn't clear.

**Settle the style before anything else.** The style changes every later decision — light,
materials, colour, atmosphere, pacing — so it can't be left to a default. Read
`references/styles.md`.
- If the person named a style, showed a reference, or the request makes it unmistakable
  ("photorealistic forest"), use that.
- **Otherwise ask them, as a question with options**, before writing the spec. Use the
  environment's question tool if there is one (a multiple-choice prompt), otherwise ask in text.
  Offer the style families from `styles.md` with a one-line description each, put the one that
  best fits their subject first and mark it recommended, and allow "describe your own / share a
  reference". Ask nothing else in that message unless another answer is just as essential.
- Only if you can't ask at all (a one-shot or automated run), pick the family that fits the
  subject and say so under "Choices I made".

Never fall back to the neon/glow look just because it's the house style — it's one option, for
requests that call for it.

### 2. Translate it into a scene spec

Read `references/scene-language.md`, then write the spec in the format from
`references/scene-spec.md`. For every scene: the idea in one sentence, the objects, the style
(the family from step 1 with its concrete values), and a **beat sheet** — what is on screen at each stretch of scroll (0–15%,
15–40%, …), with the camera move, the motion (verb + easing + duration), the light/colour change,
the effects (particles, distortion, glow) and what the text does.

Vague words get resolved here, not in code. "It gets sucked in" becomes: *the title letters
spiral toward screen centre, each starting when the vortex's edge reaches it, rotating 150°
while shrinking to 15% and blurring to 6px over 10% of the scroll; the background warps toward
the centre in the same window*. If a word could mean two quite different things, offer the two
concrete readings and pick the likelier one as the default.

### 3. Confirm before building

Show the spec to the person — it takes them a minute to read and saves hours. Ask them to correct
anything that isn't what they pictured, especially pacing (too fast / too slow) and the key
moment of each scene. Keep the message short: the beat sheet plus 2–3 targeted questions with
your default answers, so "yes, go" is a valid reply.

If you can't ask (a one-shot or automated request), go ahead with your defaults and include the
spec in your final message so the person can redirect precisely.

### 4. Build in layers

Read `references/architecture.md` before writing code — start with its "does this need WebGL at
all?" table — and `references/techniques.md` for each effect in the spec.

Where the code goes:
- **A new site** (landing page, product page, any single page): `node <skill-dir>/scripts/create-site.mjs <folder>`
  makes a ready Next.js project with the house background, fonts and lint setup; add scenes to it.
- **An existing site**: work in their project and read "Working inside an existing site" in
  `architecture.md` first.
- **A full portfolio**: start from the template (`references/portfolio.md`).

Then build each scene in this order, checking after each layer:

1. **Blockout** — the pinned section, the scroll timeline with one slot per beat, placeholder
   shapes and the camera path. `scripts/new-scene.mjs <project> <Name> --beats N` generates this
   skeleton, already wired (scroll progress → shared timeline → 3D camera and DOM captions,
   reduced-motion fallback, paused when off-screen); add `--no-canvas` for DOM-only effects.
   Scroll through it: are the beats in the right order and pace?
2. **Motion** — the real movements and transitions, with their easings and durations from the
   spec. Timing is what people react to most; get it right before making it pretty.
3. **Look** — materials, light, colour, glow, particles, background, typography.
4. **Polish** — pointer lean, idle drift, small secondary motion, mobile framing, reduced motion.

Run `npm run lint` along with the build — the React rules catch per-frame mutation mistakes
before they become subtle bugs.

### 5. Verify against the spec

Build (`npm run build`), run it, and screenshot every beat at its scroll position. Compare each
screenshot to the beat sheet line by line: is that object there, is the camera framed as
described, is the text in, is the colour right? Fix what doesn't match before showing it. Wait a
second after scrolling before each screenshot — scenes ease into place. Also check a phone-sized
viewport (375×812) and reduced motion. If you have no browser tool, say plainly that the scenes
were built but not looked at, and list what to check.

### 6. Refine with precise language

When the person reacts ("it feels cheap", "too much", "not dramatic enough"), translate the
feedback with `scene-language.md` the same way as the original request, propose the specific
change ("slow the dive from 8% to 14% of the scroll and add a 0.3s hold before it"), then make it.
Change one thing at a time when they're unsure, so they can tell what helped.

## Reading a reference video

```bash
node <skill-dir>/scripts/video-frames.mjs <video> --every 0.25 --out frames/
```

It needs `ffmpeg` (the script explains how to install it if missing). Look at the frames in
order and write down, per stretch of time: what's on screen, what moved and how (direction,
speed, easing — does it accelerate, overshoot, settle?), the camera (static, push, orbit,
shake), cuts vs continuous moves, and the colour/light. That list *is* the first draft of the
beat sheet. For fast moments, re-run with `--every 0.04` over just that stretch (`--from`, `--to`).

## Non-negotiables

These come from real failures; each one has a reason in `architecture.md`.

- Every scene has a reduced-motion version (a static layout that still shows all the content).
- WebGL loads client-only and pauses when its section is off-screen or the tab is hidden.
- 3D and DOM text read the same timeline functions, so they can't drift apart.
- Scroll-linked values inside pinned sections use function transforms, not range arrays.
- The style is chosen by the person (or the subject), never defaulted to neon; and the scene
  stays inside its style family — no glow lines in a realistic scene, no grime in a studio shot.
- Where glow is part of the style, fake it (additive halos) rather than post-processing bloom,
  unless the person accepts the cost.
- All the page's content is real, readable text in the DOM — not baked into canvases only.
- Never invent facts about a person or product in the copy; design text is fine, claims are not.
  Prices, specs, dates, stats and awards you weren't given go in as visible `[placeholders]`.
- Anything that plays by itself (an intro on load) has a visible skip control, and every scene
  has a no-WebGL fallback (poster image or static layout).
- In someone's existing site, change only what the effect needs and say what moved.

## Credits to keep

The template credits its original author and the open-source pieces it builds on (React Bits for
ColorBends and Magnet, the type pairing after dungyov.com). Keep those credits when reusing
those parts.
