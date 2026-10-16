import type { GameState } from '../game-state';
import type { Move } from '../moves';
import type { PlayerId } from '../scene';
import type { Json } from '../table-def';

export type PhraseKind =
  | 'cards' | 'zone' | 'board' | 'declare' | 'column' | 'condition' | 'effect' | 'turn' | 'who' | 'which' | 'score' | 'winner' | 'moment' | 'given'
  | 'action' | 'target' | 'expect';
/** kind 'lang' = compiler built-ins: all | any | phase | always | if | for | round | missing */
export type PhraseRef = { kind: PhraseKind | 'lang'; phrase: string; args: Json[]; line: number; text: string };
/** `other` is the one player who is not the actor, in a game for two. */
export type SeatRef = { seat: string } | { who: 'actor' | 'winner' | 'other' };
export type ZoneRef = { shared: string } | { each: string } | { of: SeatRef; zone: string };
export type CardMatch = { [attr: string]: Json };
export type ZoneSpec = { name: string; perPlayer: boolean; layout: 'pile' | 'row' | 'hand'; visibility: 'secret' | 'owner' | 'public' };
export type CardIdentity = { attrs: { [k: string]: Json }; faceKey: string };
/**
 * A set of cards the game starts with. An `endless` set has the identities of its table but puts no card on the table (its
 * `start` is ''): a card of it is made, with `makeCard`, whenever a rule asks for a new one.
 */
export type CardSetSpec = { kind: 'standard' | 'table' | 'endless'; identities: CardIdentity[]; start: string; acesHigh: boolean };
export type CardTable = { columns: string[]; rows: { cells: string[]; line: number }[] };
export type CondGroup = { mode: 'all' | 'any'; refs: PhraseRef[]; text: string; line: number };
export type DeclaredMove = { verb: string; from: ZoneRef; to: ZoneRef; fromText: string; conditions: CondGroup[]; effects: PhraseRef[]; line: number };
/** One row of a board's table: `attrs` holds every column but `space`, blank cells left out. */
export type SpaceSpec = { name: string; attrs: { [k: string]: Json } };
/** `perTurn` marks a number that goes back to its start at the start of each of its owner's turns. */
export type CounterSpec = { name: string; start: number; visibility: 'public' | 'owner'; perTurn: boolean };
/** What the box holds that is not any player's: `name` is plural ('tokens') and `start` is how many there are to begin with. */
export type BankSpec = { name: string; start: number };
export type BoardSpec = {
  spaces: SpaceSpec[]; pieces: { start: number } | null; counters: CounterSpec[]; dice: { count: number; sides: number } | null;
  payWith: string | null; bank: BankSpec[];
};
/** A fact the game keeps about every space, card or player: a count, or something that is either so or not. */
export type ThingFact = { name: string; on: 'space' | 'card' | 'player'; kind: 'number' | 'flag' };
/** A number that belongs to the game itself, to no player and no space, and the value it starts at. */
export type GameNumber = { name: string; on: 'game'; kind: 'number'; start: number };
export type FactSpec = ThingFact | GameNumber;
/** One fact as a line that declares facts lists it, before it is told what it is on. */
export type FactItem = Pick<FactSpec, 'name' | 'kind'>;
/** What one line of a Board: section says; the compiler folds the parts into a BoardSpec. */
export type BoardPart =
  | { kind: 'loop'; spaces: SpaceSpec[] }
  | { kind: 'pieces'; start: number }
  | { kind: 'counter'; counter: CounterSpec }
  | { kind: 'dice'; count: number; sides: number }
  | { kind: 'pay-with'; counter: string }
  | { kind: 'bank'; bank: BankSpec[] };
/** A group of spaces named by one of their attributes, like every space whose kind is go. */
export type SpaceClass = { attribute: string; values: Json[] };
/** What a button costs: `counter` is the plural name the game declares, of a number each player has each turn; `line` is the cost line's. */
export type ActionCost = { amount: number; counter: string; line: number };
/**
 * The cards a button picks. `some` is true for a set (“some cards”). `from` is the zone they are picked in and `fromText` that zone as
 * written ('their stash'). `to` is the zone the picked cards move to before the `Then:` lines, and `onto` the zone a target card is
 * picked in, with `ontoText` as written. A one-card pick with `to` and `onto` both null was written “a card in {zone}”.
 */
