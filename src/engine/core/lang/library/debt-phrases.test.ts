import { describe, expect, it } from 'vitest';
import { zoneCards, type GameState } from '../../game-state';
import {
  addToCounter, counterOf, markOut, ownerOf, recordDebt, setCounter, setOwner, setSpaceFact, spaceFact, withBoardData, type Creditor,
} from '../board-state';
import { initialState } from '../build';
import { deckOf } from '../cards';
import { compileGame } from '../compile';
import { NEEDS_PAYMENT } from '../compile-util';
import { RuleError } from '../diagnostics';
import { deckGameText, fixtureEnv, runPhrase } from '../testing';
import { relocate, zoneIdFor } from '../zones';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const HEAD = '| name | says |';
const PASS = '| Free Pass | They keep this card in their kept cards. |';
const game = compileGame(deckGameText([HEAD, PASS, '| Dividend | They get 50 money. |'], [HEAD, PASS, '| Calm | They get 0 money. |']), lib).game!;
const SEATS = ['p0', 'p1', 'p2'];
const start: GameState = { ...withBoardData(initialState(game, 1), game, SEATS), turn: { current: 'p0', phase: 'playing' } };
/** The Free Pass of the deck that starts in `pile`. */
const passOf = (pile: string) => start.cards.find((c) => c.data?.name === 'Free Pass' && zoneIdFor(deckOf(game.cards, c.id)!.start) === pile)!.id;
/** p0 is 4 below 0 owing `to`, owns Mill Lane (1) and a mortgaged Rose Lane (4), and keeps both Free Passes, the lucky one first. */
function owing(to: Creditor): GameState {
  const kept = relocate(start, [passOf('lucky-pile'), passOf('fate-pile')], 'kept-cards-p0', game);
  const owned = setSpaceFact(setOwner(setOwner(kept, 1, 'p0'), 4, 'p0'), 4, 'mortgaged', true);
  return recordDebt(setCounter(owned, 'money', 'p0', -4), 'p0', to);
}
const about = (state: GameState) => fixtureEnv(state, { game, seats: SEATS, subject: { player: 'p0', space: null, card: null } });
const condition = (text: string, state: GameState) => runPhrase<boolean>(lib, 'condition', text, about(state));
const handOver = (state: GameState) => runPhrase<GameState>(lib, 'effect', 'everything they own goes to the player they owe', about(state));
const expectThat = (text: string, state: GameState) => runPhrase<true | string>(lib, 'expect', text, fixtureEnv(state, { game, seats: SEATS }));

