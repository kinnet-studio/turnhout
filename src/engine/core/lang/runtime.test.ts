import { describe, expect, it } from 'vitest';
import { cardById, zoneCards, type GameState } from '../game-state';
import type { PlayerId } from '../scene';
import type { Json } from '../table-def';
import { counterOf, gameNumber, isOut, markOut, ownerOf, playerFact, recordAction, setCounter, setOwner, setPlayerFact, withBoardData } from './board-state';
import { createEngine, flowDefFor, initialState, seatsFor, tableDefFor } from './build';
import { cardFact } from './card-facts';
import { compileGame } from './compile';
import { MissingPhraseError, RuleError } from './diagnostics';
import { friendlyError } from './friendly';
import { createDefaultLibrary } from './library';
import { LangRuntime } from './runtime';
import { HOLDING_BOARD, PICK_BOARD, TEST_DUEL, TINY_BOARD } from './testing';
import type { CompiledGame, ExampleEnv, MoveInfo, PhraseRef } from './types';
import { matchesCard, relocate, zoneIdFor } from './zones';
import RENT_DAY from '@/games/rent-day.rules?raw';

const lib = createDefaultLibrary();
const LINES = TEST_DUEL.split('\n');

/** Compiles designer text that may still lack phrases; anything worse fails the test. */
function compiled(text: string, library = lib): CompiledGame {
  const { game, diagnostics } = compileGame(text, library);
  if (!game) throw new Error(JSON.stringify(diagnostics));
  return game;
}

/** The Test Duel with line `n` (1-based) replaced by `lines`. */
const replaceLine = (n: number, ...lines: string[]) => [...LINES.slice(0, n - 1), ...lines, ...LINES.slice(n)].join('\n');
/** The Test Duel with `lines` inserted after line `n`. */
const insertAfter = (n: number, ...lines: string[]) => [...LINES.slice(0, n), ...lines, ...LINES.slice(n)].join('\n');

const game = compiled(TEST_DUEL);

const RANKS: Record<string, number> = { A: 1, J: 11, Q: 12, K: 13 };

/** The id of a card written like '3C', '10D' or 'QS'. */
function idOf(state: GameState, name: string): string {
  const rank = RANKS[name.slice(0, -1)] ?? Number(name.slice(0, -1));
  const card = state.cards.find((c) => c.data?.rank === rank && c.data?.suit === name.slice(-1));
  if (!card) throw new Error(`No card ${name}.`);
  return card.id;
}

/**
 * Seed 1's cards with the named ones placed in zones (in order) and in the middle (with who played them);
 * every other card stays in the deck. It is `current`'s turn in the play phase.
 */
function arrange(current: PlayerId, zones: Record<string, string[]>, middle: [string, PlayerId][] = []): GameState {
  const start = initialState(game, 1);
  const placed = new Map<string, { zoneId: string; slot: number; movedBy?: PlayerId }>();
  for (const [zoneId, names] of Object.entries(zones)) names.forEach((name, slot) => placed.set(idOf(start, name), { zoneId, slot }));
  middle.forEach(([name, movedBy], slot) => placed.set(idOf(start, name), { zoneId: 'middle', slot, movedBy }));
  return {
    ...start,
    turn: { current, phase: 'play' },
    cards: start.cards.map((card) => {
      const at = placed.get(card.id);
      if (!at) return card;
      const data = at.movedBy === undefined ? card.data : { ...card.data, movedBy: at.movedBy };
      return { ...card, zoneId: at.zoneId, slot: at.slot, data };
    }),
  };
}

const engineFor = (state: GameState, rules: CompiledGame = game) => createEngine(rules, lib, 2, state).engine;

function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected it to throw.');
}

describe('building a game for the engine', () => {
  it('builds the table, deals during setup and starts in the first phase', () => {
    const { engine, tableDef } = createEngine(game, lib, 2, initialState(game, 1));
    expect(tableDef.zones.map((z) => z.id)).toEqual(['hand-p0', 'hand-p1', 'won-pile-p0', 'won-pile-p1', 'deck', 'middle']);
    expect(engine.getState().turn).toEqual({ current: 'p0', phase: 'play' });
    expect(zoneCards(engine.getState(), 'hand-p1')).toHaveLength(3);
  });

  it('names seats p0 upwards and puts them in the table', () => {
    expect(seatsFor(3)).toEqual(['p0', 'p1', 'p2']);
    expect(tableDefFor(game, seatsFor(2)).players).toEqual(['p0', 'p1']);
  });

  it('starts every card in its set’s zone, face down, with no turn yet', () => {
    const state = initialState(game, 1);
    expect(state.cards).toHaveLength(52);
    expect(state.cards.every((c) => c.zoneId === 'deck' && !c.faceUp)).toBe(true);
    expect(state.turn).toBeUndefined();
    expect(state.data).toEqual({});
  });

  it('rejects a player count outside the range', () => {
    expect(() => createEngine(game, lib, 3, initialState(game, 1))).toThrow(new RuleError('This game is for 2 players.'));
    const range = compiled(replaceLine(2, 'Players: 2 to 5'));
    expect(() => createEngine(range, lib, 6, initialState(range, 1))).toThrow('This game is for 2 to 5 players.');
    expect(() => createEngine(range, lib, 1, initialState(range, 1))).toThrow('This game is for 2 to 5 players.');
  });
});

