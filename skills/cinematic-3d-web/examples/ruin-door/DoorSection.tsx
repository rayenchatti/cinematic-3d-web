'use client'

import { useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, useInView, useMotionTemplate, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { ARRIVAL, PROJECTS, RELEASE, easeOut, range, sceneVisible, whiteout } from './doorTimeline'

// WebGL only runs in the browser
const DoorScene = dynamic(() => import('./DoorScene'), { ssr: false })

const LAB_TITLE = 'The Lab'

/* ── One letter of the Lab title, rising out of a mask as you arrive ── */
function Letter({ char, i, progress }: { char: string; i: number; progress: MotionValue<number> }) {
  const a = ARRIVAL[0] + 0.01 + i * 0.006
  const y = useTransform(progress, (v) => `${(1 - easeOut(range(v, a, a + 0.05))) * 110}%`)
  return (
    <motion.span style={{ y }} className="inline-block">
      {char === ' ' ? ' ' : char}
    </motion.span>
  )
}

/* ── A glass card drifting in from depth and settling ── */
function Card({ project, i, progress }: { project: (typeof PROJECTS)[number]; i: number; progress: MotionValue<number> }) {
  const a = ARRIVAL[0] + 0.03 + i * 0.025
  const t = (v: number) => easeOut(range(v, a, a + 0.08))
  const opacity = useTransform(progress, t)
  const y = useTransform(progress, (v) => (1 - t(v)) * 80)
  const scale = useTransform(progress, (v) => 0.88 + t(v) * 0.12)
  const blur = useTransform(progress, (v) => (1 - t(v)) * 10)
  const filter = useMotionTemplate`blur(${blur}px)`
  return (
    <motion.article
      style={{ opacity, y, scale, filter }}
      className="rounded-3xl border border-white/70 bg-white/45 p-6 text-left shadow-[0_20px_60px_rgba(120,100,70,0.15)] backdrop-blur-md"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#B8873A]">{String(i + 1).padStart(2, '0')}</span>
      <h3 className="mt-3 text-xl font-bold text-[#1E2230]">{project.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#1E2230]/65">{project.line}</p>
    </motion.article>
  )
}

/* ── The bright world on the other side of the door ── */
function Lab({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, (v) => range(v, RELEASE[0], RELEASE[1]))
  const visibility = useTransform(opacity, (o) => (o > 0.001 ? 'visible' : 'hidden'))
  const subOpacity = useTransform(progress, (v) => range(v, ARRIVAL[0] + 0.06, ARRIVAL[0] + 0.1))
  return (
    <motion.div
      style={{ opacity, visibility }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-6"
    >
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 35%, #FFF8EE 0%, #F4E9DA 45%, #DCE5F4 100%)' }}
      />
      <div className="flex flex-col items-center gap-3 text-center">
        <motion.span style={{ opacity: subOpacity }} className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#B8873A]">
          You made it through
        </motion.span>
        <h2 aria-label={LAB_TITLE} className="overflow-hidden pb-[0.1em] font-black uppercase leading-none tracking-tight text-[#1E2230]" style={{ fontSize: 'clamp(3rem, 10vw, 150px)' }}>
          {Array.from(LAB_TITLE).map((c, i) => (
            <Letter key={i} char={c} i={i} progress={progress} />
          ))}
        </h2>
        <motion.p style={{ opacity: subOpacity }} className="text-base text-[#1E2230]/60 sm:text-lg">
          Where ideas get built.
        </motion.p>
      </div>
      <div className="grid w-full max-w-5xl grid-cols-1 gap-5 sm:grid-cols-3">
        {PROJECTS.map((project, i) => (
          <Card key={project.name} project={project} i={i} progress={progress} />
        ))}
      </div>
    </motion.div>
  )
}

// Function transforms throughout: range arrays mis-map inside a pinned (sticky) section
function Story() {
  const ref = useRef<HTMLDivElement>(null)
  const active = useInView(ref, { margin: '200px' })
  const { scrollYProgress: progress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  const sceneOpacity = useTransform(progress, sceneVisible)
  const captionOpacity = useTransform(progress, (v) => 1 - range(v, 0.08, 0.14))
  const hintOpacity = useTransform(progress, (v) => 1 - range(v, 0, 0.04))
  const flash = useTransform(progress, whiteout)

  return (
    <div ref={ref} className="relative w-full" style={{ height: '800dvh' }}>
      <div className="sticky top-0 h-dvh w-full overflow-hidden bg-[#2a2f38]">
        <motion.div style={{ opacity: sceneOpacity }} className="absolute inset-0">
          <DoorScene progress={progress} active={active} />
        </motion.div>

        <motion.p
          style={{ opacity: captionOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-[12%] text-center text-lg font-light tracking-wide text-[#E9E1D2]/85 sm:text-2xl"
        >
          Some doors are meant to be opened.
        </motion.p>
        <motion.span
          style={{ opacity: hintOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-[10px] font-semibold uppercase tracking-[0.4em] text-[#E9E1D2]/45"
        >
          Scroll to open
        </motion.span>

        {/* Crossing the threshold: the screen floods with warm light */}
        <motion.div
          style={{ opacity: flash, background: 'radial-gradient(circle at 50% 45%, #FFFFFF 0%, #FFF4DE 45%, #FFE2B0 100%)' }}
          className="pointer-events-none absolute inset-0"
        />

        <Lab progress={progress} />
      </div>
    </div>
  )
}

/* ── Reduced motion: no door, just the section ── */
function StaticLab() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-24"
      style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 35%, #FFF8EE 0%, #F4E9DA 45%, #DCE5F4 100%)' }}
    >
      <h2 className="text-6xl font-black uppercase tracking-tight text-[#1E2230] sm:text-8xl">{LAB_TITLE}</h2>
      <p className="text-[#1E2230]/60">Where ideas get built.</p>
      <div className="grid w-full max-w-5xl grid-cols-1 gap-5 sm:grid-cols-3">
        {PROJECTS.map((project, i) => (
          <article key={project.name} className="rounded-3xl border border-white/70 bg-white/45 p-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#B8873A]">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="mt-3 text-xl font-bold text-[#1E2230]">{project.name}</h3>
            <p className="mt-2 text-sm text-[#1E2230]/65">{project.line}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

export default function DoorSection() {
  const reduceMotion = useReducedMotion()
  return (
    <section id="door" className="relative w-full">
      {reduceMotion ? <StaticLab /> : <Story />}
    </section>
  )
}
