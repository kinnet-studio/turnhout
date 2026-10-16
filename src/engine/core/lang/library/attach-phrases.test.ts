import { describe, expect, it } from 'vitest';
import { cardById, zoneCards, type GameState } from '../../game-state';
import type { Move } from '../../moves';
import { counterOf } from '../board-state';
import { createEngine, initialState } from '../build';
import { compileGame } from '../compile';
import { RuleError } from '../diagnostics';
import { runExamples } from '../examples';
import { friendlyError } from '../friendly';
import { CREW_GAME, fixtureEnv, runPhrase } from '../testing';
import { relocate } from '../zones';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const game = compileGame(CREW_GAME, lib).game!;

/** The 1-based number of `line` in `text`. */
const at = (text: string, line: string) => text.split('\n').indexOf(line) + 1;
const messages = (text: string) => compileGame(text, lib).diagnostics.map((d) => [d.line, d.message]);

/** The state once Setup has run, from seed 1, with p0 to move and 3 moves to spend. */
const setUp = createEngine(game, lib, 2, initialState(game, 1)).engine.getState();
const named = (name: string) => setUp.cards.find((card) => card.data?.name === name)!.id;
const vase = named('Vase');
const statue = named('Statue');
const [potter1, potter2] = zoneCards(setUp, 'hall').filter((card) => card.data?.name === 'Potter').map((card) => card.id);

/** A 2-player engine of `text` on the state after Setup as `arrange` leaves it. */
const crew = (arrange: (state: GameState) => GameState, text = CREW_GAME) => {
  const compiled = compileGame(text, lib);
  expect(compiled.diagnostics).toEqual([]);
  return createEngine(compiled.game!, lib, 2, arrange(setUp));
};
/** The Vase and the Statue in p0's workshop. */
const atWork = (state: GameState) => relocate(state, [vase, statue], 'workshop-p0', game);

const HIRE: Move = { type: 'hire some cards from the hall to a card in their workshop', by: 'p0', cardIds: [potter1, potter2], onto: vase };
const shift = (onto: string): Move => ({ type: 'shift a card from their crew to a card in their workshop', by: 'p0', cardId: potter1, onto });
const FINISH: Move = { type: 'finish a card in their workshop', by: 'p0', cardId: vase };

const holderOf = (state: GameState, id: string) => cardById(state, id)?.data?.['lang:on'];

describe('hiring onto a job, shifting and finishing', () => {
  it('puts the picked cards in the crew, on the target card, for a move', () => {
    const { engine } = crew(atWork);
    expect(engine.dispatch(HIRE)).toMatchObject({ ok: true });
    const state = engine.getState();
    for (const id of [potter1, potter2]) {
      expect(cardById(state, id)?.zoneId).toBe('crew-p0');
      expect(holderOf(state, id)).toBe(vase);
    }
    expect(counterOf(state, 'moves', 'p0')).toBe(2);
  });
  it('shifts a card only onto a card it is not on', () => {
    const { engine } = crew(atWork);
    engine.dispatch(HIRE);
    expect(engine.dispatch(shift(vase))).toMatchObject({ ok: false, reason: 'it is not on the target card' });
    expect(engine.dispatch(shift(statue))).toMatchObject({ ok: true });
    expect(holderOf(engine.getState(), potter1)).toBe(statue);
    expect(cardById(engine.getState(), potter1)?.zoneId).toBe('crew-p0');
  });
  it('finishes a job: its crew goes to the idle row, tired and on nothing, and the job to the scrap', () => {
    const { engine } = crew(atWork);
    engine.dispatch(HIRE);
    engine.dispatch(shift(statue));
    expect(engine.dispatch(FINISH)).toMatchObject({ ok: true });
    const state = engine.getState();
    expect(cardById(state, vase)?.zoneId).toBe('scrap');
    expect(cardById(state, potter2)).toMatchObject({ zoneId: 'idle-p0', data: expect.objectContaining({ tired: true }) });
    expect(cardById(state, potter2)?.data).not.toHaveProperty('lang:on');
    expect(holderOf(state, potter1)).toBe(statue);
  });
});

