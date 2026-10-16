import { describe, expect, it } from 'vitest';
import RENT_DAY from './rent-day.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { runExamples } from '@/engine/core/lang/examples';
import { createEngine, initialState, seatsFor } from '@/engine/core/lang/build';
import {
  bankOf, counterOf, gameNumber, isOut, LAST_DRAWN_KEY, lastDrawn, latestRoll, nextIn, owedTo, ownerOf, pieceAt, playerFact, playersIn, queueRoll,
  rollsThisTurn, setBank, setCounter, setOwner, setRoll, setSpaceFact, spaceFact, TURN_KEY, TURN_ROLLS_KEY, withBoardData,
} from '@/engine/core/lang/board-state';
import { deckOf } from '@/engine/core/lang/cards';
import { targetCandidates } from '@/engine/core/lang/declared-actions';
import { isDouble } from '@/engine/core/lang/library/board-phrases';
import type { LangRuntime } from '@/engine/core/lang/runtime';
import { relocate, zoneIdFor, zoneInfo } from '@/engine/core/lang/zones';
import type { GameEngine } from '@/engine/core/game-engine';
import { zoneCards, type GameState } from '@/engine/core/game-state';
import type { Move } from '@/engine/core/moves';
import type { PlayerId } from '@/engine/core/scene';
import type { Json } from '@/engine/core/table-def';

const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(RENT_DAY, lib);
const SPACES = 40;
// A button's move type is its whole wording.
const ROLL = 'roll the dice';
const BUY = 'buy the space they are on';
const BUILD = 'build a house on a street they own';
const END = 'end their turn';
const PAY = 'pay to leave jail';
const ROLL_FOR_DOUBLE = 'roll for a double';
const USE = 'use a get out of jail free';
const AUCTION = 'auction the space they are on';
/** The buttons that pick no space and only work on the player's own turn; building, the one that picks a street, is asked apart. */
const TURN_BUTTONS = [ROLL, PAY, ROLL_FOR_DOUBLE, USE, BUY, AUCTION, END];
// The auction's own buttons, pressed only in the auction phase by the player whose turn in it it is. A bid carries its amount.
const BID = 'bid an amount';
const DROP = 'drop out';
/** The phase an auction is played in, the flags it sets on a space and on players, and the game's number for the bid to beat. */
const AUCTION_PHASE = 'auction';
const UP = 'up for auction';
const BIDDING = 'bidding';
const HIGH_BIDDER = 'the high bidder';
const HIGH_BID = 'high bid';
/** How much more than the high bid the auto-player bids, and the money it keeps back when it does. */
const RAISE = 10;
const KEEP = 200;
// The buttons any player may press at any time, to raise money or to settle a debt by going out.
const SELL = 'sell a house on a street they own';
const MORTGAGE = 'take a mortgage on a space they own';
const PAY_OFF = 'pay off a mortgage on a space they own';
const GIVE_UP = 'give up';
/** The yes-or-no space fact a mortgage sets. */
const MORTGAGED = 'mortgaged';
/** The money a player keeps back when it pays off its mortgages, so that it isn't straight back in debt. */
const PAY_OFF_RESERVE = 500;
/** Where Jail and Go To Jail are on the board, and what leaving jail costs. */
const JAIL = 10;
const GO_TO_JAIL = 30;
const FINE = 50;
/** What the bank starts with, which the board and the bank always add up to between them. */
const HOUSES = 32;
const HOTELS = 12;
/** A hotel counts as this many buildings when a street's buildings are compared, so a hotel is one more than four houses. */
const HOTEL_WORTH = 5;
/** Each player's row of cards they keep, and the one card a player ever keeps. */
const KEPT = 'kept cards';
const PASS_CARD = 'Get Out Of Jail Free';
/** The kinds of space that draw a card, and how many cards each of their two decks has. */
const DRAW_KINDS = ['chance', 'treasury'];
const DECK_SIZE = 16;

/** An engine and the runtime behind it: the auto-player asks the runtime which streets the build button may pick. */
type Table = { engine: GameEngine; runtime: LangRuntime };

/** What a test wants to look at around each move the auto-player makes. */
type Watch = (before: GameState, move: Move, after: GameState) => void;

const housesOn = (state: GameState, space: number): number => (spaceFact(state, space, 'houses') ?? 0) as number;
const hasHotel = (state: GameState, space: number): boolean => spaceFact(state, space, 'hotel') === true;
const buildingsOn = (state: GameState, space: number): number => housesOn(state, space) + (hasHotel(state, space) ? HOTEL_WORTH : 0);
const inJail = (state: GameState, seat: PlayerId): boolean => playerFact(state, seat, 'in jail') === true;
/** How many rolls for a double the player has failed since going to jail; a player it was never set on has failed none. */
const jailTurns = (state: GameState, seat: PlayerId): number => (playerFact(state, seat, 'jail turns') ?? 0) as number;
const doublesThisTurn = (state: GameState, seat: PlayerId): number => rollsThisTurn(state, seat).filter(isDouble).length;
const isMortgaged = (state: GameState, space: number): boolean => spaceFact(state, space, MORTGAGED) === true;
/** The seats still in whose money is below 0, in seat order: while there are any, only the buttons any player may press work. */
const debtors = (state: GameState, seats: PlayerId[]): PlayerId[] => playersIn(state, seats).filter((seat) => counterOf(state, 'money', seat) < 0);
/** What a mortgage pays and what paying it off costs, as the text's percentages work them out: rounded down to whole money. */
const half = (n: number) => Math.floor((n * 50) / 100);
const payOff = (n: number) => Math.floor((n * 55) / 100);
const isEven = (seat: PlayerId): boolean => Number(seat.slice(1)) % 2 === 0;
const isUp = (state: GameState, space: number): boolean => spaceFact(state, space, UP) === true;
const isBidding = (state: GameState, seat: PlayerId): boolean => playerFact(state, seat, BIDDING) === true;
const isHighBidder = (state: GameState, seat: PlayerId): boolean => playerFact(state, seat, HIGH_BIDDER) === true;
/** The bid to beat; 0 whenever no auction is open. */
const highBid = (state: GameState): number => gameNumber(state, game!, HIGH_BID);
/** The spaces up for auction, in board order: the one being auctioned, or one nobody won until the lander rolls or ends their turn. */
const upForAuction = (state: GameState): number[] => Array.from({ length: SPACES }, (_, at) => at).filter((at) => isUp(state, at));

