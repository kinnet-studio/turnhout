import { describe, expect, it } from 'vitest';
import {
  TURN_KEY, addToCounter, clearTurnLog, counterOf, didThisTurn, endsTurn, isOut, markOut, nextIn, ownerOf, pieceAt, placePiece, playersIn,
  queueRoll, recordAction, setOwner, takeQueuedRoll, withBoardData,
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
    const s = recordAction(recordAction(fresh(), 'p0', 'roll'), 'p0', 'buy');
    expect([didThisTurn(s, 'p0', 'roll'), didThisTurn(s, 'p0', 'buy'), didThisTurn(s, 'p0', 'end')]).toEqual([true, true, false]);
    expect(didThisTurn(s, 'p1', 'roll')).toBe(false);
    expect(s.data[TURN_KEY]).toEqual({ p0: ['roll', 'buy'] });
  });
  it("keeps one seat's actions apart from another's: p1's roll doesn't erase p0's", () => {
    const s = recordAction(recordAction(fresh(), 'p0', 'roll'), 'p1', 'roll');
    expect([didThisTurn(s, 'p0', 'roll'), didThisTurn(s, 'p1', 'roll'), didThisTurn(s, 'p2', 'roll')]).toEqual([true, true, false]);
    expect(s.data[TURN_KEY]).toEqual({ p0: ['roll'], p1: ['roll'] });
  });
  it('forgets what every seat did when the turn passes', () => {
    const s = clearTurnLog(recordAction(recordAction(fresh(), 'p0', 'roll'), 'p1', 'roll'));
    expect([didThisTurn(s, 'p0', 'roll'), didThisTurn(s, 'p1', 'roll')]).toEqual([false, false]);
    expect(s.data[TURN_KEY]).toEqual({});
    expect(didThisTurn(recordAction(s, 'p1', 'buy'), 'p1', 'roll')).toBe(false);
  });
  it('chooseNext forgets the turn, and leaves card games without a record of it', () => {
    const s = chooseNext(recordAction(recordAction(fresh(), 'p0', 'roll'), 'p1', 'roll'), 'p0');
    expect([didThisTurn(s, 'p0', 'roll'), didThisTurn(s, 'p1', 'roll')]).toEqual([false, false]);
    expect(chooseNext(fixtureState([]), 'p0').data).toEqual({});
  });
  it('knows which verbs pass the turn: the ones the phase\'s After line names', () => {
    const after = { verbs: ['play', 'end'], next: { kind: 'turn' as const, phrase: 'the turn passes to the left', args: [], line: 9, text: '' }, line: 9 };
    const phase = fixturePhase('playing', [], { after });
    expect([endsTurn(phase, 'play'), endsTurn(phase, 'end'), endsTurn(phase, 'roll')]).toEqual([true, true, false]);
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
});
