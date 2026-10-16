import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '../../game-state';
import { OWES_KEY, counterOf, setCounter, withBoardData } from '../board-state';
import { createEngine, initialState, seatsFor } from '../build';
import { compileGame } from '../compile';
import { RuleError } from '../diagnostics';
import {
  COUNTER_GAME, fixtureCard, fixtureColorGame, fixtureEnv, fixtureMove, fixturePhase, fixtureState, runPhrase,
} from '../testing';
import type { CompiledGame, MoveInfo, PhraseEnv, PhraseKind } from '../types';
import { relocate } from '../zones';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const run = <T = unknown>(kind: PhraseKind, text: string, env: PhraseEnv) => runPhrase<T>(lib, kind, text, env);
const cond = (text: string, env: PhraseEnv) => run<boolean>('condition', text, env);

const play = (by: string, cardId: string): MoveInfo => ({ verb: 'play', by, cardId, from: `hand-${by}`, to: 'discard-pile' });
const std = (id: string, zoneId: string, suit: string, rank: number) => fixtureCard(id, zoneId, { suit, rank });

const colored = (id: string, zoneId: string, color: string, number: number) => fixtureCard(id, zoneId, { color, number });

describe('conditions about the card being moved', () => {
  const state = fixtureState([std('h', 'hand-p0', 'H', 5), std('s', 'hand-p0', 'S', 5)]);
  const env = (cardId: string) => fixtureEnv(state, { move: play('p0', cardId) });

  it('the card is a kind of card', () => {
    expect(cond('the card is a heart', env('h'))).toBe(true);
    expect(cond('the card is a heart', env('s'))).toBe(false);
    expect(cond('the card is hearts', env('h'))).toBe(true);
  });
  it('the card is not a kind of card', () => {
    expect(cond('the card is not a heart', env('h'))).toBe(false);
    expect(cond('the card is not a heart', env('s'))).toBe(true);
  });
  it('works with the values of a custom deck', () => {
    const game = fixtureColorGame();
    const cards = fixtureState([colored('r2', 'hand-p0', 'red', 2), colored('b3', 'hand-p0', 'blue', 3)]);
    const at = (cardId: string) => fixtureEnv(cards, { game, move: play('p0', cardId) });
    expect(cond('the card is red', at('r2'))).toBe(true);
    expect(cond('the card is red', at('b3'))).toBe(false);
    expect(cond('the card is not blue', at('r2'))).toBe(true);
    expect(cond('the card is 3', at('b3'))).toBe(true);
  });
  it('is a bug, not a designer mistake, to ask without a move', () => {
    const asked = () => cond('the card is a heart', fixtureEnv(state));
    expect(asked).toThrow();
    expect(asked).not.toThrow(RuleError);
  });
  it('is registered as needing a move', () => {
    for (const pattern of ['the card is {cardclass}', 'the card is not {cardclass}', 'the card has the same {attribute} as the top card of {zone}',
      'they hold only {cardclass}', 'they have no card they could play']) {
      expect(lib.get('condition', pattern)?.needsMove).toBe(true);
    }
  });
});

