import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GradientConfig } from '@/types/gradient';

interface CustomMeshGradientProps {
  config: GradientConfig;
}

// Simplex 3D Noise GLSL - based on Stefan Gustavson's implementation
const simplexNoiseGLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
${simplexNoiseGLSL}

uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uWeight0;
uniform float uWeight1;
uniform float uWeight2;
uniform float uWeight3;
uniform float uWeight4;
uniform bool uHasColor4;
uniform float uTime;
uniform float uNoiseScale;
uniform float uBlur;
uniform float uStrength;
uniform float uDensity;
uniform float uFrequency;
uniform float uGrain;
uniform int uMeshStyle; // 0=organic, 1=flow, 2=center
uniform float uMeshFlowAngle; // radians
uniform bool uMeshCenterInward;
// Aurora enhancements
uniform float uStretchX; // Horizontal stretch (>1 = wider bands)
uniform float uStretchY; // Vertical stretch (<1 = horizontal bands)
uniform float uWarpAmount; // Wave distortion intensity

varying vec2 vUv;
varying vec3 vPosition;

// sRGB to Linear RGB conversion (gamma decoding)
vec3 srgbToLinear(vec3 srgb) {
  vec3 low = srgb / 12.92;
  vec3 high = pow((srgb + 0.055) / 1.055, vec3(2.4));
  return mix(low, high, step(0.04045, srgb));
}

// Linear RGB to sRGB conversion (gamma encoding)
vec3 linearToSrgb(vec3 linear) {
  vec3 low = linear * 12.92;
  vec3 high = 1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(0.0031308, linear));
}

// 8x8 Bayer Ordered Dithering - prevents banding in dark gradients
float bayer8x8(vec2 coord) {
  int x = int(mod(coord.x, 8.0));
  int y = int(mod(coord.y, 8.0));
  
  // Bayer 8x8 matrix values (0-63, normalized to -0.5 to 0.5)
  int bayer[64] = int[64](
     0, 32,  8, 40,  2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44,  4, 36, 14, 46,  6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
     3, 35, 11, 43,  1, 33,  9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47,  7, 39, 13, 45,  5, 37,
    63, 31, 55, 23, 61, 29, 53, 21
  );
  
  int index = y * 8 + x;
  return (float(bayer[index]) / 64.0 - 0.5);
}

