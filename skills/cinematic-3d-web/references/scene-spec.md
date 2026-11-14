# The scene spec

A scene spec is what you show the person before building. It is short enough to read in a minute
and precise enough that two developers would build the same thing from it. It is also your
checklist when you verify the result.

## Format

```markdown
## Scene N — <name>

**Idea:** one sentence — what the visitor experiences.
**Style:** house style | <style summary from references>  (accent: #hex)
**Objects:** each 3D object / DOM element in the scene, with size and material in a few words
**Section length:** <H> screens pinned  (≈ <H-1> screens of scroll)

| Scroll | On screen | Camera | Motion & change | Light / FX | Text |
|---|---|---|---|---|---|
| 0–12% | … | … | … | … | … |
| 12–40% | … | … | … | … | … |
| … | | | | | |

**Key moment:** the one frame that must land (e.g. "the flash at 38% as the core breaks").
**Interaction:** pointer, hover, click behaviour (or "none").
**Mobile:** what changes below 768px wide.
**Reduced motion:** the static version.
**Fallbacks & control:** what shows without WebGL (poster image / static layout), and for anything
that plays by itself (an intro on load, an auto-running sequence): a visible skip control, any
scroll/key/click skips, and whether returning visitors see it again.
**Choices I made:** anything the person didn't specify, so they can correct it.
```

Every cell should be decidable: an object, a direction, a distance, a scroll window or duration,
an easing, a colour. If a cell says "cool effect" or "animates nicely", it isn't finished.

Add 2–3 questions after the spec, each with your default, e.g.: "Pacing: about 5 scrolls for the
whole scene — slower or faster?" Questions about the **key moment** and **pacing** are the most
valuable; people rarely object to materials.

---

## Worked example 1 — a scene from the template, written as a spec

The portfolio's achievements section (`template/src/components/AchievementsSection.tsx`,
`PortalScene.tsx`, `portalTimeline.ts`). This is the spec that produces it — compare the two to
see how each cell becomes code.

## Scene — Black-hole portal

