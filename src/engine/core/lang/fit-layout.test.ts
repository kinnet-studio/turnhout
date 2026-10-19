import { describe, expect, it } from 'vitest';
import { computeZoneLayout } from '../layout';
import { TABLE_BOUNDS, type CardState } from '../scene';
import type { ZoneDef } from '../table-def';
import { placeZone } from '../zone-geometry';
import { autoLayout } from './auto-layout';
import { compileGame } from './compile';
import { fitsTable, fittedLayout } from './fit-layout';
import { createDefaultLibrary } from './library';
import { unreachableZones } from './testing';
import type { ZoneSpec } from './types';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import HEARTS from '@/games/hearts.rules?raw';
import RENT_DAY from '@/games/rent-day.rules?raw';
import VENOM from '@/games/venom.rules?raw';
import { CARD_HEIGHT } from '../scene';
import { stackOnHolders } from './fit-layout';
import { fixtureCard } from './testing';
import { BOARD_SPACING, STACK_GAP } from './fit-layout';

const lib = createDefaultLibrary();
const seats = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

const shared = (name: string, layout: ZoneSpec['layout']): ZoneSpec => ({ name, perPlayer: false, layout, visibility: 'public' });
const owned = (name: string, layout: ZoneSpec['layout'] = 'row'): ZoneSpec => ({ name, perPlayer: true, layout, visibility: 'owner' });

// A game with too many shared zones for one line: five on the first line, five on the second, then the viewer's own rows.
const MARKET: ZoneSpec[] = [
  shared('stock', 'pile'), shared('stall', 'row'), shared('lost and found', 'row'), shared('red pile', 'pile'), shared('blue pile', 'pile'),
  shared('red market', 'row'), shared('blue market', 'row'), shared('pool', 'row'), shared('stop pile', 'pile'), shared('box', 'pile'),
  owned('stash'), owned('list'), owned('peek'),
];

