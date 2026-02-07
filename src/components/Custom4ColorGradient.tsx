import { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GradientConfig } from '@/types/gradient';

interface Custom4ColorGradientProps {
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

// Fragment shader that supports all gradient types with up to 5 colors (base + 4 optional)
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
uniform int uGradientType; // 0=mesh, 1=sphere, 2=plane, 3=water, 4=conic, 5=glow, 6=waves
uniform float uPlaneAngle; // Plane gradient angle in radians
uniform bool uPlaneRadial; // If true, radial gradient from center
uniform float uPlaneWave; // Wave distortion amount (0-1)
uniform float uPlaneSpread; // Transition sharpness (0-1)
uniform vec2 uPlaneOffset; // Center offset for radial
uniform int uMeshStyle; // 0=organic, 1=flow, 2=center
uniform float uMeshFlowAngle; // radians
uniform bool uMeshCenterInward;
uniform bool uMeshStretch; // Aurora curtain effect
uniform float uMeshStretchAmount; // How much to stretch (1.0 = normal, 3.0+ = curtains)
uniform float uConicStartAngle; // radians
uniform float uConicSpiral; // 0-1
uniform vec2 uConicOffset; // Center offset
// Glow uniforms (Luminous Glow effect)
uniform float uGlowOrbSize;
uniform float uGlowShadowDensity;
uniform int uGlowStyle; // 0=scattered, 1=clustered, 2=diagonal, 3=ring
uniform float uGlowSpread; // 0-1
uniform vec2 uGlowOffset; // Center offset
uniform float uGlowDistortion; // 0-1
// Waves uniforms
uniform float uWavesCount;
uniform float uWavesAmplitude;

varying vec2 vUv;
varying vec3 vPosition;

// Luminance calculation (standard Rec.709 coefficients)
float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

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

