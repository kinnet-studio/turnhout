import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import { counterOf, gameNumber, owedTo, setCounter, setGameNumber, setPlayerFact } from '../board-state';
import { compileGame } from '../compile';
import { fixtureBoardState, fixtureEnv, runPhrase, TINY_BOARD_HEAD } from '../testing';
import { createDefaultLibrary } from './index';
import { createEngine, initialState } from '../build';
import { GUILD_GAME } from '../testing';

const lib = createDefaultLibrary();
const POT = TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  The game has a pot of 5.');
const game = compileGame(POT, lib).game!;
const start = fixtureBoardState(game);
const about = (state: GameState) => fixtureEnv(state, { game, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null } });
const bare = (state: GameState) => fixtureEnv(state, { game, seats: ['p0', 'p1'] });

describe('numbers that belong to the game', () => {
  it('declares a number of the game and where it starts', () => {
    expect(compileGame(POT, lib).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game.facts).toEqual([{ name: 'pot', on: 'game', kind: 'number', start: 5 }]);
    expect(gameNumber(start, game, 'pot')).toBe(5);
  });
  it('is set by a rule, and paid to the bank from the counter players pay with', () => {
    const s = runPhrase<GameState>(lib, 'effect', 'the pot is 30', about(start));
    expect(gameNumber(s, game, 'pot')).toBe(30);
    expect(counterOf(runPhrase<GameState>(lib, 'effect', 'they pay the pot', about(s)), 'money', 'p0')).toBe(1470);
  });
  it('notes a debt to the bank when paying it takes them below 0', () => {
    const s = runPhrase<GameState>(lib, 'effect', 'they pay the pot', about(setGameNumber(setCounter(start, 'money', 'p0', 10), 'pot', 30)));
    expect([counterOf(s, 'money', 'p0'), owedTo(s, 'p0', 'money')]).toEqual([-20, 'bank']);
  });

  it('is arranged by a Given line and checked by a Then line, which says what it is when it is not what was expected', () => {
    const given = runPhrase<GameState>(lib, 'given', 'the pot is 50', bare(start));
    expect(runPhrase(lib, 'expect', 'the pot is 50', bare(given))).toBe(true);
    expect(runPhrase(lib, 'expect', 'the pot is 40', bare(given))).toBe('Expected the pot to be 40, but it is 50.');
  });
  it('reads a Then line before any rule has set the number, as the number it starts at', () => {
    expect(runPhrase(lib, 'expect', 'the pot is 5', bare(start))).toBe(true);
  });

  it('refuses two numbers of one name, on the later line', () => {
    const twice = compileGame(POT.replace('  The game has a pot of 5.', '  The game has a pot of 5.\n  The game has a pot of 0.'), lib);
    expect(twice.diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message])).toEqual([[16, 'There are two facts called “pot”.']]);
  });
  it('is declared with “an” as well as “a”, and a name of several words', () => {
    const text = TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  The game has an ante of 2.\n  The game has a high pot of 0.');
    const built = compileGame(text, lib);
    expect(built.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(built.game!.facts).toEqual([
      { name: 'ante', on: 'game', kind: 'number', start: 2 }, { name: 'high pot', on: 'game', kind: 'number', start: 0 },
    ]);
  });

  it('needs a player, and something to pay with, to be paid', () => {
    expect(lib.get('effect', 'they pay the {gamenumber}')).toMatchObject({ needsPlayer: true, needsPayment: true });
  });
  it('reads a number named like something every object has as the game\'s own number, not as what objects have', () => {
    const odd = compileGame(POT.replace('  The game has a pot of 5.', '  The game has a constructor of 3.'), lib).game!;
    const begun = fixtureBoardState(odd);
    expect(gameNumber(begun, odd, 'constructor')).toBe(3);
    expect(gameNumber(setGameNumber(begun, 'constructor', 7), odd, 'constructor')).toBe(7);
  });
  it('says the game has no number called that when it never declared one', () => {
    expect(() => gameNumber(start, game, 'ante')).toThrow('The game has no number called “ante”.');
  });
});

