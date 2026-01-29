import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
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
import { noise3D, smoothstep, lerp, parseColor } from '@/lib/noise';
import { captureWebGLCanvasTo2D } from '@/lib/webglCapture';
import { downloadBlob } from '@/lib/download';

interface BannerPreviewProps {
  config?: BannerConfig;
  onConfigChange?: (config: Partial<BannerConfig>) => void;
}

const effectTypes: { value: BannerEffectType; label: string }[] = [
  { value: 'mesh', label: 'Mesh' },
  { value: 'plane', label: 'Plane' },
  { value: 'waterPlane', label: 'Water' },
];

// ============================================================================
// High-Quality Banner Renderer - Matches WebGL shader output
// ============================================================================
function renderBannerHighQuality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: BannerConfig
): void {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // Parse colors
  const color1 = parseColor(config.gradientColors[0] || '#FDB515');
  const color2 = parseColor(config.gradientColors[1] || '#EC008C');
  const color3 = parseColor(config.gradientColors[2] || '#6A00F4');
  
  const noiseScale = config.meshNoiseScale ?? 1.0;
  const blurFactor = ((config.meshBlur ?? 50) / 100) * 0.5;
  const time = 0; // Static export
  const freq = Math.max(0.1, config.uFrequency ?? 1);
  const density = Math.max(0, config.uDensity ?? 1);
  const strength = Math.max(0, config.uStrength ?? 0.3);
  
  const w1 = (config.gradientWeights[0] ?? 33) / 100;
  const w2 = (config.gradientWeights[1] ?? 34) / 100;
  const threshold1 = w1;
  const threshold2 = w1 + w2;
  
  const isHero = config.type === 'hero';
  const blackFade = config.blackFadePercentage ?? 30;
  
  const isMesh = config.effectType === 'mesh';
  const isPlane = config.effectType === 'plane';
  const isWater = config.effectType === 'waterPlane';
  
  console.log('[BannerExport] Rendering', width, 'x', height, 'effect:', config.effectType);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      
      let noiseVal: number;
      
      if (isMesh) {
        // Match shader: noisePos = vec3(vUv * uNoiseScale * freq, uTime * 0.1)
        const noiseX = u * noiseScale * freq;
        const noiseY = v * noiseScale * freq;
        const noiseZ = time * 0.1;
        
        // n1 = snoise(noisePos) * 0.5 + 0.5
        const n1 = noise3D(noiseX, noiseY, noiseZ);
        // n2 = snoise(noisePos * 2.0 + 100.0) * (0.20 + 0.10 * density)
        const n2 = noise3D(noiseX * 2.0 + 100.0, noiseY * 2.0 + 100.0, noiseZ * 2.0 + 100.0) * (0.20 + 0.10 * density);
        // n3 = snoise(noisePos * 4.0 + 200.0) * (0.10 + 0.06 * density)
        const n3 = noise3D(noiseX * 4.0 + 200.0, noiseY * 4.0 + 200.0, noiseZ * 4.0 + 200.0) * (0.10 + 0.06 * density);
        
        noiseVal = (n1 + n2 + n3) / 1.375;
      } else if (isPlane) {
        const centeredU = u - 0.5;
        const centeredV = v - 0.5;
        const baseNoise = centeredU * 0.707 + centeredV * 0.707 + 0.5;
        const organicNoise = noise3D(u * 2 * freq, v * 2 * freq, time * 0.25) * 0.12 * density;
        noiseVal = Math.max(0, Math.min(1, baseNoise + organicNoise));
      } else if (isWater) {
        const n1 = noise3D(u * 1.5 * freq, v * 1.5 * freq, time * 0.15);
        const n2 = noise3D(u * 1.05 * freq + 30, v * 1.05 * freq + 30, time * 0.15) * 0.4 + 0.5;
        const n3 = noise3D(u * 0.75 * freq + 60, v * 0.75 * freq + 60, time * 0.15) * 0.3 + 0.5;
        const wave = Math.sin(u * 4 + v * 3 + time * 0.3) * 0.1;
        noiseVal = Math.max(0, Math.min(1, n1 * 0.5 + n2 * 0.3 + n3 * 0.2 + wave * density));
      } else {
        noiseVal = (u + v) / 2;
      }
      
      // Apply strength: pow(clamp(noise, 0.0, 1.0), 1.0 + strength * 0.18)
      noiseVal = Math.pow(Math.max(0, Math.min(1, noiseVal)), 1.0 + strength * 0.18);
      
      // Color mixing with smoothstep edges
      const edge1 = smoothstep(threshold1 - blurFactor, threshold1 + blurFactor, noiseVal);
      const edge2 = smoothstep(threshold2 - blurFactor, threshold2 + blurFactor, noiseVal);
      
      let r = lerp(color1.r, color2.r, edge1);
      let g = lerp(color1.g, color2.g, edge1);
      let b = lerp(color1.b, color2.b, edge1);
      
      r = lerp(r, color3.r, edge2);
      g = lerp(g, color3.g, edge2);
      b = lerp(b, color3.b, edge2);
      
      // Apply hero banner black fade on left side
      if (isHero) {
        const fadeStart = blackFade * 0.5 / 100;
        const fadeEnd = blackFade / 100;
        
        if (u <= fadeStart) {
          r = 0; g = 0; b = 0;
        } else if (u < fadeEnd) {
          const fadeProgress = (u - fadeStart) / (fadeEnd - fadeStart);
          r = lerp(0, r, fadeProgress);
          g = lerp(0, g, fadeProgress);
          b = lerp(0, b, fadeProgress);
        }
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = Math.round(Math.max(0, Math.min(255, r)));
      data[idx + 1] = Math.round(Math.max(0, Math.min(255, g)));
      data[idx + 2] = Math.round(Math.max(0, Math.min(255, b)));
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  console.log('[BannerExport] Render complete');
}

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
      // Render an offscreen BannerCanvas at the *exact* target resolution,
      // then capture via WebGL readPixels for pixel-perfect fidelity.
      const host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.left = '-10000px';
      host.style.top = '-10000px';
      host.style.width = `${config.width}px`;
      host.style.height = `${config.height}px`;
      host.style.pointerEvents = 'none';
      host.style.opacity = '0';
      document.body.appendChild(host);

      const root = createRoot(host);
      root.render(
        <div style={{ width: config.width, height: config.height }}>
          <BannerCanvas config={{ ...config, animate: false }} className="w-full h-full" />
        </div>
      );

      // Give WebGL a moment to draw
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      const sourceCanvas = host.querySelector('canvas') as HTMLCanvasElement | null;
      if (!sourceCanvas) {
        root.unmount();
        document.body.removeChild(host);
        toast.error('WebGL canvas not found');
        return;
      }

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = config.width;
      exportCanvas.height = config.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) {
        root.unmount();
        document.body.removeChild(host);
        toast.error('Could not create export canvas');
        return;
      }

      await captureWebGLCanvasTo2D(sourceCanvas, ctx, config.width, config.height);

      // Re-apply hero banner black fade overlay (matches on-screen CSS overlay)
      if (config.type === 'hero') {
        const g = ctx.createLinearGradient(0, 0, config.width, 0);
        const fadeStart = (config.blackFadePercentage * 0.5) / 100;
        const fadeEnd = config.blackFadePercentage / 100;
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(fadeStart, 'rgba(0,0,0,1)');
        g.addColorStop(fadeEnd, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, config.width, config.height);
        ctx.restore();
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        exportCanvas.toBlob(resolve, 'image/png', 1.0)
      );

      root.unmount();
      document.body.removeChild(host);

      if (!blob) {
        toast.error('Failed to create image');
        return;
      }

      downloadBlob(
        blob,
        `${config.type}-banner-${config.effectType}-${config.width}x${config.height}.png`
      );

      toast.success(`${config.type === 'hero' ? 'Hero' : 'Small'} banner exported at ${config.width}x${config.height}!`);
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
