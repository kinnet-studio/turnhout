import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import {
  OWES_KEY, TURN_KEY, TURN_ROLLS_KEY, addToCounter, clearTurnLog, counterOf, isOut, latestRoll, markOut, ownerOf, owedTo, pieceAt, placePiece,
  queueRoll, recordAction, recordDebt, rollsThisTurn, setCounter, setOwner, setRoll, setRollsThisTurn, takeQueuedRoll,
} from '../board-state';
import { RuleError } from '../diagnostics';
import {
  FIXTURE_SPACES, fixtureBoardGame, fixtureBoardState, fixtureEnv, fixtureGame, fixturePhase, fixtureState, runPhrase, vocabFor,
} from '../testing';
import type { DeclaredAction, Moment } from '../types';
import { chooseNext } from '../zones';
import { isDouble } from './board-phrases';
import { createDefaultLibrary } from './index';
import { itOf, theyOf } from './support';

const lib = createDefaultLibrary();
// The phase's roll action gives `{done}` its word, "rolled".
const ROLL: DeclaredAction = {
  verb: 'roll', words: 'roll the dice', base: 'roll the dice', label: 'Roll the dice', target: null, anyone: false, amount: false, conditions: [], effects: [], line: 1,
};
const game = fixtureBoardGame({ phases: [fixturePhase('playing', [], { actions: [ROLL] })] });
const env = (state: GameState, over: Partial<Parameters<typeof fixtureEnv>[1]> = {}) =>
  fixtureEnv(state, { game, seats: ['p0', 'p1', 'p2'], ...over });
const as = (player: string, space: number | null = null) => ({ subject: { player, space, card: null } });

describe('the subject of a rule', () => {
  it('they is the subject player, and a missing one is a bug in the compiler', () => {
    expect(theyOf(env(fixtureBoardState(), as('p1')))).toBe('p1');
    expect(() => theyOf(env(fixtureBoardState()))).toThrow('needs a player');
  });
  it('it is the subject space, else the space of their piece', () => {
    expect(itOf(env(fixtureBoardState(), as('p0', 3)))).toBe(3);
    // Space 0 is a real space: it must not be mistaken for no space.
    expect(itOf(env(placePiece(fixtureBoardState(), 'p0', 4), as('p0', 0)))).toBe(0);
    expect(itOf(env(placePiece(fixtureBoardState(), 'p0', 4), as('p0')))).toBe(4);
  });
  it('says so when they have no piece on the board', () => {
    expect(() => itOf(env(placePiece(fixtureBoardState(), 'p0', null), as('p0')))).toThrow('They have no piece on the board.');
  });
});

describe('dice', () => {
  it('rolls two six-sided dice from the rng, and the same rng rolls the same faces', () => {
    const s = runPhrase<GameState>(lib, 'effect', 'roll the dice', env(fixtureBoardState()));
    const faces = latestRoll(s)!;
    expect(faces).toHaveLength(2);
    expect(faces.every((f) => f >= 1 && f <= 6)).toBe(true);
    expect(s.rng.count).toBe(fixtureBoardState().rng.count + 2);
    expect(latestRoll(runPhrase<GameState>(lib, 'effect', 'roll the dice', env(fixtureBoardState())))).toEqual(faces);
  });
  it('uses a queued roll without touching the rng', () => {
    const start = queueRoll(fixtureBoardState(), [3, 4]);
    const s = runPhrase<GameState>(lib, 'effect', 'roll the dice', env(start));
    expect(latestRoll(s)).toEqual([3, 4]);
    expect(s.rng).toEqual(start.rng);
  });
  it('uses queued rolls one at a time, oldest first', () => {
    const start = queueRoll(queueRoll(fixtureBoardState(), [3, 4]), [1, 1]);
    const first = runPhrase<GameState>(lib, 'effect', 'roll the dice', env(start));
    expect(latestRoll(runPhrase<GameState>(lib, 'effect', 'roll the dice', env(first)))).toEqual([1, 1]);
  });
  it('rolls as many faces as the game has dice, of the sides it names', () => {
    const base = fixtureBoardGame().board!;
    const oneDie = fixtureBoardGame({ board: { ...base, dice: { count: 1, sides: 20 } }, phases: game.phases });
    const s = runPhrase<GameState>(lib, 'effect', 'roll the dice', fixtureEnv(fixtureBoardState(oneDie), { game: oneDie, seats: ['p0', 'p1'] }));
    expect(latestRoll(s)).toHaveLength(1);
    expect(latestRoll(s)![0]).toBeGreaterThanOrEqual(1);
    expect(latestRoll(s)![0]).toBeLessThanOrEqual(20);
  });
  it('tells the designer when the game has no dice', () => {
    const base = fixtureBoardGame().board!;
    const diceless = fixtureBoardGame({ board: { ...base, dice: null }, phases: game.phases });
    expect(() => runPhrase(lib, 'effect', 'roll the dice', fixtureEnv(fixtureBoardState(diceless), { game: diceless, seats: ['p0', 'p1'] })))
      .toThrow('This game has no dice. Add a line like “There are two six-sided dice.” under Board:');
  });
});

describe('doubles', () => {
  const rolledBy = (seat: string, faces: number[], s: GameState = fixtureBoardState()) =>
    runPhrase<GameState>(lib, 'effect', 'roll the dice', env(queueRoll(s, faces), as(seat)));
  const holds = (text: string, seat: string, s: GameState) => runPhrase<boolean>(lib, 'condition', text, env(s, as(seat)));

  it('is two equal faces and nothing else', () => {
    expect([isDouble([4, 4]), isDouble([4]), isDouble([4, 4, 4]), isDouble([4, 5])]).toEqual([true, false, false, false]);
  });
  it("keeps each roll of the player who rolled, queued or from the rng, and none when nobody in particular rolls", () => {
    expect(rollsThisTurn(rolledBy('p0', [3, 3]), 'p0')).toEqual([[3, 3]]);
    const random = runPhrase<GameState>(lib, 'effect', 'roll the dice', env(fixtureBoardState(), as('p1')));
    expect(rollsThisTurn(random, 'p1')).toEqual([latestRoll(random)]);
    const nobody = runPhrase<GameState>(lib, 'effect', 'roll the dice', env(queueRoll(fixtureBoardState(), [3, 3])));
    expect(nobody.data).not.toHaveProperty(TURN_ROLLS_KEY);
  });
  it('says whether the last roll was a double, and how many doubles there were', () => {
    const s = rolledBy('p0', [1, 2], rolledBy('p0', [3, 3]));
    const says = [
      'they rolled a double', 'they did not roll a double', 'they have rolled 1 double this turn', 'they have rolled 2 doubles this turn',
      'they have rolled fewer than 2 doubles this turn',
    ].map((text) => holds(text, 'p0', s));
    expect(says).toEqual([false, true, true, false, true]);
  });
  it('is not a double before anyone has rolled', () => {
    expect(holds('they rolled a double', 'p0', fixtureBoardState())).toBe(false);
    expect(holds('they did not roll a double', 'p0', fixtureBoardState())).toBe(true);
    expect(holds('they have rolled 0 doubles this turn', 'p0', fixtureBoardState())).toBe(true);
    expect(holds('they have rolled fewer than 1 double this turn', 'p0', fixtureBoardState())).toBe(true);
  });
  it("never counts another seat's double, or one from a turn that has passed", () => {
    const s = rolledBy('p0', [3, 3]);
    expect([holds('they rolled a double', 'p0', s), holds('they rolled a double', 'p1', s)]).toEqual([true, false]);
    const passed = chooseNext(s, 'p1');
    expect(latestRoll(passed)).toEqual([3, 3]);
    expect([holds('they rolled a double', 'p1', passed), holds('they have rolled 0 doubles this turn', 'p1', passed), holds('they rolled a double', 'p0', passed)])
      .toEqual([false, true, false]);
  });
  it('picks the players still in who have rolled exactly that many doubles, in seat order', () => {
    const three = [[1, 1], [2, 2], [3, 3]];
    const s = markOut(setRollsThisTurn(setRollsThisTurn(fixtureBoardState(), 'p1', three), 'p2', three), 'p2');
    expect(runPhrase<string[]>(lib, 'who', 'a player has rolled 3 doubles this turn', env(s))).toEqual(['p1']);
    // A roll that was not a double does not count, and a player who rolled none has rolled 0 doubles.
    const mixed = setRollsThisTurn(fixtureBoardState(), 'p1', [[1, 1], [2, 3]]);
    expect(runPhrase<string[]>(lib, 'who', 'a player has rolled 1 double this turn', env(mixed))).toEqual(['p1']);
    expect(runPhrase<string[]>(lib, 'who', 'a player has rolled 0 doubles this turn', env(mixed))).toEqual(['p0', 'p2']);
  });
  it('needs a player, dice and exactly two of them, as the library says', () => {
    const needs = (kind: 'condition' | 'who', pattern: string) => lib.get(kind, pattern);
    expect(needs('condition', 'they rolled a double')).toMatchObject({ needsPlayer: true, needsDice: true, needsTwoDice: true });
    expect(needs('condition', 'they did not roll a double')).toMatchObject({ needsPlayer: true, needsDice: true, needsTwoDice: true });
    expect(needs('condition', 'they have rolled {int} double(s) this turn')).toMatchObject({ needsPlayer: true, needsDice: true, needsTwoDice: true });
    expect(needs('condition', 'they have rolled fewer than {int} double(s) this turn'))
      .toMatchObject({ needsPlayer: true, needsDice: true, needsTwoDice: true });
    expect(needs('who', 'a player has rolled {int} double(s) this turn')).toMatchObject({ needsPlayer: false, needsDice: true, needsTwoDice: true });
  });
});