**Idea:** the section title gets swallowed by a black hole that tears open in the page; the camera
dives through it into a tunnel where each achievement is a glowing gate that rushes past.
**Style:** house style (accent #FF3B3B; gates use tier colours gold/silver/bronze)
**Objects:** huge faded title "ACHIEVEMENTS"; portal (vortex disc r=1.6, spinning ring, halo, 220
orbiting sparks); 900 debris points spiralling in; tunnel of 26 thin rings; one segmented gate
(6 arcs, r=2.6) per achievement, 12 units apart; 700 light streaks; floating typography cards.
**Section length:** achievements + 2 screens pinned

| Scroll | On screen | Camera | Motion & change | Light / FX | Text |
|---|---|---|---|---|---|
| 0–3% | Title over the page background | z=14, still | — | — | Title at rest |
| 3–11% | Portal tears open: thin horizontal slit, then widens to a full disc | still | Slit scales X 0→1 (smoothstep), then Y 0.015→1 | Halo pulses brighter as it opens; page background starts spiralling toward centre | Title letters start spiralling in, nearest to centre first: rotate up to 150°, shrink to 15%, blur 6px, fade in the last 20% |
| 12–20% | Vortex dissolves from the centre, tunnel visible through it | Dive z=14→4.5 (ease), then →−3 (ease); FOV widens with speed; roll ±0.25 with speed | Debris accelerates inward | Flash (warm radial, screen blend) peaking at 19%; page goes black | Title gone |
| 20–94% | One slot per achievement: card rushes in from depth, holds, flies past | Warp to 7 units before gate i (ease), drift 1.5 units while reading (linear) | Gate i lit 100%, others 30%; gates counter-rotate | Streak length ∝ camera speed | Card: rank outline + title + result, each layer scaling at its own depth (0.12→1→3.6), blur 10→0, tilt −30°→−8°; detail list lands with spinning sparkles |
| 94–100% | Tunnel fades, page returns twisted | z → last gate −14 | — | Background twist goes negative (release); next section unwinds it | — |

**Key moment:** the flash at ~19% as the camera breaks through the vortex.
**Interaction:** camera leans toward pointer (±0.35 x, ±0.25 y, damped).
**Mobile:** same scene; cards narrow to 100vw − 2rem.
**Reduced motion:** vertical timeline of cards with a glowing line that draws down; no 3D.

---

## Worked example 2 — a new scene from a vague request

> "I'm launching a coffee brand. When you scroll, the bean should explode and become the cup.
> Make it feel premium."

Translations used (from `scene-language.md`): *premium* → long lens, slow scrubbed rotation,
studio reflections, restrained colour, negative space; *explode … become* → anticipation →
burst into particles → particles reform as the new shape (particle reform transition).

## Scene 1 — Bean to cup

**Idea:** a single roasted bean turns slowly, cracks open with a warm glow, bursts into a cloud of
grains that swirl and condense into a ceramic cup with steam rising.
**Style:** dark warm studio — near-black brown background (#0E0907), accent amber #E8A04C, cream
text #F2E8DC; soft top light + amber rim.
**Objects:** bean (displaced ellipsoid, glossy brown, 1.2 units); 6,000 grain particles (sampled
from the bean's surface, then from the cup's surface); cup (lathe geometry, glazed cream,
1.6 units); steam (3 noise-displaced translucent ribbons).
**Section length:** 5 screens pinned

| Scroll | On screen | Camera | Motion & change | Light / FX | Text |
|---|---|---|---|---|---|
| 0–15% | Bean centre frame, huge faded "ORIGIN" behind | FOV 30, z=6, slow push to z=5 (ease-in-out) | Bean rotates 0→60° on Y (scrubbed, linear) | Amber rim brightens 0.6→1 | Backdrop title fades and scales up 12% |
| 15–30% | Bean cracks along its seam | Holds; handheld drift | Seam opens 0→0.08 units (ease-in) — anticipation | Warm light leaks from the crack (emissive seam 0→2) | Caption 1 blurs in word by word: "Single origin. Roasted this week." |
| 30–45% | Bean bursts into grains | Pull out z=5→7 (ease-out) | Particles take bean surface positions, fly out on curl noise, radius ×4 (ease-out) | Flash at 32% (amber radial, 0.25 peak); particles additive, amber→cream over life | Caption 1 lifts away |
| 45–70% | Grains swirl and condense into the cup | Orbit 40° around Y (ease-in-out) | Each particle eases from its swirl position to a cup-surface position (staggered by height, bottom first) | Particles dim as they land; cup material fades in under them | Caption 2: "Brewed to be savoured." |
| 70–90% | Cup complete, steam rises | Push in z=7→5.5, slight low angle | Steam ribbons rise, noise-displaced; cup turns 15° | Soft top light; amber rim | Product name letters rise out of a mask |
| 90–100% | Hold, hand-off | Still | Steam continues | — | "Shop now" button fades in, magnetic |

**Key moment:** the burst at 32% — flash + particles flying outward.
**Interaction:** pointer tilts the cup/bean ±8° (damped); magnetic CTA.
**Mobile:** camera z +25%; captions below the object instead of beside it.
**Reduced motion:** still image of the cup with steam frozen; captions as a list.
**Choices I made:** grains (not liquid) for the burst; the cup is cream ceramic; 5 screens.

Questions: (1) Burst into dry grains (default) or a splash of liquid coffee? (2) Pacing: about 4
scrolls for the whole transformation — slower? (3) Any brand colours I should use instead of
amber?

---

## Worked example 3 — a mood, not an object

> "Make the hero of my music site feel like being underwater at night."

## Scene 1 — Night water

**Idea:** you're sinking slowly through dark water toward a faint glowing title; light ripples
across the screen and bubbles rise past.
**Style:** deep teal-black (#03131A), accent bioluminescent cyan #4FE3E0, text #DDF4F3.
**Objects:** full-screen caustics plane (shader); 300 bubbles (instanced spheres, refractive);
200 drifting plankton points; title as 3D text with emissive edge.
**Section length:** 3 screens pinned

| Scroll | On screen | Camera | Motion & change | Light / FX | Text |
|---|---|---|---|---|---|
| 0–30% | Dark water, caustic light dancing from above | Sink y=0→−4 (linear, slow) with gentle sway ±0.05 | Bubbles rise past camera (constant upward speed + wobble) | Caustics brightness 0.6, fade with depth; teal fog near=2 far=14 | — |
| 30–65% | Title appears out of the dark below | Continue sinking; FOV 50→45 | Plankton drift on curl noise | Title edge glow 0→1.5 (ease-out); ripple distortion over whole frame strength 0.015 | Title letters fade up from blur 12px, 60ms stagger |
| 65–100% | Title holds, subtitle and play button | Slow drift, pointer lean | Bubbles thin out | Caustics pulse gently with idle time | Subtitle blurs in; play button fades in |

**Key moment:** the title emerging from darkness at ~45%.
**Mobile:** fewer bubbles (150) and plankton (100).
**Reduced motion:** static frame at 65% with title visible, caustics frozen.

---

## Checklist before showing a spec

- Every beat has all six columns filled with decidable values.
- There is an anticipation before every big change, and a hold after it.
- The key moment is named.
- The text is synced to specific beats, and nothing important exists only inside the canvas.
- Section lengths add up to a sensible total (a page with five 6-screen scenes is 30 scrolls —
  is that what they want?).
- Choices you made are listed.
- Reduced motion, no-WebGL fallback and (for anything that plays on its own) a skip control are specified.
- For an existing site: anything in their layout you'd have to move is called out.
- No invented facts: prices, specs, stats, awards or claims the person didn't give are shown as
  `[placeholders]`, not made up.