/** The first seat left of `from`, going round, that is still in and bidding; `from` itself when there is none. */
function nextBidder(state: GameState, from: PlayerId, seats: PlayerId[]): PlayerId {
  const i = seats.indexOf(from);
  for (let step = 1; step < seats.length; step++) {
    const seat = seats[(i + step) % seats.length];
    if (!isOut(state, seat) && isBidding(state, seat)) return seat;
  }
  return from;
}

/** The spaces the button may pick for `by` that the move itself accepts now, in board order. */
function accepted({ engine, runtime }: Table, by: PlayerId, words: string): number[] {
  const action = runtime.game.phases.flatMap((phase) => phase.actions).find((a) => a.words === words);
  if (!action) throw new Error(`The game has no “${words}” button.`);
  // The target phrase lists the spaces they own; only the move says which of them the Only if lines allow now.
  const accepts = (target: number) => engine.canDispatch({ type: words, by, target }) === true;
  return targetCandidates(runtime, action, engine.getState(), by).filter(accepts);
}

/** The first street the build button may pick that the move itself accepts, or null when there is none. */
const buildable = (table: Table, by: PlayerId): number | null => accepted(table, by, BUILD)[0] ?? null;

/** The first of `candidates` (in board order) with the best `value`, where `beats` says which of two is better; null when there are none. */
function firstBest(candidates: number[], value: (space: number) => number, beats: (a: number, b: number) => boolean): number | null {
  return candidates.reduce<number | null>((best, space) => (best === null || beats(value(space), value(best)) ? space : best), null);
}

/**
 * One turn of a player who always buys and builds when allowed. It first pays off its mortgages in board order, for as long as
 * it keeps `PAY_OFF_RESERVE` money after each, so that spaces handed over mortgaged charge rent again. In jail, a player
 * holding a Get Out Of Jail Free uses it first. Otherwise an even seat pays to leave whenever it may; an odd seat never does,
 * so it rolls for a double and sometimes reaches the third failed roll, and every way out of jail comes up even with two
 * players. Then it rolls while it may (a double rolls again, until the third sends it to jail), builds on the first street it
 * may until it can't, and ends its turn.
 *
 * After each roll it buys the space it landed on if it may, and otherwise auctions it if it may. The auction is played out
 * there and then, inside the lander's turn, so a turn is still one call: each player whose turn in the auction it is bids
 * `RAISE` more than the high bid while that is below the space's price and it would keep `KEEP` money, and otherwise drops
 * out. Every bid raises the high bid by `RAISE` up to the price (each price is a multiple of it) and every drop-out takes away
 * a bidder, so the auction always ends. The turn is then the lander's again as it stood: a double rolls again through the same
 * loop, and the turn ends as before.
 *
 * After every move, whoever's turn it is, the players in debt settle up, the first in seat order first, since nothing else can
 * happen until they do: before each of their presses, the engine must refuse the player whose turn it is every turn button.
 * An odd seat gives up at once, so players still go out holding buildings. An even seat raises money: it sells a building off
 * its street with the dearest house price, else mortgages its cheapest space, and gives up only when it can do neither. Each
 * sale or mortgage takes away a building or an unmortgaged space, so settling always ends. The turn stops as soon as its
 * player gives up (the turn has passed already) or the game ends.
 */
function playTurn(table: Table, watch: Watch = () => {}): void {
  const { engine, runtime } = table;
  const by = engine.getState().turn!.current;
  const attr = (space: number, column: string) => runtime.game.board!.spaces[space].attrs[column] as number;
  let settling = false;
  const make = (move: Move) => {
    const before = engine.getState();
    const outcome = engine.dispatch(move);
    expect(outcome.ok, `${move.by} could not ${move.type}: ${outcome.reason}`).toBe(true);
    watch(before, move, engine.getState());
    if (!settling) settle();
  };
  // One press by a player in debt. It doesn't settle again by itself: `settle` presses on until nobody owes.
  const raise = (debtor: PlayerId) => {
    if (!isEven(debtor)) return make({ type: GIVE_UP, by: debtor });
    const sale = firstBest(accepted(table, debtor, SELL), (at) => attr(at, 'house price'), (a, b) => a > b);
    if (sale !== null) return make({ type: SELL, by: debtor, target: sale });
    const mortgage = firstBest(accepted(table, debtor, MORTGAGE), (at) => attr(at, 'price'), (a, b) => a < b);
    make(mortgage === null ? { type: GIVE_UP, by: debtor } : { type: MORTGAGE, by: debtor, target: mortgage });
  };
  // While anyone owes, the turn's own buttons wait: the engine refuses every one of them to the player whose turn it is.
  const turnWaits = () => {
    const current = engine.getState().turn!.current;
    for (const type of TURN_BUTTONS) expect(engine.canDispatch({ type, by: current }), `${current} may ${type} while someone owes`).not.toBe(true);
    expect(buildable(table, current), `a street ${current} may build on while someone owes`).toBeNull();
  };
  const settle = () => {
    settling = true;
    const owing = () => (engine.getState().result === undefined ? debtors(engine.getState(), runtime.seats) : []);
    for (let debtor = owing()[0]; debtor !== undefined; debtor = owing()[0]) {
      turnWaits();
      raise(debtor);
    }
    settling = false;
  };
  const stillTheirs = () => engine.getState().result === undefined && engine.getState().turn!.current === by;
  const may = (type: string) => stillTheirs() && engine.canDispatch({ type, by }) === true;
  // Every move here is the current seat's in the auction, so the lander's turn comes back once nobody is left bidding.
  const playAuction = () => {
    for (let state = engine.getState(); state.result === undefined && state.turn!.phase === AUCTION_PHASE; state = engine.getState()) {
      const bidder = state.turn!.current;
      const price = attr(upForAuction(state)[0], 'price');
      const next = highBid(state) + RAISE;
      const bids = highBid(state) < price && counterOf(state, 'money', bidder) - next >= KEEP;
      make(bids ? { type: BID, by: bidder, amount: next } : { type: DROP, by: bidder });
    }
  };
  const rollWith = (type: string) => {
    make({ type, by });
    if (may(BUY)) make({ type: BUY, by });
    else if (may(AUCTION)) {
      make({ type: AUCTION, by });
      playAuction();
    }
  };
  const evenSeat = isEven(by);
  for (let at = accepted(table, by, PAY_OFF)[0]; at !== undefined; at = accepted(table, by, PAY_OFF)[0]) {
    if (counterOf(engine.getState(), 'money', by) - payOff(attr(at, 'price')) < PAY_OFF_RESERVE) break;
    make({ type: PAY_OFF, by, target: at });
  }
  if (may(USE)) make({ type: USE, by });
  if (evenSeat && may(PAY)) make({ type: PAY, by });
  if (may(ROLL_FOR_DOUBLE)) rollWith(ROLL_FOR_DOUBLE);
  while (may(ROLL)) rollWith(ROLL);
  if (!stillTheirs()) return;
  for (let target = buildable(table, by); target !== null; target = buildable(table, by)) make({ type: BUILD, by, target });
  make({ type: END, by });
}

