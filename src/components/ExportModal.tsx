import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Download, Image, FileImage, Code, Copy, Check, Monitor, Printer, LayoutGrid, Share2, Video, Play } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
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

// Offscreen renderer for high-quality exports
interface OffscreenRendererProps {
  config: GradientConfig;
  width: number;
  height: number;
  onReady: (canvas: HTMLCanvasElement) => void;
}

const OffscreenRenderer = ({ config, width, height, onReady }: OffscreenRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isWireframe = config.wireframe === true;
  const isFrozen = config.frozenTime !== null;

  useEffect(() => {
    // Wait for the canvas to render
    const checkCanvas = () => {
      const canvas = containerRef.current?.querySelector('canvas');
      if (canvas) {
        // Give WebGL time to render a frame
        let frameCount = 0;
        const waitForRender = () => {
          frameCount++;
          if (frameCount >= 5) {
            onReady(canvas);
          } else {
            requestAnimationFrame(waitForRender);
          }
        };
        requestAnimationFrame(waitForRender);
      } else {
        requestAnimationFrame(checkCanvas);
      }
    };
    requestAnimationFrame(checkCanvas);
  }, [onReady]);

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: '-99999px',
        top: '-99999px',
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        visibility: 'hidden',
      }}
    >
      <ShaderGradientCanvas
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
        pixelDensity={1}
        pointerEvents="none"
      >
        <ShaderGradient
          animate="off"
          type={config.type}
          wireframe={isWireframe}
          shader="defaults"
          uTime={isFrozen ? config.frozenTime ?? 0 : 0}
          uSpeed={config.speed}
          uStrength={isWireframe ? 1.5 : config.uStrength}
          uDensity={isWireframe ? config.meshDensity : config.uDensity}
          uFrequency={isWireframe ? 8 : config.uFrequency}
          uAmplitude={isWireframe ? 1 : 0.5}
          positionX={0}
          positionY={0}
          positionZ={0}
          rotationX={isWireframe ? config.meshAngle : 0}
          rotationY={isWireframe ? 0 : 10}
          rotationZ={isWireframe ? 0 : 50}
          color1={config.color1}
          color2={config.color2}
          color3={config.color3}
          reflection={isWireframe ? 0.5 : 0.1}
          cAzimuthAngle={180}
          cPolarAngle={isWireframe ? 90 : 115}
          cDistance={isWireframe ? 2.5 : 4.5}
          cameraZoom={1}
          lightType="3d"
          brightness={isWireframe ? 2 : 1.4}
          envPreset="city"
          grain={config.grain ? 'on' : 'off'}
          toggleAxis={false}
          zoomOut={false}
        />
      </ShaderGradientCanvas>
    </div>,
    document.body
  );
};

// Video renderer component
interface VideoRendererProps {
  config: GradientConfig;
  width: number;
  height: number;
  duration: number;
  onProgress: (progress: number) => void;
  onComplete: (blob: Blob, extension: string) => void;
  onError: (error: string) => void;
}

const VideoRenderer = ({ config, width, height, duration, onProgress, onComplete, onError }: VideoRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const isWireframe = config.wireframe === true;

  useEffect(() => {
    let chunks: Blob[] = [];
    
    const startRecording = (canvas: HTMLCanvasElement) => {
      try {
        const stream = canvas.captureStream(30);
        
        // Check for MP4 support
        const mp4Supported = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1');
        const webmSupported = MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
        
        let mimeType = 'video/webm';
        let extension = 'webm';
        
        if (mp4Supported) {
          mimeType = 'video/mp4;codecs=avc1';
          extension = 'mp4';
        } else if (webmSupported) {
          mimeType = 'video/webm;codecs=vp9';
          extension = 'webm';
          toast.info('הדפדפן לא תומך MP4, הקובץ יישמר כ-WebM');
        }
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 8000000,
        });
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          onComplete(blob, extension);
        };
        
        mediaRecorder.start();
        
        const startTime = Date.now();
        intervalRef.current = window.setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          const progress = Math.min((elapsed / duration) * 100, 100);
          onProgress(progress);
        }, 100);
        
        timeoutRef.current = window.setTimeout(() => {
          if (intervalRef.current) clearInterval(intervalRef.current);
          mediaRecorder.stop();
        }, duration * 1000);
        
      } catch (error) {
        console.error('Recording failed:', error);
        onError('שגיאה בהקלטה');
      }
    };

    const checkCanvas = () => {
      const canvas = containerRef.current?.querySelector('canvas');
      if (canvas) {
        let frameCount = 0;
        const waitForRender = () => {
          frameCount++;
          if (frameCount >= 5) {
            startRecording(canvas);
          } else {
            requestAnimationFrame(waitForRender);
          }
        };
        requestAnimationFrame(waitForRender);
      } else {
        requestAnimationFrame(checkCanvas);
      }
    };
    requestAnimationFrame(checkCanvas);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [config, width, height, duration, onProgress, onComplete, onError]);

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: '-99999px',
        top: '-99999px',
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        visibility: 'hidden',
      }}
    >
      <ShaderGradientCanvas
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
        pixelDensity={1}
        pointerEvents="none"
      >
        <ShaderGradient
          animate="on"
          type={config.type}
          wireframe={isWireframe}
          shader="defaults"
          uTime={0}
          uSpeed={config.speed}
          uStrength={isWireframe ? 1.5 : config.uStrength}
          uDensity={isWireframe ? config.meshDensity : config.uDensity}
          uFrequency={isWireframe ? 8 : config.uFrequency}
          uAmplitude={isWireframe ? 1 : 3.2}
          positionX={0}
          positionY={0}
          positionZ={0}
          rotationX={isWireframe ? config.meshAngle : 0}
          rotationY={isWireframe ? 0 : 10}
          rotationZ={isWireframe ? 0 : 50}
          color1={config.color1}
          color2={config.color2}
          color3={config.color3}
          reflection={isWireframe ? 0.5 : 0.1}
          cAzimuthAngle={180}
          cPolarAngle={isWireframe ? 90 : 115}
          cDistance={isWireframe ? 2.5 : 3.6}
          cameraZoom={1}
          lightType="3d"
          brightness={isWireframe ? 2 : 1.4}
          envPreset="city"
          grain={config.grain ? 'on' : 'off'}
          toggleAxis={false}
          zoomOut={false}
        />
      </ShaderGradientCanvas>
    </div>,
    document.body
  );
};

