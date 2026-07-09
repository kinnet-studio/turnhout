import { CARD_HEIGHT, CARD_WIDTH, type CardState, type PlacedCard, type Vec2 } from './scene';
import { canAccept, type RuleRegistry } from './rules';
import type { ZoneDef } from './table-def';
import { placeZone, slotAtPoint } from './zone-geometry';

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

export function resolveDrop(
  pt: Vec2,
  zones: ZoneDef[],
  zoneCardsOf: (zoneId: string) => CardState[],
  card: CardState,
  registry: RuleRegistry,
): { zoneId: string; slot: number } | null {
  for (let i = zones.length - 1; i >= 0; i--) {
    const zone = zones[i];
    const zoneCards = zoneCardsOf(zone.id);
    const placed = placeZone(zone, zoneCards);
    if (!inBox(pt, placed.x, placed.y, placed.width, placed.height)) continue;
    if (!canAccept(zone, card, zoneCards, registry)) continue;
    return { zoneId: zone.id, slot: slotAtPoint(zone, zoneCards, pt) };
  }
  return null;
}