export type CardPick = { some: boolean; from: ZoneRef; fromText: string; to: ZoneRef | null; onto: ZoneRef | null; ontoText: string | null };
/**
 * `words` is the lowercase text after "a player may" ('roll the dice'); `label` is the button text in the second person,
 * with the designer's capitals ('Roll the dice', 'Go to Rose Lane'). `words` is also the button's move type, so that
 * “pay the fine” and “pay the toll” are two buttons although they start with the same `verb`.
 * A button picks a space on the board when its line ends in “on a …”, or in a target phrase after its verb ('mark a space they
 * own'): `base` is the lowercase wording before “on” or the phrase ('plant a flag', 'mark') and `target` the phrase that says
 * which spaces it may pick. Any other button has `base` equal to `words`, no target.
 * `anyone` is true for a line that starts “Any player may”: any seat still in may press it, whoever's turn it is.
 * `amount` is true for a button that picks no space and whose wording ends in “ an amount” (“A player may raise an amount.”): its
 * press carries a whole number, `base` and `label` leave “ an amount” out ('raise', 'Raise'), and `words` keeps it, as the move type.
 * `picksPlayer` is true for a button that picks no space, carries no amount and whose wording ends in “ another player” (“A player
 * may challenge another player.”): its press picks a player. `base` leaves “ another player” out ('challenge'), `words` keeps it,
 * as the move type, and `label` is the whole wording in the second person, since the page shows the players to pick only after
 * the press.
 * `cost` is there only for a button with an “It costs 1 action.” line: it is judged before any `Only if` and spent before the `Then:` lines.
 * `pick` is there only for a button that picks a card (“A player may sell a card in their stash.”): its press names the card, `base` is
 * the wording before “a card” ('sell'), and `label` is the whole wording in the second person.
 */
export type DeclaredAction = {
  verb: string; words: string; base: string; label: string; target: PhraseRef | null; anyone: boolean; amount: boolean; picksPlayer: boolean;
  conditions: CondGroup[]; effects: PhraseRef[]; line: number; cost?: ActionCost; pick?: CardPick;
};
export type CompiledMoment = { line: number; text: string; when: PhraseRef; conditions: CondGroup[]; effects: PhraseRef[] };
export type CompiledTrigger = { line: number; text: string; when: PhraseRef; conditions: CondGroup[]; effects: PhraseRef[] };
export type CompiledPhase = {
  id: string; line: number; hint: string | null; actor: 'current' | 'any'; rearrange: string[];
  moves: DeclaredMove[]; onEnter: PhraseRef[]; goTo: { when: PhraseRef; to: string; line: number } | null;
  triggers: CompiledTrigger[];
  /** `moves` are the move types the After line names: a card move's verb, a button's whole wording. */
  after: { moves: string[]; next: PhraseRef; line: number } | null;
  actions: DeclaredAction[]; moments: CompiledMoment[];
  /** The lines under the phase's “When a player's turn starts:”, about the player whose turn starts in it. */
  turnStarts: PhraseRef[];
};
/**
 * The rules of an `In every phase:` section: `When …:` rules that fire whatever the phase, the lines that start each round, about
 * no one, and the lines that start each turn, about the player whose turn it is.
 */
export type EveryPhase = { triggers: CompiledTrigger[]; roundStarts: PhraseRef[]; turnStarts: PhraseRef[] };
export type CompiledEnd = { line: number; when: PhraseRef; scores: PhraseRef[]; winner: PhraseRef };
export type ExampleStep = { keyword: 'given' | 'when' | 'then'; ref: PhraseRef };
export type CompiledExample = { name: string; line: number; players: number | null; steps: ExampleStep[] };
export type CompiledGame = {
  name: string; players: { min: number; max: number }; zones: ZoneSpec[]; cards: CardSetSpec[];
  setup: PhraseRef[]; phases: CompiledPhase[]; end: CompiledEnd | null; examples: CompiledExample[];
  board: BoardSpec | null; facts: FactSpec[];
  /**
   * The lines of each section named after a column of the board's table, by column, in the order written: what that column
   * means for a space once they have each had their say.
   */
  columns: { [column: string]: PhraseRef[] };
  /**
   * What each cell of a deck's `says` column tells its cards to do, keyed by the cell's text as the cards' data holds it
   * (trimmed): one effect ref per sentence, in order, each about the player who draws the card. Empty when no deck has the column.
   */
  says: { [cell: string]: PhraseRef[] };
  /** The rules for every phase; empty lists when the game has no `In every phase:` section. */
  everyPhase: EveryPhase;
};
export type Vocab = {
  sharedZones: string[]; playerZones: string[]; maxPlayers: number; phases: string[]; verbs: string[];
  attributes: string[]; cardValues: { attribute: string; value: Json }[]; standardDeck: boolean;
  /** Space names in loop order, duplicates kept. */
  spaces: string[]; spaceAttributes: string[];
  /** The text cells of the board's table, not the numbers. */
  spaceValues: { attribute: string; value: string }[];
  counters: string[]; payWith: string | null;
  /** The counters each player has each turn: the only ones a button may cost. */
  budgets: string[];
  /**
   * Every button the phases declare, one for each wording; `targeted` ones pick a space, so an example names it after their `base`,
   * and `anyone` ones may be pressed by any seat at any time, so they are never part of a turn. An `amount` one carries a number
   * with its press, so an example gives it after the base; so does a `picksPlayer` one, with the player it picks, and a `picksCard` one,
   * with the cards it picks. `picksCard` is left out for every other button.
   */
  actions: { verb: string; words: string; base: string; targeted: boolean; anyone: boolean; amount: boolean; picksPlayer: boolean; picksCard?: boolean }[];
  /** True when the board has dice: a line like “There are two six-sided dice.” under Board:. */
  dice: boolean;
  /** How many dice the board rolls: 0 without dice. */
  diceCount: number;
  /** The facts the game keeps, and the names of the bank's numbers. */
  facts: FactSpec[]; bank: string[];
};
/**
 * Who, which space and which card a phrase is about, when a rule is about a player's piece, a space or a card. `amount` is the
 * whole number a button that carries one was pressed with; no other rule has it. `picked` is the player a button that picks one
 * was pressed with; no other rule has it. `onto` is the id of the card a button that picks one for its cards to go to was pressed
 * with, and `cards` the ids of the set a button that picks some cards was pressed with, in the order the press gave them; no other
 * rule has either.
 */
