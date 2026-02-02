import { GradientConfig } from '@/types/gradient';

interface GradientDebugOverlayProps {
  config: GradientConfig;
  visible?: boolean;
}

export function GradientDebugOverlay({ config, visible = true }: GradientDebugOverlayProps) {
  if (!visible) return null;

  const activeMode = config.type === 'plane' && config.wireframe ? 'mesh' : config.type;
  const isMeshMode = activeMode === 'mesh' || activeMode === 'sphere' || activeMode === 'waterPlane';
  const isPlaneMode = activeMode === 'plane';
  
  const colors = [
    { label: 'Base (Color 0)', color: config.color0, weight: config.colorWeight0 },
    { label: 'Color 1', color: config.color1, weight: config.colorWeight1 },
    { label: 'Color 2', color: config.color2, weight: config.colorWeight2 },
    { label: 'Color 3', color: config.color3, weight: config.colorWeight3 },
  ];
  
  if (config.color4) {
    colors.push({ label: 'Color 4', color: config.color4, weight: config.colorWeight4 });
  }
  
  return (
    <div className="fixed top-20 left-6 bg-black/90 text-white p-4 rounded-lg text-xs font-mono space-y-2 max-w-xs z-[100] backdrop-blur-sm border border-white/20 shadow-2xl max-h-[70vh] overflow-y-auto">
      <div className="text-sm font-bold border-b border-white/30 pb-2 mb-2">
        🎨 Gradient Debug Info
      </div>
      
      {/* Type */}
      <div className="flex justify-between">
        <span className="text-white/60">Type:</span>
        <span className="text-cyan-400 uppercase">{activeMode}</span>
      </div>
      
      {/* Mesh Style */}
      {isMeshMode && (
        <div className="flex justify-between">
          <span className="text-white/60">Mesh Style:</span>
          <span className="text-purple-400">{config.meshStyle}</span>
        </div>
      )}
      
      {/* Colors */}
      <div className="border-t border-white/20 pt-2 mt-2">
        <div className="text-white/80 mb-1">Colors & Weights:</div>
        {colors.map((c, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <div 
              className="w-4 h-4 rounded border border-white/40 flex-shrink-0"
              style={{ backgroundColor: c.color }}
            />
            <span className="text-white/60 flex-1 truncate">{c.label}</span>
            <span className="text-yellow-400">{c.weight}%</span>
            <span className="text-white/40 text-[10px]">{c.color}</span>
          </div>
        ))}
      </div>
      
      {/* Animation */}
      <div className="border-t border-white/20 pt-2 mt-2">
        <div className="flex justify-between">
          <span className="text-white/60">Animate:</span>
          <span className={config.animate ? 'text-green-400' : 'text-red-400'}>
            {config.animate ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Speed:</span>
          <span className="text-white">{config.speed}</span>
        </div>
        {config.frozenTime !== null && (
          <div className="flex justify-between">
            <span className="text-white/60">Frozen Time:</span>
            <span className="text-orange-400">{config.frozenTime.toFixed(2)}</span>
          </div>
        )}
      </div>
      
      {/* Effects */}
      <div className="border-t border-white/20 pt-2 mt-2">
        <div className="text-white/80 mb-1">Effects:</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {isMeshMode ? (
            <>
              <span className="text-white/60">Mesh Blur:</span>
              <span className="text-white">{config.meshBlur ?? 50}</span>
              <span className="text-white/60">Noise Scale:</span>
              <span className="text-white">{config.meshNoiseScale ?? 1.0}</span>
              <span className="text-white/60">Mesh Stretch:</span>
              <span className={config.meshStretch ? 'text-green-400' : 'text-white/40'}>
                {config.meshStretch ? 'ON (Aurora)' : 'OFF'}
              </span>
            </>
          ) : null}

          {isPlaneMode ? (
            <>
              <span className="text-white/60">Plane Angle:</span>
              <span className="text-white">{config.planeAngle}</span>
              <span className="text-white/60">Plane Spread:</span>
              <span className="text-white">{config.planeSpread}</span>
              <span className="text-white/60">Plane Wave:</span>
              <span className="text-white">{config.planeWave}</span>
              <span className="text-white/60">Radial:</span>
              <span className={config.planeRadial ? 'text-green-400' : 'text-white/40'}>
                {config.planeRadial ? 'ON' : 'OFF'}
              </span>
            </>
          ) : null}

          <span className="text-white/60">Strength:</span>
          <span className="text-white">{config.uStrength}</span>
          <span className="text-white/60">Density:</span>
          <span className="text-white">{config.uDensity}</span>
          <span className="text-white/60">Frequency:</span>
          <span className="text-white">{config.uFrequency}</span>
          <span className="text-white/60">Grain:</span>
          <span className={config.grain ? 'text-green-400' : 'text-white/40'}>
            {config.grain ? `${config.grainIntensity}%` : 'OFF'}
          </span>
        </div>
      </div>
      
      {/* Shader Logic Summary */}
      <div className="border-t border-white/20 pt-2 mt-2 text-[10px] text-white/50">
        <div>Thresholds (cumulative):</div>
        <div className="text-cyan-300">
          T0: {config.colorWeight0}% | 
          T1: {config.colorWeight0 + config.colorWeight1}% | 
          T2: {config.colorWeight0 + config.colorWeight1 + config.colorWeight2}% | 
          T3: {config.colorWeight0 + config.colorWeight1 + config.colorWeight2 + config.colorWeight3}%
        </div>
      </div>
    </div>
  );
}
