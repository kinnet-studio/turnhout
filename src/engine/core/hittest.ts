import { CARD_HEIGHT, CARD_WIDTH, type CardState, type PlacedCard, type PlacedZone, type Vec2 } from './scene';

function inBox(pt: Vec2, cx: number, cy: number, w: number, h: number): boolean {
  return pt.x >= cx - w / 2 && pt.x <= cx + w / 2 && pt.y >= cy - h / 2 && pt.y <= cy + h / 2;
}

export function cardAtPoint(
  pt: Vec2,
  cards: PlacedCard[],
  opts: { draggableOnly?: boolean } = {},
): string | null {
  let best: PlacedCard | null = null;
  for (const c of cards) {
    if (opts.draggableOnly && !c.draggable) continue;
    const w = CARD_WIDTH * c.transform.scale;
    const h = CARD_HEIGHT * c.transform.scale;
    if (inBox(pt, c.transform.x, c.transform.y, w, h)) {
      if (best === null || c.transform.z > best.transform.z) best = c;
    }
  }
  return best?.id ?? null;
}

export function zoneAtPoint(
  pt: Vec2,
  zones: PlacedZone[],
  card?: CardState,
): { zoneId: string; slot: number } | null {
  for (let i = zones.length - 1; i >= 0; i--) {
    const z = zones[i];
    if (!inBox(pt, z.x, z.y, z.width, z.height)) continue;
    if (card && z.accepts && !z.accepts(card)) continue;
    return { zoneId: z.id, slot: 0 };
  }
  return null;
}
