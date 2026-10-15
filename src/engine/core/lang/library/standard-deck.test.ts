import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import { RuleError } from '../diagnostics';
import { fixtureCard, fixtureEnv, fixtureGame, fixtureState, runPhrase } from '../testing';
import type { MoveInfo, PhraseEnv } from '../types';
import { WINNER_KEY } from '../zones';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const std = (id: string, zoneId: string, suit: string, rank: number, movedBy?: string) =>
  fixtureCard(id, zoneId, { suit, rank, ...(movedBy ? { movedBy } : {}) });
const play = (by: string, cardId: string): MoveInfo => ({ verb: 'play', by, cardId, from: `hand-${by}`, to: 'trick' });
const follows = (env: PhraseEnv) => runPhrase<boolean>(lib, 'condition', 'they follow the led suit when they can', env);
const winTrick = (env: PhraseEnv) => runPhrase<GameState>(lib, 'effect', 'The highest card of the led suit wins the trick', env);

describe('following the led suit', () => {
  const led = std('led', 'trick', 'C', 5, 'p1');

  it('follow suit: must follow when able, free when not', () => {
    const able = fixtureState([led, std('club', 'hand-p2', 'C', 9), std('queen', 'hand-p2', 'S', 12)]);
    expect(follows(fixtureEnv(able, { move: play('p2', 'queen') }))).toBe(false);
    const unable = fixtureState([led, std('diamond', 'hand-p2', 'D', 9), std('queen', 'hand-p2', 'S', 12)]);
    expect(follows(fixtureEnv(unable, { move: play('p2', 'queen') }))).toBe(true);
    const leading = fixtureState([std('club', 'hand-p2', 'C', 9), std('queen', 'hand-p2', 'S', 12)]);
    expect(follows(fixtureEnv(leading, { move: play('p2', 'queen') }))).toBe(true);
  });
  it('playing the led suit is always allowed', () => {
    const state = fixtureState([led, std('club', 'hand-p2', 'C', 9), std('queen', 'hand-p2', 'S', 12)]);
    expect(follows(fixtureEnv(state, { move: play('p2', 'club') }))).toBe(true);
  });
  it('takes the led suit from the first card played', () => {
    const state = fixtureState([led, std('second', 'trick', 'H', 2, 'p2'), std('heart', 'hand-p3', 'H', 9), std('club', 'hand-p3', 'C', 3)]);
    expect(follows(fixtureEnv(state, { move: play('p3', 'heart') }))).toBe(false);
    expect(follows(fixtureEnv(state, { move: play('p3', 'club') }))).toBe(true);
  });
  it('only counts the acting player’s own hand', () => {
    const state = fixtureState([led, std('club', 'hand-p1', 'C', 9), std('queen', 'hand-p2', 'S', 12)]);
    expect(follows(fixtureEnv(state, { move: play('p2', 'queen') }))).toBe(true);
  });
  it('needs cards that have a suit', () => {
    const state = fixtureState([fixtureCard('led', 'trick', { color: 'red' }), fixtureCard('x', 'hand-p2', { color: 'blue' })]);
    expect(() => follows(fixtureEnv(state, { move: play('p2', 'x') }))).toThrow(RuleError);
  });
});

describe('the highest card of the led suit', () => {
  it('highest card of the led suit wins, aces high', () => {
    const state = fixtureState([
      std('a', 'trick', 'C', 5, 'p0'), std('b', 'trick', 'C', 1, 'p1'), std('c', 'trick', 'H', 13, 'p2'), std('d', 'trick', 'C', 2, 'p3'),
    ]);
    expect(winTrick(fixtureEnv(state)).data[WINNER_KEY]).toBe('p1');
  });
  it('counts an ace as the lowest card when no card set is aces high', () => {
    const state = fixtureState([std('a', 'trick', 'C', 5, 'p0'), std('b', 'trick', 'C', 1, 'p1'), std('c', 'trick', 'C', 2, 'p2')]);
    const lowAces = fixtureGame({ cards: fixtureGame().cards.map((set) => ({ ...set, acesHigh: false })) });
    expect(winTrick(fixtureEnv(state, { game: lowAces })).data[WINNER_KEY]).toBe('p0');
  });
  it('ignores higher cards of other suits', () => {
    const state = fixtureState([std('a', 'trick', 'S', 3, 'p0'), std('b', 'trick', 'H', 13, 'p1'), std('c', 'trick', 'S', 4, 'p2'), std('d', 'trick', 'D', 1, 'p3')]);
    expect(winTrick(fixtureEnv(state)).data[WINNER_KEY]).toBe('p2');
  });
  it('lets the leader win when nobody beats the lead', () => {
    const state = fixtureState([std('a', 'trick', 'S', 9, 'p3'), std('b', 'trick', 'H', 13, 'p0'), std('c', 'trick', 'S', 4, 'p1')]);
    expect(winTrick(fixtureEnv(state)).data[WINNER_KEY]).toBe('p3');
  });
  it('keeps the rest of the state', () => {
    const state = fixtureState([std('a', 'trick', 'S', 9, 'p3')], { data: { 'hearts:broken': true } });
    const out = winTrick(fixtureEnv(state));
    expect(out.data).toEqual({ 'hearts:broken': true, [WINNER_KEY]: 'p3' });
    expect(out.cards).toBe(state.cards);
    expect(state.data[WINNER_KEY]).toBeUndefined();
  });
  it('has nothing to decide in an empty zone', () => {
    const empty = () => winTrick(fixtureEnv(fixtureState([])));
    expect(empty).toThrow(RuleError);
    expect(empty).toThrow('the trick is empty, so no card can win it.');
  });
  it('needs to know who played the winning card', () => {
    const state = fixtureState([std('a', 'trick', 'S', 9), std('b', 'trick', 'S', 4, 'p1')]);
    expect(() => winTrick(fixtureEnv(state))).toThrow(RuleError);
    expect(() => winTrick(fixtureEnv(state))).toThrow('who played');
  });
  it('is not one of the phrases that need a move', () => {
    expect(lib.get('effect', 'the highest card of the led suit wins {zone}')?.needsMove).toBe(false);
    expect(lib.get('condition', 'they follow the led suit when they can')?.needsMove).toBe(true);
  });
});
