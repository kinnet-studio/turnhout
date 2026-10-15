import { cardById } from '../../game-state';
import type { CardState } from '../../scene';
import { RuleError } from '../diagnostics';
import type { MoveInfo, PhraseEnv, ZoneRef } from '../types';
import { resolveZoneIds } from '../zones';

/** How a designer would say the zone: “the trick”, “each hand”, “their hand”. */
export function describeZone(ref: ZoneRef): string {
  if ('shared' in ref) return `the ${ref.shared}`;
  if ('each' in ref) return `each ${ref.each}`;
  if ('seat' in ref.of) return `${ref.of.seat}'s ${ref.zone}`;
  return ref.of.who === 'actor' ? `their ${ref.zone}` : `the winner's ${ref.zone}`;
}

/** The one zone a rule is about; “each hand” names several, which this rule cannot use. */
export function soleZone(ref: ZoneRef, env: PhraseEnv): string {
  const ids = resolveZoneIds(ref, env);
  if (ids.length !== 1) throw new RuleError(`${describeZone(ref)} is more than one zone, but this rule needs just one.`);
  return ids[0];
}

/** The move a `needsMove` phrase is judging. The compiler only lets such phrases into moves, so a missing one is a bug. */
export function currentMove(env: PhraseEnv): MoveInfo {
  if (!env.move) throw new Error('This phrase needs a move, but none is being judged.');
  return env.move;
}

/** The card being moved. */
export function movedCard(env: PhraseEnv): CardState {
  const { cardId } = currentMove(env);
  const card = cardById(env.state, cardId);
  if (!card) throw new Error(`No card ${cardId} to judge.`);
  return card;
}
