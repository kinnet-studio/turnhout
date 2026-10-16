import type { CardState } from '../../scene';
import { moveZoneId } from '../declared-moves';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { joinOr } from '../refs';
import type { ActionFn, CardMatch, DeclaredAction, PhraseEnv, ZoneRef } from '../types';
import { BOX_ZONE, matchesCard } from '../zones';
import { byCardId, describeCard } from './example-phrases';
import { describeZone, seatOf, soleZone } from './support';

// ---- examples: action --------------------------------------------------------------------------

/** What an example says after the cards it names: nothing, or the zone they go to. */
type Form = 'alone' | 'to zone';

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
 * A player presses a button that picks a card and names the card: “p0 buys the Ruby”, or “p0 buys the Ruby to p0's case” where the
 * zone says which of the buttons with that base is meant. Of the buttons the words fit, the one of this phase whose zone holds the card
 * is pressed; when several do, the example has to say where it goes. When none does, the first that fits is pressed with the card from
 * wherever it is in play, so that the game refuses it in its own words. A card the table does not have can't be pressed at all.
 */
const pressesCardButton = (form: Form): ActionFn => (env, args) => {
  const [seat, base, matches, zone] = args as [string, string, CardMatch[], ZoneRef | undefined];
  const by = seatOf(env, seat);
  const goesTo = form === 'to zone' ? soleZone(zone as ZoneRef, env, by) : null;
  const fits = buttonsWithBase(env, base).filter(({ action }) => {
    const pick = action.pick!;
    const there = goesTo === null ? pick.onto === null : pick.to !== null && moveZoneId(pick.to, env.seats, by) === goesTo;
    return there && (matches.length === 1 || pick.some);
  });
  if (fits.length === 0) {
    const where = goesTo === null ? '' : ` to ${describeZone(zone as ZoneRef)}`;
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
  const from = fromZone(button);
  const taken = new Set<string>();
  const ids = matches.map((match) => {
    const left = inPlay.filter((card) => !taken.has(card.id) && matchesCard(card, match));
    const card = left.find((c) => c.zoneId === from) ?? left[0];
    if (!card) throw new RuleError(`I can't find ${describeCard(match)} for ${by} to ${base}.`);
    taken.add(card.id);
    return card.id;
  });
  return { by, move: { type: button.words, cardId: ids[0] } };
};

/**
 * The lines of an example that press a button that picks a card (“A player may buy a card from the shop to their stash.”), naming
 * the card after the button's base, and where it goes when two buttons could take it.
 */
export function registerCardPickPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .action('{player} {cardaction} {cardlist}', pressesCardButton('alone'))
    .action('{player} {cardaction} {cardlist} to {zone}', pressesCardButton('to zone'));
}
