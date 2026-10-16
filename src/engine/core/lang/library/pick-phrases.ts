import { setPlayerFact } from '../board-state';
import type { PhraseLibrary } from '../phrases';
import type { ActionFn, EffectFn } from '../types';
import { seatOf, thePick } from './support';

// ---- effects: the player a button's press picked -------------------------------------------------

const thatPlayerBecomes: EffectFn = (env, [fact]) => setPlayerFact(env.state, thePick(env), fact as string, true);

// ---- examples: action --------------------------------------------------------------------------

/**
 * A player presses a button that picks another player and names one: the move type is the button's whole wording. The seat goes
 * on the move as written, even when it is the player's own or one that is out: the button, not the example, refuses a seat that
 * is no one to pick.
 */
const pressesButtonPicking: ActionFn = (env, [seat, move, picked]) => ({ by: seatOf(env, seat), move: { type: move as string, player: picked as string } });

/**
 * The sentences that read the player a button picks, “A player may challenge another player.”: the effect that does something to
 * that player, and the line of an example that presses the button with a player named.
 */
export function registerPickPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .effect('that player is {playerflag}', thatPlayerBecomes, { needsPick: true })
    .action('{player} {pickaction} {player}', pressesButtonPicking);
}
