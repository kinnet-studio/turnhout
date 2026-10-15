import { describe, expect, it } from 'vitest';
import {
  TURN_KEY, addToCounter, bankOf, clearTurnLog, counterOf, didThisTurn, endsTurn, isOut, markOut, nextIn, ownerOf, pieceAt, placePiece,
  playerFact, playersIn, queueRoll, recordAction, setBank, setOwner, setPlayerFact, setSpaceFact, spaceFact, takeQueuedRoll, withBoardData,
} from './board-state';
import { fixtureBoardGame, fixtureGame, fixturePhase, fixtureState } from './testing';
import { chooseNext } from './zones';

const seats = ['p0', 'p1', 'p2'];
const game = fixtureBoardGame();
const fresh = () => withBoardData(fixtureState([]), game, seats);

describe('board state', () => {
  it('starts every piece on the start space and every counter at its start value', () => {
    const s = fresh();
    expect(seats.map((p) => pieceAt(s, p))).toEqual([0, 0, 0]);
    expect(counterOf(s, 'money', 'p2')).toBe(1500);
    expect(ownerOf(s, 5)).toBeNull();
    expect(playersIn(s, seats)).toEqual(seats);
  });
  it('leaves a state that already has board data, and a card game, alone', () => {
    const moved = placePiece(fresh(), 'p0', 3);
    expect(withBoardData(moved, game, seats)).toBe(moved);
    const cards = fixtureState([]);
    expect(withBoardData(cards, fixtureGame(), seats)).toBe(cards);
  });
  it('moves money between seats', () => {
    const s = addToCounter(addToCounter(fresh(), 'money', 'p0', -14), 'money', 'p1', 14);
    expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([1486, 1514]);
  });
  it('takes a player out: no piece, skipped by nextIn', () => {
    const s = markOut(fresh(), 'p1');
    expect(isOut(s, 'p1')).toBe(true);
    expect(pieceAt(s, 'p1')).toBeNull();
    expect(nextIn(s, 'p0', seats)).toBe('p2');
    expect(nextIn(s, 'p2', seats)).toBe('p0');
    expect(playersIn(s, seats)).toEqual(['p0', 'p2']);
  });
  it('remembers what each seat has done this turn', () => {
    const s = recordAction(recordAction(fresh(), 'p0', 'roll the dice'), 'p0', 'buy the space they are on');
    expect([didThisTurn(s, 'p0', 'roll the dice'), didThisTurn(s, 'p0', 'buy the space they are on'), didThisTurn(s, 'p0', 'end their turn')])
      .toEqual([true, true, false]);
    expect(didThisTurn(s, 'p1', 'roll the dice')).toBe(false);
    expect(s.data[TURN_KEY]).toEqual({ p0: ['roll the dice', 'buy the space they are on'] });
    // The move type is the whole wording: a first word alone is not something done.
    expect(didThisTurn(s, 'p0', 'roll')).toBe(false);
  });
  it("keeps one seat's actions apart from another's: p1's roll doesn't erase p0's", () => {
    const s = recordAction(recordAction(fresh(), 'p0', 'roll the dice'), 'p1', 'roll the dice');
    expect([didThisTurn(s, 'p0', 'roll the dice'), didThisTurn(s, 'p1', 'roll the dice'), didThisTurn(s, 'p2', 'roll the dice')]).toEqual([true, true, false]);
    expect(s.data[TURN_KEY]).toEqual({ p0: ['roll the dice'], p1: ['roll the dice'] });
  });
  it('forgets what every seat did when the turn passes', () => {
    const s = clearTurnLog(recordAction(recordAction(fresh(), 'p0', 'roll the dice'), 'p1', 'roll the dice'));
    expect([didThisTurn(s, 'p0', 'roll the dice'), didThisTurn(s, 'p1', 'roll the dice')]).toEqual([false, false]);
    expect(s.data[TURN_KEY]).toEqual({});
    expect(didThisTurn(recordAction(s, 'p1', 'buy the space they are on'), 'p1', 'roll the dice')).toBe(false);
  });
  it('chooseNext forgets the turn, and leaves card games without a record of it', () => {
    const s = chooseNext(recordAction(recordAction(fresh(), 'p0', 'roll the dice'), 'p1', 'roll the dice'), 'p0');
    expect([didThisTurn(s, 'p0', 'roll the dice'), didThisTurn(s, 'p1', 'roll the dice')]).toEqual([false, false]);
    expect(chooseNext(fixtureState([]), 'p0').data).toEqual({});
  });
  it('knows which moves pass the turn: the ones the phase\'s After line names', () => {
    const after = { moves: ['play', 'end their turn'], next: { kind: 'turn' as const, phrase: 'the turn passes to the left', args: [], line: 9, text: '' }, line: 9 };
    const phase = fixturePhase('playing', [], { after });
    expect([endsTurn(phase, 'play'), endsTurn(phase, 'end their turn'), endsTurn(phase, 'roll the dice'), endsTurn(phase, 'end')])
      .toEqual([true, true, false, false]);
    expect(endsTurn(fixturePhase('playing', []), 'play')).toBe(false);
  });
  it('queues rolls for examples, first in first out', () => {
    const s = queueRoll(queueRoll(fresh(), [3, 4]), [1, 1]);
    const first = takeQueuedRoll(s);
    expect(first.faces).toEqual([3, 4]);
    expect(takeQueuedRoll(first.state).faces).toEqual([1, 1]);
    expect(takeQueuedRoll(fresh()).faces).toBeNull();
  });
  it('owns and disowns a space, and puts a piece back on the board', () => {
    const owned = setOwner(fresh(), 5, 'p2');
    expect(ownerOf(owned, 5)).toBe('p2');
    expect(ownerOf(setOwner(owned, 5, null), 5)).toBeNull();
    expect(pieceAt(placePiece(placePiece(fresh(), 'p1', null), 'p1', 4), 'p1')).toBe(4);
  });
  it('nextIn is just the next seat when nobody is out, and throws when nobody else is in', () => {
    expect(nextIn(fresh(), 'p2', seats)).toBe('p0');
    const alone = markOut(markOut(fresh(), 'p1'), 'p2');
    expect(() => nextIn(alone, 'p0', seats)).toThrow('No other player is still in.');
  });
  it('clearTurnLog hands back the same state when nothing was logged, so a card game never gets a log', () => {
    const s = fresh();
    expect(clearTurnLog(s)).toBe(s);
    expect(s.data).not.toHaveProperty(TURN_KEY);
  });
  // The bank's names are whatever the designer calls the box's stock; the store only holds a number for each.
  describe('the bank', () => {
    const stocked = fixtureBoardGame({
      board: { ...game.board!, bank: [{ name: 'houses', start: 32 }, { name: 'hotels', start: 12 }] },
    });
    it('starts every bank number at its start value', () => {
      const s = withBoardData(fixtureState([]), stocked, seats);
      expect([bankOf(s, 'houses'), bankOf(s, 'hotels')]).toEqual([32, 12]);
    });
    it('is 0 for a name that was never declared, and for a game without a bank', () => {
      expect(bankOf(withBoardData(fixtureState([]), stocked, seats), 'castles')).toBe(0);
      expect(bankOf(fresh(), 'houses')).toBe(0);
      expect(bankOf(fixtureState([]), 'houses')).toBe(0);
    });
    it('sets a number, leaving the others', () => {
      const s = setBank(withBoardData(fixtureState([]), stocked, seats), 'houses', 31);
      expect([bankOf(s, 'houses'), bankOf(s, 'hotels')]).toEqual([31, 12]);
    });
    it('keeps what a state already has, like the rest of the board data', () => {
      const s = setBank(withBoardData(fixtureState([]), stocked, seats), 'houses', 3);
      expect(withBoardData(s, stocked, seats)).toBe(s);
    });
  });
  describe('facts on spaces and players', () => {
    it('reads null until a fact is set', () => {
      expect(spaceFact(fresh(), 5, 'houses')).toBeNull();
      expect(playerFact(fresh(), 'p0', 'in jail')).toBeNull();
      expect(spaceFact(fixtureState([]), 5, 'houses')).toBeNull();
    });
    it('sets a number on one space and leaves the others, and the other facts of that space, alone', () => {
      const s = setSpaceFact(setSpaceFact(fresh(), 5, 'houses', 2), 5, 'mortgaged', true);
      expect(spaceFact(s, 5, 'houses')).toBe(2);
      expect(spaceFact(s, 5, 'mortgaged')).toBe(true);
      expect(spaceFact(s, 1, 'houses')).toBeNull();
      expect(spaceFact(setSpaceFact(s, 5, 'houses', 3), 5, 'mortgaged')).toBe(true);
    });
    it('keeps a number of 0 and a flag of false as set, which is not the same as never set', () => {
      const s = setSpaceFact(setSpaceFact(fresh(), 1, 'houses', 0), 1, 'mortgaged', false);
      expect([spaceFact(s, 1, 'houses'), spaceFact(s, 1, 'mortgaged')]).toEqual([0, false]);
    });
    it('keeps facts of players apart from facts of spaces, and one seat from another', () => {
      const s = setPlayerFact(setSpaceFact(fresh(), 1, 'in jail', 7), 'p1', 'in jail', true);
      expect([playerFact(s, 'p1', 'in jail'), playerFact(s, 'p0', 'in jail'), spaceFact(s, 1, 'in jail')]).toEqual([true, null, 7]);
      expect(playerFact(s, '1', 'in jail')).toBeNull();
    });
    it('does not change the state it was given', () => {
      const before = fresh();
      const after = setSpaceFact(before, 5, 'houses', 2);
      expect(after).not.toBe(before);
      expect(spaceFact(before, 5, 'houses')).toBeNull();
    });
  });
});
