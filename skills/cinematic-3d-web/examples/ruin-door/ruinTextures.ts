// Procedural textures for the ruin, drawn once on 2D canvases (no downloads):
// weathered stone (colour + bump), carved door slabs, packed earth, soft fog and dust sprites.
import * as THREE from 'three'

/* ── Seeded value noise + fractal sum ── */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeNoise(seed: number, gridSize = 64) {
  const rand = mulberry32(seed)
  const grid = new Float32Array(gridSize * gridSize).map(() => rand())
  const at = (x: number, y: number) => grid[((y % gridSize) + gridSize) % gridSize * gridSize + (((x % gridSize) + gridSize) % gridSize)]
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const value = (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const tx = smooth(x - xi)
    const ty = smooth(y - yi)
    const a = at(xi, yi)
    const b = at(xi + 1, yi)
    const c = at(xi, yi + 1)
    const d = at(xi + 1, yi + 1)
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty
  }
  // Fractal sum, tileable because the grid wraps
  return (x: number, y: number, octaves = 5) => {
    let sum = 0
    let amp = 0.5
    let f = 1
    for (let o = 0; o < octaves; o++) {
      sum += value(x * f, y * f) * amp
      amp *= 0.5
      f *= 2
    }
    return sum
  }
}

function toTexture(canvas: HTMLCanvasElement, srgb: boolean, repeat = 1) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.anisotropy = 8
  return tex
}

type RGB = [number, number, number]
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/* ── Weathered stone: mottled colour, darker pits, hairline cracks; bump from the same field ── */
export function makeStone(seed: number, size = 512, light: RGB = [128, 120, 108], dark: RGB = [62, 58, 52], moss = 0.18) {
  const noise = makeNoise(seed)
  const detail = makeNoise(seed + 7)
  const rand = mulberry32(seed + 99)
  const color = document.createElement('canvas')
  const bump = document.createElement('canvas')
  color.width = color.height = bump.width = bump.height = size
  const cc = color.getContext('2d')!
  const bc = bump.getContext('2d')!
  const ci = cc.createImageData(size, size)
  const bi = bc.createImageData(size, size)
  const scale = 64 / size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = noise(x * scale * 0.5, y * scale * 0.5) // large blotches
      const d = detail(x * scale * 3, y * scale * 3, 4) // grain
      const pit = Math.max(0, d - 0.62) * 3 // small pits
      let c = mix(dark, light, Math.min(1, Math.max(0, n * 1.25 - 0.1 + (d - 0.5) * 0.35)))
      c = mix(c, [44, 40, 36], pit)
      // Moss/lichen in the low, damp areas
      const m = Math.max(0, 0.42 - n) * moss * 4 * (0.6 + d * 0.8)
      c = mix(c, [70, 82, 52], Math.min(0.5, m))
      const i = (y * size + x) * 4
      ci.data[i] = c[0]
      ci.data[i + 1] = c[1]
      ci.data[i + 2] = c[2]
      ci.data[i + 3] = 255
      const h = 255 * Math.min(1, Math.max(0, n * 0.55 + d * 0.45 - pit * 0.5))
      bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = h
      bi.data[i + 3] = 255
    }
  }
  cc.putImageData(ci, 0, 0)
  bc.putImageData(bi, 0, 0)
  // Hairline cracks: dark in colour, sunk in the bump
  for (let k = 0; k < 7; k++) {
    let x = rand() * size
    let y = rand() * size
    let a = rand() * Math.PI * 2
    const steps = 20 + rand() * 50
    cc.strokeStyle = 'rgba(25,22,20,0.55)'
    bc.strokeStyle = 'rgba(0,0,0,0.8)'
    cc.lineWidth = bc.lineWidth = 0.6 + rand() * 1.2
    cc.beginPath()
    bc.beginPath()
    cc.moveTo(x, y)
    bc.moveTo(x, y)
    for (let s = 0; s < steps; s++) {
      a += (rand() - 0.5) * 0.9
      x += Math.cos(a) * 6
      y += Math.sin(a) * 6
      cc.lineTo(x, y)
      bc.lineTo(x, y)
    }
    cc.stroke()
    bc.stroke()
  }
  return { map: toTexture(color, true), bump: toTexture(bump, false), canvas: color, bumpCanvas: bump }
}