describe('declared moves', () => {
  it('rejects with the designer’s own words', () => {
    const state = arrange('p0', { 'hand-p0': ['3C', '7H', 'KS'], 'hand-p1': ['9D'] });
    const engine = engineFor(state);
    const play = (name: string, more: Record<string, string> = {}) =>
      engine.dispatch({ type: 'play', cardId: idOf(state, name), by: 'p0', ...more }).reason;
    expect(play('9D')).toBe('You can only play a card from your hand.');
    expect(play('7H')).toBe('the card is not a heart');
    expect(play('3C', { toZone: 'won-pile-p0' })).toBe("You can't play a card there.");
    const notTop = zoneCards(engine.getState(), 'deck')[0];
    expect(engine.dispatch({ type: 'draw', cardId: notTop.id, by: 'p0' }).reason).toBe('You can only take the top card of the deck.');
    expect(engine.dispatch({ type: 'play', cardId: 'nope', by: 'p0' }).reason).toBe("That card isn't on the table.");

    const led = arrange('p0', { 'hand-p0': ['9C', 'QS'], 'hand-p1': ['9D'] }, [['5C', 'p1']]);
    expect(engineFor(led).dispatch({ type: 'play', cardId: idOf(led, 'QS'), by: 'p0' }).reason)
      .toBe('the middle is empty or they follow the led suit when they can');
  });

  it('applies the move, records the mover and runs Then effects', () => {
    const state = arrange('p0', { 'hand-p0': ['KS', '3C'], 'hand-p1': ['9D'] });
    const engine = engineFor(state);
    const before = engine.getState().rng.count;
    expect(engine.dispatch({ type: 'play', cardId: idOf(state, 'KS'), by: 'p0' }).ok).toBe(true);
    const after = engine.getState();
    expect(cardById(after, idOf(state, 'KS'))).toMatchObject({ zoneId: 'middle', faceUp: true, data: { movedBy: 'p0' } });
    expect(after.rng.count).toBeGreaterThan(before);
    expect(after.turn?.current).toBe('p1');
  });

  it('skips a Then effect whose condition is false', () => {
    const state = arrange('p0', { 'hand-p0': ['KS', '3C'], 'hand-p1': ['9D'] });
    const engine = engineFor(state);
    const before = engine.getState().rng;
    expect(engine.dispatch({ type: 'play', cardId: idOf(state, '3C'), by: 'p0', toZone: 'middle' }).ok).toBe(true);
    expect(engine.getState().rng).toEqual(before);
  });

  it('draws the top card of a pile into the mover’s own zone, face down', () => {
    const state = arrange('p0', { 'hand-p0': ['KS'], 'hand-p1': ['9D'] });
    const engine = engineFor(state);
    const top = zoneCards(engine.getState(), 'deck').at(-1)!;
    expect(engine.dispatch({ type: 'draw', cardId: top.id, by: 'p0' }).ok).toBe(true);
    expect(cardById(engine.getState(), top.id)).toMatchObject({ zoneId: 'hand-p0', faceUp: false, slot: 1, data: { movedBy: 'p0' } });
    expect(engine.getState().turn?.current).toBe('p1');
  });

  it('a trick won by the player who just played does not also pass the turn', () => {
    const state = arrange('p1', { 'hand-p0': ['3D'], 'hand-p1': ['AC', '2D'] }, [['5C', 'p0']]);
    const engine = engineFor(state);
    expect(engine.dispatch({ type: 'play', cardId: idOf(state, 'AC'), by: 'p1' }).ok).toBe(true);
    expect(zoneCards(engine.getState(), 'won-pile-p1')).toHaveLength(2);
    expect(zoneCards(engine.getState(), 'middle')).toHaveLength(0);
    expect(engine.getState().turn).toEqual({ current: 'p1', phase: 'play' });
  });

  it('lets a player rearrange their own hand out of turn', () => {
    const state = arrange('p0', { 'hand-p0': ['KS'], 'hand-p1': ['9D', '2D'] });
    const engine = engineFor(state);
    expect(engine.dispatch({ type: 'reorder', cardId: idOf(state, '2D'), slot: 0, by: 'p1' }).ok).toBe(true);
    expect(zoneCards(engine.getState(), 'hand-p1').map((c) => c.id)).toEqual([idOf(state, '2D'), idOf(state, '9D')]);
  });

  it('checks what else a player could do through the engine', () => {
    const rules = compiled(insertAfter(26, '    Only if they have no card they could play.'));
    const stuck = arrange('p0', { 'hand-p0': ['7H'], 'hand-p1': ['9D'] });
    const drawTop = (state: GameState) => {
      const engine = engineFor(state, rules);
      return engine.dispatch({ type: 'draw', cardId: zoneCards(engine.getState(), 'deck').at(-1)!.id, by: 'p0' });
    };
    expect(drawTop(stuck).ok).toBe(true);
    expect(drawTop(arrange('p0', { 'hand-p0': ['7H', '3C'], 'hand-p1': ['9D'] })).reason).toBe('they have no card they could play');
  });

  it('refuses two moves that each wait for the other', () => {
    const noPlay = '    Only if they have no card they could play.';
    // Under the play line (19) and under the draw line (26).
    const rules = compiled([...LINES.slice(0, 19), noPlay, ...LINES.slice(19, 26), noPlay, ...LINES.slice(26)].join('\n'));
    const engine = engineFor(arrange('p0', { 'hand-p0': ['3C'], 'hand-p1': ['9D'] }), rules);
    const top = zoneCards(engine.getState(), 'deck').at(-1)!;
    const error = thrown(() => engine.dispatch({ type: 'draw', cardId: top.id, by: 'p0' }));
    expect(error).toBeInstanceOf(RuleError);
    expect((error as RuleError).message).toBe('Two moves depend on each other through “they have no card they could play”.');
  });
});

