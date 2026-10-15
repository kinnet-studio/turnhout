import { describe, expect, it } from 'vitest';
import {
  BOX_ZONE, WINNER_KEY, chooseNext, handZoneOf, leftOf, matchesCard, relocate, resolveSeat, resolveZoneIds, slug, topCard,
  zoneIdFor, zoneInfo,
} from './zones';
import { RuleError } from './diagnostics';
import { makeRng } from '../rng';
import type { CardState } from '../scene';
import { zoneCards, type GameState } from '../game-state';
import { fixtureEnv } from './testing';
import type { CompiledGame, PhraseEnv, ZoneSpec } from './types';

const TRICK: ZoneSpec = { name: 'trick', perPlayer: false, layout: 'row', visibility: 'public' };
const DECK: ZoneSpec = { name: 'deck', perPlayer: false, layout: 'pile', visibility: 'secret' };
const HAND: ZoneSpec = { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' };
const WON_PILE: ZoneSpec = { name: 'won pile', perPlayer: true, layout: 'pile', visibility: 'public' };

const GAME: CompiledGame = {
  name: 'Fixture', players: { min: 2, max: 3 }, zones: [TRICK, DECK, HAND, WON_PILE],
  cards: [], setup: [], phases: [], end: null, examples: [], board: null, facts: [], columns: {},
};

const card = (id: string, zoneId: string, slot?: number, over: Partial<CardState> = {}): CardState =>
  ({ id, zoneId, faceUp: false, faceKey: `k-${id}`, ...(slot === undefined ? {} : { slot }), ...over });

const stateWith = (cards: CardState[], over: Partial<GameState> = {}): GameState => ({ cards, data: {}, rng: makeRng(1), ...over });

const SEATS = ['p0', 'p1', 'p2'];
const envFor = (state: GameState, move?: PhraseEnv['move']): PhraseEnv => fixtureEnv(state, { game: GAME, seats: SEATS, move });
const MOVE = { verb: 'play', by: 'p1', cardId: 'c1', from: 'hand-p1', to: 'trick' };

describe('zone ids', () => {
  it('names zones by slug and seat', () => {
    expect(zoneIdFor('pass pile', 'p1')).toBe('pass-pile-p1');
    expect(zoneIdFor('trick')).toBe('trick');
    expect(slug('pass pile')).toBe('pass-pile');
  });
  it('slugs are lowercase words joined by dashes', () => {
    expect(slug('  Dealer’s  Pile! ')).toBe('dealers-pile');
    expect(slug('Won Pile')).toBe('won-pile');
  });
  it('looks a zone id up in the game', () => {
    expect(zoneInfo(GAME, 'trick')).toEqual({ spec: TRICK, seat: null });
    expect(zoneInfo(GAME, 'won-pile-p2')).toEqual({ spec: WON_PILE, seat: 'p2' });
    expect(zoneInfo(GAME, 'hand-p0')).toEqual({ spec: HAND, seat: 'p0' });
  });
  it('knows nothing about other ids', () => {
    expect(zoneInfo(GAME, BOX_ZONE)).toBeNull();
    expect(zoneInfo(GAME, 'discard')).toBeNull();
    expect(zoneInfo(GAME, 'hand')).toBeNull();
    expect(zoneInfo(GAME, 'trick-p1')).toBeNull();
    expect(zoneInfo(GAME, 'won-pile-px')).toBeNull();
  });
  it('tells apart per-player names that share a prefix', () => {
    const game: CompiledGame = { ...GAME, zones: [{ ...HAND, name: 'pass' }, { ...HAND, name: 'pass pile' }] };
    expect(zoneInfo(game, 'pass-pile-p1')?.spec.name).toBe('pass pile');
    expect(zoneInfo(game, 'pass-p1')?.spec.name).toBe('pass');
  });
});

describe('seats and zone references', () => {
  const state = stateWith([], { data: { [WINNER_KEY]: 'p2' } });

  it('keeps the winner key and box zone constant', () => {
    expect([BOX_ZONE, WINNER_KEY]).toEqual(['__box', 'lang:winner']);
  });

  it('resolves each/actor/winner refs', () => {
    expect(resolveZoneIds({ each: 'won pile' }, envFor(state))).toEqual(['won-pile-p0', 'won-pile-p1', 'won-pile-p2']);
    expect(resolveZoneIds({ of: { who: 'actor' }, zone: 'hand' }, envFor(state, MOVE))).toEqual(['hand-p1']);
    expect(resolveZoneIds({ of: { who: 'actor' }, zone: 'hand' }, envFor(state, MOVE), 'p2')).toEqual(['hand-p2']);
    expect(resolveZoneIds({ of: { who: 'winner' }, zone: 'won pile' }, envFor(state))).toEqual(['won-pile-p2']);
    expect(resolveZoneIds({ of: { seat: 'p0' }, zone: 'hand' }, envFor(state))).toEqual(['hand-p0']);
    expect(resolveZoneIds({ shared: 'trick' }, envFor(state))).toEqual(['trick']);
  });
  it('resolves each in seat order', () => {
    const env = { ...envFor(state), seats: ['p2', 'p0'] };
    expect(resolveZoneIds({ each: 'hand' }, env)).toEqual(['hand-p2', 'hand-p0']);
  });
  it('explains a missing winner', () => {
    const noWinner = envFor(stateWith([]));
    expect(() => resolveZoneIds({ of: { who: 'winner' }, zone: 'won pile' }, noWinner)).toThrow(RuleError);
    expect(() => resolveZoneIds({ of: { who: 'winner' }, zone: 'won pile' }, noWinner)).toThrow('There is no winner yet.');
    expect(() => resolveSeat({ who: 'winner' }, envFor(stateWith([], { data: { [WINNER_KEY]: 7 } })))).toThrow('There is no winner yet.');
  });
  it('explains “their” outside a move', () => {
    expect(() => resolveSeat({ who: 'actor' }, envFor(state))).toThrow(RuleError);
    expect(() => resolveSeat({ who: 'actor' }, envFor(state))).toThrow('Only a rule about a player\'s move can say “their”.');
  });
  it('rejects a seat that is not at the table', () => {
    const twoSeats = { ...envFor(state), seats: ['p0', 'p1'] };
    expect(() => resolveSeat({ seat: 'p3' }, twoSeats)).toThrow(RuleError);
    expect(() => resolveSeat({ seat: 'p3' }, twoSeats)).toThrow('There is no player p3 at this table.');
    expect(() => resolveZoneIds({ of: { seat: 'p3' }, zone: 'hand' }, twoSeats)).toThrow('There is no player p3 at this table.');
    expect(resolveZoneIds({ of: { seat: 'p1' }, zone: 'hand' }, twoSeats)).toEqual(['hand-p1']);
  });
  it('resolves a seat from the move, an explicit actor or the reference itself', () => {
    expect(resolveSeat({ who: 'actor' }, envFor(state, MOVE))).toBe('p1');
    expect(resolveSeat({ who: 'actor' }, envFor(state, MOVE), 'p0')).toBe('p0');
    expect(resolveSeat({ who: 'actor' }, envFor(state), 'p2')).toBe('p2');
    expect(resolveSeat({ who: 'winner' }, envFor(state))).toBe('p2');
    expect(resolveSeat({ seat: 'p1' }, envFor(state))).toBe('p1');
  });
});

describe('the hand', () => {
  it('finds a seat’s hand zone', () => {
    expect(handZoneOf(GAME, 'p1')).toBe('hand-p1');
  });
  it('prefers the zone called hand, then any per-player hand layout', () => {
    const side: ZoneSpec = { name: 'side hand', perPlayer: true, layout: 'hand', visibility: 'public' };
    expect(handZoneOf({ ...GAME, zones: [side, HAND] }, 'p0')).toBe('hand-p0');
    expect(handZoneOf({ ...GAME, zones: [TRICK, side] }, 'p0')).toBe('side-hand-p0');
  });
  it('explains a game without a hand', () => {
    const game = { ...GAME, zones: [TRICK, WON_PILE, { ...HAND, perPlayer: false }] };
    expect(() => handZoneOf(game, 'p0')).toThrow(RuleError);
    expect(() => handZoneOf(game, 'p0')).toThrow('This game has no hand.');
  });
});

describe('seat order', () => {
  it('leftOf wraps', () => {
    expect(leftOf('p2', SEATS)).toBe('p0');
    expect(leftOf('p0', SEATS)).toBe('p1');
    expect(leftOf('p0', ['p0'])).toBe('p0');
  });
  it('leftOf rejects a seat that is not at the table', () => {
    expect(() => leftOf('p9', SEATS)).toThrow('There is no player p9 at this table.');
  });
  it('chooseNext marks the choice', () => {
    const state = stateWith([], { turn: { current: 'p0', phase: 'main' } });
    expect(chooseNext(state, 'p1').turn).toEqual({ current: 'p1', phase: 'main', chosen: true });
    expect(state.turn).toEqual({ current: 'p0', phase: 'main' });
  });
  it('chooseNext starts a turn when there is none', () => {
    expect(chooseNext(stateWith([]), 'p2').turn).toEqual({ current: 'p2', chosen: true });
  });
});

describe('cards', () => {
  it('matchesCard compares every attribute', () => {
    const c = card('c1', 'deck', 0, { data: { suit: 'S', rank: 12 } });
    expect(matchesCard(c, { suit: 'S' })).toBe(true);
    expect(matchesCard(c, { suit: 'S', rank: 12 })).toBe(true);
    expect(matchesCard(c, { suit: 'S', rank: 11 })).toBe(false);
    expect(matchesCard(c, { suit: 'H' })).toBe(false);
    expect(matchesCard(c, { color: 'red' })).toBe(false);
    expect(matchesCard(c, {})).toBe(true);
    expect(matchesCard(card('c2', 'deck'), { suit: 'S' })).toBe(false);
  });

  it('topCard is the last card by slot', () => {
    const state = stateWith([card('c1', 'deck', 2), card('c2', 'deck', 0), card('c3', 'trick', 0), card('c4', 'deck', 1)]);
    expect(topCard(state, 'deck')?.id).toBe('c1');
    expect(topCard(state, 'trick')?.id).toBe('c3');
    expect(topCard(state, 'hand-p0')).toBeUndefined();
  });
});

describe('relocate', () => {
  it('appends after existing cards and turns faces by visibility', () => {
    const state = stateWith([card('c1', 'trick', 0, { faceUp: true }), card('c2', 'deck', 0), card('c3', 'deck', 1)]);
    const toTrick = relocate(state, ['c2', 'c3'], 'trick', GAME);
    expect(toTrick.cards.find((c) => c.id === 'c1')).toBe(state.cards[0]);
    expect(toTrick.cards.filter((c) => c.zoneId === 'trick').map((c) => [c.id, c.slot, c.faceUp])).toEqual([
      ['c1', 0, true], ['c2', 1, true], ['c3', 2, true],
    ]);
    const toHand = relocate(state, ['c2', 'c3'], 'hand-p0', GAME);
    expect(toHand.cards.filter((c) => c.zoneId === 'hand-p0').map((c) => [c.id, c.slot, c.faceUp])).toEqual([['c2', 0, false], ['c3', 1, false]]);
  });
  it('puts cards in the order given', () => {
    const state = stateWith([card('c1', 'deck', 0), card('c2', 'deck', 1), card('c3', 'deck', 2)]);
    const out = relocate(state, ['c3', 'c1'], 'hand-p1', GAME);
    expect(zoneCards(out, 'hand-p1').map((c) => [c.id, c.slot])).toEqual([['c3', 0], ['c1', 1]]);
  });
  it('turns cards face down in secret and owner zones and in zones outside the game', () => {
    const state = stateWith([card('c1', 'trick', 0, { faceUp: true })]);
    expect(relocate(state, ['c1'], 'deck', GAME).cards[0].faceUp).toBe(false);
    expect(relocate(state, ['c1'], BOX_ZONE, GAME).cards[0]).toMatchObject({ zoneId: BOX_ZONE, faceUp: false, slot: 0 });
    expect(relocate(state, ['c1'], 'nowhere', GAME).cards[0].faceUp).toBe(false);
    expect(relocate(stateWith([card('c9', 'deck', 0)]), ['c9'], 'won-pile-p2', GAME).cards[0].faceUp).toBe(true);
  });
  it('keeps every other card field and leaves other cards alone', () => {
    const c2 = card('c2', 'deck', 0, { data: { rank: 7 }, draggable: true, revealTo: ['p0'] });
    const c3 = card('c3', 'hand-p0', 0);
    const out = relocate(stateWith([c2, c3], { turn: { current: 'p0' } }), ['c2'], 'trick', GAME);
    expect(out.cards[0]).toEqual({ ...c2, zoneId: 'trick', slot: 0, faceUp: true });
    expect(out.cards[1]).toBe(c3);
    expect(out.turn).toEqual({ current: 'p0' });
  });
  it('continues after the last slot when the zone has gaps or unslotted cards', () => {
    const gaps = stateWith([card('c1', 'trick', 0), card('c2', 'trick', 4), card('c3', 'deck', 0)]);
    expect(relocate(gaps, ['c3'], 'trick', GAME).cards[2].slot).toBe(5);
    const unslotted = stateWith([card('c1', 'trick'), card('c2', 'trick'), card('c3', 'deck', 0)]);
    expect(relocate(unslotted, ['c3'], 'trick', GAME).cards[2].slot).toBe(2);
  });
  it('moves a card that is already there to the end', () => {
    const state = stateWith([card('c1', 'trick', 0), card('c2', 'trick', 1), card('c3', 'trick', 2)]);
    const out = relocate(state, ['c1'], 'trick', GAME);
    expect(out.cards.map((c) => [c.id, c.slot])).toEqual([['c1', 3], ['c2', 1], ['c3', 2]]);
    expect(topCard(out, 'trick')?.id).toBe('c1');
  });
  it('does not change the state it was given', () => {
    const state = stateWith([card('c1', 'deck', 0)]);
    relocate(state, ['c1'], 'trick', GAME);
    expect(state.cards[0]).toEqual(card('c1', 'deck', 0));
  });
  it('rejects a card that is not in the game', () => {
    expect(() => relocate(stateWith([]), ['c9'], 'trick', GAME)).toThrow('c9');
  });
});