describe('debt phrases', () => {
  it('they have less than an amount of a counter', () => {
    expect(condition('they have less than 0 money', setCounter(start, 'money', 'p0', -1))).toBe(true);
    expect(condition('they have less than 0 money', setCounter(start, 'money', 'p0', 0))).toBe(false);
  });
  it('Review Focus: no player has less than an amount, counting only players still in', () => {
    const broke = setCounter(start, 'money', 'p1', -50);
    expect(condition('no player has less than 0 money', start)).toBe(true);
    expect(condition('no player has less than 0 money', broke)).toBe(false);
    expect(condition('no player has less than 0 money', markOut(broke, 'p1'))).toBe(true);
  });
  it('Review Focus: they owe only while they are below 0, however the money came back', () => {
    expect(condition('they owe the bank', owing('bank'))).toBe(true);
    expect(condition('they owe the bank', owing('p1'))).toBe(false);
    const repaid = addToCounter(owing('bank'), 'money', 'p0', 4);
    expect(condition('they owe the bank', repaid)).toBe(false);
    expect(expectThat('p0 owes the bank', repaid)).toBe('Expected p0 to owe the bank, but they owe no one.');
  });

  describe('everything they own goes to the player they owe', () => {
    it('Review Focus: hands every space, its facts and all, and every card they keep in view to the player they owe', () => {
      const s = handOver(owing('p1'));
      expect([ownerOf(s, 1), ownerOf(s, 4), spaceFact(s, 4, 'mortgaged')]).toEqual(['p1', 'p1', true]);
      expect(zoneCards(s, 'kept-cards-p0')).toEqual([]);
      expect(zoneCards(s, 'kept-cards-p1').map((c) => [c.id, c.faceUp])).toEqual([[passOf('lucky-pile'), true], [passOf('fate-pile'), true]]);
      expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([-4, 1500]);
    });
    it('Review Focus: gives everything to the bank: spaces unowned, and each card under the pile its own deck starts in', () => {
      const s = handOver(owing('bank'));
      expect([ownerOf(s, 1), ownerOf(s, 4)]).toEqual([null, null]);
      expect(spaceFact(s, 4, 'mortgaged')).toBe(true);
      expect([zoneCards(s, 'lucky-pile')[0].id, zoneCards(s, 'fate-pile')[0].id]).toEqual([passOf('lucky-pile'), passOf('fate-pile')]);
      expect(s.cards.filter((c) => c.data?.name === 'Free Pass').every((c) => !c.faceUp)).toBe(true);
    });
    it('gives to the bank when the player they owe is out', () => {
      const s = handOver(markOut(owing('p1'), 'p1'));
      expect([ownerOf(s, 1), ownerOf(s, 4)]).toEqual([null, null]);
      expect(zoneCards(s, 'kept-cards-p1')).toEqual([]);
    });
    it('leaves the spaces and cards of everyone else where they are', () => {
      const s = handOver(setOwner(owing('p1'), 2, 'p2'));
      expect(ownerOf(s, 2)).toBe('p2');
    });
    it('Review Focus: owing no one is said plainly, and nothing is handed over', () => {
      expect(() => handOver(setCounter(owing('p1'), 'money', 'p0', 5))).toThrow('They owe no one: no payment took them below 0.');
      expect(() => handOver(start)).toThrow('They owe no one: no payment took them below 0.');
    });
    it('needs a player, a board and something to pay with', () => {
      expect(lib.get('effect', 'everything they own goes to the player they owe')).toMatchObject({ needsPlayer: true, needsBoard: true, needsPayment: true });
      expect(lib.get('condition', 'they owe the bank')).toMatchObject({ needsPlayer: true, needsPayment: true });
      expect(lib.get('condition', 'they have less than {int} {counter}')).toMatchObject({ needsPlayer: true });
    });
  });

  describe('then lines', () => {
    it('says whom a player owes', () => {
      const s = owing('p1');
      expect(expectThat('p0 owes p1', s)).toBe(true);
      expect(expectThat('p0 owes p2', s)).toBe('Expected p0 to owe p2, but they owe p1.');
      expect(expectThat('p0 owes the bank', s)).toBe('Expected p0 to owe the bank, but they owe p1.');
      expect(expectThat('p0 owes the bank', owing('bank'))).toBe(true);
      expect(expectThat('p0 owes p1', owing('bank'))).toBe('Expected p0 to owe p1, but they owe the bank.');
    });
    it('says when they owe no one', () => {
      expect(expectThat('p0 owes p1', start)).toBe('Expected p0 to owe p1, but they owe no one.');
    });
    it('tells a game with nothing to pay with what the compiler tells it, word for word', () => {
      const unpaid = { ...game, board: { ...game.board!, payWith: null } };
      const run = () => runPhrase<true | string>(lib, 'expect', 'p0 owes the bank', fixtureEnv(start, { game: unpaid, seats: SEATS }));
      expect(run).toThrow(new RuleError(NEEDS_PAYMENT));
    });
    it('refuses a player who is not at the table', () => {
      expect(() => expectThat('p3 owes the bank', start)).toThrow('There is no player p3 at this table.');
      expect(() => expectThat('p0 owes p3', start)).toThrow('There is no player p3 at this table.');
    });
  });
});
