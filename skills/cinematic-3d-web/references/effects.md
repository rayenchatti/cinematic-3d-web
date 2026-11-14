# Effects catalogue — the template's scenes, dissected

These are finished, tested scenes. Use them two ways: copy one into a site as it is, or read
it as a worked example of a technique before building something new. Each effect in the template, what a visitor sees, the files it needs from
`template/src/components/`, and how to move it into another project. Read the shared foundations
first; most of the big effects are built on them.

## Contents

1. Shared foundations (read first)
2. Animated shader background — `ColorBends`
3. Living portrait — `PortraitHead`
4. Letter-mask heading — hero `<h1>`, `RevealHeading`
5. Floating laptop scene — `AboutSection` + `DeskScene` + `deskScreens`
6. Skills atom — `ServicesSection` + `SkillsScene` + `skillsTimeline`
7. Project forge — `ProjectsSection`
8. Black-hole portal tunnel — `AchievementsSection` + `PortalScene` + `portalTimeline` + `blackHole`
9. Small pieces — scrub captions, outline-fill headline, magnetic button, glow ring, count-up,
   cursor spotlight cards, fade-in, modals

---

## 1. Shared foundations

The pinned-scene structure, stack and the rules every scene follows are in `architecture.md`
— read it first. What follows here is specific to reusing the template's own components.

**Colours.** The accent is hard-coded red (`#FF3B3B` and its family). After copying files into
another project, either:
- run `scripts/retheme.mjs <project> --accent "#hex"` — it recolours `src/`, or the whole project
  (minus `node_modules` and build output) when there's no `src/`, and writes a small `theme.json`; or
- for just a few values (e.g. the ColorBends `colors` prop), print the matching shades without
  touching any files: `node scripts/retheme.mjs --accent "#8B5CF6" --show "#FF3B3B" "#7A0000" "#3D0000"`.

**Content.** Components import their text from `@/content` (`src/content.ts`). When borrowing a
component, either copy `content.ts` and trim it, or replace the import with props or a local
constant — the shapes are documented in `content-guide.md`.

---

## 2. Animated shader background — `ColorBends.tsx`

Slow, glowing colour bands that warp toward the cursor, fixed behind the whole page. Adapted
from React Bits' *Color Bends*, plus a `uPull` black-hole warp read from `blackHole.ts` every frame.
It listens for the mouse on `window` (so it works inside a `pointer-events-none` layer), pauses
in background tabs, and draws a single still frame under `prefers-reduced-motion`.

- **Files:** `ColorBends.tsx`, `blackHole.ts`. Without the portal effect (any site but the full
  template), remove the black-hole warp completely so no dead code ships — five places, all
  mentioning `uPull` or `blackHole`:
  1. `import { blackHole } from './blackHole'`
  2. in the shader: the `uniform float uPull;` line
  3. in the shader: the block from `// Black-hole pull:` through the closing `}` of
     `if (abs(uPull) > 0.0001) { … }` — keep the lines `vec2 uv = vUv;` (move it above if needed)
  4. in the shader: the block from `// Event horizon:` down to `a *= horizon;`
  5. in the uniforms: `uPull: { value: 0 },` and in the render loop:
     `material.uniforms.uPull.value = blackHole.pull`

  Then search the file for `uPull`, `blackHole` and `horizon` — none should remain.
- **Deps:** `three`.
- **Use:** in the root layout,
  ```tsx
  <div className="fixed inset-0 z-0 opacity-70 pointer-events-none">
    <ColorBends colors={['#FF3B3B', '#7A0000', '#3D0000']} speed={0.2} bandWidth={6} transparent />
  </div>
  <div className="relative z-10">{children}</div>
  ```
  Give `body` a near-black background; the bands are additive light.
- **Tuning:** `speed` (motion), `warpStrength`, `frequency` (band count), `bandWidth` (thickness),
  `mouseInfluence`/`parallax`, `noise` (film grain), `intensity`.

## 3. Living portrait — `PortraitHead.tsx`

A cut-out portrait whose head turns toward the cursor with depth parallax; eyes follow, blink and
glance around when idle.

