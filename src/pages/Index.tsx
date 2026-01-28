import { useState, Suspense } from 'react';
import { GradientCanvas } from '@/components/GradientCanvas';
import { ControlPanel } from '@/components/ControlPanel';
import { Header } from '@/components/Header';
import { HeroContent } from '@/components/HeroContent';
import { ExportModal } from '@/components/ExportModal';

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

const defaultConfig: GradientConfig = {
  type: 'sphere',
  wireframe: false,
  animate: true,
  speed: 0.4,
  color1: '#FDB515',
  color2: '#E71989',
  color3: '#000000',
  grain: true,
  uStrength: 4,
  uDensity: 1.3,
  uFrequency: 5.5,
};

const Index = () => {
  const [config, setConfig] = useState<GradientConfig>(defaultConfig);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleConfigChange = (updates: Partial<GradientConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* 3D Gradient Background */}
      <Suspense
        fallback={
          <div className="fixed inset-0 bg-gradient-to-br from-background via-secondary to-background" />
        }
      >
        <div className="fixed inset-0">
          <GradientCanvas config={config} />
        </div>
      </Suspense>

      {/* Overlay for readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-background/30 via-transparent to-background pointer-events-none z-[1]" />

      {/* Header */}
      <Header />

      {/* Control Panel */}
      <ControlPanel
        config={config}
        onConfigChange={handleConfigChange}
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen(!isPanelOpen)}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        config={config}
      />

      {/* Main Content */}
      <main className="relative z-10">
        <HeroContent 
          onOpenPanel={() => setIsPanelOpen(true)} 
          onExport={() => setIsExportOpen(true)}
        />
      </main>
    </div>
  );
};

export default Index;