void main() {
  // Multi-octave noise for richer texture
  float freq = max(0.1, uFrequency);
  float density = max(0.0, uDensity);
  float strength = max(0.0, uStrength);
  
  // Center UV coordinates (used by Flow/Center mesh styles)
  vec2 centeredUv = vUv - 0.5;

  // IMPORTANT: For pixel-perfect export parity we do NOT apply any edge fade/corner healing.
  // The gradient must fill the entire canvas the same way the export renderer does.
  float edgeFade = 1.0;
  
  // === AURORA ENHANCEMENT: Anisotropic UV Stretching ===
  // This transforms circular noise blobs into elongated curtain-like bands
  vec2 stretchedUv = vUv;
  stretchedUv.x *= uStretchX; // Stretch horizontally (>1 = wider patterns)
  stretchedUv.y *= uStretchY; // Compress vertically (<1 = horizontal bands)
  
  // === AURORA ENHANCEMENT: Wave Warping ===
  // Adds organic flowing distortion to break up uniformity
  float warpIntensity = uWarpAmount * 0.15; // Scale to reasonable range
  stretchedUv.y += sin(stretchedUv.x * 2.5 + uTime * 0.3) * warpIntensity;
  stretchedUv.x += cos(stretchedUv.y * 1.8 + uTime * 0.2) * warpIntensity * 0.5;
  
  vec3 noisePos = vec3(stretchedUv * uNoiseScale * freq, uTime * 0.3);
  
  // Base noise calculation with reduced higher octaves for smoother look
  float n1 = snoise(noisePos) * 0.5 + 0.5;
  // Reduced contribution from higher frequencies for smoother Aurora
  float n2 = snoise(noisePos * 1.5 + 100.0) * (0.12 + 0.06 * density);
  float n3 = snoise(noisePos * 2.5 + 200.0) * (0.05 + 0.03 * density);
  
  float baseNoise = n1 + n2 + n3;
  baseNoise = baseNoise / 1.2; // Normalize to 0-1 range
  
  // Apply mesh style modifications
  float noise = baseNoise;
  
  if (uMeshStyle == 1) {
    // FLOW: Noise biased by direction
    vec2 flowDir = vec2(cos(uMeshFlowAngle), sin(uMeshFlowAngle));
    float directionalBias = dot(centeredUv, flowDir) * 0.5 + 0.5;
    noise = baseNoise * 0.6 + directionalBias * 0.4;
  } else if (uMeshStyle == 2) {
    // CENTER: Noise biased by distance from center
    float dist = length(centeredUv) * 1.4;
    if (!uMeshCenterInward) dist = 1.0 - dist;
    noise = baseNoise * 0.5 + dist * 0.5;
  }
  // else uMeshStyle == 0 (ORGANIC): use baseNoise as-is
  
  // HISTOGRAM EQUALIZATION: Simplex noise naturally clusters around 0.5 (Gaussian-like).
  // For Aurora effect, we use gentler equalization to keep smooth gradients
  float centered = noise - 0.5;
  float stretched = sign(centered) * pow(abs(centered) * 2.0, 0.85) * 0.5;
  noise = stretched + 0.5;
  noise = clamp(noise, 0.0, 1.0);
  
  // === AURORA ENHANCEMENT: Much wider transition zones ===
  // Higher blur = dramatically wider transitions = silky Aurora effect
  float blurFactor = uBlur;
  
  // Calculate cumulative thresholds based on weights (normalized to 0-1)
  float w0 = uWeight0 / 100.0;
  float w1 = uWeight1 / 100.0;
  float w2 = uWeight2 / 100.0;
  float w3 = uWeight3 / 100.0;
  float w4 = uWeight4 / 100.0;
  
  float threshold0 = w0;
  float threshold1 = w0 + w1;
  float threshold2 = w0 + w1 + w2;
  float threshold3 = w0 + w1 + w2 + w3;
  
  // COLOR MIXING in LINEAR space (uColors are already in linear from THREE.Color)
  vec3 finalColor;
  
  // === AURORA ENHANCEMENT: Dramatically wider transitions ===
  // Base width increased from 0.12 to 0.25, blur multiplier increased 4x
  float baseTransitionWidth = 0.25;
  float transitionWidth = baseTransitionWidth + blurFactor * 0.6; // Can reach 0.85 at max blur
  
  // Ensure minimum transition width for always-smooth edges
  transitionWidth = max(transitionWidth, 0.15);
  
  // Asymmetric first transition - Color0 stays solid until threshold
  float blend01 = smoothstep(threshold0 - transitionWidth * 0.3, threshold0 + transitionWidth * 1.2, noise);
  // Other transitions centered on thresholds with wide zones
  float blend12 = smoothstep(threshold1 - transitionWidth, threshold1 + transitionWidth, noise);
  float blend23 = smoothstep(threshold2 - transitionWidth, threshold2 + transitionWidth, noise);
  float blend34 = smoothstep(threshold3 - transitionWidth, threshold3 + transitionWidth, noise);

  // Strength as VERY subtle edge definition (reduced for Aurora smoothness)
  float strengthExp = 1.0 + strength * 0.15; // Reduced from 0.4
  blend01 = pow(clamp(blend01, 0.0, 1.0), strengthExp);
  blend12 = pow(clamp(blend12, 0.0, 1.0), strengthExp);
  blend23 = pow(clamp(blend23, 0.0, 1.0), strengthExp);
  blend34 = pow(clamp(blend34, 0.0, 1.0), strengthExp);
  
  // Start with color0 and progressively blend to other colors (in linear space)
  finalColor = uColor0;
  finalColor = mix(finalColor, uColor1, blend01);
  finalColor = mix(finalColor, uColor2, blend12);
  finalColor = mix(finalColor, uColor3, blend23);
  
  // Apply color4 if enabled
  if (uHasColor4) {
    finalColor = mix(finalColor, uColor4, blend34);
  }
  
  // === AURORA ENHANCEMENT: Subtle glow boost at color transitions ===
  // This adds a "halo" effect at the edges where colors meet
  float midBlend01 = 1.0 - abs(blend01 * 2.0 - 1.0);
  float midBlend12 = 1.0 - abs(blend12 * 2.0 - 1.0);
  float midBlend23 = 1.0 - abs(blend23 * 2.0 - 1.0);
  
  // Add subtle glow using the brighter of adjacent colors
  vec3 glow = uColor1 * midBlend01 * 0.08;
  glow += uColor2 * midBlend12 * 0.06;
  glow += uColor3 * midBlend23 * 0.05;
  finalColor += glow;
  
  // No edge fade (kept for clarity)
  finalColor = mix(uColor0, finalColor, edgeFade);
  
  // Clamp before gamma correction
  finalColor = clamp(finalColor, 0.0, 1.0);
  
  // Convert from Linear RGB back to sRGB for correct display
  finalColor = linearToSrgb(finalColor);
  
  // Apply Bayer dithering to prevent banding (especially in dark gradients)
  float d = bayer8x8(gl_FragCoord.xy);
  finalColor = clamp(finalColor + d * (0.75 / 255.0), 0.0, 1.0);
  
  gl_FragColor = vec4(finalColor, 1.0);

  // Film grain (subtle) for Mesh mode too - apply in sRGB space
  if (uGrain > 0.0) {
    float g = snoise(vec3(vUv * 220.0, uTime * 0.7));
    float grainAmt = (g * 0.5 + 0.5 - 0.5) * (uGrain * 0.18);
    gl_FragColor.rgb = clamp(gl_FragColor.rgb + grainAmt, 0.0, 1.0);
  }
}
`;

// Simple function component - no forwardRef needed for R3F child components
export function CustomMeshGradient({ config }: CustomMeshGradientProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const hasColor4 = config.color4 !== null;
  
  // Create uniforms once (avoid allocations every render)
  const uniforms = useMemo(() => ({
    uColor0: { value: new THREE.Color(config.color0) },
    uColor1: { value: new THREE.Color(config.color1) },
    uColor2: { value: new THREE.Color(config.color2) },
    uColor3: { value: new THREE.Color(config.color3) },
    uColor4: { value: new THREE.Color(config.color4 || '#000000') },
    uWeight0: { value: config.colorWeight0 },
    uWeight1: { value: config.colorWeight1 },
    uWeight2: { value: config.colorWeight2 },
    uWeight3: { value: config.colorWeight3 },
    uWeight4: { value: config.colorWeight4 ?? 0 },
    uHasColor4: { value: config.color4 !== null },
    uTime: { value: 0 },
    uNoiseScale: { value: config.meshNoiseScale ?? 0.5 },
    uBlur: { value: (config.meshBlur ?? 80) / 100 },
    uStrength: { value: config.uStrength },
    uDensity: { value: config.uDensity },
    uFrequency: { value: config.uFrequency },
    uGrain: { value: config.grain ? (config.grainIntensity ?? 50) / 100 : 0 },
    uMeshStyle: { value: config.meshStyle === 'flow' ? 1 : config.meshStyle === 'center' ? 2 : 0 },
    uMeshFlowAngle: { value: (config.meshFlowAngle ?? 45) * Math.PI / 180 },
    uMeshCenterInward: { value: config.meshCenterInward ?? true },
    // Aurora enhancements
    uStretchX: { value: config.meshStretchX ?? 1.8 },
    uStretchY: { value: config.meshStretchY ?? 0.6 },
    uWarpAmount: { value: (config.meshWarpAmount ?? 30) / 100 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  
  // Update uniforms every frame - read config values directly to stay reactive
  useFrame((state) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    mat.uniforms.uColor0.value.set(config.color0);
    mat.uniforms.uColor1.value.set(config.color1);
    mat.uniforms.uColor2.value.set(config.color2);
    mat.uniforms.uColor3.value.set(config.color3);
    if (config.color4) {
      mat.uniforms.uColor4.value.set(config.color4);
    }
    mat.uniforms.uWeight0.value = config.colorWeight0;
    mat.uniforms.uWeight1.value = config.colorWeight1;
    mat.uniforms.uWeight2.value = config.colorWeight2;
    mat.uniforms.uWeight3.value = config.colorWeight3;
    mat.uniforms.uWeight4.value = config.colorWeight4 ?? 0;
    mat.uniforms.uHasColor4.value = config.color4 !== null;
    mat.uniforms.uNoiseScale.value = config.meshNoiseScale ?? 0.5;
    mat.uniforms.uBlur.value = (config.meshBlur ?? 80) / 100;
    mat.uniforms.uStrength.value = config.uStrength;
    mat.uniforms.uDensity.value = config.uDensity;
    mat.uniforms.uFrequency.value = config.uFrequency;
    mat.uniforms.uGrain.value = config.grain ? (config.grainIntensity ?? 50) / 100 : 0;
    
    // Mesh style uniforms
    mat.uniforms.uMeshStyle.value = config.meshStyle === 'flow' ? 1 : config.meshStyle === 'center' ? 2 : 0;
    mat.uniforms.uMeshFlowAngle.value = (config.meshFlowAngle ?? 45) * Math.PI / 180;
    mat.uniforms.uMeshCenterInward.value = config.meshCenterInward ?? true;
    
    // Aurora enhancement uniforms
    mat.uniforms.uStretchX.value = config.meshStretchX ?? 1.8;
    mat.uniforms.uStretchY.value = config.meshStretchY ?? 0.6;
    mat.uniforms.uWarpAmount.value = (config.meshWarpAmount ?? 30) / 100;
    
    // Check animation state directly from config (not from stale closure)
    const isFrozen = config.frozenTime !== null;
    const shouldAnimate = config.animate && !isFrozen;
    
    if (shouldAnimate) {
      // Animate: use elapsed time multiplied by speed
      mat.uniforms.uTime.value = state.clock.elapsedTime * config.speed;
    } else if (isFrozen && config.frozenTime !== null) {
      // Frozen at specific time
      mat.uniforms.uTime.value = config.frozenTime;
    }
    // If not animating and not frozen, time stays at current value (static)
  });
  
  return (
    <mesh>
      <planeGeometry args={[10, 10]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
