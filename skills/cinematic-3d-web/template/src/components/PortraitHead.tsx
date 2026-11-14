'use client'

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl'
import type { EyeRig, Portrait } from '@/content'

/* The hero portrait, alive: the head turns toward the cursor and the eyes follow it, with blinks
   and small idle glances.

   The portrait is a flat PNG, so the turn is faked with parallax: a depth map built from the rig
   in content.ts (skull as a dome, face and nose nearer, shoulders further back) shifts near parts
   more than far ones, which reads as the head rotating rather than the picture sliding. The eyes
   (optional) are redrawn in the same shader, in the image's own pixel space, so they stay locked
   to the face as it turns. Their iris and lid colours are sampled from the photo itself.
   The plain <img> stays underneath: it's what shows before WebGL is ready, without WebGL, and
   for reduced motion. Add ?rig to the URL to see the rig drawn over the photo. */

const REACH = 380 // cursor distance (screen px) for a half-strength look
const IDLE_AFTER = 2.2 // seconds without pointer movement before the idle glances start

const f = (n: number) => n.toFixed(2) // GLSL float literal

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

function eyeCall(e: EyeRig) {
  return `col = eye(col, s, vec4(${f(e.corners[0])}, ${f(e.corners[1])}, ${f(e.center[0])}, ${f(e.center[1])}), vec4(${f(e.lidY[0])}, ${f(e.lidY[1])}, ${f(e.upper)}, ${f(e.lower)}));`
}