- **Files:** `PortraitHead.tsx` and the `Portrait`/`EyeRig`/`Ellipse` types from `content.ts`.
- **Deps:** `ogl`, `framer-motion` (only for `useReducedMotion`).
- **Use:** put it inside a box locked to the image's aspect ratio —
  `<div style={{ aspectRatio: \`${p.width} / ${p.height}\` }} className="relative h-[80vh]"><PortraitHead portrait={p} /></div>`.
  The hero's circular frame, glow ring and "head breaks out of the circle" clip are in
  `HeroSection.tsx` (the `borderRadius: '0 0 50% 50% / …'` wrapper).
- **Rig:** follow `portrait-rig.md`.

## 4. Letter-mask heading

Each letter rises out of an invisible mask, staggered.

- **Files:** `RevealHeading.tsx` (on scroll into view) — or copy the `<h1>` block from
  `HeroSection.tsx` (on page load).
- **Deps:** `framer-motion`. Uses the `.eyebrow-label` and `.hero-heading` classes from
  `globals.css`.
- **Detail:** the mask is `overflow-hidden` with `pb-[0.12em] -mb-[0.12em]` so descenders aren't
  clipped; the trigger sits on the parent because clipped letters can't detect the viewport.

## 5. Floating laptop scene

A glossy 3D laptop hovers, opens its lid on scroll, its screen (a live canvas texture) swaps
headlines in step with blur-in captions over the scene, three cards fly out of the screen, embers
rise, and the lid closes as the section ends. Huge faded title behind it.

- **Files:** `AboutSection.tsx` (pinned wrapper, captions, stats), `DeskScene.tsx` (3D),
  `deskScreens.ts` (2D canvas drawings + beat timing), `CountUp.tsx`, `FadeIn.tsx`.
- **Deps:** `three`, `@react-three/fiber`, `@react-three/drei`, `framer-motion`.
- **Timeline:** `beatRange(i)` in `deskScreens.ts` splits scroll 0.2 → 0.86 evenly between bio
  beats; the camera path is `SHOTS` in `DeskScene.tsx` (position + look-at per scroll point); lid,
  cards and embers have their own `smootherstep` windows in the `Laptop`, `FocusCard` and `Embers`
  components. Changing the section height (`h-[400dvh]`) stretches everything together.
- **Reuse the laptop alone:** render `<DeskScene progress={mv} active reduceMotion={false} />` with
  any `MotionValue<number>` 0 → 1 — it doesn't need the captions.

## 6. Skills atom

A glowing core with one tilted orbit per category. The camera swings round to face each ring in
turn; the lit ring spins faster, turns accent-coloured and shows its tags as floating labels,
while the caption on the left blurs in with a sparkle list. Counter and progress rail at the
bottom.

- **Files:** `ServicesSection.tsx`, `SkillsScene.tsx`, `skillsTimeline.ts`, `RevealHeading.tsx`,
  `Sparkle.tsx`, `fonts.ts`.
- **Deps:** `three`, `@react-three/fiber`, `@react-three/drei` (`Html` labels), `framer-motion`.
- **Timeline:** intro 0 → 0.12 (camera swoops in), one equal slot per category, the last 28% of
  each slot is the turn to the next ring, outro 0.95 → 1. Ring tilts are `BASE_TILTS` (six
  hand-picked) then golden-angle spread.
- **Generalising:** it's a good fit for any "N groups of M items" content — services, a tech
  stack, team members.

## 7. Project forge

No WebGL: each project's logo forms in the centre of the screen with a hot band sweeping across
it, glides to its column while the details land one by one (blur-up), holds with live buttons,
then breaks into rising sparks and dissolves before the next one forms. A cursor "torch" lights
the logo. Clicking a rail tick jumps to that project. Optional YouTube demo pop-up.

- **Files:** `ProjectsSection.tsx`, `FadeIn.tsx`, `fonts.ts`, and `range` from `portalTimeline.ts`
  (a one-liner: `clamp01((v - a) / (b - a))` — copy it if not taking the portal).
- **Deps:** `framer-motion`, `lucide-react`.
- **Key trick:** logos are CSS masks (`mask-image: url(logo)`), so three stacked layers — a dim
  etched base, the sweep gradient and the ember gradient — are all clipped to the logo's shape.
  Any transparent PNG/SVG works.
- **Timeline:** `slotOf(i)` gives each project `start`, `live` (buttons clickable) and `burn`
  windows; the last project never burns.

