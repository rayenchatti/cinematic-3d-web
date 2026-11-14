#!/usr/bin/env node
/*
  Copy the portfolio template into a new folder, ready for `npm install`.

  Usage:
    node create-portfolio.mjs <destination-folder> [--name my-portfolio]

  Refuses to write into a folder that already has files in it, so nothing gets overwritten.
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const template = path.resolve(here, '..', 'template')

const args = process.argv.slice(2)
const dest = args.find((a) => !a.startsWith('--'))
const nameIdx = args.indexOf('--name')
if (!dest) {
  console.error('Usage: node create-portfolio.mjs <destination-folder> [--name my-portfolio]')
  process.exit(1)
}

const target = path.resolve(dest)
if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
  console.error(`create-portfolio: ${target} is not empty — pick a new or empty folder.`)
  process.exit(1)
}

const SKIP = new Set(['node_modules', '.next', 'out', '.vercel'])
fs.cpSync(template, target, {
  recursive: true,
  filter: (src) => !SKIP.has(path.basename(src)) && !path.basename(src).endsWith('.tsbuildinfo'),
})

// The recolour script travels with the project, so the colour can be changed later without the skill
fs.mkdirSync(path.join(target, 'scripts'), { recursive: true })
fs.copyFileSync(path.join(here, 'retheme.mjs'), path.join(target, 'scripts', 'retheme.mjs'))

const pkgPath = path.join(target, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
pkg.name =
  nameIdx >= 0 && args[nameIdx + 1]
    ? args[nameIdx + 1]
    : path.basename(target).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-3d-portfolio'
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

console.log(`Portfolio template copied to ${target}

Next:
  cd "${target}"
  npm install
  npm run dev        # http://localhost:3000

Then make it yours in src/content.ts.`)
