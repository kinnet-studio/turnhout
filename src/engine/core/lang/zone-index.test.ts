import { beforeAll, describe, expect, it } from 'vitest';
import STARTUP_SIMULATOR from '@/games/startup-simulator.rules?raw';
import { cardById as gameCardById, zoneCards as gameZoneCards, type GameState } from '../game-state';
import type { Move } from '../moves';
import type { CardState } from '../scene';
import { attachmentProblem, putOn } from './attach';
import { createEngine, initialState } from './build';
import { tableColumns } from './card-facts';
import { compileGame } from './compile';
import { seatExtras, type ActionView, type PickCardView } from './board-view';
import { createDefaultLibrary } from './library';
import { CREW_GAME, TEST_DUEL } from './testing';
import { cardById, zoneCards } from './zone-index';
import { HOLDER_KEY, relocate, slug, slugsKnown } from './zones';

const lib = createDefaultLibrary();
const startup = compileGame(STARTUP_SIMULATOR, lib).game!;
const crew = compileGame(CREW_GAME, lib).game!;

/** The first card a button offers that it allows, with the first of that card's targets it allows when the button puts cards on a card. */
function pressOf(action: ActionView, by: string): Move | null {
  const first = (cards: PickCardView[] | undefined) => cards?.find((card) => card.allowed === true);
  const answers = (card: { choices?: { at: number; options: { value: string; allowed: true | string }[] }[] } | undefined): { choices?: (string | null)[] } => {
    const asked = card?.choices ?? [];
    if (asked.length === 0) return {};
    const choices: (string | null)[] = Array.from({ length: Math.max(...asked.map(({ at }) => at)) + 1 }, () => null);
    for (const { at, options } of asked) choices[at] = options.find(({ allowed }) => allowed === true)?.value ?? options[0].value;
    return { choices };
  };
  if (action.cards === undefined) return { type: action.move, by, ...answers(action) };
  const card = first(action.cards.cards);
  if (card === undefined) return null;
  const one: { cardIds?: string[]; cardId?: string } = action.cards.some ? { cardIds: [card.id] } : { cardId: card.id };
  if (action.cards.onto === null) return { type: action.move, by, ...one, ...answers(card) };
  const target = first(action.cards.onto.targets[card.id]);
  return target === undefined ? null : { type: action.move, by, ...one, onto: target.id, ...answers(target) };
}

/**
 * Every state of a Startup game of three at seed 1, from Setup on: each step presses, for the seat whose turn it is, the next button
 * the page's view of the seat allows (the one after the last step's, so that the game goes through its phases), until no button works,
 * the game ends or `moves` moves are made.
 */
function startupRun(moves: number): GameState[] {
  const { engine, runtime } = createEngine(startup, lib, 3, initialState(startup, 1));
  const states: GameState[] = [engine.getState()];
  for (let step = 0; step < moves && engine.getState().result === undefined; step++) {
    const state = engine.getState();
    const by = state.turn!.current;
    const presses = seatExtras(engine, runtime, state, by).actions
      .filter((action) => action.allowed === true)
      .map((action) => pressOf(action, by))
      .filter((move): move is Move => move !== null);
    const accepted = presses.map((_, i) => presses[(i + step) % presses.length]).find((move) => engine.canDispatch(move) === true);
    if (accepted === undefined) break;
    expect(engine.dispatch(accepted).ok).toBe(true);
    states.push(engine.getState());
  }
  return states;
}

const zoneIdsIn = (state: GameState) => [...new Set(state.cards.map((card) => card.zoneId)), 'no-such-zone'];

/** The same cards in the same order: each one the very card, not a copy. */
const sameCards = (got: CardState[], want: CardState[]) => got.length === want.length && got.every((card, i) => card === want[i]);

