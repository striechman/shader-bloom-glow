import { useState, useEffect, Suspense } from 'react';
import { GradientCanvas } from '@/components/GradientCanvas';
import { ControlPanel } from '@/components/ControlPanel';
import { Header } from '@/components/Header';
import { HeroContent } from '@/components/HeroContent';
import { ExportModal } from '@/components/ExportModal';
import { WebButtonsPanel } from '@/components/WebButtonsPanel';
import { GradientConfig, defaultGradientConfig, getThemeColor0 } from '@/types/gradient';
import { useTheme } from '@/hooks/useTheme';

const Index = () => {
  const { theme } = useTheme();
  const [config, setConfig] = useState<GradientConfig>(() => ({
    ...defaultGradientConfig,
    color0: getThemeColor0('dark'), // Start with dark mode color0
  }));
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isButtonsPanelOpen, setIsButtonsPanelOpen] = useState(false);

  // Update color0 and color3 based on theme
  useEffect(() => {
    setConfig(prev => {
      const newColor0 = getThemeColor0(theme);
      // Also update color3 if it's the default value
      const isDefaultColor3 = prev.color3 === '#000000' || prev.color3 === '#FFFFFF';
      const newColor3 = isDefaultColor3 ? (theme === 'dark' ? '#000000' : '#FFFFFF') : prev.color3;
      return { ...prev, color0: newColor0, color3: newColor3 };
    });
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
        <div id="gradient-stage" className="fixed inset-0 overflow-hidden">
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
        onOpenButtonsPanel={() => setIsButtonsPanelOpen(true)}
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
