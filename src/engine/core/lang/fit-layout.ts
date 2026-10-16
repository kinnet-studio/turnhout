// Places a game's zones for one viewer on the fixed table world, each in a slot of its own, so a game with more zones than
// one line can hold still lies inside the world. The shared zones wrap onto lines from the top, the viewer's private zones onto
// lines from the bottom, the viewer's public zones into the band between, and rivals' zones are left off. A zone where every
// card sits on a card gets no slot: its cards hang under the cards they sit on. Like autoLayout, it works from the declared
// zones alone.
import { computeZoneLayout } from '../layout';
import { CARD_HEIGHT, CARD_WIDTH, cardsByZone, TABLE_BOUNDS, type CardState, type PlayerId } from '../scene';
import type { ZoneDef } from '../table-def';
import { placeZone } from '../zone-geometry';
import { holderIdOf } from './attach';
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
/** A board row's cards stand a little further apart than a card's width, so the columns hanging under them don't touch. */
export const BOARD_SPACING = 110;
/** From a card's bottom edge to the top of the first card hanging under it: room for the caption drawn under the card. */
export const STACK_GAP = 36;
/** From one card of a column to the next, which is drawn over it and leaves its top strip, the corner index, showing. */
export const STACK_STEP = 34;

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

/** The defs of one line, centred on the middle of the world, each slot's centre at the height `yOf` gives it. */
function placeLine(
  line: Line, yOf: (slot: Slot) => number, idOf: (spec: ZoneSpec) => string, owner: PlayerId | 'shared',
): ZoneDef[] {
  let left = -line.width / 2;
  return line.slots.map((slot) => {
    const def = fittedDef(slot, idOf(slot.spec), { x: left + slot.width / 2, y: yOf(slot) }, owner);
    left += slot.width + GAP;
    return def;
  });
}

/**
 * The table as `viewer` sees it, and nothing of the other players':
 * - the shared zones from the top of the world down;
 * - the viewer's private zones from the bottom up;
 * - the viewer's public zones (the board) in the band between, its lines sharing the band's height, each zone's cards at the top
 *   of its line so the cards on them can hang below;
 * - a zone where every card sits on a card as a free zone with no slot, last, so its cards draw over the board and a drop on one
 *   of them lands in it; empty, it rests under the first board zone's middle card, where the first card hanging there goes.
 *
 * The private and board zones come in the order the table lists them, then the shared ones, then the free ones. Each zone keeps
 * the id the engine gives it, so a card dropped here goes where the engine's own layout would send it. A viewer with no public
 * zone of its own has no band: its zones lie along the bottom alone.
 */
export function fittedLayout(zones: ZoneSpec[], viewer: PlayerId): ZoneDef[] {
  const own = zones.filter((z) => z.perPlayer);
  const isPrivate = (spec: ZoneSpec) => spec.visibility !== 'public';
  // Only a zone where every card sits on a card gives up its slot: under any other mark a zone may hold cards that sit on none.
  const isAttached = (spec: ZoneSpec) => !isPrivate(spec) && spec.onCards === 'every';
  const ownId = (spec: ZoneSpec) => zoneIdFor(spec.name, viewer);

  const placed = new Map<string, ZoneDef>();
  let bottom = TABLE_BOUNDS.max.y - MARGIN;
  for (const line of wrap(own.filter(isPrivate))) {
    const y = bottom - line.height / 2;
    for (const def of placeLine(line, () => y, ownId, viewer)) placed.set(def.id, def);
    bottom -= line.height + LABEL_ROOM + LINE_GAP;
  }

  const common: ZoneDef[] = [];
  let top = TABLE_BOUNDS.min.y + MARGIN + LABEL_ROOM;
  for (const line of wrap(zones.filter((z) => !z.perPlayer))) {
    const y = top + line.height / 2;
    common.push(...placeLine(line, () => y, (spec) => zoneIdFor(spec.name), 'shared'));
    top += line.height + LINE_GAP + LABEL_ROOM;
  }

  // The band runs from under the last shared line's names to above the first private line's; `top` and `bottom` stand there now.
  const board: ZoneDef[] = [];
  const lines = wrap(own.filter((spec) => !isPrivate(spec) && !isAttached(spec)));
  const height = Math.floor((bottom - top - (lines.length - 1) * (LINE_GAP + LABEL_ROOM)) / lines.length);
  lines.forEach((line, k) => {
    const lineTop = top + k * (height + LINE_GAP + LABEL_ROOM);
    board.push(...placeLine(line, (slot) => lineTop + slot.height / 2, ownId, viewer).map((def) => boardDef(def, height)));
  });
  for (const def of board) placed.set(def.id, def);

  const slotted = own.filter((spec) => !isAttached(spec)).map((spec) => placed.get(ownId(spec))!);
  // A free zone rests where the first card hanging under the first board slot's middle card would go. Its box, a card's when it
  // is empty, then lies under the cards it could hang from and never on one, so a click on one of them that wobbles into a short
  // drag stays in that card's own zone.
  const boardAt = board[0]?.transform;
  const at = boardAt ? { x: boardAt.x, y: boardAt.y + CARD_HEIGHT + STACK_GAP } : { x: 0, y: 0 };
  const attached = own.filter(isAttached).map((spec): ZoneDef => {
    // A row's spacing means nothing once each card says where it goes.
    const { layoutOptions: _spacing, ...def } = zoneDef(spec, ownId(spec), at, viewer);
    return { ...def, layout: 'free' };
  });
  return [...slotted, ...common, ...attached];
}

