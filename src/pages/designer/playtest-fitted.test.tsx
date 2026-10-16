import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import RENT_DAY from '@/games/rent-day.rules?raw';
import STARTUP_SIMULATOR from '@/games/startup-simulator.rules?raw';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { parseTextFaceKey } from '@/engine/core/lang/cards';
import { compileGame } from '@/engine/core/lang/compile';
import { fitsTable, fittedLayout } from '@/engine/core/lang/fit-layout';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { TURN_GAME } from '@/engine/core/lang/testing';
import { relocate } from '@/engine/core/lang/zones';
import type { CardTableProps } from '@/engine/react';
import { BUTTON_ROW } from './board-controls';
import { cardDetail } from './card-detail';
import { Playtest } from './playtest';
import { unreachableZones } from '@/engine/core/lang/testing';
import { CARD_HEIGHT, TABLE_BOUNDS, type CardState } from '@/engine/core/scene';
import type { ZoneDef } from '@/engine/core/table-def';
import { placeZone } from '@/engine/core/zone-geometry';
import type { GameState } from '@/engine/core/game-state';
import { putOn } from '@/engine/core/lang/attach';
import { changeCard } from '@/engine/core/lang/card-facts';
import { computeZoneLayout } from '@/engine/core/layout';
import { deriveScene } from '@/engine/core/derive-scene';
import { cardsByZone } from '@/engine/core/scene';
import { GameServer } from '@/engine/net/game-server';

// The canvas a seat is drawn on: keep what its app was last made with.
let canvasMadeWith: unknown = null;
vi.mock('@/components/PixiCanvas', () => ({
  Wrapper: ({ children, initFunction }: { children: ReactNode; initFunction: unknown }) => {
    canvasMadeWith = initFunction;
    return <div>{children}</div>;
  },
}));
// An app is made by a function makeInitApp returns; here that function is just what it was asked for.
vi.mock('@/utils/init-app', () => ({ makeInitApp: (_faces: unknown, opts: unknown) => ({ opts }) }));
// The fitted page draws one table: keep the props it was last drawn with.
let table: CardTableProps | null = null;
vi.mock('@/engine/react', () => ({ CardTable: (p: CardTableProps) => { table = p; return null; } }));

const lib = createDefaultLibrary();
const game = compileGame(STARTUP_SIMULATOR, lib).game!;
const SEED = 1;
const seatsOf = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const startOf = (n: number) => createEngine(game, lib, n, initialState(game, SEED)).engine.getState().data['lang:start-player'] as string;
const after = (seat: string, n: number) => `p${(Number(seat.slice(1)) + 1) % n}`;
const hint = (phase: string) => game.phases.find((p) => p.id === phase)!.hint!;
const mount = (over: Partial<Parameters<typeof Playtest>[0]> = {}) =>
  render(<Playtest game={game} library={lib} players={3} seed={SEED} onRestart={() => {}} onStop={() => {}} {...over} />);
const cardsIn = (zoneId: string) => table!.placement.cards.filter((c) => c.zoneId === zoneId);
const lineOf = (seat: string) => within(screen.getByTestId('tableaux')).getByText(new RegExp(`^${seat} `)).textContent;
const status = () => screen.getByText(/^seat: p/).textContent;
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const picker = () => screen.getByRole('group', { name: 'Pick cards' });
const pickFirst = () => fireEvent.click(within(picker()).getAllByRole('button', { name: /^Pick / })[0]);
const pickNamed = (name: string) => fireEvent.click(within(picker()).getAllByRole('button', { name: `Pick ${name}` })[0]);
const drop = (cardId: string, from: string, to: string) =>
  act(() => table!.onDrop!({ cardId, fromZoneId: from, toZoneId: to, slot: 0, worldPoint: { x: 0, y: 0 } }));

beforeEach(() => {
  table = null;
  canvasMadeWith = null;
});

