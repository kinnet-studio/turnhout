import { describe, expect, it } from 'vitest';
import type { GameState } from '../game-state';
import { actingPlayer, NO_ACTION_WAITING, WINDOW_KEY, type Waiting } from './action-window';
import { flowDefFor, initialState, seatsFor } from './build';
import { zoneCards, cardById } from '../game-state';
import type { Move } from '../moves';
import { waitingOf } from './action-window';
import { counterOf, didThisTurn, interruptedTurn, markOut, setCounter, withBoardData } from './board-state';
import { createEngine } from './build';
import { runExamples } from './examples';
import { ROUND_KEY, TURN_OF_KEY, markTurnStarted, roundFinished } from './turns';
import { relocate } from './zones';
import { makeCard } from './cards';
import { compileGame } from './compile';
import { createDefaultLibrary } from './library';
import { CREW_GAME, OBJECT_GAME, fixtureEnv, runPhrase } from './testing';
import type { CompiledGame } from './types';
import { isOut } from './board-state';
import { LangRuntime } from './runtime';
import { START_PLAYER_KEY } from './turns';

const lib = createDefaultLibrary();
const SEATS = seatsFor(3);
const lineOf = (text: string, line: string) => text.split('\n').indexOf(line) + 1;
const errorsOf = (text: string) => compileGame(text, lib).diagnostics.filter((d) => d.severity === 'error');
function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  expect(diagnostics).toEqual([]);
  return game!;
}
/** `text` with `line` put in after `after`, which must be there. */
function withLine(text: string, after: string, line: string): string {
  expect(text.split('\n')).toContain(after);
  return text.split('\n').flatMap((l) => (l === after ? [l, line] : [l])).join('\n');
}
const swap = (text: string, from: string, to: string) => {
  expect(text).toContain(from);
  return text.replace(from, to);
};

const WINDOW =
  '  Before an action goes ahead, each player who has a card in their holdings whose maker is the player acting has the objection, in turn from the left of the player acting.';
const WINDOW_TWICE = 'There is already a line saying who may answer an action before it goes ahead.';
const WINDOW_AT_ONCE = (phase: string) => `The players answer an action in turn, so “${phase}” can't be a phase where everyone acts at once.`;
const WINDOW_GO_TO = (phase: string) => `The players answer an action in the ${phase} in turn, so it can't go to another phase: pass it on with `
  + `“The ${phase} passes to the left.”, or stop the action with “The action does not go ahead.”`;
const WINDOW_AFTER = (phase: string) => `The players answer an action in the ${phase} in turn, so it can't have an After line: pass it on with `
  + `“The ${phase} passes to the left.”`;
const WINDOW_COST = (phase: string) => `The players answer an action in the ${phase}, so a button there can't cost anything: an answer is no action.`;
const WINDOW_FIRST = (phase: string) => `The ${phase} is only for answering an action, so it can't be the game's first phase.`;
const WINDOW_IS_STEPS = (phase: string) => `The ${phase} is where players answer an action, so it can't also be where they take steps in turn.`;
const AFTER_NAMES_ACTION = 'Players may answer an action that costs something before it goes ahead, so an After line can\'t name one: '
  + 'write “The turn passes to the left.” in its Then: lines instead.';
const WINDOW_READS_HIDDEN = (zone: string) =>
  `Every player sees who is asked to answer an action, so whether a player is asked can't depend on ${zone}, which not everyone can see.`;
const ACTING_ELSEWHERE = (clean: string) =>
  `“${clean}” only makes sense while an action waits for the players to answer it: in the phase where they answer it, or in the line that says who does.`;
/** The flow's name for the rule that closes an answered action (`build.ts`). */
const WINDOW_RULE = 'an action is answered';
const WINDOW_ENTERED = (phase: string) => `The players go to the ${phase} only to answer an action, so no line can go to it.`;
const at = (text: string, line: string) => lineOf(text, line);
const only = (text: string) => errorsOf(text).map((d) => [d.line, d.message]);

