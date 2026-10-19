// Which of the values a game works out for cards (R4) the page may show beside a card on a Board, read from the compiled game alone:
// a number that stands in for a column of a card table, and a flag that changes a value. A value is shown only when its lines, and the
// lines of every value they read, all the way down, read nothing but the card and the cards on it; and a line that reads the cards on a
// card counts only in a game where everyone sees every card that sits on a card. So a seat that sees a card sees all that its shown
// values read, however deep the cards on cards go, and whether a value is shown hangs on the rules alone, never on where cards are.
// So does which values about a player the page may show: a total of cards everyone sees, each read through what reads that card alone,
// so every seat may know it for every player; with the pairs of them a button waits on, and the flags that leave a card out of one.
import { CARDS_ON_IT, FROM_COLUMN, registerCardSubjectPhrases } from './library/card-subject-phrases';
import { FLAGGED_VALUES, registerCardValuePhrases } from './library/card-value-phrases';
import { AT_LEAST_THEIRS, PLAYER_TOTAL } from './library/player-value-phrases';
import { FROM_CARDS_TOTAL, GOES_UP_BY_TOTAL } from './library/total-phrases';
import { FROM_CARDS_COUNT } from './library/total-phrases';
import { PhraseLibrary, STATIC_TYPES } from './phrases';
import { VOCAB_TYPES } from './refs';
import type { CardFilter, CardGroup, CompiledGame, PhraseRef, ZoneRef } from './types';

/**
 * The phrases about the card a value is worked out for and the cards on it: what kind of card it is, its own numbers and flags, its zone
 * and the flags of the cards on it. Asked by kind and pattern, as a line's ref names its phrase.
 */
const CARD_ONLY = registerCardValuePhrases(registerCardSubjectPhrases(new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])));
const PARAM = /\{([^{}]+)\}/g;

const isWorked = (game: CompiledGame, name: string): boolean => game.worked !== undefined && Object.hasOwn(game.worked, name);
/**
 * Whether everyone sees every card that sits on a card: only a zone marked for cards on cards may hold one, whether every card in it sits
 * on a card or only some do, so it is so when each such zone is public. Then the cards on a card are seen wherever the card is, and the
 * cards on those too.
 */
const cardsOnCardsArePublic = (game: CompiledGame): boolean => game.zones.every((zone) => zone.onCards === undefined || zone.visibility === 'public');
const cardsOnIt: readonly string[] = CARDS_ON_IT;

/** The names a test reads a card by: the flag of a flag test, else the number or value it tests and the one it compares that with. */
const testNames = (filter: CardFilter): string[] =>
  ('flag' in filter ? [filter.flag] : [filter.attribute, ...('sameAs' in filter ? [filter.sameAs.attribute] : [])]);

/**
 * The names a line reads a card's numbers and flags by, each of which may be a value worked out in turn, when the line reads only the card
 * and the cards on it; null for any other line, and for a line that reads the cards on it in a game that hides some card on a card. A
 * phrase's args follow its parameters in order. The tests of a group of the cards on it, of a clause and of a test alone are read too: a
 * flag a group is tested by (“the cards on it that are hoarded”), or a value a card is tested by (“it is a card whose hall red is more
 * than 1”), may read beyond the card as surely as a line of the value does.
 */
function cardOnlyNames(game: CompiledGame, ref: PhraseRef): string[] | null {
  // A value that is a total, goes up by one or is a count reads only the card when its group is the cards on it.
  const total = ref.kind === 'value' && (ref.phrase === FROM_CARDS_TOTAL || ref.phrase === GOES_UP_BY_TOTAL || ref.phrase === FROM_CARDS_COUNT);
  if (!total && (ref.kind === 'lang' || CARD_ONLY.get(ref.kind, ref.phrase) === undefined)) return null;
  if ((total || cardsOnIt.includes(ref.phrase)) && !cardsOnCardsArePublic(game)) return null;
  const names: string[] = [];
  for (const [i, [, type]] of [...ref.phrase.matchAll(PARAM)].entries()) {
    if (type === 'attribute' || type === 'cardflag') names.push(ref.args[i] as string);
    // No card-only phrase takes a clause yet; one that does has its tests traced like a group's.
    if (type === 'cardclause') names.push(...(ref.args[i] as CardFilter[]).flatMap(testNames));
    if (type === 'cardfilter') names.push(...testNames(ref.args[i] as CardFilter));
    if (type !== 'cardgroup') continue;
    const group = ref.args[i] as CardGroup;
    if (group.kind !== 'on it') return null;
    names.push(...(group.whose ?? []).flatMap(testNames));
  }
  return names;
}

/**
 * Whether every line of the value `name` reads only the card and the cards on it, and so does every line of each value they read, all the
 * way down. `seen` holds the values looked at already: one met again is being looked at, and adds no line of its own.
 */
function readsOnlyCards(game: CompiledGame, name: string, seen = new Set<string>()): boolean {
  if (seen.has(name)) return true;
  seen.add(name);
  const value = game.worked![name];
  const refs = value.kind === 'number' ? value.refs : value.conditions.flatMap((group) => group.refs);
  return refs.every((ref) => {
    const names = cardOnlyNames(game, ref);
    return names !== null && names.filter((read) => isWorked(game, read)).every((read) => readsOnlyCards(game, read, seen));
  });
}

