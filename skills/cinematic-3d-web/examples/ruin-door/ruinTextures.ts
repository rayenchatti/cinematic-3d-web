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

/* ── Normal map from a height canvas (Sobel, wrapping at the edges so it tiles) ── */
export function heightToNormal(height: HTMLCanvasElement, strength = 2.5, repeat = 1) {
  const w = height.width
  const h = height.height
  const src = height.getContext('2d')!.getImageData(0, 0, w, h).data
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')!
  const img = ctx.createImageData(w, h)
  const H = (x: number, y: number) => src[((((y + h) % h) * w + ((x + w) % w)) * 4)] / 255
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)
      const dy = H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)
      let nx = -dx * strength
      let ny = dy * strength
      let nz = 1
      const l = Math.hypot(nx, ny, nz)
      nx /= l
      ny /= l
      nz /= l
      const i = (y * w + x) * 4
      img.data[i] = (nx * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(out, false, repeat)
}

type RGB = [number, number, number]
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/* ── Weathered stone: mottled colour, darker pits, hairline cracks; bump from the same field ── */
export function makeStone(seed: number, size: number | [number, number] = 1024, light: RGB = [128, 120, 108], dark: RGB = [62, 58, 52], moss = 0.18, streaks = 46) {
  const noise = makeNoise(seed)
  const detail = makeNoise(seed + 7)
  const rand = mulberry32(seed + 99)
  const [W, H] = typeof size === 'number' ? [size, size] : size
  const color = document.createElement('canvas')
  const bump = document.createElement('canvas')
  color.width = bump.width = W
  color.height = bump.height = H
  const cc = color.getContext('2d')!
  const bc = bump.getContext('2d')!
  const ci = cc.createImageData(W, H)
  const bi = bc.createImageData(W, H)
  const scale = 64 / W
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = noise(x * scale * 0.5, y * scale * 0.5) // large blotches
      const d = detail(x * scale * 3, y * scale * 3, 4) // grain
      const pit = Math.max(0, d - 0.62) * 3 // small pits
      let c = mix(dark, light, Math.min(1, Math.max(0, n * 1.25 - 0.1 + (d - 0.5) * 0.35)))
      c = mix(c, [44, 40, 36], pit)
      // Moss/lichen in the low, damp areas
      const m = Math.max(0, 0.42 - n) * moss * 4 * (0.6 + d * 0.8)
      c = mix(c, [70, 82, 52], Math.min(0.5, m))
      const i = (y * W + x) * 4
      ci.data[i] = c[0]
      ci.data[i + 1] = c[1]
      ci.data[i + 2] = c[2]
      ci.data[i + 3] = 255
      const h = 255 * Math.min(1, Math.max(0, n * 0.2 + d * 0.8 - pit * 0.6))
      bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = h
      bi.data[i + 3] = 255
    }
  }
  cc.putImageData(ci, 0, 0)
  bc.putImageData(bi, 0, 0)
  // Hairline cracks: dark in colour, sunk in the bump
  for (let k = 0; k < 7; k++) {
    let x = rand() * W
    let y = rand() * H
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
  // Rain staining: faint dark streaks running down from the top, a few pale calcite runs
  for (let k = 0; k < streaks; k++) {
    const x = rand() * W
    const len = H * (0.2 + rand() * 0.7)
    const y0 = rand() * H * 0.3
    const wdt = 3 + rand() * 18
    const pale = rand() < 0.2
    const g = cc.createLinearGradient(0, y0, 0, y0 + len)
    const col = pale ? '190,186,170' : '30,28,24'
    const a = pale ? 0.08 : 0.06 + rand() * 0.1
    g.addColorStop(0, `rgba(${col},${a})`)
    g.addColorStop(1, `rgba(${col},0)`)
    cc.fillStyle = g
    cc.fillRect(x - wdt / 2, y0, wdt, len)
  }
  // Lichen: clusters of pale grey-green and ochre crust
  for (let k = 0; k < 26; k++) {
    const cx = rand() * W
    const cy = rand() * H
    const ochre = rand() < 0.35
    const n = 20 + rand() * 60
    for (let j = 0; j < n; j++) {
      const r = Math.pow(rand(), 0.6) * W * 0.035
      const a = rand() * Math.PI * 2
      cc.fillStyle = ochre ? `rgba(${150 + rand() * 30},${125 + rand() * 20},${60 + rand() * 20},${0.25 + rand() * 0.35})` : `rgba(${140 + rand() * 30},${148 + rand() * 25},${122 + rand() * 20},${0.2 + rand() * 0.35})`
      cc.beginPath()
      cc.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.8 + rand() * 2.6, 0, Math.PI * 2)
      cc.fill()
    }
  }
  return { map: toTexture(color, true), normal: heightToNormal(bump, 2.2), canvas: color, bumpCanvas: bump }
}

/* ── A door slab: stone with a worn carved relief (grooves sink in the height, darken in colour).
      Drawn at the leaf's real proportions (1.1 m × 3.9 m) so the stone grain isn't stretched. ── */
