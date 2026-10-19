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
import { PLAYER_TOTAL, registerPlayerValuePhrases } from './library/player-value-phrases';
import { PhraseLibrary, STATIC_TYPES } from './phrases';
import { VOCAB_TYPES } from './refs';
import { CREW_GAME, SHOWN, SUBJECT, WORKED_GAME } from './testing';
import { FORCE_GAME, GAUGED_GAME, RESTING_GAME } from './testing';
import { COUNT_GAME } from './testing';
import type { CompiledGame } from './types';
import type { ZoneSpec } from './types';
import { shownFlags, standIns } from './worked-view';
import { dimFlags, gaugePairs, shownPlayerValues } from './worked-view';
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
  it('are these 22: decide whether a new one reads beyond the card, and add it to CARDS_ON_IT if it reads the cards on it', () => {
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
      'condition: its {attribute} are {int}',
      'condition: it is in a {perzone}', 'condition: it is in an {perzone}', 'condition: some card on it is {cardflag}',
      'condition: no card on it is {cardflag}',
      "value: a card's {attribute} is its {attribute}", "value: a card's {attribute} goes down by its {attribute}",
      "value: a card's {attribute} is at least {int}",
      'condition: it is a card whose {cardfilter}', 'condition: it is not a card whose {cardfilter}',
      "value: a card's {attribute} goes up by its {attribute}", "value: a card's {attribute} goes up by its {attribute} times its {attribute}",
      "value: {cardclass}'s {attribute} is its {attribute}", "value: {cardclass}'s {attribute} is {int}",
      "value: a {cardflag} card's {attribute} is {int}", "value: an {cardflag} card's {attribute} is {int}",
      "value: a {cardflag} card's {attribute} is its {attribute}", "value: an {cardflag} card's {attribute} is its {attribute}",
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

describe('a flag the cards on it are tested by', () => {
  /** BARE whose crew skill adds up only the hands on a job that are `flag`, then `sections`. */
  const testedBy = (flag: string, ...sections: string[]) =>
    [BARE.replace('the total skill of the cards on it.', `the total skill of the cards on it that are ${flag}.`), '', ...sections].join('\n');

  it('Review Focus: shows no flag read through the cards on it that are a flag whose lines read every stash', () => {
    const hoarded = compiled(testedBy('hoarded', 'Hoarded:', '  Only if some player has a card in their stash whose name is Vase.'));
    expect(shownFlags(hoarded)).toEqual(['busy']);
  });

  it('shows one read through the cards on it that are, or are not, a flag whose lines read only the card', () => {
    // Working: a red hand that is not tired.
    expect(shownFlags(compiled(testedBy('working')))).toEqual(['busy', 'bare']);
    expect(shownFlags(compiled(testedBy('not working')))).toEqual(['busy', 'bare']);
  });
});

describe('a flag that turns a value on to another number, and a value that goes up by a total', () => {
  /**
   * SHOWN with a job's worth refined by the skill of the hands on it, and a red pay that a plain job gets: a Vase no skill is on, worth 3
   * still. With `group` the worth adds up the skill of another group than the cards on it.
   */
  const plain = (group = 'the cards on it') => withPay(
    ["  A plain card's red pay is 2."],
    'Worth:', `  A card's worth goes up by the total skill of ${group}.`, '',
    'Plain:', '  Only if its worth is 3.',
  );

  it('shows a flag read only by a line that gives a card that is so another of its numbers', () => {
    // Working turns no value on in SHOWN but by this line.
    expect(shownFlags(compiled(withPay(["  A working card's red pay is its skill."])))).toEqual(['working', 'busy']);
  });

  it('shows a flag that names a value that goes up by a total of the cards on it, and not one of a zone, or where crews are hidden', () => {
    expect(shownFlags(compiled(plain()))).toEqual(['busy', 'plain']);
    expect(shownFlags(compiled(plain('the cards in the hall')))).toEqual(['busy']);
    // With crews only their owner sees, plain would tell every seat the hidden crew's skill total.
    expect(shownFlags(compiled(plain().replace(CREW_ROW, CREW_ROW.replace('everyone can see', 'only they can see'))))).toEqual([]);
  });
});

describe('(guard) a zone where some cards sit on cards', () => {
  /** SHOWN with a pocket each player has where some cards sit on cards, as `visibility` says who sees it. */
  const withPocket = (visibility: ZoneSpec['visibility']): CompiledGame => ({
    ...shown, zones: [...shown.zones, { name: 'pocket', perPlayer: true, layout: 'row', visibility, onCards: 'some' }],
  });

  it('turns off every flag read through the cards on a card when it is hidden, and leaves them on when everyone sees it', () => {
    expect(shownFlags(withPocket('owner'))).toEqual([]);
    expect(shownFlags(withPocket('secret'))).toEqual([]);
    expect(shownFlags(withPocket('public'))).toEqual(['busy']);
  });
});

describe('what the view says about each player', () => {
  /**
   * Six values about a player, each a total over a group of cards: the red pay of the jobs in their workshop, the pay of those there that
   * are not busy, the skill of the hands in the hall, the pay of the jobs in the pile and in their stash, and the skill of their crew.
   */
  const VALUES = [
    'Job pay:', "  A player's job pay is the total red pay of the cards in their workshop.", '',
    'Spare pay:', "  A player's spare pay is the total pay of the cards in their workshop that are not busy.", '',
    'Open force:', "  A player's open force is the total skill of the cards in the hall.", '',
    'Deep pay:', "  A player's deep pay is the total pay of the cards in the pile.", '',
    'Kept pay:', "  A player's kept pay is the total pay of the cards in their stash.", '',
    'Team force:', "  A player's team force is the total skill of the cards in their crew.",
  ].join('\n');
  /** Rules made of `parts`, a blank line between each. */
  const plus = (...parts: string[]) => parts.join('\n\n');
  const KEPT_PAY = "Kept pay:\n  A player's kept pay is the total pay of the cards in their stash.";

  describe('which are shown', () => {
    it('shows a value that adds up a number read from the card alone over zones everyone sees, by tests read from the card alone', () => {
      // Deep pay adds up the pile, which no one sees, and kept pay a stash, which only its owner sees.
      expect(shownPlayerValues(compiled(plus(SHOWN, VALUES)))).toEqual(['job pay', 'spare pay', 'open force', 'team force']);
      expect(shownPlayerValues(compiled(FORCE_GAME))).toEqual(['red force', 'red load']);
      expect(shownPlayerValues(compiled(CREW_GAME))).toEqual([]);
    });

    it('Review Focus: shows no value read through a number or a test whose lines read what a seat may not see, such as every stash', () => {
      const clean = "Clean pay:\n  A player's clean pay is the total pay of the cards in their workshop that are not hoarded.";
      const hoarding = compiled(plus(HOARDING, VALUES, clean));
      // Red pay and hoarded read every stash: job pay and clean pay would tell every seat whether some stash holds a Vase.
      expect(shownPlayerValues(hoarding)).toEqual(['spare pay', 'open force', 'team force']);
      const { view } = arranged(hoarding);
      for (const seat of ['p0', 'p1']) {
        const values = view(seat).playerValues!;
        expect(Object.keys(values), seat).toEqual(['p0', 'p1']);
        for (const [who, theirs] of Object.entries(values)) {
          expect(Object.keys(theirs), `${seat} sees ${who}`).toEqual(['spare pay', 'open force', 'team force']);
        }
      }
    });

    it('Review Focus: shows no value read through the cards on a card, nor a total of a crew, where crews are hidden', () => {
      // With crews only their owner sees, busy reads hidden cards, and so do job pay and spare pay through it.
      expect(shownPlayerValues(compiled(plus(PRIVATE_CREW, VALUES)))).toEqual(['open force']);
    });
  });

  describe('gauges', () => {
    it('pairs two shown values a button waits on the first reaching, once however many buttons wait on them, and none for another test', () => {
      expect(gaugePairs(compiled(GAUGED_GAME))).toEqual([['red force', 'red load']]);
      const FINISH = '  A player may finish a card in their workshop.\n    It costs 1 move.';
      const twice = GAUGED_GAME.replace(FINISH, `${FINISH}\n    Only if their red force is at least their red load.`);
      expect(twice).not.toBe(GAUGED_GAME);
      expect(gaugePairs(compiled(twice))).toEqual([['red force', 'red load']]);
      expect(gaugePairs(compiled(GAUGED_GAME.replace('is at least their red load', 'is more than their red load')))).toEqual([]);
    });

    it('Review Focus: pairs no value the view does not show', () => {
      const kept = GAUGED_GAME.replace('is at least their red load.', 'is at least their kept pay.');
      expect(kept).not.toBe(GAUGED_GAME);
      expect(gaugePairs(compiled(plus(kept, KEPT_PAY)))).toEqual([]);
    });
  });

  it('fades a card for a flag cards keep that a shown value leaves out, and for no flag worked out', () => {
    expect(dimFlags(compiled(RESTING_GAME))).toEqual(['resting']);
    expect(dimFlags(compiled(FORCE_GAME))).toEqual([]);
    // Spare pay leaves out the jobs that are busy, but busy is worked out, not kept.
    expect(dimFlags(compiled(plus(SHOWN, VALUES)))).toEqual([]);
  });

  it('fades no card for a flag a shown value counts the cards that have', () => {
    const restingCounted = RESTING_GAME.replace('that are not resting', 'that are resting');
    expect(restingCounted).not.toBe(RESTING_GAME);
    expect(shownPlayerValues(compiled(restingCounted))).toContain('red load');
    expect(dimFlags(compiled(restingCounted))).toEqual([]);
  });

  describe('GAUGED_GAME for three at seed 1', () => {
    const gauged = compiled(GAUGED_GAME);
    // Setup deals 2 jobs to each stash, more than the pile holds for three: a state with p0's turn set skips it.
    const start = createEngine(gauged, lib, 3, { ...initialState(gauged, 1), turn: { current: 'p0', phase: 'working' } }).engine.getState();
    const all = (name: string) => start.cards.filter((card) => card.data?.name === name).map((card) => card.id);
    const [[vase], [statue], [potter], [tinker], [smith]] = ['Vase', 'Statue', 'Potter', 'Tinker', 'Smith'].map(all);
    /**
     * p0's workshop holding the Vase (red need 2) with the Potter and the Tinker (red work 1 each) on it, and p1's the Statue (red need 1)
     * with the Smith (gold, so no red work) on it. p2 has neither.
     */
    const table = [
      (state: GameState) => relocate(state, [vase], 'workshop-p0', gauged),
      (state: GameState) => putOn(state, [potter, tinker], 'crew-p0', vase, gauged),
      (state: GameState) => relocate(state, [statue], 'workshop-p1', gauged),
      (state: GameState) => putOn(state, [smith], 'crew-p1', statue, gauged),
    ].reduce((state, arrange) => arrange(state), start);
    /** What `seat` is given beside the table, in `state`. */
    const viewOf = (state: GameState, seat: string) => {
      const { engine, runtime } = createEngine(gauged, lib, 3, state);
      return seatExtras(engine, runtime, engine.getState(), seat);
    };
    const sent = JSON.parse(JSON.stringify(viewOf(table, 'p1'))) as { [k: string]: Json };

    it('gives every seat the red force and red load of each player, its own and the others alike', () => {
      const values = { p0: { 'red force': 2, 'red load': 2 }, p1: { 'red force': 0, 'red load': 1 }, p2: { 'red force': 0, 'red load': 0 } };
      for (const seat of ['p0', 'p1', 'p2']) expect(viewOf(table, seat).playerValues, seat).toEqual(values);
    });

    it('leaves a resting job out of the red load', () => {
      expect(viewOf(changeCard(table, statue, { resting: true }, gauged), 'p0').playerValues!.p1['red load']).toBe(0);
    });

    it('reads back the values a view carries', () => {
      expect(sent.playerValues).toBeDefined();
      expect(readSeatExtras(sent)).toEqual(viewOf(table, 'p1'));
    });

    it('refuses values that are not numbers by name, by seat', () => {
      expect(readSeatExtras({ ...sent, playerValues: { p0: { 'red force': '2' } } })).toBeNull();
      expect(readSeatExtras({ ...sent, playerValues: { p0: 3 } })).toBeNull();
    });

    it('reads extras with no values about players', () => {
      const { playerValues: _values, ...none } = sent;
      expect(readSeatExtras(none)).toEqual(none);
    });
  });

  it("Review Focus: leaves out a value the runtime throws at for that player alone, and keeps the player's entry", () => {
    const looping = compiled(plus(LOOPING, "Loop pay:\n  A player's loop pay is the total red pay of the cards in their workshop."));
    expect(shownPlayerValues(looping)).toEqual(['loop pay']);
    // p0's workshop holds the looping Vase, whose red pay the runtime throws at; p1's holds nothing.
    expect(arranged(looping).view('p1').playerValues).toEqual({ p0: {}, p1: { 'loop pay': 0 } });
  });

  it('counts one line as working out a value about a player: judge what a new one reads before the view shows a value by it', () => {
    // `shownPlayerValues` shows a value only when each of its lines is this one and adds up cards everyone sees. A new line that works
    // out a value about a player shows nothing until it is judged here, and taught to `shownPlayerValues` if it reads only what all see.
    const registered: string[] = [];
    const values = vi.spyOn(PhraseLibrary.prototype, 'value').mockImplementation(function (this: PhraseLibrary, pattern: string) {
      registered.push(pattern);
      return this;
    });
    try {
      registerPlayerValuePhrases(new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES]));
    } finally {
      values.mockRestore();
    }
    // The two counts are judged not shown: `shownPlayerValues` reads only totals, and a count shows nothing until the view is taught it.
    expect(registered).toEqual([
      PLAYER_TOTAL, "a player's {playervalue} is the number of {cardgroup}",
      "a player's {playervalue} is the number of different {attribute} values among {cardgroup}",
    ]);
  });

  // These pass before the view carries values about players, and say it never carries any for a game that shows none.
  it.each([['Hearts', HEARTS], ['Color Match', COLOR_MATCH], ['Venom', VENOM], ['Rent Day', RENT_DAY], ['CREW_GAME', CREW_GAME]])(
    '(guard) gives %s no values about a player',
    (_name, text) => {
      const game = compiled(text);
      const { engine, runtime, seats } = createEngine(game, lib, game.players.min, initialState(game, 1));
      for (const seat of seats) expect('playerValues' in seatExtras(engine, runtime, engine.getState(), seat), seat).toBe(false);
    },
  );
});

