import type { PhraseLibrary } from '../phrases';
import type { DeclareFn, FactItem, FactSpec } from '../types';

/** Every fact in the list, told what it is on. */
const declares = (on: FactSpec['on']): DeclareFn => ([facts]) => (facts as FactItem[]).map((fact) => ({ ...fact, on }));

/** A card that "can be poisoned" has something it is or is not, with no count. */
const cardIs: DeclareFn = ([name]) => [{ name: name as string, on: 'card', kind: 'flag' }];

/**
 * The sentences that say what a game keeps facts about: what a space or a card can have, or be, while the game is played.
 * A plural noun is a count (starting at 0) and “a” or “an” and a noun, or an adjective, is a yes/no (starting at no).
 */
export function registerFactPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .declare('spaces can have {factlist}', declares('space'))
    .declare('cards can have {factlist}', declares('card'))
    .declare('cards can be {name}', cardIs);
}
