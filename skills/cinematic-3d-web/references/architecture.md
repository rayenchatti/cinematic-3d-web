# Architecture of a scroll-driven scene

Every scene in this skill is built the same way. The structure is what makes a scene feel smooth
and stay in sync, so build new scenes on it even when the visuals are completely different.
`scripts/new-scene.mjs` generates all of the pieces below, already wired together.

## Stack

React 19, Next.js App Router, TypeScript, Tailwind CSS v4, Framer Motion 12, three.js +
@react-three/fiber 9 + @react-three/drei 10. Optional: ogl (tiny WebGL, used by the portrait),
@react-three/postprocessing (only if real bloom is needed), lucide-react icons.

```bash
npm i framer-motion three @react-three/fiber @react-three/drei
npm i -D @types/three
```

Works the same in Vite + React (see "Outside Next.js" at the end).

## First: does this need WebGL at all?

Pick the lightest layer that can produce the spec — it decides the whole structure:

| The effect is… | Build with | Examples |
|---|---|---|
| Flat page elements moving, splitting, masking, blurring | **DOM + Framer Motion / CSS** (no canvas) | text shredding or scrambling, cards stacking, image wipes, logo ignite/burn with masks, parallax layers |
| A full-screen image effect (warp, ripple, noise, colour bands) | **One full-screen shader** (ogl or a single three.js quad) | animated backgrounds, liquid distortion over an image, page warp |
| Objects in depth, a moving camera, lighting, particles in 3D | **React Three Fiber** | product reveals, tunnels, orbits, assembling objects |

DOM effects keep text selectable and accessible for free, cost almost nothing, and don't need
client-only loading. Use `new-scene.mjs --no-canvas` to get the pinned section and timeline
without a 3D scene. Mix layers when a scene needs both (3D object + DOM captions is the norm).

## The four pieces

```
<Name>Section.tsx    pinned wrapper: owns the scroll progress, DOM text, HUD, reduced-motion fallback
<Name>Scene.tsx      the <Canvas>: camera rig + objects, reads progress every frame
<name>Timeline.ts    pure functions/numbers: beats, slots, camera keys — read by both of the above
(page.tsx)           places the section in the page
```

### 1. The pinned section

A tall wrapper with a sticky, full-screen stage. The wrapper's height *is* the scene's length.

```tsx
const ref = useRef<HTMLDivElement>(null)
const { scrollYProgress: progress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
const active = useInView(ref, { margin: '200px' })   // run the canvas only when near the screen

return (
  <section id="scene" ref={ref} style={{ height: '500dvh' }} className="relative">
    <div className="sticky top-0 h-dvh w-full overflow-hidden">
      <Scene progress={progress} active={active} />
      {/* DOM captions, backdrop title, HUD — all driven by `progress` */}
    </div>
  </section>
)
```

`progress` goes 0 → 1 between the moment the stage pins and the moment it releases. Use `dvh`,
never `vh` — mobile browser bars change the viewport height.

**Content taller than the screen** (common on phones when a pinned stage holds real page content,
e.g. a hero with cards): don't force it into `h-dvh` with `overflow-hidden` — content gets cut
off. Pin it by its bottom edge instead: let it scroll normally until its bottom reaches the bottom
of the screen, then hold.

```tsx
// measure the stage; stick at a negative top so its bottom edge lines up with the viewport bottom
const [stageH, setStageH] = useState(0)
useLayoutEffect(() => {
  const el = stage.current!; const ro = new ResizeObserver(() => setStageH(el.offsetHeight)); ro.observe(el)
  return () => ro.disconnect()
}, [])
<div ref={stage} className="sticky" style={{ top: `min(0px, calc(100dvh - ${stageH}px))` }}>…</div>
```

and make the wrapper `stageH + scrollLength` tall instead of `N × 100dvh`. Use
`offset: ['start start', 'end end']` as before; progress still runs 0 → 1 while it's held.

### 2. The scene (canvas)

```tsx
const Scene = dynamic(() => import('./NameScene'), { ssr: false })  // in the section file

// NameScene.tsx
<Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 8], fov: 45 }} frameloop={active ? 'always' : 'never'}>
  <CameraRig progress={progress} />
  <Objects progress={progress} />
</Canvas>
```

Inside `useFrame`, read `progress.get()` — a MotionValue read, no React re-render. Never call
`setState` per frame; for things that change a few times per scene (which item is lit), use
`useMotionValueEvent` and only set state when the value actually changes (`Atom` in `SkillsScene.tsx`).

### 3. The shared timeline

