import { useState, useCallback, useRef } from 'react';
import { GradientConfig } from '@/types/gradient';

interface ConfigHistory {
  past: GradientConfig[];
  present: GradientConfig;
  future: GradientConfig[];
}

const MAX_HISTORY = 30;

// Fields that should NOT trigger history recording (too noisy)
const IGNORED_FIELDS = ['frozenTime', 'buttonPreviewState'];

export function useConfigHistory(initialConfig: GradientConfig) {
  const [history, setHistory] = useState<ConfigHistory>({
    past: [],
    present: initialConfig,
    future: [],
  });

  // Track the last update time to debounce rapid changes
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<GradientConfig | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const updateConfig = useCallback((
    updater: (prev: GradientConfig) => GradientConfig,
    shouldRecord = true
  ) => {
    setHistory(prev => {
      const newPresent = updater(prev.present);

      // Check if only ignored fields changed
      const changedFields = Object.keys(newPresent).filter(
        key => newPresent[key as keyof GradientConfig] !== prev.present[key as keyof GradientConfig]
      );
      const onlyIgnoredChanges = changedFields.every(field => IGNORED_FIELDS.includes(field));

      if (!shouldRecord || onlyIgnoredChanges) {
        return { ...prev, present: newPresent };
      }

      // Debounce: Don't record if changes are happening too fast
      const now = Date.now();
      if (now - lastUpdateRef.current < 300) {
        // Just update present, will record on next slow change
        pendingUpdateRef.current = newPresent;
        
        // Clear existing timer and set new one
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = window.setTimeout(() => {
          if (pendingUpdateRef.current) {
            setHistory(h => ({
              past: [...h.past, prev.present].slice(-MAX_HISTORY),
              present: pendingUpdateRef.current!,
              future: [],
            }));
            pendingUpdateRef.current = null;
          }
        }, 300);

        return { ...prev, present: newPresent };
      }

      lastUpdateRef.current = now;

      // Record in history
      return {
        past: [...prev.past, prev.present].slice(-MAX_HISTORY),
        present: newPresent,
        future: [], // Clear redo stack on new changes
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;

      const newPast = [...prev.past];
      const previousState = newPast.pop()!;

      return {
        past: newPast,
        present: previousState,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;

      const newFuture = [...prev.future];
      const nextState = newFuture.shift()!;

      return {
        past: [...prev.past, prev.present],
        present: nextState,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((config: GradientConfig) => {
    setHistory({
      past: [],
      present: config,
      future: [],
    });
  }, []);

  return {
    config: history.present,
    updateConfig,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
}
