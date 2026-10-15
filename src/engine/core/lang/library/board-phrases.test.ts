import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import {
  addToCounter, clearTurnLog, counterOf, isOut, latestRoll, markOut, ownerOf, pieceAt, placePiece, queueRoll, recordAction, setCounter, setOwner,
  setRoll, takeQueuedRoll,
} from '../board-state';
import {
  FIXTURE_SPACES, fixtureBoardGame, fixtureBoardState, fixtureEnv, fixtureGame, fixturePhase, fixtureState, runPhrase,
} from '../testing';
import type { DeclaredAction, Moment } from '../types';
import { createDefaultLibrary } from './index';
import { itOf, theyOf } from './support';

const lib = createDefaultLibrary();
// The phase's roll action gives `{done}` its word, "rolled".
const ROLL: DeclaredAction = { verb: 'roll', words: 'roll the dice', label: 'Roll the dice', conditions: [], effects: [], line: 1 };
const game = fixtureBoardGame({ phases: [fixturePhase('playing', [], { actions: [ROLL] })] });
const env = (state: GameState, over: Partial<Parameters<typeof fixtureEnv>[1]> = {}) =>
  fixtureEnv(state, { game, seats: ['p0', 'p1', 'p2'], ...over });
const as = (player: string, space: number | null = null) => ({ subject: { player, space } });

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
  const BUY: DeclaredAction = { verb: 'buy', words: 'buy the space they are on', label: 'Buy', conditions: [], effects: [], line: 2 };
  const END: DeclaredAction = { verb: 'end', words: 'end their turn', label: 'End turn', conditions: [], effects: [], line: 3 };
  const playing = fixtureBoardGame({ phases: [fixturePhase('playing', [], { actions: [ROLL, BUY, END] })] });
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
