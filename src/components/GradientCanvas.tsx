import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { Canvas } from '@react-three/fiber';
import { GradientConfig, aspectRatioValues, isHeroBannerRatio, isButtonRatio } from '@/types/gradient';
import { CustomMeshGradient } from './CustomMeshGradient';
import { useMemo } from 'react';

interface GradientCanvasProps {
  config: GradientConfig;
}

export const GradientCanvas = ({ config }: GradientCanvasProps) => {
  const isButton = isButtonRatio(config.aspectRatio);
  
  // Buttons are always mesh gradient, no animation
  const isWireframe = isButton ? true : config.wireframe === true;
  const isFrozen = config.frozenTime !== null;
  const isStaticMode = isButton ? true : (!config.animate || isFrozen);
  const isHeroBanner = isHeroBannerRatio(config.aspectRatio);
  
  // Get current colors based on button preview state
  const currentColors = useMemo(() => {
    if (isButton && config.buttonPreviewState === 'hover') {
      return {
        color1: config.hoverColor1,
        color2: config.hoverColor2,
        color3: config.hoverColor3,
      };
    }
    return {
      color1: config.color1,
      color2: config.color2,
      color3: config.color3,
    };
  }, [isButton, config.buttonPreviewState, config.color1, config.color2, config.color3, config.hoverColor1, config.hoverColor2, config.hoverColor3]);
  
  // NOTE: Avoid forcing remounts on every slider move (can cause WebGL context loss).
  
  // Calculate aspect ratio container styles - properly constrained
  const getContainerStyle = (): React.CSSProperties => {
    if (config.aspectRatio === 'free') {
      return { width: '100%', height: '100%', position: 'relative' };
    }
    
    const ratio = aspectRatioValues[config.aspectRatio];
    if (!ratio) return { width: '100%', height: '100%', position: 'relative' };
    
    // Buttons have fixed max sizes to look like actual buttons
    if (isButton) {
      const buttonSizes: Record<string, { maxWidth: string; maxHeight: string }> = {
        'button-large': { maxWidth: '240px', maxHeight: '64px' },
        'button-medium': { maxWidth: '180px', maxHeight: '48px' },
        'button-small': { maxWidth: '120px', maxHeight: '40px' },
      };
      const size = buttonSizes[config.aspectRatio] || buttonSizes['button-medium'];
      return {
        width: size.maxWidth,
        height: size.maxHeight,
        position: 'relative' as const,
        borderRadius: '8px',
        overflow: 'hidden',
      };
    }
    
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
  
  const grainOpacity = config.grain ? (config.grainIntensity ?? 50) / 100 : 0;
  
  // Create a modified config with current colors for CustomMeshGradient
  const meshConfig = useMemo(() => ({
    ...config,
    color1: currentColors.color1,
    color2: currentColors.color2,
    color3: currentColors.color3,
    // Buttons don't animate
    animate: isButton ? false : config.animate,
  }), [config, currentColors, isButton]);
  
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden p-4">
      <div
        style={getContainerStyle()}
        className="relative flex items-center justify-center"
      >
        {/* Use custom mesh gradient for wireframe mode or buttons, ShaderGradient for others */}
        {isWireframe ? (
          <Canvas
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              borderRadius: isButton ? '9999px' : undefined,
            }}
            camera={{ position: [0, 0, 5], fov: 50 }}
            gl={{ preserveDrawingBuffer: true, alpha: true }}
          >
            <CustomMeshGradient config={meshConfig} />
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
              color1={currentColors.color1}
              color2={currentColors.color2}
              color3={currentColors.color3}
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

        {/* Static-mode weights overlay: softened (no hard banding) + doesn't kill shader effects */}
        {isStaticMode && !isWireframe && !isButton && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ borderRadius: 'inherit' }}
          >
            <div
              className="absolute inset-[-8%] pointer-events-none"
              style={{
                background: `linear-gradient(135deg,
                  ${currentColors.color1} 0%,
                  ${currentColors.color1} ${f1}%,
                  ${currentColors.color2} ${f2}%,
                  ${currentColors.color2} ${f3}%,
                  ${currentColors.color3} ${f4}%,
                  ${currentColors.color3} 100%
                )`,
                // Make weights clearly visible in static mode (especially dark colors)
                opacity: 0.48,
                mixBlendMode: 'normal',
                filter: 'blur(32px)',
              }}
            />
          </div>
        )}
        
        {/* Hero Banner black fade overlay - only for hero-banner */}
        {isHeroBanner && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: `linear-gradient(to right,
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 1) ${config.bannerBlackFade * 0.5}%,
                rgba(0, 0, 0, 0) ${config.bannerBlackFade}%
              )`,
            }}
          />
        )}
        
        {/* Button glass effect overlay */}
        {isButton && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1)',
            }}
          />
        )}
        
        {/* Grain overlay - controllable + visible across all modes (incl. Mesh) */}
        {config.grain && grainOpacity > 0 && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              opacity: grainOpacity,
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.35' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              backgroundSize: '160px 160px',
              mixBlendMode: 'soft-light',
              filter: 'contrast(150%) brightness(110%)',
              borderRadius: isButton ? '9999px' : undefined,
            }}
          />
        )}
      </div>
    </div>
  );
};
