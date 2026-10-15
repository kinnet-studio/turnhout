import { describe, expect, it } from 'vitest';
import { cardById, zoneCards, type GameState } from '../game-state';
import type { PlayerId } from '../scene';
import type { Json } from '../table-def';
import { counterOf, isOut, recordAction, setCounter, setOwner, withBoardData } from './board-state';
import { createEngine, flowDefFor, initialState, seatsFor, tableDefFor } from './build';
import { compileGame } from './compile';
import { MissingPhraseError, RuleError } from './diagnostics';
import { friendlyError } from './friendly';
import { createDefaultLibrary } from './library';
import { LangRuntime } from './runtime';
import { TEST_DUEL, TINY_BOARD } from './testing';
import type { CompiledGame, ExampleEnv, MoveInfo, PhraseRef } from './types';
import { matchesCard } from './zones';

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
    expect(runtime.env(start, undefined, undefined, { player: 'p1', space: 2 }).subject).toEqual({ player: 'p1', space: 2 });
    const move: MoveInfo = { verb: 'play', by: 'p1', cardId: 'c1', from: 'hand-p1', to: 'middle' };
    expect(runtime.env(start, move).subject).toEqual({ player: 'p1', space: null });
    expect(runtime.env(start).subject).toBeUndefined();
  });

  it('picks out the players a rule about a player is about', () => {
    expect(runtime.who(goingOut.when, start)).toEqual([]);
    expect(runtime.who(goingOut.when, broke(start, 'p1'))).toEqual(['p1']);
  });

  it('runs a rule about a player for the first player it picks out, only in its phase', () => {
    expect(runtime.triggerSubject('playing', goingOut, start)).toBeNull();
    expect(runtime.triggerSubject('playing', goingOut, broke(start, 'p0', 'p1'))).toEqual({ player: 'p0', space: null });
    expect(runtime.triggerSubject('elsewhere', goingOut, broke(start, 'p0', 'p1'))).toBeNull();
    const fired = runtime.fireTrigger('playing', goingOut, broke(start, 'p1'));
    expect([isOut(fired, 'p0'), isOut(fired, 'p1')]).toEqual([false, true]);
  });

  it('passes over a player whose Only if lines do not hold', () => {
    const rules = compiled(TINY_BOARD.replace('    They are out.', '    Only if they have not rolled this turn.\n    They are out.'));
    const [rule] = rules.phases[0].triggers;
    const choosy = new LangRuntime(rules, lib, ['p0', 'p1']);
    const both = broke(start, 'p0', 'p1');
    expect(choosy.triggerSubject('playing', rule, both)).toEqual({ player: 'p0', space: null });
    expect(choosy.triggerSubject('playing', rule, recordAction(both, 'p0', 'roll', false))).toEqual({ player: 'p1', space: null });
    expect(choosy.triggerSubject('playing', rule, recordAction(broke(start, 'p0'), 'p0', 'roll', false))).toBeNull();
  });

  it('runs a rule about no one in particular with no player', () => {
    const duel = new LangRuntime(game, lib, ['p0', 'p1']);
    const [full] = game.phases[0].triggers;
    const twoInMiddle = arrange('p0', {}, [['5C', 'p1'], ['7C', 'p0']]);
    expect(duel.triggerSubject('play', full, twoInMiddle)).toEqual({ player: null, space: null });
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
    expect(playing).toMatchObject({ allow: ['roll', 'buy', 'end'], endTurn: { after: ['end'] } });
  });
});
