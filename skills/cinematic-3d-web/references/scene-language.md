# Scene language

The words people use for animation are about feelings; the decisions code needs are about
numbers. This file is the bridge: a precise vocabulary to write specs in, and translations of
the common vague words into concrete choices.

## Contents

1. How to translate any description
2. Camera vocabulary
3. Motion vocabulary (verbs, easing, timing)
4. Transition vocabulary
5. Light, colour and atmosphere
6. Effects vocabulary (particles, distortion, glow, materials)
7. Text choreography
8. Scroll pacing
9. Translations of common vague words
10. When to ask, and how

---

## 1. How to translate any description

Break every described moment into these eight questions. Anything the person didn't say, choose
deliberately (and say what you chose) instead of letting the code decide by accident.

| Question | Example answer |
|---|---|
| **Subject** — what's the focus? | A glass logo, 2 units wide, centre frame |
| **Camera** — where are we, how does it move? | Medium shot, slow push-in 8→5 units, slight low angle |
| **Motion** — what moves, in which direction, how fast, on which curve? | Logo rotates 0→90° on Y over 20% of scroll, ease-in-out |
| **Change** — what transforms? (appears, breaks, morphs, dissolves, opens) | Shatters into ~400 shards that drift outward |
| **Light/colour** — what does the lighting do? | Rim light turns from cool white to accent as it breaks |
| **Effects** — particles, distortion, glow, trails? | Additive sparks from the cracks, short-lived |
| **Text** — what does the copy do, synced to what? | Headline letters rise out of a mask when the shards settle |
| **Pacing** — how much scroll, any hold? | 120% of a screen to break, 40% hold, 60% to clear |

A moment the person describes as one thing ("it explodes") is usually three beats: the
**anticipation** (crack, glow builds), the **action** (break), the **settle** (shards slow and
hang). Spell out all three; a missing anticipation is the most common reason something "feels
cheap".

## 2. Camera vocabulary

