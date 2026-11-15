# Worked example: the ruin door (realistic / natural style)

An ancient stone door stands in a foggy dusk ruin. As you scroll, carved stone doors grind open,
sunlight pours through the gap as real light shafts in the fog, the camera walks through the
doorway into a white-out, and comes out into the section on the other side, which is left empty
for you to fill. Everything is generated in code: no 3D models, no downloaded textures, no HDRI.

| Closed, in the fog | Doors grinding open | The threshold |
|:-:|:-:|:-:|
| <img src="images/1-ruin-door.jpg" width="260" /> | <img src="images/3-doors-open-light.jpg" width="260" /> | <img src="images/4-threshold.jpg" width="260" /> |

It started from a one-paragraph brief and was refined over several rounds toward realism ("make
it an ancient ruin with fog and dust" → "more fog on the sides, a more realistic ground" → "as
realistic as it could ever be"). Read it alongside the *Realistic / natural* section of
`references/styles.md`.

## Files

| File | What it holds |
|---|---|
| `doorTimeline.ts` | Every beat as scroll fractions (intro, anticipation, open, threshold, white-out, release), the camera path (a monotone cubic through keyframes), the exposure ramp and the easing helpers. Shared by the scene and the section. |
| `DoorSection.tsx` | The pinned section: captions, white-out overlay, the empty section behind the door (`Beyond`), reduced-motion version. |
| `DoorScene.tsx` | The 3D world: ruin, doors, light, sky, dust, ground detail, camera rig, post-processing and the adaptive quality tiers. |
| `VolumetricFog.ts` | A post-processing effect: ray-marched ground fog and light shafts shaped by the gap between the doors. |
| `ruinGeometry.ts` | Cut stone blocks with chipped edges and broken corners, natural rocks, and the vertex colours that give each block its own tone, dark crevices, grime and moss. |
| `ruinTextures.ts` | Procedural textures on 2D canvases: weathered stone (colour + normal map, cracks, rain streaks, lichen), the carved door slabs drawn at the doors' real proportions, gravelly earth, dust sprites. |
| `terrain.ts` | `heightAt(x, z)`: uneven ground with a flat worn path, used by the ground mesh and everything resting on it. |
| `SmoothScroll.tsx` | Eased, inertial scrolling (Lenis), off for reduced motion and for frame-exact recording (`?capture`). |

## The techniques that make it look real

1. **Real light with real shadows.** A shadow-casting `spotLight` sits *behind* the closed doors
   and points at the viewer. Closed, only the seam lets light through, and a thin line lands on the
   ground. As the doors open, the shadowed shaft widens across the threshold. A cool moonlight key
   from the side gives the stone strong relief. (`SunBeyond`)
2. **Volumetric fog and light shafts.** A post-processing effect walks along each view ray up to
   the first surface (from the depth buffer) and adds up fog. The fog is dense near the ground,
   shaped by drifting 3D noise, banked up at the sides and behind, and closes in completely far
   away. Distant fog takes the sky's colour for that direction, so the land dissolves into the sky
   with no horizon line. Fog inside the light is lit warm. Each sample is projected from the light
   onto the door plane and tested against the gap between the leaves, so the shafts have exactly
   the opening's shape. (`VolumetricFog.ts`)
3. **Stone that isn't a box.** Subdivided blocks are pushed in with ridged noise near edges and
   corners (sharp chips, broken corners) and faces are slightly uneven. Vertex colours vary each
   block's tone, darken the chips and the base, and put moss on the faces that look up.
   (`ruinGeometry.ts`)
4. **Textures at the right scale.** Block UVs are projected per face in world units, so every
   block has the same texel density. The door slabs are drawn at their real 1.1 m × 3.9 m
   proportions; a square texture stretched down a tall door turns stone grain into wood grain.
   Normal maps are derived from the height (Sobel). (`ruinTextures.ts`)
5. **Grounded with ambient occlusion and filmic light.** N8AO darkens contact areas, AgX tone
   mapping rolls off the bright light like a camera, and the light behind the door is HDR so it
   blooms. A light contrast grade, vignette and film grain finish it. (`Effects`)
6. **A ground that isn't flat.** A dense grid displaced by `heightAt`, large-scale colour
   variation in the shader so the earth texture never visibly repeats, 700 instanced pebbles and
   900 grass clumps with tapered, curved blades swaying in the wind. (`Ground`, `Pebbles`, `Grass`)
7. **Weight.** The camera follows one continuous path with a slight step bob while it walks, and
   shakes and rolls while the stone grinds. The right leaf trails the left, and both stick and
   slip. Grit falls from the lintel and dust puffs at the base. (`CameraRig`, `leafAngle`, `Dust`)
8. **A clean crossing.** As you step through, the exposure ramps up so the scene itself burns to
   white, then the DOM white-out takes over and clears into the section behind the door.
   (`exposureAt`, `DoorSection`)

## Performance

On an integrated laptop GPU the full-quality scene runs at roughly 20–35 fps at 1440×900, so the
scene steps quality down automatically when the frame rate drops below about 45 fps (drei
`PerformanceMonitor`): ambient occlusion goes first, then resolution. It steps back up when the
GPU can keep up. Phones start at the lighter tier. The fog uses fewer steps on phones and stops
early once it's opaque. Add `?fogdebug` to the URL to see the fog density on its own.

## Reusing it

Copy the files into `src/components/` of a project made with `scripts/create-site.mjs`. It needs
`three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`,
`postprocessing`, `framer-motion` and `lenis`. Wrap the page in `<SmoothScroll>`, render
`<DoorSection />`, and put your own section inside `Beyond` in `DoorSection.tsx`.
