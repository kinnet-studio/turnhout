import type { Move } from '../../moves';
import type { CardState, PlayerId } from '../../scene';
import { moveZoneId } from '../declared-moves';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { joinAnd, joinOr } from '../refs';
import type { ActionFn, CardMatch, CardPick, ConditionFn, DeclaredAction, EffectFn, PhraseEnv, ZoneRef } from '../types';
import { BOX_ZONE, matchesCard, relocate, zoneNameOf } from '../zones';
import { byCardId, describeCard } from './example-phrases';
import { describeZone, seatOf, soleZone, theTargetCard, thePickedCards } from './support';

// ---- the lines of a button that picks cards ------------------------------------------------------

const targetIs = (wanted: boolean): ConditionFn => (env, args) => matchesCard(theTargetCard(env), args[0] as CardMatch) === wanted;

/** The press is judged as a whole, so this counts the set the press gave, not any one card of it. */
const pickedAtMost: ConditionFn = (env, [most]) => thePickedCards(env).length <= (most as number);

/** In the press's order, so that the card picked last ends on top of a pile. */
const movePickedTo: EffectFn = (env, [zone]) => relocate(env.state, thePickedCards(env), soleZone(zone as ZoneRef, env), env.game);

// ---- examples: action --------------------------------------------------------------------------

/** What an example says after the cards it names: nothing, the zone they go to, or the card they go to (and maybe the zone it is in). */
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

const allDifferent = (values: (string | null)[]): boolean => new Set(values).size === values.length;

/**
 * Where an example says its cards come from and where they go, with the zones as ids: what tells one button from another. `to` is the zone
 * they go to, or, for “… to the Vase in p0's shelf”, the zone of the card they go to.
 */
type Wording = { form: Form; from: string | null; to: string | null };

/**
 * Who presses, the button's base, the cards the example names, the card it names for them to go to (if any), and every card in play: what
 * each wording of the press is judged on.
 */
type Press = { by: PlayerId; base: string; matches: CardMatch[]; target: CardMatch | null; inPlay: CardState[] };

/** Where `pick`'s button takes the card its cards go to from, for `by`, if it picks one. */
const ontoZoneOf = (env: PhraseEnv, by: PlayerId, pick: CardPick): string | null =>
  (pick.onto === null ? null : moveZoneId(pick.onto, env.seats, by));

/** Whether an example with `wording` could mean the button that picks `pick`. */
function fitsWording(env: PhraseEnv, by: PlayerId, pick: CardPick, { form, from, to }: Wording): boolean {
  if (from !== null && moveZoneId(pick.from, env.seats, by) !== from) return false;
  if (form === 'to card') return pick.onto !== null && (to === null || ontoZoneOf(env, by, pick) === to);
  if (form === 'alone') return pick.onto === null;
  return pick.to !== null && moveZoneId(pick.to, env.seats, by) === to;
}

/**
 * The buttons with the press's base that `wording` fits, for one card or a set as the example names, and of those the ones that could
 * take the cards: the current phase's, whose zone holds each card named and, when the example names a card for them to go to, whose zone
 * for that card holds one like it. Two buttons that take the same cards to cards in two zones are then told apart by where the card is.
 */
function buttonsFor(env: PhraseEnv, { by, base, matches, target, inPlay }: Press, wording: Wording): { fits: Button[]; takers: Button[] } {
  const fits = buttonsWithBase(env, base)
    .filter(({ action }) => fitsWording(env, by, action.pick!, wording) && (matches.length === 1 || action.pick!.some));
  const holds = (zoneId: string | null, wanted: CardMatch[]) => holdsEach(inPlay.filter((card) => card.zoneId === zoneId), wanted);
  const takers = fits.filter(({ action, here }) => here && holds(moveZoneId(action.pick!.from, env.seats, by), matches)
    && (target === null || holds(ontoZoneOf(env, by, action.pick!), [target])));
  return { fits, takers };
}

/**
 * The wordings that could press `pick`'s button, fewest words first: where its cards come from, where they go, then both. For a button
 * that picks a card for them to go to, where they go is the zone of that card, as “… to the Vase in p0's shelf” says it.
 */