describe('LangRuntime', () => {
  const STEPS = ['', 'Example: steps', '  Given p0 holds the 3 of clubs', '  When p0 plays the 3 of clubs', "  Then it is p1's turn", '  And the middle is empty', '  And the deck is empty'];
  const rules = compiled(TEST_DUEL + STEPS.join('\n'));
  const [given, when, turnIs, middleEmpty, deckEmpty] = rules.examples[0].steps.map((s) => s.ref);
  const runtime = new LangRuntime(rules, lib, ['p0', 'p1']);
  const example: ExampleEnv = {
    last: null,
    claim: (match, _text, state) => state.cards.find((c) => matchesCard(c, match))!.id,
    setUp: (state) => state,
  };
  const ref = (kind: PhraseRef['kind'], phrase: string, args: Json[] = [], text = phrase): PhraseRef => ({ kind, phrase, args, line: 3, text });

  it('runs an example’s Given, When and Then steps', () => {
    const state = runtime.run(given, arrange('p0', { 'hand-p0': ['9D', '4C'] }), undefined, example);
    expect(zoneCards(state, 'hand-p0').map((c) => c.id)).toEqual([idOf(state, '3C')]);
    expect(runtime.act(when, state, example)).toEqual({ by: 'p0', move: { type: 'play', cardId: idOf(state, '3C') } });
    expect(runtime.expect(turnIs, state, example)).toBe("Expected it to be p1's turn, but it is p0's turn.");
    expect(runtime.expect(middleEmpty, state, example)).toBe(true);
    expect(runtime.expect(deckEmpty, state, example)).toBe('Expected: the deck is empty');
  });

  it('answers the compiler’s own conditions', () => {
    const state = arrange('p0', {});
    const yes = ref('lang', 'always');
    const no = ref('lang', 'phase', ['elsewhere']);
    expect(runtime.test(ref('lang', 'phase', ['play']), state)).toBe(true);
    expect(runtime.test(ref('lang', 'any', [no, yes]), state)).toBe(true);
    expect(runtime.test(ref('lang', 'all', [yes, no]), state)).toBe(false);
  });

  it('refuses phrases nobody has written, or that this library lacks', () => {
    const state = arrange('p0', {});
    expect(() => runtime.test(ref('lang', 'missing', ['condition'], 'the moon is full'), state))
      .toThrow(new MissingPhraseError('“the moon is full” isn\'t implemented yet.', 3, 'the moon is full'));
    expect(() => runtime.run(ref('effect', 'the table wobbles'), state)).toThrow(MissingPhraseError);
  });
});

