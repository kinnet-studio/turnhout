import type { GameState } from '../../game-state';
import type { Json } from '../../table-def';
import { setPhase } from '../../game-state';
import { nextInt } from '../../rng';
import type { PlayerId } from '../../scene';
import { nextIn, playersIn } from '../board-state';
import { isOut } from '../board-state';
import { RuleError } from '../diagnostics';
import { NO_ACTION_WAITING, WINDOW_KEY, waitingOf } from '../action-window';
import type { PhraseLibrary } from '../phrases';
import { END_STEPS_KEY, START_PLAYER_KEY, START_PLAYER_PHRASE, STEP_PASSES_PHRASE, clearTurnOf } from '../turns';
import { ROUND_STEPS_KEY, ROUND_STEPS_PHRASE, roundStepsOf, startPlayerOf, type RoundSteps } from '../turns';
import type { EffectFn } from '../types';
import type { PhraseEnv } from '../types';
import { chooseNext } from '../zones';
import { seatOf } from './support';
import { runStartLines } from './flow-phrases';

const TURN_IN_THE_STEPS = (phase: string) =>
  `The turn does not pass while the players take the ${phase} before the score: write “The ${phase} passes to the left.” instead.`;
const STEP_OUTSIDE_THE_STEPS = (phase: string) => `The ${phase} passes to the left only while the players take it before the score.`;
const ROUND_STEP_OUTSIDE = (phase: string) => `The ${phase} passes to the left only while the players take it in turn at the start of a round.`;
const TURN_IN_THE_ROUND_STEPS = (phase: string) =>
  `The turn does not pass while the players take the ${phase} at the start of a round: write “The ${phase} passes to the left.” instead.`;

// ---- effects ---------------------------------------------------------------------------------

export const STOP_PHRASE = 'the action does not go ahead';

/** The waiting action is stopped: once the window closes it does not go ahead. RuleError NO_ACTION_WAITING when none waits. */
const actionStopped: EffectFn = (env) => {
  const waiting = waitingOf(env.state);
  if (waiting === null) throw new RuleError(NO_ACTION_WAITING);
  // `Waiting.info` is a MoveInfo, an interface, which TypeScript does not take as Json though it is one.
  return { ...env.state, data: { ...env.state.data, [WINDOW_KEY]: { ...waiting, verdict: 'stopped' } as unknown as Json } };
};

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
  // A round's steps come before the start player's turn, which starts once they are passed on: passing the turn would skip it.
  const roundSteps = roundStepsOf(env.state);
  if (roundSteps !== null && roundSteps !== true) throw new RuleError(TURN_IN_THE_ROUND_STEPS(roundSteps.phase));
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
 * `seat` takes its step in the phase `name`: it is handed the turn on `state`, and the phase's start lines run about it, each seeing
 * what the one before did. A start line may pass the step on, and so start the next seat's inside it.
 */
const takeStep = (env: PhraseEnv, name: string, state: GameState, seat: PlayerId): GameState =>
  runStartLines(env, chooseNext(state, seat), name, seat);

/**
 * `state` once the step its turn takes in the phase `name`, before the score or as a round starts, is passed on: the next seat still in
 * takes its step, and the phase's start lines run about them. After the last seat the steps are done. Those before the score go back to
 * the seat that took the first step; a round's go back to it, or to the next seat still in once it is out, in the phase the turn was in,
 * and that turn starts once the flow sees them done (see `LangRuntime.startTurn`). Null when no step is being taken in that phase.
 *
 * “The … passes to the left.” passes a step on this way, and so does the player taking it going out.
 */
export function passStep(env: PhraseEnv, state: GameState, name: string): GameState | null {
  const { turn } = state;
  if (!turn || turn.phase !== name) return null;
  const roundSteps = roundStepsOf(state);
  if (roundSteps !== null && roundSteps !== true && roundSteps.phase === name) {
    const after = nextStep(state, env.seats, roundSteps.first, turn.current);
    if (after !== null) return takeStep(env, name, state, after);
    // The turn that waits is the one the steps came before, unless its seat went out in them: then it is the next seat's still in, as
    // a turn passed on from it would be. With no seat still in, it stays with the seat that took the first step.
    const { first } = roundSteps;
    const to = isOut(state, first) && playersIn(state, env.seats).length > 0 ? nextIn(state, first, env.seats) : first;
    const back = chooseNext(setPhase(state, roundSteps.back), to);
    return { ...back, data: { ...back.data, [ROUND_STEPS_KEY]: true } };
  }
  const first = state.data[END_STEPS_KEY];
  if (typeof first !== 'string' || env.game.end?.steps?.phase !== name) return null;
  const next = nextStep(state, env.seats, first, turn.current);
  if (next === null) {
    const back = chooseNext(state, first);
    return { ...back, data: { ...back.data, [END_STEPS_KEY]: true } };
  }
  return takeStep(env, name, state, next);
}

/** A step ends and is passed on (`passStep`). Refused anywhere but in the steps, in the phase the End or the round's start names for them. */
const stepPassesLeft: EffectFn = (env, [phase]) => {
  const name = phase as string;
  const passed = passStep(env, env.state, name);
  if (passed !== null) return passed;
  throw new RuleError(env.game.everyPhase.roundSteps?.phase === name ? ROUND_STEP_OUTSIDE(name) : STEP_OUTSIDE_THE_STEPS(name));
};

/**
 * A round's steps begin, as the last line that starts the round: the start player, or the next seat still in when they are out, takes
 * the first in the phase named, and its start lines run about them. The phase the turn is in is kept, for the start player's turn waits
 * until every seat still in has had a step, and then starts there (see `LangRuntime.startTurn`). With no seat still in, the steps are
 * done at once.
 */
const roundStepsBegin: EffectFn = (env, [phase]) => {
  const { state } = env;
  // The compiler takes one such line, the last that starts a round, so a round's steps never begin inside another's.
  if (state.data[ROUND_STEPS_KEY] !== undefined) throw new Error('A round\'s steps began again before the last were over.');
  const back = state.turn?.phase;
  if (back === undefined) throw new Error('A round\'s steps began with no turn to come back to.');
  if (playersIn(state, env.seats).length === 0) return { ...state, data: { ...state.data, [ROUND_STEPS_KEY]: true } };
  const name = phase as string;
  const start = startPlayerOf(state, env.seats);
  const first = isOut(state, start) ? nextIn(state, start, env.seats) : start;
  const steps: RoundSteps = { phase: name, first, back };
  const begun = setPhase(state, name);
  return takeStep(env, name, { ...begun, data: { ...begun.data, [ROUND_STEPS_KEY]: steps } }, first);
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
 * is passed on the same way, and so is one of the steps each player takes as a round starts, which a line of their own begins.
 */
export function registerTurnPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .effect('the turn passes to the left', turnPassesLeft)
    .effect(STOP_PHRASE, actionStopped, { needsActing: true })
    .effect(STEP_PASSES_PHRASE, stepPassesLeft)
    .effect(ROUND_STEPS_PHRASE, roundStepsBegin)
    .effect(START_PLAYER_PHRASE, startPlayerChosen)
    .given('{player} is the start player', isStartPlayer);
}
