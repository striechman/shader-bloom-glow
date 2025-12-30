import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Image, FileImage } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const exportSizes = [
  { label: 'Instagram Post', width: 1080, height: 1080 },
  { label: 'Instagram Story', width: 1080, height: 1920 },
  { label: 'Facebook Cover', width: 820, height: 312 },
  { label: 'Desktop Wallpaper', width: 1920, height: 1080 },
  { label: '4K Wallpaper', width: 3840, height: 2160 },
  { label: 'A4 Print (300dpi)', width: 2480, height: 3508 },
  { label: 'A3 Print (300dpi)', width: 3508, height: 4961 },
  { label: 'Custom', width: 1920, height: 1080 },
];

export const ExportModal = ({ isOpen, onClose }: ExportModalProps) => {
  const [selectedSize, setSelectedSize] = useState(exportSizes[3]);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    const width = selectedSize.label === 'Custom' ? customWidth : selectedSize.width;
    const height = selectedSize.label === 'Custom' ? customHeight : selectedSize.height;

    try {
      // Get the canvas element from the shader gradient
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        toast.error('Canvas not found');
        setIsExporting(false);
        return;
      }

      // Create a new canvas with the desired dimensions
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext('2d');
      
      if (!ctx) {
        toast.error('Could not create export canvas');
        setIsExporting(false);
        return;
      }

      // Draw the original canvas scaled to the new dimensions
      ctx.drawImage(canvas, 0, 0, width, height);

      // Convert to the selected format
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpg' ? 0.95 : undefined;
      
      exportCanvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Export failed');
          setIsExporting(false);
          return;
        }

        // Create download link
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
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
          >
            <div className="glass rounded-2xl p-6 mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold text-foreground">Export Gradient</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Size Selection */}
                <div>
                  <label className="text-sm text-muted-foreground mb-3 block">Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    {exportSizes.map((size) => (
                      <button
                        key={size.label}
                        onClick={() => setSelectedSize(size)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all text-left ${
                          selectedSize.label === size.label
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        <div>{size.label}</div>
                        {size.label !== 'Custom' && (
                          <div className="text-xs opacity-70">{size.width}×{size.height}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Size */}
                {selectedSize.label === 'Custom' && (
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