describe('moving', () => {
  it('moves the piece, announcing each space passed, then the landing', () => {
    const seen: Moment[] = [];
    const announce = (s: GameState, m: Moment) => { seen.push(m); return s; };
    const start = setRoll(placePiece(fixtureBoardState(), 'p0', 6), [1, 2]);
    const s = runPhrase<GameState>(lib, 'effect', 'their piece moves forward by the roll', env(start, { ...as('p0'), announce }));
    expect(pieceAt(s, 'p0')).toBe(1);
    expect(seen).toEqual([
      { kind: 'pass', seat: 'p0', space: 7 }, { kind: 'pass', seat: 'p0', space: 0 },
      { kind: 'pass', seat: 'p0', space: 1 }, { kind: 'land', seat: 'p0', space: 1 },
    ]);
  });
  it('stops walking when a passes rule moves the piece elsewhere, and announces no landing', () => {
    const seen: Moment[] = [];
    const announce = (s: GameState, m: Moment) => {
      seen.push(m);
      return seen.length === 1 ? placePiece(s, 'p0', 2) : s;
    };
    const start = setRoll(placePiece(fixtureBoardState(), 'p0', 6), [1, 2]);
    const s = runPhrase<GameState>(lib, 'effect', 'their piece moves forward by the roll', env(start, { ...as('p0'), announce }));
    expect(seen).toEqual([{ kind: 'pass', seat: 'p0', space: 7 }]);
    expect(pieceAt(s, 'p0')).toBe(2);
  });
  it('stops walking when a passes rule takes the player out, and announces no landing', () => {
    const seen: Moment[] = [];
    const announce = (s: GameState, m: Moment) => { seen.push(m); return markOut(s, 'p0'); };
    const start = setRoll(placePiece(fixtureBoardState(), 'p0', 6), [1, 2]);
    const s = runPhrase<GameState>(lib, 'effect', 'their piece moves forward by the roll', env(start, { ...as('p0'), announce }));
    expect(seen).toEqual([{ kind: 'pass', seat: 'p0', space: 7 }]);
    expect(isOut(s, 'p0')).toBe(true);
  });
  it('has the piece on the space it is announced for', () => {
    const where: (number | null)[] = [];
    const announce = (s: GameState) => { where.push(pieceAt(s, 'p0')); return s; };
    const start = setRoll(fixtureBoardState(), [1, 1]);
    runPhrase(lib, 'effect', 'their piece moves forward by the roll', env(start, { ...as('p0'), announce }));
    expect(where).toEqual([1, 2, 2]);
  });
  it('keeps what the announced rules changed', () => {
    const announce = (s: GameState, m: Moment) => (m.kind === 'land' ? addToCounter(s, 'money', m.seat, 5) : s);
    const start = setRoll(fixtureBoardState(), [1, 1]);
    const s = runPhrase<GameState>(lib, 'effect', 'their piece moves forward by the roll', env(start, { ...as('p0'), announce }));
    expect(counterOf(s, 'money', 'p0')).toBe(1505);
  });
  it('needs a roll first', () => {
    const announce = (s: GameState) => s;
    expect(() => runPhrase(lib, 'effect', 'their piece moves forward by the roll', env(fixtureBoardState(), { ...as('p0'), announce })))
      .toThrow('Nobody has rolled the dice yet.');
  });
  it('is a bug in the compiler when nothing is listening for the moments', () => {
    const start = setRoll(fixtureBoardState(), [1, 2]);
    expect(() => runPhrase(lib, 'effect', 'their piece moves forward by the roll', env(start, as('p0')))).toThrow(/announce|listening/);
  });
});

describe('going straight to a space', () => {
  it('puts the piece there at once: nothing is passed or landed on, so Go pays nothing on the way', () => {
    let announced = 0;
    const announce = (s: GameState) => { announced += 1; return s; };
    const start = placePiece(fixtureBoardState(), 'p0', 5);
    const s = runPhrase<GameState>(lib, 'effect', 'their piece goes straight to Go', env(start, { ...as('p0'), announce }));
    expect(pieceAt(s, 'p0')).toBe(0);
    expect(announced).toBe(0);
    expect(counterOf(s, 'money', 'p0')).toBe(1500);
  });
  it('says so when they have no piece on the board, and leaves them without one', () => {
    const start = markOut(fixtureBoardState(), 'p1');
    expect(() => runPhrase(lib, 'effect', 'their piece goes straight to Go', env(start, as('p1')))).toThrow('They have no piece on the board.');
    expect(pieceAt(start, 'p1')).toBeNull();
  });
});

