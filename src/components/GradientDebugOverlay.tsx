import { useState } from 'react';
import { GradientConfig } from '@/types/gradient';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';

interface GradientDebugOverlayProps {
  config: GradientConfig;
  visible?: boolean;
}

export function GradientDebugOverlay({ config, visible = true }: GradientDebugOverlayProps) {
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const activeMode = config.type === 'plane' && config.wireframe ? 'mesh' : (config.wireframe ? 'mesh' : config.type);
  const isMeshMode = activeMode === 'mesh' || activeMode === 'sphere' || activeMode === 'waterPlane';
  const isPlaneMode = activeMode === 'plane';
  
  // Compute gradient type int (same logic as shader)
  const typeToInt: Record<string, number> = {
    'mesh': 0, 'sphere': 1, 'plane': 2, 'waterPlane': 3,
    'conic': 4, 'glow': 5, 'waves': 6,
  };
  const uGradientType = typeToInt[activeMode] ?? 0;
  
  const colors = [
    { label: 'Base (Color 0)', color: config.color0, weight: config.colorWeight0 },
    { label: 'Color 1', color: config.color1, weight: config.colorWeight1 },
    { label: 'Color 2', color: config.color2, weight: config.colorWeight2 },
    { label: 'Color 3', color: config.color3, weight: config.colorWeight3 },
  ];
  
  if (config.color4) {
    colors.push({ label: 'Color 4', color: config.color4, weight: config.colorWeight4 });
  }
  
  // =========================================================================
  // DERIVED VALUES (match shader logic for debugging)
  // =========================================================================
  const blurFactor = (config.meshBlur ?? 50) / 100 * 0.5;
  const effectiveNoiseScale = Math.max(0.5, config.meshNoiseScale ?? 3.0) * 0.8;
  
  // Transition width calculation (from shader) - tighter values
  const baseTrans = uGradientType === 0 ? 0.08 : (isPlaneMode ? 0.008 : 0.08);
  const strengthMod = 1.0 + (config.uStrength ?? 2) * 0.2;
  const blurMult = uGradientType === 0 ? 0.15 : (isPlaneMode ? 0.14 : 0.15);
  let transitionWidth = (baseTrans + blurFactor * blurMult) / strengthMod;
  transitionWidth = Math.max(transitionWidth, 0.04);
  if (uGradientType === 0) {
    transitionWidth = Math.min(transitionWidth, 0.10);
  }
  
  // No overlap in new design
  const overlapFactor = 0;
  const histogramStretchEnabled = uGradientType === 0; // Only Mesh mode
  
  // Thresholds
  const threshold0 = config.colorWeight0;
  const threshold1 = config.colorWeight0 + config.colorWeight1;
  const threshold2 = threshold1 + config.colorWeight2;
  const threshold3 = threshold2 + config.colorWeight3;
  
  const handleCopy = async () => {
    const debugData = {
      config: {
        type: config.type,
        wireframe: config.wireframe,
        activeMode,
        colors: {
          color0: config.color0,
          color1: config.color1,
          color2: config.color2,
          color3: config.color3,
          color4: config.color4,
        },
        weights: {
          colorWeight0: config.colorWeight0,
          colorWeight1: config.colorWeight1,
          colorWeight2: config.colorWeight2,
          colorWeight3: config.colorWeight3,
          colorWeight4: config.colorWeight4,
        },
        animation: {
          animate: config.animate,
          speed: config.speed,
          frozenTime: config.frozenTime,
        },
        meshSettings: {
          meshBlur: config.meshBlur,
          meshNoiseScale: config.meshNoiseScale,
          meshStyle: config.meshStyle,
          meshStretch: config.meshStretch,
          meshFlowAngle: config.meshFlowAngle,
          meshCenterInward: config.meshCenterInward,
        },
        planeSettings: {
          planeAngle: config.planeAngle,
          planeRadial: config.planeRadial,
          planeWave: config.planeWave,
          planeSpread: config.planeSpread,
          planeOffsetX: config.planeOffsetX,
          planeOffsetY: config.planeOffsetY,
        },
        effects: {
          uStrength: config.uStrength,
          uDensity: config.uDensity,
          uFrequency: config.uFrequency,
          grain: config.grain,
          grainIntensity: config.grainIntensity,
        },
      },
      derived: {
        uGradientType,
        effectiveNoiseScale: effectiveNoiseScale.toFixed(3),
        transitionWidth: transitionWidth.toFixed(4),
        blendMode: isMeshMode ? 'Softmax Competitive' : 'Weighted Segments',
        thresholds: {
          T0: threshold0,
          T1: threshold1,
          T2: threshold2,
          T3: threshold3,
        },
      },
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
      setCopied(true);
      toast.success('Debug config copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };
  
  return (
    <div className="fixed top-20 left-6 bg-black/90 text-white p-4 rounded-lg text-xs font-mono space-y-2 max-w-xs z-[100] backdrop-blur-sm border border-white/20 shadow-2xl max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-white/30 pb-2 mb-2">
        <span className="text-sm font-bold">🎨 Gradient Debug Info</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] transition-colors"
          title="Copy config to clipboard"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* Type & Internal ID */}
      <div className="flex justify-between">
        <span className="text-white/60">Type:</span>
        <span className="text-cyan-400 uppercase">{activeMode}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/60">uGradientType:</span>
        <span className="text-cyan-400">{uGradientType}</span>
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
        <div className="text-white/50 text-[10px] mt-1">
          HasColor4: {config.color4 ? 'YES' : 'NO'}
        </div>
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
      
      {/* Derived Shader Values */}
      <div className="border-t border-white/20 pt-2 mt-2">
        <div className="text-white/80 mb-1">🔧 Derived (Shader Internal):</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
          {isMeshMode ? (
            <>
           <span className="text-white/60">Blend Mode:</span>
               <span className="text-purple-400">Radial Glow</span>
               <span className="text-white/60">Softness:</span>
               <span className="text-cyan-300">{(0.18 + (config.meshBlur ?? 50) / 100 * 0.47).toFixed(3)}</span>
               <span className="text-white/60">Glow Boost:</span>
               <span className="text-cyan-300">{(4.0 + (config.uStrength ?? 2) * 1.5).toFixed(1)}</span>
            </>
          ) : (
            <>
              <span className="text-white/60">Eff. Noise Scale:</span>
              <span className="text-cyan-300">{effectiveNoiseScale.toFixed(3)}</span>
              <span className="text-white/60">Transition Width:</span>
              <span className="text-cyan-300">{transitionWidth.toFixed(4)}</span>
            </>
          )}
          <span className="text-white/60">Blend Strategy:</span>
          <span className={isMeshMode ? 'text-green-400' : 'text-white/40'}>
            {isMeshMode ? 'Softmax (winner-take-all)' : 'Weighted Segments'}
          </span>
        </div>
      </div>
      
      {/* Shader Logic Summary */}
      <div className="border-t border-white/20 pt-2 mt-2 text-[10px] text-white/50">
        <div>Thresholds (cumulative):</div>
        <div className="text-cyan-300">
          T0: {threshold0}% | 
          T1: {threshold1}% | 
          T2: {threshold2}% | 
          T3: {threshold3}%
        </div>
      </div>
    </div>
  );
}
