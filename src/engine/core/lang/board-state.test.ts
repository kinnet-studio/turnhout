import { describe, expect, it } from 'vitest';
import {
  TURN_KEY, addToCounter, counterOf, didThisTurn, endTurnLog, isOut, markOut, nextIn, ownerOf, pieceAt, placePiece, playersIn, queueRoll,
  recordAction, setOwner, takeQueuedRoll, withBoardData,
} from './board-state';
import { fixtureBoardGame, fixtureGame, fixtureState } from './testing';
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
  it('remembers actions for the current turn only', () => {
    let s = recordAction(fresh(), 'p0', 'roll', false);
    expect(didThisTurn(s, 'p0', 'roll')).toBe(true);
    expect(didThisTurn(s, 'p1', 'roll')).toBe(false);
    s = recordAction(s, 'p0', 'end', true);
    expect(didThisTurn(s, 'p0', 'roll')).toBe(false);
    s = recordAction(s, 'p0', 'roll', false);
    expect((s.data[TURN_KEY] as { did: string[] }).did).toEqual(['roll']);
  });
  it('chooseNext ends the turn log, and leaves card games without one', () => {
    const s = chooseNext(recordAction(fresh(), 'p0', 'roll', false), 'p0');
    expect(didThisTurn(s, 'p0', 'roll')).toBe(false);
    expect(chooseNext(fixtureState([]), 'p0').data).toEqual({});
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
  it('endTurnLog hands back the same state when nothing was logged', () => {
    const s = fresh();
    expect(endTurnLog(s)).toBe(s);
  });
});
