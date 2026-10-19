import { describe, expect, it } from 'vitest';
import type { GameState } from '../game-state';
import type { PlayerId } from '../scene';
import { markOut, withBoardData } from './board-state';
import { playerFact } from './board-state';
import { createEngine, initialState, seatsFor } from './build';
import { flowDefFor } from './build';
import { compileGame } from './compile';
import { runExamples } from './examples';
import { createDefaultLibrary } from './library';
import { CLAIM_GAME, fixtureEnv, fixtureState, runPhrase } from './testing';
import { ROUNDS_GAME, STEPS_GAME } from './testing';
import { clearTurnMarkers, LAST_TURN_KEY, markTurnStarted, PLAYER_FRAME, playersInTurnOrder, TURN_OF_KEY } from './turns';
import { END_STEPS_KEY, isPlayerRule } from './turns';
import type { CompiledGame, CompiledTrigger, PhraseRef } from './types';
import HEARTS from '@/games/hearts.rules?raw';
import RENT_DAY from '@/games/rent-day.rules?raw';

const lib = createDefaultLibrary();
const SEATS = seatsFor(3);
const lineOf = (text: string, line: string) => text.split('\n').indexOf(line) + 1;

/** Compiles designer text that may still lack phrases; anything worse fails the test. */
function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  if (!game) throw new Error(JSON.stringify(diagnostics));
  return game;
}

const claim = compiled(CLAIM_GAME);
/** CLAIM_GAME's rule that crowns a ready player, which is the last rule for every phase. */
const CLAIM_RULE = '  When a player is ready:';
const claimLine = lineOf(CLAIM_GAME, CLAIM_RULE);
/** CLAIM_GAME with the crowning rule's `When` line written another way. */
const claimWhen = (when: string) => CLAIM_GAME.replace(CLAIM_RULE, when);
/** The rule of `game` on `line`, for every phase or under a phase. */
const ruleOn = (game: CompiledGame, line: number): CompiledTrigger | undefined =>
  [...game.everyPhase.triggers, ...game.phases.flatMap((phase) => phase.triggers)].find((trigger) => trigger.line === line);

/**
 * A 3-player engine of CLAIM_GAME whose turn is p0's in working, so Setup is skipped and p0, the first seat, is the start player, as
 * `end-steps.test.ts`'s table is.
 */
function table() {
  const start = withBoardData({ ...initialState(claim, 1), turn: { current: 'p0', phase: 'working' } }, claim, SEATS);
  return createEngine(claim, lib, 3, start).engine;
}

/** Each seat in turn presses the button. */
const press = (engine: ReturnType<typeof table>, type: string, ...seats: PlayerId[]) => {
  for (const by of seats) expect(engine.dispatch({ type, by }).reason).toBeUndefined();
};

/** The results of the examples, run on `game` with them written after it. */
const examplesOf = (game: string, ...examples: string[][]) => runExamples(compiled(`${game}\n\n${examples.map((lines) => lines.join('\n')).join('\n\n')}`), lib);

describe('the players a rule about a player is asked about, in turn', () => {
  const lastTurn = (seat: PlayerId): GameState => fixtureState([], { data: { [LAST_TURN_KEY]: seat } });

  it('go round from the player whose turn last started', () => {
    expect(playersInTurnOrder(lastTurn('p1'), SEATS)).toEqual(['p1', 'p2', 'p0']);
  });
  it('are in seat order before any turn has started, or when the last turn is no seat', () => {
    expect(playersInTurnOrder(fixtureState([]), SEATS)).toEqual(['p0', 'p1', 'p2']);
    expect(playersInTurnOrder(lastTurn('p5'), SEATS)).toEqual(['p0', 'p1', 'p2']);
  });
  it('leave out a player who is out, even the one whose turn last started', () => {
    expect(playersInTurnOrder(markOut(lastTurn('p1'), 'p1'), SEATS)).toEqual(['p2', 'p0']);
  });
});

describe('the last turn', () => {
  it('is the seat whose turn last started: the next round’s first turn once the round is played', () => {
    const engine = table();
    press(engine, 'stop', 'p0', 'p1');
    expect(engine.getState().data[LAST_TURN_KEY]).toBe('p2');
    press(engine, 'stop', 'p2');
    expect(engine.getState().data[LAST_TURN_KEY]).toBe('p0');
  });
  it('stays when the turn passes, so that a rule can still ask whose turn ended the round', () => {
    const state = fixtureState([], { turn: { current: 'p2', phase: 'tidying' }, data: { [LAST_TURN_KEY]: 'p2', [TURN_OF_KEY]: 'p2' } });
    const passed = runPhrase<GameState>(lib, 'effect', 'the turn passes to the left', fixtureEnv(state, { game: claim, seats: SEATS }));
    expect(Object.hasOwn(passed.data, TURN_OF_KEY)).toBe(false);
    expect(passed.data[LAST_TURN_KEY]).toBe('p2');
  });
  it('is the turn an example arranges, counted as started', () => {
    expect(markTurnStarted(fixtureState([], { turn: { current: 'p1', phase: 'working' } })).data[LAST_TURN_KEY]).toBe('p1');
  });
  it('is forgotten with the other turn markers, as a game is before its Setup', () => {
    expect(Object.hasOwn(clearTurnMarkers(fixtureState([], { data: { [LAST_TURN_KEY]: 'p2' } })).data, LAST_TURN_KEY)).toBe(false);
  });
});