const cardsFor = (zone: ZoneDef, count: number): CardState[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${zone.id}#${i}`, zoneId: zone.id, faceUp: false, faceKey: 'back' }));
/** A zone's box with a row of 8 and a pile of 40, the most a long turn could put in it. */
const box = (zone: ZoneDef) => placeZone(zone, cardsFor(zone, zone.layout === 'row' ? 8 : 40));
type Box = ReturnType<typeof box>;
const overlap = (a: Box, b: Box) => Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
const inside = (b: Box) =>
  b.x - b.width / 2 >= TABLE_BOUNDS.min.x && b.x + b.width / 2 <= TABLE_BOUNDS.max.x &&
  b.y - b.height / 2 >= TABLE_BOUNDS.min.y && b.y + b.height / 2 <= TABLE_BOUNDS.max.y;
const at = (defs: ZoneDef[], id: string) => defs.find((d) => d.id === id)!.transform;

describe('the world', () => {
  it('is 1600 wide and 1200 tall, centred on the origin', () =>
    expect(TABLE_BOUNDS).toEqual({ min: { x: -800, y: -600 }, max: { x: 800, y: 600 } }));
});

describe('fitsTable', () => {
  const games = { Hearts: HEARTS, 'Color Match': COLOR_MATCH, Venom: VENOM, 'Rent Day': RENT_DAY };
  for (const [name, text] of Object.entries(games)) {
    const game = compileGame(text, lib).game!;
    for (let n = game.players.min; n <= game.players.max; n++) {
      it(`says ${name} fits at ${n} seats`, () => expect(fitsTable(game.zones, seats(n))).toBe(true));
    }
  }

  it.each([2, 3, 4, 5])('says a game with ten shared zones does not fit at %i seats', (n) =>
    expect(fitsTable(MARKET, seats(n))).toBe(false));
});

describe('fittedLayout', () => {
  it('has the viewer\'s zones, then the shared ones, each once', () => {
    expect(fittedLayout(MARKET, 'p1').map((d) => d.id)).toEqual([
      'stash-p1', 'list-p1', 'peek-p1',
      'stock', 'stall', 'lost-and-found', 'red-pile', 'blue-pile', 'red-market', 'blue-market', 'pool', 'stop-pile', 'box',
    ]);
  });

  it('wraps the shared zones onto lines from the top and puts the viewer\'s along the bottom', () => {
    const defs = fittedLayout(MARKET, 'p1');
    expect(at(defs, 'stock')).toEqual({ x: -540, y: -486 });
    expect(at(defs, 'stall')).toEqual({ x: -270, y: -486 });
    expect(at(defs, 'lost-and-found')).toEqual({ x: 150, y: -486 });
    expect(at(defs, 'red-pile')).toEqual({ x: 420, y: -486 });
    expect(at(defs, 'blue-pile')).toEqual({ x: 540, y: -486 });
    expect(at(defs, 'red-market')).toEqual({ x: -540, y: -306 });
    expect(at(defs, 'blue-market')).toEqual({ x: -120, y: -306 });
    expect(at(defs, 'pool')).toEqual({ x: 300, y: -306 });
    expect(at(defs, 'stop-pile')).toEqual({ x: 570, y: -306 });
    expect(at(defs, 'box')).toEqual({ x: 690, y: -306 });
    expect(at(defs, 'stash-p1')).toEqual({ x: -420, y: 510 });
    expect(at(defs, 'list-p1')).toEqual({ x: 0, y: 510 });
    expect(at(defs, 'peek-p1')).toEqual({ x: 420, y: 510 });
  });

  it('makes the same zones as the engine\'s layout: owner, visibility, layout and ordering', () => {
    const engine = autoLayout(MARKET, seats(3));
    for (const def of fittedLayout(MARKET, 'p1')) {
      const same = engine.find((d) => d.id === def.id)!;
      expect(same, def.id).toBeDefined();
      expect({ owner: def.owner, visibility: def.visibility, layout: def.layout, ordering: def.ordering })
        .toEqual({ owner: same.owner, visibility: same.visibility, layout: same.layout, ordering: same.ordering });
    }
  });

  it('names every zone, and gives a row a 400-wide slot that squeezes its cards to stay inside', () => {
    const defs = fittedLayout(MARKET, 'p0');
    const get = (id: string) => defs.find((d) => d.id === id)!;
    expect(get('lost-and-found').label).toBe('lost and found');
    expect(get('stash-p0').label).toBe('stash');
    for (const id of ['stash-p0', 'stall', 'pool']) {
      expect(get(id).layoutOptions).toEqual({ spacing: 105, maxWidth: 400 });
      expect(get(id).bounds).toEqual({ width: 400, height: 140 });
    }
    for (const id of ['stock', 'red-pile', 'box']) {
      expect(get(id).layoutOptions).toBeUndefined();
      expect(get(id).bounds).toBeUndefined();
    }
  });

  // A face shows the card's name and first columns, so no card of a row may cover the next while the slot has room.
  it('stands up to four cards of a row side by side, and squeezes five or more into its slot', () => {
    const row = fittedLayout(MARKET, 'p0').find((d) => d.id === 'stall')!;
    const steps = (n: number) => {
      const xs = [...computeZoneLayout(row, cardsFor(row, n)).values()].map((pose) => pose.x);
      return xs.slice(1).map((x, i) => x - xs[i]);
    };
    expect(steps(2)).toEqual([105]);
    expect(steps(3)).toEqual([105, 105]);
    expect(steps(4)).toEqual([100, 100, 100]);
    expect(steps(5)).toEqual([75, 75, 75, 75]);
  });

  it('is one table for every viewer: the same shared zones, and each viewer\'s own in the same places', () => {
    const tables = seats(5).map((viewer) => fittedLayout(MARKET, viewer));
    const sharedOf = (defs: ZoneDef[]) => defs.filter((d) => d.owner === 'shared');
    const ownedBy = (defs: ZoneDef[], seat: string) => defs.filter((d) => d.owner === seat);
    const first = ownedBy(tables[0], 'p0');
    expect(first).toHaveLength(3);
    tables.forEach((defs, i) => {
      const seat = `p${i}`;
      expect(sharedOf(defs)).toEqual(sharedOf(tables[0]));
      expect(defs.filter((d) => d.owner !== 'shared' && d.owner !== seat)).toEqual([]);
      expect(ownedBy(defs, seat)).toEqual(first.map((d) => ({ ...d, id: d.id.replace('-p0', `-${seat}`), owner: seat })));
    });
  });

  // A row of 8 squeezes inside its slot, so it stays clear of the next zone, and the whole table stays inside the world.
  describe.each([2, 3, 4, 5])('with %i seats, long rows and tall piles', (n) => {
    for (const viewer of seats(n)) {
      it(`keeps every zone inside the world, apart, and reachable for ${viewer}`, () => {
        const defs = fittedLayout(MARKET, viewer);
        const boxes = defs.map((d) => [d.id, box(d)] as const);
        for (const [id, b] of boxes) expect(inside(b), `${id} leaves the world`).toBe(true);
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            expect(overlap(boxes[i][1], boxes[j][1]), `${boxes[i][0]} overlaps ${boxes[j][0]}`).toBe(false);
          }
        }
        for (const def of defs.filter((d) => d.layout === 'row')) {
          const b = placeZone(def, []);
          for (const pose of computeZoneLayout(def, cardsFor(def, 8)).values()) {
            expect(pose.x - 50, `${def.id} card reaches left of its slot`).toBeGreaterThanOrEqual(b.x - b.width / 2 - 1e-9);
            expect(pose.x + 50, `${def.id} card reaches right of its slot`).toBeLessThanOrEqual(b.x + b.width / 2 + 1e-9);
          }
        }
        expect(unreachableZones(defs, 7)).toEqual([]);
      });
    }
  });

  it('puts a hand first among the viewer\'s zones and wraps the rest above it', () => {
    const defs = fittedLayout([owned('hand', 'hand'), ...MARKET], 'p0');
    expect(at(defs, 'hand-p0')).toEqual({ x: -420, y: 491 });
    expect(at(defs, 'peek-p0')).toEqual({ x: 0, y: 292 });
    for (const def of defs) expect(inside(box(def)), `${def.id} leaves the world`).toBe(true);
    expect(unreachableZones(defs, 7)).toEqual([]);
  });
});

