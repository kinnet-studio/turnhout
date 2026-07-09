import { usePixiCanvas } from '@ue-too/board-pixi-react-integration';
import { useMemo } from 'react';
import type { AppComponents } from '@/app-components';

/**
 * Access the initialized app components from the PixiCanvas context.
 * Returns null when the app is not yet ready.
 */
export function useApp(): AppComponents | null {
  const { result } = usePixiCanvas();

  return useMemo(() => {
    if (!result.initialized || !result.success || !result.components?.app?.renderer) {
      return null;
    }
    return result.components as AppComponents;
  }, [result]);
}