describe('the card matches the top card of a zone', () => {
  const game = fixtureColorGame();
  const hand = [colored('r2', 'hand-p0', 'red', 2), colored('b3', 'hand-p0', 'blue', 3), colored('b7', 'hand-p0', 'blue', 7)];
  const top = colored('r7', 'discard-pile', 'red', 7);
  const at = (cards: ReturnType<typeof colored>[], cardId: string) => fixtureEnv(fixtureState(cards), { game, move: play('p0', cardId) });
  const sameColor = 'the card has the same color as the top card of the discard pile';
  const sameNumber = 'the card has the same number as the top card of the discard pile';

  it('the card has the same color as the top card, and an empty pile accepts anything', () => {
    expect(cond(sameColor, at([...hand, top], 'r2'))).toBe(true);
    expect(cond(sameColor, at([...hand, top], 'b3'))).toBe(false);
    expect(cond(sameColor, at(hand, 'b3'))).toBe(true);
  });
  it('compares the number the same way', () => {
    expect(cond(sameNumber, at([...hand, top], 'b7'))).toBe(true);
    expect(cond(sameNumber, at([...hand, top], 'r2'))).toBe(false);
    expect(cond(sameNumber, at(hand, 'r2'))).toBe(true);
  });
  it('looks at the last card of the pile', () => {
    const buried = [colored('b3', 'discard-pile', 'blue', 3), top];
    expect(cond(sameColor, at([...hand, ...buried], 'r2'))).toBe(true);
    expect(cond(sameColor, at([...hand, ...buried], 'b7'))).toBe(false);
  });
  it('is never the same when the card lacks the attribute', () => {
    const bare = fixtureCard('x', 'hand-p0', {});
    const pile = fixtureCard('y', 'discard-pile', {});
    expect(cond(sameColor, at([bare, pile] as ReturnType<typeof colored>[], 'x'))).toBe(false);
  });
  it('needs one zone to look at', () => {
    const each = () => cond('the card has the same color as the top card of each hand', at(hand, 'r2'));
    expect(each).toThrow(RuleError);
  });
  it('reads a count declared on cards as 0 on a card never given any', () => {
    const charged = { ...game, facts: [{ name: 'charges', on: 'card' as const, kind: 'number' as const }] };
    const sameCharges = 'the card has the same charges as the top card of the discard pile';
    const topWith = (charges: number | null) => fixtureEnv(
      fixtureState([colored('r2', 'hand-p0', 'red', 2), fixtureCard('r7', 'discard-pile', { color: 'red', number: 7, ...(charges === null ? {} : { charges }) })]),
      { game: charged, move: play('p0', 'r2') },
    );
    expect(cond(sameCharges, topWith(null))).toBe(true);
    expect(cond(sameCharges, topWith(0))).toBe(true);
    expect(cond(sameCharges, topWith(1))).toBe(false);
  });
});

describe('they hold only', () => {
  const hearts = [std('a', 'hand-p2', 'H', 3), std('b', 'hand-p2', 'H', 9)];
  const env = (cards: ReturnType<typeof std>[]) => fixtureEnv(fixtureState(cards), { move: play('p2', 'a') });
  it('is true when every card in their hand is of the kind', () => {
    expect(cond('they hold only hearts', env(hearts))).toBe(true);
  });
  it('is false when any card is not', () => {
    expect(cond('they hold only hearts', env([...hearts, std('c', 'hand-p2', 'S', 12)]))).toBe(false);
  });
  it('looks at the acting player’s hand only', () => {
    expect(cond('they hold only hearts', env([...hearts, std('c', 'hand-p1', 'S', 12)]))).toBe(true);
  });
  it('is true for any custom kind', () => {
    const game = fixtureColorGame();
    const cards = fixtureState([colored('a', 'hand-p0', 'red', 2), colored('b', 'hand-p0', 'red', 7)]);
    expect(cond('they hold only red cards', fixtureEnv(cards, { game, move: play('p0', 'a') }))).toBe(true);
    expect(cond('they hold only blue cards', fixtureEnv(cards, { game, move: play('p0', 'a') }))).toBe(false);
  });
});

