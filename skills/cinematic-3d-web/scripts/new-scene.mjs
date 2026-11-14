#!/usr/bin/env node
/*
  Scaffold a new scroll-driven 3D scene: the "blockout" layer of the build, already wired.

    node new-scene.mjs <project-dir> <SceneName> [--beats 4] [--screens 5] [--id my-scene] [--no-canvas]

  --no-canvas skips the 3D scene file: for DOM-only effects (text, images, masks, CSS) that still
  need a pinned stage and a shared timeline.

  Writes three files into <project-dir>/src/components (or components/ when there is no src/):

    <SceneName>Section.tsx   pinned section: scroll progress, backdrop title, captions per beat,
                             counter + progress rail, reduced-motion fallback, pauses off-screen
    <SceneName>Scene.tsx     the <Canvas>: keyframed camera with damping + pointer lean +
                             handheld drift, a placeholder hero object, one marker per beat, glow
    <sceneName>Timeline.ts   the beats and every timing number, shared by both files

  Everything is placeholder content in the house style. Replace the objects, camera keys and
  captions with what the scene spec says, keeping the wiring. Needs: framer-motion, three,
  @react-three/fiber, @react-three/drei, and the "@/" alias pointing at the folder above components.
*/
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const VALUE_FLAGS = ['--beats', '--screens', '--id']
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_FLAGS.includes(args[i - 1])))
const noCanvas = args.includes('--no-canvas')
const [dir, rawName] = positional
const opt = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
if (!dir || !rawName) {
  console.error('Usage: node new-scene.mjs <project-dir> <SceneName> [--beats 4] [--screens 5] [--id my-scene]')
  process.exit(1)
}

const Name = rawName.replace(/[^A-Za-z0-9]/g, '').replace(/^./, (c) => c.toUpperCase())
if (!/^[A-Z][A-Za-z0-9]*$/.test(Name)) {
  console.error('new-scene: SceneName must start with a letter (e.g. BeanToCup)')
  process.exit(1)
}
const camel = Name.charAt(0).toLowerCase() + Name.slice(1)
const id = opt('--id', Name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase())
const beats = Math.max(1, Math.min(12, parseInt(opt('--beats', '4'), 10) || 4))
const screens = Math.max(2, parseInt(opt('--screens', String(beats + 2)), 10) || beats + 2)

const root = path.resolve(dir)
const compDir = fs.existsSync(path.join(root, 'src')) ? path.join(root, 'src', 'components') : path.join(root, 'components')
fs.mkdirSync(compDir, { recursive: true })
const files = {
  section: path.join(compDir, `${Name}Section.tsx`),
  scene: path.join(compDir, `${Name}Scene.tsx`),
  timeline: path.join(compDir, `${camel}Timeline.ts`),
}
if (noCanvas) delete files.scene
for (const f of Object.values(files)) {
  if (fs.existsSync(f)) {
    console.error(`new-scene: ${path.relative(root, f)} already exists — pick another name.`)
    process.exit(1)
  }
}

const beatList = Array.from({ length: beats }, (_, i) =>
  `  { title: 'Beat ${i + 1}', text: 'Placeholder caption for beat ${i + 1} — replace with the line from the scene spec.' },`
).join('\n')

