import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import {
  addToCounter, counterOf, isOut, latestRoll, markOut, ownerOf, pieceAt, placePiece, queueRoll, recordAction, setCounter, setOwner, setRoll,
} from '../board-state';
import { FIXTURE_SPACES, fixtureBoardGame, fixtureBoardState, fixtureEnv, fixturePhase, runPhrase } from '../testing';
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
    expect(runPhrase(lib, 'condition', 'they have rolled this turn', env(recordAction(onRose, 'p0', 'roll', false), as('p0')))).toBe(true);
  });
  it('accepts either article before the detail', () => {
    const onRose = placePiece(fixtureBoardState(), 'p0', 5);
    expect(runPhrase(lib, 'condition', 'it has an rent', env(onRose, as('p0')))).toBe(true);
  });
  it('knows what they have done this turn, and not the turn before', () => {
    const start = fixtureBoardState();
    expect(runPhrase(lib, 'condition', 'they have rolled this turn', env(start, as('p0')))).toBe(false);
    expect(runPhrase(lib, 'condition', 'they have not rolled this turn', env(start, as('p0')))).toBe(true);
    const rolled = recordAction(start, 'p0', 'roll', false);
    expect(runPhrase(lib, 'condition', 'they have not rolled this turn', env(rolled, as('p0')))).toBe(false);
    expect(runPhrase(lib, 'condition', 'they have rolled this turn', env(rolled, as('p1')))).toBe(false);
    expect(runPhrase(lib, 'condition', 'they have rolled this turn', env(recordAction(start, 'p0', 'roll', true), as('p0')))).toBe(false);
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
