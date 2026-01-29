export type GradientDirection = 'horizontal' | 'vertical' | 'diagonal' | 'radial';

export interface BannerConfig {
  type: 'hero' | 'small';
  width: number;
  height: number;
  blackFadePercentage: number; // For hero banners (0-50)
  gradientColors: string[];
  gradientWeights: number[];
}

export interface ButtonGradientConfig {
  defaultGradient: {
    colors: string[];
    direction: GradientDirection;
  };
  hoverGradient: {
    colors: string[];
    direction: GradientDirection;
  };
  borderRadius: number;
  size: 'sm' | 'md' | 'lg';
  buttonText: string;
}

export const defaultBannerConfig: BannerConfig = {
  type: 'hero',
  width: 1280,
  height: 400,
  blackFadePercentage: 30,
  gradientColors: ['#FDB515', '#E71989', '#6A00F4'],
  gradientWeights: [33, 34, 33],
};

export const defaultButtonConfig: ButtonGradientConfig = {
  defaultGradient: {
    colors: ['#FDB515', '#E71989'],
    direction: 'horizontal',
  },
  hoverGradient: {
    colors: ['#E71989', '#6A00F4'],
    direction: 'horizontal',
  },
  borderRadius: 8,
  size: 'md',
  buttonText: 'Click Me',
};

// Brand colors for web assets
export const webAssetsBrandColors = [
  { name: 'Yellow Orange', hex: '#FDB515' },
  { name: 'Coral', hex: '#F25665' },
  { name: 'Magenta', hex: '#E71989' },
  { name: 'Deep Violet', hex: '#6A00F4' },
  { name: 'Electric Blue', hex: '#00C2FF' },
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
];

// Generate hero banner gradient with black fade
export function generateHeroBannerGradient(
  colors: string[],
  blackPercentage: number = 30
): string {
  const fadeStart = blackPercentage * 0.5;
  const fadeEnd = blackPercentage;
  
  const color1 = colors[0] || '#FDB515';
  const color2 = colors[1] || colors[0] || '#E71989';
  const color3 = colors[2] || colors[1] || colors[0] || '#6A00F4';
  
  return `linear-gradient(to right,
    #000000 0%,
    #000000 ${fadeStart}%,
    ${color1} ${fadeEnd}%,
    ${color2} ${50 + fadeEnd / 2}%,
    ${color3} 100%
  )`;
}

// Generate small banner gradient (no black fade)
export function generateSmallBannerGradient(
  colors: string[],
  weights: number[]
): string {
  const color1 = colors[0] || '#FDB515';
  const color2 = colors[1] || '#E71989';
  const color3 = colors[2] || '#6A00F4';
  
  const w1 = weights[0] || 33;
  const w2 = w1 + (weights[1] || 34);
  
  return `linear-gradient(to right,
    ${color1} 0%,
    ${color1} ${w1}%,
    ${color2} ${w1}%,
    ${color2} ${w2}%,
    ${color3} ${w2}%,
    ${color3} 100%
  )`;
}

// Generate button CSS
export function generateButtonCSS(config: ButtonGradientConfig): string {
  const sizeMap = { sm: '8px 16px', md: '12px 24px', lg: '16px 32px' };
  const fontSizeMap = { sm: '14px', md: '16px', lg: '18px' };
  const dirMap: Record<GradientDirection, string> = {
    horizontal: '90deg',
    vertical: '180deg',
    diagonal: '135deg',
    radial: 'circle',
  };
  
  const defaultDir = dirMap[config.defaultGradient.direction];
  const hoverDir = dirMap[config.hoverGradient.direction];
  
  const isDefaultRadial = config.defaultGradient.direction === 'radial';
  const isHoverRadial = config.hoverGradient.direction === 'radial';
  
  const defaultBg = isDefaultRadial
    ? `radial-gradient(${defaultDir}, ${config.defaultGradient.colors.join(', ')})`
    : `linear-gradient(${defaultDir}, ${config.defaultGradient.colors.join(', ')})`;
    
  const hoverBg = isHoverRadial
    ? `radial-gradient(${hoverDir}, ${config.hoverGradient.colors.join(', ')})`
    : `linear-gradient(${hoverDir}, ${config.hoverGradient.colors.join(', ')})`;
  
  return `.gradient-button {
  padding: ${sizeMap[config.size]};
  font-size: ${fontSizeMap[config.size]};
  font-weight: 600;
  border-radius: ${config.borderRadius}px;
  border: none;
  color: white;
  cursor: pointer;
  background: ${defaultBg};
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.gradient-button:hover,
.gradient-button:active {
  background: ${hoverBg};
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.gradient-button:active {
  transform: translateY(0);
}`;
}
