import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Pause, Camera, RotateCcw, X, Moon, Sun } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { GradientConfig, isHeroBannerRatio, isButtonRatio } from '@/types/gradient';
import { useTheme } from '@/hooks/useTheme';

interface ControlPanelProps {
  config: GradientConfig;
  onConfigChange: (config: Partial<GradientConfig>) => void;
  isOpen: boolean;
  onToggle: () => void;
  onOpenButtonsPanel?: () => void;
}

const shapeOptions: { value: GradientConfig['type']; wireframe: boolean; label: string }[] = [
  { value: 'sphere', wireframe: false, label: 'Sphere' },
  { value: 'plane', wireframe: false, label: 'Plane' },
  { value: 'waterPlane', wireframe: false, label: 'Water' },
  { value: 'plane', wireframe: true, label: 'Mesh' },
];

const aspectRatioOptions: { value: GradientConfig['aspectRatio']; label: string; category?: string }[] = [
  { value: 'free', label: 'Free' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '2:3', label: '2:3' },
  { value: '3:2', label: '3:2' },
  { value: '4:5', label: '4:5' },
  { value: 'hero-banner', label: 'Hero Banner', category: 'web' },
  { value: 'small-banner', label: 'Small Banner', category: 'web' },
];

// Button color presets (hover uses black overlay, not different colors)
const buttonPresets = [
  { default: { color1: '#FDB515', color2: '#EC008C', color3: '#000000' } },
  { default: { color1: '#F2665F', color2: '#6A00F4', color3: '#000000' } },
  { default: { color1: '#00C2FF', color2: '#6A00F4', color3: '#000000' } },
  { default: { color1: '#EC008C', color2: '#FDB515', color3: '#000000' } },
];

// Brand color palette
const brandColors = [
  { name: 'Yellow Orange', hex: '#FDB515' },
  { name: 'Coral', hex: '#F2665F' },
  { name: 'Magenta', hex: '#EC008C' },
  { name: 'Deep Violet', hex: '#6A00F4' },
  { name: 'Electric Blue', hex: '#00C2FF' },
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
];

const colorPresets = [
  { name: 'Royal', color1: '#6A00F4', color2: '#EC008C', color3: '#000000' },
  { name: 'Sunset', color1: '#FDB515', color2: '#EC008C', color3: '#000000' },
  { name: 'Ocean', color1: '#00C2FF', color2: '#6A00F4', color3: '#000000' },
  { name: 'Coral', color1: '#F2665F', color2: '#6A00F4', color3: '#000000' },
  { name: 'Neon', color1: '#EC008C', color2: '#00C2FF', color3: '#000000' },
  { name: 'Electric', color1: '#00C2FF', color2: '#EC008C', color3: '#000000' },
  // Presets with white (10%)
  { name: 'Blush', color1: '#EC008C', color2: '#000000', color3: '#FFFFFF', weight1: 45, weight2: 45, weight3: 10 },
  { name: 'Violet', color1: '#EC008C', color2: '#6A00F4', color3: '#FFFFFF', weight1: 45, weight2: 45, weight3: 10 },
  { name: 'Salmon', color1: '#F2665F', color2: '#000000', color3: '#FFFFFF', weight1: 45, weight2: 45, weight3: 10 },
];

// Effect presets for each gradient type
const effectPresets: Record<string, Partial<GradientConfig>> = {
  mesh: {
    uStrength: 1,
    uDensity: 1,
    uFrequency: 1,
    colorWeight3: 60,
    colorWeight1: 20,
    colorWeight2: 20,
  },
  plane: {
    uStrength: 1.5,
    uDensity: 0.5,
    uFrequency: 1,
    colorWeight3: 50,
    colorWeight1: 25,
    colorWeight2: 25,
  },
  water: {
    uStrength: 1.5,
    uDensity: 1.5,
    uFrequency: 2,
    colorWeight3: 50,
    colorWeight1: 25,
    colorWeight2: 25,
  },
};

export const ControlPanel = ({ config, onConfigChange, isOpen, onToggle, onOpenButtonsPanel }: ControlPanelProps) => {
  const [internalTime, setInternalTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
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
                
                // Get effect preset key based on shape
                const getPresetKey = () => {
                  if (shape.label === 'Mesh') return 'mesh';
                  if (shape.label === 'Plane') return 'plane';
                  if (shape.label === 'Water') return 'water';
                  return null;
                };
                
                const handleShapeClick = () => {
                  const presetKey = getPresetKey();
                  const effectSettings = presetKey ? effectPresets[presetKey] : {};
                  onConfigChange({ 
                    type: shape.value, 
                    wireframe: shape.wireframe,
                    ...effectSettings
                  });
                };
                
                return (
                  <button
                    key={shape.label}
                    onClick={handleShapeClick}
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
              {aspectRatioOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onConfigChange({ aspectRatio: option.value })}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    config.aspectRatio === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              {/* Buttons toggle - next to Small Banner */}
              {onOpenButtonsPanel && (
                <button
                  onClick={onOpenButtonsPanel}
                  className="py-1.5 px-3 rounded-lg text-xs font-medium transition-all bg-accent text-accent-foreground hover:bg-accent/80"
                >
                  Buttons
                </button>
              )}
            </div>
            
            {/* Hero Banner Black Fade Control - only for hero-banner */}
            {isHeroBannerRatio(config.aspectRatio) && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Black Fade</Label>
                  <span className="text-xs text-muted-foreground">{config.bannerBlackFade}%</span>
                </div>
                <Slider
                  value={[config.bannerBlackFade]}
                  onValueChange={([value]) => onConfigChange({ bannerBlackFade: value })}
                  min={15}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground/70">
                  Left side will be solid black, then fade into the gradient
                </p>
              </div>
            )}
            
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
                    <span className="text-xs text-muted-foreground">{(config.meshNoiseScale ?? 1).toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[config.meshNoiseScale ?? 1]}
                    onValueChange={([value]) => onConfigChange({ meshNoiseScale: value })}
                    min={0.5}
                    max={3}
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
            <h3 className="font-display text-lg font-medium mb-4 text-foreground">
              {isButtonRatio(config.aspectRatio) 
                ? (config.buttonPreviewState === 'hover' ? 'Hover Colors' : 'Default Colors')
                : 'Colors'
              }
            </h3>
            {!isButtonRatio(config.aspectRatio) && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {colorPresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => onConfigChange({ 
                      color1: preset.color1, 
                      color2: preset.color2, 
                      color3: preset.color3,
                      ...(preset.weight1 !== undefined && {
                        colorWeight1: preset.weight1,
                        colorWeight2: preset.weight2,
                        colorWeight3: preset.weight3,
                      })
                    })}
                    className="relative h-12 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors group"
                    style={{
                      background: `linear-gradient(135deg, ${preset.color1} 0%, ${preset.color2} 50%, ${preset.color3} 100%)`,
                    }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium drop-shadow-md">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-4">
              {(() => {
                // Determine which color keys to use based on button state
                const isButton = isButtonRatio(config.aspectRatio);
                const isHoverState = isButton && config.buttonPreviewState === 'hover';
                const colorKeys = isHoverState 
                  ? (['hoverColor1', 'hoverColor2', 'hoverColor3'] as const)
                  : (['color1', 'color2', 'color3'] as const);
                
                return colorKeys.map((colorKey, index) => (
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
                ));
              })()}
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

        </div>
      </motion.div>
    </>
  );
};