 // 8x8 Bayer ordered dithering (returns ~[-0.5, 0.5])
 // Helps eliminate visible banding in 8-bit output without adding “grainy” noise.
 float bayer8x8(vec2 p) {
   // Integer pixel coords
   int x = int(mod(p.x, 8.0));
   int y = int(mod(p.y, 8.0));
   int i = x + y * 8;

   // Precomputed 8x8 Bayer matrix, normalized 0..63
   float m[64];
   m[0]=0.0;  m[1]=48.0; m[2]=12.0; m[3]=60.0; m[4]=3.0;  m[5]=51.0; m[6]=15.0; m[7]=63.0;
   m[8]=32.0; m[9]=16.0; m[10]=44.0; m[11]=28.0; m[12]=35.0; m[13]=19.0; m[14]=47.0; m[15]=31.0;
   m[16]=8.0; m[17]=56.0; m[18]=4.0;  m[19]=52.0; m[20]=11.0; m[21]=59.0; m[22]=7.0;  m[23]=55.0;
   m[24]=40.0; m[25]=24.0; m[26]=36.0; m[27]=20.0; m[28]=43.0; m[29]=27.0; m[30]=39.0; m[31]=23.0;
   m[32]=2.0; m[33]=50.0; m[34]=14.0; m[35]=62.0; m[36]=1.0; m[37]=49.0; m[38]=13.0; m[39]=61.0;
   m[40]=34.0; m[41]=18.0; m[42]=46.0; m[43]=30.0; m[44]=33.0; m[45]=17.0; m[46]=45.0; m[47]=29.0;
   m[48]=10.0; m[49]=58.0; m[50]=6.0;  m[51]=54.0; m[52]=9.0;  m[53]=57.0; m[54]=5.0;  m[55]=53.0;
   m[56]=42.0; m[57]=26.0; m[58]=38.0; m[59]=22.0; m[60]=41.0; m[61]=25.0; m[62]=37.0; m[63]=21.0;

   float v = m[i] / 64.0; // 0..~0.984
   return v - 0.5;
 }

void main() {
  float freq = max(0.1, uFrequency);
  float density = max(0.0, uDensity);
  float strength = max(0.0, uStrength);
  
  vec2 centeredUv = vUv - 0.5;
  
  // Edge fade (vignette) for Mesh mode - SUBTLE fade to prevent harsh canvas edges
  // Keep it minimal so colors reach the edges properly
  float edgeDist = length(centeredUv) * 2.0; // 0 at center, ~1.4 at corners
  float edgeFade = 1.0 - smoothstep(0.85, 1.25, edgeDist); // Only fade at very edges
  
  float noise;
  
  if (uGradientType == 0) {
    // Mesh mode computes final color directly in the second pass below
    noise = 0.5;
    
  } else if (uGradientType == 1) {
    // SPHERE MODE: Classic 3D sphere with smooth color blending
    float dist = length(centeredUv);
    float sphereDist = dist * 1.8;
    
    // Smooth 3D-like lighting
    vec3 noisePos = vec3(vUv * 2.0 * freq, uTime * 0.2);
    float n1 = snoise(noisePos) * 0.5 + 0.5;
    float n2 = snoise(noisePos * 1.5 + 50.0) * 0.3;
    
    // Create sphere gradient from center outward with smooth falloff
    float sphereGrad = smoothstep(0.0, 1.0, sphereDist);
    
    // Add organic movement
    float organic = (n1 + n2) * 0.25 * density;
    
    // Combine for rich sphere effect
    noise = sphereGrad * 0.7 + organic + 0.15;
    noise = clamp(noise, 0.0, 1.0);
    
  } else if (uGradientType == 2) {
    // PLANE MODE: Linear or radial gradient with custom angle, wave, spread, offset
    // IMPORTANT: Ensure noise covers full 0.0 to 1.0 range to respect color weights (especially 30% black)
    float baseNoise;
    
    // Apply offset to center (only when radial)
    vec2 offsetCenter = centeredUv;
    if (uPlaneRadial) {
      // Add subtle time-based drift so Plane animates even when PlaneWave=0
      // (keeps monotonic mapping; does not change weight thresholds)
      vec2 drift = vec2(sin(uTime * 0.22), cos(uTime * 0.18)) * 0.02;
      offsetCenter = centeredUv - uPlaneOffset + drift;
    }
    
    if (uPlaneRadial) {
      // Radial gradient from offset center outward - start from 0 at center
      baseNoise = length(offsetCenter) * 2.0; // Increased from 1.4 to ensure full range
    } else {
      // Linear gradient with custom angle - ensure full 0 to 1 range
      vec2 direction = vec2(cos(uPlaneAngle), sin(uPlaneAngle));
      float dotProduct = dot(centeredUv, direction);
      // Calculate max possible dot product for normalization
      float maxDot = abs(direction.x) * 0.5 + abs(direction.y) * 0.5;
      // Normalize to full 0-1 range
      baseNoise = (dotProduct / maxDot) * 0.5 + 0.5;

      // Add subtle time-based drift so Plane animates even when PlaneWave=0
      // Drift is kept small to avoid clipping the 0..1 range and preserving 30% base region.
      baseNoise += sin(uTime * 0.20) * 0.025;
    }
    
    // Add wave distortion (only when enabled)
    if (uPlaneWave > 0.01) {
      vec3 wavePos = vec3(vUv * 3.0, uTime * 0.3);
      float waveNoise = snoise(wavePos) * uPlaneWave * 0.25;
      baseNoise += waveNoise;
    }
    
    // Ensure we have actual 0.0 values for color0 (black) - clamp before spread
    baseNoise = clamp(baseNoise, 0.0, 1.0);
    
    // NOTE: Do NOT warp baseNoise with pow() in Plane.
    // Plane baseNoise is already monotonic/linear; warping breaks weight-to-area mapping.
    // Spread is applied later by adjusting transition blur width during color mixing.
    
    // NOTE: Plane mode must keep a monotonic 0..1 mapping so weight-to-area is accurate.
    // Any additive noise here will shrink/expand the solid base segment (e.g., the first 30%).
    noise = baseNoise;
    noise = clamp(noise, 0.0, 1.0);
    
    // IMPORTANT: Do NOT apply histogram equalization in Plane.
    // Plane noise is already uniform; equalization distorts area mapping.
    
  } else if (uGradientType == 4) {
    // CONIC MODE: Angular gradient with optional spiral
    vec2 offsetCenter = centeredUv - uConicOffset;
    float angle = atan(offsetCenter.y, offsetCenter.x);
    
    // Normalize angle from [-PI, PI] to [0, 1]
    float normalized = (angle + 3.14159265) / 6.28318530;
    
    // Apply start angle offset
    normalized = fract(normalized + uConicStartAngle / 6.28318530);
    
    // Add spiral effect based on distance from center
    if (uConicSpiral > 0.01) {
      float dist = length(offsetCenter) * 2.0;
      normalized = fract(normalized + dist * uConicSpiral);
    }
    
    // Add subtle noise for organic feel
    vec3 noisePos = vec3(vUv * 2.0 * freq, uTime * 0.2);
    float organicNoise = snoise(noisePos) * 0.05 * density;
    
    noise = normalized + organicNoise;
    noise = clamp(noise, 0.0, 1.0);
    
  } else if (uGradientType == 5) {
    // LUMINOUS GLOW MODE: Additive light simulation
    // This mode computes finalColor directly below (like mesh mode).
    // Set noise placeholder; actual color is computed in the glow blend block.
    noise = 0.5;
    
  } else if (uGradientType == 6) {
    // WAVES MODE: Horizontal/vertical waves like ocean with direction support
    float waveFreq = uWavesCount;
    float amplitude = uWavesAmplitude;
    
    // Use planeAngle for wave direction (0=horizontal waves moving right, 90=vertical waves moving down)
    vec2 waveDir = vec2(cos(uPlaneAngle), sin(uPlaneAngle));
    vec2 perpDir = vec2(-waveDir.y, waveDir.x);
    
    // Project UV onto wave direction
    float alongWave = dot(vUv - 0.5, waveDir) + 0.5;
    float acrossWave = dot(vUv - 0.5, perpDir);
    
    // Create layered waves along the perpendicular direction
    float wave1 = sin(acrossWave * waveFreq * 6.28318 + uTime * 0.5) * amplitude;
    float wave2 = sin(acrossWave * waveFreq * 2.0 * 6.28318 + uTime * 0.3 + 1.0) * amplitude * 0.5;
    float wave3 = sin(acrossWave * waveFreq * 0.5 * 6.28318 + uTime * 0.2 + 2.0) * amplitude * 0.3;
    
    // Offset position by waves
    float wavyPos = alongWave + (wave1 + wave2 + wave3) * 0.15;
    
    // Base gradient on wavy position
    float baseNoise = clamp(wavyPos, 0.0, 1.0);
    
    // Add flowing noise
    vec3 noisePos = vec3(vUv * 2.0 * freq, uTime * 0.2);
    float organicNoise = snoise(noisePos) * 0.1 * density;
    
    noise = baseNoise + organicNoise;
    noise = clamp(noise, 0.0, 1.0);
    
  } else {
    // WATER MODE: Smooth flowing liquid effect with proper color weight support
    vec3 noisePos = vec3(vUv * 1.5 * freq, uTime * 0.15);
    
    // Smooth flowing noise layers - covering full 0-1 range for proper weight distribution
    float n1 = snoise(noisePos) * 0.5 + 0.5;
    float n2 = snoise(noisePos * 0.7 + 30.0) * 0.25;
    float n3 = snoise(noisePos * 0.5 + 60.0) * 0.15;
    
    // Gentle wave motion
    float wave = sin(vUv.x * 4.0 + vUv.y * 3.0 + uTime * 0.3) * 0.08;
    
    // Blend noise layers for smooth liquid look - ensure full range coverage
    float baseNoise = n1 + n2 + n3 + wave * density;
    
    // Normalize to 0-1 range to properly respect color weights
    noise = clamp(baseNoise, 0.0, 1.0);
  }
  
  // NOTE: Strength should not distort the noise distribution BEFORE weight thresholds,
  // otherwise color weights stop matching perceived area (e.g. high weights barely visible).
  // We apply strength later to the blend factors to sharpen transitions without shifting ranges.
  
  // Apply blur (softness)
  float blurFactor = uBlur * 0.5;
  
  // Calculate cumulative thresholds for colors (4 or 5 depending on uHasColor4)
  float w0 = uWeight0 / 100.0;
  float w1 = uWeight1 / 100.0;
  float w2 = uWeight2 / 100.0;
  float w3 = uWeight3 / 100.0;
  float w4 = uWeight4 / 100.0;
  
  // Color0 occupies [0, w0] of noise range (true 30%-100% segment)
  float threshold0 = w0;
  float threshold1 = w0 + w1;
  float threshold2 = w0 + w1 + w2;
  float threshold3 = w0 + w1 + w2 + w3;
  
  vec3 finalColor;
  
  if (uGradientType == 0) {
    // =========================================================================
    // MESH MODE: Radial Glow Model
    // =========================================================================
    // Each color is a positioned Gaussian light source glowing against darkness.
    // Inspired by Darkmiles/Apple-style dark gradients:
    //   - Colors are concentrated glowing orbs at specific positions
    //   - Noise distortion gives organic, non-circular blob shapes
    //   - Black is the natural background (absence of light)
    //   - Normalized blend ensures no over-brightening
    
    // Convert from Linear (THREE.Color auto-converts sRGB->Linear) back to sRGB
    // so that blending happens in perceptual sRGB space and colors match their hex values.
    vec3 sColor0 = linearToSrgb(uColor0);
    vec3 sColor1 = linearToSrgb(uColor1);
    vec3 sColor2 = linearToSrgb(uColor2);
    vec3 sColor3 = linearToSrgb(uColor3);
    vec3 sColor4 = linearToSrgb(uColor4);
    
    float t = uTime * 0.15;
    vec2 sampleUv = vUv;
    
    // Aurora stretch: vertical curtain effect
    if (uMeshStretch) {
      sampleUv.y = (sampleUv.y - 0.5) / uMeshStretchAmount + 0.5;
      sampleUv.x += sin(sampleUv.y * 4.0 + t) * 0.08;
    }
    
    float noiseScale = max(0.5, uNoiseScale) * 0.8;
    
    // ---------------------------------------------------------------
    // GAUSSIAN RADIAL GLOW
    // Each color is a positioned light source with Gaussian falloff.
    // Noise distortion on the distance field creates organic shapes.
    // The base color (black) fills all gaps naturally.
    // ---------------------------------------------------------------
    
    // Softness: controls Gaussian spread (blur slider)
    float softness = mix(0.18, 0.65, uBlur);
    
    // Animated center positions for each color source
    vec2 c1, c2, c3, c4;
    
    if (uMeshStyle == 1) {
      // Flow: colors aligned along flow angle
      vec2 flowDir = vec2(cos(uMeshFlowAngle), sin(uMeshFlowAngle));
      vec2 perpDir = vec2(-flowDir.y, flowDir.x);
      c1 = vec2(0.5) + flowDir * 0.28 + perpDir * 0.08 * sin(t * 0.7);
      c2 = vec2(0.5) - flowDir * 0.28 + perpDir * 0.08 * cos(t * 0.6);
      c3 = vec2(0.5) + perpDir * 0.22 + flowDir * 0.06 * sin(t * 0.5);
      c4 = vec2(0.5) - perpDir * 0.22 + flowDir * 0.06 * cos(t * 0.4);
    } else if (uMeshStyle == 2) {
      if (uMeshCenterInward) {
        // Colors cluster toward center
        c1 = vec2(0.5 + sin(t * 0.5) * 0.14, 0.5 + cos(t * 0.7) * 0.14);
        c2 = vec2(0.5 + cos(t * 0.6) * 0.16, 0.5 + sin(t * 0.4) * 0.16);
        c3 = vec2(0.5 + sin(t * 0.8) * 0.12, 0.5 + cos(t * 0.5) * 0.12);
        c4 = vec2(0.5 + cos(t * 0.3) * 0.15, 0.5 + sin(t * 0.9) * 0.15);
      } else {
        // Colors at corners
        c1 = vec2(0.2 + sin(t * 0.5) * 0.06, 0.2 + cos(t * 0.7) * 0.06);
        c2 = vec2(0.8 + cos(t * 0.6) * 0.06, 0.2 + sin(t * 0.4) * 0.06);
        c3 = vec2(0.8 + sin(t * 0.8) * 0.06, 0.8 + cos(t * 0.5) * 0.06);
        c4 = vec2(0.2 + cos(t * 0.3) * 0.06, 0.8 + sin(t * 0.9) * 0.06);
      }
    } else {
      // Organic: well-spread positions with gentle animation
      c1 = vec2(
        0.25 + sin(t * 0.7) * 0.1,
        0.72 + cos(t * 0.5) * 0.08
      );
      c2 = vec2(
        0.78 + cos(t * 0.6) * 0.1,
        0.3  + sin(t * 0.8) * 0.08
      );
      c3 = vec2(
        0.45 + sin(t * 0.4) * 0.12,
        0.18 + cos(t * 0.9) * 0.08
      );
      c4 = vec2(
        0.28 + cos(t * 0.5) * 0.08,
        0.48 + sin(t * 0.7) * 0.1
      );
    }
    
    // Noise distortion: makes blobs organic (not perfect circles)
    float distortScale = 3.0 * noiseScale;
    float distort1 = snoise(vec3(sampleUv * distortScale,           t * 0.3))          * 0.12;
    float distort2 = snoise(vec3(sampleUv * distortScale + 50.0,    t * 0.25))         * 0.12;
    float distort3 = snoise(vec3(sampleUv * distortScale + 100.0,   t * 0.2))          * 0.12;
    float distort4 = snoise(vec3(sampleUv * distortScale + 150.0,   t * 0.35))         * 0.12;
    
    // Noise-distorted distances from each color center
    float d1 = length(sampleUv - c1) + distort1;
    float d2 = length(sampleUv - c2) + distort2;
    float d3 = length(sampleUv - c3) + distort3;
    float d4 = length(sampleUv - c4) + distort4;
    
    // Gaussian radii: proportional to weight and softness
    float r1 = softness * (0.3 + w1 * 0.4);
    float r2 = softness * (0.3 + w2 * 0.4);
    float r3 = softness * (0.3 + w3 * 0.4);
    float r4 = softness * (0.3 + w4 * 0.4);
    
    // Gaussian falloff: exp(-d²/r²), boosted so colors are vivid at centers
    // Soft weight floor: colors stay at least 50% bright even at low weight,
    // preventing blow-out when all orbs stack while keeping balance.
    float glowBoost = 4.0 + uStrength * 1.5;
    float wFactor1 = mix(0.5, 1.0, clamp(w1 * 3.0, 0.0, 1.0));
    float wFactor2 = mix(0.5, 1.0, clamp(w2 * 3.0, 0.0, 1.0));
    float wFactor3 = mix(0.5, 1.0, clamp(w3 * 3.0, 0.0, 1.0));
    float wFactor4 = mix(0.5, 1.0, clamp(w4 * 3.0, 0.0, 1.0));
    float g1 = exp(-d1 * d1 / (r1 * r1)) * glowBoost * wFactor1;
    float g2 = exp(-d2 * d2 / (r2 * r2)) * glowBoost * wFactor2;
    float g3 = exp(-d3 * d3 / (r3 * r3)) * glowBoost * wFactor3;
    float g4 = uHasColor4 ? exp(-d4 * d4 / (r4 * r4)) * glowBoost * wFactor4 : 0.0;
    
    // Black's constant baseline - fills all gaps between color blobs
    // Boosted slightly so darkness dominates where no light reaches
    float darkBase = w0 * 1.8;
    
    // Normalize: all contributions sum to 1.0
    float total = darkBase + g1 + g2 + g3 + g4;
    float a0 = darkBase / total;
    float a1 = g1 / total;
    float a2 = g2 / total;
    float a3 = g3 / total;
    float a4 = g4 / total;
    
    // Weighted color blend in sRGB space (order-independent)
    finalColor = sColor0 * a0 + sColor1 * a1 + sColor2 * a2 + sColor3 * a3;
    if (uHasColor4) {
      finalColor += sColor4 * a4;
    }
    
    // Subtle edge fade
    finalColor = mix(sColor0, finalColor, edgeFade);
    
  } else if (uGradientType == 5) {
    // =========================================================================
    // LUMINOUS GLOW MODE: Additive Light Simulation
    // =========================================================================
    // Simulates colored light sources on a dark background.
    // Concept: Start in darkness, "turn on" colored lights that glow and overlap.
    // Shadow clouds (noise mask) add depth and contrast.
    
    // Convert to sRGB for perceptual accuracy (same as mesh mode)
    vec3 sColor0 = linearToSrgb(uColor0);
    vec3 sColor1 = linearToSrgb(uColor1);
    vec3 sColor2 = linearToSrgb(uColor2);
    vec3 sColor3 = linearToSrgb(uColor3);
    vec3 sColor4 = linearToSrgb(uColor4);
    
    float t = uTime * 0.12;
    vec2 st = vUv;
    
    // Apply global offset to shift entire glow arrangement
    st -= uGlowOffset;
    
    // Orb size from user control (mapped to Gaussian spread)
    float orbSize = mix(0.15, 0.55, uGlowOrbSize);
    
    // Spread factor: controls how far from center the orbs are positioned
    float spread = mix(0.08, 0.35, uGlowSpread);
    
    // Calculate orb positions based on style
    vec2 p1, p2, p3, p4;
    
    if (uGlowStyle == 0) {
      // SCATTERED: Orbs spread organically around canvas
      p1 = vec2(
        0.3 + sin(t * 0.7) * 0.12 * spread / 0.2,
        0.7 + cos(t * 0.5) * 0.1 * spread / 0.2
      );
      p2 = vec2(
        0.75 + cos(t * 0.6) * 0.1 * spread / 0.2,
        0.3 + sin(t * 0.8) * 0.12 * spread / 0.2
      );
      p3 = vec2(
        0.5 + sin(t * 0.4) * 0.15 * spread / 0.2,
        0.25 + cos(t * 0.9) * 0.1 * spread / 0.2
      );
      p4 = vec2(
        0.2 + cos(t * 0.5) * 0.1 * spread / 0.2,
        0.45 + sin(t * 0.7) * 0.12 * spread / 0.2
      );
    } else if (uGlowStyle == 1) {
      // CLUSTERED: Orbs grouped near center, tight formation
      float clusterSpread = spread * 0.6;
      p1 = vec2(0.5 + sin(t * 0.7) * clusterSpread, 0.5 + cos(t * 0.5) * clusterSpread);
      p2 = vec2(0.5 + cos(t * 0.6) * clusterSpread, 0.5 + sin(t * 0.8) * clusterSpread);
      p3 = vec2(0.5 + sin(t * 0.4 + 2.0) * clusterSpread, 0.5 + cos(t * 0.9 + 1.0) * clusterSpread);
      p4 = vec2(0.5 + cos(t * 0.5 + 3.0) * clusterSpread, 0.5 + sin(t * 0.7 + 2.0) * clusterSpread);
    } else if (uGlowStyle == 2) {
      // DIAGONAL: Orbs aligned along a diagonal line
      vec2 diagDir = normalize(vec2(1.0, -1.0));
      vec2 perpDir = vec2(diagDir.y, -diagDir.x);
      float wobble = sin(t * 0.3) * 0.04;
      p1 = vec2(0.5) + diagDir * spread * -1.2 + perpDir * wobble;
      p2 = vec2(0.5) + diagDir * spread * -0.4 + perpDir * sin(t * 0.5) * 0.05;
      p3 = vec2(0.5) + diagDir * spread * 0.4 + perpDir * cos(t * 0.4) * 0.05;
      p4 = vec2(0.5) + diagDir * spread * 1.2 + perpDir * -wobble;
    } else {
      // RING: Orbs arranged in a circle around center
      float ringRadius = spread * 0.9;
      float angleOffset = t * 0.2;
      p1 = vec2(0.5) + vec2(cos(angleOffset), sin(angleOffset)) * ringRadius;
      p2 = vec2(0.5) + vec2(cos(angleOffset + 1.5708), sin(angleOffset + 1.5708)) * ringRadius;
      p3 = vec2(0.5) + vec2(cos(angleOffset + 3.1416), sin(angleOffset + 3.1416)) * ringRadius;
      p4 = vec2(0.5) + vec2(cos(angleOffset + 4.7124), sin(angleOffset + 4.7124)) * ringRadius;
    }
    
    // Organic distortion on orb shapes (noise-based wobble on distances)
    float distortAmount = uGlowDistortion * 0.2;
    float dist1Noise = snoise(vec3(st * 3.0, t * 0.3)) * distortAmount;
    float dist2Noise = snoise(vec3(st * 3.0 + 50.0, t * 0.25)) * distortAmount;
    float dist3Noise = snoise(vec3(st * 3.0 + 100.0, t * 0.2)) * distortAmount;
    float dist4Noise = snoise(vec3(st * 3.0 + 150.0, t * 0.35)) * distortAmount;
    
    // Gaussian glow with distortion
    float d1 = length(st - p1) + dist1Noise;
    float orb1 = exp(-d1 * d1 / (orbSize * orbSize * (0.4 + w1 * 0.6)));
    
    float d2 = length(st - p2) + dist2Noise;
    float orb2 = exp(-d2 * d2 / (orbSize * orbSize * (0.4 + w2 * 0.6)));
    
    float d3 = length(st - p3) + dist3Noise;
    float orb3 = exp(-d3 * d3 / (orbSize * orbSize * (0.4 + w3 * 0.6)));
    
    float orb4 = 0.0;
    if (uHasColor4) {
      float d4 = length(st - p4) + dist4Noise;
      orb4 = exp(-d4 * d4 / (orbSize * orbSize * (0.4 + w4 * 0.6)));
    }
    
    // Weight modulates orb intensity: full weight = full glow, low weight = dimmer orb.
    float glowIntensity = 3.0 + uStrength;
    orb1 *= w1 * glowIntensity;
    orb2 *= w2 * glowIntensity;
    orb3 *= w3 * glowIntensity;
    orb4 *= w4 * glowIntensity;
    
    // Start from background color (typically black)
    finalColor = sColor0;
    
    // ADDITIVE blending: light sources add on top of darkness
    finalColor += sColor1 * orb1;
    finalColor += sColor2 * orb2;
    finalColor += sColor3 * orb3;
    if (uHasColor4) {
      finalColor += sColor4 * orb4;
    }
    
    // Contrast boost via pow() — pushes darks deeper, keeps brights vivid
    float contrastExp = 1.0 + uGlowShadowDensity * 1.5;
    finalColor = pow(clamp(finalColor, 0.0, 1.0), vec3(contrastExp));
    
    // Subtle noise-based variation to break uniformity
    float noiseVar = snoise(vec3(st * 1.2, t * 0.15)) * 0.08 * uGlowShadowDensity;
    finalColor *= (1.0 + noiseVar);
    
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    // Edge vignette
    finalColor = mix(sColor0, finalColor, edgeFade);
    
  } else if (uGradientType == 2) {
    // =========================================================================
    // PLANE MODE: Weighted Segments with Proper Color Distribution
    // =========================================================================
    float spreadMult = mix(0.008, 0.12, uPlaneSpread);
    float transitionWidth = spreadMult + blurFactor * 0.14;
    
    float blend01 = smoothstep(threshold0, threshold0 + transitionWidth * 2.0, noise);
    float blend12 = smoothstep(threshold1 - transitionWidth, threshold1 + transitionWidth, noise);
    float blend23 = smoothstep(threshold2 - transitionWidth, threshold2 + transitionWidth, noise);
    float blend34 = smoothstep(threshold3 - transitionWidth, threshold3 + transitionWidth, noise);
    
    finalColor = uColor0;
    finalColor = mix(finalColor, uColor1, blend01);
    finalColor = mix(finalColor, uColor2, blend12);
    finalColor = mix(finalColor, uColor3, blend23);
    if (uHasColor4) {
      finalColor = mix(finalColor, uColor4, blend34);
    }
    
  } else {
    // =========================================================================
    // OTHER MODES (Water, Conic, Waves): Smooth Threshold Blending
    // =========================================================================
    // Convert to sRGB for perceptual accuracy (same fix as Mesh/Glow)
    vec3 sColor0 = linearToSrgb(uColor0);
    vec3 sColor1 = linearToSrgb(uColor1);
    vec3 sColor2 = linearToSrgb(uColor2);
    vec3 sColor3 = linearToSrgb(uColor3);
    vec3 sColor4 = linearToSrgb(uColor4);
    
    float baseTrans = 0.10;
    float transitionWidth = baseTrans + blurFactor * 0.20;
    float strengthMod = 1.0 + strength * 0.15;
    transitionWidth = transitionWidth / strengthMod;
    transitionWidth = max(transitionWidth, 0.06);
    
    
    float blend01 = smoothstep(threshold0, threshold0 + transitionWidth * 1.5, noise);
    float blend12 = smoothstep(threshold1 - transitionWidth * 0.5, threshold1 + transitionWidth, noise);
    float blend23 = smoothstep(threshold2 - transitionWidth * 0.5, threshold2 + transitionWidth, noise);
    float blend34 = smoothstep(threshold3 - transitionWidth * 0.5, threshold3 + transitionWidth, noise);
    
    finalColor = sColor0;
    finalColor = mix(finalColor, sColor1, blend01);
    finalColor = mix(finalColor, sColor2, blend12);
    finalColor = mix(finalColor, sColor3, blend23);
    if (uHasColor4) {
      finalColor = mix(finalColor, sColor4, blend34);
    }
  }
  
  // Color space:
  // Mesh, Glow, and threshold modes (Water/Conic/Waves) all blend in sRGB.
  // Only Plane mode (type 2) still blends in linear and needs conversion.
  if (uGradientType == 2) {
    finalColor = linearToSrgb(finalColor);
  }

  // Subtle ordered dithering to reduce banding on static gradients
  // (Amplitude ~ < 1 LSB in 8-bit sRGB)
  float d = bayer8x8(gl_FragCoord.xy);
  finalColor = clamp(finalColor + d * (0.75 / 255.0), 0.0, 1.0);
  
  gl_FragColor = vec4(finalColor, 1.0);

  // Film grain - apply in sRGB space
  if (uGrain > 0.0) {
    float g = snoise(vec3(vUv * 220.0, uTime * 0.7));
    float grainAmt = (g * 0.5 + 0.5 - 0.5) * (uGrain * 0.18);
    gl_FragColor.rgb = clamp(gl_FragColor.rgb + grainAmt, 0.0, 1.0);
  }
}
`;

// Map gradient type to shader int
const typeToInt: Record<string, number> = {
  'mesh': 0,
  'sphere': 1,
  'plane': 2,
  'waterPlane': 3,
  'conic': 4,
  'glow': 5,
  'waves': 6,
};

export const Custom4ColorGradient = forwardRef<THREE.Mesh, Custom4ColorGradientProps>(
  function Custom4ColorGradient({ config }, forwardedRef) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Determine the gradient type (mesh uses wireframe flag)
  const gradientType = config.wireframe ? 'mesh' : config.type;
  
  const hasColor4 = config.color4 !== null;
  
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
    uNoiseScale: { value: config.meshNoiseScale ?? 1.0 },
    uBlur: { value: (config.meshBlur ?? 50) / 100 },
    uStrength: { value: config.uStrength },
    uDensity: { value: config.uDensity },
    uFrequency: { value: config.uFrequency },
    uGrain: { value: config.grain ? (config.grainIntensity ?? 50) / 100 : 0 },
    uGradientType: { value: typeToInt[gradientType] ?? 0 },
    uPlaneAngle: { value: (config.planeAngle ?? 45) * Math.PI / 180 },
    uPlaneRadial: { value: config.planeRadial ?? false },
    uPlaneWave: { value: (config.planeWave ?? 0) / 100 },
    uPlaneSpread: { value: (config.planeSpread ?? 50) / 100 },
    uPlaneOffset: { value: new THREE.Vector2((config.planeOffsetX ?? 0) / 100, (config.planeOffsetY ?? 0) / 100) },
    uMeshStyle: { value: config.meshStyle === 'flow' ? 1 : config.meshStyle === 'center' ? 2 : 0 },
    uMeshFlowAngle: { value: (config.meshFlowAngle ?? 45) * Math.PI / 180 },
    uMeshCenterInward: { value: config.meshCenterInward ?? true },
    uMeshStretch: { value: config.meshStretch ?? false },
    uMeshStretchAmount: { value: config.meshStretch ? 3.0 : 1.0 },
    // Conic uniforms
    uConicStartAngle: { value: (config.conicStartAngle ?? 0) * Math.PI / 180 },
    uConicSpiral: { value: (config.conicSpiral ?? 0) / 100 },
    uConicOffset: { value: new THREE.Vector2((config.conicOffsetX ?? 0) / 100, (config.conicOffsetY ?? 0) / 100) },
    // Glow uniforms
    uGlowOrbSize: { value: (config.glowOrbSize ?? 60) / 100 },
    uGlowShadowDensity: { value: (config.glowShadowDensity ?? 50) / 100 },
    uGlowStyle: { value: config.glowStyle === 'clustered' ? 1 : config.glowStyle === 'diagonal' ? 2 : config.glowStyle === 'ring' ? 3 : 0 },
    uGlowSpread: { value: (config.glowSpread ?? 50) / 100 },
    uGlowOffset: { value: new THREE.Vector2((config.glowOffsetX ?? 0) / 100, -(config.glowOffsetY ?? 0) / 100) },
    uGlowDistortion: { value: (config.glowDistortion ?? 40) / 100 },
    // Waves uniforms
    uWavesCount: { value: config.wavesCount ?? 5 },
    uWavesAmplitude: { value: (config.wavesAmplitude ?? 50) / 100 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  
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
    mat.uniforms.uNoiseScale.value = config.meshNoiseScale ?? 1.0;
    mat.uniforms.uBlur.value = (config.meshBlur ?? 50) / 100;
    mat.uniforms.uStrength.value = config.uStrength;
    mat.uniforms.uDensity.value = config.uDensity;
    mat.uniforms.uFrequency.value = config.uFrequency;
    mat.uniforms.uGrain.value = config.grain ? (config.grainIntensity ?? 50) / 100 : 0;
    
    // Update gradient type
    const currentType = config.wireframe ? 'mesh' : config.type;
    mat.uniforms.uGradientType.value = typeToInt[currentType] ?? 0;
    
    // Update plane direction uniforms
    // For waves mode, use wavesAngle instead of planeAngle
    if (currentType === 'waves') {
      mat.uniforms.uPlaneAngle.value = (config.wavesAngle ?? 0) * Math.PI / 180;
    } else {
      mat.uniforms.uPlaneAngle.value = (config.planeAngle ?? 45) * Math.PI / 180;
    }
    mat.uniforms.uPlaneRadial.value = config.planeRadial ?? false;
    mat.uniforms.uPlaneWave.value = (config.planeWave ?? 0) / 100;
    mat.uniforms.uPlaneSpread.value = (config.planeSpread ?? 50) / 100;
    mat.uniforms.uPlaneOffset.value.set((config.planeOffsetX ?? 0) / 100, (config.planeOffsetY ?? 0) / 100);
    
    // Update mesh style uniforms
    mat.uniforms.uMeshStyle.value = config.meshStyle === 'flow' ? 1 : config.meshStyle === 'center' ? 2 : 0;
    mat.uniforms.uMeshFlowAngle.value = (config.meshFlowAngle ?? 45) * Math.PI / 180;
    mat.uniforms.uMeshCenterInward.value = config.meshCenterInward ?? true;
    mat.uniforms.uMeshStretch.value = config.meshStretch ?? false;
    mat.uniforms.uMeshStretchAmount.value = config.meshStretch ? 3.0 : 1.0;
    
    // Update conic uniforms
    mat.uniforms.uConicStartAngle.value = (config.conicStartAngle ?? 0) * Math.PI / 180;
    mat.uniforms.uConicSpiral.value = (config.conicSpiral ?? 0) / 100;
    mat.uniforms.uConicOffset.value.set((config.conicOffsetX ?? 0) / 100, (config.conicOffsetY ?? 0) / 100);
    
    // Update glow uniforms
    mat.uniforms.uGlowOrbSize.value = (config.glowOrbSize ?? 60) / 100;
    mat.uniforms.uGlowShadowDensity.value = (config.glowShadowDensity ?? 50) / 100;
    mat.uniforms.uGlowStyle.value = config.glowStyle === 'clustered' ? 1 : config.glowStyle === 'diagonal' ? 2 : config.glowStyle === 'ring' ? 3 : 0;
    mat.uniforms.uGlowSpread.value = (config.glowSpread ?? 50) / 100;
    mat.uniforms.uGlowOffset.value.set((config.glowOffsetX ?? 0) / 100, -(config.glowOffsetY ?? 0) / 100);
    mat.uniforms.uGlowDistortion.value = (config.glowDistortion ?? 40) / 100;
    
    // Update waves uniforms
    mat.uniforms.uWavesCount.value = config.wavesCount ?? 5;
    mat.uniforms.uWavesAmplitude.value = (config.wavesAmplitude ?? 50) / 100;
    
    const isFrozen = config.frozenTime !== null;
    const shouldAnimate = config.animate && !isFrozen;
    
    if (shouldAnimate) {
      mat.uniforms.uTime.value = state.clock.elapsedTime * config.speed;
    } else if (isFrozen && config.frozenTime !== null) {
      mat.uniforms.uTime.value = config.frozenTime;
    }
  });
  
  return (
    <mesh ref={forwardedRef}>
      <planeGeometry args={[10, 10]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
});
