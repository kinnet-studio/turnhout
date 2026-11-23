import { describe, expect, it } from 'vitest';
import type { GameState } from '../game-state';
import { actingPlayer, NO_ACTION_WAITING, WINDOW_KEY, type Waiting } from './action-window';
import { flowDefFor, initialState, seatsFor } from './build';
import { makeCard } from './cards';
import { compileGame } from './compile';
import { createDefaultLibrary } from './library';
import { CREW_GAME, OBJECT_GAME, fixtureEnv, runPhrase } from './testing';
import type { CompiledGame } from './types';

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
      const window = compiled(OBJECT_GAME).everyPhase.window!;
      expect(window).toMatchObject({ phase: 'objection', line: lineOf(OBJECT_GAME, WINDOW) });
      expect(window.who.phrase).toBe('they have a card in {zones} whose {cardfilter}');
      expect(window.who.args[1]).toEqual({ names: 'maker', player: 'acting' });
    });
    it('(guard) gives a game without one no window', () => {
      const crew = compiled(CREW_GAME);
      expect(crew.everyPhase).not.toHaveProperty('window');
      expect(flowDefFor(crew, SEATS)).toBeTruthy();
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
      const holds = dusty.replace('  Only if the pile is not empty.', '  Only if the pile has a Vase.');
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