/** Plays turns until someone wins or `turns` have been played; how many were played. */
function playUpTo(table: Table, turns: number, watch?: Watch): number {
  let played = 0;
  for (; played < turns && table.engine.getState().result === undefined; played++) playTurn(table, watch);
  return played;
}

const totalMoney = (state: GameState, seats: PlayerId[]) => seats.reduce((sum, seat) => sum + counterOf(state, 'money', seat), 0);

/**
 * The rules of money, of the bank, of jail, of debts and of the cards, checked around every move. Money only comes in through
 * Go, the cards, mortgages and buildings sold back, and only leaves through tax, purchases, building, leaving jail, paying off
 * mortgages and the cards; rent moves it between players. Giving up moves none: the debt is left unpaid. What a drawn card
 * does is checked card by card in the examples, so here a walk onto a Chance or Treasury space only checks that the mover
 * drew. Houses and hotels only move between the bank and the board. A mortgaged space has an owner and no building on its
 * color. A player in debt always owes someone, and the turn only passes when its player gives up or ends it with nobody in
 * debt. A player in jail is on Jail, and only a player in jail has jail turns, never more than two. What a player did and
 * rolled this turn is forgotten as the turn passes, so only the player whose turn it is has any. No card is ever lost or
 * made: each lies face down in its own deck's pile, or face up in the kept cards of a player still in when it is a Get Out
 * Of Jail Free, so each pile and the kept cards between them always hold their deck exactly.
 *
 * An auction is only started on a space for sale that nobody owns and that was not auctioned already, and every player still
 * in bids in it, starting on the lander's left. Only a bidder whose turn in it it is acts, a bid beats the high bid with money
 * they have, and the high bidder never drops out. The winner pays exactly their bid and owns the space; with no winner nobody
 * pays and it stays up for auction, unowned. Either way the turn goes back to the lander as it stood, with what they did and
 * rolled in it. The phase is the auction exactly while someone is bidding, one space at most is up for auction, and outside
 * an auction the high bid is 0.
 */
