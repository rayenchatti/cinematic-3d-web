'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import type { MotionValue } from 'framer-motion'
import { LEAF_W, MAX_SWING, OPEN, OPENING_H, OPENING_W, THRESHOLD, cameraAt, exposureAt, lightFlood, range, seamGlow, swing, tremble } from './doorTimeline'
import { makeDoorSlab, makeEarth, makeSoftDot, makeFogPuff, makeStone, mulberry32 } from './ruinTextures'
import { chippedBlock, rock } from './ruinGeometry'
import { heightAt } from './terrain'
import { VolumetricFogEffect } from './VolumetricFog'

interface SceneProps {
  progress: MotionValue<number>
  active: boolean
}

const SKY = '#4a5362' // dusk haze at the horizon — the fog shares it so distance fades naturally
const SUN = '#FFD9A0' // warm light from the other side
const DOOR_CY = OPENING_H / 2
const PILLAR_X = OPENING_W / 2 + 0.44
const LIGHT_POS = new THREE.Vector3(0, DOOR_CY + 0.6, -5.5)
// Sky colours, shared by the sky dome and the distant fog so the land dissolves into the sky
const SKY_HORIZON = new THREE.Color('#4a5362')
const SKY_ZENITH = new THREE.Color('#161c28')
const SKY_GLOW = new THREE.Color('#8a7a6a')

// Heavy stone grinding: a rumble while the doors move
const rumble = (p: number) => range(p, OPEN[0], OPEN[0] + 0.03) * (1 - range(p, OPEN[1] - 0.06, OPEN[1]))
// Smooth pseudo-random wobble (no visible sine rhythm)
const wobble = (t: number, s: number) => Math.sin(t * 7.3 + s) * 0.5 + Math.sin(t * 11.1 + 1.3 * s) * 0.3 + Math.sin(t * 17.9 + 2.1 * s) * 0.2

// How far each leaf has swung. The right leaf trails the left a little, and both stick and slip
// while they grind — two real slabs, not one mirrored animation.
const leafAngle = (p: number, lag: number) => {
  const o = swing(p - lag)
  return (o + Math.sin(o * 38) * 0.006 * rumble(p)) * MAX_SWING
}

/* ── Camera: one continuous move with weight — a subtle step bob while walking, handheld sway,
      shake and a touch of roll while the stone grinds ── */
function CameraRig({ progress }: { progress: MotionValue<number> }) {
  const pointer = useRef({ x: 0, y: 0 })
  const cam = useRef(cameraAt(0))
  const walk = useRef({ phase: 0, amp: 0 })
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = progress.get()
    const goal = cameraAt(p)
    const c = cam.current
    const k = 1 - Math.exp(-3.2 * dt)
    const prevZ = c.z
    c.z += (goal.z - c.z) * k
    c.y += (goal.y - c.y) * k
    c.fov += (goal.fov - c.fov) * k

    // Steps: the bob follows distance walked, and fades in with speed
    const speed = Math.abs(c.z - prevZ) / Math.max(dt, 1e-4)
    const w = walk.current
    w.phase += Math.abs(c.z - prevZ) * 2.4
    w.amp += (Math.min(speed * 0.0035, 0.016) - w.amp) * (1 - Math.exp(-4 * dt))

    const t = state.clock.elapsedTime
    const shake = (tremble(p) * 0.6 + rumble(p)) * 0.028
    const aspect = state.size.width / state.size.height
    const back = aspect < 1 && c.z > 0 ? (1 - aspect) * 9 : 0
    const camera = state.camera as THREE.PerspectiveCamera
    camera.position.set(
      pointer.current.x * 0.22 + Math.sin(t * 0.37) * 0.05 + Math.sin(w.phase) * w.amp * 0.6 + wobble(t * 3, 1) * shake,
      c.y + pointer.current.y * 0.1 + Math.sin(t * 0.53) * 0.025 + Math.abs(Math.sin(w.phase)) * w.amp + wobble(t * 3, 4) * shake,
      c.z + back
    )
    camera.lookAt(pointer.current.x * 0.1, DOOR_CY - 0.25, c.z - 10)
    camera.rotateZ(Math.sin(t * 0.21) * 0.003 + Math.sin(w.phase) * w.amp * 0.08 + wobble(t * 2.5, 7) * shake * 0.25)
    if (Math.abs(camera.fov - c.fov) > 0.02) {
      camera.fov = c.fov
      camera.updateProjectionMatrix()
    }
  })
  return null
}

