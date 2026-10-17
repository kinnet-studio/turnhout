import { describe, expect, it } from 'vitest';
import type { ActionView, CardPickView, ChoiceView } from '@/engine/core/lang/board-view';
import type { CardState } from '@/engine/core/scene';
import { aboutOf, choicesFor, choicesOfPress, nextChoice, questionOf } from './choice-step';

/** Whom to pay, of two who qualify. */
const P: ChoiceView = {
  at: 0, prompt: 'Pick who to pay the fee to: p1 or p2.', options: [{ value: 'p1', allowed: true }, { value: 'p2', allowed: true }],
};
/** Whom to pay, of one who qualifies: never asked. */
const L: ChoiceView = { at: 1, prompt: 'Pick who to pay the fee to: p1.', options: [{ value: 'p1', allowed: true }] };
/** How to trim, of three options. */
const T: ChoiceView = {
  at: 2, prompt: 'Choose one: Trim 2 red, Trim 2 gold or Trim 1 of each.',
  options: [{ value: 'Trim 2 red', allowed: true }, { value: 'Trim 2 gold', allowed: true }, { value: 'Trim 1 of each', allowed: true }],
};

const button = (over: Partial<ActionView>): ActionView => ({
  move: 'm', label: 'M', allowed: true, target: null, amount: false, players: null, ...over,
});
const card = (data: CardState['data']): CardState => ({ id: 'c1', zoneId: 'stash-p0', faceUp: true, faceKey: 'k', data });

describe('choicesFor', () => {
  const ONE: CardPickView = {
    some: false, prompt: 'Pick a card in your stash to open',
    cards: [{ id: 'c1', name: 'Statue', allowed: true, choices: [P] }, { id: 'c2', name: 'Bowl', allowed: true }], onto: null,
  };
  const ONTO: CardPickView = {
    some: false, prompt: 'Pick a card in your stash to fund', cards: [{ id: 'c1', name: 'Potter', allowed: true }],
    onto: { prompt: 'Pick where it goes: a card in your workshop', targets: { c1: [{ id: 't1', name: 'Statue', allowed: true, choices: [T] }] } },
  };

  it("gives a button that picks nothing the button's own choices", () => {
    expect(choicesFor(button({ choices: [P] }), null)).toEqual([P]);
  });
  it('gives a card picked its choices, and a card with none, or not listed, none', () => {
    const open = button({ cards: ONE });
    expect(choicesFor(open, { cardId: 'c1' })).toEqual([P]);
    expect(choicesFor(open, { cardId: 'c2' })).toEqual([]);
    expect(choicesFor(open, { cardId: 'zz' })).toEqual([]);
  });
  it("gives a card picked with the card it goes to the choices on that card's entry", () => {
    expect(choicesFor(button({ cards: ONTO }), { cardId: 'c1', onto: 't1' })).toEqual([T]);
  });
  it('gives a set none, and no button none', () => {
    expect(choicesFor(button({ cards: { ...ONE, some: true } }), { cardIds: ['c1'] })).toEqual([]);
    expect(choicesFor(undefined, null)).toEqual([]);
  });
});

describe('nextChoice', () => {
  it('asks the first choice with several answers and none given, in order, and never one with a single answer', () => {
    expect(nextChoice([P, L, T], {})).toBe(P);
    expect(nextChoice([P, L, T], { 0: 'p2' })).toBe(T);
    expect(nextChoice([P, L, T], { 0: 'p2', 2: 'Trim 2 red' })).toBeNull();
    expect(nextChoice([L], {})).toBeNull();
  });
  it('P6: has nothing left to ask once an Undo leaves the only choice unanswered with a single answer', () => {
    const narrowed: ChoiceView = { ...T, prompt: 'Choose one: Trim 2 red.', options: [T.options[0]] };
    expect(nextChoice([P, narrowed], { 0: 'p1' })).toBeNull();
  });
  it('asks again a choice whose answer the view no longer lists', () => {
    const onlyP1: ChoiceView = { ...P, prompt: 'Pick who to pay the fee to: p1 or p3.', options: [P.options[0], { value: 'p3', allowed: true }] };
    expect(nextChoice([onlyP1, T], { 0: 'p2', 2: 'Trim 2 red' })).toBe(onlyP1);
  });
  it('Review Focus: asks again a choice answered with what the view no longer lists, even with one option left, never filling it in', () => {
    const narrowed: ChoiceView = { ...L, at: 0 };
    expect(nextChoice([narrowed, T], { 0: 'p2', 2: 'Trim 2 red' })).toBe(narrowed);
    expect(nextChoice([narrowed, T], { 0: 'p1', 2: 'Trim 2 red' })).toBeNull();
  });
});

describe('choicesOfPress', () => {
  it("names each listed choice's answer, or its only option, at its place, and null at every other", () => {
    expect(choicesOfPress([P, L, T], { 0: 'p2', 2: 'Trim 2 red' })).toEqual(['p2', 'p1', 'Trim 2 red']);
    expect(choicesOfPress([P, T], { 0: 'p2', 2: 'Trim 2 red' })).toEqual(['p2', null, 'Trim 2 red']);
  });
  it('never names the only option in place of an answer the player gave: that choice is asked again, and no press carries p1 unasked', () => {
    const narrowed: ChoiceView = { ...L, at: 0 };
    const answers = { 0: 'p2', 2: 'Trim 2 red' };
    expect(nextChoice([narrowed, T], answers)).toBe(narrowed);
    expect(choicesOfPress([narrowed, T], answers)).not.toContain('p1');
  });
});

describe('aboutOf', () => {
  it('names the column and the value of the card a choice compares', () => {
    expect(aboutOf('wants', card({ name: 'Statue', mark: 'stone', wants: 'clay' }))).toBe('wants clay');
  });
  it('names nothing for a card without the column, a face-down card, no card or no column', () => {
    expect(aboutOf('wants', card({ name: 'Vase', mark: 'clay' }))).toBeNull();
    expect(aboutOf('wants', { ...card({}), faceUp: false, faceKey: 'back' })).toBeNull();
    expect(aboutOf('wants', undefined)).toBeNull();
    expect(aboutOf(null, card({ name: 'Statue', wants: 'clay' }))).toBeNull();
  });
});

describe('questionOf', () => {
  it("asks the prompt up to its first ': ', or without its final period, with what it is about in brackets", () => {
    expect(questionOf(P, null)).toBe('Pick who to pay the fee to');
    expect(questionOf(P, 'wants clay')).toBe('Pick who to pay the fee to (wants clay)');
    expect(questionOf(T, null)).toBe('Choose one');
    expect(questionOf({ at: 0, prompt: 'Say which.', options: [] }, null)).toBe('Say which');
  });
});