describe('moving forward to a space, and back', () => {
  /** Where p0's piece ends and every moment on the way, from `from`. */
  const walked = (text: string, from: number) => {
    const seen: string[] = [];
    const announce = (s: GameState, m: Moment) => { seen.push(`${m.kind} ${m.space}`); return s; };
    const s = runPhrase<GameState>(lib, 'effect', text, env(placePiece(fixtureBoardState(), 'p0', from), { ...as('p0'), announce }));
    return { at: pieceAt(s, 'p0'), seen };
  };
  it('walks forward to the space, passing every space on the way and the space itself, then lands', () => {
    expect(walked('their piece moves forward to Go', 5)).toEqual({ at: 0, seen: ['pass 6', 'pass 7', 'pass 0', 'land 0'] });
    expect(walked('their piece moves forward to Mill Lane', 1).seen).toHaveLength(9);
  });
  it('walks forward to the first space of the kind ahead, never the one it is on', () => {
    expect(walked('their piece moves forward to the nearest utility', 4)).toEqual({ at: 6, seen: ['pass 5', 'pass 6', 'land 6'] });
    expect(walked('their piece moves forward to the nearest station', 4).seen.at(-1)).toBe('land 3');
    expect(walked('their piece moves forward to the nearest chance', 4).at).toBe(7);
  });
  it('moves back without passing anything, going round past Go backwards', () => {
    expect(walked('their piece moves back 3 spaces', 1)).toEqual({ at: 6, seen: ['land 6'] });
    expect(walked('their piece moves back 1 space', 4)).toEqual({ at: 3, seen: ['land 3'] });
  });
  it('asks for at least one space back', () => {
    const start = placePiece(fixtureBoardState(), 'p0', 4);
    expect(() => runPhrase(lib, 'effect', 'their piece moves back 0 spaces', env(start, { ...as('p0'), announce: (s) => s })))
      .toThrow('Say how many spaces back, 1 or more.');
  });
  it('says so when they have no piece on the board, going forward or back', () => {
    const start = markOut(fixtureBoardState(), 'p1');
    for (const text of ['their piece moves forward to Go', 'their piece moves forward to the nearest station', 'their piece moves back 3 spaces']) {
      expect(() => runPhrase(lib, 'effect', text, env(start, as('p1')))).toThrow('They have no piece on the board.');
    }
  });
  it('ends the walk where a passes rule moves the piece, and announces no landing', () => {
    const seen: string[] = [];
    const announce = (s: GameState, m: Moment) => {
      seen.push(`${m.kind} ${m.space}`);
      return seen.length === 1 ? placePiece(s, 'p0', 2) : s;
    };
    const s = runPhrase<GameState>(lib, 'effect', 'their piece moves forward to Go', env(placePiece(fixtureBoardState(), 'p0', 5), { ...as('p0'), announce }));
    expect(seen).toEqual(['pass 6']);
    expect(pieceAt(s, 'p0')).toBe(2);
  });
  it('is a bug in the compiler when nothing is listening for the moments', () => {
    for (const text of ['their piece moves forward to Go', 'their piece moves forward to the nearest utility', 'their piece moves back 3 spaces']) {
      expect(() => runPhrase(lib, 'effect', text, env(fixtureBoardState(), as('p0')))).toThrow(/announce|listening/);
    }
  });
});

describe('counters', () => {
  it('gives a number to its player and to they', () => {
    const start = fixtureBoardState();
    const a = runPhrase<GameState>(lib, 'effect', 'its player gets 200 money', env(start, as('p1')));
    expect(counterOf(a, 'money', 'p1')).toBe(1700);
    const b = runPhrase<GameState>(lib, 'effect', 'they get 50 money', env(start, as('p0')));
    expect(counterOf(b, 'money', 'p0')).toBe(1550);
  });
  it('judges whether they have enough', () => {
    const start = setCounter(fixtureBoardState(), 'money', 'p0', 100);
    expect(runPhrase(lib, 'condition', 'they have at least 100 money', env(start, as('p0')))).toBe(true);
    expect(runPhrase(lib, 'condition', 'they have at least 101 money', env(start, as('p0')))).toBe(false);
  });
  it('finds players below a number, skipping players who are out', () => {
    const start = markOut(setCounter(setCounter(fixtureBoardState(), 'money', 'p1', -5), 'money', 'p0', -1), 'p0');
    expect(runPhrase(lib, 'who', 'a player has less than 0 money', env(start))).toEqual(['p1']);
  });
  it('finds players in seat order', () => {
    const start = setCounter(setCounter(fixtureBoardState(), 'money', 'p2', 1), 'money', 'p0', 2);
    expect(runPhrase(lib, 'who', 'a player has less than 3 money', env(start))).toEqual(['p0', 'p2']);
  });
});

describe('paying', () => {
  it('pays rent to the owner of the space they are on', () => {
    const start = setOwner(placePiece(fixtureBoardState(), 'p0', 5), 5, 'p1');
    const s = runPhrase<GameState>(lib, 'effect', 'they pay its rent to its owner', env(start, as('p0')));
    expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([1486, 1514]);
  });
  it('pays the bank when there is no owner to pay', () => {
    const start = placePiece(fixtureBoardState(), 'p0', 2);
    const s = runPhrase<GameState>(lib, 'effect', 'they pay its tax', env(start, as('p0')));
    expect(counterOf(s, 'money', 'p0')).toBe(1300);
    expect(counterOf(s, 'money', 'p1')).toBe(1500);
  });
  it('pays a plain amount to the bank', () => {
    const s = runPhrase<GameState>(lib, 'effect', 'they pay 50', env(fixtureBoardState(), as('p0')));
    expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([1450, 1500]);
  });
  describe('an amount with the counter named', () => {
    const base = fixtureBoardGame().board!;
    const twoCounters = fixtureBoardGame({ board: { ...base, counters: [...base.counters, { name: 'tokens', start: 5, visibility: 'public' }] } });
    const pays = (text: string, g = twoCounters) => runPhrase<GameState>(lib, 'effect', text, env(fixtureBoardState(g), { game: g, ...as('p0') }));

    it('pays the bank, as the plain amount does', () => {
      const s = pays('they pay 50 money');
      expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([1450, 1500]);
      expect(pays('they pay 50 money', game)).toEqual(runPhrase<GameState>(lib, 'effect', 'they pay 50', env(fixtureBoardState(), as('p0'))));
    });
    it('is refused for a counter players do not pay with, in words that say how to put it', () => {
      expect(() => pays('they pay 5 tokens')).toThrow('Players pay with money, so say “They pay 5 money.”');
    });
    it('needs something to pay with, and a player', () => {
      expect(lib.get('effect', 'they pay {int} {counter}')).toMatchObject({ needsPlayer: true, needsPayment: true });
    });
  });
  it('pays 4 times the roll', () => {
    const start = setRoll(setOwner(placePiece(fixtureBoardState(), 'p0', 6), 6, 'p1'), [1, 2]);
    const s = runPhrase<GameState>(lib, 'effect', 'they pay 4 times the roll to its owner', env(start, as('p0')));
    expect(counterOf(s, 'money', 'p0')).toBe(1488);
    expect(counterOf(s, 'money', 'p1')).toBe(1512);
  });
  it('needs a roll to pay for it', () => {
    const start = setOwner(placePiece(fixtureBoardState(), 'p0', 6), 6, 'p1');
    expect(() => runPhrase(lib, 'effect', 'they pay 4 times the roll to its owner', env(start, as('p0')))).toThrow('Nobody has rolled the dice yet.');
  });
  it('says so when no one owns the space to be paid', () => {
    const start = placePiece(fixtureBoardState(), 'p0', 5);
    expect(() => runPhrase(lib, 'effect', 'they pay its rent to its owner', env(start, as('p0')))).toThrow('No one owns Rose Lane.');
    expect(() => runPhrase(lib, 'effect', 'they pay 4 times the roll to its owner', env(setRoll(start, [1, 1]), as('p0'))))
      .toThrow('No one owns Rose Lane.');
  });
  it('names the space when there is nothing to pay', () => {
    const onGo = env(fixtureBoardState(), as('p0', 0));
    expect(() => runPhrase(lib, 'effect', 'they pay its rent', onGo)).toThrow('Go has no rent.');
    const textRent = fixtureBoardGame({
      board: { ...fixtureBoardGame().board!, spaces: FIXTURE_SPACES.map((sp, i) => (i === 1 ? { ...sp, attrs: { ...sp.attrs, rent: 'free' } } : sp)) },
      phases: game.phases,
    });
    expect(() => runPhrase(lib, 'effect', 'they pay its rent', fixtureEnv(fixtureBoardState(textRent), { game: textRent, ...as('p0', 1) })))
      .toThrow("Mill Lane's rent isn't a number.");
  });
  it('never turns an amount that is not a number into money', () => {
    const textRent = fixtureBoardGame({
      board: { ...fixtureBoardGame().board!, spaces: FIXTURE_SPACES.map((sp, i) => (i === 1 ? { ...sp, attrs: { ...sp.attrs, rent: 'free' } } : sp)) },
      phases: game.phases,
    });
    const start = setOwner(fixtureBoardState(textRent), 1, 'p1');
    expect(() => runPhrase(lib, 'effect', 'they pay its rent to its owner', fixtureEnv(start, { game: textRent, ...as('p0', 1) }))).toThrow("Mill Lane's rent isn't a number.");
    expect(counterOf(start, 'money', 'p0')).toBe(1500);
  });
  it('asks the env what a detail is when it can say, and reads the table’s cell when it cannot', () => {
    const start = setOwner(fixtureBoardState(), 1, 'p1');
    const asked: [number, string][] = [];
    const through = env(start, {
      ...as('p0', 1),
      columnValue: (_state, space, column) => { asked.push([space, column]); return 7; },
    });
    const paid = runPhrase<GameState>(lib, 'effect', 'they pay its rent to its owner', through);
    expect([counterOf(paid, 'money', 'p0'), counterOf(paid, 'money', 'p1'), asked]).toEqual([1493, 1507, [[1, 'rent']]]);
    expect(() => runPhrase(lib, 'effect', 'they pay its rent to its owner', env(start, { ...as('p0', 1), columnValue: () => null }))).toThrow('Mill Lane has no rent.');
    expect(counterOf(runPhrase<GameState>(lib, 'effect', 'they pay its rent to its owner', env(start, as('p0', 1))), 'money', 'p0')).toBe(1498);
  });
});