describe('a rule about a player', () => {
  it('asks the player whose turn it is first, then the players after them, in turn', () => {
    expect(examplesOf(CLAIM_GAME, [
      'Example: the player whose turn it is is asked first',
      '  Given 3 players', "  And it is p2's turn", '  When p2 readies everyone', '  Then p2 is crowned', '  And p0 is not crowned',
    ], [
      'Example: then the players after them, in turn',
      '  Given 3 players', "  And it is p1's turn", '  When p1 readies everyone', '  Then p1 is crowned',
    ])).toEqual([expect.objectContaining({ status: 'pass', message: null }), expect.objectContaining({ status: 'pass', message: null })]);
  });
});

describe('a condition said of one player, as a rule about a player', () => {
  /** The condition the frame asks of each player, from the crowning rule of `text`. */
  const frameOf = (text: string): PhraseRef => {
    const { when } = ruleOn(compiled(text), claimLine)!;
    expect(when).toMatchObject({ kind: 'lang', phrase: PLAYER_FRAME, line: claimLine });
    return when.args[0] as PhraseRef;
  };

  it('reads “a player has …” as “they have …”, asked in turn from the player whose turn it is', () => {
    const coins = claimWhen('  When a player has at least 3 coins:');
    expect(compileGame(coins, lib).diagnostics).toEqual([]);
    expect(frameOf(coins)).toMatchObject({ kind: 'condition', phrase: 'they have at least {int} {counter}', args: [3, 'coins'] });
    // In seat order p0 would be crowned.
    expect(examplesOf(coins, [
      'Example: the first player in turn with 3 coins is crowned',
      '  Given 3 players', '  And p0 has 3 coins', '  And p2 has 5 coins', "  And it is p1's turn", '  Then p2 is crowned',
    ])).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
  });
  it('reads “a player’s …” as “their …”', () => {
    const list = claimWhen("  When a player's list has fewer than 2 cards:");
    expect(compileGame(list, lib).diagnostics).toEqual([]);
    expect(frameOf(list)).toMatchObject({ kind: 'condition', phrase: '{zone} has fewer than {int} cards' });
    expect(examplesOf(list, [
      'Example: every list is short, so the player whose turn it is is crowned',
      '  Given 3 players', "  And it is p2's turn", '  Then p2 is crowned',
    ])).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
  });
  it('names what the game lacks in the condition, on the rule’s line', () => {
    expect(compileGame(claimWhen('  When a player has at least 3 coinz:'), lib).diagnostics)
      .toEqual([expect.objectContaining({ line: claimLine, message: 'There is no counter called “coinz”.' })]);
  });
  it('quotes the designer’s own words when the condition is refused, never the words said of “they”', () => {
    const refused: [string, string, string][] = [
      ['  When a player has no card they could play:', 'a player has no card they could play',
        '“a player has no card they could play” only makes sense in a rule about a player\'s move.'],
      ['  When a player picked at most 2 cards:', 'a player picked at most 2 cards',
        '“a player picked at most 2 cards” only makes sense in a button that picks some cards, like “A player may discard some cards from their hand.”'],
    ];
    for (const [when, text, message] of refused) {
      const { diagnostics } = compileGame(claimWhen(when), lib);
      expect(diagnostics).toEqual([expect.objectContaining({ line: claimLine, message, text })]);
      expect(diagnostics[0].message).not.toMatch(/“the(y|ir) /);
    }
  });
  it('keeps a name the game lacks as the message says it, given with the designer’s line', () => {
    expect(compileGame(claimWhen('  When a player has at least 3 coinz:'), lib).diagnostics)
      .toEqual([expect.objectContaining({ message: 'There is no counter called “coinz”.', text: 'a player has at least 3 coinz' })]);
  });
  it('(guard) leaves a line the library has only suggestions for as the designer wrote it', () => {
    expect(compileGame(claimWhen('  When a player sneezes:'), lib).diagnostics)
      .toContainEqual(expect.objectContaining({ line: claimLine, message: '“a player sneezes” isn\'t in the phrase library yet.' }));
  });
  it('(guard) leaves a line a phrase about a player reads to that phrase', () => {
    const { game, diagnostics } = compileGame(RENT_DAY, lib);
    expect(diagnostics).toEqual([]);
    for (const rule of ['  When a player has 3 jail turns:', '  When a player is the high bidder:']) {
      expect(ruleOn(game!, lineOf(RENT_DAY, rule))?.when.kind).toBe('who');
    }
  });
});

