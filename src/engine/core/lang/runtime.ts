import { MAX_FLOW_ITERATIONS } from '../flow';
import type { GameState } from '../game-state';
import type { Move } from '../moves';
import type { PlayerId } from '../scene';
import { numberIn } from './board';
import { isMissing } from './compile-util';
import { MissingPhraseError, RuleError } from './diagnostics';
import type { PhraseLibrary } from './phrases';
import type {
  ActionFn, ColumnFn, CompiledGame, CompiledMoment, CompiledTrigger, CondGroup, ConditionFn, EffectFn, ExampleEnv, ExpectFn, MomentFn, Moment, MoveInfo,
  PhraseEnv, PhraseKind, PhraseRef, ScoreFn, Subject, TargetFn, TurnFn, WhichFn, WhoFn, WinnerFn,
} from './types';

type Checker = (state: GameState, move: Move) => true | string;

const DEPEND_ON_EACH_OTHER = 'Two moves depend on each other through “they have no card they could play”.';
const KEEPS_MOVING = 'It keeps moving pieces without stopping.';
const KEEPS_DRAWING = 'Cards keep drawing cards without stopping.';

/**
 * How many moment rules may run inside one another. A lands-on rule that moves the piece again announces another
 * landing, so a rule like that never stops on its own: past this depth it is refused instead of overflowing the stack.
 * It is the cap the flow puts on rules that keep firing, so moment rules get as far as any other rule. Cards that draw
 * cards run inside one another the same way, and get as far.
 */