describe('Playtest of a game too big for one table', () => {
  const S = startOf(3);
  const N = after(S, 3);
  const O = seatsOf(3).find((seat) => seat !== S)!;
  const tab = (name: string) => screen.getByRole('tab', { name });
  const zoneIds = () => table!.tableDef.zones.map((z) => z.id);

  it("doesn't fit one table at any player count", () => {
    for (const n of [2, 3, 4, 5]) expect(fitsTable(game.zones, seatsOf(n)), `${n} players`).toBe(false);
  });

  it('shows one seat, the one that must act, with a tab for every seat', () => {
    mount();
    expect(screen.getByRole('tablist', { name: 'Seats' })).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(seatsOf(3).map((seat) => (seat === S ? `${S} — to act` : seat)));
    expect(tab(`${S} — to act`).getAttribute('aria-selected')).toBe('true');
    expect(screen.getAllByText(/^seat: p/).map((line) => line.textContent)).toEqual([`seat: ${S} — Your turn — ${hint('actions')}`]);
  });

  it("draws the seat's own zones and the shared ones, and only their cards", () => {
    mount();
    const ids = fittedLayout(game.zones, S).map((z) => z.id);
    expect(zoneIds()).toEqual(ids);
    expect(table!.placement.cards.every((c) => ids.includes(c.zoneId))).toBe(true);
    expect(cardsIn(`bench-${S}`)).toHaveLength(3);
    expect(cardsIn(`bench-${O}`)).toHaveLength(0);
  });

  it("lists every player's tableau", () => {
    mount();
    for (const seat of seatsOf(3)) {
      expect(lineOf(seat)).toBe(`${seat} 7 capital, 3 actions, 0 market share · bench 3 · backlog 1 · research 0 · development 0 · operations 0 · development team 0 · ops team 0 · scouting 0${seat === S ? ' · start player' : ''}`);
    }
  });

  it('looks at another seat without moving the turn', () => {
    mount();
    fireEvent.click(tab(O));
    expect(status()).toBe(`seat: ${O} — ${hint('actions')} — waiting for ${S}`);
    expect(zoneIds()).toContain(`bench-${O}`);
    expect(zoneIds()).not.toContain(`bench-${S}`);
    expect(tab(`${S} — to act`).getAttribute('aria-selected')).toBe('false');
    expect(tab(O).getAttribute('aria-selected')).toBe('true');
  });

  it('jumps to the next seat when the turn passes, and back with Undo', () => {
    mount();
    press('End your actions');
    expect(tab(`${N} — to act`).getAttribute('aria-selected')).toBe('true');
    expect(tab(S).getAttribute('aria-selected')).toBe('false');
    expect(status()).toBe(`seat: ${N} — Your turn — ${hint('actions')}`);

    press('Undo');
    expect(tab(`${S} — to act`).getAttribute('aria-selected')).toBe('true');
    expect(tab(N).getAttribute('aria-selected')).toBe('false');
    expect(status()).toBe(`seat: ${S} — Your turn — ${hint('actions')}`);
  });

  it('shows the research to the researcher alone, and counts it for everyone', () => {
    mount();
    press('Research the seed deck');
    expect(status()).toBe(`seat: ${S} — research — Your turn — ${hint('research')}`);
    const drawn = cardsIn(`research-${S}`);
    expect(drawn).toHaveLength(3);
    expect(drawn.every((c) => c.faceUp && c.faceKey !== 'back')).toBe(true);
    expect(lineOf(S)).toContain('research 3');

    fireEvent.click(tab(O));
    expect(cardsIn(`research-${S}`)).toHaveLength(0);
    expect(lineOf(S)).toContain('research 3');
    expect(status()).toBe(`seat: ${O} — research — ${hint('research')} — waiting for ${S}`);
  });

  it('moves a card picked on the fitted table', () => {
    mount();
    const card = cardsIn('agency-row').find((c) => Number(parseTextFaceKey(c.faceKey)!.cost) <= 7);
    expect(card, 'seed 1 deals an affordable agency card').toBeDefined();
    const cost = Number(parseTextFaceKey(card!.faceKey)!.cost);
    press('Hire a card from the agency row to your bench');
    pickNamed(parseTextFaceKey(card!.faceKey)!.name);
    const expected = `${S} ${7 - cost} capital, 2 actions, 0 market share · bench 4`;
    expect(lineOf(S)?.slice(0, expected.length)).toBe(expected);
  });

  it('says why a drag is refused, and nothing moves', () => {
    mount();
    const before = lineOf(S);
    const [card] = cardsIn(`bench-${S}`);
    drop(card.id, `bench-${S}`, 'seed-market');
    expect(screen.getByText('No rule lets you move a card there.')).toBeTruthy();
    expect(lineOf(S)).toBe(before);
    expect(cardsIn(`bench-${S}`)).toHaveLength(3);
  });

  it('gives five players five tabs and five tableau lines', () => {
    const first = mount({ players: 5 });
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(within(screen.getByTestId('tableaux')).getAllByText(/^p\d /)).toHaveLength(5);
    expect(tab(`${startOf(5)} — to act`).getAttribute('aria-selected')).toBe('true');
    first.unmount();

    // The page opens on the first tab and moves to the start seat once its view arrives; a start seat other than p0 shows the move.
    const startAt = (seed: number) => createEngine(game, lib, 5, initialState(game, seed)).engine.getState().data['lang:start-player'] as string;
    const seed = Array.from({ length: 30 }, (_, i) => i + 1).find((s) => startAt(s) !== 'p0');
    expect(seed, 'a seed in 1..30 starts 5 players on a seat other than p0').toBeDefined();
    mount({ players: 5, seed });
    expect(tab(`${startAt(seed!)} — to act`).getAttribute('aria-selected')).toBe('true');
    expect(tab('p0').getAttribute('aria-selected')).toBe('false');
  });

  it('keeps a panel per seat for a game that fits', () => {
    mount({ game: compileGame(COLOR_MATCH, lib).game! });
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getAllByText(/^seat: p/)).toHaveLength(3);
  });
});

describe('the whole card on hover', () => {
  const detail = () => screen.getByTestId('card-detail').textContent;
  const hover = (id: string | null) => act(() => table!.onHover!(id));

  it('shows the card under the pointer in full, and nothing when the pointer leaves', () => {
    mount();
    const [card] = cardsIn('agency-row');
    const attrs = parseTextFaceKey(card.faceKey)!;
    expect(detail()).toBe('');
    hover(card.id);
    expect(detail()).toBe(cardDetail(card.faceKey));
    expect(detail()!.startsWith(attrs.name)).toBe(true);
    expect(detail()).toContain('trait ');
    hover(null);
    expect(detail()).toBe('');
  });

  it('shows nothing for a face-down card, so no identity leaks', () => {
    mount();
    const [card] = cardsIn('talent-deck');
    expect(card.faceUp).toBe(false);
    hover(card.id);
    expect(detail()).toBe('');
  });

  it('shows nothing for a card that is not on the table', () => {
    mount();
    hover('no such card');
    expect(detail()).toBe('');
  });

  it("is not on a game that fits", () => {
    mount({ game: compileGame(COLOR_MATCH, lib).game! });
    expect(table!.onHover).toBeUndefined();
    expect(screen.queryByTestId('card-detail')).toBeNull();
  });
});

