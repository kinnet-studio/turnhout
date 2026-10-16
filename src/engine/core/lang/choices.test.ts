import { describe, expect, it } from 'vitest';
import { cardById, type GameState } from '../game-state';
import type { Move } from '../moves';
import type { Json } from '../table-def';
import { counterOf, markOut, setCounter } from './board-state';
import { createEngine, initialState } from './build';
import { fillChoices } from './choices';
import { compileGame } from './compile';
import { pressChoices } from './declared-actions';
import { createDefaultLibrary } from './library/index';
import { GUILD_GAME } from './testing';
import type { CompiledGame, CondGroup, PhraseRef } from './types';
import { relocate } from './zones';

const lib = createDefaultLibrary();

/** Compiles rules that must have no problems at all. */
function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  expect(diagnostics).toEqual([]);
  return game!;
}

const messages = (text: string) => compileGame(text, lib).diagnostics.map((d) => [d.line, d.message]);
const lineOf = (text: string, line: string) => text.split('\n').indexOf(line) + 1;
/** GUILD_GAME with `lines` put in before the stop button. */
const beforeStop = (lines: string[], text = GUILD_GAME) => {
  const changed = text.replace('  A player may stop.\n', `${lines.join('\n')}\n  A player may stop.\n`);
  expect(changed).not.toBe(text);
  return changed;
};
/** `text` with `from` replaced by `to`, which must change it. */
const edited = (text: string, from: string, to: string) => {
  const changed = text.replace(from, to);
  expect(changed).not.toBe(text);
  return changed;
};

const OPEN = 'open a card in their stash';
const CHOICE = "      They pay the fee to another player of their choice who has a card in their workshop whose mark is the card's wants.";
const GUARD = "        Only if they have no card in their workshop whose mark is the card's wants.";
const ONE_OF = "    Only if one of:\n      The card has no wants.\n      Some player has a card in their workshop whose mark is the card's wants.\n";
const ONE_PROVIDER = 'Pick who to pay the fee to: p1.';
const TWO_PROVIDERS = 'Pick who to pay the fee to: p1 or p2.';
const MISPLACED = 'Only the Then: lines of a button that picks a card, or nothing, can ask for a choice.';

const game = compiled(GUILD_GAME);
/** The state once Setup has run for three, from `initialState(game, 1)`: two jobs in each stash, the rest in the pile, the hands in the hall; p0 to act. */
const setUp = createEngine(game, lib, 3, initialState(game, 1)).engine.getState();
const all = (name: string) => setUp.cards.filter((card) => card.data?.name === name).map((card) => card.id);
const [vase, secondVase] = all('Vase');
const [bowl] = all('Bowl');
const [statue] = all('Statue');

/** The state with the cards put where each pair says, in order. */
const arranged = (...places: [string[], string][]) =>
  places.reduce((state: GameState, [ids, zone]) => relocate(state, ids, zone, game), setUp);
/** p1's workshop holds a Vase, which makes the clay a Statue wants, and p0's stash a Statue. */
const oneProvider = arranged([[vase], 'workshop-p1'], [[statue], 'stash-p0']);
/** The same, with a Bowl, which makes clay too, in p2's workshop. */
const twoProviders = arranged([[vase], 'workshop-p1'], [[bowl], 'workshop-p2'], [[statue], 'stash-p0']);
/** No clay in any workshop, and a Statue in p0's stash. */
const noProvider = arranged([[statue], 'stash-p0']);

const open = (card: string, extra: Record<string, Json> = {}): Move => ({ type: OPEN, by: 'p0', cardId: card, ...extra });
const playing = (state: GameState, rules: CompiledGame = game) => createEngine(rules, lib, 3, state);
const coins = (state: GameState) => ['p0', 'p1', 'p2'].map((seat) => counterOf(state, 'coins', seat));

