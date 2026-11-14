#!/usr/bin/env node
/*
  Recolour the portfolio's accent in one go.

  The template's accent is a family of related reds (bright accent, deep shadows, hot ember
  highlights) spread across Tailwind classes, inline styles, canvas drawings and shaders. This
  script moves the whole family together, so the glow/shadow relationships the design depends
  on stay intact.

  Usage:
    node retheme.mjs <project-dir> --accent "#14B8A6"                    # main accent becomes exactly this colour
    node retheme.mjs <project-dir> --accent "#14B8A6" --keep-brightness  # take only the hue; keep the template's vivid glow
    node retheme.mjs <project-dir> --hue 220                             # hue in degrees (0 = red), template brightness
    node retheme.mjs <project-dir> --dry-run --accent "#22C55E"          # show what would change
    node retheme.mjs --accent "#8B5CF6" --show "#FF3B3B" "#7A0000"       # just print what template colours become

  Works on src/ when the project has one, otherwise on the whole folder (skipping node_modules
  and build output), so it can also recolour effects copied into another site. The current
  theme is stored in <project-dir>/theme.json, so the script can be run again to switch colour.
  Neutral greys, the text colour and the gold/silver/bronze tier colours are left alone.
*/
import fs from 'node:fs'
import path from 'node:path'

// The accent family as shipped (hue 0). Add a colour here if you introduce a new accent shade.
const FAMILY_HEX = [
  '#FF3B3B', '#FF6B6B', '#FF6A6A', '#FF2020', '#FF4040', '#B00000', '#A00000', '#8A0000',
  '#7A0000', '#3D0000', '#0A0003', '#FF6A4D', '#FFB27A', '#FF8A4C', '#FFD6D6', '#FFD2B8',
]
const FAMILY_RGB = [
  [255, 59, 59],
  [255, 32, 32],
  [255, 40, 40],
  [160, 0, 0],
  [122, 0, 0],
]

function usage(msg) {
  if (msg) console.error(`retheme: ${msg}\n`)
  console.error('Usage: node retheme.mjs <project-dir> (--accent "#RRGGBB" | --hue <0-360>) [--dry-run]')
  process.exit(1)
}

/* ── colour maths ── */
const hexToRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()

