import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Image, FileImage, Code, Copy, Check, Monitor, Printer, LayoutGrid, Share2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { GradientConfig, exportCategories, ExportCategory } from '@/types/gradient';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: GradientConfig;
}

type ExportTab = 'image' | 'css';

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

export const ExportModal = ({ isOpen, onClose, config }: ExportModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState<ExportCategory>('social');
  const [selectedSize, setSelectedSize] = useState(exportCategories.social[0]);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<ExportTab>('image');
  const [copied, setCopied] = useState(false);

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
      toast.error('Failed to copy');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    const width = useCustomSize ? customWidth : selectedSize.width;
    const height = useCustomSize ? customHeight : selectedSize.height;

    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        toast.error('Canvas not found');
        setIsExporting(false);
        return;
      }

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext('2d');
      
      if (!ctx) {
        toast.error('Could not create export canvas');
        setIsExporting(false);
        return;
      }

      ctx.drawImage(canvas, 0, 0, width, height);

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpg' ? 0.95 : undefined;
      
      exportCanvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Export failed');
          setIsExporting(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gradient-${width}x${height}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`Exported ${width}x${height} ${format.toUpperCase()}`);
        setIsExporting(false);
        onClose();
      }, mimeType, quality);
    } catch {
      toast.error('Export failed');
      setIsExporting(false);
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[85vh]"
          >
            <div className="glass rounded-2xl p-6 mx-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold text-foreground">Export Gradient</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

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
                  Image
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
                  CSS Code
                </button>
              </div>

              {activeTab === 'image' ? (
                <div className="space-y-6">
                  {/* Category Selection */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-3 block">Use Case</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(exportCategories) as ExportCategory[]).map((category) => (
                        <button
                          key={category}
                          onClick={() => handleCategoryChange(category)}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                            selectedCategory === category
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }`}
                        >
                          {categoryIcons[category]}
                          {categoryLabels[category]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Selection */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-3 block">Size</label>
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
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all text-left ${
                          useCustomSize
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        <div>Custom</div>
                        <div className="text-xs opacity-70">Any size</div>
                      </button>
                    </div>
                  </div>

                  {/* Custom Size */}
                  {useCustomSize && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-sm text-muted-foreground mb-2 block">Width</label>
                        <input
                          type="number"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(Number(e.target.value))}
                          className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm text-muted-foreground mb-2 block">Height</label>
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
                    <label className="text-sm text-muted-foreground mb-3 block">Format</label>
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
                    className="w-full py-4 rounded-full bg-gradient-to-r from-primary via-accent to-gradient-3 text-primary-foreground font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Download className="w-5 h-5" />
                    {isExporting ? 'Exporting...' : 'Download'}
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
                    <label className="text-sm text-muted-foreground mb-3 block">Color Values</label>
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
                    className="w-full py-4 rounded-full bg-gradient-to-r from-primary via-accent to-gradient-3 text-primary-foreground font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'Copied!' : 'Copy CSS'}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
