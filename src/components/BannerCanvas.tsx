import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import * as THREE from 'three';
import { BannerConfig } from '@/types/webAssets';

interface BannerCanvasProps {
  config: BannerConfig;
  className?: string;
}

// Simplex 3D Noise GLSL
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
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
${simplexNoiseGLSL}

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uWeight1;
uniform float uWeight2;
uniform float uTime;
uniform float uNoiseScale;
uniform float uBlur;
uniform float uStrength;
uniform float uDensity;
uniform float uFrequency;

varying vec2 vUv;

void main() {
  float freq = max(0.1, uFrequency);
  float density = max(0.0, uDensity);
  float strength = max(0.0, uStrength);
  vec3 noisePos = vec3(vUv * uNoiseScale * freq, uTime * 0.1);
  
  float n1 = snoise(noisePos) * 0.5 + 0.5;
  float n2 = snoise(noisePos * 2.0 + 100.0) * (0.20 + 0.10 * density);
  float n3 = snoise(noisePos * 4.0 + 200.0) * (0.10 + 0.06 * density);
  
  float noise = n1 + n2 + n3;
  noise = noise / 1.375;
  noise = pow(clamp(noise, 0.0, 1.0), 1.0 + strength * 0.18);
  
  float blurFactor = uBlur * 0.5;
  float w1 = uWeight1 / 100.0;
  float w2 = uWeight2 / 100.0;
  float threshold1 = w1;
  float threshold2 = w1 + w2;
  
  vec3 finalColor;
  float edge1 = smoothstep(threshold1 - blurFactor, threshold1 + blurFactor, noise);
  float edge2 = smoothstep(threshold2 - blurFactor, threshold2 + blurFactor, noise);
  
  finalColor = mix(uColor1, uColor2, edge1);
  finalColor = mix(finalColor, uColor3, edge2);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

interface MeshGradientProps {
  config: BannerConfig;
}

function BannerMeshGradient({ config }: MeshGradientProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const uniforms = useMemo(() => ({
    uColor1: { value: new THREE.Color(config.gradientColors[0] || '#FDB515') },
    uColor2: { value: new THREE.Color(config.gradientColors[1] || '#E71989') },
    uColor3: { value: new THREE.Color(config.gradientColors[2] || '#6A00F4') },
    uWeight1: { value: config.gradientWeights[0] || 33 },
    uWeight2: { value: config.gradientWeights[1] || 34 },
    uTime: { value: 0 },
    uNoiseScale: { value: config.meshNoiseScale ?? 1.0 },
    uBlur: { value: (config.meshBlur ?? 50) / 100 },
    uStrength: { value: config.uStrength },
    uDensity: { value: config.uDensity },
    uFrequency: { value: config.uFrequency },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  
  useFrame((state) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    mat.uniforms.uColor1.value.set(config.gradientColors[0] || '#FDB515');
    mat.uniforms.uColor2.value.set(config.gradientColors[1] || '#E71989');
    mat.uniforms.uColor3.value.set(config.gradientColors[2] || '#6A00F4');
    mat.uniforms.uWeight1.value = config.gradientWeights[0] || 33;
    mat.uniforms.uWeight2.value = config.gradientWeights[1] || 34;
    mat.uniforms.uNoiseScale.value = config.meshNoiseScale ?? 1.0;
    mat.uniforms.uBlur.value = (config.meshBlur ?? 50) / 100;
    mat.uniforms.uStrength.value = config.uStrength;
    mat.uniforms.uDensity.value = config.uDensity;
    mat.uniforms.uFrequency.value = config.uFrequency;
    
    if (config.animate) {
      mat.uniforms.uTime.value = state.clock.elapsedTime * config.speed;
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

export const BannerCanvas = ({ config, className }: BannerCanvasProps) => {
  const isMesh = config.effectType === 'mesh';
  
  return (
    <div className={`relative overflow-hidden ${className || ''}`}>
      {isMesh ? (
        <Canvas
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ preserveDrawingBuffer: true, alpha: true }}
        >
          <BannerMeshGradient config={config} />
        </Canvas>
      ) : (
        <ShaderGradientCanvas
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          pixelDensity={2}
          pointerEvents="none"
        >
          <ShaderGradient
            animate={config.animate ? 'on' : 'off'}
            type={config.effectType as 'plane' | 'sphere' | 'waterPlane'}
            wireframe={false}
            shader="defaults"
            uTime={config.animate ? undefined : 0}
            uSpeed={config.speed}
            uStrength={config.uStrength}
            uDensity={config.uDensity}
            uFrequency={config.uFrequency}
            uAmplitude={3.2}
            positionX={0}
            positionY={0}
            positionZ={0}
            rotationX={0}
            rotationY={10}
            rotationZ={50}
            color1={config.gradientColors[0] || '#FDB515'}
            color2={config.gradientColors[1] || '#E71989'}
            color3={config.gradientColors[2] || '#6A00F4'}
            reflection={0.1}
            cAzimuthAngle={180}
            cPolarAngle={115}
            cDistance={config.animate ? 3.6 : 4.5}
            cameraZoom={1}
            lightType="3d"
            brightness={1.4}
            envPreset="city"
            grain="off"
            toggleAxis={false}
            zoomOut={false}
          />
        </ShaderGradientCanvas>
      )}
      
      {/* Hero banner black fade overlay */}
      {config.type === 'hero' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to right,
              rgba(0, 0, 0, 1) 0%,
              rgba(0, 0, 0, 1) ${config.blackFadePercentage * 0.5}%,
              rgba(0, 0, 0, 0) ${config.blackFadePercentage}%
            )`,
          }}
        />
      )}
    </div>
  );
};
