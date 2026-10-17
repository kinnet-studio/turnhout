import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '../game-state';
import type { Json } from '../table-def';
import { putOn } from './attach';
import { readSeatExtras, seatExtras } from './board-view';
import { createEngine, initialState } from './build';
import { changeCard } from './card-facts';
import { compileGame } from './compile';
import { createDefaultLibrary } from './library';
import { CARDS_ON_IT, registerCardSubjectPhrases } from './library/card-subject-phrases';
import { registerCardValuePhrases } from './library/card-value-phrases';
import { PhraseLibrary, STATIC_TYPES } from './phrases';
import { VOCAB_TYPES } from './refs';
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
const CREW_ROW = '  Each player has a crew row that everyone can see, where every card is on a card.';
/** SHOWN whose crews only their owner sees. */
const PRIVATE_CREW = SHOWN.replace(CREW_ROW, CREW_ROW.replace('everyone can see', 'only they can see'));
const TUCK = 'tuck a card from their stash to a card in their crew';
/**
 * SHOWN with a pocket each player has that only they can see, where every card is on a card, a button that tucks a card from the stash
 * onto a hand in the crew, and a red pay a shady job gets: one with a hand on it that a Statue is tucked on, two cards down.
 */
const POCKET = withPay(
  ["  A shady card's red pay is 2."],
  'Spied:', '  Only if it is a Statue card.', '',
  'Hiding:', '  Only if some card on it is spied.', '',
  'Shady:', '  Only if some card on it is hiding.',
).replace(CREW_ROW, `${CREW_ROW}\n  Each player has a pocket row that only they can see, where every card is on a card.`).replace(
  '  A player may stop.', `  A player may ${TUCK}.\n    Then:\n      It goes to their pocket, on the target card.\n  A player may stop.`,
);
/** SHOWN with a red due that starts from red need, written before red left; in `HALL_DUE` it also reads the hall. */
const DUE = SHOWN.replace('Red left:', ['Red due:', "  A card's red due is its red need.", '', 'Red left:'].join('\n'));
const DUE_LINE = "  A card's red due is its red need.";
const HALL_DUE = DUE.replace(DUE_LINE, `${DUE_LINE}\n  A card's red due is the total red need of the cards in the hall.`);
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
 * `arrange` has the last say, told the Potters and the second Statue.
 */
function arranged(game: CompiledGame = shown, arrange: (state: GameState, potters: string[], stashed: string) => GameState = (state) => state) {
  const start = createEngine(game, lib, 2, initialState(game, 1)).engine.getState();
  const named = (name: string) => start.cards.filter((card) => card.data?.name === name).map((card) => card.id);
  const [[vase], [statue, stashed], [p1, p2], [tinker]] = ['Vase', 'Statue', 'Potter', 'Tinker'].map(named);
  let state = relocate(start, [vase, statue], 'workshop-p0', game);
  state = putOn(state, [p1, p2], 'crew-p0', vase, game);
  state = changeCard(state, vase, { 'red done': 1, 'cut red done': 1 }, game);
  state = relocate(relocate(state, [stashed], 'stash-p1', game), [tinker], 'idle-p0', game);
  const { engine, runtime } = createEngine(game, lib, 2, arrange(state, [p1, p2], stashed));
  const view = (seat: string) => seatExtras(engine, runtime, engine.getState(), seat);
  return { engine, runtime, view, vase, statue, stashed, potters: [p1, p2] };
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

  it('shows a flag read through a total of the cards on it, and not one read through a total of a zone, or where crews are hidden', () => {
    expect(shownFlags(compiled(BARE))).toEqual(['busy', 'bare']);
    expect(shownFlags(compiled(HALL_BARE))).toEqual(['busy']);
    // With crews only their owner sees, bare would tell every seat the hidden crew's skill total.
    expect(shownFlags(compiled(BARE.replace(CREW_ROW, CREW_ROW.replace('everyone can see', 'only they can see'))))).toEqual([]);
  });

  it('(guard) stands the first of two numbers that start from one column in for it, and the second when the first reads more than the card', () => {
    // Both pass before the cards on a card were judged by the rules alone: they pin how standIns picks among sections.
    expect(standIns(compiled(DUE))).toEqual({ 'red need': 'red due' });
    expect(standIns(compiled(HALL_DUE))).toEqual({ 'red need': 'red left' });
  });
});