describe('a chosen player: compiled', () => {
  it('compiles the Guild with no problems', () => {
    expect(compileGame(GUILD_GAME, lib).diagnostics).toEqual([]);
  });
  it('makes the choice line a choice of a player, first among the open button\'s choices, with its guard, its clause and its effect', () => {
    const button = game.phases[0].actions.find((action) => action.words === OPEN)!;
    const [choice] = button.effects;
    expect(choice).toMatchObject({ kind: 'lang', phrase: 'choose player' });
    const [at, guard, who, effect] = choice.args as [number, CondGroup[], PhraseRef, PhraseRef];
    expect(at).toBe(0);
    expect(guard).toHaveLength(1);
    expect(who.phrase).toBe('they have a card in {zones} whose {cardfilter}');
    expect(effect.phrase).toBe('they pay the {gamenumber} to that player');
  });
  it('numbers a button\'s choices in the order written, and fills and runs each by its own place', () => {
    const AGAIN = '      They pay the fee to another player of their choice who has a card in their workshop whose mark is clay.';
    const twice = compiled(edited(GUILD_GAME, `${GUARD}\n`, `${GUARD}\n${AGAIN}\n`));
    const button = twice.phases[0].actions.find((action) => action.words === OPEN)!;
    expect(button.effects.filter((ref) => ref.kind === 'lang').map((ref) => ref.args[0])).toEqual([0, 1]);
    const { engine } = playing(twoProviders, twice);
    expect(engine.dispatch(open(statue, { choices: ['p2'] }))).toMatchObject({ ok: false, reason: TWO_PROVIDERS });
    expect(engine.dispatch(open(statue, { choices: ['p2', 'p1'] }))).toMatchObject({ ok: true });
    expect(coins(engine.getState())).toEqual([5, 11, 11]);
  });
});

describe('a chosen player: pressed', () => {
  it('fills in the one player who qualifies, and pays them', () => {
    const { engine, runtime } = playing(oneProvider);
    expect(pressChoices(runtime, oneProvider, open(statue))).toEqual([{ at: 0, kind: 'player', prompt: ONE_PROVIDER, options: ['p1'] }]);
    expect(engine.dispatch(open(statue))).toMatchObject({ ok: true });
    expect(coins(engine.getState())).toEqual([7, 11, 9]);
    expect(cardById(engine.getState(), statue)?.zoneId).toBe('workshop-p0');
  });
  it('asks which of several, and changes nothing until told', () => {
    const { engine } = playing(twoProviders);
    const before = engine.getState();
    expect(engine.dispatch(open(statue))).toMatchObject({ ok: false, reason: TWO_PROVIDERS });
    expect(engine.getState()).toBe(before);
    expect(engine.dispatch(open(statue, { choices: ['p2'] }))).toMatchObject({ ok: true });
    expect(coins(engine.getState())).toEqual([7, 9, 11]);
  });
  it('P1: asks the clause about each player who might be picked, not about the presser', () => {
    // Without the guard, p0 may open with clay of their own; p1 has clay too, and p2 none, so only p1 is asked about.
    const unguarded = compiled(edited(GUILD_GAME, `${GUARD}\n`, ''));
    const state = arranged([[bowl], 'workshop-p0'], [[vase], 'workshop-p1'], [[statue], 'stash-p0']);
    const { engine, runtime } = playing(state, unguarded);
    expect(pressChoices(runtime, state, open(statue))).toEqual([{ at: 0, kind: 'player', prompt: ONE_PROVIDER, options: ['p1'] }]);
    expect(engine.dispatch(open(statue))).toMatchObject({ ok: true });
    expect(coins(engine.getState())).toEqual([7, 11, 9]);
  });
  it('P1: reads “their” in the clause as the candidate\'s, even through the move a card pick makes', () => {
    // “the cards in their workshop” names the zones of whoever makes the move: about each candidate, that is the candidate.
    const AFFORD = 'They pay the fee to another player of their choice who has at least the total red size of the cards in their workshop in coins.';
    const sponsoring = compiled(beforeStop(['  A player may sponsor a card in their stash.', '    Then:', `      ${AFFORD}`]));
    // p0's Vase makes a red size of 3, which p1's 2 coins don't cover; p1's and p2's own workshops are empty.
    const state = setCounter(arranged([[vase], 'workshop-p0'], [[statue], 'stash-p0']), 'coins', 'p1', 2);
    const { runtime } = playing(state, sponsoring);
    const sponsor: Move = { type: 'sponsor a card in their stash', by: 'p0', cardId: statue };
    expect(pressChoices(runtime, state, sponsor)).toEqual([{ at: 0, kind: 'player', prompt: TWO_PROVIDERS, options: ['p1', 'p2'] }]);
  });
});

