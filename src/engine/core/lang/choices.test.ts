import { describe, expect, it } from 'vitest';
import { cardById, type GameState } from '../game-state';
import type { Move } from '../moves';
import type { Json } from '../table-def';
import { addToCounter, counterOf, markOut, setCounter } from './board-state';
import { createEngine, initialState } from './build';
import { fillChoices } from './choices';
import type { ChoiceOption } from './choices';
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
    expect(who.text).toBe("they have a card in their workshop whose mark is the card's wants");
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
  it('asks in the words of an effect that does not start with “they”, from its first letter in lower case', () => {
    // A phrase no game has yet: an effect that names no one before what is done.
    const giving = createDefaultLibrary().effect('pay {int} {counter} to that player', (env, [n, counter]) => {
      const amount = n as number;
      const paid = addToCounter(env.state, counter as string, env.subject!.player!, -amount);
      return addToCounter(paid, counter as string, env.subject!.picked!, amount);
    }, { needsPlayer: true, needsPick: true });
    const PAY = "      Pay 1 coin to another player of their choice who has a card in their workshop whose mark is the card's wants.";
    const rules = compileGame(edited(GUILD_GAME, CHOICE, PAY), giving);
    expect(rules.diagnostics).toEqual([]);
    const { engine, runtime } = createEngine(rules.game!, giving, 3, twoProviders);
    expect(pressChoices(runtime, twoProviders, open(statue))).toEqual([
      { at: 0, kind: 'player', prompt: 'Pick who to pay 1 coin to: p1 or p2.', options: ['p1', 'p2'] },
    ]);
    expect(engine.dispatch(open(statue, { choices: ['p1'] }))).toMatchObject({ ok: true });
    expect(coins(engine.getState())).toEqual([8, 10, 9]);
  });
});