describe('a percentage of a detail of the space', () => {
  const run = <T>(kind: 'effect' | 'condition', text: string, state: GameState, space: number) =>
    runPhrase<T>(lib, kind, text, env(state, as('p0', space)));
  const money = (state: GameState) => counterOf(state, 'money', 'p0');

  it('gets and pays a percentage, rounded down to a whole number', () => {
    // Power Works (6) costs 150: half is 75, and 55% is 82.5, so 82. Mill Lane (1) costs 60: 33% is 19.8, so 19.
    expect(counterOf(run('effect', 'they get 50% of its price', fixtureBoardState(), 6), 'money', 'p0')).toBe(1575);
    expect(counterOf(run('effect', 'they pay 55% of its price', fixtureBoardState(), 6), 'money', 'p0')).toBe(1418);
    expect(counterOf(run('effect', 'they get 33% of its price', fixtureBoardState(), 1), 'money', 'p0')).toBe(1519);
  });
  it('judges whether they have at least the percentage', () => {
    const at = (n: number) => setCounter(fixtureBoardState(), 'money', 'p0', n);
    expect(run('condition', 'they have at least 55% of its price in money', at(82), 6)).toBe(true);
    expect(run('condition', 'they have at least 55% of its price in money', at(81), 6)).toBe(false);
  });
  it('notes the bank as the creditor when paying leaves them below 0', () => {
    const s = run<GameState>('effect', 'they pay 55% of its price', setCounter(fixtureBoardState(), 'money', 'p0', 10), 6);
    expect([money(s), owedTo(s, 'p0', 'money')]).toEqual([-72, 'bank']);
  });
  it('notes nothing when paying leaves them at 0 or more', () => {
    const s = run<GameState>('effect', 'they pay 50% of its price', setCounter(fixtureBoardState(), 'money', 'p0', 75), 6);
    expect([money(s), s.data[OWES_KEY]]).toEqual([0, undefined]);
  });
  it('says so when the space has no such detail', () => {
    for (const [kind, text] of [['effect', 'they get 50% of its price'], ['effect', 'they pay 50% of its price'], ['condition', 'they have at least 50% of its price in money']] as const) {
      expect(() => run(kind, text, fixtureBoardState(), 0)).toThrow(new RuleError('Go has no price.'));
    }
  });
  it('needs a player and a space, and something to pay with for the effects', () => {
    expect(lib.get('effect', 'they get {int}% of its {spaceattr}')).toMatchObject({ needsPlayer: true, needsSpace: true, needsPayment: true });
    expect(lib.get('effect', 'they pay {int}% of its {spaceattr}')).toMatchObject({ needsPlayer: true, needsSpace: true, needsPayment: true });
    expect(lib.get('condition', 'they have at least {int}% of its {spaceattr} in {counter}')).toMatchObject({ needsPlayer: true, needsSpace: true });
  });
});

describe('paying and collecting from each other player', () => {
  const seats = ['p0', 'p1', 'p2'];
  const money = (s: GameState) => seats.map((seat) => counterOf(s, 'money', seat));
  const start = fixtureBoardState(game, seats);
  const run = (text: string, state: GameState) => runPhrase<GameState>(lib, 'effect', text, env(state, as('p0')));

  it('pays the amount to each other player, and takes it from them', () => {
    expect(money(run('they pay 50 money to each other player', start))).toEqual([1400, 1550, 1550]);
  });
  it('collects the amount from each other player, even below 0', () => {
    expect(money(run('they get 50 money from each other player', setCounter(start, 'money', 'p1', 30)))).toEqual([1600, -20, 1450]);
  });
  it('Review Focus: leaves a player who is out as they were, neither paid nor charged', () => {
    const out = markOut(start, 'p2');
    expect(money(run('they pay 50 money to each other player', out))).toEqual([1450, 1550, 1500]);
    expect(money(run('they get 50 money from each other player', out))).toEqual([1550, 1450, 1500]);
  });
  it('needs a player', () => {
    expect(lib.get('effect', 'they pay {int} {counter} to each other player')).toMatchObject({ needsPlayer: true });
    expect(lib.get('effect', 'they get {int} {counter} from each other player')).toMatchObject({ needsPlayer: true });
  });
});

