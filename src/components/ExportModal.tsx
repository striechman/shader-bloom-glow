import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Download, Image, FileImage, Code, Copy, Check, Monitor, Printer, LayoutGrid, Share2, Video, Play } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { GradientConfig, exportCategories, ExportCategory } from '@/types/gradient';
import { Slider } from '@/components/ui/slider';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: GradientConfig;
}

type ExportTab = 'image' | 'video' | 'css';

const categoryIcons: Record<ExportCategory, React.ReactNode> = {
  social: <Share2 className="w-4 h-4" />,
  web: <Monitor className="w-4 h-4" />,
  print: <Printer className="w-4 h-4" />,
  banner: <LayoutGrid className="w-4 h-4" />,
};

const categoryLabels: Record<ExportCategory, string> = {
  social: 'Social',
  web: 'Web',
  print: 'Print',
  banner: 'Banner',
};

const videoResolutions = [
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '4K', width: 3840, height: 2160 },
];

// Simplex noise for high-quality mesh gradient export
function simplexNoise2D(x: number, y: number): number {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;
  
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  
  const grad = (hash: number, dx: number, dy: number): number => {
    const h = hash & 7;
    const u = h < 4 ? dx : dy;
    const v = h < 4 ? dy : dx;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  };
  
  const perm = (n: number): number => {
    const p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225];
    return p[n & 15];
  };
  
  const ii = i & 255;
  const jj = j & 255;
  
  let n0 = 0, n1 = 0, n2 = 0;
  
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    t0 *= t0;
    n0 = t0 * t0 * grad(perm(ii + perm(jj)), x0, y0);
  }
  
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    t1 *= t1;
    n1 = t1 * t1 * grad(perm(ii + i1 + perm(jj + j1)), x1, y1);
  }
  
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    t2 *= t2;
    n2 = t2 * t2 * grad(perm(ii + 1 + perm(jj + 1)), x2, y2);
  }
  
  return 70 * (n0 + n1 + n2);
}

// Render mesh gradient at full resolution for export
async function renderMeshGradientToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: GradientConfig
): Promise<void> {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  const noiseScale = config.meshNoiseScale ?? 3.0;
  const blur = (config.meshBlur ?? 50) / 100;
  const blurFactor = blur * 0.5;
  
  const w1 = config.colorWeight1 / 100;
  const w2 = config.colorWeight2 / 100;
  const threshold1 = w1;
  const threshold2 = w1 + w2;
  
  const parseColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };
  
  const color1 = parseColor(config.color1);
  const color2 = parseColor(config.color2);
  const color3 = parseColor(config.color3);
  
  const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };
  
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const time = config.frozenTime ?? 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      
      const n1 = simplexNoise2D(u * noiseScale, v * noiseScale + time * 0.1) * 0.5 + 0.5;
      const n2 = simplexNoise2D(u * noiseScale * 2 + 100, v * noiseScale * 2 + 100) * 0.25;
      const n3 = simplexNoise2D(u * noiseScale * 4 + 200, v * noiseScale * 4 + 200) * 0.125;
      
      let noise = (n1 + n2 + n3) / 1.375;
      noise = Math.max(0, Math.min(1, noise));
      
      const edge1 = smoothstep(threshold1 - blurFactor, threshold1 + blurFactor, noise);
      const edge2 = smoothstep(threshold2 - blurFactor, threshold2 + blurFactor, noise);
      
      let r = lerp(color1.r, color2.r, edge1);
      let g = lerp(color1.g, color2.g, edge1);
      let b = lerp(color1.b, color2.b, edge1);
      
      r = lerp(r, color3.r, edge2);
      g = lerp(g, color3.g, edge2);
      b = lerp(b, color3.b, edge2);
      
      const idx = (y * width + x) * 4;
      data[idx] = Math.round(r);
      data[idx + 1] = Math.round(g);
      data[idx + 2] = Math.round(b);
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

