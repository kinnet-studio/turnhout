import type { Json } from '../../table-def';
import { expandCardTable, standardDeckIdentities } from '../cards';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import type { CardSetSpec, CardsFn, ZoneFn, ZoneRef, ZoneSpec } from '../types';

/** The name of the shared zone the cards start in. */
function startZone(arg: Json): string {
  const ref = arg as ZoneRef | null;
  if (ref && 'shared' in ref) return ref.shared;
  throw new RuleError('Cards must start in a shared zone, like “the deck”.');
}

const standardDeck = (acesHigh: boolean): CardsFn => (args) => ({
  kind: 'standard',
  identities: standardDeckIdentities(),
  start: startZone(args[0]),
  acesHigh,
});

const tableDeck: CardsFn = (args, table): CardSetSpec => {
  const start = startZone(args[1]);
  if (!table) throw new RuleError('Add a table of cards under this line.');
  return { kind: 'table', identities: expandCardTable(table), start, acesHigh: false };
};

const sharedZone: ZoneFn = ([name, layout, visibility]) => {
  if (visibility === 'owner') throw new RuleError('Only a player\'s own zone can be “only they can see”.');
  return { name, perPlayer: false, layout, visibility } as ZoneSpec;
};

const playerZone: ZoneFn = ([name, visibility]) => ({
  name,
  perPlayer: true,
  layout: name === 'hand' || (name as string).endsWith(' hand') ? 'hand' : 'pile',
  visibility,
} as ZoneSpec);

/** A row shows every card it holds side by side, where a pile shows only its top card: the zone for cards a player must see all of. */
const playerRow: ZoneFn = ([name, visibility]) => ({ name, perPlayer: true, layout: 'row', visibility } as ZoneSpec);

/** A row each player has whose every card sits on a card, such as a crew whose every worker is on a job (R3). */
const playerRowOnCards: ZoneFn = (args) => ({ ...playerRow(args), onCards: 'every' });

/** What a zone line that not everyone can see is told when it ends with a mark only a zone everyone can see may have. */
const MARK_NEEDS_EVERYONE = 'Only a zone everyone can see can hold some cards on cards, or name the zone of the cards they sit on.';

/**
 * A row each player has where some cards sit on cards and the rest on none, or one that names the zone of the cards its cards sit on
 * (`holders`, “… in their shelf”), which the compiler checks once every zone is read. Only a row everyone can see may say either, so that
 * no seat is kept from knowing whether a card there sits on a card, or on which.
 */
const playerRowMarked = (onCards: 'every' | 'some'): ZoneFn => ([name, visibility, holders]) => {
  if (visibility !== 'public') throw new RuleError(MARK_NEEDS_EVERYONE);
  const zone: ZoneSpec = { ...playerRow([name, visibility]), onCards };
  return holders === undefined ? zone : { ...zone, holders: holders as string };
};

/**
 * Cards on cards are a player's: a card goes along with the card it sits on, so both stay on one player's table, and a zone in the
 * center can't hold them.
 */
const sharedZoneOnCards: ZoneFn = () => {
  throw new RuleError('Only a zone each player has can hold cards on cards.');
};

/**
 * The sentences that set a game's table: which cards it has and which zones they sit in, with “an” before a name that reads so, and the
 * marks of a row each player has whose cards sit on cards: every card, or some, maybe naming the zone of the cards they sit on.
 */
export function registerSetupPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .cards('a standard 52-card deck, starting in {zone}', standardDeck(false))
    .cards('a standard 52-card deck, aces high, starting in {zone}', standardDeck(true))
    .cards('a deck called {name}, starting in {zone}', tableDeck)
    .zone('the {name} is a {layout} in the center that {visibility}', sharedZone)
    .zone('the {name} is a {layout} in the center that {visibility}, where every card is on a card', sharedZoneOnCards)
    .zone('the {name} is a {layout} in the center that {visibility}, where some cards are on cards', sharedZoneOnCards)
    .zone('the {name} is a {layout} in the center that {visibility}, where every card is on a card in their {name}', sharedZoneOnCards)
    .zone('the {name} is a {layout} in the center that {visibility}, where some cards are on cards in their {name}', sharedZoneOnCards)
    .zone('each player has a {unrowedname} that {visibility}', playerZone)
    .zone('each player has an {unrowedname} that {visibility}', playerZone)
    .zone('each player has a {name} row that {visibility}', playerRow)
    .zone('each player has an {name} row that {visibility}', playerRow)
    .zone('each player has a {name} row that {visibility}, where every card is on a card', playerRowOnCards)
    .zone('each player has an {name} row that {visibility}, where every card is on a card', playerRowOnCards)
    .zone('each player has a {name} row that {visibility}, where some cards are on cards', playerRowMarked('some'))
    .zone('each player has an {name} row that {visibility}, where some cards are on cards', playerRowMarked('some'))
    .zone('each player has a {name} row that {visibility}, where every card is on a card in their {name}', playerRowMarked('every'))
    .zone('each player has an {name} row that {visibility}, where every card is on a card in their {name}', playerRowMarked('every'))
    .zone('each player has a {name} row that {visibility}, where some cards are on cards in their {name}', playerRowMarked('some'))
    .zone('each player has an {name} row that {visibility}, where some cards are on cards in their {name}', playerRowMarked('some'));
}
