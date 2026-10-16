import { describe, expect, it } from 'vitest';
import { zoneCards, type GameState } from '../../game-state';
import { createEngine, initialState, seatsFor } from '../build';
import { NEXT_CARD_KEY, expandCardTable } from '../cards';
import { compileGame } from '../compile';
import { RuleError } from '../diagnostics';
import { PhraseLibrary, STATIC_TYPES, emptyVocab } from '../phrases';
import { VOCAB_TYPES } from '../refs';
import { COUNTER_GAME, fixtureCard, fixtureEnv, fixtureState, runPhrase, vocabFor } from '../testing';
import type { CardsFn, PhraseEnv } from '../types';
import { createDefaultLibrary } from './index';
import { registerSetupPhrases } from './setup-phrases';
import { registerStackPhrases } from './stack-phrases';

const lib = createDefaultLibrary();

/**
 * COUNTER_GAME with a stack of coupons that never runs out. Each player starts with one in their stash, and a button makes
 * another. Clipping is no part of the After line, so a player may clip again and again before the turn passes.
 */
const STOCKED = COUNTER_GAME
  .replace('    | Opal | 1    | 4      |', '    | Opal | 1    | 4      |\n  A stack called coupons that never runs out:\n    | name   | cost |\n    | Coupon | 0    |')
  .replace('  Deal 2 cards from the pile to the shop.', '  Deal 2 cards from the pile to the shop.\n  A new Coupon goes to each stash.')
  .replace('  A player may pass.', '  A player may clip a coupon.\n    Then:\n      A new Coupon goes to their stash.\n  A player may pass.');

const compiled = compileGame(STOCKED, lib);
// Read when a test runs, so a game that does not compile fails its own tests and not the whole file.
const game = () => compiled.game!;
const ids = (state: GameState, zoneId: string) => zoneCards(state, zoneId).map((c) => c.id);
const names = (state: GameState, zoneId: string) => zoneCards(state, zoneId).map((c) => c.data?.name);

describe('the stack phrases', () => {
  it('compile with the game they are tried on, whose stack is endless and whose coupon is a card value', () => {
    expect(compiled.diagnostics).toEqual([]);
    const sets = game().cards;
    expect(sets.map((set) => set.kind)).toEqual(['table', 'endless']);
    expect(sets[1]).toEqual({
      kind: 'endless', identities: [{ attrs: { name: 'Coupon', cost: 0 }, faceKey: 't:name=Coupon;cost=0' }], start: '', acesHigh: false,
    });
    expect(vocabFor(game()).cardValues).toContainEqual({ attribute: 'name', value: 'Coupon' });
  });
});

describe('a stack that never runs out', () => {
  const setups = registerStackPhrases(registerSetupPhrases(new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])));
  const vocab = { ...emptyVocab(), sharedZones: ['pile'], playerZones: ['stash'], maxPlayers: 3 };
  const table = { columns: ['name', 'cost'], rows: [{ cells: ['Coupon', '0'], line: 12 }, { cells: ['Voucher', '2'], line: 13 }] };
  const stack = (text: string, given: Parameters<CardsFn>[1] = null) => {
    const m = setups.match('cards', text, vocab);
    if (m.status !== 'ok') throw new Error(`${text} → ${m.status}`);
    return (setups.get('cards', m.pattern)?.fn as CardsFn)(m.args, given);
  };

  it('has the identities of its table, starts nowhere and puts no card on the table', () => {
    expect(stack('A stack called coupons that never runs out', table)).toEqual({
      kind: 'endless', identities: expandCardTable(table), start: '', acesHigh: false,
    });
  });
  it('asks for a table when it has none', () => {
    expect(() => stack('A stack called coupons that never runs out')).toThrow(new RuleError('Add a table of cards under this line.'));
  });
});

