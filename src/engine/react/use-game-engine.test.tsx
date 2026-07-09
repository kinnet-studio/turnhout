import { render, screen, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGameEngine } from './use-game-engine';
import { GameEngine } from '@/engine/core/game-engine';
import { MoveRegistry } from '@/engine/core/moves';
import { registerCoreMoves } from '@/engine/core/moves-library';
import { makeRng } from '@/engine/core/rng';
import { RuleRegistry } from '@/engine/core/rules';
import type { TableDef } from '@/engine/core/table-def';
import type { CardState } from '@/engine/core/scene';

const card = (id: string, zoneId: string): CardState => ({ id, zoneId, faceUp: false, faceKey: id });
const tableDef: TableDef = { zones: [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }] };
const makeEngine = () =>
  new GameEngine({
    tableDef,
    rules: new RuleRegistry(),
    moves: registerCoreMoves(new MoveRegistry()),
    initial: { cards: [card('a', 'deck')], data: {}, rng: makeRng(1) },
  });

function Probe({ engine }: { engine: GameEngine }) {
  const { state, dispatch } = useGameEngine(engine);
  const a = state.cards.find((c) => c.id === 'a')!;
  return (
    <div>
      <span data-testid="face">{String(a.faceUp)}</span>
      <button onClick={() => dispatch({ type: 'flip', cardId: 'a' })}>flip</button>
      <button onClick={() => dispatch({ type: 'flip', cardId: 'ZZ' })}>illegal</button>
    </div>
  );
}

describe('useGameEngine', () => {
  it('re-renders on a legal dispatch', () => {
    const engine = makeEngine();
    render(<Probe engine={engine} />);
    expect(screen.getByTestId('face').textContent).toBe('false');
    act(() => {
      screen.getByText('flip').click();
    });
    expect(screen.getByTestId('face').textContent).toBe('true');
  });

  it('leaves the rendered state unchanged on an illegal dispatch (snap-back)', () => {
    const engine = makeEngine();
    render(<Probe engine={engine} />);
    act(() => {
      screen.getByText('illegal').click();
    });
    expect(screen.getByTestId('face').textContent).toBe('false');
    expect(engine.getLog()).toHaveLength(0);
  });
});
