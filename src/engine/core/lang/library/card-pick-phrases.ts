import type { Move } from '../../moves';
import type { CardState, PlayerId } from '../../scene';
import { moveZoneId } from '../declared-moves';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { joinOr } from '../refs';
import type { ActionFn, CardMatch, CardPick, ConditionFn, DeclaredAction, EffectFn, PhraseEnv, ZoneRef } from '../types';
import { BOX_ZONE, matchesCard, relocate, zoneInfo } from '../zones';
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
 * The id of the lowest-id card in play that matches and is not `taken`: the one in `zoneId` when there is one, else one anywhere in
 * play, so that the game refuses it in its own words.
 */
function cardFor(inPlay: CardState[], match: CardMatch, zoneId: string | null, taken: Set<string>, by: PlayerId, base: string): string {
  const left = inPlay.filter((card) => !taken.has(card.id) && matchesCard(card, match));
  const card = left.find((c) => c.zoneId === zoneId) ?? left[0];
  if (!card) throw new RuleError(`I can't find ${describeCard(match)} for ${by} to ${base}.`);
  return card.id;
}

/** A zone by its id, as an example names it: “the shop”, “p0's stash”. */
function exampleZone(env: PhraseEnv, zoneId: string): string {
  const info = zoneInfo(env.game, zoneId);
  if (!info) return zoneId;
  return info.seat === null ? `the ${info.spec.name}` : `${info.seat}'s ${info.spec.name}`;
}

const allDifferent = (values: (string | null)[]): boolean => new Set(values).size === values.length;

/**
 * What an example has to say to press one of several buttons that could take its cards: where they come from, when each takes them from
 * a zone of its own; else where they go, when each puts them somewhere else; else no wording of the example can choose, and the buttons
 * need other words. The card they go to is no place an example can name: it names the card, not where the card lies.
 */
function tellApart(env: PhraseEnv, takers: DeclaredAction[], by: PlayerId): string {
  const sources = takers.map((action) => moveZoneId(action.pick!.from, env.seats, by));
  if (allDifferent(sources)) {
    const named = sources.flatMap((zoneId) => (zoneId === null ? [] : [`“… from ${exampleZone(env, zoneId)}”`]));
    return `Say where it comes from: ${joinOr(named)}.`;
  }
  const goes = takers.map(({ pick }) => (pick!.onto !== null ? 'a card' : pick!.to === null ? 'nowhere' : moveZoneId(pick!.to, env.seats, by)));
  return allDifferent(goes) ? 'Say where it goes.' : 'Give the buttons different words.';
}

/**
 * A player presses a button that picks cards and names them: “p0 buys the Ruby”, or “p0 buys the Ruby to p0's case” where the zone
 * says which of the buttons with that base is meant, or “p0 shows the Opal to the Ruby” for a button that picks a card for them to go
 * to. With `saysFrom`, the zone after “from” says where the cards come from too: “p0 buys the Ruby from the stall”, “… from the stall to
 * p0's case”. Two or more cards press a button that picks a set; one card may press either kind. Of the buttons the words fit, the one
 * of this phase whose zone holds the cards is pressed; when several do, the example is told what would tell them apart. When none does,
 * the first that fits is pressed with the cards from wherever they are in play, so that the game refuses it in its own words. A card the
 * table does not have can't be pressed at all.
 */
const pressesCardButton = (form: Form, saysFrom = false): ActionFn => (env, args) => {
  const [seat, base, matches, ...rest] = args as [string, string, CardMatch[], ...(ZoneRef | CardMatch)[]];
  const [from, after] = saysFrom ? [rest[0] as ZoneRef, rest[1]] : [undefined, rest[0]];
  const by = seatOf(env, seat);
  const comesFrom = from === undefined ? null : soleZone(from, env, by);
  const goesTo = form === 'to zone' ? soleZone(after as ZoneRef, env, by) : null;
  const fitsForm = (pick: CardPick): boolean => {
    if (comesFrom !== null && moveZoneId(pick.from, env.seats, by) !== comesFrom) return false;
    if (form === 'to card') return pick.onto !== null;
    if (form === 'alone') return pick.onto === null;
    return pick.to !== null && moveZoneId(pick.to, env.seats, by) === goesTo;
  };
  const fits = buttonsWithBase(env, base).filter(({ action }) => fitsForm(action.pick!) && (matches.length === 1 || action.pick!.some));
  if (fits.length === 0) {
    const whence = from === undefined ? '' : ` from ${describeZone(from)}`;
    const where = form === 'to zone' ? ` to ${describeZone(after as ZoneRef)}` : form === 'to card' ? ' to another card' : '';
    throw new RuleError(`No button lets ${by} ${base} ${matches.length === 1 ? 'a card' : 'more than one card'}${whence}${where}.`);
  }
  const inPlay = env.state.cards.filter((card) => card.zoneId !== BOX_ZONE).sort(byCardId);
  const fromZone = (action: DeclaredAction) => moveZoneId(action.pick!.from, env.seats, by);
  const takers = fits.filter(({ action, here }) => here && holdsEach(inPlay.filter((card) => card.zoneId === fromZone(action)), matches));
  if (takers.length > 1) {
    const actions = takers.map(({ action }) => action);
    const wordings = joinOr(actions.map((action) => `“${action.words}”`));
    throw new RuleError(`${by} could ${base} ${describeCard(matches[0])} with more than one button: ${wordings}. ${tellApart(env, actions, by)}`);
  }
  const button = (takers[0] ?? fits[0]).action;
  const pick = button.pick!;
  const taken = new Set<string>();
  const ids = matches.map((match) => {
    const id = cardFor(inPlay, match, fromZone(button), taken, by, base);
    taken.add(id);
    return id;
  });
  const move: Move = pick.some ? { type: button.words, cardIds: ids } : { type: button.words, cardId: ids[0] };
  if (form === 'to card') {
    const ontoZone = pick.onto === null ? null : moveZoneId(pick.onto, env.seats, by);
    move.onto = cardFor(inPlay, after as CardMatch, ontoZone, taken, by, base);
  }
  return { by, move };
};

/**
 * What the lines of a button that picks cards may say about them: “the target card” for the card a press picked for its cards to go
 * to, and “the picked cards” for a set. And the lines of an example that press such a button (“A player may buy a card from the shop to
 * their stash.”), naming the cards after the button's base, and where they come from or where they go when two buttons could take them.
 */
export function registerCardPickPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('the target card is {cardclass}', targetIs(true), { needsOnto: true })
    .condition('the target card is not {cardclass}', targetIs(false), { needsOnto: true })
    .condition('they picked at most {int} card(s)', pickedAtMost, { needsCards: true })
    .effect('move the picked cards to {zone}', movePickedTo, { needsCards: true })
    .action('{player} {cardaction} {cardlist}', pressesCardButton('alone'))
    .action('{player} {cardaction} {cardlist} to {zone}', pressesCardButton('to zone'))
    .action('{player} {cardaction} {cardlist} to {card}', pressesCardButton('to card'))
    .action('{player} {cardaction} {cardlist} from {zone}', pressesCardButton('alone', true))
    .action('{player} {cardaction} {cardlist} from {zone} to {zone}', pressesCardButton('to zone', true))
    .action('{player} {cardaction} {cardlist} from {zone} to {card}', pressesCardButton('to card', true));
}
