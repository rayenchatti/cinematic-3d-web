# Techniques

How to build each kind of thing a scene spec asks for, with React Three Fiber (R3F), three.js,
drei and Framer Motion. Snippets are starting points sized for a pinned scene whose scroll
progress `p` (0 → 1) is read inside `useFrame` with `progress.get()` — see `architecture.md`.

When the template already does something, the entry points at it; reading working code is
faster than reading prose.

## Contents

1. Timeline helpers
2. Camera rigs
3. Objects and materials
4. Light and glow
5. Particles
6. Shaders: distortion, dissolve, displacement, vortex
7. Transitions between shapes (morph, shatter, reform)
8. Backgrounds and atmosphere
9. Text over and inside the scene
10. Interaction
11. Performance budget

---

## 1. Timeline helpers

```ts
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a)) // 0→1 inside [a,b]
export const smooth = (t: number) => t * t * (3 - 2 * t)
export const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeIn = (t: number) => t * t * t
// "in, hold, out" envelope: 0 → 1 across [a,b], stays 1, 1 → 0 across [c,d]
export const envelope = (v: number, a: number, b: number, c: number, d: number) => range(v, a, b) * (1 - range(v, c, d))
```

Every scene's beats are numbers in one timeline file (`scripts/new-scene.mjs` generates one).
Keyframes for anything continuous:

```ts
type Key<T> = { at: number; value: T; ease?: (t: number) => number }
function sample(keys: Key<number>[], p: number) {
  let i = 0
  while (i < keys.length - 2 && p > keys[i + 1].at) i++
  const a = keys[i], b = keys[i + 1]
  const t = (b.ease ?? smoother)(range(p, a.at, b.at))
  return a.value + (b.value - a.value) * t
}
```

The template's `portalTimeline.ts` (camera z keys with eased "brake" segments) and
`skillsTimeline.ts` (intro, equal slots, a turn at the end of each slot, outro) are two complete
examples.

## 2. Camera rigs

**Keyframed shots + damped follow** (the standard rig; `DeskScene.tsx` `CameraRig`):

```tsx
const SHOTS = [
  { at: 0, pos: [0, 3.6, 7.6], target: [0, 1.4, 0] },
  { at: 0.4, pos: [0.6, 2.0, 5.9], target: [0, 1.3, 0] },
  { at: 1, pos: [-2.4, 1.9, 6.1], target: [0, 1.3, 0] },
]
useFrame((state, dt) => {
  sampleShot(progress.get(), goal.pos, goal.target)        // smootherstep between shots
  goal.pos.x += pointer.x * 0.25 + Math.sin(t * 0.4) * 0.05 // pointer lean + handheld drift
  const k = 1 - Math.exp(-5 * Math.min(dt, 0.05))           // damping: never snaps
  state.camera.position.lerp(goal.pos, k)
  lookAt.lerp(goal.target, k); state.camera.lookAt(lookAt)
})
```

- **Orbit/swing between items arranged around a centre**: store each item's facing direction,
  slerp/lerp the direction, multiply by distance, add a dolly-out bulge mid-turn
  (`dist + sin(πt) * 2.4`) — `SkillsScene.tsx`.
- **Orbiting one object (full or partial lap)**: damp the *angle, height and radius*, then convert
  to a position — never damp the position itself. Damping positions on a circle takes the
  straight line between them, so a fast scroll makes the camera cut through the object.

  ```ts
  const goalAngle = startAngle + sweep * smoother(range(p, a, b))   // e.g. sweep = 2π for a lap
  orbit.angle += (goalAngle - orbit.angle) * k                      // same k = 1 - exp(-5 dt)
  orbit.radius += (goalRadius - orbit.radius) * k
  orbit.height += (goalHeight - orbit.height) * k
  camera.position.set(Math.cos(orbit.angle) * orbit.radius, orbit.height, Math.sin(orbit.angle) * orbit.radius)
  camera.lookAt(0, targetY, 0)
  ```

  Stops at features ("hold on the heel") are flat stretches in the goal-angle curve: a keyframe
  table of `{ at, angle }` with holds between, sampled like any other key track.
- **Fly-through**: animate camera z from keys; measure speed `v = Δz/dt` and drive FOV
  (`55 + min(v,45)*0.45`), roll (`clamp(v*0.004, ±0.25)`) and streak length from it — `PortalScene.tsx`.
- **Portrait screens**: when aspect < 1, move the camera back by `(1 - aspect) * 1.4` of its
  distance and widen FOV (35 → 50), or objects get cropped.
- Clamp `dt` (`Math.min(dt, 0.05)`) everywhere — after a tab switch the first frame's dt is huge.

## 3. Objects and materials

- **Primitives first**: `RoundedBox`, `torusGeometry`, `icosahedronGeometry`, lathe for
  cylinders/cups (`new LatheGeometry(points)`), extrude for logos (`ExtrudeGeometry` from an SVG
  via `SVGLoader`), `Text3D` for 3D type (needs a typeface JSON).
