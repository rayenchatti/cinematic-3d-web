'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { MotionValue } from 'framer-motion'
import { LEAF_W, MAX_SWING, OPEN, OPENING_H, OPENING_W, THRESHOLD, cameraAt, lightFlood, range, seamGlow, swing, tremble } from './doorTimeline'
import { makeDoorSlab, makeEarth, makeFogPuff, makeSoftDot, makeStone, mulberry32 } from './ruinTextures'
import { heightAt } from './terrain'

interface SceneProps {
  progress: MotionValue<number>
  active: boolean
}

const SKY = '#2a2f38' // dusk haze — background and fog share it so distance fades naturally
const SUN = '#FFD9A0' // warm light from the other side
const DOOR_CY = OPENING_H / 2
const PILLAR_X = OPENING_W / 2 + 0.44

// Heavy stone grinding: a rumble while the doors move
const rumble = (p: number) => range(p, OPEN[0], OPEN[0] + 0.03) * (1 - range(p, OPEN[1] - 0.06, OPEN[1]))

/* ── Camera: damped dolly toward and through the doorway, with a subtle handheld sway ── */
function CameraRig({ progress }: { progress: MotionValue<number> }) {
  const pointer = useRef({ x: 0, y: 0 })
  const cam = useRef(cameraAt(0))
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
  useFrame((state, dt) => {
    const p = progress.get()
    const goal = cameraAt(p)
    const c = cam.current
    const k = 1 - Math.exp(-4 * Math.min(dt, 0.05))
    c.z += (goal.z - c.z) * k
    c.y += (goal.y - c.y) * k
    c.fov += (goal.fov - c.fov) * k
    const t = state.clock.elapsedTime
    const shake = (tremble(p) + rumble(p)) * 0.02
    const aspect = state.size.width / state.size.height
    const back = aspect < 1 && c.z > 0 ? (1 - aspect) * 9 : 0
    const camera = state.camera as THREE.PerspectiveCamera
    camera.position.set(
      pointer.current.x * 0.3 + Math.sin(t * 0.37) * 0.06 + Math.sin(t * 31) * shake,
      c.y + pointer.current.y * 0.12 + Math.sin(t * 0.53) * 0.03 + Math.cos(t * 27) * shake,
      c.z + back
    )
    camera.lookAt(pointer.current.x * 0.12, DOOR_CY - 0.25, c.z - 10)
    if (Math.abs(camera.fov - c.fov) > 0.05) {
      camera.fov = c.fov
      camera.updateProjectionMatrix()
    }
  })
  return null
}

/* ── Materials: weathered stone, carved slabs, earth (textures drawn once) ── */
function useRuinMaterials() {
  const mats = useMemo(() => {
    const stoneA = makeStone(11)
    const stoneB = makeStone(23, 512, [136, 126, 110], [66, 60, 52], 0.25)
    const doorL = makeDoorSlab(31, false)
    const doorR = makeDoorSlab(37, true)
    const earth = makeEarth(5)
    const stone = (t: { map: THREE.Texture; bump: THREE.Texture }, bumpScale = 3) =>
      new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale, roughness: 0.96, metalness: 0 })
    return {
      blockA: stone(stoneA),
      blockB: stone(stoneB),
      doorL: stone(doorL, 5),
      doorR: stone(doorR, 5),
      ground: stone(earth, 2),
    }
  }, [])
  useEffect(
    () => () =>
      Object.values(mats).forEach((m) => {
        m.map?.dispose()
        m.bumpMap?.dispose()
        m.dispose()
      }),
    [mats]
  )
  return mats
}
type RuinMats = ReturnType<typeof useRuinMaterials>