describe('a new card goes to a zone', () => {
  const seats = seatsFor(2);
  const envOf = (cards: ReturnType<typeof fixtureCard>[] = []): PhraseEnv =>
    fixtureEnv(fixtureState(cards), { game: game(), seats, subject: { player: 'p0', space: null, card: null } });
  const effect = (text: string, env: PhraseEnv) => runPhrase<GameState>(lib, 'effect', text, env);

  it('makes one card in their zone, with the next id: after the cards of the decks, the first time', () => {
    const next = effect('a new Coupon goes to their stash', envOf([fixtureCard('c0', 'pile', { name: 'Ruby', cost: 3 })]));
    expect(ids(next, 'stash-p0')).toEqual(['c8']);
    expect(next.cards.find((c) => c.id === 'c8')).toMatchObject({ data: { name: 'Coupon', cost: 0 }, faceUp: false });
    expect(next.data[NEXT_CARD_KEY]).toBe(9);
  });
  it('goes on from the number the state keeps', () => {
    const next = effect('a new Coupon goes to their stash', { ...envOf(), state: fixtureState([], { data: { [NEXT_CARD_KEY]: 40 } }) });
    expect(ids(next, 'stash-p0')).toEqual(['c40']);
    expect(next.data[NEXT_CARD_KEY]).toBe(41);
  });
  it('makes one for each zone it names, in seat order, each with its own id', () => {
    const next = effect('a new Coupon goes to each stash', envOf());
    expect(ids(next, 'stash-p0')).toEqual(['c8']);
    expect(ids(next, 'stash-p1')).toEqual(['c9']);
    expect(next.data[NEXT_CARD_KEY]).toBe(10);
  });
  it('turns up in a zone everyone can see', () => {
    const next = effect('a new Coupon goes to the shop', envOf());
    expect(next.cards.find((c) => c.zoneId === 'shop')).toMatchObject({ faceUp: true, data: { name: 'Coupon' } });
  });
  it('reads a kind of card written with an article, or as a card', () => {
    expect(names(effect('a new coupon card goes to their stash', envOf()), 'stash-p0')).toEqual(['Coupon']);
  });
  it('is refused for a card no stack that never runs out has, even though a deck has it', () => {
    const ruby = () => effect('a new Ruby goes to their stash', envOf());
    expect(ruby).toThrow(RuleError);
    expect(ruby).toThrow('No stack that never runs out has a Ruby.');
  });
});

describe('a game with a stack that never runs out', () => {
  const engineOf = () => createEngine(game(), lib, 2, initialState(game(), 1)).engine;
  const clip = (engine: ReturnType<typeof engineOf>, by: string) => {
    const outcome = engine.dispatch({ type: 'clip a coupon', by });
    expect(outcome.reason).toBeUndefined();
  };

  it('starts with the deck on the table and a coupon made for each stash by Setup', () => {
    const state = engineOf().getState();
    expect(ids(state, 'pile')).toHaveLength(6);
    expect(ids(state, 'shop')).toHaveLength(2);
    expect(state.cards.filter((c) => c.zoneId === 'pile' || c.zoneId === 'shop')).toHaveLength(8);
    expect(ids(state, 'stash-p0')).toEqual(['c8']);
    expect(ids(state, 'stash-p1')).toEqual(['c9']);
    expect(names(state, 'stash-p0')).toEqual(['Coupon']);
    expect(names(state, 'stash-p1')).toEqual(['Coupon']);
    expect(state.data[NEXT_CARD_KEY]).toBe(10);
  });
  it('makes a coupon in their stash when a player clips one, face down', () => {
    const engine = engineOf();
    clip(engine, 'p0');
    const state = engine.getState();
    expect(ids(state, 'stash-p0')).toEqual(['c8', 'c10']);
    expect(state.cards.find((c) => c.id === 'c10')).toMatchObject({ zoneId: 'stash-p0', faceUp: false, data: { name: 'Coupon', cost: 0 } });
    expect(ids(state, 'stash-p1')).toEqual(['c9']);
    expect(state.data[NEXT_CARD_KEY]).toBe(11);
  });

  describe('undo and replay', () => {
    it('makes the same card again after the press that made one is undone', () => {
      const engine = engineOf();
      const before = engine.getState();
      clip(engine, 'p0');
      const clipped = engine.getState();
      expect(ids(clipped, 'stash-p0')).toContain('c10');
      engine.undo();
      expect(engine.getState()).toEqual(before);
      expect(ids(engine.getState(), 'stash-p0')).toEqual(['c8']);
      clip(engine, 'p0');
      expect(engine.getState()).toEqual(clipped);
      expect(ids(engine.getState(), 'stash-p0')).toEqual(['c8', 'c10']);
    });
    it('rebuilds the same state, ids and all, from the log', () => {
      const engine = engineOf();
      clip(engine, 'p0');
      clip(engine, 'p0');
      expect(engine.dispatch({ type: 'pass', by: 'p0' }).reason).toBeUndefined();
      clip(engine, 'p1');
      const rebuilt = engineOf();
      rebuilt.loadLog([...engine.getLog()]);
      expect(rebuilt.getState()).toEqual(engine.getState());
      expect(ids(rebuilt.getState(), 'stash-p0')).toEqual(['c8', 'c10', 'c11']);
      expect(ids(rebuilt.getState(), 'stash-p1')).toEqual(['c9', 'c12']);
    });
  });
});
