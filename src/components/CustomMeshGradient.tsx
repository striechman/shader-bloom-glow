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

// 8x8 Bayer ordered dithering (Eliminates banding in dark gradients)
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
    float v = m[i] / 64.0;
    return v - 0.5;
}

void main() {
  float freq = max(0.1, uFrequency);
  float density = max(0.0, uDensity);
  float strength = max(0.0, uStrength);
  
  vec2 centeredUv = vUv - 0.5;
  
  // --- IMPROVEMENT: ANISOTROPIC STRETCHING ---
  // Instead of round blobs, we stretch the coordinates to create "curtains"
  // This is the secret to the Aurora/Silky look.
  vec2 coords = vUv;
  
  if (uMeshStyle == 0) { // Organic mode specific tweak
      coords.y *= 0.6; // Stretch vertically (lower frequency)
      coords.x *= 1.4; // Compress horizontally (higher frequency)
      // Add subtle wave warping
      coords.x += sin(coords.y * 3.5 + uTime * 0.15) * 0.15;
  }
  
  vec3 noisePos = vec3(coords * uNoiseScale * freq, uTime * 0.25);
  
  // Base noise calculation
  float n1 = snoise(noisePos) * 0.5 + 0.5;
  float n2 = snoise(noisePos * 2.0 + 100.0) * (0.20 + 0.10 * density);
  float n3 = snoise(noisePos * 4.0 + 200.0) * (0.10 + 0.06 * density);
  
  float baseNoise = n1 + n2 + n3;
  baseNoise = baseNoise / 1.375; // Normalize to 0-1 range
  
  // Apply mesh style modifications
  float noise = baseNoise;
  
  if (uMeshStyle == 1) {
    // FLOW
    vec2 flowDir = vec2(cos(uMeshFlowAngle), sin(uMeshFlowAngle));
    float directionalBias = dot(centeredUv, flowDir) * 0.5 + 0.5;
    noise = baseNoise * 0.6 + directionalBias * 0.4;
  } else if (uMeshStyle == 2) {
    // CENTER
    float dist = length(centeredUv) * 1.4;
    if (!uMeshCenterInward) dist = 1.0 - dist;
    noise = baseNoise * 0.5 + dist * 0.5;
  }
  
  // HISTOGRAM EQUALIZATION
  float centered = noise - 0.5;
  float stretched = sign(centered) * pow(abs(centered) * 2.0, 0.7) * 0.5;
  noise = stretched + 0.5;
  noise = clamp(noise, 0.0, 1.0);
  
  float blurFactor = uBlur * 0.5;
  
  // Weights setup
  float w0 = uWeight0 / 100.0;
  float w1 = uWeight1 / 100.0;
  float w2 = uWeight2 / 100.0;
  float w3 = uWeight3 / 100.0;
  float w4 = uWeight4 / 100.0;
  
  float threshold0 = w0;
  float threshold1 = w0 + w1;
  float threshold2 = w0 + w1 + w2;
  float threshold3 = w0 + w1 + w2 + w3;
  
  // --- IMPROVEMENT: WIDER BLENDING ---
  // Increased base width and multiplier to allow for very deep overlaps (Aurora look)
  float baseTransitionWidth = 0.20; 
  float transitionWidth = baseTransitionWidth + blurFactor * 0.6; // Can go up to ~0.8
  
  float blend01 = smoothstep(threshold0 - transitionWidth * 0.5, threshold0 + transitionWidth * 1.5, noise);
  float blend12 = smoothstep(threshold1 - transitionWidth, threshold1 + transitionWidth, noise);
  float blend23 = smoothstep(threshold2 - transitionWidth, threshold2 + transitionWidth, noise);
  float blend34 = smoothstep(threshold3 - transitionWidth, threshold3 + transitionWidth, noise);

  // Strength
  float strengthExp = 1.0 + strength * 0.4;
  blend01 = pow(clamp(blend01, 0.0, 1.0), strengthExp);
  blend12 = pow(clamp(blend12, 0.0, 1.0), strengthExp);
  blend23 = pow(clamp(blend23, 0.0, 1.0), strengthExp);
  blend34 = pow(clamp(blend34, 0.0, 1.0), strengthExp);
  
  vec3 finalColor;
  
  // Progressive Mixing
  finalColor = uColor0;
  
  // Mix 0->1
  finalColor = mix(finalColor, uColor1, blend01);
  
  // Mix 1->2
  finalColor = mix(finalColor, uColor2, blend12);
  
  // Mix 2->3
  finalColor = mix(finalColor, uColor3, blend23);
  
  // Mix 3->4
  if (uHasColor4) {
    finalColor = mix(finalColor, uColor4, blend34);
  }
  
  // Convert to sRGB
  finalColor = linearToSrgb(finalColor);
  
  // --- IMPROVEMENT: DITHERING ---
  // Apply Bayer dithering to prevent banding in dark gradients
  float d = bayer8x8(gl_FragCoord.xy);
  finalColor = clamp(finalColor + d * (0.8 / 255.0), 0.0, 1.0);
  
  gl_FragColor = vec4(finalColor, 1.0);

  // Film grain
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
    uNoiseScale: { value: config.meshNoiseScale ?? 3.0 },
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
    mat.uniforms.uNoiseScale.value = config.meshNoiseScale ?? 3.0;
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