function keepsTheRules(runtime: LangRuntime, seats: PlayerId[]): Watch {
  const { game } = runtime;
  const { spaces } = game.board!;
  const keptBy = (state: GameState, seat: PlayerId) => zoneCards(state, zoneIdFor(KEPT, seat)).length;
  const highBidders = (state: GameState) => seats.filter((seat) => isHighBidder(state, seat));
  /** The auction under way: who landed, on which space, and their turn as it stood, to check it comes back exactly. */
  let open: { lander: PlayerId; at: number; log: Json; rolls: Json | null } | null = null;

  /** Each seat's money changed by what `moved` says for it, and nobody else's changed at all. */
  const moneyMoves = (before: GameState, after: GameState, moved: Record<PlayerId, number>, why: string) => {
    for (const seat of seats) {
      const got = counterOf(after, 'money', seat) - counterOf(before, 'money', seat);
      expect(got, `${seat}'s money after ${why}`).toBe(moved[seat] ?? 0);
    }
  };

  /**
   * The mover's piece walked from `from` by the roll the move made: Go's salary on passing it, the tax of the space it lands
   * on or its rent to the owner, and on top a fine to the bank. Go To Jail has no tax and no owner, and no walk onto it passes
   * Go, so landing there pays nothing; it sends the piece straight to Jail and the player into jail.
   */
  const walks = (before: GameState, after: GameState, by: PlayerId, from: number, fine: number) => {
    const roll = latestRoll(after)!;
    const to = from + roll[0] + roll[1];
    const at = to % SPACES;
    const landed = spaces[at].attrs;
    if (DRAW_KINDS.includes(landed.kind as string)) {
      // The card may move money and the piece on; the examples check each card, so here only that the mover drew one.
      expect(after.data[LAST_DRAWN_KEY], `${by} drew no card on ${spaces[at].name}`).not.toBe(before.data[LAST_DRAWN_KEY]);
      expect(lastDrawn(after)!.seat, `who drew on ${spaces[at].name}`).toBe(by);
      return;
    }
    const salary = to >= SPACES ? 200 : 0;
    const tax = landed.kind === 'tax' ? (landed.tax as number) : 0;
    // Rent only moves money from the mover to the owner of the space they landed on, as much as the Rent: section says.
    const owner = ownerOf(before, at);
    const charged = owner !== null && owner !== by;
    const rent = charged ? runtime.columnValue(setRoll(before, roll), at, 'rent')! : 0;
    if (isMortgaged(before, at)) expect(rent, `rent on ${spaces[at].name}, which is mortgaged`).toBe(0);
    const moved: Record<PlayerId, number> = { [by]: salary - tax - rent - fine };
    if (charged) moved[owner] = rent;
    moneyMoves(before, after, moved, `${by} rolled ${roll} from space ${from}`);
    // Going below 0 leaves them in debt, not out: only giving up puts a player out.
    expect(isOut(after, by), `${by} went out by rolling ${roll} from space ${from}`).toBe(false);
    const sent = at === GO_TO_JAIL;
    expect(pieceAt(after, by), `${by}'s piece after rolling ${roll} from space ${from}`).toBe(sent ? JAIL : at);
    expect(inJail(after, by), `${by} in jail after rolling ${roll} from space ${from}`).toBe(sent);
  };

  return (before, move, after) => {
    const by = move.by as PlayerId;
    const change = totalMoney(after, seats) - totalMoney(before, seats);
    // The auction this move was made in, if any; a move that ends it closes `open` below, and the turn check still needs it.
    const opened = open;
    const inAuction = (state: GameState) => state.turn!.phase === AUCTION_PHASE;
    if (move.type === ROLL || move.type === ROLL_FOR_DOUBLE) {
      const roll = latestRoll(after)!;
      expect(roll).toHaveLength(2);
      expect(roll.every((face) => Number.isInteger(face) && face >= 1 && face <= 6)).toBe(true);
    }
    if (move.type === ROLL && doublesThisTurn(after, by) === 3) {
      // The third double moves nothing and pays nothing: the piece goes straight to Jail.
      moneyMoves(before, after, {}, `${by} rolled a third double`);
      expect(pieceAt(after, by)).toBe(JAIL);
      expect(inJail(after, by)).toBe(true);
    } else if (move.type === ROLL) {
      walks(before, after, by, pieceAt(before, by)!, 0);
    } else if (move.type === ROLL_FOR_DOUBLE) {
      expect(inJail(before, by), `${by} rolled for a double out of jail`).toBe(true);
      expect(pieceAt(before, by)).toBe(JAIL);
      const roll = latestRoll(after)!;
      // A double lets them out at no cost, and the third failed roll lets them out for the fine; either way they walk from Jail.
      if (isDouble(roll)) walks(before, after, by, JAIL, 0);
      else if (jailTurns(before, by) === 2) walks(before, after, by, JAIL, FINE);
      else {
        moneyMoves(before, after, {}, `${by} failed to roll a double with ${roll}`);
        expect(pieceAt(after, by)).toBe(JAIL);
        expect(inJail(after, by)).toBe(true);
        expect(jailTurns(after, by)).toBe(jailTurns(before, by) + 1);
      }
    } else if (move.type === PAY) {
      moneyMoves(before, after, { [by]: -FINE }, `${by} paid to leave jail`);
      expect(inJail(after, by)).toBe(false);
      expect(jailTurns(after, by)).toBe(0);
    } else if (move.type === USE) {
      moneyMoves(before, after, {}, `${by} used a ${PASS_CARD}`);
      expect(inJail(after, by)).toBe(false);
      expect(jailTurns(after, by)).toBe(0);
      expect(keptBy(after, by), `${by}'s kept cards after using one`).toBe(keptBy(before, by) - 1);
    } else if (move.type === BUY) {
      const at = pieceAt(before, by)!;
      expect(change).toBe(-(spaces[at].attrs.price as number));
      expect(ownerOf(after, at)).toBe(by);
    } else if (move.type === BUILD) {
      // One more building on the street they picked: a house, or a hotel in place of its four houses.
      const at = move.target as number;
      expect(change, `${by} built on ${spaces[at].name}`).toBe(-(spaces[at].attrs['house price'] as number));
      expect(ownerOf(after, at)).toBe(by);
      expect(buildingsOn(after, at)).toBe(buildingsOn(before, at) + 1);
    } else if (move.type === MORTGAGE) {
      const at = move.target as number;
      moneyMoves(before, after, { [by]: half(spaces[at].attrs.price as number) }, `${by} mortgaged ${spaces[at].name}`);
      const mortgaged = [isMortgaged(before, at), isMortgaged(after, at), ownerOf(after, at)];
      expect(mortgaged, `${spaces[at].name} mortgaged by ${by}, and its owner`).toEqual([false, true, by]);
    } else if (move.type === PAY_OFF) {
      const at = move.target as number;
      moneyMoves(before, after, { [by]: -payOff(spaces[at].attrs.price as number) }, `${by} paid off ${spaces[at].name}`);
      expect([isMortgaged(before, at), isMortgaged(after, at)], `${spaces[at].name} paid off by ${by}`).toEqual([true, false]);
    } else if (move.type === SELL) {
      // Sold evenly, off a street with as many buildings as any of its color, one building at a time: a hotel goes back as
      // four houses.
      const at = move.target as number;
      const color = spaces[at].attrs.color;
      for (const [street, space] of spaces.entries()) {
        if (space.attrs.kind !== 'street' || space.attrs.color !== color) continue;
        expect(buildingsOn(before, street), `${space.name} before ${by} sold off ${spaces[at].name}`).toBeLessThanOrEqual(buildingsOn(before, at));
      }
      moneyMoves(before, after, { [by]: half(spaces[at].attrs['house price'] as number) }, `${by} sold a building off ${spaces[at].name}`);
      expect(buildingsOn(after, at), `buildings on ${spaces[at].name} after ${by} sold one`).toBe(buildingsOn(before, at) - 1);
      expect(ownerOf(after, at)).toBe(by);
    } else if (move.type === GIVE_UP) {
      // Their buildings go back to the bank and everything else they own to whom they owe; the debt itself goes unpaid.
      const to = owedTo(before, by, 'money');
      expect(to, `${by} gave up owing no one`).not.toBeNull();
      expect(isOut(after, by), `${by} is still in after giving up`).toBe(true);
      moneyMoves(before, after, {}, `${by} gave up`);
      const heir = to === 'bank' ? null : to;
      for (const [at, space] of spaces.entries()) {
        if (ownerOf(before, at) !== by) continue;
        expect(ownerOf(after, at), `who owns ${space.name} after ${by} gave up to ${to}`).toBe(heir);
        expect(buildingsOn(after, at), `buildings on ${space.name} after ${by} gave up`).toBe(0);
        expect(isMortgaged(after, at), `${space.name} mortgaged after ${by} gave up to ${to}`).toBe(heir === null ? false : isMortgaged(before, at));
      }
      expect(keptBy(after, by), `${by}'s kept cards after giving up`).toBe(0);
      if (heir !== null) {
        expect(keptBy(after, heir), `${heir}'s kept cards after ${by} gave up to them`).toBe(keptBy(before, by) + keptBy(before, heir));
      }
    } else if (move.type === AUCTION) {
      const at = pieceAt(before, by)!;
      const name = spaces[at].name;
      expect([spaces[at].attrs.price !== undefined, ownerOf(before, at), isUp(before, at), before.turn!.phase], `${name} when ${by} auctioned it`)
        .toEqual([true, null, false, 'playing']);
      expect(after.turn!.phase, `the phase once ${by} auctioned ${name}`).toBe(AUCTION_PHASE);
      expect(upForAuction(after), `spaces up for auction once ${by} auctioned ${name}`).toEqual([at]);
      expect(playersIn(after, seats).filter((seat) => !isBidding(after, seat)), `players not bidding for ${name}`).toEqual([]);
      expect([highBidders(after), highBid(after)], `the high bidder and the high bid as ${name} goes up for auction`).toEqual([[], 0]);
      expect(after.turn!.current, `whose turn it is in the auction ${by} started`).toBe(nextIn(before, by, seats));
      moneyMoves(before, after, {}, `${by} auctioned ${name}`);
      // The press is noted before its lines run, so the turn kept to go back to has it as done.
      const log = [...((before.data[TURN_KEY] as Record<string, string[]> | undefined)?.[by] ?? []), AUCTION];
      open = { lander: by, at, log, rolls: before.data[TURN_ROLLS_KEY] ?? null };
    } else if (move.type === BID) {
      const amount = move.amount as number;
      const standing = [inAuction(before), before.turn!.current, isBidding(before, by)];
      expect(standing, `${by} bid ${amount} in the phase ${before.turn!.phase}, in ${before.turn!.current}'s turn`).toEqual([true, by, true]);
      expect(Number.isInteger(amount) && amount > highBid(before), `${by} bid ${amount} over ${highBid(before)}`).toBe(true);
      expect(amount, `${by}'s bid of ${amount}`).toBeLessThanOrEqual(counterOf(before, 'money', by));
      if (inAuction(after)) {
        expect([highBid(after), highBidders(after)], `the high bid and the high bidder after ${by} bid ${amount}`).toEqual([amount, [by]]);
        moneyMoves(before, after, {}, `${by} bid ${amount}`);
      } else {
        // The last one bidding wins with their own bid.
        expect(ownerOf(after, opened!.at), `who owns ${spaces[opened!.at].name} after ${by} won it with ${amount}`).toBe(by);
        moneyMoves(before, after, { [by]: -amount }, `${by} won ${spaces[opened!.at].name} with ${amount}`);
      }
    } else if (move.type === DROP) {
      const standing = [inAuction(before), before.turn!.current, isBidding(before, by), isHighBidder(before, by)];
      expect(standing, `${by} dropped out in the phase ${before.turn!.phase}, in ${before.turn!.current}'s turn`).toEqual([true, by, true, false]);
      if (inAuction(after)) {
        expect(isBidding(after, by), `${by} still bidding after dropping out`).toBe(false);
        moneyMoves(before, after, {}, `${by} dropped out`);
      } else {
        const name = spaces[opened!.at].name;
        const winner = highBidders(before)[0] ?? null;
        expect(ownerOf(after, opened!.at), `who owns ${name} once ${by} dropped out, leaving ${winner} the high bidder`).toBe(winner);
        if (winner === null) {
          moneyMoves(before, after, {}, `nobody bid for ${name}`);
          expect(isUp(after, opened!.at), `${name} still up for auction when nobody bid`).toBe(true);
        } else {
          moneyMoves(before, after, { [winner]: -highBid(before) }, `${winner} won ${name} with ${highBid(before)}`);
        }
      }
    } else {
      expect(change).toBe(0);
    }

    if (inAuction(before) && !inAuction(after)) {
      // The auction is over: the lander's turn is back exactly as it stood, and nothing of the auction is left but the space.
      const { lander, at, log, rolls } = opened!;
      expect(after.turn!.current, `whose turn it is after the auction of ${spaces[at].name}`).toBe(lander);
      expect(after.data[TURN_KEY], `${lander}'s turn log after the auction of ${spaces[at].name}`).toEqual({ [lander]: log });
      expect(after.data[TURN_ROLLS_KEY] ?? null, `${lander}'s rolls after the auction of ${spaces[at].name}`).toEqual(rolls);
      const left = [highBid(after), seats.filter((seat) => isBidding(after, seat)), highBidders(after)];
      expect(left, `the high bid, the bidders and the high bidder after the auction of ${spaces[at].name}`).toEqual([0, [], []]);
      expect(isUp(after, at), `${spaces[at].name} up for auction, with owner ${ownerOf(after, at)}`).toBe(ownerOf(after, at) === null);
      open = null;
    }
    const bidding = playersIn(after, seats).filter((seat) => isBidding(after, seat));
    expect(inAuction(after), `the phase is ${after.turn!.phase} with ${bidding.join(', ') || 'nobody'} bidding`).toBe(bidding.length > 0);
    expect(upForAuction(after).length, `spaces up for auction after ${by} ${move.type}`).toBeLessThanOrEqual(1);
    if (!inAuction(after)) expect(highBid(after), `the high bid outside an auction, after ${by} ${move.type}`).toBe(0);

    // Nobody goes below 0 without owing someone, so giving up always has someone to give to.
    for (const seat of debtors(after, seats)) expect(owedTo(after, seat, 'money'), `whom ${seat} owes after ${by} ${move.type}`).not.toBeNull();

    // The turn moves on only when its player gives up, or ends it once nobody owes anything; an auction hands it round the
    // bidders from the lander's left, and back to the lander when it ends.
    if (after.turn!.current !== before.turn!.current) {
      const gaveUp = move.type === GIVE_UP && by === before.turn!.current;
      const ended = move.type === END && debtors(before, seats).length === 0;
      const auctioned = move.type === AUCTION && after.turn!.current === nextIn(before, by, seats);
      const bidOn = inAuction(after) ? nextBidder(after, by, seats) : opened?.lander;
      const bidded = (move.type === BID || move.type === DROP) && inAuction(before) && after.turn!.current === bidOn;
      expect(gaveUp || ended || auctioned || bidded, `the turn passed from ${before.turn!.current} on ${by} ${move.type}`).toBe(true);
    }

    let houses = 0;
    let hotels = 0;
    for (let space = 0; space < SPACES; space++) {
      const owner = ownerOf(after, space);
      if (owner !== null) expect(isOut(after, owner), `${owner} is out but owns space ${space}`).toBe(false);
      const built = housesOn(after, space);
      expect(built >= 0 && built <= 4 && !(built > 0 && hasHotel(after, space)), `${spaces[space].name} has ${built} houses`).toBe(true);
      if (buildingsOn(after, space) > 0) expect(owner, `${spaces[space].name} has buildings but no owner`).not.toBeNull();
      if (isMortgaged(after, space)) {
        expect(owner, `${spaces[space].name} is mortgaged but has no owner`).not.toBeNull();
        const { kind, color } = spaces[space].attrs;
        const sameColor = (other: (typeof spaces)[number]) => kind === 'street' && other.attrs.kind === 'street' && other.attrs.color === color;
        const builtOn = spaces.filter((other, at) => sameColor(other) && buildingsOn(after, at) > 0);
        expect(builtOn.map((other) => other.name), `streets with buildings on the color of ${spaces[space].name}, which is mortgaged`).toEqual([]);
      }
      houses += built;
      hotels += hasHotel(after, space) ? 1 : 0;
    }
    expect(houses + bankOf(after, 'houses'), `houses on the board and in the bank after ${by} ${move.type}`).toBe(HOUSES);
    expect(hotels + bankOf(after, 'hotels'), `hotels on the board and in the bank after ${by} ${move.type}`).toBe(HOTELS);
    expect(bankOf(after, 'houses')).toBeGreaterThanOrEqual(0);
    expect(bankOf(after, 'hotels')).toBeGreaterThanOrEqual(0);

    // A card's deck comes from its id, never its name, since both decks have a Get Out Of Jail Free.
    expect(after.cards, `cards after ${by} ${move.type}`).toHaveLength(2 * DECK_SIZE);
    const perDeck = new Map<string, number>();
    for (const card of after.cards) {
      const deck = deckOf(game.cards, card.id);
      if (deck === null) throw new Error(`${card.id} came from no deck`);
      perDeck.set(deck.start, (perDeck.get(deck.start) ?? 0) + 1);
      const where = `${card.data?.name} (${card.id}) in ${card.zoneId} after ${by} ${move.type}`;
      if (card.zoneId === zoneIdFor(deck.start)) {
        expect(card.faceUp, `${where} is face up`).toBe(false);
      } else {
        const kept = zoneInfo(game, card.zoneId);
        expect(kept?.spec.name === KEPT && kept.seat !== null, `${where} is neither in its pile nor kept`).toBe(true);
        // Giving up hands kept cards on, so nobody who is out keeps one.
        expect(isOut(after, kept!.seat!), `${where} is kept by a player who is out`).toBe(false);
        expect(card.faceUp, `${where} is face down`).toBe(true);
        expect(card.data?.name, `${where} was kept`).toBe(PASS_CARD);
      }
    }
    expect([...perDeck.values()], `cards of each deck after ${by} ${move.type}`).toEqual([DECK_SIZE, DECK_SIZE]);

    expect(isOut(after, after.turn!.current)).toBe(false);
    for (const seat of seats) {
      if (isOut(after, seat)) expect(pieceAt(after, seat)).toBeNull();
      else expect(pieceAt(after, seat)).not.toBeNull();
    }

    // Both are read as the engine keeps them, by seat, so a roll that lingered into the next turn would show here at once.
    const current = after.turn!.current;
    for (const key of [TURN_KEY, TURN_ROLLS_KEY]) {
      const kept = Object.entries((after.data[key] ?? {}) as Record<string, unknown[]>).filter(([seat, list]) => seat !== current && list.length > 0);
      expect(kept.map(([seat]) => seat), `${key} kept for a seat whose turn it is not, after ${by} ${move.type}`).toEqual([]);
    }

    for (const seat of playersIn(after, seats)) {
      if (inJail(after, seat)) expect(pieceAt(after, seat), `${seat} is in jail but not on Jail`).toBe(JAIL);
      else expect(jailTurns(after, seat), `${seat} has jail turns out of jail`).toBe(0);
      expect(jailTurns(after, seat)).toBeLessThanOrEqual(2);
    }
  };
}

