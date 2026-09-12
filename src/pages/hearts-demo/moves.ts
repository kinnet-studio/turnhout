import { cardById, zoneCards, type GameState } from '@/engine/core/game-state';
import type { MoveHandler } from '@/engine/core/moves';
import type { Json } from '@/engine/core/table-def';

export interface TrickPlay {
  cardId: string;
  by: string;
  suit: string;
  rank: number;
}

export function trickPlays(state: GameState): TrickPlay[] {
  return (state.data.trickPlays as unknown as TrickPlay[] | undefined) ?? [];
}

/** Play one card from your hand to the trick. Flow gates phase/turn; this checks card-level legality. */
export const play: MoveHandler = {
  legal(state, m) {
    const by = m.by as string | undefined;
    if (!by) return 'play requires an actor';
    const card = cardById(state, m.cardId as string);
    if (!card) return `unknown card: ${m.cardId as string}`;
    if (card.zoneId !== `hand-${by}`) return 'not your card';
    const suit = card.data?.suit as string;
    const hand = zoneCards(state, `hand-${by}`);
    const plays = trickPlays(state);
    if (plays.length === 0) {
      const onlyHearts = hand.every((c) => c.data?.suit === 'H');
      if (suit === 'H' && state.data.heartsBroken !== true && !onlyHearts) return 'hearts not broken';
    } else {
      const leadSuit = plays[0].suit;
      const canFollow = hand.some((c) => c.data?.suit === leadSuit);
      if (canFollow && suit !== leadSuit) return `must follow ${leadSuit}`;
    }
    return true;
  },
  apply(state, m) {
    const by = m.by as string;
    const card = cardById(state, m.cardId as string)!;
    const suit = card.data?.suit as string;
    const rank = card.data?.rank as number;
    const plays = [...trickPlays(state), { cardId: card.id, by, suit, rank }];
    return {
      ...state,
      data: {
        ...state.data,
        trickPlays: plays as unknown as Json,
        ...(suit === 'H' ? { heartsBroken: true } : {}),
      },
      cards: state.cards.map((c) =>
        c.id === card.id ? { ...c, zoneId: 'trick', slot: plays.length - 1, faceUp: true } : c,
      ),
    };
  },
};

/** Pass one card to your own pass pile (three per seat during the passing phase). */
export const pass: MoveHandler = {
  legal(state, m) {
    const by = m.by as string | undefined;
    if (!by) return 'pass requires an actor';
    const card = cardById(state, m.cardId as string);
    if (!card) return `unknown card: ${m.cardId as string}`;
    if (card.zoneId !== `hand-${by}`) return 'not your card';
    if (zoneCards(state, `pass-${by}`).length >= 3) return 'already passed 3 cards';
    return true;
  },
  apply(state, m) {
    const by = m.by as string;
    const n = zoneCards(state, `pass-${by}`).length;
    return {
      ...state,
      cards: state.cards.map((c) => (c.id === (m.cardId as string) ? { ...c, zoneId: `pass-${by}`, slot: n } : c)),
    };
  },
};