describe('Review Focus: a press that names a choice wrongly', () => {
  it('refuses the presser, a seat the table lacks, a number and a seat in upper case, with the prompt', () => {
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
    // The block's lines keep the case they are written in; an example compares refusals in lower case.
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
  it('replays a move that names its choice to the same payee, and undoes it', () => {
    const { engine } = playing(twoProviders);
    const before = engine.getState();
    expect(engine.dispatch(open(statue, { choices: ['p2'] }))).toMatchObject({ ok: true });
    const log = [...engine.getLog()];
    expect(log).toEqual([open(statue, { choices: ['p2'] })]);
    const replayed = playing(twoProviders).engine;
    replayed.loadLog(log);
    expect(replayed.getState()).toEqual(engine.getState());
    expect(coins(replayed.getState())).toEqual([7, 9, 11]);
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
  it('is refused inside “For each card …,” and “For …,”, even in a Then: that may ask for one', () => {
    const EACH = "      For each card in their workshop, they pay the fee to another player of their choice who has a card in their workshop.";
    const each = edited(GUILD_GAME, `${GUARD}\n`, `${GUARD}\n${EACH}\n`);
    expect(messages(each)).toEqual([[lineOf(each, EACH), 'A choice can\'t sit inside “For each card …,”: a press asks each choice once, so write it on a line of its own.']]);
    // The rival is a holder the game knows, so the choice is all that is wrong with the line.
    const FOR = '      For the player who is the rival, they pay the fee to another player of their choice who has a card in their workshop.';
    const rival = edited(GUILD_GAME, '  The game has a fee of 2.\n', '  The game has a fee of 2.\n  Players can be the rival.\n');
    expect(compileGame(rival, lib).diagnostics).toEqual([]);
    const held = edited(rival, `${GUARD}\n`, `${GUARD}\n${FOR}\n`);
    expect(messages(held)).toEqual([[lineOf(held, FOR), 'A choice can\'t sit inside “For …,”: a press asks each choice once, so write it on a line of its own.']]);
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

const TRIM = 'trim a card in their workshop';
const BLOCK = '      They choose one:';
/** The trim button's block of options, as GUILD_GAME writes it under its `Then:`. */
const TRIM_BLOCK = [
  BLOCK, '        Only if it is not a Tower card.',
  '        Trim 2 red:', '          Only if its red size is more than 1.', '          It gains 2 red trim.',
  '        Trim 2 gold:', '          Only if its gold size is more than 1.', '          It gains 2 gold trim.',
  '        Trim 1 of each:', '          Only if its red size is more than 0.', '          Only if its gold size is more than 0.',
  '          It gains 1 red trim.', '          It gains 1 gold trim.',
];
const LABELS = ['Trim 2 red', 'Trim 2 gold', 'Trim 1 of each'];
const ALL_THREE = 'Choose one: Trim 2 red, Trim 2 gold or Trim 1 of each.';
const FEWER = 'Give “They choose one:” two or more options, each a line ending in “:” with its lines under it.';
const LINES_THEN_OPTIONS = 'Under “They choose one:”, write its “Only if …” lines, then each option as a line ending in “:”.';
const CHOICE_IN_CHOICE = 'A choice can\'t sit inside another choice.';

/** A Tower dealt to a stash, not the one in the pile: the game ends once the pile is empty. */
const tower = all('Tower').find((id) => cardById(setUp, id)?.zoneId !== 'pile')!;
/** p0's workshop holds a Statue (red size 2, gold size 4), a Vase (3 and 0), a Bowl (1 and 1) and a Tower (0 and 5). */
const workshop = arranged([[statue, vase, bowl, tower], 'workshop-p0']);
/** The trim button pressed by p0 on `card`. */
const trim = (card: string, extra: Record<string, Json> = {}): Move => ({ type: TRIM, by: 'p0', cardId: card, ...extra });
const dataOf = (state: GameState, card: string) => cardById(state, card)?.data;
/** The number of the last line of `text` that reads `line`. */
const lastLineOf = (text: string, line: string) => text.split('\n').lastIndexOf(line) + 1;

describe('choosing among options: compiled', () => {
  it('makes the block a choice of one of its options, first among the trim button\'s choices, with its guard and each option\'s lines', () => {
    const button = game.phases[0].actions.find((action) => action.words === TRIM)!;
    expect(button.effects).toHaveLength(1);
    const [block] = button.effects;
    expect(block).toMatchObject({ kind: 'lang', phrase: 'choose one', line: lineOf(GUILD_GAME, BLOCK), text: 'They choose one:' });
    const [at, guard, options] = block.args as [number, CondGroup[], ChoiceOption[]];
    expect(at).toBe(0);
    expect(guard).toHaveLength(1);
    expect(options.map((option) => option.label)).toEqual(LABELS);
    expect(options.map((option) => option.conditions.length)).toEqual([1, 1, 2]);
    expect(options.map((option) => option.effects.length)).toEqual([1, 1, 2]);
  });
});

describe('choosing among options: pressed', () => {
  it('asks which, with each label as written, when several options hold, and changes nothing until told', () => {
    const { engine, runtime } = playing(workshop);
    const before = engine.getState();
    expect(pressChoices(runtime, workshop, trim(statue))).toEqual([{ at: 0, kind: 'option', prompt: ALL_THREE, options: LABELS }]);
    expect(engine.dispatch(trim(statue))).toMatchObject({ ok: false, reason: ALL_THREE });
    expect(engine.getState()).toBe(before);
  });
  it('takes a label named in any case, and runs that option\'s lines only', () => {
    const { engine } = playing(workshop);
    expect(engine.dispatch(trim(statue, { choices: ['trim 2 GOLD'] }))).toMatchObject({ ok: true });
    expect(dataOf(engine.getState(), statue)).toMatchObject({ 'gold trim': 2 });
    expect(dataOf(engine.getState(), statue)).not.toHaveProperty('red trim');
  });
  it('fills in the one option that holds: 2 red for a Vase, 1 of each for a Bowl', () => {
    const { engine, runtime } = playing(workshop);
    const onlyRed = { at: 0, kind: 'option', prompt: 'Choose one: Trim 2 red.', options: ['Trim 2 red'] };
    expect(pressChoices(runtime, workshop, trim(vase))).toEqual([onlyRed]);
    expect(engine.dispatch(trim(vase))).toMatchObject({ ok: true });
    expect(dataOf(engine.getState(), vase)).toMatchObject({ 'red trim': 2 });
    expect(dataOf(engine.getState(), vase)).not.toHaveProperty('gold trim');
    expect(engine.dispatch(trim(bowl))).toMatchObject({ ok: true });
    expect(dataOf(engine.getState(), bowl)).toMatchObject({ 'red trim': 1, 'gold trim': 1 });
  });
  it('is not asked when its guard fails: a Tower is pressed and nothing is trimmed', () => {
    const { engine, runtime } = playing(workshop);
    expect(pressChoices(runtime, workshop, trim(tower))).toEqual([]);
    expect(engine.dispatch(trim(tower, { choices: ['Trim 2 gold'] }))).toMatchObject({ ok: true });
    expect(dataOf(engine.getState(), tower)).not.toHaveProperty('red trim');
    expect(dataOf(engine.getState(), tower)).not.toHaveProperty('gold trim');
  });
  it('Review Focus: no option holds: is not asked, and the press changes nothing', () => {
    // A Vase made 1 red and 0 gold: too little red for 2, no gold for 1 of each.
    const shrunk = (card: GameState['cards'][number]) => (card.id === vase ? { ...card, data: { ...card.data, 'red size': 1 } } : card);
    const small = { ...workshop, cards: workshop.cards.map(shrunk) };
    const { engine, runtime } = playing(small);
    expect(pressChoices(runtime, small, trim(vase))).toEqual([]);
    expect(engine.dispatch(trim(vase))).toMatchObject({ ok: true });
    // The press is kept as one made this turn, and that is all that changes.
    const { 'lang:turn': pressed, ...data } = engine.getState().data;
    expect(pressed).toEqual({ p0: [TRIM] });
    expect({ ...engine.getState(), data }).toEqual(small);
  });
  it('replays a press whose option was filled in to the same trim, and undoes it', () => {
    const { engine } = playing(workshop);
    const before = engine.getState();
    expect(engine.dispatch(trim(vase))).toMatchObject({ ok: true });
    const log = [...engine.getLog()];
    expect(log).toEqual([trim(vase)]);
    const replayed = playing(workshop).engine;
    replayed.loadLog(log);
    expect(replayed.getState()).toEqual(engine.getState());
    engine.undo();
    expect(engine.getState()).toEqual(before);
  });
});

describe('Review Focus: a press that names an option wrongly', () => {
  it('refuses a label the block lacks and a seat, with the prompt, and changes nothing', () => {
    const { engine } = playing(workshop);
    const before = engine.getState();
    for (const named of ['Trim 3', 'p1']) {
      expect(engine.dispatch(trim(statue, { choices: [named] }))).toMatchObject({ ok: false, reason: ALL_THREE });
    }
    expect(engine.getState()).toBe(before);
  });
  it('P9: refuses an option that does not hold even when only one does', () => {
    const { engine } = playing(workshop);
    expect(engine.dispatch(trim(vase, { choices: ['Trim 2 gold'] }))).toMatchObject({ ok: false, reason: 'Choose one: Trim 2 red.' });
  });
});

describe('choosing among options: one sequence with a chosen player', () => {
  /** GUILD_GAME with the trim block in the open button's Then: too, after its payee and before the card moves. */
  const BOTH = compiled(edited(GUILD_GAME, `${GUARD}\n`, `${GUARD}\n${TRIM_BLOCK.join('\n')}\n`));

  it('numbers the payee 0 and the trim 1, in the order written', () => {
    const button = BOTH.phases[0].actions.find((action) => action.words === OPEN)!;
    const choices = button.effects.filter((ref) => ref.kind === 'lang').map((ref) => [ref.phrase, ref.args[0]]);
    expect(choices).toEqual([['choose player', 0], ['choose one', 1]]);
  });
  it('pays the player named and trims as named', () => {
    const { engine } = playing(twoProviders, BOTH);
    expect(engine.dispatch(open(statue, { choices: ['p2', 'Trim 1 of each'] }))).toMatchObject({ ok: true });
    const state = engine.getState();
    expect(coins(state)).toEqual([7, 9, 11]);
    expect(dataOf(state, statue)).toMatchObject({ 'red trim': 1, 'gold trim': 1 });
    expect(cardById(state, statue)?.zoneId).toBe('workshop-p0');
  });
  it('is refused with the payee\'s prompt when only the trim is named, and with the trim\'s when only the payee is', () => {
    const { engine } = playing(twoProviders, BOTH);
    const before = engine.getState();
    expect(engine.dispatch(open(statue, { choices: [null, 'Trim 1 of each'] }))).toMatchObject({ ok: false, reason: TWO_PROVIDERS });
    expect(engine.dispatch(open(statue, { choices: ['p2'] }))).toMatchObject({ ok: false, reason: ALL_THREE });
    expect(engine.getState()).toBe(before);
  });
});

describe('a block of options with a mistake in it', () => {
  const OPTION_LINES = TRIM_BLOCK.slice(5).join('\n');

  it('needs two options or more, on the block\'s line', () => {
    const text = edited(GUILD_GAME, `\n${OPTION_LINES}`, '');
    expect(messages(text)).toEqual([[lineOf(text, BLOCK), FEWER]]);
  });
  it('names two options with one label, on the second, whatever their case', () => {
    const text = edited(GUILD_GAME, '        Trim 2 gold:', '        TRIM 2 red:');
    expect(messages(text)).toEqual([[lineOf(text, '        TRIM 2 red:'), 'Two options here are both called “TRIM 2 red”.']]);
  });
  it('takes no effect line directly under the block', () => {
    const PAY = '        Pay 1 coin.';
    const text = edited(GUILD_GAME, `${TRIM_BLOCK[1]}\n`, `${TRIM_BLOCK[1]}\n${PAY}\n`);
    expect(messages(text)).toEqual([[lineOf(text, PAY), LINES_THEN_OPTIONS]]);
  });
  it('P21: takes no Only if line after an option', () => {
    const LATE = '        Only if its gold size is more than 2.';
    const text = beforeStop([LATE]);
    expect(messages(text)).toEqual([[lineOf(text, LATE), LINES_THEN_OPTIONS]]);
  });
  it('takes no choice inside an option: neither a choice of a player nor another block', () => {
    const PAY = '          They pay the fee to another player of their choice who has a card in their workshop.';
    const paying = edited(GUILD_GAME, '          It gains 2 red trim.\n', `          It gains 2 red trim.\n${PAY}\n`);
    expect(messages(paying)).toEqual([[lineOf(paying, PAY), CHOICE_IN_CHOICE]]);
    const INNER = '          They choose one:';
    const inner = [
      INNER, '            Trim 1 red:', '              It gains 1 red trim.', '            Trim 1 gold:', '              It gains 1 gold trim.',
    ];
    const nested = edited(GUILD_GAME, '          It gains 2 red trim.\n', `          It gains 2 red trim.\n${inner.join('\n')}\n`);
    expect(messages(nested)).toEqual([[lineOf(nested, INNER), CHOICE_IN_CHOICE]]);
  });
  it('takes no choice directly under the block either', () => {
    const PAY = '        They pay the fee to another player of their choice who has a card in their workshop.';
    const text = edited(GUILD_GAME, `${TRIM_BLOCK[1]}\n`, `${TRIM_BLOCK[1]}\n${PAY}\n`);
    expect(messages(text)).toEqual([[lineOf(text, PAY), CHOICE_IN_CHOICE]]);
  });
  it('is refused under a When rule, on its line', () => {
    const under = TRIM_BLOCK.map((line) => line.slice(2));
    const text = edited(GUILD_GAME, '  When they have less than 1 move:\n', `  When they have less than 1 move:\n${under.join('\n')}\n`);
    expect(messages(text)).toContainEqual([lineOf(text, under[0]), MISPLACED]);
  });
  it('Review Focus: would tell the presser a card they can\'t see, on its guard and on each option\'s Only if lines', () => {
    const hidden = 'This line would tell the player what the card is, though they can\'t see the cards in the pile. Check it in the Then: lines, after a reveal.';
    const text = beforeStop(['  A player may peek a card in the pile.', '    Then:', ...TRIM_BLOCK]);
    const onlyIfs = TRIM_BLOCK.filter((line) => line.trim().startsWith('Only if'));
    expect(onlyIfs).toHaveLength(5);
    expect(messages(text)).toEqual(onlyIfs.map((line) => [lastLineOf(text, line), hidden]));
    expect(compileGame(text, lib).game).toBeUndefined();
  });
});

describe('filling in an option', () => {
  const options = ['Trim 2 red', 'Trim 1 of each'];
  const asked = [{ at: 0, kind: 'option' as const, prompt: 'Choose one: Trim 2 red or Trim 1 of each.', options }];
  it('matches a label in any case and fills it in as written', () => {
    expect(fillChoices(asked, 1, ['TRIM 1 OF EACH'])).toEqual(['Trim 1 of each']);
    expect(fillChoices(asked, 1, ['Trim 3'])).toBe(asked[0].prompt);
    expect(fillChoices(asked, 1, [])).toBe(asked[0].prompt);
  });
});