const timeline = `// Shared scroll timeline for the ${Name} scene: the 3D camera (${Name}Scene) and the DOM captions
// (${Name}Section) both read from here, so they can't drift apart. All numbers are fractions of
// the section's scroll progress (0 when the stage pins, 1 when it releases).

// One entry per beat of the scene spec
export const BEATS: { title: string; text: string }[] = [
${beatList}
]

export const COUNT = BEATS.length
export const SCREENS = ${screens} // section height in screens; scroll length = SCREENS - 1

export const INTRO_END = 0.12 // backdrop title fades, camera swoops in
export const OUTRO_START = 0.94 // hand-off to the next section
export const SLOT = (OUTRO_START - INTRO_END) / COUNT

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a))
export const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

// Each beat: arrive (caption in, camera settled) → hold → leave (caption out, camera moves on)
export function slotOf(i: number) {
  const start = INTRO_END + i * SLOT
  return { start, arrive: start + SLOT * 0.25, leave: start + SLOT * 0.8, end: start + SLOT }
}

export const activeIndex = (p: number) => (p < INTRO_END ? -1 : Math.min(COUNT - 1, Math.floor((p - INTRO_END) / SLOT)))

// Where each beat's marker sits around the hero object (placeholder layout: a ring)
export const markerPosition = (i: number): [number, number, number] => {
  const a = (i / COUNT) * Math.PI * 2 - Math.PI / 2
  return [Math.cos(a) * 2.6, Math.sin(i * 1.7) * 0.6, Math.sin(a) * 2.6]
}

// Camera keyframes: wide establishing shot → one close shot per beat → pull back out
export type Shot = { at: number; pos: [number, number, number]; target: [number, number, number] }
export const SHOTS: Shot[] = (() => {
  const shots: Shot[] = [{ at: 0, pos: [0, 2.5, 12], target: [0, 0, 0] }]
  for (let i = 0; i < COUNT; i++) {
    const [x, y, z] = markerPosition(i)
    const s = slotOf(i)
    // Outside the marker, looking back across it at the hero: marker in the foreground, hero behind
    const pos: [number, number, number] = [x * 3.4, y + 1.4, z * 3.4]
    shots.push({ at: s.arrive, pos, target: [x * 0.4, y * 0.4, z * 0.4] })
    shots.push({ at: s.leave, pos: [pos[0] * 1.05, pos[1] + 0.25, pos[2] * 1.05], target: [x * 0.4, y * 0.4, z * 0.4] })
  }
  shots.push({ at: 1, pos: [0, 3.5, 13], target: [0, 0, 0] })
  return shots
})()
`