/* ── Large-scale variation on the ground, so the earth texture never visibly repeats ── */
function addGroundVariation(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGroundPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundPos = (modelMatrix * vec4(position, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vGroundPos;
float gH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gN(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(gH(i), gH(i+vec2(1,0)), f.x), mix(gH(i+vec2(0,1)), gH(i+vec2(1,1)), f.x), f.y); }`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
float macro = gN(vGroundPos.xz * 0.11) * 0.65 + gN(vGroundPos.xz * 0.37 + 7.0) * 0.35;
diffuseColor.rgb *= mix(0.68, 1.2, macro);
// Damp, darker earth gathered at the foot of the ruin
float damp = (1.0 - smoothstep(1.5, 4.5, abs(vGroundPos.x))) * (1.0 - smoothstep(0.0, 3.5, abs(vGroundPos.z - 0.6)));
diffuseColor.rgb *= 1.0 - damp * 0.25;`
      )
  }
}

/* ── Materials: weathered stone, carved slabs, earth (textures drawn once) ── */
function useRuinMaterials() {
  const mats = useMemo(() => {
    const stoneA = makeStone(11)
    const stoneB = makeStone(23, 1024, [136, 126, 110], [66, 60, 52], 0.25)
    const doorL = makeDoorSlab(31, false)
    const doorR = makeDoorSlab(37, true)
    const earth = makeEarth(5)
    const mat = (t: { map: THREE.Texture; normal: THREE.Texture }, strength = 1, roughness = 0.94) =>
      new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(strength, strength), roughness, metalness: 0 })
    const ground = mat(earth, 1.1, 0.97)
    addGroundVariation(ground)
    const stone = (t: { map: THREE.Texture; normal: THREE.Texture }) => {
      const sm = mat(t, 0.9)
      sm.vertexColors = true // per-block tone, crevices, grime and moss are painted on the geometry
      return sm
    }
    return {
      blockA: stone(stoneA),
      blockB: stone(stoneB),
      core: mat(stoneA, 1.2),
      doorL: mat(doorL, 1.6, 0.9),
      doorR: mat(doorR, 1.6, 0.9),
      ground,
    }
  }, [])
  useEffect(
    () => () =>
      Object.values(mats).forEach((m) => {
        m.map?.dispose()
        m.normalMap?.dispose()
        m.dispose()
      }),
    [mats]
  )
  return mats
}
type RuinMats = ReturnType<typeof useRuinMaterials>