export const ExportModal = ({ isOpen, onClose, config }: ExportModalProps) => {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

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
  
  // Offscreen rendering states
  const [showOffscreenRenderer, setShowOffscreenRenderer] = useState(false);
  const [showVideoRenderer, setShowVideoRenderer] = useState(false);
  const [exportDimensions, setExportDimensions] = useState({ width: 1920, height: 1080 });

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      setShowOffscreenRenderer(false);
      setShowVideoRenderer(false);
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

  const handleExport = () => {
    if (!config) return;
    
    setIsExporting(true);
    const width = useCustomSize ? customWidth : selectedSize.width;
    const height = useCustomSize ? customHeight : selectedSize.height;
    setExportDimensions({ width, height });
    setShowOffscreenRenderer(true);
  };

  const handleOffscreenReady = useCallback((canvas: HTMLCanvasElement) => {
    try {
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpg' ? 0.95 : undefined;
      
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('יצירת התמונה נכשלה');
          setIsExporting(false);
          setShowOffscreenRenderer(false);
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `gradient-${exportDimensions.width}x${exportDimensions.height}.${format}`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success(`ייצוא ${format.toUpperCase()} הצליח! (${exportDimensions.width}×${exportDimensions.height})`);
        setIsExporting(false);
        setShowOffscreenRenderer(false);
        onClose();
      }, mimeType, quality);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('ייצוא נכשל');
      setIsExporting(false);
      setShowOffscreenRenderer(false);
    }
  }, [format, exportDimensions, onClose]);

  const handleExportVideo = () => {
    if (!config) return;
    
    setIsExporting(true);
    setVideoProgress(0);
    setExportDimensions({ width: videoResolution.width, height: videoResolution.height });
    setShowVideoRenderer(true);
  };

  const handleVideoProgress = useCallback((progress: number) => {
    setVideoProgress(progress);
  }, []);

  const handleVideoComplete = useCallback((blob: Blob, extension: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradient-${videoResolution.label}-${videoDuration}s.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`וידאו יוצא: ${videoResolution.label}, ${videoDuration}s (${extension.toUpperCase()})`);
    setIsExporting(false);
    setVideoProgress(0);
    setShowVideoRenderer(false);
    onClose();
  }, [videoResolution.label, videoDuration, onClose]);

  const handleVideoError = useCallback((error: string) => {
    toast.error(error);
    setIsExporting(false);
    setVideoProgress(0);
    setShowVideoRenderer(false);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Offscreen renderers */}
          {showOffscreenRenderer && config && (
            <OffscreenRenderer
              config={config}
              width={exportDimensions.width}
              height={exportDimensions.height}
              onReady={handleOffscreenReady}
            />
          )}
          {showVideoRenderer && config && (
            <VideoRenderer
              config={config}
              width={exportDimensions.width}
              height={exportDimensions.height}
              duration={videoDuration}
              onProgress={handleVideoProgress}
              onComplete={handleVideoComplete}
              onError={handleVideoError}
            />
          )}

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
                          <span className="lowercase">output: mp4 (or webm if not supported)</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 lowercase">
                          הקלטה ברזולוציה שנבחרה ({videoResolution.width}×{videoResolution.height}) ב-30fps.
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