/**
 * Each column that a worked number's section starts from (its first line is `A card's red left is its red need.`), mapped to that number's
 * name: the page reads a count against it in place of the column. Of several such numbers for one column, the first in section order wins.
 * A number whose lines read anything but the card and the cards on it stands in for nothing.
 */
export function standIns(game: CompiledGame): { [column: string]: string } {
  const found: { [column: string]: string } = {};
  for (const [name, value] of Object.entries(game.worked ?? {})) {
    const first = value.kind === 'number' ? value.refs[0] : undefined;
    if (first?.phrase !== FROM_COLUMN) continue;
    const column = first.args[1] as string;
    if (!Object.hasOwn(found, column) && readsOnlyCards(game, name)) found[column] = name;
  }
  return found;
}

/**
 * The worked flags a line of some worked number turns a value on by (`A busy card's red pay is 1.`), in the order the game works them
 * out, each once: they change what a card makes or costs. A flag cards keep is never one, since the page shows those already, and nor is
 * one whose lines read anything but the card and the cards on it.
 */
export function shownFlags(game: CompiledGame): string[] {
  const worked = game.worked ?? {};
  const flagged: readonly string[] = FLAGGED_VALUES;
  const turnedOn = new Set(
    Object.values(worked).flatMap((value) => (value.kind === 'number' ? value.refs : []))
      .filter((ref) => flagged.includes(ref.phrase)).map((ref) => ref.args[0] as string),
  );
  return Object.entries(worked).filter(([name, value]) => value.kind === 'flag' && turnedOn.has(name) && readsOnlyCards(game, name))
    .map(([name]) => name);
}

/**
 * Whether everyone sees the cards of a zone a group names: a zone in the center for `{ shared }`, and a zone each player has for `{ each }`
 * and `{ of }`, that everyone can see. Each seat then sees every card the total may add up, whoever's zone it is.
 */
function everyoneSees(game: CompiledGame, zone: ZoneRef): boolean {
  const [name, perPlayer] = 'shared' in zone ? [zone.shared, false] : ['each' in zone ? zone.each : zone.zone, true];
  return game.zones.some((spec) => spec.name === name && spec.perPlayer === perPlayer && spec.visibility === 'public');
}

/** Whether a card's number or flag reads only the card: one a table prints or cards keep, or a value worked out from the card alone. */
const readsTheCardAlone = (game: CompiledGame, name: string): boolean => !isWorked(game, name) || readsOnlyCards(game, name);

/**
 * Whether a line of a value about a player adds up, over zones everyone sees, a number read from each card alone, of the cards that pass
 * tests read from each card alone (`… that are not resting`). A test against the card a rule is about reads a card no such value has.
 */
function totalSeenByAll(game: CompiledGame, ref: PhraseRef): boolean {
  if (ref.phrase !== PLAYER_TOTAL) return false;
  const group = ref.args[2] as CardGroup;
  if (group.kind !== 'in' || !group.zones.every((zone) => everyoneSees(game, zone))) return false;
  return readsTheCardAlone(game, ref.args[1] as string) && (group.whose ?? []).every((filter) =>
    !('sameAs' in filter) && readsTheCardAlone(game, 'flag' in filter ? filter.flag : filter.attribute));
}

/**
 * The values worked out for players the page may show, in section order: those whose every line adds up cards everyone sees, read
 * through what reads the card alone (`totalSeenByAll`). So each seat may know each of them for every player, and whether one is shown
 * hangs on the rules alone, never on where cards are. A value with any other line is not shown until the view is taught what it reads.
 */
export function shownPlayerValues(game: CompiledGame): string[] {
  return Object.entries(game.playerValues ?? {}).filter(([, value]) => value.refs.every((ref) => totalSeenByAll(game, ref)))
    .map(([name]) => name);
}

/**
 * Each pair of shown values a button waits on, `Only if their X is at least their Y.`, as [X, Y], in phase, button and line order, once:
 * the page shows the two side by side (`Red force 1 / load 2`), so a seat sees how far it is from pressing it. `is more than` makes no
 * pair, and nor does a `When …` line, which presses no button.
 */
export function gaugePairs(game: CompiledGame): [string, string][] {
  const shown = new Set(shownPlayerValues(game));
  const pairs: [string, string][] = [];
  for (const phase of game.phases) {
    for (const action of phase.actions) {
      for (const ref of action.conditions.flatMap((group) => group.refs)) {
        if (ref.phrase !== AT_LEAST_THEIRS) continue;
        const [x, y] = [ref.args[0] as string, ref.args[1] as string];
        if (shown.has(x) && shown.has(y) && !pairs.some(([a, b]) => a === x && b === y)) pairs.push([x, y]);
      }
    }
  }
  return pairs;
}

/**
 * The flags cards keep (`Cards can be …`) that a shown value's group leaves out (`… that are not resting`), in the order declared: a card
 * that is so counts for nothing in that total, and the page fades it. A flag worked out is never one, as the page fades a card by the
 * flags it keeps.
 */
export function dimFlags(game: CompiledGame): string[] {
  const leftOut = new Set(shownPlayerValues(game).flatMap((name) => game.playerValues![name].refs)
    .flatMap((ref) => (ref.args[2] as CardGroup).whose ?? [])
    .flatMap((filter) => ('flag' in filter && !filter.wanted ? [filter.flag] : [])));
  return game.facts.filter((fact) => fact.on === 'card' && fact.kind === 'flag' && leftOut.has(fact.name)).map((fact) => fact.name);
}