describe('the game flow', () => {
  it('ends with a winner', () => {
    const state = arrange('p0', { 'hand-p0': ['3C'], 'hand-p1': ['9D'] });
    const engine = engineFor(state);
    expect(engine.dispatch({ type: 'play', cardId: idOf(state, '3C'), by: 'p0' }).ok).toBe(true);
    expect(engine.getState().result).toEqual({ winner: 'p0' });
  });

  it('records every seat’s score next to the winner', () => {
    const rules = compiled(replaceLine(35, "  Each spade in a player's won pile scores 2 points.", '  The highest score wins.'));
    const state = arrange('p0', { 'hand-p0': ['3C'], 'hand-p1': ['9D'], 'won-pile-p1': ['2S', '4S'] });
    const engine = engineFor(state, rules);
    expect(engine.dispatch({ type: 'play', cardId: idOf(state, '3C'), by: 'p0' }).ok).toBe(true);
    expect(engine.getState().result).toEqual({ scores: { p0: 0, p1: 4 }, winner: 'p1' });
  });

  it('scopes triggers to their phase', () => {
    const t = flowDefFor(game, ['p0', 'p1']).triggers![0];
    expect(t.id).toBe('line 27: When the middle has 2 cards');
    const params = { phase: 'play', trigger: game.phases[0].triggers[0] };
    expect(t).toMatchObject({ when: { name: 'lang:trigger-when', params }, then: [{ name: 'lang:trigger-then', params }] });
  });

  it('runs setup in a phase of its own, then goes to the first phase', () => {
    const flow = flowDefFor(game, ['p0', 'p1']);
    expect(flow.turn.order).toEqual(['p0', 'p1']);
    expect(flow.phases.map((p) => p.id)).toEqual(['__setup', 'play']);
    expect(flow.phases[0]).toMatchObject({ allow: [], advance: { when: 'lang:always', to: 'play' } });
    expect(flow.phases[1]).toMatchObject({
      allow: ['play', 'draw', 'reorder'], actor: 'current', anyActor: ['reorder'],
      endTurn: { when: 'lang:always', after: ['play', 'draw'], next: { name: 'lang:turn' } },
    });
    expect(flow.end).toEqual([{ when: { name: 'lang:cond', params: game.end!.when }, result: 'lang:result' }]);
  });

  it('a missing phrase throws with its line when reached', () => {
    const rules = compiled(replaceLine(25, '      The winner sings.'));
    const state = arrange('p0', { 'hand-p0': ['3C', '4C'], 'hand-p1': ['9D'] });
    const engine = engineFor(state, rules);
    const error = thrown(() => engine.dispatch({ type: 'play', cardId: idOf(state, '3C'), by: 'p0' }));
    expect(error).toBeInstanceOf(MissingPhraseError);
    expect(friendlyError(error)).toBe('Line 25: “The winner sings” isn\'t implemented yet.');
  });

  it('says on which line a phrase failed', () => {
    const library = createDefaultLibrary().effect('the table wobbles', () => {
      throw new Error('the legs are uneven');
    });
    const rules = compiled(replaceLine(25, '      The table wobbles.'), library);
    const state = arrange('p0', { 'hand-p0': ['3C', '4C'], 'hand-p1': ['9D'] });
    const { engine } = createEngine(rules, library, 2, state);
    const error = thrown(() => engine.dispatch({ type: 'play', cardId: idOf(state, '3C'), by: 'p0' }));
    expect(error).toBeInstanceOf(RuleError);
    expect(friendlyError(error)).toBe('Line 25 (“The table wobbles”): the legs are uneven');
  });

  it('gives a phrase’s complaint the line it came from', () => {
    const rules = compiled(replaceLine(14, '  Deal 30 cards from the deck to each hand.'));
    const error = thrown(() => createEngine(rules, lib, 2, initialState(rules, 1)));
    expect(friendlyError(error)).toBe('Line 14 (“Deal 30 cards from the deck to each hand”): Only 22 cards are left in the deck.');
  });

  it('a rule that keeps firing is reported in plain words', () => {
    const rules = compiled(insertAfter(31, '  When the deck is not empty:', '    Shuffle the deck.'));
    const error = thrown(() => createEngine(rules, lib, 2, initialState(rules, 1)));
    expect(friendlyError(error)).toBe('The rule on line 32 (“When the deck is not empty”) keeps firing. Its effects must change what it checks.');
  });

  it('“go to” rules that send the game back and forth are reported in plain words', () => {
    const rules = compiled(insertAfter(31, '  When the deck is not empty, go to rest.', '', 'Phase: rest', '  When the deck is not empty, go to play.'));
    const error = thrown(() => createEngine(rules, lib, 2, initialState(rules, 1)));
    expect(friendlyError(error)).toBe(
      'The “go to” rules keep moving the game to rest and away again. A phase\'s “go to” condition must stop holding once the game gets there.',
    );
  });
});

describe('LangRuntime on a board', () => {
  const board = compiled(TINY_BOARD);
  const runtime = new LangRuntime(board, lib, ['p0', 'p1']);
  const start: GameState = { ...withBoardData(initialState(board, 1), board, ['p0', 'p1']), turn: { current: 'p0', phase: 'playing' } };
  const [goingOut] = board.phases[0].triggers;
  const broke = (state: GameState, ...seats: string[]) => seats.reduce((s, seat) => setCounter(s, 'money', seat, -1), state);

  it('says who and which space a phrase is about', () => {
    expect(runtime.env(start, undefined, undefined, { player: 'p1', space: 2, card: null }).subject).toEqual({ player: 'p1', space: 2, card: null });
    const move: MoveInfo = { verb: 'play', by: 'p1', cardId: 'c1', from: 'hand-p1', to: 'middle' };
    expect(runtime.env(start, move).subject).toEqual({ player: 'p1', space: null, card: null });
    expect(runtime.env(start).subject).toBeUndefined();
  });

  it('picks out the players a rule about a player is about', () => {
    expect(runtime.who(goingOut.when, start)).toEqual([]);
    expect(runtime.who(goingOut.when, broke(start, 'p1'))).toEqual(['p1']);
  });

  it('runs a rule about a player for the first player it picks out, only in its phase', () => {
    expect(runtime.triggerSubject('playing', goingOut, start)).toBeNull();
    expect(runtime.triggerSubject('playing', goingOut, broke(start, 'p0', 'p1'))).toEqual({ player: 'p0', space: null, card: null });
    expect(runtime.triggerSubject('elsewhere', goingOut, broke(start, 'p0', 'p1'))).toBeNull();
    const fired = runtime.fireTrigger('playing', goingOut, broke(start, 'p1'));
    expect([isOut(fired, 'p0'), isOut(fired, 'p1')]).toEqual([false, true]);
  });

  it('passes over a player whose Only if lines do not hold', () => {
    const rules = compiled(TINY_BOARD.replace('    They are out.', '    Only if they have not rolled this turn.\n    They are out.'));
    const [rule] = rules.phases[0].triggers;
    const choosy = new LangRuntime(rules, lib, ['p0', 'p1']);
    const both = broke(start, 'p0', 'p1');
    expect(choosy.triggerSubject('playing', rule, both)).toEqual({ player: 'p0', space: null, card: null });
    expect(choosy.triggerSubject('playing', rule, recordAction(both, 'p0', 'roll the dice'))).toEqual({ player: 'p1', space: null, card: null });
    expect(choosy.triggerSubject('playing', rule, recordAction(broke(start, 'p0'), 'p0', 'roll the dice'))).toBeNull();
  });

  it('runs a rule about no one in particular with no player', () => {
    const duel = new LangRuntime(game, lib, ['p0', 'p1']);
    const [full] = game.phases[0].triggers;
    const twoInMiddle = arrange('p0', {}, [['5C', 'p1'], ['7C', 'p0']]);
    expect(duel.triggerSubject('play', full, twoInMiddle)).toEqual({ player: null, space: null, card: null });
    expect(duel.triggerSubject('play', full, arrange('p0', {}, [['5C', 'p1']]))).toBeNull();
    expect(duel.triggerSubject('elsewhere', full, twoInMiddle)).toBeNull();
  });

  it('runs the rules for a piece passing or landing on a space, about its player and that space', () => {
    expect(counterOf(runtime.announce(start, { kind: 'pass', seat: 'p1', space: 0 }), 'money', 'p1')).toBe(1700);
    expect(counterOf(runtime.announce(start, { kind: 'land', seat: 'p1', space: 2 }), 'money', 'p1')).toBe(1300);
    const rented = runtime.announce(setOwner(start, 1, 'p0'), { kind: 'land', seat: 'p1', space: 1 });
    expect([counterOf(rented, 'money', 'p0'), counterOf(rented, 'money', 'p1')]).toEqual([1502, 1498]);
    expect(runtime.announce(start, { kind: 'pass', seat: 'p1', space: 2 })).toEqual(start);
  });

  it('lets players press the phase’s buttons and passes the turn after the ones that end it', () => {
    const playing = flowDefFor(board, ['p0', 'p1']).phases[1];
    expect(playing).toMatchObject({
      allow: ['roll the dice', 'buy the space they are on', 'end their turn'], endTurn: { after: ['end their turn'] },
    });
  });
});

