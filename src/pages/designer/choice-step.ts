// Asking a press's choices one at a time, from what the seat's view lists for it: which choices the press asks, which one to ask next,
// the move's `choices` once every one is answered, and the question as the page puts it.
import type { ActionView, ChoiceView } from '@/engine/core/lang/board-view';
import type { CardState } from '@/engine/core/scene';
import type { PickChosen } from './card-pick';

/** The answers given so far, by the choice's `at`. */
export type Answers = { [at: number]: string };
/** A press waiting on its choices: the button, what it picked (null for a button that picks nothing), and the answers so far. */
export type Asking = { move: string; chosen: PickChosen | null; answers: Answers };

/**
 * The choices the view lists for this press: on the button (picks nothing), on the card picked, or on the card's entry for its target;
 * none for a set, whose press the view never lists choices for, and none for a card or a target the view no longer lists.
 */
export function choicesFor(action: ActionView | undefined, chosen: PickChosen | null): ChoiceView[] {
  if (action === undefined) return [];
  if (chosen === null) return action.choices ?? [];
  if (!('cardId' in chosen)) return [];
  const { cardId, onto } = chosen;
  const pick = action.cards;
  if (pick === undefined) return [];
  if (onto !== undefined) return pick.onto?.targets[cardId]?.find((target) => target.id === onto)?.choices ?? [];
  return pick.cards.find((card) => card.id === cardId)?.choices ?? [];
}

/**
 * The answer given to a choice, while the view still lists it among the choice's options: the view can change under an open question
 * (an Undo), and an answer it no longer lists is no answer, so that choice is asked again, or filled in, rather than sent and refused.
 */
function answerTo(choice: ChoiceView, answers: Answers): string | undefined {
  const answer = answers[choice.at];
  return choice.options.some((option) => option.value === answer) ? answer : undefined;
}

/**
 * The first choice still to answer, in `at` order: one with more than one option and no answer. Null when none is left. A choice
 * with one option is never asked: the press sends that option.
 */
export function nextChoice(choices: ChoiceView[], answers: Answers): ChoiceView | null {
  const inOrder = [...choices].sort((a, b) => a.at - b.at);
  return inOrder.find((choice) => choice.options.length > 1 && answerTo(choice, answers) === undefined) ?? null;
}

/**
 * The press's `choices`: at each listed choice's `at`, its answer or else its only option; null at every other place, which the
 * engine reads as a choice it does not ask.
 */
export function choicesOfPress(choices: ChoiceView[], answers: Answers): (string | null)[] {
  const named: (string | null)[] = Array.from({ length: Math.max(0, ...choices.map((choice) => choice.at + 1)) }, () => null);
  for (const choice of choices) {
    const only = choice.options.length === 1 ? choice.options[0].value : null;
    named[choice.at] = answerTo(choice, answers) ?? only;
  }
  return named;
}

/**
 * `{column} {value}` of the card a choice compares, when it shows that column with a value; else null. The card is the seat's own
 * sight of it, so a face-down card, whose data the seat is not given, says nothing.
 */
export function aboutOf(column: string | null, card: CardState | undefined): string | null {
  if (column === null || card === undefined) return null;
  const value = card.data?.[column];
  if (typeof value === 'number' || (typeof value === 'string' && value !== '')) return `${column} ${value}`;
  return null;
}

/**
 * The prompt up to its first ': ' (else without its final period), with ` ({about})` after it when given: “Pick who to pay the fee
 * to (wants clay)”. The options the prompt lists are the buttons under it.
 */
export function questionOf(choice: ChoiceView, about: string | null): string {
  const colon = choice.prompt.indexOf(': ');
  const asked = colon >= 0 ? choice.prompt.slice(0, colon) : choice.prompt.replace(/\.$/, '');
  return about === null ? asked : `${asked} (${about})`;
}
