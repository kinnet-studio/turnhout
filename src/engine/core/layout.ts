import { CARD_WIDTH, type CardState, type TargetTransform, type ZoneState } from './scene';

const PILE_DY = 0.4;
const DEFAULT_ROW_SPACING = Math.round(CARD_WIDTH * 1.1); // 110
const DEFAULT_GRID_ROW = 150;
const DEFAULT_FAN_ANGLE = 30;
const DEFAULT_FAN_RADIUS = 600;

/** Deterministic pseudo-jitter in [-1, 1] from a card id (no Math.random). */
function idJitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h % 1000) / 1000) * 2 - 1;
}

export function computeZoneLayout(
  zone: ZoneState,
  cards: CardState[],
  zBase = 0,
): Map<string, TargetTransform> {
  const out = new Map<string, TargetTransform>();
  const { x: zx, y: zy, rotation: zr = 0 } = zone.transform;
  const opts = zone.layoutOptions ?? {};
  const n = cards.length;

  cards.forEach((card, i) => {
    const z = zBase + i;
    let t: TargetTransform;
    switch (zone.layout) {
      case 'pile': {
        const jitter = (opts.jitter ?? 0) * idJitter(card.id);
        t = { x: zx, y: zy + i * PILE_DY, rotation: zr + jitter, scale: 1, z };
        break;
      }
      case 'row': {
        const spacing = opts.spacing ?? DEFAULT_ROW_SPACING;
        t = { x: zx + (i - (n - 1) / 2) * spacing, y: zy, rotation: zr, scale: 1, z };
        break;
      }
      case 'grid': {
        const cols = opts.cols ?? 4;
        const sx = opts.spacing ?? DEFAULT_ROW_SPACING;
        const sy = opts.rowSpacing ?? DEFAULT_GRID_ROW;
        t = { x: zx + (i % cols) * sx, y: zy + Math.floor(i / cols) * sy, rotation: zr, scale: 1, z };
        break;
      }
      case 'fan': {
        const total = ((opts.fanAngleDeg ?? DEFAULT_FAN_ANGLE) * Math.PI) / 180;
        const radius = opts.fanRadius ?? DEFAULT_FAN_RADIUS;
        const step = n > 1 ? total / (n - 1) : 0;
        const angle = n > 1 ? -total / 2 + i * step : 0;
        t = {
          x: zx + radius * Math.sin(angle),
          y: zy - radius * Math.cos(angle) + radius,
          rotation: zr + angle,
          scale: 1,
          z,
        };
        break;
      }
      case 'free': {
        t = { x: card.data?.x ?? zx, y: card.data?.y ?? zy, rotation: zr, scale: 1, z };
        break;
      }
    }
    out.set(card.id, t);
  });
  return out;
}
