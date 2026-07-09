import { describe, expect, it } from 'vitest';
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import { validateTableDef } from '@/engine/core/table-def';
import { GameEngine } from '@/engine/core/game-engine';
import { MoveRegistry } from '@/engine/core/moves';
import { registerCoreMoves } from '@/engine/core/moves-library';
import { makeRng } from '@/engine/core/rng';
import { zoneCards } from '@/engine/core/game-state';
import { TABLE } from './table-demo-page';
import { standardDeck } from './deck';

describe('demo table', () => {
  it('validates against the starter registry', () => {
    const reg = registerStarterRules(new RuleRegistry());
    expect(validateTableDef(TABLE, reg)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('deals a full 52-card deck into the deck zone', () => {
    const deck = standardDeck();
    expect(deck).toHaveLength(52);
    expect(deck.every((c) => c.zoneId === 'deck' && typeof c.data?.rank === 'number')).toBe(true);
  });
});

describe('demo engine', () => {
  const build = () =>
    new GameEngine({
      tableDef: TABLE,
      rules: registerStarterRules(new RuleRegistry()),
      moves: registerCoreMoves(new MoveRegistry()),
      initial: { cards: standardDeck(), data: {}, rng: makeRng(20260709) },
    });

  it('deals 5 cards from deck to hand', () => {
    const e = build();
    const r = e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 5, faceUp: true });
    expect(r.ok).toBe(true);
    expect(zoneCards(e.getState(), 'hand')).toHaveLength(5);
    expect(zoneCards(e.getState(), 'deck')).toHaveLength(47);
  });

  it('undo restores the deck after a deal', () => {
    const e = build();
    e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 5, faceUp: true });
    e.undo();
    expect(zoneCards(e.getState(), 'deck')).toHaveLength(52);
  });
});