describe('they have no card they could play', () => {
  const phase = fixturePhase('playing', [
    fixtureMove('play', { of: { who: 'actor' }, zone: 'hand' }, { shared: 'discard pile' }),
    fixtureMove('draw', { shared: 'draw pile' }, { of: { who: 'actor' }, zone: 'hand' }),
  ]);
  const game = fixtureColorGame({ phases: [phase] });
  const turn = { current: 'p0', phase: 'playing' };
  const cards = [
    colored('c0', 'draw-pile', 'blue', 3), colored('c1', 'hand-p0', 'red', 2), colored('c2', 'hand-p0', 'red', 7), colored('c3', 'hand-p1', 'blue', 7),
  ];
  const state: GameState = fixtureState(cards, { turn });
  const draw: MoveInfo = { verb: 'draw', by: 'p0', cardId: 'c0', from: 'draw-pile', to: 'hand-p0' };
  const NO = 'That card cannot be played.';

  it('they have no card they could play asks the engine about the other moves', () => {
    const only = (cardId: string): PhraseEnv['check'] => (_s, m) => (m.cardId === cardId ? true : NO);
    expect(cond('they have no card they could play', fixtureEnv(state, { game, move: draw, check: only('c2') }))).toBe(false);
    expect(cond('they have no card they could play', fixtureEnv(state, { game, move: draw, check: () => NO }))).toBe(true);
  });
  it('asks the move exactly as the engine will see it', () => {
    const check = vi.fn<PhraseEnv['check']>(() => NO);
    cond('they have no card they could play', fixtureEnv(state, { game, move: draw, check }));
    expect(check).toHaveBeenCalledTimes(2);
    expect(check).toHaveBeenCalledWith(state, { type: 'play', cardId: 'c1', by: 'p0' });
    expect(check).toHaveBeenCalledWith(state, { type: 'play', cardId: 'c2', by: 'p0' });
  });
  it('asks about the acting player’s own hand', () => {
    const check = vi.fn<PhraseEnv['check']>(() => NO);
    cond('they have no card they could play', fixtureEnv(state, { game, move: { ...draw, by: 'p1', to: 'hand-p1' }, check }));
    expect(check.mock.calls.map(([, m]) => m)).toEqual([{ type: 'play', cardId: 'c3', by: 'p1' }]);
  });
  it('never asks about the move being tried itself', () => {
    const check = vi.fn<PhraseEnv['check']>(() => NO);
    cond('they have no card they could play', fixtureEnv(state, { game, move: draw, check }));
    expect(check.mock.calls.every(([, m]) => m.type !== 'draw')).toBe(true);
  });
  it('asks only about the top card of a pile', () => {
    const pilePhase = fixturePhase('playing', [
      fixtureMove('draw', { shared: 'draw pile' }, { of: { who: 'actor' }, zone: 'hand' }),
      fixtureMove('swap', { shared: 'discard pile' }, { of: { who: 'actor' }, zone: 'hand' }),
    ]);
    const buried = fixtureState([colored('d0', 'discard-pile', 'red', 7), colored('d1', 'discard-pile', 'blue', 3)], { turn });
    const check = vi.fn<PhraseEnv['check']>(() => NO);
    cond('they have no card they could play', fixtureEnv(buried, { game: fixtureColorGame({ phases: [pilePhase] }), move: draw, check }));
    expect(check.mock.calls.map(([, m]) => m)).toEqual([{ type: 'swap', cardId: 'd1', by: 'p0' }]);
  });
  it('only considers the moves of the phase that is running', () => {
    const other = fixturePhase('later', [fixtureMove('play', { of: { who: 'actor' }, zone: 'hand' }, { shared: 'discard pile' })]);
    const check = vi.fn<PhraseEnv['check']>(() => true);
    const lonely = fixtureColorGame({ phases: [fixturePhase('playing', [fixtureMove('draw', { shared: 'draw pile' }, { of: { who: 'actor' }, zone: 'hand' })]), other] });
    expect(cond('they have no card they could play', fixtureEnv(state, { game: lonely, move: draw, check }))).toBe(true);
    expect(check).not.toHaveBeenCalled();
  });
  it('has nothing to play when no phase is running', () => {
    const check = vi.fn<PhraseEnv['check']>(() => true);
    expect(cond('they have no card they could play', fixtureEnv(fixtureState(cards), { game, move: draw, check }))).toBe(true);
    expect(check).not.toHaveBeenCalled();
  });
});

