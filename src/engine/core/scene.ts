export const CARD_WIDTH = 100;
export const CARD_HEIGHT = 140;

export type LayoutKind = 'pile' | 'fan' | 'row' | 'grid' | 'free';
export interface Vec2 {
  x: number;
  y: number;
}

export interface CardState {
  id: string;
  zoneId: string;
  faceUp: boolean;
  faceKey: string;
  slot?: number;
  draggable?: boolean;
  data?: { x?: number; y?: number; [k: string]: unknown };
}

export interface LayoutOptions {
  spacing?: number;
  fanAngleDeg?: number;
  fanRadius?: number;
  cols?: number;
  rowSpacing?: number;
  jitter?: number; // radians of max rotation jitter; 0 = none (default)
}

export interface ZoneState {
  id: string;
  layout: LayoutKind;
  transform: { x: number; y: number; rotation?: number };
  layoutOptions?: LayoutOptions;
  accepts?: (card: CardState) => boolean;
}

export interface Scene {
  cards: CardState[];
  zones: ZoneState[];
}

/** Resting/animated pose of a card in world space. */
export interface TargetTransform {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  z: number;
}

/** A card placed in world space (for hit-testing). */
export interface PlacedCard {
  id: string;
  transform: TargetTransform;
  draggable: boolean;
}

/** A zone placed in world space (for drop hit-testing). */
export interface PlacedZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accepts?: (card: CardState) => boolean;
}

export function validateScene(scene: Scene): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const zoneIds = new Set(scene.zones.map((z) => z.id));
  for (const c of scene.cards) {
    if (seen.has(c.id)) errors.push(`duplicate card id: ${c.id}`);
    seen.add(c.id);
    if (!zoneIds.has(c.zoneId)) warnings.push(`card ${c.id} references unknown zone: ${c.zoneId}`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function cardsByZone(scene: Scene): Map<string, CardState[]> {
  const groups = new Map<string, { card: CardState; index: number }[]>();
  scene.cards.forEach((card, index) => {
    const list = groups.get(card.zoneId) ?? [];
    list.push({ card, index });
    groups.set(card.zoneId, list);
  });
  const out = new Map<string, CardState[]>();
  for (const [zoneId, list] of groups) {
    list.sort((a, b) => {
      const sa = a.card.slot ?? a.index;
      const sb = b.card.slot ?? b.index;
      return sa - sb || a.index - b.index;
    });
    out.set(zoneId, list.map((e) => e.card));
  }
  return out;
}
