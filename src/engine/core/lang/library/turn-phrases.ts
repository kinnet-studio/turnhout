import { nextInt } from '../../rng';
import { nextIn } from '../board-state';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { START_PLAYER_KEY, START_PLAYER_PHRASE, clearTurnOf } from '../turns';
import type { EffectFn } from '../types';
import { chooseNext } from '../zones';
import { seatOf } from './support';

// ---- effects ---------------------------------------------------------------------------------

/**
 * The turn's last step: the next player still in takes the turn, back at the game's first phase. A lone player keeps it, as with
 * an After line's “the turn passes to the left”. No phase's start lines run here: the pass happens inside a rule, before the flow
 * checks whether the game is over, so they would run for a turn that may never be played. The turn that had started is forgotten,
 * so that the next one starts once the flow has checked the game is not over, even for a lone player who keeps the turn.
 */
const turnPassesLeft: EffectFn = (env) => {
  const { turn } = env.state;
  if (!turn) throw new RuleError('There is no turn to pass.');
  const next = env.seats.length === 1 ? turn.current : nextIn(env.state, turn.current, env.seats);
  const passed = clearTurnOf(chooseNext(env.state, next));
  return { ...passed, turn: { ...passed.turn, current: next, phase: env.game.phases[0].id } };
};

/** Picks the start player with the game's own rng, keeps them, and gives them the first turn. */
const startPlayerChosen: EffectFn = (env) => {
  const { value, rng } = nextInt(env.state.rng, env.seats.length);
  const seat = env.seats[value];
  return chooseNext({ ...env.state, rng, data: { ...env.state.data, [START_PLAYER_KEY]: seat } }, seat);
};

// ---- examples: given -------------------------------------------------------------------------

/** Says who started, without handing them the turn: an example sets whose turn it is with a line of its own. */
const isStartPlayer: EffectFn = (env, [seat]) => ({ ...env.state, data: { ...env.state.data, [START_PLAYER_KEY]: seatOf(env, seat) } });

/** A turn made of steps rather than presses: passing it as an effect, and the player who takes the first turn. */
export function registerTurnPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .effect('the turn passes to the left', turnPassesLeft)
    .effect(START_PLAYER_PHRASE, startPlayerChosen)
    .given('{player} is the start player', isStartPlayer);
}