/* ── The ruin: stacked pillars of chipped blocks, a sagging lintel, broken caps, rubble ── */
type Block = { args: [number, number, number]; pos: [number, number, number]; rot: [number, number, number]; mat: 0 | 1 }
function Ruin({ m }: { m: RuinMats }) {
  const layout = useMemo(() => {
    const rand = mulberry32(42)
    const blocks: Block[] = []
    // Plinths
    for (const s of [-1, 1]) blocks.push({ args: [1.08, 0.38, 1.12], pos: [s * PILLAR_X, 0.19, 0], rot: [0, 0, 0], mat: 1 })
    // Pillars of stacked, slightly shifted blocks
    for (const side of [-1, 1]) {
      let y = 0.38
      while (y < OPENING_H + 0.1) {
        const h = Math.min(0.72 + rand() * 0.38, OPENING_H + 0.1 - y + 0.05)
        blocks.push({
          args: [0.78 + rand() * 0.1, h - 0.015, 0.84 + rand() * 0.1],
          pos: [side * PILLAR_X + (rand() - 0.5) * 0.07, y + h / 2, (rand() - 0.5) * 0.04],
          rot: [0, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.025],
          mat: rand() > 0.5 ? 1 : 0,
        })
        y += h
      }
    }
    // Lintel, sagging a touch, and a broken row of cap stones
    blocks.push({ args: [OPENING_W + 2.1, 0.72, 1.0], pos: [0, OPENING_H + 0.48, 0], rot: [0, 0, 0.012], mat: 0 })
    blocks.push({ args: [1.1, 0.42, 0.86], pos: [-1.3, OPENING_H + 1.05, 0.02], rot: [0, 0.05, 0.02], mat: 1 })
    blocks.push({ args: [0.9, 0.42, 0.86], pos: [-0.25, OPENING_H + 1.05, -0.04], rot: [0, -0.04, -0.03], mat: 0 })
    blocks.push({ args: [0.7, 0.3, 0.8], pos: [1.25, OPENING_H + 1.0, 0.05], rot: [0.1, 0.2, 0.22], mat: 1 })
    // Threshold stone, worn in the middle
    blocks.push({ args: [OPENING_W + 0.3, 0.16, 1.1], pos: [0, 0.08, 0.05], rot: [0, 0, 0], mat: 1 })
    // Blocks that fell off long ago, half sunk in the earth
    blocks.push({ args: [0.82, 0.6, 0.78], pos: [2.65, 0.22, 1.7], rot: [0.18, 0.6, 0.35], mat: 0 })
    blocks.push({ args: [0.6, 0.44, 0.7], pos: [-2.9, 0.12, 2.6], rot: [-0.2, -0.4, 0.15], mat: 1 })

    const scattered = Array.from({ length: 46 }, (_, i) => {
      const nearPillar = i < 20
      const side = rand() > 0.5 ? 1 : -1
      const x = nearPillar ? side * (PILLAR_X + 0.2 + rand() * 1.4) : (rand() - 0.5) * 12
      const z = nearPillar ? -0.6 + rand() * 2.2 : -3 + rand() * 13
      const s = nearPillar ? 0.1 + rand() * 0.3 : 0.05 + rand() * 0.22
      return { x, z, s, geo: Math.floor(rand() * 4), ry: rand() * Math.PI * 2, rx: (rand() - 0.5) * 0.5 }
    }).filter((r) => !(Math.abs(r.x) < OPENING_W / 2 + 0.2 && r.z > -0.8 && r.z < 6)) // keep the path clear
    return { blocks, scattered }
  }, [])

  const geos = useMemo(() => layout.blocks.map((b, i) => chippedBlock(b.args[0], b.args[1], b.args[2], i + 1)), [layout])
  const rocks = useMemo(() => [3, 5, 8, 13].map((s) => rock(s, 4)), [])
  useEffect(
    () => () => {
      geos.forEach((g) => g.dispose())
      rocks.forEach((g) => g.dispose())
    },
    [geos, rocks]
  )

  return (
    <group>
      {/* Rubble core inside each pillar: the joints between blocks show deep shadow, not sky */}
      {[-1, 1].map((s) => (
        <mesh key={`core${s}`} position={[s * PILLAR_X, OPENING_H / 2 + 0.3, 0]} material={m.core}>
          <boxGeometry args={[0.74, OPENING_H, 0.8]} />
        </mesh>
      ))}
      <mesh position={[0, OPENING_H + 0.75, 0]} material={m.core}>
        <boxGeometry args={[OPENING_W + 1.8, 0.5, 0.8]} />
      </mesh>
      {layout.blocks.map((b, i) => (
        <mesh key={i} geometry={geos[i]} position={b.pos} rotation={b.rot} material={b.mat ? m.blockB : m.blockA} castShadow receiveShadow />
      ))}
      {layout.scattered.map((r, i) => (
        <mesh key={`r${i}`} geometry={rocks[r.geo]} position={[r.x, heightAt(r.x, r.z) + r.s * 0.25, r.z]} rotation={[r.rx, r.ry, 0]} scale={r.s} material={i % 2 ? m.blockA : m.blockB} castShadow receiveShadow />
      ))}
    </group>
  )
}