/* ── A door slab: stone with a worn carved relief (grooves sink in the bump, darken in colour) ── */
export function makeDoorSlab(seed: number, mirrored: boolean) {
  const base = makeStone(seed, 512, [118, 110, 98], [58, 54, 48], 0.12)
  const size = 512
  const cc = base.canvas.getContext('2d')!
  const bc = base.bumpCanvas.getContext('2d')!
  const rand = mulberry32(seed + 3)
  const carve = (draw: (c: CanvasRenderingContext2D) => void) => {
    // Colour: groove shadow; bump: sunk groove with a slightly raised lip
    cc.save()
    cc.strokeStyle = 'rgba(30,26,22,0.6)'
    cc.lineWidth = 7
    cc.lineCap = 'round'
    draw(cc)
    cc.restore()
    bc.save()
    bc.strokeStyle = 'rgba(255,255,255,0.35)'
    bc.lineWidth = 11
    bc.lineCap = 'round'
    draw(bc)
    bc.strokeStyle = 'rgba(0,0,0,0.95)'
    bc.lineWidth = 6
    draw(bc)
    bc.restore()
  }
  const cx = mirrored ? size * 0.08 : size * 0.92 // ring centre sits on the seam edge
  // Border panel
  carve((c) => {
    c.beginPath()
    c.rect(38, 30, size - 76, size - 60)
    c.stroke()
  })
  // Half of a large ring with a sun-like centre, split by the seam
  carve((c) => {
    c.beginPath()
    c.arc(cx, size * 0.34, size * 0.3, 0, Math.PI * 2)
    c.stroke()
    c.beginPath()
    c.arc(cx, size * 0.34, size * 0.17, 0, Math.PI * 2)
    c.stroke()
  })
  // Rays between the rings
  carve((c) => {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2
      c.beginPath()
      c.moveTo(cx + Math.cos(a) * size * 0.19, size * 0.34 + Math.sin(a) * size * 0.19)
      c.lineTo(cx + Math.cos(a) * size * 0.28, size * 0.34 + Math.sin(a) * size * 0.28)
      c.stroke()
    }
  })
  // Rows of worn glyphs in the lower panel
  carve((c) => {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const x = 80 + col * 76 + rand() * 6
        const y = size * 0.66 + row * 38
        c.beginPath()
        const shape = Math.floor(rand() * 4)
        if (shape === 0) c.arc(x, y, 10, 0, Math.PI * 2)
        if (shape === 1) {
          c.moveTo(x - 10, y + 10)
          c.lineTo(x, y - 12)
          c.lineTo(x + 10, y + 10)
        }
        if (shape === 2) {
          c.moveTo(x - 10, y)
          c.lineTo(x + 10, y)
          c.moveTo(x, y - 12)
          c.lineTo(x, y + 12)
        }
        if (shape === 3) {
          c.moveTo(x - 9, y - 9)
          c.lineTo(x + 9, y + 9)
          c.moveTo(x + 9, y - 9)
          c.lineTo(x - 9, y + 9)
        }
        c.stroke()
      }
    }
  })
  // Weathering over the carving: chips and grime
  for (let k = 0; k < 160; k++) {
    const x = rand() * size
    const y = rand() * size
    const r = 1 + rand() * 6
    cc.fillStyle = `rgba(${40 + rand() * 30},${36 + rand() * 25},${30 + rand() * 20},${0.15 + rand() * 0.25})`
    cc.beginPath()
    cc.arc(x, y, r, 0, Math.PI * 2)
    cc.fill()
  }
  base.map.needsUpdate = true
  base.bump.needsUpdate = true
  return { map: base.map, bump: base.bump }
}