describe('the zone index', () => {
  let run: GameState[];
  beforeAll(() => {
    run = startupRun(400);
  });

  it('is run on a long game: the cards move through many states and many zones', () => {
    expect(run.length).toBeGreaterThan(100);
    expect(new Set(run.map((state) => state.cards)).size).toBeGreaterThan(50);
    expect(new Set(run.flatMap(zoneIdsIn)).size).toBeGreaterThan(20);
  });

  it('gives the cards of every zone, in every state of a Startup game, as game-state does', () => {
    for (const [at, state] of run.entries()) {
      for (const zoneId of zoneIdsIn(state)) {
        const got = zoneCards(state, zoneId);
        const want = gameZoneCards(state, zoneId);
        if (!sameCards(got, want)) expect(got, `${zoneId} in state ${at}`).toEqual(want);
      }
    }
  });

  it('finds every card of every state by its id, and no card for an id nothing has, as game-state does', () => {
    for (const [at, state] of run.entries()) {
      for (const { id } of state.cards) {
        if (cardById(state, id) !== gameCardById(state, id)) expect(cardById(state, id), `${id} in state ${at}`).toBe(gameCardById(state, id));
      }
      expect(cardById(state, 'no-such-card')).toBeUndefined();
    }
  });

  it('keeps the first card with an id, as find does, and the slot order of a zone with slots', () => {
    const [first, second, third] = run[0].cards;
    const twin: CardState = { ...second, id: first.id, zoneId: third.zoneId };
    const state: GameState = { ...run[0], cards: [first, twin, third] };
    expect(cardById(state, first.id)).toBe(first);
    expect(cardById(state, first.id)).toBe(gameCardById(state, first.id));
    const slotted: GameState = {
      ...run[0], cards: [{ ...first, zoneId: 'z', slot: 2 }, { ...second, zoneId: 'z', slot: 0 }, { ...third, zoneId: 'z', slot: undefined }],
    };
    expect(zoneCards(slotted, 'z').map((card) => card.id)).toEqual(gameZoneCards(slotted, 'z').map((card) => card.id));
    expect(zoneCards(slotted, 'z').map((card) => card.id)).toEqual([second.id, first.id, third.id]);
  });

  it('gives each call its own array: changing one does not change the next call', () => {
    const state = run[run.length - 1];
    const zoneId = zoneIdsIn(state).find((id) => zoneCards(state, id).length > 1)!;
    const before = gameZoneCards(state, zoneId);
    const got = zoneCards(state, zoneId);
    got.reverse();
    got.push(got[0]);
    got.length = 1;
    expect(zoneCards(state, zoneId)).toEqual(before);
    expect(sameCards(zoneCards(state, zoneId), before)).toBe(true);
    expect(zoneCards(state, zoneId)).not.toBe(zoneCards(state, zoneId));
    const none = zoneCards(state, 'no-such-zone');
    none.push(state.cards[0]);
    expect(zoneCards(state, 'no-such-zone')).toEqual([]);
  });

  it('answers the same for two states built on one cards array', () => {
    const state = run[run.length - 1];
    const sibling: GameState = { ...state, data: { ...state.data, other: 1 }, turn: { current: 'p2', phase: 'elsewhere' } };
    expect(sibling.cards).toBe(state.cards);
    for (const zoneId of zoneIdsIn(state)) expect(sameCards(zoneCards(sibling, zoneId), zoneCards(state, zoneId))).toBe(true);
    for (const { id } of state.cards) expect(cardById(sibling, id)).toBe(cardById(state, id));
  });

  it('answers for the cards of a new array, though an older one is kept: a state is not looked up by its other fields', () => {
    const state = run[run.length - 1];
    const moved = relocate(state, [state.cards[0].id], 'box', startup);
    expect(moved.cards).not.toBe(state.cards);
    expect(sameCards(zoneCards(moved, 'box'), gameZoneCards(moved, 'box'))).toBe(true);
    expect(sameCards(zoneCards(state, 'box'), gameZoneCards(state, 'box'))).toBe(true);
    expect(zoneCards(moved, 'box')).not.toEqual(zoneCards(state, 'box'));
  });

  it('reads a cards array once, however many zones and cards are asked of it', () => {
    const cards = run[run.length - 1].cards;
    let reads = 0;
    const counted: CardState[] = new Proxy([...cards], {
      get(target, key, receiver) {
        reads += 1;
        return Reflect.get(target, key, receiver);
      },
    });
    const state: GameState = { ...run[run.length - 1], cards: counted };
    zoneCards(state, 'agency-row');
    cardById(state, cards[0].id);
    expect(reads).toBeGreaterThan(0);
    const after = reads;
    for (const zoneId of zoneIdsIn(run[run.length - 1])) zoneCards(state, zoneId);
    for (const card of cards) cardById(state, card.id);
    expect(reads).toBe(after);
  });
});

