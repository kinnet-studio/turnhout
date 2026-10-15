import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import type { PlayerId } from '../../scene';
import { markOut, playerFact, setPlayerFact } from '../board-state';
import { compileGame } from '../compile';
import { runExamples } from '../examples';
import { TINY_BOARD_HEAD, fixtureBoardGame, fixtureBoardState, fixtureEnv, runPhrase, vocabFor } from '../testing';
import type { FactSpec } from '../types';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();

const FACTS: FactSpec[] = [{ name: 'in jail', on: 'player', kind: 'flag' }, { name: 'jail turns', on: 'player', kind: 'number' }];
const game = fixtureBoardGame({ facts: FACTS });
const seats = ['p0', 'p1', 'p2'];
const fresh = () => fixtureBoardState(game, seats);

/** The env of a rule about a player. */
const about = (state: GameState, player: PlayerId) => fixtureEnv(state, { game, seats, subject: { player, space: null, card: null } });
/** The env of an example line, which has no player. */
const bare = (state: GameState) => fixtureEnv(state, { game, seats });

const effect = (text: string, state: GameState, player: PlayerId = 'p0') => runPhrase<GameState>(lib, 'effect', text, about(state, player));
const condition = (text: string, state: GameState, player: PlayerId = 'p0') => runPhrase<boolean>(lib, 'condition', text, about(state, player));
const who = (text: string, state: GameState) => runPhrase<PlayerId[]>(lib, 'who', text, bare(state));
const given = (text: string, state: GameState = fresh()) => runPhrase<GameState>(lib, 'given', text, bare(state));
const expectThat = (text: string, state: GameState = fresh()) => runPhrase<true | string>(lib, 'expect', text, bare(state));

describe('declaring facts about players', () => {
  it('lists facts of one word or several, told what they are on', () => {
    expect(lib.match('declare', 'Players can have jail turns and a crown', vocabFor(game))).toEqual({
      status: 'ok', pattern: 'players can have {factlist}', args: [[{ name: 'jail turns', kind: 'number' }, { name: 'crown', kind: 'flag' }]],
    });
    const declared = (text: string) => {
      const found = lib.match('declare', text, vocabFor(game));
      if (found.status !== 'ok') throw new Error(text);
      return (lib.get('declare', found.pattern)!.fn as (args: unknown[]) => unknown)(found.args);
    };
    expect(declared('Players can have jail turns and a crown')).toEqual([
      { name: 'jail turns', kind: 'number', on: 'player' }, { name: 'crown', kind: 'flag', on: 'player' },
    ]);
    expect(declared('Players can be In Jail')).toEqual([{ name: 'in jail', on: 'player', kind: 'flag' }]);
  });
});

describe('a flag a player has', () => {
  it('is false until someone sets it, and “not” says so', () => {
    expect(condition('they are in jail', fresh())).toBe(false);
    expect(condition('they are not in jail', fresh())).toBe(true);
  });
  it('is set for the player the rule is about, and no one else', () => {
    const s = effect('they are in jail', fresh(), 'p1');
    expect(playerFact(s, 'p1', 'in jail')).toBe(true);
    expect(playerFact(s, 'p0', 'in jail')).toBeNull();
    expect(condition('they are in jail', s, 'p1')).toBe(true);
    expect(condition('they are in jail', s, 'p0')).toBe(false);
    expect(condition('they are not in jail', s, 'p1')).toBe(false);
  });
  it('is cleared by “not”, which sets it to false', () => {
    const s = effect('they are not in jail', effect('they are in jail', fresh(), 'p1'), 'p1');
    expect(playerFact(s, 'p1', 'in jail')).toBe(false);
    expect(condition('they are in jail', s, 'p1')).toBe(false);
  });
});

