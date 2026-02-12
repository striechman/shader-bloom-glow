import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Sparkles, Save, Trash2, Type } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Pause, Camera, RotateCcw, X, Moon, Sun, ArrowRight, ArrowDown, ArrowDownRight, ArrowDownLeft, Circle, Waves, Target, Move, RotateCw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { GradientConfig, isHeroBannerRatio, isButtonRatio, getThemeColor0 } from '@/types/gradient';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePresets } from '@/hooks/usePresets';


// Plane direction presets
const planeDirectionPresets = [
  { angle: 0, label: 'Horizontal', icon: ArrowRight },
  { angle: 90, label: 'Vertical', icon: ArrowDown },
  { angle: 45, label: 'Diagonal', icon: ArrowDownRight },
  { angle: 135, label: 'Diagonal Rev', icon: ArrowDownLeft },
  { angle: -1, label: 'Radial', icon: Circle, isRadial: true },
];

// Mesh style presets
const meshStylePresets = [
  { value: 'organic' as const, label: 'Organic', icon: Circle },
  { value: 'flow' as const, label: 'Flow', icon: Waves },
  { value: 'center' as const, label: 'Center', icon: Target },
];

interface ControlPanelProps {
  config: GradientConfig;
  onConfigChange: (config: Partial<GradientConfig>) => void;
  isOpen: boolean;
  onToggle: () => void;
  onOpenButtonsPanel?: () => void;
}

