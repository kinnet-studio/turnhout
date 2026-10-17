import type { CompiledGame } from '@/engine/core/lang/types';
import { gaugePairs } from '@/engine/core/lang/worked-view';

/** A pair of a player's values that a button waits on, as the page words it, and whether the first is still under the second. */
export type Gauge = { text: string; short: boolean };

/**
 * The second name less the words it starts with that the first name starts with too, so `red load` beside `red force` reads `load` and
 * the pair reads as one thing on both sides of the slash. It is given whole when every word of it is shared, as nothing would be left.
 */
function secondName(first: string, second: string): string {
  const firsts = first.split(' ');
  const words = second.split(' ');
  let shared = 0;
  while (shared < words.length && words[shared] === firsts[shared]) shared++;
  return shared === words.length ? second : words.slice(shared).join(' ');
}

/**
 * Each of `gaugePairs(game)` whose two values `values` has, as the Page copy says (`Red force 1 / load 2 (short)`); none for undefined.
 * A value the view left out of a seat's entry (the rules could not work it out for them) leaves out the gauges that read it.
 */
export function gaugesOf(game: CompiledGame, values: { [name: string]: number } | undefined): Gauge[] {
  if (values === undefined) return [];
  return gaugePairs(game).flatMap(([first, second]) => {
    if (!Object.hasOwn(values, first) || !Object.hasOwn(values, second)) return [];
    const [a, b] = [values[first], values[second]];
    const short = a < b;
    const text = `${first.charAt(0).toUpperCase()}${first.slice(1)} ${a} / ${secondName(first, second)} ${b}${short ? ' (short)' : ''}`;
    return [{ text, short }];
  });
}
