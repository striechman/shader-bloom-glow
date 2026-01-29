import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { CustomMeshGradient } from './CustomMeshGradient';
import { GradientConfig, defaultGradientConfig } from '@/types/gradient';
import { Label } from '@/components/ui/label';

const brandColors = [
  { name: 'Yellow Orange', hex: '#FDB515' },
  { name: 'Coral', hex: '#F25665' },
  { name: 'Magenta', hex: '#E71989' },
  { name: 'Deep Violet', hex: '#6A00F4' },
  { name: 'Electric Blue', hex: '#00C2FF' },
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
];

const buttonSizes = [
  { id: 'large', label: 'L', width: 240, height: 64 },
  { id: 'medium', label: 'M', width: 180, height: 48 },
  { id: 'small', label: 'S', width: 120, height: 40 },
] as const;

interface WebButtonsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const WebButtonsPanel = ({ isOpen, onToggle }: WebButtonsPanelProps) => {
  const [selectedSize, setSelectedSize] = useState<'large' | 'medium' | 'small'>('medium');
  const [previewState, setPreviewState] = useState<'default' | 'hover'>('default');
  
  // Button-specific gradient config
  const [buttonConfig, setButtonConfig] = useState({
    defaultColor1: '#FDB515',
    defaultColor2: '#E71989',
    defaultColor3: '#000000',
    hoverColor1: '#E71989',
    hoverColor2: '#6A00F4',
    hoverColor3: '#000000',
  });

  const handleColorChange = (colorKey: string, value: string) => {
    setButtonConfig(prev => ({ ...prev, [colorKey]: value }));
  };

  const currentSize = buttonSizes.find(s => s.id === selectedSize) || buttonSizes[1];
  
  // Create mesh gradient config for the button preview
  const getMeshConfig = (): GradientConfig => {
    const colors = previewState === 'hover' 
      ? { color1: buttonConfig.hoverColor1, color2: buttonConfig.hoverColor2, color3: buttonConfig.hoverColor3 }
      : { color1: buttonConfig.defaultColor1, color2: buttonConfig.defaultColor2, color3: buttonConfig.defaultColor3 };
    
    return {
      ...defaultGradientConfig,
      ...colors,
      wireframe: true,
      animate: false,
      meshNoiseScale: 1.0,
      meshBlur: 50,
    };
  };

  return (
    <>
      {/* Toggle Button - always visible */}
      <motion.button
        onClick={onToggle}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full glass flex items-center gap-2 text-foreground hover:bg-secondary/50 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Square className="w-4 h-4" />
        <span className="text-sm font-medium">Buttons</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border"
          >
            <div className="max-w-4xl mx-auto p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-lg font-semibold text-foreground">Button Generator</h3>
                <button onClick={onToggle} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Preview */}
                <div className="flex flex-col items-center justify-center gap-4 p-4 rounded-lg bg-secondary/30">
                  <div
                    className="relative overflow-hidden"
                    style={{
                      width: currentSize.width,
                      height: currentSize.height,
                      borderRadius: '9999px',
                    }}
                  >
                    <Canvas
                      style={{ width: '100%', height: '100%', position: 'absolute' }}
                      camera={{ position: [0, 0, 5], fov: 50 }}
                      gl={{ preserveDrawingBuffer: true, alpha: true }}
                    >
                      <CustomMeshGradient config={getMeshConfig()} />
                    </Canvas>
                    {/* Glass overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        borderRadius: '9999px',
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1)',
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {currentSize.width} × {currentSize.height}px
                  </span>
                </div>

                {/* Controls */}
                <div className="space-y-4">
                  {/* Size Selection */}
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Size</Label>
                    <div className="flex gap-2">
                      {buttonSizes.map((size) => (
                        <button
                          key={size.id}
                          onClick={() => setSelectedSize(size.id)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
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

                  {/* State Toggle */}
                  <div>
                    <Label className="text-muted-foreground mb-2 block">State</Label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewState('default')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          previewState === 'default'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        Default
                      </button>
                      <button
                        onClick={() => setPreviewState('hover')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          previewState === 'hover'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        Hover
                      </button>
                    </div>
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-4">
                  <Label className="text-muted-foreground block">
                    {previewState === 'hover' ? 'Hover Colors' : 'Default Colors'}
                  </Label>
                  {[1, 2, 3].map((num) => {
                    const colorKey = previewState === 'hover' ? `hoverColor${num}` : `defaultColor${num}`;
                    const currentColor = buttonConfig[colorKey as keyof typeof buttonConfig];
                    return (
                      <div key={num} className="flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground w-16">Color {num}</span>
                        {brandColors.map((color) => (
                          <button
                            key={color.hex}
                            onClick={() => handleColorChange(colorKey, color.hex)}
                            className={`w-6 h-6 rounded transition-all border ${
                              currentColor === color.hex
                                ? 'border-primary scale-110 ring-2 ring-primary ring-offset-1 ring-offset-background'
                                : 'border-border hover:scale-105'
                            }`}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};