describe('the line and its refusals', () => {
  describe('compiled', () => {
    it('is the OBJECT_GAME', () => {
      for (const found of ['  A player may stop.', 'Phase: working', 'End:']) expect(OBJECT_GAME).toContain(found);
      expect(OBJECT_GAME).toContain(WINDOW);
    });
    it('compiles with no problems, and no phase left unreached', () => expect(compileGame(OBJECT_GAME, lib).diagnostics).toEqual([]));
    it('keeps the window: its phase, its line and its clause', () => {
      const answering = compiled(OBJECT_GAME).everyPhase.window!;
      expect(answering).toMatchObject({ phase: 'objection', line: lineOf(OBJECT_GAME, WINDOW) });
      expect(answering.who.phrase).toBe('they have a card in {zones} whose {cardfilter}');
      expect(answering.who.args[1]).toEqual({ names: 'maker', player: 'acting' });
    });
    it('(guard) gives a game without one no window', () => {
      const crew = compiled(CREW_GAME);
      expect(crew.everyPhase).not.toHaveProperty('window');
      expect((flowDefFor(crew, SEATS).triggers ?? []).map((trigger) => trigger.id)).not.toContain(WINDOW_RULE);
      // A game with one closes an answered action ahead of every other rule.
      expect(flowDefFor(compiled(OBJECT_GAME), SEATS).triggers?.[0]?.id).toBe(WINDOW_RULE);
    });
  });

  describe('refused when the rules are read', () => {
    it('refuses a second window line', () => {
      const text = withLine(OBJECT_GAME, WINDOW, WINDOW);
      expect(only(text)).toEqual([[lineOf(OBJECT_GAME, WINDOW) + 1, WINDOW_TWICE]]);
    });
    it('names a phase the game does not have', () => {
      const text = swap(OBJECT_GAME, 'has the objection, in turn', 'has the objectoin, in turn');
      expect(only(text).map(([, m]) => m)).toContain('There is no phase called “objectoin”.');
    });
    it('refuses a phase where everyone acts at once', () => {
      const text = swap(OBJECT_GAME, 'Phase: objection\n  Players take turns.', 'Phase: objection\n  Everyone acts at once.');
      expect(only(text)).toContainEqual([lineOf(text, WINDOW), WINDOW_AT_ONCE('objection')]);
    });
    it('refuses a go-to line in it', () => {
      const line = '  When they have at least 5 coins, go to working.';
      const text = withLine(OBJECT_GAME, 'Phase: objection', line);
      expect(only(text)).toContainEqual([at(text, line), WINDOW_GO_TO('objection')]);
    });
    it('refuses an After line in it', () => {
      const line = '  After a player lets it go, the turn passes to the left.';
      const text = withLine(OBJECT_GAME, '      The objection passes to the left.', line);
      expect(only(text)).toContainEqual([at(text, line), WINDOW_AFTER('objection')]);
    });
    it('refuses a window no line passes on, as an error', () => {
      const text = swap(OBJECT_GAME, '      The objection passes to the left.', '      They get 1 coin.');
      expect(only(text)).toContainEqual([lineOf(text, WINDOW),
        "No line passes the objection on to the next player, so the first player's objection would never end. Write “The objection passes to the left.” where a player's objection ends."]);
    });
    it('refuses a cost on an answer', () => {
      const text = withLine(OBJECT_GAME, '  A player may let it go.', '    It costs 1 move.');
      expect(only(text)).toContainEqual([lineOf(text, '  A player may let it go.') + 1, WINDOW_COST('objection')]);
    });
    it('refuses it as the first phase', () => {
      const objection = OBJECT_GAME.slice(OBJECT_GAME.indexOf('Phase: objection'), OBJECT_GAME.indexOf('Phase: answer'));
      const text = OBJECT_GAME.replace(objection, '').replace('Phase: working', `${objection}Phase: working`);
      expect(only(text)).toContainEqual([lineOf(text, WINDOW), WINDOW_FIRST('objection')]);
    });
    it('refuses an After line naming a button with a cost', () => {
      const line = '  After a player hires, the turn passes to the left.';
      const text = withLine(OBJECT_GAME, '      Their moves go back to 0.', line);
      expect(only(text)).toContainEqual([at(text, line), AFTER_NAMES_ACTION]);
    });
    it('refuses it as the phase of the steps before the score', () => {
      const text = withLine(OBJECT_GAME, 'End:', '  Before the score, each player has the objection, in turn from the start player.');
      expect(only(text)).toContainEqual([lineOf(text, WINDOW), WINDOW_IS_STEPS('objection')]);
    });
    it('refuses a clause reading a zone not everyone sees (Review Focus)', () => {
      const stash = swap(OBJECT_GAME, 'who has a card in their holdings whose maker is the player acting has', 'who has a card in their stash whose name is Vase has');
      expect(only(stash)).toContainEqual([lineOf(OBJECT_GAME, WINDOW), WINDOW_READS_HIDDEN('their stash')]);
      const dusty = [swap(OBJECT_GAME, 'who has a card in their holdings whose maker is the player acting has', 'who has a card in their holdings that is dusty has'),
        '', 'Dusty:', '  Only if it is a Stake card.', '  Only if the pile is not empty.'].join('\n');
      expect(only(dusty)).toContainEqual([lineOf(OBJECT_GAME, WINDOW), WINDOW_READS_HIDDEN('the pile')]);
      // (amendment) A worked flag that tests what a shared zone holds reads it too.
      const holds = swap(dusty, '  Only if the pile is not empty.', '  Only if the pile has a Vase.');
      expect(only(holds)).toContainEqual([lineOf(OBJECT_GAME, WINDOW), WINDOW_READS_HIDDEN('the pile')]);
    });
    it('refuses the player acting, and the stopping line, anywhere else', () => {
      const start = withLine(OBJECT_GAME, '  A player may start a card in their stash.', '    Only if it is a card whose maker is the player acting.');
      expect(only(start)).toContainEqual([lineOf(start, '  A player may start a card in their stash.') + 1,
        ACTING_ELSEWHERE('it is a card whose maker is the player acting')]);
      const stop = OBJECT_GAME.replace('  A player may stop.\n    Then:\n', '  A player may stop.\n    Then:\n      The action does not go ahead.\n');
      expect(stop).not.toBe(OBJECT_GAME);
      expect(only(stop)).toContainEqual([lineOf(stop, '      The action does not go ahead.'), ACTING_ELSEWHERE('The action does not go ahead')]);
    });
  });

  describe('refused: going into the window phase, or leaving it but by its own words', () => {
    const exactly = (text: string, line: string, message: string) => expect(only(text)).toEqual([[lineOf(text, line), message]]);
    it('refuses a line elsewhere that goes to it', () => {
      const line = '      Go to objection.';
      exactly(withLine(OBJECT_GAME, '      Their moves go back to 0.', line), line, WINDOW_ENTERED('objection'));
    });
    it('refuses a line elsewhere that starts it', () => {
      const line = '      The objection phase starts with them.';
      exactly(withLine(OBJECT_GAME, '      Their moves go back to 0.', line), line, WINDOW_ENTERED('objection'));
    });
    it("refuses another phase's go-to rule naming it", () => {
      const line = '  When they have at least 5 coins, go to objection.';
      exactly(withLine(OBJECT_GAME, 'Phase: working', line), line, WINDOW_ENTERED('objection'));
    });
    it('refuses only its first-phase problem, on the window line, when it comes first', () => {
      const objection = OBJECT_GAME.slice(OBJECT_GAME.indexOf('Phase: objection'), OBJECT_GAME.indexOf('Phase: answer'));
      const text = OBJECT_GAME.replace(objection, '').replace('Phase: working', `${objection}Phase: working`);
      expect(only(text).filter(([, message]) => message === WINDOW_ENTERED('objection'))).toEqual([]);
      expect(only(text)).toContainEqual([lineOf(text, WINDOW), WINDOW_FIRST('objection')]);
    });
    it('refuses a line of its own that starts another phase', () => {
      // The call button in working says the same, and is not refused: the line is the one after the objection's move.
      const text = withLine(OBJECT_GAME, "      Move it to its maker's purse.", '      The answer phase starts with its owner.');
      expect(only(text)).toEqual([[lineOf(text, "      Move it to its maker's purse.") + 1, WINDOW_GO_TO('objection')]]);
    });
    it('refuses a line of its own that goes back to an interrupted turn', () => {
      const line = '      Go back to the interrupted turn.';
      exactly(withLine(OBJECT_GAME, '      The objection passes to the left.', line), line, WINDOW_GO_TO('objection'));
    });
    it("(guard) leaves the game's own lines that start the answer phase and go back from it", () => {
      expect(compileGame(OBJECT_GAME, lib).diagnostics).toEqual([]);
    });
    it('throws, as a mistake in the code, when an action would wait while another waits', () => {
      const game = compiled(OBJECT_GAME);
      const waiting = { phase: 'objection', by: 'p0', from: 'working', move: 'stop', subject: { player: 'p0', space: null, card: null },
        asked: ['p1'], at: 0, back: { phase: 'working', current: 'p0', log: null, rolls: null } } satisfies Waiting;
      const base = initialState(game, 1);
      const open: GameState = { ...base, turn: { current: 'p1', phase: 'objection' }, data: { ...base.data, [WINDOW_KEY]: waiting } };
      const runtime = new LangRuntime(game, lib, SEATS);
      const another = { by: 'p1', from: 'working', move: 'stop', subject: { player: 'p1', space: null, card: null }, asked: ['p2'] };
      expect(() => runtime.openWindow(open, another)).toThrow('An action waited while another was waiting.');
    });
  });

  describe('refused: a clause reading what not everyone sees, through counters and values', () => {
    const CLAUSE = 'who has a card in their holdings whose maker is the player acting has';
    const hiddenCoins = swap(OBJECT_GAME, 'Each player has 9 coins that everyone can see.', 'Each player has 9 coins that only they can see.');
    it('refuses a counter only its owner sees', () => {
      const text = swap(hiddenCoins, CLAUSE, 'who has at least 5 coins has');
      expect(only(text)).toEqual([[lineOf(OBJECT_GAME, WINDOW), WINDOW_READS_HIDDEN('their coins')]]);
    });
    it('(guard) takes a counter everyone sees', () => {
      expect(compileGame(swap(OBJECT_GAME, CLAUSE, 'who has at least 5 coins has'), lib).diagnostics).toEqual([]);
    });
    it('refuses a counter only its owner sees, read through a worked flag', () => {
      // No line of a value about a player reads a counter; a worked flag's condition can.
      const text = [swap(hiddenCoins, CLAUSE, 'who has a card in their holdings that is dusty has'),
        '', 'Dusty:', '  Only if it is a Stake card.', '  Only if no player has less than 5 coins.'].join('\n');
      expect(only(text)).toEqual([[lineOf(OBJECT_GAME, WINDOW), WINDOW_READS_HIDDEN('their coins')]]);
    });
    it('reads a worked value through itself, or two through each other, once each', () => {
      const dusty = (...lines: string[]) => [swap(OBJECT_GAME, CLAUSE, 'who has a card in their holdings that is dusty has'),
        '', 'Dusty:', '  Only if it is a Stake card.', ...lines].join('\n');
      expect(only(dusty('  Only if it is dusty.', '  Only if the pile is not empty.')))
        .toEqual([[lineOf(OBJECT_GAME, WINDOW), WINDOW_READS_HIDDEN('the pile')]]);
      expect(only(dusty('  Only if it is musty.', '', 'Musty:', '  Only if it is dusty.', '  Only if the pile is not empty.')))
        .toEqual([[lineOf(OBJECT_GAME, WINDOW), WINDOW_READS_HIDDEN('the pile')]]);
      expect(only(dusty('  Only if it is musty.', '', 'Musty:', '  Only if it is dusty.'))).toEqual([]);
    });
  });

  describe('the phrases on a hand-made window', () => {
    const game = compiled(OBJECT_GAME);
    const waiting = { phase: 'objection', by: 'p0', from: 'working', move: 'stop', subject: { player: 'p0', space: null, card: null },
      asked: ['p1'], at: 0, back: { phase: 'working', current: 'p0', log: null, rolls: null } } satisfies Waiting;
    const base = makeCard(initialState(game, 1), game, { name: 'Stake', maker: 'p0' }, 'holdings-p1')!.state;
    const open: GameState = { ...base, data: { ...base.data, [WINDOW_KEY]: waiting } };
    const about = (state: GameState, player: string) =>
      fixtureEnv(state, { game, seats: SEATS, subject: { player, space: null, card: null } });
    it('reads the player acting', () => expect(actingPlayer(open)).toBe('p0'));
    it('asks a player holding their stake, and not another', () => {
      const clause = 'they have a card in their holdings whose maker is the player acting';
      expect(runPhrase(lib, 'condition', clause, about(open, 'p1'))).toBe(true);
      expect(runPhrase(lib, 'condition', clause, about(open, 'p2'))).toBe(false);
    });
    it('stops the action', () => {
      const stopped = runPhrase<GameState>(lib, 'effect', 'the action does not go ahead', about(open, 'p1'));
      expect(stopped.data[WINDOW_KEY]).toMatchObject({ verdict: 'stopped' });
    });
    it('throws with no action waiting', () => {
      expect(() => runPhrase(lib, 'effect', 'the action does not go ahead', about(base, 'p1'))).toThrow(NO_ACTION_WAITING);
      expect(() => actingPlayer(base)).toThrow(NO_ACTION_WAITING);
    });
  });
});

