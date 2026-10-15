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

/** The sentences that set a game's table: which cards it has and which zones they sit in. */
export function registerSetupPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .cards('a standard 52-card deck, starting in {zone}', standardDeck(false))
    .cards('a standard 52-card deck, aces high, starting in {zone}', standardDeck(true))
    .cards('a deck called {name}, starting in {zone}', tableDeck)
    .zone('the {name} is a {layout} in the center that {visibility}', sharedZone)
    .zone('each player has a {name} that {visibility}', playerZone);
}
