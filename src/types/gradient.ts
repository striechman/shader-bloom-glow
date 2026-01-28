export interface GradientConfig {
  // Shape
  type: 'sphere' | 'plane' | 'waterPlane';
  wireframe: boolean;
  
  // Colors
  color1: string;
  color2: string;
  color3: string;
  
  // Color Weights (percentages that sum to 100)
  colorWeight1: number;
  colorWeight2: number;
  colorWeight3: number;
  
  // Animation
  animate: boolean;
  speed: number;
  frozenTime: number | null; // null = animating, number = frozen at specific time
  
  // Effects
  grain: boolean;
  uStrength: number;
  uDensity: number;
  uFrequency: number;
  
  // Mesh Gradient settings (noise-based color blending)
  meshNoiseScale: number; // Size of color blobs (1-10, higher = smaller blobs)
  meshBlur: number; // Softness between colors (0-100)
  
  // Aspect Ratio
  aspectRatio: '1:1' | '16:9' | '9:16' | '2:3' | '3:2' | '4:5' | '4:3' | '3:4' | 'free';
}

export const defaultGradientConfig: GradientConfig = {
  type: 'sphere',
  wireframe: false,
  animate: true,
  speed: 0.4,
  color1: '#FDB515',
  color2: '#E71989',
  color3: '#000000',
  colorWeight1: 33,
  colorWeight2: 34,
  colorWeight3: 33,
  grain: false,
  uStrength: 4,
  uDensity: 1.3,
  uFrequency: 5.5,
  frozenTime: null,
  meshNoiseScale: 3.0,
  meshBlur: 50,
  aspectRatio: 'free',
};

export const aspectRatioValues: Record<string, number> = {
  '1:1': 1,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '2:3': 2 / 3,
  '3:2': 3 / 2,
  '4:5': 4 / 5,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  'free': 0,
};

export const exportCategories = {
  social: [
    { label: 'Instagram Post', width: 1080, height: 1080, ratio: '1:1' },
    { label: 'Instagram Story', width: 1080, height: 1920, ratio: '9:16' },
    { label: 'Facebook Post', width: 1200, height: 630, ratio: '1.91:1' },
    { label: 'LinkedIn Post', width: 1200, height: 627, ratio: '1.91:1' },
    { label: 'Twitter Post', width: 1200, height: 675, ratio: '16:9' },
  ],
  web: [
    { label: 'HD Desktop', width: 1920, height: 1080, ratio: '16:9' },
    { label: '4K Desktop', width: 3840, height: 2160, ratio: '16:9' },
    { label: 'Website Hero', width: 1440, height: 900, ratio: '16:10' },
    { label: 'Banner Wide', width: 1920, height: 400, ratio: '4.8:1' },
  ],
  print: [
    { label: 'A4 (300dpi)', width: 2480, height: 3508, ratio: 'A4' },
    { label: 'A3 (300dpi)', width: 3508, height: 4961, ratio: 'A3' },
    { label: 'Letter (300dpi)', width: 2550, height: 3300, ratio: 'Letter' },
    { label: 'Poster 24x36', width: 7200, height: 10800, ratio: '2:3' },
  ],
  banner: [
    { label: 'Leaderboard', width: 728, height: 90, ratio: '8:1' },
    { label: 'Billboard', width: 970, height: 250, ratio: '3.9:1' },
    { label: 'Skyscraper', width: 160, height: 600, ratio: '1:3.75' },
    { label: 'Large Rectangle', width: 336, height: 280, ratio: '1.2:1' },
  ],
};

export type ExportCategory = keyof typeof exportCategories;
