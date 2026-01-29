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

// ============================================================================
// High-Quality Banner Renderer (JS-based, pixel-perfect at any resolution)
// ============================================================================

function mod289(x: number): number {
  return x - Math.floor(x / 289.0) * 289.0;
}

function permute(x: number): number {
  return mod289(((x * 34.0) + 1.0) * x);
}

function taylorInvSqrt(r: number): number {
  return 1.79284291400159 - 0.85373472095314 * r;
}

function simplexNoise3D(x: number, y: number, z: number): number {
  const C_x = 1.0 / 6.0;
  const C_y = 1.0 / 3.0;
  
  const dot_v_Cyyy = x * C_y + y * C_y + z * C_y;
  const i = Math.floor(x + dot_v_Cyyy);
  const j = Math.floor(y + dot_v_Cyyy);
  const k = Math.floor(z + dot_v_Cyyy);
  
  const dot_ijk_Cxxx = (i + j + k) * C_x;
  const x0 = x - (i - dot_ijk_Cxxx);
  const y0 = y - (j - dot_ijk_Cxxx);
  const z0 = z - (k - dot_ijk_Cxxx);
  
  let i1: number, j1: number, k1: number;
  let i2: number, j2: number, k2: number;
  
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
  }
  
  const x1 = x0 - i1 + C_x;
  const y1 = y0 - j1 + C_x;
  const z1 = z0 - k1 + C_x;
  const x2 = x0 - i2 + C_y;
  const y2 = y0 - j2 + C_y;
  const z2 = z0 - k2 + C_y;
  const x3 = x0 - 0.5;
  const y3 = y0 - 0.5;
  const z3 = z0 - 0.5;
  
  const ii = mod289(i);
  const jj = mod289(j);
  const kk = mod289(k);
  
  const p0 = permute(permute(permute(kk) + jj) + ii);
  const p1 = permute(permute(permute(kk + k1) + jj + j1) + ii + i1);
  const p2 = permute(permute(permute(kk + k2) + jj + j2) + ii + i2);
  const p3 = permute(permute(permute(kk + 1) + jj + 1) + ii + 1);
  
  const n_ = 0.142857142857;
  const ns_x = n_ * 2.0 - 1.0;
  const ns_y = n_ * 0.5 - 0.0;
  const ns_z = n_ * n_;
  
  const calcGrad = (p: number) => {
    const j = p - 49.0 * Math.floor(p * ns_z * ns_z);
    const x_ = Math.floor(j * ns_z);
    const y_ = Math.floor(j - 7.0 * x_);
    const gx = x_ * ns_x + ns_y;
    const gy = y_ * ns_x + ns_y;
    const gz = 1.0 - Math.abs(gx) - Math.abs(gy);
    const len = Math.sqrt(gx * gx + gy * gy + gz * gz);
    const invLen = len > 0 ? taylorInvSqrt(gx * gx + gy * gy + gz * gz) : 0;
    return { x: gx * invLen, y: gy * invLen, z: gz * invLen };
  };
  
  const g0 = calcGrad(p0);
  const g1 = calcGrad(p1);
  const g2 = calcGrad(p2);
  const g3 = calcGrad(p3);
  
  let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
  
  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * (g0.x * x0 + g0.y * y0 + g0.z * z0); }
  
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * (g1.x * x1 + g1.y * y1 + g1.z * z1); }
  
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * (g2.x * x2 + g2.y * y2 + g2.z * z2); }
  
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 >= 0) { t3 *= t3; n3 = t3 * t3 * (g3.x * x3 + g3.y * y3 + g3.z * z3); }
  
  return 32.0 * (n0 + n1 + n2 + n3);
}

function parseColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function renderBannerHighQuality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: BannerConfig
): void {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  const color1 = parseColor(config.gradientColors[0] || '#FDB515');
  const color2 = parseColor(config.gradientColors[1] || '#EC008C');
  const color3 = parseColor(config.gradientColors[2] || '#6A00F4');
  
  const noiseScale = config.meshNoiseScale ?? 1.0;
  const blurFactor = ((config.meshBlur ?? 50) / 100) * 0.5;
  const time = 0; // Static export
  const freq = Math.max(0.1, config.uFrequency);
  const density = Math.max(0, config.uDensity);
  const strength = Math.max(0, config.uStrength);
  
  const w1 = (config.gradientWeights[0] ?? 33) / 100;
  const w2 = (config.gradientWeights[1] ?? 34) / 100;
  const threshold1 = w1;
  const threshold2 = w1 + w2;
  
  const isHero = config.type === 'hero';
  const blackFade = config.blackFadePercentage;
  
  const isMesh = config.effectType === 'mesh';
  const isPlane = config.effectType === 'plane';
  const isWater = config.effectType === 'waterPlane';
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      
      let noise: number;
      
      if (isMesh) {
        const noiseX = u * noiseScale * freq;
        const noiseY = v * noiseScale * freq;
        const n1 = simplexNoise3D(noiseX, noiseY, time) * 0.5 + 0.5;
        const n2 = simplexNoise3D(noiseX * 2 + 100, noiseY * 2 + 100, time) * (0.20 + 0.10 * density);
        const n3 = simplexNoise3D(noiseX * 4 + 200, noiseY * 4 + 200, time) * (0.10 + 0.06 * density);
        noise = (n1 + n2 + n3) / 1.375;
      } else if (isPlane) {
        const centeredU = u - 0.5;
        const centeredV = v - 0.5;
        const baseNoise = centeredU * 0.707 + centeredV * 0.707 + 0.5;
        const organicNoise = simplexNoise3D(u * 2 * freq, v * 2 * freq, time * 0.25) * 0.12 * density;
        noise = baseNoise + organicNoise;
        noise = Math.max(0, Math.min(1, noise));
      } else if (isWater) {
        const n1 = simplexNoise3D(u * 1.5 * freq, v * 1.5 * freq, time * 0.15) * 0.5 + 0.5;
        const n2 = simplexNoise3D(u * 1.05 * freq + 30, v * 1.05 * freq + 30, time * 0.15) * 0.4 + 0.5;
        const n3 = simplexNoise3D(u * 0.75 * freq + 60, v * 0.75 * freq + 60, time * 0.15) * 0.3 + 0.5;
        const wave = Math.sin(u * 4 + v * 3 + time * 0.3) * 0.1;
        noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2 + wave * density;
        noise = Math.max(0, Math.min(1, noise));
      } else {
        noise = (u + v) / 2;
      }
      
      noise = Math.pow(Math.max(0, Math.min(1, noise)), 1.0 + strength * 0.15);
      
      const edge1 = smoothstep(threshold1 - blurFactor, threshold1 + blurFactor, noise);
      const edge2 = smoothstep(threshold2 - blurFactor, threshold2 + blurFactor, noise);
      
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
      // Create high-resolution canvas at target size
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = config.width;
      exportCanvas.height = config.height;
      const ctx = exportCanvas.getContext('2d');
      
      if (!ctx) {
        toast.error('Could not create export canvas');
        return;
      }
      
      // Use high-quality JS renderer (pixel-perfect at any resolution)
      renderBannerHighQuality(ctx, config.width, config.height, config);

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
