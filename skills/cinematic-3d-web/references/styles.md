# Styles

Every scene needs a style decided before the spec is written: it changes the light, materials,
colour, atmosphere and even the pacing. Don't default to one look. If the person didn't name or
show a style, **ask** (see SKILL.md, step 1), offering the families below with the one that fits
their subject first.

Each family is defined by concrete choices, so two scenes in the same family look related and a
scene never drifts into another family by accident (e.g. glowing lines creeping into a
"realistic" ruin).

## Contents

1. Choosing and asking
2. Realistic / natural
3. Clean studio / product
4. Neon cinematic (the house style)
5. Stylised / illustrated
6. Editorial / minimal
7. Dreamy / ethereal
8. Mixing styles

---

## 1. Choosing and asking

Infer a likely fit from the subject, but confirm it unless the request makes it unambiguous:

| Subject / words in the request | Likely family |
|---|---|
| ruins, forest, cave, ocean, weather, "real", "natural", "photoreal", "ancient" | Realistic / natural |
| a product, device, bottle, shoe, "premium", "Apple-style", e-commerce | Clean studio / product |
| gaming, tech launch, "futuristic", "cyber", music/nightlife, dark dev portfolio | Neon cinematic |
| kids, games with cartoon art, playful brands, "illustrated", "cute", "toon" | Stylised / illustrated |
| agencies, architecture, fashion, typography-led sites, "minimal", "elegant" | Editorial / minimal |
| wellness, meditation, fantasy, "soft", "magical", "dreamy" | Dreamy / ethereal |

How to ask (one question, options with one-line descriptions, your recommendation first). Use the
environment's question tool if it has one (e.g. a multiple-choice prompt); otherwise ask in text:

> Which look should the scene have?
> 1. **Realistic / natural** *(recommended for an ancient door)* — weathered materials, real light and shadows, fog, dust
> 2. **Clean studio** — product-shot lighting, soft reflections, lots of space
> 3. **Neon cinematic** — dark scene, one glowing accent colour, light lines and halos
> 4. **Stylised** — illustrated, toon-shaded, bold flat colours
> 5. **Editorial minimal** — typography-led, restrained colour, simple shapes
> 6. **Dreamy** — soft pastel glow, haze, floating particles
> (or describe your own / share a reference)

If they answer with a reference instead, extract the style from it (`house-style.md`, "Picking up
a style from references") and say which family it's closest to.

If you can't ask (one-shot or automated run), pick the inferred family and state it under
"Choices I made" in the spec.

---

## 2. Realistic / natural

*Real-world materials and light. The test: would a frame pass for a still from a game cinematic
or a film?* Worked example: `examples/ruin-door/` (an ancient door in fog).

**Never:** emissive "light lines", neon colours, glow halos around solid objects, perfectly
smooth or perfectly clean surfaces, pure black or pure grey backgrounds.

**Light**
- Physically motivated sources only: sun/moon (directional), sky (hemisphere), and light that
  comes *from* somewhere in the scene (a spotlight through a doorway, a fire, a lamp).
- **Shadows on** (`<Canvas shadows="soft">`, `castShadow`/`receiveShadow` on everything solid).
  Real shadows do most of the realism work: a light behind a door that only reaches the ground
  through the gap reads as real instantly.
- Low ambient, but never black: dusk/overcast hemisphere light (`sky #7d8aa3`, `ground #3a3226`,
  intensity ~1.2) plus one key light at a raking angle so surface relief shows.
- Warm vs cool contrast between the light source and the environment (warm sunlight through a
  door into a cool blue-grey dusk).

**Materials**
- Textures with relief: colour map + normal map (derive it from the height with a Sobel filter),
  roughness 0.85–1 for stone, earth, wood. `ruinTextures.ts` generates weathered stone (mottling,
  pits, cracks, rain streaks, lichen), carved slabs and gravelly earth procedurally — no downloads.
  For photoreal close-ups, use real PBR texture sets (ambientCG, Poly Haven — CC0) if the person
  accepts downloaded assets.
- Draw every texture at the real proportions of the surface it covers, or project UVs in world
  units. A square texture stretched down a tall door turns stone grain into wood grain.
- Imperfection in the *shape*, not just the texture: subdivided blocks pushed in by ridged noise
  near edges and corners (sharp chips, broken corners), slightly uneven faces, natural rocks from a
  noise-displaced sphere (`ruinGeometry.ts`). Keep cut stone crisp; too much rounding reads as
  pillows. Vertex colours vary each block's tone, darken crevices and bases, add moss on top faces.
- No `toneMapped={false}` on solid objects — that's what makes things glow unnaturally.

**Atmosphere** (this is what makes empty space disappear)
- Real volumetric fog as a post-processing effect (`VolumetricFog.ts`): ray-march each view ray to
  the depth buffer, dense near the ground, shaped by drifting 3D noise, banked at the sides,
  closing in completely in the distance. Give distant fog the *sky's* colour for that direction,
  or a horizon line shows. Make fog lighter than the ground, or it's invisible.
- Light shafts belong to the fog: light it inside the light's volume (projected through the
  opening), with forward scattering so shafts glow when you look toward the light.
- `fogExp2` matching the horizon for distant geometry; dust motes everywhere (dim), bright only
  where a beam catches them.
