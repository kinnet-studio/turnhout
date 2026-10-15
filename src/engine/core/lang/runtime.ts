import type { GameState } from '../game-state';
import type { Move } from '../moves';
import type { PlayerId } from '../scene';
import { MissingPhraseError, RuleError } from './diagnostics';
import type { PhraseLibrary } from './phrases';
import type {
  ActionFn, CompiledGame, ConditionFn, EffectFn, ExampleEnv, ExpectFn, MoveInfo, PhraseEnv, PhraseKind, PhraseRef, ScoreFn,
  TurnFn, WinnerFn,
} from './types';

type Checker = (state: GameState, move: Move) => true | string;

const DEPEND_ON_EACH_OTHER = 'Two moves depend on each other through “they have no card they could play”.';

const isMissing = (ref: PhraseRef) => ref.kind === 'lang' && ref.phrase === 'missing';
const notImplemented = (ref: PhraseRef) => new MissingPhraseError(`“${ref.text}” isn't implemented yet.`, ref.line, ref.text);

/** What a phrase threw, as a RuleError that says which line of the rules it came from. */
function located(error: unknown, ref: PhraseRef): RuleError {
  if (error instanceof RuleError) return error.line === undefined ? new RuleError(error.message, ref.line, ref.text) : error;
  return new RuleError(error instanceof Error ? error.message : String(error), ref.line, ref.text);
}

/**
 * Runs a compiled game's phrases against game states: the code behind each `PhraseRef`, plus the compiler's own
 * `lang` refs (all, any, phase, always, if, missing). A ref nobody has written a phrase for throws a
 * MissingPhraseError when it is reached; whatever else a phrase throws comes out as a RuleError with its line.
 */
export class LangRuntime {
  private checker: Checker | null = null;
  private checking = false;

  constructor(
    readonly game: CompiledGame,
    private readonly library: PhraseLibrary,
    readonly seats: PlayerId[],
  ) {}

  /** How `env.check` judges a move: the engine's own gate and move handlers. */
  setChecker(check: Checker): void {
    this.checker = check;
  }

  env(state: GameState, move?: MoveInfo, example?: ExampleEnv): PhraseEnv {
    return { state, game: this.game, seats: this.seats, move, check: this.check, example };
  }

  /** A condition, or the compiler's all / any / phase / always. */
  test(ref: PhraseRef, state: GameState, move?: MoveInfo, example?: ExampleEnv): boolean {
    if (ref.kind === 'lang') {
      const holds = (r: PhraseRef) => this.test(r, state, move, example);
      switch (ref.phrase) {
        case 'all': return (ref.args as PhraseRef[]).every(holds);
        case 'any': return (ref.args as PhraseRef[]).some(holds);
        case 'phase': return state.turn?.phase === ref.args[0];
        case 'always': return true;
      }
    }
    return this.call<ConditionFn, boolean>(ref, ['condition'], (fn) => fn(this.env(state, move, example), ref.args));
  }

  /** An effect or a Given step, or the compiler's “If …, …”. */
  run(ref: PhraseRef, state: GameState, move?: MoveInfo, example?: ExampleEnv): GameState {
    if (ref.kind === 'lang' && ref.phrase === 'if') {
      const [condition, effect] = ref.args as PhraseRef[];
      return this.test(condition, state, move, example) ? this.run(effect, state, move, example) : state;
    }
    return this.call<EffectFn, GameState>(ref, ['effect', 'given'], (fn) => fn(this.env(state, move, example), ref.args));
  }

  /** Who plays next. */
  pick(ref: PhraseRef, state: GameState): PlayerId {
    return this.call<TurnFn, PlayerId>(ref, ['turn'], (fn) => fn(this.env(state), ref.args));
  }

  /** The move an example's When step makes, and who makes it. */
  act(ref: PhraseRef, state: GameState, example: ExampleEnv): { by: PlayerId; move: Move } {
    return this.call<ActionFn, { by: PlayerId; move: Move }>(ref, ['action'], (fn) => fn(this.env(state, undefined, example), ref.args));
  }

  /** An example's Then step: true, or what went wrong. A plain condition that is false says what was expected. */
  expect(ref: PhraseRef, state: GameState, example: ExampleEnv): true | string {
    if (ref.kind === 'condition') return this.test(ref, state, undefined, example) ? true : `Expected: ${ref.text}`;
    return this.call<ExpectFn, true | string>(ref, ['expect'], (fn) => fn(this.env(state, undefined, example), ref.args));
  }

  /** How the game ended: every seat's score when the game has score lines, and the winner. */
  result(state: GameState): GameState {
    const end = this.game.end;
    if (!end) throw new Error('This game has no End: section, so it cannot end.');
    const env = this.env(state);
    const scores: Record<PlayerId, number> = {};
    if (end.scores.length > 0) {
      for (const seat of this.seats) {
        scores[seat] = end.scores.reduce((sum, ref) => sum + this.call<ScoreFn, number>(ref, ['score'], (fn) => fn(env, ref.args, seat)), 0);
      }
    }
    const winner = this.call<WinnerFn, PlayerId>(end.winner, ['winner'], (fn) => fn(env, end.winner.args, scores));
    return { ...state, result: end.scores.length > 0 ? { scores, winner } : { winner } };
  }

  /** Runs the code behind a phrase of one of `kinds`. */
  private call<F, T>(ref: PhraseRef, kinds: PhraseKind[], use: (fn: F) => T): T {
    if (isMissing(ref)) throw notImplemented(ref);
    if (ref.kind === 'lang' || !kinds.includes(ref.kind)) throw new Error(`“${ref.text}” can't be used as ${kinds.join(' or ')} here.`);
    // A game compiled against a richer library may name a phrase this one lacks: to the designer that is the same thing.
    const entry = this.library.get(ref.kind, ref.phrase);
    if (!entry) throw notImplemented(ref);
    try {
      return use(entry.fn as F);
    } catch (error) {
      throw located(error, ref);
    }
  }

  /** `env.check`: the checker, which must not be asked again while it is still answering. */
  private readonly check = (state: GameState, move: Move): true | string => {
    if (!this.checker) throw new Error('No move checker has been set.');
    if (this.checking) throw new RuleError(DEPEND_ON_EACH_OTHER);
    this.checking = true;
    try {
      return this.checker(state, move);
    } finally {
      this.checking = false;
    }
  };
}
