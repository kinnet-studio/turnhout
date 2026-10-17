import type { GameState } from '../game-state';
import type { Json } from '../table-def';
import { playersIn } from './board-state';
import { canon, joinOr, secondPersonWords } from './refs';
import type { LangRuntime } from './runtime';
import type { CondGroup, DeclaredAction, MoveInfo, PhraseRef, Subject } from './types';

/**
 * A `Then:` line that pays, or does something else to, a player the presser picks among those who qualify. Its args are its place among
 * the button's choices, its `Only if` groups (when it is asked at all), the clause a player must meet, said of “they”, and the effect
 * that is run about the player picked, as “that player”.
 */
export const CHOOSE_PLAYER = 'choose player';
/**
 * A `Then:` block whose press chooses one of its options: “They choose one:”, with a line ending in “:” for each option. Its args are its
 * place among the button's choices, its `Only if` groups (when it is asked at all) and its options, in the order written.
 */
export const CHOOSE_ONE = 'choose one';

/** One option of a block: its label as written, without its colon, the `Only if` groups that must hold for it, and the lines it runs. */
export type ChoiceOption = { label: string; conditions: CondGroup[]; effects: PhraseRef[] };

/** A choice a press asks: `at` its place among the button's choices, `prompt` what to ask, `options` the seats or labels that answer it, in order. */
export type AskedChoice = { at: number; kind: 'player' | 'option'; prompt: string; options: string[] };

const isChoice = (ref: PhraseRef): boolean => ref.kind === 'lang' && (ref.phrase === CHOOSE_PLAYER || ref.phrase === CHOOSE_ONE);

/** The button's choice refs, top-level `Then:` lines, in order of `at`. */
export function choicesOf(action: DeclaredAction): PhraseRef[] {
  // The compiler numbers them in the order the lines are written, and a choice is never inside another line.
  return action.effects.filter(isChoice);
}

/** The column of the press's card a test in `value` compares with, the first found: “whose mark is the card's wants” compares `wants`. */
function columnCompared(value: Json): string | null {
  if (Array.isArray(value)) {
    for (const part of value) {
      const found = columnCompared(part);
      if (found !== null) return found;
    }
    return null;
  }
  if (value === null || typeof value !== 'object') return null;
  const { sameAs } = value;
  const ofTheCard = sameAs !== null && typeof sameAs === 'object' && !Array.isArray(sameAs) && sameAs.of === 'the card';
  if (ofTheCard && typeof sameAs.attribute === 'string') return sameAs.attribute;
  return columnCompared(Object.values(value));
}

/**
 * The column of the press's card that the player choice at `at` compares, so a page can say which value the choice is about: the
 * first test in its clause that compares with “the card's” value, wherever the clause holds it. Null for a block of options, for a
 * clause that compares a value written out or no column of the card, and for a place with no choice.
 */
export function comparedColumn(action: DeclaredAction, at: number): string | null {
  const ref = choicesOf(action).find((choice) => choice.args[0] === at);
  if (ref === undefined || ref.phrase !== CHOOSE_PLAYER) return null;
  const [, , who] = ref.args as [number, CondGroup[], PhraseRef, PhraseRef];
  return columnCompared(who.args);
}

const THEY = /^they /i;
const TO_THAT_PLAYER = / to that player$/i;

/**
 * What a choice of a player asks: “Pick who to pay the fee to: p1 or p2.”, in the words of its effect, said to the presser. The line's
 * first letter is said in lower case, wherever it starts: “Pay 1 coin to that player” asks “Pick who to pay 1 coin to: …”.
 */
function pickPrompt(effect: PhraseRef, options: string[]): string {
  const said = effect.text.charAt(0).toLowerCase() + effect.text.slice(1);
  const doing = secondPersonWords(said.replace(THEY, '').replace(TO_THAT_PLAYER, ''));
  return `Pick who to ${doing} to: ${joinOr(options)}.`;
}

