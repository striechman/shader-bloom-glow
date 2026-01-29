import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';

const buttonSizes = [
  { id: 'large', label: 'L', width: 240, height: 64 },
  { id: 'medium', label: 'M', width: 180, height: 48 },
  { id: 'small', label: 'S', width: 120, height: 40 },
] as const;

// 6 Button color presets
const buttonPresets = [
  { 
    id: 'royal',
    name: 'Royal', 
    default: { color1: '#6A00F4', color2: '#E71989', color3: '#000000' }, 
    hover: { color1: '#E71989', color2: '#FDB515', color3: '#000000' } 
  },
  { 
    id: 'sunset',
    name: 'Sunset', 
    default: { color1: '#FDB515', color2: '#E71989', color3: '#000000' }, 
    hover: { color1: '#E71989', color2: '#6A00F4', color3: '#000000' } 
  },
  { 
    id: 'ocean',
    name: 'Ocean', 
    default: { color1: '#00C2FF', color2: '#6A00F4', color3: '#000000' }, 
    hover: { color1: '#6A00F4', color2: '#E71989', color3: '#000000' } 
  },
  { 
    id: 'fire',
    name: 'Fire', 
    default: { color1: '#F25665', color2: '#6A00F4', color3: '#000000' }, 
    hover: { color1: '#6A00F4', color2: '#E71989', color3: '#000000' } 
  },
  { 
    id: 'neon',
    name: 'Neon', 
    default: { color1: '#E71989', color2: '#00C2FF', color3: '#000000' }, 
    hover: { color1: '#00C2FF', color2: '#FDB515', color3: '#000000' } 
  },
  { 
    id: 'electric',
    name: 'Electric', 
    default: { color1: '#6A00F4', color2: '#FDB515', color3: '#000000' }, 
    hover: { color1: '#FDB515', color2: '#E71989', color3: '#000000' } 
  },
];

interface WebButtonsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const WebButtonsPanel = ({ isOpen, onToggle }: WebButtonsPanelProps) => {
  const [selectedSize, setSelectedSize] = useState<'large' | 'medium' | 'small'>('medium');
  const [selectedPreset, setSelectedPreset] = useState(buttonPresets[0]);
  const [isHovering, setIsHovering] = useState(false);

  const currentSize = buttonSizes.find(s => s.id === selectedSize) || buttonSizes[1];
  
  // Get current gradient based on hover state
  const currentColors = isHovering ? selectedPreset.hover : selectedPreset.default;
  const gradientStyle = `linear-gradient(135deg, ${currentColors.color1} 0%, ${currentColors.color2} 50%, ${currentColors.color3} 100%)`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border"
        >
          <div className="max-w-3xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-semibold text-foreground">Button Generator</h3>
              <button onClick={onToggle} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Preview Button */}
              <div className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-secondary/30">
                <motion.button
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                  className="relative overflow-hidden cursor-pointer font-semibold text-white"
                  style={{
                    width: currentSize.width,
                    height: currentSize.height,
                    borderRadius: '8px',
                    background: gradientStyle,
                    transition: 'background 0.3s ease-in-out',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    fontSize: selectedSize === 'small' ? '12px' : selectedSize === 'medium' ? '14px' : '16px',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Glass overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.15) 100%)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)',
                    }}
                  />
                  Click Here
                </motion.button>
                <div className="text-center">
                  <span className="text-xs text-muted-foreground block">
                    {currentSize.width} × {currentSize.height}px
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    Hover to see transition
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-6">
                {/* Presets */}
                <div>
                  <Label className="text-muted-foreground mb-3 block">Choose Preset</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {buttonPresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset)}
                        className={`h-10 rounded-lg overflow-hidden border-2 transition-all text-xs font-medium ${
                          selectedPreset.id === preset.id
                            ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                            : 'border-border hover:border-muted-foreground hover:scale-102'
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${preset.default.color1} 0%, ${preset.default.color2} 50%, ${preset.default.color3} 100%)`,
                        }}
                        title={preset.name}
                      >
                        <span className="text-white drop-shadow-md">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Selection */}
                <div>
                  <Label className="text-muted-foreground mb-3 block">Size</Label>
                  <div className="flex gap-2">
                    {buttonSizes.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size.id)}
                        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                          selectedSize === size.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
