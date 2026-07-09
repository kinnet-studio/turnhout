import { computeZoneLayout } from './layout';
import { CARD_HEIGHT, CARD_WIDTH, type CardState, type PlacedZone, type Vec2 } from './scene';
import type { ZoneDef } from './table-def';

function defaultAnchor(zone: ZoneDef): { x: number; y: number } {
  return zone.layout === 'grid' ? { x: 0, y: 0 } : { x: 0.5, y: 0.5 };
}

/** Half-extents of a rotated CARD_WIDTH×CARD_HEIGHT box scaled by `scale`. */
function cardHalfExtents(rotation: number, scale: number): { hx: number; hy: number } {
  const w = CARD_WIDTH * scale;
  const h = CARD_HEIGHT * scale;
  const c = Math.abs(Math.cos(rotation));
  const s = Math.abs(Math.sin(rotation));
  return { hx: (w * c + h * s) / 2, hy: (w * s + h * c) / 2 };
}

export function placeZone(zone: ZoneDef, cards: CardState[]): PlacedZone {
  if (zone.bounds) {
    const anchor = zone.bounds.anchor ?? defaultAnchor(zone);
    const { width, height } = zone.bounds;
    return {
      id: zone.id,
      x: zone.transform.x + (0.5 - anchor.x) * width,
      y: zone.transform.y + (0.5 - anchor.y) * height,
      width,
      height,
    };
  }

  // Auto-bounds: enclose the actual laid-out card rects.
  const poses = [...computeZoneLayout(zone, cards).values()];
  if (poses.length === 0) {
    const { hx, hy } = cardHalfExtents(zone.transform.rotation ?? 0, 1);
    return { id: zone.id, x: zone.transform.x, y: zone.transform.y, width: hx * 2, height: hy * 2 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poses) {
    const { hx, hy } = cardHalfExtents(p.rotation, p.scale);
    minX = Math.min(minX, p.x - hx);
    maxX = Math.max(maxX, p.x + hx);
    minY = Math.min(minY, p.y - hy);
    maxY = Math.max(maxY, p.y + hy);
  }
  return {
    id: zone.id,
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function slotAtPoint(zone: ZoneDef, cards: CardState[], world: Vec2): number {
  if ((zone.ordering ?? 'stack') !== 'free') return cards.length;
  if (cards.length === 0) return 0;
  const poses = computeZoneLayout(zone, cards);
  let bestIndex = 0;
  let bestDist = Infinity;
  cards.forEach((c, i) => {
    const p = poses.get(c.id);
    if (!p) return;
    const d = Math.hypot(p.x - world.x, p.y - world.y);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  });
  return bestIndex;
}