function rgbToHsl([r, g, b]) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToRgb([h, s, l]) {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

// The theme is described by where the main accent (#FF3B3B as shipped) ends up: its hue,
// saturation and lightness. Every other shade keeps its relationship to the main accent: hue
// shifts by the same angle, saturation scales by the same ratio, and lightness is remapped so
// the main accent lands exactly on the target while black stays black and white stays white.
const BASE = rgbToHsl(hexToRgb('#FF3B3B'))
const IDENTITY = { hue: BASE[0], sat: BASE[1], light: BASE[2] }

function shade(rgb, theme) {
  const [h, s, l] = rgbToHsl(rgb)
  const [bh, bs, bl] = BASE
  const nl = l <= bl ? (l * theme.light) / bl : theme.light + ((l - bl) * (1 - theme.light)) / (1 - bl)
  const ns = Math.min(1, (s * theme.sat) / bs)
  return hslToRgb([h + theme.hue - bh, ns, nl]).map((v) => Math.round(v))
}

/* ── arguments ── */
const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith('--') && !/^#|^\d/.test(a))
if (!dir && !args.includes('--show')) usage('missing <project-dir>')
const opt = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const dryRun = args.includes('--dry-run')
let target
if (opt('--accent')) {
  const hex = opt('--accent')
  if (!/^#?[0-9a-f]{6}$/i.test(hex)) usage(`--accent must be a 6-digit hex colour, got "${hex}"`)
  const [h, s, l] = rgbToHsl(hexToRgb(hex))
  if (s < 0.15) console.warn('retheme: that colour is nearly grey — glows and shadows will look washed out.')
  if (l < 0.2 || l > 0.85) console.warn('retheme: very dark or very light accents lose the glow effect; a mid-tone usually looks best.')
  target = args.includes('--keep-brightness') ? { ...IDENTITY, hue: h } : { hue: h, sat: s, light: l }
} else if (opt('--hue') !== undefined) {
  const h = Number(opt('--hue'))
  if (!Number.isFinite(h)) usage('--hue must be a number of degrees')
  target = { ...IDENTITY, hue: h }
} else usage('give --accent or --hue')
target.hue = ((target.hue % 360) + 360) % 360

// --show: just print what the given colours become (e.g. for ColorBends props on another site)
const showIdx = args.indexOf('--show')
if (showIdx >= 0) {
  const colours = args.slice(showIdx + 1).filter((a) => /^#?[0-9a-f]{6}$/i.test(a))
  if (!colours.length) usage('--show needs one or more #RRGGBB colours from the template')
  for (const c of colours) console.log(`${c.toUpperCase()} → ${rgbToHex(shade(hexToRgb(c), target))}`)
  process.exit(0)
}

const root = path.resolve(dir)
if (!fs.existsSync(root)) usage(`${root} does not exist`)
// Next.js projects keep their code in src/; projects without one are scanned from the root
const srcDir = fs.existsSync(path.join(root, 'src')) ? path.join(root, 'src') : root
const themeFile = path.join(root, 'theme.json')
const saved = fs.existsSync(themeFile) ? JSON.parse(fs.readFileSync(themeFile, 'utf8')) : {}
// Older theme.json files only stored a hue
const current = { ...IDENTITY, hue: BASE[0], ...saved }

/* ── replacement table: current shade → new shade ── */
const hexMap = new Map()
for (const hex of FAMILY_HEX) {
  const base = hexToRgb(hex)
  hexMap.set(rgbToHex(shade(base, current)), rgbToHex(shade(base, target)))
}
const rgbMap = FAMILY_RGB.map((base) => [shade(base, current), shade(base, target)])

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hexPattern = new RegExp([...hexMap.keys()].map(escape).join('|'), 'gi')

function recolour(text) {
  let count = 0
  // Hex: one pass with a single regex, so a colour that maps onto another family member isn't
  // replaced twice
  text = text.replace(hexPattern, (m) => {
    count++
    return hexMap.get(m.toUpperCase()) ?? m
  })
  // rgb()/rgba() with any spacing
  const rgbPattern = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*([,)])/g
  text = text.replace(rgbPattern, (m, r, g, b, tail) => {
    const hit = rgbMap.find(([from]) => from[0] === +r && from[1] === +g && from[2] === +b)
    if (!hit) return m
    count++
    const [nr, ng, nb] = hit[1]
    const fn = m.startsWith('rgba') ? 'rgba' : 'rgb'
    const sep = m.includes(', ') ? ', ' : ','
    return `${fn}(${nr}${sep}${ng}${sep}${nb}${tail}`
  })
  return { text, count }
}

/* ── walk src/ ── */
const files = []
const walk = (d) => {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'out', 'dist', 'build', '.git', 'scripts'].includes(entry.name)) walk(p)
    }
    else if (/\.(tsx?|css|mjs|js)$/.test(entry.name)) files.push(p)
  }
}
walk(srcDir)

let total = 0
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8')
  const { text, count } = recolour(before)
  if (count === 0) continue
  total += count
  console.log(`${dryRun ? 'would change' : 'changed'} ${String(count).padStart(3)}  ${path.relative(root, file)}`)
  if (!dryRun) fs.writeFileSync(file, text)
}

if (!dryRun) fs.writeFileSync(themeFile, JSON.stringify(target, null, 2) + '\n')
const from = rgbToHex(shade(hexToRgb('#FF3B3B'), current))
const to = rgbToHex(shade(hexToRgb('#FF3B3B'), target))
console.log(`\n${dryRun ? 'Dry run: ' : ''}${total} colour values ${dryRun ? 'would move' : 'moved'}: main accent ${from} → ${to}.`)