/* ── Rough rocks: icosahedrons with their vertices pushed in and out ── */
function useRockGeometries() {
  const geos = useMemo(
    () =>
      [3, 5, 8, 13].map((seed) => {
        const g = new THREE.IcosahedronGeometry(1, 2)
        const rand = mulberry32(seed)
        const pos = g.attributes.position as THREE.BufferAttribute
        const v = new THREE.Vector3()
        // Same displacement for vertices that share a position, so the surface stays closed
        const cache = new Map<string, number>()
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i)
          const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`
          if (!cache.has(key)) cache.set(key, 0.72 + rand() * 0.45)
          v.multiplyScalar(cache.get(key)!)
          v.y *= 0.7 // flatter, like weathered stones
          pos.setXYZ(i, v.x, v.y, v.z)
        }
        g.computeVertexNormals()
        return g
      }),
    []
  )
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos])
  return geos
}

/* ── The ruin: stacked pillars, a cracked lintel, cap stones, a fallen block, rubble ── */
function Ruin({ m }: { m: RuinMats }) {
  const rocks = useRockGeometries()
  const layout = useMemo(() => {
    const rand = mulberry32(42)
    const pillars = [-1, 1].map((side) => {
      const blocks: { y: number; h: number; w: number; d: number; ox: number; ry: number; rz: number; mat: number }[] = []
      let y = 0.38
      while (y < OPENING_H + 0.1) {
        const h = Math.min(0.72 + rand() * 0.38, OPENING_H + 0.1 - y + 0.05)
        blocks.push({ y: y + h / 2, h: h - 0.02, w: 0.78 + rand() * 0.1, d: 0.84 + rand() * 0.1, ox: (rand() - 0.5) * 0.07, ry: (rand() - 0.5) * 0.08, rz: (rand() - 0.5) * 0.025, mat: rand() > 0.5 ? 1 : 0 })
        y += h
      }
      return { side, blocks }
    })
    const scattered = Array.from({ length: 42 }, (_, i) => {
      const nearPillar = i < 18
      const side = rand() > 0.5 ? 1 : -1
      const x = nearPillar ? side * (PILLAR_X + 0.2 + rand() * 1.4) : (rand() - 0.5) * 12
      const z = nearPillar ? -0.6 + rand() * 2.2 : -3 + rand() * 13
      const s = nearPillar ? 0.1 + rand() * 0.3 : 0.05 + rand() * 0.22
      return { x, z, s, geo: Math.floor(rand() * 4), ry: rand() * Math.PI * 2, rx: (rand() - 0.5) * 0.6 }
    }).filter((r) => !(Math.abs(r.x) < OPENING_W / 2 + 0.2 && r.z > -0.8 && r.z < 6)) // keep the path clear
    return { pillars, scattered }
  }, [])

  return (
    <group>
      {/* Plinths */}
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[1.08, 0.38, 1.12]} radius={0.04} smoothness={3} position={[s * PILLAR_X, 0.19, 0]} material={m.blockB} castShadow receiveShadow />
      ))}
      {/* Pillars of stacked, slightly shifted blocks */}
      {layout.pillars.map(({ side, blocks }) =>
        blocks.map((b, i) => (
          <RoundedBox
            key={`${side}-${i}`}
            args={[b.w, b.h, b.d]}
            radius={0.05}
            smoothness={3}
            position={[side * PILLAR_X + b.ox, b.y, 0]}
            rotation={[0, b.ry, b.rz]}
            material={b.mat ? m.blockA : m.blockB}
            castShadow
            receiveShadow
          />
        ))
      )}
      {/* Lintel, sagging a touch, and a broken row of cap stones */}
      <RoundedBox args={[OPENING_W + 2.1, 0.72, 1.0]} radius={0.05} smoothness={3} position={[0, OPENING_H + 0.48, 0]} rotation={[0, 0, 0.012]} material={m.blockA} castShadow receiveShadow />
      <RoundedBox args={[1.1, 0.42, 0.86]} radius={0.05} smoothness={3} position={[-1.3, OPENING_H + 1.05, 0.02]} rotation={[0, 0.05, 0.02]} material={m.blockB} castShadow />
      <RoundedBox args={[0.9, 0.42, 0.86]} radius={0.05} smoothness={3} position={[-0.25, OPENING_H + 1.05, -0.04]} rotation={[0, -0.04, -0.03]} material={m.blockA} castShadow />
      <RoundedBox args={[0.7, 0.3, 0.8]} radius={0.05} smoothness={3} position={[1.25, OPENING_H + 1.0, 0.05]} rotation={[0.1, 0.2, 0.22]} material={m.blockB} castShadow />
      {/* Threshold stone, worn in the middle */}
      <RoundedBox args={[OPENING_W + 0.3, 0.16, 1.1]} radius={0.04} smoothness={3} position={[0, 0.08, 0.05]} material={m.blockB} receiveShadow castShadow />
      {/* A block that fell off long ago */}
      <RoundedBox args={[0.82, 0.6, 0.78]} radius={0.06} smoothness={3} position={[2.65, 0.28, 1.7]} rotation={[0.18, 0.6, 0.35]} material={m.blockA} castShadow receiveShadow />
      {/* Rubble */}
      {layout.scattered.map((r, i) => (
        <mesh key={i} geometry={rocks[r.geo]} position={[r.x, heightAt(r.x, r.z) + r.s * 0.4, r.z]} rotation={[r.rx, r.ry, 0]} scale={r.s} material={i % 2 ? m.blockA : m.blockB} castShadow receiveShadow />
      ))}
    </group>
  )
}

/* ── The two stone doors, hinged at the pillars ── */
function Doors({ progress, m }: { progress: MotionValue<number>; m: RuinMats }) {
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  useFrame(() => {
    const open = swing(progress.get())
    if (left.current) left.current.rotation.y = open * MAX_SWING
    if (right.current) right.current.rotation.y = -open * MAX_SWING
  })
  const slab = (side: -1 | 1) => (
    // Plain box: its faces map the carving once, edge to edge (rounded boxes tile it)
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
    if (spot.current) spot.current.intensity = 6 + seamGlow(p) * 14 + flood * 420
    if (bounce.current) bounce.current.intensity = flood * 9
  })
  return (
    <>
      <spotLight
        ref={spot}
        position={[0, DOOR_CY + 0.6, -5.5]}
        color={SUN}
        angle={0.62}
        penumbra={0.55}
        decay={1.3}
        distance={40}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
      {/* Warm light bouncing off the stone just in front of the doorway */}
      <pointLight ref={bounce} position={[0, 1.4, 1.2]} color={SUN} intensity={0} distance={9} decay={1.5} />
    </>
  )
}

/* ── What's visible through the opening: a bright, hazy sunlit world ── */
function Beyond({ progress, dot }: { progress: MotionValue<number>; dot: THREE.Texture }) {
  const wall = useRef<THREE.MeshBasicMaterial>(null)
  const core = useRef<THREE.SpriteMaterial>(null)
  const far = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    const p = progress.get()
    const flood = lightFlood(p)
    if (wall.current) wall.current.opacity = 0.15 + flood * 0.85
    if (core.current) core.current.opacity = flood * 0.9
    if (far.current) far.current.opacity = range(p, THRESHOLD[0] + 0.115, THRESHOLD[0] + 0.14) // under the full white-out
  })
  return (
    <>
      {/* Just behind the doorway, hidden by the pillars from the front */}
      <mesh position={[0, DOOR_CY + 0.1, -0.7]}>
        <planeGeometry args={[OPENING_W + 0.5, OPENING_H + 0.5]} />
        <meshBasicMaterial ref={wall} color={'#FFE7C2'} transparent opacity={0.15} toneMapped={false} fog={false} />
      </mesh>
      <sprite position={[0, DOOR_CY, -0.5]} scale={[OPENING_W * 1.6, OPENING_H * 1.2, 1]}>
        <spriteMaterial ref={core} map={dot} color={'#FFFFFF'} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
      </sprite>
      <mesh position={[0, DOOR_CY, -8]}>
        <planeGeometry args={[90, 60]} />
        <meshBasicMaterial ref={far} color={'#FFF4E2'} transparent opacity={0} toneMapped={false} fog={false} />
      </mesh>
    </>
  )
}

/* ── God-ray beam through the opening: soft edges, faint streaks, fades with distance ── */
const beamVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vFacing = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`
const beamFragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    float along = pow(vUv.y, 1.4);                       // brightest at the doorway
    float edge = pow(vFacing, 2.5);                      // soft cylinder edges
    float streaks = 0.7 + 0.3 * sin(vUv.x * 70.0 + uTime * 0.15) * sin(vUv.x * 23.0 - uTime * 0.1);
    gl_FragColor = vec4(uColor, uOpacity * along * edge * streaks);
  }
`
function Beam({ progress }: { progress: MotionValue<number> }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uOpacity: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color(SUN) } }), [])
  useFrame((state) => {
    const m = mat.current
    if (!m) return
    m.uniforms.uOpacity.value = lightFlood(progress.get()) * 0.32
    m.uniforms.uTime.value = state.clock.elapsedTime
  })
  return (
    <mesh position={[0, DOOR_CY - 0.5, 5.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[1.25, 4.8, 11, 64, 1, true]} />
      <shaderMaterial ref={mat} vertexShader={beamVertex} fragmentShader={beamFragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  )
}

/* ── Layered ground fog drifting slowly; warms up when the light comes through ── */
const FOG_LAYERS = Array.from({ length: 18 }, (_, i) => {
  const r = mulberry32(100 + i)
  return { x: (r() - 0.5) * 16, y: 0.35 + r() * 1.2, z: -4 + r() * 15, s: 4 + r() * 5, ph: r() * 6.28, sp: 0.02 + r() * 0.04, o: 0.12 + r() * 0.14 }
})
function GroundFog({ progress, tex }: { progress: MotionValue<number>; tex: THREE.Texture }) {
  const sprites = useRef<(THREE.Sprite | null)[]>([])
  const cool = useMemo(() => new THREE.Color('#8e97a6'), [])
  const warm = useMemo(() => new THREE.Color('#e9c896'), [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const flood = lightFlood(progress.get())
    sprites.current.forEach((s, i) => {
      if (!s) return
      const f = FOG_LAYERS[i]
      s.position.x = f.x + Math.sin(t * f.sp + f.ph) * 1.6
      const mat = s.material as THREE.SpriteMaterial
      // Fog near the doorway catches the light
      const nearBeam = Math.max(0, 1 - Math.abs(s.position.x) / 3.5) * Math.max(0, 1 - Math.abs(f.z - 2) / 7)
      mat.color.copy(cool).lerp(warm, flood * nearBeam)
      mat.opacity = f.o * (1 + flood * nearBeam * 0.8)
    })
  })
  return (
    <>
      {FOG_LAYERS.map((f, i) => (
        <sprite
          key={i}
          ref={(el) => {
            sprites.current[i] = el
          }}
          position={[f.x, f.y, f.z]}
          scale={[f.s, f.s * 0.45, 1]}
        >
          <spriteMaterial map={tex} color={'#8e97a6'} transparent opacity={f.o} depthWrite={false} />
        </sprite>
      ))}
    </>
  )
}

/* ── Dust: motes everywhere, bright where the beam catches them; grit falls while the doors grind ── */
const MOTES = 900
const MOTE_SEED = (() => {
  const r = mulberry32(7)
  return Array.from({ length: MOTES }, () => ({ x: (r() - 0.5) * 10, y: r() * 5.5, z: -1 + r() * 12, s: 0.2 + r() * 0.8, ph: r() * 6.28 }))
})()
const GRIT = 160
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
      motesMat.current.opacity = 0.18 + flood * 0.55
      motesMat.current.size = 0.035 + flood * 0.02
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
        <pointsMaterial ref={motesMat} map={dot} color={'#f1d9b5'} size={0.035} sizeAttenuation transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <points ref={grit} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[gritPos, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={gritMat} map={dot} color={'#b9a98f'} size={0.028} sizeAttenuation transparent opacity={0} depthWrite={false} />
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
      s.scale.set(1.2 * k, 0.55 * k, 1)
      ;(s.material as THREE.SpriteMaterial).opacity = r * 0.35
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
          position={[x, 0.35, 0.5]}
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
    const g = new THREE.PlaneGeometry(70, 70, 220, 220)
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
const PEBBLES = 520
function Pebbles({ m }: { m: RuinMats }) {
  const rocks = useRockGeometries()
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
        const s = 0.02 + Math.pow(rand(), 2.5) * 0.09
        o.scale.set(s, s, s)
      }
      o.position.set(x, heightAt(x, z) + o.scale.y * 0.25, z)
      o.rotation.set(rand() * 0.5, rand() * Math.PI * 2, rand() * 0.5)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
    }
    im.instanceMatrix.needsUpdate = true
  }, [])
  return <instancedMesh ref={mesh} args={[rocks[1], m.blockB, PEBBLES]} castShadow receiveShadow />
}

/* ── Clumps of dry grass along the sides and around the stones ── */
const TUFTS = 420
function useBladeGeometry() {
  const g = useMemo(() => {
    // A clump: 7 thin, slightly bent blades fanning out from the root
    const verts: number[] = []
    const rand = mulberry32(21)
    for (let b = 0; b < 7; b++) {
      const a = (b / 7) * Math.PI * 2 + rand() * 0.5
      const lean = 0.15 + rand() * 0.25
      const h = 0.6 + rand() * 0.6
      const w = 0.035
      const dx = Math.cos(a)
      const dz = Math.sin(a)
      const px = -dz * w
      const pz = dx * w
      verts.push(-px, 0, -pz, px, 0, pz, dx * lean, h, dz * lean)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    geo.computeVertexNormals()
    return geo
  }, [])
  useEffect(() => () => g.dispose(), [g])
  return g
}
function Grass() {
  const blade = useBladeGeometry()
  const mesh = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7d7448', roughness: 1, side: THREE.DoubleSide }), [])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => {
    const im = mesh.current
    if (!im) return
    const rand = mulberry32(31)
    const o = new THREE.Object3D()
    const tint = new THREE.Color()
    for (let i = 0; i < TUFTS; i++) {
      // Mostly toward the sides and the edges of the path; none in the doorway
      const side = rand() > 0.5 ? 1 : -1
      const x = side * (1.6 + Math.pow(rand(), 0.7) * 9)
      const z = -5 + rand() * 17
      const s = 0.25 + rand() * 0.45
      o.position.set(x, heightAt(x, z) - 0.02, z)
      o.rotation.set((rand() - 0.5) * 0.2, rand() * Math.PI * 2, (rand() - 0.5) * 0.2)
      o.scale.set(s, s * (0.7 + rand() * 0.6), s)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
      tint.setHSL(0.12 + rand() * 0.05, 0.25 + rand() * 0.15, 0.24 + rand() * 0.14) // dry olive to straw
      im.setColorAt(i, tint)
    }
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  }, [])
  return <instancedMesh ref={mesh} args={[blade, material, TUFTS]} castShadow receiveShadow />
}

/* ── Big, slow fog banks on both sides and behind the ruin, hiding the empty void ── */
const SIDE_FOG = Array.from({ length: 26 }, (_, i) => {
  const r = mulberry32(300 + i)
  const side = i % 2 ? 1 : -1
  return {
    x: side * (2.6 + r() * 7),
    y: 0.6 + r() * 3.2,
    z: -6 + r() * 12,
    s: 6 + r() * 7,
    ph: r() * 6.28,
    sp: 0.015 + r() * 0.03,
    o: 0.22 + r() * 0.2,
  }
}).concat(
  // A wall of haze behind the ruin, so nothing ends abruptly around the lintel
  Array.from({ length: 8 }, (_, i) => {
    const r = mulberry32(400 + i)
    return { x: (r() - 0.5) * 14, y: 2.5 + r() * 3, z: -4 - r() * 5, s: 8 + r() * 6, ph: r() * 6.28, sp: 0.01 + r() * 0.02, o: 0.2 + r() * 0.15 }
  })
)
function SideFog({ tex }: { tex: THREE.Texture }) {
  const sprites = useRef<(THREE.Sprite | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    sprites.current.forEach((s, i) => {
      if (!s) return
      const f = SIDE_FOG[i]
      s.position.x = f.x + Math.sin(t * f.sp + f.ph) * 1.2
      s.position.y = f.y + Math.sin(t * f.sp * 0.7 + f.ph) * 0.25
    })
  })
  return (
    <>
      {SIDE_FOG.map((f, i) => (
        <sprite
          key={i}
          ref={(el) => {
            sprites.current[i] = el
          }}
          position={[f.x, f.y, f.z]}
          scale={[f.s, f.s * 0.6, 1]}
        >
          <spriteMaterial map={tex} color={'#8a93a2'} transparent opacity={f.o} depthWrite={false} />
        </sprite>
      ))}
    </>
  )
}

function World({ progress }: { progress: MotionValue<number> }) {
  const m = useRuinMaterials()
  const fogTex = useMemo(() => makeFogPuff(4), [])
  const dot = useMemo(() => makeSoftDot(), [])
  useEffect(
    () => () => {
      fogTex.dispose()
      dot.dispose()
    },
    [fogTex, dot]
  )
  return (
    <>
      <Ruin m={m} />
      <Doors progress={progress} m={m} />
      <Ground m={m} />
      <SunBeyond progress={progress} />
      <Beyond progress={progress} dot={dot} />
      <Beam progress={progress} />
      <GroundFog progress={progress} tex={fogTex} />
      <SideFog tex={fogTex} />
      <Pebbles m={m} />
      <Grass />
      <Dust progress={progress} dot={dot} />
      <DoorDust progress={progress} tex={fogTex} />
    </>
  )
}

export default function DoorScene({ progress, active }: SceneProps) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.75]}
      shadows="soft"
      gl={{ antialias: true }}
      camera={{ position: [0, 1.3, 12.5], fov: 38, near: 0.05, far: 120 }}
      frameloop={active ? 'always' : 'never'}
    >
      <color attach="background" args={[SKY]} />
      <fogExp2 attach="fog" args={[SKY, 0.042]} />
      {/* Dusk: cool sky light from above, warm earth bounce from below */}
      <hemisphereLight args={['#7d8aa3', '#3a3226', 1.25]} />
      {/* Low moon/sky key from the side, so the stone shows its relief */}
      <directionalLight
        position={[-6, 7, 9]}
        intensity={1.9}
        color={'#aebcd8'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      />
      <CameraRig progress={progress} />
      <World progress={progress} />
    </Canvas>
  )
}