/* ── Packed earth with grit for the ground ── */
export function makeEarth(seed: number) {
  // Packed dirt with damp patches, scattered gravel and a few dry leaves; bump follows the gravel
  const size = 1024
  const big = makeNoise(seed, 64)
  const mid = makeNoise(seed + 3, 64)
  const rand = mulberry32(seed + 11)
  const color = document.createElement('canvas')
  const bump = document.createElement('canvas')
  color.width = color.height = bump.width = bump.height = size
  const cc = color.getContext('2d')!
  const bc = bump.getContext('2d')!
  const ci = cc.createImageData(size, size)
  const bi = bc.createImageData(size, size)
  const s = 64 / size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = big(x * s * 0.35, y * s * 0.35, 4) // broad colour drift
      const d = mid(x * s * 2.5, y * s * 2.5, 4) // grain
      const damp = Math.max(0, 0.45 - n) * 2.2 // darker, wetter hollows
      let c = mix([98, 86, 70], [70, 61, 50], Math.min(1, Math.max(0, (d - 0.3) * 1.6)))
      c = mix(c, [52, 46, 39], Math.min(0.7, damp))
      c = mix(c, [86, 84, 66], Math.max(0, n - 0.62) * 1.5) // dusty, dry patches
      const i = (y * size + x) * 4
      ci.data[i] = c[0]
      ci.data[i + 1] = c[1]
      ci.data[i + 2] = c[2]
      ci.data[i + 3] = 255
      const h = 255 * Math.min(1, Math.max(0, 0.35 + (d - 0.5) * 0.6 - damp * 0.2))
      bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = h
      bi.data[i + 3] = 255
    }
  }
  cc.putImageData(ci, 0, 0)
  bc.putImageData(bi, 0, 0)
  // Gravel: small lit stones with a shadow side, raised in the bump
  for (let k = 0; k < 5200; k++) {
    const x = rand() * size
    const y = rand() * size
    const r = 0.8 + Math.pow(rand(), 3) * 4.5
    const tone = 70 + rand() * 70
    cc.fillStyle = `rgba(${tone * 0.55},${tone * 0.5},${tone * 0.44},0.9)`
    cc.beginPath()
    cc.ellipse(x + r * 0.25, y + r * 0.3, r, r * 0.8, 0, 0, Math.PI * 2)
    cc.fill()
    cc.fillStyle = `rgb(${tone},${tone * 0.93},${tone * 0.82})`
    cc.beginPath()
    cc.ellipse(x, y, r, r * 0.8, rand() * Math.PI, 0, Math.PI * 2)
    cc.fill()
    bc.fillStyle = `rgba(255,255,255,${0.5 + rand() * 0.4})`
    bc.beginPath()
    bc.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2)
    bc.fill()
  }
  // Dry leaves / twigs
  for (let k = 0; k < 260; k++) {
    const x = rand() * size
    const y = rand() * size
    cc.fillStyle = `rgba(${90 + rand() * 40},${70 + rand() * 25},${40 + rand() * 15},0.7)`
    cc.beginPath()
    cc.ellipse(x, y, 2 + rand() * 4, 1 + rand() * 1.5, rand() * Math.PI, 0, Math.PI * 2)
    cc.fill()
  }
  const map = toTexture(color, true, 7)
  const bmp = toTexture(bump, false, 7)
  return { map, bump: bmp }
}

/* ── Soft, uneven fog puff (alpha only) ── */
export function makeFogPuff(seed: number) {
  const size = 256
  const noise = makeNoise(seed, 32)
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - size / 2) / (size / 2)
      const dy = (y - size / 2) / (size / 2)
      const fall = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy))
      const n = noise((x / size) * 6, (y / size) * 6, 4)
      const a = Math.pow(fall, 1.6) * Math.max(0, n * 1.6 - 0.35)
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
      img.data[i + 3] = Math.min(255, a * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(c, true)
}

/* ── Round soft dot for dust and grit ── */
export function makeSoftDot() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.4)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return toTexture(c, true)
}

export { mulberry32 }
