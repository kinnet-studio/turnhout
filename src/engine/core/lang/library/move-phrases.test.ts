import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '../../game-state';
import { RuleError } from '../diagnostics';
import {
  fixtureCard, fixtureColorGame, fixtureEnv, fixtureMove, fixturePhase, fixtureState, runPhrase,
} from '../testing';
import type { MoveInfo, PhraseEnv, PhraseKind } from '../types';
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