/* ── The two stone doors, hinged at the pillars ── */
function Doors({ progress, m }: { progress: MotionValue<number>; m: RuinMats }) {
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  useFrame(() => {
    const p = progress.get()
    if (left.current) left.current.rotation.y = leafAngle(p, 0)
    if (right.current) right.current.rotation.y = -leafAngle(p, 0.012)
  })
  const slab = (side: -1 | 1) => (
    // Plain box: its faces map the carving once, edge to edge
    <mesh position={[(-side * LEAF_W) / 2, DOOR_CY + 0.13, 0]} material={side < 0 ? m.doorL : m.doorR} castShadow receiveShadow>
      <boxGeometry args={[LEAF_W - 0.012, OPENING_H - 0.06, 0.3]} />
    </mesh>
  )
  return (
    <>
      <group ref={left} position={[-OPENING_W / 2, 0, 0]}>
        {slab(-1)}
      </group>
      <group ref={right} position={[OPENING_W / 2, 0, 0]}>
        {slab(1)}
      </group>
    </>
  )
}

/* ── Sunlight from the other side: a shadow-casting spot behind the doors ── */
function SunBeyond({ progress }: { progress: MotionValue<number> }) {
  const spot = useRef<THREE.SpotLight>(null)
  const bounce = useRef<THREE.PointLight>(null)
  const { scene } = useThree()
  useEffect(() => {
    const s = spot.current
    if (!s) return
    s.target.position.set(0, 0.2, 9)
    scene.add(s.target)
    return () => {
      scene.remove(s.target)
    }
  }, [scene])
  useFrame(() => {
    const p = progress.get()
    const flood = lightFlood(p)
    if (spot.current) spot.current.intensity = 6 + seamGlow(p) * 16 + flood * 380
    if (bounce.current) bounce.current.intensity = flood * 10
  })
  return (
    <>
      <spotLight
        ref={spot}
        position={LIGHT_POS.toArray()}
        color={SUN}
        angle={0.62}
        penumbra={0.5}
        decay={1.3}
        distance={40}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
      {/* Warm light bouncing off the stone just in front of the doorway */}
      <pointLight ref={bounce} position={[0, 1.4, 1.2]} color={SUN} intensity={0} distance={9} decay={1.5} />
    </>
  )
}

/* ── What's visible through the opening: a bright, hazy sunlit world (HDR, so it blooms) ── */
function Beyond({ progress, dot }: { progress: MotionValue<number>; dot: THREE.Texture }) {
  const wall = useRef<THREE.MeshBasicMaterial>(null)
  const core = useRef<THREE.SpriteMaterial>(null)
  const far = useRef<THREE.MeshBasicMaterial>(null)
  const base = useMemo(() => new THREE.Color('#FFE2B8'), [])
  useFrame(() => {
    const p = progress.get()
    const flood = lightFlood(p)
    if (wall.current) wall.current.color.copy(base).multiplyScalar(0.5 + seamGlow(p) * 0.8 + flood * 4)
    if (core.current) core.current.opacity = flood * 0.8
    if (far.current) far.current.opacity = range(p, THRESHOLD[0] + 0.115, THRESHOLD[0] + 0.14) // under the full white-out
  })
  return (
    <>
      {/* Just behind the doorway, hidden by the pillars from the front */}
      <mesh position={[0, DOOR_CY + 0.1, -0.7]}>
        <planeGeometry args={[OPENING_W + 0.2, OPENING_H + 0.3]} />
        <meshBasicMaterial ref={wall} color={'#FFE2B8'} fog={false} />
      </mesh>
      <sprite position={[0, DOOR_CY, -0.5]} scale={[OPENING_W * 1.6, OPENING_H * 1.2, 1]}>
        <spriteMaterial ref={core} map={dot} color={'#FFF1DC'} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
      <mesh position={[0, DOOR_CY, -8]}>
        <planeGeometry args={[90, 60]} />
        <meshBasicMaterial ref={far} color={'#FFF4E2'} transparent opacity={0} fog={false} />
      </mesh>
    </>
  )
}