describe('a round played through the page', () => {
  const S = startOf(3);
  const N = after(S, 3);
  const T = after(N, 3);
  const tab = (name: string) => screen.getByRole('tab', { name });
  const selected = (name: string) => expect(tab(name).getAttribute('aria-selected'), `${name} is selected`).toBe('true');
  // A tableau line goes on to zones a step doesn't touch: compare the part that matters, so a failure shows both lines.
  const begins = (seat: string, expected: string) => expect(lineOf(seat)?.slice(0, expected.length)).toBe(expected);

  it('recruits from every source, drafts, researches, discards and passes the turn', () => {
    mount();
    for (let i = 0; i < 3; i++) press('Recruit a junior software dev');
    expect(lineOf(S)).toBe(`${S} 1 capital, 0 actions, 0 market share · bench 6 · backlog 1 · research 0 · development 0 · operations 0 · development team 0 · ops team 0 · scouting 0 · start player`);
    expect(status()).toBe(`seat: ${S} — Your turn — ${hint('bench cleanup')}`);

    press('Discard a card in your bench');
    pickFirst();
    selected(`${N} — to act`);
    expect(cardsIn('open-job-market')).toHaveLength(1);
    expect(lineOf(S)).toContain('bench 5');

    press('Hire a card from the open job market to your bench');
    pickFirst();
    begins(N, `${N} 6 capital, 2 actions, 0 market share · bench 4`);

    const hire = cardsIn('agency-row').find((c) => Number(parseTextFaceKey(c.faceKey)!.cost) <= 6);
    expect(hire, 'seed 1 deals an agency card that 6 capital buys').toBeDefined();
    const cost = Number(parseTextFaceKey(hire!.faceKey)!.cost);
    press('Hire a card from the agency row to your bench');
    pickNamed(parseTextFaceKey(hire!.faceKey)!.name);
    begins(N, `${N} ${6 - cost} capital, 1 action, 0 market share · bench 5`);

    press('Research the seed deck');
    const drawn = cardsIn(`research-${N}`);
    expect(drawn).toHaveLength(3);
    expect(drawn.every((c) => c.faceUp)).toBe(true);

    fireEvent.click(tab(S));
    expect(cardsIn(`research-${N}`)).toHaveLength(0);
    expect(lineOf(N)).toContain('research 3');
    fireEvent.click(tab(`${N} — to act`));
    selected(`${N} — to act`);

    press('Keep a card in your research');
    pickFirst();
    selected(`${T} — to act`);
    expect(cardsIn('open-idea-pool')).toHaveLength(2);
    expect(lineOf(N)).toContain('0 actions, 0 market share · bench 5 · backlog 2 · research 0 · development 0 · operations 0 · development team 0 · ops team 0 · scouting 0');

    press('Draft a card from the seed market to your backlog');
    pickFirst();
    begins(T, `${T} 7 capital, 2 actions, 0 market share · bench 3 · backlog 2`);
    expect(cardsIn('seed-market')).toHaveLength(2);

    press('End your actions');
    selected(`${S} — to act`);
    begins(S, `${S} 1 capital, 3 actions, 0 market share · bench 5`);
  });

  it('ends once the round is finished after the Market Crash, in a tie', () => {
    const set = createEngine(game, lib, 3, initialState(game, SEED)).engine.getState();
    // Found by name: the Crash's id is shuffled with the growth cards and says nothing about which card it is.
    const crash = set.cards.find((c) => c.data?.name === 'Market Crash');
    expect(crash, 'the growth deck holds the Market Crash').toBeDefined();
    mount({ initial: relocate(set, [crash!.id], 'crash-pile', game) });
    const pile = cardsIn('crash-pile');
    expect(pile).toHaveLength(1);
    expect(pile[0].faceUp).toBe(true);
    expect(parseTextFaceKey(pile[0].faceKey)!.name).toBe('Market Crash');

    for (let i = 0; i < 3; i++) press('End your actions');
    // Each player keeps 7 capital, 1 point, and a Tier 1 card in the backlog, -2.
    expect(status()).toBe(`seat: ${T} — Game over — p0, p1 and p2 win (p0 -1, p1 -1, p2 -1)`);
    expect(screen.getAllByRole('tab').filter((t) => t.textContent!.endsWith('— to act'))).toEqual([]);
    selected(T);
  });
});

describe('the canvas', () => {
  it('is 1200 × 900 for a game too big for one table, so the world is drawn at three quarters', () => {
    mount();
    expect(canvasMadeWith).toEqual({ opts: { showEmptyZones: true, size: { width: 1200, height: 900 } } });
  });

  it('is the size Pixi starts with for a game that fits, as before', () => {
    mount({ game: compileGame(COLOR_MATCH, lib).game! });
    expect(canvasMadeWith).toEqual({ opts: { showEmptyZones: true } });
  });
});

