#!/usr/bin/env node
/*
  Start a new single-page cinematic site (landing page, product page, event page…).

    node create-site.mjs <destination-folder> [--title "VOLT X"] [--scene SceneName --beats 4] [--no-background]

  Creates a Next.js 16 project with the house setup: fonts, dark base styles, the animated
  ColorBends background, a hero, lint rules, and the helper components (RevealHeading, FadeIn,
  Magnet). With --scene it also scaffolds a first pinned 3D scene and places it on the page.
  Copies scripts/new-scene.mjs and scripts/retheme.mjs into the project so more scenes and
  recolouring work without the skill.
*/
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const template = path.resolve(here, '..', 'template')
const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}
const dest = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--no-background'].includes(args[i - 1])))
if (!dest) {
  console.error('Usage: node create-site.mjs <destination-folder> [--title "Name"] [--scene SceneName --beats 4] [--no-background]')
  process.exit(1)
}
const target = path.resolve(dest)
if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
  console.error(`create-site: ${target} is not empty — pick a new or empty folder.`)
  process.exit(1)
}
const title = opt('--title', 'Untitled')
const background = !args.includes('--no-background')
const sceneName = opt('--scene', null)

const copy = (rel, to = rel) => {
  const out = path.join(target, to)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.copyFileSync(path.join(template, rel), out)
}

for (const f of ['tsconfig.json', 'next.config.ts', 'postcss.config.mjs', 'eslint.config.mjs', '.gitignore', 'theme.json']) copy(f)
copy('src/app/globals.css')
copy('src/app/favicon.ico')
for (const f of ['FadeIn.tsx', 'RevealHeading.tsx', 'Magnet.tsx', 'fonts.ts', 'Sparkle.tsx', 'ColorBends.tsx', 'blackHole.ts']) {
  if (!background && (f === 'ColorBends.tsx' || f === 'blackHole.ts')) continue
  copy(`src/components/${f}`)
}
fs.mkdirSync(path.join(target, 'scripts'), { recursive: true })
for (const s of ['new-scene.mjs', 'retheme.mjs']) fs.copyFileSync(path.join(here, s), path.join(target, 'scripts', s))

// package.json: the template's dependencies minus portfolio-only ones
const pkg = JSON.parse(fs.readFileSync(path.join(template, 'package.json'), 'utf8'))
pkg.name = path.basename(target).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'cinematic-site'
pkg.version = '0.1.0'
delete pkg.dependencies.ogl // only the portfolio's living portrait uses it
fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
fs.writeFileSync(
  path.join(target, 'src/app/layout.tsx'),
  `import type { Metadata } from 'next'
import { Kanit } from 'next/font/google'
import './globals.css'
${background ? "import ColorBends from '@/components/ColorBends'\n" : ''}
const kanit = Kanit({ weight: ['300', '400', '500', '600', '700', '800', '900'], subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: '${esc(title)}',
  description: '${esc(title)}',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={kanit.className}>
      <body className="relative bg-[#03010A]">
${
  background
    ? `        {/* Animated colour bands behind the whole page (house style). Tune or remove freely. */}
        <div className="pointer-events-none fixed inset-0 z-0 opacity-70">
          <ColorBends colors={['#FF3B3B', '#7A0000', '#3D0000']} rotation={90} speed={0.2} bandWidth={6} noise={0.15} intensity={1.5} transparent />
        </div>
`
    : ''
}        <div className="relative z-10">{children}</div>
      </body>
    </html>
  )
}
`
)

fs.writeFileSync(
  path.join(target, 'src/app/page.tsx'),
  `import FadeIn from '@/components/FadeIn'

// Sections go in order. Add scenes with:  node scripts/new-scene.mjs . SceneName --beats 4
export default function Home() {
  return (
    <main className="min-h-dvh w-full">
      <section className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
        <FadeIn y={20}>
          <span className="eyebrow-label">Introducing</span>
        </FadeIn>
        <h1 className="font-black uppercase leading-[0.9] text-white" style={{ fontSize: 'clamp(3rem, 12vw, 180px)' }}>
          ${title.replace(/[<>{}]/g, '')}
        </h1>
        <FadeIn delay={0.2} y={20}>
          <p className="max-w-xl text-base text-[#9a9aa3] sm:text-lg">One line about what this is.</p>
        </FadeIn>
      </section>
    </main>
  )
}
`
)

let sceneNote = ''
if (sceneName) {
  const r = spawnSync(process.execPath, [path.join(here, 'new-scene.mjs'), target, sceneName, '--beats', opt('--beats', '4')], { encoding: 'utf8' })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    process.exit(1)
  }
  const Name = sceneName.replace(/[^A-Za-z0-9]/g, '').replace(/^./, (c) => c.toUpperCase())
  const pagePath = path.join(target, 'src/app/page.tsx')
  let page = fs.readFileSync(pagePath, 'utf8')
  page = page.replace("import FadeIn from '@/components/FadeIn'\n", `import FadeIn from '@/components/FadeIn'\nimport ${Name}Section from '@/components/${Name}Section'\n`)
  page = page.replace('      </section>\n    </main>', `      </section>\n      <${Name}Section />\n    </main>`)
  fs.writeFileSync(pagePath, page)
  sceneNote = `\nA first scene, ${Name}, is scaffolded and on the page (src/components/${Name}*).`
}

console.log(`Site created in ${target}${sceneNote}

Next:
  cd "${target}"
  npm install
  npm run dev        # http://localhost:3000

Add scenes:   node scripts/new-scene.mjs . SceneName --beats 4   (add --no-canvas for DOM-only effects)
Recolour:     node scripts/retheme.mjs . --accent "#22D3EE"`)
