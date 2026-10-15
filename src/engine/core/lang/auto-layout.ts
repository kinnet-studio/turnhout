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
/** Distance between a seat's other zones, along the edge of the table. */
const ZONE_SPREAD = 120;

// The fan's drop box, measured from computeZoneLayout for 13 cards (see the Hearts table in pages/hearts-demo).
const HAND_FAN = { fanAngleDeg: 48, fanRadius: 200 };
const HAND_BOUNDS = { width: 312, height: 178, anchor: { x: 0.5, y: 0.423 } };

const SHARED_GAP = 20;
const SHARED_WIDTH = { pile: 120, row: 330, hand: HAND_BOUNDS.width } as const;

type Point = { x: number; y: number };

/** Whole numbers keep the table readable; `+ 0` turns -0 into 0. */
const snap = (n: number) => Math.round(n) + 0;

function def(spec: ZoneSpec, id: string, at: Point, owner: PlayerId | 'shared'): ZoneDef {
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
    for (const { seat, at } of anchors) out.push(def(spec, zoneIdFor(spec.name, seat), at, seat));
  }
  for (const { seat, theta, at } of anchors) {
    const tangent = { x: -Math.sin(theta), y: Math.cos(theta) };
    others.forEach((spec, i) => {
      const along = (i - (others.length - 1) / 2) * ZONE_SPREAD;
      const where = { x: at.x * INNER_RADIUS + tangent.x * along, y: at.y * INNER_RADIUS + tangent.y * along };
      out.push(def(spec, zoneIdFor(spec.name, seat), where, seat));
    });
  }

  const widths = shared.map((spec) => SHARED_WIDTH[spec.layout]);
  let left = -(widths.reduce((sum, w) => sum + w, 0) + SHARED_GAP * Math.max(shared.length - 1, 0)) / 2;
  shared.forEach((spec, i) => {
    out.push(def(spec, zoneIdFor(spec.name), { x: left + widths[i] / 2, y: 0 }, 'shared'));
    left += widths[i] + SHARED_GAP;
  });
  return out;
}
