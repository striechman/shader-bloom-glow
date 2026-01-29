import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { Canvas } from '@react-three/fiber';
import { GradientConfig, aspectRatioValues } from '@/types/gradient';
import { CustomMeshGradient } from './CustomMeshGradient';

interface GradientCanvasProps {
  config: GradientConfig;
}

export const GradientCanvas = ({ config }: GradientCanvasProps) => {
  const isWireframe = config.wireframe === true;
  const isFrozen = config.frozenTime !== null;
  const isStaticMode = !config.animate || isFrozen;
  
  // NOTE: Avoid forcing remounts on every slider move (can cause WebGL context loss).
  
  // Calculate aspect ratio container styles - properly constrained
  const getContainerStyle = (): React.CSSProperties => {
    if (config.aspectRatio === 'free') {
      return { width: '100%', height: '100%', position: 'relative' };
    }
    
    const ratio = aspectRatioValues[config.aspectRatio];
    if (!ratio) return { width: '100%', height: '100%', position: 'relative' };
    
    // For landscape (ratio >= 1): constrain width based on viewport height
    // For portrait (ratio < 1): constrain height based on viewport width
    if (ratio >= 1) {
      // Landscape: width is the limiting factor
      return {
        width: `min(100%, calc((100vh - 4rem) * ${ratio}))`,
        height: 'auto',
        aspectRatio: `${ratio}`,
        position: 'relative' as const,
      };
    } else {
      // Portrait: height is the limiting factor
      return {
        height: `min(100%, calc((100vw - 4rem) / ${ratio}))`,
        width: 'auto',
        aspectRatio: `${ratio}`,
        position: 'relative' as const,
      };
    }
  };
  
  // Calculate color weight percentages for the gradient overlay
  const w1 = config.colorWeight1;
  const w2 = w1 + config.colorWeight2;
  const feather = 6; // soft transition band (in %)
  const f1 = Math.max(0, w1 - feather);
  const f2 = Math.min(100, w1 + feather);
  const f3 = Math.max(0, w2 - feather);
  const f4 = Math.min(100, w2 + feather);
  
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden p-4">
      <div 
        style={getContainerStyle()} 
        className="flex items-center justify-center"
      >
        {/* Use custom mesh gradient for wireframe mode, ShaderGradient for others */}
        {isWireframe ? (
          <Canvas
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
            }}
            camera={{ position: [0, 0, 5], fov: 50 }}
            gl={{ preserveDrawingBuffer: true, alpha: true }}
          >
            <CustomMeshGradient config={config} />
          </Canvas>
        ) : (
          <ShaderGradientCanvas
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
            }}
            pixelDensity={2}
            pointerEvents="none"
          >
            <ShaderGradient
              animate={isFrozen ? 'off' : (config.animate ? 'on' : 'off')}
              type={config.type}
              wireframe={false}
              shader="defaults"
              uTime={isFrozen ? config.frozenTime : 0}
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
              color1={config.color1}
              color2={config.color2}
              color3={config.color3}
              reflection={0.1}
              cAzimuthAngle={180}
              cPolarAngle={115}
              cDistance={config.animate ? 3.6 : 4.5}
              cameraZoom={1}
              lightType="3d"
              brightness={1.4}
              envPreset="city"
              grain={config.grain ? 'on' : 'off'}
              grainBlending={config.grain ? (config.grainIntensity ?? 50) / 100 : 0}
              toggleAxis={false}
              zoomOut={false}
            />
          </ShaderGradientCanvas>
        )}

        {/* Static-mode weights overlay: softened (no hard banding) + doesn't kill shader effects */}
        {isStaticMode && !isWireframe && (
          <div
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{
              background: `linear-gradient(135deg,
                ${config.color1} 0%,
                ${config.color1} ${f1}%,
                ${config.color2} ${f2}%,
                ${config.color2} ${f3}%,
                ${config.color3} ${f4}%,
                ${config.color3} 100%
              )`,
              // Make weights clearly visible in static mode (especially dark colors)
              opacity: 0.48,
              mixBlendMode: 'normal',
              filter: 'blur(32px)',
              transform: 'scale(1.08)',
            }}
          />
        )}
      </div>
    </div>
  );
};