export type Subject = {
  player: PlayerId | null; space: number | null; card: string | null; amount?: number; picked?: PlayerId; onto?: string; cards?: string[];
};
/** A piece passing over or landing on a space. */
export type Moment = { kind: 'pass' | 'land'; seat: PlayerId; space: number };
export interface MoveInfo { verb: string; by: PlayerId; cardId: string; from: string; to: string }
export interface ExampleEnv {
  last: { ok: boolean; reason?: string } | null;
  /** The id of a card that matches, and the state with that card in it: one the table lacks is made, and only a made card changes the state. */
  claim(match: CardMatch, text: string, state: GameState): { id: string; state: GameState };
  setUp(state: GameState): GameState;
}
export interface PhraseEnv {
  state: GameState; game: CompiledGame; seats: PlayerId[]; move?: MoveInfo;
  check(state: GameState, move: Move): true | string;
  example?: ExampleEnv;
  subject?: Subject;
  /** Runs the lands-on and passes rules for a moment; the runtime supplies it. */
  announce?: (state: GameState, moment: Moment) => GameState;
  /** Runs one compiled line about a subject, as a rule's line runs, for a phrase that does what a card says; the runtime supplies it. */
  runLine?: (state: GameState, ref: PhraseRef, subject: Subject) => GameState;
  /**
   * What a column of the board's table says for a space once the lines of its section have had their say; the runtime
   * supplies it. Null for a blank cell no line fills. Without it a phrase reads the table's cell as it stands.
   */
  columnValue?: (state: GameState, space: number, column: string) => number | null;
}
export type ConditionFn = (env: PhraseEnv, args: Json[]) => boolean;
export type EffectFn = (env: PhraseEnv, args: Json[]) => GameState;   // also 'given'
export type TurnFn = (env: PhraseEnv, args: Json[]) => PlayerId;
export type WhoFn = (env: PhraseEnv, args: Json[]) => PlayerId[];
/** The cards a `When a card …:` rule is about, as card ids in a fixed order: by zone, then by slot. */
export type WhichFn = (env: PhraseEnv, args: Json[]) => string[];
export type ScoreFn = (env: PhraseEnv, args: Json[], seat: PlayerId) => number;
/** The one winner, or every player who shares the win, in seat order. */
export type WinnerFn = (env: PhraseEnv, args: Json[], scores: Record<PlayerId, number>) => PlayerId | PlayerId[];
export type MomentFn = (env: PhraseEnv, args: Json[], moment: Moment) => boolean;
export type ActionFn = (env: PhraseEnv, args: Json[]) => { by: PlayerId; move: Move };
/** Whether a button may pick `space`; `env.subject.player` is the player pressing it. */
export type TargetFn = (env: PhraseEnv, args: Json[], space: number) => boolean;
export type ExpectFn = (env: PhraseEnv, args: Json[]) => true | string;
export type CardsFn = (args: Json[], table: CardTable | null) => CardSetSpec;
export type ZoneFn = (args: Json[]) => ZoneSpec;
export type BoardFn = (args: Json[], table: CardTable | null) => BoardPart;
/** A line that says what the game keeps facts about: the facts it declares, each already told which thing it is on. */
export type DeclareFn = (args: Json[]) => FactSpec[];
/**
 * A line of a section named after a column: what the column means for the space the line is about, given what it came to
 * so far (the table's cell for the first line, what the line before made of it for the next); null for nothing.
 */
export type ColumnFn = (env: PhraseEnv, args: Json[], value: number | null) => number | null;
/** A name in a line that the game never defined, said for the designer, with the closest names it did define. */
export type NameProblem = { message: string; suggestions: string[] };
export interface ParamType {
  name: string; label: string;                      // label e.g. '[number]', used in suggestions
  source(vocab: Vocab): string;                      // regex source, no capture groups
  resolve(text: string, vocab: Vocab): { value: Json } | { error: string };
  stubOrder?: number;                                // lower = replaced first by stubFor
  /** For a type of names the game defines: text shaped like one, and what is wrong with text `source` does not cover. */
  loose?: {
    source(vocab: Vocab): string;                    // regex source, no capture groups
    explain(text: string, vocab: Vocab): NameProblem | null; // null: the text is not meant as such a name at all
    /**
     * True when `source` is a shape of its own (“a … space”) rather than any text: where two phrases explain a line
     * equally well, the one whose name has this shape is the one meant.
     */
    narrow?: boolean;
  };
}