describe('the memos beside it', () => {
  it('tableColumns gives the same columns every time, each time in an array of its own', () => {
    const columns = tableColumns(startup);
    expect(columns).toEqual([...new Set(columns)]);
    expect(columns).toContain('name');
    columns.push('changed');
    columns.reverse();
    const again = tableColumns(startup);
    expect(again).not.toContain('changed');
    expect(again).not.toBe(tableColumns(startup));
    expect(again).toEqual(tableColumns(startup));
    expect(tableColumns(crew)).toEqual(['name', 'red need', 'gold need', 'pay', 'worth', 'craft', 'skill', 'wage']);
  });

  it('slug makes the same slug every time, and forgets its names once it holds 1000', () => {
    expect(slug("Bob's  Pass Pile")).toBe('bobs-pass-pile');
    expect(slug("Bob's  Pass Pile")).toBe('bobs-pass-pile');
    const sizes: number[] = [];
    for (let i = 0; i < 2500; i++) {
      expect(slug(`Zone Number ${i}`)).toBe(`zone-number-${i}`);
      sizes.push(slugsKnown());
    }
    // The names other tests made are in it too, so where it starts over is not fixed, but it holds 1000 and then starts over with the one name.
    expect(Math.max(...sizes)).toBe(1000);
    expect(sizes.some((size, i) => i > 0 && sizes[i - 1] === 1000 && size === 1)).toBe(true);
    expect(slug("Bob's  Pass Pile")).toBe('bobs-pass-pile');
    expect(slug('')).toBe('');
  });

  describe('attachmentProblem', () => {
    const start = initialState(crew, 1);
    const vase = start.cards.find((card) => card.data?.name === 'Vase')!.id;
    const [potter1, potter2] = gameZoneCards(start, 'hall').filter((card) => card.data?.name === 'Potter').map((card) => card.id);
    const atWork = relocate(start, [vase], 'workshop-p0', crew);
    const whole = putOn(atWork, [potter1, potter2], 'crew-p0', vase, crew);
    /** The crew left on a Vase that has gone to the scrap. */
    const left = relocate(whole, [vase], 'scrap', crew);
    const forge = (state: GameState, id: string, holder: string): GameState =>
      ({ ...state, cards: state.cards.map((card) => (card.id === id ? { ...card, data: { ...card.data, [HOLDER_KEY]: holder } } : card)) });

    it('says the same for the same game and cards, whatever else the state holds', () => {
      expect(attachmentProblem(crew, whole)).toBeNull();
      expect(attachmentProblem(crew, whole)).toBeNull();
      expect(attachmentProblem(crew, { ...whole, data: { ...whole.data, other: 1 } })).toBeNull();
      const problem = attachmentProblem(crew, left);
      expect(problem).toBe("The Potter in p0's crew is on the Vase, which is now in the scrap. Move the cards on a card along with it.");
      expect(attachmentProblem(crew, left)).toBe(problem);
      expect(attachmentProblem(crew, { ...left, turn: { current: 'p1', phase: 'working' } })).toBe(problem);
    });

    it('works it out again for a new cards array, whether it was whole or not', () => {
      expect(attachmentProblem(crew, whole)).toBeNull();
      expect(attachmentProblem(crew, left)).not.toBeNull();
      expect(attachmentProblem(crew, relocate(left, [vase], 'workshop-p0', crew))).toBeNull();
      const lost = forge(whole, potter1, 'c9999');
      expect(lost.cards).not.toBe(whole.cards);
      expect(attachmentProblem(crew, lost)).toBe("The Potter in p0's crew is on a card that is no longer on the table.");
      expect(attachmentProblem(crew, whole)).toBeNull();
    });

    it('keeps one answer for each game: the same cards are judged by the game that is asked', () => {
      const duel = compileGame(TEST_DUEL, lib).game!;
      const problem = attachmentProblem(crew, left);
      expect(problem).not.toBeNull();
      expect(attachmentProblem(duel, left)).toBeNull();
      expect(attachmentProblem(crew, left)).toBe(problem);
      expect(attachmentProblem(duel, left)).toBeNull();
      const other = compileGame(CREW_GAME, lib).game!;
      expect(other).not.toBe(crew);
      expect(attachmentProblem(other, left)).toBe(problem);
      expect(attachmentProblem(startup, start)).toBeNull();
    });

    it('does not read the cards again for the same game and cards', () => {
      let reads = 0;
      const counted: CardState[] = new Proxy([...left.cards], {
        get(target, key, receiver) {
          reads += 1;
          return Reflect.get(target, key, receiver);
        },
      });
      const state: GameState = { ...left, cards: counted };
      const problem = attachmentProblem(crew, state);
      expect(problem).not.toBeNull();
      expect(reads).toBeGreaterThan(0);
      const after = reads;
      expect(attachmentProblem(crew, state)).toBe(problem);
      expect(attachmentProblem(crew, { ...state, data: {} })).toBe(problem);
      expect(reads).toBe(after);
    });
  });
});