```ts
export const COUNT = items.length
export const INTRO_END = 0.12, OUTRO_START = 0.94
export const SLOT = (OUTRO_START - INTRO_END) / COUNT
export const slotOf = (i: number) => {
  const start = INTRO_END + i * SLOT
  return { start, arrive: start + SLOT * 0.3, leave: start + SLOT * 0.8, end: start + SLOT }
}
export const activeIndex = (p: number) => (p < INTRO_END ? -1 : Math.min(COUNT - 1, Math.floor((p - INTRO_END) / SLOT)))
export function cameraAt(p: number) { /* keyframes */ }
```

The camera (in the scene) and the captions (in the section) both call these. If timing changes,
it changes in one place and nothing drifts. Derive everything from the item count so content can
grow without retuning (and make the section height grow with it: `(COUNT + 2) * 100dvh`).

### 4. Reduced motion

`useReducedMotion()` in the section; when true, render a normal, unpinned layout with all the same
content (a list, a grid, a static image of the key moment). Don't mount the canvas at all.

## Rules that came from real bugs

- **Function transforms on pinned ranges.** `useTransform(progress, [a, b], [0, 1])` lets Framer
  Motion hand the animation to the browser's native ScrollTimeline, which mis-maps ranges inside a
  sticky container (titles stay half visible). Write `useTransform(progress, (v) => range(v, a, b))`.
- **Client-only WebGL.** `next/dynamic(..., { ssr: false })` for every canvas component; `'use client'`
  on every file with hooks.
- **Pause what isn't visible.** `frameloop` from `useInView`; skip work when `document.hidden`.
- **Seeded randomness.** Random values that reach server-rendered markup must be deterministic and
  rounded (`rand(seed)` in `ProjectsSection.tsx`), or hydration fails. WebGL-only randomness can be
  generated once at module level.
- **Clamp delta time.** `Math.min(dt, 0.05)` in every `useFrame` — the first frame after a tab
  switch can be seconds long and makes things jump.
- **Damp, don't set.** Camera, pointer and anything following the scroll moves toward its target
  with `1 - exp(-k * dt)`; setting it directly makes scroll jitter visible.
- **Listen on `window`** for pointer input. A fixed background with `pointer-events: none` never
  receives events itself, and per-element listeners can't tell when the cursor is merely near.
- **Fonts in canvases**: read `getComputedStyle(document.body).fontFamily` — `next/font` renames
  families, so a hard-coded family name silently falls back.
- **Text stays in the DOM.** Canvas-drawn text duplicates DOM text, never replaces it.
- **Dispose** what you create by hand (geometries, materials, textures, renderers) in effect cleanups.
- **One heavy canvas at a time.** Sections pause when off-screen, so a page can have many scenes;
  avoid two heavy canvases visible together.
- **Mutate through refs.** Per-frame changes (shader uniforms, scratch vectors, particle arrays)
  go through `useRef` values or refs to the three.js objects. Mutating a `useMemo` result after
  render fails the React lint rules (`react-hooks/immutability`).
- **Damp angles for orbits**, not positions — see the orbit rig in `techniques.md`.
- **Reduced-motion version renders from the first paint** when possible (a CSS
  `@media (prefers-reduced-motion: reduce)` rule, or render the static branch by default and
  upgrade after mount), so motion-sensitive visitors don't see a flash of the animated layout.

## Working inside an existing site

The person's site is theirs; the scene should slot in, not redesign it.

- Change only what the request needs. Keep their copy, classes, colours, fonts, spacing and
  element order, unless the effect can't work without a change — then make the smallest one
  and say exactly what moved and why, in the reply.
- When the effect needs a layout change ("revealing the cards underneath" means the cards must
  sit under the paragraph), prefer doing it *only while the effect runs* and restoring the
  original layout for reduced motion and after the scene ends.
- Match their stack: their framework, their CSS approach, their animation library if they have
  one. Add a dependency only when it earns its weight (three.js for a real 3D scene, yes;
  framer-motion for one CSS-able effect, think twice) and list any you add.
- Keep their accessibility: real text stays real text, links stay links, focus order unchanged.

## Verifying a scene

Scroll positions for each beat come straight from the timeline. In the browser console:

```js
go = (id, f) => { const el = document.getElementById(id); scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) * f) }
go('scene', 0.25)   // then screenshot; repeat for the middle of each beat in the spec
```

Wait ~1s after each jump (damped cameras and reveals need to settle). Check a 375×812 viewport and
reduced motion (DevTools → Rendering → Emulate prefers-reduced-motion).

## Outside Next.js

- **Vite / CRA**: replace `next/dynamic` with `React.lazy` + `<Suspense>`, `next/font` with CSS
  font imports, and the `@/` alias with relative paths (or configure the alias).
- **Tailwind v3**: classes work; swap `@import "tailwindcss"` for the v3 directives.
- **Non-React sites**: mount the scene as a React island (e.g. Astro), or port the vanilla parts
  (shaders, the ColorBends background, the ogl portrait) directly.