describe('counting the cards on it, and a test by any column', () => {
  /** SHOWN with a red pay a crowded job gets: one with more than 1 card on it, counted among `group`. */
  const crowded = (group = 'the cards on it') => withPay(
    ["  A crowded card's red pay is 2."],
    'Crew count:', `  A card's crew count is the number of ${group}.`, '',
    'Crowded:', '  Only if it is a card whose crew count is more than 1.',
  );
  /** SHOWN with a red pay a needy job gets: one whose `name` is more than 1, with `sections` before Needy:. */
  const needy = (name: string, ...sections: string[]) =>
    withPay(["  A needy card's red pay is 3."], ...sections, 'Needy:', `  Only if it is a card whose ${name} is more than 1.`);

  it('shows a flag that tests a count of the cards on it, and not one of a zone, or where crews are hidden', () => {
    expect(shownFlags(compiled(crowded()))).toEqual(['busy', 'crowded']);
    // With crews only their owner sees, crowded would tell every seat how many hidden cards sit on a job.
    expect(shownFlags(compiled(crowded().replace(CREW_ROW, CREW_ROW.replace('everyone can see', 'only they can see'))))).toEqual([]);
    expect(shownFlags(compiled(crowded('the cards in the hall')))).toEqual(['busy']);
  });

  it('shows a flag that tests a column of the card, and not one that tests a value read beyond the card', () => {
    expect(shownFlags(compiled(needy('red need')))).toEqual(['busy', 'needy']);
    const hallRed = ['Hall red:', "  A card's hall red is the total red need of the cards in the hall.", ''];
    expect(shownFlags(compiled(needy('hall red', ...hallRed)))).toEqual(['busy']);
  });

  it('shows no value about a player that counts cards', () => {
    expect(shownPlayerValues(compiled(COUNT_GAME))).toEqual([]);
  });
});

describe("a card's numbers added and multiplied, what its owner has, and the card it is on", () => {
  it('stands a value in for a column still when it goes up by its numbers, or by two of them multiplied', () => {
    const LAST = "  A card's red left goes down by its cut red done.";
    const added = SHOWN.replace(LAST, [
      LAST, "  A card's red left goes up by its red done times its cut red done.", "  A card's red left goes up by its red done.",
    ].join('\n'));
    expect(added).not.toBe(SHOWN);
    expect(standIns(compiled(added))).toEqual({ 'red need': 'red left' });
  });

  it('Review Focus: shows no flag read through what its owner has, nor through the card it is on', () => {
    // Watched reads a stash, which only its owner sees; perched reads another card than the one it is about.
    const watched = withPay(["  A watched card's red pay is 2."], 'Watched:', '  Only if its owner has a card in their stash that is tired.');
    expect(shownFlags(compiled(watched))).toEqual(['busy']);
    const perched = withPay(["  A perched card's red pay is 2."], 'Perched:', '  Only if the card it is on is a Statue card.');
    expect(shownFlags(compiled(perched))).toEqual(['busy']);
  });
});