describe('Review Focus: a press that names a choice wrongly', () => {
  it('refuses the presser, a seat the table lacks, a number and other capitals, with the prompt', () => {
    const { engine } = playing(twoProviders);
    const before = engine.getState();
    for (const named of ['p0', 'p3', 5, 'P2']) {
      expect(engine.dispatch(open(statue, { choices: [named] }))).toMatchObject({ ok: false, reason: TWO_PROVIDERS });
    }
    expect(engine.getState()).toBe(before);
  });
  it('P9: refuses a player who doesn\'t qualify even when only one does, and changes nothing', () => {
    const { engine } = playing(oneProvider);
    const before = engine.getState();
    expect(engine.dispatch(open(statue, { choices: ['p2'] }))).toMatchObject({ ok: false, reason: ONE_PROVIDER });
    expect(engine.getState()).toBe(before);
  });
  it('refuses choices that are no list, as naming each choice wrongly', () => {
    expect(playing(oneProvider).engine.dispatch(open(statue, { choices: 'p1' }))).toMatchObject({ ok: false, reason: ONE_PROVIDER });
  });
  it('leaves out a player who is out, so the one left is filled in', () => {
    const out = markOut(twoProviders, 'p2');
    const { engine } = playing(out);
    expect(engine.dispatch(open(statue))).toMatchObject({ ok: true });
    expect(coins(engine.getState())).toEqual([7, 11, 9]);
  });
});

describe('a choice the press does not ask', () => {
  it('is not asked when its guard fails, and what was named for it is ignored', () => {
    // p0 makes clay too, so they pay no one.
    const own = arranged([[bowl], 'workshop-p0'], [[vase], 'workshop-p1'], [[statue], 'stash-p0']);
    const { engine, runtime } = playing(own);
    expect(pressChoices(runtime, own, open(statue))).toEqual([]);
    expect(engine.dispatch(open(statue, { choices: ['p1'] }))).toMatchObject({ ok: true });
    expect(coins(engine.getState())).toEqual([9, 9, 9]);
  });
  it('pays no one for a card that wants nothing', () => {
    const state = relocate(oneProvider, [secondVase], 'stash-p0', game);
    const { engine } = playing(state);
    expect(engine.dispatch(open(secondVase))).toMatchObject({ ok: true });
    expect(coins(engine.getState())).toEqual([9, 9, 9]);
    expect(cardById(engine.getState(), secondVase)?.zoneId).toBe('workshop-p0');
  });
  it('leaves the refusal to the button\'s own Only if lines when no one provides', () => {
    const { engine, runtime } = playing(noProvider);
    const before = engine.getState();
    const refusal = "the card has no wants or some player has a card in their workshop whose mark is the card's wants";
    // The block's lines keep the capitals they are written with; an example compares refusals without them.
    expect((engine.dispatch(open(statue)) as { reason?: string }).reason?.toLowerCase()).toBe(refusal);
    expect((pressChoices(runtime, noProvider, open(statue)) as string).toLowerCase()).toBe(refusal);
    expect(engine.getState()).toBe(before);
  });
  it('Review Focus: nobody can answer: is not asked, and its line does nothing', () => {
    const noGuard = compiled(edited(GUILD_GAME, ONE_OF, ''));
    const { engine } = playing(noProvider, noGuard);
    expect(engine.dispatch(open(statue))).toMatchObject({ ok: true });
    expect(coins(engine.getState())).toEqual([9, 9, 9]);
    expect(cardById(engine.getState(), statue)?.zoneId).toBe('workshop-p0');
  });
  it('is none of a button with no choices', () => {
    const { runtime } = playing(oneProvider);
    const start: Move = { type: 'start a card in their stash', by: 'p0', cardId: statue };
    expect(pressChoices(runtime, oneProvider, start)).toEqual([]);
  });
});

describe('filling in choices', () => {
  const asked = [{ at: 1, kind: 'player' as const, prompt: 'Pick who.', options: ['p1', 'p2'] }];
  it('gives one entry for each choice of the button, null for those not asked', () => {
    expect(fillChoices(asked, 3, [null, 'p2', 'p9'])).toEqual([null, 'p2', null]);
    expect(fillChoices([], 2, ['p1'])).toEqual([null, null]);
  });
  it('fills in a choice with one option only when it is named with none', () => {
    const one = [{ ...asked[0], options: ['p1'] }];
    expect(fillChoices(one, 2, undefined)).toEqual([null, 'p1']);
    expect(fillChoices(one, 2, [])).toEqual([null, 'p1']);
    expect(fillChoices(one, 2, [null, null])).toEqual([null, 'p1']);
    expect(fillChoices(one, 2, [null, 'p2'])).toBe('Pick who.');
  });
});