function wordingsOf(env: PhraseEnv, by: PlayerId, pick: CardPick): Wording[] {
  const from = moveZoneId(pick.from, env.seats, by);
  const form: Form = pick.onto !== null ? 'to card' : pick.to === null ? 'alone' : 'to zone';
  const to = pick.onto !== null ? ontoZoneOf(env, by, pick) : pick.to === null ? null : moveZoneId(pick.to, env.seats, by);
  const whence: Wording[] = from === null ? [] : [{ form: form === 'to zone' ? 'alone' : form, from, to: null }];
  if (to === null) return whence;
  return [...whence, { form, from: null, to }, ...(from === null ? [] : [{ form, from, to } satisfies Wording])];
}

/**
 * A wording as the words an example adds after its cards: “… from the stall to p0's stash”, or “… from the stall to the Ruby” with the
 * card `target` the example named for them to go to, and “… to the Ruby in p0's case” when the wording names the zone that card is in.
 */
function sayWording(env: PhraseEnv, { form, from, to }: Wording, target: CardMatch | null): string {
  const whence = from === null ? '' : ` from ${zoneNameOf(env.game, from)}`;
  // The card it goes to is one the example named on the table, so it is “the Ruby”, as the example would say it.
  const theCard = () => `${describeCard(target!).replace(/^an? /, 'the ')}${to === null ? '' : ` in ${zoneNameOf(env.game, to)}`}`;
  const where = form === 'to zone' ? ` to ${zoneNameOf(env.game, to!)}` : form === 'to card' ? ` to ${theCard()}` : '';
  return `“…${whence}${where}”`;
}

/**
 * What an example has to say to press one of several buttons that could take its cards: where they come from, when each takes them from
 * a zone of its own. Otherwise each button gets the fewest words that press it and no other: where its cards come from, where they go, or
 * both; when where each goes is enough, the example is told to say where it goes. A button no words can press alone needs other words.
 * The card the press names for its cards to go to, if it names one, stays in its wordings, since only “… to {card}” fits a button that
 * picks one, and so does `cardIn`, the zone the press names for that card, if it names one.
 */
function tellApart(env: PhraseEnv, press: Press, takers: DeclaredAction[], cardIn: string | null): string {
  const { by, target } = press;
  const takenFrom = takers.map((action) => moveZoneId(action.pick!.from, env.seats, by));
  if (allDifferent(takenFrom)) {
    const [form, to]: [Form, string | null] = target === null ? ['alone', null] : ['to card', cardIn];
    const named = takenFrom.flatMap((zoneId) => (zoneId === null ? [] : [sayWording(env, { form, from: zoneId, to }, target)]));
    return `Say where it comes from: ${joinOr(named)}.`;
  }
  const pressesAlone = (action: DeclaredAction) => (wording: Wording) => {
    const { takers: pressed } = buttonsFor(env, press, wording);
    return pressed.length === 1 && pressed[0].action === action;
  };
  const own = takers.map((action) => wordingsOf(env, by, action.pick!).find(pressesAlone(action)) ?? null);
  const said = own.flatMap((wording) => (wording === null ? [] : [sayWording(env, wording, target)]));
  if (said.length === 0) return 'Give the buttons different words.';
  const whereItGoes = own.every((wording) => wording !== null && wording.form === 'to zone' && wording.from === null);
  if (whereItGoes) return `Say where it goes: ${joinOr(said)}.`;
  const unsaid = takers.filter((_, i) => own[i] === null).map((action) => `“${action.words}”`);
  const needs = unsaid.length === 1 ? 'needs' : 'need';
  return `Say which: ${joinOr(said)}.${unsaid.length === 0 ? '' : ` ${joinAnd(unsaid)} ${needs} different words.`}`;
}