export function makeDoorSlab(seed: number, mirrored: boolean) {
  const W = 640
  const H = 2240
  const base = makeStone(seed, [W, H], [118, 110, 98], [58, 54, 48], 0.12, 6)
  const cc = base.canvas.getContext('2d')!
  const bc = base.bumpCanvas.getContext('2d')!
  const rand = mulberry32(seed + 3)
  const k = W / 512 // carving drawn in a 512 × 1792 space
  const carve = (draw: (c: CanvasRenderingContext2D) => void, width = 7) => {
    // Colour: groove shadow; height: sunk groove with a slightly raised lip
    cc.save()
    cc.scale(k, k)
    cc.strokeStyle = 'rgba(30,26,22,0.55)'
    cc.lineWidth = width
    cc.lineCap = 'round'
    draw(cc)
    cc.restore()
    bc.save()
    bc.scale(k, k)
    bc.strokeStyle = 'rgba(255,255,255,0.3)'
    bc.lineWidth = width + 5
    bc.lineCap = 'round'
    draw(bc)
    bc.strokeStyle = 'rgba(0,0,0,0.95)'
    bc.lineWidth = width - 1
    draw(bc)
    bc.restore()
  }
  const S = 512
  const cx = mirrored ? 0 : S // the sun disc is centred on the seam: each leaf carries half
  const cy = 560
  // Border panel and a dividing band
  carve((c) => {
    c.beginPath()
    c.rect(34, 34, S - 68, 1792 - 68)
    c.stroke()
    c.beginPath()
    c.moveTo(34, 1040)
    c.lineTo(S - 34, 1040)
    c.stroke()
  })
  // Half of a large sun disc: two rings and rays between them
  carve((c) => {
    c.beginPath()
    c.arc(cx, cy, 330, 0, Math.PI * 2)
    c.stroke()
    c.beginPath()
    c.arc(cx, cy, 180, 0, Math.PI * 2)
    c.stroke()
    c.beginPath()
    c.arc(cx, cy, 70, 0, Math.PI * 2)
    c.stroke()
  }, 9)
  carve((c) => {
    for (let r = 0; r < 16; r++) {
      const a = (r / 16) * Math.PI * 2
      c.beginPath()
      c.moveTo(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200)
      c.lineTo(cx + Math.cos(a) * 310, cy + Math.sin(a) * 310)
      c.stroke()
    }
  })
  // Rows of worn glyphs in the lower panel
  carve((c) => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 5; col++) {
        const x = 90 + col * 84 + (rand() - 0.5) * 6
        const y = 1120 + row * 70
        c.beginPath()
        const shape = Math.floor(rand() * 5)
        if (shape === 0) c.arc(x, y, 14, 0, Math.PI * 2)
        if (shape === 1) {
          c.moveTo(x - 14, y + 14)
          c.lineTo(x, y - 16)
          c.lineTo(x + 14, y + 14)
        }
        if (shape === 2) {
          c.moveTo(x - 14, y)
          c.lineTo(x + 14, y)
          c.moveTo(x, y - 16)
          c.lineTo(x, y + 16)
        }
        if (shape === 3) {
          c.moveTo(x - 12, y - 12)
          c.lineTo(x + 12, y + 12)
          c.moveTo(x + 12, y - 12)
          c.lineTo(x - 12, y + 12)
        }
        if (shape === 4) {
          c.arc(x, y, 14, Math.PI, 0)
          c.moveTo(x, y)
          c.lineTo(x, y + 16)
        }
        c.stroke()
      }
    }
  }, 6)
  // Weathering over the carving: chips, grime, a broken corner of the relief
  for (let n = 0; n < 420; n++) {
    const x = rand() * W
    const y = rand() * H
    const r = (1 + rand() * 6) * k
    cc.fillStyle = `rgba(${40 + rand() * 30},${36 + rand() * 25},${30 + rand() * 20},${0.12 + rand() * 0.22})`
    cc.beginPath()
    cc.arc(x, y, r, 0, Math.PI * 2)
    cc.fill()
    // Some chips also break the relief
    if (rand() < 0.3) {
      bc.fillStyle = `rgba(90,90,90,${0.3 + rand() * 0.4})`
      bc.beginPath()
      bc.arc(x, y, r * 1.3, 0, Math.PI * 2)
      bc.fill()
    }
  }
  // Grime pooled at the foot of the slab
  const g = cc.createLinearGradient(0, H * 0.82, 0, H)
  g.addColorStop(0, 'rgba(35,30,24,0)')
  g.addColorStop(1, 'rgba(35,30,24,0.55)')
  cc.fillStyle = g
  cc.fillRect(0, H * 0.82, W, H * 0.18)
  base.map.needsUpdate = true
  base.normal.dispose()
  return { map: base.map, normal: heightToNormal(base.bumpCanvas, 4) }
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
  return { map, normal: heightToNormal(bump, 2.2, 7) }
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