describe('the window played', () => {
  const objectGame = compiled(OBJECT_GAME);
  type Prepare = (state: GameState) => GameState;
  /** A 3-player engine whose turn is p0's in working, p0's turn started; the Vase is in p0's workshop. */
  function table(game = objectGame, prepare: Prepare = (state) => state) {
    const fresh = initialState(game, 1);
    const vase = fresh.cards.find((card) => card.data?.name === 'Vase')!.id;
    const start = withBoardData({ ...relocate(fresh, [vase], 'workshop-p0', game), turn: { current: 'p0', phase: 'working' } }, game, SEATS);
    return createEngine(game, lib, 3, prepare(markTurnStarted(start))).engine;
  }
  type Engine = ReturnType<typeof table>;
  const base = initialState(objectGame, 1);
  const vase = base.cards.find((card) => card.data?.name === 'Vase')!.id;
  const potter = zoneCards(base, 'hall').find((card) => card.data?.name === 'Potter')!.id;
  /** Stakes of `maker` in each zone, made in order. */
  const stake = (maker: string, ...zones: string[]): Prepare => (state) =>
    zones.reduce((s, zone) => makeCard(s, objectGame, { name: 'Stake', maker }, zone)!.state, state);
  const stakesIn = (state: GameState, zoneId: string) => zoneCards(state, zoneId).filter((card) => card.data?.name === 'Stake');
  const HIRE = 'hire some cards from the hall to a card in their workshop';
  const hire = (engine: Engine, by = 'p0') => engine.dispatch({ type: HIRE, by, cardIds: [potter], onto: vase });
  const press = (engine: Engine, type: string, by: string, extra: Partial<Move> = {}) => {
    const result = engine.dispatch({ type, by, ...extra } as Move);
    expect(result.reason, `${by} ${type}`).toBeUndefined();
    return engine.getState();
  };
  const LET_GO = 'let it go';
  const OBJECT = 'object with a card in their holdings';
  const moves = (state: GameState, seat: string) => counterOf(state, 'moves', seat);
  const then = (...prepares: Prepare[]): Prepare => (state) => prepares.reduce((s, p) => p(s), state);

  describe('a stopped action', () => {
    const prepare = stake('p0', 'holdings-p1');
    it('waits for p1, with the press paid for and nothing moved', () => {
      const engine = table(objectGame, prepare);
      expect(hire(engine).reason).toBeUndefined();
      const state = engine.getState();
      expect([state.turn?.phase, state.turn?.current, moves(state, 'p0')]).toEqual(['objection', 'p1', 2]);
      expect(cardById(state, potter)?.zoneId).toBe('hall');
      expect(waitingOf(state)).toMatchObject({ by: 'p0', from: 'working', asked: ['p1'], at: 0, back: { phase: 'working', current: 'p0' } });
      // (amendment) The flow's phase gate answers first: stop is no button of the objection. An answer of p0's is refused as not their turn.
      expect(engine.dispatch({ type: 'stop', by: 'p0' })).toMatchObject({ ok: false, reason: 'move stop not allowed in phase objection' });
      expect(engine.dispatch({ type: LET_GO, by: 'p0' })).toMatchObject({ ok: false, reason: "not p0's turn" });
    });
    it('stops when p1 objects, and gives the turn back', () => {
      const engine = table(objectGame, prepare);
      hire(engine);
      const stakeId = stakesIn(engine.getState(), 'holdings-p1')[0].id;
      const state = press(engine, OBJECT, 'p1', { cardId: stakeId });
      expect(cardById(state, stakeId)?.zoneId).toBe('purse-p0');
      expect(cardById(state, stakeId)?.data).not.toHaveProperty('lang:on');
      expect([state.turn?.phase, state.turn?.current, moves(state, 'p0')]).toEqual(['working', 'p0', 2]);
      expect(cardById(state, potter)?.zoneId).toBe('hall');
      expect(state.data).not.toHaveProperty(WINDOW_KEY);
      expect(state.data[TURN_OF_KEY]).toBe('p0');
      expect(didThisTurn(state, 'p0', HIRE)).toBe(true);
    });
  });

  describe('an action that goes ahead', () => {
    const prepare = stake('p0', 'holdings-p1', 'holdings-p2');
    it('asks p1 then p2, and goes ahead once both let it go', () => {
      const engine = table(objectGame, prepare);
      hire(engine);
      expect(waitingOf(engine.getState())?.asked).toEqual(['p1', 'p2']);
      let state = press(engine, LET_GO, 'p1');
      expect([state.turn?.current, waitingOf(state)?.at]).toEqual(['p2', 1]);
      state = press(engine, LET_GO, 'p2');
      expect(cardById(state, potter)).toMatchObject({ zoneId: 'crew-p0', data: expect.objectContaining({ 'lang:on': vase }) });
      expect([state.turn?.phase, state.turn?.current, moves(state, 'p0')]).toEqual(['working', 'p0', 2]);
    });
    it('asks from the left of the player acting', () => {
      // (amendment) p1 hires to a job of their own: the Statue in their workshop.
      const statue = base.cards.find((card) => card.data?.name === 'Statue')!.id;
      const engine = table(objectGame, then(stake('p1', 'holdings-p2', 'holdings-p0'), (s) => relocate(s, [statue], 'workshop-p1', objectGame),
        (s) => markTurnStarted({ ...s, turn: { current: 'p1', phase: 'working' } })));
      expect(engine.dispatch({ type: HIRE, by: 'p1', cardIds: [potter], onto: statue }).reason).toBeUndefined();
      expect(waitingOf(engine.getState())?.asked).toEqual(['p2', 'p0']);
    });
  });

  describe('no window', () => {
    it('hires at once with no stake held', () => {
      const engine = table();
      hire(engine);
      expect(cardById(engine.getState(), potter)?.zoneId).toBe('crew-p0');
      expect(engine.getState().data).not.toHaveProperty(WINDOW_KEY);
    });
    it('starts a card at once: a button with no cost is never answered', () => {
      // (amendment) Setup is skipped, so the stash is empty: a job is put there.
      const statue = base.cards.find((card) => card.data?.name === 'Statue')!.id;
      const engine = table(objectGame, then(stake('p0', 'holdings-p1'), (s) => relocate(s, [statue], 'stash-p0', objectGame)));
      const card = zoneCards(engine.getState(), 'stash-p0')[0];
      expect(card).toBeDefined();
      press(engine, 'start a card in their stash', 'p0', { cardId: card.id });
      expect(cardById(engine.getState(), card.id)?.zoneId).toBe('workshop-p0');
    });
  });

  it("lets the maker answer a trade of their own stake (R2's shape)", () => {
    const engine = table(objectGame, then(stake('p1', 'holdings-p0'), stake('p0', 'holdings-p1'), (s) => ({ ...s, turn: { current: 'p1', phase: 'working' } })));
    const before = engine.getState();
    const own = stakesIn(before, 'holdings-p1')[0].id;
    const theirs = stakesIn(before, 'holdings-p0')[0].id;
    press(engine, 'sell a card in their holdings', 'p1', { cardId: own });
    expect(waitingOf(engine.getState())?.asked).toEqual(['p0']);
    const state = press(engine, OBJECT, 'p0', { cardId: theirs });
    expect(cardById(state, theirs)?.zoneId).toBe('purse-p1');
    expect(cardById(state, own)?.zoneId).toBe('holdings-p1');
    expect(zoneCards(state, 'scrap')).toEqual(zoneCards(before, 'scrap'));
    expect(moves(state, 'p1')).toBe(2);
  });

  describe('Review Focus', () => {
    it('asks no seat that is out', () => {
      const engine = table(objectGame, then(stake('p0', 'holdings-p1', 'holdings-p2'), (s) => markOut(s, 'p2')));
      hire(engine);
      expect(waitingOf(engine.getState())?.asked).toEqual(['p1']);
    });
    it('passes the turn after the last move, once the window closes', () => {
      for (const answer of ['let', 'object'] as const) {
        const engine = table(objectGame, then(stake('p0', 'holdings-p1'), (s) => setCounter(s, 'moves', 'p0', 1)));
        hire(engine);
        expect(moves(engine.getState(), 'p0')).toBe(0);
        const stakeId = stakesIn(engine.getState(), 'holdings-p1')[0].id;
        const state = answer === 'let' ? press(engine, LET_GO, 'p1') : press(engine, OBJECT, 'p1', { cardId: stakeId });
        if (answer === 'let') expect(cardById(state, potter)?.data?.['lang:on']).toBe(vase);
        expect([answer, state.turn?.current, state.data[TURN_OF_KEY]]).toEqual([answer, 'p1', 'p1']);
      }
    });
    it('keeps the choices of the press', () => {
      const TIDY = 'tidy a card in their workshop';
      const tired = table(objectGame, stake('p0', 'holdings-p1'));
      press(tired, TIDY, 'p0', { cardId: vase, choices: ['Tire'] });
      expect(cardById(press(tired, LET_GO, 'p1'), vase)?.data?.tired).toBe(true);
      const paid = table(objectGame, stake('p0', 'holdings-p1'));
      press(paid, TIDY, 'p0', { cardId: vase, choices: ['Pay'] });
      expect(counterOf(press(paid, LET_GO, 'p1'), 'coins', 'p0')).toBe(10);
    });
    it('starts another phase once the action goes ahead', () => {
      const engine = table(objectGame, stake('p0', 'holdings-p1', 'holdings-p2'));
      const called = stakesIn(engine.getState(), 'holdings-p1')[0].id;
      press(engine, "call a card in another player's holdings", 'p0', { cardId: called });
      press(engine, LET_GO, 'p1');
      const state = press(engine, LET_GO, 'p2');
      expect([state.turn?.phase, state.turn?.current]).toEqual(['answer', 'p1']);
      expect(interruptedTurn(state)).toMatchObject({ phase: 'working', current: 'p0' });
      const back = press(engine, 'refuse', 'p1');
      expect([back.turn?.phase, back.turn?.current]).toEqual(['working', 'p0']);
    });
    it('undoes and replays', () => {
      const prepare = stake('p0', 'holdings-p1', 'holdings-p2');
      const engine = table(objectGame, prepare);
      hire(engine);
      press(engine, LET_GO, 'p1');
      const replayed = table(objectGame, prepare);
      replayed.loadLog([...engine.getLog()]);
      expect(replayed.getState()).toEqual(engine.getState());
      engine.undo();
      expect([engine.getState().turn?.current, waitingOf(engine.getState())?.at]).toEqual(['p1', 0]);
    });
    it('finishes no round while an action waits', () => {
      // The turn is back with the start player, p0, whose turn has not started again: but for the waiting action, the round is finished.
      const finished: GameState = {
        ...base, turn: { current: 'p0', phase: 'working' },
        data: { ...base.data, [START_PLAYER_KEY]: 'p0', [ROUND_KEY]: 1, [TURN_OF_KEY]: 'p2' },
      };
      expect(roundFinished({ ...finished, data: { ...finished.data, [WINDOW_KEY]: { by: 'p2' } } }, SEATS)).toBe(false);
      expect(finished.data).not.toHaveProperty(WINDOW_KEY);
      expect(roundFinished(finished, SEATS)).toBe(true);
    });
  });

  describe('refused while playing', () => {
    it('refuses passing the turn in the window', () => {
      const text = withLine(OBJECT_GAME, 'Phase: objection', '  When they have at least 1 coin:\n    The turn passes to the left.');
      const game = compileGame(text, lib).game!;
      const engine = table(game, stake('p0', 'holdings-p1'));
      const before = engine.getState();
      expect(() => engine.dispatch({ type: HIRE, by: 'p0', cardIds: [potter], onto: vase }))
        .toThrow('The turn does not pass while the players answer an action in the objection: write “The objection passes to the left.” instead.');
      expect(engine.getState()).toBe(before);
    });
    it('refuses passing an answer with no action waiting', () => {
      const state: GameState = { ...base, turn: { current: 'p1', phase: 'objection' } };
      expect(() => runPhrase(lib, 'effect', 'the objection passes to the left', fixtureEnv(state, { game: objectGame, seats: SEATS })))
        .toThrow('The objection passes to the left only while an action waits for the players to answer it.');
    });
  });

  describe('a seat that goes out while an action waits', () => {
    // Any seat still in may give up while the players answer, the one answering, another asked, or the player acting.
    const OUT_GAME = swap(OBJECT_GAME, '  A player may let it go.',
      ['  Any player may give up.', '    Then:', '      They are out.', '  A player may let it go.'].join('\n'));
    const outGame = compiled(OUT_GAME);
    const GIVE_UP = 'give up';
    const stakeOut = (maker: string, ...zones: string[]): Prepare => (state) =>
      zones.reduce((s, zone) => makeCard(s, outGame, { name: 'Stake', maker }, zone)!.state, state);
    /** A fresh table given the engine's log comes to the engine's state. */
    const replays = (engine: Engine, prepare: Prepare) => {
      const replayed = table(outGame, prepare);
      replayed.loadLog([...engine.getLog()]);
      expect(replayed.getState()).toEqual(engine.getState());
    };
    it('skips an asked seat gone out: the action goes ahead once the rest let it go', () => {
      const prepare = stakeOut('p0', 'holdings-p1', 'holdings-p2');
      const engine = table(outGame, prepare);
      expect(hire(engine).reason).toBeUndefined();
      expect(waitingOf(engine.getState())?.asked).toEqual(['p1', 'p2']);
      press(engine, GIVE_UP, 'p2');
      expect([engine.getState().turn?.current, waitingOf(engine.getState())?.at]).toEqual(['p1', 0]);
      const state = press(engine, LET_GO, 'p1');
      expect(isOut(state, 'p2')).toBe(true);
      expect(cardById(state, potter)).toMatchObject({ zoneId: 'crew-p0', data: expect.objectContaining({ 'lang:on': vase }) });
      expect([state.turn?.phase, state.turn?.current]).toEqual(['working', 'p0']);
      expect(state.data).not.toHaveProperty(WINDOW_KEY);
      replays(engine, prepare);
    });
    it('passes the answer on when the seat answering goes out, to no seat that was not asked', () => {
      const prepare = stakeOut('p0', 'holdings-p1');
      const engine = table(outGame, prepare);
      hire(engine);
      expect(waitingOf(engine.getState())?.asked).toEqual(['p1']);
      const state = press(engine, GIVE_UP, 'p1');
      expect(cardById(state, potter)).toMatchObject({ zoneId: 'crew-p0', data: expect.objectContaining({ 'lang:on': vase }) });
      expect([state.turn?.phase, state.turn?.current]).toEqual(['working', 'p0']);
      expect(state.data).not.toHaveProperty(WINDOW_KEY);
      // p2 was never handed the answer: there is none to give.
      expect(engine.dispatch({ type: LET_GO, by: 'p2' })).toMatchObject({ ok: false });
      replays(engine, prepare);
    });
    it('stops the action of a player acting who goes out, and passes the turn on from them', () => {
      const prepare = stakeOut('p0', 'holdings-p1');
      const engine = table(outGame, prepare);
      hire(engine);
      press(engine, GIVE_UP, 'p0');
      expect([engine.getState().turn?.phase, engine.getState().turn?.current]).toEqual(['objection', 'p1']);
      const state = press(engine, LET_GO, 'p1');
      expect(cardById(state, potter)?.zoneId).toBe('hall');
      expect(moves(state, 'p0')).toBe(2);
      expect([state.turn?.phase, state.turn?.current]).toEqual(['working', 'p1']);
      expect(state.data).not.toHaveProperty(WINDOW_KEY);
      replays(engine, prepare);
    });
  });

  it('runs the example', () => {
    const text = [OBJECT_GAME, '',
      "Example: holding a player's stake lets you stop their action, which spends its move and nothing else",
      '  Given 3 players',
      "  And p1's holdings has a Stake whose maker is p0",
      "  And p0's workshop has a Vase",
      '  When p0 hires a Potter to the Vase',
      '  Then the phase is objection',
      "  And it is p1's turn",
      '  When p1 objects with the Stake whose maker is p0',
      '  Then the phase is working',
      "  And it is p0's turn",
      '  And p0 has 2 moves',
      "  And p0's crew is empty",
      "  And p0's purse has a Stake whose maker is p0",
    ].join('\n');
    const { game, diagnostics } = compileGame(text, lib);
    expect(diagnostics).toEqual([]);
    expect(runExamples(game!, lib)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
  });
});