/**
 * A player presses a button that picks cards and names them: “p0 buys the Ruby”, or “p0 buys the Ruby to p0's case” where the zone
 * says which of the buttons with that base is meant, or “p0 shows the Opal to the Ruby” for a button that picks a card for them to go
 * to. With `saysFrom`, the zone after “from” says where the cards come from too: “p0 buys the Ruby from the stall”, “… from the stall to
 * p0's case”. Two or more cards press a button that picks a set; one card may press either kind. Of the buttons the words fit, the one
 * of this phase whose zone holds the cards is pressed; when several do, the example is told what would tell them apart. When none does,
 * the first that fits is pressed with the cards from wherever they are in play, so that the game refuses it in its own words. A card the
 * table does not have can't be pressed at all.
 *
 * A press that names the card they go to keeps only the buttons whose zone for that card holds one like it, so two buttons that take
 * the same cards to cards in two zones are told apart by where the Ruby is. When both zones hold a Ruby, “… to the Ruby in p0's case”
 * names the zone, and the card they go to is taken from it.
 */
const pressesCardButton = (form: Form, saysFrom = false): ActionFn => (env, args) => {
  const [seat, base, matches, ...rest] = args as [string, string, CardMatch[], ...(ZoneRef | CardMatch)[]];
  // After the cards: where they come from, if said; then the zone or the card they go to; then the zone of that card, if said.
  const [from, after, cardIn] = (saysFrom ? rest : [undefined, ...rest]) as [ZoneRef | undefined, ZoneRef | CardMatch, ZoneRef | undefined];
  const by = seatOf(env, seat);
  const where = form === 'to zone' ? after as ZoneRef : cardIn;
  const wording: Wording = {
    form, from: from === undefined ? null : soleZone(from, env, by), to: where === undefined ? null : soleZone(where, env, by),
  };
  const target = form === 'to card' ? after as CardMatch : null;
  const press: Press = { by, base, matches, target, inPlay: env.state.cards.filter((card) => card.zoneId !== BOX_ZONE).sort(byCardId) };
  const { fits, takers } = buttonsFor(env, press, wording);
  if (fits.length === 0) {
    const whence = from === undefined ? '' : ` from ${describeZone(from)}`;
    const whither = form === 'to zone' ? ` to ${describeZone(where!)}`
      : form === 'to card' ? ` to another card${where === undefined ? '' : ` in ${describeZone(where)}`}` : '';
    throw new RuleError(`No button lets ${by} ${base} ${matches.length === 1 ? 'a card' : 'more than one card'}${whence}${whither}.`);
  }
  if (takers.length > 1) {
    const actions = takers.map(({ action }) => action);
    const wordings = joinOr(actions.map((action) => `“${action.words}”`));
    const advice = tellApart(env, press, actions, target === null ? null : wording.to);
    throw new RuleError(`${by} could ${base} ${describeCard(matches[0])} with more than one button: ${wordings}. ${advice}`);
  }
  const button = (takers[0] ?? fits[0]).action;
  const pick = button.pick!;
  const fromZone = moveZoneId(pick.from, env.seats, by);
  const taken = new Set<string>();
  const ids = matches.map((match) => {
    const id = cardFor(press.inPlay, match, fromZone, taken, by, base);
    taken.add(id);
    return id;
  });
  const move: Move = pick.some ? { type: button.words, cardIds: ids } : { type: button.words, cardId: ids[0] };
  // The card they go to is taken from the zone the example names for it, else from the button's.
  if (target !== null) move.onto = cardFor(press.inPlay, target, wording.to ?? ontoZoneOf(env, by, pick), taken, by, base);
  return { by, move };
};

/**
 * What the lines of a button that picks cards may say about them: “the target card” for the card a press picked for its cards to go
 * to, and “the picked cards” for a set. And the lines of an example that press such a button (“A player may buy a card from the shop to
 * their stash.”), naming the cards after the button's base, and where they come from, where they go or both when several buttons could take them,
 * with the zone of the card they go to when cards in two zones have its name.
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
    .action('{player} {cardaction} {cardlist} from {zone} to {card}', pressesCardButton('to card', true))
    .action('{player} {cardaction} {cardlist} to {card} in {zone}', pressesCardButton('to card'))
    .action('{player} {cardaction} {cardlist} from {zone} to {card} in {zone}', pressesCardButton('to card', true));
}
