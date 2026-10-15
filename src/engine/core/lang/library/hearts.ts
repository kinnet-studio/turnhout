import type { PhraseLibrary } from '../phrases';

const BROKEN = 'hearts:broken';

/** Phrases only Hearts needs: whether a heart has been played yet. */
export function registerHeartsPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('hearts are broken', (env) => env.state.data[BROKEN] === true)
    .effect('hearts are broken', (env) => ({ ...env.state, data: { ...env.state.data, [BROKEN]: true } }));
}
