import { describe, expect, it } from 'vitest';
import { zoneCards, type GameState } from '../../game-state';
import { putOn } from '../attach';
import { counterOf, setCounter } from '../board-state';
import { createEngine, initialState } from '../build';
import { changeCard } from '../card-facts';
import { compileGame } from '../compile';
import { faceDownReady } from '../declared-actions';
import { TOTALS_GAME, runPhrase } from '../testing';
import type { CompiledGame, Subject } from '../types';
import { relocate } from '../zones';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();

/** Compiles rules that must have no problems at all. */
function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  expect(diagnostics).toEqual([]);
  return game!;
}

const game = compiled(TOTALS_GAME);
const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
/** The state once Setup has run, from seed 1: the jobs in the stashes, the hands in the hall. */
const setUp = engine.getState();
const all = (name: string) => setUp.cards.filter((card) => card.data?.name === name).map((card) => card.id);
const [vase, secondVase] = all('Vase');
const [statue] = all('Statue');
const [potter, secondPotter, thirdPotter] = all('Potter');
const [tinker] = all('Tinker');
const smiths = all('Smith');

/** p0's workshop holding the Vase (pay 1) and the Statue (pay 2), and on the Vase a Potter and a Tinker. */
const table = putOn(relocate(setUp, [vase, statue], 'workshop-p0', game), [potter, tinker], 'crew-p0', vase, game);
const aboutP0: Subject = { player: 'p0', space: null, card: null };
const coins = (state: GameState) => counterOf(state, 'coins', 'p0');
const withCoins = (n: number, state: GameState = table) => setCounter(state, 'coins', 'p0', n);
const condition = (text: string, state: GameState = table) => runPhrase<boolean>(lib, 'condition', text, runtime.env(state, undefined, undefined, aboutP0));
const effect = (text: string, state: GameState = table) => runPhrase<GameState>(lib, 'effect', text, runtime.env(state, undefined, undefined, aboutP0));
const ids = (state: GameState, zoneId: string) => zoneCards(state, zoneId).map((card) => card.id);

/** TOTALS_GAME with a button, “A player may tally.”, whose one Then: line is `line`. */
const tallying = (line: string) =>
  compiled(TOTALS_GAME.replace('  A player may stop.', `  A player may tally.\n    Then:\n      ${line}\n  A player may stop.`));

/**
 * Presses a button of TOTALS_GAME whose one Then: line is `line`, as p0, on `state`: the line runs through the runtime as a button's
 * lines do, and the table is checked once it has.
 */
function pressWith(line: string, state: GameState): GameState {
  const built = createEngine(tallying(line), lib, 2, state).engine;
  expect(built.dispatch({ type: 'tally', by: 'p0' })).toMatchObject({ ok: true });
  return built.getState();
}

describe('sums', () => {
  it('gives them the total of a number over the cards in their zone', () => {
    expect(coins(effect('they get the total pay of the cards in their workshop'))).toBe(12);
  });
  it('takes it from them, reading each card’s number as its value is worked out', () => {
    // The Potter's wage is 1, and the Tinker's 1 too: its column says 0, its worked wage 1.
    expect(coins(effect('they pay the total wage of the cards in their crew'))).toBe(7);
  });
  it('asks whether they have at least the total', () => {
    const atLeast = (n: number) => condition('they have at least the total wage of the cards in their crew in coins', withCoins(n));
    expect([atLeast(2), atLeast(1)]).toEqual([true, false]);
  });
  it('is 0 over no cards', () => {
    expect(condition('the total wage of the cards in their idle is 0')).toBe(true);
    expect(condition('the total wage of the cards in their idle is 1')).toBe(false);
  });
});

describe('a sum over some of the cards', () => {
  it('counts only the cards whose number is more than the one given', () => {
    expect(condition('the total pay of the cards in their workshop whose pay is more than 1 is 2')).toBe(true);
    expect(condition('the total pay of the cards in their workshop whose pay is more than 0 is 3')).toBe(true);
  });
});

describe('a value made of a total', () => {
  it('adds up the cards on the card', () => {
    expect(runtime.workedValue(table, vase, 'crew red')).toBe(2);
    expect(runtime.workedValue(changeCard(table, tinker, { tired: true }, game), vase, 'crew red')).toBe(1);
  });
  it('is 0 on a card with nothing on it', () => {
    expect(runtime.workedValue(table, statue, 'crew red')).toBe(0);
  });
});

describe('a card that lacks the number', () => {
  // The Vase's crew is a Potter and a Tinker, which have a wage and no pay, and the second Vase, which has a pay of 1 and no wage.
  const mixed = putOn(table, [secondVase], 'crew-p0', vase, game);

  it('counts as 0 in a total, which adds up the others', () => {
    expect(coins(effect('they pay the total pay of the cards in their crew', mixed))).toBe(8);
    expect(coins(effect('they pay the total wage of the cards in their crew', mixed))).toBe(7);
  });
  it('counts as 0 in a total a value is worked out from', () => {
    const rules = compiled(`${TOTALS_GAME}\n\nCrew wage:\n  A card's crew wage is the total wage of the cards on it.`);
    const reading = createEngine(rules, lib, 2, initialState(rules, 1)).runtime;
    expect(reading.workedValue(mixed, vase, 'crew wage')).toBe(2);
  });
  it('is not one of the cards whose number is more than some', () => {
    expect(condition('the total wage of the cards in their crew whose wage is more than 0 is 2', mixed)).toBe(true);
  });
  it('(guard: passes before and after) is still the rule’s mistake in a line about that one card', () => {
    const aboutPotter = runtime.env(mixed, undefined, undefined, { player: 'p0', space: null, card: potter });
    expect(() => runPhrase(lib, 'condition', 'its pay is more than 0', aboutPotter)).toThrow('This card has no pay.');
  });
});

