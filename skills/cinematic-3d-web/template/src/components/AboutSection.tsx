'use client'

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
import FadeIn from './FadeIn'
import CountUp from './CountUp'
import { beatRange } from './deskScreens'
import { about } from '@/content'

const STATS = about.stats

// WebGL only runs in the browser
const DeskScene = dynamic(() => import('./DeskScene'), { ssr: false })

// The bio, told in beats that line up with the camera's shots in DeskScene and the laptop screen
const BIO_BEATS: { text: string; emphasis: string[]; range: [number, number] }[] = about.beats.map((beat, i) => ({
  text: beat.text,
  emphasis: beat.emphasis.flatMap((phrase) => phrase.split(' ')),
  range: beatRange(i),
}))

function CaptionWord({
  word,
  emphasized,
  progress,
  range,
}: {
  word: string
  emphasized: boolean
  progress: MotionValue<number>
  range: [number, number]
}) {
  // Function transforms throughout: range arrays get handed to the browser's native
  // ScrollTimeline, which mis-maps ranges inside this pinned section
  const t = (v: number) => Math.min(1, Math.max(0, (v - range[0]) / (range[1] - range[0])))
  const opacity = useTransform(progress, t)
  const blur = useTransform(progress, (v) => (1 - t(v)) * 8)
  const y = useTransform(progress, (v) => `${(1 - t(v)) * 0.4}em`)
  const filter = useMotionTemplate`blur(${blur}px)`
  return (
    <motion.span
      style={{ opacity, y, filter }}
      className={`inline-block ${emphasized ? 'pr-[0.08em] italic text-[#FF3B3B]' : ''}`}
    >
      {word}
    </motion.span>
  )
}

// Words blur in one after another as you scroll, then the whole line lifts away
function ScrubCaption({ beat, progress }: { beat: (typeof BIO_BEATS)[number]; progress: MotionValue<number> }) {
  const [start, end] = beat.range
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
  const fadeIn = (v: number) => clamp01((v - (start - 0.02)) / 0.02)
  const lift = (v: number) => clamp01((v - (end - 0.03)) / 0.03)
  const opacity = useTransform(progress, (v) => fadeIn(v) * (1 - lift(v)))
  const y = useTransform(progress, (v) => lift(v) * -30)
  const words = beat.text.split(' ')
  const revealSpan = (end - start) * 0.45

  return (
    <motion.p style={{ opacity, y }} className="absolute inset-x-0 top-0">
      {words.map((word, i) => (
        <span key={i}>
          <CaptionWord
            word={word}
            emphasized={beat.emphasis.includes(word)}
            progress={progress}
            range={[start + (i / words.length) * revealSpan, start + ((i + 1) / words.length) * revealSpan + 0.02]}
          />{' '}
        </span>
      ))}
    </motion.p>
  )
}

function DeskStory() {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion() ?? false
  const active = useInView(ref, { margin: '200px' })

  // 0 when the pinned scene locks in, 1 when it releases
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // Function transforms: Framer hands plain range-mapped opacity to the browser's native
  // ScrollTimeline, which mis-maps this pinned range and leaves the title half visible
  const titleOpacity = useTransform(scrollYProgress, (v) => 1 - Math.min(v / 0.18, 1))
  const titleScale = useTransform(scrollYProgress, (v) => 1 + Math.min(v / 0.18, 1) * 0.12)
  const hintOpacity = useTransform(scrollYProgress, (v) => 1 - Math.min(v / 0.05, 1))

  if (reduceMotion) {
    return (
      <div ref={ref} className="flex w-full flex-col items-center gap-10 px-5 pb-10 pt-24 sm:px-8 md:px-10">
        <div className="flex flex-col items-center gap-3">
          <span className="eyebrow-label">{about.eyebrow}</span>
          <h2
            className="hero-heading text-center font-black uppercase leading-none tracking-tight"
            style={{ fontSize: 'clamp(2.25rem, 8vw, 100px)' }}
          >
            {about.title}
          </h2>
        </div>
        <div className="relative aspect-[16/10] w-full max-w-4xl">
          <DeskScene progress={scrollYProgress} active={active} reduceMotion />
        </div>
        <p
          className="max-w-3xl text-center font-medium leading-relaxed text-[#D7E2EA]"
          style={{ fontSize: 'clamp(1rem, 2vw, 1.35rem)' }}
        >
          {BIO_BEATS.map((beat) => beat.text).join(' ')}
        </p>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative h-[400dvh] w-full">
      <div className="sticky top-0 h-dvh w-full overflow-hidden">
        {/* Huge faded title behind the desk, like the reference's backdrop type */}
        <motion.div
          style={{ opacity: titleOpacity, scale: titleScale }}
          className="pointer-events-none absolute inset-x-0 top-[11%] flex flex-col items-center gap-2 sm:gap-4"
        >
          <span className="eyebrow-label">{about.eyebrow}</span>
          <h2
            className="text-center font-black uppercase leading-[0.85] tracking-tight"
            style={{
              fontSize: 'clamp(4rem, 19vw, 300px)',
              backgroundImage: 'linear-gradient(180deg, rgba(215,226,234,0.95) 0%, rgba(215,226,234,0.08) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {about.title}
          </h2>
        </motion.div>

        <DeskScene progress={scrollYProgress} active={active} reduceMotion={false} />

        {/* Captions over the scene */}
        <div
          className="pointer-events-none absolute inset-x-0 top-[9%] mx-auto max-w-4xl px-5 text-center font-bold leading-[1.15] text-white sm:px-10"
          style={{ fontSize: 'clamp(1.35rem, 3.2vw, 2.6rem)', textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}
        >
          {BIO_BEATS.map((beat) => (
            <ScrubCaption key={beat.range[0]} beat={beat} progress={scrollYProgress} />
          ))}
        </div>

        <motion.span
          style={{ opacity: hintOpacity }}
          className="eyebrow-label pointer-events-none absolute inset-x-0 bottom-8 text-center"
        >
          Scroll
        </motion.span>
      </div>
    </div>
  )
}

export default function AboutSection() {
  return (
    <section id="about" className="relative w-full scroll-mt-10">
      <DeskStory />

      {/* Stats Grid */}
      <div className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8 md:px-10">
        <FadeIn delay={0.1} y={30} className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full">
            {STATS.map((stat, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center p-5 sm:p-6 rounded-[24px] border border-[#D7E2EA]/20 bg-[#1A1A1A]/80 text-center transition-transform duration-300 hover:scale-[1.03] hover:border-[#FF3B3B]/40"
              >
                <CountUp
                  value={stat.value}
                  className="font-black text-2xl sm:text-3xl md:text-4xl lg:text-5xl uppercase mb-1 text-[#FF3B3B]"
                />
                <span className="text-[#D7E2EA]/70 text-xs sm:text-sm uppercase tracking-wider font-light">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