const DROP = '  A player may drop a card in their workshop.';
/** CREW_GAME with a button that moves a job to the scrap and forgets its crew. */
const DROPPING = CREW_GAME.replace('  A player may stop.', `${DROP}\n    Then:\n      Move it to the scrap.\n  A player may stop.`);
const LEFT_BEHIND = "The Potter in p0's crew is on the Vase, which is now in the scrap. Move the cards on a card along with it.";

describe('Review Focus: the forgotten crew', () => {
  it('is the DROPPING game', () => expect(DROPPING).not.toBe(CREW_GAME));
  it('refuses a press that leaves a crew on a job gone to the scrap, and keeps the state from before it', () => {
    const { engine } = crew(atWork, DROPPING);
    engine.dispatch(HIRE);
    const before = engine.getState();
    expect(() => engine.dispatch({ type: 'drop a card in their workshop', by: 'p0', cardId: vase })).toThrow(new RuleError(LEFT_BEHIND, at(DROPPING, DROP)));
    expect(engine.getState()).toBe(before);
    expect(engine.getLog()).toEqual([HIRE]);
  });
});

describe('the line a broken table is blamed on', () => {
  /** What `run` threw, as the designer reads it. */
  const said = (run: () => unknown): string => {
    try {
      run();
    } catch (error) {
      return friendlyError(error);
    }
    throw new Error('Nothing was thrown.');
  };
  const stranding = (text: string) => () => createEngine(compileGame(text, lib).game!, lib, 2, initialState(game, 1));
  /** What is said of the first card a line leaves on nothing in p0's crew. */
  const NOWHERE = "in p0's crew isn't on any card, but every card there must be.";

  it('is the button pressed, for a press', () => {
    const { engine } = crew(atWork, DROPPING);
    engine.dispatch(HIRE);
    expect(said(() => engine.dispatch({ type: 'drop a card in their workshop', by: 'p0', cardId: vase })))
      .toBe(`Line ${at(DROPPING, DROP)}: ${LEFT_BEHIND}`);
  });
  it('is the card move, for a card moved', () => {
    const TOSS = '  A player may toss a card from their workshop to the scrap.';
    const text = CREW_GAME.replace('  A player may stop.', `${TOSS}\n  A player may stop.`);
    const { engine } = crew(atWork, text);
    engine.dispatch(HIRE);
    expect(said(() => engine.dispatch({ type: 'toss', by: 'p0', cardId: vase }))).toBe(`Line ${at(text, TOSS)}: ${LEFT_BEHIND}`);
  });
  it('is the rule, for a rule that fires after a press', () => {
    const RULE = '  When they have less than 3 moves:';
    const text = CREW_GAME.replace('  When they have less than 1 move:', `${RULE}\n    Move their workshop to the scrap.\n  When they have less than 1 move:`);
    const { engine } = crew(atWork, text);
    expect(said(() => engine.dispatch(HIRE))).toBe(`Line ${at(text, RULE)} (“When they have less than 3 moves”): ${LEFT_BEHIND}`);
  });
  it('is the line, with its words, for a Setup line and a line that starts a phase', () => {
    // Each deals to every crew in turn, so the first card it leaves on nothing may be in either.
    const nowhere = (line: number, words: string) => new RegExp(`^Line ${line} \\(“${words}”\\): The \\w+ in p\\d's crew isn't on any card, but every card there must be\\.$`);
    const SETUP = '  Deal 2 cards from the pile to each crew.';
    const setUp = CREW_GAME.replace('  Deal 2 cards from the pile to each stash.', SETUP);
    expect(said(stranding(setUp))).toMatch(nowhere(at(setUp, SETUP), 'Deal 2 cards from the pile to each crew'));
    const START = '    Deal 1 card from the hall to each crew.';
    const starting = CREW_GAME.replace('  Players take turns.', `  Players take turns.\n  When this phase starts:\n${START}`);
    expect(said(stranding(starting))).toMatch(nowhere(at(starting, START), 'Deal 1 card from the hall to each crew'));
  });
  it('is the line that starts a turn after which the table stayed broken, not a later one', () => {
    const DEAL = '    Deal 1 card from the hall to their crew.';
    // The line after it moves a card too, and leaves the table as broken as it found it.
    const text = CREW_GAME.replace('  Players take turns.', `  Players take turns.\n  When a player's turn starts:\n${DEAL}\n    Deal 1 card from the hall to their idle.`);
    expect(compileGame(text, lib).diagnostics).toEqual([]);
    expect(said(stranding(text))).toBe(`Line ${at(text, DEAL)} (“Deal 1 card from the hall to their crew”): The Potter ${NOWHERE}`);
  });
});

