import { cardById, zoneCards, type GameState } from '../../game-state';
import { pieceAt, setLastDrawn } from '../board-state';
import { cardName, saysOf } from '../card-facts';
import { deckOf } from '../cards';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import type { CardMatch, CompiledGame, ConditionFn, EffectFn, PhraseEnv, ZoneRef } from '../types';
import { matchesCard, relocate, toBottom, topCard, zoneIdFor, zoneInfo } from '../zones';
import { describeCard } from './example-phrases';
import { cardOf, describeZone, soleZone, theyOf } from './support';

/** A pile as the page says it, with its owner: “the lucky pile” for a shared one, “p1's deck” for a seat's. */
function pileAsSaid(game: CompiledGame, pileId: string): string {
  const info = zoneInfo(game, pileId);
  if (!info) return pileId;
  return info.seat === null ? `the ${info.spec.name}` : `${info.seat}'s ${info.spec.name}`;
}

const turnOver = (state: GameState, cardId: string, faceUp: boolean): GameState => ({
  ...state,
  cards: state.cards.map((c) => (c.id === cardId ? { ...c, faceUp } : c)),
});

/**
 * Takes the top card of a pile, puts it at the bottom and does what it says, for the player drawing it. The card is at the
 * bottom, face up, while its sentences run, so a card that draws a card takes the next one and never itself again; "it" in a
 * sentence is the space the player's piece is on at that moment. A card that is still in the pile when it has been read goes
 * back face down; one that a sentence kept has left the pile and stays as the zone it went to has it.
 */
const theyDraw: EffectFn = (env, [zone]) => {
  const ref = zone as ZoneRef;
  if (!env.runLine) throw new Error('This phrase needs to run what a card says, but nothing is listening.');
  const they = theyOf(env);
  const pile = soleZone(ref, env);
  const card = topCard(env.state, pile);
  if (!card) throw new RuleError(`There is no card to draw in ${describeZone(ref)}.`);
  // A card never silently does nothing: one with nothing to run is a deck that was never given a says column.
  const says = saysOf(card);
  if (says === null || !Object.hasOwn(env.game.says, says)) {
    throw new RuleError(`The card drawn from ${describeZone(ref)} says nothing to do: its deck has no says column.`);
  }
  let s = setLastDrawn(env.state, { seat: they, zone: pileAsSaid(env.game, pile), name: cardName(card, env.game), says });
  s = turnOver(toBottom(s, card.id, pile, env.game), card.id, true);
  for (const line of env.game.says[says]) {
    s = env.runLine(s, line, { player: they, space: pieceAt(s, they), card: card.id });
  }
  return cardById(s, card.id)?.zoneId === pile ? turnOver(s, card.id, false) : s;
};

/** The card that was just drawn goes to the player's own zone, face up when that zone is one everyone can see. */
const theyKeep: EffectFn = (env, [zone]) => relocate(env.state, [cardOf(env)], zoneIdFor(zone as string, theyOf(env)), env.game);

/** The cards in their own zone of that name that are the named card, in slot order. */
const matchingKept = (env: PhraseEnv, zone: string, match: CardMatch) =>
  zoneCards(env.state, zoneIdFor(zone, theyOf(env))).filter((card) => matchesCard(card, match));

/** Whether they have a card of that kind in their zone of that name. */
const theyHaveKept: ConditionFn = (env, [zone, match]) => matchingKept(env, zone as string, match as CardMatch).length > 0;

/**
 * Puts their first matching card, in slot order, at the bottom of the pile of the deck it came from: a card has one deck for
 * good, whatever its name is and wherever it was kept, so two cards of one name each go back where they began.
 */
const keptGoesBack: EffectFn = (env, [match, zone]) => {
  const [found] = matchingKept(env, zone as string, match as CardMatch);
  if (!found) {
    const what = describeCard(match as CardMatch).replace(/^(?:an?|the) /, '');
    throw new RuleError(`There is no ${what} in their ${zone}.`);
  }
  const deck = deckOf(env.game.cards, found.id);
  if (!deck) throw new Error(`The card ${found.id} came from no deck.`);
  return toBottom(env.state, found.id, zoneIdFor(deck.start), env.game);
};

/** The sentences of a card that is drawn and does what it says, keeping it instead of putting it back, and using a card kept. */
export function registerDrawPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('their {perzone} has {card}', theyHaveKept, { needsPlayer: true })
    // A zone named in the plural reads better with “have”: “their kept cards have a Free Pass”.
    .condition('their {perzone} have {card}', theyHaveKept, { needsPlayer: true })
    .effect('they draw from {zone} and do what it says', theyDraw, { needsPlayer: true })
    .effect('they keep this card in their {perzone}', theyKeep, { needsPlayer: true, needsDrawnCard: true })
    .effect('{card} from their {perzone} goes to the bottom of the pile it came from', keptGoesBack, { needsPlayer: true });
}
