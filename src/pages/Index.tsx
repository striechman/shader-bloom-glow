import { useState, useEffect, Suspense } from 'react';
import { GradientCanvas } from '@/components/GradientCanvas';
import { ControlPanel } from '@/components/ControlPanel';
import { Header } from '@/components/Header';
import { HeroContent } from '@/components/HeroContent';
import { ExportModal } from '@/components/ExportModal';
import { WebButtonsPanel } from '@/components/WebButtonsPanel';
import { GradientConfig, defaultGradientConfig } from '@/types/gradient';
import { useTheme } from '@/hooks/useTheme';

const Index = () => {
  const { theme } = useTheme();
  const [config, setConfig] = useState<GradientConfig>(defaultGradientConfig);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isButtonsPanelOpen, setIsButtonsPanelOpen] = useState(false);

  // Automatically update color3 based on theme
  useEffect(() => {
    const newColor3 = theme === 'dark' ? '#000000' : '#FFFFFF';
    setConfig(prev => ({ ...prev, color3: newColor3 }));
  }, [theme]);

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
        <div id="gradient-stage" className="fixed inset-0">
          <GradientCanvas config={config} />
        </div>
      </Suspense>

      {/* Overlay for readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-background/30 via-transparent to-background pointer-events-none z-[1]" />

      {/* Header */}
      <Header onMenuToggle={() => setIsPanelOpen(!isPanelOpen)} />

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

      {/* Web Buttons Panel */}
      <WebButtonsPanel
        isOpen={isButtonsPanelOpen}
        onToggle={() => setIsButtonsPanelOpen(!isButtonsPanelOpen)}
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