describe('debts recorded by payments', () => {
  const seats = ['p0', 'p1', 'p2'];
  const start = fixtureBoardState(game, seats);
  const pay = (text: string, state: GameState, space: number | null = null) =>
    runPhrase<GameState>(lib, 'effect', text, env(state, as('p0', space)));
  const owes = (state: GameState, seat = 'p0') => owedTo(state, seat, 'money');

  it('names the owner of the space when the rent takes them below 0, and the bank for a plain amount', () => {
    const rent = pay('they pay its rent to its owner', setOwner(setCounter(start, 'money', 'p0', 10), 5, 'p1'), 5);
    expect([counterOf(rent, 'money', 'p0'), owes(rent)]).toEqual([-4, 'p1']);
    expect(owes(pay('they pay 20', setCounter(start, 'money', 'p0', 10)))).toBe('bank');
  });
  it('records nothing when they are left at exactly 0', () => {
    const s = pay('they pay 10', setCounter(start, 'money', 'p0', 10));
    expect(counterOf(s, 'money', 'p0')).toBe(0);
    expect(s.data[OWES_KEY]).toBeUndefined();
  });
  it('records nothing for a payment of 0, such as the rent of a space that charges none', () => {
    const free = fixtureBoardGame({
      board: { ...game.board!, spaces: FIXTURE_SPACES.map((sp, i) => (i === 5 ? { ...sp, attrs: { ...sp.attrs, rent: 0 } } : sp)) },
      phases: game.phases,
    });
    const owing = recordDebt(setCounter(fixtureBoardState(free, seats), 'money', 'p0', -4), 'p0', 'p2');
    const owned = setOwner(owing, 5, 'p1');
    const s = runPhrase<GameState>(lib, 'effect', 'they pay its rent to its owner', fixtureEnv(owned, { game: free, seats, ...as('p0', 5) }));
    expect(owes(s)).toBe('p2');
  });
  it('Review Focus: the latest payment that leaves them below 0 names their creditor', () => {
    const owingP1 = recordDebt(setCounter(start, 'money', 'p0', -4), 'p0', 'p1');
    expect(owes(pay('they pay 1', owingP1))).toBe('bank');
    // Paying p1 leaves them at -10, and paying p2 after that at -60.
    const split = pay('they pay 50 money to each other player', setCounter(start, 'money', 'p0', 40));
    expect([counterOf(split, 'money', 'p0'), owes(split)]).toEqual([-60, 'p2']);
  });
  it('names the player collected from as the creditor of each who is left below 0', () => {
    const s = pay('they get 50 money from each other player', setCounter(setCounter(start, 'money', 'p1', 30), 'money', 'p2', 20));
    expect([owes(s, 'p1'), owes(s, 'p2')]).toEqual(['p0', 'p0']);
  });
  it('records nothing for another counter, which is not what players pay with', () => {
    const tokens = fixtureBoardGame({ board: { ...game.board!, counters: [...game.board!.counters, { name: 'tokens', start: 5, visibility: 'public' }] } });
    const s = runPhrase<GameState>(lib, 'effect', 'they pay 50 tokens to each other player', fixtureEnv(fixtureBoardState(tokens, seats), { game: tokens, seats, ...as('p0') }));
    expect(counterOf(s, 'tokens', 'p0')).toBe(-95);
    expect(s.data[OWES_KEY]).toBeUndefined();
  });
});

describe('owning', () => {
  it('judges the buy conditions on the space they are on', () => {
    const onRose = placePiece(fixtureBoardState(), 'p0', 5);
    expect(runPhrase(lib, 'condition', 'it has a price', env(onRose, as('p0')))).toBe(true);
    expect(runPhrase(lib, 'condition', 'it has a price', env(fixtureBoardState(), as('p0')))).toBe(false);
    expect(runPhrase(lib, 'condition', 'no one owns it', env(onRose, as('p0')))).toBe(true);
    expect(runPhrase(lib, 'condition', 'they have at least its price in money', env(setCounter(onRose, 'money', 'p0', 179), as('p0')))).toBe(false);
    expect(runPhrase(lib, 'condition', 'they have at least its price in money', env(setCounter(onRose, 'money', 'p0', 180), as('p0')))).toBe(true);
    expect(runPhrase(lib, 'condition', 'they have rolled this turn', env(recordAction(onRose, 'p0', 'roll the dice'), as('p0')))).toBe(true);
  });
  it('accepts either article before the detail', () => {
    const onRose = placePiece(fixtureBoardState(), 'p0', 5);
    expect(runPhrase(lib, 'condition', 'it has an rent', env(onRose, as('p0')))).toBe(true);
  });
  it('knows what they have done this turn, and not the turn before', () => {
    const start = fixtureBoardState();
    expect(runPhrase(lib, 'condition', 'they have rolled this turn', env(start, as('p0')))).toBe(false);
    expect(runPhrase(lib, 'condition', 'they have not rolled this turn', env(start, as('p0')))).toBe(true);
    const rolled = recordAction(start, 'p0', 'roll the dice');
    expect(runPhrase(lib, 'condition', 'they have not rolled this turn', env(rolled, as('p0')))).toBe(false);
    expect(runPhrase(lib, 'condition', 'they have rolled this turn', env(rolled, as('p1')))).toBe(false);
    expect(runPhrase(lib, 'condition', 'they have rolled this turn', env(clearTurnLog(rolled), as('p0')))).toBe(false);
  });
  it('tells who owns the space', () => {
    const owned = setOwner(placePiece(fixtureBoardState(), 'p0', 5), 5, 'p1');
    expect(runPhrase(lib, 'condition', 'no one owns it', env(owned, as('p0')))).toBe(false);
    expect(runPhrase(lib, 'condition', 'someone else owns it', env(owned, as('p0')))).toBe(true);
    expect(runPhrase(lib, 'condition', 'they own it', env(owned, as('p0')))).toBe(false);
    expect(runPhrase(lib, 'condition', 'someone else owns it', env(owned, as('p1', 5)))).toBe(false);
    expect(runPhrase(lib, 'condition', 'they own it', env(owned, as('p1', 5)))).toBe(true);
    const free = placePiece(fixtureBoardState(), 'p0', 5);
    expect(runPhrase(lib, 'condition', 'someone else owns it', env(free, as('p0')))).toBe(false);
  });
  it('lets them own the space they are on', () => {
    const s = runPhrase<GameState>(lib, 'effect', 'they own it', env(placePiece(fixtureBoardState(), 'p1', 3), as('p1')));
    expect(ownerOf(s, 3)).toBe('p1');
  });
  it('gives all of their spaces back to the bank, and only theirs', () => {
    const start = setOwner(setOwner(setOwner(fixtureBoardState(), 1, 'p0'), 3, 'p1'), 5, 'p0');
    const s = runPhrase<GameState>(lib, 'effect', 'their spaces go back to the bank', env(start, as('p0')));
    expect([1, 3, 5].map((i) => ownerOf(s, i))).toEqual([null, 'p1', null]);
  });
});

describe('going out', () => {
  it('takes a player out and passes the turn when it was theirs', () => {
    const s = runPhrase<GameState>(lib, 'effect', 'they are out', env(fixtureBoardState(), as('p0')));
    expect(isOut(s, 'p0')).toBe(true);
    expect(pieceAt(s, 'p0')).toBeNull();
    expect(s.turn).toEqual({ current: 'p1', phase: 'playing', chosen: true });
  });
  it('skips a player who is already out when passing the turn', () => {
    const s = runPhrase<GameState>(lib, 'effect', 'they are out', env(markOut(fixtureBoardState(), 'p1'), as('p0')));
    expect(s.turn?.current).toBe('p2');
  });
  it('leaves the turn alone when it was not theirs', () => {
    const s = runPhrase<GameState>(lib, 'effect', 'they are out', env(fixtureBoardState(), as('p2')));
    expect(isOut(s, 'p2')).toBe(true);
    expect(s.turn).toEqual({ current: 'p0', phase: 'playing' });
  });
  it('knows when one player is left', () => {
    expect(runPhrase(lib, 'condition', 'one player is left', env(fixtureBoardState()))).toBe(false);
    const one = markOut(markOut(fixtureBoardState(), 'p1'), 'p2');
    expect(runPhrase(lib, 'condition', 'one player is left', env(one))).toBe(true);
  });
  it('names the one player left as the winner', () => {
    const s = markOut(fixtureBoardState(), 'p1');
    expect(runPhrase(lib, 'winner', 'that player wins', fixtureEnv(s, { game, seats: ['p0', 'p1'] }), {})).toBe('p0');
  });
  it('has no winner while more than one player is in', () => {
    expect(() => runPhrase(lib, 'winner', 'that player wins', env(fixtureBoardState()), {}))
      .toThrow('More than one player is still in, so no one has won yet.');
  });
});

