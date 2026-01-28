import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { GradientConfig, aspectRatioValues } from '@/types/gradient';

interface GradientCanvasProps {
  config: GradientConfig;
}

export const GradientCanvas = ({ config }: GradientCanvasProps) => {
  const isWireframe = config.wireframe === true;
  const isFrozen = config.frozenTime !== null;
  
  // Create a key that changes when colors/weights change to force re-render
  const colorKey = `${config.color1}-${config.color2}-${config.color3}-${config.colorWeight1}-${config.colorWeight2}-${config.colorWeight3}`;
  
  // Calculate aspect ratio container styles
  const getContainerStyle = () => {
    if (config.aspectRatio === 'free') {
      return { width: '100%', height: '100%' };
    }
    
    const ratio = aspectRatioValues[config.aspectRatio];
    if (!ratio) return { width: '100%', height: '100%' };
    
    // For landscape ratios, constrain by height
    // For portrait ratios, constrain by width
    if (ratio >= 1) {
      return {
        width: '100%',
        height: '100%',
        maxWidth: `calc(100vh * ${ratio})`,
        margin: '0 auto',
      };
    } else {
      return {
        width: '100%',
        height: '100%',
        maxHeight: `calc(100vw / ${ratio})`,
        margin: 'auto 0',
      };
    }
  };
  
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center">
      <div style={getContainerStyle()}>
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
            uAmplitude={isWireframe ? 1 : (config.animate ? 3.2 : 0.5)}
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
      </div>
    </div>
  );
};
