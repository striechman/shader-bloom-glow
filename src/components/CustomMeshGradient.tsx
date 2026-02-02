import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GradientConfig } from '@/types/gradient';

interface CustomMeshGradientProps {
  config: GradientConfig;
}

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// New shader approach: Radial light sources with heavy blur
// Inspired by "Dark Mode Gradients" / "Atmospheric Lighting" style
const fragmentShader = `
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
uniform float uBlur;
uniform float uStrength;
uniform float uDensity;
uniform float uFrequency;
uniform float uGrain;
uniform int uMeshStyle;
uniform float uMeshFlowAngle;
uniform bool uMeshCenterInward;

varying vec2 vUv;

// sRGB to Linear RGB conversion
vec3 srgbToLinear(vec3 srgb) {
  vec3 low = srgb / 12.92;
  vec3 high = pow((srgb + 0.055) / 1.055, vec3(2.4));
  return mix(low, high, step(0.04045, srgb));
}

// Linear RGB to sRGB conversion
vec3 linearToSrgb(vec3 linear) {
  vec3 low = linear * 12.92;
  vec3 high = 1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(0.0031308, linear));
}

// 8x8 Bayer dithering to prevent banding
float bayer8x8(vec2 p) {
  int x = int(mod(p.x, 8.0));
  int y = int(mod(p.y, 8.0));
  int i = x + y * 8;
  float m[64];
  m[0]=0.0;  m[1]=48.0; m[2]=12.0; m[3]=60.0; m[4]=3.0;  m[5]=51.0; m[6]=15.0; m[7]=63.0;
  m[8]=32.0; m[9]=16.0; m[10]=44.0; m[11]=28.0; m[12]=35.0; m[13]=19.0; m[14]=47.0; m[15]=31.0;
  m[16]=8.0; m[17]=56.0; m[18]=4.0;  m[19]=52.0; m[20]=11.0; m[21]=59.0; m[22]=7.0;  m[23]=55.0;
  m[24]=40.0; m[25]=24.0; m[26]=36.0; m[27]=20.0; m[28]=43.0; m[29]=27.0; m[30]=39.0; m[31]=23.0;
  m[32]=2.0; m[33]=50.0; m[34]=14.0; m[35]=62.0; m[36]=1.0; m[37]=49.0; m[38]=13.0; m[39]=61.0;
  m[40]=34.0; m[41]=18.0; m[42]=46.0; m[43]=30.0; m[44]=33.0; m[45]=17.0; m[46]=45.0; m[47]=29.0;
  m[48]=10.0; m[49]=58.0; m[50]=6.0;  m[51]=54.0; m[52]=9.0;  m[53]=57.0; m[54]=5.0;  m[55]=53.0;
  m[56]=42.0; m[57]=26.0; m[58]=38.0; m[59]=22.0; m[60]=41.0; m[61]=25.0; m[62]=37.0; m[63]=21.0;
  return (m[i] / 64.0) - 0.5;
}

// Simplex-like noise for subtle animation
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

// Smooth radial falloff for light sources
float radialLight(vec2 uv, vec2 center, float radius, float softness) {
  float dist = length(uv - center);
  // Exponential falloff for realistic light
  float falloff = exp(-dist * dist / (radius * radius * softness));
  return falloff;
}

void main() {
  vec2 uv = vUv;
  
  // Softness factor from blur (higher = softer, more spread out light)
  float softness = 0.3 + uBlur * 1.5;
  
  // Radius based on weights - larger weight = larger light source
  float baseRadius = 0.4 + uBlur * 0.3;
  
  // Subtle animation offset
  float timeOffset = uTime * 0.08;
  float slowTime = uTime * 0.03;
  
  // Light source positions - spread across the canvas
  // These positions create the "atmospheric" feel
  vec2 pos1 = vec2(
    0.2 + sin(slowTime * 0.7) * 0.1,
    0.7 + cos(slowTime * 0.5) * 0.1
  );
  vec2 pos2 = vec2(
    0.8 + cos(slowTime * 0.6) * 0.1,
    0.3 + sin(slowTime * 0.8) * 0.1
  );
  vec2 pos3 = vec2(
    0.5 + sin(slowTime * 0.4) * 0.15,
    0.2 + cos(slowTime * 0.9) * 0.1
  );
  vec2 pos4 = vec2(
    0.3 + cos(slowTime * 0.5) * 0.1,
    0.5 + sin(slowTime * 0.7) * 0.1
  );
  
  // Adjust positions based on mesh style
  if (uMeshStyle == 1) {
    // Flow style - lights aligned along angle
    float angle = uMeshFlowAngle;
    vec2 flowDir = vec2(cos(angle), sin(angle));
    pos1 = vec2(0.5, 0.5) + flowDir * 0.3;
    pos2 = vec2(0.5, 0.5) - flowDir * 0.3;
    pos3 = vec2(0.5, 0.5) + vec2(-flowDir.y, flowDir.x) * 0.2;
    pos4 = vec2(0.5, 0.5) - vec2(-flowDir.y, flowDir.x) * 0.2;
  } else if (uMeshStyle == 2) {
    // Center style - lights radiate from center
    if (uMeshCenterInward) {
      pos1 = vec2(0.5, 0.5);
      pos2 = vec2(0.2, 0.2);
      pos3 = vec2(0.8, 0.8);
      pos4 = vec2(0.2, 0.8);
    } else {
      pos1 = vec2(0.1, 0.1);
      pos2 = vec2(0.9, 0.1);
      pos3 = vec2(0.9, 0.9);
      pos4 = vec2(0.1, 0.9);
    }
  }
  
  // Calculate light intensities based on weights
  float w0 = uWeight0 / 100.0;
  float w1 = uWeight1 / 100.0;
  float w2 = uWeight2 / 100.0;
  float w3 = uWeight3 / 100.0;
  float w4 = uWeight4 / 100.0;
  
  // Radial light contributions - each color is a "light source"
  float light1 = radialLight(uv, pos1, baseRadius * (0.5 + w1), softness) * w1 * 2.0;
  float light2 = radialLight(uv, pos2, baseRadius * (0.5 + w2), softness) * w2 * 2.0;
  float light3 = radialLight(uv, pos3, baseRadius * (0.5 + w3), softness) * w3 * 2.0;
  float light4 = uHasColor4 ? radialLight(uv, pos4, baseRadius * (0.5 + w4), softness) * w4 * 2.0 : 0.0;
  
  // Strength affects how concentrated the lights are
  float strengthMod = 1.0 + uStrength * 0.5;
  light1 = pow(light1, 1.0 / strengthMod);
  light2 = pow(light2, 1.0 / strengthMod);
  light3 = pow(light3, 1.0 / strengthMod);
  light4 = pow(light4, 1.0 / strengthMod);
  
  // Clamp lights
  light1 = clamp(light1, 0.0, 1.0);
  light2 = clamp(light2, 0.0, 1.0);
  light3 = clamp(light3, 0.0, 1.0);
  light4 = clamp(light4, 0.0, 1.0);
  
  // Start with base color (typically black)
  vec3 baseColor = uColor0;
  
  // Additive blending of light sources onto black base
  // This creates the "light emerging from darkness" effect
  vec3 finalColor = baseColor;
  
  // Add each light source - they blend additively like real lights
  finalColor = mix(finalColor, uColor1, light1);
  finalColor = mix(finalColor, uColor2, light2);
  finalColor = mix(finalColor, uColor3, light3);
  if (uHasColor4) {
    finalColor = mix(finalColor, uColor4, light4);
  }
  
  // Apply density for color saturation boost
  float densityBoost = 1.0 + uDensity * 0.3;
  vec3 gray = vec3(dot(finalColor, vec3(0.299, 0.587, 0.114)));
  finalColor = mix(gray, finalColor, densityBoost);
  
  // Convert to sRGB
  finalColor = linearToSrgb(clamp(finalColor, 0.0, 1.0));
  
  // Apply dithering to prevent banding in dark areas
  float dither = bayer8x8(gl_FragCoord.xy);
  finalColor = clamp(finalColor + dither * (1.0 / 255.0), 0.0, 1.0);
  
  gl_FragColor = vec4(finalColor, 1.0);
  
  // Film grain overlay
  if (uGrain > 0.0) {
    float g = snoise(vec3(vUv * 200.0, uTime * 0.5));
    float grainAmt = g * uGrain * 0.1;
    gl_FragColor.rgb = clamp(gl_FragColor.rgb + grainAmt, 0.0, 1.0);
  }
}
`;

