import { describe, expect, it } from 'vitest';
import { zoneCards, type GameState } from '../../game-state';
import { seatsFor } from '../build';
import { compileGame } from '../compile';
import { RuleError } from '../diagnostics';
import { misnamedParam } from '../refs';
import { COUNTER_GAME, fixtureCard, fixtureEnv, fixtureState, runPhrase, vocabFor } from '../testing';
import type { PhraseEnv, PhraseKind } from '../types';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();

/** COUNTER_GAME with a second public row, so a card that goes into a zone can be told to turn face up there. */
const QUEUES = COUNTER_GAME.replace(
  '  The shop is a row in the center that everyone can see.',
  '  The shop is a row in the center that everyone can see.\n  The pool is a row in the center that everyone can see.',
);
const compiled = compileGame(QUEUES, lib);
// Read when a test runs, so a game that does not compile fails its own tests and not the whole file.
const game = () => compiled.game!;
const seats = seatsFor(2);

const envOf = (cards: ReturnType<typeof fixtureCard>[], over: Partial<GameState> = {}): PhraseEnv =>
  fixtureEnv(fixtureState(cards, over), { game: game(), seats, subject: { player: 'p0', space: null, card: null } });
const run = <T = unknown>(kind: PhraseKind, text: string, env: PhraseEnv) => runPhrase<T>(lib, kind, text, env);
const effect = (text: string, env: PhraseEnv) => run<GameState>('effect', text, env);
const ids = (state: GameState, zoneId: string) => zoneCards(state, zoneId).map((c) => c.id);

/** A gem in a zone, at a slot counted from the bottom. */
const gem = (id: string, zoneId: string, name: string, slot: number) => fixtureCard(id, zoneId, { name, cost: 1 }, { slot });

describe('the queue phrases', () => {
  it('compile with the game they are tried on', () => {
    expect(compiled.diagnostics).toEqual([]);
  });
});

describe('the bottom card', () => {
  it('moves the first card in slot order, whatever order the cards are listed in', () => {
    const env = envOf([gem('c2', 'pile', 'Opal', 2), gem('c0', 'pile', 'Opal', 0), gem('c1', 'pile', 'Opal', 1)]);
    const next = effect('move the bottom card of the pile to the shop', env);
    expect(ids(next, 'shop')).toEqual(['c0']);
    expect(ids(next, 'pile')).toEqual(['c1', 'c2']);
  });
  it('puts it on top of what the other zone holds', () => {
    const env = envOf([gem('c0', 'pile', 'Opal', 0), gem('c1', 'shop', 'Ruby', 0)]);
    expect(ids(effect('move the bottom card of the pile to the shop', env), 'shop')).toEqual(['c1', 'c0']);
  });
  it('says so when the zone is empty', () => {
    const empty = () => effect('move the bottom card of the pile to the shop', envOf([]));
    expect(empty).toThrow(new RuleError('There is no card to move: the pile is empty.'));
  });
});

describe('a shared zone has a card', () => {
  const holds = (zoneId: string) => envOf([gem('c0', zoneId, 'Ruby', 0), gem('c1', 'shop', 'Opal', 0)]);

  it('is true when some card in the shop matches, and false when none does', () => {
    expect(run('condition', 'the shop has a Ruby', holds('shop'))).toBe(true);
    expect(run('condition', 'the shop has a Ruby', holds('pile'))).toBe(false);
    expect(run('condition', 'the shop has an Opal', holds('pile'))).toBe(true);
  });
  it('looks in that zone only', () => {
    expect(run('condition', 'the pool has a Ruby', holds('shop'))).toBe(false);
    expect(run('condition', 'the pool has a Ruby', holds('pool'))).toBe(true);
  });
  it('leaves “their stash has a card” to the phrase for a zone each player has', () => {
    const found = lib.match('condition', 'their stash has a Ruby', vocabFor(game()));
    expect(found).toMatchObject({ status: 'ok', pattern: 'their {perzone} has {card}' });
    expect(lib.match('condition', 'the shop has a Ruby', vocabFor(game()))).toMatchObject({ status: 'ok', pattern: '{sharedzone} has {card}' });
  });
  it('is still the phrase for a count when it says how many cards', () => {
    expect(lib.match('condition', 'the shop has 2 cards', vocabFor(game()))).toMatchObject({ status: 'ok', pattern: '{zone} has {int} card(s)' });
  });
  it('does not read a zone each player has as shared', () => {
    expect(lib.match('condition', 'the stash has a Ruby', vocabFor(game())).status).not.toBe('ok');
  });
});

