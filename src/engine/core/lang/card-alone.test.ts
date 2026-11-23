import { describe, expect, it, vi } from 'vitest';
import STARTUP_SIMULATOR from '@/games/startup-simulator.rules?raw';
import type { GameState } from '../game-state';
import type { Move } from '../moves';
import { cardsOn, putOn } from './attach';
import { seatExtras, type ActionView, type PickCardView } from './board-view';
import { createEngine, initialState } from './build';
import { changeCard } from './card-facts';
import { cardAloneValues, testedBy } from './card-alone';
import { registerCardNumberPhrases } from './library/card-number-phrases';
import { registerCardSubjectPhrases } from './library/card-subject-phrases';
import { registerCardValuePhrases } from './library/card-value-phrases';
import { PhraseLibrary, STATIC_TYPES } from './phrases';
import { VOCAB_TYPES } from './refs';
import { compileGame } from './compile';
import { createDefaultLibrary } from './library';
import { LangRuntime } from './runtime';
import { WORKED_GAME } from './testing';
import type { CompiledGame } from './types';
import { relocate } from './zones';

const lib = createDefaultLibrary();

function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  expect(diagnostics).toEqual([]);
  return game!;
}

/** WORKED_GAME with values of every kind of reading: a card's own, another value of its own, its crew, its holder, a looping one. */
const SECTIONS = [
  'Sturdy:', "  A card's sturdy is its skill.", '',
  'Skilled:', '  Only if its skill is more than 0.', '',
  'Handy:', '  Only if it is skilled.', '',
  'Potterish:', '  Only if it is a Potter card.', '',
  'Crew skill:', "  A card's crew skill is the total skill of the cards on it.", '',
  'Crowned:', '  Only if some card on it is skilled.', '',
  'Carried:', '  Only if the card it is on is a Vase card.', '',
  'Crowd:', '  Only if it is crowned.', '',
  'Hall mate:', '  Only if its sturdy is more than 0.', '  Only if some player has a card in their stash whose name is Vase.', '',
  'Owned:', '  Only if its owner has a card in their stash that is tired.', '',
  'Fee paid:', '  Only if the fee is more than 1.', '',
  'Crafty:', '  Only if its craft is more than 0.', '',
  'Whose same:', '  Only if it is a card whose skill is its wage.', '',
  'Whose above:', '  Only if it is a card whose skill is more than 0.', '',
  'Looping:', '  Only if it is a Vase card.', '  Only if it is not looping.', '',
  'Ping:', '  Only if it is a Vase card.', '  Only if it is not pong.', '',
  'Pong:', '  Only if it is not ping.',
].join('\n');
const GAME_TEXT = [WORKED_GAME.replace('  Players pay with coins.', '  Players pay with coins.\n  The game has a fee of 2.'), '', SECTIONS].join('\n');
const game = compiled(GAME_TEXT);

/** The condition and value phrases of the three libraries the classifier draws on, which it trusts to read nothing but the card. */
const TRUSTED = [
  'condition: it is a card whose {cardfilter}', 'condition: it is in a {perzone}', 'condition: it is in an {perzone}',
  'condition: it is not a card whose {cardfilter}', 'condition: it is not {cardclass}', 'condition: it is not {cardflag}',
  'condition: it is {cardclass}', 'condition: its {attribute} are at least its {attribute}', 'condition: its {attribute} are more than {int}',
  'condition: its {attribute} are {int}', 'condition: its {attribute} is at least its {attribute}', 'condition: its {attribute} is more than {int}',
  'condition: its {attribute} is {int}', 'condition: no card on it is {cardflag}', 'condition: some card on it is {cardflag}',
  "value: a card's {attribute} goes down by its {attribute}", "value: a card's {attribute} goes up by its {attribute}",
  "value: a card's {attribute} goes up by its {attribute} times its {attribute}", "value: a card's {attribute} goes up by {int} for each {attribute}",
  "value: a card's {attribute} is at least {int}", "value: a card's {attribute} is its {attribute}", "value: a card's {attribute} is {int}",
  "value: a {cardflag} card's {attribute} goes down by {int}", "value: a {cardflag} card's {attribute} goes up by its {attribute}",
  "value: a {cardflag} card's {attribute} goes up by {int}", "value: a {cardflag} card's {attribute} is its {attribute}",
  "value: a {cardflag} card's {attribute} is {int}", "value: an {cardflag} card's {attribute} goes down by {int}",
  "value: an {cardflag} card's {attribute} goes up by its {attribute}", "value: an {cardflag} card's {attribute} goes up by {int}",
  "value: an {cardflag} card's {attribute} is its {attribute}", "value: an {cardflag} card's {attribute} is {int}",
  "value: {cardclass}'s {attribute} is its {attribute}", "value: {cardclass}'s {attribute} is {int}",
];