export const ExportModal = ({ isOpen, onClose, config }: ExportModalProps) => {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<ExportCategory>('social');
  const [selectedSize, setSelectedSize] = useState(exportCategories.social[0]);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<ExportTab>('image');
  const [copied, setCopied] = useState(false);
  
  // Video export settings
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoResolution, setVideoResolution] = useState(videoResolutions[1]);
  const [videoProgress, setVideoProgress] = useState(0);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      // Cleanup any running recordings
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsExporting(false);
      setVideoProgress(0);
    }
  }, [isOpen]);

  const handleCategoryChange = (category: ExportCategory) => {
    setSelectedCategory(category);
    setSelectedSize(exportCategories[category][0]);
    setUseCustomSize(false);
  };

  const generateCSSCode = () => {
    if (!config) return '';
    
    const w1 = config.colorWeight1 ?? 33;
    const w2 = w1 + (config.colorWeight2 ?? 34);
    
    return `.gradient-background {
  background: linear-gradient(
    135deg,
    ${config.color1} 0%,
    ${config.color1} ${w1}%,
    ${config.color2} ${w1}%,
    ${config.color2} ${w2}%,
    ${config.color3} ${w2}%,
    ${config.color3} 100%
  );
}

/* Smooth gradient variant */
.gradient-background-smooth {
  background: linear-gradient(
    135deg,
    ${config.color1} 0%,
    ${config.color2} 50%,
    ${config.color3} 100%
  );
}

/* Radial gradient variant */
.gradient-background-radial {
  background: radial-gradient(
    ellipse at center,
    ${config.color1} 0%,
    ${config.color2} 50%,
    ${config.color3} 100%
  );
}

/* Conic gradient variant */
.gradient-background-conic {
  background: conic-gradient(
    from 0deg,
    ${config.color1},
    ${config.color2},
    ${config.color3},
    ${config.color1}
  );
}`;
  };

  const handleCopyCSS = async () => {
    const css = generateCSSCode();
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      toast.success('CSS copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
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

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const targetWidth = useCustomSize ? customWidth : selectedSize.width;
      const targetHeight = useCustomSize ? customHeight : selectedSize.height;

      // Create high-resolution offscreen canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        toast.error('Failed to create export context');
        setIsExporting(false);
        return;
      }

      // Check if we're in Mesh mode (wireframe) - need to render gradient directly
      const isMeshMode = config?.wireframe === true;
      
      if (isMeshMode && config) {
        // For Mesh mode: render the noise-based gradient directly to canvas at full resolution
        await renderMeshGradientToCanvas(ctx, targetWidth, targetHeight, config);
      } else {
        // For ShaderGradient modes: try to capture from WebGL, then enhance
        const sourceCanvas = document.querySelector('#gradient-stage canvas') as HTMLCanvasElement | null;
        
        if (sourceCanvas) {
          // Wait for render
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
              });
            });
          });
          
          // Draw source at target resolution
          ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
        }

        // Add weight overlay for static mode
        if (config) {
          const isFrozen = config.frozenTime !== null;
          const isStaticMode = !config.animate || isFrozen;

          if (isStaticMode) {
            const w1 = config.colorWeight1;
            const w2 = w1 + config.colorWeight2;
            const feather = 6;
            const f1 = Math.max(0, w1 - feather) / 100;
            const f2 = Math.min(100, w1 + feather) / 100;
            const f3 = Math.max(0, w2 - feather) / 100;
            const f4 = Math.min(100, w2 + feather) / 100;

            const g = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
            g.addColorStop(0, config.color1);
            g.addColorStop(f1, config.color1);
            g.addColorStop(f2, config.color2);
            g.addColorStop(f3, config.color2);
            g.addColorStop(f4, config.color3);
            g.addColorStop(1, config.color3);

            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.globalCompositeOperation = 'source-over';
            ctx.filter = 'blur(32px)';
            ctx.fillStyle = g;
            const padX = targetWidth * 0.04;
            const padY = targetHeight * 0.04;
            ctx.fillRect(-padX, -padY, targetWidth + padX * 2, targetHeight + padY * 2);
            ctx.restore();
          }
        }
      }

      // Export
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpg' ? 0.98 : undefined;

      tempCanvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to create image');
          setIsExporting(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `gradient-${targetWidth}x${targetHeight}.${format}`;
        link.href = url;
        link.rel = 'noopener';

        // Some browsers (notably iOS Safari) can ignore download on blob URLs.
        // Try download first; if it fails, open in a new tab.
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Best-effort fallback for iOS Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }

        setTimeout(() => URL.revokeObjectURL(url), 500);

        toast.success(`Exported ${format.toUpperCase()} (${targetWidth}×${targetHeight})`);
        setIsExporting(false);
      }, mimeType, quality);

    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
      setIsExporting(false);
    }
  };

  const handleExportVideo = async () => {
    setIsExporting(true);
    setVideoProgress(0);
    
    try {
      const canvas = document.querySelector('#gradient-stage canvas') as HTMLCanvasElement | null;
      if (!canvas) {
        toast.error('Canvas not found');
        setIsExporting(false);
        return;
      }

      // Check for MP4 support
      const mp4Supported = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1');
      const webmVp9Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
      const webmVp8Supported = MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
      
      let mimeType = 'video/webm';
      let extension = 'webm';
      
      if (mp4Supported) {
        mimeType = 'video/mp4;codecs=avc1';
        extension = 'mp4';
      } else if (webmVp9Supported) {
        mimeType = 'video/webm;codecs=vp9';
        toast.info('Browser does not support MP4, exporting as WebM');
      } else if (webmVp8Supported) {
        mimeType = 'video/webm;codecs=vp8';
        toast.info('Browser does not support MP4, exporting as WebM');
      }

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000,
      });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gradient-${videoResolution.label}-${videoDuration}s.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success(`Video exported: ${videoResolution.label}, ${videoDuration}s (${extension.toUpperCase()})`);
        setIsExporting(false);
        setVideoProgress(0);
        onClose();
      };

      mediaRecorder.onerror = () => {
        toast.error('Video recording failed');
        setIsExporting(false);
        setVideoProgress(0);
      };

      // Start recording
      mediaRecorder.start();
      
      // Update progress
      const startTime = Date.now();
      recordingIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min((elapsed / videoDuration) * 100, 100);
        setVideoProgress(progress);
      }, 100);

      // Stop after duration
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, videoDuration * 1000);

    } catch (error) {
      console.error('Video export failed:', error);
      toast.error('Video export failed');
      setIsExporting(false);
      setVideoProgress(0);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />
          <div ref={constraintsRef} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              drag
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={constraintsRef}
              dragMomentum={false}
              className="w-full max-w-lg"
            >
              <div className="glass rounded-2xl mx-auto max-h-[80vh] overflow-y-auto">
                <div
                  className="px-6 pt-4 pb-4 flex items-center justify-between border-b border-border cursor-move select-none sticky top-0 bg-background/80 backdrop-blur-sm z-10"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <div>
                    <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
                    <h2 className="font-display text-xl font-semibold text-foreground lowercase">export gradient</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="p-6 pb-8">
                  {/* Tab Selection */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setActiveTab('image')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'image'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Image className="w-4 h-4" />
                      image
                    </button>
                    <button
                      onClick={() => setActiveTab('video')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'video'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      video
                    </button>
                    <button
                      onClick={() => setActiveTab('css')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'css'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Code className="w-4 h-4" />
                      css
                    </button>
                  </div>

                  {activeTab === 'image' ? (
                    <div className="space-y-6">
                      {/* Category Selection */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-3 block lowercase">use case</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(Object.keys(exportCategories) as ExportCategory[]).map((category) => (
                            <button
                              key={category}
                              onClick={() => handleCategoryChange(category)}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 lowercase ${
                                selectedCategory === category
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                              }`}
                            >
                              {categoryIcons[category]}
                              {categoryLabels[category].toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Size Selection */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-3 block lowercase">size</label>
                        <div className="grid grid-cols-2 gap-2">
                          {exportCategories[selectedCategory].map((size) => (
                            <button
                              key={size.label}
                              onClick={() => {
                                setSelectedSize(size);
                                setUseCustomSize(false);
                              }}
                              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all text-left ${
                                !useCustomSize && selectedSize.label === size.label
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                              }`}
                            >
                              <div className="truncate">{size.label}</div>
                              <div className="text-xs opacity-70">{size.width}×{size.height}</div>
                            </button>
                          ))}
                          <button
                            onClick={() => setUseCustomSize(true)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all text-left lowercase ${
                              useCustomSize
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            <div>custom</div>
                            <div className="text-xs opacity-70">any size</div>
                          </button>
                        </div>
                      </div>

                      {/* Custom Size */}
                      {useCustomSize && (
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-sm text-muted-foreground mb-2 block lowercase">width</label>
                            <input
                              type="number"
                              value={customWidth}
                              onChange={(e) => setCustomWidth(Number(e.target.value))}
                              className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-sm text-muted-foreground mb-2 block lowercase">height</label>
                            <input
                              type="number"
                              value={customHeight}
                              onChange={(e) => setCustomHeight(Number(e.target.value))}
                              className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Format Selection */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-3 block lowercase">format</label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setFormat('png')}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                              format === 'png'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            <Image className="w-4 h-4" />
                            PNG
                          </button>
                          <button
                            onClick={() => setFormat('jpg')}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                              format === 'jpg'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            <FileImage className="w-4 h-4" />
                            JPG
                          </button>
                        </div>
                      </div>

                      {/* Export Button */}
                      <motion.button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full py-4 rounded-full bg-gradient-to-r from-primary via-accent to-gradient-3 text-foreground font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 lowercase"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Download className="w-5 h-5" />
                        {isExporting ? 'exporting...' : 'download'}
                      </motion.button>
                    </div>
                  ) : activeTab === 'video' ? (
                    <div className="space-y-6">
                      {/* Resolution */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-3 block lowercase">resolution</label>
                        <div className="grid grid-cols-3 gap-2">
                          {videoResolutions.map((res) => (
                            <button
                              key={res.label}
                              onClick={() => setVideoResolution(res)}
                              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                videoResolution.label === res.label
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                              }`}
                            >
                              {res.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Duration */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm text-muted-foreground lowercase">duration</label>
                          <span className="text-sm text-foreground">{videoDuration}s</span>
                        </div>
                        <Slider
                          value={[videoDuration]}
                          onValueChange={([value]) => setVideoDuration(value)}
                          min={1}
                          max={30}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1s</span>
                          <span>30s</span>
                        </div>
                      </div>

                      {/* Format Info */}
                      <div className="bg-secondary/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Video className="w-4 h-4" />
                          <span className="lowercase">output: mp4 or webm (depends on browser)</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 lowercase">
                          records the live animation at 30fps. make sure animation is enabled for best results.
                        </p>
                      </div>

                      {/* Progress Bar */}
                      {isExporting && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground lowercase">recording...</span>
                            <span className="text-foreground">{Math.round(videoProgress)}%</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-primary via-accent to-gradient-3"
                              initial={{ width: 0 }}
                              animate={{ width: `${videoProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Export Button */}
                      <motion.button
                        onClick={handleExportVideo}
                        disabled={isExporting}
                        className="w-full py-4 rounded-full bg-gradient-to-r from-primary via-accent to-gradient-3 text-foreground font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 lowercase"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        {isExporting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                            recording...
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5" />
                            record video
                          </>
                        )}
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* CSS Code Preview */}
                      <div className="relative">
                        <pre className="bg-secondary/80 rounded-lg p-4 text-sm text-foreground overflow-x-auto max-h-64 overflow-y-auto">
                          <code>{generateCSSCode()}</code>
                        </pre>
                        <button
                          onClick={handleCopyCSS}
                          className="absolute top-2 right-2 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>

                      {/* Color Values */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-3 block lowercase">color values</label>
                        <div className="space-y-2">
                          {config && [
                            { color: config.color1, weight: config.colorWeight1 },
                            { color: config.color2, weight: config.colorWeight2 },
                            { color: config.color3, weight: config.colorWeight3 },
                          ].map((item, index) => (
                            <div key={index} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-2">
                              <div 
                                className="w-8 h-8 rounded-md border border-border"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm font-mono text-foreground flex-1">{item.color.toUpperCase()}</span>
                              <span className="text-xs text-muted-foreground">{item.weight ?? 33}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Copy Button */}
                      <motion.button
                        onClick={handleCopyCSS}
                        className="w-full py-4 rounded-full bg-gradient-to-r from-primary via-accent to-gradient-3 text-foreground font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 lowercase"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        {copied ? 'copied!' : 'copy css'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
