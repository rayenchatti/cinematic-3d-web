'use client'

import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { MapPin } from 'lucide-react'
import RevealHeading from './RevealHeading'
import Sparkle from './Sparkle'
import { grotesk } from './fonts'
import { experience } from '@/content'

type Role = (typeof experience.items)[number]

/* ── One role: a node on the line + a card sliding in from its side ── */
function RoleCard({ item, index }: { item: Role; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const fromLeft = index % 2 === 0

  // The node lights up once the drawing line reaches it, and stays lit
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 62%', 'start 52%'] })
  const nodeLit = useTransform(scrollYProgress, (v) => (reduceMotion ? 1 : v))

  // Cursor spotlight — written straight to CSS variables, no re-render per mouse move
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
    e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
  }

  return (
    <div ref={ref} className="relative grid grid-cols-1 lg:grid-cols-2 lg:gap-20">
      {/* Node */}
      <div className="absolute left-4 top-8 z-10 -translate-x-1/2 lg:left-1/2">
        <span className="block h-4 w-4 rounded-full border border-[#D7E2EA]/25 bg-[#1A1A1A]" />
        <motion.span style={{ opacity: nodeLit, scale: nodeLit }} className="absolute inset-0 rounded-full">
          <span className="absolute inset-0 rounded-full bg-[#FF3B3B] shadow-[0_0_0_4px_rgba(255,59,59,0.2),0_0_24px_#FF3B3B]" />
        </motion.span>
      </div>

      <motion.article
        onPointerMove={onPointerMove}
        initial={reduceMotion ? false : { opacity: 0, x: fromLeft ? -60 : 60, rotateY: fromLeft ? 12 : -12 }}
        whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className={`group relative ml-12 overflow-hidden rounded-[28px] border border-[#D7E2EA]/15 bg-[#161618]/85 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-[#FF3B3B]/40 sm:p-8 lg:ml-0 ${
          fromLeft ? 'lg:col-start-1' : 'lg:col-start-2'
        }`}
        style={{ transformPerspective: 1200 }}
      >
        {/* Cursor spotlight */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255,59,59,0.14), transparent 60%)',
          }}
        />
        {/* Accent light along the top edge */}
        <div
          className="pointer-events-none absolute inset-x-8 top-0 h-px opacity-60"
          style={{ background: 'linear-gradient(90deg, transparent, #FF3B3B, transparent)' }}
        />

        <div className="relative flex flex-col gap-3">
          <span className={`${grotesk.className} text-[10px] uppercase tracking-[0.35em] text-[#FF3B3B] sm:text-xs`}>
            {item.period}
          </span>
          <h3 className="text-xl font-bold uppercase leading-tight text-[#D7E2EA] sm:text-2xl">{item.role}</h3>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#D7E2EA]/60">
            <span className="font-semibold text-[#D7E2EA]/85">{item.company}</span>
            {item.location && (
              <>
                <span className="text-[#D7E2EA]/25">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                  {item.location}
                </span>
              </>
            )}
          </p>
          <p className="text-sm leading-relaxed text-[#D7E2EA]/65 sm:text-base">{item.summary}</p>
          {item.highlights && item.highlights.length > 0 && (
            <ul className={`${grotesk.className} mt-1 flex flex-col gap-2 text-sm text-[#D7E2EA]/80`}>
              {item.highlights.map((h) => (
                <li key={h} className="flex items-start gap-3">
                  <Sparkle className="mt-1 h-3 w-3 shrink-0 text-[#FF3B3B]" />
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.article>
    </div>
  )
}

export default function ExperienceSection() {
  const timeline = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  // The glowing line draws itself down the timeline as you scroll
  const { scrollYProgress } = useScroll({ target: timeline, offset: ['start 60%', 'end 60%'] })
  const lineScale = useTransform(scrollYProgress, (v) => (reduceMotion ? 1 : v))

  return (
    <section
      id="experience"
      className="relative z-10 w-full scroll-mt-10 px-5 py-20 text-[#D7E2EA] sm:px-8 sm:py-24 md:px-10 md:py-32"
    >
      <RevealHeading
        eyebrow={experience.eyebrow}
        title={experience.title}
        fontSize="clamp(2.25rem, 7vw, 90px)"
        className="mb-16 sm:mb-20 md:mb-28"
      />

      <div ref={timeline} className="relative mx-auto flex max-w-5xl flex-col gap-10 sm:gap-14">
        {/* Track + drawn line */}
        <div className="absolute bottom-0 left-4 top-0 w-px -translate-x-1/2 bg-[#D7E2EA]/10 lg:left-1/2" />
        <motion.div
          style={{ scaleY: lineScale }}
          className="absolute bottom-0 left-4 top-0 w-[2px] origin-top -translate-x-1/2 bg-gradient-to-b from-[#FF3B3B] via-[#FF3B3B] to-[#7A0000] shadow-[0_0_14px_rgba(255,59,59,0.8)] lg:left-1/2"
        />

        {experience.items.map((item, i) => (
          <RoleCard key={`${item.company}-${item.period}`} item={item} index={i} />
        ))}
      </div>
    </section>
  )
}