/**
 * A choice of a player, as the press asks it, or null when it does not: its guard fails, or no one qualifies. The clause is judged about
 * each candidate as if they made the move, the card of the press still the one moved, so that “their workshop” is the candidate's.
 */
function askPlayer(runtime: LangRuntime, ref: PhraseRef, state: GameState, info: MoveInfo | undefined, subject: Subject): AskedChoice | null {
  const [at, guard, who, effect] = ref.args as [number, CondGroup[], PhraseRef, PhraseRef];
  if (runtime.failedGroup(guard, state, info, subject) !== null) return null;
  const qualifies = (seat: string) => runtime.test(who, state, info && { ...info, by: seat }, undefined, { ...subject, player: seat });
  const options = playersIn(state, runtime.seats).filter((seat) => seat !== subject.player && qualifies(seat));
  return options.length === 0 ? null : { at, kind: 'player', prompt: pickPrompt(effect, options), options };
}

/**
 * A block of options, as the press asks it, or null when it does not: its guard fails, or none of its options holds. Its options are
 * those whose `Only if` lines all hold, in the order written, each asked by its label as written.
 */
function askOption(runtime: LangRuntime, ref: PhraseRef, state: GameState, info: MoveInfo | undefined, subject: Subject): AskedChoice | null {
  const [at, guard, options] = ref.args as [number, CondGroup[], ChoiceOption[]];
  const holds = (groups: CondGroup[]) => runtime.failedGroup(groups, state, info, subject) === null;
  if (!holds(guard)) return null;
  const labels = options.filter((option) => holds(option.conditions)).map((option) => option.label);
  return labels.length === 0 ? null : { at, kind: 'option', prompt: `Choose one: ${joinOr(labels)}.`, options: labels };
}

/**
 * The choices a press asks, judged on `state` about the press: each choice whose guard holds and that has a candidate or an option
 * that holds, in order. Every guard, and every option's `Only if` lines, are judged about the press itself, with its `info` and
 * `subject`. A player choice's candidates are the seats still in, other than the presser, in seat order, for which `who` holds about
 * them as the move's player: with the press's `info` made by that seat (`{ ...info, by: seat }`) and the subject
 * `{ ...subject, player: seat }`, the card of the press unchanged.
 */
export function askChoices(runtime: LangRuntime, action: DeclaredAction, state: GameState, info: MoveInfo | undefined, subject: Subject): AskedChoice[] {
  return choicesOf(action).flatMap((ref) => {
    const ask = ref.phrase === CHOOSE_PLAYER ? askPlayer : askOption;
    const asked = ask(runtime, ref, state, info, subject);
    return asked === null ? [] : [asked];
  });
}

/** What a press whose choices are no list names for each of them: a value no choice is answered by. */
const NOT_A_LIST = Symbol('choices that are no list');

/**
 * The option a named value answers a choice with, as the choice has it: a player is matched exactly, a label whatever its case (as the
 * names of a game are), and anything but text answers nothing.
 */
function answerOf(choice: AskedChoice, value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const answers = choice.kind === 'option' ? (option: string) => canon(option) === canon(value) : (option: string) => option === value;
  return choice.options.find(answers);
}

/**
 * One entry per choice of the button (`count`), from what the press named (`given`, anything): a choice asked with one option is filled
 * in when it is named with nothing (no entry, or null); one named with a valid option takes it; one named with anything else, or asked with
 * several and named with nothing, refuses the press with its prompt. A choice not asked is null, whatever was named for it.
 */
export function fillChoices(asked: AskedChoice[], count: number, given: unknown): (string | null)[] | string {
  const named = (at: number): unknown => {
    if (Array.isArray(given)) return given[at] ?? null;
    return given === undefined || given === null ? null : NOT_A_LIST;
  };
  const filled: (string | null)[] = Array.from({ length: count }, () => null);
  for (const choice of asked) {
    const value = named(choice.at);
    const answer = value === null && choice.options.length === 1 ? choice.options[0] : answerOf(choice, value);
    if (answer === undefined) return choice.prompt;
    filled[choice.at] = answer;
  }
  return filled;
}
