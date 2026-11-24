import { describe, expect, it } from 'vitest';
import type { ActionView, CardPickView, PickCardView } from '@/engine/core/lang/board-view';
import { initialState } from '@/engine/core/lang/build';
import { compileGame } from '@/engine/core/lang/compile';
import { putOn } from '@/engine/core/lang/attach';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { JINX_GAME } from '@/engine/core/lang/testing';
import { relocate } from '@/engine/core/lang/zones';
import { HIDDEN_FACE_KEY } from '@/engine/core/derive-scene';
import type { CardState } from '@/engine/core/scene';
import { RIVAL_GAME } from '@/engine/core/lang/testing';
import { makeCard } from '@/engine/core/lang/cards';
import { changeCard } from '@/engine/core/lang/card-facts';
import type { GameState } from '@/engine/core/game-state';
import type { CompiledGame } from '@/engine/core/lang/types';
import { PICK_START, clickCard, confirmSet, liveAt, ontoChoices, placesOf, ringsOf, takersOf, type PickAt } from './card-pick';

const NOT_RUBY = 'the target card is not a Ruby';
const PROMPT = 'Pick a card from your stash';
const ONTO_PROMPT = 'Pick where it goes: a card in your case';

/** A Ruby and a Pearl the button takes, and an Opal it refuses with `x`. */
const CARDS: PickCardView[] = [{ id: 'c1', name: 'Ruby', allowed: true }, { id: 'c2', name: 'Opal', allowed: 'x' }, { id: 'c3', name: 'Pearl', allowed: true }];
/** A case of an Opal any card may go to and a Ruby none may. */
const TARGETS: PickCardView[] = [{ id: 'c9', name: 'Opal', allowed: true }, { id: 'c8', name: 'Ruby', allowed: NOT_RUBY }];
const ONE: CardPickView = { some: false, prompt: PROMPT, cards: CARDS, onto: null };
const ONE_ONTO: CardPickView = { ...ONE, onto: { prompt: ONTO_PROMPT, targets: { c1: TARGETS, c3: TARGETS } } };
const SET: CardPickView = { ...ONE, some: true };
/** A set whose Pearl the case's Opal refuses with `y`. */
const SET_ONTO: CardPickView = {
  ...SET, onto: { prompt: ONTO_PROMPT, targets: { c1: TARGETS, c3: [{ ...TARGETS[0], allowed: 'y' }, TARGETS[1]] } },
};

/** The picks after clicking each card in turn from the start, failing if a click does anything but pick. */
const clicked = (pick: CardPickView, ...ids: string[]): PickAt => ids.reduce((at, id) => {
  const outcome = clickCard(pick, at, id);
  if (!('at' in outcome)) throw new Error(`clicking ${id} gave ${JSON.stringify(outcome)}`);
  return outcome.at;
}, PICK_START);

