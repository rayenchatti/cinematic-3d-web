// Volumetric ground fog with real light shafts, as a post-processing effect.
//
// For every pixel it walks along the view ray up to the first surface (read from the depth
// buffer) and adds up fog: denser near the ground, shaped by drifting 3D noise, so it pools in
// the hollows and wraps around the stones instead of sitting on flat cards. Fog that lies inside
// the light coming through the doorway is lit warm: each sample is projected from the light
// onto the door plane and checked against the gap between the leaves — so the shaft has exactly
// the shape of the opening, starts as a thin line along the seam and widens as the doors swing.
import * as THREE from 'three'
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'

const fragment = /* glsl */ `
uniform mat4 uProjInv;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform float uTime;
uniform float uDensity;
uniform vec3 uFogColor;
uniform vec3 uLightColor;
uniform vec3 uLightPos;
uniform float uLight;      // strength of the light through the door
uniform float uHalfGap;    // half-width of the gap between the leaves, on the door plane
uniform float uOpeningH;
uniform float uExposure;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uGlow;

float fogHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float fogNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(fogHash(i), fogHash(i + vec3(1, 0, 0)), f.x), mix(fogHash(i + vec3(0, 1, 0)), fogHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(fogHash(i + vec3(0, 0, 1)), fogHash(i + vec3(1, 0, 1)), f.x), mix(fogHash(i + vec3(0, 1, 1)), fogHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fogFbm(vec3 p) {
  return fogNoise(p) * 0.66 + fogNoise(p * 2.37 + 3.1) * 0.34;
}

// The sky's colour in a direction — the same formula as the sky dome, so distant fog matches it
vec3 skyColor(vec3 d) {
  vec3 col = mix(uHorizon, uZenith, smoothstep(-0.02, 0.55, d.y));
  col += uGlow * pow(max(dot(d, normalize(vec3(0.15, 0.05, -1.0))), 0.0), 8.0) * 0.35;
  return col;
}

// Fog density at a point (x) and the part of it that is distant haze (y): thick in the first
// metre above the ground, banks to the sides and behind, closing in completely far away
vec2 density(vec3 p) {
  vec3 q = p * vec3(0.32, 0.55, 0.32) + vec3(uTime * 0.035, -uTime * 0.01, uTime * 0.018);
  float n = fogFbm(q);
  float ground = exp(-max(p.y, 0.0) * 1.9);
  float banks = smoothstep(0.32, 0.78, n);
  float side = smoothstep(2.2, 7.0, abs(p.x)) * 1.3 + smoothstep(-1.0, -9.0, p.z) * 1.6;
  float lowFog = exp(-max(p.y, 0.0) * 0.55);
  float far = smoothstep(10.0, 24.0, length(p.xz - vec2(0.0, 2.0))) * exp(-max(p.y, 0.0) * 0.18) * 0.9;
  float near = ground * (0.15 + banks * 1.9) + side * lowFog * (0.25 + banks * 0.9) + 0.018;
  return uDensity * vec2(near + far, far);
}

// How much of the doorway light reaches a point (0 = in shadow)
float beam(vec3 p) {
  vec3 L = uLightPos;
  if (p.z <= L.z + 0.2) return 0.0;
  float s = (0.0 - L.z) / (p.z - L.z);
  vec3 q = L + (p - L) * s;                       // where the ray from the light crosses the door plane
  float soft = 0.015 + 0.02 * max(p.z, 0.0);      // penumbra widens with distance
  float wx = 1.0 - smoothstep(uHalfGap - soft, uHalfGap + soft, abs(q.x));
  float wy = smoothstep(-0.05, 0.05, q.y) * (1.0 - smoothstep(uOpeningH - 0.05, uOpeningH + 0.05, q.y));
  float fall = 1.0 / (1.0 + 0.09 * max(p.z, 0.0) * max(p.z, 0.0));
  float behind = p.z < 0.0 ? 1.4 : 1.0;           // the bright world beyond the door
  return wx * wy * fall * behind;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 view = uProjInv * ndc;
  view /= view.w;
  vec3 world = (uCamWorld * vec4(view.xyz, 1.0)).xyz;
  vec3 rd = world - uCamPos;
  float dist = length(rd);
  rd /= dist;
  dist = min(dist, 70.0);

  // Denser sampling near the camera, coarser far away
  float stepLen = dist / float(FOG_STEPS);
  float jitter = fract(sin(dot(uv * resolution + uTime * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
  float T = 1.0;
  vec3 light = vec3(0.0);
  vec3 skyCol = skyColor(rd);
  for (int i = 0; i < FOG_STEPS; i++) {
    vec3 p = uCamPos + rd * (float(i) + jitter) * stepLen;
    vec2 dd = density(p);
    float d = dd.x;
    if (d < 0.0005) continue;
    // Forward scattering: shafts glow brightest when you look toward the light
    vec3 toLight = normalize(uLightPos - p);
    float cosA = dot(rd, toLight);
    float phase = 0.25 + 1.3 * pow(max(cosA, 0.0), 8.0);
    vec3 lit = mix(uFogColor, skyCol, dd.y / d) + uLightColor * uLight * beam(p) * phase;
    float absorb = d * stepLen;
    light += T * lit * absorb;
    T *= exp(-absorb);
    if (T < 0.02) break; // opaque: nothing behind can show
  }
  outputColor = vec4((inputColor.rgb * T + light) * uExposure, inputColor.a);
#ifdef FOG_DEBUG
  outputColor = vec4(vec3(1.0 - T), 1.0);
#endif
}
`

export class VolumetricFogEffect extends Effect {
  constructor(steps: number, debug = false) {
    super('VolumetricFogEffect', fragment, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      defines: new Map([['FOG_STEPS', String(steps)], ...(debug ? ([['FOG_DEBUG', '1']] as [string, string][]) : [])]),
      uniforms: new Map<string, THREE.Uniform>([
        ['uProjInv', new THREE.Uniform(new THREE.Matrix4())],
        ['uCamWorld', new THREE.Uniform(new THREE.Matrix4())],
        ['uCamPos', new THREE.Uniform(new THREE.Vector3())],
        ['uTime', new THREE.Uniform(0)],
        ['uDensity', new THREE.Uniform(0.12)],
        ['uFogColor', new THREE.Uniform(new THREE.Color('#56606f'))],
        ['uLightColor', new THREE.Uniform(new THREE.Color('#ffcf8f'))],
        ['uLightPos', new THREE.Uniform(new THREE.Vector3(0, 2.6, -5.5))],
        ['uLight', new THREE.Uniform(0)],
        ['uHalfGap', new THREE.Uniform(0.004)],
        ['uOpeningH', new THREE.Uniform(4)],
        ['uExposure', new THREE.Uniform(1)],
        ['uHorizon', new THREE.Uniform(new THREE.Color())],
        ['uZenith', new THREE.Uniform(new THREE.Color())],
        ['uGlow', new THREE.Uniform(new THREE.Color())],
      ]),
    })
  }
  u(name: string) {
    return this.uniforms.get(name)!
  }
}
