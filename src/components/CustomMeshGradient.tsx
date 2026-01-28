import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Wireframe } from '@react-three/drei';
import * as THREE from 'three';
import { GradientConfig } from '@/types/gradient';

interface CustomMeshGradientProps {
  config: GradientConfig;
}

export const CustomMeshGradient = ({ config }: CustomMeshGradientProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  
  const isFrozen = config.frozenTime !== null;
  const isAnimating = config.animate && !isFrozen;
  
  // Calculate grid segments based on density
  const segments = Math.floor(config.meshDensity * 10);
  
  // Determine stroke color based on config
  const strokeColor = useMemo(() => {
    switch (config.meshLineColor) {
      case 'black':
        return '#000000';
      case 'white':
        return '#FFFFFF';
      case 'accent':
        return config.color1;
      default:
        return '#000000';
    }
  }, [config.meshLineColor, config.color1]);
  
  // Create gradient colors for the fill
  const fillColor = useMemo(() => {
    // Mix colors based on weights
    const c1 = new THREE.Color(config.color1);
    const c2 = new THREE.Color(config.color2);
    const c3 = new THREE.Color(config.color3);
    
    const w1 = config.colorWeight1 / 100;
    const w2 = config.colorWeight2 / 100;
    const w3 = config.colorWeight3 / 100;
    
    const mixed = new THREE.Color(
      c1.r * w1 + c2.r * w2 + c3.r * w3,
      c1.g * w1 + c2.g * w2 + c3.g * w3,
      c1.b * w1 + c2.b * w2 + c3.b * w3
    );
    
    return '#' + mixed.getHexString();
  }, [config.color1, config.color2, config.color3, config.colorWeight1, config.colorWeight2, config.colorWeight3]);
  
  // Animate the mesh vertices
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
    const positions = geometry.attributes.position;
    const time = isFrozen ? (config.frozenTime ?? 0) : (isAnimating ? state.clock.elapsedTime * config.speed : 0);
    
    // Wave animation on vertices
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      // Create wave effect
      const waveX = Math.sin(x * config.uFrequency * 0.5 + time) * config.uStrength * 0.1;
      const waveY = Math.cos(y * config.uFrequency * 0.5 + time * 0.8) * config.uStrength * 0.1;
      const wave = (waveX + waveY) * config.uDensity * 0.3;
      
      positions.setZ(i, wave);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  });
  
  // Convert mesh angle to radians
  const rotationX = THREE.MathUtils.degToRad(config.meshAngle);
  
  return (
    <group rotation={[rotationX, 0, 0]} position={[0, 0, 0]}>
      <mesh ref={meshRef}>
        <planeGeometry args={[5, 5, segments, segments]} />
        <Wireframe
          stroke={strokeColor}
          thickness={config.meshLineThickness}
          fill={fillColor}
          fillOpacity={config.meshFillOpacity}
          squeeze
          backfaceStroke={strokeColor}
        />
      </mesh>
    </group>
  );
};
