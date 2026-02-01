import { Canvas } from '@react-three/fiber';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { GradientConfig, aspectRatioValues, isHeroBannerRatio, isButtonRatio } from '@/types/gradient';
import { Custom4ColorGradient } from './Custom4ColorGradient';
import { useMemo } from 'react';

interface GradientCanvasProps {
  config: GradientConfig;
}

export const GradientCanvas = ({ config }: GradientCanvasProps) => {
  const isButton = isButtonRatio(config.aspectRatio);
  const isFrozen = config.frozenTime !== null;
  const isStaticMode = isButton ? true : (!config.animate || isFrozen);
  const isHeroBanner = isHeroBannerRatio(config.aspectRatio);
  
  // Check if we should use 4-color mode (all custom shader types)
  const use4ColorMode = config.type === 'plane' || config.type === 'conic' || config.type === 'radialBurst' || config.type === 'spiral' || config.type === 'waves' || config.type === 'aurora' || config.wireframe;
  
  // Get current colors based on button preview state
  const currentColors = useMemo(() => {
    if (isButton && config.buttonPreviewState === 'hover') {
      return {
        color1: config.hoverColor1,
        color2: config.hoverColor2,
        color3: config.hoverColor3,
        color4: null, // Buttons don't support color4
      };
    }
    return {
      color1: config.color1,
      color2: config.color2,
      color3: config.color3,
      color4: config.color4,
    };
  }, [isButton, config.buttonPreviewState, config.color1, config.color2, config.color3, config.color4, config.hoverColor1, config.hoverColor2, config.hoverColor3]);
  
  // Calculate aspect ratio container styles
  const getContainerStyle = (): React.CSSProperties => {
    if (config.aspectRatio === 'free') {
      return { width: '100%', height: '100%', position: 'relative' };
    }
    
    const ratio = aspectRatioValues[config.aspectRatio];
    if (!ratio) return { width: '100%', height: '100%', position: 'relative' };
    
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
    
    if (ratio >= 1) {
      return {
        width: `min(100%, calc((100vh - 4rem) * ${ratio}))`,
        height: 'auto',
        aspectRatio: `${ratio}`,
        position: 'relative' as const,
      };
    } else {
      return {
        height: `min(100%, calc((100vw - 4rem) / ${ratio}))`,
        width: 'auto',
        aspectRatio: `${ratio}`,
        position: 'relative' as const,
      };
    }
  };
  
  const grainOpacity = config.grain ? (config.grainIntensity ?? 50) / 100 : 0;
  
  // Create config with current colors for the 4-color gradient
  const gradientConfig = useMemo(() => ({
    ...config,
    color0: config.color0,
    color1: currentColors.color1,
    color2: currentColors.color2,
    color3: currentColors.color3,
    color4: currentColors.color4,
    animate: isButton ? false : config.animate,
  }), [config, currentColors, isButton]);
  
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden p-4">
      <div
        style={getContainerStyle()}
        className="relative flex items-center justify-center"
      >
        {use4ColorMode ? (
          /* 4-color gradient for Mesh and Plane modes */
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
            <Custom4ColorGradient config={gradientConfig} />
          </Canvas>
        ) : (
          /* Original ShaderGradient for Sphere and Water modes (3 colors) */
          <ShaderGradientCanvas
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              borderRadius: isButton ? '9999px' : undefined,
            }}
          >
            <ShaderGradient
              type={config.type as 'sphere' | 'plane' | 'waterPlane'}
              animate={isButton ? 'off' : (isStaticMode ? 'off' : 'on')}
              uTime={isFrozen && config.frozenTime !== null ? config.frozenTime : 0}
              uSpeed={config.speed}
              uStrength={config.uStrength}
              uDensity={config.uDensity}
              uFrequency={config.uFrequency}
              color1={currentColors.color1}
              color2={currentColors.color2}
              color3={currentColors.color3}
              wireframe={false}
              grain={isButton ? 'off' : (config.grain ? 'on' : 'off')}
            />
          </ShaderGradientCanvas>
        )}
        
        {/* Hero Banner black fade overlay */}
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
        
        {/* Grain overlay for 4-color modes */}
        {use4ColorMode && config.grain && grainOpacity > 0 && (
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