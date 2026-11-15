'use client'

import { useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { RELEASE, range, sceneVisible, whiteout } from './doorTimeline'

// WebGL only runs in the browser
const DoorScene = dynamic(() => import('./DoorScene'), { ssr: false })

const BEYOND_BG = 'radial-gradient(ellipse 80% 70% at 50% 35%, #FFF8EE 0%, #F4E9DA 45%, #DCE5F4 100%)'

/* ── The world on the other side of the door: left empty — put your own section here ── */
function Beyond({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, (v) => range(v, RELEASE[0], RELEASE[1]))
  const visibility = useTransform(opacity, (o) => (o > 0.001 ? 'visible' : 'hidden'))
  return (
    <motion.div style={{ opacity, visibility, background: BEYOND_BG }} className="absolute inset-0">
      {/* Your section goes here */}
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

        <Beyond progress={progress} />
      </div>
    </div>
  )
}

export default function DoorSection() {
  const reduceMotion = useReducedMotion()
  return (
    <section id="door" className="relative w-full">
      {/* Reduced motion: no door, just the (empty) section behind it */}
      {reduceMotion ? <div className="min-h-dvh" style={{ background: BEYOND_BG }} /> : <Story />}
    </section>
  )
}
