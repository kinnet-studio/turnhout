import type { PlayerId, CardState } from '@/engine/core/scene';
import type { TableDef } from '@/engine/core/table-def';
import { shuffleWithRng, type RngState } from '@/engine/core/rng';

export const SEATS: PlayerId[] = ['p0', 'p1', 'p2', 'p3'];

/**
 * Ids c0..c51 are only opaque if the id→(suit,rank) assignment is private: the
 * identity list is shuffled with the server's seeded rng before ids are assigned,
 * so clients cannot derive hidden cards from source order (SP3 invariant). The
 * mapping is deterministic per seed — replay-safe.
 */
export function heartsDeck(rng: RngState): { cards: CardState[]; rng: RngState } {
  const suits = ['S', 'H', 'D', 'C'];
  const identities: { suit: string; rank: number }[] = [];
  for (const s of suits) for (let r = 1; r <= 13; r++) identities.push({ suit: s, rank: r });
  const { items, rng: next } = shuffleWithRng(identities, rng);
  return {
    cards: items.map(({ suit, rank }, i) => ({
      id: `c${i}`, zoneId: 'deck', faceUp: false, faceKey: `${rank}${suit}`, data: { suit, rank },
    })),
    rng: next,
  };
}

const hand = (seat: PlayerId, x: number, y: number) =>
  ({ id: `hand-${seat}`, layout: 'fan', transform: { x, y }, layoutOptions: { fanAngleDeg: 48 }, owner: seat, visibility: 'owner', ordering: 'free' }) as const;
const pile = (id: string, x: number, y: number, visibility: 'public' | 'owner' | 'secret', owner?: PlayerId) =>
  ({ id, layout: 'pile', transform: { x, y }, visibility, ...(owner ? { owner } : {}) }) as const;

export const TABLE: TableDef = {
  players: SEATS,
  zones: [
    pile('deck', 0, 0, 'secret'),
    hand('p0', 0, 300),
    hand('p1', -350, 0),
    hand('p2', 0, -300),
    hand('p3', 350, 0),
    // `trick` is listed AFTER the hands so resolveDrop (which walks zones in
    // reverse) tests it before the hand fans. Each hand's auto-bounds (a fat
    // rectangle enclosing its rotated 13-card fan) engulfs the centered trick
    // box; without this ordering the fans permanently shadow `trick` and no
    // drop can ever reach it. Listing it here also raises its render z, which
    // is correct for a center pile drawn over the table. (pass-*/won-* stay
    // after `trick` so their small boxes keep priority over it.)
    { id: 'trick', layout: 'row', transform: { x: -110, y: 0 }, layoutOptions: { spacing: 75 }, visibility: 'public' },
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