// A seat with public zones: two shared zones on one line, two private rows along the bottom, and three public rows, one of them
// a zone where every card sits on a card.
const BOARD: ZoneSpec[] = [
  { name: 'stock', perPlayer: false, layout: 'pile', visibility: 'secret' },
  { name: 'stall', perPlayer: false, layout: 'row', visibility: 'public' },
  { name: 'stash', perPlayer: true, layout: 'row', visibility: 'owner' },
  { name: 'peek', perPlayer: true, layout: 'row', visibility: 'owner' },
  { name: 'workshop', perPlayer: true, layout: 'row', visibility: 'public' },
  { name: 'crew', perPlayer: true, layout: 'row', visibility: 'public', onCards: 'every' },
  { name: 'idle', perPlayer: true, layout: 'row', visibility: 'public' },
];
const publicRow = (name: string): ZoneSpec => ({ name, perPlayer: true, layout: 'row', visibility: 'public' });
// Five board rows: three fill the band's first line and two wrap onto a second.
const TWO_LINES = [...BOARD, publicRow('shelf'), publicRow('rack'), publicRow('bin')];

/**
 * What keeps a fitted table from fitting, with a row of 8 and a pile of 40 in each slot: a slot outside the world, two slots that
 * overlap, or a board row (a public row of the seat's) less than a card tall. A free zone has no slot of its own.
 */
const misfits = (defs: ZoneDef[]): string[] => {
  const slotted = defs.filter((d) => d.layout !== 'free').map((d) => [d.id, box(d)] as const);
  const problems = slotted.filter(([, b]) => !inside(b)).map(([id]) => `${id} leaves the world`);
  slotted.forEach(([a, ab], i) => {
    for (const [b, bb] of slotted.slice(i + 1)) if (overlap(ab, bb)) problems.push(`${a} overlaps ${b}`);
  });
  for (const d of defs) {
    const boardRow = d.owner !== 'shared' && d.visibility === 'public' && d.layout === 'row';
    if (boardRow && (d.bounds?.height ?? 0) < CARD_HEIGHT) problems.push(`${d.id} is less than a card tall`);
  }
  return problems;
};

