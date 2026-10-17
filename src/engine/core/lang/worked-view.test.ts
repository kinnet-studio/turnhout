import { describe, expect, it } from 'vitest';
import type { GameState } from '../game-state';
import type { Json } from '../table-def';
import { putOn } from './attach';
import { readSeatExtras, seatExtras } from './board-view';
import { createEngine, initialState } from './build';
import { changeCard } from './card-facts';
import { compileGame } from './compile';
import { createDefaultLibrary } from './library';
import { CREW_GAME, SHOWN, SUBJECT, WORKED_GAME } from './testing';
import type { CompiledGame } from './types';
import { shownFlags, standIns } from './worked-view';
import { relocate } from './zones';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import HEARTS from '@/games/hearts.rules?raw';
import RENT_DAY from '@/games/rent-day.rules?raw';
import VENOM from '@/games/venom.rules?raw';

const lib = createDefaultLibrary();

/** Compiles rules that must have no problems at all. */
function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  expect(diagnostics).toEqual([]);
  return game!;
}

/** SHOWN with `lines` added to its Red pay section, then `sections` after it. */
const withPay = (lines: string[], ...sections: string[]) => [SHOWN, ...lines, '', ...sections].join('\n');
/** SHOWN with a red pay a hoarded job gets, where hoarded reads every stash, each of which only its owner sees. */
const HOARDING = withPay(["  A hoarded card's red pay is 2."], 'Hoarded:', '  Only if some player has a card in their stash whose name is Vase.');
/** SHOWN whose crews only their owner sees. */
const PRIVATE_CREW = SHOWN.replace(
  '  Each player has a crew row that everyone can see, where every card is on a card.',
  '  Each player has a crew row that only they can see, where every card is on a card.',
);
/** SHOWN with a red pay that a job no hand's skill is on gets: bare reads a total of the cards on it, or, in `HALL_BARE`, of the hall. */
const BARE = withPay(
  ["  A bare card's red pay is 2."],
  'Crew skill:', "  A card's crew skill is the total skill of the cards on it.", '',
  'Bare:', '  Only if its crew skill is 0.',
);
const HALL_BARE = BARE.replace('the total skill of the cards on it', 'the total skill of the cards in the hall');
/** SHOWN with a red pay that a looping job gets: a Vase is looping when it is not, which the runtime can only throw at. */
const LOOPING = withPay(["  A looping card's red pay is 3."], 'Looping:', '  Only if it is a Vase card.', '  Only if it is not looping.');

const shown = compiled(SHOWN);

/**
 * `game` (SHOWN unless said) for two at seed 1, with p0's workshop holding the first Vase and the first Statue, the Vase with Potters 1
 * and 2 on it in p0's crew, 1 red done and 1 cut red done; p1's stash holding the second Statue too, and p0's idle row the first Tinker.
 * `arrange` has the last say.
 */
function arranged(game: CompiledGame = shown, arrange: (state: GameState, potters: string[]) => GameState = (state) => state) {
  const start = createEngine(game, lib, 2, initialState(game, 1)).engine.getState();
  const named = (name: string) => start.cards.filter((card) => card.data?.name === name).map((card) => card.id);
  const [[vase], [statue, stashed], [p1, p2], [tinker]] = ['Vase', 'Statue', 'Potter', 'Tinker'].map(named);
  let state = relocate(start, [vase, statue], 'workshop-p0', game);
  state = putOn(state, [p1, p2], 'crew-p0', vase, game);
  state = changeCard(state, vase, { 'red done': 1, 'cut red done': 1 }, game);
  state = relocate(relocate(state, [stashed], 'stash-p1', game), [tinker], 'idle-p0', game);
  const { engine, runtime } = createEngine(game, lib, 2, arrange(state, [p1, p2]));
  const view = (seat: string) => seatExtras(engine, runtime, engine.getState(), seat);
  return { engine, runtime, view, vase, statue, stashed };
}

describe('SHOWN', () => {
  it('compiles with no problems', () => expect(compileGame(SHOWN, lib).diagnostics).toEqual([]));
});