const shapeOptions: { value: GradientConfig['type']; wireframe: boolean; label: string; presetKey: string }[] = [
  { value: 'glow', wireframe: false, label: 'Glow', presetKey: 'glow' },
  { value: 'plane', wireframe: false, label: 'Plane', presetKey: 'plane' },
  { value: 'plane', wireframe: true, label: 'Mesh', presetKey: 'mesh' },
  { value: 'plane', wireframe: true, label: 'Aurora', presetKey: 'aurora' },
  { value: 'waves', wireframe: false, label: 'Waves', presetKey: 'waves' },
  { value: 'conic', wireframe: false, label: 'Conic', presetKey: 'conic' },
  { value: 'sphere', wireframe: false, label: 'Sphere', presetKey: 'sphere' },
  { value: 'waterPlane', wireframe: false, label: 'Water', presetKey: 'water' },
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

// Brand colors (for UI selection)
// Rule: Presets must use at least 2 colors from the first 5 (non-black/white)
const activeBrandColors = brandColors.slice(0, 5); // Yellow, Coral, Magenta, Violet, Blue

// Art-directed color presets organized by visual family
// Ordered by black-emergence contrast: Bold (sharp pop) → Warm (analogous flow) → Cool (atmospheric depth)
// Adjacent colors follow analogous harmony rules to prevent muddy midtones
const colorPresets = [
  // === Bold / High Contrast (color pops sharply from black) ===
  { name: 'Golden', color1: '#FDB515', color2: '#EC008C', color3: '#6A00F4', color4: null, weight0: 40, weight1: 32, weight2: 16, weight3: 12, weight4: 0, recommendedFor: ['glow', 'plane', 'waves'] },
  { name: 'Neon', color1: '#EC008C', color2: '#00C2FF', color3: '#6A00F4', color4: null, weight0: 30, weight1: 30, weight2: 25, weight3: 15, weight4: 0, recommendedFor: ['sphere', 'conic', 'plane'] },
  { name: 'Electric', color1: '#00C2FF', color2: '#EC008C', color3: '#FDB515', color4: null, weight0: 30, weight1: 28, weight2: 24, weight3: 18, weight4: 0, recommendedFor: ['conic', 'plane', 'sphere'] },
  // === Warm / Analogous (colors melt into each other) ===
  { name: 'Sunset', color1: '#FDB515', color2: '#F2665F', color3: '#EC008C', color4: null, weight0: 30, weight1: 28, weight2: 24, weight3: 18, weight4: 0, recommendedFor: ['glow', 'plane', 'waterPlane'] },
  { name: 'Ember', color1: '#F2665F', color2: '#EC008C', color3: '#FDB515', color4: '#6A00F4', weight0: 35, weight1: 25, weight2: 20, weight3: 12, weight4: 8, recommendedFor: ['glow', 'waves', 'sphere'] },
  { name: 'Coral', color1: '#F2665F', color2: '#FDB515', color3: '#6A00F4', color4: null, weight0: 35, weight1: 30, weight2: 22, weight3: 13, weight4: 0, recommendedFor: ['waterPlane', 'sphere', 'plane'] },
  // === Cool / Atmospheric (deep, lots of black) ===
  { name: 'Ocean', color1: '#00C2FF', color2: '#6A00F4', color3: '#EC008C', color4: null, weight0: 40, weight1: 28, weight2: 20, weight3: 12, weight4: 0, recommendedFor: ['waterPlane', 'waves', 'plane'] },
  { name: 'Royal', color1: '#6A00F4', color2: '#EC008C', color3: '#00C2FF', color4: null, weight0: 35, weight1: 30, weight2: 20, weight3: 15, weight4: 0, recommendedFor: ['waves', 'plane', 'conic'] },
  { name: 'Dusk', color1: '#6A00F4', color2: '#EC008C', color3: '#F2665F', color4: null, weight0: 50, weight1: 22, weight2: 16, weight3: 12, weight4: 0, recommendedFor: ['waves', 'glow', 'waterPlane'] },
];

// Complete effect presets for each gradient type - resets ALL relevant settings
// BRANDING RULE: Color0 is FIXED at 30%. Color1-3 must sum to 70%.
// Effect presets - ONLY parameters, NOT colors (colors are preserved when switching effects)
const effectPresets: Record<string, Partial<GradientConfig>> = {
  sphere: {
    uStrength: 4,
    uDensity: 1.3,
    uFrequency: 5.5,
    meshNoiseScale: 3.0,
    meshBlur: 50,
    meshStyle: 'organic',
    meshStretch: false,
    speed: 0.4,
    grain: false,
  },
  mesh: {
    // Soft Light Blobs - large, soft radial lights
    uStrength: 2.0,
    uDensity: 1.0,
    uFrequency: 3.0,
    meshNoiseScale: 1.5,
    meshBlur: 70,
    meshStyle: 'organic',
    meshStretch: false,
    speed: 0.3,
    grain: false,
  },
  // AURORA: Stretched curtain effect - vertical light columns
  aurora: {
    uStrength: 0.5,
    uDensity: 1.0,
    uFrequency: 2.0,
    meshNoiseScale: 0.6,
    meshBlur: 95,
    meshStyle: 'organic',
    meshStretch: true,  // Creates vertical curtain shapes
    speed: 0.15,
    grain: true,
    grainIntensity: 10,
  },
  plane: {
    uStrength: 1.5,
    uDensity: 0.5,
    uFrequency: 1,
    planeAngle: 45,
    planeRadial: false,
    planeWave: 0,
    planeSpread: 50,
    meshStretch: false,
    speed: 0.4,
    grain: false,
  },
  water: {
    uStrength: 1.5,
    uDensity: 1.5,
    uFrequency: 2,
    meshNoiseScale: 2.0,
    meshBlur: 70,
    meshStretch: false,
    speed: 0.3,
    grain: false,
  },
  conic: {
    uStrength: 1,
    uDensity: 0.5,
    uFrequency: 1,
    conicStartAngle: 0,
    conicSpiral: 0,
    meshStretch: false,
    speed: 0.4,
    grain: false,
  },
  glow: {
    uStrength: 1.5,
    uDensity: 1.0,
    uFrequency: 2,
    glowOrbSize: 60,
    glowShadowDensity: 50,
    glowStyle: 'scattered',
    glowSpread: 50,
    glowOffsetX: 0,
    glowOffsetY: 0,
    glowDistortion: 40,
    meshStretch: false,
    speed: 0.25,
    grain: false,
  },
  waves: {
    uStrength: 1,
    uDensity: 1.2,
    uFrequency: 1.5,
    wavesCount: 5,
    wavesAmplitude: 50,
    wavesAngle: 0, // Horizontal direction
    meshStretch: false,
    speed: 0.25,
    grain: false,
  },
};

export const ControlPanel = ({ config, onConfigChange, isOpen, onToggle, onOpenButtonsPanel }: ControlPanelProps) => {
  const isMobile = useIsMobile();
  const [internalTime, setInternalTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [isTextSafe, setIsTextSafe] = useState(false);
  const [presetWeightsBeforeTextSafe, setPresetWeightsBeforeTextSafe] = useState<number[] | null>(null);
  const { presets: savedPresets, savePreset, loadPreset, deletePreset } = usePresets();
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  
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

  // BRANDING RULE: Base color (black/white) must always be at least 30%
  const MIN_BASE_COLOR_WEIGHT = 30;
  
  // Handler for base color (Color0) weight changes - scales other colors proportionally
  const handleBaseWeightChange = (newWeight0: number) => {
    const hasColor4 = config.color4 !== null;
    const oldRemaining = 100 - config.colorWeight0;
    const targetRemaining = 100 - newWeight0;

    // If targetRemaining = 0, all other colors become 0
    if (targetRemaining <= 0) {
      onConfigChange({
        colorWeight0: 100,
        colorWeight1: 0,
        colorWeight2: 0,
        colorWeight3: 0,
        colorWeight4: 0,
      });
      return;
    }

    // Safety: if oldRemaining is 0 (should only happen at 100%), just reset proportionally
    const safeOldRemaining = Math.max(1, oldRemaining);
    const scale = targetRemaining / safeOldRemaining;

    // Scale as floats first
    const baseWeights = [
      config.colorWeight1,
      config.colorWeight2,
      config.colorWeight3,
      hasColor4 ? config.colorWeight4 : 0,
    ];

    const activeCount = hasColor4 ? 4 : 3;
    const scaled = baseWeights.slice(0, activeCount).map((w) => Math.max(0, w * scale));

    // Integer rounding while preserving exact sum == targetRemaining
    const floors = scaled.map((v) => Math.floor(v));
    let sum = floors.reduce((a, b) => a + b, 0);
    let remainder = targetRemaining - sum;

    const fracs = scaled
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);

    const ints = [...floors];
    for (let k = 0; k < remainder; k++) {
      ints[fracs[k % fracs.length].i] += 1;
    }

    // If rounding overshoots (shouldn't), trim from smallest frac
    sum = ints.reduce((a, b) => a + b, 0);
    if (sum > targetRemaining) {
      let extra = sum - targetRemaining;
      const asc = [...fracs].reverse();
      for (const { i } of asc) {
        if (extra <= 0) break;
        const canDrop = Math.min(extra, ints[i]);
        ints[i] -= canDrop;
        extra -= canDrop;
      }
    }

    onConfigChange({
      colorWeight0: newWeight0,
      colorWeight1: ints[0] ?? 0,
      colorWeight2: ints[1] ?? 0,
      colorWeight3: ints[2] ?? 0,
      colorWeight4: hasColor4 ? (ints[3] ?? 0) : 0,
    });
  };
  
  const handleColorWeightChange = (colorIndex: number, newValue: number) => {
    // colorIndex 1 = Color1, 2 = Color2, 3 = Color3, 4 = Color4
    // Color0 is handled by handleBaseWeightChange
    
    if (colorIndex === 0) {
      return;
    }
    
    const hasColor4 = config.color4 !== null;
    const remainingWeight = 100 - config.colorWeight0; // e.g., 70% when Color0 is 30%
    
    // Current weights for Color1-4
    const weights = [
      config.colorWeight1, 
      config.colorWeight2, 
      config.colorWeight3,
      hasColor4 ? config.colorWeight4 : 0
    ];
    
    const activeCount = hasColor4 ? 4 : 3; // Only Color1-3 or Color1-4
    const weightIndex = colorIndex - 1; // Convert to 0-indexed for weights array
    
    const oldValue = weights[weightIndex];
    const diff = newValue - oldValue;
    
    // Ensure new value doesn't exceed remaining weight minus minimums for other colors
    const minOtherWeight = 5;
    const maxForThisColor = remainingWeight - (minOtherWeight * (activeCount - 1));
    newValue = Math.min(newValue, maxForThisColor);
    newValue = Math.max(newValue, minOtherWeight);
    
    const actualDiff = newValue - oldValue;
    const otherIndices = Array.from({ length: activeCount }, (_, i) => i).filter(i => i !== weightIndex);
    const adjustment = actualDiff / otherIndices.length;
    
    const newWeights = weights.map((w, i) => {
      if (i >= activeCount) return 0;
      if (i === weightIndex) return newValue;
      return Math.max(minOtherWeight, w - adjustment);
    });
    
    // Normalize to ensure sum = remainingWeight (e.g., 70%)
    const total = newWeights.slice(0, activeCount).reduce((a, b) => a + b, 0);
    if (Math.abs(total - remainingWeight) > 0.5) {
      const correction = (remainingWeight - total) / activeCount;
      for (let i = 0; i < activeCount; i++) {
        newWeights[i] = Math.max(minOtherWeight, newWeights[i] + correction);
      }
    }
    
    // Final adjustment to hit exact target
    const finalTotal = newWeights.slice(0, activeCount).reduce((a, b) => a + b, 0);
    if (finalTotal !== remainingWeight) {
      // Adjust the changed color to absorb rounding
      const needed = remainingWeight - finalTotal;
      if (newWeights[weightIndex] + needed >= minOtherWeight) {
        newWeights[weightIndex] += needed;
      } else {
        // Find another color that can absorb
        for (let i = 0; i < activeCount; i++) {
          if (newWeights[i] + needed >= minOtherWeight) {
            newWeights[i] += needed;
            break;
          }
        }
      }
    }
    
    onConfigChange({
      colorWeight1: Math.round(newWeights[0]),
      colorWeight2: Math.round(newWeights[1]),
      colorWeight3: Math.round(newWeights[2]),
      colorWeight4: Math.round(newWeights[3] || 0)
    });
  };

  // Add 4th color
  const handleAddColor4 = () => {
    // Redistribute weights among Color1-4, keeping Color0 fixed
    const remainingWeight = 100 - config.colorWeight0; // e.g., 70%
    const currentTotal = config.colorWeight1 + config.colorWeight2 + config.colorWeight3;
    const newWeight4 = Math.round(remainingWeight * 0.2); // Give color4 ~20% of remaining
    const scale = (remainingWeight - newWeight4) / currentTotal;
    
    onConfigChange({
      color4: '#6A00F4', // Default to Deep Violet
      // Color0 stays fixed
      colorWeight1: Math.round(config.colorWeight1 * scale),
      colorWeight2: Math.round(config.colorWeight2 * scale),
      colorWeight3: Math.round(config.colorWeight3 * scale),
      colorWeight4: newWeight4
    });
  };

  // Remove 4th color
  const handleRemoveColor4 = () => {
    // Redistribute color4's weight among Color1-3, keeping Color0 fixed
    const remainingWeight = 100 - config.colorWeight0; // e.g., 70%
    const currentTotal = config.colorWeight1 + config.colorWeight2 + config.colorWeight3;
    const scale = remainingWeight / currentTotal;
    
    onConfigChange({
      color4: null,
      // Color0 stays fixed
      colorWeight1: Math.round(config.colorWeight1 * scale),
      colorWeight2: Math.round(config.colorWeight2 * scale),
      colorWeight3: Math.round(config.colorWeight3 * scale),
      colorWeight4: 0
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

  const handleTextSafeToggle = (enabled: boolean) => {
    setIsTextSafe(enabled);
    if (enabled) {
      // Save current weights so we can restore
      setPresetWeightsBeforeTextSafe([
        config.colorWeight0, config.colorWeight1, config.colorWeight2, 
        config.colorWeight3, config.colorWeight4
      ]);
      // Force base to 65%, redistribute remaining 35% proportionally
      handleBaseWeightChange(65);
    } else if (presetWeightsBeforeTextSafe) {
      // Restore previous weights
      onConfigChange({
        colorWeight0: presetWeightsBeforeTextSafe[0],
        colorWeight1: presetWeightsBeforeTextSafe[1],
        colorWeight2: presetWeightsBeforeTextSafe[2],
        colorWeight3: presetWeightsBeforeTextSafe[3],
        colorWeight4: presetWeightsBeforeTextSafe[4],
      });
      setPresetWeightsBeforeTextSafe(null);
    }
  };

  const handleSavePreset = () => {
    if (savePresetName.trim()) {
      savePreset(savePresetName.trim(), config);
      setSavePresetName('');
      setShowSaveInput(false);
    }
  };

  const handleLoadSavedPreset = (preset: typeof savedPresets[0]) => {
    const presetConfig = loadPreset(preset);
    onConfigChange(presetConfig);
    setIsTextSafe(false);
    setPresetWeightsBeforeTextSafe(null);
  };

  const isWireframeMode = config.wireframe;
  const isConicMode = config.type === 'conic';
  const isGlowMode = config.type === 'glow';
  const isWavesMode = config.type === 'waves';
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      {/* Backdrop overlay - closes panel on click */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 z-30 bg-black/20"
          />
        )}
      </AnimatePresence>
      
      {/* Panel - slides from right on all devices */}
      <motion.div
        initial={false}
        animate={isOpen ? { x: 0, opacity: 1 } : { x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed z-40 glass overflow-y-auto top-0 right-0 h-full ${
          isMobile ? 'w-[85vw] max-w-80' : 'w-80'
        }`}
        style={!isOpen ? { pointerEvents: 'none' } : undefined}
      >
        
        <div className={`p-4 md:p-6 space-y-6 ${isMobile ? 'pb-8' : 'pt-6 space-y-8'}`}>
          {/* Panel Header with close button */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg md:text-xl font-semibold text-foreground">Settings</h2>
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
                // Aurora and Mesh share same type+wireframe but differ by meshStretch
                const isActive = shape.label === 'Aurora' 
                  ? config.type === 'plane' && config.wireframe && config.meshStretch === true
                  : shape.label === 'Mesh'
                    ? config.type === 'plane' && config.wireframe && !config.meshStretch
                    : config.type === shape.value && config.wireframe === shape.wireframe;
                
                const handleShapeClick = () => {
                  const effectSettings = effectPresets[shape.presetKey] || {};
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

          {/* Mesh Controls (only visible when Mesh/Aurora is selected) */}
          {isWireframeMode && (
            <div>
              <h3 className="font-display text-lg font-medium mb-4 text-foreground">Mesh Gradient</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Blob Size</Label>
                    <span className="text-xs text-muted-foreground">{(config.meshNoiseScale ?? 1).toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[config.meshNoiseScale ?? 1]}
                    onValueChange={([value]) => onConfigChange({ meshNoiseScale: value })}
                    min={0.3}
                    max={3}
                    step={0.05}
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
                
                {/* Mesh Style Selection */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Style</Label>
                  <div className="flex gap-2">
                    {meshStylePresets.map((style) => {
                      const Icon = style.icon;
                      const isActive = config.meshStyle === style.value;
                      
                      return (
                        <button
                          key={style.value}
                          onClick={() => onConfigChange({ meshStyle: style.value })}
                          className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }`}
                          title={style.label}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{style.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Flow Direction (only when Flow style is selected) */}
                {config.meshStyle === 'flow' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground">Flow Direction</Label>
                      <span className="text-xs text-muted-foreground">{config.meshFlowAngle ?? 45}°</span>
                    </div>
                    <Slider
                      value={[config.meshFlowAngle ?? 45]}
                      onValueChange={([value]) => onConfigChange({ meshFlowAngle: value })}
                      min={0}
                      max={360}
                      step={15}
                      className="w-full"
                    />
                  </div>
                )}
                
                {/* Center Mode (only when Center style is selected) */}
                {config.meshStyle === 'center' && (
                  <div className="flex items-center justify-between py-2">
                    <Label className="text-muted-foreground">
                      {config.meshCenterInward ? 'Inward (center dark)' : 'Outward (center bright)'}
                    </Label>
                    <Switch
                      checked={!config.meshCenterInward}
                      onCheckedChange={(checked) => onConfigChange({ meshCenterInward: !checked })}
                    />
                  </div>
                )}
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
              <>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {colorPresets.map((preset, index) => {
                    const currentEffectKey = config.type === 'plane' && config.wireframe 
                      ? 'plane'
                      : config.type;
                    const isRecommended = preset.recommendedFor.includes(currentEffectKey);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          onConfigChange({ 
                            color1: preset.color1, 
                            color2: preset.color2, 
                            color3: preset.color3,
                            color4: preset.color4,
                            colorWeight0: preset.weight0,
                            colorWeight1: preset.weight1,
                            colorWeight2: preset.weight2,
                            colorWeight3: preset.weight3,
                            colorWeight4: preset.weight4,
                          });
                          setIsTextSafe(false);
                          setPresetWeightsBeforeTextSafe(null);
                        }}
                        className="relative h-12 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors group"
                        style={{
                          background: `linear-gradient(135deg, ${getThemeColor0(theme)} 0%, ${preset.color1} 30%, ${preset.color2} 60%, ${preset.color3} 100%)`,
                        }}
                      >
                        {isRecommended && (
                          <Sparkles className="absolute top-1 right-1 w-3 h-3 text-yellow-400 drop-shadow-md" />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium drop-shadow-md">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Save Preset + Saved Presets */}
                <div className="mb-4">
                  {showSaveInput ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={savePresetName}
                        onChange={(e) => setSavePresetName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                        placeholder="Preset name..."
                        className="flex-1 px-2 py-1.5 rounded-lg text-xs bg-secondary text-foreground border border-border focus:outline-none focus:border-primary"
                        autoFocus
                      />
                      <button onClick={handleSavePreset} className="px-2 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground">Save</button>
                      <button onClick={() => setShowSaveInput(false)} className="px-2 py-1.5 rounded-lg text-xs bg-secondary text-secondary-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSaveInput(true)}
                      className="w-full py-1.5 rounded-lg text-xs font-medium bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3 h-3" />
                      Save current
                    </button>
                  )}

                  {/* Saved presets */}
                  {savedPresets.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground/60">My Presets</p>
                      <div className="grid grid-cols-3 gap-2">
                        {savedPresets.map((preset) => (
                          <div key={preset.id} className="relative group">
                            <button
                              onClick={() => handleLoadSavedPreset(preset)}
                              className="w-full h-10 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                              style={{
                                background: `linear-gradient(135deg, ${getThemeColor0(theme)} 0%, ${preset.config.color1} 35%, ${preset.config.color2} 65%, ${preset.config.color3} 100%)`,
                              }}
                            >
                              <span className="text-white text-[10px] font-medium drop-shadow-md">{preset.name}</span>
                            </button>
                            <button
                              onClick={() => deletePreset(preset.id)}
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="space-y-4">
              {/* Base Color Weight with Text Safe toggle */}
              <div className="space-y-2 py-2 px-3 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <span 
                      className="w-4 h-4 rounded border border-border inline-block"
                      style={{ backgroundColor: getThemeColor0(theme) }}
                    ></span>
                    {isDark ? 'Black' : 'White'} (base)
                  </Label>
                  <span className="text-xs text-foreground font-mono">
                    {config.colorWeight0}%
                  </span>
                </div>
                <Slider
                  value={[config.colorWeight0]}
                  onValueChange={([value]) => {
                    handleBaseWeightChange(value);
                    if (isTextSafe && value < 65) setIsTextSafe(false);
                  }}
                  min={30}
                  max={100}
                  step={1}
                  className="w-full"
                />
                {/* Text Safe Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Type className="w-3.5 h-3.5" />
                    Text Safe
                  </Label>
                  <Switch
                    checked={isTextSafe}
                    onCheckedChange={handleTextSafeToggle}
                  />
                </div>
                <p className="text-xs text-muted-foreground/70">
                  {isTextSafe ? 'Optimized for text readability (65% base)' : 'Toggle for presentation/banner backgrounds'}
                </p>
              </div>
              
              {(() => {
                // Determine which color keys to use based on button state
                const isButton = isButtonRatio(config.aspectRatio);
                const isHoverState = isButton && config.buttonPreviewState === 'hover';
                
                // For regular gradients, show 3 colors + optional 4th
                // For buttons, only show 3 hover colors (no 4th color support for buttons)
                const colorKeys = isHoverState 
                  ? (['hoverColor1', 'hoverColor2', 'hoverColor3'] as const)
                  : (['color1', 'color2', 'color3'] as const);
                
                const weights = [config.colorWeight1, config.colorWeight2, config.colorWeight3];
                
                return (
                  <>
                    {colorKeys.map((colorKey, index) => (
                      <div key={colorKey}>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-muted-foreground">Color {index + 1}</Label>
                          <span className="text-xs text-muted-foreground font-mono">
                            {weights[index]}%
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
                          value={[weights[index]]}
                          onValueChange={([value]) => handleColorWeightChange(index + 1, value)}
                          min={5}
                          max={60}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    ))}
                    
                    {/* Color 4 - Optional (only for non-button modes) */}
                    {!isButton && (
                      <>
                        {config.color4 !== null ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-muted-foreground flex items-center gap-2">
                                Color 4
                                <button
                                  onClick={handleRemoveColor4}
                                  className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                                  title="Remove Color 4"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                              </Label>
                              <span className="text-xs text-muted-foreground font-mono">
                                {config.colorWeight4}%
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {brandColors.map((color) => (
                                <button
                                  key={color.hex}
                                  onClick={() => onConfigChange({ color4: color.hex })}
                                  className={`w-8 h-8 rounded-lg transition-all border-2 ${
                                    config.color4 === color.hex
                                      ? 'border-primary scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background'
                                      : 'border-border hover:scale-105 hover:border-muted-foreground'
                                  }`}
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                />
                              ))}
                            </div>
                            <Slider
                              value={[config.colorWeight4]}
                              onValueChange={([value]) => handleColorWeightChange(4, value)}
                              min={5}
                              max={60}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={handleAddColor4}
                            className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Color 4
                          </button>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Plane Direction Controls (only visible when Plane is selected) */}
          {config.type === 'plane' && !config.wireframe && (
            <div>
              <h3 className="font-display text-lg font-medium mb-4 text-foreground">Plane Direction</h3>
              <div className="space-y-4">
                {/* Direction Preset Buttons */}
                <div className="flex gap-2">
                  {planeDirectionPresets.map((preset) => {
                    const Icon = preset.icon;
                    const isActive = preset.isRadial 
                      ? config.planeRadial 
                      : !config.planeRadial && config.planeAngle === preset.angle;
                    
                    return (
                      <button
                        key={preset.label}
                        onClick={() => {
                          if (preset.isRadial) {
                            onConfigChange({ planeRadial: true });
                          } else {
                            onConfigChange({ planeAngle: preset.angle, planeRadial: false });
                          }
                        }}
                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                        title={preset.label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
                
                {/* Angle Slider (only when not radial) */}
                {!config.planeRadial && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground">Angle</Label>
                      <span className="text-xs text-muted-foreground">{config.planeAngle ?? 45}°</span>
                    </div>
                    <Slider
                      value={[config.planeAngle ?? 45]}
                      onValueChange={([value]) => onConfigChange({ planeAngle: value })}
                      min={0}
                      max={360}
                      step={5}
                      className="w-full"
                    />
                  </div>
                )}
                
                
                {/* Wave Effect */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Waves className="w-4 h-4" />
                      Wave
                    </Label>
                    <span className="text-xs text-muted-foreground">{config.planeWave ?? 0}%</span>
                  </div>
                  <Slider
                    value={[config.planeWave ?? 0]}
                    onValueChange={([value]) => onConfigChange({ planeWave: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                {/* Spread Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Spread</Label>
                    <span className="text-xs text-muted-foreground">{config.planeSpread ?? 50}%</span>
                  </div>
                  <Slider
                    value={[config.planeSpread ?? 50]}
                    onValueChange={([value]) => onConfigChange({ planeSpread: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground/70">Low = sharp edges, High = soft blend</p>
                </div>
                
                {/* Offset Controls (only when radial or multi-center) */}
                {config.planeRadial && (
                  <div className="space-y-3">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Move className="w-4 h-4" />
                      Position Offset
                    </Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Horizontal</span>
                        <span className="text-xs text-muted-foreground">{config.planeOffsetX ?? 0}%</span>
                      </div>
                      <Slider
                        value={[config.planeOffsetX ?? 0]}
                        onValueChange={([value]) => onConfigChange({ planeOffsetX: value })}
                        min={-50}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Vertical</span>
                        <span className="text-xs text-muted-foreground">{config.planeOffsetY ?? 0}%</span>
                      </div>
                      <Slider
                        value={[config.planeOffsetY ?? 0]}
                        onValueChange={([value]) => onConfigChange({ planeOffsetY: value })}
                        min={-50}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conic Gradient Controls (only visible when Conic is selected) */}
          {isConicMode && (
            <div>
              <h3 className="font-display text-lg font-medium mb-4 text-foreground">Conic Gradient</h3>
              <div className="space-y-4">
                {/* Start Angle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <RotateCw className="w-4 h-4" />
                      Start Angle
                    </Label>
                    <span className="text-xs text-muted-foreground">{config.conicStartAngle ?? 0}°</span>
                  </div>
                  <Slider
                    value={[config.conicStartAngle ?? 0]}
                    onValueChange={([value]) => onConfigChange({ conicStartAngle: value })}
                    min={0}
                    max={360}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                {/* Spiral Effect */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Waves className="w-4 h-4" />
                      Spiral
                    </Label>
                    <span className="text-xs text-muted-foreground">{config.conicSpiral ?? 0}%</span>
                  </div>
                  <Slider
                    value={[config.conicSpiral ?? 0]}
                    onValueChange={([value]) => onConfigChange({ conicSpiral: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground/70">Add a spiral twist to the gradient</p>
                </div>
                
                {/* Position Offset */}
                <div className="space-y-3">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Move className="w-4 h-4" />
                    Center Offset
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Horizontal</span>
                      <span className="text-xs text-muted-foreground">{config.conicOffsetX ?? 0}%</span>
                    </div>
                    <Slider
                      value={[config.conicOffsetX ?? 0]}
                      onValueChange={([value]) => onConfigChange({ conicOffsetX: value })}
                      min={-50}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Vertical</span>
                      <span className="text-xs text-muted-foreground">{config.conicOffsetY ?? 0}%</span>
                    </div>
                    <Slider
                      value={[config.conicOffsetY ?? 0]}
                      onValueChange={([value]) => onConfigChange({ conicOffsetY: value })}
                      min={-50}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Glow Controls */}
          {isGlowMode && (
            <div>
              <h3 className="font-display text-lg font-medium mb-4 text-foreground">Glow</h3>
              <div className="space-y-4">
                {/* Style Presets */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Style</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { value: 'scattered' as const, label: 'Scatter', icon: Target },
                      { value: 'clustered' as const, label: 'Cluster', icon: Circle },
                      { value: 'diagonal' as const, label: 'Diagonal', icon: ArrowDownRight },
                      { value: 'ring' as const, label: 'Ring', icon: RotateCw },
                    ]).map((style) => {
                      const Icon = style.icon;
                      const isActive = (config.glowStyle ?? 'scattered') === style.value;
                      return (
                        <button
                          key={style.value}
                          onClick={() => onConfigChange({ glowStyle: style.value })}
                          className={`py-2 px-1 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }`}
                          title={style.label}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[10px]">{style.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Orb Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Orb Size</Label>
                    <span className="text-xs text-muted-foreground">{config.glowOrbSize ?? 60}%</span>
                  </div>
                  <Slider
                    value={[config.glowOrbSize ?? 60]}
                    onValueChange={([value]) => onConfigChange({ glowOrbSize: value })}
                    min={20}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Spread */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Spread</Label>
                    <span className="text-xs text-muted-foreground">{config.glowSpread ?? 50}%</span>
                  </div>
                  <Slider
                    value={[config.glowSpread ?? 50]}
                    onValueChange={([value]) => onConfigChange({ glowSpread: value })}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground/70">How far apart the light orbs are</p>
                </div>

                {/* Distortion */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Distortion</Label>
                    <span className="text-xs text-muted-foreground">{config.glowDistortion ?? 40}%</span>
                  </div>
                  <Slider
                    value={[config.glowDistortion ?? 40]}
                    onValueChange={([value]) => onConfigChange({ glowDistortion: value })}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground/70">Organic wobble on orb shapes</p>
                </div>
                
                {/* Contrast / Depth */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Contrast</Label>
                    <span className="text-xs text-muted-foreground">{config.glowShadowDensity ?? 50}%</span>
                  </div>
                  <Slider
                    value={[config.glowShadowDensity ?? 50]}
                    onValueChange={([value]) => onConfigChange({ glowShadowDensity: value })}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Position Offset */}
                <div className="space-y-3">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Move className="w-4 h-4" />
                    Position
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Horizontal</span>
                      <span className="text-xs text-muted-foreground">{config.glowOffsetX ?? 0}%</span>
                    </div>
                    <Slider
                      value={[config.glowOffsetX ?? 0]}
                      onValueChange={([value]) => onConfigChange({ glowOffsetX: value })}
                      min={-50}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Vertical</span>
                      <span className="text-xs text-muted-foreground">{config.glowOffsetY ?? 0}%</span>
                    </div>
                    <Slider
                      value={[config.glowOffsetY ?? 0]}
                      onValueChange={([value]) => onConfigChange({ glowOffsetY: value })}
                      min={-50}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Waves Controls */}
          {isWavesMode && (
            <div>
              <h3 className="font-display text-lg font-medium mb-4 text-foreground">Waves</h3>
              <div className="space-y-4">
                {/* Direction Preset Buttons */}
                <div className="flex gap-2">
                  {planeDirectionPresets.filter(p => !p.isRadial).map((preset) => {
                    const Icon = preset.icon;
                    const isActive = (config.wavesAngle ?? 0) === preset.angle;
                    
                    return (
                      <button
                        key={preset.label}
                        onClick={() => onConfigChange({ wavesAngle: preset.angle })}
                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                        title={preset.label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
                
                {/* Angle Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Angle</Label>
                    <span className="text-xs text-muted-foreground">{config.wavesAngle ?? 0}°</span>
                  </div>
                  <Slider
                    value={[config.wavesAngle ?? 0]}
                    onValueChange={([value]) => onConfigChange({ wavesAngle: value })}
                    min={0}
                    max={360}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                {/* Wave Count */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Wave Count</Label>
                    <span className="text-xs text-muted-foreground">{config.wavesCount ?? 5}</span>
                  </div>
                  <Slider
                    value={[config.wavesCount ?? 5]}
                    onValueChange={([value]) => onConfigChange({ wavesCount: value })}
                    min={2}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                {/* Amplitude */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Amplitude</Label>
                    <span className="text-xs text-muted-foreground">{config.wavesAmplitude ?? 50}%</span>
                  </div>
                  <Slider
                    value={[config.wavesAmplitude ?? 50]}
                    onValueChange={([value]) => onConfigChange({ wavesAmplitude: value })}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground/70">Wave height intensity</p>
                </div>
              </div>
            </div>
          )}

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