describe("a band for the seat's public zones", () => {
  const defs = fittedLayout(BOARD, 'p1');
  const get = (id: string) => defs.find((d) => d.id === id)!;

  it('lists the private and board zones in Table order, then the shared ones, then the zone of cards on cards', () => {
    expect(defs.map((d) => d.id)).toEqual(['stash-p1', 'peek-p1', 'workshop-p1', 'idle-p1', 'stock', 'stall', 'crew-p1']);
  });

  it('keeps the shared lines at the top and the private strip at the bottom, and puts the board between them', () => {
    expect(at(defs, 'stock')).toEqual({ x: -210, y: -486 });
    expect(at(defs, 'stall')).toEqual({ x: 60, y: -486 });
    expect(at(defs, 'stash-p1')).toEqual({ x: -210, y: 510 });
    expect(at(defs, 'peek-p1')).toEqual({ x: 210, y: 510 });
    expect(at(defs, 'workshop-p1')).toEqual({ x: -210, y: -306 });
    expect(at(defs, 'idle-p1')).toEqual({ x: 210, y: -306 });
    expect(at(defs, 'crew-p1')).toEqual({ x: -210, y: -130 });
  });

  it('gives a board row the whole band, named, its cards a little apart at the top of it', () => {
    for (const id of ['workshop-p1', 'idle-p1']) {
      expect(get(id).label).toBe(id.replace('-p1', ''));
      expect(get(id).layoutOptions).toEqual({ spacing: 110, maxWidth: 400 });
      expect(get(id).bounds).toEqual({ width: 400, height: 776, anchor: { x: 0.5, y: 70 / 776 } });
    }
    const b = placeZone(get('workshop-p1'), []);
    expect(b.y - b.height / 2).toBeCloseTo(-376);
    expect(b.y + b.height / 2).toBeCloseTo(400);
  });

  // Only a zone where every card sits on a card hangs under its holders; a public zone of the seat's with no mark is a board row.
  it('makes a public zone with no mark a board row', () =>
    expect(get('idle-p1')).toMatchObject({ layout: 'row', bounds: { height: 776 } }));

  it('gives the zone of cards on cards no slot: it is free, where a card hanging under the first board zone\'s middle card goes, with no name and no bounds', () => {
    const crew = get('crew-p1');
    // -306 + 140 + 36: a card's height and the gap a caption takes under the workshop's middle card.
    expect(crew).toMatchObject({ layout: 'free', owner: 'p1', visibility: 'public', transform: { x: -210, y: -130 } });
    // Empty, its box starts below the bottom edge of the workshop's cards, so a press on one of them never lands in it.
    expect(placeZone(crew, []).y - CARD_HEIGHT / 2).toBe(at(defs, 'workshop-p1').y + CARD_HEIGHT / 2 + 36);
    expect('label' in crew).toBe(false);
    expect('bounds' in crew).toBe(false);
    expect('layoutOptions' in crew).toBe(false);
  });

  it('shares the band evenly between two lines of board zones', () => {
    const two = fittedLayout(TWO_LINES, 'p1');
    for (const zone of ['workshop', 'idle', 'shelf', 'rack', 'bin']) {
      expect(two.find((d) => d.id === `${zone}-p1`)!.bounds!.height, zone).toBe(368);
    }
    for (const zone of ['workshop', 'idle', 'shelf']) expect(at(two, `${zone}-p1`).y, zone).toBe(-306);
    expect(at(two, 'rack-p1')).toEqual({ x: -210, y: 102 });
    expect(at(two, 'bin-p1')).toEqual({ x: 210, y: 102 });
  });

  // Closes 1a-2's parked guard on the top and bottom lines: the band between them never runs into either, nor closes up.
  describe.each([['one line', BOARD, []], ['two lines', TWO_LINES, ['workshop']]] as const)('with the board on %s, long rows and tall piles', (_, zones, under) => {
    for (const viewer of seats(5)) {
      it(`keeps every slot inside the world, apart and at least a card tall, and every zone reachable, for ${viewer}`, () => {
        const table = fittedLayout(zones, viewer);
        expect(misfits(table)).toEqual([]);
        // The zone of cards on cards comes last, so a drop at its place, under the first board zone's middle card, lands in it. On
        // a band of two lines that zone is short enough that its own middle falls there too: a drop there lands where one on the
        // first card hanging under the middle card would, and the zone's cards, at its top, are above it.
        expect(unreachableZones(table, 7)).toEqual(under.map((zone) => `${zone}-${viewer}: centre goes to crew-${viewer}`));
      });
    }
  });
});