/** The colors of the streets, in the order the board first reaches them. */
function colorsInBoardOrder(): string[] {
  const colors = game!.board!.spaces.filter((space) => space.attrs.kind === 'street').map((space) => space.attrs.color as string);
  return [...new Set(colors)];
}

describe('Rent Day (designer language)', () => {
  // Paying off a mortgage takes a player who mortgaged growing rich again before anyone gives up. In a 2-player game only the
  // even seat ever mortgages, since the odd one gives up and so ends the game, and none of the ten below happens to pay one
  // off (seven of the seeds 1 to 60 do). So the full-set games count it too, and the last test checks it once all have run.
  let paidOff = 0;

  it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));

  it('has the 40 spaces of the table, starting at Go', () => {
    const spaces = game!.board!.spaces;
    expect(spaces).toHaveLength(SPACES);
    expect(spaces[0]).toEqual({ name: 'Go', attrs: { kind: 'go' } });
    expect(spaces[39]).toEqual({
      name: 'The Promenade',
      attrs: {
        kind: 'street', color: 'dark blue', price: 400, 'house price': 200, rent: 50,
        '1 house': 200, '2 houses': 600, '3 houses': 1400, '4 houses': 1700, 'with hotel': 2000,
      },
    });
    // A station's and a utility's rent comes from the Rent: section alone.
    expect(spaces[5]).toEqual({ name: 'North Station', attrs: { kind: 'station', price: 200 } });
    expect(spaces[12]).toEqual({ name: 'Power Works', attrs: { kind: 'utility', price: 150 } });
  });

  it('starts with a bank of 32 houses and 12 hotels', () => {
    const { engine } = createEngine(game!, lib, 2, initialState(game!, 1));
    expect(bankOf(engine.getState(), 'houses')).toBe(HOUSES);
    expect(bankOf(engine.getState(), 'hotels')).toBe(HOTELS);
  });

  it('passes every example', () => {
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(89);
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
  });

  it.each([2, 3, 4, 5, 6, 7, 8])('plays 60 rounds at %i players without breaking a rule of money or of the bank', (n) => {
    const table = createEngine(game!, lib, n, initialState(game!, 200 + n));
    const seats = seatsFor(n);
    const turns = playUpTo(table, 60 * n, keepsTheRules(table.runtime, seats));
    // Sixty rounds were played, or the game came to an end with one player left.
    if (turns < 60 * n) expect(playersIn(table.engine.getState(), seats)).toHaveLength(1);
  }, 30_000);

  it('ends 2-player games on its own: at least 9 of the seeds 1 to 10 reach a winner within 3000 turns, going in and out of jail every way', () => {
    const seats = seatsFor(2);
    const unfinished: number[] = [];
    // How many times, across the ten games, a player went into or out of jail each way.
    const jail = {
      'sent to jail by a third double': 0,
      'sent to jail by landing on Go To Jail': 0,
      'sent to jail by a card': 0,
      'paid to leave jail': 0,
      'used a Get Out Of Jail Free': 0,
      'freed by a double': 0,
      'let out after a third failed roll': 0,
    };
    // And how many times a player raised money each way, or gave up to each kind of creditor. Paying a mortgage off is counted
    // in `paidOff`, across these games and the full-set ones.
    const raising = {
      'took a mortgage': 0,
      'sold a building': 0,
      'gave up to a player': 0,
      'gave up to the bank': 0,
    };
    // And how many auctions ended with a winner, and with everyone dropping out.
    const auctions = { won: 0, 'nobody bid': 0 };
    for (let seed = 1; seed <= 10; seed++) {
      const table = createEngine(game!, lib, 2, initialState(game!, seed));
      const rules = keepsTheRules(table.runtime, seats);
      playUpTo(table, 3000, (before, move, after) => {
        rules(before, move, after);
        const by = move.by as PlayerId;
        if (before.turn!.phase === AUCTION_PHASE && after.turn!.phase !== AUCTION_PHASE) {
          auctions[ownerOf(after, upForAuction(before)[0]) === null ? 'nobody bid' : 'won']++;
        }
        if (move.type === ROLL && !inJail(before, by) && inJail(after, by)) {
          // A roll that ends neither on a third double nor on Go To Jail sent them there by the card it drew.
          const [a, b] = latestRoll(after)!;
          if (doublesThisTurn(after, by) === 3) jail['sent to jail by a third double']++;
          else if ((pieceAt(before, by)! + a + b) % SPACES === GO_TO_JAIL) jail['sent to jail by landing on Go To Jail']++;
          else jail['sent to jail by a card']++;
        } else if (move.type === PAY) {
          jail['paid to leave jail']++;
        } else if (move.type === USE) {
          jail['used a Get Out Of Jail Free']++;
        } else if (move.type === ROLL_FOR_DOUBLE && isDouble(latestRoll(after)!)) {
          jail['freed by a double']++;
        } else if (move.type === ROLL_FOR_DOUBLE && jailTurns(before, by) === 2) {
          jail['let out after a third failed roll']++;
        } else if (move.type === MORTGAGE) {
          raising['took a mortgage']++;
        } else if (move.type === PAY_OFF) {
          paidOff++;
        } else if (move.type === SELL) {
          raising['sold a building']++;
        } else if (move.type === GIVE_UP) {
          raising[owedTo(before, by, 'money') === 'bank' ? 'gave up to the bank' : 'gave up to a player']++;
        }
      });
      const { result } = table.engine.getState();
      if (result === undefined) {
        unfinished.push(seed);
        continue;
      }
      expect(playersIn(table.engine.getState(), seats)).toEqual([(result as { winner: string }).winner]);
    }
    expect(unfinished.length, `seeds with no winner after 3000 turns: ${unfinished.join(', ')}`).toBeLessThanOrEqual(1);
    for (const [way, times] of Object.entries(jail)) expect(times, `times a player was ${way}`).toBeGreaterThan(0);
    for (const [way, times] of Object.entries(raising)) expect(times, `times a player ${way}: ${JSON.stringify(raising)}`).toBeGreaterThan(0);
    for (const [end, times] of Object.entries(auctions)) expect(times, `auctions that ${end}: ${JSON.stringify(auctions)}`).toBeGreaterThan(0);
  }, 60_000);

  it.each([[4, 1], [4, 2], [4, 3], [8, 1], [8, 2], [8, 3]])(
    'ends a %i-player game where every player starts with a full color set (seed %i)',
    (n, seed) => {
      const seats = seatsFor(n);
      const colors = colorsInBoardOrder();
      const { spaces } = game!.board!;
      // Seat i owns every street of the i-th color before anyone moves.
      const dealt = spaces.reduce(
        (state, space, at) => {
          const seat = colors.indexOf(space.attrs.color as string);
          return space.attrs.kind === 'street' && seat < n ? setOwner(state, at, seats[seat]) : state;
        },
        withBoardData(initialState(game!, seed), game!, seats),
      );
      const table = createEngine(game!, lib, n, dealt);
      const rules = keepsTheRules(table.runtime, seats);
      let hotelsBuilt = 0;
      let outHoldingBuildings = 0;
      const turns = playUpTo(table, 5000, (before, move, after) => {
        rules(before, move, after);
        if (move.type === BUILD && !hasHotel(before, move.target as number) && hasHotel(after, move.target as number)) hotelsBuilt++;
        const holdsBuildings = (seat: PlayerId) => spaces.some((_, at) => ownerOf(before, at) === seat && buildingsOn(before, at) > 0);
        outHoldingBuildings += seats.filter((seat) => !isOut(before, seat) && isOut(after, seat) && holdsBuildings(seat)).length;
        if (move.type === PAY_OFF) paidOff++;
      });
      const { result } = table.engine.getState();
      expect(result, `no winner after ${turns} turns`).toBeDefined();
      expect(playersIn(table.engine.getState(), seats)).toEqual([(result as { winner: string }).winner]);
      // The bank's rules were checked where they matter: a hotel took the place of four houses, and a player went out holding buildings.
      expect(hotelsBuilt).toBeGreaterThan(0);
      expect(outHoldingBuildings).toBeGreaterThan(0);
    },
    60_000,
  );

  it('settles the debts of players whose turn it is not while the turn waits for them, then plays on to a winner at 5 players', () => {
    const n = 5;
    const seats = seatsFor(n);
    // The Setup has shuffled the piles; then p0 is to roll 1 and 1 onto Treasury, where Opera Night is on top, and every
    // other player has 30 money, so all four owe p0 at once in p0's turn. Each settles in its own way: p1 has nothing and
    // gives up, p2 sells a house off the brown set, p3 gives up and hands North Station to p0, and p4 mortgages Power Works.
    // The fixed roll makes that happen whatever the seed. Of the seeds 1 to 20, seed 19 plays on longest (234 turns to a
    // winner), and in it p0 later sells a house in p2's turn of its own accord.
    const started = createEngine(game!, lib, n, initialState(game!, 19)).engine.getState();
    const pile = zoneIdFor('treasury pile');
    const opera = zoneCards(started, pile).find((card) => card.data?.name === 'Opera Night')!;
    let state = queueRoll(relocate(started, [opera.id], pile, game!), [1, 1]);
    for (const seat of seats.slice(1)) state = setCounter(state, 'money', seat, 30);
    const [millLane, ferryRow, northStation, powerWorks] = [1, 3, 5, 12];
    state = setBank(setSpaceFact(setSpaceFact(state, millLane, 'houses', 1), ferryRow, 'houses', 1), 'houses', HOUSES - 2);
    state = setOwner(setOwner(setOwner(setOwner(state, millLane, 'p2'), ferryRow, 'p2'), northStation, 'p3'), powerWorks, 'p4');
    const table = createEngine(game!, lib, n, state);
    const rules = keepsTheRules(table.runtime, seats);
    // The presses made by a player whose turn it is not, by button.
    const outOfTurn: Record<string, number> = {};
    const turns = playUpTo(table, 60 * n, (before, move, after) => {
      rules(before, move, after);
      if (move.by !== before.turn!.current) outOfTurn[move.type] = (outOfTurn[move.type] ?? 0) + 1;
    });
    expect(table.engine.getState().result, `no winner after ${turns} turns`).toBeDefined();
    if (turns < 60 * n) expect(playersIn(table.engine.getState(), seats)).toHaveLength(1);
    // Only the buttons any player may press are ever pressed out of turn, and the three ways of settling a debt all were.
    expect(Object.keys(outOfTurn).filter((type) => ![SELL, MORTGAGE, PAY_OFF, GIVE_UP].includes(type))).toEqual([]);
    for (const type of [GIVE_UP, SELL, MORTGAGE]) expect(outOfTurn[type] ?? 0, `out-of-turn presses to ${type}: ${JSON.stringify(outOfTurn)}`).toBeGreaterThan(0);
  }, 30_000);

  it.each([[2, 1], [4, 2], [8, 3]])('a game with little money and no Go salary ends with a winner at %i players (seed %i)', (n, seed) => {
    const salary = '  When a piece passes Go:\n    Its player gets 200 money.\n';
    const draws = '  When a player lands on a chance space:\n    They draw from the chance pile and do what it says.\n'
      + '  When a player lands on a treasury space:\n    They draw from the treasury pile and do what it says.\n';
    expect(RENT_DAY).toContain('Each player has 1500 money');
    expect(RENT_DAY).toContain(salary);
    expect(RENT_DAY).toContain(draws);
    // Without a Go salary and without the cards, which bring money in too, money only leaves the table (taxes, purchases and
    // building), so someone always runs out in the end.
    const lean = RENT_DAY.replace('Each player has 1500 money', 'Each player has 300 money').replace(salary, '').replace(draws, '');
    const compiled = compileGame(lean, lib);
    expect(compiled.diagnostics).toEqual([]);
    const g = compiled.game!;
    const table = createEngine(g, lib, n, initialState(g, seed));
    playUpTo(table, 20000);
    const winner = (table.engine.getState().result as { winner: string }).winner;
    expect(playersIn(table.engine.getState(), seatsFor(n))).toEqual([winner]);
  });

  it('undo takes back every move, and the log rebuilds the same game', () => {
    const fresh = () => createEngine(game!, lib, 4, initialState(game!, 42));
    const table = fresh();
    const { engine } = table;
    const states = [engine.getState()];
    for (let turn = 0; turn < 40 && engine.getState().result === undefined; turn++) {
      playTurn(table, (_before, _move, after) => states.push(after));
    }
    const log = [...engine.getLog()];
    expect(log.length).toBe(states.length - 1);
    expect(log.length).toBeGreaterThanOrEqual(80);
    expect(log.some((move) => move.type === BUY)).toBe(true);

    // The same moves from the same seed roll the same dice and fire the same moments.
    const replayed = fresh().engine;
    replayed.loadLog(log);
    expect(replayed.getState()).toEqual(engine.getState());

    for (let i = states.length - 2; i >= 0; i--) {
      engine.undo();
      expect(engine.getState()).toEqual(states[i]);
    }
    expect(engine.getState()).toEqual(fresh().engine.getState());
  });

  it('pays off a mortgage somewhere in the 2-player and full-set games', () => {
    expect(paidOff, 'mortgages paid off across the games that end on their own').toBeGreaterThan(0);
  });
});