function buildFragment({ width, height, rig }: Portrait) {
  const { head, face, nose, shouldersY, eyes } = rig
  return /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform vec2 uHead;   // parallax shift of the nearest point, image px
  uniform vec2 uGaze;   // iris offset, in units of 'eye width / 40'
  uniform float uBlink; // 0 open → 1 shut
  varying vec2 vUv;

  const vec2 SIZE = vec2(${f(width)}, ${f(height)});

  float dome(vec2 p, vec2 c, vec2 r) {
    vec2 d = (p - c) / r;
    return sqrt(max(0.0, 1.0 - dot(d, d)));
  }

  // 0 = far (background), ~1 = nose tip
  float depth(vec2 p) {
    float head = dome(p, vec2(${f(head.cx)}, ${f(head.cy)}), vec2(${f(head.rx)}, ${f(head.ry)}));
    float face = dome(p, vec2(${f(face.cx)}, ${f(face.cy)}), vec2(${f(face.rx)}, ${f(face.ry)}));
    float nose = dome(p, vec2(${f(nose.cx)}, ${f(nose.cy)}), vec2(${f(nose.rx)}, ${f(nose.ry)}));
    float d = 0.25 * step(0.001, head) + head * 0.45 + face * 0.2 + nose * 0.15;
    float body = 0.12 * smoothstep(${f(shouldersY[0])}, ${f(shouldersY[1])}, p.y);
    return max(d, body);
  }

  vec4 tex(vec2 p) {
    return texture2D(tMap, vec2(p.x / SIZE.x, 1.0 - p.y / SIZE.y));
  }

  // Quadratic lid curve from (x0,y0) to (x1,y1) bowed by control height c; x is ~linear in t
  float lid(float t, float y0, float c, float y1) {
    float u = 1.0 - t;
    return u * u * y0 + 2.0 * t * u * c + t * t * y1;
  }

  // One eye, painted over colour 'col' at source position s. e = x0, x1, centre x, centre y;
  // l = y at x0, y at x1, upper control, lower control. Sizes below are tuned for a 40px-wide
  // eye and scaled by k for any other size.
  vec3 eye(vec3 col, vec2 s, vec4 e, vec4 l) {
    float k = (e.y - e.x) / 40.0;
    float t = (s.x - e.x) / (e.y - e.x);
    if (t <= 0.0 || t >= 1.0) return col;
    float yU = lid(t, l.x, l.z, l.y);
    float yL = lid(t, l.x, l.w, l.y);
    if (s.y < yU - 1.5 * k || s.y > yL + 1.5 * k) return col;

    float yLid = mix(yU, yL, uBlink * 0.96); // upper lid edge, lowered while blinking
    float aa = 0.7 * k;
    float open = smoothstep(yLid - aa, yLid + aa, s.y) * (1.0 - smoothstep(yL - aa, yL + aa, s.y));
    float covered = smoothstep(yU - aa, yU + aa, s.y) * (1.0 - smoothstep(yL - aa, yL + aa, s.y));

    vec2 c = vec2(e.z, e.w);
    // Colours sampled from the photo: iris at the eye's centre, skin just above the lid
    vec3 irisCol = tex(c).rgb;
    vec3 skinCol = tex(vec2(s.x, yU - 7.0 * k)).rgb;

    // Eyeball: warm white with soft shading — darker into the corners and under the lid
    float edge = abs(s.x - c.x) / ((e.y - e.x) * 0.5);
    vec3 white = mix(vec3(0.91, 0.84, 0.81), vec3(0.55, 0.45, 0.45), pow(edge, 2.2) * 0.8);
    white *= mix(0.55, 1.0, smoothstep(yLid, yLid + 8.0 * k, s.y));

    // Iris and pupil
    vec2 q = s - (c + uGaze * k);
    float r = length(q) / k;
    vec3 iris = mix(irisCol * 1.15, irisCol * 0.55, smoothstep(5.0, 10.0, r));
    iris = mix(vec3(0.016, 0.02, 0.027), iris, smoothstep(4.2, 5.2, r)); // pupil
    iris *= mix(0.6, 1.0, smoothstep(yLid, yLid + 7.0 * k, s.y));       // lid shadow
    vec3 ball = mix(iris, white, smoothstep(10.1, 10.9, r));
    ball = mix(ball, irisCol * 0.25, smoothstep(9.2, 10.2, r) * (1.0 - smoothstep(10.3, 11.0, r)) * 0.8);

    // Catch-light, riding a little behind the iris like a reflection on the cornea
    vec2 h = s - (c + uGaze * k * 0.7 + vec2(3.8, -4.6) * k);
    ball = mix(ball, vec3(1.0), (1.0 - smoothstep(1.2, 2.3, length(h) / k)) * 0.95);

    // Lash line along the (moving) upper lid
    ball = mix(ball, vec3(0.06, 0.03, 0.03), 1.0 - smoothstep(0.0, 1.8 * k, s.y - yLid));

    // Closed part of the lid: skin, darkening toward its edge
    vec3 skin = mix(skinCol, skinCol * 0.5, smoothstep(yLid - 5.0 * k, yLid, s.y));

    vec3 inner = mix(skin, ball, open);
    return mix(col, inner, covered);
  }

  void main() {
    vec2 p = vec2(vUv.x, 1.0 - vUv.y) * SIZE;
    vec2 s = p - uHead * depth(p);
    vec4 base = tex(s);
    vec3 col = base.rgb;
    ${eyes ? `${eyeCall(eyes[0])}\n    ${eyeCall(eyes[1])}` : ''}
    gl_FragColor = vec4(col, base.a);
  }
`
}

const noopSubscribe = () => () => {}
const readRigFlag = () => new URLSearchParams(window.location.search).has('rig')

export default function PortraitHead({ portrait }: { portrait: Portrait }) {
  const box = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const reduceMotion = useReducedMotion()
  const showRig = useSyncExternalStore(noopSubscribe, readRigFlag, () => false)
  const { src, alt, width, height, rig } = portrait
  const fragment = useMemo(() => buildFragment(portrait), [portrait])

  useEffect(() => {
    const container = box.current
    const still = img.current
    if (!container || reduceMotion) return

    let renderer: Renderer
    try {
      renderer = new Renderer({ alpha: true, premultipliedAlpha: false, dpr: Math.min(2, window.devicePixelRatio) })
    } catch {
      return // no WebGL: the plain image stays
    }
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    const canvas = gl.canvas as HTMLCanvasElement
    canvas.setAttribute('aria-hidden', 'true')
    canvas.className = 'absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500'
    container.appendChild(canvas)

    const texture = new Texture(gl, { generateMipmaps: false })
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      uniforms: {
        tMap: { value: texture },
        uHead: { value: [0, 0] },
        uGaze: { value: [0, 0] },
        uBlink: { value: 0 },
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    const resize = () => renderer.setSize(container.clientWidth, container.clientHeight)
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    let ready = false
    const image = new Image()
    image.onload = () => {
      texture.image = image
      ready = true
    }
    image.src = src

    // Turn range scales with the photo: the nose tip moves ~2% of the width at full turn
    const maxHead: [number, number] = [width * 0.021, height * 0.0127]
    const maxIris: [number, number] = [3.6, 2] // in 'eye width / 40' units, scaled in the shader

    /* Motion: a shared look target; the eyes chase it fast, the head follows slowly */
    const target = { x: 0, y: 0 }
    const gaze = { x: 0, y: 0 }
    const head = { x: 0, y: 0 }
    let lastMove = -Infinity
    let nextGlance = 0
    let nextBlink = 1.5
    let blinkStart = -1

    const onMove = (e: PointerEvent) => {
      const r = container.getBoundingClientRect()
      const dx = e.clientX - (r.left + (rig.pivot[0] / width) * r.width)
      const dy = e.clientY - (r.top + (rig.pivot[1] / height) * r.height)
      const dist = Math.hypot(dx, dy) || 1
      const k = dist / (dist + REACH) // soft saturation: never snaps to the extreme
      target.x = (dx / dist) * k * 1.5
      target.y = (dy / dist) * k * 1.5
      lastMove = performance.now() / 1000
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    let visible = true
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    io.observe(container)

    let raf = 0
    let prev = performance.now() / 1000
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now() / 1000
      const dt = Math.min(0.05, now - prev)
      prev = now
      if (!visible || !ready || document.hidden) return

      // Idle: small glances around, the way people look about when nothing's happening
      if (now - lastMove > IDLE_AFTER && now > nextGlance) {
        target.x = (Math.random() - 0.5) * 0.7
        target.y = (Math.random() - 0.5) * 0.4
        nextGlance = now + 1.4 + Math.random() * 2.2
      }

      const ease = (rate: number) => 1 - Math.exp(-dt * rate)
      gaze.x += (target.x - gaze.x) * ease(16)
      gaze.y += (target.y - gaze.y) * ease(16)
      head.x += (target.x - head.x) * ease(3.2)
      head.y += (target.y - head.y) * ease(3.2)

      // Blinks every few seconds, now and then a double
      if (now > nextBlink) {
        blinkStart = now
        nextBlink = now + (Math.random() < 0.15 ? 0.32 : 2.4 + Math.random() * 3.6)
      }
      const b = now - blinkStart
      const blink = b < 0.07 ? b / 0.07 : b < 0.18 ? 1 - (b - 0.07) / 0.11 : 0

      const breathe = Math.sin(now * 1.2) * height * 0.0013
      const clamp = (v: number) => Math.max(-1, Math.min(1, v))
      program.uniforms.uHead.value = [clamp(head.x) * maxHead[0], clamp(head.y) * maxHead[1] + breathe]
      // Eyes lead the head: they carry the part of the look the head hasn't turned through yet
      program.uniforms.uGaze.value = [
        clamp(gaze.x - head.x * 0.45) * maxIris[0],
        clamp(gaze.y - head.y * 0.45) * maxIris[1],
      ]
      program.uniforms.uBlink.value = blink

      renderer.render({ scene: mesh })
      if (canvas.style.opacity !== '1') {
        canvas.style.opacity = '1'
        if (still) still.style.opacity = '0'
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      ro.disconnect()
      io.disconnect()
      canvas.remove()
      if (still) still.style.opacity = ''
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [src, width, height, rig, fragment, reduceMotion])

  return (
    <div ref={box} className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={img}
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-500"
      />
      {showRig && <RigOverlay portrait={portrait} />}
    </div>
  )
}

/* ── ?rig debug overlay: the depth domes, eye boxes and pivot drawn in image pixels ── */
function RigOverlay({ portrait }: { portrait: Portrait }) {
  const { width, height, rig } = portrait
  const ellipse = (e: { cx: number; cy: number; rx: number; ry: number }, color: string, label: string) => (
    <g>
      <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill="none" stroke={color} strokeWidth={2} />
      <text x={e.cx + e.rx + 4} y={e.cy} fill={color} fontSize={14}>
        {label}
      </text>
    </g>
  )
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Pixel grid every 50px, labelled every 100px, for reading coordinates off a screenshot */}
      {Array.from({ length: Math.floor(width / 50) + 1 }, (_, i) => (
        <g key={`x${i}`}>
          <line x1={i * 50} x2={i * 50} y1={0} y2={height} stroke="rgba(255,255,255,0.25)" strokeWidth={i % 2 ? 0.5 : 1} />
          {i % 2 === 0 && (
            <text x={i * 50 + 2} y={12} fill="#FFFFFF" fontSize={11}>
              {i * 50}
            </text>
          )}
        </g>
      ))}
      {Array.from({ length: Math.floor(height / 50) + 1 }, (_, i) => (
        <g key={`y${i}`}>
          <line x1={0} x2={width} y1={i * 50} y2={i * 50} stroke="rgba(255,255,255,0.25)" strokeWidth={i % 2 ? 0.5 : 1} />
          {i % 2 === 0 && i > 0 && (
            <text x={2} y={i * 50 - 2} fill="#FFFFFF" fontSize={11}>
              {i * 50}
            </text>
          )}
        </g>
      ))}
      {ellipse(rig.head, '#00E5FF', 'head')}
      {ellipse(rig.face, '#7CFF6B', 'face')}
      {ellipse(rig.nose, '#FFE34D', 'nose')}
      <line x1={0} x2={width} y1={rig.shouldersY[0]} y2={rig.shouldersY[0]} stroke="#FF8AF0" strokeDasharray="6 4" />
      <line x1={0} x2={width} y1={rig.shouldersY[1]} y2={rig.shouldersY[1]} stroke="#FF8AF0" />
      <circle cx={rig.pivot[0]} cy={rig.pivot[1]} r={5} fill="#FFFFFF" />
      {rig.eyes?.map((e, i) => {
        const [x0, x1] = e.corners
        const curve = (c: number) => `M ${x0} ${e.lidY[0]} Q ${(x0 + x1) / 2} ${c} ${x1} ${e.lidY[1]}`
        return (
          <g key={i}>
            {/* Same quadratic curves the shader uses for the lids */}
            <path d={curve(e.upper)} fill="none" stroke="#FF4D4D" strokeWidth={1.5} />
            <path d={curve(e.lower)} fill="none" stroke="#FF4D4D" strokeWidth={1.5} />
            <circle cx={e.center[0]} cy={e.center[1]} r={(x1 - x0) / 4} fill="none" stroke="#FFFFFF" strokeWidth={1} />
          </g>
        )
      })}
    </svg>
  )
}