/* ── Sky: a dusk gradient dome — lighter haze at the horizon, deep blue-grey overhead ── */
const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const skyFragment = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uGlow;
  float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n1(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h1(i), h1(i+vec2(1,0)), f.x), mix(h1(i+vec2(0,1)), h1(i+vec2(1,1)), f.x), f.y); }
  void main() {
    float h = vDir.y;
    vec3 col = mix(uHorizon, uZenith, smoothstep(-0.02, 0.55, h));
    // Faint cloud layers
    vec2 uv = vDir.xz / max(h + 0.25, 0.05);
    float c = n1(uv * 1.3) * 0.6 + n1(uv * 3.1) * 0.4;
    col = mix(col, uHorizon * 1.25, smoothstep(0.45, 0.9, c) * 0.35 * smoothstep(0.0, 0.3, h));
    // Last light of the day low behind the ruin
    col += uGlow * pow(max(dot(vDir, normalize(vec3(0.15, 0.05, -1.0))), 0.0), 8.0) * 0.35;
    gl_FragColor = vec4(col, 1.0);
  }
`
function SkyDome() {
  const uniforms = useMemo(
    () => ({ uHorizon: { value: SKY_HORIZON }, uZenith: { value: SKY_ZENITH }, uGlow: { value: SKY_GLOW } }),
    []
  )
  return (
    <mesh scale={90} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial vertexShader={skyVertex} fragmentShader={skyFragment} uniforms={uniforms} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  )
}

/* ── Dust: motes everywhere, bright where the beam catches them; grit falls while the doors grind ── */
const MOTES = 1100
const MOTE_SEED = (() => {
  const r = mulberry32(7)
  return Array.from({ length: MOTES }, () => ({ x: (r() - 0.5) * 10, y: r() * 5.5, z: -1 + r() * 12, s: 0.2 + r() * 0.8, ph: r() * 6.28 }))
})()
const GRIT = 200
const GRIT_SEED = (() => {
  const r = mulberry32(9)
  return Array.from({ length: GRIT }, () => ({ x: (r() - 0.5) * (OPENING_W + 0.6), z: -0.2 + r() * 0.7, sp: 0.6 + r() * 0.8, ph: r() }))
})()

function Dust({ progress, dot }: { progress: MotionValue<number>; dot: THREE.Texture }) {
  const motes = useRef<THREE.Points>(null)
  const motesMat = useRef<THREE.PointsMaterial>(null)
  const grit = useRef<THREE.Points>(null)
  const gritMat = useRef<THREE.PointsMaterial>(null)
  const motePos = useMemo(() => new Float32Array(MOTES * 3), [])
  const gritPos = useMemo(() => new Float32Array(GRIT * 3), [])
  useFrame((state) => {
    const p = progress.get()
    const t = state.clock.elapsedTime
    const flood = lightFlood(p)
    const r = rumble(p)
    if (motes.current) {
      const a = motes.current.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < MOTES; i++) {
        const d = MOTE_SEED[i]
        a.setXYZ(i, d.x + Math.sin(t * 0.15 * d.s + d.ph) * 0.4, ((d.y + t * 0.03 * d.s) % 5.5) + Math.sin(t * 0.4 + d.ph) * 0.05, d.z + Math.cos(t * 0.12 + d.ph) * 0.3)
      }
      a.needsUpdate = true
    }
    if (motesMat.current) {
      motesMat.current.opacity = 0.14 + flood * 0.6
      motesMat.current.size = 0.03 + flood * 0.018
    }
    if (grit.current) {
      const a = grit.current.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < GRIT; i++) {
        const g = GRIT_SEED[i]
        const fall = (t * g.sp + g.ph) % 1
        a.setXYZ(i, g.x, OPENING_H + 0.1 - fall * fall * OPENING_H, g.z)
      }
      a.needsUpdate = true
    }
    if (gritMat.current) gritMat.current.opacity = (r * 0.9 + tremble(p) * 0.3) * 0.9
  })
  return (
    <>
      <points ref={motes} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[motePos, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={motesMat} map={dot} color={'#f1d9b5'} size={0.03} sizeAttenuation transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <points ref={grit} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[gritPos, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={gritMat} map={dot} color={'#b9a98f'} size={0.026} sizeAttenuation transparent opacity={0} depthWrite={false} />
      </points>
    </>
  )
}

/* ── Puffs of dust kicked up at the foot of the doors as they scrape open ── */
function DoorDust({ progress, tex }: { progress: MotionValue<number>; tex: THREE.Texture }) {
  const puffs = useRef<(THREE.Sprite | null)[]>([])
  const spots = useMemo(() => [-0.9, -0.3, 0.3, 0.9, -1.6, 1.6], [])
  useFrame(() => {
    const p = progress.get()
    const r = rumble(p)
    const grow = range(p, OPEN[0], OPEN[1])
    puffs.current.forEach((s, i) => {
      if (!s) return
      const k = 1 + grow * (2.2 + i * 0.2)
      s.scale.set(1.2 * k, 0.5 * k, 1)
      s.position.y = 0.25 + grow * 0.35
      ;(s.material as THREE.SpriteMaterial).opacity = r * 0.3
    })
  })
  return (
    <>
      {spots.map((x, i) => (
        <sprite
          key={i}
          ref={(el) => {
            puffs.current[i] = el
          }}
          position={[x, 0.3, 0.5]}
        >
          <spriteMaterial map={tex} color={'#b7aa95'} transparent opacity={0} depthWrite={false} />
        </sprite>
      ))}
    </>
  )
}

/* ── Uneven ground: a displaced grid following heightAt, with a worn path to the door ── */
function Ground({ m }: { m: RuinMats }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(70, 70, 260, 260)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, 3)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)))
    g.computeVertexNormals()
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={m.ground} receiveShadow />
}

/* ── Pebbles scattered over the ground (one instanced draw call) ── */
const PEBBLES = 700
function Pebbles({ m }: { m: RuinMats }) {
  const geo = useMemo(() => rock(21, 2, 0.55), [])
  useEffect(() => () => geo.dispose(), [geo])
  const mesh = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const im = mesh.current
    if (!im) return
    const rand = mulberry32(55)
    const o = new THREE.Object3D()
    for (let i = 0; i < PEBBLES; i++) {
      const x = (rand() - 0.5) * 18
      const z = -4 + rand() * 16
      // Fewer stones on the trodden path
      if (Math.abs(x) < 1.4 && z > -0.5 && z < 9 && rand() < 0.75) {
        o.scale.setScalar(0)
      } else {
        const s = 0.018 + Math.pow(rand(), 2.5) * 0.09
        o.scale.set(s * (0.8 + rand() * 0.5), s, s * (0.8 + rand() * 0.5))
      }
      o.position.set(x, heightAt(x, z) + o.scale.y * 0.15, z)
      o.rotation.set(rand() * 0.4, rand() * Math.PI * 2, rand() * 0.4)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
    }
    im.instanceMatrix.needsUpdate = true
  }, [])
  return <instancedMesh ref={mesh} args={[geo, m.blockB, PEBBLES]} castShadow receiveShadow />
}

/* ── Clumps of dry grass along the sides, swaying in a slow breeze ── */
const TUFTS = 900
function useBladeGeometry() {
  const g = useMemo(() => {
    // A clump of 9 tapered, curving blades fanning out from the root
    const pos: number[] = []
    const rand = mulberry32(21)
    const SEG = 4
    for (let b = 0; b < 9; b++) {
      const a = (b / 9) * Math.PI * 2 + rand() * 0.6
      const lean = 0.2 + rand() * 0.35
      const h = 0.5 + rand() * 0.7
      const w = 0.028 + rand() * 0.012
      const dx = Math.cos(a)
      const dz = Math.sin(a)
      const pt = (t: number, sideSign: number) => {
        const bend = lean * t * t
        const wd = w * (1 - t * 0.92) * sideSign
        return [dx * bend - dz * wd, h * t, dz * bend + dx * wd]
      }
      for (let s = 0; s < SEG; s++) {
        const t0 = s / SEG
        const t1 = (s + 1) / SEG
        const a0 = pt(t0, -1)
        const b0 = pt(t0, 1)
        const a1 = pt(t1, -1)
        const b1 = pt(t1, 1)
        pos.push(...a0, ...b0, ...a1, ...b0, ...b1, ...a1)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.computeVertexNormals()
    return geo
  }, [])
  useEffect(() => () => g.dispose(), [g])
  return g
}
function Grass() {
  const blade = useBladeGeometry()
  const mesh = useRef<THREE.InstancedMesh>(null)
  const time = useRef({ value: 0 }) // shader uniform, mutated every frame
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#8a7f52', roughness: 1, side: THREE.DoubleSide })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uWind = time.current
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;').replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
vec3 root = instanceMatrix[3].xyz;
#else
vec3 root = vec3(0.0);
#endif
float gust = sin(uWind * 0.6 + root.x * 0.25) * 0.5 + 0.5;
float sway = sin(uWind * 1.7 + root.x * 0.7 + root.z * 0.45) * (0.5 + gust) + sin(uWind * 3.3 + root.z * 1.3) * 0.25;
float bendK = position.y * position.y;
transformed.x += sway * bendK * 0.09;
transformed.z += sway * bendK * 0.04;`
      )
    }
    return m
  }, [])
  useEffect(() => () => material.dispose(), [material])
  useFrame((state) => {
    time.current.value = state.clock.elapsedTime
  })
  useEffect(() => {
    const im = mesh.current
    if (!im) return
    const rand = mulberry32(31)
    const o = new THREE.Object3D()
    const tint = new THREE.Color()
    for (let i = 0; i < TUFTS; i++) {
      // Mostly toward the sides and the edges of the path; none in the doorway
      const side = rand() > 0.5 ? 1 : -1
      const x = side * (1.5 + Math.pow(rand(), 0.8) * 10)
      const z = -6 + rand() * 18
      const s = 0.2 + rand() * 0.45
      o.position.set(x, heightAt(x, z) - 0.02, z)
      o.rotation.set((rand() - 0.5) * 0.2, rand() * Math.PI * 2, (rand() - 0.5) * 0.2)
      o.scale.set(s, s * (0.7 + rand() * 0.7), s)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
      tint.setHSL(0.11 + rand() * 0.06, 0.22 + rand() * 0.18, 0.2 + rand() * 0.16) // dry olive to straw
      im.setColorAt(i, tint)
    }
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  }, [])
  return <instancedMesh ref={mesh} args={[blade, material, TUFTS]} castShadow receiveShadow frustumCulled={false} />
}