describe('the phrases the classifier draws on', () => {
  it('are these: a phrase added to one of the three libraries must be checked for what it reads before it is listed here', () => {
    const library = registerCardNumberPhrases(registerCardValuePhrases(registerCardSubjectPhrases(
      new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES]),
    ))) as unknown as { entries: Map<string, Map<string, unknown>> };
    const found = [...library.entries].filter(([kind]) => kind === 'condition' || kind === 'value')
      .flatMap(([kind, phrases]) => [...phrases.keys()].map((phrase) => `${kind}: ${phrase}`));
    expect(found.sort()).toEqual([...TRUSTED].sort());
  });
});

describe('which values read their card alone', () => {
  const alone = cardAloneValues(game);

  it('counts a number that reads its own number and a flag that reads its own kind', () => {
    expect(alone.has('sturdy')).toBe(true);
    expect(alone.has('potterish')).toBe(true);
    expect(alone.has('skilled')).toBe(true);
  });

  it('counts a value that reads only values that read their card alone', () => {
    expect(alone.has('handy')).toBe(true);
  });

  it('does not count a value that reads the cards on it', () => {
    expect(alone.has('crew skill')).toBe(false);
    expect(alone.has('crowned')).toBe(false);
  });

  it('does not count a value that reads the card it sits on', () => {
    expect(alone.has('carried')).toBe(false);
  });

  it('does not count a value that reads another zone, another player, its owner or a game number', () => {
    expect(alone.has('hall mate')).toBe(false);
    expect(alone.has('owned')).toBe(false);
    expect(alone.has('fee paid')).toBe(false);
  });

  it('counts a test of the card against its own number or a figure, and not one against the card a press moves', () => {
    expect(alone.has('whose same')).toBe(true);
    expect(alone.has('whose above')).toBe(true);
    expect(testedBy({ attribute: 'skill', sameAs: { of: 'the card', attribute: 'wage' } })).toBeNull();
    expect(testedBy({ attribute: 'skill', sameAs: { of: 'it', attribute: 'wage' } })).toEqual(['skill', 'wage']);
    expect(testedBy({ attribute: 'skill', above: 1 })).toEqual(['skill']);
    expect(testedBy({ attribute: 'skill', is: 1 })).toEqual(['skill']);
    expect(testedBy({ flag: 'tired', wanted: true })).toEqual(['tired']);
    // A kind of test this file does not know is not trusted.
    expect(testedBy({ attribute: 'skill', between: [1, 2] } as never)).toBeNull();
  });

  it('does not count a value that reads a value that does not count', () => {
    expect(alone.has('crowd')).toBe(false);
  });

  it('is the same set every time, kept for the game', () => {
    expect(cardAloneValues(game)).toBe(alone);
  });
});

/** The game at seed 1 with a Vase in p0's workshop holding a Potter, and the ids of the cards it uses. */
function arranged(g: CompiledGame) {
  const start = createEngine(g, lib, 2, initialState(g, 1)).engine.getState();
  const named = (name: string) => start.cards.filter((card) => card.data?.name === name).map((card) => card.id);
  const [[vase], [statue], [potter, other]] = ['Vase', 'Statue', 'Potter'].map(named);
  let state = relocate(start, [vase, statue], 'workshop-p0', g);
  state = putOn(state, [potter], 'crew-p0', vase, g);
  return { state, vase, statue, potter, other, runtime: createEngine(g, lib, 2, state).runtime };
}

