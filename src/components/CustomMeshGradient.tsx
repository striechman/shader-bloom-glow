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
  
  // Create gradient colors for the fill - use the dominant color based on weights
  const fillColor = useMemo(() => {
    const w1 = config.colorWeight1;
    const w2 = config.colorWeight2;
    const w3 = config.colorWeight3;
    
    // Return the color with highest weight for a more vibrant fill
    if (w1 >= w2 && w1 >= w3) return config.color1;
    if (w2 >= w1 && w2 >= w3) return config.color2;
    return config.color3;
  }, [config.color1, config.color2, config.color3, config.colorWeight1, config.colorWeight2, config.colorWeight3]);
  
  // Secondary fill color for richer appearance
  const secondaryFillColor = useMemo(() => {
    const w1 = config.colorWeight1;
    const w2 = config.colorWeight2;
    const w3 = config.colorWeight3;
    
    // Return the second highest weighted color
    if (w1 >= w2 && w1 >= w3) {
      return w2 >= w3 ? config.color2 : config.color3;
    }
    if (w2 >= w1 && w2 >= w3) {
      return w1 >= w3 ? config.color1 : config.color3;
    }
    return w1 >= w2 ? config.color1 : config.color2;
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
  
  // Calculate effective fill opacity - ensure colors are visible
  const effectiveFillOpacity = Math.max(0.5, config.meshFillOpacity);
  
  return (
    <group rotation={[rotationX, 0, 0]} position={[0, 0, 0]}>
      {/* Background plane with gradient colors */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[5.2, 5.2]} />
        <meshBasicMaterial 
          color={secondaryFillColor} 
          transparent 
          opacity={effectiveFillOpacity * 0.8}
        />
      </mesh>
      
      {/* Main mesh with wireframe */}
      <mesh ref={meshRef}>
        <planeGeometry args={[5, 5, segments, segments]} />
        <Wireframe
          stroke={strokeColor}
          thickness={config.meshLineThickness}
          fill={fillColor}
          fillOpacity={effectiveFillOpacity}
          squeeze
          backfaceStroke={strokeColor}
        />
      </mesh>
    </group>
  );
};
