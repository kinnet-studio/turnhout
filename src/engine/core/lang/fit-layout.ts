// Places a game's zones for one viewer on the fixed table world, each in a slot of its own, so a game with more zones than
// one line can hold still lies inside the world. The shared zones wrap onto lines from the top, the viewer's own zones onto
// lines from the bottom, and rivals' zones are left off. Like autoLayout, it works from the declared zones alone.
import { CARD_HEIGHT, CARD_WIDTH, TABLE_BOUNDS, type CardState, type PlayerId } from '../scene';
import type { ZoneDef } from '../table-def';
import { placeZone } from '../zone-geometry';
import { autoLayout, HAND_BOUNDS, zoneDef } from './auto-layout';
import type { ZoneSpec } from './types';
import { zoneIdFor } from './zones';

/**
 * A row's slot. A face shows the card's name and first columns, so its cards stand apart while the slot has room: up to three
 * a little apart, four side by side, and five or more squeezed together inside it.
 */
const ROW_SLOT = 400;
const ROW_SPACING = CARD_WIDTH + 5;
/** Between the slots of a line: a zone's name may spread over it, half on each side, and still not meet its neighbour's. */
export const GAP = 20;
/** Between the world's edge and the nearest zone. */
const MARGIN = 20;
/** Above each line, for the names of its zones. */
const LABEL_ROOM = 24;
/** Between one line's zones and the names of the next. */
const LINE_GAP = 16;
const LINE_WIDTH = TABLE_BOUNDS.max.x - TABLE_BOUNDS.min.x - 2 * MARGIN;

// How many cards stand in a zone when asking whether a table fits, the counts `unreachableZones` uses.
const ROW_CARDS = 4;
const PILE_CARDS = 3;

const cardsIn = (def: ZoneDef): CardState[] => {
  const count = def.layout === 'row' ? ROW_CARDS : PILE_CARDS;
  return Array.from({ length: count }, (_, i) => ({ id: `${def.id}#${i}`, zoneId: def.id, faceUp: false, faceKey: 'back' }));
};

/** Whether the engine's layout of these zones at these seats keeps every zone inside the world. A fan's box is its bounds. */
export function fitsTable(zones: ZoneSpec[], seats: PlayerId[]): boolean {
  return autoLayout(zones, seats).every((def) => {
    const box = placeZone(def, cardsIn(def));
    return box.x - box.width / 2 >= TABLE_BOUNDS.min.x && box.x + box.width / 2 <= TABLE_BOUNDS.max.x
      && box.y - box.height / 2 >= TABLE_BOUNDS.min.y && box.y + box.height / 2 <= TABLE_BOUNDS.max.y;
  });
}

type Slot = { spec: ZoneSpec; width: number; height: number };
type Line = { slots: Slot[]; width: number; height: number };

function slotFor(spec: ZoneSpec): Slot {
  switch (spec.layout) {
    case 'pile': return { spec, width: CARD_WIDTH, height: CARD_HEIGHT };
    case 'row': return { spec, width: ROW_SLOT, height: CARD_HEIGHT };
    case 'hand': return { spec, width: HAND_BOUNDS.width, height: HAND_BOUNDS.height };
  }
}

/** Packs zones, in the order given, onto lines no wider than the world less its margins. */
function wrap(specs: ZoneSpec[]): Line[] {
  const lines: Line[] = [];
  for (const slot of specs.map(slotFor)) {
    const line = lines.at(-1);
    if (line && line.width + GAP + slot.width <= LINE_WIDTH) {
      line.slots.push(slot);
      line.width += GAP + slot.width;
      line.height = Math.max(line.height, slot.height);
    } else {
      lines.push({ slots: [slot], width: slot.width, height: slot.height });
    }
  }
  return lines;
}

function fittedDef(slot: Slot, id: string, at: { x: number; y: number }, owner: PlayerId | 'shared'): ZoneDef {
  const def: ZoneDef = { ...zoneDef(slot.spec, id, at, owner), label: slot.spec.name };
  if (slot.spec.layout !== 'row') return def;
  return { ...def, layoutOptions: { spacing: ROW_SPACING, maxWidth: ROW_SLOT }, bounds: { width: ROW_SLOT, height: CARD_HEIGHT } };
}

/** The defs of one line, centred on the middle of the world, with the line's centre at `y`. */
function placeLine(line: Line, y: number, idOf: (spec: ZoneSpec) => string, owner: PlayerId | 'shared'): ZoneDef[] {
  let left = -line.width / 2;
  return line.slots.map((slot) => {
    const def = fittedDef(slot, idOf(slot.spec), { x: left + slot.width / 2, y }, owner);
    left += slot.width + GAP;
    return def;
  });
}

/**
 * The table as `viewer` sees it: the shared zones from the top of the world down, the viewer's own zones from the bottom up,
 * in the order the table lists them, and nothing of the other players'. Each zone keeps the id the engine gives it, so a
 * card dropped here goes where the engine's own layout would send it.
 */
export function fittedLayout(zones: ZoneSpec[], viewer: PlayerId): ZoneDef[] {
  const mine: ZoneDef[] = [];
  let bottom = TABLE_BOUNDS.max.y - MARGIN;
  for (const line of wrap(zones.filter((z) => z.perPlayer))) {
    mine.push(...placeLine(line, bottom - line.height / 2, (spec) => zoneIdFor(spec.name, viewer), viewer));
    bottom -= line.height + LABEL_ROOM + LINE_GAP;
  }

  const common: ZoneDef[] = [];
  let top = TABLE_BOUNDS.min.y + MARGIN + LABEL_ROOM;
  for (const line of wrap(zones.filter((z) => !z.perPlayer))) {
    common.push(...placeLine(line, top + line.height / 2, (spec) => zoneIdFor(spec.name), 'shared'));
    top += line.height + LINE_GAP + LABEL_ROOM;
  }
  return [...mine, ...common];
}