describe('paying what the card says', () => {
  /** COUNTER_GAME where a card costs the number its table shows, which it must be able to pay. */
  const PRICED = COUNTER_GAME.replace(
    '    Then:\n      They pay 1.',
    "    Only if they have at least the card's cost in coins.\n    Then:\n      They pay the card's cost.",
  );
  const compiled = compileGame(PRICED, lib);
  // Read when a test runs, so a game that does not compile fails its own tests and not the whole file.
  const priced = (): CompiledGame => compiled.game!;
  const seats = seatsFor(2);
  const cardNamed = (state: GameState, name: string) => state.cards.find((c) => c.data?.name === name)!;

  /** Two players, p0 to buy from a shop that holds a Ruby (costs 3) and an Opal (costs 1), with `coins` each. */
  function shopping(coins = 7) {
    const game = priced();
    const start = initialState(game, 1);
    const stocked = relocate(start, [cardNamed(start, 'Ruby').id, cardNamed(start, 'Opal').id], 'shop', game);
    const state: GameState = setCounter(
      { ...withBoardData(stocked, game, seats), turn: { current: 'p0', phase: 'shopping' } }, 'coins', 'p0', coins,
    );
    const { engine } = createEngine(game, lib, 2, state);
    const buy = (name: string, by = 'p0') => engine.dispatch({ type: 'buy', cardId: cardNamed(engine.getState(), name).id, by });
    return { engine, buy };
  }

  const ruby = fixtureCard('ruby', 'shop', { name: 'Ruby', cost: 3 });
  const buyRuby: MoveInfo = { verb: 'buy', by: 'p0', cardId: 'ruby', from: 'shop', to: 'stash-p0' };
  const inMove = (cards: ReturnType<typeof fixtureCard>[], move: MoveInfo = buyRuby) =>
    fixtureEnv(
      { ...withBoardData(fixtureState(cards), priced(), seats), turn: { current: 'p0', phase: 'shopping' } },
      { game: priced(), seats, move, subject: { player: 'p0', space: null, card: null } },
    );

  it('compiles', () => {
    expect(compiled.diagnostics).toEqual([]);
  });
  it('pays the number the card shows, as it asks for it', () => {
    const { engine, buy } = shopping();
    expect(buy('Ruby').ok).toBe(true);
    expect(counterOf(engine.getState(), 'coins', 'p0')).toBe(4);
    // The turn went to p1, who passes it back.
    expect(engine.dispatch({ type: 'pass', by: 'p1' }).ok).toBe(true);
    expect(buy('Opal').ok).toBe(true);
    expect(counterOf(engine.getState(), 'coins', 'p0')).toBe(3);
    expect(counterOf(engine.getState(), 'coins', 'p1')).toBe(7);
  });
  it('is refused, and nothing changes, when they have less than the card shows', () => {
    const { engine, buy } = shopping(2);
    const before = engine.getState();
    expect(buy('Ruby')).toMatchObject({ ok: false, reason: "they have at least the card's cost in coins" });
    expect(engine.getState()).toEqual(before);
    expect(buy('Opal').ok).toBe(true);
    expect(counterOf(engine.getState(), 'coins', 'p0')).toBe(1);
  });
  it('asks while the card is still in the shop, and pays once it is in the stash', () => {
    const { engine, buy } = shopping(3);
    expect(buy('Ruby').ok).toBe(true);
    const state = engine.getState();
    expect([cardNamed(state, 'Ruby').zoneId, counterOf(state, 'coins', 'p0')]).toEqual(['stash-p0', 0]);
  });
  it('says so when the card shows something that is not a number', () => {
    const pay = () => run('effect', "they pay the card's name", inMove([ruby]));
    expect(pay).toThrow(new RuleError("This card's name isn't a number."));
    expect(() => cond("they have at least the card's name in coins", inMove([ruby]))).toThrow(new RuleError("This card's name isn't a number."));
  });
  it('says so when the card shows nothing under that name', () => {
    const bare = fixtureCard('ruby', 'shop', { name: 'Ruby' });
    expect(() => run('effect', "they pay the card's cost", inMove([bare]))).toThrow(new RuleError('This card has no cost.'));
    expect(() => cond("they have at least the card's cost in coins", inMove([bare]))).toThrow(new RuleError('This card has no cost.'));
  });
  it('notes a payment that leaves them below 0 as any other payment does', () => {
    const poor = inMove([ruby]);
    const broke = run<GameState>('effect', "they pay the card's cost", { ...poor, state: setCounter(poor.state, 'coins', 'p0', 1) });
    expect(counterOf(broke, 'coins', 'p0')).toBe(-2);
    expect(broke.data[OWES_KEY]).toEqual({ p0: 'bank' });
  });
  it('is registered as needing a move and a player, and the payment a way to pay', () => {
    expect(lib.get('condition', "they have at least the card's {attribute} in {counter}")).toMatchObject({ needsMove: true, needsPlayer: true });
    expect(lib.get('effect', "they pay the card's {attribute}")).toMatchObject({ needsMove: true, needsPayment: true });
  });
  it('only makes sense in a rule about a player\'s move', () => {
    const asButton = COUNTER_GAME.replace('  A player may pass.', "  A player may pass.\n    Only if they have at least the card's cost in coins.");
    expect(compileGame(asButton, lib).diagnostics.map((d) => d.message)).toEqual([
      "“they have at least the card's cost in coins” only makes sense in a rule about a player's move.",
    ]);
  });
});
