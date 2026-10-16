// Places a game's zones around the table so each can be reached by dragging a card onto it.
// Designers never give coordinates; the seats sit on an ellipse and the shared zones line up in the middle.
import type { PlayerId } from '../scene';
import type { ZoneDef } from '../table-def';
import type { ZoneSpec } from './types';
import { zoneIdFor } from './zones';

const SEAT_RX = 380;
const SEAT_RY = 290;
/**
 * Where a seat's other zones sit, as a fraction of the way from the table centre to its hand. Further in and a
 * side seat's zones fall under the shared row (shared zones are tested first); further out and they cover the
 * cards of the top hand, whose fan curls toward the centre. 0.62 to 0.70 keeps Hearts reachable at 2 to 5 seats.
 */
const INNER_RADIUS = 0.66;
/**
 * A seat's row, where the seat is straight above or below the middle, sits nearer the middle than its piles. A row is a card
 * tall (140) and the hand's drop box reaches 75 above its seat and 103 below, so at INNER_RADIUS the bottom seat's row hides the
 * tops of its hand's cards and takes drops meant for the hand, and the top seat's does worse (its box is not turned over). At
 * 0.40 the row ends where the hand's box begins. What it gives up is a strip of 24 where it overlaps the shared piles in the
 * middle, which costs less than the hand: a pile still shows its top card and takes a drop at its centre. A seat at the side
 * has no such room, so its rows stay where its piles go.
 */
const ROW_RADIUS = 0.4;
/** Distance between a seat's other zones, along the edge of the table. */
const ZONE_SPREAD = 120;

// The fan's drop box, measured from computeZoneLayout for 13 cards (see the Hearts table in pages/hearts-demo).
const HAND_FAN = { fanAngleDeg: 48, fanRadius: 200 };
export const HAND_BOUNDS = { width: 312, height: 178, anchor: { x: 0.5, y: 0.423 } };

const SHARED_GAP = 20;
const SHARED_WIDTH = { pile: 120, row: 330, hand: HAND_BOUNDS.width } as const;

type Point = { x: number; y: number };

/** Whole numbers keep the table readable; `+ 0` turns -0 into 0. */
const snap = (n: number) => Math.round(n) + 0;

/** One zone of the table at a place; the fitted layout reuses it so both give a zone the same kind and visibility. */
export function zoneDef(spec: ZoneSpec, id: string, at: Point, owner: PlayerId | 'shared'): ZoneDef {
  const base = { id, transform: { x: snap(at.x), y: snap(at.y) }, owner, visibility: spec.visibility };
  switch (spec.layout) {
    case 'hand':
      return { ...base, layout: 'fan', layoutOptions: { ...HAND_FAN }, bounds: { ...HAND_BOUNDS, anchor: { ...HAND_BOUNDS.anchor } }, ordering: 'free' };
    case 'row':
      return { ...base, layout: 'row', layoutOptions: { spacing: 75 }, ordering: 'ordered' };
    case 'pile':
      return { ...base, layout: 'pile', ordering: 'stack' };
  }
}

/**
 * Turns zone specs into placed zone defs for the given seats. Seat 0 sits at the bottom and the rest
 * follow clockwise on screen. The order of the result is part of the contract: `resolveDrop` tests zones
 * from the end, so hands come first (their drop boxes are large), then each seat's other zones, then the
 * shared zones, which are the ones in the middle of the table.
 */
export function autoLayout(zones: ZoneSpec[], seats: PlayerId[]): ZoneDef[] {
  const perSeat = zones.filter((z) => z.perPlayer);
  const hands = perSeat.filter((z) => z.layout === 'hand');
  const others = perSeat.filter((z) => z.layout !== 'hand');
  const shared = zones.filter((z) => !z.perPlayer);

  const anchors = seats.map((seat, i) => {
    const theta = Math.PI / 2 + (2 * Math.PI * i) / seats.length;
    return { seat, theta, at: { x: SEAT_RX * Math.cos(theta), y: SEAT_RY * Math.sin(theta) } };
  });

  const out: ZoneDef[] = [];
  for (const spec of hands) {
    for (const { seat, at } of anchors) out.push(zoneDef(spec, zoneIdFor(spec.name, seat), at, seat));
  }
  for (const { seat, theta, at } of anchors) {
    const tangent = { x: -Math.sin(theta), y: Math.cos(theta) };
    others.forEach((spec, i) => {
      const along = (i - (others.length - 1) / 2) * ZONE_SPREAD;
      const radius = spec.layout === 'row' && Math.abs(at.x) < 1 ? ROW_RADIUS : INNER_RADIUS;
      const where = { x: at.x * radius + tangent.x * along, y: at.y * radius + tangent.y * along };
      out.push(zoneDef(spec, zoneIdFor(spec.name, seat), where, seat));
    });
  }

  const widths = shared.map((spec) => SHARED_WIDTH[spec.layout]);
  let left = -(widths.reduce((sum, w) => sum + w, 0) + SHARED_GAP * Math.max(shared.length - 1, 0)) / 2;
  shared.forEach((spec, i) => {
    out.push(zoneDef(spec, zoneIdFor(spec.name), { x: left + widths[i] / 2, y: 0 }, 'shared'));
    left += widths[i] + SHARED_GAP;
  });
  return out;
}
