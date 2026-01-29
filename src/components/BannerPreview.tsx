import { useRef, useState } from 'react';
import { Download, Play, Pause, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  BannerConfig,
  BannerEffectType,
  defaultBannerConfig,
  webAssetsBrandColors,
} from '@/types/webAssets';
import { BannerCanvas } from './BannerCanvas';

interface BannerPreviewProps {
  config?: BannerConfig;
  onConfigChange?: (config: Partial<BannerConfig>) => void;
}

const effectTypes: { value: BannerEffectType; label: string }[] = [
  { value: 'mesh', label: 'Mesh' },
  { value: 'plane', label: 'Plane' },
  { value: 'waterPlane', label: 'Water' },
];

export const BannerPreview = ({ config: externalConfig, onConfigChange }: BannerPreviewProps) => {
  const [internalConfig, setInternalConfig] = useState<BannerConfig>(defaultBannerConfig);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);

  const config = externalConfig || internalConfig;

  const handleConfigChange = (updates: Partial<BannerConfig>) => {
    if (onConfigChange) {
      onConfigChange(updates);
    } else {
      setInternalConfig((prev) => ({ ...prev, ...updates }));
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const container = canvasContainerRef.current;
      if (!container) {
        toast.error('Canvas not found');
        return;
      }

      const canvas = container.querySelector('canvas');
      if (!canvas) {
        toast.error('WebGL canvas not found');
        return;
      }

      // Get WebGL context
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        toast.error('Could not get WebGL context');
        return;
      }

      // Read pixels from WebGL canvas
      const sourceWidth = canvas.width;
      const sourceHeight = canvas.height;
      const pixels = new Uint8Array(sourceWidth * sourceHeight * 4);
      gl.readPixels(0, 0, sourceWidth, sourceHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // Create ImageData from pixels (flip Y-axis as WebGL is bottom-up)
      const imageData = new ImageData(sourceWidth, sourceHeight);
      for (let y = 0; y < sourceHeight; y++) {
        for (let x = 0; x < sourceWidth; x++) {
          const sourceY = sourceHeight - 1 - y; // Flip Y
          const sourceIdx = (sourceY * sourceWidth + x) * 4;
          const destIdx = (y * sourceWidth + x) * 4;
          imageData.data[destIdx] = pixels[sourceIdx];     // R
          imageData.data[destIdx + 1] = pixels[sourceIdx + 1]; // G
          imageData.data[destIdx + 2] = pixels[sourceIdx + 2]; // B
          imageData.data[destIdx + 3] = pixels[sourceIdx + 3]; // A
        }
      }

      // Create temp canvas with source pixels
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = sourceWidth;
      tempCanvas.height = sourceHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        toast.error('Could not create temp canvas');
        return;
      }
      tempCtx.putImageData(imageData, 0, 0);

      // Create export canvas at target resolution
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = config.width;
      exportCanvas.height = config.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) {
        toast.error('Could not create export canvas');
        return;
      }

      // Fill with black background first to avoid transparency
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, config.width, config.height);

      // Draw the source canvas scaled to fill export size
      ctx.drawImage(tempCanvas, 0, 0, config.width, config.height);

      // Apply black fade overlay for hero banners
      if (config.type === 'hero') {
        const gradient = ctx.createLinearGradient(0, 0, config.width, 0);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(config.blackFadePercentage * 0.5 / 100, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(config.blackFadePercentage / 100, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, config.width, config.height);
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        exportCanvas.toBlob(resolve, 'image/png', 1.0)
      );

      if (!blob) {
        toast.error('Failed to create image');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.type}-banner-${config.effectType}-${config.width}x${config.height}.png`;
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

  const handleExportVideo = async () => {
    if (!config.animate) {
      toast.error('Enable animation to export video');
      return;
    }

    setIsExportingVideo(true);
    try {
      const container = canvasContainerRef.current;
      if (!container) {
        toast.error('Canvas not found');
        return;
      }

      const canvas = container.querySelector('canvas');
      if (!canvas) {
        toast.error('WebGL canvas not found');
        return;
      }

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.type}-banner-${config.effectType}.${mimeType === 'video/mp4' ? 'mp4' : 'webm'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Video exported!');
      };

      recorder.start();
      setTimeout(() => {
        recorder.stop();
        setIsExportingVideo(false);
      }, 5000); // 5 second video

      toast.info('Recording 5 seconds...');
    } catch (error) {
      console.error('Video export error:', error);
      toast.error('Video export failed');
      setIsExportingVideo(false);
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

      {/* Effect Type Selector */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">Effect Type</Label>
        <div className="flex gap-2">
          {effectTypes.map((effect) => (
            <button
              key={effect.value}
              onClick={() => handleConfigChange({ effectType: effect.value })}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                config.effectType === effect.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {effect.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live WebGL Preview */}
      <div
        ref={canvasContainerRef}
        className="w-full rounded-lg overflow-hidden border border-border"
        style={{
          height: `${Math.min(config.height / 3, 150)}px`,
          minHeight: '100px',
        }}
      >
        <BannerCanvas config={config} className="w-full h-full" />
      </div>

      {/* Animation Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-xs flex items-center gap-2">
            {config.animate ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            Animation
          </Label>
          <Switch
            checked={config.animate}
            onCheckedChange={(animate) => handleConfigChange({ animate })}
          />
        </div>
        
        {config.animate && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">Speed</Label>
              <span className="text-xs text-muted-foreground">{config.speed.toFixed(1)}</span>
            </div>
            <Slider
              value={[config.speed]}
              onValueChange={([value]) => handleConfigChange({ speed: value })}
              min={0.1}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>
        )}
      </div>

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
            Left side will be solid black, then fade into the shader effect
          </p>
        </div>
      )}

      {/* Gradient Colors */}
      <div className="space-y-3">
        <Label className="text-muted-foreground text-xs">Shader Colors</Label>
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

      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-1"
          size="sm"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Image'}
        </Button>
        
        {config.animate && (
          <Button
            onClick={handleExportVideo}
            disabled={isExportingVideo}
            variant="outline"
            size="sm"
          >
            <Video className="w-4 h-4 mr-2" />
            {isExportingVideo ? 'Recording...' : 'Video'}
          </Button>
        )}
      </div>
    </div>
  );
};