| Term | Meaning | Use for |
|---|---|---|
| **Push-in / dolly in** | Camera moves toward the subject (position changes) | Focus, intimacy, "zoom into" |
| **Pull-out / dolly out** | Moves away | Reveal of context, ending |
| **Zoom** | Field of view narrows (camera doesn't move); flattens depth | Rarely better than a dolly; use for "vertigo" |
| **Dolly zoom** | Dolly in while widening FOV (or the reverse): background stretches | Unease, "the world warps" |
| **Truck** | Slide sideways | Following a row, parallax pass |
| **Pedestal / crane** | Move straight up/down; crane = rising arc | Rising over a scene, reveal from below |
| **Orbit** | Circle the subject while looking at it | Showing an object from all sides |
| **Swing / arc** | Partial orbit from one face of a subject to another | Moving between items arranged around a centre |
| **Fly-through** | Travel through/inside the scene (tunnel, rooms) | Journeys, "diving in" |
| **Handheld drift** | Tiny continuous sine wobble (±0.05 units) | Making a static frame feel alive |
| **Pointer lean** | Camera nudges toward the cursor (±0.25 units) | Interactivity without controls |
| **Roll / dutch** | Rotation around the view axis | Speed, instability; ±0.25 rad max |
| **Whip / fast swing** | Very fast move with motion blur or streaks | Energetic transitions between beats |
| **Hold / lock-off** | Camera still | Letting the person read |
| **Shot sizes** | Extreme wide → wide → medium → close-up → extreme close-up | Say which, not just "closer" |
| **Lens** | Wide (FOV 60–75): dramatic depth, distortion · normal (40–50) · long (25–35): flat, product-like | "Cinematic product shot" → long lens |

A camera move is specified by: start position + look-at, end position + look-at, the stretch of
scroll it happens over, and its easing. Write those down.

## 3. Motion vocabulary

**Verbs with direction.** Prefer precise verbs: *rise, sink, drift, glide, snap, slam, spiral,
unfold, peel, shatter, dissolve, condense, bloom, ignite, collapse, stretch, ripple, orbit,
tumble, settle, hover, breathe*. Always add direction and distance ("rise 40px", "spiral inward
2 turns").

**Easing** (how speed changes over the move):

| Name | Feel | Typical use | Framer / CSS / JS |
|---|---|---|---|
| Linear | Mechanical, constant | Continuous spin, scroll-scrubbed drift | `t` |
| Ease-out (expo/quart) | Fast start, soft landing — "premium" | Things arriving, text reveals | `[0.22, 1, 0.36, 1]` |
| Ease-in | Slow start, fast exit | Things leaving, falling, getting sucked in | `t*t*t` |
| Ease-in-out / smootherstep | Calm both ends | Camera moves, scrubbed transitions | `t*t*t*(t*(6t-15)+10)` |
| Overshoot / back | Goes past then returns | Playful pops, UI | `[0.34, 1.56, 0.64, 1]` |
| Spring | Physical bounce, settles | Hover, magnetic, cards | `stiffness 190, damping 26` |
| Exponential damping | Follows a target smoothly every frame | Camera following scroll, pointer | `x += (target-x)*(1-exp(-k*dt))`, k 3–7 |

**Timing.** Time-based animation: micro 150–250ms, UI 300–500ms, reveals 700–900ms, dramatic
1.2–2s. Stagger between letters 25–40ms, between words 60–90ms, between cards 70–120ms.
Scroll-scrubbed animation is measured in **% of the section's scroll**, not seconds (see §8).

**Principles to name explicitly:** anticipation (a small move against the main one first), follow
through (parts keep moving after the main stop), secondary motion (hair, particles, glints),
overlap (things start before others finish), hold (stillness so the eye can read).

## 4. Transition vocabulary

How one beat becomes the next. Name the transition and its mechanism.

| Transition | Mechanism | Feeling |
|---|---|---|
| Cut | Instant swap | Abrupt, rhythmic |
| Crossfade | Opacity A→B overlap | Soft, dreamy |
| Blur-through | A blurs out while B blurs in | Cinematic, focus pull |
| Mask/wipe | Shape or line reveals B over A | Graphic, editorial |
| Push | A slides out as B slides in | Spatial, sequential |
| Morph | Geometry/vertices interpolate A→B | Magical, continuous |
| Dissolve (noise) | Pixels vanish by a noise threshold, glowing edge | Burning, disintegration |
| Shatter | Mesh splits into pieces that fly | Violent, impactful |
| Particle reform | A becomes particles that re-gather as B | Transformation |
| Consume (vortex/black hole) | Things spiral into a point and vanish | Ominous, powerful |
| Fly-through | Camera passes through A into B | Journey, depth |
| Match cut | A shape in A aligns with a shape in B | Clever continuity |
| Flash | Bright overexposed frame at the moment of change | Impact, energy |

## 5. Light, colour and atmosphere

- **Key / fill / rim light**: rim (behind the subject) is what makes 3D objects read on dark
  backgrounds — almost always add one, often in the accent colour.
- **Practical glow**: emissive parts (screens, strips, cores) that light the scene.
- **Colour temperature**: cool (blue-white, clinical, tech), warm (amber, intimate), accent-tinted.
- **Contrast**: high-key (bright, airy) vs low-key (dark, dramatic). The house style is low-key.
- **Fog / depth fade**: black fog makes additive glows fade with distance instead of greying.
- **Atmosphere**: dust motes, haze gradients, volumetric beams (faked with additive cones).
- **Grade**: grain (noise 0.1–0.15), vignette, chromatic fringe at the edges for "lens" feel.

## 6. Effects vocabulary

| Effect | What to specify |
|---|---|
| Particles | Count, size, shape (dot/streak/shard), spawn area, velocity, lifetime, colour over life, blending |
| Trails / streaks | Length tied to speed, fade-out tail |
| Distortion | UV warp: swirl, ripple, bulge, pinch; strength and radius |
| Displacement | Vertices pushed by noise: frequency, amplitude, speed |
| Glow | Faked bloom halo: radius, falloff, intensity, colour |
| Dissolve | Noise scale, edge width, edge colour |
| Refraction / glass | Thickness, roughness, chromatic aberration, what's behind it |
| Iridescence / holographic | Hue shift with view angle |
| Wireframe / hologram | Line colour, scanlines, flicker |
| Noise flow | Curl-noise motion for smoke/liquid feel |

## 7. Text choreography

Text is half of most scenes. Specify: the unit (letter, word, line, block), the reveal (mask rise,
blur-in, fade, scramble, typewriter, outline-fill), the stagger, what triggers it (scroll window
or on-enter), and its exit.

House defaults: headings rise letter by letter out of a mask (0.8s, 35ms stagger, ease-out);
captions blur in word by word with scroll (8px blur → 0, 0.4em rise) and lift away at the end of
their beat; huge faded backdrop titles behind scenes scale up 12% and fade as the scene starts.

## 8. Scroll pacing

A pinned section of height H screens has `(H - 1) × 100%` of a screen's worth of scroll. Budget it:

- **Rule of thumb**: one screen-height of scroll per major beat; 0.5 for a minor beat; add 0.3–0.5
  holds after important moments so people can read.
- **Intro** (title fades, camera swoops in): 8–15% of the section.
- **Outro** (hand-off to the next section): 5–10%.
- **Reading time**: a caption of 15 words needs a hold of about 30% of a screen.
- Scenes that feel "too fast" usually lack holds, not length. Scenes that feel "boring" usually
  have holds without any secondary motion (add drift, glints, particles during holds).

## 9. Translations of common vague words

Use these as starting points, then adapt to the scene. Say in the spec which reading you chose.

| They say | Usually means |
|---|---|
| **Cinematic** | Slow camera moves on ease-in-out, long lens, low-key light with rim, holds between beats, letterbox-like framing, grain + vignette, no bouncy UI easing |
| **Epic / dramatic** | Scale contrast (tiny camera, huge object), low angle, slow push-in, anticipation before big moments, flash or light burst on impact, particles, deep shadows |
| **Smooth / buttery** | Damped camera following (k≈5), ease-out reveals, no snapping, 60fps (fewer particles), consistent pacing |
| **Premium / Apple-style** | Product as hero, long lens, slow rotation scrubbed by scroll, soft studio reflections, lots of negative space, text appears beside the object, restrained colour |
| **Futuristic / sci-fi** | Glow lines, wireframes, holographic shimmer, grids, cool accent, scanlines, data particles, HUD typography |
| **Dreamy / ethereal** | Blur-through transitions, soft pastel glow, slow drift, floating particles, crossfades, no hard cuts |
| **Dark / moody** | Low-key light, single accent, fog, slow pacing, heavy vignette |
| **Playful** | Overshoot and spring easing, bright colours, bouncy stagger, rounded shapes, quicker pacing |
| **Minimal / clean** | One object, one move per beat, flat lighting, generous holds, simple fades |
| **Energetic / fast** | Short beats, whip transitions, speed streaks, camera roll on fast moves, flashes |
| **Organic / alive** | Noise-driven displacement, breathing scale (±2%), idle motion everywhere, curl-noise particles |
| **Like a game** | Third-person camera, objects with physics-like motion, HUD counters, level/progress rails |
| **Like a movie intro** | Black start, light reveals the subject, slow push, title card after the reveal, fade to the content |
| **Underwater** | Caustic light patterns, blue-green fog, slow buoyant drift, ripple distortion, rising bubbles |
| **Space / cosmic** | Black with star dust, nebula gradients, orbits, slow rotation, glow halos, vast scale |
| **Explodes / bursts** | Anticipation (crack + glow) → shatter or particle burst → slow settle; light flash at peak |
| **Sucked in / swallowed / consumed** | Vortex at a point; things spiral (rotate + shrink + blur) into it, nearest first; background warps toward it |
| **Comes alive** | Idle loop starts: breathing, eyes/lights blink, small rotations, particles begin |
| **Assembles / builds itself** | Parts fly in from scattered positions on staggered ease-out, snap with a small glint |
| **Morphs into** | Vertex interpolation or particle reform between two shapes over a scroll window |
| **Floats** | Slow sine bob (±0.07 units, 0.9 rad/s), slight rotation sway, soft shadow far below |
| **Glows** | Additive halo + emissive core + accent rim light, optional pulse |
| **Dissolves / burns away** | Noise-threshold dissolve with a hot edge, sparks rising |
| **Zooms into / dives into** | Camera fly-through with widening FOV and speed streaks, flash on entry |

## 10. When to ask, and how

Ask when a choice changes the whole scene, not for details you can pick well yourself. Good
questions offer concrete options with a default:

> For "the logo explodes": (a) it shatters into glass shards that hang in the air — my default,
> it suits the dark glossy style; or (b) it bursts into glowing particles that fade like embers?

Bad: "What kind of explosion do you want?" — it hands the hard part back to them.

If they reply with another vague word, translate that too and confirm your reading in one line
before building.
