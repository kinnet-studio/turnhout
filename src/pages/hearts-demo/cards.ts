import type { PlayerId, CardState } from '@/engine/core/scene';
import type { TableDef } from '@/engine/core/table-def';

export const SEATS: PlayerId[] = ['p0', 'p1', 'p2', 'p3'];

/** Opaque ids (c0..c51) — projection scrubs faceKey/data but preserves id (SP3 invariant). */
export function heartsDeck(): CardState[] {
  const suits = ['S', 'H', 'D', 'C'];
  const cards: CardState[] = [];
  let n = 0;
  for (const s of suits) {
    for (let r = 1; r <= 13; r++) {
      cards.push({ id: `c${n++}`, zoneId: 'deck', faceUp: false, faceKey: `${r}${s}`, data: { suit: s, rank: r } });
    }
  }
  return cards;
}

const hand = (seat: PlayerId, x: number, y: number) =>
  ({ id: `hand-${seat}`, layout: 'fan', transform: { x, y }, layoutOptions: { fanAngleDeg: 48 }, owner: seat, visibility: 'owner', ordering: 'free' }) as const;
const pile = (id: string, x: number, y: number, visibility: 'public' | 'owner' | 'secret', owner?: PlayerId) =>
  ({ id, layout: 'pile', transform: { x, y }, visibility, ...(owner ? { owner } : {}) }) as const;

export const TABLE: TableDef = {
  players: SEATS,
  zones: [
    pile('deck', 0, 0, 'secret'),
    { id: 'trick', layout: 'row', transform: { x: -110, y: 0 }, layoutOptions: { spacing: 75 }, visibility: 'public' },
    hand('p0', 0, 300),
    hand('p1', -350, 0),
    hand('p2', 0, -300),
    hand('p3', 350, 0),
    pile('pass-p0', 0, 170, 'owner', 'p0'),
    pile('pass-p1', -190, 0, 'owner', 'p1'),
    pile('pass-p2', 0, -170, 'owner', 'p2'),
    pile('pass-p3', 190, 0, 'owner', 'p3'),
    pile('won-p0', 300, 280, 'public'),
    pile('won-p1', -300, 280, 'public'),
    pile('won-p2', -300, -280, 'public'),
    pile('won-p3', 300, -280, 'public'),
  ],
};