- **Glossy dark** (house): `meshStandardMaterial color="#1a1a1d" metalness={0.85} roughness={0.22}`
  plus an `<Environment>` built from `<Lightformer>`s — reflections without downloading an HDR
  (`DeskScene.tsx`).
- **Glass**: drei `MeshTransmissionMaterial` (thickness 0.5–2, chromaticAberration 0.03–0.1,
  roughness 0–0.15). Expensive — one or two objects, not dozens.
- **Emissive parts**: `meshBasicMaterial color={accent} toneMapped={false}` reads as light.
- **Live screens / labels on 3D**: draw on a 2D canvas, use as `CanvasTexture`, redraw only when
  the content changes (`deskScreens.ts`). Set `colorSpace = SRGBColorSpace`.
- **GLTF models**: `useGLTF('/model.glb')` with `<Suspense>`; compress with
  `npx gltfjsx model.glb --transform` (Draco + resized textures). Keep under ~2 MB.
- **When there is no model of the product** (common: a shoe, bottle, device the person only
  described):
  1. Ask whether they have one (a `.glb`/`.gltf`, or a `.fbx`/`.obj`/Blender file to convert) —
     a real model beats anything generated.
  2. If not, build a **stylised stand-in** from primitives: lathe for round things (bottles, cups,
     cans), extruded SVG outlines for flat-profile things (shoes, phones, logos), rounded boxes
     for devices, tubes along curves for straps/laces/cables. Split it into named parts if the
     scene animates parts (assembly, exploded view). Lean into a style that hides the lack of
     detail — wireframe/hologram, glass, emissive edges, low-poly flat shading.
  3. Say clearly that it's a stand-in and where to drop a real model in (one file, same part
     names), so the scene keeps working when it's replaced.
  4. Free models (Sketchfab, Poly Pizza) only when the person agrees and the licence allows it;
     credit them.
- **Many copies**: `instancedMesh` and `setMatrixAt` — one draw call for hundreds (`KeyGrid` in
  `DeskScene.tsx`).

## 4. Light and glow

- **Faked bloom** — a camera-facing quad with an additive radial falloff. Cheap, controllable,
  works on any GPU (`SkillsScene.tsx` `Core`, `PortalScene.tsx` `Halo`):

```glsl
// fragment, on a plane in a <Billboard> group, blending = AdditiveBlending, depthWrite false
float r = length(vUv * 2.0 - 1.0);
float g = pow(max(0.0, 1.0 - r), 2.4);            // soft disc;  ring: exp(-pow((r-R)/W, 2.0))
gl_FragColor = vec4(uColor * g * uIntensity, g);
```

- **Rim light**: a point/spot light behind and to the side, in the accent colour, intensity 6–10.
- **Real bloom** (`@react-three/postprocessing` `<Bloom>`) only when the person accepts the cost
  on low-end phones; it applies to the whole canvas.
- **Fog**: `<fog attach="fog" args={['#000', near, far]} />` — black fog keeps additive glows
  from turning grey with distance.

## 5. Particles

- **Points** for up to ~20k: one `bufferGeometry` with a `position` attribute you update in
  `useFrame`, `pointsMaterial` with a soft round sprite map, `AdditiveBlending`, `depthWrite false`
  (`Embers` in `DeskScene.tsx`, `Debris` in `PortalScene.tsx`).
- **Seeded randomness**: generate seeds once (module level or `useMemo`), never in render.
- **Motion recipes**:
  - rising embers: `y = (t*speed + phase) % 1 * height`, small sine sway
  - orbit/spiral in: angle += dt * k/r, radius −= dt * (a + b/r); respawn at the edge
  - burst: position = origin + dir * easeOut(t) * radius, add curl noise for swirl
  - reform: lerp each particle from its source position to a target position on the new shape
- **Streaks** (speed lines): `lineSegments` with head + tail per particle, tail length ∝ speed,
  tail vertex colour black so it fades under additive blending (`Streaks` in `PortalScene.tsx`).
- **GPU particles** (50k+): move positions in the vertex shader from a time/progress uniform
  instead of rewriting buffers on the CPU.

## 6. Shaders: distortion, dissolve, displacement, vortex

Use `shaderMaterial` (R3F) and update its uniforms in `useFrame` **through a ref to the
material**, not through the object you created the uniforms in. The React lint rules
(`react-hooks/immutability`) reject mutating a `useMemo` value after render, but a ref is fine:

```tsx
const material = useRef<THREE.ShaderMaterial>(null)
const uniforms = useMemo(() => ({ uTime: { value: 0 }, uProgress: { value: 0 } }), []) // created once
useFrame((state) => {
  const m = material.current
  if (!m) return
  m.uniforms.uTime.value = state.clock.elapsedTime        // ✓ through the ref
  m.uniforms.uProgress.value = progress.get()
  // ✗ uniforms.uTime.value = …  fails lint
})
return <shaderMaterial ref={material} uniforms={uniforms} vertexShader={v} fragmentShader={f} />
```

The same applies to any scratch object you mutate per frame (vectors, arrays of particle seeds,
counters): keep it in a `useRef`, not `useMemo`. Write colours into GLSL from JS hex strings so the
theme can change them (`glsl()` helper in `PortalScene.tsx`).

