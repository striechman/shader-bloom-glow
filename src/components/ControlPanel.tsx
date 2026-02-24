import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Sparkles, Save, Trash2, Type, ChevronDown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
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

const shapeOptions: { value: GradientConfig['type']; wireframe: boolean; label: string; presetKey: string; isPremium?: boolean; includesColors?: boolean }[] = [
  { value: 'glow', wireframe: false, label: 'Glow', presetKey: 'glow' },
  { value: 'plane', wireframe: false, label: 'Plane', presetKey: 'plane' },
  { value: 'plane', wireframe: true, label: 'Mesh', presetKey: 'mesh' },
  { value: 'plane', wireframe: true, label: 'Aura', presetKey: 'aura' },
  // Premium styles (include colors + engine settings)
  { value: 'plane', wireframe: true, label: 'Silk', presetKey: 'fluidSilk', isPremium: true, includesColors: true },
  { value: 'glow', wireframe: false, label: 'Edge', presetKey: 'ambientEdge', isPremium: true, includesColors: true },
  { value: 'plane', wireframe: false, label: 'Prism', presetKey: 'prismaticGlass', isPremium: true, includesColors: true },
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
const activeBrandColors = brandColors; // All brand colors including black & white

// Art-directed color presets organized by visual family
// Ordered by black-emergence contrast: Bold (sharp pop) → Warm (analogous flow) → Cool (atmospheric depth)
// Adjacent colors follow analogous harmony rules to prevent muddy midtones
const colorPresets: Array<{
  name: string; color1: string; color2: string; color3: string; color4: string | null; color5: string | null;
  weight0: number; weight1: number; weight2: number; weight3: number; weight4: number; weight5: number;
  recommendedFor: string[];
  fullPreset?: Partial<GradientConfig>; // Optional: also applies effect settings (full preset)
}> = [
  // === Bold / High Contrast (color pops sharply from black) ===
  { name: 'Golden', color1: '#FDB515', color2: '#EC008C', color3: '#6A00F4', color4: '#000000', color5: null, weight0: 40, weight1: 26, weight2: 13, weight3: 10, weight4: 12, weight5: 0, recommendedFor: ['glow', 'plane', 'waves'],
    fullPreset: {
      type: 'plane', planeSpread: 90, planeWave: 12, uStrength: 0.3, uFrequency: 1,
      planeOffsetX: -45, planeOffsetY: -35, planeAngle: 45, grain: true, grainIntensity: 4,
    },
  },
  { name: 'Neon', color1: '#EC008C', color2: '#6A00F4', color3: '#00C2FF', color4: '#000000', color5: null, weight0: 30, weight1: 25, weight2: 22, weight3: 13, weight4: 10, weight5: 0, recommendedFor: ['plane', 'sphere', 'conic'],
    fullPreset: {
      type: 'plane', planeSpread: 90, planeWave: 10, uStrength: 0.3, uFrequency: 1,
      planeAngle: 135, grain: true, grainIntensity: 3,
      meshBlur: 90, meshNoiseScale: 0.3, meshStyle: 'center' as const, meshWarpStrength: 1.2,
    },
  },
  { name: 'Electric', color1: '#00C2FF', color2: '#6A00F4', color3: '#EC008C', color4: '#FDB515', color5: '#000000', weight0: 30, weight1: 18, weight2: 16, weight3: 12, weight4: 14, weight5: 10, recommendedFor: ['conic', 'plane', 'sphere'],
    fullPreset: {
      type: 'plane', planeSpread: 90, planeWave: 10, uStrength: 0.3, uFrequency: 1,
      grain: true, grainIntensity: 3,
      meshBlur: 90, meshNoiseScale: 0.3, meshStyle: 'center' as const, meshWarpStrength: 1.2,
    },
  },
  // === Warm / Analogous (colors melt into each other) ===
  { name: 'Spotlight', color1: '#E8920D', color2: '#F06030', color3: '#EC008C', color4: null, color5: null, weight0: 55, weight1: 20, weight2: 15, weight3: 10, weight4: 0, weight5: 0, recommendedFor: ['glow'],
    fullPreset: {
      type: 'glow', glowOrbSize: 75, glowShadowDensity: 0, glowStyle: 'clustered',
      glowSpread: 70, glowOffsetX: -15, glowOffsetY: 0, glowDistortion: 50,
      uStrength: 1.5, uDensity: 1.0, uFrequency: 2.0,
      animate: false, speed: 0.2, frozenTime: 5.50, grain: false, grainIntensity: 5,
    },
  },
  { name: 'Sunset', color1: '#FF6B6B', color2: '#FDB515', color3: '#6A00F4', color4: '#000000', color5: null, weight0: 35, weight1: 17, weight2: 17, weight3: 17, weight4: 13, weight5: 0, recommendedFor: ['plane', 'waves'],
    fullPreset: {
      type: 'plane', planeAngle: 90, planeRadial: false,
      planeSpread: 60, planeWave: 0,
      animate: false, frozenTime: 3.0, grain: false,
    },
  },
  { name: 'Ember', color1: '#F2665F', color2: '#EC008C', color3: '#FDB515', color4: '#6A00F4', color5: '#000000', weight0: 28, weight1: 20, weight2: 18, weight3: 16, weight4: 10, weight5: 8, recommendedFor: ['glow', 'waves', 'sphere'],
    fullPreset: {
      type: 'glow', glowOrbSize: 65, glowShadowDensity: 0,
      uStrength: 1.2, uDensity: 1.0, uFrequency: 2.5,
      animate: false, speed: 0.2, frozenTime: 4.50, grain: true, grainIntensity: 5,
    },
  },
  // === Cool / Atmospheric (deep, lots of black) ===
  { name: 'Ocean', color1: '#00C2FF', color2: '#6A00F4', color3: '#EC008C', color4: null, color5: null, weight0: 40, weight1: 28, weight2: 20, weight3: 12, weight4: 0, weight5: 0, recommendedFor: ['waterPlane', 'waves', 'plane'] },
  { name: 'Royal', color1: '#6A00F4', color2: '#EC008C', color3: '#00C2FF', color4: null, color5: null, weight0: 35, weight1: 30, weight2: 20, weight3: 15, weight4: 0, weight5: 0, recommendedFor: ['waves', 'plane', 'conic'] },
  { name: 'Dusk', color1: '#6A00F4', color2: '#EC008C', color3: '#F2665F', color4: null, color5: null, weight0: 50, weight1: 22, weight2: 16, weight3: 12, weight4: 0, weight5: 0, recommendedFor: ['waves', 'glow', 'waterPlane', 'conic', 'plane'] },
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
    meshStyle: 'center',
    meshStretch: false,
    speed: 0.4,
    grain: false,
  },
  mesh: {
    // Soft Light Blobs - large, soft radial lights
    uStrength: 2.0,
    uDensity: 1.0,
    uFrequency: 3.0,
    meshNoiseScale: 0.3,
    meshBlur: 70,
    meshStyle: 'center',
    meshStretch: false,
    meshWarpStrength: 1.2,
    speed: 0.3,
    grain: false,
    grainIntensity: 5,
  },
  // AURA: Centered radial glow with inward pull - replaces Aurora
  aura: {
    type: 'plane', wireframe: true, meshStyle: 'center', meshCenterInward: true,
    meshBlur: 95, meshNoiseScale: 0.3, meshWarpStrength: 1.5, meshStretch: false,
    uStrength: 2.0, uDensity: 1.0, uFrequency: 2.0,
    speed: 0.15,
    grain: false,
    grainIntensity: 5,
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
    grainIntensity: 5,
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
    grainIntensity: 5,
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
    grainIntensity: 5,
  },
  glow: {
    uStrength: 1.5,
    uDensity: 1.0,
    uFrequency: 2,
    glowOrbSize: 60,
    glowShadowDensity: 0,
    glowStyle: 'scattered',
    glowSpread: 50,
    glowOffsetX: 0,
    glowOffsetY: 0,
    glowDistortion: 40,
    meshStretch: false,
    speed: 0.25,
    grain: false,
    grainIntensity: 5,
  },
  waves: {
    uStrength: 1,
    uDensity: 1.2,
    uFrequency: 1.5,
    wavesCount: 5,
    wavesAmplitude: 50,
    wavesAngle: 0,
    meshStretch: false,
    speed: 0.25,
    grain: false,
    grainIntensity: 5,
  },
  // Premium styles (include colors + weights + full engine config)
  cognitiveAura: {
    type: 'plane', wireframe: true, meshStyle: 'center', meshCenterInward: true,
    meshBlur: 95, meshNoiseScale: 0.3, meshWarpStrength: 1.5, meshStretch: false,
    uStrength: 2.0, uDensity: 1.0, uFrequency: 2.0,
    animate: true, speed: 0.15, grain: false, grainIntensity: 5,
    color1: '#EC008C', color2: '#6A00F4', color3: '#000000', color4: null,
    colorWeight0: 65, colorWeight1: 20, colorWeight2: 15, colorWeight3: 0, colorWeight4: 0,
  },
  fluidSilk: {
    type: 'plane', wireframe: true, meshStyle: 'flow', meshFlowAngle: 30,
    meshBlur: 80, meshNoiseScale: 0.3, meshWarpStrength: 2.0, meshStretch: false,
    uStrength: 1.5, uDensity: 0.8, uFrequency: 1.5,
    animate: true, speed: 0.1, grain: false, grainIntensity: 5,
    color1: '#00C2FF', color2: '#EC008C', color3: '#6A00F4', color4: null,
    colorWeight0: 40, colorWeight1: 25, colorWeight2: 20, colorWeight3: 15, colorWeight4: 0,
  },
  ambientEdge: {
    type: 'glow', glowOrbSize: 85, glowShadowDensity: 0, glowStyle: 'scattered' as const,
    glowSpread: 90, glowOffsetX: 0, glowOffsetY: 0, glowDistortion: 30,
    uStrength: 1.0, uDensity: 0.8, uFrequency: 1.5,
    animate: true, speed: 0.15, grain: false, grainIntensity: 5,
    meshStretch: false,
    color1: '#F2665F', color2: '#FDB515', color3: '#6A00F4', color4: null,
    colorWeight0: 55, colorWeight1: 20, colorWeight2: 15, colorWeight3: 10, colorWeight4: 0,
  },
  prismaticGlass: {
    type: 'plane', planeAngle: 45, planeRadial: false,
    planeSpread: 80, planeWave: 0, wireframe: false, meshStretch: false,
    uStrength: 1.0, uDensity: 0.5, uFrequency: 1.0,
    animate: true, speed: 0.2, grain: false, grainIntensity: 5,
    color1: '#FDB515', color2: '#EC008C', color3: '#6A00F4', color4: '#00C2FF',
    colorWeight0: 85, colorWeight1: 5, colorWeight2: 4, colorWeight3: 3, colorWeight4: 3,
  },
};

