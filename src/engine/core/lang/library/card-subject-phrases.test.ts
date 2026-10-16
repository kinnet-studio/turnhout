import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import { putOn } from '../attach';
import { createEngine, initialState } from '../build';
import { changeCard } from '../card-facts';
import { compileGame } from '../compile';
import { isNoSuchNumber } from '../diagnostics';
import { SUBJECT, runPhrase } from '../testing';
import type { CompiledGame, PhraseKind } from '../types';
import { relocate } from '../zones';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();

/** Compiles rules that must have no problems at all. */
function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  expect(diagnostics).toEqual([]);
  return game!;
}

const game = compiled(SUBJECT);
const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
/** The state once Setup has run, from seed 1: the jobs in the stashes, the hands in the hall. */
const setUp = engine.getState();
const all = (name: string) => setUp.cards.filter((card) => card.data?.name === name).map((card) => card.id);
const [vase] = all('Vase');
const [statue] = all('Statue');
const [potter, secondPotter, thirdPotter] = all('Potter');
const [smith] = all('Smith');

/** p0's workshop holding a Vase, and on it, in p0's crew, Potters 1 and 2. */
const table = putOn(relocate(setUp, [vase], 'workshop-p0', game), [potter, secondPotter], 'crew-p0', vase, game);
/** `state` with `facts` given to the card `id`. */
const given = (id: string, facts: Record<string, number | boolean>, state: GameState = table) => changeCard(state, id, facts, game);

/** A line about the card `id` and no player, read as a rule about that card reads it: through the values the game works out. */
const about = (state: GameState, id: string) => runtime.env(state, undefined, undefined, { player: null, space: null, card: id });
const holds = (text: string, id: string, state: GameState = table) => runPhrase<boolean>(lib, 'condition', text, about(state, id));
const working = (id: string, state: GameState = table) => runtime.workedFlag(state, id, 'working');
const busy = (state: GameState) => runtime.workedFlag(state, vase, 'busy');
const redLeft = (id: string, state: GameState = table) => runtime.workedValue(state, id, 'red left');

/** The 1-based number of `line` in `text`. */
const at = (text: string, line: string) => text.split('\n').indexOf(line) + 1;
const messages = (text: string) => compileGame(text, lib).diagnostics.map((d) => [d.line, d.message]);

describe('what kind of card it is', () => {
  it('reads a value of its table', () => {
    expect(holds('it is a red card', potter)).toBe(true);
    expect(holds('it is a red card', smith)).toBe(false);
  });
  it('reads it the other way round', () => {
    expect(holds('it is not a gold card', potter)).toBe(true);
    expect(holds('it is not a gold card', smith)).toBe(false);
  });
  it('reads its name', () => {
    expect(holds('it is a Potter card', potter)).toBe(true);
    expect(holds('it is a Potter card', smith)).toBe(false);
  });
});

describe('a flag it does not have', () => {
  it('holds until the flag is set on it', () => {
    expect(holds('it is not tired', potter)).toBe(true);
    expect(holds('it is not tired', potter, given(potter, { tired: true }))).toBe(false);
  });
  it('reads a flag worked out from lines: a Potter is working, and a tired one is not', () => {
    expect(working(potter)).toBe(true);
    expect(working(potter, given(potter, { tired: true }))).toBe(false);
    expect(holds('it is not working', potter, given(potter, { tired: true }))).toBe(true);
  });
  it('leaves a card of another kind not working', () => {
    expect(working(smith)).toBe(false);
  });
});

describe('a number it has', () => {
  it('is the one given', () => {
    expect(holds('its pay is 1', vase)).toBe(true);
    expect(holds('its pay is 1', statue)).toBe(false);
  });
});