## 8. Black-hole portal tunnel

The section title is torn into: a black hole opens (slit → vortex ring), the page background
spirals into it, each title letter orbits inward and vanishes, a flash, then the camera dives
down a tunnel of rings with warp-speed light streaks, braking at one glowing gate per
achievement while its floating typography rushes in from the depth and flies past. At the end the
page comes back out twisted, and the next section unwinds it.

- **Files:** `AchievementsSection.tsx`, `PortalScene.tsx`, `portalTimeline.ts`, `blackHole.ts`,
  `ColorBends.tsx` (for the page warp), `RevealHeading.tsx`, `Sparkle.tsx`, `fonts.ts`; the
  unwinding is the `entry` scroll handler in `ContactSection.tsx`.
- **Deps:** `three`, `@react-three/fiber`, `framer-motion`, `lucide-react`.
- **Coupling:** `blackHole.pull` is a plain mutable object. The portal writes it from scroll
  (`pullAt(progress)`), the background shader reads it every frame. Positive = swallowing,
  negative = released/twisted. Whatever section follows must bring it back to 0 (the contact
  section does, over its first ¾ screen). Without the background, the tunnel still works — the
  page simply doesn't warp.
- **Timeline:** `portalTimeline.ts` — `PORTAL_OPEN`, `DIVE`, one slot per item (`start`, `arrive`,
  `leave`, `end`), camera z keyframes with eased "brake at each gate" segments.

## 9. Small pieces

| Effect | Where | Notes |
|---|---|---|
| Scroll-scrubbed blur-in caption (word by word, then lifts away) | `ScrubCaption` + `CaptionWord` in `AboutSection.tsx` | Needs a `progress` MotionValue and a `[start, end]` range. |
| Headline that fills in from an outline as you scroll | `ScrubHeadline` in `ContactSection.tsx` | `WebkitTextStroke` outline + filled copy with scroll-linked opacity. |
| Magnetic element | `Magnet.tsx` (adapted from React Bits) | Wrap any element; it starts following once the cursor is within `padding` px of its edges, `strength` = divisor (higher = subtler). Listens on `window`, writes the transform directly (no re-render per move), off on touch screens and with reduced motion. |
| Drawn timeline with alternating cards | `ExperienceSection.tsx` | Line scales with scroll progress; nodes light as the line reaches them. Good for any dated list. |
| Spinning glow ring | `GlowRing.tsx` | SVG circle with gradient stroke + drop-shadow glow. |
| Orbiting accent dot | `HeroSection.tsx`, `RingCta` in `ContactSection.tsx` | A rotating full-size `motion.div` with a dot at its top edge. |
| Count-up number | `CountUp.tsx` | Animates the number inside any string ("30+", "Top 5"). |
| Cursor spotlight card | `Card` in `ContactSection.tsx`, `Milestone` in `AchievementsSection.tsx` | Pointer position → CSS variables → radial gradient. No re-render per move. |
| Fade/slide in on view | `FadeIn.tsx` | |
| Contact form modal with Web3Forms + mailto fallback | `ContactForm.tsx` | Portal to body, Escape closes, scroll lock, honeypot field. |
| CV picker modal | `CvDialog.tsx` | Same modal frame; one card per language. |
| Generated share card | `src/app/opengraph-image.tsx` | `next/og` ImageResponse from content. |

## Using the effects outside Next.js

- **Vite / CRA React:** replace `next/dynamic` with `React.lazy`, replace `next/font` imports in
  `fonts.ts` with CSS `@font-face` or Google Fonts links and export plain `{ className }` objects,
  and swap the `@/` import alias for relative paths (or configure the alias).
- **Tailwind v3:** class names work; replace `@import "tailwindcss"` in `globals.css` with the v3
  `@tailwind` directives.
- **No Tailwind:** the classes would need translating to CSS — doable for the small pieces, a lot of
  work for whole sections. Consider mounting the section as a React island instead.
- **Non-React sites (plain HTML, Vue, Svelte):** `ColorBends` and `PortraitHead` are mostly vanilla
  WebGL inside a `useEffect` and port with modest effort; the R3F scenes are React-specific — embed
  them as a React island (e.g. Astro islands) rather than rewriting.
