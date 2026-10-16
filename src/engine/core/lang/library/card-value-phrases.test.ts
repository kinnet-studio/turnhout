import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import { setCounter } from '../board-state';
import { createEngine, initialState } from '../build';
import { changeCard } from '../card-facts';
import { compileGame } from '../compile';
import { RuleError } from '../diagnostics';
import { runExamples } from '../examples';
import { CREW_GAME, WORKED_GAME, fixtureEnv, runPhrase } from '../testing';
import type { CompiledGame, MoveInfo, Subject } from '../types';
import { relocate } from '../zones';
import { createDefaultLibrary } from './index';
import { cardHasFlag, cardValueOf } from './support';

const lib = createDefaultLibrary();

/** Compiles rules that must have no problems at all. */
function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  expect(diagnostics).toEqual([]);
  return game!;
}

const game = compiled(WORKED_GAME);
const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
/** The state once Setup has run, from seed 1. */
const setUp = engine.getState();
const named = (name: string) => setUp.cards.find((card) => card.data?.name === name)!.id;
const [vase, statue, potter, smith, tinker] = ['Vase', 'Statue', 'Potter', 'Smith', 'Tinker'].map(named);

/** The set-up state with `facts` given to the card `id`. */
const given = (id: string, facts: Record<string, number | boolean>, state: GameState = setUp): GameState => changeCard(state, id, facts, game);
const aboutCard = (id: string): Subject => ({ player: 'p0', space: null, card: id });
const worked = (state: GameState, id: string, name: string) => runtime.workedValue(state, id, name);
const workedFlag = (state: GameState, id: string, flag: string) => runtime.workedFlag(state, id, flag);
const kept = (name: string) => new RuleError(`“${name}” is worked out from its lines, so no rule can change it.`);
const itself = (name: string) => `“${name}” is worked out from itself.`;

describe('a number worked out for a card', () => {
  it('is its skill for a card of that craft, or a mixed one, and 0 for any other', () => {
    expect([worked(setUp, potter, 'red work'), worked(setUp, potter, 'gold work')]).toEqual([1, 0]);
    expect([worked(setUp, smith, 'gold work'), worked(setUp, smith, 'red work')]).toEqual([2, 0]);
    expect([worked(setUp, tinker, 'red work'), worked(setUp, tinker, 'gold work')]).toEqual([1, 1]);
  });
  it('takes each line in the order written, so a later line has the last say', () => {
    expect(worked(given(potter, { tired: true }), potter, 'red work')).toBe(0);
  });
  it('is 0 on a card no line is about, whatever numbers it has', () => {
    expect(worked(setUp, vase, 'red work')).toBe(0);
  });
});

describe('a column of the card table, refined', () => {
  it('starts from the card’s own number, which a line may change', () => {
    expect([worked(setUp, potter, 'wage'), worked(setUp, smith, 'wage'), worked(setUp, tinker, 'wage')]).toEqual([1, 2, 1]);
  });
  it('is nothing on a card with no such column, when no line gives it one', () => {
    expect(worked(setUp, vase, 'wage')).toBeNull();
  });
});

describe('a flag worked out from Only if lines', () => {
  it('holds when every line does', () => {
    expect(workedFlag(given(vase, { 'red done': 2 }), vase, 'done')).toBe(true);
    expect(workedFlag(given(vase, { 'red done': 1 }), vase, 'done')).toBe(false);
  });
  it('needs every line, for a card that needs both colours', () => {
    expect(workedFlag(given(statue, { 'red done': 1, 'gold done': 2 }), statue, 'done')).toBe(true);
    expect(workedFlag(given(statue, { 'red done': 1, 'gold done': 1 }), statue, 'done')).toBe(false);
    expect(workedFlag(given(statue, { 'red done': 0, 'gold done': 2 }), statue, 'done')).toBe(false);
  });
});

