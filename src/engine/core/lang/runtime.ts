import { MAX_FLOW_ITERATIONS } from '../flow';
import { cardById, type GameState } from '../game-state';
import type { Move } from '../moves';
import type { CardState, PlayerId } from '../scene';
import type { Json } from '../table-def';
import { attachmentProblem } from './attach';
import { numberIn } from './board';
import { holderOf, interruptedTurn, setCounter } from './board-state';
import { cardAttribute, cardFact } from './card-facts';
import { CHOOSE_ONE, CHOOSE_PLAYER, type ChoiceOption } from './choices';
import { isMissing, readsPressCard } from './compile-util';
import { isNoSuchNumber, MissingPhraseError, RuleError } from './diagnostics';
import { cardsIn } from './library/support';
import type { PhraseLibrary } from './phrases';
import { phaseTakesTurns, ROUND_FRAME, ROUND_KEY, roundFinished, roundOf, startPlayerOf, TURN_OF_KEY } from './turns';
import type {
  ActionFn, CardGroup, ColumnFn, CompiledGame, CompiledMoment, CompiledTrigger, CondGroup, ConditionFn, EffectFn, ExampleEnv, ExpectFn, MomentFn, Moment, MoveInfo,
  PhraseEnv, PhraseKind, PhraseRef, ScoreFn, Subject, TargetFn, TurnFn, ValueFn, WhichFn, WhoFn, WinnerFn, WorkedValue,
} from './types';

type Checker = (state: GameState, move: Move) => true | string;

const DEPEND_ON_EACH_OTHER = 'Two moves depend on each other through “they have no card they could play”.';
const KEEPS_MOVING = 'It keeps moving pieces without stopping.';
const KEEPS_DRAWING = 'Cards keep drawing cards without stopping.';
const NO_WINNER = 'No player won.';
const WORKED_FROM_ITSELF = (name: string) => `“${name}” is worked out from itself.`;

/** Who a line about no one in particular is about. */
const NO_ONE: Subject = { player: null, space: null, card: null };

/**
 * How many moment rules may run inside one another. A lands-on rule that moves the piece again announces another
 * landing, so a rule like that never stops on its own: past this depth it is refused instead of overflowing the stack.
 * It is the cap the flow puts on rules that keep firing, so moment rules get as far as any other rule. Cards that draw
 * cards run inside one another the same way, and get as far.
 */
export const MAX_MOMENT_DEPTH = MAX_FLOW_ITERATIONS;

const notImplemented = (ref: PhraseRef) => new MissingPhraseError(`“${ref.text}” isn't implemented yet.`, ref.line, ref.text);

/**
 * What a phrase threw, as a RuleError that says which line of the rules it came from. A RuleError is given the line itself rather than
 * copied, so that what it is (one `noSuchNumber` made, say) is still known to whatever catches it; one that already has a line keeps it.
 */
function located(error: unknown, ref: PhraseRef): RuleError {
  if (!(error instanceof RuleError)) return new RuleError(error instanceof Error ? error.message : String(error), ref.line, ref.text);
  if (error.line === undefined) {
    error.line = ref.line;
    error.text = ref.text;
  }
  return error;
}

/**
 * Runs a line of a value worked out for cards, which reads a number the card has no column or count for as a line not about it:
 * `otherwise` is what the line comes to then. Any other error, a value that reads itself among them, is still the rule's.
 */
function unlessNoSuchNumber<T>(line: () => T, otherwise: T): T {
  try {
    return line();
  } catch (error) {
    if (isNoSuchNumber(error)) return otherwise;
    throw error;
  }
}

/**
 * Runs a compiled game's phrases against game states: the code behind each `PhraseRef`, plus the compiler's own
 * `lang` refs (all, any, phase, always, if, for, for each, missing). A ref nobody has written a phrase for throws a
 * MissingPhraseError when it is reached; whatever else a phrase throws comes out as a RuleError with its line.
 */
