// Geometry for the ruin, built in code: cut stone blocks with chipped edges and corners, and
// natural rocks. Real stone is never a perfect box — the silhouette breaking up is half of what
// makes it read as real.
import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

/* ── 3D value noise (seeded by an offset) ── */
const fract = (v: number) => v - Math.floor(v)
function hash3(x: number, y: number, z: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453)
}
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const s = (t: number) => t * t * (3 - 2 * t)
  const tx = s(x - xi)
  const ty = s(y - yi)
  const tz = s(z - zi)
  const l = (a: number, b: number, t: number) => a + (b - a) * t
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz)
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), tx), l(c(0, 1, 0), c(1, 1, 0), tx), ty),
    l(l(c(0, 0, 1), c(1, 0, 1), tx), l(c(0, 1, 1), c(1, 1, 1), tx), ty),
    tz
  )
}
export function fbm3(x: number, y: number, z: number, octaves = 4) {
  let sum = 0
  let amp = 0.5
  let f = 1
  for (let o = 0; o < octaves; o++) {
    sum += noise3(x * f, y * f, z * f) * amp
    amp *= 0.5
    f *= 2.03
  }
  return sum
}

/* ── A cut stone block: flat faces with slight undulation, chipped edges and broken corners ── */
export function chippedBlock(w: number, h: number, d: number, seed: number, texel = 1.4) {
  const seg = (v: number) => Math.max(6, Math.ceil(v * 28))
  const g = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d))
  const pos = g.attributes.position as THREE.BufferAttribute
  const nor = g.attributes.normal as THREE.BufferAttribute
  const uv = g.attributes.uv as THREE.BufferAttribute
  const o = seed * 13.37
  const hw = w / 2
  const hh = h / 2
  const hd = d / 2
  const p = new THREE.Vector3()
  const inward = new THREE.Vector3()
  const chip = new Float32Array(pos.count)
  const local = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    // World-scaled planar UVs per face, so every block shares the same texel density
    const nx = Math.abs(nor.getX(i))
    const ny = Math.abs(nor.getY(i))
    if (nx > 0.5) uv.setXY(i, (p.z + o) / texel, (p.y + o * 0.7) / texel)
    else if (ny > 0.5) uv.setXY(i, (p.x + o) / texel, (p.z + o * 0.3) / texel)
    else uv.setXY(i, (p.x + o * 0.5) / texel, (p.y + o) / texel)

    // Distance to the nearest edge = the second smallest distance to a face
    const f = [hw - Math.abs(p.x), hh - Math.abs(p.y), hd - Math.abs(p.z)].sort((a, b) => a - b)
    const edge = f[1]
    const corner = f[2]
    const edgeMask = 1 - THREE.MathUtils.smoothstep(edge, 0, 0.07)
    const cornerMask = 1 - THREE.MathUtils.smoothstep(corner, 0, 0.16)
    const n1 = fbm3(p.x * 5 + o, p.y * 5, p.z * 5, 4)
    const n2 = fbm3(p.x * 16 + o, p.y * 16, p.z * 16, 3)
    const n3 = fbm3(p.x * 1.4 + o, p.y * 1.4, p.z * 1.4, 2)
    // Chips: deep where the noise is high, only near edges; corners break off more
    // Ridged noise gives chips with sharp, conchoidal edges instead of soft dents
    const ridged = 1 - Math.abs(n1 * 2 - 1)
    const chipN = Math.max(0, ridged - 0.55) * 2.2
    let depth = edgeMask * chipN * 0.07 + cornerMask * edgeMask * Math.max(0, n1 - 0.45) * 0.35
    depth += edgeMask * 0.006 // softened arris
    depth += (n2 - 0.5) * 0.008 + (n3 - 0.5) * 0.02 // pitted surface, faces not perfectly flat
    inward.set(p.x / (hw * hw), p.y / (hh * hh), p.z / (hd * hd)).normalize().multiplyScalar(-depth)
    pos.setXYZ(i, p.x + inward.x, p.y + inward.y, p.z + inward.z)
    chip[i] = depth
    local[i * 3] = p.x
    local[i * 3 + 1] = p.y
    local[i * 3 + 2] = p.z
  }
  g.computeVertexNormals()
  paintStone(g, seed, chip, local, hh)
  return g
}

/* ── Vertex colour: each block its own tone; dark crevices where it chipped; grime at the base;
      moss and lichen on the faces that look up at the sky ── */
function paintStone(g: THREE.BufferGeometry, seed: number, chip: Float32Array, local: Float32Array, halfH: number) {
  const nor = g.attributes.normal as THREE.BufferAttribute
  const count = nor.count
  const col = new Float32Array(count * 3)
  const r = fract(Math.sin(seed * 91.7) * 4375.5)
  const r2 = fract(Math.sin(seed * 37.3) * 2531.1)
  // Block tone: slightly warmer or cooler, lighter or darker
  const tone = 0.82 + r * 0.3
  const warm = (r2 - 0.5) * 0.08
  for (let i = 0; i < count; i++) {
    const x = local[i * 3]
    const y = local[i * 3 + 1]
    const z = local[i * 3 + 2]
    let k = tone * (1 - Math.min(0.55, chip[i] * 3.2)) // crevices hold shadow and dirt
    const base = THREE.MathUtils.clamp((y + halfH) / Math.max(halfH * 2, 0.01), 0, 1)
    k *= 0.8 + 0.2 * THREE.MathUtils.smoothstep(base, 0, 0.35) // grime at the foot
    let cr = k * (1 + warm)
    let cg = k
    let cb = k * (1 - warm)
    const up = nor.getY(i)
    if (up > 0.55) {
      const m = fbm3(x * 3 + seed, y * 3, z * 3, 3)
      const moss = THREE.MathUtils.smoothstep(m, 0.42, 0.62) * THREE.MathUtils.smoothstep(up, 0.55, 0.9)
      cr = cr * (1 - moss) + 0.42 * moss
      cg = cg * (1 - moss) + 0.5 * moss
      cb = cb * (1 - moss) + 0.3 * moss
    }
    col[i * 3] = cr
    col[i * 3 + 1] = cg
    col[i * 3 + 2] = cb
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
}

/* ── A natural rock: a smooth sphere pushed in and out by layered noise, flattened ── */
export function rock(seed: number, detail = 4, flatten = 0.62) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail)
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  g = mergeVertices(g)
  const pos = g.attributes.position as THREE.BufferAttribute
  const uvs = new Float32Array(pos.count * 2)
  const o = seed * 7.13
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const big = fbm3(v.x * 1.3 + o, v.y * 1.3, v.z * 1.3, 3)
    const mid = fbm3(v.x * 4 + o, v.y * 4, v.z * 4, 3)
    // Faceted, fractured look: quantise the large noise a little
    const facet = Math.round(big * 6) / 6
    const r = 1 + (big * 0.6 + facet * 0.4 - 0.5) * 0.7 + (mid - 0.5) * 0.14
    v.multiplyScalar(r)
    v.y *= flatten
    if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.2 // flat underside, sits on the ground
    pos.setXYZ(i, v.x, v.y, v.z)
    uvs[i * 2] = (v.x + v.z) * 0.45 + o
    uvs[i * 2 + 1] = v.y * 0.45
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  g.computeVertexNormals()
  const local = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    local[i * 3] = pos.getX(i)
    local[i * 3 + 1] = pos.getY(i)
    local[i * 3 + 2] = pos.getZ(i)
  }
  paintStone(g, seed, new Float32Array(pos.count), local, 0.6)
  return g
}
