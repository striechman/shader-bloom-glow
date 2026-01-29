import { useRef, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  BannerConfig,
  defaultBannerConfig,
  generateHeroBannerGradient,
  generateSmallBannerGradient,
  webAssetsBrandColors,
} from '@/types/webAssets';

interface BannerPreviewProps {
  config?: BannerConfig;
  onConfigChange?: (config: Partial<BannerConfig>) => void;
}

export const BannerPreview = ({ config: externalConfig, onConfigChange }: BannerPreviewProps) => {
  const [internalConfig, setInternalConfig] = useState<BannerConfig>(defaultBannerConfig);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const config = externalConfig || internalConfig;

  const handleConfigChange = (updates: Partial<BannerConfig>) => {
    if (onConfigChange) {
      onConfigChange(updates);
    } else {
      setInternalConfig((prev) => ({ ...prev, ...updates }));
    }
  };

  const gradient =
    config.type === 'hero'
      ? generateHeroBannerGradient(config.gradientColors, config.blackFadePercentage)
      : generateSmallBannerGradient(config.gradientColors, config.gradientWeights);

  // Render to canvas for export
  const renderToCanvas = (width: number, height: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Parse gradient and draw
    if (config.type === 'hero') {
      const fadeStart = config.blackFadePercentage * 0.5;
      const fadeEnd = config.blackFadePercentage;
      const color1 = config.gradientColors[0] || '#FDB515';
      const color2 = config.gradientColors[1] || '#E71989';
      const color3 = config.gradientColors[2] || '#6A00F4';

      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, '#000000');
      grad.addColorStop(fadeStart / 100, '#000000');
      grad.addColorStop(fadeEnd / 100, color1);
      grad.addColorStop((50 + fadeEnd / 2) / 100, color2);
      grad.addColorStop(1, color3);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      const color1 = config.gradientColors[0] || '#FDB515';
      const color2 = config.gradientColors[1] || '#E71989';
      const color3 = config.gradientColors[2] || '#6A00F4';
      const w1 = (config.gradientWeights[0] || 33) / 100;
      const w2 = w1 + (config.gradientWeights[1] || 34) / 100;

      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, color1);
      grad.addColorStop(w1, color1);
      grad.addColorStop(w1, color2);
      grad.addColorStop(w2, color2);
      grad.addColorStop(w2, color3);
      grad.addColorStop(1, color3);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    return canvas;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const canvas = renderToCanvas(config.width, config.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png', 1.0)
      );

      if (!blob) {
        toast.error('Failed to create image');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.type}-banner-${config.width}x${config.height}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${config.type === 'hero' ? 'Hero' : 'Small'} banner exported!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleColorChange = (index: number, hex: string) => {
    const newColors = [...config.gradientColors];
    newColors[index] = hex;
    handleConfigChange({ gradientColors: newColors });
  };

  return (
    <div className="space-y-4">
      {/* Banner Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() =>
            handleConfigChange({
              type: 'hero',
              width: 1280,
              height: 400,
            })
          }
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            config.type === 'hero'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Hero Banner
        </button>
        <button
          onClick={() =>
            handleConfigChange({
              type: 'small',
              width: 600,
              height: 300,
            })
          }
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            config.type === 'small'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Small Banner
        </button>
      </div>

      {/* Preview */}
      <div
        className="w-full rounded-lg overflow-hidden border border-border"
        style={{
          background: gradient,
          height: `${Math.min(config.height / 3, 150)}px`,
          minHeight: '100px',
        }}
      />

      {/* Dimension Controls */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-xs">Width</Label>
            <span className="text-xs text-muted-foreground">{config.width}px</span>
          </div>
          <Slider
            value={[config.width]}
            onValueChange={([value]) => handleConfigChange({ width: value })}
            min={config.type === 'hero' ? 1280 : 400}
            max={config.type === 'hero' ? 2560 : 1200}
            step={10}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-xs">Height</Label>
            <span className="text-xs text-muted-foreground">{config.height}px</span>
          </div>
          <Slider
            value={[config.height]}
            onValueChange={([value]) => handleConfigChange({ height: value })}
            min={300}
            max={800}
            step={10}
            className="w-full"
          />
        </div>
      </div>

      {/* Black Fade (Hero only) */}
      {config.type === 'hero' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-xs">Black Fade %</Label>
            <span className="text-xs text-muted-foreground">{config.blackFadePercentage}%</span>
          </div>
          <Slider
            value={[config.blackFadePercentage]}
            onValueChange={([value]) => handleConfigChange({ blackFadePercentage: value })}
            min={15}
            max={50}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground/70">
            Left side will be solid black, then fade into colors
          </p>
        </div>
      )}

      {/* Gradient Colors */}
      <div className="space-y-3">
        <Label className="text-muted-foreground text-xs">Gradient Colors</Label>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-1">
              <p className="text-xs text-muted-foreground text-center">Color {index + 1}</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {webAssetsBrandColors.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => handleColorChange(index, color.hex)}
                    className={`w-6 h-6 rounded transition-all border ${
                      config.gradientColors[index] === color.hex
                        ? 'border-primary ring-1 ring-primary scale-110'
                        : 'border-border hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full"
        size="sm"
      >
        <Download className="w-4 h-4 mr-2" />
        {isExporting ? 'Exporting...' : `Export ${config.type === 'hero' ? 'Hero' : 'Small'} Banner`}
      </Button>
    </div>
  );
};