describe('the phrases the view counts as reading only the card', () => {
  it('are these 14: decide whether a new one reads beyond the card, and add it to CARDS_ON_IT if it reads the cards on it', () => {
    // Everything these two registrars register is card-only to `worked-view.ts`, but for CARDS_ON_IT, which counts only where every card
    // on a card is public: a new phrase that reads the cards on it and is missing there would show hidden cards to every seat, and one that
    // reads anything else of the table (a zone's cards, a player's numbers) belongs in another registrar.
    const registered: string[] = [];
    const conditions = vi.spyOn(PhraseLibrary.prototype, 'condition').mockImplementation(function (this: PhraseLibrary, pattern: string) {
      registered.push(`condition: ${pattern}`);
      return this;
    });
    const values = vi.spyOn(PhraseLibrary.prototype, 'value').mockImplementation(function (this: PhraseLibrary, pattern: string) {
      registered.push(`value: ${pattern}`);
      return this;
    });
    try {
      registerCardValuePhrases(registerCardSubjectPhrases(new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])));
    } finally {
      conditions.mockRestore();
      values.mockRestore();
    }
    expect(registered).toEqual([
      'condition: it is {cardclass}', 'condition: it is not {cardclass}', 'condition: it is not {cardflag}', 'condition: its {attribute} is {int}',
      'condition: it is in a {perzone}', 'condition: it is in an {perzone}', 'condition: some card on it is {cardflag}',
      'condition: no card on it is {cardflag}',
      "value: a card's {attribute} is its {attribute}", "value: a card's {attribute} goes down by its {attribute}",
      "value: {cardclass}'s {attribute} is its {attribute}", "value: {cardclass}'s {attribute} is {int}",
      "value: a {cardflag} card's {attribute} is {int}", "value: an {cardflag} card's {attribute} is {int}",
    ]);
    const onIt = CARDS_ON_IT.map((pattern) => `condition: ${pattern}`);
    expect(registered.filter((entry) => entry.includes(' on it '))).toEqual(onIt);
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

  it('Review Focus: shows no flag read through the cards on a card where crews are hidden, and a red left whatever sits on the job', () => {
    const privateCrew = compiled(PRIVATE_CREW);
    expect([standIns(privateCrew), shownFlags(privateCrew)]).toEqual([{ 'red need': 'red left' }, []]);
    // The Vase is in every seat's view, the same with its hidden crew on it as with none: what sits on it tells nothing by omission.
    const crewed = arranged(privateCrew);
    const bare = arranged(privateCrew, (state, potters) => relocate(state, potters, 'hall', privateCrew));
    const worked = { [crewed.vase]: { columns: { 'red need': 1 }, flags: [] }, [crewed.statue]: { columns: { 'red need': 1 }, flags: [] } };
    for (const seat of ['p0', 'p1']) {
      expect(crewed.view(seat).worked, seat).toEqual(worked);
      expect(bare.view(seat).worked, seat).toEqual(worked);
    }
  });

  it('Review Focus: shows nothing read through the cards on a card, however far down, where some card on a card is hidden', () => {
    const pocket = compiled(POCKET);
    expect(shownFlags(pocket)).toEqual([]);
    // p0 tucks the second Statue from their stash onto Potter 1, on the Vase: the Vase is shady, which only p0 may know.
    const toOwnStash = (state: GameState, _potters: string[], statue: string) => relocate(state, [statue], 'stash-p0', pocket);
    const { engine, runtime, view, vase, stashed, potters } = arranged(pocket, toOwnStash);
    expect(engine.dispatch({ type: TUCK, by: 'p0', cardId: stashed, onto: potters[0] }).ok).toBe(true);
    expect(engine.getState().cards.find((card) => card.id === stashed)!.zoneId).toBe('pocket-p0');
    expect(runtime.workedFlag(engine.getState(), vase, 'shady')).toBe(true);
    for (const seat of ['p0', 'p1']) {
      expect(JSON.stringify(view(seat).worked), seat).not.toMatch(/shady/);
      expect(view(seat).worked![vase], seat).toEqual({ columns: { 'red need': 1 }, flags: [] });
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