describe('any other name', () => {
  it('reads what the card keeps', () => {
    expect(worked(setUp, potter, 'skill')).toBe(1);
    expect(worked(given(vase, { 'red done': 2 }), vase, 'red done')).toBe(2);
    expect(workedFlag(given(potter, { tired: true }), potter, 'tired')).toBe(true);
    expect(workedFlag(setUp, potter, 'tired')).toBe(false);
  });
});

describe('the phrases that read a card go through the worked values', () => {
  it('reads a worked flag in a condition about the card', () => {
    const isDone = (state: GameState) => runPhrase<boolean>(lib, 'condition', 'it is done', runtime.env(state, undefined, undefined, aboutCard(vase)));
    expect(isDone(given(vase, { 'red done': 2 }))).toBe(true);
    expect(isDone(given(vase, { 'red done': 1 }))).toBe(false);
  });
  it('reads a refined column in a condition about the card a move takes', () => {
    const move: MoveInfo = { verb: 'hire', by: 'p0', cardId: tinker, from: 'hall', to: 'crew-p0' };
    const canPay = (coins: number) =>
      runPhrase<boolean>(lib, 'condition', "they have at least the card's wage in coins", runtime.env(setCounter(setUp, 'coins', 'p0', coins), move));
    // The Tinker's column says 0, so only its worked wage of 1 can refuse a player with nothing.
    expect(canPay(0)).toBe(false);
    expect(canPay(1)).toBe(true);
  });
  it('reads a worked number in an example', () => {
    const example = [
      'Example: a Potter puts its skill into red work',
      "  Given p0's workshop has a Vase",
      "  And the Vase in p0's workshop has a Potter on it",
      "  Then the Potter in p0's crew has 1 red work",
      "  And the Potter in p0's crew has 0 gold work",
    ].join('\n');
    expect(runExamples(compiled(`${WORKED_GAME}\n\n${example}`), lib)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
  });
  it('lets a button ask a worked flag of the card it picks', () => {
    const rules = compiled(WORKED_GAME.replace('  A player may finish a card in their workshop.', '  A player may finish a card in their workshop.\n    Only if it is done.'));
    const press = (state: GameState) => {
      const built = createEngine(rules, lib, 2, relocate(state, [vase], 'workshop-p0', rules)).engine;
      return built.dispatch({ type: 'finish a card in their workshop', by: 'p0', cardId: vase });
    };
    expect(press(given(vase, { 'red done': 1 }))).toMatchObject({ ok: false });
    expect(press(given(vase, { 'red done': 2 }))).toMatchObject({ ok: true });
  });
});

describe('a worked value is never written', () => {
  const about = (state: GameState, id: string) => runtime.env(state, undefined, undefined, aboutCard(id));
  const effect = (text: string, id: string) => () => runPhrase(lib, 'effect', text, about(setUp, id));

  it('refuses a rule that gains one', () => {
    expect(effect('it gains 1 red work', potter)).toThrow(kept('red work'));
  });
  it('refuses a rule that sets a worked flag', () => {
    expect(effect('it is done', vase)).toThrow(kept('done'));
    expect(effect('it is not done', vase)).toThrow(kept('done'));
    expect(effect('no card is done', vase)).toThrow(kept('done'));
    expect(effect('every card in the pile is done', vase)).toThrow(kept('done'));
  });
  it('refuses a column it refines too, before saying that a column never changes', () => {
    expect(effect('its wage go up by its skill', potter)).toThrow(kept('wage'));
    expect(effect('it loses its red work', potter)).toThrow(kept('red work'));
  });
  it('refuses an example that arranges one', () => {
    const example = ['Example: a Vase said to be done', "  Given p0's workshop has a Vase", "  And the Vase in p0's workshop is done"].join('\n');
    expect(runExamples(compiled(`${WORKED_GAME}\n\n${example}`), lib)).toEqual([
      expect.objectContaining({ status: 'fail', message: expect.stringContaining('“done” is worked out from its lines, so no rule can change it.') }),
    ]);
  });
});

describe('Review Focus: a value that reads itself', () => {
  it('says so, never overflowing the stack, on the line that asked', () => {
    const rules = compiled(`${WORKED_GAME}\n\nLoop:\n  A red card's loop is its loop.`);
    const looping = createEngine(rules, lib, 2, initialState(rules, 1)).runtime;
    expect(() => looping.workedValue(setUp, potter, 'loop')).toThrow(itself('loop'));
    expect(() => looping.workedValue(setUp, potter, 'loop')).toThrow(expect.objectContaining({ line: rules.worked!.loop.line + 1 }));
    // A card no line reads it for has it without a loop.
    expect(looping.workedValue(setUp, smith, 'loop')).toBe(0);
  });
  it('says so for a flag made of a line that asks it', () => {
    const rules = compiled(`${WORKED_GAME}\n\nLoop:\n  Only if it is loop.`);
    const looping = createEngine(rules, lib, 2, initialState(rules, 1)).runtime;
    expect(() => looping.workedFlag(setUp, vase, 'loop')).toThrow(itself('loop'));
    expect(() => looping.workedFlag(setUp, vase, 'loop')).toThrow(expect.objectContaining({ line: rules.worked!.loop.line + 1, text: 'it is loop' }));
  });
  it('forgets what it was working out once it has said so', () => {
    // Only a tired card gets as far as the line that asks the flag again.
    const rules = compiled(`${WORKED_GAME}\n\nLoop:\n  Only if it is tired.\n  Only if it is loop.`);
    const looping = createEngine(rules, lib, 2, initialState(rules, 1)).runtime;
    expect(() => looping.workedFlag(given(potter, { tired: true }), potter, 'loop')).toThrow(itself('loop'));
    expect(looping.workedFlag(setUp, potter, 'loop')).toBe(false);
  });
  it('(guard) says so for a loop through another value, a number and a flag that read each other, on the line that asked', () => {
    // Loop reads busy and busy reads loop: whichever is asked first is the one the other asks again.
    const rules = compiled(`${WORKED_GAME}\n\nLoop:\n  A busy card's loop is 1.\n\nBusy:\n  Only if its loop is more than 0.`);
    const looping = createEngine(rules, lib, 2, initialState(rules, 1)).runtime;
    expect(() => looping.workedValue(setUp, potter, 'loop')).toThrow(itself('loop'));
    expect(() => looping.workedValue(setUp, potter, 'loop'))
      .toThrow(expect.objectContaining({ line: rules.worked!.busy.line + 1, text: 'its loop is more than 0' }));
    expect(() => looping.workedFlag(setUp, potter, 'busy')).toThrow(itself('busy'));
    expect(() => looping.workedFlag(setUp, potter, 'busy')).toThrow(expect.objectContaining({ line: rules.worked!.loop.line + 1, text: "A busy card's loop is 1" }));
  });
  it('reads one value inside another, which is no loop', () => {
    // Worth reads the worked flag done, which reads the numbers the Vase keeps.
    const rules = compiled(`${WORKED_GAME}\n\nWorth:\n  A done card's worth is 0.`);
    const reading = createEngine(rules, lib, 2, initialState(rules, 1)).runtime;
    expect(reading.workedValue(given(vase, { 'red done': 2 }), vase, 'worth')).toBe(0);
    expect(reading.workedValue(given(vase, { 'red done': 1 }), vase, 'worth')).toBe(3);
  });
});

describe('what the lines need', () => {
  it('marks every line as about a card', () => {
    for (const pattern of ["{cardclass}'s {attribute} is its {attribute}", "{cardclass}'s {attribute} is {int}", "a {cardflag} card's {attribute} is {int}", "an {cardflag} card's {attribute} is {int}"]) {
      expect([pattern, lib.get('value', pattern)?.needsCard]).toEqual([pattern, true]);
    }
  });
});

describe('a card without a number the lines of a value read', () => {
  it('is not so, for a flag: a hand card has no red need, so it is not done', () => {
    const someDone = (state: GameState) => runPhrase<boolean>(lib, 'condition', 'some card is done', runtime.env(state));
    expect(someDone(setUp)).toBe(false);
    expect(someDone(given(vase, { 'red done': 2 }))).toBe(true);
    expect(workedFlag(setUp, potter, 'done')).toBe(false);
  });
  it('fails only the line that reads it, so another line of an Only if one of: still holds', () => {
    const rules = compiled(`${WORKED_GAME}\n\nKeen:\n  Only if one of:\n    its skill is more than 1\n    its pay is more than 1`);
    const reading = createEngine(rules, lib, 2, initialState(rules, 1)).runtime;
    // The Smith has skill 2 and no pay, the Statue pay 2 and no skill; the Potter and the Vase have 1 of one and none of the other.
    expect([smith, statue, potter, vase].map((id) => reading.workedFlag(setUp, id, 'keen'))).toEqual([true, true, false, false]);
  });
  it('leaves a number as the lines before made it, for a line that reads one the card lacks', () => {
    const rules = compiled(`${WORKED_GAME}\n\nReach:\n  A Vase card's reach is 2.\n  A Vase card's reach is its skill.`);
    const reading = createEngine(rules, lib, 2, initialState(rules, 1)).runtime;
    expect(reading.workedValue(setUp, vase, 'reach')).toBe(2);
  });
  it('lets a line read a worked flag that cards without its numbers are not (P4)', () => {
    const rules = compiled(WORKED_GAME.replace("  A Tinker card's wage is 1.", "  A Tinker card's wage is 1.\n  A done card's wage is 0."));
    const reading = createEngine(rules, lib, 2, initialState(rules, 1)).runtime;
    expect([potter, smith, tinker].map((id) => reading.workedValue(setUp, id, 'wage'))).toEqual([1, 2, 1]);
    expect(reading.workedValue(given(vase, { 'red done': 2 }), vase, 'wage')).toBe(0);
    expect(reading.workedValue(setUp, vase, 'wage')).toBeNull();
  });
  it('(guard) is still a mistake outside a worked value: a button that reads it says so, on its line', () => {
    const line = '    Only if its skill is more than 0.';
    const text = WORKED_GAME.replace('  A player may finish a card in their workshop.', `  A player may finish a card in their workshop.\n${line}`);
    const built = createEngine(compiled(text), lib, 2, relocate(setUp, [vase], 'workshop-p0', game)).engine;
    const press = () => built.dispatch({ type: 'finish a card in their workshop', by: 'p0', cardId: vase });
    expect(press).toThrow('This card has no skill.');
    expect(press).toThrow(expect.objectContaining({ line: text.split('\n').indexOf(line) + 1 }));
    expect(() => runPhrase(lib, 'condition', 'its skill is more than 0', runtime.env(setUp, undefined, undefined, aboutCard(vase))))
      .toThrow('This card has no skill.');
  });
});

describe('a game that works nothing out', () => {
  const crew = compiled(CREW_GAME);
  const crewState = createEngine(crew, lib, 2, initialState(crew, 1)).engine.getState();
  const card = crewState.cards.find((c) => c.data?.name === 'Smith')!;
  // A runtime that is asked would say so: a name nothing works out is read from the card itself, with no look-up by id.
  const asked = () => {
    throw new Error('asked the runtime');
  };
  const env = fixtureEnv(crewState, { game: crew, workedValue: asked, workedFlag: asked });

  it('reads a number and a flag from the card itself', () => {
    expect(cardValueOf(env, card, 'skill')).toBe(2);
    expect(cardHasFlag(env, card, 'tired')).toBe(false);
  });
  it('reads a name the game does not work out from the card itself, in a game that works some out', () => {
    const workedEnv = fixtureEnv(setUp, { game, workedValue: asked, workedFlag: asked });
    const smithCard = setUp.cards.find((c) => c.id === smith)!;
    expect(cardValueOf(workedEnv, smithCard, 'skill')).toBe(2);
    expect(cardHasFlag(workedEnv, smithCard, 'tired')).toBe(false);
    expect(() => cardValueOf(workedEnv, smithCard, 'red work')).toThrow('asked the runtime');
  });
});
