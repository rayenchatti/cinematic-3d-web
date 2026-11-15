// Height of the ground at (x, z): gentle mounds that rise toward the sides and the back, with a
// flat, worn path leading up to the doorway. Everything that sits on the ground uses this, so
// rocks, pebbles and grass rest on the surface instead of floating or sinking.
import { makeNoise } from './ruinTextures'

const noise = makeNoise(77, 64)
const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function heightAt(x: number, z: number) {
  const n = noise(x * 0.18 + 32, z * 0.18 + 32, 4) - 0.5 // -0.5 … 0.5
  const fine = noise(x * 0.9 + 5, z * 0.9 + 5, 3) - 0.5
  let h = n * 0.9 + fine * 0.08
  // Rise toward the sides and behind the ruin, like a hollow the ruin sits in
  h += smoothstep(3.5, 10, Math.abs(x)) * 0.9 + smoothstep(-2, -12, z) * 0.6
  // Flat, trodden ground at the ruin and along the path to it
  const path = (1 - smoothstep(1.6, 3.4, Math.abs(x))) * (1 - smoothstep(9, 13, z)) * smoothstep(-4, -2, z)
  const base = (1 - smoothstep(2.8, 4.2, Math.abs(x))) * (1 - smoothstep(2.5, 4, Math.abs(z - 0.3)))
  const flat = Math.max(path, base)
  return h * (1 - flat) + (fine * 0.02) * flat
}