/* ── Post-processing: ambient occlusion, volumetric fog and light, bloom, filmic tone mapping,
      lens vignette and film grain ── */
function Effects({ progress, mobile, ao }: { progress: MotionValue<number>; mobile: boolean; ao: boolean }) {
  const camera = useThree((s) => s.camera)
  const fog = useMemo(() => new VolumetricFogEffect(mobile ? 10 : 16, window.location.search.includes('fogdebug')), [mobile])
  useEffect(() => {
    // Live references: the shader always sees the current camera
    fog.u('uProjInv').value = camera.projectionMatrixInverse
    fog.u('uCamWorld').value = camera.matrixWorld
    fog.u('uCamPos').value = camera.position
    fog.u('uLightPos').value = LIGHT_POS
    fog.u('uOpeningH').value = OPENING_H
    fog.u('uHorizon').value = SKY_HORIZON
    fog.u('uZenith').value = SKY_ZENITH
    fog.u('uGlow').value = SKY_GLOW
  }, [fog, camera])
  useEffect(() => () => fog.dispose(), [fog])
  useFrame((state) => {
    const p = progress.get()
    // Gap between the leaves as seen from the light, projected onto the door plane
    const theta = leafAngle(p, 0)
    const ex = -OPENING_W / 2 + LEAF_W * Math.cos(theta)
    const ez = -LEAF_W * Math.sin(theta)
    const q = (ex * -LIGHT_POS.z) / (ez - LIGHT_POS.z)
    fog.u('uHalfGap').value = Math.min(OPENING_W / 2, Math.max(0.006, -q))
    fog.u('uLight').value = seamGlow(p) * 0.6 + lightFlood(p) * 4.5
    fog.u('uExposure').value = exposureAt(p)
    fog.u('uTime').value = state.clock.elapsedTime
  })
  return (
    <EffectComposer multisampling={0}>
      <N8AO enabled={ao} aoRadius={0.9} distanceFalloff={0.8} intensity={2.6} quality="low" halfRes />
      <primitive object={fog} />
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={1} luminanceSmoothing={0.3} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <BrightnessContrast brightness={0} contrast={0.1} />
      <HueSaturation saturation={0.08} />
      <Vignette offset={0.28} darkness={0.55} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.22} />
      <SMAA />
    </EffectComposer>
  )
}