describe('a number a player has', () => {
  it('is 0 until someone sets it', () => {
    expect(condition('they have 0 jail turns', fresh())).toBe(true);
    expect(condition('they have 1 jail turn', fresh())).toBe(false);
  });
  it('gains, in the singular or the plural, and holds exactly that many', () => {
    const once = effect('they gain 1 jail turn', fresh());
    const twice = effect('they gain 1 jail turn', once);
    expect(playerFact(twice, 'p0', 'jail turns')).toBe(2);
    expect(playerFact(twice, 'p1', 'jail turns')).toBeNull();
    expect(condition('they have 2 jail turns', twice)).toBe(true);
    expect(condition('they have 1 jail turn', twice)).toBe(false);
    expect(playerFact(effect('they gain 3 jail turns', once), 'p0', 'jail turns')).toBe(4);
  });
  it('goes back to a number', () => {
    const s = effect('their jail turns go back to 0', effect('they gain 2 jail turns', fresh()));
    expect(playerFact(s, 'p0', 'jail turns')).toBe(0);
    expect(playerFact(effect('their jail turns go back to 3', fresh(), 'p2'), 'p2', 'jail turns')).toBe(3);
  });
});

describe('rules about a player', () => {
  // Review Focus: a player who is out is not asked, and the answer is in seat order.
  it('finds the players still in who have the fact', () => {
    const arranged = markOut(
      setPlayerFact(setPlayerFact(setPlayerFact(fresh(), 'p0', 'jail turns', 3), 'p1', 'jail turns', 3), 'p2', 'in jail', true),
      'p0',
    );
    expect(who('a player has 3 jail turns', arranged)).toEqual(['p1']);
    expect(who('a player is in jail', arranged)).toEqual(['p2']);
    expect(who('a player is in jail', fresh())).toEqual([]);
  });
  it('keeps seat order', () => {
    const s = setPlayerFact(setPlayerFact(fresh(), 'p2', 'in jail', true), 'p0', 'in jail', true);
    expect(who('a player is in jail', s)).toEqual(['p0', 'p2']);
  });
});

describe('examples about player facts', () => {
  it('gives a player the facts directly', () => {
    const s = given('p1 has 2 jail turns', given('p1 is in jail'));
    expect(playerFact(s, 'p1', 'in jail')).toBe(true);
    expect(playerFact(s, 'p1', 'jail turns')).toBe(2);
    expect(playerFact(s, 'p0', 'in jail')).toBeNull();
  });
  it('expects a flag', () => {
    expect(expectThat('p0 is in jail', given('p0 is in jail'))).toBe(true);
    expect(expectThat('p0 is in jail')).toBe("Expected p0 to be in jail, but they aren't.");
    expect(expectThat('p1 is not in jail')).toBe(true);
    expect(expectThat('p1 is not in jail', given('p1 is in jail'))).toBe('Expected p1 not to be in jail, but they are.');
  });
  it('expects a count, saying how many there are instead', () => {
    expect(expectThat('p1 has 2 jail turns', given('p1 has 2 jail turns'))).toBe(true);
    expect(expectThat('p0 has 0 jail turns')).toBe(true);
    expect(expectThat('p0 has 1 jail turn')).toBe('Expected p0 to have 1 jail turn, but they have 0.');
    expect(expectThat('p0 has 3 jail turns', given('p0 has 1 jail turn', fresh()))).toBe('Expected p0 to have 3 jail turns, but they have 1.');
  });
});

describe('beside the phrases about a player leaving the game', () => {
  const vocab = vocabFor(game);
  it('keeps “they are out” and “p0 is out” the phrases they were', () => {
    expect(lib.match('effect', 'They are out', vocab)).toEqual({ status: 'ok', pattern: 'they are out', args: [] });
    expect(lib.match('condition', 'They are out', vocab).status).toBe('unknown');
    expect(lib.match('given', 'p0 is out', vocab)).toEqual({ status: 'ok', pattern: '{player} is out', args: ['p0'] });
    expect(lib.match('expect', 'p0 is out', vocab)).toEqual({ status: 'ok', pattern: '{player} is out', args: ['p0'] });
  });
  it('keeps each of the new phrases to one reading', () => {
    for (const [kind, text] of [
      ['condition', 'they are in jail'], ['condition', 'they are not in jail'], ['effect', 'they are in jail'], ['effect', 'they are not in jail'],
      ['condition', 'they have 1 jail turn'], ['effect', 'they gain 2 jail turns'], ['effect', 'their jail turns go back to 0'],
      ['who', 'a player is in jail'], ['who', 'a player has 1 jail turn'], ['given', 'p0 is in jail'], ['given', 'p0 has 1 jail turn'],
      ['expect', 'p0 is in jail'], ['expect', 'p0 is not in jail'], ['expect', 'p0 has 1 jail turn'],
    ] as const) {
      expect(lib.match(kind, text, vocab).status, `${kind}: ${text}`).toBe('ok');
    }
  });
  it('still reads a counter as a counter', () => {
    expect(lib.match('expect', 'p0 has 3 money', vocab)).toMatchObject({ status: 'ok', pattern: '{player} has {int} {counter}' });
    expect(lib.match('given', 'p0 has 3 money', vocab)).toMatchObject({ status: 'ok', pattern: '{player} has {int} {counter}' });
  });
});

