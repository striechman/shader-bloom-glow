import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Square } from 'lucide-react';
import { BannerPreview } from './BannerPreview';
import { ButtonPreview } from './ButtonPreview';
import { BannerConfig, ButtonGradientConfig, defaultBannerConfig, defaultButtonConfig } from '@/types/webAssets';

interface WebAssetsPanelProps {
  bannerConfig?: BannerConfig;
  buttonConfig?: ButtonGradientConfig;
  onBannerConfigChange?: (config: Partial<BannerConfig>) => void;
  onButtonConfigChange?: (config: Partial<ButtonGradientConfig>) => void;
}

export const WebAssetsPanel = ({
  bannerConfig,
  buttonConfig,
  onBannerConfigChange,
  onButtonConfigChange,
}: WebAssetsPanelProps) => {
  const [internalBannerConfig, setInternalBannerConfig] = useState<BannerConfig>(defaultBannerConfig);
  const [internalButtonConfig, setInternalButtonConfig] = useState<ButtonGradientConfig>(defaultButtonConfig);

  const handleBannerChange = (updates: Partial<BannerConfig>) => {
    if (onBannerConfigChange) {
      onBannerConfigChange(updates);
    } else {
      setInternalBannerConfig((prev) => ({ ...prev, ...updates }));
    }
  };

  const handleButtonChange = (updates: Partial<ButtonGradientConfig>) => {
    if (onButtonConfigChange) {
      onButtonConfigChange(updates);
    } else {
      setInternalButtonConfig((prev) => ({ ...prev, ...updates }));
    }
  };

  return (
    <Tabs defaultValue="banners" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="banners" className="flex items-center gap-2 text-xs">
          <Image className="w-3.5 h-3.5" />
          Banners
        </TabsTrigger>
        <TabsTrigger value="buttons" className="flex items-center gap-2 text-xs">
          <Square className="w-3.5 h-3.5" />
          Buttons
        </TabsTrigger>
      </TabsList>

      <TabsContent value="banners" className="mt-0">
        <BannerPreview
          config={bannerConfig || internalBannerConfig}
          onConfigChange={handleBannerChange}
        />
      </TabsContent>

      <TabsContent value="buttons" className="mt-0">
        <ButtonPreview
          config={buttonConfig || internalButtonConfig}
          onConfigChange={handleButtonChange}
        />
      </TabsContent>
    </Tabs>
  );
};