describe('cards stacked under the card they sit on', () => {
  const defs = fittedLayout(BOARD, 'p1');
  const crew = defs.find((d) => d.id === 'crew-p1')!;
  const on = (id: string, holder: string, slot: number) => fixtureCard(id, 'crew-p1', { 'lang:on': holder }, { slot });
  const CARDS = [
    fixtureCard('j1', 'workshop-p1', {}, { slot: 0 }),
    fixtureCard('j2', 'workshop-p1', {}, { slot: 1 }),
    on('w1', 'j1', 0),
    on('w2', 'j2', 1),
    on('w3', 'j1', 2),
    fixtureCard('s1', 'stash-p1', {}),
  ];
  const find = (cards: CardState[], id: string) => cards.find((c) => c.id === id)!;
  const where = (cards: CardState[], id: string) => ({ x: find(cards, id).data!.x, y: find(cards, id).data!.y });

  it('hangs them in a column under their holder, in slot order, one step apart', () => {
    const out = stackOnHolders(defs, CARDS);
    expect(where(out, 'w1')).toEqual({ x: -265, y: -130 });
    expect(where(out, 'w3')).toEqual({ x: -265, y: -96 });
    expect(where(out, 'w2')).toEqual({ x: -155, y: -130 });
    expect(find(out, 'w1').data!['lang:on']).toBe('j1');
    for (const id of ['j1', 'j2', 's1']) expect(find(out, id), id).toBe(find(CARDS, id));
    expect(out.map((c) => c.id)).toEqual(CARDS.map((c) => c.id));
  });

  it('puts them where the free layout reads them', () => {
    const out = stackOnHolders(defs, CARDS);
    const held = out.filter((c) => c.zoneId === 'crew-p1');
    const poses = computeZoneLayout(crew, held);
    for (const card of held) expect({ x: poses.get(card.id)!.x, y: poses.get(card.id)!.y }, card.id).toEqual(where(out, card.id));
  });

  it('leaves a card whose holder is not on the table as it is', () => {
    const stray = on('w9', 'c999', 3);
    expect(find(stackOnHolders(defs, [...CARDS, stray]), 'w9')).toBe(stray);
  });

  // Twenty on one card still end inside its slot, above the private strip, with even steps.
  it('closes the steps up evenly so a long column stays inside the holder\'s slot', () => {
    const many = Array.from({ length: 20 }, (_, i) => on(`m${i}`, 'j1', i));
    const out = stackOnHolders(defs, [...CARDS.slice(0, 2), ...many]).filter((c) => c.zoneId === 'crew-p1');
    expect(out.every((c) => c.data!.x === -265)).toBe(true);
    const ys = out.map((c) => c.data!.y!);
    for (const step of ys.slice(1).map((y, i) => y - ys[i])) expect(step).toBeCloseTo(460 / 19);
    const slot = placeZone(defs.find((d) => d.id === 'workshop-p1')!, []);
    expect(ys.at(-1)! + 70).toBeCloseTo(slot.y + slot.height / 2);
    expect(ys.at(-1)! + 70).toBeCloseTo(400);

    const two = stackOnHolders(defs, [...CARDS.slice(0, 2), ...many.slice(0, 2)]).filter((c) => c.zoneId === 'crew-p1');
    expect(two[1].data!.y! - two[0].data!.y!).toBe(34);
  });
});

