import { useMemo, useRef, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import type { Placement, TableDef } from '@/engine/core/table-def';
import { CardTable, type CardTableHandle } from '@/engine/react';
import type { DropIntent } from '@/engine/input/table-input-context';
import { initApp } from '@/utils/init-app';
import { standardDeck } from './deck';

export const TABLE: TableDef = {
  players: ['me'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 }, visibility: 'secret' },
    { id: 'hand', layout: 'fan', transform: { x: 0, y: 300 }, layoutOptions: { fanAngleDeg: 24 }, owner: 'me', visibility: 'owner', ordering: 'free' },
    { id: 'discard', layout: 'pile', transform: { x: 400, y: 0 }, visibility: 'public' },
  ],
};

function DemoContent() {
  const handleRef = useRef<CardTableHandle>(null);
  const [cards, setCards] = useState(standardDeck());
  const placement: Placement = { cards };

  const onDrop = (i: DropIntent) => {
    if (!i.toZoneId) return; // rejected → snaps back automatically
    setCards((cs) => cs.map((c) => (c.id === i.cardId ? { ...c, zoneId: i.toZoneId!, faceUp: i.toZoneId === 'hand' } : c)));
  };

  const onCardClick = (id: string) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, faceUp: !c.faceUp } : c)));
  };

  const deal5 = () => {
    setCards((cs) => {
      let dealt = 0;
      return cs.map((c) => (c.zoneId === 'deck' && dealt < 5 ? (dealt++, { ...c, zoneId: 'hand', faceUp: true }) : c));
    });
  };

  return (
    <>
      <CardTable ref={handleRef} tableDef={TABLE} placement={placement} onDrop={onDrop} onCardClick={onCardClick} />
      {/* The integration's OverlayContainer sets pointer-events:none so pointers reach
          the canvas; interactive HTML overlay UI must re-enable it on itself. */}
      <button
        style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, pointerEvents: 'auto' }}
        onClick={deal5}
      >
        Deal 5
      </button>
    </>
  );
}

export function TableDemoPage() {
  const option = useMemo(() => ({ fullScreen: true, limitEntireViewPort: false }), []);
  return <Wrapper option={option} initFunction={initApp}><DemoContent /></Wrapper>;
}