describe('what the game says the view may show', () => {
  it('stands red left in for red need, and shows busy, which turns a red pay on', () => {
    expect(standIns(shown)).toEqual({ 'red need': 'red left' });
    expect(shownFlags(shown)).toEqual(['busy']);
  });

  it('shows no flag no value line turns on', () => {
    const subject = compiled(SUBJECT);
    expect(standIns(subject)).toEqual({ 'red need': 'red left' });
    expect(shownFlags(subject)).toEqual([]);
  });

  it('shows nothing of a game whose numbers start from no column, and never a kept flag, which the page shows already', () => {
    // WORKED_GAME's “A tired card's red work is 0.” turns a value on by tired, a flag cards keep.
    const worked = compiled(WORKED_GAME);
    expect([standIns(worked), shownFlags(worked)]).toEqual([{}, []]);
  });

  it('Review Focus: shows no flag whose lines read what a seat may not see, such as every stash', () => {
    const hoarding = compiled(HOARDING);
    expect(shownFlags(hoarding)).toEqual(['busy']);
    // p1's stash holds the other Vase, so the Vase in p0's workshop is hoarded: no seat but p1 may know that.
    const other = (state: GameState) => state.cards.find((card) => card.data?.name === 'Vase' && card.zoneId !== 'workshop-p0')!.id;
    const { runtime, engine, vase, view } = arranged(hoarding, (state) => relocate(state, [other(state)], 'stash-p1', hoarding));
    expect(runtime.workedFlag(engine.getState(), vase, 'hoarded')).toBe(true);
    for (const seat of ['p0', 'p1']) expect(view(seat).worked![vase].flags, seat).toEqual(['busy']);
  });

  it('shows a flag read through a total of the cards on it, and not one read through a total of a zone', () => {
    expect(shownFlags(compiled(BARE))).toEqual(['busy', 'bare']);
    expect(shownFlags(compiled(HALL_BARE))).toEqual(['busy']);
  });
});

describe('SHOWN arranged', () => {
  const { view, vase, statue, stashed } = arranged();

  it('gives every seat the red left in place of each red need on a Board, and a busy job its flag', () => {
    const worked = { [vase]: { columns: { 'red need': 1 }, flags: ['busy'] }, [statue]: { columns: { 'red need': 1 }, flags: [] } };
    expect(view('p1').worked).toEqual(worked);
    expect(view('p0').worked).toEqual(worked);
  });

  it('Review Focus: says nothing of a card in a stash, not even to the seat whose stash it is', () => {
    for (const seat of ['p0', 'p1']) expect(Object.keys(view(seat).worked!), seat).not.toContain(stashed);
  });

  it('turns busy off once both Potters are tired', () => {
    const tired = arranged(shown, (state, potters) => potters.reduce((s, id) => changeCard(s, id, { tired: true }, shown), state));
    expect(tired.view('p1').worked![tired.vase]).toEqual({ columns: { 'red need': 1 }, flags: [] });
  });

  it('Review Focus: leaves out a job whose crew only its owner sees, for every seat, its owner too', () => {
    const hidden = arranged(compiled(PRIVATE_CREW));
    for (const seat of ['p0', 'p1']) {
      expect(hidden.view(seat).worked, seat).toEqual({ [hidden.statue]: { columns: { 'red need': 1 }, flags: [] } });
    }
  });

  it('leaves out a card whose values the runtime throws at, and shows the others', () => {
    const looping = compiled(LOOPING);
    expect(shownFlags(looping)).toEqual(['busy', 'looping']);
    const { view: loopView, runtime, engine, vase: loopVase, statue: loopStatue } = arranged(looping);
    expect(() => runtime.workedFlag(engine.getState(), loopVase, 'looping')).toThrow('“looping” is worked out from itself.');
    expect(loopView('p1').worked).toEqual({ [loopStatue]: { columns: { 'red need': 1 }, flags: [] } });
  });
});

describe('readSeatExtras', () => {
  const { view, vase } = arranged();
  const sent = JSON.parse(JSON.stringify(view('p1'))) as { [k: string]: Json };
  const withWorked = (entry: Json) => ({ ...sent, worked: { [vase]: entry } });

  it('reads back the worked values a view carries', () => {
    expect(sent.worked).toBeDefined();
    expect(readSeatExtras(sent)).toEqual(view('p1'));
  });

  it('refuses worked flags that are not a list of text, and worked columns that are not numbers', () => {
    expect(readSeatExtras(withWorked({ columns: { 'red need': 1 }, flags: 'busy' }))).toBeNull();
    expect(readSeatExtras(withWorked({ columns: { 'red need': '1' }, flags: [] }))).toBeNull();
  });

  it('reads extras with no worked values', () => {
    const { worked: _worked, ...none } = sent;
    expect(readSeatExtras(none)).toEqual(none);
  });
});

describe('the four games (guard)', () => {
  // These pass before the view carries worked values, and say it never carries any for a game that works nothing out.
  it.each([['Hearts', HEARTS], ['Color Match', COLOR_MATCH], ['Venom', VENOM], ['Rent Day', RENT_DAY], ['CREW_GAME', CREW_GAME]])(
    '(guard) gives %s no worked values',
    (_name, text) => {
      const game = compiled(text);
      const { engine, runtime, seats } = createEngine(game, lib, game.players.min, initialState(game, 1));
      for (const seat of seats) expect('worked' in seatExtras(engine, runtime, engine.getState(), seat), seat).toBe(false);
    },
  );
});
