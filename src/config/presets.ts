/**
 * Built-in Gradient Presets
 * 
 * These presets are designed to showcase the capabilities of the gradient engine
 * and provide quick-start templates for common visual styles.
 * 
 * All presets follow the color hierarchy: Color0 (base) + brand colors
 */

import { GradientConfig } from '@/types/gradient';

export interface BuiltInPreset {
  id: string;
  name: string;
  nameHe?: string;  // Hebrew name
  description: string;
  category: 'dark' | 'light' | 'vibrant' | 'minimal';
  config: Partial<GradientConfig>;
}

// ============================================================
// DARK MODE PRESETS - Optimized for dark backgrounds
// ============================================================

export const PRESET_DARK_SUNRISE: BuiltInPreset = {
  id: 'dark-sunrise',
  name: 'Dark Sunrise',
  nameHe: 'זריחה כהה',
  description: 'Diagonal gradient with violet to coral transition on deep black',
  category: 'dark',
  config: {
    type: 'plane',
    
    // Colors: dominant black, transition to violet then coral
    color0: '#000000',
    color1: '#6A00F4',  // Deep Violet
    color2: '#F2665F',  // Coral
    color3: '#00C2FF',  // Electric Blue (edge accent)
    color4: null,
    
    // Weights: black takes almost half the screen
    colorWeight0: 45,
    colorWeight1: 25,
    colorWeight2: 20,
    colorWeight3: 10,
    colorWeight4: 0,
    
    // Direction and blur
    planeAngle: 150,     // Diagonal (top-left to bottom-right)
    planeSpread: 80,     // Wide spread for soft transition
    planeWave: 0,        // No waves, clean line
    planeRadial: false,
    planeOffsetX: 0,
    planeOffsetY: 0,
    
    // Effects
    grain: true,
    grainIntensity: 15,  // Subtle grain for cinematic feel
    
    // Animation
    animate: true,
    speed: 0.15,
  },
};

export const PRESET_DEEP_AURORA: BuiltInPreset = {
  id: 'deep-aurora',
  name: 'Deep Aurora',
  nameHe: 'אורורה עמוקה',
  description: 'Silky aurora curtains with smooth color bands flowing like northern lights',
  category: 'dark',
  config: {
    type: 'sphere',  // Uses Mesh shader
    
    color0: '#000000',
    color1: '#00C2FF',  // Electric Blue
    color2: '#6A00F4',  // Deep Violet
    color3: '#EC008C',  // Magenta
    color4: null,
    
    // Balanced weights, but still black-dominant
    colorWeight0: 35,
    colorWeight1: 25,
    colorWeight2: 20,
    colorWeight3: 20,
    colorWeight4: 0,
    
    // === AURORA SETTINGS ===
    meshStyle: 'organic',
    meshNoiseScale: 0.4,   // Very low = huge smooth areas (key to aurora!)
    meshBlur: 95,          // Near-maximum blur for silky transitions
    
    // Shader params - reduced for smoothness
    uStrength: 0.5,
    uDensity: 1.0,
    uFrequency: 3.0,       // Lower frequency = smoother
    
    // Slow dreamy animation
    animate: true,
    speed: 0.15,
    
    grain: true,
    grainIntensity: 10,
  },
};

export const PRESET_BLUE_BEACON: BuiltInPreset = {
  id: 'blue-beacon',
  name: 'Blue Beacon',
  nameHe: 'משואה כחולה',
  description: 'Radial blue light source on deep black background',
  category: 'minimal',
  config: {
    type: 'plane',
    
    // Minimalist: blue center fading to black
    color0: '#000000',
    color1: '#00C2FF',  // Electric Blue (the beacon)
    color2: '#0066AA',  // Darker blue (transition)
    color3: '#000000',  // Back to black
    color4: null,
    
    // Weights: focused light in center
    colorWeight0: 20,   // Core
    colorWeight1: 30,   // Blue halo
    colorWeight2: 20,   // Transition
    colorWeight3: 30,   // Outer black
    colorWeight4: 0,
    
    // Radial settings
    planeRadial: true,
    planeOffsetX: 0,     // Centered horizontally
    planeOffsetY: 30,    // Shifted up (light from above)
    planeSpread: 60,
    planeWave: 0,
    planeAngle: 0,
    
    grain: true,
    grainIntensity: 25,  // More grain for retro feel
    
    animate: true,
    speed: 0.1,
  },
};