describe('the picked cards', () => {
  const rules = compiled(TOTALS_GAME.replace(
    '  A player may stop.',
    '  A player may count some cards from the hall.\n    Only if they have at least the total wage of the picked cards in coins.\n  A player may stop.',
  ));
  const counting = (n: number) => createEngine(rules, lib, 2, withCoins(n, setUp));
  const count = { type: 'count some cards from the hall', by: 'p0', cardIds: smiths };

  it('adds up the cards of the press', () => {
    // The two Smiths have a wage of 2 each.
    expect(counting(4).engine.dispatch(count)).toMatchObject({ ok: true });
    expect(counting(3).engine.dispatch(count)).toMatchObject({ ok: false, reason: 'they have at least the total wage of the picked cards in coins' });
  });
  it('counts as reading the cards of the press, so a face-down pick is judged without it', () => {
    const built = counting(0);
    const action = rules.phases[0].actions.find((a) => a.words === 'count some cards from the hall')!;
    expect(built.runtime.readsCard(action.conditions[0])).toBe(true);
    expect(faceDownReady(built.runtime, action, built.engine.getState(), 'p0', smiths[0])).toBe(true);
  });
});

describe('for each card', () => {
  it('runs a line about each card in turn', () => {
    const after = pressWith('For each card in their workshop, its new red go up by its crew red.', table);
    expect([runtime.workedValue(after, vase, 'new red'), runtime.workedValue(after, statue, 'new red')]).toEqual([2, 0]);
  });
  it('runs only for the cards whose number is more than the one given, about whoever the line is about', () => {
    expect(coins(pressWith('For each card in their workshop whose pay is more than 1, they get 1 coin.', table))).toBe(10);
  });
  it('passes over a card without the number its cards are kept by', () => {
    // Only the Potter, of the Vase, the Statue and the Potter, has a skill.
    const withPotter = relocate(table, [secondPotter], 'workshop-p0', game);
    expect(coins(pressWith('For each card in their workshop whose skill is more than 0, they get 1 coin.', withPotter))).toBe(10);
  });
  it('says so on its line when the number its cards are kept by is no number', () => {
    const rules = tallying('For each card in their crew whose craft is more than 0, they get 1 coin.');
    const [line] = rules.phases[0].actions.find((action) => action.words === 'tally')!.effects;
    const built = createEngine(rules, lib, 2, table).runtime;
    expect(() => built.run(line, table, undefined, undefined, aboutP0))
      .toThrow(expect.objectContaining({ message: 'This card\'s craft isn\'t a number.', line: line.line }));
  });
  it('is about the player who makes a card move, in a card move\'s lines', () => {
    const rules = compiled(TOTALS_GAME.replace(
      '  A player may stop.',
      '  A player may place a card from their stash to their workshop.\n    Then:\n      For each card in their workshop, they get 1 coin.\n  A player may stop.',
    ));
    const built = createEngine(rules, lib, 2, relocate(table, [secondVase], 'stash-p0', game)).engine;
    expect(built.dispatch({ type: 'place', by: 'p0', cardId: secondVase })).toMatchObject({ ok: true });
    // The Vase, the Statue and the second Vase: a coin each.
    expect([coins(built.getState()), counterOf(built.getState(), 'coins', 'p1')]).toEqual([12, 9]);
  });
  it('is about no one in Setup', () => {
    const rules = compiled(TOTALS_GAME.replace(
      '  Deal 2 cards from the pile to each stash.', '  Deal 2 cards from the pile to each stash.\n  For each card in each stash, it is tired.',
    ));
    const started = createEngine(rules, lib, 2, initialState(rules, 1)).engine.getState();
    const tired = (zoneId: string) => zoneCards(started, zoneId).map((card) => card.data?.tired === true);
    expect([...tired('stash-p0'), ...tired('stash-p1')]).toEqual([true, true, true, true]);
    expect(tired('hall').some((flag) => flag)).toBe(false);
  });
});

describe('Review Focus: a walk whose line moves its cards', () => {
  it('visits each card that was there when it began, once, in slot order', () => {
    const three = relocate(setUp, [vase, statue, secondVase], 'workshop-p0', game);
    const after = pressWith('For each card in their workshop, move it to the scrap.', three);
    expect(ids(after, 'scrap')).toEqual([vase, statue, secondVase]);
    expect(ids(after, 'workshop-p0')).toEqual([]);
  });
  it('never visits a card that arrived during the walk', () => {
    const before = relocate(relocate(setUp, [vase, statue], 'workshop-p0', game), [potter, secondPotter, thirdPotter], 'pile', game);
    const after = pressWith('For each card in their workshop, move the top card of the pile to their workshop.', before);
    expect(ids(after, 'workshop-p0')).toEqual([vase, statue, thirdPotter, secondPotter]);
    expect(ids(after, 'pile')).toEqual([potter]);
  });
});