export class LangRuntime {
  private checker: Checker | null = null;
  private checking = false;
  /** The moment rules whose lines are running right now, each inside the one before it. */
  private readonly runningMoments: CompiledMoment[] = [];
  /** How many card lines are running inside one another: a card that draws a card runs that card's lines in its own. */
  private cardDepth = 0;
  /**
   * The values being worked out right now, each for a card or a player, by a key of its own: a number or a flag whose lines ask it again,
   * directly or through another value, would never end.
   */
  private readonly workingOut = new Set<string>();

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
      columnValue: this.columnValue, workedValue: this.workedValue, workedFlag: this.workedFlag, playerValue: this.playerValue,
    };
  }

  /** A condition, or the compiler's all / any / phase / always, or an End condition that waits for the round to finish. */
  test(ref: PhraseRef, state: GameState, move?: MoveInfo, example?: ExampleEnv, subject?: Subject): boolean {
    if (ref.kind === 'lang') {
      const holds = (r: PhraseRef) => this.test(r, state, move, example, subject);
      switch (ref.phrase) {
        case 'all': return (ref.args as PhraseRef[]).every(holds);
        case 'any': return (ref.args as PhraseRef[]).some(holds);
        case 'phase': return state.turn?.phase === ref.args[0];
        case 'always': return true;
        case ROUND_FRAME: return holds(ref.args[0] as PhraseRef) && roundFinished(state, this.seats);
      }
    }
    return this.call<ConditionFn, boolean>(ref, ['condition'], (fn) => fn(this.env(state, move, example, subject), ref.args));
  }

  /**
   * An effect or a Given step, or the compiler's “If …, …”, “For …, …” or “For each card …, …”, or a choice of a player. A For line runs
   * its effect as the player who holds the flag, with no card move, so “their” is theirs too; the space, amount and pick of a press stay
   * as they were. A For each line runs its effect about each card of its group in turn, with no card move, “it” being that card and
   * everything else what the line is about. A choice of a player runs its effect about the player its press filled in, as “that player”,
   * and does nothing when the press filled in no one (it was not asked). A block of options runs the lines of the option its press
   * filled in, in order, about the same move and subject, and does nothing when the press filled in none.
   */
  run(ref: PhraseRef, state: GameState, move?: MoveInfo, example?: ExampleEnv, subject?: Subject): GameState {
    if (ref.kind === 'lang' && ref.phrase === 'if') {
      const [condition, effect] = ref.args as PhraseRef[];
      return this.test(condition, state, move, example, subject) ? this.run(effect, state, move, example, subject) : state;
    }
    if (ref.kind === 'lang' && ref.phrase === 'for') {
      const [flag, effect] = ref.args as [string, PhraseRef];
      const holder = this.holderFor(ref, state, flag);
      return this.run(effect, state, undefined, example, { ...(subject ?? { player: null, space: null, card: null }), player: holder });
    }
    if (ref.kind === 'lang' && ref.phrase === 'for each') {
      const [group, effect] = ref.args as [CardGroup, PhraseRef];
      // A card move's lines are about the player making it, as `env` says.
      const about = subject ?? (move ? { player: move.by, space: null, card: null } : NO_ONE);
      // The cards are those of the group when the line starts: a card its effect moves in is not one of them, nor is one walked
      // twice for being moved, and each that it moves away is still walked, in its turn.
      const ids = this.cardsFor(ref, group, this.env(state, move, example, about));
      return ids.reduce((s, card) => this.run(effect, s, undefined, example, { ...about, card }), state);
    }
    if (ref.kind === 'lang' && ref.phrase === CHOOSE_PLAYER) {
      const [at, , , effect] = ref.args as [number, CondGroup[], PhraseRef, PhraseRef];
      const picked = subject?.choices?.[at];
      if (subject === undefined || typeof picked !== 'string' || !this.seats.includes(picked)) return state;
      return this.run(effect, state, move, example, { ...subject, picked });
    }
    if (ref.kind === 'lang' && ref.phrase === CHOOSE_ONE) {
      const [at, , options] = ref.args as [number, CondGroup[], ChoiceOption[]];
      const chosen = options.find((option) => option.label === subject?.choices?.[at]);
      return chosen === undefined ? state : chosen.effects.reduce((s, effect) => this.run(effect, s, move, example, subject), state);
    }
    return this.call<EffectFn, GameState>(ref, ['effect', 'given'], (fn) => fn(this.env(state, move, example, subject), ref.args));
  }

  /** The player a For line runs as; nobody holding the flag, or several, is a mistake on that line. */
  private holderFor(ref: PhraseRef, state: GameState, flag: string): PlayerId {
    try {
      return holderOf(state, this.seats, flag);
    } catch (error) {
      throw located(error, ref);
    }
  }

  /** The ids of the cards of a For each line's group, in its order; a mistake in reading them is a mistake on that line. */
  private cardsFor(ref: PhraseRef, group: CardGroup, env: PhraseEnv): string[] {
    try {
      return cardsIn(env, group).map((card) => card.id);
    } catch (error) {
      throw located(error, ref);
    }
  }

  /** The words of the first `Only if` group that does not hold, or null when they all do. Later groups are not asked. */
  failedGroup(groups: CondGroup[], state: GameState, move?: MoveInfo, subject?: Subject): string | null {
    const holds = (ref: PhraseRef) => this.test(ref, state, move, undefined, subject);
    return groups.find((g) => !(g.mode === 'all' ? g.refs.every(holds) : g.refs.some(holds)))?.text ?? null;
  }

  /**
   * Whether a line of the group reads the amount a button's press carries, so that it can only be judged once there is one. The
   * phrase is looked up as the compiler found it; a ref nobody wrote a phrase for reads nothing.
   */
  readsAmount(group: CondGroup): boolean {
    return group.refs.some((ref) => ref.kind !== 'lang' && this.library.get(ref.kind, ref.phrase)?.needsAmount === true);
  }

  /**
   * Whether a line of the group reads a card a press is about: the card a move makes, or “it”, the picked cards of a set, or the
   * target card. The compiler asks the same (`readsPressCard`) of a pick from a zone the presser may not see.
   */
  readsCard(group: CondGroup): boolean {
    return readsPressCard(this.library, group);
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
   * Who the lines of phase `phaseId` that are about no one else are about: the player whose turn it is where players take turns,
   * else no one.
   */
  turnSubject(phaseId: string, state: GameState): Subject {
    return { player: phaseTakesTurns(this.game, phaseId) ? (state.turn?.current ?? null) : null, space: null, card: null };
  }

  /** Tests a line of phase `phaseId`, such as its `go to` condition, about whoever the phase's lines are about now. */
  testInPhase(phaseId: string, ref: PhraseRef, state: GameState): boolean {
    return this.test(ref, state, undefined, undefined, this.turnSubject(phaseId, state));
  }

  /** Runs a line of phase `phaseId`, such as one of its start lines, about whoever the phase's lines are about now. */
  runInPhase(phaseId: string, ref: PhraseRef, state: GameState): GameState {
    return this.run(ref, state, undefined, undefined, this.turnSubject(phaseId, state));
  }

  /** Whether the game is in one of the phases it declares: not in Setup, and not before any phase has started. */
  private inGamePhase(state: GameState): boolean {
    return this.game.phases.some((p) => p.id === state.turn?.phase);
  }

  /**
   * Who a `When …:` rule of `phaseId` is about if it fires now, or null when it does not. A rule about a player is
   * about the first one it picks out whose `Only if` lines hold, and a rule about a card the first such card; any other
   * rule is about the player whose turn it is where players take turns, and about no one in particular elsewhere.
   * A null `phaseId` is a rule for every phase: it holds in any phase the game declares, never in Setup, and a rule of it about no
   * one in particular is about no one, whoever acts in the phase.
   */
  triggerSubject(phaseId: string | null, trigger: CompiledTrigger, state: GameState): Subject | null {
    if (phaseId === null ? !this.inGamePhase(state) : state.turn?.phase !== phaseId) return null;
    const holdsFor = (subject: Subject) => this.failedGroup(trigger.conditions, state, undefined, subject) === null;
    if (trigger.when.kind === 'who') {
      const player = this.who(trigger.when, state).find((seat) => holdsFor({ player: seat, space: null, card: null }));
      return player === undefined ? null : { player, space: null, card: null };
    }
    if (trigger.when.kind === 'which') {
      const card = this.which(trigger.when, state).find((id) => holdsFor({ player: null, space: null, card: id }));
      return card === undefined ? null : { player: null, space: null, card };
    }
    const about = phaseId === null ? NO_ONE : this.turnSubject(phaseId, state);
    return this.test(trigger.when, state, undefined, undefined, about) && holdsFor(about) ? about : null;
  }

  /** Runs a `When …:` rule's lines about whoever or whichever card it is about now. The flow only fires a rule that holds. */
  fireTrigger(phaseId: string | null, trigger: CompiledTrigger, state: GameState): GameState {
    const subject = this.triggerSubject(phaseId, trigger, state);
    if (subject === null) throw new Error(`The rule on line ${trigger.line} was run although it does not hold.`);
    return trigger.effects.reduce((s, ref) => this.run(ref, s, undefined, undefined, subject), state);
  }

  /**
   * Whether the current player's turn has yet to start: the game goes on, in one of its own phases, with no turn interrupted (the
   * player another phase handed the turn to is only standing in), and the turn that last started was another player's, or none.
   * A turn that comes back to the same seat starts again only when it passes through “the turn passes to the left”, which forgets
   * whose turn had started; an After line or a “goes next” rule that hands the turn back to that seat starts no new turn.
   */
  turnWaiting(state: GameState): boolean {
    return state.result === undefined && this.inGamePhase(state) && interruptedTurn(state) === null
      && state.data[TURN_OF_KEY] !== state.turn?.current;
  }

  /**
   * Starts the current player's turn. The start player's turn starts a round first, whose lines are about no one. Then the player's
   * numbers for each turn go back to their start, and the lines that start a turn run about them: those for every phase, then those
   * of the phase the turn starts in (C2). Last, the turn counts as started, so that this runs once a turn.
   *
   * The table is checked once the lines have all run, since one may move a card before another moves the cards on it. A table they
   * leave broken is blamed on the line after which it stayed broken: the last one that found it whole.
   */
  startTurn(state: GameState): GameState {
    const seat = state.turn?.current;
    const phaseId = state.turn?.phase;
    if (seat === undefined) throw new Error('There is no turn to start.');
    const ran: { ref: PhraseRef; before: GameState }[] = [];
    const runAll = (from: GameState, refs: PhraseRef[], subject: Subject) =>
      refs.reduce((s, ref) => {
        ran.push({ ref, before: s });
        return this.run(ref, s, undefined, undefined, subject);
      }, from);
    let s = state;
    if (seat === startPlayerOf(s, this.seats)) {
      s = { ...s, data: { ...s.data, [ROUND_KEY]: roundOf(s) + 1 } };
      s = runAll(s, this.game.everyPhase.roundStarts, NO_ONE);
    }
    for (const counter of this.game.board?.counters ?? []) {
      if (counter.perTurn) s = setCounter(s, counter.name, seat, counter.start);
    }
    const about: Subject = { player: seat, space: null, card: null };
    const phase = this.game.phases.find((p) => p.id === phaseId);
    s = runAll(s, [...this.game.everyPhase.turnStarts, ...(phase?.turnStarts ?? [])], about);
    const started: GameState = { ...s, data: { ...s.data, [TURN_OF_KEY]: seat } };
    if (attachmentProblem(this.game, started) === null) return started;
    const breaking = [...ran].reverse().find(({ before }) => attachmentProblem(this.game, before) === null);
    return this.checkAttachments(started, breaking?.ref);
  }

  /**
   * `env.announce`: a piece passed or landed on a space, or a card joined a card. Runs the moment rules for every phase, then the
   * current phase's, in the order written, each seeing what the rules before it did. A pass or a landing is about the piece's player
   * and that space; a join is about the player whose zone the card joined, the card (“it”) and the card it joined (“the card it
   * joins”). A rule's lines may move a piece or put a card on a card again and so announce again, inside this one.
   */
  readonly announce = (state: GameState, moment: Moment): GameState => {
    const rules = [...(this.game.everyPhase.moments ?? []), ...(this.game.phases.find((p) => p.id === state.turn?.phase)?.moments ?? [])];
    const subject: Subject = moment.kind === 'join'
      ? { player: moment.seat, space: null, card: moment.card, onto: moment.holder }
      : { player: moment.seat, space: moment.space, card: null };
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
    // The line to blame is the card's own, as with moment rules; unlocated, it would be taken for the line of whichever
    // sentence drew this one.
    if (this.cardDepth >= MAX_MOMENT_DEPTH) throw new RuleError(KEEPS_DRAWING, ref.line, ref.text);
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

  /**
   * `env.workedValue`: what a card has under a name. For a number a section works out, it starts from the card's own number when the
   * section is named after a column of a card table (nothing when the card has none), else from 0, and each line then has its say in the
   * order written, about that card and no player, seeing what the line before made of it. A line that reads a number the card lacks
   * leaves the value as it was. Any other name is what the card keeps.
   */
  readonly workedValue = (state: GameState, cardId: string, name: string): Json | null => {
    const card = this.cardIn(state, cardId);
    const worked = this.workedOf(name);
    if (worked?.kind !== 'number') return cardAttribute(card, name, this.game);
    const own = cardFact(card, name);
    const env = this.env(state, undefined, undefined, { player: null, space: null, card: cardId });
    return this.workOut([cardId, name], name, () => worked.refs.reduce(
      (value, ref) => unlessNoSuchNumber(() => this.call<ValueFn, number | null>(ref, ['value'], (fn) => fn(env, ref.args, value)), value),
      worked.refines ? (typeof own === 'number' ? own : null) : 0,
    ));
  };

  /**
   * `env.workedFlag`: whether a card is so. A flag a section works out holds when each of its `Only if` groups does, about that card and
   * no player; a line that reads a number the card lacks does not hold, so the card is not so unless another line of its `Only if one of:`
   * does. It is judged here and not by `failedGroup`, for which such a line is the rule's mistake. Any other flag is so when the card has
   * it set, and not set to no.
   */
  readonly workedFlag = (state: GameState, cardId: string, flag: string): boolean => {
    const card = this.cardIn(state, cardId);
    const worked = this.workedOf(flag);
    if (worked?.kind !== 'flag') return cardFact(card, flag) === true;
    const subject: Subject = { player: null, space: null, card: cardId };
    const holds = (ref: PhraseRef) => unlessNoSuchNumber(() => this.test(ref, state, undefined, undefined, subject), false);
    const groupHolds = (group: CondGroup) => (group.mode === 'all' ? group.refs.every(holds) : group.refs.some(holds));
    return this.workOut([cardId, flag], flag, () => worked.conditions.every(groupHolds));
  };

  /**
   * `env.playerValue`: what a value the game works out for each player comes to for a seat. It starts from 0 and each line of its sections
   * then has its say in the order written, about that player, seeing what the line before made of it. A line that comes to nothing, or
   * reads a number a card lacks, leaves the value as it was. The compiler lets only the names it works out into the lines, so any other is
   * a mistake in the code.
   */
  readonly playerValue = (state: GameState, seat: PlayerId, name: string): number => {
    const values = this.game.playerValues;
    const value = values !== undefined && Object.hasOwn(values, name) ? values[name] : undefined;
    if (value === undefined) throw new Error(`No value called “${name}” is worked out for players.`);
    const env = this.env(state, undefined, undefined, { player: seat, space: null, card: null });
    const line = (sum: number, ref: PhraseRef) => this.call<ValueFn, number | null>(ref, ['value'], (fn) => fn(env, ref.args, sum)) ?? sum;
    return this.workOut(['player', seat, name], name, () => value.refs.reduce((sum, ref) => unlessNoSuchNumber(() => line(sum, ref), sum), 0));
  };

  /** The value a section works out under this name, if one does. */
  private workedOf(name: string): WorkedValue | undefined {
    return this.game.worked !== undefined && Object.hasOwn(this.game.worked, name) ? this.game.worked[name] : undefined;
  }

  /** The card a value is worked out for. Phrases ask only about cards the state holds, so a missing one is a bug. */
  private cardIn(state: GameState, cardId: string): CardState {
    const card = cardById(state, cardId);
    if (!card) throw new Error(`No card ${cardId} to work a value out for.`);
    return card;
  }

  /**
   * Works out the value `name` of a card (`[cardId, name]`) or of a player (`['player', seat, name]`), which must not be asked again under
   * the same key until it is known. The line that asks it again is the one blamed (the error takes that line's number on its way out),
   * never a stack overflow.
   */
  private workOut<T>(key: string[], name: string, work: () => T): T {
    const id = JSON.stringify(key);
    if (this.workingOut.has(id)) throw new RuleError(WORKED_FROM_ITSELF(name));
    this.workingOut.add(id);
    try {
      return work();
    } finally {
      // A value that throws must not leave the runtime thinking it is still being worked out.
      this.workingOut.delete(id);
    }
  }

  /**
   * The state, when every card that must sit on a card does, on one still with it; else a RuleError that names the card left behind, on
   * the line `at` (a button's, a rule's or one line's, with its words when it has them), as any rule's error says where it is. Thrown
   * from a move or a rule, it refuses the whole change, so the engine keeps the state from before it.
   */
  checkAttachments(state: GameState, at?: { line: number; text?: string }): GameState {
    const problem = attachmentProblem(this.game, state);
    if (problem !== null) throw new RuleError(problem, at?.line, at?.text);
    return state;
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

  /**
   * How the game ended: every seat's score when the game has score lines, and the winner. A win the winner line lets players share
   * names them all as `winners`, with the first of them as `winner`, so that whatever reads only `winner` still finds one.
   */
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
    const scored: { [k: string]: Json } = end.scores.length > 0 ? { scores } : {};
    const won = this.call<WinnerFn, PlayerId | PlayerId[]>(end.winner, ['winner'], (fn) => fn(env, end.winner.args, scores));
    if (!Array.isArray(won)) return { ...state, result: { ...scored, winner: won } };
    if (won.length === 0) throw new RuleError(NO_WINNER, end.winner.line, end.winner.text);
    return { ...state, result: { ...scored, winner: won[0], winners: won } };
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