describe('the check after every change', () => {
  const stranding = (lines: string) => () => createEngine(compileGame(lines, lib).game!, lib, 2, initialState(game, 1));
  const NOWHERE = /^The \w+ in p\d's crew isn't on any card, but every card there must be\.$/;
  /** The problems that stop the game being played: a first phase's start lines are only warned about. */
  const errors = (text: string) => compileGame(text, lib).diagnostics.filter((d) => d.severity === 'error');

  it('follows a Setup line', () => {
    const text = CREW_GAME.replace('  Deal 2 cards from the pile to each stash.', '  Deal 2 cards from the pile to each crew.');
    expect(compileGame(text, lib).diagnostics).toEqual([]);
    expect(stranding(text)).toThrow(NOWHERE);
  });
  it('follows a line that starts a phase', () => {
    const text = CREW_GAME.replace('  Players take turns.', '  Players take turns.\n  When this phase starts:\n    Deal 1 card from the hall to each crew.');
    expect(errors(text)).toEqual([]);
    expect(stranding(text)).toThrow(NOWHERE);
  });
  it('follows a line that starts a turn', () => {
    const text = CREW_GAME.replace('  Players take turns.', "  Players take turns.\n  When a player's turn starts:\n    Deal 1 card from the hall to their crew.");
    expect(compileGame(text, lib).diagnostics).toEqual([]);
    expect(stranding(text)).toThrow(NOWHERE);
  });
  it('follows a rule that fires after a press, refusing the press whole', () => {
    const text = CREW_GAME.replace('  When they have less than 1 move:', '  When they have less than 3 moves:\n    Move their workshop to the scrap.\n  When they have less than 1 move:');
    const { engine } = crew(atWork, text);
    const before = engine.getState();
    expect(() => engine.dispatch(HIRE)).toThrow(/^The Potter in p0's crew is on the Vase, which is now in the scrap\./);
    expect(engine.getState()).toBe(before);
  });
  it('follows a card move', () => {
    const text = CREW_GAME.replace('  A player may stop.', '  A player may toss a card from their workshop to the scrap.\n  A player may stop.');
    const { engine } = crew(atWork, text);
    engine.dispatch(HIRE);
    const before = engine.getState();
    expect(() => engine.dispatch({ type: 'toss', by: 'p0', cardId: vase })).toThrow(/is on the Vase, which is now in the scrap\./);
    expect(engine.getState()).toBe(before);
  });
});

describe('what the lines need', () => {
  it('reads “It goes to …, on the target card” only in a button that picks a card and the card it goes to', () => {
    const line = '      It goes to their crew, on the target card.';
    const text = CREW_GAME.replace('      Move it to their workshop.', `      Move it to their workshop.\n${line}`);
    expect(messages(text)).toEqual([[
      at(text, line),
      '“It goes to their crew, on the target card” only makes sense in a button that picks a card and the card it goes to, like '
        + '“A player may stack a card from their hand to a card in the row.”',
    ]]);
  });
  it('reads “Every card on it …” only in a rule about a card', () => {
    // The line is also finish's, so the one under stop is the last of them.
    const line = '      Every card on it goes to their idle.';
    const text = CREW_GAME.replace('      Their moves go back to 0.', `      Their moves go back to 0.\n${line}`);
    expect(messages(text)).toEqual([[text.split('\n').lastIndexOf(line) + 1, '“Every card on it goes to their idle” only makes sense in a rule about a card, such as “When a card …”.']]);
  });
  it('puts a card on a card only in a zone marked for it', () => {
    const env = fixtureEnv(atWork(setUp), { game, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: potter1, onto: vase } });
    expect(() => runPhrase(lib, 'effect', 'it goes to their idle, on the target card', env)).toThrow(new RuleError(
      'their idle doesn\'t hold cards on cards. End its Table line with “, where every card is on a card”.',
    ));
  });
});