// ============================================================
// VIBRANT PRESETS - Bold and colorful
// ============================================================

export const PRESET_NEON_NIGHTS: BuiltInPreset = {
  id: 'neon-nights',
  name: 'Neon Nights',
  nameHe: 'לילות ניאון',
  description: 'Electric magenta and cyan with deep violet undertones',
  category: 'vibrant',
  config: {
    type: 'sphere',
    
    color0: '#000000',
    color1: '#EC008C',  // Magenta
    color2: '#00C2FF',  // Cyan
    color3: '#6A00F4',  // Violet
    color4: null,
    
    colorWeight0: 30,
    colorWeight1: 25,
    colorWeight2: 25,
    colorWeight3: 20,
    colorWeight4: 0,
    
    meshStyle: 'flow',
    meshFlowAngle: 45,
    meshNoiseScale: 0.6,    // Lower for smoother
    meshBlur: 80,
    
    uStrength: 0.8,
    uDensity: 1.2,
    uFrequency: 4.0,
    
    animate: true,
    speed: 0.3,
    
    grain: false,
  },
};

export const PRESET_SUNSET_BLAZE: BuiltInPreset = {
  id: 'sunset-blaze',
  name: 'Sunset Blaze',
  nameHe: 'שקיעה לוהטת',
  description: 'Warm gradient from coral to yellow with magenta accents',
  category: 'vibrant',
  config: {
    type: 'plane',
    
    color0: '#000000',
    color1: '#FDB515',  // Yellow
    color2: '#F2665F',  // Coral
    color3: '#EC008C',  // Magenta
    color4: null,
    
    colorWeight0: 30,
    colorWeight1: 30,
    colorWeight2: 25,
    colorWeight3: 15,
    colorWeight4: 0,
    
    planeAngle: 180,     // Bottom to top
    planeSpread: 65,
    planeWave: 15,       // Subtle wave
    planeRadial: false,
    
    animate: true,
    speed: 0.25,
    
    grain: true,
    grainIntensity: 10,
  },
};

export const PRESET_OCEAN_DEPTH: BuiltInPreset = {
  id: 'ocean-depth',
  name: 'Ocean Depth',
  nameHe: 'עומק האוקיינוס',
  description: 'Deep blues and teals with subtle violet hints',
  category: 'dark',
  config: {
    type: 'waterPlane',
    
    color0: '#000000',
    color1: '#00C2FF',  // Electric Blue
    color2: '#0088AA',  // Teal
    color3: '#6A00F4',  // Deep Violet
    color4: null,
    
    colorWeight0: 40,
    colorWeight1: 25,
    colorWeight2: 20,
    colorWeight3: 15,
    colorWeight4: 0,
    
    meshStyle: 'organic',
    meshNoiseScale: 0.5,
    meshBlur: 85,
    
    uStrength: 0.6,
    uDensity: 1.0,
    uFrequency: 3.5,
    
    animate: true,
    speed: 0.15,
    
    grain: true,
    grainIntensity: 8,
  },
};

// ============================================================
// LIGHT MODE PRESETS - For light backgrounds
// ============================================================

export const PRESET_MORNING_MIST: BuiltInPreset = {
  id: 'morning-mist',
  name: 'Morning Mist',
  nameHe: 'ערפל בוקר',
  description: 'Soft pastels on white base for light mode designs',
  category: 'light',
  config: {
    type: 'sphere',
    
    color0: '#FFFFFF',
    color1: '#00C2FF',  // Light blue
    color2: '#EC008C',  // Pink
    color3: '#6A00F4',  // Lavender
    color4: null,
    
    colorWeight0: 45,
    colorWeight1: 20,
    colorWeight2: 20,
    colorWeight3: 15,
    colorWeight4: 0,
    
    meshStyle: 'organic',
    meshNoiseScale: 0.4,
    meshBlur: 98,        // Maximum softness
    
    uStrength: 0.3,
    uDensity: 0.8,
    uFrequency: 2.5,
    
    animate: true,
    speed: 0.12,
    
    grain: false,
  },
};