const scene = `'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { MotionValue } from 'framer-motion'
import { COUNT, SHOTS, activeIndex, markerPosition, range, smoother } from './${camel}Timeline'

// Placeholder blockout for the ${Name} scene. Replace the objects and SHOTS with the scene spec;
// keep the rig (damped follow, pointer lean, handheld drift) and the progress wiring.

const ACCENT = '#FF3B3B'

interface SceneProps {
  progress: MotionValue<number>
  active: boolean
}

/* ── Camera: keyframed shots, damped so scroll never jitters, leaning toward the pointer ── */
function CameraRig({ progress }: { progress: MotionValue<number> }) {
  const pointer = useRef({ x: 0, y: 0 })
  const lookAt = useRef(new THREE.Vector3(...SHOTS[0].target))
  // Scratch vectors live in a ref: mutated every frame, never part of render
  const goalRef = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3(), tmp: new THREE.Vector3() })

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state, dt) => {
    const goal = goalRef.current
    const p = progress.get()
    let i = 0
    while (i < SHOTS.length - 2 && p > SHOTS[i + 1].at) i++
    const a = SHOTS[i]
    const b = SHOTS[i + 1]
    const t = smoother(range(p, a.at, b.at))
    goal.pos.set(...a.pos).lerp(goal.tmp.set(...b.pos), t)
    goal.target.set(...a.target).lerp(goal.tmp.set(...b.target), t)

    // Portrait screens: step back so the scene still fits across
    const aspect = state.size.width / state.size.height
    if (aspect < 1) goal.pos.sub(goal.target).multiplyScalar(1 + (1 - aspect) * 1.4).add(goal.target)

    const time = state.clock.elapsedTime
    goal.pos.x += pointer.current.x * 0.25 + Math.sin(time * 0.4) * 0.05
    goal.pos.y += pointer.current.y * 0.15 + Math.cos(time * 0.3) * 0.04

    const k = 1 - Math.exp(-5 * Math.min(dt, 0.05))
    state.camera.position.lerp(goal.pos, k)
    lookAt.current.lerp(goal.target, k)
    state.camera.lookAt(lookAt.current)
  })
  return null
}

/* ── Soft additive glow that always faces the camera (faked bloom) ── */
const glowVertex = /* glsl */ \`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
\`
const glowFragment = /* glsl */ \`
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    float g = pow(max(0.0, 1.0 - r), 2.4);
    gl_FragColor = vec4(uColor * g * uIntensity, g);
  }
\`

function Glow({ size, intensity = 1 }: { size: number; intensity?: number }) {
  const group = useRef<THREE.Group>(null)
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(ACCENT) }, uIntensity: { value: intensity } }), [intensity])
  useFrame((state) => group.current?.quaternion.copy(state.camera.quaternion))
  return (
    <group ref={group}>
      <mesh>
        <planeGeometry args={[size, size]} />
        <shaderMaterial
          vertexShader={glowVertex}
          fragmentShader={glowFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

/* ── Placeholder hero object: replace with the scene's subject ── */
function Hero({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!group.current) return
    const p = progress.get()
    const t = state.clock.elapsedTime
    group.current.rotation.y = p * Math.PI * 2 + Math.sin(t * 0.35) * 0.05 // scrubbed turn + idle sway
    group.current.position.y = Math.sin(t * 0.9) * 0.07 // float
  })
  return (
    <group ref={group}>
      <RoundedBox args={[1.4, 1.4, 1.4]} radius={0.12} smoothness={4}>
        <meshStandardMaterial color="#1a1a1d" metalness={0.85} roughness={0.22} />
      </RoundedBox>
      <mesh scale={1.35}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <Glow size={6} intensity={0.9} />
    </group>
  )
}

/* ── One marker per beat; the active one lights up ── */
function Markers({ progress }: { progress: MotionValue<number> }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame((_, dt) => {
    const current = activeIndex(progress.get())
    const k = 1 - Math.exp(-6 * Math.min(dt, 0.05))
    refs.current.forEach((mesh, i) => {
      if (!mesh) return
      const goal = i === current ? 1.4 : 0.8
      mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, goal, k))
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, i === current ? 1 : 0.25, k)
    })
  })
  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => (
        <mesh key={i} position={markerPosition(i)} ref={(el) => { refs.current[i] = el }}>
          <sphereGeometry args={[0.12, 24, 24]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.25} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

export default function ${Name}Scene({ progress, active }: SceneProps) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: SHOTS[0].pos, fov: 45, near: 0.1, far: 100 }}
      frameloop={active ? 'always' : 'never'}
    >
      <fog attach="fog" args={['#000000', 10, 30]} />
      {/* Studio reflections for glossy surfaces, built locally (no HDR download) */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 6, -2]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={3} color={ACCENT} position={[-7, 2, 0]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[0, 2, 8]} scale={3} />
      </Environment>
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 6, 4]} intensity={1.2} />
      <pointLight position={[-2.5, 1.5, -2]} intensity={10} distance={8} color={ACCENT} />
      <CameraRig progress={progress} />
      <Hero progress={progress} />
      <Markers progress={progress} />
    </Canvas>
  )
}
`

