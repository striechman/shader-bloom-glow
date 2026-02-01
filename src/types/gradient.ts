export interface GradientConfig {
  // Shape
  type: 'sphere' | 'plane' | 'waterPlane';
  wireframe: boolean;
  
  // Colors (Default state) - color0 is always theme-based (black/white)
  color0: string; // Theme-based color - not editable
  color1: string;
  color2: string;
  color3: string;
  color4: string | null; // Optional 4th color (null = not used)
  
  // Color Weights (percentages that sum to 100)
  colorWeight0: number; // Base color weight (black/white)
  colorWeight1: number;
  colorWeight2: number;
  colorWeight3: number;
  colorWeight4: number; // 0 when color4 is null
  
  // Hover Colors (for buttons)
  hoverColor1: string;
  hoverColor2: string;
  hoverColor3: string;
  
  // Button state preview
  buttonPreviewState: 'default' | 'hover';
  
  // Animation
  animate: boolean;
  speed: number;
  frozenTime: number | null; // null = animating, number = frozen at specific time
  
  // Effects
  grain: boolean;
  grainIntensity: number; // 0-100 (controls grain visibility)
  uStrength: number;
  uDensity: number;
  uFrequency: number;
  
  // Mesh Gradient settings (noise-based color blending)
  meshNoiseScale: number; // Size of color blobs (1-10, higher = smaller blobs)
  meshBlur: number; // Softness between colors (0-100)
  meshStyle: 'organic' | 'flow' | 'center'; // Distribution style
  meshFlowAngle: number; // 0-360 degrees (for flow style)
  meshCenterInward: boolean; // true = colors flow inward, false = outward
  
  // Aspect Ratio
  aspectRatio: '1:1' | '16:9' | '9:16' | '2:3' | '3:2' | '4:5' | '4:3' | '3:4' | 'free' | 'hero-banner' | 'small-banner' | 'button-large' | 'button-medium' | 'button-small';
  
  // Banner settings (only applies when aspectRatio is hero-banner)
  bannerBlackFade: number; // Percentage of left side that's black (15-50)
  
  // Plane gradient direction
  planeAngle: number; // 0-360 degrees (direction of the gradient)
  planeRadial: boolean; // If true, radial gradient from center instead of linear
  planeWave: number; // 0-100 wave distortion amount
  planeSpread: number; // 0-100 how sharp/soft the color transitions are
  planeOffsetX: number; // -50 to 50 horizontal offset of center
  planeOffsetY: number; // -50 to 50 vertical offset of center
  planeMultiCenter: boolean; // If true, creates multiple radial centers
}

export const defaultGradientConfig: GradientConfig = {
  type: 'sphere',
  wireframe: false,
  animate: true,
  speed: 0.4,
  color0: '#000000', // Theme-based: black in dark mode, white in light mode
  color1: '#FDB515',
  color2: '#EC008C',
  color3: '#000000',
  color4: null, // Optional 4th color - disabled by default
  colorWeight0: 30, // Base color weight (black/white based on theme)
  colorWeight1: 28,
  colorWeight2: 28,
  colorWeight3: 14,
  colorWeight4: 0, // 0 when color4 is not used
  hoverColor1: '#EC008C',
  hoverColor2: '#6A00F4',
  hoverColor3: '#000000',
  buttonPreviewState: 'default',
  grain: false,
  grainIntensity: 50,
  uStrength: 4,
  uDensity: 1.3,
  uFrequency: 5.5,
  frozenTime: null,
  meshNoiseScale: 1.0,
  meshBlur: 50,
  meshStyle: 'organic',
  meshFlowAngle: 45,
  meshCenterInward: true,
  aspectRatio: 'free',
  bannerBlackFade: 30,
  planeAngle: 45,
  planeRadial: false,
  planeWave: 0,
  planeSpread: 50,
  planeOffsetX: 0,
  planeOffsetY: 0,
  planeMultiCenter: false,
};

// Get theme-based color0 (black for dark mode, white for light mode)
export const getThemeColor0 = (theme: 'dark' | 'light'): string => {
  return theme === 'dark' ? '#000000' : '#FFFFFF';
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
  'hero-banner': 1280 / 400, // ~3.2:1
  'small-banner': 600 / 300, // 2:1 - 600x300 small banner
  'button-large': 200 / 60, // ~3.3:1
  'button-medium': 150 / 50, // 3:1
  'button-small': 100 / 40, // 2.5:1
};

// Check if aspect ratio is a hero banner (only hero has black fade)
export const isHeroBannerRatio = (ratio: string): boolean => {
  return ratio === 'hero-banner';
};

// Check if aspect ratio is any banner type
export const isBannerRatio = (ratio: string): boolean => {
  return ratio === 'hero-banner' || ratio === 'small-banner';
};

// Check if aspect ratio is a button type
export const isButtonRatio = (ratio: string): boolean => {
  return ratio === 'button-large' || ratio === 'button-medium' || ratio === 'button-small';
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