describe('a line about the player who holds a flag', () => {
  const holding = compiled(HOLDING_BOARD);
  const lend = holding.phases[0].actions.find((a) => a.words === 'lend')!;
  const seats = seatsFor(3);
  const start: GameState = { ...withBoardData(initialState(holding, 1), holding, seats), turn: { current: 'p0', phase: 'playing' } };
  const idNamed = (name: string) => start.cards.find((c) => c.data?.name === name)!.id;
  const pass = idNamed('Pass');
  const calm = idNamed('Calm');
  const FOR_LINE = HOLDING_BOARD.split('\n').indexOf('      For the player who is leading, every card in their kept cards is lent.') + 1;

  /** Each of `who` has the flag. */
  const flagged = (state: GameState, flag: string, ...who: string[]) => who.reduce((s, seat) => setPlayerFact(s, seat, flag, true), state);
  /** The seat keeps the card. */
  const keeps = (state: GameState, seat: string, id: string) => relocate(state, [id], zoneIdFor('kept cards', seat), holding);
  const isLent = (state: GameState, id: string) => cardFact(cardById(state, id)!, 'lent');
  /** The state after p0 presses lend, from `state`. */
  const lending = (state: GameState) => {
    const { engine } = createEngine(holding, lib, 3, state);
    expect(engine.dispatch({ type: 'lend', by: 'p0' }).reason).toBeUndefined();
    return engine.getState();
  };

  it('is compiled with the flag and the line it runs', () => {
    expect(compileGame(HOLDING_BOARD, lib).diagnostics).toEqual([]);
    expect(lend.effects[1]).toMatchObject({
      kind: 'lang', phrase: 'for', args: ['the rival', { kind: 'effect', phrase: 'they get {int} {counter}', args: [5, 'money'] }],
    });
  });
  it('runs the line as the player who holds the flag: “they” and “their” are that player', () => {
    const s = lending(flagged(flagged(keeps(start, 'p1', pass), 'leading', 'p1'), 'the rival', 'p2'));
    expect(isLent(s, pass)).toBe(true);
    expect(seats.map((seat) => counterOf(s, 'money', seat))).toEqual([1500, 1500, 1505]);
  });
  it('Review Focus: runs it with no move inside a card move, so “their” is the holder and not the player moving', () => {
    const runtime = new LangRuntime(holding, lib, seats);
    const state = keeps(keeps(flagged(start, 'leading', 'p1'), 'p1', pass), 'p0', calm);
    const move: MoveInfo = { verb: 'play', by: 'p0', cardId: calm, from: zoneIdFor('kept cards', 'p0'), to: 'lucky-pile' };
    const s = runtime.run(lend.effects[0], state, move, undefined, { player: 'p0', space: null, card: null });
    expect([isLent(s, pass), isLent(s, calm)]).toEqual([true, null]);
  });
  describe('keeps what the press carries: the space it picked, its amount and the player it picked', () => {
    // PICK_BOARD with a second flag players can have and a number of the game, so that a For line can name the rival and the leader.
    const head = PICK_BOARD.replace('  Players can be the rival.', '  Players can be the rival.\n  Players can be leading.\n  The game has a pot of 5.');
    /** The engine for `button` and its lines, at 3 players, from p0's turn with `arrange` applied. */
    const engineFor = (button: string[], arrange: (s: GameState) => GameState) => {
      const rules = compiled(head.replace('  A player may end their turn.', [...button, '  A player may end their turn.'].join('\n')));
      const fresh: GameState = { ...withBoardData(initialState(rules, 1), rules, seats), turn: { current: 'p0', phase: 'playing' } };
      return { rules, engine: createEngine(rules, lib, 3, arrange(fresh)).engine };
    };

    it('runs “it” as the space the press picked', () => {
      const { engine } = engineFor(
        ['  A player may seize a space the rival owns.', '    Then:', '      For the player who is leading, they own it.'],
        (s) => setPlayerFact(setPlayerFact(setOwner(s, 3, 'p1'), 'p1', 'the rival', true), 'p2', 'leading', true),
      );
      expect(engine.dispatch({ type: 'seize a space the rival owns', by: 'p0', target: 3 }).reason).toBeUndefined();
      expect(ownerOf(engine.getState(), 3)).toBe('p2');
    });
    it('runs “the amount” as the number the press carried', () => {
      const { rules, engine } = engineFor(
        ['  A player may bet an amount.', '    Then:', '      For the rival, the pot is the amount.'], (s) => setPlayerFact(s, 'p1', 'the rival', true),
      );
      expect(engine.dispatch({ type: 'bet an amount', by: 'p0', amount: 7 }).reason).toBeUndefined();
      expect(gameNumber(engine.getState(), rules, 'pot')).toBe(7);
    });
    it('runs “that player” as the player the press picked, not the holder', () => {
      const { engine } = engineFor(
        ['  A player may poke another player.', '    Then:', '      For the rival, that player is leading.'], (s) => setPlayerFact(s, 'p1', 'the rival', true),
      );
      expect(engine.dispatch({ type: 'poke another player', by: 'p0', player: 'p2' }).reason).toBeUndefined();
      expect(seats.map((seat) => playerFact(engine.getState(), seat, 'leading') === true)).toEqual([false, false, true]);
    });
  });
  describe('Review Focus: no holder, or two', () => {
    it('is an error on the For line when no player holds the flag', () => {
      const error = thrown(() => lending(flagged(start, 'the rival', 'p2')));
      expect(error).toBeInstanceOf(RuleError);
      expect(error).toMatchObject({ message: 'No player is leading.', line: FOR_LINE });
    });
    it('is an error naming them when more than one player does', () => {
      expect(() => lending(flagged(start, 'leading', 'p1', 'p2'))).toThrow('More than one player is leading: p1 and p2.');
    });
    it('passes over a player who is out', () => {
      const s = lending(flagged(markOut(flagged(keeps(start, 'p2', pass), 'leading', 'p1', 'p2'), 'p1'), 'the rival', 'p0'));
      expect(isLent(s, pass)).toBe(true);
    });
  });
});

