import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

interface GradientConfig {
  type: 'sphere' | 'plane' | 'waterPlane';
  wireframe: boolean;
  animate: boolean;
  speed: number;
  color1: string;
  color2: string;
  color3: string;
  grain: boolean;
  uStrength: number;
  uDensity: number;
  uFrequency: number;
}

interface GradientCanvasProps {
  config: GradientConfig;
}

export const GradientCanvas = ({ config }: GradientCanvasProps) => {
  // When wireframe is on, use specific settings to keep the sphere shape visible
  const isWireframe = config.wireframe === true;
  
  return (
    <div className="absolute inset-0 z-0">
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
          animate={config.animate ? 'on' : 'off'}
          type={config.type}
          wireframe={isWireframe}
          shader="defaults"
          uTime={0}
          uSpeed={config.speed}
          uStrength={isWireframe ? 2 : config.uStrength}
          uDensity={isWireframe ? 1 : config.uDensity}
          uFrequency={isWireframe ? 3 : config.uFrequency}
          uAmplitude={config.animate ? 3.2 : 0.5}
          positionX={0}
          positionY={0}
          positionZ={0}
          rotationX={0}
          rotationY={10}
          rotationZ={50}
          color1={config.color1}
          color2={config.color2}
          color3={config.color3}
          reflection={isWireframe ? 0.3 : 0.1}
          cAzimuthAngle={180}
          cPolarAngle={115}
          cDistance={isWireframe ? 4 : (config.animate ? 3.6 : 4.5)}
          cameraZoom={1}
          lightType="3d"
          brightness={isWireframe ? 1.8 : 1.4}
          envPreset="city"
          grain={config.grain ? 'on' : 'off'}
          toggleAxis={false}
          zoomOut={false}
        />
      </ShaderGradientCanvas>
    </div>
  );
};