/**
 * A board row runs from its line's top down the line's whole height, its cards at the top, so the slot holds the columns of cards
 * hanging under them too. A board pile or hand keeps its slot as it is.
 */
function boardDef(def: ZoneDef, height: number): ZoneDef {
  if (def.layout !== 'row') return def;
  return {
    ...def,
    layoutOptions: { spacing: BOARD_SPACING, maxWidth: ROW_SLOT },
    bounds: { width: ROW_SLOT, height, anchor: { x: 0.5, y: CARD_HEIGHT / 2 / height } },
  };
}

/**
 * The cards of the free zones placed under the cards they sit on: each holder's cards hang in a column at its x, in slot order,
 * the first one's top `STACK_GAP` below the holder's bottom edge and each next one `STACK_STEP` lower, the steps closing up evenly
 * where the column would pass the bottom of the holder's slot. A moved card is a copy with its place in `data.x` and `data.y`,
 * where the free layout reads it. Every other card, a card whose holder is in no slot among them, is the same object, and the
 * order is kept.
 */
export function stackOnHolders(defs: ZoneDef[], cards: CardState[]): CardState[] {
  const byZone = cardsByZone({ cards, zones: [] });
  const zoneCardsOf = (def: ZoneDef) => byZone.get(def.id) ?? [];
  const holders = new Map<string, { x: number; y: number; def: ZoneDef }>();
  for (const def of defs) {
    if (def.layout === 'free') continue;
    for (const [id, pose] of computeZoneLayout(def, zoneCardsOf(def))) holders.set(id, { x: pose.x, y: pose.y, def });
  }

  const moved = new Map<string, CardState>();
  for (const def of defs) {
    if (def.layout !== 'free') continue;
    const columns = new Map<string, CardState[]>();
    for (const card of zoneCardsOf(def)) {
      const holderId = holderIdOf(card);
      if (holderId === null || !holders.has(holderId)) continue;
      const column = columns.get(holderId) ?? [];
      column.push(card);
      columns.set(holderId, column);
    }
    for (const [holderId, column] of columns) {
      const holder = holders.get(holderId)!;
      const slot = placeZone(holder.def, zoneCardsOf(holder.def));
      const first = holder.y + CARD_HEIGHT + STACK_GAP;
      const room = slot.y + slot.height / 2 - first - CARD_HEIGHT / 2;
      const n = column.length;
      const step = n > 1 ? Math.min(STACK_STEP, Math.max(0, room) / (n - 1)) : STACK_STEP;
      column.forEach((card, k) => {
        moved.set(card.id, { ...card, data: { ...card.data, x: holder.x, y: first + k * step } });
      });
    }
  }
  return cards.map((card) => moved.get(card.id) ?? card);
}