describe('LangRuntime on rules about a card', () => {
  const CARD_GAME = (...rule: string[]) => [
    'Game: Camps', 'Players: 2', '', 'Cards:', '  A deck called creatures, starting in the deck:', '    | name   | health | copies |',
    '    | Knight | 3      | 4      |', '    | Viper  | 1      | 4      |', '  Cards can be poisoned.', '',
    'Table:', '  The deck is a pile in the center that no one can see.', '  The discard pile is a pile in the center that everyone can see.',
    '  Each player has a hand that only they can see.', '  Each player has a camp that everyone can see.', '',
    'Phase: playing', '  Players take turns.', '  A player may play a card from their hand to their camp.', ...rule.map((line) => `  ${line}`),
    '  After a player plays, the turn passes to the left.', '', 'End:', '  The game ends when the deck and every hand are empty.',
    '  The player with the most cards in their camp wins.',
  ].join('\n');
  const rules = compiled(CARD_GAME('When a card in a camp has 0 health:', '  Move it to the discard pile.'));
  const [rule] = rules.phases[0].triggers;
  const runtime = new LangRuntime(rules, lib, ['p0', 'p1']);

  /** Cards c0 to c5 put in camps with what they have; every other card stays in the deck, and it is p0's turn to play. */
  const camps = (cards: [id: string, zoneId: string, slot: number, data: { [k: string]: Json }][], over: CompiledGame = rules): GameState => {
    const start = initialState(over, 1);
    const placed = new Map(cards.map(([id, zoneId, slot, data]) => [id, { zoneId, slot, data }] as const));
    return {
      ...start,
      turn: { current: 'p0', phase: 'playing' },
      cards: start.cards.map((card) => {
        const at = placed.get(card.id);
        return at ? { ...card, zoneId: at.zoneId, slot: at.slot, faceUp: true, data: { ...card.data, ...at.data } } : card;
      }),
    };
  };
  const spent = camps([
    ['c0', 'camp-p0', 0, { health: 2 }], ['c1', 'camp-p0', 1, { health: 0, poisoned: true }], ['c2', 'camp-p1', 0, { health: 0 }],
    ['c3', 'camp-p1', 1, { health: 0, poisoned: true }], ['c4', 'hand-p0', 0, { health: 0 }], ['c5', 'discard-pile', 0, { health: 0 }],
  ]);
  const zoneOf = (state: GameState, id: string) => cardById(state, id)!.zoneId;

  it('picks out the cards a rule about cards is about, camp by camp', () => {
    expect(rule.when).toMatchObject({ kind: 'which' });
    expect(runtime.which(rule.when, spent)).toEqual(['c1', 'c2', 'c3']);
    expect(runtime.which(rule.when, camps([]))).toEqual([]);
  });

  it('runs a rule about cards for the first card it picks out, and for no player or space', () => {
    expect(runtime.triggerSubject('playing', rule, spent)).toEqual({ player: null, space: null, card: 'c1' });
    expect(runtime.triggerSubject('playing', rule, camps([]))).toBeNull();
    expect(runtime.triggerSubject('elsewhere', rule, spent)).toBeNull();
    expect(runtime.triggerSubject('playing', rule, { ...spent, turn: undefined })).toBeNull();
  });

  it('fires about that card only, which moves it with its facts', () => {
    const fired = runtime.fireTrigger('playing', rule, spent);
    expect(['c1', 'c2', 'c3'].map((id) => zoneOf(fired, id))).toEqual(['discard-pile', 'camp-p1', 'camp-p1']);
    expect(cardById(fired, 'c1')!.data).toMatchObject({ health: 0, poisoned: true });
    expect(runtime.triggerSubject('playing', rule, fired)).toEqual({ player: null, space: null, card: 'c2' });
    expect(() => runtime.fireTrigger('playing', rule, camps([]))).toThrow('The rule on line 20 was run although it does not hold.');
  });

  it('passes over a card whose Only if lines do not hold', () => {
    const choosy = compiled(CARD_GAME('When a card in a camp has 0 health:', '  Only if it is poisoned.', '  Move it to the discard pile.'));
    const [only] = choosy.phases[0].triggers;
    const asked = new LangRuntime(choosy, lib, ['p0', 'p1']);
    expect(asked.triggerSubject('playing', only, camps([['c2', 'camp-p1', 0, { health: 0 }], ['c3', 'camp-p1', 1, { health: 0, poisoned: true }]], choosy))).toEqual({ player: null, space: null, card: 'c3' });
    expect(asked.triggerSubject('playing', only, camps([['c2', 'camp-p1', 0, { health: 0 }]], choosy))).toBeNull();
  });

  it('lets the flow run the rule for every card until no card is left that it picks out', () => {
    const { engine } = createEngine(rules, lib, 2, spent);
    const settled = engine.getState();
    expect(['c1', 'c2', 'c3', 'c4', 'c5', 'c0'].map((id) => zoneOf(settled, id))).toEqual([
      'discard-pile', 'discard-pile', 'discard-pile', 'hand-p0', 'discard-pile', 'camp-p0',
    ]);
    // In the order the rule found them: c5 was already there.
    expect(zoneCards(settled, 'discard-pile').map((c) => c.id)).toEqual(['c5', 'c1', 'c2', 'c3']);
  });

  it('runs the rule after a play, and the card that was played is judged as it is then', () => {
    const state = camps([['c0', 'hand-p0', 0, { health: 0 }], ['c1', 'camp-p1', 0, { health: 1 }]]);
    const { engine } = createEngine(rules, lib, 2, state);
    expect(engine.dispatch({ type: 'play', cardId: 'c0', by: 'p0' }).ok).toBe(true);
    expect([zoneOf(engine.getState(), 'c0'), zoneOf(engine.getState(), 'c1')]).toEqual(['discard-pile', 'camp-p1']);
  });

  it('lets a move put a card in the other player\'s zone, and in no other', () => {
    const giving = compiled(CARD_GAME("A player may give a card from their hand to the other player's camp."));
    const state = camps([['c0', 'hand-p0', 0, {}], ['c1', 'hand-p1', 0, {}]], giving);
    const { engine } = createEngine(giving, lib, 2, state);
    expect(engine.dispatch({ type: 'give', cardId: 'c0', by: 'p0', toZone: 'camp-p0' })).toMatchObject({ ok: false, reason: "You can't give a card there." });
    expect(engine.dispatch({ type: 'give', cardId: 'c0', by: 'p0', toZone: 'camp-p1' }).ok).toBe(true);
    expect(zoneOf(engine.getState(), 'c0')).toBe('camp-p1');
    // On p1's turn it is the other way round.
    const second = createEngine(giving, lib, 2, { ...state, turn: { current: 'p1', phase: 'playing' } }).engine;
    expect(second.dispatch({ type: 'give', cardId: 'c1', by: 'p1', toZone: 'camp-p0' }).ok).toBe(true);
    expect(zoneOf(second.getState(), 'c1')).toBe('camp-p0');
  });

  describe('a game ends only once its rules about cards have settled', () => {
    // Every card is somewhere but the deck and p1's hand, which are empty: once p0 plays c0 the End line holds. p0 then has
    // c1 and c0 in their camp, p1 has c2 and c3, and a tie goes to p0, unless c0 is at 0 health and the rule moves it away.
    const lastPlay = (health: number): GameState => camps([
      ['c0', 'hand-p0', 0, { health }], ['c1', 'camp-p0', 0, {}], ['c2', 'camp-p1', 0, {}], ['c3', 'camp-p1', 1, {}],
      ['c4', 'discard-pile', 0, {}], ['c5', 'discard-pile', 1, {}], ['c6', 'discard-pile', 2, {}], ['c7', 'discard-pile', 3, {}],
    ]);

    it('counts the table as the rule left it: the card it moved is not in the camp that decides the game', () => {
      const { engine } = createEngine(rules, lib, 2, lastPlay(0));
      expect(engine.dispatch({ type: 'play', cardId: 'c0', by: 'p0' }).ok).toBe(true);
      expect(zoneOf(engine.getState(), 'c0')).toBe('discard-pile');
      expect(engine.getState().result).toEqual({ winner: 'p1' });
    });

    it('ends at once when no card is left for the rule to move', () => {
      const { engine } = createEngine(rules, lib, 2, lastPlay(3));
      expect(engine.dispatch({ type: 'play', cardId: 'c0', by: 'p0' }).ok).toBe(true);
      expect(zoneOf(engine.getState(), 'c0')).toBe('camp-p0');
      expect(engine.getState().result).toEqual({ winner: 'p0' });
    });

    it('waits only for rules about cards: other games keep their plain End condition', () => {
      const params = { when: rules.end!.when, rules: [{ phase: 'playing', trigger: rule }] };
      expect(flowDefFor(rules, ['p0', 'p1']).end).toEqual([{ when: { name: 'lang:end-when', params }, result: 'lang:result' }]);
      // A plain rule (the Test Duel's) and a rule about a player (Rent Day's) do not hold the End back.
      expect(flowDefFor(game, ['p0', 'p1']).end![0].when).toEqual({ name: 'lang:cond', params: game.end!.when });
      const rentDay = compiled(RENT_DAY);
      expect(rentDay.phases.some((p) => p.triggers.some((t) => t.when.kind === 'who'))).toBe(true);
      expect(flowDefFor(rentDay, ['p0', 'p1']).end![0].when).toEqual({ name: 'lang:cond', params: rentDay.end!.when });
    });
  });

  it('reports a rule whose lines never stop it holding in plain words', () => {
    const stuck = compiled(CARD_GAME('When a card in a camp has 0 health:', '  Every card in each camp is poisoned.'));
    const error = thrown(() => createEngine(stuck, lib, 2, camps([['c0', 'camp-p0', 0, { health: 0 }]], stuck)));
    expect(friendlyError(error)).toBe('The rule on line 20 (“When a card in a camp has 0 health”) keeps firing. Its effects must change what it checks.');
  });
});