describe('a runtime keeping the values that read their card alone', () => {
  it('works a value out once for a card that is in two states', () => {
    const { state, potter, other, runtime } = arranged(game);
    const call = vi.spyOn(runtime as unknown as { call: (...args: unknown[]) => unknown }, 'call');
    expect(runtime.workedValue(state, potter, 'sturdy')).toBe(1);
    expect(runtime.workedFlag(state, potter, 'skilled')).toBe(true);
    expect(runtime.workedFlag(state, potter, 'handy')).toBe(true);
    const calls = call.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    // Another card moves: a new state, the same Potter object.
    const later = relocate(state, [other], 'idle-p0', game);
    expect(later).not.toBe(state);
    expect(later.cards.find((card) => card.id === potter)).toBe(state.cards.find((card) => card.id === potter));
    expect(runtime.workedValue(later, potter, 'sturdy')).toBe(1);
    expect(runtime.workedFlag(later, potter, 'skilled')).toBe(true);
    expect(runtime.workedFlag(later, potter, 'handy')).toBe(true);
    expect(call.mock.calls.length).toBe(calls);
  });

  it('works a value that reads the cards on it out afresh in each state', () => {
    const { state, vase, potter, other, runtime } = arranged(game);
    expect(runtime.workedValue(state, vase, 'crew skill')).toBe(1);
    expect(runtime.workedFlag(state, vase, 'crowned')).toBe(true);
    const more = putOn(state, [other], 'crew-p0', vase, game);
    expect(runtime.workedValue(more, vase, 'crew skill')).toBe(2);
    const fewer = relocate(state, [potter], 'idle-p0', game);
    expect(runtime.workedValue(fewer, vase, 'crew skill')).toBe(0);
    expect(runtime.workedFlag(fewer, vase, 'crowned')).toBe(false);
  });

  it('works a value that reads the card it sits on out afresh when that card changes and this one does not', () => {
    const { state, vase, potter, runtime } = arranged(game);
    expect(runtime.workedFlag(state, potter, 'carried')).toBe(true);
    const renamed = changeCard(state, vase, { name: 'Statue' }, game);
    expect(renamed.cards.find((card) => card.id === potter)).toBe(state.cards.find((card) => card.id === potter));
    expect(runtime.workedFlag(renamed, potter, 'carried')).toBe(false);
    expect(runtime.workedFlag(state, potter, 'carried')).toBe(true);
  });

  it('gives each of two runtimes over one state the values of its own game', () => {
    const other = compiled(GAME_TEXT.replace("A card's sturdy is its skill.", "A card's sturdy is 7.").replace(
      'Only if its skill is more than 0.', 'Only if its skill is more than 5.',
    ));
    const { state, potter } = arranged(game);
    const first = new LangRuntime(game, lib, ['p0', 'p1']);
    const second = new LangRuntime(other, lib, ['p0', 'p1']);
    expect([first.workedValue(state, potter, 'sturdy'), first.workedFlag(state, potter, 'skilled')]).toEqual([1, true]);
    expect([second.workedValue(state, potter, 'sturdy'), second.workedFlag(state, potter, 'skilled')]).toEqual([7, false]);
    expect([first.workedValue(state, potter, 'sturdy'), first.workedFlag(state, potter, 'skilled')]).toEqual([1, true]);
    expect(cardAloneValues(other)).not.toBe(cardAloneValues(game));
  });

  it('throws every time for a value worked out from itself', () => {
    const { state, vase, runtime } = arranged(game);
    for (let i = 0; i < 3; i++) {
      expect(() => runtime.workedFlag(state, vase, 'looping')).toThrow('“looping” is worked out from itself.');
    }
  });

  it('throws every time for two values worked out from each other, from either', () => {
    const { state, vase, runtime } = arranged(game);
    for (let i = 0; i < 2; i++) {
      expect(() => runtime.workedFlag(state, vase, 'ping')).toThrow('is worked out from itself.');
      expect(() => runtime.workedFlag(state, vase, 'pong')).toThrow('is worked out from itself.');
    }
  });

  it('throws every time for a value whose line throws of itself', () => {
    const { state, potter, runtime } = arranged(game);
    const first = outcome(() => runtime.workedFlag(state, potter, 'crafty'));
    expect(first).toEqual({ threw: expect.stringContaining("isn't a number") });
    expect(outcome(() => runtime.workedFlag(state, potter, 'crafty'))).toEqual(first);
  });

  it('keeps nothing of a value whose line threw, and works the card out afresh for a card it does not throw at', () => {
    const { state, vase, potter, runtime } = arranged(game);
    expect(() => runtime.workedFlag(state, vase, 'looping')).toThrow();
    // A Potter is not a Vase, so the same value stops at its first line there.
    expect(runtime.workedFlag(state, potter, 'looping')).toBe(false);
    expect(() => runtime.workedFlag(state, vase, 'looping')).toThrow();
  });
});