describe("the buttons' room", () => {
  const room = () => screen.getByTestId('seat-buttons');

  it('is kept when a phase has no buttons, so the table does not jump', () => {
    // Every phase of Startup Simulator has a button, so Chores stands in, crowded by four more rows: its tidying has only a card
    // to drag. Two cards on the list keep the turn there, since tidying passes it once the list has fewer than 2.
    const DONE = '  The done pile is a pile in the center that everyone can see.';
    const rows = ['hall', 'yard', 'loft', 'barn'].map((zone) => `  The ${zone} is a row in the center that everyone can see.`);
    const chores = compileGame(TURN_GAME.replace(DONE, [DONE, ...rows].join('\n')), lib).game!;
    expect(fitsTable(chores.zones, seatsOf(3))).toBe(false);
    const set = createEngine(chores, lib, 3, initialState(chores, SEED)).engine.getState();
    const start = set.data['lang:start-player'] as string;
    const two = set.cards.filter((c) => c.zoneId === 'pile').slice(0, 2).map((c) => c.id);
    mount({ game: chores, initial: relocate(set, two, `list-${start}`, chores) });
    expect(room().style.minHeight).toBe(`${BUTTON_ROW}px`);
    expect(within(room()).getAllByRole('button').length).toBeGreaterThan(0);
    for (let i = 0; i < 2; i++) press('Work');
    expect(status()).toBe(`seat: ${start} — Your turn — tidying`);
    expect(within(room()).queryAllByRole('button')).toEqual([]);
    expect(room().style.minHeight).toBe(`${BUTTON_ROW}px`);
  });

  it('is not kept on a game that fits, as before', () => {
    mount({ game: compileGame(RENT_DAY, lib).game! });
    expect(screen.getAllByRole('button', { name: 'Roll the dice' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId('seat-buttons')).toEqual([]);
  });
});

// A fitted slot's box with a row of 8 or a pile of 40 in it, the most a long turn puts there.
const fullBox = (def: ZoneDef) => placeZone(def, Array.from({ length: def.layout === 'row' ? 8 : 40 }, (_, i): CardState =>
  ({ id: `${def.id}#${i}`, zoneId: def.id, faceUp: false, faceKey: 'back' })));
type FullBox = ReturnType<typeof fullBox>;
const boxesOverlap = (a: FullBox, b: FullBox) =>
  Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
const inWorld = (b: FullBox) =>
  b.x - b.width / 2 >= TABLE_BOUNDS.min.x && b.x + b.width / 2 <= TABLE_BOUNDS.max.x &&
  b.y - b.height / 2 >= TABLE_BOUNDS.min.y && b.y + b.height / 2 <= TABLE_BOUNDS.max.y;
/**
 * What keeps a fitted table from fitting: a slot outside the world, two slots that overlap, or a board row (a public row of the
 * seat's) less than a card tall. A free zone has no slot of its own.
 */
const misfits = (defs: ZoneDef[]): string[] => {
  const slotted = defs.filter((d) => d.layout !== 'free').map((d) => [d.id, fullBox(d)] as const);
  const problems = slotted.filter(([, b]) => !inWorld(b)).map(([id]) => `${id} leaves the world`);
  slotted.forEach(([a, ab], i) => {
    for (const [b, bb] of slotted.slice(i + 1)) if (boxesOverlap(ab, bb)) problems.push(`${a} overlaps ${b}`);
  });
  for (const d of defs) {
    const boardRow = d.owner !== 'shared' && d.visibility === 'public' && d.layout === 'row';
    if (boardRow && (d.bounds?.height ?? 0) < CARD_HEIGHT) problems.push(`${d.id} is less than a card tall`);
  }
  return problems;
};
/** The def a seat's zone has on the fitted table that seat sees. */
const fittedZone = (seat: string, zone: string) => fittedLayout(game.zones, seat).find((d) => d.id === `${zone}-${seat}`)!;

describe("the Board's place on the table", () => {
  const get = (zone: string) => fittedZone('p1', zone);

  it('keeps the private rows in the strip along the bottom, the scouting on a second line', () => {
    expect(get('bench').transform).toEqual({ x: -420, y: 510 });
    expect(get('backlog').transform).toEqual({ x: 0, y: 510 });
    expect(get('research').transform).toEqual({ x: 420, y: 510 });
    expect(get('scouting').transform).toEqual({ x: 0, y: 330 });
  });

  it('puts the Board in one line between the shared lines and the strip, each slot 416 tall', () => {
    expect(get('development').transform).toEqual({ x: -420, y: -126 });
    expect(get('operations').transform).toEqual({ x: 0, y: -126 });
    expect(get('ops-team').transform).toEqual({ x: 420, y: -126 });
    for (const zone of ['development', 'operations', 'ops-team']) expect(get(zone).bounds?.height, zone).toBe(416);
  });

  it('hangs the development team under the development, as a free zone last in the list', () => {
    expect(get('development-team')).toMatchObject({ layout: 'free', transform: { x: -420, y: -126 } });
    expect(fittedLayout(game.zones, 'p1').at(-1)?.id).toBe('development-team-p1');
  });

  // Closes 1a-2's parked guard on the top and bottom lines for the real game. The layout depends only on the viewer, so p0 to p4
  // cover 2 to 5 seats.
  it.each(seatsOf(5))('keeps every slot inside the world, apart and at least a card tall, and every zone reachable, for %s', (viewer) => {
    const placed = fittedLayout(game.zones, viewer);
    expect(misfits(placed)).toEqual([]);
    expect(unreachableZones(placed, 7)).toEqual([]);
  });
});

// Shared by the tests that arrange a Board: a 3-player game after Setup, a card found by name, and the seats around the start player.
const setUp = (): GameState => createEngine(game, lib, 3, initialState(game, SEED)).engine.getState();
/** The id of the first card with this name, in this zone if one is given. */
const idOf = (state: GameState, name: string, zoneId?: string): string =>
  state.cards.find((c) => c.data?.name === name && (zoneId === undefined || c.zoneId === zoneId))!.id;
const S = startOf(3);
const N = after(S, 3);
const O = seatsOf(3).find((seat) => seat !== S)!;

describe('the Board on the page', () => {
  const tab = (name: string) => screen.getByRole('tab', { name });
  const boardOf = (seat: string) => screen.getByTestId(`board-${seat}`).textContent;
  /** S's Board: a Dating App with blue cubes 4 and two staff on it, a To-Do List in operations and a QA Engineer in the ops team. */
  const build = (): GameState => {
    let state = setUp();
    const dating = idOf(state, 'Dating App');
    state = relocate(state, [dating], `development-${S}`, game);
    state = putOn(state, [idOf(state, 'Junior Software Dev', `bench-${S}`), idOf(state, 'Architect')], `development-team-${S}`, dating, game);
    state = changeCard(state, dating, { 'blue cubes': 4 }, game);
    state = relocate(state, [idOf(state, 'To-Do List')], `operations-${S}`, game);
    return relocate(state, [idOf(state, 'QA Engineer')], `ops-team-${S}`, game);
  };
  const BUILT = build();
  const dating = idOf(BUILT, 'Dating App');
  const todo = idOf(BUILT, 'To-Do List');
  const junior = idOf(BUILT, 'Junior Software Dev', `development-team-${S}`);
  const architect = idOf(BUILT, 'Architect');
  const BOARD = `development: Dating App [Blue 4/6, Red 0/0] with Junior Software Dev and Architect · operations: To-Do List [Blue 0/4, Red 0/0] · ops team: QA Engineer`;

  it('hangs the staff under their card on the canvas, and captions each card with its counts', () => {
    mount({ initial: BUILT });
    expect(cardsIn(`development-team-${S}`).map((c) => c.id).sort()).toEqual([junior, architect].sort());
    const def = table!.tableDef.zones.find((z) => z.id === `development-${S}`)!;
    const at = computeZoneLayout(def, cardsIn(`development-${S}`)).get(dating)!;
    const placed = (id: string) => cardsIn(`development-team-${S}`).find((c) => c.id === id)!.data!;
    expect(placed(junior).x).toBe(at.x);
    expect(placed(architect).x).toBe(at.x);
    expect(placed(junior).y).toBe(at.y + 176);
    expect(placed(architect).y).toBe(at.y + 210);
    expect(table!.decor).toEqual({ [dating]: { caption: 'Blue 4/6\nRed 0/0' }, [todo]: { caption: 'Blue 0/4\nRed 0/0' } });
  });

  it("lists every seat's Board as text, whichever seat is looked at", () => {
    mount({ initial: BUILT });
    expect(boardOf(S)).toBe(BOARD);
    expect(screen.queryByTestId(`board-${O}`)).toBeNull();
    fireEvent.click(tab(O));
    expect(cardsIn(`development-${S}`)).toEqual([]);
    expect(boardOf(S)).toBe(BOARD);
  });

  it('counts the Board on the tableau line and leaves the naming to the Board line', () => {
    mount({ initial: BUILT });
    expect(lineOf(S)?.startsWith(`${S} 7 capital, 3 actions, 0 market share · `)).toBe(true);
    expect(lineOf(S)).toContain('development 1 · operations 1 · development team 2 · ops team 1 · scouting 0');
    expect(lineOf(S)).not.toContain('Dating App');
  });

  it('shows the flags set on a card', () => {
    mount({ initial: changeCard(BUILT, architect, { onboarding: true }, game) });
    expect(boardOf(S)).toContain('Architect (onboarding)');
  });

  it('counts market share among the numbers after Income, and shows the cubes Generate adds on the canvas', () => {
    mount({ initial: relocate(BUILT, [idOf(BUILT, 'Trading Bot')], `operations-${N}`, game) });
    press('End your actions');
    expect(tab(`${N} — to act`).getAttribute('aria-selected')).toBe('true');
    expect(lineOf(N)?.startsWith(`${N} 11 capital, 3 actions, 1 market share · `)).toBe(true);
    fireEvent.click(tab(S));
    // The Junior's 1 and the Architect's 3 are capped at the 6 the card needs.
    expect(table!.decor![dating].caption).toBe('Blue 6/6\nRed 0/0');
  });

  it("keeps a card a seat can't see, and its counts, out of that seat's scene, captions and text", () => {
    const set = setUp();
    const hidden = set.cards.find((c) => c.zoneId === `backlog-${O}`)!;
    const state = changeCard(set, hidden.id, { 'blue cubes': 3 }, game);
    const engineTableDef = createEngine(game, lib, 3, state).tableDef;
    const projected = deriveScene(engineTableDef, { cards: state.cards }, S).cards.find((c) => c.id === hidden.id)!;
    expect(projected.faceKey).toBe('back');
    expect(Object.keys(projected.data ?? {}).filter((key) => key !== 'x' && key !== 'y')).toEqual([]);

    mount({ initial: state });
    expect(status()).toMatch(new RegExp(`^seat: ${S} `));
    expect(table!.placement.cards.filter((c) => c.zoneId === `backlog-${O}`)).toEqual([]);
    expect(table!.decor).toBeDefined();
    expect(Object.keys(table!.decor!)).not.toContain(hidden.id);
    expect(document.body.textContent).not.toContain(String(hidden.data!.name));
    expect(document.body.textContent).not.toContain('3/');
  });

  // A guard: this passes before the change, and pins that a game whose buttons pick no cards gets no decor.
  it('puts nothing on the cards of a game whose buttons pick none', () => {
    mount({ game: compileGame(COLOR_MATCH, lib).game! });
    expect(table).not.toBeNull();
    expect(table!.decor).toBeUndefined();
  });
});

// Shared by the tests that pick cards by clicking them on the table: a click on a card, the offer of the buttons that take it and a
// choice there, a card's ring, and a zone's cards in slot order (`cardsIn` keeps state order) or one of them by name.
const click = (id: string) => act(() => table!.onCardClick!(id));
const offer = () => screen.getByRole('group', { name: 'Card buttons' });
const choose = (label: string) => fireEvent.click(within(offer()).getByRole('button', { name: label }));
const ring = (id: string) => table!.decor?.[id]?.ring;
const inOrder = (zoneId: string) => cardsByZone({ cards: table!.placement.cards, zones: [] }).get(zoneId) ?? [];
const named = (zoneId: string, name: string) => inOrder(zoneId).find((c) => parseTextFaceKey(c.faceKey)!.name === name)!.id;
/** The offer's buttons before its Cancel, each as its label and `true` when live, else the reason it is greyed. */
const offered = () => {
  const buttons = within(offer()).getAllByRole('button');
  expect(buttons.at(-1)!.textContent).toBe('Cancel');
  return buttons.slice(0, -1).map((b) => [b.textContent, b.getAttribute('aria-disabled') === 'true' ? b.getAttribute('title') : true]);
};
const noOffer = () => expect(screen.queryByRole('group', { name: 'Card buttons' })).toBeNull();

describe('picking cards by clicking them', () => {
  const tab = (name: string) => screen.getByRole('tab', { name });
  const boardOf = (seat: string) => screen.getByTestId(`board-${seat}`).textContent;
  const confirm = () => fireEvent.click(within(picker()).getByRole('button', { name: 'Confirm' }));
  const pressedIn = (name: string) => within(picker()).getByRole('button', { name: `Pick ${name}` }).getAttribute('aria-pressed');
  const ASSIGN = 'Assign some cards from your bench to a card in your development';
  const LAY_OFF = 'Lay off some cards from your bench to the open job market';
  const HIRES = ['to your bench', 'to your ops team', 'to a card in your development'].map((to) => `Hire some cards from your scouting ${to}`);

  /** S greenlights the card in its backlog by clicking it, and gets its id. */
  const greenlight = () => {
    const [card] = cardsIn(`backlog-${S}`);
    click(card.id);
    choose('Greenlight a card in your backlog');
    return card.id;
  };
  /** S assigns its Junior Software Dev and Junior Hardware Eng to the card greenlit, clicking the card last. */
  const assign = (onto: string) => {
    click(named(`bench-${S}`, 'Junior Software Dev'));
    choose(ASSIGN);
    click(named(`bench-${S}`, 'Junior Hardware Eng'));
    click(onto);
  };

  it('greenlights a card clicked in the backlog, offered by its one button', () => {
    mount();
    const [card] = cardsIn(`backlog-${S}`);
    click(card.id);
    expect(within(offer()).getByText(`${parseTextFaceKey(card.faceKey)!.name}:`)).toBeTruthy();
    expect(offered()).toEqual([['Greenlight a card in your backlog', true]]);
    expect(ring(card.id)).toBe('chosen');
    choose('Greenlight a card in your backlog');
    expect(cardsIn(`development-${S}`).map((c) => c.id)).toContain(card.id);
    expect(lineOf(S)).toContain('3 actions');
    expect(lineOf(S)).toContain('development 1');
    noOffer();
    expect(Object.values(table!.decor ?? {}).filter((d) => d.ring !== undefined)).toEqual([]);
  });

  it('assigns a set to the card it goes to by clicking only: a card, its button, another card, then the card they go to', () => {
    mount();
    const greenlit = greenlight();
    const attrs = parseTextFaceKey(cardsIn(`development-${S}`)[0].faceKey)!;
    const software = named(`bench-${S}`, 'Junior Software Dev');
    const hardware = named(`bench-${S}`, 'Junior Hardware Eng');
    const qa = named(`bench-${S}`, 'Junior QA Tester');
    click(software);
    expect(offered()).toEqual([
      [ASSIGN, true],
      ['Assign some cards from your bench to your ops team', 'their operations is not empty'],
      [LAY_OFF, true],
    ]);
    choose(ASSIGN);
    noOffer();
    expect(['Junior Software Dev', 'Junior Hardware Eng', 'Junior QA Tester'].map(pressedIn)).toEqual(['true', 'false', 'false']);
    expect([ring(software), ring(hardware), ring(qa)]).toEqual(['chosen', 'choice', 'choice']);

    click(hardware);
    expect([ring(software), ring(hardware), ring(qa)]).toEqual(['chosen', 'chosen', 'choice']);
    click(greenlit);
    const team = cardsIn(`development-team-${S}`);
    expect(team.map((c) => c.id).sort()).toEqual([software, hardware].sort());
    expect(team.map((c) => c.data?.['lang:on'])).toEqual([greenlit, greenlit]);
    expect(lineOf(S)).toContain('2 actions');
    expect(boardOf(S)).toBe(
      `development: ${attrs.name} [Blue 0/${attrs['blue cost']}, Red 0/${attrs['red cost']}] with Junior Software Dev and Junior Hardware Eng`,
    );
    expect(screen.queryByRole('group', { name: 'Pick cards' })).toBeNull();
  });

  it('sources by clicking, shows the scouting in the private strip to the seat alone, and passes the rest to the left end of the row', () => {
    mount();
    assign(greenlight());
    click(named(`bench-${S}`, 'Junior QA Tester'));
    choose(LAY_OFF);
    confirm();
    expect(status()).toBe(`seat: ${S} — sourcing — Your turn — ${hint('sourcing')}`);
    const scouted = cardsIn(`scouting-${S}`);
    expect(scouted).toHaveLength(1);
    expect(scouted[0].faceUp).toBe(true);
    const found = scouted[0].id;
    expect(lineOf(S)).toContain('1 action,');
    expect(lineOf(S)).toContain('scouting 1');

    click(found);
    expect(offered().map(([label]) => label)).toEqual(HIRES);
    fireEvent.click(within(offer()).getByRole('button', { name: 'Cancel' }));
    noOffer();
    fireEvent.click(tab(O));
    expect(cardsIn(`scouting-${S}`)).toEqual([]);
    expect(lineOf(S)).toContain('scouting 1');
    expect(screen.getByTestId(`board-${S}`)).toBeTruthy();

    fireEvent.click(tab(`${S} — to act`));
    press('Pass on the rest');
    expect(status()).toBe(`seat: ${S} — Your turn — ${hint('actions')}`);
    expect(inOrder('agency-row')[0].id).toBe(found);
  });

  it('keeps the picks of a set the rules refuse as a whole, on the list and on the table', () => {
    const set = setUp();
    const dating = idOf(set, 'Dating App');
    mount({ initial: relocate(set, [dating], `development-${S}`, game) });
    press(LAY_OFF);
    pickNamed('Junior Software Dev');
    pickNamed('Junior Hardware Eng');
    confirm();
    const [first, second] = inOrder(`scouting-${S}`);
    const costOf = (card: CardState) => Number(parseTextFaceKey(card.faceKey)!.cost);
    expect([costOf(first) <= 7, costOf(second) <= 7, costOf(first) + costOf(second) > 7], 'seed 1 scouts two cards that 7 capital buys one at a time, not both')
      .toEqual([true, true, true]);
    click(first.id);
    choose(HIRES[2]);
    click(second.id);
    click(dating);
    expect(screen.getByText('they have at least the total cost of the picked cards in capital')).toBeTruthy();
    expect([ring(first.id), ring(second.id)]).toEqual(['chosen', 'chosen']);
    expect([first, second].map((card) => pressedIn(parseTextFaceKey(card.faceKey)!.name))).toEqual(['true', 'true']);
    expect(cardsIn(`scouting-${S}`)).toHaveLength(2);
  });

  it('launches a card clicked in the development, and explains a button greyed for it, keeping the offer', () => {
    let set = setUp();
    const dating = idOf(set, 'Dating App');
    set = relocate(set, [dating], `development-${S}`, game);
    set = putOn(set, [idOf(set, 'Junior Software Dev', `bench-${S}`)], `development-team-${S}`, dating, game);
    set = changeCard(set, dating, { 'blue cubes': 6 }, game);
    const lock = idOf(set, 'Smart Lock');
    mount({ initial: relocate(set, [lock], `development-${S}`, game) });
    const LAUNCH = 'Launch a card from your development to your operations';

    click(lock);
    expect(offered()).toEqual([[LAUNCH, 'it is feature complete'], ['Pivot a card in your development', true]]);
    choose(LAUNCH);
    expect(screen.getByText('it is feature complete')).toBeTruthy();
    expect(within(offer()).getByText('Smart Lock:')).toBeTruthy();

    fireEvent.click(within(offer()).getByRole('button', { name: 'Cancel' }));
    click(dating);
    choose(LAUNCH);
    expect(boardOf(S)).toBe('development: Smart Lock [Blue 0/1, Red 0/5] · operations: Dating App [Blue 6/6, Red 0/0] · ops team: Junior Software Dev');
    expect(lineOf(S)).toContain('2 actions');
  });

  it('Review Focus: offers another seat its buttons greyed with whose turn it is, and sends nothing', () => {
    const set = setUp();
    mount({ initial: relocate(set, [idOf(set, 'Dating App')], `development-${O}`, game) });
    fireEvent.click(tab(O));
    const before = lineOf(O);
    click(named(`bench-${O}`, 'Junior Software Dev'));
    const turn = `It's ${S}'s turn.`;
    expect(offered()).toEqual([ASSIGN, 'Assign some cards from your bench to your ops team', LAY_OFF].map((label) => [label, turn]));
    choose(ASSIGN);
    expect(screen.getByText(turn)).toBeTruthy();
    expect(lineOf(O)).toBe(before);
  });

  it('Review Focus: says no button takes a card nothing takes, and offers nothing', () => {
    mount();
    click(cardsIn('talent-deck')[0].id);
    expect(screen.getByText('No button takes this card now.')).toBeTruthy();
    noOffer();
  });

  it('Review Focus: drops a picked card that leaves, and does not pick it again when it comes back', () => {
    mount();
    const hire = inOrder('agency-row').find((c) => Number(parseTextFaceKey(c.faceKey)!.cost) <= 7);
    expect(hire, 'seed 1 deals an agency card that 7 capital buys').toBeDefined();
    click(hire!.id);
    choose('Hire a card from the agency row to your bench');
    expect(cardsIn(`bench-${S}`).map((c) => c.id)).toContain(hire!.id);
    click(hire!.id);
    choose(LAY_OFF);
    const software = named(`bench-${S}`, 'Junior Software Dev');
    click(software);
    expect([ring(hire!.id), ring(software)]).toEqual(['chosen', 'chosen']);

    const undo = vi.spyOn(GameServer.prototype, 'undo');
    press('Undo');
    expect(cardsIn('agency-row').map((c) => c.id)).toContain(hire!.id);
    expect(ring(hire!.id)).toBeUndefined();
    // Every press on this page closes the picker, so the same card comes back to the bench from the server, as another window on
    // the seat would hire it: it is offered to pick again, but not picked.
    const server = undo.mock.contexts[0] as GameServer;
    undo.mockRestore();
    act(() => {
      server.submit(S, { type: 'hire a card from the agency row to their bench', cardId: hire!.id });
    });
    expect(cardsIn(`bench-${S}`).map((c) => c.id)).toContain(hire!.id);
    expect(ring(hire!.id)).toBe('choice');
    expect(ring(software)).toBe('chosen');
    confirm();
    expect(cardsIn('open-job-market').map((c) => c.id)).toEqual([software]);
  });

  it('Review Focus: keeps an offer while its card has a button to take it, and closes it once none does', () => {
    mount();
    const hire = inOrder('agency-row').find((c) => Number(parseTextFaceKey(c.faceKey)!.cost) <= 7)!.id;
    click(hire);
    choose('Hire a card from the agency row to your bench');
    click(hire);
    expect(offered().map(([label]) => label)).toEqual([ASSIGN, 'Assign some cards from your bench to your ops team', LAY_OFF]);
    press('Undo');
    expect(offered().map(([label]) => label)).toEqual(['to your bench', 'to a card in your development', 'to your ops team'].map((to) => `Hire a card from the agency row ${to}`));
    expect(ring(hire)).toBe('chosen');

    press('Research the seed deck');
    const [drawn] = inOrder(`research-${S}`);
    click(drawn.id);
    expect(offered()).toEqual([['Keep a card in your research', true]]);
    press('Undo');
    expect(cardsIn(`research-${S}`)).toEqual([]);
    noOffer();
    expect(ring(drawn.id)).toBeUndefined();
  });

  it('Review Focus: closes the offer when a button is pressed', () => {
    mount();
    const card = named(`bench-${S}`, 'Junior QA Tester');
    click(card);
    press('Recruit a junior software dev');
    noOffer();
    expect(status()).toBe(`seat: ${S} — Your turn — ${hint('actions')}`);
    click(card);
    press('Hire a card from the agency row to your bench');
    noOffer();
    expect(picker()).toBeTruthy();
    click(card);
    expect(screen.getByText('Pick a card from the agency row to hire.')).toBeTruthy();
    fireEvent.click(within(picker()).getByRole('button', { name: 'Cancel' }));
    click(card);
    press('End your actions');
    noOffer();
  });

  it('Review Focus: takes a click that wobbles into a short drag back to its zone as a click, on a card in a stack too', () => {
    let set = setUp();
    const dating = idOf(set, 'Dating App');
    set = relocate(set, [dating], `development-${S}`, game);
    const hardware = idOf(set, 'Junior Hardware Eng', `bench-${S}`);
    mount({ initial: putOn(set, [hardware], `development-team-${S}`, dating, game) });
    drop(named(`bench-${S}`, 'Junior Software Dev'), `bench-${S}`, `bench-${S}`);
    expect(within(offer()).getByText('Junior Software Dev:')).toBeTruthy();
    drop(hardware, `development-team-${S}`, `development-team-${S}`);
    expect(within(offer()).getByText('Junior Hardware Eng:')).toBeTruthy();
    expect(offered().map(([label]) => label)).toEqual([
      'Reassign a card from your development team to a card in your development', 'Dismiss a card in your development team',
    ]);
  });
});