- Cheaper fallback when post-processing isn't wanted: layered fog *sprites* (soft noisy alpha,
  normal blending, opacity 0.12–0.4) at ground level and big banks at the sides.

**Finish** (post-processing, in this order)
- Ambient occlusion (N8AO, half resolution) to ground everything, the volumetric fog, bloom only
  above HDR 1.0 (the light source), AgX tone mapping (render the canvas `flat`), a light
  contrast grade, vignette, film grain, SMAA.
- It's expensive: add quality tiers with drei `PerformanceMonitor` (drop AO first, then
  resolution), start phones at the lighter tier, and keep a `?capture` mode at full quality for
  recordings.

**Ground**
- Never a flat plane: displace a dense grid with fractal noise (`terrain.ts` `heightAt`), raise
  it toward the edges, flatten a worn path where people walk. Vary its colour at a large scale in
  the shader so the texture never visibly repeats.
- Scatter detail with `instancedMesh`: hundreds of pebbles and grass clumps (tapered, curved
  blades swaying with a vertex-shader wind), placed with `heightAt` so they sit on the surface.

**Motion**
- Heavy things move slowly with ease-in-out and *consequences*: camera rumble, grit falling,
  dust puffs, two leaves that don't move in perfect mirror. The camera follows one continuous
  path (a monotone cubic through keyframes, never stopping between beats), with a slight step
  bob while it walks and smooth noise shake, not sine jitter. Pair it with smooth scrolling (Lenis).
- Crossing into bright light: ramp the exposure so the scene itself burns to white.

**Pacing:** slower than other styles — longer holds, longer moves.

---

## 3. Clean studio / product

*A product shot that moves. The test: would it work on a premium brand's product page?*

**Light:** studio softboxes as `Lightformer`s in an `<Environment>` (one big overhead, one side,
one rim), a soft contact shadow, no visible light sources. Optional single accent rim.
**Materials:** accurate product materials — satin/brushed metal (metalness 1, roughness
0.2–0.35), matte plastics (roughness 0.5–0.7), glass (`MeshTransmissionMaterial`), fabric
(roughness 0.9). Clean, no wear.
**Background:** a soft gradient (light: `#f4f4f2 → #e3e5ea`; dark: `#0e1117 → #05070d`), no fog
or a very faint one.
**Camera:** long lens (FOV 25–35), slow orbits, exploded views, macro close-ups of details.
**Motion:** precise, smooth ease-in-out, parts docking with a tiny settle; no particles unless
they're part of the product story.
**Text:** short feature captions beside the object, lots of negative space.
**Never:** heavy fog, dirt, glow lines everywhere, busy backgrounds.

---

## 4. Neon cinematic (the house style)

*Dark, glossy, one hot accent glowing out of near-black.* Full values in `house-style.md`; the
bundled portfolio is the worked example.

**Light:** near-black scene, accent-coloured rim lights, emissive strips and cores
(`toneMapped={false}`), faked bloom with additive halos.
**Materials:** dark glossy metal, wireframe shells, emissive accents.
**Atmosphere:** black fog so glows fade with distance, animated colour-band background, sparks,
embers, streaks.
**Motion:** confident camera moves, flashes on impact, glows pulsing.
**Use when:** asked for futuristic/cyber/gaming/tech or "like your portfolio". Not as a default.

---

## 5. Stylised / illustrated

*Looks drawn or toy-like on purpose.*

**Light:** simple — one directional + strong ambient; or toon shading (`MeshToonMaterial` with a
3–4 step gradient map).
**Materials:** flat or toon colours, outlines (drei `<Outlines>` or an inverted-hull mesh),
no realistic textures. Rounded, chunky shapes.
**Colour:** a bold limited palette (4–6 colours), saturated, light background.
**Motion:** squash and stretch, overshoot/spring easing, bouncy stagger, faster pacing.
**Never:** realistic fog, PBR metal, film grain.

---

## 6. Editorial / minimal

*Typography leads; 3D supports it.*

**Light:** soft and even; one key light; light or off-white background (`#f3f1ec`) or
pure dark.
**Materials:** a single material family (matte clay `#e9e6df`, or one metal), simple primitives
or one sculptural object.
**Colour:** monochrome plus at most one accent; lots of whitespace.
**Motion:** slow, deliberate, few moving parts; text reveals do the storytelling (mask wipes,
large type scaling).
**Never:** particles everywhere, glow, heavy effects.

---

## 7. Dreamy / ethereal

*Soft, floating, slightly unreal.*

**Light:** low contrast, bright haze, pastel coloured lights (lavender, peach, mint).
**Materials:** soft gradients, iridescent/pearlescent (`MeshPhysicalMaterial` with
`iridescence`), translucent glass, cloth.
**Atmosphere:** bright fog, floating particles, bokeh-like soft sprites, slow drifting clouds.
**Motion:** slow floating, crossfades and blur-through transitions, no hard cuts.

---

## 8. Mixing styles

A scene can cross from one style to another as part of the story — that's often the most
memorable moment (the ruin door opens from a realistic dusk into a bright, clean section). When
you mix, make the transition itself an event (a white-out, a portal, a wipe) and keep each side
pure.