describe('moments', () => {
  it('matches moments', () => {
    const lands = { kind: 'land', seat: 'p0', space: 5 } as const;
    const owned = setOwner(fixtureBoardState(), 5, 'p1');
    expect(runPhrase(lib, 'moment', 'a player lands on a street or station someone else owns', env(owned), lands)).toBe(true);
    expect(runPhrase(lib, 'moment', 'a player lands on a street or station someone else owns', env(fixtureBoardState()), lands)).toBe(false);
    expect(runPhrase(lib, 'moment', 'a piece passes Go', env(fixtureBoardState()), { kind: 'pass', seat: 'p0', space: 0 })).toBe(true);
  });
  it('does not take the lander for someone else', () => {
    const ownedByLander = setOwner(fixtureBoardState(), 5, 'p0');
    const lands = { kind: 'land', seat: 'p0', space: 5 } as const;
    expect(runPhrase(lib, 'moment', 'a player lands on a street or station someone else owns', env(ownedByLander), lands)).toBe(false);
  });
  it('tells passing from landing, and one space from another', () => {
    const e = env(fixtureBoardState());
    expect(runPhrase(lib, 'moment', 'a piece passes Go', e, { kind: 'land', seat: 'p0', space: 0 })).toBe(false);
    expect(runPhrase(lib, 'moment', 'a piece passes Go', e, { kind: 'pass', seat: 'p0', space: 1 })).toBe(false);
    expect(runPhrase(lib, 'moment', 'a player lands on Go', e, { kind: 'land', seat: 'p1', space: 0 })).toBe(true);
    expect(runPhrase(lib, 'moment', 'a player lands on Go', e, { kind: 'pass', seat: 'p1', space: 0 })).toBe(false);
  });
  it('matches the kind of space a player lands on', () => {
    const e = env(fixtureBoardState());
    expect(runPhrase(lib, 'moment', 'a player lands on a tax space', e, { kind: 'land', seat: 'p0', space: 2 })).toBe(true);
    expect(runPhrase(lib, 'moment', 'a player lands on a tax space', e, { kind: 'land', seat: 'p0', space: 1 })).toBe(false);
    expect(runPhrase(lib, 'moment', 'a player lands on a street or station', e, { kind: 'land', seat: 'p0', space: 3 })).toBe(true);
    expect(runPhrase(lib, 'moment', 'a player lands on a street or station', e, { kind: 'pass', seat: 'p0', space: 3 })).toBe(false);
  });
});