export const MAX_MOMENT_DEPTH = MAX_FLOW_ITERATIONS;

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
  /** The moment rules whose lines are running right now, each inside the one before it. */
  private readonly runningMoments: CompiledMoment[] = [];
  /** How many card lines are running inside one another: a card that draws a card runs that card's lines in its own. */
  private cardDepth = 0;

  constructor(
    readonly game: CompiledGame,
    private readonly library: PhraseLibrary,
    readonly seats: PlayerId[],
  ) {}

  /** How `env.check` judges a move: the engine's own gate and move handlers. */
  setChecker(check: Checker): void {
    this.checker = check;
  }

  /** What a phrase sees. A card move is about the player making it; `subject` names someone (or a space) else. */
  env(state: GameState, move?: MoveInfo, example?: ExampleEnv, subject?: Subject): PhraseEnv {
    const about = subject ?? (move ? { player: move.by, space: null, card: null } : undefined);
    return {
      state, game: this.game, seats: this.seats, move, check: this.check, example, subject: about, announce: this.announce, runLine: this.runLine,
      columnValue: this.columnValue,
    };
  }

  /** A condition, or the compiler's all / any / phase / always. */
  test(ref: PhraseRef, state: GameState, move?: MoveInfo, example?: ExampleEnv, subject?: Subject): boolean {
    if (ref.kind === 'lang') {
      const holds = (r: PhraseRef) => this.test(r, state, move, example, subject);
      switch (ref.phrase) {
        case 'all': return (ref.args as PhraseRef[]).every(holds);
        case 'any': return (ref.args as PhraseRef[]).some(holds);
        case 'phase': return state.turn?.phase === ref.args[0];
        case 'always': return true;
      }
    }
    return this.call<ConditionFn, boolean>(ref, ['condition'], (fn) => fn(this.env(state, move, example, subject), ref.args));
  }

  /** An effect or a Given step, or the compiler's “If …, …”. */
  run(ref: PhraseRef, state: GameState, move?: MoveInfo, example?: ExampleEnv, subject?: Subject): GameState {
    if (ref.kind === 'lang' && ref.phrase === 'if') {
      const [condition, effect] = ref.args as PhraseRef[];
      return this.test(condition, state, move, example, subject) ? this.run(effect, state, move, example, subject) : state;
    }
    return this.call<EffectFn, GameState>(ref, ['effect', 'given'], (fn) => fn(this.env(state, move, example, subject), ref.args));
  }

  /** The words of the first `Only if` group that does not hold, or null when they all do. Later groups are not asked. */
  failedGroup(groups: CondGroup[], state: GameState, move?: MoveInfo, subject?: Subject): string | null {
    const holds = (ref: PhraseRef) => this.test(ref, state, move, undefined, subject);
    return groups.find((g) => !(g.mode === 'all' ? g.refs.every(holds) : g.refs.some(holds)))?.text ?? null;
  }

  /** Whether a button's target phrase allows the player in `subject` to pick `space`. */
  allowsTarget(ref: PhraseRef, state: GameState, subject: Subject, space: number): boolean {
    return this.call<TargetFn, boolean>(ref, ['target'], (fn) => fn(this.env(state, undefined, undefined, subject), ref.args, space));
  }

  /** Who plays next. */
  pick(ref: PhraseRef, state: GameState): PlayerId {
    return this.call<TurnFn, PlayerId>(ref, ['turn'], (fn) => fn(this.env(state), ref.args));
  }

  /** The players a `When a player …:` rule picks out, in seat order. */
  who(ref: PhraseRef, state: GameState): PlayerId[] {
    return this.call<WhoFn, PlayerId[]>(ref, ['who'], (fn) => fn(this.env(state), ref.args));
  }

  /** The ids of the cards a `When a card …:` rule picks out, in the order the phrase gives them. */
  which(ref: PhraseRef, state: GameState): string[] {
    return this.call<WhichFn, string[]>(ref, ['which'], (fn) => fn(this.env(state), ref.args));
  }

  /**
   * Who a `When …:` rule of `phaseId` is about if it fires now, or null when it does not. A rule about a player is
   * about the first one it picks out whose `Only if` lines hold, and a rule about a card the first such card; any other
   * rule is about no one in particular.
   */
  triggerSubject(phaseId: string, trigger: CompiledTrigger, state: GameState): Subject | null {
    if (state.turn?.phase !== phaseId) return null;
    const holdsFor = (subject: Subject) => this.failedGroup(trigger.conditions, state, undefined, subject) === null;
    if (trigger.when.kind === 'who') {
      const player = this.who(trigger.when, state).find((seat) => holdsFor({ player: seat, space: null, card: null }));
      return player === undefined ? null : { player, space: null, card: null };
    }
    if (trigger.when.kind === 'which') {
      const card = this.which(trigger.when, state).find((id) => holdsFor({ player: null, space: null, card: id }));
      return card === undefined ? null : { player: null, space: null, card };
    }
    const nobody: Subject = { player: null, space: null, card: null };
    return this.test(trigger.when, state, undefined, undefined, nobody) && holdsFor(nobody) ? nobody : null;
  }

  /** Runs a `When …:` rule's lines about whoever or whichever card it is about now. The flow only fires a rule that holds. */
  fireTrigger(phaseId: string, trigger: CompiledTrigger, state: GameState): GameState {
    const subject = this.triggerSubject(phaseId, trigger, state);
    if (subject === null) throw new Error(`The rule on line ${trigger.line} was run although it does not hold.`);
    return trigger.effects.reduce((s, ref) => this.run(ref, s, undefined, undefined, subject), state);
  }

  /**
   * `env.announce`: a piece passed or landed on a space. Runs the current phase's passes and lands-on rules in the
   * order written, each about the piece's player and that space, each seeing what the rules before it did. A rule's
   * lines may move a piece again and so announce again, inside this one.
   */
  readonly announce = (state: GameState, moment: Moment): GameState => {
    const rules = this.game.phases.find((p) => p.id === state.turn?.phase)?.moments ?? [];
    const subject: Subject = { player: moment.seat, space: moment.space, card: null };
    let s = state;
    for (const rule of rules) {
      const env = this.env(s, undefined, undefined, subject);
      const happens = this.call<MomentFn, boolean>(rule.when, ['moment'], (fn) => fn(env, rule.when.args, moment));
      if (!happens || this.failedGroup(rule.conditions, s, undefined, subject) !== null) continue;
      // The rule to blame is the one whose lines moved the piece this time, not whichever rule the move set off first.
      const mover = this.runningMoments.at(-1);
      if (mover && this.runningMoments.length >= MAX_MOMENT_DEPTH) throw new RuleError(KEEPS_MOVING, mover.line, mover.text);
      this.runningMoments.push(rule);
      try {
        s = rule.effects.reduce((acc, ref) => this.run(ref, acc, undefined, undefined, subject), s);
      } finally {
        // A rule that throws must not leave the runtime thinking it is still that deep.
        this.runningMoments.pop();
      }
    }
    return s;
  };

  /**
   * `env.runLine`: one line of a card, run about the player who drew it. A card whose line draws another card runs that card's
   * lines inside its own, so past the cap on that it is refused rather than overflowing the stack, like moment rules are.
   */
  readonly runLine = (state: GameState, ref: PhraseRef, subject: Subject): GameState => {
    if (this.cardDepth >= MAX_MOMENT_DEPTH) throw new RuleError(KEEPS_DRAWING);
    this.cardDepth++;
    try {
      return this.run(ref, state, undefined, undefined, subject);
    } finally {
      // A line that throws must not leave the runtime thinking it is still that deep.
      this.cardDepth--;
    }
  };

  /**
   * `env.columnValue`: what a column of the board's table comes to for a space. It starts from the table's cell and each line of
   * the column's section then has its say in the order written, about that space and no player, seeing what the line before
   * made of it. A column no section is about is just its cell.
   */
  readonly columnValue = (state: GameState, space: number, column: string): number | null => {
    const spec = this.game.board?.spaces[space];
    if (!spec) throw new Error(`There is no space ${space} on this board.`);
    const subject: Subject = { player: null, space, card: null };
    return (Object.hasOwn(this.game.columns, column) ? this.game.columns[column] : []).reduce(
      (value, ref) => this.call<ColumnFn, number | null>(ref, ['column'], (fn) => fn(this.env(state, undefined, undefined, subject), ref.args, value)),
      numberIn(spec, column),
    );
  };

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