describe('the End waits for rules about a player', () => {
  /** The crowning rule of CLAIM_GAME, as written for every phase. */
  const CROWN = [CLAIM_RULE, '    Only if no player is crowned.', '    They are crowned.'].join('\n');
  /** The End of a game that waits for no rule: its condition alone. */
  const condOnly = (game: CompiledGame) => [{ when: { name: 'lang:cond', params: game.end!.when }, result: 'lang:result' }];
  /** Every rule an End of `game` waits for. */
  const waitedFor = (game: CompiledGame) => (flowDefFor(game, seatsFor(game.players.min)).end ?? []).flatMap(({ when }) => {
    const params = typeof when === 'string' ? undefined : when.params as { rules?: { trigger: CompiledTrigger }[] } | undefined;
    return params?.rules ?? [];
  });

  it('crowns a player whose claim the move that ends the game meets, before the score', () => {
    // Readying everyone also empties the pile, which ends the game.
    const emptying = CLAIM_GAME.replace('      Every player is ready.', '      Every player is ready.\n      Move the pile to their list.');
    expect(examplesOf(emptying, [
      'Example: a claim met by the move that ends the game is made before the score',
      '  Given 3 players', "  And it is p1's turn", '  When p1 readies everyone', '  Then the game is over', '  And p1 is crowned',
    ])).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
  });
  it('waits for the rules for every phase about a player', () => {
    expect(flowDefFor(claim, SEATS).end).toEqual([{
      when: { name: 'lang:end-when', params: { when: claim.end!.when, rules: [{ phase: null, trigger: ruleOn(claim, claimLine) }] } },
      result: 'lang:result',
    }]);
  });
  it('(guard) waits for no rule of a game without one, nor for a rule about a player written under a phase', () => {
    const rounds = compiled(ROUNDS_GAME);
    expect(flowDefFor(rounds, SEATS).end).toEqual(condOnly(rounds));
    const underWorking = CLAIM_GAME.replace(`\n${CROWN}`, '')
      .replace('Phase: working\n  Players take turns.', `Phase: working\n  Players take turns.\n${CROWN}`);
    const working = compiled(underWorking);
    expect(working.phases.find((phase) => phase.id === 'working')!.triggers.map((trigger) => trigger.text)).toContain('When a player is ready');
    expect(flowDefFor(working, SEATS).end).toEqual(condOnly(working));
  });
  it.each([['Hearts', HEARTS], ['Rent Day', RENT_DAY]])('(guard) %s ends waiting for no rule about a player', (_name, text) => {
    expect(waitedFor(compiled(text)).filter(({ trigger }) => isPlayerRule(trigger.when))).toEqual([]);
  });

  describe('with the steps before the score', () => {
    const READY = [
      CLAIM_RULE, '    Only if no player is counting.', '    Only if no player is crowned.', '    They are crowned.', '', 'Phase: working',
    ].join('\n');
    /**
     * STEPS_GAME where each player is counting from the start of their final count until they count, and is then ready: a rule for every
     * phase crowns a ready player once no player is counting and none is crowned.
     */
    const READY_STEPS = STEPS_GAME
      .replace('  Players pay with coins.', '  Players pay with coins.\n  Players can be ready.\n  Players can be counting.\n  Players can be crowned.')
      .replace('Phase: final count\n  Players take turns.\n  When this phase starts:\n    They get 1 coin.',
        'Phase: final count\n  Players take turns.\n  When this phase starts:\n    They get 1 coin.\n    They are counting.')
      .replace('      They get 2 coins.\n      The final count passes to the left.',
        '      They get 2 coins.\n      They are not counting.\n      They are ready.\n      The final count passes to the left.')
      .replace('\nPhase: working', READY);
    const ready = compiled(READY_STEPS);
    /** A 3-player engine of READY_STEPS whose turn is p0's in working, so Setup is skipped and p0 is the start player. */
    const stepsTable = () =>
      createEngine(ready, lib, 3, withBoardData({ ...initialState(ready, 1), turn: { current: 'p0', phase: 'working' } }, ready, SEATS)).engine;
    const crownedOf = (state: GameState) => SEATS.filter((seat) => playerFact(state, seat, 'crowned') === true);

    it('crowns the player whose turn ended the round once the last step is taken, before the score', () => {
      expect(compileGame(READY_STEPS, lib).diagnostics).toEqual([]);
      const engine = stepsTable();
      press(engine, 'stop', 'p0', 'p1', 'p2');
      press(engine, 'count', 'p0', 'p1');
      expect(crownedOf(engine.getState())).toEqual([]);
      expect(engine.getState().result).toBeUndefined();
      press(engine, 'count', 'p2');
      const state = engine.getState();
      // In seat order p0 would be crowned.
      expect(crownedOf(state)).toEqual(['p2']);
      expect(state.result).toBeDefined();
      expect(state.data[END_STEPS_KEY]).toBe(true);
      const replayed = stepsTable();
      replayed.loadLog([...engine.getLog()]);
      expect(replayed.getState()).toEqual(state);
    });
  });
});