describe('(guard) a zone where some cards sit on cards, and zones that name the zone of the cards they sit on', () => {
  // The idle row is marked so that some of its cards sit on cards in the workshop, and the crew names the workshop as well.
  const marked = BOARD.map((zone): ZoneSpec => {
    if (zone.name === 'idle') return { ...zone, onCards: 'some', holders: 'workshop' };
    return zone.name === 'crew' ? { ...zone, holders: 'workshop' } : zone;
  });
  const defs = fittedLayout(marked, 'p1');

  it('keeps a zone where only some cards sit on cards a board row', () =>
    expect(defs.find((d) => d.id === 'idle-p1')).toMatchObject({ layout: 'row', bounds: { height: 776 } }));
  it('keeps a zone where every card sits on a card free, whatever zone it names', () =>
    expect(defs.find((d) => d.id === 'crew-p1')).toMatchObject({ layout: 'free' }));
});

describe('a zone where only some cards sit on cards', () => {
  // The idle row marked as 4-1's guard marks it: some of its cards sit on cards in the workshop, and the crew names it as well.
  const marked = BOARD.map((zone): ZoneSpec => {
    if (zone.name === 'idle') return { ...zone, onCards: 'some', holders: 'workshop' };
    return zone.name === 'crew' ? { ...zone, holders: 'workshop' } : zone;
  });
  const defs = fittedLayout(marked, 'p1');
  const get = (id: string) => defs.find((d) => d.id === id)!;
  // One card on a workshop card, one on nothing, one on nothing that carries a place from before, and one on a card not on the table.
  const CARDS = [
    fixtureCard('j1', 'workshop-p1', {}, { slot: 0 }),
    fixtureCard('t1', 'idle-p1', { 'lang:on': 'j1' }),
    fixtureCard('t2', 'idle-p1', {}),
    fixtureCard('t3', 'idle-p1', { x: 5, y: 5 }),
    fixtureCard('t4', 'idle-p1', { 'lang:on': 'c999' }),
  ];
  const find = (cards: CardState[], id: string) => cards.find((c) => c.id === id)!;

  it('keeps it a board row that draws a placed card where it is placed, and marks no other row so', () => {
    expect(get('idle-p1').layout).toBe('row');
    expect(get('idle-p1').layoutOptions).toEqual({ spacing: BOARD_SPACING, maxWidth: 400, keepPlaced: true });
    expect(get('workshop-p1').layoutOptions).toStrictEqual({ spacing: BOARD_SPACING, maxWidth: 400 });
  });

  it('hangs a card that sits on a card under it, takes an old place off a card that sits on none, and leaves the rest as they are', () => {
    const out = stackOnHolders(defs, CARDS);
    const j1 = computeZoneLayout(get('workshop-p1'), [CARDS[0]]).get('j1')!;
    expect({ x: find(out, 't1').data!.x, y: find(out, 't1').data!.y }).toEqual({ x: j1.x, y: j1.y + CARD_HEIGHT + STACK_GAP });
    expect(find(out, 't2')).toBe(find(CARDS, 't2'));
    expect(find(out, 't4')).toBe(find(CARDS, 't4'));
    const t3 = find(out, 't3');
    expect(t3).not.toBe(find(CARDS, 't3'));
    expect('x' in t3.data! || 'y' in t3.data!).toBe(false);
    expect(out.map((c) => c.id)).toEqual(CARDS.map((c) => c.id));
  });

  it('draws the hanging card at its place and the others as a row of their own', () => {
    const idle = get('idle-p1');
    const held = stackOnHolders(defs, CARDS).filter((c) => c.zoneId === 'idle-p1');
    const poses = computeZoneLayout(idle, held);
    const t1 = find(held, 't1');
    expect({ x: poses.get('t1')!.x, y: poses.get('t1')!.y }).toEqual({ x: t1.data!.x, y: t1.data!.y });
    // Three cards 110 apart fit the 400-wide slot, so they keep the board's spacing around the row's middle.
    expect(['t2', 't3', 't4'].map((id) => poses.get(id)!.x - idle.transform.x)).toEqual([-110, 0, 110]);
    expect(['t2', 't3', 't4'].map((id) => poses.get(id)!.y)).toEqual([idle.transform.y, idle.transform.y, idle.transform.y]);
  });
});
