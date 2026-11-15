// Shared scroll timeline for "The Door". The 3D scene (DoorScene) and the DOM layers (DoorSection:
// captions, white-out, the Lab) all read from here, so the moment you cross the threshold is the
// same moment everywhere. Numbers are fractions of the section's scroll (0 = pinned, 1 = released).

export const GLOW = '#FFC874' // warm light from behind the door

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a))
export const smooth = (t: number) => t * t * (3 - 2 * t)
export const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeIn = (t: number) => t * t * t

/* ── Beats ── */
export const INTRO: [number, number] = [0, 0.12] // the door alone in the fog
export const ANTICIPATION: [number, number] = [0.12, 0.3] // lines light up, it trembles
export const OPEN: [number, number] = [0.3, 0.55] // the doors swing open
export const THRESHOLD: [number, number] = [0.55, 0.7] // camera passes through — key moment
export const WHITEOUT: [number, number] = [0.6, 0.68] // screen floods with light…
export const RELEASE: [number, number] = [0.72, 0.8] // …and clears into the Lab
export const ARRIVAL: [number, number] = [0.72, 0.86] // cards drift in, title rises

/* ── Door ── */
export const OPENING_W = 2.2 // clear width of the doorway
export const OPENING_H = 4.0
export const LEAF_W = OPENING_W / 2
export const MAX_SWING = 1.75 // radians (~100°)

// How far the leaves have swung: slow, heavy start, eased stop
export const swing = (p: number) => smoother(range(p, OPEN[0], OPEN[1]))
// Seam glow: faint at rest, builds through the anticipation, then the door opens on it
export const seamGlow = (p: number) => 0.25 + range(p, ANTICIPATION[0], ANTICIPATION[1]) * 0.75
// Tremble just before the doors give way
export const tremble = (p: number) => {
  const t = range(p, ANTICIPATION[0] + 0.08, ANTICIPATION[1])
  return t * (1 - range(p, OPEN[0], OPEN[0] + 0.04))
}
// Light pouring out once the door starts to open
export const lightFlood = (p: number) => smooth(range(p, OPEN[0], THRESHOLD[0] + 0.05))
// Full-screen white-out envelope (DOM overlay)
export const whiteout = (p: number) => smooth(range(p, WHITEOUT[0], WHITEOUT[1])) * (1 - smooth(range(p, RELEASE[0], RELEASE[1])))
// The 3D world is gone once the light has covered it
export const sceneVisible = (p: number) => 1 - range(p, WHITEOUT[1], RELEASE[0])

/* ── Camera: z keyframes (the door stands at z = 0), height, FOV ── */
type Key = { at: number; z: number; y: number; fov: number }
const KEYS: Key[] = [
  { at: 0, z: 12.5, y: 1.3, fov: 38 },
  { at: INTRO[1], z: 12.5, y: 1.3, fov: 38 },
  { at: ANTICIPATION[1], z: 9.5, y: 1.5, fov: 38 },
  { at: OPEN[1], z: 5.2, y: 1.8, fov: 42 },
  { at: THRESHOLD[1], z: -2.5, y: 2.0, fov: 72 }, // through the doorway, lens widening with speed
  { at: 1, z: -4, y: 2.0, fov: 72 },
]
export function cameraAt(p: number) {
  let i = 0
  while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  // The dive through the door accelerates (ease-in); everything else is smooth
  const raw = range(p, a.at, b.at)
  const t = b.at === THRESHOLD[1] ? easeIn(raw) : smoother(raw)
  return { z: a.z + (b.z - a.z) * t, y: a.y + (b.y - a.y) * t, fov: a.fov + (b.fov - a.fov) * t }
}

/* ── The Lab (behind the door) ── */
export const PROJECTS = [
  { name: 'Project One', line: 'Replace with your project — one line on what it does.' },
  { name: 'Project Two', line: 'Replace with your project — one line on what it does.' },
  { name: 'Project Three', line: 'Replace with your project — one line on what it does.' },
]
