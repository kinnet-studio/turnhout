import type { GameState } from '../game-state';
import type { CardState } from '../scene';
import type { Json } from '../table-def';
import { isSaysColumn, parseTextFaceKey, textFaceKey } from './cards';
import type { CompiledGame } from './types';

// A fact on a card lives in the card's own `data`, next to the columns of its table. A text card's face is built from
// those columns and the facts that are set, so a change shows on the card and a saved game never loses it.

/** What a card says about itself under this name: a column of its table or a fact; null when it has no such thing. */
export function cardFact(card: CardState, fact: string): Json | null {
  return (card.data?.[fact] ?? null) as Json | null;
}

/**
 * What a card has under a name a rule reads as one of its numbers: a column of its table, or a count the game declares on
 * cards. A declared count starts at 0, so a card nothing has changed it on has 0 of it; null when the card has no such thing.
 */
export function cardAttribute(card: CardState, name: string, game: CompiledGame): Json | null {
  const value = cardFact(card, name);
  if (value !== null) return value;
  return game.facts.some((fact) => fact.on === 'card' && fact.kind === 'number' && fact.name === name) ? 0 : null;
}

/** The columns of the game's tables in table order, found the way a card's identity names them; a standard deck has none. */
function tableColumns(game: CompiledGame): string[] {
  const columns = game.cards.filter((set) => set.kind !== 'standard').flatMap((set) => set.identities.flatMap((i) => Object.keys(i.attrs)));
  return [...new Set(columns)];
}

/** What the card's says column holds, as text; null for a card that has no such column. */
export function saysOf(card: CardState): string | null {
  const column = Object.keys(card.data ?? {}).find(isSaysColumn);
  return column === undefined ? null : String(card.data?.[column]);
}

/**
 * The card as the page names it: the values of the table's columns that it has, in table order, without what it says. A
 * card of a standard deck has no table, so its face key names it.
 */
export function cardName(card: CardState, game: CompiledGame): string {
  const parts = tableColumns(game).filter((column) => !isSaysColumn(column)).flatMap((column) => {
    const value = card.data?.[column] as Json | undefined;
    return value === undefined ? [] : [String(value)];
  });
  return parts.length === 0 ? card.faceKey : parts.join(' ');
}

/** A card by its name, the way its face is labelled, else as the page names any card: as a button that picks it or a rule's message names it. */
export function pickName(card: CardState, game: CompiledGame): string {
  const named = card.data?.name;
  return typeof named === 'string' || typeof named === 'number' ? String(named) : cardName(card, game);
}

/**
 * How a fact that is set shows on a card's face: a flag that is true says `yes` and a number that is not 0 says its
 * value. A flag that is false, a number of 0 and a fact never set leave the face as it was.
 */
function shownFact(kind: 'number' | 'flag', value: Json | undefined): Json | null {
  if (kind === 'flag') return value === true ? 'yes' : null;
  return typeof value === 'number' && value !== 0 ? value : null;
}

/**
 * The face key the card should have now. A text card shows its table columns, as they are now and in table order, then
 * the card facts that are set in the order the game declares them. Any other card (a standard deck's) keeps its face
 * key. Whatever else is in `data` (who moved the card, a position) is bookkeeping and is never on a face.
 */
export function faceKeyOf(card: CardState, game: CompiledGame): string {
  if (parseTextFaceKey(card.faceKey) === null) return card.faceKey;
  const face: { [k: string]: Json } = {};
  for (const column of tableColumns(game)) {
    const value = card.data?.[column] as Json | undefined;
    if (value !== undefined) face[column] = value;
  }
  for (const { name, on, kind } of game.facts) {
    const shown = on === 'card' ? shownFact(kind, card.data?.[name] as Json | undefined) : null;
    if (shown !== null) face[name] = shown;
  }
  return textFaceKey(face);
}

/** Merges `data` into the card's own, a null deleting its key, and refreshes the face key to match. */
export function changeCard(state: GameState, cardId: string, data: { [k: string]: Json | null }, game: CompiledGame): GameState {
  const card = state.cards.find((c) => c.id === cardId);
  if (!card) throw new Error(`No card ${cardId} to change.`);
  const merged: { [k: string]: unknown } = { ...card.data };
  for (const [key, value] of Object.entries(data)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  const changed: CardState = { ...card, data: merged };
  changed.faceKey = faceKeyOf(changed, game);
  return { ...state, cards: state.cards.map((c) => (c.id === cardId ? changed : c)) };
}