describe('a number of the game and the player who holds a flag', () => {
  const HELD = POT.replace('  The game has a pot of 5.', '  The game has a pot of 5.\n  Players can be leading.\n  Players can be the rival.');
  const held = compileGame(HELD, lib).game!;
  const rivalry = setPlayerFact(fixtureBoardState(held), 'p1', 'the rival', true);
  /** A rule about p0. */
  const ofP0 = (state: GameState) => fixtureEnv(state, { game: held, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null } });
  const run = <T>(kind: 'effect' | 'condition', text: string, state: GameState) => runPhrase<T>(lib, kind, text, ofP0(state));

  it('is paid to that player, named either way', () => {
    const paid = run<GameState>('effect', 'they pay the pot to the rival', rivalry);
    expect([counterOf(paid, 'money', 'p0'), counterOf(paid, 'money', 'p1')]).toEqual([1495, 1505]);
    expect(run<GameState>('effect', 'they pay the pot to the player who is the rival', rivalry)).toEqual(paid);
  });
  it('notes a debt to that player when paying it takes them below 0', () => {
    const s = run<GameState>('effect', 'they pay the pot to the rival', setCounter(rivalry, 'money', 'p0', 3));
    expect([counterOf(s, 'money', 'p0'), owedTo(s, 'p0', 'money')]).toEqual([-2, 'p1']);
  });
  it('is compared with a number, and with what they have', () => {
    expect([run('condition', 'the pot is more than 4', rivalry), run('condition', 'the pot is more than 5', rivalry)]).toEqual([true, false]);
    const having = (money: number) => run('condition', 'they have at least the pot in money', setCounter(rivalry, 'money', 'p0', money));
    expect([having(5), having(4)]).toEqual([true, false]);
  });
  it('needs a player, and something to pay with, to be paid; and a player to be compared with what they have', () => {
    expect(lib.get('effect', 'they pay the {gamenumber} to {holder}')).toMatchObject({ needsPlayer: true, needsPayment: true });
    expect(lib.get('condition', 'they have at least the {gamenumber} in {counter}')).toMatchObject({ needsPlayer: true });
  });
});

describe('a number of the game and the player a press picked', () => {
  // The Guild's fee is 2, and each player starts with 9 coins.
  const guild = compileGame(GUILD_GAME, lib).game!;
  const { engine, runtime } = createEngine(guild, lib, 3, initialState(guild, 1));
  const begun = engine.getState();
  /** A rule about p0, in a press that picked `picked` when it names one. */
  const ofP0 = (state: GameState, picked?: string) =>
    runtime.env(state, undefined, undefined, { player: 'p0', space: null, card: null, ...(picked === undefined ? {} : { picked }) });

  it('is compared, a number of times over, with what they have', () => {
    const having = (coins: number) =>
      runPhrase<boolean>(lib, 'condition', 'they have at least 2 times the fee in coins', ofP0(setCounter(begun, 'coins', 'p0', coins)));
    expect([having(4), having(3)]).toEqual([true, false]);
    expect(lib.get('condition', 'they have at least {int} times the {gamenumber} in {counter}')).toMatchObject({ needsPlayer: true });
  });
  it('is paid to that player', () => {
    const paid = runPhrase<GameState>(lib, 'effect', 'they pay the fee to that player', ofP0(begun, 'p1'));
    expect([counterOf(paid, 'coins', 'p0'), counterOf(paid, 'coins', 'p1'), counterOf(paid, 'coins', 'p2')]).toEqual([7, 11, 9]);
    expect(lib.get('effect', 'they pay the {gamenumber} to that player')).toMatchObject({ needsPlayer: true, needsPick: true, needsPayment: true });
  });
  it('is paid to that player only in a button that picks one', () => {
    const PAY = '      They pay the fee to that player.';
    const text = GUILD_GAME.replace('      Their moves go back to 0.\n', `      Their moves go back to 0.\n${PAY}\n`);
    expect(compileGame(text, lib).diagnostics.map((d) => [d.line, d.message])).toEqual([[
      text.split('\n').indexOf(PAY) + 1,
      '“They pay the fee to that player” only makes sense in a button whose wording ends in “another player”, like “A player may challenge another player.”',
    ]]);
  });
});
