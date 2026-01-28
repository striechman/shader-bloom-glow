import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { GradientConfig, aspectRatioValues } from '@/types/gradient';

interface GradientCanvasProps {
  config: GradientConfig;
}

export const GradientCanvas = ({ config }: GradientCanvasProps) => {
  const isWireframe = config.wireframe === true;
  const isFrozen = config.frozenTime !== null;
  const isStaticMode = !config.animate || isFrozen;
  
  // Create a key that changes when colors/weights change to force re-render
  const colorKey = `${config.color1}-${config.color2}-${config.color3}-${config.colorWeight1}-${config.colorWeight2}-${config.colorWeight3}`;
  
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
        <ShaderGradientCanvas
          key={colorKey}
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
            wireframe={isWireframe}
            shader="defaults"
            uTime={isFrozen ? config.frozenTime : 0}
            uSpeed={config.speed}
            uStrength={isWireframe ? 1.5 : config.uStrength}
            uDensity={isWireframe ? config.meshDensity : config.uDensity}
            uFrequency={isWireframe ? 8 : config.uFrequency}
            // Keep rich deformation even when static (static = fixed time, not reduced effect)
            uAmplitude={isWireframe ? 1 : 3.2}
            positionX={0}
            positionY={0}
            positionZ={0}
            rotationX={isWireframe ? config.meshAngle : 0}
            rotationY={isWireframe ? 0 : 10}
            rotationZ={isWireframe ? 0 : 50}
            color1={config.color1}
            color2={config.color2}
            color3={config.color3}
            reflection={isWireframe ? 0.5 : 0.1}
            cAzimuthAngle={180}
            cPolarAngle={isWireframe ? 90 : 115}
            cDistance={isWireframe ? 2.5 : (config.animate ? 3.6 : 4.5)}
            cameraZoom={1}
            lightType="3d"
            brightness={isWireframe ? 2 : 1.4}
            envPreset="city"
            grain={config.grain ? 'on' : 'off'}
            toggleAxis={false}
            zoomOut={false}
          />
        </ShaderGradientCanvas>

        {/* Static-mode weights overlay: softened (no hard banding) + doesn't kill shader effects */}
        {isStaticMode && (
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
              opacity: 0.22,
              mixBlendMode: 'soft-light',
              filter: 'blur(28px)',
              transform: 'scale(1.08)',
            }}
          />
        )}
      </div>
    </div>
  );
};