export const PRESET_SOFT_CORAL: BuiltInPreset = {
  id: 'soft-coral',
  name: 'Soft Coral',
  nameHe: 'קורל רך',
  description: 'Gentle coral and peach tones on light background',
  category: 'light',
  config: {
    type: 'plane',
    
    color0: '#FFFFFF',
    color1: '#F2665F',  // Coral
    color2: '#FDB515',  // Yellow/peach
    color3: '#EC008C',  // Pink accent
    color4: null,
    
    colorWeight0: 40,
    colorWeight1: 25,
    colorWeight2: 20,
    colorWeight3: 15,
    colorWeight4: 0,
    
    planeAngle: 135,
    planeSpread: 75,
    planeWave: 5,
    planeRadial: false,
    
    animate: true,
    speed: 0.2,
    
    grain: false,
  },
};

// ============================================================
// ARTISTIC / EFFECT PRESETS
// ============================================================

export const PRESET_COSMIC_SPIRAL: BuiltInPreset = {
  id: 'cosmic-spiral',
  name: 'Cosmic Spiral',
  nameHe: 'ספירלה קוסמית',
  description: 'Hypnotic spiral pattern with all brand colors',
  category: 'vibrant',
  config: {
    type: 'spiral',
    
    color0: '#000000',
    color1: '#EC008C',  // Magenta
    color2: '#6A00F4',  // Violet
    color3: '#00C2FF',  // Cyan
    color4: '#FDB515',  // Yellow
    
    colorWeight0: 25,
    colorWeight1: 20,
    colorWeight2: 20,
    colorWeight3: 20,
    colorWeight4: 15,
    
    spiralTightness: 4,
    spiralDirection: true,
    
    uStrength: 1.5,
    uDensity: 1.2,
    uFrequency: 5.0,
    
    animate: true,
    speed: 0.3,
    
    grain: true,
    grainIntensity: 8,
  },
};

export const PRESET_PRISMATIC_WAVES: BuiltInPreset = {
  id: 'prismatic-waves',
  name: 'Prismatic Waves',
  nameHe: 'גלי פריזמה',
  description: 'Colorful wave layers creating a prism effect',
  category: 'vibrant',
  config: {
    type: 'waves',
    
    color0: '#000000',
    color1: '#6A00F4',  // Violet
    color2: '#00C2FF',  // Cyan
    color3: '#EC008C',  // Magenta
    color4: '#FDB515',  // Yellow
    
    colorWeight0: 20,
    colorWeight1: 22,
    colorWeight2: 22,
    colorWeight3: 20,
    colorWeight4: 16,
    
    wavesCount: 6,
    wavesAmplitude: 40,
    
    uStrength: 1.0,
    uDensity: 1.0,
    uFrequency: 5.0,
    
    animate: true,
    speed: 0.25,
    
    grain: false,
  },
};

// ============================================================
// Export all presets
// ============================================================

export const BUILT_IN_PRESETS: BuiltInPreset[] = [
  // Dark
  PRESET_DARK_SUNRISE,
  PRESET_DEEP_AURORA,
  PRESET_OCEAN_DEPTH,
  
  // Vibrant
  PRESET_NEON_NIGHTS,
  PRESET_SUNSET_BLAZE,
  PRESET_COSMIC_SPIRAL,
  PRESET_PRISMATIC_WAVES,
  
  // Minimal
  PRESET_BLUE_BEACON,
  
  // Light
  PRESET_MORNING_MIST,
  PRESET_SOFT_CORAL,
];

// Get presets by category
export const getPresetsByCategory = (category: BuiltInPreset['category']): BuiltInPreset[] => {
  return BUILT_IN_PRESETS.filter(p => p.category === category);
};

// Get preset by ID
export const getPresetById = (id: string): BuiltInPreset | undefined => {
  return BUILT_IN_PRESETS.find(p => p.id === id);
};
