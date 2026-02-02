import { useMemo, useRef } from 'react';
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
uniform int uGradientType; // 0=mesh, 1=sphere, 2=plane, 3=water, 4=conic, 5=spiral, 6=waves
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
// Spiral uniforms
uniform float uSpiralTightness;
uniform bool uSpiralDirection;
// Waves uniforms
uniform float uWavesCount;
uniform float uWavesAmplitude;

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
  
  // No edge fade - fill the entire canvas for consistent exports
  float edgeFade = 1.0;
  
  float noise;
  
  if (uGradientType == 0) {
    // =========================================================================
    // MESH MODE: Radial Light Sources (Soft Light Blobs / Atmospheric Lighting)
    // =========================================================================
    // Color0 (base/black) is guaranteed minimum 30% of the screen area.
    // Colors 1-4 act as "light sources" with exponential falloff, overlaid onto base.
    
    // Get base weight (minimum 30%) - this determines how much area stays pure base color
    float baseWeight = uWeight0 / 100.0; // e.g., 0.30 for 30%
    
    // Softness factor: higher blur = more spread/softer lights
    // At blur=0%, lights should still be visible but smaller
    float minSpread = 0.4;  // Minimum spread so lights are always visible
    float maxSpread = 2.5;  // Maximum spread at 100% blur
    float softness = minSpread + uBlur * (maxSpread - minSpread);
    
    // Scale affects blob size (inverse relationship for intuitive control)
    // Low scale = larger blobs, high scale = smaller blobs
    float sizeMultiplier = 1.0 / max(0.3, uNoiseScale);
    float spread = softness * sizeMultiplier;
    
    // Animated light positions - continuous smooth movement
    float t = uTime * 0.5; // Animation speed
    
    // Base positions for 4 light sources (distributed across canvas)
    vec2 basePos1, basePos2, basePos3, basePos4;
    
    // Apply mesh style to positions
    if (uMeshStyle == 1) {
      // FLOW: Lights arranged along a direction
      vec2 flowDir = vec2(cos(uMeshFlowAngle), sin(uMeshFlowAngle));
      vec2 perpDir = vec2(-flowDir.y, flowDir.x);
      basePos1 = vec2(0.5, 0.5) + flowDir * 0.35 + perpDir * 0.2;
      basePos2 = vec2(0.5, 0.5) + flowDir * 0.05 - perpDir * 0.25;
      basePos3 = vec2(0.5, 0.5) - flowDir * 0.25 + perpDir * 0.15;
      basePos4 = vec2(0.5, 0.5) - flowDir * 0.4 - perpDir * 0.1;
    } else if (uMeshStyle == 2) {
      // CENTER: Lights clustered toward center with good base color visibility
      float centerBias = uMeshCenterInward ? 0.2 : 0.4;
      basePos1 = vec2(0.5 + centerBias * 0.6, 0.5 - centerBias * 0.4);
      basePos2 = vec2(0.5 - centerBias * 0.5, 0.5 - centerBias * 0.6);
      basePos3 = vec2(0.5 - centerBias * 0.4, 0.5 + centerBias * 0.5);
      basePos4 = vec2(0.5 + centerBias * 0.7, 0.5 + centerBias * 0.3);
    } else {
      // ORGANIC: Well-distributed positions that leave corners for base color
      basePos1 = vec2(0.3, 0.3);
      basePos2 = vec2(0.7, 0.25);
      basePos3 = vec2(0.65, 0.7);
      basePos4 = vec2(0.25, 0.65);
    }
    
    // Animate positions with smooth organic movement
    vec2 pos1 = basePos1 + vec2(sin(t * 0.7) * 0.1, cos(t * 0.9) * 0.08);
    vec2 pos2 = basePos2 + vec2(cos(t * 0.8) * 0.09, sin(t * 0.65) * 0.11);
    vec2 pos3 = basePos3 + vec2(sin(t * 0.55 + 1.2) * 0.11, cos(t * 0.75 + 2.1) * 0.09);
    vec2 pos4 = basePos4 + vec2(cos(t * 0.65 + 1.7) * 0.08, sin(t * 0.85 + 0.6) * 0.1);
    
    // For Aurora mode (stretch enabled): stretch coordinates vertically to create curtain effect
    vec2 sampleUv = vUv;
    if (uMeshStretch) {
      // Stretch Y axis to create vertical curtain shapes
      sampleUv.y = (sampleUv.y - 0.5) / uMeshStretchAmount + 0.5;
      // Add wave distortion for aurora curtain look
      sampleUv.x += sin(sampleUv.y * 8.0 + t * 0.3) * 0.03;
    }
    
    // Calculate distances from current pixel to each light source
    float dist1 = length(sampleUv - pos1);
    float dist2 = length(sampleUv - pos2);
    float dist3 = length(sampleUv - pos3);
    float dist4 = length(sampleUv - pos4);
    
    // Radial light falloff function: smooth exponential decay
    // Scale spread so that lights don't overwhelm the base color
    float spreadSq = spread * spread * 0.08;
    float light1 = exp(-dist1 * dist1 / spreadSq);
    float light2 = exp(-dist2 * dist2 / (spreadSq * 0.9));
    float light3 = exp(-dist3 * dist3 / (spreadSq * 1.1));
    float light4 = exp(-dist4 * dist4 / spreadSq);
    
    // Apply color weights as intensity multipliers (normalized to remaining space after base)
    float remainingWeight = 1.0 - baseWeight;
    float w1 = (uWeight1 / 100.0) / max(0.01, remainingWeight);
    float w2 = (uWeight2 / 100.0) / max(0.01, remainingWeight);
    float w3 = (uWeight3 / 100.0) / max(0.01, remainingWeight);
    float w4 = (uWeight4 / 100.0) / max(0.01, remainingWeight);
    
    // Scale lights by their weights (capped to prevent oversaturation)
    light1 *= min(w1 * 2.0, 1.0);
    light2 *= min(w2 * 2.0, 1.0);
    light3 *= min(w3 * 2.0, 1.0);
    light4 *= min(w4 * 2.0, 1.0);
    
    // Calculate total light coverage (how much area is lit)
    float totalLight = light1 + light2 + light3 + light4;
    if (uHasColor4) {
      totalLight = light1 + light2 + light3 + light4;
    } else {
      totalLight = light1 + light2 + light3;
      light4 = 0.0;
    }
    
    // Ensure base color maintains its minimum weight
    // by limiting how much the lights can cover
    float maxLightCoverage = remainingWeight * 1.5; // Allow some overlap
    float lightScale = totalLight > maxLightCoverage ? maxLightCoverage / totalLight : 1.0;
    
    light1 *= lightScale;
    light2 *= lightScale;
    light3 *= lightScale;
    light4 *= lightScale;
    
    // Direct blending in sRGB space to preserve exact brand colors
    // (Linear RGB blending was causing color shifts - magenta looked red)
    vec3 baseColor = uColor0;
    vec3 c1 = uColor1;
    vec3 c2 = uColor2;
    vec3 c3 = uColor3;
    vec3 c4 = uColor4;
    
    // Start with pure base color, then overlay lights
    vec3 result = baseColor;
    result = mix(result, c1, clamp(light1, 0.0, 1.0));
    result = mix(result, c2, clamp(light2, 0.0, 1.0));
    result = mix(result, c3, clamp(light3, 0.0, 1.0));
    if (uHasColor4) {
      result = mix(result, c4, clamp(light4, 0.0, 1.0));
    }
    
    // Subtle ordered dithering to prevent banding
    float d = bayer8x8(gl_FragCoord.xy);
    result = clamp(result + d * (0.75 / 255.0), 0.0, 1.0);
    
    gl_FragColor = vec4(result, 1.0);
    
    // Film grain for mesh mode
    if (uGrain > 0.0) {
      float g = snoise(vec3(vUv * 220.0, uTime * 0.7));
      float grainAmt = (g * 0.5 + 0.5 - 0.5) * (uGrain * 0.18);
      gl_FragColor.rgb = clamp(gl_FragColor.rgb + grainAmt, 0.0, 1.0);
    }
    
    return; // Exit early - mesh mode handles its own output
    
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
    // SPIRAL MODE: Hypnotic spiraling gradient with smooth color blending
    float dist = length(centeredUv);
    float angle = atan(centeredUv.y, centeredUv.x);
    
    // Create spiral effect
    float spiralAngle = angle + dist * uSpiralTightness * 6.28;
    if (!uSpiralDirection) spiralAngle = -spiralAngle;
    spiralAngle += uTime * 0.4;
    
    // Use sin for smooth periodic blending instead of fract for sharp edges
    float spiral = sin(spiralAngle) * 0.5 + 0.5;
    
    // Add multiple octaves of noise for organic, soft transitions
    vec3 noisePos = vec3(vUv * 1.5 * freq, uTime * 0.15);
    float organicNoise = snoise(noisePos) * 0.15 * density;
    float organicNoise2 = snoise(noisePos * 2.0 + 50.0) * 0.08 * density;
    
    // Add radial influence for more depth
    float radialBlend = smoothstep(0.0, 0.7, dist) * 0.2;
    
    noise = spiral + organicNoise + organicNoise2 + radialBlend;
    noise = clamp(noise, 0.0, 1.0);
    
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
  
  // PROGRESSIVE MIX - Different strategies for different gradient types
  // Plane uses direct sequential mix (no layer masking needed for linear noise)
  // Other modes use layer masking to prevent color0 from bleeding into later transitions
  
  vec3 finalColor;
  
  if (uGradientType == 2) {
    // =========================================================================
    // PLANE MODE: Weighted Segments with Proper Color Distribution
    // =========================================================================
    // Each color occupies its weight as a percentage of the noise range [0,1]
    // Color0: [0, threshold0], Color1: [threshold0, threshold1], etc.
    // Transitions are CENTERED on thresholds so each color gets its fair area.
    
    // Spread controls transition softness (0=sharp edges, 1=soft blend)
    // Strength should NOT affect Plane mixing.
    // In Plane we want predictable, print-safe transitions that depend only on Spread + Blur.
    float spreadMult = mix(0.008, 0.12, uPlaneSpread);
    float transitionWidth = spreadMult + blurFactor * 0.14;
    
    // Calculate blend factors - transitions CENTERED on thresholds
    // This ensures Color0 gets exactly threshold0 (e.g., 30%) of the area,
    // not more and not less.
    // Keep Color0 SOLID up to threshold0 (true 30%+ region), then transition outward.
    // Subsequent transitions remain centered so downstream colors keep their intended space.
    float blend01 = smoothstep(threshold0, threshold0 + transitionWidth * 2.0, noise);
    float blend12 = smoothstep(threshold1 - transitionWidth, threshold1 + transitionWidth, noise);
    float blend23 = smoothstep(threshold2 - transitionWidth, threshold2 + transitionWidth, noise);
    float blend34 = smoothstep(threshold3 - transitionWidth, threshold3 + transitionWidth, noise);
    
    // Sequential mix - each color replaces the previous in its segment
    finalColor = uColor0;
    finalColor = mix(finalColor, uColor1, blend01);
    finalColor = mix(finalColor, uColor2, blend12);
    finalColor = mix(finalColor, uColor3, blend23);
    if (uHasColor4) {
      finalColor = mix(finalColor, uColor4, blend34);
    }
    
  } else {
    // =========================================================================
    // OTHER MODES (Mesh, Water, Conic, Spiral, Waves): Layer Masking
    // =========================================================================
    float blend01 = smoothstep(threshold0 - blurFactor, threshold0 + blurFactor, noise);
    float blend12 = smoothstep(threshold1 - blurFactor, threshold1 + blurFactor, noise);
    float blend23 = smoothstep(threshold2 - blurFactor, threshold2 + blurFactor, noise);
    float blend34 = smoothstep(threshold3 - blurFactor, threshold3 + blurFactor, noise);
    
    float strengthExp = 1.0 + strength * 0.5;
    blend01 = pow(blend01, strengthExp);
    blend12 = pow(blend12, strengthExp);
    blend23 = pow(blend23, strengthExp);
    blend34 = pow(blend34, strengthExp);
    
    finalColor = uColor0;
    finalColor = mix(finalColor, uColor1, blend01);
    
    float mask12 = blend01;
    finalColor = mix(finalColor, uColor2, blend12 * mask12);
    
    float mask23 = max(blend01, blend12);
    finalColor = mix(finalColor, uColor3, blend23 * mask23);
    
    if (uHasColor4) {
      float mask34 = max(mask23, blend23);
      finalColor = mix(finalColor, uColor4, blend34 * mask34);
    }
  }
  
  // Convert from Linear RGB back to sRGB for correct display
  finalColor = linearToSrgb(finalColor);

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
  'spiral': 5,
  'waves': 6,
};

export function Custom4ColorGradient({ config }: Custom4ColorGradientProps) {
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
    // Spiral uniforms
    uSpiralTightness: { value: config.spiralTightness ?? 3 },
    uSpiralDirection: { value: config.spiralDirection ?? true },
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
    
    // Update spiral uniforms
    mat.uniforms.uSpiralTightness.value = config.spiralTightness ?? 3;
    mat.uniforms.uSpiralDirection.value = config.spiralDirection ?? true;
    
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