export const ControlPanel = ({ config, onConfigChange, isOpen, onToggle, onOpenButtonsPanel }: ControlPanelProps) => {
  const isMobile = useIsMobile();
  const [internalTime, setInternalTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [activePremiumStyle, setActivePremiumStyle] = useState<string | null>(null);
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
    const hasColor5 = config.color5 !== null;
    const oldRemaining = 100 - config.colorWeight0;
    const targetRemaining = 100 - newWeight0;

    if (targetRemaining <= 0) {
      onConfigChange({
        colorWeight0: 100,
        colorWeight1: 0, colorWeight2: 0, colorWeight3: 0, colorWeight4: 0, colorWeight5: 0,
      });
      return;
    }

    const safeOldRemaining = Math.max(1, oldRemaining);
    const scale = targetRemaining / safeOldRemaining;

    const baseWeights = [
      config.colorWeight1, config.colorWeight2, config.colorWeight3,
      hasColor4 ? config.colorWeight4 : 0,
      hasColor5 ? config.colorWeight5 : 0,
    ];

    const activeCount = hasColor5 ? 5 : hasColor4 ? 4 : 3;
    const scaled = baseWeights.slice(0, activeCount).map((w) => Math.max(0, w * scale));

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
      colorWeight5: hasColor5 ? (ints[4] ?? 0) : 0,
    });
  };
  
  const handleColorWeightChange = (colorIndex: number, newValue: number) => {
    if (colorIndex === 0) return;
    
    const hasColor4 = config.color4 !== null;
    const hasColor5 = config.color5 !== null;
    const remainingWeight = 100 - config.colorWeight0;
    
    const weights = [
      config.colorWeight1, config.colorWeight2, config.colorWeight3,
      hasColor4 ? config.colorWeight4 : 0,
      hasColor5 ? config.colorWeight5 : 0,
    ];
    
    const activeCount = hasColor5 ? 5 : hasColor4 ? 4 : 3;
    const weightIndex = colorIndex - 1;
    
    const oldValue = weights[weightIndex];
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
    
    const total = newWeights.slice(0, activeCount).reduce((a, b) => a + b, 0);
    if (Math.abs(total - remainingWeight) > 0.5) {
      const correction = (remainingWeight - total) / activeCount;
      for (let i = 0; i < activeCount; i++) {
        newWeights[i] = Math.max(minOtherWeight, newWeights[i] + correction);
      }
    }
    
    const finalTotal = newWeights.slice(0, activeCount).reduce((a, b) => a + b, 0);
    if (finalTotal !== remainingWeight) {
      const needed = remainingWeight - finalTotal;
      if (newWeights[weightIndex] + needed >= minOtherWeight) {
        newWeights[weightIndex] += needed;
      } else {
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
      colorWeight4: Math.round(newWeights[3] || 0),
      colorWeight5: Math.round(newWeights[4] || 0),
    });
  };

  // Add 4th color
  const handleAddColor4 = () => {
    const remainingWeight = 100 - config.colorWeight0;
    const currentTotal = config.colorWeight1 + config.colorWeight2 + config.colorWeight3 + (config.color5 !== null ? config.colorWeight5 : 0);
    const newWeight4 = Math.round(remainingWeight * 0.15);
    const scale = (remainingWeight - newWeight4) / currentTotal;
    
    onConfigChange({
      color4: '#6A00F4',
      colorWeight1: Math.round(config.colorWeight1 * scale),
      colorWeight2: Math.round(config.colorWeight2 * scale),
      colorWeight3: Math.round(config.colorWeight3 * scale),
      colorWeight4: newWeight4,
      ...(config.color5 !== null ? { colorWeight5: Math.round(config.colorWeight5 * scale) } : {}),
    });
  };

  // Remove 4th color (also removes 5th if present)
  const handleRemoveColor4 = () => {
    const remainingWeight = 100 - config.colorWeight0;
    const currentTotal = config.colorWeight1 + config.colorWeight2 + config.colorWeight3;
    const scale = remainingWeight / currentTotal;
    
    onConfigChange({
      color4: null, color5: null,
      colorWeight1: Math.round(config.colorWeight1 * scale),
      colorWeight2: Math.round(config.colorWeight2 * scale),
      colorWeight3: Math.round(config.colorWeight3 * scale),
      colorWeight4: 0, colorWeight5: 0,
    });
  };

  // Add 5th color
  const handleAddColor5 = () => {
    const remainingWeight = 100 - config.colorWeight0;
    const currentTotal = config.colorWeight1 + config.colorWeight2 + config.colorWeight3 + config.colorWeight4;
    const newWeight5 = Math.round(remainingWeight * 0.12);
    const scale = (remainingWeight - newWeight5) / currentTotal;
    
    onConfigChange({
      color5: '#000000',
      colorWeight1: Math.round(config.colorWeight1 * scale),
      colorWeight2: Math.round(config.colorWeight2 * scale),
      colorWeight3: Math.round(config.colorWeight3 * scale),
      colorWeight4: Math.round(config.colorWeight4 * scale),
      colorWeight5: newWeight5,
    });
  };

  // Remove 5th color
  const handleRemoveColor5 = () => {
    const remainingWeight = 100 - config.colorWeight0;
    const currentTotal = config.colorWeight1 + config.colorWeight2 + config.colorWeight3 + config.colorWeight4;
    const scale = remainingWeight / currentTotal;
    
    onConfigChange({
      color5: null,
      colorWeight1: Math.round(config.colorWeight1 * scale),
      colorWeight2: Math.round(config.colorWeight2 * scale),
      colorWeight3: Math.round(config.colorWeight3 * scale),
      colorWeight4: Math.round(config.colorWeight4 * scale),
      colorWeight5: 0,
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
        config.colorWeight3, config.colorWeight4, config.colorWeight5
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
        colorWeight5: presetWeightsBeforeTextSafe[5] ?? 0,
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
        
        <div className={`p-5 md:p-6 space-y-6 ${isMobile ? 'pb-8' : 'pt-6'}`}>
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

          {/* ========== 0. OUTPUT FORMAT ========== */}
          <div className="rounded-xl bg-secondary/10 p-4 space-y-3">
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Output Format</h3>
            <div className="flex flex-wrap gap-1.5">
              {aspectRatioOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onConfigChange({ aspectRatio: option.value })}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    config.aspectRatio === option.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              {onOpenButtonsPanel && (
                <button
                  onClick={onOpenButtonsPanel}
                  className="py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all bg-accent text-accent-foreground hover:bg-accent/80"
                >
                  Buttons
                </button>
              )}
            </div>
            {isHeroBannerRatio(config.aspectRatio) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs">Black Fade</Label>
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
              </div>
            )}
          </div>

          {/* ========== 1. SHAPE & STYLE ========== */}
          <div className="rounded-xl bg-secondary/10 p-4 space-y-4">
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shape & Style</h3>
            
            {/* Shape Selection Grid */}
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {shapeOptions.filter(s => !s.isPremium).map((shape) => {
                  const isActive = activePremiumStyle === null && (
                    shape.label === 'Aura' 
                      ? config.type === 'plane' && config.wireframe && config.meshCenterInward === true
                      : shape.label === 'Mesh'
                        ? config.type === 'plane' && config.wireframe && !config.meshCenterInward
                        : config.type === shape.value && config.wireframe === shape.wireframe
                  );
                  
                  const handleShapeClick = () => {
                    setActivePremiumStyle(null);
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
                      className={`py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {shape.label}
                    </button>
                  );
                })}
              </div>
              {/* Premium Styles */}
              <div className="grid grid-cols-4 gap-2">
                {shapeOptions.filter(s => s.isPremium).map((shape) => {
                  const isActive = activePremiumStyle === shape.presetKey;
                  
                  const handleShapeClick = () => {
                    setActivePremiumStyle(shape.presetKey);
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
                      className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-accent text-accent-foreground hover:bg-accent/80'
                      }`}
                    >
                      {shape.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* === Effect-Specific Controls (contextual, inset style) === */}

            {/* Mesh Controls */}
            {isWireframeMode && (
              <div className="rounded-lg bg-secondary/20 p-2.5 space-y-2.5">
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Mesh Settings</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Blob Size</Label>
                    <span className="text-[10px] text-muted-foreground">{(config.meshNoiseScale ?? 1).toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[config.meshNoiseScale ?? 1]}
                    onValueChange={([value]) => onConfigChange({ meshNoiseScale: value })}
                    min={0.3}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Color Blur</Label>
                    <span className="text-[10px] text-muted-foreground">{config.meshBlur ?? 50}%</span>
                  </div>
                  <Slider
                    value={[config.meshBlur ?? 50]}
                    onValueChange={([value]) => onConfigChange({ meshBlur: value })}
                    min={50}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Style</Label>
                  <div className="flex gap-1.5">
                    {meshStylePresets.map((style) => {
                      const Icon = style.icon;
                      const isActive = config.meshStyle === style.value;
                      return (
                        <button
                          key={style.value}
                          onClick={() => onConfigChange({ meshStyle: style.value })}
                          className={`flex-1 py-1.5 px-1.5 rounded-md text-[10px] font-medium transition-all flex flex-col items-center gap-0.5 ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }`}
                          title={style.label}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{style.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {config.meshStyle === 'flow' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground text-xs">Flow Direction</Label>
                      <span className="text-[10px] text-muted-foreground">{config.meshFlowAngle ?? 45}°</span>
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
                {config.meshStyle === 'center' && (
                  <div className="flex items-center justify-between py-1">
                    <Label className="text-muted-foreground text-xs">
                      {config.meshCenterInward ? 'Inward' : 'Outward'}
                    </Label>
                    <Switch
                      checked={!config.meshCenterInward}
                      onCheckedChange={(checked) => onConfigChange({ meshCenterInward: !checked })}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Warp</Label>
                    <span className="text-[10px] text-muted-foreground">{(config.meshWarpStrength ?? 1.2).toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[config.meshWarpStrength ?? 1.2]}
                    onValueChange={([value]) => onConfigChange({ meshWarpStrength: value })}
                    min={0}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Plane Direction Controls */}
            {config.type === 'plane' && !config.wireframe && (
              <div className="rounded-lg bg-secondary/20 p-2.5 space-y-2.5">
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Direction</h4>
                <div className="flex gap-1.5">
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
                        className={`flex-1 py-1.5 px-1.5 rounded-md text-xs font-medium transition-all flex flex-col items-center gap-0.5 ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                        title={preset.label}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
                {!config.planeRadial && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground text-xs">Angle</Label>
                      <span className="text-[10px] text-muted-foreground">{config.planeAngle ?? 45}°</span>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5" />
                      Wave
                    </Label>
                    <span className="text-[10px] text-muted-foreground">{config.planeWave ?? 0}%</span>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Spread</Label>
                    <span className="text-[10px] text-muted-foreground">{config.planeSpread ?? 50}%</span>
                  </div>
                  <Slider
                    value={[config.planeSpread ?? 50]}
                    onValueChange={([value]) => onConfigChange({ planeSpread: value })}
                    min={70}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Scale</span>
                    <span className="text-[10px] text-muted-foreground">{config.planeScale ?? 100}%</span>
                  </div>
                  <Slider
                    value={[config.planeScale ?? 100]}
                    onValueChange={([value]) => onConfigChange({ planeScale: value })}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5" />
                    Position
                  </Label>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Horizontal</span>
                      <span className="text-[10px] text-muted-foreground">{config.planeOffsetX ?? 0}%</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Vertical</span>
                      <span className="text-[10px] text-muted-foreground">{config.planeOffsetY ?? 0}%</span>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Warp</Label>
                    <span className="text-[10px] text-muted-foreground">{(config.meshWarpStrength ?? 0).toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[config.meshWarpStrength ?? 0]}
                    onValueChange={([value]) => onConfigChange({ meshWarpStrength: value })}
                    min={0}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Conic Controls */}
            {isConicMode && (
              <div className="rounded-lg bg-secondary/20 p-2.5 space-y-2.5">
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Conic Settings</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5" />
                      Start Angle
                    </Label>
                    <span className="text-[10px] text-muted-foreground">{config.conicStartAngle ?? 0}°</span>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5" />
                      Spiral
                    </Label>
                    <span className="text-[10px] text-muted-foreground">{config.conicSpiral ?? 0}%</span>
                  </div>
                  <Slider
                    value={[config.conicSpiral ?? 0]}
                    onValueChange={([value]) => onConfigChange({ conicSpiral: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5" />
                    Center
                  </Label>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Horizontal</span>
                      <span className="text-[10px] text-muted-foreground">{config.conicOffsetX ?? 0}%</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Vertical</span>
                      <span className="text-[10px] text-muted-foreground">{config.conicOffsetY ?? 0}%</span>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Warp</Label>
                    <span className="text-[10px] text-muted-foreground">{(config.meshWarpStrength ?? 0).toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[config.meshWarpStrength ?? 0]}
                    onValueChange={([value]) => onConfigChange({ meshWarpStrength: value })}
                    min={0}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Glow Controls */}
            {isGlowMode && (
              <div className="rounded-lg bg-secondary/20 p-2.5 space-y-2.5">
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Glow Settings</h4>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Style</Label>
                  <div className="grid grid-cols-4 gap-1.5">
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
                          className={`py-1.5 px-1 rounded-md text-[10px] font-medium transition-all flex flex-col items-center gap-0.5 ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }`}
                          title={style.label}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{style.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Orb Size</Label>
                    <span className="text-[10px] text-muted-foreground">{config.glowOrbSize ?? 60}%</span>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Spread</Label>
                    <span className="text-[10px] text-muted-foreground">{config.glowSpread ?? 50}%</span>
                  </div>
                  <Slider
                    value={[config.glowSpread ?? 50]}
                    onValueChange={([value]) => onConfigChange({ glowSpread: value })}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Distortion</Label>
                    <span className="text-[10px] text-muted-foreground">{config.glowDistortion ?? 40}%</span>
                  </div>
                  <Slider
                    value={[config.glowDistortion ?? 40]}
                    onValueChange={([value]) => onConfigChange({ glowDistortion: value })}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Contrast</Label>
                    <span className="text-[10px] text-muted-foreground">{config.glowShadowDensity ?? 50}%</span>
                  </div>
                  <Slider
                    value={[config.glowShadowDensity ?? 50]}
                    onValueChange={([value]) => onConfigChange({ glowShadowDensity: value })}
                    min={0}
                    max={25}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5" />
                    Position
                  </Label>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Horizontal</span>
                      <span className="text-[10px] text-muted-foreground">{config.glowOffsetX ?? 0}%</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Vertical</span>
                      <span className="text-[10px] text-muted-foreground">{config.glowOffsetY ?? 0}%</span>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Warp</Label>
                    <span className="text-[10px] text-muted-foreground">{(config.meshWarpStrength ?? 0).toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[config.meshWarpStrength ?? 0]}
                    onValueChange={([value]) => onConfigChange({ meshWarpStrength: value })}
                    min={0}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Waves Controls */}
            {isWavesMode && (
              <div className="rounded-lg bg-secondary/20 p-2.5 space-y-2.5">
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Wave Settings</h4>
                <div className="flex gap-1.5">
                  {planeDirectionPresets.filter(p => !p.isRadial).map((preset) => {
                    const Icon = preset.icon;
                    const isActive = (config.wavesAngle ?? 0) === preset.angle;
                    return (
                      <button
                        key={preset.label}
                        onClick={() => onConfigChange({ wavesAngle: preset.angle })}
                        className={`flex-1 py-1.5 px-1.5 rounded-md text-xs font-medium transition-all flex flex-col items-center gap-0.5 ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                        title={preset.label}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Angle</Label>
                    <span className="text-[10px] text-muted-foreground">{config.wavesAngle ?? 0}°</span>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Wave Count</Label>
                    <span className="text-[10px] text-muted-foreground">{config.wavesCount ?? 5}</span>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Amplitude</Label>
                    <span className="text-[10px] text-muted-foreground">{config.wavesAmplitude ?? 50}%</span>
                  </div>
                  <Slider
                    value={[config.wavesAmplitude ?? 50]}
                    onValueChange={([value]) => onConfigChange({ wavesAmplitude: value })}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Warp</Label>
                    <span className="text-[10px] text-muted-foreground">{(config.meshWarpStrength ?? 0).toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[config.meshWarpStrength ?? 0]}
                    onValueChange={([value]) => onConfigChange({ meshWarpStrength: value })}
                    min={0}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Rotation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5" />
                  Rotation
                </Label>
                <span className="text-[10px] text-muted-foreground">{config.gradientRotation ?? 0}°</span>
              </div>
              <Slider
                value={[config.gradientRotation ?? 0]}
                onValueChange={([value]) => onConfigChange({ gradientRotation: value })}
                min={0}
                max={360}
                step={5}
                className="w-full"
              />
              <div className="flex gap-1 mt-0.5">
                {[0, 45, 90, 135, 180, 270].map((angle) => (
                  <button
                    key={angle}
                    onClick={() => onConfigChange({ gradientRotation: angle })}
                    className={`flex-1 py-1 px-0.5 rounded text-[10px] font-medium transition-all ${
                      (config.gradientRotation ?? 0) === angle
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {angle}°
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ========== 2. COLORS ========== */}
          <div className="rounded-xl bg-secondary/10 p-4 space-y-4">
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isButtonRatio(config.aspectRatio) 
                ? (config.buttonPreviewState === 'hover' ? 'Hover Colors' : 'Default Colors')
                : 'Colors'
              }
            </h3>
            {!isButtonRatio(config.aspectRatio) && (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  {[...colorPresets].sort((a, b) => {
                    const currentEffectKey = config.type === 'plane' && config.wireframe 
                      ? 'plane'
                      : config.type;
                    const aRec = a.recommendedFor.includes(currentEffectKey) ? 0 : 1;
                    const bRec = b.recommendedFor.includes(currentEffectKey) ? 0 : 1;
                    return aRec - bRec;
                  }).map((preset, index) => {
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
                            color5: preset.color5,
                            colorWeight0: preset.weight0,
                            colorWeight1: preset.weight1,
                            colorWeight2: preset.weight2,
                            colorWeight3: preset.weight3,
                            colorWeight4: preset.weight4,
                            colorWeight5: preset.weight5,
                            ...(preset.fullPreset || {}),
                          });
                          setIsTextSafe(false);
                          setPresetWeightsBeforeTextSafe(null);
                        }}
                        className="relative h-12 rounded-xl overflow-hidden border-2 border-border/50 hover:border-primary transition-all hover:scale-[1.02] group"
                        style={{
                          background: `linear-gradient(135deg, ${getThemeColor0(theme)} 0%, ${preset.color1} 30%, ${preset.color2} 60%, ${preset.color3} 100%)`,
                        }}
                      >
                        {isRecommended && (
                          <Sparkles className="absolute top-1 right-1 w-3 h-3 text-yellow-400 drop-shadow-md" />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium drop-shadow-lg">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Save Preset + Saved Presets */}
                <div>
                  {showSaveInput ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={savePresetName}
                        onChange={(e) => setSavePresetName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                        placeholder="Preset name..."
                        className="flex-1 px-2 py-1 rounded-lg text-xs bg-secondary text-foreground border border-border focus:outline-none focus:border-primary"
                        autoFocus
                      />
                      <button onClick={handleSavePreset} className="px-2 py-1 rounded-lg text-xs bg-primary text-primary-foreground">Save</button>
                      <button onClick={() => setShowSaveInput(false)} className="px-2 py-1 rounded-lg text-xs bg-secondary text-secondary-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSaveInput(true)}
                      className="w-full py-1 rounded-lg text-xs font-medium bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3 h-3" />
                      Save current
                    </button>
                  )}

                  {savedPresets.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-muted-foreground/60">My Presets</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {savedPresets.map((preset) => (
                          <div key={preset.id} className="relative group">
                            <button
                              onClick={() => handleLoadSavedPreset(preset)}
                              className="w-full h-8 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                              style={{
                                background: `linear-gradient(135deg, ${getThemeColor0(theme)} 0%, ${preset.config.color1} 35%, ${preset.config.color2} 65%, ${preset.config.color3} 100%)`,
                              }}
                            >
                              <span className="text-white text-[9px] font-medium drop-shadow-md">{preset.name}</span>
                            </button>
                            <button
                              onClick={() => deletePreset(preset.id)}
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-2 h-2" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="space-y-3">
              {/* Base Color Weight with Text Safe toggle */}
              <div className="space-y-2 py-3 px-3 rounded-xl bg-secondary/30">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-sm flex items-center gap-2">
                    <span 
                      className="w-5 h-5 rounded-md border border-border inline-block"
                      style={{ backgroundColor: getThemeColor0(theme) }}
                    />
                    Base ({isDark ? 'Black' : 'White'})
                  </Label>
                  <span className="text-xs font-medium text-muted-foreground">{config.colorWeight0}%</span>
                </div>
                <Slider
                  value={[config.colorWeight0]}
                  onValueChange={([value]) => handleBaseWeightChange(value)}
                  min={MIN_BASE_COLOR_WEIGHT}
                  max={100}
                  step={1}
                  className="w-full"
                />
                {/* Text Safe Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <Label className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Type className="w-4 h-4" />
                    Text Safe
                  </Label>
                  <Switch
                    checked={isTextSafe}
                    onCheckedChange={handleTextSafeToggle}
                  />
                </div>
                {isTextSafe && (
                  <p className="text-xs text-muted-foreground/70">
                    Base increased to 65% for better text contrast
                  </p>
                )}
              </div>

              {/* Color Pickers with Weights */}
              {[
                { key: 'color1', weightKey: 'colorWeight1', label: 'Color 1', weight: config.colorWeight1, color: isButtonRatio(config.aspectRatio) && config.buttonPreviewState === 'hover' ? config.hoverColor1 : config.color1 },
                { key: 'color2', weightKey: 'colorWeight2', label: 'Color 2', weight: config.colorWeight2, color: isButtonRatio(config.aspectRatio) && config.buttonPreviewState === 'hover' ? config.hoverColor2 : config.color2 },
                { key: 'color3', weightKey: 'colorWeight3', label: 'Color 3', weight: config.colorWeight3, color: isButtonRatio(config.aspectRatio) && config.buttonPreviewState === 'hover' ? config.hoverColor3 : config.color3 },
                ...(config.color4 !== null ? [{ key: 'color4', weightKey: 'colorWeight4', label: 'Color 4', weight: config.colorWeight4, color: config.color4 }] : []),
                ...(config.color5 !== null ? [{ key: 'color5', weightKey: 'colorWeight5', label: 'Color 5', weight: config.colorWeight5, color: config.color5 }] : []),
              ].map(({ key, weightKey, label, weight, color }, index) => (
                <div key={key} className="space-y-2 py-2 px-3 rounded-xl bg-secondary/20">
                  <div className="flex items-center gap-3">
                    <label className="relative w-7 h-7 rounded-lg overflow-hidden cursor-pointer border-2 border-border/50 hover:border-primary transition-colors flex-shrink-0">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => {
                          if (isButtonRatio(config.aspectRatio) && config.buttonPreviewState === 'hover') {
                            const hoverKey = key === 'color1' ? 'hoverColor1' : key === 'color2' ? 'hoverColor2' : 'hoverColor3';
                            onConfigChange({ [hoverKey]: e.target.value });
                          } else {
                            onConfigChange({ [key]: e.target.value });
                          }
                        }}
                        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                      />
                      <span className="block w-full h-full rounded-md" style={{ backgroundColor: color }} />
                    </label>
                    <span className="text-sm text-foreground font-medium flex-1">{label}</span>
                    <span className="text-xs font-medium text-muted-foreground w-8 text-right">{weight}%</span>
                  </div>
                  <div className="flex gap-2 pl-10 flex-wrap">
                    {activeBrandColors.map((brandColor) => (
                      <button
                        key={brandColor.hex}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isButtonRatio(config.aspectRatio) && config.buttonPreviewState === 'hover') {
                            const hoverKey = key === 'color1' ? 'hoverColor1' : key === 'color2' ? 'hoverColor2' : 'hoverColor3';
                            onConfigChange({ [hoverKey]: brandColor.hex });
                          } else {
                            onConfigChange({ [key]: brandColor.hex });
                          }
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 cursor-pointer ${
                          color.toUpperCase() === brandColor.hex.toUpperCase()
                            ? 'border-primary ring-2 ring-primary/30 scale-110' 
                            : brandColor.hex === '#000000' 
                              ? 'border-border/60 hover:border-border' 
                              : brandColor.hex === '#FFFFFF'
                                ? 'border-border/60 hover:border-border'
                                : 'border-border/30 hover:border-border'
                        }`}
                        style={{ backgroundColor: brandColor.hex }}
                        title={brandColor.name}
                      />
                    ))}
                  </div>
                  <Slider
                    value={[weight]}
                    onValueChange={([value]) => handleColorWeightChange(index + 1, value)}
                    min={5}
                    max={100 - config.colorWeight0 - 5 * (config.color5 !== null ? 4 : config.color4 !== null ? 3 : 2)}
                    step={1}
                    className="w-full"
                  />
                  {/* Remove button for Color 4 (only if no color5) */}
                  {key === 'color4' && config.color5 === null && (
                    <button
                      onClick={handleRemoveColor4}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                    >
                      <Minus className="w-3 h-3" /> Remove Color 4
                    </button>
                  )}
                  {/* Remove button for Color 5 */}
                  {key === 'color5' && (
                    <button
                      onClick={handleRemoveColor5}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                    >
                      <Minus className="w-3 h-3" /> Remove Color 5
                    </button>
                  )}
                </div>
              ))}

              {/* Add Color 4 button */}
              {config.color4 === null && !isButtonRatio(config.aspectRatio) && (
                <button
                  onClick={handleAddColor4}
                  className="w-full py-2 rounded-xl text-sm font-medium bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add 4th Color
                </button>
              )}
              {/* Add Color 5 button */}
              {config.color4 !== null && config.color5 === null && !isButtonRatio(config.aspectRatio) && (
                <button
                  onClick={handleAddColor5}
                  className="w-full py-2 rounded-xl text-sm font-medium bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add 5th Color
                </button>
              )}
            </div>
          </div>

          {/* ========== 3. ANIMATION ========== */}
          <div className="rounded-xl bg-secondary/10 p-4 space-y-4">
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Animation</h3>
            <div className="space-y-2.5">
              <div className="flex gap-1.5">
                <button
                  onClick={handleFreezeFrame}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    config.frozenTime === null
                      ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {config.frozenTime === null ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Play
                    </>
                  )}
                </button>
                <button
                  onClick={handleCaptureFrame}
                  className="py-1.5 px-2 rounded-lg text-xs font-medium transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-1.5"
                  title="Capture current frame"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetAnimation}
                  className="py-1.5 px-2 rounded-lg text-xs font-medium transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-1.5"
                  title="Reset animation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs">Timeline</Label>
                  <span className="text-[10px] text-muted-foreground">
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs">Speed</Label>
                  <span className="text-[10px] text-muted-foreground">{config.speed.toFixed(1)}</span>
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
          {/* ========== 4. FINE TUNE (collapsible) ========== */}
          <div className="rounded-xl bg-secondary/10 p-4">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full group">
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fine Tune</h3>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2.5 pt-3">
                {/* Grain */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Grain</Label>
                    <Switch
                      checked={config.grain}
                      onCheckedChange={(checked) => onConfigChange({ grain: checked })}
                    />
                  </div>
                  {config.grain && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground text-[10px]">Intensity</Label>
                        <span className="text-[10px] text-muted-foreground">{config.grainIntensity ?? 10}%</span>
                      </div>
                      <Slider
                        value={[config.grainIntensity ?? 10]}
                        onValueChange={([value]) => onConfigChange({ grainIntensity: value })}
                        min={0}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                {/* Strength */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Strength</Label>
                    <span className="text-[10px] text-muted-foreground">{config.uStrength.toFixed(1)}</span>
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

                {/* Density */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Density</Label>
                    <span className="text-[10px] text-muted-foreground">{config.uDensity.toFixed(1)}</span>
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

                {/* Frequency */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground text-xs">Frequency</Label>
                    <span className="text-[10px] text-muted-foreground">{config.uFrequency.toFixed(1)}</span>
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
              </CollapsibleContent>
            </Collapsible>
          </div>

        </div>
      </motion.div>
    </>
  );
};
