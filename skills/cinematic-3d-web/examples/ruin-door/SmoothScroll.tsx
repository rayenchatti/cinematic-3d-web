'use client'

import { useState, type ReactNode } from 'react'
import { ReactLenis } from 'lenis/react'
import { useReducedMotion } from 'framer-motion'
import 'lenis/dist/lenis.css'

// Eased, inertial scrolling: wheel ticks and trackpad flicks become one smooth glide, so the
// camera never jumps between beats. Off for reduced motion, and with ?capture (frame-exact recording).
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  const [capture] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture'))
  if (reduceMotion || capture) return <>{children}</>
  return (
    <ReactLenis root options={{ lerp: 0.07, wheelMultiplier: 0.9, touchMultiplier: 1.4, smoothWheel: true }}>
      {children}
    </ReactLenis>
  )
}
