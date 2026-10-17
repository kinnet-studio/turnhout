import { nextInt } from '../../rng';
import { nextIn } from '../board-state';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { START_PLAYER_KEY, START_PLAYER_PHRASE, clearTurnOf } from '../turns';
import type { EffectFn } from '../types';
import { chooseNext } from '../zones';
import { seatOf } from './support';
import type { GameState } from '../../game-state';
import type { PlayerId } from '../../scene';
import { playersIn } from '../board-state';
import { END_STEPS_KEY } from '../turns';
import type { Subject } from '../types';

const TURN_IN_THE_STEPS = (phase: string) =>
  `The turn does not pass while the players take the ${phase} before the score: write “The ${phase} passes to the left.” instead.`;
const STEP_OUTSIDE_THE_STEPS = (phase: string) => `The ${phase} passes to the left only while the players take it before the score.`;

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
  // The game is decided once the steps before the score run, and a turn passed then would start no turn or step: they are passed on.
  const steps = env.game.end?.steps;
  if (steps && typeof env.state.data[END_STEPS_KEY] === 'string') throw new RuleError(TURN_IN_THE_STEPS(steps.phase));
  const next = env.seats.length === 1 ? turn.current : nextIn(env.state, turn.current, env.seats);
  const passed = clearTurnOf(chooseNext(env.state, next));
  return { ...passed, turn: { ...passed.turn, current: next, phase: env.game.phases[0].id } };
};

/**
 * The seat whose step comes after `current`'s, or null when every seat still in has had one. The steps go left from `first`, so a
 * seat has had its step when it lies from `first` to `current`, walking left: the next seat still in is one of those once the walk
 * has come round to `first`, or past it when `first` has gone out since its step. With no other seat in, the steps are done too.
 */
function nextStep(state: GameState, seats: PlayerId[], first: PlayerId, current: PlayerId): PlayerId | null {
  if (!playersIn(state, seats).some((seat) => seat !== current)) return null;
  const next = nextIn(state, current, seats);
  const fromFirst = (seat: PlayerId) => (seats.indexOf(seat) - seats.indexOf(first) + seats.length) % seats.length;
  return fromFirst(next) <= fromFirst(current) ? null : next;
}

/**
 * A step before the score ends: the next seat still in takes its step, and the phase's start lines run about them, each seeing what
 * the one before did. After the last seat the steps are done, and the turn goes back to the seat that took the first step. Refused
 * anywhere but in the steps, in the phase the End names for them.
 */
const stepPassesLeft: EffectFn = (env, [phase]) => {
  const name = phase as string;
  const first = env.state.data[END_STEPS_KEY];
  const { turn } = env.state;
  if (typeof first !== 'string' || !turn || turn.phase !== name || env.game.end?.steps?.phase !== name) {
    throw new RuleError(STEP_OUTSIDE_THE_STEPS(name));
  }
  const next = nextStep(env.state, env.seats, first, turn.current);
  if (next === null) {
    const back = chooseNext(env.state, first);
    return { ...back, data: { ...back.data, [END_STEPS_KEY]: true } };
  }
  const passed = chooseNext(env.state, next);
  const startLines = env.game.phases.find((p) => p.id === name)?.onEnter ?? [];
  if (startLines.length === 0) return passed;
  const { runLine } = env;
  if (!runLine) throw new Error('This phrase needs to run the start lines of a phase, but nothing is listening.');
  const about: Subject = { player: next, space: null, card: null };
  return startLines.reduce((state, ref) => runLine(state, ref, about), passed);
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

/**
 * A turn made of steps rather than presses: passing it as an effect, and the player who takes the first turn. A step before the score
 * is passed on the same way.
 */
export function registerTurnPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .effect('the turn passes to the left', turnPassesLeft)
    .effect('the {phase} passes to the left', stepPassesLeft)
    .effect(START_PLAYER_PHRASE, startPlayerChosen)
    .given('{player} is the start player', isStartPlayer);
}
