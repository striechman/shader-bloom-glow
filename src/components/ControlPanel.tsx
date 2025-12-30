import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface GradientConfig {
  type: 'sphere' | 'plane' | 'waterPlane';
  animate: boolean;
  speed: number;
  color1: string;
  color2: string;
  color3: string;
  grain: boolean;
  uStrength: number;
  uDensity: number;
  uFrequency: number;
}

interface ControlPanelProps {
  config: GradientConfig;
  onConfigChange: (config: Partial<GradientConfig>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const shapeOptions: { value: GradientConfig['type']; label: string }[] = [
  { value: 'sphere', label: 'Sphere' },
  { value: 'plane', label: 'Plane' },
  { value: 'waterPlane', label: 'Water' },
];

const colorPresets = [
  { color1: '#ff5005', color2: '#dbba95', color3: '#d0bce1' },
  { color1: '#69d2e7', color2: '#a7dbd8', color3: '#e0e4cc' },
  { color1: '#fe4365', color2: '#fc9d9a', color3: '#f9cdad' },
  { color1: '#556270', color2: '#4ecdc4', color3: '#c7f464' },
  { color1: '#00c9ff', color2: '#92fe9d', color3: '#00c9ff' },
  { color1: '#fc466b', color2: '#3f5efb', color3: '#fc466b' },
];

export const ControlPanel = ({ config, onConfigChange, isOpen, onToggle }: ControlPanelProps) => {
  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={onToggle}
        className="fixed right-6 top-6 z-50 glass rounded-full p-4 hover:bg-secondary/50 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
      </motion.button>

      {/* Panel */}
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: isOpen ? 0 : 400, opacity: isOpen ? 1 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-80 z-40 glass overflow-y-auto"
      >
        <div className="p-6 pt-20 space-y-8">
          <div>
            <h3 className="font-display text-lg font-medium mb-4 text-foreground">Shape</h3>
            <div className="grid grid-cols-3 gap-2">
              {shapeOptions.map((shape) => (
                <button
                  key={shape.value}
                  onClick={() => onConfigChange({ type: shape.value })}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    config.type === shape.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {shape.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg font-medium mb-4 text-foreground">Colors</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {colorPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => onConfigChange(preset)}
                  className="h-12 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                  style={{
                    background: `linear-gradient(135deg, ${preset.color1} 0%, ${preset.color2} 50%, ${preset.color3} 100%)`,
                  }}
                />
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Color 1</Label>
                <input
                  type="color"
                  value={config.color1}
                  onChange={(e) => onConfigChange({ color1: e.target.value })}
                  className="w-10 h-8 rounded cursor-pointer border-0"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Color 2</Label>
                <input
                  type="color"
                  value={config.color2}
                  onChange={(e) => onConfigChange({ color2: e.target.value })}
                  className="w-10 h-8 rounded cursor-pointer border-0"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Color 3</Label>
                <input
                  type="color"
                  value={config.color3}
                  onChange={(e) => onConfigChange({ color3: e.target.value })}
                  className="w-10 h-8 rounded cursor-pointer border-0"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg font-medium mb-4 text-foreground">Motion</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Animate</Label>
                <Switch
                  checked={config.animate}
                  onCheckedChange={(checked) => onConfigChange({ animate: checked })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Speed</Label>
                  <span className="text-xs text-muted-foreground">{config.speed.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.speed]}
                  onValueChange={([value]) => onConfigChange({ speed: value })}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg font-medium mb-4 text-foreground">Effects</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Grain</Label>
                <Switch
                  checked={config.grain}
                  onCheckedChange={(checked) => onConfigChange({ grain: checked })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Strength</Label>
                  <span className="text-xs text-muted-foreground">{config.uStrength.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.uStrength]}
                  onValueChange={([value]) => onConfigChange({ uStrength: value })}
                  min={0}
                  max={5}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Density</Label>
                  <span className="text-xs text-muted-foreground">{config.uDensity.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.uDensity]}
                  onValueChange={([value]) => onConfigChange({ uDensity: value })}
                  min={0}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Frequency</Label>
                  <span className="text-xs text-muted-foreground">{config.uFrequency.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.uFrequency]}
                  onValueChange={([value]) => onConfigChange({ uFrequency: value })}
                  min={0}
                  max={10}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