// ---- a played game ----------------------------------------------------------------------------------

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

const outcome = (work: () => unknown): { value: unknown } | { threw: string } => {
  try {
    return { value: work() };
  } catch (error) {
    return { threw: (error as Error).message };
  }
};

describe('a kept value against a fresh one, in a played game', () => {
  it('is the value a runtime made for that state alone works out, for every card and every such value', () => {
    const startup = compileGame(STARTUP_SIMULATOR, lib).game!;
    const names = [...cardAloneValues(startup)];
    expect(names.length).toBeGreaterThan(20);
    const { engine, runtime } = createEngine(startup, lib, 2, initialState(startup, 1));
    const sample = (state: GameState, at: number): number => {
      const fresh = new LangRuntime(startup, lib, runtime.seats);
      let checked = 0;
      for (const card of state.cards) {
        for (const name of names) {
          const read = (rt: LangRuntime) => outcome(() => (startup.worked![name].kind === 'number'
            ? rt.workedValue(state, card.id, name) : rt.workedFlag(state, card.id, name)));
          expect(read(runtime), `${card.id} ${name} at step ${at}`).toEqual(read(fresh));
          checked++;
        }
      }
      return checked;
    };
    const every = Object.keys(startup.worked!);
    const readAll = (state: GameState) => {
      for (const card of state.cards) {
        for (const name of every) outcome(() => (startup.worked![name].kind === 'number' ? runtime.workedValue(state, card.id, name) : runtime.workedFlag(state, card.id, name)));
      }
    };
    readAll(engine.getState());
    let checked = sample(engine.getState(), 0);
    let sampled = 1;
    let stacked = 0;
    for (let step = 0; step < 140 && engine.getState().result === undefined; step++) {
      const state = engine.getState();
      const by = state.turn!.current;
      const presses = seatExtras(engine, runtime, state, by).actions
        .filter((action) => action.allowed === true)
        .map((action) => pressOf(action, by))
        .filter((move): move is Move => move !== null);
      // Presses that put cards on cards come first, so that the states hold cards on cards.
      const ordered = [...presses.filter((move) => 'onto' in move), ...presses.filter((move) => !('onto' in move))];
      const pool = ordered.filter((move) => 'onto' in move).length || ordered.length;
      const accepted = ordered.map((_, i) => ordered[(i + step) % pool]).find((move) => engine.canDispatch(move) === true);
      if (accepted === undefined) break;
      expect(engine.dispatch(accepted).ok).toBe(true);
      // The long-lived runtime reads every worked value of every card as the game goes, as the page would, so that it holds what it can keep.
      if ((step + 1) % 10 === 0) readAll(engine.getState());
      if ((step + 1) % 20 === 0) {
        stacked += engine.getState().cards.filter((card) => cardsOn(engine.getState(), card.id).length > 0).length;
        checked += sample(engine.getState(), step + 1);
        sampled++;
      }
    }
    expect(sampled).toBeGreaterThan(4);
    expect(checked).toBeGreaterThan(1000);
    // The states sampled hold cards on cards, the cards whose values read others.
    expect(stacked).toBeGreaterThan(5);
  });
});