function World({ progress }: { progress: MotionValue<number> }) {
  const m = useRuinMaterials()
  const puff = useMemo(() => makeFogPuff(4), [])
  const dot = useMemo(() => makeSoftDot(), [])
  useEffect(
    () => () => {
      puff.dispose()
      dot.dispose()
    },
    [puff, dot]
  )
  return (
    <>
      <SkyDome />
      <Ruin m={m} />
      <Doors progress={progress} m={m} />
      <Ground m={m} />
      <SunBeyond progress={progress} />
      <Beyond progress={progress} dot={dot} />
      <Pebbles m={m} />
      <Grass />
      <Dust progress={progress} dot={dot} />
      <DoorDust progress={progress} tex={puff} />
    </>
  )
}

export default function DoorScene({ progress, active }: SceneProps) {
  const mobile = useMemo(() => window.matchMedia('(max-width: 767px)').matches, [])
  // Quality adapts to the device. Tier 3: everything, sharp. If the frame rate can't keep up the
  // scene steps down — ambient occlusion off first, then resolution — and back up when it can.
  // A frame-exact recording (?capture) always renders at full quality.
  const capture = useMemo(() => window.location.search.includes('capture'), [])
  const maxDpr = Math.min(window.devicePixelRatio, 1.5)
  const [tier, setTier] = useState(mobile ? 1 : 3)
  const dpr = tier >= 2 ? maxDpr : tier === 1 ? Math.min(1, maxDpr) : 0.75
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={dpr}
      shadows="soft"
      flat
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ position: [0, 1.3, 12.5], fov: 38, near: 0.1, far: 140 }}
      frameloop={active ? 'always' : 'never'}
    >
      {!capture && (
        <PerformanceMonitor
          bounds={() => [45, 58]}
          flipflops={4}
          onDecline={() => setTier((t) => Math.max(0, t - 1))}
          onIncline={() => setTier((t) => Math.min(3, t + 1))}
        />
      )}
      <color attach="background" args={[SKY]} />
      <fogExp2 attach="fog" args={[SKY, 0.038]} />
      {/* Soft image-based light from a dusk sky (built in code, no HDRI download) */}
      <Environment resolution={64} frames={1} environmentIntensity={0.3}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color={'#39424f'} side={THREE.BackSide} />
        </mesh>
        <Lightformer form="rect" intensity={1.2} color={'#9fb0cc'} position={[-6, 8, 9]} scale={[12, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.5} color={'#6a5a48'} position={[0, -6, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
      </Environment>
      {/* Dusk: cool sky light from above, warm earth bounce from below */}
      <hemisphereLight args={['#7d8aa3', '#3a3226', 0.45]} />
      {/* Low moon/sky key from the side, so the stone shows its relief */}
      <directionalLight
        position={[-7, 6, 8]}
        intensity={3.4}
        color={'#aebcd8'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <CameraRig progress={progress} />
      <World progress={progress} />
      <Effects progress={progress} mobile={mobile} ao={tier >= 3} />
    </Canvas>
  )
}
