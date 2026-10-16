import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useApp } from '@/hooks/use-app';
import type { CardTableHandle, CardTableProps } from './types';

export const CardTable = forwardRef<CardTableHandle, CardTableProps>(function CardTable(props, ref) {
  const app = useApp();

  useEffect(() => {
    if (!app) return;
    app.setIntents({ onDrop: props.onDrop, onCardClick: props.onCardClick, onHover: props.onHover });
  }, [app, props.onDrop, props.onCardClick, props.onHover]);

  useEffect(() => {
    if (!app) return;
    app.setTable(props.tableDef, props.placement, props.viewer);
  }, [app, props.tableDef, props.placement, props.viewer]);

  // Only a page that passes decor reaches the canvas with it, so the other pages leave the canvas as it is.
  useEffect(() => {
    if (!app || props.decor === undefined) return;
    app.setDecor(props.decor);
  }, [app, props.decor]);

  useImperativeHandle(ref, () => ({
    deal: (_staggerMs?: number) => { /* wired to pixiTable choreography in a follow-up */ },
    shuffle: (_zoneId: string) => { /* wired to pixiTable choreography in a follow-up */ },
  }), []);

  return null;
});