describe('LangRuntime.columnValue', () => {
  // The lines of a column's section each take what the line before made of the table's cell, about the space and no player.
  const seen: unknown[] = [];
  const library = createDefaultLibrary()
    .column('add {int}', (_env, [n], value) => (value ?? 0) + (n as number))
    .column('double it', (_env, _args, value) => (value === null ? null : value * 2))
    .column('add its place', (env, _args, value) => {
      seen.push(env.subject);
      return (value ?? 0) + (env.subject?.space ?? 0);
    })
    .column('give up', () => {
      throw new RuleError('Not for this space.');
    });
  const withSection = (...lines: string[]) => compiled(`${TINY_BOARD}\n\nTax:\n${lines.map((line) => `  ${line}`).join('\n')}`, library);
  const start = (rules: CompiledGame): GameState => ({ ...withBoardData(initialState(rules, 1), rules, ['p0', 'p1']), turn: { current: 'p0', phase: 'playing' } });
  const rules = withSection('Add 5.', 'Double it.', 'Add its place.');
  const runtime = new LangRuntime(rules, library, ['p0', 'p1']);

  it('runs the lines of the column in order, each on what the one before made of the cell', () => {
    // Income Tax is the third space and has a tax of 200.
    expect(runtime.columnValue(start(rules), 2, 'tax')).toBe((200 + 5) * 2 + 2);
    // A blank cell starts from nothing.
    expect(runtime.columnValue(start(rules), 1, 'tax')).toBe(5 * 2 + 1);
  });
  it('gives each line the space and no one else, whatever the state', () => {
    seen.length = 0;
    runtime.columnValue(start(rules), 3, 'tax');
    expect(seen).toEqual([{ player: null, space: 3, card: null }]);
  });
  it('is the table’s cell for a column no section is about: a number, or nothing when it is blank', () => {
    expect(runtime.columnValue(start(rules), 1, 'price')).toBe(60);
    expect(runtime.columnValue(start(rules), 0, 'price')).toBeNull();
    expect(runtime.columnValue(start(rules), 0, 'nothing')).toBeNull();
  });
  it('names the space when the cell is text', () => {
    expect(() => runtime.columnValue(start(rules), 1, 'color')).toThrow("Mill Lane's color isn't a number.");
  });
  it('reads a game with no columns at all as its cells', () => {
    const plain = compiled(TINY_BOARD);
    expect(new LangRuntime(plain, library, ['p0', 'p1']).columnValue(start(plain), 2, 'tax')).toBe(200);
  });
  it('says on which line of the section a line gave up', () => {
    const failing = withSection('Add 5.', 'Give up.');
    const attempt = () => new LangRuntime(failing, library, ['p0', 'p1']).columnValue(start(failing), 2, 'tax');
    expect(attempt).toThrow('Not for this space.');
    expect(attempt).toThrow(expect.objectContaining({ line: failing.columns.tax[1].line, text: 'Give up' }));
  });
  it('refuses a line nobody has written a phrase for when it is reached', () => {
    const missing = withSection('Add 5.', 'Halve it.');
    const attempt = () => new LangRuntime(missing, library, ['p0', 'p1']).columnValue(start(missing), 2, 'tax');
    expect(attempt).toThrow(MissingPhraseError);
  });
  it('is what a phrase sees as its own way of reading a space’s details', () => {
    expect(runtime.env(start(rules)).columnValue?.(start(rules), 2, 'tax')).toBe((200 + 5) * 2 + 2);
  });
});
