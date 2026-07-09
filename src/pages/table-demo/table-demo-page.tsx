import { useMemo, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import type { PlayerId } from '@/engine/core/scene';
import type { Placement, TableDef } from '@/engine/core/table-def';
import { CardTable } from '@/engine/react';
import { useGameEngine } from '@/engine/react';
import { GameEngine } from '@/engine/core/game-engine';
import { MoveRegistry } from '@/engine/core/moves';
import { registerCoreMoves } from '@/engine/core/moves-library';
import { makeRng } from '@/engine/core/rng';
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import type { DropIntent } from '@/engine/input/table-input-context';
import { initApp } from '@/utils/init-app';
import { standardDeck } from './deck';

export const TABLE: TableDef = {
  players: ['me', 'opp'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 }, visibility: 'secret' },
    { id: 'hand', layout: 'fan', transform: { x: 0, y: 300 }, layoutOptions: { fanAngleDeg: 24 }, owner: 'me', visibility: 'owner', ordering: 'free' },
    { id: 'discard', layout: 'pile', transform: { x: 400, y: 0 }, visibility: 'public' },
  ],
};

const VIEWS: (PlayerId | undefined)[] = ['me', 'opp', undefined];
const viewLabel = (v: PlayerId | undefined): string => v ?? 'table';

const overlayButton = (left: number): React.CSSProperties => ({
  position: 'absolute', top: 12, left, zIndex: 10, pointerEvents: 'auto',
});

function createEngine(): GameEngine {
  return new GameEngine({
    tableDef: TABLE,
    rules: registerStarterRules(new RuleRegistry()),
    moves: registerCoreMoves(new MoveRegistry()),
    initial: { cards: standardDeck(), data: {}, rng: makeRng(20260709) },
  });
}

function DemoContent() {
  const [engine] = useState(createEngine);
  const { state, dispatch, undo } = useGameEngine(engine);
  const [viewIdx, setViewIdx] = useState(0);
  const viewer = VIEWS[viewIdx];
  const placement: Placement = { cards: state.cards };

  const onDrop = (i: DropIntent) => {
    if (!i.toZoneId) return; // rejected → snaps back automatically
    if (i.toZoneId === i.fromZoneId) {
      dispatch({ type: 'reorder', cardId: i.cardId, slot: i.slot });
      return;
    }
    dispatch({ type: 'move', cardId: i.cardId, toZone: i.toZoneId, slot: i.slot });
  };

  const onCardClick = (id: string) => {
    dispatch({ type: 'flip', cardId: id });
  };

  const deal5 = () => dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 5 }); // face-down
  const shuffleDeck = () => dispatch({ type: 'shuffle', zoneId: 'deck' });
  const cycleView = () => setViewIdx((n) => (n + 1) % VIEWS.length);

  return (
    <>
      <CardTable tableDef={TABLE} placement={placement} viewer={viewer} onDrop={onDrop} onCardClick={onCardClick} />
      {/* OverlayContainer sets pointer-events:none; interactive UI must re-enable it. */}
      <button style={overlayButton(12)} onClick={deal5}>Deal 5</button>
      <button style={overlayButton(88)} onClick={shuffleDeck}>Shuffle deck</button>
      <button style={overlayButton(196)} onClick={undo}>Undo</button>
      <button style={overlayButton(260)} onClick={cycleView}>View as: {viewLabel(viewer)}</button>
    </>
  );
}

export function TableDemoPage() {
  const option = useMemo(() => ({ fullScreen: true, limitEntireViewPort: false }), []);
  return <Wrapper option={option} initFunction={initApp}><DemoContent /></Wrapper>;
}
