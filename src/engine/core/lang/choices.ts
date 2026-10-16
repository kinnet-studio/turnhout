import type { GameState } from '../game-state';
import { playersIn } from './board-state';
import { joinOr, secondPersonWords } from './refs';
import type { LangRuntime } from './runtime';
import type { CondGroup, DeclaredAction, MoveInfo, PhraseRef, Subject } from './types';

/**
 * A `Then:` line that pays, or does something else to, a player the presser picks among those who qualify. Its args are its place among
 * the button's choices, its `Only if` groups (when it is asked at all), the clause a player must meet, said of “they”, and the effect
 * that is run about the player picked, as “that player”.
 */
export const CHOOSE_PLAYER = 'choose player';
/** A `Then:` block whose press chooses one of its options. */
export const CHOOSE_ONE = 'choose one';

/** A choice a press asks: `at` its place among the button's choices, `prompt` what to ask, `options` the seats or labels that answer it, in order. */
export type AskedChoice = { at: number; kind: 'player' | 'option'; prompt: string; options: string[] };

const isChoice = (ref: PhraseRef): boolean => ref.kind === 'lang' && (ref.phrase === CHOOSE_PLAYER || ref.phrase === CHOOSE_ONE);

/** The button's choice refs, top-level `Then:` lines, in order of `at`. */
export function choicesOf(action: DeclaredAction): PhraseRef[] {
  // The compiler numbers them in the order the lines are written, and a choice is never inside another line.
  return action.effects.filter(isChoice);
}

const THEY = /^they /i;
const TO_THAT_PLAYER = / to that player$/i;

/** What a choice of a player asks: “Pick who to pay the fee to: p1 or p2.”, in the words of its effect, said to the presser. */
function pickPrompt(effect: PhraseRef, options: string[]): string {
  const doing = secondPersonWords(effect.text.replace(THEY, '').replace(TO_THAT_PLAYER, ''));
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
 * The choices a press asks, judged on `state` about the press: each choice whose guard holds and that has a candidate, in order.
 * A player choice's candidates are the seats still in, other than the presser, in seat order, for which `who` holds about them
 * (`{ ...subject, player: seat }`, with the press's `info`).
 */
export function askChoices(runtime: LangRuntime, action: DeclaredAction, state: GameState, info: MoveInfo | undefined, subject: Subject): AskedChoice[] {
  return choicesOf(action).flatMap((ref) => {
    const asked = ref.phrase === CHOOSE_PLAYER ? askPlayer(runtime, ref, state, info, subject) : null;
    return asked === null ? [] : [asked];
  });
}

/** What a press whose choices are no list names for each of them: a value no choice is answered by. */
const NOT_A_LIST = Symbol('choices that are no list');

/** The option a named value answers a choice with: a player is matched exactly, and anything but text answers nothing. */
const answerOf = (choice: AskedChoice, value: unknown): string | undefined =>
  (typeof value === 'string' ? choice.options.find((option) => option === value) : undefined);

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
