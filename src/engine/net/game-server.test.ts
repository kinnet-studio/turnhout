import { describe, expect, it, vi } from 'vitest';
import { GameServer } from './game-server';
import { GameEngine } from '../core/game-engine';
import { MoveRegistry, type MoveHandler } from '../core/moves';
import { registerCoreMoves } from '../core/moves-library';
import { makeRng } from '../core/rng';
import type { GameState } from '../core/game-state';
import { RuleRegistry } from '../core/rules';
import { registerStarterRules } from '../core/rules-library';
import type { CardState } from '../core/scene';
import type { TableDef } from '../core/table-def';
import { FlowRegistry } from '../core/flow-registry';
import { registerCoreFlow } from '../core/flow-library';
import type { FlowDef } from '../core/flow';

const card = (id: string, zoneId: string, extra: Partial<CardState> = {}): CardState => ({
  id, zoneId, faceUp: false, faceKey: id, ...extra,
});

const TABLE: TableDef = {
  players: ['me', 'opp'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 }, visibility: 'secret' },
    { id: 'hand-me', layout: 'fan', transform: { x: 0, y: 300 }, owner: 'me', visibility: 'owner' },
    { id: 'hand-opp', layout: 'fan', transform: { x: 0, y: -300 }, owner: 'opp', visibility: 'owner' },
  ],
};

// A move that only its stamped `by === 'me'` may perform — proves by-stamping.
const onlyMe: MoveHandler = {
  legal: (_s, m) => (m.by === 'me' ? true : 'not me'),
  apply: (s) => s,
};

const build = () => {
  const moves = registerCoreMoves(new MoveRegistry()).register('onlyMe', onlyMe);
  const initial: GameState = {
    cards: [card('c0', 'hand-me', { data: { suit: 'S', rank: 1 } }), card('c1', 'hand-opp', { data: { suit: 'H', rank: 2 } })],
    turn: { current: 'me' },
    data: { secretPot: 99 },
    rng: makeRng(1),
  };
  const engine = new GameEngine({ tableDef: TABLE, rules: registerStarterRules(new RuleRegistry()), moves, initial });
  return new GameServer({ engine, tableDef: TABLE, seats: ['me', 'opp'] });
};

describe('GameServer', () => {
  it('stamps by, overwriting a client-supplied by', () => {
    const s = build();
    expect(s.submit('me', { type: 'onlyMe', by: 'opp' }).ok).toBe(true);   // stamped to 'me' → legal
    expect(s.submit('opp', { type: 'onlyMe', by: 'me' }).ok).toBe(false);  // stamped to 'opp' → 'not me'
  });

  it('applies a legal move and reflects it in every seat view', () => {
    const s = build();
    const r = s.submit('me', { type: 'move', cardId: 'c0', toZone: 'deck' });
    expect(r.ok).toBe(true);
    expect(s.viewFor('me').scene.cards.find((c) => c.id === 'c0')!.zoneId).toBe('deck');
    expect(s.viewFor('opp').scene.cards.find((c) => c.id === 'c0')!.zoneId).toBe('deck');
  });

  it('rejects an illegal move without changing state', () => {
    const s = build();
    const r = s.submit('me', { type: 'move', cardId: 'ghost', toZone: 'deck' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBeTypeOf('string');
  });

  it('projects per seat: owner sees their hand, opponent sees backs', () => {
    const s = build();
    const meView = s.viewFor('me').scene.cards.find((c) => c.id === 'c0')!;
    const oppView = s.viewFor('opp').scene.cards.find((c) => c.id === 'c0')!;
    expect(meView.faceUp).toBe(true);          // owner sees their hand-me card
    expect(oppView.faceUp).toBe(false);        // opponent sees a back
    expect(oppView.faceKey).toBe('back');
  });

  it('a spectator sees only public cards', () => {
    const s = build();
    const specHandMe = s.viewFor('spectator').scene.cards.find((c) => c.id === 'c0')!;
    expect(specHandMe.faceKey).toBe('back');   // hand-me is owner-visibility → hidden from a non-owner
  });

  it('ClientView never leaks data or rng', () => {
    const view = build().viewFor('me');
    expect(Object.keys(view).sort()).toEqual(['result', 'scene', 'seat', 'turn']);
  });

  it('subscribe fires on a successful submit and unsubscribe stops it', () => {
    const s = build();
    const seen = vi.fn();
    const off = s.subscribe(seen);
    s.submit('me', { type: 'move', cardId: 'c0', toZone: 'deck' });
    expect(seen).toHaveBeenCalledTimes(1);
    off();
    s.submit('me', { type: 'move', cardId: 'c0', toZone: 'hand-me' });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('does not notify subscribers on an illegal submit', () => {
    const s = build();
    const seen = vi.fn();
    s.subscribe(seen);
    s.submit('me', { type: 'move', cardId: 'ghost', toZone: 'deck' });
    expect(seen).not.toHaveBeenCalled();
  });

  it('projects state.result into every seat view once the game ends', () => {
    // Build a server whose engine has a flow with an immediate end condition.
    const flowReg = registerCoreFlow(new FlowRegistry()).registerEffect('declare', (s) => ({ ...s, result: { winner: 'me' } }));
    const flow: FlowDef = {
      turn: { order: ['me', 'opp'] },
      phases: [{ id: 'main', allow: 'any' }],
      end: [{ when: 'always', result: 'declare' }],
    };
    const engine = new GameEngine({
      tableDef: TABLE, // the file's existing table fixture
      rules: new RuleRegistry(),
      moves: registerCoreMoves(new MoveRegistry()),
      initial: { cards: [], data: {}, rng: makeRng(1) },
      flow,
      flowRegistry: flowReg,
    });
    const server = new GameServer({ engine, tableDef: TABLE, seats: ['me', 'opp'] });
    expect(server.viewFor('me').result).toEqual({ winner: 'me' });
    expect(server.viewFor('opp').result).toEqual({ winner: 'me' });
  });
});