describe('clickCard', () => {
  it('sends one card the button takes, explains one it refuses, and explains any other card with the prompt', () => {
    expect(clickCard(ONE, PICK_START, 'c1')).toEqual({ send: { cardId: 'c1' } });
    expect(clickCard(ONE, PICK_START, 'c2')).toEqual({ refused: 'x' });
    expect(clickCard(ONE, PICK_START, 'zz')).toEqual({ refused: `${PROMPT}.` });
  });

  it('takes one card on to its targets, then sends it to a live one and explains the others', () => {
    const at = clicked(ONE_ONTO, 'c1');
    expect(at).toEqual({ picked: ['c1'], onto: true });
    expect(clickCard(ONE_ONTO, at, 'c9')).toEqual({ send: { cardId: 'c1', onto: 'c9' } });
    expect(clickCard(ONE_ONTO, at, 'c8')).toEqual({ refused: NOT_RUBY });
    expect(clickCard(ONE_ONTO, at, 'c3')).toEqual({ refused: `${ONTO_PROMPT}.` });
  });

  it('toggles the cards of a set, keeping the order clicked', () => {
    expect(clicked(SET, 'c1', 'c3', 'c1')).toEqual({ picked: ['c3'], onto: false });
    expect(clicked(SET, 'c3', 'c1')).toEqual({ picked: ['c3', 'c1'], onto: false });
    expect(clickCard(SET, PICK_START, 'c2')).toEqual({ refused: 'x' });
  });

  it('unpicks a picked card the view now refuses, and only then explains it', () => {
    const at = clicked(SET, 'c1', 'c3');
    const refusing: CardPickView = { ...SET, cards: [{ ...CARDS[0], allowed: 'z' }, CARDS[1], CARDS[2]] };
    const unpicked = clickCard(refusing, at, 'c1');
    expect(unpicked).toEqual({ at: { picked: ['c3'], onto: false } });
    expect(clickCard(refusing, (unpicked as { at: PickAt }).at, 'c1')).toEqual({ refused: 'z' });
  });

  it('goes on to the targets with a confirmed set, where a target any picked card refuses is refused with its verdict', () => {
    const confirmed = confirmSet(SET_ONTO, clicked(SET_ONTO, 'c1', 'c3'));
    expect(confirmed).toEqual({ at: { picked: ['c1', 'c3'], onto: true } });
    const at = (confirmed as { at: PickAt }).at;
    expect(clickCard(SET_ONTO, at, 'c9')).toEqual({ refused: 'y' });
    expect(clickCard(SET_ONTO, at, 'c8')).toEqual({ refused: NOT_RUBY });
    expect(clickCard(SET_ONTO, { picked: ['c1'], onto: true }, 'c9')).toEqual({ send: { cardIds: ['c1'], onto: 'c9' } });
  });

  it('confirms a set and sends it to a target clicked straight after picking it', () => {
    expect(clickCard(SET_ONTO, clicked(SET_ONTO, 'c1'), 'c9')).toEqual({ send: { cardIds: ['c1'], onto: 'c9' } });
    expect(clickCard(SET_ONTO, clicked(SET_ONTO, 'c1', 'c3'), 'c9')).toEqual({ refused: 'y' });
    // With nothing picked a target is just a card the button does not pick.
    expect(clickCard(SET_ONTO, PICK_START, 'c9')).toEqual({ refused: `${PROMPT}.` });
  });

  it('leaves a target that a picked card has no verdict for to the press', () => {
    const missing: CardPickView = { ...SET_ONTO, onto: { prompt: ONTO_PROMPT, targets: { c1: TARGETS, c3: [TARGETS[1]] } } };
    const at: PickAt = { picked: ['c1', 'c3'], onto: true };
    expect(ontoChoices(missing, at)).toEqual(TARGETS);
    expect(clickCard(missing, at, 'c9')).toEqual({ send: { cardIds: ['c1', 'c3'], onto: 'c9' } });
  });

  it('judges a click on the picks still in the view', () => {
    const gone: CardPickView = { ...SET_ONTO, cards: [CARDS[0], CARDS[1]] };
    expect(clickCard(gone, { picked: ['c3', 'c1'], onto: false }, 'c9')).toEqual({ send: { cardIds: ['c1'], onto: 'c9' } });
    expect(clickCard({ ...ONE_ONTO, cards: [CARDS[2]] }, { picked: ['c1'], onto: true }, 'c9')).toEqual({ refused: `${PROMPT}.` });
  });
});

describe('confirmSet', () => {
  it('sends the set picked, or explains with the prompt when nothing is', () => {
    expect(confirmSet(SET, clicked(SET, 'c1', 'c3', 'c1'))).toEqual({ send: { cardIds: ['c3'] } });
    expect(confirmSet(SET, PICK_START)).toEqual({ refused: `${PROMPT}.` });
    expect(confirmSet(SET, { picked: ['c4'], onto: false })).toEqual({ refused: `${PROMPT}.` });
  });
});

describe('liveAt', () => {
  it('keeps the picks still in the view, in order', () => {
    const at: PickAt = { picked: ['c3', 'c1'], onto: false };
    expect(liveAt({ ...SET, cards: [CARDS[0], CARDS[1]] }, at)).toEqual({ picked: ['c1'], onto: false });
    expect(liveAt(SET, at)).toBe(at);
  });

  it('starts from a value no one can change, since every pick that starts over shares it', () => {
    expect([Object.isFrozen(PICK_START), Object.isFrozen(PICK_START.picked)]).toEqual([true, true]);
  });

  it('starts over once every pick is gone, even picking the card they go to', () => {
    expect(liveAt({ ...ONE_ONTO, cards: [CARDS[2]] }, { picked: ['c1'], onto: true })).toBe(PICK_START);
    expect(liveAt(SET, PICK_START)).toBe(PICK_START);
  });
});

describe('ringsOf', () => {
  it('rings the live cards to pick, then the picked cards and what is left to pick, then the live targets', () => {
    expect(ringsOf(SET, PICK_START)).toEqual({ c1: 'choice', c3: 'choice' });
    expect(ringsOf(SET, clicked(SET, 'c1'))).toEqual({ c1: 'chosen', c3: 'choice' });
    expect(ringsOf(ONE_ONTO, clicked(ONE_ONTO, 'c1'))).toEqual({ c1: 'chosen', c9: 'choice' });
  });

  it('rings no card that has left the view', () => {
    expect(ringsOf({ ...SET, cards: [CARDS[0], CARDS[1]] }, { picked: ['c3'], onto: false })).toEqual({ c1: 'choice' });
  });
});

