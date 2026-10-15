import type { GameState } from '../game-state';
import type { Move } from '../moves';
import type { PlayerId } from '../scene';
import type { Json } from '../table-def';

export type PhraseKind =
  | 'cards' | 'zone' | 'board' | 'condition' | 'effect' | 'turn' | 'who' | 'score' | 'winner' | 'moment' | 'given' | 'action' | 'expect';
/** kind 'lang' = compiler built-ins: all | any | phase | always | if | missing */
export type PhraseRef = { kind: PhraseKind | 'lang'; phrase: string; args: Json[]; line: number; text: string };
export type SeatRef = { seat: string } | { who: 'actor' | 'winner' };
export type ZoneRef = { shared: string } | { each: string } | { of: SeatRef; zone: string };
export type CardMatch = { [attr: string]: Json };
export type ZoneSpec = { name: string; perPlayer: boolean; layout: 'pile' | 'row' | 'hand'; visibility: 'secret' | 'owner' | 'public' };
export type CardIdentity = { attrs: { [k: string]: Json }; faceKey: string };
export type CardSetSpec = { kind: 'standard' | 'table'; identities: CardIdentity[]; start: string; acesHigh: boolean };
export type CardTable = { columns: string[]; rows: { cells: string[]; line: number }[] };
export type CondGroup = { mode: 'all' | 'any'; refs: PhraseRef[]; text: string; line: number };
export type DeclaredMove = { verb: string; from: ZoneRef; to: ZoneRef; fromText: string; conditions: CondGroup[]; effects: PhraseRef[]; line: number };
/** One row of a board's table: `attrs` holds every column but `space`, blank cells left out. */
export type SpaceSpec = { name: string; attrs: { [k: string]: Json } };
export type CounterSpec = { name: string; start: number; visibility: 'public' | 'owner' };
export type BoardSpec = {
  spaces: SpaceSpec[]; pieces: { start: number } | null; counters: CounterSpec[]; dice: { count: number; sides: number } | null;
  payWith: string | null;
};
/** What one line of a Board: section says; the compiler folds the parts into a BoardSpec. */
export type BoardPart =
  | { kind: 'loop'; spaces: SpaceSpec[] }
  | { kind: 'pieces'; start: number }
  | { kind: 'counter'; counter: CounterSpec }
  | { kind: 'dice'; count: number; sides: number }
  | { kind: 'pay-with'; counter: string };
/** A group of spaces named by one of their attributes, like every space whose kind is street. */
export type SpaceClass = { attribute: string; values: Json[] };
/** `words` is the lowercase text after "a player may" ('roll the dice'); `label` is the button text ('Roll the dice'). */
export type DeclaredAction = { verb: string; words: string; label: string; conditions: CondGroup[]; effects: PhraseRef[]; line: number };
export type CompiledMoment = { line: number; text: string; when: PhraseRef; conditions: CondGroup[]; effects: PhraseRef[] };
export type CompiledTrigger = { line: number; text: string; when: PhraseRef; conditions: CondGroup[]; effects: PhraseRef[] };
export type CompiledPhase = {
  id: string; line: number; hint: string | null; actor: 'current' | 'any'; rearrange: string[];
  moves: DeclaredMove[]; onEnter: PhraseRef[]; goTo: { when: PhraseRef; to: string; line: number } | null;
  triggers: CompiledTrigger[]; after: { verbs: string[]; next: PhraseRef; line: number } | null;
  actions: DeclaredAction[]; moments: CompiledMoment[];
};
export type CompiledEnd = { line: number; when: PhraseRef; scores: PhraseRef[]; winner: PhraseRef };
export type ExampleStep = { keyword: 'given' | 'when' | 'then'; ref: PhraseRef };
export type CompiledExample = { name: string; line: number; players: number | null; steps: ExampleStep[] };
export type CompiledGame = {
  name: string; players: { min: number; max: number }; zones: ZoneSpec[]; cards: CardSetSpec[];
  setup: PhraseRef[]; phases: CompiledPhase[]; end: CompiledEnd | null; examples: CompiledExample[];
  board: BoardSpec | null;
};
export type Vocab = {
  sharedZones: string[]; playerZones: string[]; maxPlayers: number; phases: string[]; verbs: string[];
  attributes: string[]; cardValues: { attribute: string; value: Json }[]; standardDeck: boolean;
  /** Space names in loop order, duplicates kept. */
  spaces: string[]; spaceAttributes: string[];
  /** The text cells of the board's table, not the numbers. */
  spaceValues: { attribute: string; value: string }[];
  counters: string[]; payWith: string | null; actions: { verb: string; words: string }[];
};
/** Who and which space a phrase is about, when a rule is about a player's piece or a space. */
export type Subject = { player: PlayerId | null; space: number | null };
/** A piece passing over or landing on a space. */
export type Moment = { kind: 'pass' | 'land'; seat: PlayerId; space: number };
export interface MoveInfo { verb: string; by: PlayerId; cardId: string; from: string; to: string }
export interface ExampleEnv {
  last: { ok: boolean; reason?: string } | null;
  claim(match: CardMatch, text: string, state: GameState): string;   // returns a card id
  setUp(state: GameState): GameState;
}
export interface PhraseEnv {
  state: GameState; game: CompiledGame; seats: PlayerId[]; move?: MoveInfo;
  check(state: GameState, move: Move): true | string;
  example?: ExampleEnv;
  subject?: Subject;
  /** Runs the lands-on and passes rules for a moment; the runtime supplies it. */
  announce?: (state: GameState, moment: Moment) => GameState;
}
export type ConditionFn = (env: PhraseEnv, args: Json[]) => boolean;
export type EffectFn = (env: PhraseEnv, args: Json[]) => GameState;   // also 'given'
export type TurnFn = (env: PhraseEnv, args: Json[]) => PlayerId;
export type WhoFn = (env: PhraseEnv, args: Json[]) => PlayerId[];
export type ScoreFn = (env: PhraseEnv, args: Json[], seat: PlayerId) => number;
export type WinnerFn = (env: PhraseEnv, args: Json[], scores: Record<PlayerId, number>) => PlayerId;
export type MomentFn = (env: PhraseEnv, args: Json[], moment: Moment) => boolean;
export type ActionFn = (env: PhraseEnv, args: Json[]) => { by: PlayerId; move: Move };
export type ExpectFn = (env: PhraseEnv, args: Json[]) => true | string;
export type CardsFn = (args: Json[], table: CardTable | null) => CardSetSpec;
export type ZoneFn = (args: Json[]) => ZoneSpec;
export type BoardFn = (args: Json[], table: CardTable | null) => BoardPart;
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
  };
}