describe('a shared zone that is misnamed', () => {
  const vocab = () => vocabFor(game());

  it('names the shared zones that are close, and not the ones each player has', () => {
    expect(misnamedParam('sharedzone', 'the shp', vocab())).toEqual({ message: 'There is no zone called “shp”.', suggestions: ['shop'] });
    expect(lib.misnamed(['condition'], 'the shp has a Ruby', vocab())).toEqual({
      kind: 'condition', problem: { message: 'There is no zone called “shp”.', suggestions: ['shop'] },
    });
  });
  it('leaves a real zone to the phrases that read it', () => {
    for (const text of ['the shop', 'the stash', 'their stash']) expect(misnamedParam('sharedzone', text, vocab())).toBeNull();
  });
  it('says what is wrong with the card, not the zone, when the zone is right', () => {
    expect(lib.misnamed(['condition'], 'the shop has a Rubby', vocab())).toEqual({
      kind: 'condition', problem: { message: 'There is no card value called “Rubby”.', suggestions: ['Ruby'] },
    });
  });
});

describe('moving a named card', () => {
  it('moves the first matching card in slot order of the first zone', () => {
    const env = envOf([gem('c0', 'shop', 'Opal', 0), gem('c1', 'shop', 'Ruby', 2), gem('c2', 'shop', 'Ruby', 1), gem('c3', 'pool', 'Ruby', 0)]);
    const next = effect('move a Ruby from the shop to the pile', env);
    expect(ids(next, 'pile')).toEqual(['c2']);
    expect(ids(next, 'shop')).toEqual(['c0', 'c1']);
    expect(ids(next, 'pool')).toEqual(['c3']);
  });
  it('says so when there is none there, even if there is one elsewhere', () => {
    const none = () => effect('move a Ruby from the shop to the pile', envOf([gem('c0', 'shop', 'Opal', 0), gem('c1', 'pool', 'Ruby', 0)]));
    expect(none).toThrow(new RuleError('There is no Ruby in the shop.'));
  });
  it('is not the phrase that moves every card of a zone', () => {
    const found = lib.match('effect', 'move a Ruby from the shop to the pile', vocabFor(game()));
    expect(found).toMatchObject({ status: 'ok', pattern: 'move {card} from {zone} to {zone}' });
  });
});

describe('dealing up to a number of cards', () => {
  const pile = (n: number) => Array.from({ length: n }, (_, i) => gem(`c${i}`, 'pile', 'Opal', i));

  it('deals as many as it says when the zone has them', () => {
    const next = effect('deal up to 2 cards from the pile to their stash', envOf(pile(3)));
    expect(ids(next, 'stash-p0')).toEqual(['c1', 'c2']);
    expect(ids(next, 'pile')).toEqual(['c0']);
  });
  it('takes what is there when the zone is short, in pile order', () => {
    const next = effect('deal up to 3 cards from the pile to their stash', envOf(pile(2)));
    expect(ids(next, 'stash-p0')).toEqual(['c0', 'c1']);
    expect(ids(next, 'pile')).toEqual([]);
  });
  it('moves none from an empty zone, and does not complain', () => {
    const env = envOf([]);
    expect(effect('deal up to 3 cards from the pile to their stash', env)).toEqual(env.state);
  });
  it('refuses a negative number as deal does', () => {
    const negative = () => effect('deal up to -1 cards from the pile to their stash', envOf(pile(2)));
    expect(negative).toThrow(new RuleError('A negative number of cards cannot be dealt.'));
  });
  it('deals to each player what is left when its turn comes', () => {
    const next = effect('deal up to 2 cards from the pile to each stash', envOf(pile(3)));
    expect(ids(next, 'stash-p0')).toEqual(['c1', 'c2']);
    expect(ids(next, 'stash-p1')).toEqual(['c0']);
  });

  it('deals 1 card to each stash, one to every seat', () => {
    const next = effect('deal 1 card from the pile to each stash', envOf(pile(3)));
    expect(ids(next, 'stash-p0')).toEqual(['c2']);
    expect(ids(next, 'stash-p1')).toEqual(['c1']);
    expect(ids(next, 'pile')).toEqual(['c0']);
  });
  it('deals 1 card as deal does: it refuses a zone that has none', () => {
    const empty = () => effect('deal 1 card from the pile to their stash', envOf([]));
    expect(empty).toThrow(new RuleError('There are no cards left in the pile.'));
  });
});

