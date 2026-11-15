# The neon cinematic style, and picking up other styles

## Neon cinematic (the house style)

The look of the author's portfolio (rayenchatti.vercel.app), written as exact values. It is one
of the style families in `styles.md` — use it when the person picks it, asks for something
futuristic/tech/gaming, or says "like your portfolio". It is **not** the default: when no style is
given, ask (SKILL.md, step 1).

**Mood:** dark, glossy, cinematic; one hot accent colour glowing out of near-black; slow,
weighty camera; big confident typography; everything slightly alive.

### Colour

| Role | Value | Notes |
|---|---|---|
| Page background | `#03010A` under a 70%-opacity animated band layer | Never pure grey; a hint of colour in the black |
| Section surfaces | `#1A1A1A`, cards `#161618` at 85% + `backdrop-blur-sm` | Dark glass |
| Text | `#D7E2EA` (cool off-white), muted `#9a9aa3` | Not pure white for body text |
| Accent | `#FF3B3B` | The only saturated colour on the page |
| Accent family | deep `#7A0000`, `#3D0000`, glow `#FF2020`/`#B00000`, light `#FF6B6B`, hot `#FFB27A` (ember highlights), `#FFD6D6` (white-hot) | Glows go white-hot at the centre, deep accent at the edge |
| Tier colours | gold `#F5C451`, silver `#C9D3DD`, bronze `#D08A4E` | Only for ranks/awards |

To use another accent, keep the *relationships*: one saturated accent; deep and near-black versions
of the same hue for shadows; a warmer, lighter version for hot highlights. `scripts/retheme.mjs`
does this for template code.

### Light and 3D surfaces

- Low-key: almost no ambient light (0.15), one soft key from above, **accent rim lights** behind
  objects (point lights intensity 6–10), studio reflections from `Lightformer`s, one of them in
  the accent colour.
- Materials: dark glossy metal (`#1a1a1d`, metalness 0.85, roughness 0.22); emissive accent strips
  and cores (`toneMapped={false}`); wireframe shells at 35% opacity around glowing cores.
- Glow: additive halos (not post-processing), soft floor shadows far below floating objects,
  black fog so distant glows fade to nothing.

### Background

`ColorBends`: three accent shades (`#FF3B3B`, `#7A0000`, `#3D0000`) as slow warping bands,
rotation 90°, speed 0.2, band width 6, noise 0.15 (film grain), reacting to the pointer, at 70%
opacity over `#03010A`. It runs behind the whole page and can be warped by scenes (the black hole).

### Typography

- **Kanit** 300–900: UI, headings (black 900, uppercase, tight leading 0.85–0.9).
- **Unbounded** 400/700/900: big display type in scenes (outlined numbers, titles).
- **Space Grotesk** 300/400: spaced-out labels and lists (uppercase, tracking 0.35–0.45em, 10–12px).
- Eyebrow labels: 0.7–0.85rem, weight 600, uppercase, tracking 0.25em, 50% text colour.
- **Backdrop titles**: `clamp(4rem, 19vw, 300px)`, black, uppercase, vertical gradient fill from
  95% to 8% opacity — sit behind a scene, scale up 12% and fade as it starts.
- **Outline + solid pairing**: an outlined word/number (`-webkit-text-stroke: 1.5px`) stacked over
  a solid one.
- Sparkle (four-point star) as list bullets, spinning 180° as each item lands.

### Motion

| Thing | Value |
|---|---|
| Reveal easing | `[0.22, 1, 0.36, 1]` (expo-out), 0.7–0.9s |
| Letter stagger | 35ms; mask rise from `y: 110%` |
| Caption reveal | per word: opacity 0→1, blur 8→0px, rise 0.4em, across 45% of its beat; lifts 30px away at the end |
| Camera follow | `1 - exp(-5 dt)` damping; handheld drift ±0.05; pointer lean ±0.25 x / ±0.15 y |
| Floating objects | bob ±0.07 at 0.9 rad/s, sway ±0.05 rad, tilted toward camera |
| Scene pacing | 4–7 screens per pinned scene; intro 10–15%; outro 5%; one slot per item |
| Transitions | blur + scale + fade together, never a plain fade; flashes at moments of impact |
| Idle life | something always moves slightly: spinning rings (18–30s per turn), orbiting dots, embers |
| Hover | cursor spotlight on cards (radial gradient following the pointer), magnetic buttons, border turns accent |

### Layout signatures

- Circular frame with a thin spinning white-to-accent glow ring and a small orbiting accent dot.
- Counter `01 / 05` bottom left and a progress rail of short accent ticks bottom right in every
  pinned scene; "Scroll" hint at the start that fades in the first 3–5%.
- Huge name wordmark at the bottom of the page, cropped by the edge, rising into place.

## Picking up a style from references

When the person shows you a site, image, video, film or game, extract a style sheet in the same
shape as above *before* writing the spec:

1. **Colour**: background value, the one or two saturated colours, how glows are coloured (does
   the centre go white?), how dark the shadows are. Write hex values.
2. **Light**: high-key or low-key, hard or soft, where rim light comes from, is there fog/haze.
3. **Materials**: glossy/matte/glass/emissive/wireframe/flat-shaded.
4. **Type**: serif/sans/display, weight, case, tracking, sizes relative to the screen.
5. **Motion**: speed (slow drift vs snappy), easing (soft landings vs bounces), how transitions
   happen (cuts, blurs, morphs), how much idle motion.
6. **Background motion**: still, slow gradient, particles, bands, noise.
7. **Texture**: grain, scanlines, vignette, chromatic fringe.

Then write it down as a table like the house style and include it in the spec, so the person can
confirm "yes, that's the look" before you build. Usually people want either the *style* or the
*choreography* of a reference, not both — ask which if unclear.

A reference video is the most precise thing a person can give you; use `scripts/video-frames.mjs`
and study the frames before describing the style back.
