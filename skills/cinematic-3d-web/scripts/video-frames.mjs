#!/usr/bin/env node
/*
  Pull still frames out of a reference video so the motion can be studied frame by frame.

    node video-frames.mjs <video> [--every 0.25] [--from 0] [--to <end>] [--width 960] [--out frames]

  --every   seconds between frames (0.25 = 4 per second; use 0.04 for a fast moment)
  --from/--to  only this stretch of the video, in seconds
  --width   frame width in pixels (height keeps the aspect ratio)
  --out     output folder (created; must be empty or new)

  Writes frame-0001.jpg, frame-0002.jpg, … plus index.txt listing each frame's timestamp.
  Needs ffmpeg on the PATH.
*/
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback
}
const video = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')))
if (!video) {
  console.error('Usage: node video-frames.mjs <video> [--every 0.25] [--from 0] [--to end] [--width 960] [--out frames]')
  process.exit(1)
}
if (!fs.existsSync(video)) {
  console.error(`video-frames: ${video} not found`)
  process.exit(1)
}

const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' })
if (probe.error || probe.status !== 0) {
  console.error(`video-frames: ffmpeg is not installed or not on the PATH. Install it, then run this again:
  Windows:  winget install Gyan.FFmpeg     (then open a new terminal)
  macOS:    brew install ffmpeg
  Linux:    sudo apt install ffmpeg  (or your distro's package manager)`)
  process.exit(1)
}

const every = Math.max(0.01, Number(opt('--every', '0.25')))
const from = Math.max(0, Number(opt('--from', '0')))
const to = opt('--to', null)
const width = parseInt(opt('--width', '960'), 10) || 960
const out = path.resolve(opt('--out', 'frames'))

if (fs.existsSync(out) && fs.readdirSync(out).length > 0) {
  console.error(`video-frames: ${out} is not empty — choose a new --out folder.`)
  process.exit(1)
}
fs.mkdirSync(out, { recursive: true })

const ffArgs = ['-hide_banner', '-loglevel', 'error', '-ss', String(from)]
if (to !== null) ffArgs.push('-to', String(Number(to)))
ffArgs.push('-i', video, '-vf', `fps=${1 / every},scale=${width}:-2`, '-q:v', '3', path.join(out, 'frame-%04d.jpg'))
const run = spawnSync('ffmpeg', ffArgs, { stdio: 'inherit' })
if (run.status !== 0) {
  console.error('video-frames: ffmpeg failed (see the message above).')
  process.exit(1)
}

const frames = fs.readdirSync(out).filter((f) => f.startsWith('frame-')).sort()
const index = frames.map((f, i) => `${f}\t${(from + i * every).toFixed(2)}s`).join('\n')
fs.writeFileSync(path.join(out, 'index.txt'), index + '\n')
console.log(`${frames.length} frames written to ${out} (one every ${every}s from ${from}s). Timestamps in index.txt.`)
