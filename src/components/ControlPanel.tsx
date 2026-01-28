import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface GradientConfig {
  type: 'sphere' | 'plane' | 'waterPlane';
  wireframe: boolean;
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

const shapeOptions: { value: GradientConfig['type']; wireframe: boolean; label: string }[] = [
  { value: 'sphere', wireframe: false, label: 'Sphere' },
  { value: 'plane', wireframe: false, label: 'Plane' },
  { value: 'waterPlane', wireframe: false, label: 'Water' },
  { value: 'sphere', wireframe: true, label: 'Mesh' },
];

// Brand color palette
const brandColors = [
  { name: 'Yellow Orange', hex: '#FDB515' },
  { name: 'Coral', hex: '#F25665' },
  { name: 'Magenta', hex: '#E71989' },
  { name: 'Deep Violet', hex: '#6A00F4' },
  { name: 'Electric Blue', hex: '#00C2FF' },
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
];

const colorPresets = [
  { color1: '#FDB515', color2: '#E71989', color3: '#000000' },
  { color1: '#F25665', color2: '#6A00F4', color3: '#000000' },
  { color1: '#E71989', color2: '#00C2FF', color3: '#000000' },
  { color1: '#6A00F4', color2: '#FDB515', color3: '#000000' },
  { color1: '#00C2FF', color2: '#F25665', color3: '#000000' },
  { color1: '#FDB515', color2: '#F25665', color3: '#000000' },
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
            <div className="grid grid-cols-2 gap-2">
              {shapeOptions.map((shape) => {
                const isActive = config.type === shape.value && config.wireframe === shape.wireframe;
                return (
                  <button
                    key={shape.label}
                    onClick={() => onConfigChange({ type: shape.value, wireframe: shape.wireframe })}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {shape.label}
                  </button>
                );
              })}
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
            <div className="space-y-4">
              {['color1', 'color2', 'color3'].map((colorKey, index) => (
                <div key={colorKey}>
                  <Label className="text-muted-foreground mb-2 block">Color {index + 1}</Label>
                  <div className="flex flex-wrap gap-2">
                    {brandColors.map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => onConfigChange({ [colorKey]: color.hex })}
                        className={`w-8 h-8 rounded-lg transition-all border-2 ${
                          config[colorKey as keyof GradientConfig] === color.hex
                            ? 'border-primary scale-110'
                            : 'border-transparent hover:scale-105'
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