describe('example phrases', () => {
  // The buttons of the phase give `{action}` and `{done}` their words.
  const BUY: DeclaredAction = {
    verb: 'buy', words: 'buy the space they are on', base: 'buy the space they are on', label: 'Buy', target: null, anyone: false, amount: false, conditions: [], effects: [], line: 2,
  };
  const END: DeclaredAction = {
    verb: 'end', words: 'end their turn', base: 'end their turn', label: 'End turn', target: null, anyone: false, amount: false, conditions: [], effects: [], line: 3,
  };
  // A button that picks where: its move is the whole wording, and an example names the space after the base.
  const BUILD: DeclaredAction = {
    verb: 'build', words: 'build a house on a street they own', base: 'build a house', label: 'Build a house',
    target: { kind: 'target', phrase: 'a {spacekind} they own', args: [{ attribute: 'kind', values: ['street'] }], line: 4, text: 'a street they own' },
    anyone: false, amount: false, conditions: [], effects: [], line: 4,
  };
  const playing = fixtureBoardGame({ phases: [fixturePhase('playing', [], { actions: [ROLL, BUY, END, BUILD] })] });
  const at = (state: GameState) => env(state, { game: playing });
  const given = (text: string, state: GameState = fixtureBoardState(playing)) => runPhrase<GameState>(lib, 'given', text, at(state));
  const expectThat = (text: string, state: GameState) => runPhrase<true | string>(lib, 'expect', text, at(state));
  const base = fixtureBoardGame().board!;
  const withDice = (dice: { count: number; sides: number } | null) => {
    const g = fixtureBoardGame({ board: { ...base, dice }, phases: playing.phases });
    return fixtureEnv(fixtureBoardState(g), { game: g, seats: ['p0', 'p1'] });
  };
  const rollGiven = (text: string, e: ReturnType<typeof withDice>) => runPhrase<GameState>(lib, 'given', text, e);

  describe('given', () => {
    it('puts a piece on a space', () => {
      expect(pieceAt(given('p1 is on Rose Lane'), 'p1')).toBe(5);
      expect(pieceAt(given('p1 is on Go'), 'p1')).toBe(0);
    });
    it('gives a space to a player', () => {
      expect(ownerOf(given('p1 owns Rose Lane'), 5)).toBe('p1');
    });
    it('sets how many of a counter a player has', () => {
      const s = given('p1 has 1486 money');
      expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([1500, 1486]);
    });
    it('puts a player out without moving the turn', () => {
      const start = fixtureBoardState(playing);
      const s = given('p0 is out');
      expect(isOut(s, 'p0')).toBe(true);
      expect(pieceAt(s, 'p0')).toBeNull();
      expect(s.turn).toEqual(start.turn);
    });
    it('notes what a player has done this turn, without ending the turn', () => {
      const s = given('p0 has rolled this turn');
      const they = (text: string, player: string) => runPhrase(lib, 'condition', text, env(s, { game: playing, ...as(player) }));
      expect(they('they have rolled this turn', 'p0')).toBe(true);
      expect(they('they have not rolled this turn', 'p0')).toBe(false);
      expect(they('they have rolled this turn', 'p1')).toBe(false);
      expect(s.turn).toEqual(fixtureBoardState(playing).turn);
    });
    it("notes each player's actions apart: a later player's doesn't erase an earlier one's", () => {
      const s = given('p1 has rolled this turn', given('p0 has rolled this turn'));
      const they = (player: string) => runPhrase(lib, 'condition', 'they have rolled this turn', env(s, { game: playing, ...as(player) }));
      expect([they('p0'), they('p1'), they('p2')]).toEqual([true, true, false]);
    });
    describe('doubles rolled this turn', () => {
      // A button that rolls the dice in its Then lines, which is how an example says a player has rolled.
      const rollEffect = { kind: 'effect' as const, phrase: 'roll the dice', args: [], line: 1, text: 'Roll the dice' };
      const ROLLING: DeclaredAction = { ...ROLL, effects: [rollEffect] };
      const rolling = fixtureBoardGame({ phases: [fixturePhase('playing', [], { actions: [BUY, ROLLING, END] })] });
      const givenRolling = (text: string, g = rolling) => runPhrase<GameState>(lib, 'given', text, env(fixtureBoardState(g), { game: g }));

      it('sets how many doubles the player has rolled, and notes the button that rolls as done', () => {
        const s = givenRolling('p0 has rolled 2 doubles this turn');
        expect(rollsThisTurn(s, 'p0')).toEqual([[1, 1], [1, 1]]);
        expect(s.data[TURN_KEY]).toEqual({ p0: ['roll the dice'] });
        const they = (text: string) => runPhrase(lib, 'condition', text, env(s, { game: rolling, ...as('p0') }));
        expect([they('they have rolled this turn'), they('they have rolled 2 doubles this turn'), they('they rolled a double')]).toEqual([true, true, true]);
      });
      it('sets one roll for one double', () => {
        expect(rollsThisTurn(givenRolling('p1 has rolled 1 double this turn'), 'p1')).toEqual([[1, 1]]);
      });
      it('notes no button for no doubles, so it needs none', () => {
        const s = given('p0 has rolled 0 doubles this turn');
        expect(rollsThisTurn(s, 'p0')).toEqual([]);
        expect(s.data).not.toHaveProperty(TURN_KEY);
      });
      it('finds the button that rolls under an If, and the first of them', () => {
        const effect = { ...rollEffect, line: 5 };
        const test = { kind: 'condition' as const, phrase: 'they have not {done} this turn', args: [['roll for a double']], line: 5, text: '' };
        const IFFY: DeclaredAction = {
          ...ROLL, verb: 'roll', words: 'roll for a double', base: 'roll for a double', label: 'Roll for a double',
          effects: [{ kind: 'lang', phrase: 'if', args: [test, effect], line: 5, text: 'If …' }],
        };
        const other = fixtureBoardGame({ phases: [fixturePhase('playing', [], { actions: [BUY, IFFY, ROLLING, END] })] });
        expect(givenRolling('p0 has rolled 1 double this turn', other).data[TURN_KEY]).toEqual({ p0: ['roll for a double'] });
      });
      it('does not take a button whose lines roll nothing', () => {
        const quiet: DeclaredAction = { ...ROLL, effects: [{ kind: 'effect', phrase: 'they get {int} {counter}', args: [1, 'money'], line: 1, text: '' }] };
        const g = fixtureBoardGame({ phases: [fixturePhase('playing', [], { actions: [quiet, ROLLING] })] });
        expect(givenRolling('p0 has rolled 1 double this turn', g).data[TURN_KEY]).toEqual({ p0: ['roll the dice'] });
      });
      it('says so when no button of the phase rolls the dice', () => {
        expect(() => given('p0 has rolled 1 double this turn')).toThrow('No button in this phase rolls the dice.');
      });
      it('refuses a player who is not at the table', () => {
        expect(() => givenRolling('p3 has rolled 1 double this turn')).toThrow('There is no player p3 at this table.');
      });
      it('allows up to 20 doubles and refuses more, instead of rolling that many', () => {
        expect(rollsThisTurn(givenRolling('p0 has rolled 20 doubles this turn'), 'p0')).toHaveLength(20);
        expect(() => givenRolling('p0 has rolled 21 doubles this turn')).toThrow('Say 20 doubles or fewer.');
        expect(() => givenRolling('p0 has rolled 5000000 doubles this turn')).toThrow('Say 20 doubles or fewer.');
        expect(() => givenRolling('p0 has rolled 99999999999 doubles this turn')).toThrow('Say 20 doubles or fewer.');
      });
      it('refuses a negative number of doubles', () => {
        expect(() => givenRolling('p0 has rolled -1 doubles this turn')).toThrow('Say how many doubles, from 0 to 20.');
      });
      it('needs dice, and exactly two of them', () => {
        expect(lib.get('given', '{player} has rolled {int} double(s) this turn')).toMatchObject({ needsDice: true, needsTwoDice: true });
      });
    });
    it('asks for the whole wording when “rolled” could be either roll button', () => {
      const FOR_DOUBLE: DeclaredAction = { ...ROLL, words: 'roll for a double', base: 'roll for a double', label: 'Roll for a double' };
      const twoRolls = fixtureBoardGame({ phases: [fixturePhase('playing', [], { actions: [ROLL, FOR_DOUBLE, END] })] });
      const givenIn = (text: string) => runPhrase<GameState>(lib, 'given', text, env(fixtureBoardState(twoRolls), { game: twoRolls }));
      expect(() => givenIn('p0 has rolled this turn')).toThrow('“rolled” could mean “rolled the dice” or “rolled for a double”; write the whole wording.');
      expect(givenIn('p0 has rolled for a double this turn').data[TURN_KEY]).toEqual({ p0: ['roll for a double'] });
    });
    it('refuses a player who is not at the table', () => {
      expect(() => given('p3 is on Rose Lane')).toThrow('There is no player p3 at this table.');
      expect(() => given('p3 owns Rose Lane')).toThrow('There is no player p3 at this table.');
      expect(() => given('p3 has 5 money')).toThrow('There is no player p3 at this table.');
      expect(() => given('p3 is out')).toThrow('There is no player p3 at this table.');
      expect(() => given('p3 has rolled this turn')).toThrow('There is no player p3 at this table.');
    });
    it('fixes the next roll, so rolling gives exactly it', () => {
      const queued = rollGiven('the next roll is 3 and 4', withDice({ count: 2, sides: 6 }));
      expect(latestRoll(runPhrase<GameState>(lib, 'effect', 'roll the dice', env(queued, { game: playing })))).toEqual([3, 4]);
    });
    it('fixes the roll of a game with one die', () => {
      const queued = rollGiven('the next roll is 20', withDice({ count: 1, sides: 20 }));
      expect(takeQueuedRoll(queued).faces).toEqual([20]);
    });
    it('queues the roll after that behind the ones already fixed', () => {
      const two = withDice({ count: 2, sides: 6 });
      const both = rollGiven('the roll after that is 1 and 2', { ...two, state: rollGiven('the next roll is 3 and 3', two) });
      const one = takeQueuedRoll(both);
      expect(one.faces).toEqual([3, 3]);
      expect(takeQueuedRoll(one.state).faces).toEqual([1, 2]);
    });
    it('needs a roll fixed before the one after it', () => {
      expect(() => rollGiven('the roll after that is 1 and 2', withDice({ count: 2, sides: 6 }))).toThrow('Say what the next roll is first.');
      expect(() => rollGiven('the roll after that is 5', withDice({ count: 1, sides: 6 }))).toThrow('Say what the next roll is first.');
    });
    it('checks the roll after that like the next roll', () => {
      const two = withDice({ count: 2, sides: 6 });
      const afterThree = { ...two, state: rollGiven('the next roll is 3 and 3', two) };
      expect(() => rollGiven('the roll after that is 3', afterThree)).toThrow('This game rolls 2 dice, so give 2 numbers.');
      expect(() => rollGiven('the roll after that is 7 and 1', afterThree)).toThrow("A 6-sided die can't roll 7.");
      expect(() => rollGiven('the roll after that is 1', withDice(null))).toThrow('This game has no dice.');
      const d20 = withDice({ count: 1, sides: 20 });
      const queued = rollGiven('the roll after that is 20', { ...d20, state: rollGiven('the next roll is 5', d20) });
      const taken = takeQueuedRoll(queued);
      expect([taken.faces, takeQueuedRoll(taken.state).faces]).toEqual([[5], [20]]);
    });
    it('says how many numbers the dice need', () => {
      expect(() => rollGiven('the next roll is 3', withDice({ count: 2, sides: 6 }))).toThrow('This game rolls 2 dice, so give 2 numbers.');
      expect(() => rollGiven('the next roll is 3 and 4', withDice({ count: 1, sides: 6 }))).toThrow('This game rolls 1 die, so give 1 number.');
    });
    it('cannot fix a roll of more than two dice, whatever numbers it is given', () => {
      const three = withDice({ count: 3, sides: 6 });
      const sentence = 'Examples can only fix the next roll in a game with one or two dice.';
      expect(() => rollGiven('the next roll is 1 and 2', three)).toThrow(sentence);
      expect(() => rollGiven('the next roll is 1', three)).toThrow(sentence);
      expect(() => rollGiven('the next roll is 1 and 9', three)).toThrow(sentence);
    });
    it('says which face a die cannot show', () => {
      const six = withDice({ count: 2, sides: 6 });
      expect(() => rollGiven('the next roll is 7 and 1', six)).toThrow("A 6-sided die can't roll 7.");
      expect(() => rollGiven('the next roll is 1 and 0', six)).toThrow("A 6-sided die can't roll 0.");
      expect(() => rollGiven('the next roll is 1 and -2', six)).toThrow("A 6-sided die can't roll -2.");
      expect(() => rollGiven('the next roll is 21', withDice({ count: 1, sides: 20 }))).toThrow("A 20-sided die can't roll 21.");
      // The highest face is fine.
      expect(takeQueuedRoll(rollGiven('the next roll is 6 and 6', six)).faces).toEqual([6, 6]);
    });
    it('says when the game has no dice', () => {
      expect(() => rollGiven('the next roll is 3 and 4', withDice(null)))
        .toThrow('This game has no dice. Add a line like “There are two six-sided dice.” under Board:');
      expect(() => rollGiven('the next roll is 3', withDice(null))).toThrow('This game has no dice.');
      // A card game has no board at all, and says the same.
      const cards = fixtureEnv(fixtureState([]), { game: fixtureGame() });
      expect(() => rollGiven('the next roll is 3', cards)).toThrow('This game has no dice. Add a line like');
    });
  });

  describe('action', () => {
    it('is a player pressing one of the buttons', () => {
      const run = (text: string) => runPhrase(lib, 'action', text, at(fixtureBoardState(playing)));
      expect(run('p0 rolls the dice')).toEqual({ by: 'p0', move: { type: 'roll the dice' } });
      expect(run('p1 buys the space they are on')).toEqual({ by: 'p1', move: { type: 'buy the space they are on' } });
      expect(run('p0 ends their turn')).toEqual({ by: 'p0', move: { type: 'end their turn' } });
    });
    it('refuses a player who is not at the table', () => {
      expect(() => runPhrase(lib, 'action', 'p3 rolls the dice', at(fixtureBoardState(playing)))).toThrow('There is no player p3 at this table.');
    });
    it('is a player pressing a button that picks a space, and the space they pick', () => {
      const run = (text: string) => runPhrase(lib, 'action', text, at(fixtureBoardState(playing)));
      expect(run('p0 builds a house on Rose Lane')).toEqual({ by: 'p0', move: { type: 'build a house on a street they own', target: 5 } });
      expect(run('p1 Builds a House on mill lane')).toEqual({ by: 'p1', move: { type: 'build a house on a street they own', target: 1 } });
      // Space 0 is a space too.
      expect(run('p0 builds a house on Go')).toEqual({ by: 'p0', move: { type: 'build a house on a street they own', target: 0 } });
    });
    it('does not take a button that picks a space without one, or one that picks none with one', () => {
      const m = (text: string) => lib.match('action', text, vocabFor(playing));
      expect(m('p0 builds a house').status).toBe('unknown');
      expect(m('p0 builds a house on a street they own').status).toBe('unknown');
      expect(m('p0 rolls the dice on Rose Lane').status).toBe('unknown');
      expect(m('p0 rolls the dice')).toMatchObject({ status: 'ok', pattern: '{player} {action}' });
      expect(m('p0 builds a house on Rose Lane')).toMatchObject({ status: 'ok', pattern: '{player} {targetaction} on {space}' });
    });
    it('refuses a player who is not at the table when they build', () => {
      expect(() => runPhrase(lib, 'action', 'p3 builds a house on Rose Lane', at(fixtureBoardState(playing)))).toThrow('There is no player p3 at this table.');
    });
  });

  describe('expect', () => {
    const start = fixtureBoardState(playing);
    it('says where a piece is', () => {
      const onRose = placePiece(start, 'p0', 5);
      expect(expectThat('p0 is on Rose Lane', onRose)).toBe(true);
      expect(expectThat('p0 is on Rose Lane', placePiece(start, 'p0', 1))).toBe('Expected p0 to be on Rose Lane, but they are on Mill Lane.');
      expect(expectThat('p0 is on Rose Lane', placePiece(start, 'p0', null))).toBe('Expected p0 to be on Rose Lane, but they have no piece on the board.');
    });
    it('says who owns a space', () => {
      const owned = setOwner(start, 5, 'p1');
      expect(expectThat('p1 owns Rose Lane', owned)).toBe(true);
      expect(expectThat('p0 owns Rose Lane', owned)).toBe('Expected p0 to own Rose Lane, but p1 owns it.');
      expect(expectThat('p0 owns Rose Lane', start)).toBe('Expected p0 to own Rose Lane, but no one owns it.');
    });
    it('says that no one owns a space', () => {
      expect(expectThat('no one owns Rose Lane', start)).toBe(true);
      expect(expectThat('no one owns Rose Lane', setOwner(start, 5, 'p1'))).toBe('Expected no one to own Rose Lane, but p1 owns it.');
    });
    it('counts what a player has', () => {
      expect(expectThat('p0 has 1500 money', start)).toBe(true);
      expect(expectThat('p0 has 1486 money', start)).toBe('Expected p0 to have 1486 money, but they have 1500.');
      expect(expectThat('p1 has 1486 money', setCounter(start, 'money', 'p1', 1486))).toBe(true);
    });
    it('says whether a player is out', () => {
      expect(expectThat('p0 is out', markOut(start, 'p0'))).toBe(true);
      expect(expectThat('p0 is out', start)).toBe('Expected p0 to be out, but they are still in.');
    });
    it('refuses a player who is not at the table', () => {
      for (const text of ['p3 is on Rose Lane', 'p3 owns Rose Lane', 'p3 has 5 money', 'p3 is out']) {
        expect(() => expectThat(text, start)).toThrow('There is no player p3 at this table.');
      }
    });
  });
});

describe('the bank line', () => {
  const read = (text: string) => {
    const found = lib.match('board', text, vocabFor(game));
    if (found.status !== 'ok') throw new Error(`“${text}” → ${JSON.stringify(found)}`);
    return (lib.get('board', found.pattern)!.fn as (args: unknown[], table: null) => unknown)(found.args, null);
  };

  it('says what the bank holds, each name with how many to begin with', () => {
    expect(read('The bank has 32 houses and 12 hotels')).toEqual({
      kind: 'bank', bank: [{ name: 'houses', start: 32 }, { name: 'hotels', start: 12 }],
    });
  });
  it('lets the bank start with none of something', () => {
    expect(read('The bank has 0 tokens')).toEqual({ kind: 'bank', bank: [{ name: 'tokens', start: 0 }] });
  });
  it('refuses a name the line lists twice, whatever the capitals', () => {
    expect(() => read('The bank has 32 houses and 12 Houses')).toThrow(new RuleError('There are two bank items called “houses”.'));
  });
});