export function CustomMeshGradient({ config }: CustomMeshGradientProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
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
    uBlur: { value: (config.meshBlur ?? 50) / 100 },
    uStrength: { value: config.uStrength },
    uDensity: { value: config.uDensity },
    uFrequency: { value: config.uFrequency },
    uGrain: { value: config.grain ? (config.grainIntensity ?? 50) / 100 : 0 },
    uMeshStyle: { value: config.meshStyle === 'flow' ? 1 : config.meshStyle === 'center' ? 2 : 0 },
    uMeshFlowAngle: { value: (config.meshFlowAngle ?? 45) * Math.PI / 180 },
    uMeshCenterInward: { value: config.meshCenterInward ?? true },
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
    mat.uniforms.uBlur.value = (config.meshBlur ?? 50) / 100;
    mat.uniforms.uStrength.value = config.uStrength;
    mat.uniforms.uDensity.value = config.uDensity;
    mat.uniforms.uFrequency.value = config.uFrequency;
    mat.uniforms.uGrain.value = config.grain ? (config.grainIntensity ?? 50) / 100 : 0;
    
    mat.uniforms.uMeshStyle.value = config.meshStyle === 'flow' ? 1 : config.meshStyle === 'center' ? 2 : 0;
    mat.uniforms.uMeshFlowAngle.value = (config.meshFlowAngle ?? 45) * Math.PI / 180;
    mat.uniforms.uMeshCenterInward.value = config.meshCenterInward ?? true;
    
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