const section = `'use client'

import { useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  motion,
  useInView,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { BEATS, COUNT, INTRO_END, OUTRO_START, SCREENS, activeIndex, easeOut, range, slotOf } from './${camel}Timeline'

// WebGL only runs in the browser
const ${Name}Scene = dynamic(() => import('./${Name}Scene'), { ssr: false })

const TITLE = '${Name.replace(/([a-z0-9])([A-Z])/g, '$1 $2')}'
const EYEBROW = 'Scene'

/* ── One caption per beat: blurs in as its beat arrives, lifts away as it leaves ──
   Function transforms throughout: range arrays mis-map inside a pinned (sticky) section. */
function Caption({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const s = slotOf(index)
  const last = index === COUNT - 1
  const inT = (v: number) => range(v, s.start, s.arrive)
  const outT = (v: number) => (last ? range(v, OUTRO_START, 1) : range(v, s.leave, s.end))
  const opacity = useTransform(progress, (v) => inT(v) * (1 - outT(v)))
  const visibility = useTransform(opacity, (o) => (o > 0.001 ? 'visible' : 'hidden'))
  const y = useTransform(progress, (v) => (1 - easeOut(inT(v))) * 40 - outT(v) * 30)
  const blur = useTransform(progress, (v) => (1 - inT(v)) * 10 + outT(v) * 8)
  const filter = useMotionTemplate\`blur(\${blur}px)\`
  const beat = BEATS[index]
  return (
    <motion.div style={{ opacity, visibility, y, filter }} className="absolute inset-x-0 bottom-0">
      <p className="mb-3 text-[10px] uppercase tracking-[0.45em] text-[#D7E2EA]/50 sm:text-xs">
        {String(index + 1).padStart(2, '0')} / {String(COUNT).padStart(2, '0')}
      </p>
      <h3 className="text-2xl font-black uppercase leading-tight text-[#D7E2EA] sm:text-4xl">{beat.title}</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[#D7E2EA]/70 sm:text-base">{beat.text}</p>
    </motion.div>
  )
}

function RailTick({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, (v) => (activeIndex(v) === index ? 1 : 0.25))
  const scaleX = useTransform(progress, (v) => (activeIndex(v) === index ? 1.8 : 1))
  return <motion.span style={{ opacity, scaleX }} className="block h-[3px] w-6 origin-right rounded-full bg-[#FF3B3B] shadow-[0_0_10px_#FF3B3B]" />
}

function Story() {
  const ref = useRef<HTMLDivElement>(null)
  const active = useInView(ref, { margin: '200px' })
  // 0 when the stage pins, 1 when it releases
  const { scrollYProgress: progress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  const titleOpacity = useTransform(progress, (v) => 1 - range(v, 0.02, INTRO_END))
  const titleScale = useTransform(progress, (v) => 1 + range(v, 0, INTRO_END) * 0.12)
  const hintOpacity = useTransform(progress, (v) => 1 - range(v, 0, 0.04))
  const hudOpacity = useTransform(progress, (v) => range(v, INTRO_END - 0.02, INTRO_END + 0.02) * (1 - range(v, OUTRO_START, 1)))
  const counter = useTransform(progress, (v) => String(Math.max(0, activeIndex(v)) + 1).padStart(2, '0'))

  return (
    <div ref={ref} className="relative w-full" style={{ height: \`\${SCREENS * 100}dvh\` }}>
      <div className="sticky top-0 h-dvh w-full overflow-hidden">
        {/* Huge faded backdrop title */}
        <motion.div
          style={{ opacity: titleOpacity, scale: titleScale }}
          className="pointer-events-none absolute inset-x-0 top-[12%] flex flex-col items-center gap-3"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D7E2EA]/50">{EYEBROW}</span>
          <h2
            className="text-center font-black uppercase leading-[0.85] tracking-tight"
            style={{
              fontSize: 'clamp(3.5rem, 15vw, 240px)',
              backgroundImage: 'linear-gradient(180deg, rgba(215,226,234,0.95) 0%, rgba(215,226,234,0.08) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {TITLE}
          </h2>
        </motion.div>

        <${Name}Scene progress={progress} active={active} />

        {/* Captions, bottom left over the scene */}
        <div className="pointer-events-none absolute bottom-[14%] left-5 right-5 h-48 sm:left-10 lg:left-[7%] lg:w-[36%]">
          {BEATS.map((_, i) => (
            <Caption key={i} index={i} progress={progress} />
          ))}
        </div>

        {/* HUD: counter + progress rail */}
        <motion.div
          style={{ opacity: hudOpacity }}
          className="pointer-events-none absolute inset-x-5 bottom-6 flex items-end justify-between sm:inset-x-10 sm:bottom-10"
        >
          <p className="font-mono text-xs tracking-[0.2em] text-[#D7E2EA]/50">
            <motion.span className="text-2xl font-bold text-[#D7E2EA] sm:text-3xl">{counter}</motion.span>
            {' / '}
            {String(COUNT).padStart(2, '0')}
          </p>
          <div className="flex flex-col items-end gap-2">
            {BEATS.map((_, i) => (
              <RailTick key={i} index={i} progress={progress} />
            ))}
          </div>
        </motion.div>

        <motion.span
          style={{ opacity: hintOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-xs font-semibold uppercase tracking-[0.25em] text-[#D7E2EA]/50"
        >
          Scroll
        </motion.span>
      </div>
    </div>
  )
}

/* ── Reduced motion: the same content as a plain list, no canvas ── */
function StaticList() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-5 py-24">
      <h2 className="text-center text-4xl font-black uppercase text-[#D7E2EA] sm:text-6xl">{TITLE}</h2>
      {BEATS.map((beat, i) => (
        <div key={i}>
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-[#FF3B3B]">{String(i + 1).padStart(2, '0')}</p>
          <h3 className="text-2xl font-black uppercase text-[#D7E2EA]">{beat.title}</h3>
          <p className="mt-2 text-[#D7E2EA]/70">{beat.text}</p>
        </div>
      ))}
    </div>
  )
}

export default function ${Name}Section() {
  const reduceMotion = useReducedMotion()
  return (
    <section id="${id}" className="relative w-full scroll-mt-10 text-[#D7E2EA]">
      {reduceMotion ? <StaticList /> : <Story />}
    </section>
  )
}
`

