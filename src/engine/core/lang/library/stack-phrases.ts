import { expandCardTable, makeCard } from '../cards';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import type { CardMatch, CardsFn, EffectFn, ZoneRef } from '../types';
import { resolveZoneIds } from '../zones';
import { describeCard } from './example-phrases';

/** The cards of the table, kept off the table: one is made each time a rule asks for a new one (see `makeCard`). */
const endlessStack: CardsFn = (_args, table) => {
  if (!table) throw new RuleError('Add a table of cards under this line.');
  return { kind: 'endless', identities: expandCardTable(table), start: '', acesHigh: false };
};

/** One new card in each zone named, in the order the zones are named, so that each takes the next id. */
const newCardGoes: EffectFn = (env, args) => {
  const [match, ref] = args as [CardMatch, ZoneRef];
  return resolveZoneIds(ref, env).reduce((state, zoneId) => {
    const made = makeCard(state, env.game, match, zoneId);
    if (!made) throw new RuleError(`No stack that never runs out has ${describeCard(match)}.`);
    return made.state;
  }, env.state);
};

/** Stacks that never run out, and the new cards made from them. */
export function registerStackPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .cards('a stack called {name} that never runs out', endlessStack)
    .effect('a new {cardclass} goes to {zone}', newCardGoes);
}
