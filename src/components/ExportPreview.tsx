import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Move, RotateCcw } from 'lucide-react';
import { GradientConfig } from '@/types/gradient';

interface ExportPreviewProps {
  config: GradientConfig;
  width: number;
  height: number;
  onOffsetChange: (offset: { x: number; y: number }) => void;
  offset: { x: number; y: number };
}

export const ExportPreview = ({ 
  config, 
  width, 
  height, 
  onOffsetChange,
  offset 
}: ExportPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = useState({ x: 0, y: 0 });

  // Calculate preview dimensions to fit in container while maintaining aspect ratio
  const maxPreviewWidth = 400;
  const maxPreviewHeight = 200;
  const aspectRatio = width / height;
  
  let previewWidth: number;
  let previewHeight: number;
  
  if (aspectRatio > maxPreviewWidth / maxPreviewHeight) {
    previewWidth = maxPreviewWidth;
    previewHeight = maxPreviewWidth / aspectRatio;
  } else {
    previewHeight = maxPreviewHeight;
    previewWidth = maxPreviewHeight * aspectRatio;
  }

  // Generate CSS gradient based on config
  const generateGradientCSS = useCallback(() => {
    const w0 = config.colorWeight0 ?? 30;
    const w1 = w0 + (config.colorWeight1 ?? 23);
    const w2 = w1 + (config.colorWeight2 ?? 24);
    
    // Calculate angle for plane mode
    let angle = 135;
    if (config.type === 'plane' && !config.wireframe) {
      if (config.planeRadial) {
        // Radial gradient
        return `radial-gradient(circle at ${50 + offset.x}% ${50 + offset.y}%, 
          ${config.color1} 0%, 
          ${config.color2} 40%, 
          ${config.color3} 70%,
          ${config.color0 ?? '#000000'} 100%)`;
      }
      angle = (config.planeAngle ?? 45) + 90; // CSS angles are different from shader
    }
    
    // Adjust gradient position based on offset
    const offsetAngle = Math.atan2(offset.y, offset.x) * (180 / Math.PI);
    const offsetMagnitude = Math.sqrt(offset.x * offset.x + offset.y * offset.y);
    
    return `linear-gradient(
      ${angle}deg,
      ${config.color0 ?? '#000000'} ${Math.max(0, w0 - offsetMagnitude)}%,
      ${config.color1} ${w0 + offsetMagnitude * 0.5}%,
      ${config.color2} ${w1}%,
      ${config.color3} ${Math.min(100, w2 + offsetMagnitude * 0.3)}%
    )`;
  }, [config, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialOffset({ ...offset });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = (e.clientX - dragStart.x) / previewWidth * 50;
    const deltaY = (e.clientY - dragStart.y) / previewHeight * 50;
    
    // Clamp offset to reasonable range
    const newX = Math.max(-30, Math.min(30, initialOffset.x + deltaX));
    const newY = Math.max(-30, Math.min(30, initialOffset.y + deltaY));
    
    onOffsetChange({ x: newX, y: newY });
  }, [isDragging, dragStart, initialOffset, previewWidth, previewHeight, onOffsetChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleReset = () => {
    onOffsetChange({ x: 0, y: 0 });
  };

  const hasOffset = offset.x !== 0 || offset.y !== 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm text-muted-foreground lowercase flex items-center gap-2">
          <Move className="w-4 h-4" />
          preview (drag to adjust)
        </label>
        {hasOffset && (
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            reset
          </button>
        )}
      </div>
      
      <div 
        ref={containerRef}
        className="relative bg-secondary/30 rounded-lg p-4 flex items-center justify-center overflow-hidden"
        style={{ minHeight: previewHeight + 32 }}
      >
        {/* Size indicator */}
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          {width} × {height}
        </div>
        
        {/* Preview frame */}
        <motion.div
          className="relative rounded-lg overflow-hidden shadow-lg cursor-move select-none"
          style={{
            width: previewWidth,
            height: previewHeight,
          }}
          onMouseDown={handleMouseDown}
          whileHover={{ scale: 1.02 }}
          animate={{ scale: isDragging ? 1.02 : 1 }}
        >
          {/* Gradient preview */}
          <div
            className="absolute inset-0 transition-all duration-100"
            style={{
              background: generateGradientCSS(),
              transform: `translate(${offset.x * 0.5}%, ${offset.y * 0.5}%)`,
            }}
          />
          
          {/* Drag indicator overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
              <Move className="w-6 h-6 text-white/70" />
            </div>
          )}
          
          {/* Border frame */}
          <div className="absolute inset-0 border-2 border-white/20 rounded-lg pointer-events-none" />
        </motion.div>
        
        {/* Offset indicator */}
        {hasOffset && (
          <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
            offset: {offset.x.toFixed(0)}, {offset.y.toFixed(0)}
          </div>
        )}
      </div>
    </div>
  );
};
