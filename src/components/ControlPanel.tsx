import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Pause, Camera, RotateCcw, X, Moon, Sun, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { GradientConfig } from '@/types/gradient';
import { useTheme } from '@/hooks/useTheme';
import { WebAssetsPanel } from './WebAssetsPanel';

interface ControlPanelProps {
  config: GradientConfig;
  onConfigChange: (config: Partial<GradientConfig>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const shapeOptions: { value: GradientConfig['type']; wireframe: boolean; label: string }[] = [
  { value: 'sphere', wireframe: false, label: 'Sphere' },
  { value: 'plane', wireframe: false, label: 'Plane' },
  { value: 'waterPlane', wireframe: false, label: 'Water' },
  { value: 'plane', wireframe: true, label: 'Mesh' },
];

const aspectRatioOptions: GradientConfig['aspectRatio'][] = [
  'free', '1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '4:5'
];

// Brand color palette
const brandColors = [
  { name: 'Yellow Orange', hex: '#FDB515' },
  { name: 'Coral', hex: '#F25665' },
  { name: 'Magenta', hex: '#E71989' },
  { name: 'Deep Violet', hex: '#6A00F4' },
  { name: 'Electric Blue', hex: '#00C2FF' },
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
];

const colorPresets = [
  { color1: '#FDB515', color2: '#E71989', color3: '#000000' },
  { color1: '#F25665', color2: '#6A00F4', color3: '#000000' },
  { color1: '#E71989', color2: '#00C2FF', color3: '#000000' },
  { color1: '#6A00F4', color2: '#FDB515', color3: '#000000' },
  { color1: '#00C2FF', color2: '#F25665', color3: '#000000' },
  { color1: '#FDB515', color2: '#F25665', color3: '#000000' },
];

export const ControlPanel = ({ config, onConfigChange, isOpen, onToggle }: ControlPanelProps) => {
  const [internalTime, setInternalTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [isWebAssetsOpen, setIsWebAssetsOpen] = useState(false);
  
  // Track animation time for freeze frame
  useEffect(() => {
    if (config.animate && config.frozenTime === null) {
      const animate = (timestamp: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = timestamp;
        }
        const elapsed = (timestamp - startTimeRef.current) / 1000 * config.speed;
        setInternalTime(elapsed % 10); // Loop every 10 seconds
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [config.animate, config.frozenTime, config.speed]);

  const handleColorWeightChange = (colorIndex: number, newValue: number) => {
    const weights = [config.colorWeight1, config.colorWeight2, config.colorWeight3];
    const oldValue = weights[colorIndex];
    const diff = newValue - oldValue;
    
    const otherIndices = [0, 1, 2].filter(i => i !== colorIndex);
    const adjustment = diff / 2;
    
    const newWeights = weights.map((w, i) => {
      if (i === colorIndex) return newValue;
      return Math.max(5, Math.min(90, w - adjustment));
    });
    
    // Normalize to ensure sum = 100
    const total = newWeights.reduce((a, b) => a + b, 0);
    if (total !== 100) {
      const correction = (100 - total) / otherIndices.length;
      otherIndices.forEach(i => {
        newWeights[i] = Math.max(5, Math.min(90, newWeights[i] + correction));
      });
    }
    
    // Final normalization
    const finalTotal = newWeights.reduce((a, b) => a + b, 0);
    if (finalTotal !== 100) {
      newWeights[otherIndices[0]] += 100 - finalTotal;
    }
    
    onConfigChange({
      colorWeight1: Math.round(newWeights[0]),
      colorWeight2: Math.round(newWeights[1]),
      colorWeight3: Math.round(newWeights[2])
    });
  };

  const handleFreezeFrame = () => {
    if (config.frozenTime === null) {
      // Freeze at current time
      onConfigChange({ frozenTime: internalTime, animate: false });
    } else {
      // Unfreeze - resume animation
      startTimeRef.current = null;
      onConfigChange({ frozenTime: null, animate: true });
    }
  };

  const handleCaptureFrame = () => {
    onConfigChange({ frozenTime: internalTime, animate: false });
  };

  const handleTimelineChange = (value: number) => {
    onConfigChange({ frozenTime: value, animate: false });
  };

  const handleResetAnimation = () => {
    startTimeRef.current = null;
    setInternalTime(0);
    onConfigChange({ frozenTime: null, animate: true });
  };

  const isWireframeMode = config.wireframe;
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      {/* Panel */}
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: isOpen ? 0 : 400, opacity: isOpen ? 1 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-80 z-40 glass overflow-y-auto"
      >
        <div className="p-6 pt-6 space-y-8">
          {/* Panel Header with close button */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-foreground">Settings</h2>
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="w-5 h-5 text-foreground" />
              ) : (
                <Sun className="w-5 h-5 text-foreground" />
              )}
              <span className="text-sm font-medium text-foreground">
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            <Switch
              checked={!isDark}
              onCheckedChange={toggleTheme}
            />
          </div>

          {/* Shape Selection */}
          <div>
            <h3 className="font-display text-lg font-medium mb-4 text-foreground">Shape</h3>
            <div className="grid grid-cols-2 gap-2">
              {shapeOptions.map((shape) => {
                const isActive = config.type === shape.value && config.wireframe === shape.wireframe;
                return (
                  <button
                    key={shape.label}
                    onClick={() => onConfigChange({ type: shape.value, wireframe: shape.wireframe })}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {shape.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <h3 className="font-display text-lg font-medium mb-4 text-foreground">Aspect Ratio</h3>
            <div className="flex flex-wrap gap-2">
              {aspectRatioOptions.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => onConfigChange({ aspectRatio: ratio })}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    config.aspectRatio === ratio
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {ratio === 'free' ? 'Free' : ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Mesh Controls (only visible when Mesh is selected) */}
          {isWireframeMode && (
            <div>
              <h3 className="font-display text-lg font-medium mb-4 text-foreground">Mesh Gradient</h3>
              <div className="space-y-4">
                {/* Noise Scale - controls blob size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Blob Size</Label>
                    <span className="text-xs text-muted-foreground">{(config.meshNoiseScale ?? 3).toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[config.meshNoiseScale ?? 3]}
                    onValueChange={([value]) => onConfigChange({ meshNoiseScale: value })}
                    min={0.5}
                    max={8}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground/70">Lower = larger color areas, Higher = more detail</p>
                </div>
                
                {/* Blur - controls softness between colors */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Color Blur</Label>
                    <span className="text-xs text-muted-foreground">{config.meshBlur ?? 50}%</span>
                  </div>
                  <Slider
                    value={[config.meshBlur ?? 50]}
                    onValueChange={([value]) => onConfigChange({ meshBlur: value })}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground/70">Softness of transitions between colors</p>
                </div>
              </div>
            </div>
          )}

          {/* Colors */}
          <div>
            <h3 className="font-display text-lg font-medium mb-4 text-foreground">Colors</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {colorPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => onConfigChange(preset)}
                  className="h-12 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                  style={{
                    background: `linear-gradient(135deg, ${preset.color1} 0%, ${preset.color2} 50%, ${preset.color3} 100%)`,
                  }}
                />
              ))}
            </div>
            <div className="space-y-4">
              {(['color1', 'color2', 'color3'] as const).map((colorKey, index) => (
                <div key={colorKey}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-muted-foreground">Color {index + 1}</Label>
                    <span className="text-xs text-muted-foreground font-mono">
                      {[config.colorWeight1, config.colorWeight2, config.colorWeight3][index]}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {brandColors.map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => onConfigChange({ [colorKey]: color.hex })}
                        className={`w-8 h-8 rounded-lg transition-all border-2 ${
                          config[colorKey] === color.hex
                            ? 'border-primary scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background'
                            : 'border-border hover:scale-105 hover:border-muted-foreground'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <Slider
                    value={[[config.colorWeight1, config.colorWeight2, config.colorWeight3][index]]}
                    onValueChange={([value]) => handleColorWeightChange(index, value)}
                    min={5}
                    max={90}
                    step={1}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Animation / Freeze Frame */}
          <div>
            <h3 className="font-display text-lg font-medium mb-4 text-foreground">Animation</h3>
            <div className="space-y-4">
              {/* Play/Pause/Capture Controls */}
              <div className="flex gap-2">
                <button
                  onClick={handleFreezeFrame}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    config.frozenTime === null
                      ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {config.frozenTime === null ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Play
                    </>
                  )}
                </button>
                <button
                  onClick={handleCaptureFrame}
                  className="py-2 px-3 rounded-lg text-sm font-medium transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-2"
                  title="Capture current frame"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetAnimation}
                  className="py-2 px-3 rounded-lg text-sm font-medium transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-2"
                  title="Reset animation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Timeline Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Timeline</Label>
                  <span className="text-xs text-muted-foreground">
                    {(config.frozenTime ?? internalTime).toFixed(1)}s
                  </span>
                </div>
                <Slider
                  value={[config.frozenTime ?? internalTime]}
                  onValueChange={([value]) => handleTimelineChange(value)}
                  min={0}
                  max={10}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Speed Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Speed</Label>
                  <span className="text-xs text-muted-foreground">{config.speed.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.speed]}
                  onValueChange={([value]) => onConfigChange({ speed: value })}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Effects */}
          <div>
            <h3 className="font-display text-lg font-medium mb-4 text-foreground">Effects</h3>
            <div className="space-y-6">
              {/* Grain with intensity slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Grain</Label>
                  <Switch
                    checked={config.grain}
                    onCheckedChange={(checked) => onConfigChange({ grain: checked })}
                  />
                </div>
                {config.grain && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground text-xs">Intensity</Label>
                      <span className="text-xs text-muted-foreground">{config.grainIntensity ?? 50}%</span>
                    </div>
                    <Slider
                      value={[config.grainIntensity ?? 50]}
                      onValueChange={([value]) => onConfigChange({ grainIntensity: value })}
                      min={5}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Strength</Label>
                  <span className="text-xs text-muted-foreground">{config.uStrength.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.uStrength]}
                  onValueChange={([value]) => onConfigChange({ uStrength: value })}
                  min={0}
                  max={5}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Density</Label>
                  <span className="text-xs text-muted-foreground">{config.uDensity.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.uDensity]}
                  onValueChange={([value]) => onConfigChange({ uDensity: value })}
                  min={0}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Frequency</Label>
                  <span className="text-xs text-muted-foreground">{config.uFrequency.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.uFrequency]}
                  onValueChange={([value]) => onConfigChange({ uFrequency: value })}
                  min={0}
                  max={10}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Web Assets Section */}
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setIsWebAssetsOpen(!isWebAssetsOpen)}
              className="flex items-center justify-between w-full py-2 text-left"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="font-display text-lg font-medium text-foreground">Web Assets</h3>
              </div>
              {isWebAssetsOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            <p className="text-xs text-muted-foreground mb-3">
              Generate banners and gradient buttons
            </p>
            {isWebAssetsOpen && (
              <div className="mt-4">
                <WebAssetsPanel />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};
