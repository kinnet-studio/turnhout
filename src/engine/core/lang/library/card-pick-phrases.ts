import type { Move } from '../../moves';
import type { CardState, PlayerId } from '../../scene';
import { moveZoneId } from '../declared-moves';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { joinOr } from '../refs';
import type { ActionFn, CardMatch, CardPick, ConditionFn, DeclaredAction, EffectFn, PhraseEnv, ZoneRef } from '../types';
import { BOX_ZONE, matchesCard, relocate } from '../zones';
import { byCardId, describeCard } from './example-phrases';
import { describeZone, seatOf, soleZone, theTargetCard, thePickedCards } from './support';

// ---- the lines of a button that picks cards ------------------------------------------------------

const targetIs = (wanted: boolean): ConditionFn => (env, args) => matchesCard(theTargetCard(env), args[0] as CardMatch) === wanted;

/** The press is judged as a whole, so this counts the set the press gave, not any one card of it. */
const pickedAtMost: ConditionFn = (env, [most]) => thePickedCards(env).length <= (most as number);

/** In the press's order, so that the card picked last ends on top of a pile. */
const movePickedTo: EffectFn = (env, [zone]) => relocate(env.state, thePickedCards(env), soleZone(zone as ZoneRef, env), env.game);

// ---- examples: action --------------------------------------------------------------------------

/** What an example says after the cards it names: nothing, the zone they go to, or the card they go to. */
type Form = 'alone' | 'to zone' | 'to card';

/** A button that picks cards, and whether it is one of the phase the game is in. */
type Button = { action: DeclaredAction; here: boolean };

/** Every button that picks cards with this base: the current phase's first, then the other phases', each in the order written. */
function buttonsWithBase(env: PhraseEnv, base: string): Button[] {
  const current = env.state.turn?.phase;
  const all = env.game.phases.flatMap((phase) =>
    phase.actions.filter((action) => action.pick && action.base === base).map((action) => ({ action, here: phase.id === current })));
  return [...all.filter((button) => button.here), ...all.filter((button) => !button.here)];
}

/** Whether `cards` hold a different card for each match, each taking the lowest-id one left. */
function holdsEach(cards: CardState[], matches: CardMatch[]): boolean {
  const taken = new Set<string>();
  return matches.every((match) => {
    const card = cards.find((c) => !taken.has(c.id) && matchesCard(c, match));
    if (card) taken.add(card.id);
    return card !== undefined;
  });
}

/**
 * The card an example's cards go to: the lowest-id one in play that matches, other than the cards picked, in the zone the button picks
 * it in for `by`, else anywhere in play, so that the game refuses it in its own words.
 */
function targetFor(env: PhraseEnv, inPlay: CardState[], pick: CardPick, by: PlayerId, match: CardMatch, picked: string[], base: string): string {
  const zoneId = pick.onto === null ? null : moveZoneId(pick.onto, env.seats, by);
  const left = inPlay.filter((card) => !picked.includes(card.id) && matchesCard(card, match));
  const card = left.find((c) => c.zoneId === zoneId) ?? left[0];
  if (!card) throw new RuleError(`I can't find ${describeCard(match)} for ${by} to ${base}.`);
  return card.id;
}

/**
 * A player presses a button that picks cards and names them: “p0 buys the Ruby”, or “p0 buys the Ruby to p0's case” where the zone
 * says which of the buttons with that base is meant, or “p0 shows the Opal to the Ruby” for a button that picks a card for them to go
 * to. Two or more cards press a button that picks a set; one card may press either kind. Of the buttons the words fit, the one of this
 * phase whose zone holds the cards is pressed; when several do, the example has to say where they go. When none does, the first that
 * fits is pressed with the cards from wherever they are in play, so that the game refuses it in its own words. A card the table does
 * not have can't be pressed at all.
 */
const pressesCardButton = (form: Form): ActionFn => (env, args) => {
  const [seat, base, matches, after] = args as [string, string, CardMatch[], ZoneRef | CardMatch | undefined];
  const by = seatOf(env, seat);
  const goesTo = form === 'to zone' ? soleZone(after as ZoneRef, env, by) : null;
  const fitsForm = (pick: CardPick): boolean => {
    if (form === 'to card') return pick.onto !== null;
    if (form === 'alone') return pick.onto === null;
    return pick.to !== null && moveZoneId(pick.to, env.seats, by) === goesTo;
  };
  const fits = buttonsWithBase(env, base).filter(({ action }) => fitsForm(action.pick!) && (matches.length === 1 || action.pick!.some));
  if (fits.length === 0) {
    const where = form === 'to zone' ? ` to ${describeZone(after as ZoneRef)}` : form === 'to card' ? ' to another card' : '';
    throw new RuleError(`No button lets ${by} ${base} ${matches.length === 1 ? 'a card' : 'more than one card'}${where}.`);
  }
  const inPlay = env.state.cards.filter((card) => card.zoneId !== BOX_ZONE).sort(byCardId);
  const fromZone = (action: DeclaredAction) => moveZoneId(action.pick!.from, env.seats, by);
  const takers = fits.filter(({ action, here }) => here && holdsEach(inPlay.filter((card) => card.zoneId === fromZone(action)), matches));
  if (takers.length > 1) {
    const wordings = takers.map(({ action }) => `“${action.words}”`);
    throw new RuleError(`${by} could ${base} ${describeCard(matches[0])} with more than one button: ${joinOr(wordings)}. Say where it goes.`);
  }
  const button = (takers[0] ?? fits[0]).action;
  const pick = button.pick!;
  const from = fromZone(button);
  const taken = new Set<string>();
  const ids = matches.map((match) => {
    const left = inPlay.filter((card) => !taken.has(card.id) && matchesCard(card, match));
    const card = left.find((c) => c.zoneId === from) ?? left[0];
    if (!card) throw new RuleError(`I can't find ${describeCard(match)} for ${by} to ${base}.`);
    taken.add(card.id);
    return card.id;
  });
  const move: Move = pick.some ? { type: button.words, cardIds: ids } : { type: button.words, cardId: ids[0] };
  if (form === 'to card') move.onto = targetFor(env, inPlay, pick, by, after as CardMatch, ids, base);
  return { by, move };
};

/**
 * What the lines of a button that picks cards may say about them: “the target card” for the card a press picked for its cards to go
 * to, and “the picked cards” for a set. And the lines of an example that press such a button (“A player may buy a card from the shop to
 * their stash.”), naming the cards after the button's base, and where they go when two buttons could take them.
 */
export function registerCardPickPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('the target card is {cardclass}', targetIs(true), { needsOnto: true })
    .condition('the target card is not {cardclass}', targetIs(false), { needsOnto: true })
    .condition('they picked at most {int} card(s)', pickedAtMost, { needsCards: true })
    .effect('move the picked cards to {zone}', movePickedTo, { needsCards: true })
    .action('{player} {cardaction} {cardlist}', pressesCardButton('alone'))
    .action('{player} {cardaction} {cardlist} to {zone}', pressesCardButton('to zone'))
    .action('{player} {cardaction} {cardlist} to {card}', pressesCardButton('to card'));
}