describe('a card goes into the bottom fifth of a zone', () => {
  const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

  /** `n` other cards in the pile, slots 0 to n-1, and an Opal in the shop that goes in. */
  const stacked = (n: number, seed: number): PhraseEnv => {
    const others = Array.from({ length: n }, (_, i) => gem(`o${i}`, 'pile', 'Ruby', i));
    const state = fixtureState([...others, fixtureCard('in', 'shop', { name: 'Opal', cost: 1 }, { faceUp: true })]);
    return fixtureEnv({ ...state, rng: { seed, count: 0 } }, { game: game(), seats });
  };
  const slotAfter = (n: number, seed: number): number => {
    const next = effect('an Opal goes into the bottom fifth of the pile', stacked(n, seed));
    return ids(next, 'pile').indexOf('in');
  };
  const slotsFor = (n: number) => new Set(SEEDS.map((seed) => slotAfter(n, seed)));

  it('with 34 other cards, goes into slots 0 to 7, and every one of them comes up', () => {
    expect([...slotsFor(34)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  it('with no other card, goes to slot 0', () => {
    expect([...slotsFor(0)]).toEqual([0]);
  });
  it('with 3 other cards, goes into slots 0 to 1', () => {
    expect([...slotsFor(3)].sort((a, b) => a - b)).toEqual([0, 1]);
  });
  it('with 6 other cards, goes into slots 0 to 2', () => {
    expect([...slotsFor(6)].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });
  it('with 1 other card, goes below it or above it', () => {
    expect([...slotsFor(1)].sort((a, b) => a - b)).toEqual([0, 1]);
  });

  it('counts the slots from the bottom, and keeps the other cards in their order', () => {
    const next = effect('an Opal goes into the bottom fifth of the pile', stacked(10, 5));
    const slot = ids(next, 'pile').indexOf('in');
    expect(ids(next, 'pile').filter((id) => id !== 'in')).toEqual(Array.from({ length: 10 }, (_, i) => `o${i}`));
    expect(zoneCards(next, 'pile').map((c) => c.slot)).toEqual(Array.from({ length: 11 }, (_, i) => i));
    expect(slot).toBeLessThanOrEqual(2);
  });
  it('turns the card face down in a zone no one can see', () => {
    const next = effect('an Opal goes into the bottom fifth of the pile', stacked(5, 1));
    expect(next.cards.find((c) => c.id === 'in')).toMatchObject({ zoneId: 'pile', faceUp: false });
  });
  it('leaves it face up in a zone everyone can see', () => {
    const env = envOf([gem('o0', 'pool', 'Ruby', 0), fixtureCard('in', 'pile', { name: 'Opal', cost: 1 })]);
    const next = effect('an Opal goes into the bottom fifth of the pool', env);
    expect(next.cards.find((c) => c.id === 'in')).toMatchObject({ zoneId: 'pool', faceUp: true });
  });
  it('moves the random numbers on, once, and the same seed gives the same slot', () => {
    const env = stacked(34, 7);
    const next = effect('an Opal goes into the bottom fifth of the pile', env);
    expect(next.rng).toEqual({ seed: 7, count: 1 });
    expect(slotAfter(34, 7)).toBe(slotAfter(34, 7));
    expect(env.state.rng).toEqual({ seed: 7, count: 0 });
  });
  it('moves the random numbers on even when there is nothing to choose between', () => {
    expect(effect('an Opal goes into the bottom fifth of the pile', stacked(0, 7)).rng).toEqual({ seed: 7, count: 1 });
  });
  it('takes the first matching card in play, and leaves one that is out of the game alone', () => {
    const state = fixtureState([
      fixtureCard('gone', '__box', { name: 'Opal', cost: 1 }), fixtureCard('first', 'shop', { name: 'Opal', cost: 1 }),
      fixtureCard('second', 'stash-p1', { name: 'Opal', cost: 1 }), gem('o0', 'pile', 'Ruby', 0),
    ]);
    const next = effect('an Opal goes into the bottom fifth of the pile', fixtureEnv(state, { game: game(), seats }));
    expect(ids(next, 'pile')).toContain('first');
    expect(ids(next, 'pile')).not.toContain('second');
    expect(next.cards.find((c) => c.id === 'gone')?.zoneId).toBe('__box');
  });
  it('does not count itself among the other cards when it is in the zone already', () => {
    const cards = [...Array.from({ length: 5 }, (_, i) => gem(`o${i}`, 'pile', 'Ruby', i)), fixtureCard('in', 'pile', { name: 'Opal', cost: 1 }, { slot: 5 })];
    const next = effect('an Opal goes into the bottom fifth of the pile', fixtureEnv(fixtureState(cards), { game: game(), seats }));
    expect(ids(next, 'pile').indexOf('in')).toBeLessThanOrEqual(1);
    expect(ids(next, 'pile')).toHaveLength(6);
  });
  it('says so when no card is that kind', () => {
    const none = () => effect('an Opal goes into the bottom fifth of the pile', envOf([gem('o0', 'pile', 'Ruby', 0)]));
    expect(none).toThrow(new RuleError('No card is an Opal.'));
  });
  it('takes the card off the card it sat on, as any move does', () => {
    const env = envOf([gem('o0', 'pile', 'Ruby', 0), fixtureCard('in', 'shop', { name: 'Opal', cost: 1, 'lang:on': 'o0' })]);
    const next = effect('an Opal goes into the bottom fifth of the pile', env);
    expect(next.cards.find((c) => c.id === 'in')).toMatchObject({ zoneId: 'pile', data: { name: 'Opal', cost: 1 } });
    expect(next.cards.find((c) => c.id === 'in')?.data).not.toHaveProperty('lang:on');
  });
});
