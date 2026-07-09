import type { CardState } from '@/engine/core/scene';

const SUITS = ['S', 'H', 'D', 'C'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'] as const;

export function standardDeck(): CardState[] {
  const cards: CardState[] = [];
  let n = 0;
  for (const s of SUITS) {
    RANKS.forEach((r, i) => {
      cards.push({ id: `c${n++}`, zoneId: 'deck', faceUp: false, faceKey: `${r}${s}`, data: { suit: s, rank: i + 1 } });
    });
  }
  return cards;
}
