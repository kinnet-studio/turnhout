import type { CardState } from '@/engine/core/scene';

const SUITS = ['S', 'H', 'D', 'C'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'] as const;

export function standardDeck(): CardState[] {
  const cards: CardState[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      cards.push({ id: `${r}${s}`, zoneId: 'deck', faceUp: false, faceKey: `${r}${s}` });
    }
  }
  return cards;
}