describe('Review Focus: undo and replay', () => {
  it('gives back each earlier state, holders and all, and a replayed log rebuilds the same table', () => {
    const { engine } = crew(atWork);
    const states = [engine.getState()];
    for (const move of [HIRE, shift(statue), FINISH]) {
      expect(engine.dispatch(move)).toMatchObject({ ok: true });
      states.push(engine.getState());
    }
    expect(holderOf(states[2], potter1)).toBe(statue);
    const fresh = crew(atWork).engine;
    fresh.loadLog([...engine.getLog()]);
    expect(fresh.getState()).toEqual(engine.getState());
    for (const earlier of [states[2], states[1], states[0]]) {
      engine.undo();
      expect(engine.getState()).toEqual(earlier);
    }
  });
});

describe('examples about cards on cards', () => {
  const EXAMPLE = [
    'Example: a crew sits on its job',
    "  Given p0's workshop has a Vase and a Statue",
    "  And the Vase in p0's workshop has a Potter and a Smith on it",
    '  When p0 shifts the Smith to the Statue',
    '  Then it is accepted',
    "  And the Vase in p0's workshop has a Potter on it",
    "  And the Statue in p0's workshop has a Smith on it",
    '  When p0 finishes the Vase',
    '  Then the scrap has a Vase',
    "  And p0's idle has a Potter",
    "  And the Statue in p0's workshop has a Smith on it",
  ].join('\n');
  const run = (examples: string) => {
    const { game: withExamples, diagnostics } = compileGame(`${CREW_GAME}\n\n${examples}\n`, lib);
    expect(diagnostics).toEqual([]);
    return runExamples(withExamples!, lib);
  };

  it('arranges a crew on its job, and checks what is on a card', () => {
    expect(run(EXAMPLE)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
  });
  it('refuses a Given that leaves a card on a card where it can\'t follow, at that Given, before any press', () => {
    const GIVEN = "  And the Vase in p0's stash has a Potter on it";
    const text = ['Example: a crew on a job in the stash', "  Given p0's stash has a Vase", GIVEN, '  When p0 stops', '  Then it is accepted'].join('\n');
    const at = `${CREW_GAME}\n\n${text}\n`.split('\n').indexOf(GIVEN) + 1;
    expect(run(text)).toEqual([expect.objectContaining({
      status: 'fail', atLine: at,
      message: `Line ${at} (“the Vase in p0's stash has a Potter on it”): The Potter in p0's crew is on the Vase, which is now in p0's stash. `
        + 'Move the cards on a card along with it.',
    })]);
  });
  it('says which button left the table broken when a press does', () => {
    const text = ['Example: dropping a job', "  Given p0's workshop has a Vase", "  And the Vase in p0's workshop has a Potter on it", '  When p0 drops the Vase'].join('\n');
    const { game: dropping, diagnostics } = compileGame(`${DROPPING}\n\n${text}\n`, lib);
    expect(diagnostics).toEqual([]);
    expect(runExamples(dropping!, lib)).toEqual([expect.objectContaining({ status: 'fail', message: `Line ${at(DROPPING, DROP)}: ${LEFT_BEHIND}` })]);
  });
  it('says what is on the card when it expected nothing', () => {
    const [result] = run([...EXAMPLE.split('\n').slice(0, 3), "  Then the Vase in p0's workshop has no cards on it"].join('\n'));
    expect(result).toMatchObject({
      status: 'fail',
      message: "Expected the Vase in p0's workshop to have no cards on it, but it has a Potter red 1 1 and a Smith gold 2 2 on it.",
    });
  });
});