- **Swirl / vortex**: `float a = atan(uv.y, uv.x); float swirl = a + k / (r + 0.15) - t;`
  arms = `sin(swirl * N)`; dissolve the centre with `smoothstep(open - 0.15, open, r)` (`PortalScene.tsx`).
- **Page warp toward a point** (on a full-screen background shader): rotate `uv - centre` by
  `pull * 5 * exp(-dist * 2.2)` and scale toward the centre (`ColorBends.tsx`, `uPull`).
- **Noise dissolve with a hot edge**:
  ```glsl
  float n = noise(vPos * uScale);
  if (n < uProgress) discard;
  float edge = smoothstep(uProgress + uEdge, uProgress, n);   // 1 at the burning edge
  col = mix(col, uEdgeColor * 3.0, edge);
  ```
- **Vertex displacement** (organic, breathing, liquid): in the vertex shader,
  `pos += normal * noise(pos * freq + uTime * speed) * amp`. Recompute nothing on the CPU.
- **Ripple**: `uv += normalize(d) * sin(length(d) * 40.0 - t * 4.0) * 0.004 * falloff`.
- **Chromatic aberration** (cheap): sample the texture three times with small offsets per channel.
- Noise: paste a 3D simplex noise function (Ashima/stegu) into the shader; don't load a library.

## 7. Transitions between shapes

- **Morph** (same vertex count): store both shapes' positions as attributes, mix in the vertex
  shader by `uMix`. Different counts: sample both surfaces to N points with `MeshSurfaceSampler`
  and morph point clouds instead.
- **Particle reform** (A bursts, becomes B): sample A's and B's surfaces to the same N points;
  per particle, `pos = mix(mix(a, swirl, easeOut(t1)), b, easeInOut(t2))` with staggered start times.
- **Shatter**: pre-split the mesh into chunks (Voronoi in Blender, or triangles of a low-poly
  version); animate each chunk outward along its centre direction with spin and gravity.
- **Ignite / burn out on a flat logo** (no WebGL): CSS mask with layered gradients and sparks —
  `ProjectsSection.tsx`.
- **Swallowed letters** (DOM): measure each letter's offset from the stage centre once; per frame
  rotate that offset by `θ = t * 2.6` and scale it by `1 - t` (`SwallowText` in `AchievementsSection.tsx`).

## 8. Backgrounds and atmosphere

- **Animated colour bands** (house background): `ColorBends.tsx` — fixed full-screen shader
  behind the page, reacts to the pointer, still frame for reduced motion.
- **Gradient mesh / aurora**: full-screen quad, a few noise-moved colour blobs mixed by distance.
- **Starfield / dust**: a few hundred points on a large sphere, slow rotation (`Dust` in `SkillsScene.tsx`).
- **Caustics**: two scrolling noise layers multiplied, `pow(…, 3)` for sharp bright lines.
- **Grain + vignette**: in the background shader or as a CSS overlay (`mix-blend-mode: overlay`
  with a tiny noise PNG), not as a post-processing pass.

## 9. Text over and inside the scene

- **Captions over the canvas** are DOM, absolutely positioned on the sticky stage, driven by the
  same `progress` (`ScrubCaption` in `AboutSection.tsx`). This keeps text sharp, selectable and
  accessible.
- **Labels attached to 3D points**: drei `<Html center position={…}>` (`SkillsScene.tsx`).
- **Text inside 3D**: canvas texture (sharp, cheap, any font — `deskScreens.ts`) or drei `<Text>`
  (SDF, crisp at any size). Duplicate the important words in the DOM for screen readers.
- **Reveals**: letter mask rise (`RevealHeading.tsx`), blur-in by word (`CaptionWord`),
  outline-fill (`ScrubHeadline` in `ContactSection.tsx`), depth-layered floating type (`PortalCard`).

## 10. Interaction

- Listen for `pointermove` on `window`, store normalised `[-1, 1]` in a ref, damp it toward the
  target each frame. Never put it in React state.
- Pointer lean on the camera (±0.25), tilt on hero objects (±8°), magnetic elements (`Magnet.tsx`).
- Click to jump to a beat: compute the scroll position for the beat's mid-point and
  `window.scrollTo({ top, behavior: 'smooth' })` (`jumpTo` in `ProjectsSection.tsx`).
- No orbit controls on scroll-driven scenes — they fight the scroll.

## 11. Performance budget

| | Target |
|---|---|
| Canvases on screen at once | 1 (+ the background) |
| `dpr` | `[1, 1.75]` (2 for small hero canvases) |
| Points | ≤ 10k CPU-animated, ≤ 100k GPU-animated |
| Transmission/glass objects | ≤ 2 |
| Draw calls per scene | < 100 (use instancing) |
| Textures | ≤ 2048px, compressed |
| Models | ≤ 2 MB each, Draco-compressed |

Pause off-screen canvases (`frameloop={active ? 'always' : 'never'}`), stop loops in background
tabs, and dispose geometries, materials and textures you create manually.