describe('takersOf', () => {
  const plain: ActionView = { move: 'stop', label: 'Stop', allowed: true, target: null, amount: false, players: null };
  const sell: ActionView = { ...plain, move: 'sell', label: 'Sell a card in your stash', cards: ONE };
  const show: ActionView = { ...plain, move: 'show', label: 'Show a card', cards: { ...ONE, cards: [{ ...CARDS[0], allowed: 'x' }] } };

  it('lists the buttons that may pick the card, in order, each with its verdict for the card', () => {
    expect(takersOf([plain, sell, show], 'c1')).toEqual([
      { move: 'sell', label: 'Sell a card in your stash', allowed: true },
      { move: 'show', label: 'Show a card', allowed: 'x' },
    ]);
    expect(takersOf([plain, sell, show], 'zz')).toEqual([]);
  });
});

describe('placesOf', () => {
  const lib = createDefaultLibrary();
  const jinx = compileGame(JINX_GAME, lib).game!;
  /**
   * Three players: p1's workshop holds a Vase with a Potter on it, p2's a Statue, p0's a Vase, p1's stash the other Statue, and the hall
   * its hands. CREW_GAME's Setup deals 2 jobs to each stash, more than its 4 jobs at a table of three, so the table is arranged with no
   * Setup (as 6-1's tests do).
   */
  const arranged = () => {
    let state = initialState(jinx, 1);
    const [vase1, vase0] = state.cards.filter((c) => c.data?.name === 'Vase').map((c) => c.id);
    const [statue, stashed] = state.cards.filter((c) => c.data?.name === 'Statue').map((c) => c.id);
    const potter = state.cards.find((c) => c.data?.name === 'Potter')!.id;
    state = relocate(state, [vase1], 'workshop-p1', jinx);
    state = relocate(state, [statue], 'workshop-p2', jinx);
    state = relocate(state, [vase0], 'workshop-p0', jinx);
    state = relocate(state, [stashed], 'stash-p1', jinx);
    return { state: putOn(state, [potter], 'crew-p1', vase1, jinx), vase1, vase0, statue, potter };
  };

  it("names where each card in another seat's own zone is, and nothing for the seat's own zones or a shared zone's", () => {
    const { state, vase1, vase0, statue, potter } = arranged();
    const places = placesOf(jinx, state.cards, 'p0');
    expect([places[vase1], places[potter], places[statue]]).toEqual(["p1's workshop", "p1's crew", "p2's workshop"]);
    expect(places[vase0]).toBeUndefined();
    const hall = state.cards.filter((c) => c.zoneId === 'hall');
    expect(hall.length).toBeGreaterThan(0);
    for (const card of hall) expect(places[card.id], card.id).toBeUndefined();
  });

  it('Review Focus: names a face-down card by its place, never by what it is', () => {
    const { state } = arranged();
    const card = state.cards.find((c) => c.zoneId === 'stash-p1')!;
    const hidden: CardState = { ...card, faceUp: false, faceKey: HIDDEN_FACE_KEY, data: {} };
    expect(placesOf(jinx, [hidden], 'p0')).toEqual({ [hidden.id]: "p1's stash" });
  });

  /** p1's workshop holds a Vase and a Statue, and p1's crew two Potters, one on each (or both on the Vase); a Vase is also in p2's workshop. */
  const twoPotters = (bothOnVase = false) => {
    let state = initialState(jinx, 1);
    const [vaseA, vaseB] = state.cards.filter((c) => c.data?.name === 'Vase').map((c) => c.id);
    const statue = state.cards.find((c) => c.data?.name === 'Statue')!.id;
    const [potterA, potterB] = state.cards.filter((c) => c.data?.name === 'Potter').map((c) => c.id);
    state = relocate(state, [vaseA, statue], 'workshop-p1', jinx);
    state = relocate(state, [vaseB], 'workshop-p2', jinx);
    state = putOn(state, [potterA], 'crew-p1', vaseA, jinx);
    state = putOn(state, [potterB], 'crew-p1', bothOnVase ? vaseA : statue, jinx);
    return { state, vaseA, vaseB, statue, potterA, potterB };
  };

  it('tells two cards of one name in one place apart by the card each sits on, leaving cards that read apart alone', () => {
    const { state, vaseA, vaseB, statue, potterA, potterB } = twoPotters();
    const places = placesOf(jinx, state.cards, 'p0');
    expect([places[potterA], places[potterB]]).toEqual(["p1's crew, on Vase", "p1's crew, on Statue"]);
    expect([places[vaseA], places[vaseB], places[statue]]).toEqual(["p1's workshop", "p2's workshop", "p1's workshop"]);
  });

  it('tells cards on the same card apart by their labels, and leaves alike those with none', () => {
    const { state, potterA, potterB } = twoPotters(true);
    expect(placesOf(jinx, state.cards, 'p0', { [potterA]: 'tired', [potterB]: '1 dent' })).toMatchObject({
      [potterA]: "p1's crew, on Vase, tired", [potterB]: "p1's crew, on Vase, 1 dent",
    });
    expect(placesOf(jinx, state.cards, 'p0', { [potterA]: 'tired' })).toMatchObject({
      [potterA]: "p1's crew, on Vase, tired", [potterB]: "p1's crew, on Vase",
    });
    expect(placesOf(jinx, state.cards, 'p0')).toMatchObject({ [potterA]: "p1's crew, on Vase", [potterB]: "p1's crew, on Vase" });
  });

  it('Review Focus: never names a face-down holder, and a face-down card keeps its place alone', () => {
    const { state, statue, potterA, potterB } = twoPotters();
    const cards = state.cards.map((c) => (c.id === statue ? { ...c, faceUp: false, faceKey: HIDDEN_FACE_KEY, data: { ...c.data, name: undefined } } : c));
    const places = placesOf(jinx, cards, 'p0');
    expect([places[potterA], places[potterB]]).toEqual(["p1's crew, on Vase", "p1's crew"]);
    const hiddenPotter = cards.map((c) => (c.id === potterA ? { ...c, faceUp: false, faceKey: HIDDEN_FACE_KEY, data: {} } : c));
    expect(placesOf(jinx, hiddenPotter, 'p0')[potterA]).toBe("p1's crew");
    expect(placesOf(jinx, hiddenPotter, 'p0')[potterB]).toBe("p1's crew");
  });
});

