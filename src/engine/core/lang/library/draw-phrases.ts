import { cardById, type GameState } from '../../game-state';
import { pieceAt, setLastDrawn } from '../board-state';
import { cardName, saysOf } from '../card-facts';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import type { CompiledGame, EffectFn, ZoneRef } from '../types';
import { relocate, toBottom, topCard, zoneIdFor, zoneInfo } from '../zones';
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

/** The sentences of a card that is drawn and does what it says: drawing it, and keeping it instead of putting it back. */
export function registerDrawPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .effect('they draw from {zone} and do what it says', theyDraw, { needsPlayer: true })
    .effect('they keep this card in their {perzone}', theyKeep, { needsPlayer: true, needsDrawnCard: true });
}
