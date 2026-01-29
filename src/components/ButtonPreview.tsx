import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  ButtonGradientConfig,
  GradientDirection,
  defaultButtonConfig,
  generateButtonCSS,
  webAssetsBrandColors,
} from '@/types/webAssets';

interface ButtonPreviewProps {
  config?: ButtonGradientConfig;
  onConfigChange?: (config: Partial<ButtonGradientConfig>) => void;
}

const directionOptions: { value: GradientDirection; label: string }[] = [
  { value: 'horizontal', label: '→' },
  { value: 'vertical', label: '↓' },
  { value: 'diagonal', label: '↘' },
  { value: 'radial', label: '◎' },
];

const sizeOptions: { value: 'sm' | 'md' | 'lg'; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
];

export const ButtonPreview = ({ config: externalConfig, onConfigChange }: ButtonPreviewProps) => {
  const [internalConfig, setInternalConfig] = useState<ButtonGradientConfig>(defaultButtonConfig);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const config = externalConfig || internalConfig;

  const handleConfigChange = (updates: Partial<ButtonGradientConfig>) => {
    if (onConfigChange) {
      onConfigChange(updates);
    } else {
      setInternalConfig((prev) => ({ ...prev, ...updates }));
    }
  };

  const handleDefaultColorChange = (index: number, hex: string) => {
    const newColors = [...config.defaultGradient.colors];
    newColors[index] = hex;
    handleConfigChange({
      defaultGradient: { ...config.defaultGradient, colors: newColors },
    });
  };

  const handleHoverColorChange = (index: number, hex: string) => {
    const newColors = [...config.hoverGradient.colors];
    newColors[index] = hex;
    handleConfigChange({
      hoverGradient: { ...config.hoverGradient, colors: newColors },
    });
  };

  const getGradientStyle = (
    colors: string[],
    direction: GradientDirection
  ): React.CSSProperties => {
    const dirMap: Record<GradientDirection, string> = {
      horizontal: '90deg',
      vertical: '180deg',
      diagonal: '135deg',
      radial: 'circle',
    };

    if (direction === 'radial') {
      return {
        background: `radial-gradient(${dirMap[direction]}, ${colors.join(', ')})`,
      };
    }
    return {
      background: `linear-gradient(${dirMap[direction]}, ${colors.join(', ')})`,
    };
  };

  const handleCopyCSS = async () => {
    const css = generateButtonCSS(config);
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      toast.success('CSS copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = css;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('CSS copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy');
      }
      document.body.removeChild(textarea);
    }
  };

  const sizeMap = { sm: '8px 16px', md: '12px 24px', lg: '16px 32px' };
  const fontSizeMap = { sm: '14px', md: '16px', lg: '18px' };

  const currentGradient = isHovered ? config.hoverGradient : config.defaultGradient;
  const buttonStyle: React.CSSProperties = {
    ...getGradientStyle(currentGradient.colors, currentGradient.direction),
    padding: sizeMap[config.size],
    fontSize: fontSizeMap[config.size],
    fontWeight: 600,
    borderRadius: `${config.borderRadius}px`,
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: isHovered
      ? '0 6px 20px rgba(0, 0, 0, 0.3)'
      : '0 4px 15px rgba(0, 0, 0, 0.2)',
    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
  };

  return (
    <div className="space-y-4">
      {/* Live Preview */}
      <div className="flex justify-center py-6 bg-secondary/30 rounded-lg border border-border">
        <button
          style={buttonStyle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {config.buttonText}
        </button>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Hover to see the active state
      </p>

      {/* Size & Border Radius */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Size</Label>
          <div className="flex gap-1">
            {sizeOptions.map((size) => (
              <button
                key={size.value}
                onClick={() => handleConfigChange({ size: size.value })}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all ${
                  config.size === size.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-xs">Radius</Label>
            <span className="text-xs text-muted-foreground">{config.borderRadius}px</span>
          </div>
          <Slider
            value={[config.borderRadius]}
            onValueChange={([value]) => handleConfigChange({ borderRadius: value })}
            min={0}
            max={24}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      {/* Default State Colors */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-xs">Default Gradient</Label>
          <div className="flex gap-1">
            {directionOptions.map((dir) => (
              <button
                key={dir.value}
                onClick={() =>
                  handleConfigChange({
                    defaultGradient: { ...config.defaultGradient, direction: dir.value },
                  })
                }
                className={`w-6 h-6 rounded text-xs transition-all ${
                  config.defaultGradient.direction === dir.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                title={dir.value}
              >
                {dir.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {[0, 1].map((index) => (
            <div key={index} className="flex-1 flex flex-wrap gap-1">
              {webAssetsBrandColors.slice(0, 5).map((color) => (
                <button
                  key={color.hex}
                  onClick={() => handleDefaultColorChange(index, color.hex)}
                  className={`w-5 h-5 rounded transition-all border ${
                    config.defaultGradient.colors[index] === color.hex
                      ? 'border-primary ring-1 ring-primary scale-110'
                      : 'border-border hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Hover State Colors */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-xs">Hover Gradient</Label>
          <div className="flex gap-1">
            {directionOptions.map((dir) => (
              <button
                key={dir.value}
                onClick={() =>
                  handleConfigChange({
                    hoverGradient: { ...config.hoverGradient, direction: dir.value },
                  })
                }
                className={`w-6 h-6 rounded text-xs transition-all ${
                  config.hoverGradient.direction === dir.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                title={dir.value}
              >
                {dir.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {[0, 1].map((index) => (
            <div key={index} className="flex-1 flex flex-wrap gap-1">
              {webAssetsBrandColors.slice(0, 5).map((color) => (
                <button
                  key={color.hex}
                  onClick={() => handleHoverColorChange(index, color.hex)}
                  className={`w-5 h-5 rounded transition-all border ${
                    config.hoverGradient.colors[index] === color.hex
                      ? 'border-primary ring-1 ring-primary scale-110'
                      : 'border-border hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Copy CSS Button */}
      <Button onClick={handleCopyCSS} className="w-full" size="sm" variant="outline">
        {copied ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" />
            Copy Button CSS
          </>
        )}
      </Button>

      {/* CSS Preview */}
      <div className="bg-secondary/50 rounded-lg p-3 max-h-32 overflow-y-auto">
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
          {generateButtonCSS(config)}
        </pre>
      </div>
    </div>
  );
};