describe("placesOf, for a card on another player's card", () => {
  const rival = compileGame(RIVAL_GAME, createDefaultLibrary()).game!;
  const stake = (s: GameState, g: CompiledGame, zoneId: string, by: string) => makeCard(s, g, { name: 'Stake', maker: by }, zoneId)!;
  const idOf = (s: GameState, name: string) => s.cards.find((c) => c.data?.name === name)!.id;
  let s = initialState(rival, 1);
  const vaseId = idOf(s, 'Vase');
  s = putOn(relocate(s, [vaseId], 'workshop-p0', rival), [s.cards.find((c) => c.data?.name === 'Potter' && c.zoneId === 'hall')!.id], 'crew-p0', vaseId, rival);
  const one = stake(s, rival, 'holdings-p1', 'p0');
  s = changeCard(putOn(one.state, [one.id], 'holdings-p1', vaseId, rival), one.id, { lit: true }, rival);
  const two = stake(s, rival, 'holdings-p2', 'p0');
  s = putOn(two.state, [two.id], 'holdings-p2', vaseId, rival);
  const loose = stake(s, rival, 'holdings-p1', 'p2');
  const second = stake(loose.state, rival, 'holdings-p1', 'p0');
  const cards = second.state.cards;

  it('gives the place of a placed card in the viewer\'s own zone as where it sits, and none to the others', () => {
    const places = placesOf(rival, cards, 'p1');
    expect(places[one.id]).toBe("on Vase in p0's workshop");
    expect(places[loose.id]).toBeUndefined();
    expect(places[second.id]).toBeUndefined();
  });
  it('(amendment) names the card two of them sit on once, and tells them apart by their labels', () => {
    const both = putOn(second.state, [second.id], 'holdings-p1', vaseId, rival);
    const labels = { [one.id]: 'lit' };
    expect(placesOf(rival, both.cards, 'p1', labels)).toMatchObject({ [one.id]: "on Vase in p0's workshop, lit", [second.id]: "on Vase in p0's workshop" });
    expect(placesOf(rival, both.cards, 'p0', labels)).toMatchObject({
      [one.id]: "p1's holdings, on Vase in p0's workshop, lit", [second.id]: "p1's holdings, on Vase in p0's workshop",
    });
  });
  it("adds where it sits to the place of a placed card in another seat's zone (Review Focus)", () => {
    const places = placesOf(rival, cards, 'p0');
    expect(places[one.id]).toBe("p1's holdings, on Vase in p0's workshop");
    expect(places[loose.id]).toBe("p1's holdings");
    expect(places[second.id]).toBe("p1's holdings");
  });
});