describe('Review Focus: undo and replay of a press whose choice was filled in', () => {
  it('gives back the state before it, and replays to the same payee from a move that names none', () => {
    const { engine } = playing(oneProvider);
    const before = engine.getState();
    expect(engine.dispatch(open(statue))).toMatchObject({ ok: true });
    const log = [...engine.getLog()];
    expect(log).toEqual([open(statue)]);
    const replayed = playing(oneProvider).engine;
    replayed.loadLog(log);
    expect(replayed.getState()).toEqual(engine.getState());
    expect(coins(replayed.getState())).toEqual([7, 11, 9]);
    engine.undo();
    expect(engine.getState()).toEqual(before);
  });
});

describe('a choice in the wrong place', () => {
  const ELSEWHERE = '    They pay the fee to another player of their choice who has a card in their workshop.';
  const IN_THEN = `  ${ELSEWHERE}`;

  it('is refused under a When rule, on its line', () => {
    const text = edited(GUILD_GAME, '  When they have less than 1 move:\n', `  When they have less than 1 move:\n${ELSEWHERE}\n`);
    expect(messages(text)).toEqual([[lineOf(text, ELSEWHERE), MISPLACED]]);
  });
  it('is refused in a card move\'s Then:', () => {
    const text = beforeStop(['  A player may give a card from their stash to the scrap.', '    Then:', IN_THEN]);
    expect(messages(text)).toEqual([[lineOf(text, IN_THEN), MISPLACED]]);
  });
  it('is refused in the Then: of a button that picks a player', () => {
    const text = beforeStop(['  A player may tip another player.', '    Then:', IN_THEN]);
    expect(messages(text)).toEqual([[lineOf(text, IN_THEN), MISPLACED]]);
  });
  it('P12: is refused in the Then: of a button that picks some cards', () => {
    const text = beforeStop(['  A player may toss some cards from their stash.', '    Then:', IN_THEN]);
    expect(messages(text)).toEqual([[lineOf(text, IN_THEN), MISPLACED]]);
  });
  it('P8: is refused inside “If …,”, even in a Then: that may ask for one', () => {
    const IF = '      If they have no card in their workshop, they pay the fee to another player of their choice who has a card in their workshop.';
    const text = edited(GUILD_GAME, `${GUARD}\n`, `${GUARD}\n${IF}\n`);
    expect(messages(text)).toEqual([[lineOf(text, IF), 'A choice can\'t sit inside “If …,”: write its condition under it as an “Only if …” line.']]);
  });
  it('takes only Only if lines under it', () => {
    const PAY = '        Pay 1 coin.';
    const text = edited(GUILD_GAME, `${GUARD}\n`, `${GUARD}\n${PAY}\n`);
    expect(messages(text)).toEqual([[lineOf(text, PAY), 'Under a choice, write only “Only if …” lines.']]);
  });
});

describe('a choice line with a mistake in it', () => {
  it('names a misnamed zone in its clause, on its line', () => {
    const MISSPELT = CHOICE.replace('their workshop whose', 'their workshp whose');
    const text = edited(GUILD_GAME, CHOICE, MISSPELT);
    expect(messages(text)).toEqual([[lineOf(text, MISSPELT), 'There is no zone called “workshp”.']]);
  });
  it('Review Focus: would tell the presser a card they can\'t see, on the choice line and on its guard', () => {
    const hidden = 'This line would tell the player what the card is, though they can\'t see the cards in the pile. Check it in the Then: lines, after a reveal.';
    const text = beforeStop(['  A player may peek a card in the pile.', '    Then:', CHOICE, GUARD, '      Move it to their workshop.']);
    const lines = text.split('\n');
    expect(messages(text)).toEqual([[lines.lastIndexOf(CHOICE) + 1, hidden], [lines.lastIndexOf(GUARD) + 1, hidden]]);
    expect(compileGame(text, lib).game).toBeUndefined();
  });
});