describe('the zone it is in', () => {
  /** p1's workshop holding the Statue, and on it, in p1's crew, Potter 3. */
  const p1Crew = putOn(relocate(table, [statue], 'workshop-p1', game), [thirdPotter], 'crew-p1', statue, game);

  it('is a zone each player has, of any player', () => {
    expect(holds('it is in a crew', potter)).toBe(true);
    expect(holds('it is in a crew', thirdPotter, p1Crew)).toBe(true);
  });
  it('is not a zone in the center', () => {
    expect(holds('it is in a crew', thirdPotter)).toBe(false);
  });
  it('reads the “an” form', () => {
    const idle = relocate(table, [thirdPotter], 'idle-p1', game);
    expect(holds('it is in an idle', thirdPotter, idle)).toBe(true);
    expect(holds('it is in an idle', potter, idle)).toBe(false);
  });
});

describe('the cards on it', () => {
  const bothTired = given(secondPotter, { tired: true }, given(potter, { tired: true }));

  it('holds when some card on it is so', () => {
    expect(holds('some card on it is working', vase)).toBe(true);
    expect(holds('no card on it is working', vase)).toBe(false);
  });
  it('does not when none is, and then no card on it is', () => {
    expect(holds('some card on it is working', vase, bothTired)).toBe(false);
    expect(holds('no card on it is working', vase, bothTired)).toBe(true);
  });
  it('finds none on a card with nothing on it', () => {
    expect(holds('some card on it is working', statue)).toBe(false);
    expect(holds('no card on it is working', statue)).toBe(true);
  });
  it('works out a flag from another: the Vase is busy exactly when some Potter on it works', () => {
    expect(busy(table)).toBe(true);
    expect(busy(given(potter, { tired: true }))).toBe(true);
    expect(busy(bothTired)).toBe(false);
  });
});

describe('a value that goes down by another', () => {
  it('starts from its other number, then takes the cut off', () => {
    expect(redLeft(vase)).toBe(2);
    expect(redLeft(vase, given(vase, { 'red cut': 1 }))).toBe(1);
  });
  it('has no floor, so a cut larger than the need shows', () => {
    expect(redLeft(vase, given(vase, { 'red cut': 3 }))).toBe(-1);
  });
  it('is 0 on a Potter: its first line reads a red need the Potter lacks and leaves the value', () => {
    expect(redLeft(potter)).toBe(0);
  });
  it('says the card has no such number when the line is run alone, as one that is not about it', () => {
    let thrown: unknown;
    try {
      runPhrase(lib, 'value', "a card's red left is its red need", about(table, potter), 0);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toEqual(expect.objectContaining({ message: 'This card has no red need.' }));
    expect(isNoSuchNumber(thrown)).toBe(true);
  });
  it('leaves a value that is nothing so far as nothing', () => {
    expect(runPhrase(lib, 'value', "a card's red left goes down by its red cut", about(table, vase), null)).toBeNull();
  });
});

describe('what the phrases need', () => {
  const PHRASES: [PhraseKind, string][] = [
    ['condition', 'it is {cardclass}'],
    ['condition', 'it is not {cardclass}'],
    ['condition', 'it is not {cardflag}'],
    ['condition', 'its {attribute} is {int}'],
    ['condition', 'it is in a {perzone}'],
    ['condition', 'it is in an {perzone}'],
    ['condition', 'some card on it is {cardflag}'],
    ['condition', 'no card on it is {cardflag}'],
    ['value', "a card's {attribute} is its {attribute}"],
    ['value', "a card's {attribute} goes down by its {attribute}"],
  ];

  it('marks every phrase as about a card, so a face-down view and a hidden pick are judged by it', () => {
    for (const [kind, pattern] of PHRASES) expect([pattern, lib.get(kind, pattern)?.needsCard]).toEqual([pattern, true]);
  });
  it('reads “it is a red card” only in a rule about a card', () => {
    // The line goes under stop, a button that picks no card.
    const line = '    Only if it is a red card.';
    const text = SUBJECT.replace('  A player may stop.', `  A player may stop.\n${line}`);
    expect(messages(text)).toEqual([[at(text, line), '“it is a red card” only makes sense in a rule about a card, such as “When a card …”.']]);
  });
});
