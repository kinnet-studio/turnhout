import { zoneCards, type GameState } from '../../game-state';
import { counterOf, owedTo, ownerOf, playersIn, setOwner, type Creditor } from '../board-state';
import { deckOf } from '../cards';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import type { ConditionFn, EffectFn, ExpectFn, PhraseEnv } from '../types';
import { relocate, toBottom, zoneIdFor } from '../zones';
import { boardOf } from './fact-phrases';
import { seatOf, theyOf } from './support';

/**
 * What players pay with. The phrases that call this say `needsPayment`; an example's Then line cannot, so a game with nothing
 * to pay with is told so instead of being asked whom a player owes.
 */
function payWithOf(env: PhraseEnv): string {
  const counter = env.game.board?.payWith ?? null;
  if (counter === null) throw new RuleError('Say what players pay with, like “Players pay with coins.” under Board:.');
  return counter;
}

/** Whom a player owes as a Then line says it. */
const named = (owed: Creditor | null): string => (owed === null ? 'no one' : owed === 'bank' ? 'the bank' : owed);

// ---- conditions ------------------------------------------------------------------------------

const hasLessThan: ConditionFn = (env, [n, counter]) => counterOf(env.state, counter as string, theyOf(env)) < (n as number);

/** Players who are out are not counted: they were given up on, whatever they were left with. */
const noneHasLessThan: ConditionFn = (env, [n, counter]) =>
  playersIn(env.state, env.seats).every((seat) => counterOf(env.state, counter as string, seat) >= (n as number));

const owesTheBank: ConditionFn = (env) => owedTo(env.state, theyOf(env), payWithOf(env)) === 'bank';

// ---- effects ---------------------------------------------------------------------------------

/**
 * Hands over the spaces they own and the cards they keep in view, and nothing else: their facts stay on the spaces and their
 * counters stay as they are, since giving up hands over things, not what they owe. A creditor who is out is the bank, which
 * owns nothing, so a space goes back to being unowned and each card goes under the pile of the deck it came from.
 */
const everythingGoesToCreditor: EffectFn = (env) => {
  const they = theyOf(env);
  const to = owedTo(env.state, they, payWithOf(env));
  if (to === null) throw new RuleError('They owe no one: no payment took them below 0.');
  let state: GameState = boardOf(env).spaces.reduce(
    (s, _space, at) => (ownerOf(s, at) === they ? setOwner(s, at, to === 'bank' ? null : to) : s),
    env.state,
  );
  // Only cards kept where everyone can see them are handed over; what they hold in a hand or a hidden pile stays put.
  for (const zone of env.game.zones.filter((z) => z.perPlayer && z.visibility === 'public')) {
    const kept = zoneCards(state, zoneIdFor(zone.name, they));
    if (to !== 'bank') {
      state = relocate(state, kept.map((card) => card.id), zoneIdFor(zone.name, to), env.game);
      continue;
    }
    for (const { id } of kept) {
      const deck = deckOf(env.game.cards, id);
      if (!deck) throw new Error(`The card ${id} came from no deck.`);
      state = toBottom(state, id, zoneIdFor(deck.start), env.game);
    }
  }
  return state;
};

// ---- examples: expect --------------------------------------------------------------------------

/** Says whom the player owes when it is not who the example expected. */
function expectOwed(env: PhraseEnv, seat: string, expected: Creditor): true | string {
  const owed = owedTo(env.state, seat, payWithOf(env));
  return owed === expected ? true : `Expected ${seat} to owe ${named(expected)}, but they owe ${named(owed)}.`;
}

const owesExpected: ExpectFn = (env, [seat, creditor]) => expectOwed(env, seatOf(env, seat), seatOf(env, creditor));

const owesTheBankExpected: ExpectFn = (env, [seat]) => expectOwed(env, seatOf(env, seat), 'bank');

/** The sentences about whom a payment that took a player below 0 left them owing, and about giving up to them. */
export function registerDebtPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('they have less than {int} {counter}', hasLessThan, { needsPlayer: true })
    .condition('no player has less than {int} {counter}', noneHasLessThan)
    .condition('they owe the bank', owesTheBank, { needsPlayer: true, needsPayment: true })
    .effect('everything they own goes to the player they owe', everythingGoesToCreditor, { needsPlayer: true, needsBoard: true, needsPayment: true })
    .expect('{player} owes {player}', owesExpected)
    .expect('{player} owes the bank', owesTheBankExpected);
}
