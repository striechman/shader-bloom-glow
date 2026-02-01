import { useState, useEffect, useCallback } from 'react';
import { GradientConfig } from '@/types/gradient';

export interface GradientPreset {
  id: string;
  name: string;
  createdAt: number;
  config: Omit<GradientConfig, 'aspectRatio' | 'buttonPreviewState'>;
}

const STORAGE_KEY = 'gradient-studio-presets';

const generateId = () => Math.random().toString(36).substring(2, 9);

export function usePresets() {
  const [presets, setPresets] = useState<GradientPreset[]>([]);

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPresets(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  }, []);

  // Save presets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Failed to save presets:', error);
    }
  }, [presets]);

  const savePreset = useCallback((name: string, config: GradientConfig) => {
    // Extract only the relevant config (exclude aspectRatio and buttonPreviewState)
    const { aspectRatio, buttonPreviewState, ...savedConfig } = config;
    
    const newPreset: GradientPreset = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      config: savedConfig,
    };

    setPresets(prev => [newPreset, ...prev]);
    return newPreset;
  }, []);

  const loadPreset = useCallback((preset: GradientPreset): Partial<GradientConfig> => {
    return preset.config;
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
  }, []);

  const renamePreset = useCallback((id: string, newName: string) => {
    setPresets(prev => prev.map(p => 
      p.id === id ? { ...p, name: newName } : p
    ));
  }, []);

  return {
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    renamePreset,
  };
}