describe('a player fact misspelt', () => {
  it('says there is no such player fact, with the one nearest', () => {
    expect(lib.misnamed(['condition'], 'they are in jial', vocabFor(game))).toEqual({
      kind: 'condition', problem: { message: 'There is no player fact called “in jial”.', suggestions: ['in jail'] },
    });
  });
  it('says so for a count too, and for “not”', () => {
    expect(lib.misnamed(['condition'], 'they have 1 jail turnn', vocabFor(game))).toEqual({
      kind: 'condition', problem: { message: 'There is no player fact called “jail turnn”.', suggestions: ['jail turns'] },
    });
    expect(lib.misnamed(['condition'], 'they are not in jial', vocabFor(game))).toEqual({
      kind: 'condition', problem: { message: 'There is no player fact called “in jial”.', suggestions: ['in jail'] },
    });
  });
});

describe('a counter misspelt beside player facts', () => {
  it('is still a counter the designer meant, and a player fact a player fact', () => {
    expect(lib.misnamed(['given'], 'p0 has 3 monye', vocabFor(game))).toEqual({
      kind: 'given', problem: { message: 'There is no counter called “monye”.', suggestions: ['money'] },
    });
    expect(lib.misnamed(['given'], 'p0 has 3 jail turnn', vocabFor(game))).toEqual({
      kind: 'given', problem: { message: 'There is no player fact called “jail turnn”.', suggestions: ['jail turns'] },
    });
    expect(lib.misnamed(['expect'], 'p0 is in jial', vocabFor(game))).toEqual({
      kind: 'expect', problem: { message: 'There is no player fact called “in jial”.', suggestions: ['in jail'] },
    });
  });
});

describe('a game that keeps facts about its players', () => {
  const RULES = [
    '  Players can be in jail.', '  Players can have jail turns.',
  ];
  const text = (...lines: string[]) =>
    [TINY_BOARD_HEAD.replace('  There are two six-sided dice.', ['  There are two six-sided dice.', ...RULES].join('\n')), ...lines].join('\n');

  it('picks the players a rule is about by what they have, and runs its lines about each', () => {
    const { game, diagnostics } = compileGame(text(
      '  A player may wait.', '    Then:', '      They gain 1 jail turn.',
      '  When a player has 2 jail turns:', '    They are in jail.', '    They gain 1 jail turn.',
      '  When a player is in jail:', '    Only if they have 4 jail turns.', '    They are not in jail.', '    Their jail turns go back to 0.',
      '', 'Example: waiting', '  When p0 waits', '  Then p0 is not in jail', '  And p0 has 1 jail turn',
      '  When p0 waits', '  Then p0 is in jail', '  And p1 is not in jail', '  And p0 has 3 jail turns',
      '  When p0 waits', '  Then p0 is not in jail', '  And p0 has 0 jail turns',
    ), createDefaultLibrary());
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(runExamples(game!, createDefaultLibrary())).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
  });
  it('tells a designer which fact an example was wrong about, in their words', () => {
    const { game } = compileGame(text(
      '  A player may wait.', '    Then:', '      They gain 1 jail turn.',
      '', 'Example: one wait', '  When p0 waits', '  Then p0 has 2 jail turns',
    ), createDefaultLibrary());
    expect(runExamples(game!, createDefaultLibrary())).toEqual([
      expect.objectContaining({ status: 'fail', message: 'Expected p0 to have 2 jail turns, but they have 1.' }),
    ]);
  });
  it('reports a player fact that is misspelt, with the facts there are', () => {
    const { diagnostics } = compileGame(text('  A player may wait.', '    Only if they are in jial.'), createDefaultLibrary());
    expect(diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message, d.suggestions])).toEqual([
      [21, 'There is no player fact called “in jial”.', ['in jail']],
    ]);
  });
});