// DOM-only: drop the canvas and everything that only exists to feed it
let sectionOut = section
let timelineOut = timeline
if (noCanvas) {
  const swap = (from, to) => {
    if (!sectionOut.includes(from)) throw new Error(`new-scene: template drifted, can't find: ${from.slice(0, 60)}`)
    sectionOut = sectionOut.replace(from, to)
  }
  swap("import dynamic from 'next/dynamic'\n", '')
  swap('  useInView,\n', '')
  swap(`// WebGL only runs in the browser\nconst ${Name}Scene = dynamic(() => import('./${Name}Scene'), { ssr: false })\n`, '')
  swap("  const active = useInView(ref, { margin: '200px' })\n", '')
  swap(
    `        <${Name}Scene progress={progress} active={active} />\n`,
    `        {/* The effect's elements go here: plain DOM driven by \`progress\` through function transforms
            (useTransform(progress, (v) => …)), reading the shared timeline like the captions below. */}
        <div className="absolute inset-0" />\n`
  )
  // The SHOTS / markerPosition helpers in the timeline are camera-only; harmless, but say so
  timelineOut = timeline.replace('// Where each beat', '// (Camera helpers below are unused without a canvas — delete them if you like)\n// Where each beat')
}

fs.writeFileSync(files.timeline, timelineOut)
if (!noCanvas) fs.writeFileSync(files.scene, scene)
fs.writeFileSync(files.section, sectionOut)

const rel = (f) => path.relative(root, f).split(path.sep).join('/')
console.log(`Scene "${Name}" scaffolded (${beats} beats, ${screens} screens${noCanvas ? ', no canvas' : ''}):
  ${Object.values(files).map(rel).join('\n  ')}

Add it to a page:
  import ${Name}Section from '@/components/${Name}Section'
  …
  <${Name}Section />

${noCanvas
  ? 'Then build the effect in the stage div, driven by `progress` and the timeline: pacing first, then motion, then look.'
  : "Then follow the build layers: check the blockout's pacing by scrolling, replace the placeholder\nhero, markers and SHOTS with the scene spec (motion), then materials/light/FX (look), then polish."}`)
