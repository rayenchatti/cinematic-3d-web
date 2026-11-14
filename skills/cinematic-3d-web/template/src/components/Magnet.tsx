'use client'

import { useEffect, useRef } from 'react'

interface MagnetProps {
  children: React.ReactNode
  padding?: number // how far (px) beyond its edges the element starts following the cursor
  strength?: number // divisor: higher = subtler pull
  activeTransition?: string
  inactiveTransition?: string
  className?: string
}

// Wraps any element so it drifts toward the cursor once the cursor comes within `padding` px of
// it, and eases back when the cursor leaves. Adapted from React Bits' Magnet.
// Listens on the window (an element only gets mouse events while the cursor is over it, which
// would make `padding` useless) and writes the transform directly, so moving the mouse never
// re-renders React. Off for touch screens and reduced motion.
export default function Magnet({
  children,
  padding = 100,
  strength = 3,
  activeTransition = 'transform 0.3s ease-out',
  inactiveTransition = 'transform 0.6s ease-in-out',
  className,
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)')
    let active = false

    const release = () => {
      if (!active) return
      active = false
      el.style.transition = inactiveTransition
      el.style.transform = 'translate3d(0, 0, 0)'
    }

    const onMove = (e: PointerEvent) => {
      if (calm.matches) return release()
      // Measure without our own offset, so the resting position is the reference
      const rect = el.getBoundingClientRect()
      const current = new DOMMatrixReadOnly(getComputedStyle(el).transform)
      const cx = rect.left - current.m41 + rect.width / 2
      const cy = rect.top - current.m42 + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const near =
        Math.abs(dx) < rect.width / 2 + padding && Math.abs(dy) < rect.height / 2 + padding
      if (!near) return release()
      active = true
      el.style.transition = activeTransition
      el.style.transform = `translate3d(${dx / strength}px, ${dy / strength}px, 0)`
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', release)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', release)
    }
  }, [padding, strength, activeTransition, inactiveTransition])

  return (
    // inline-block so the wrapper is only as big as what it wraps (a full-width block would make
    // "near" start far from the element); positioned wrappers become blocks anyway
    <div ref={ref} className={className} style={{ display: 'inline-block', willChange: 'transform' }}>
      {children}
    </div>
  )
}
