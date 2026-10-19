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
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import { TableModel } from '@/engine/core/table-model';
import type { DropIntent } from '@/engine/input/table-input-context';
import { TableInputTracker } from '@/engine/input/table-input-tracker';
import { STACK_STEP } from '@/engine/core/lang/fit-layout';

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
    // Where the first card hanging under the development's middle card goes: -126 + 140 + 36.
    expect(get('development-team')).toMatchObject({ layout: 'free', transform: { x: -420, y: 50 } });
    expect(fittedLayout(game.zones, 'p1').at(-1)?.id).toBe('development-team-p1');
  });

  // Closes 1a-2's parked guard on the top and bottom lines for the real game. The layout depends only on the viewer, so p0 to p4
  // cover 2 to 5 seats.
  it.each(seatsOf(5))('keeps every slot inside the world, apart and at least a card tall, and every zone reachable, for %s', (viewer) => {
    const placed = fittedLayout(game.zones, viewer);
    expect(misfits(placed)).toEqual([]);
    // The development's middle is where the first card hanging under its middle card goes, so a drop there lands in the
    // development team, as one on a card hanging there would; the development's cards, at its top, are above it.
    expect(unreachableZones(placed, 7)).toEqual([`development-${viewer}: centre goes to development-team-${viewer}`]);
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
  const BOARD = `development: Dating App (tier Tier 1, tag Social, sector Consumer) [Blue 4/6, Red 0/0] with Junior Software Dev and Architect · operations: To-Do List (tier Tier 1, tag App, sector Concept) [Blue 0/4, Red 0/0] · ops team: QA Engineer`;

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
    mount({ initial: relocate(relocate(BUILT, [idOf(BUILT, 'App Store')], `operations-${N}`, game), [idOf(BUILT, 'Junior Software Dev', `bench-${N}`)], `ops-team-${N}`, game) });
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
  const ASSIGN_TO_PRODUCT_LABEL = 'Assign some cards from your bench to a card in your operations';
  const LAY_OFF = 'Lay off some cards from your bench to the open job market';
  const HIRES = ['to your bench', 'to your ops team', 'to a card in your operations', 'to a card in your development'].map((to) => `Hire some cards from your scouting ${to}`);

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
      [ASSIGN_TO_PRODUCT_LABEL, 'There is no card in your operations.'],
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
      `development: ${attrs.name} (tier ${attrs.tier}, tag ${attrs.tag}, sector ${attrs.sector}) [Blue 0/${attrs['blue cost']}, Red 0/${attrs['red cost']}] with Junior Software Dev and Junior Hardware Eng`,
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
    choose(HIRES[3]);
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
    expect(boardOf(S)).toBe('development: Smart Lock (tier Tier 1, tag IoT, sector Deep Tech) [Blue 0/1, Red 0/5] · operations: Dating App (tier Tier 1, tag Social, sector Consumer) [Blue 6/6, Red 0/0] · ops team: Junior Software Dev');
    expect(lineOf(S)).toContain('2 actions');
  });

  it('Review Focus: offers another seat its buttons greyed with whose turn it is, and sends nothing', () => {
    const set = setUp();
    mount({ initial: relocate(set, [idOf(set, 'Dating App')], `development-${O}`, game) });
    fireEvent.click(tab(O));
    const before = lineOf(O);
    click(named(`bench-${O}`, 'Junior Software Dev'));
    const turn = `It's ${S}'s turn.`;
    expect(offered()).toEqual([
      [ASSIGN, turn], ['Assign some cards from your bench to your ops team', turn],
      [ASSIGN_TO_PRODUCT_LABEL, 'There is no card in your operations.'], [LAY_OFF, turn],
    ]);
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
    let server: GameServer;
    try {
      press('Undo');
      server = undo.mock.contexts[0] as GameServer;
    } finally {
      undo.mockRestore();
    }
    expect(cardsIn('agency-row').map((c) => c.id)).toContain(hire!.id);
    expect(ring(hire!.id)).toBeUndefined();
    // Every press on this page closes the picker, so the same card comes back to the bench from the server, as another window on
    // the seat would hire it: it is offered to pick again, but not picked.
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
    expect(offered().map(([label]) => label)).toEqual([ASSIGN, 'Assign some cards from your bench to your ops team', ASSIGN_TO_PRODUCT_LABEL, LAY_OFF]);
    press('Undo');
    expect(offered().map(([label]) => label)).toEqual(['to your bench', 'to a card in your development', 'to your ops team', 'to a card in your operations'].map((to) => `Hire a card from the agency row ${to}`));
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

  it('keeps the picks when the button picking is pressed again, and starts over for another button', () => {
    mount();
    const software = named(`bench-${S}`, 'Junior Software Dev');
    press(LAY_OFF);
    pickNamed('Junior Software Dev');
    press(LAY_OFF);
    expect(pressedIn('Junior Software Dev')).toBe('true');
    expect(ring(software)).toBe('chosen');
    press('Hire a card from the agency row to your bench');
    press(LAY_OFF);
    expect(pressedIn('Junior Software Dev')).toBe('false');
    expect(ring(software)).toBe('choice');
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

describe('the Board played by clicking', () => {
  const tab = (name: string) => screen.getByRole('tab', { name });
  const selected = (name: string) => tab(name).getAttribute('aria-selected');
  const T = after(N, 3);

  it('builds, generates, launches and earns Market Share, by clicking cards', () => {
    let set = setUp();
    const todo = idOf(set, 'To-Do List');
    set = relocate(set, [todo], `development-${S}`, game);
    mount({ initial: changeCard(set, todo, { 'blue cubes': 3 }, game) });

    click(named(`bench-${S}`, 'Junior Software Dev'));
    choose('Assign some cards from your bench to a card in your development');
    click(todo);
    expect(lineOf(S)).toContain('2 actions');

    // Generate: the Junior's 1 blue takes the card to its blue cost.
    press('End your actions');
    fireEvent.click(tab(S));
    expect(table!.decor![todo].caption).toBe('Blue 4/4\nRed 0/0');

    // The tabs follow the turn only when the seat to act changes, and S's tab was clicked while N was to act.
    fireEvent.click(tab(`${N} — to act`));
    press('End your actions');
    expect(selected(`${T} — to act`)).toBe('true');
    press('End your actions');
    expect(selected(`${S} — to act`)).toBe('true');
    // Income paid nothing, with no card in operations, and the payroll of $0 (a Junior's) skipped straight to actions.
    expect(lineOf(S)?.startsWith(`${S} 7 capital, 3 actions, 0 market share · `)).toBe(true);
    expect(status()).toBe(`seat: ${S} — Your turn — ${hint('actions')}`);

    click(todo);
    choose('Launch a card from your development to your operations');
    expect(screen.getByTestId(`board-${S}`).textContent).toBe('operations: To-Do List (tier Tier 1, tag App, sector Concept) [Blue 4/4, Red 0/0] · ops team: Junior Software Dev [1 pending blue]');

    // Income: the To-Do List's rev of 1 is paid, and its rev earns 1 market share.
    for (const seat of [S, N, T]) {
      expect(selected(`${seat} — to act`)).toBe('true');
      press('End your actions');
    }
    expect(lineOf(S)?.startsWith(`${S} 8 capital, 3 actions, 1 market share · `)).toBe(true);
  });
});

/**
 * The real tracker over the table the page last drew, as the canvas runs it, its clicks and drops handed to the page, with every
 * drop it reports. The pointer is given in world units, and every card rests where the page put it.
 */
const trackTable = () => {
  const model = new TableModel();
  model.setScene(deriveScene(table!.tableDef, table!.placement, table!.viewer));
  const drops: DropIntent[] = [];
  const tracker = new TableInputTracker({
    clientToWorld: (x, y) => ({ x, y }),
    getPlacedCards: () => model.getPlacedCards(),
    getZones: () => table!.tableDef.zones,
    getCards: () => table!.placement.cards,
    registry: registerStarterRules(new RuleRegistry()),
    beginDrag: (id) => model.beginDrag(id),
    dragTo: (id, world) => model.dragTo(id, world),
    endDrag: (id) => model.endDrag(id),
    intents: {
      onDrop: (intent) => {
        drops.push(intent);
        act(() => table!.onDrop!(intent));
      },
      onCardClick: (id) => act(() => table!.onCardClick!(id)),
    },
  });
  const restOf = (id: string) => model.getPlacedCards().find((c) => c.id === id)!.transform;
  /** Presses at (x, y), moves by (dx, dy) and lets go there. */
  const gesture = (x: number, y: number, dx: number, dy: number) => {
    tracker.pointerDown(x, y);
    tracker.pointerMove(x + dx, y + dy);
    tracker.pointerUp(x + dx, y + dy);
  };
  return { drops, restOf, gesture };
};

// As hearts-clicks.test.ts drives the tracker over Hearts' table, this drives it over the Board: a press that moves 6, past the 5 a
// click allows, is a drop, and the page takes a drop back in the card's own zone as a click on the card.
describe('a click that wobbles into a short drag on the Board, through the real tracker', () => {
  type Point = { x: number; y: number };
  const NO_RULE = 'No rule lets you move a card there.';
  const WOBBLES = [[6, 0], [-6, 0], [0, 6], [0, -6]] as const;
  const team = `development-team-${S}`;
  /** S's development holds these cards in this order, with these cards from S's bench on the one named, if any. */
  const board = (cards: readonly string[], staff: readonly string[] = [], on = cards[0]): GameState => {
    let state = setUp();
    state = relocate(state, cards.map((name) => idOf(state, name)), `development-${S}`, game);
    if (staff.length === 0) return state;
    return putOn(state, staff.map((name) => idOf(state, name, `bench-${S}`)), team, idOf(state, on), game);
  };
  /**
   * Wobbles each way from a point on the card, each time a fresh press: the drop lands back in the card's zone, the offer of its
   * buttons opens and no move is refused. Cancel closes the offer before the next.
   */
  const wobblesAreClicks = (card: string, name: string, zone: string, aim: (rest: Point) => Point) => {
    for (const [dx, dy] of WOBBLES) {
      const { drops, restOf, gesture } = trackTable();
      const { x, y } = aim(restOf(card));
      gesture(x, y, dx, dy);
      expect(drops, `${name} wobbled ${dx}, ${dy}`).toEqual([expect.objectContaining({ cardId: card, fromZoneId: zone, toZoneId: zone })]);
      expect(within(offer()).getByText(`${name}:`)).toBeTruthy();
      expect(screen.queryByText(NO_RULE)).toBeNull();
      fireEvent.click(within(offer()).getByRole('button', { name: 'Cancel' }));
    }
  };
  const middle = (rest: Point) => rest;
  /** The middle of the top strip of a card that the next card in its column is drawn over. */
  const strip = (rest: Point) => ({ x: rest.x, y: rest.y - CARD_HEIGHT / 2 + STACK_STEP / 2 });
  /** The drops reported when S's Junior QA Tester is dragged from its bench to a point. */
  const dragQaTo = (state: GameState, to: Point) => {
    const { drops, restOf, gesture } = trackTable();
    const from = restOf(idOf(state, 'Junior QA Tester', `bench-${S}`));
    gesture(from.x, from.y, to.x - from.x, to.y - from.y);
    return drops;
  };

  it.each([
    ['a lone card, and no card on any card', ['Dating App'], [], 'Dating App'],
    ['a lone card with a card on it', ['Dating App'], ['Junior Hardware Eng'], 'Dating App'],
    ['two cards, and no card on any card', ['Dating App', 'To-Do List'], [], 'Dating App'],
    ['two cards, a card on the first', ['Dating App', 'To-Do List'], ['Junior Hardware Eng'], 'Dating App'],
    ['two cards, a card on the second', ['Dating App', 'To-Do List'], ['Junior Hardware Eng'], 'To-Do List'],
  ] as const)('takes a wobble on a card in the development as a click on it: %s', (_, cards, staff, on) => {
    const state = board(cards, staff, on);
    mount({ initial: state });
    for (const name of cards) wobblesAreClicks(idOf(state, name), name, `development-${S}`, middle);
  });

  it.each([
    ['on a lone card', ['Dating App']],
    ['on the first of two cards', ['Dating App', 'To-Do List']],
  ] as const)('takes a wobble on the strip of a card in a stack, and on the last card, as a click on it: %s', (_, cards) => {
    const state = board(cards, ['Junior Software Dev', 'Junior Hardware Eng']);
    mount({ initial: state });
    wobblesAreClicks(idOf(state, 'Junior Software Dev', team), 'Junior Software Dev', team, strip);
    wobblesAreClicks(idOf(state, 'Junior Hardware Eng', team), 'Junior Hardware Eng', team, middle);
    for (const name of cards) wobblesAreClicks(idOf(state, name), name, `development-${S}`, middle);
  });

  it('drops a card dragged onto a stack in the development team', () => {
    const state = board(['Dating App'], ['Junior Software Dev', 'Junior Hardware Eng']);
    mount({ initial: state });
    const first = trackTable().restOf(idOf(state, 'Junior Software Dev', team));
    expect(dragQaTo(state, strip(first))).toEqual([expect.objectContaining({ fromZoneId: `bench-${S}`, toZoneId: team })]);
  });

  it.each([
    ['a lone card, and no card on any card', ['Dating App'], []],
    ['two cards, and no card on any card', ['Dating App', 'To-Do List'], []],
    ['two cards, a card on the first', ['Dating App', 'To-Do List'], ['Junior Hardware Eng']],
  ] as const)('drops a card dragged onto a card in the development in the development: %s', (_, cards, staff) => {
    const state = board(cards, staff);
    mount({ initial: state });
    for (const name of cards) {
      const card = trackTable().restOf(idOf(state, name));
      expect(dragQaTo(state, card), name).toEqual([expect.objectContaining({ fromZoneId: `bench-${S}`, toZoneId: `development-${S}` })]);
    }
  });
});

describe('what the rules work out, on the Board', () => {
  const tab = (name: string) => screen.getByRole('tab', { name });
  const boardOf = (seat: string) => screen.getByTestId(`board-${seat}`).textContent;
  const NAMES = ['Neobank', 'Viral Video App', 'Search Engine', 'Engineer', 'Streaming Service'];
  /**
   * The worked view's arrangement (startup-simulator.test.ts): S develops a Neobank with no one on it, and a Viral Video App with 2
   * blue cubes cut and, here, 1 made; a Search Engine is in S's operations and an Engineer in its ops team; O's backlog holds the
   * Streaming Service.
   */
  const stall = (): GameState => {
    let state = setUp();
    const [neobank, viral, search, engineer, streaming] = NAMES.map((name) => idOf(state, name));
    state = relocate(state, [neobank, viral], `development-${S}`, game);
    state = changeCard(state, viral, { 'cut blue cubes': 2, 'blue cubes': 1 }, game);
    state = relocate(state, [search], `operations-${S}`, game);
    state = relocate(state, [engineer], `ops-team-${S}`, game);
    return relocate(state, [streaming], `backlog-${O}`, game);
  };
  const STALL = stall();
  const [neobank, viral, search, engineer, streaming] = NAMES.map((name) => idOf(STALL, name));
  const LINE = [
    'development: Neobank (tier Tier 2, tag Crypto, requires Commerce, sector FinTech, stalled) [Blue 0/10, Red 0/0];',
    'Viral Video App (tier Tier 1, tag Social, sector Consumer) [Blue 1/4 +2 cut, Red 0/0]',
    '· operations: Search Engine (tier Tier 2, tag AI, requires Platform, sector Infra) [Blue 0/12, Red 0/0]',
    '· ops team: Engineer (efficient in ops)',
  ].join(' ');

  it('captions each card with its need after the cut, and badges a card with a flag that changes what it makes or costs', () => {
    mount({ initial: STALL });
    // Review Focus: the Search Engine is Launched and the Engineer is staff, so neither is stalled.
    expect(table!.decor).toEqual({
      [neobank]: { caption: 'Blue 0/10\nRed 0/0', badge: 'stalled' },
      [viral]: { caption: 'Blue 1/4 +2 cut\nRed 0/0' },
      [search]: { caption: 'Blue 0/12\nRed 0/0' },
      [engineer]: { badge: 'efficient in ops' },
    });
  });

  it("names each card's words and flags on the Board line, whichever seat is looked at", () => {
    mount({ initial: STALL });
    expect(boardOf(S)).toBe(LINE);
    fireEvent.click(tab(O));
    expect(boardOf(S)).toBe(LINE);
  });

  it('drops stalled once a lead it can use is on it', () => {
    mount({ initial: putOn(STALL, [idOf(STALL, 'Architect')], `development-team-${S}`, neobank, game) });
    expect(table!.decor![neobank]).toEqual({ caption: 'Blue 0/10\nRed 0/0' });
    expect(boardOf(S)).toContain('Neobank (tier Tier 2, tag Crypto, requires Commerce, sector FinTech) [Blue 0/10, Red 0/0] with Architect');
  });

  // A guard: this passes before the badges and words too, and pins that neither reaches a card the Board doesn't show.
  it("Review Focus: puts nothing on a card in a backlog, and never names a card in another seat's", () => {
    mount({ initial: STALL });
    const backlog = STALL.cards.filter((card) => card.zoneId === `backlog-${S}`).map((card) => card.id);
    expect(backlog).toHaveLength(1);
    expect(Object.keys(table!.decor!)).not.toContain(streaming);
    expect(Object.keys(table!.decor!)).not.toContain(backlog[0]);
    expect(document.body.textContent).not.toContain('Streaming Service');
  });
});

describe('choosing whom to pay and how to cut', () => {
  const tab = (name: string) => screen.getByRole('tab', { name });
  const boardOf = (seat: string) => screen.getByTestId(`board-${seat}`).textContent;
  const R1 = after(S, 3);
  const R2 = after(R1, 3);
  const choices = () => screen.getByRole('group', { name: 'Choices' });
  const answer = (value: string) => fireEvent.click(within(choices()).getByRole('button', { name: value }));
  const options = () => within(choices()).getAllByRole('button').map((b) => b.textContent);
  const noChoices = () => expect(screen.queryByRole('group', { name: 'Choices' })).toBeNull();
  /** The table after Setup with each named card put in its zone, in order. */
  const arranged = (...places: [string, string][]): GameState =>
    places.reduce((state, [name, zoneId]) => relocate(state, [idOf(state, name)], zoneId, game), setUp());
  const capitalOf = (seat: string, capital: number) => expect(lineOf(seat)?.startsWith(`${seat} ${capital} capital`), lineOf(seat)!).toBe(true);
  /** S's Neobank needs Commerce, which R1's Mobile Wallet and R2's Payment Gateway both provide. */
  const NEOBANK = (): GameState => arranged(['Neobank', `backlog-${S}`], ['Mobile Wallet', `operations-${R1}`], ['Payment Gateway', `operations-${R2}`]);
  const greenlight = (name: string) => {
    press('Greenlight a card in your backlog');
    pickNamed(name);
  };

  it('asks whom to pay the License, naming the Tag the card requires, and pays the one picked', () => {
    const state = NEOBANK();
    const neobank = idOf(state, 'Neobank');
    mount({ initial: state });
    greenlight('Neobank');
    expect(within(choices()).getByText('Pick who to pay the license to (requires Commerce)')).toBeTruthy();
    expect(options()).toEqual([...[R1, R2].sort(), 'Cancel']);
    expect(screen.queryByRole('group', { name: 'Pick cards' })).toBeNull();
    answer(R2);
    capitalOf(R2, 10);
    capitalOf(R1, 7);
    capitalOf(S, 4);
    expect(table!.decor![neobank]).toEqual({ caption: 'Blue 0/10\nRed 0/0', badge: 'stalled' });
    noChoices();
  });

  it('asks how to cut a hybrid clicked on the table, and cuts as answered', () => {
    const state = arranged(['Sleep Monitor', `backlog-${S}`], ['Health Tracker', `operations-${S}`]);
    const sleep = idOf(state, 'Sleep Monitor');
    mount({ initial: state });
    click(sleep);
    choose('Greenlight a card in your backlog');
    expect(within(choices()).getByText('Choose one')).toBeTruthy();
    expect(options()).toEqual(['Cut 2 blue', 'Cut 2 red', 'Cut 1 of each', 'Cancel']);
    expect(ring(sleep)).toBe('chosen');
    answer('Cut 1 of each');
    expect(table!.decor![sleep].caption).toBe('Blue 0/1 +1 cut\nRed 0/3 +1 cut');
    expect(boardOf(S)).toContain('Sleep Monitor (tier Tier 1, tag Data, sector Life Sci) [Blue 0/1 +1 cut, Red 0/3 +1 cut]');
    noChoices();
  });

  it('asks the two Licenses of a Tier 3 one after the other, each naming its own requirement', () => {
    mount({
      initial: arranged(
        ['Fusion Reactor', `backlog-${S}`], ['Drone Delivery', `operations-${R1}`], ['Search Engine', `operations-${R1}`],
        ['Auto Warehouse', `operations-${R2}`], ['Quantum Prototype', `operations-${R2}`],
      ),
    });
    greenlight('Fusion Reactor');
    expect(within(choices()).getByText('Pick who to pay the license to (requires Robotics)')).toBeTruthy();
    answer(R1);
    expect(within(choices()).getByText('Pick who to pay the license to (also requires AI)')).toBeTruthy();
    answer(R2);
    noChoices();
    capitalOf(R1, 10);
    capitalOf(R2, 10);
    capitalOf(S, 1);
  });

  it('Review Focus: asks only the License several provide, and pays the only provider of the other without asking', () => {
    mount({
      initial: arranged(
        ['Fusion Reactor', `backlog-${S}`], ['Drone Delivery', `operations-${R1}`], ['Search Engine', `operations-${R1}`],
        ['Auto Warehouse', `operations-${R2}`],
      ),
    });
    greenlight('Fusion Reactor');
    expect(within(choices()).getByText('Pick who to pay the license to (requires Robotics)')).toBeTruthy();
    answer(R2);
    noChoices();
    capitalOf(R1, 10);
    capitalOf(R2, 10);
    capitalOf(S, 1);
  });

  it('Review Focus: drops the question, sending nothing, when another tab is looked at', () => {
    mount({ initial: NEOBANK() });
    greenlight('Neobank');
    expect(choices()).toBeTruthy();
    fireEvent.click(tab(O));
    fireEvent.click(tab(`${S} — to act`));
    noChoices();
    capitalOf(S, 7);
  });
});

/** setUp() with a Dating App and a Smart Lock in N's operations and the first Firmware Specialist in N's ops team. */
const modesBoard = (): GameState => {
  const state = setUp();
  const products = relocate(state, [idOf(state, 'Dating App'), idOf(state, 'Smart Lock')], `operations-${N}`, game);
  return relocate(products, [idOf(products, 'Firmware Specialist')], `ops-team-${N}`, game);
};
// The Choices group, the names of its buttons, and a click on one of them; named apart from 3-2's describe-local `choices`/`options`/`answer`.
const askedGroup = () => screen.getByRole('group', { name: 'Choices' });
const askedOptions = () => within(askedGroup()).getAllByRole('button').map((b) => b.textContent);
const answerAsked = (value: string) => fireEvent.click(within(askedGroup()).getByRole('button', { name: value }));
/** The labels of the seat's buttons, in order, read from the `seat-buttons` room. */
const seatButtons = () => within(screen.getByTestId('seat-buttons')).getAllByRole('button').map((b) => b.textContent);

/**
 * How the numbers come (§20.B, §20.C, §5 Phase B, §20.E):
 * - The Firmware Specialist is flex, output 2, salary $2, and the Fixer alone has QA Skill.
 * - Blue costs: Dating App 6, To-Do List 4, Mobile Wallet 4. The Smart Lock costs 1 Blue / 5 Red and earns rev 2.
 * - At Income: 7 + 2 = 9, the Dating App off and earning nothing. The $2 salary holds N at Income.
 * - The Hacker adds 1 Bug when he joins a project. One Junior QA Tester gives 1 QA against 2 Bugs on two products, so the owner picks
 *   which to clean.
 * The Bug label reads the `bugs` count whether or not `bugged` is shown (G1); it is not shown (P4), so a Bug reads `1 bug` alone.
 */
describe('modes, Offline and Bugs on the Board', () => {
  const tab = (name: string) => screen.getByRole('tab', { name });
  const boardOf = (seat: string) => screen.getByTestId(`board-${seat}`).textContent;
  const DECLARE_OPS = 'Declare a card in your ops team';
  const SWITCH_OFF = 'Switch off a card in your operations';
  const SWITCH_ON = 'Switch on a card in your operations';
  /** Mounts `modesBoard()`, ends S's actions, and declares N's Firmware Specialist in Red, clicking it. */
  const declaredRed = () => {
    const state = modesBoard();
    const [fs, dating, lock] = ['Firmware Specialist', 'Dating App', 'Smart Lock'].map((name) => idOf(state, name));
    mount({ initial: state });
    press('End your actions');
    click(fs);
    choose(DECLARE_OPS);
    answerAsked('Red');
    return { fs, dating, lock };
  };

  it('badges the project the Hacker joins with his Bug, and lists it in its square brackets', () => {
    const set = setUp();
    const [hacker, todo] = ['Hacker', 'To-Do List'].map((name) => idOf(set, name));
    mount({ initial: relocate(relocate(set, [hacker], `bench-${S}`, game), [todo], `development-${S}`, game) });
    click(hacker);
    choose('Assign some cards from your bench to a card in your development');
    click(todo);
    expect(table!.decor![todo]).toEqual({ caption: 'Blue 0/4\nRed 0/0', badge: '1 bug' });
    expect(boardOf(S)).toBe('development: To-Do List (tier Tier 1, tag App, sector Concept) [Blue 0/4, Red 0/0, 1 bug] with Hacker');
  });

  it('labels a card with the mode declared for it, and takes the label off for Blue', () => {
    const state = modesBoard();
    const fs = idOf(state, 'Firmware Specialist');
    mount({ initial: state });
    press('End your actions');
    expect(tab(`${N} — to act`).getAttribute('aria-selected')).toBe('true');
    expect(status()).toBe(`seat: ${N} — Your turn — ${hint('modes')}`);
    expect(seatButtons()).toEqual(['Declare a card in your development team', DECLARE_OPS, 'Confirm your modes']);

    click(fs);
    expect(offered()).toEqual([[DECLARE_OPS, true]]);
    choose(DECLARE_OPS);
    expect(within(askedGroup()).getByText('Choose one')).toBeTruthy();
    // The Fixer's QA is not offered to a Firmware Specialist.
    expect(askedOptions()).toEqual(['Blue', 'Red', 'Cancel']);
    expect(ring(fs)).toBe('chosen');

    answerAsked('Red');
    expect(table!.decor![fs]).toEqual({ badge: 'red mode' });
    expect(boardOf(N)).toContain('ops team: Firmware Specialist (red mode)');

    press(DECLARE_OPS);
    pickNamed('Firmware Specialist');
    answerAsked('Blue');
    expect(table!.decor![fs]).toBeUndefined();
  });

  it('Review Focus: fades an Offline product, and only while it is off', () => {
    const { dating, lock } = declaredRed();
    press('Confirm your modes');
    expect(status()!.endsWith(hint('ops check'))).toBe(true);

    click(dating);
    expect(offered()).toEqual([[SWITCH_OFF, true], [SWITCH_ON, 'it is offline']]);
    choose(SWITCH_OFF);
    expect(table!.decor![dating]).toEqual({ caption: 'Blue 0/6\nRed 0/0', badge: 'offline', dim: true });
    expect(table!.decor![lock]).toEqual({ caption: 'Blue 0/1\nRed 0/5' });
    expect(boardOf(N)).toContain('Dating App (tier Tier 1, tag Social, sector Consumer, offline) [Blue 0/6, Red 0/0]');
    // The face and the hover line keep the printed Val, 5: being off is told by the fade, the badge and the Board line (P5).
    act(() => table!.onHover!(dating));
    expect(screen.getByTestId('card-detail').textContent).toContain('val 5');

    click(dating);
    choose(SWITCH_ON);
    expect(table!.decor![dating]).toEqual({ caption: 'Blue 0/6\nRed 0/0' });

    click(dating);
    choose(SWITCH_OFF);
    press('Confirm the products online');
    expect(lineOf(N)?.startsWith(`${N} 9 capital, 3 actions, 1 market share`), lineOf(N)!).toBe(true);
    expect(table!.decor![dating].dim).toBe(true);

    press('Undo');
    press('Undo');
    expect(table!.decor![dating]).toEqual({ caption: 'Blue 0/6\nRed 0/0' });
    expect(boardOf(N)).not.toContain('offline');
  });

  it('takes the badge off a Bug Ops QA cleans, and leaves the other', () => {
    let state = setUp();
    const [dating, wallet] = ['Dating App', 'Mobile Wallet'].map((name) => idOf(state, name));
    state = relocate(state, [dating, wallet], `operations-${S}`, game);
    state = changeCard(changeCard(state, dating, { bugs: 1 }, game), wallet, { bugs: 1 }, game);
    mount({ initial: relocate(state, [idOf(state, 'Junior QA Tester', `bench-${S}`)], `ops-team-${S}`, game) });
    expect([table!.decor![dating].badge, table!.decor![wallet].badge]).toEqual(['1 bug', '1 bug']);

    press('End your actions');
    expect(status()!.endsWith(hint('engine'))).toBe(true);
    click(wallet);
    expect(offered()).toEqual([['Clean a card in your operations', true]]);
    choose('Clean a card in your operations');
    expect(tab(`${N} — to act`).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(tab(S));
    expect(table!.decor![wallet]).toEqual({ caption: 'Blue 0/4\nRed 0/0' });
    expect(table!.decor![dating].badge).toBe('1 bug');
    expect(boardOf(S)).toContain('Mobile Wallet (tier Tier 1, tag Commerce, sector FinTech) [Blue 0/4, Red 0/0]');
    expect(boardOf(S)).toContain('[Blue 0/6, Red 0/0, 1 bug]');
  });

  // A guard: this passes before the change too, and pins that neither a badge nor a Bug reaches a card the Board doesn't show:
  // another seat's backlog is hidden from the seat, and its own backlog is on no Board.
  it("Review Focus: badges no card in a backlog, and never shows another seat's Bugs", () => {
    let state = setUp();
    const theirs = state.cards.find((card) => card.zoneId === `backlog-${O}`)!.id;
    const own = state.cards.find((card) => card.zoneId === `backlog-${S}`)!.id;
    state = changeCard(changeCard(state, theirs, { bugs: 2, offline: true }, game), own, { bugs: 3 }, game);
    mount({ initial: state });
    expect(status()).toMatch(new RegExp(`^seat: ${S} `));
    expect(Object.keys(table!.decor!)).not.toContain(theirs);
    expect(Object.keys(table!.decor!)).not.toContain(own);
    expect(document.body.textContent).not.toContain('2 bugs');
    expect(document.body.textContent).not.toContain('3 bugs');
  });
});

/**
 * How the numbers come (§20.B, §20.C, §12):
 * - The Firmware Specialist is flex with output 2, so 2 Blue until declared Red. The Dating App needs 1 Blue, the Smart Lock 1 Red.
 * - At Income: 7 + 2 = 9, the Smart Lock's rev, the Dating App off and earning nothing.
 * - A Junior Software Dev gives 1 Blue; the Dating App and the Mobile Wallet each need 1 Blue.
 * - The round at two is S2 then L2. After it, the final check runs from S2, and L2, with nothing to run, passes at once.
 */
describe('the gauges, the ops check and the final check', () => {
  const tab = (name: string) => screen.getByRole('tab', { name });
  const gauges = (seat: string) => screen.getByTestId(`gauges-${seat}`).textContent;
  const CONFIRM = 'Confirm the products online';

  it("draws every seat's gauges, short in a color its ops team can't cover, whichever tab is looked at", () => {
    mount({ initial: modesBoard() });
    expect(gauges(N)).toBe('Blue supply 2 / demand 1 · Red supply 0 / demand 1 (short)');
    expect(gauges(S)).toBe('Blue supply 0 / demand 0 · Red supply 0 / demand 0');
    fireEvent.click(tab(O));
    expect(gauges(N)).toBe('Blue supply 2 / demand 1 · Red supply 0 / demand 1 (short)');
  });

  it('follows a declared mode and a product switched off through the ops check, to the confirm it waits on', () => {
    mount({ initial: modesBoard() });
    press('End your actions');
    press('Declare a card in your ops team');
    pickNamed('Firmware Specialist');
    answerAsked('Red');
    expect(gauges(N)).toBe('Blue supply 0 / demand 1 (short) · Red supply 2 / demand 1');

    press('Confirm your modes');
    const confirm = () => screen.getByRole('button', { name: CONFIRM });
    expect([confirm().getAttribute('aria-disabled'), confirm().getAttribute('title')])
      .toEqual(['true', 'their blue supply is at least their blue demand']);

    press('Switch off a card in your operations');
    pickNamed('Dating App');
    expect(gauges(N)).toBe('Blue supply 0 / demand 0 · Red supply 2 / demand 1');
    expect(confirm().getAttribute('aria-disabled')).toBe('false');

    press(CONFIRM);
    expect(lineOf(N)!.startsWith(`${N} 9 capital`), lineOf(N)!).toBe(true);
  });

  it('runs the final check from the gauges after the last round, and ends the game once they fit', () => {
    const begun = createEngine(game, lib, 2, initialState(game, SEED)).engine.getState();
    const S2 = begun.data['lang:start-player'] as string;
    const L2 = seatsOf(2).find((seat) => seat !== S2)!;
    let state = relocate(begun, [idOf(begun, 'Market Crash')], 'crash-pile', game);
    const [dating, wallet] = ['Dating App', 'Mobile Wallet'].map((name) => idOf(state, name));
    state = relocate(state, [dating, wallet], `operations-${S2}`, game);
    state = relocate(state, [idOf(state, 'Junior Software Dev', `bench-${S2}`)], `ops-team-${S2}`, game);
    mount({ initial: state, players: 2 });
    expect(gauges(S2)).toBe('Blue supply 1 / demand 2 (short) · Red supply 0 / demand 0');

    press('End your actions');
    fireEvent.click(tab(`${L2} — to act`));
    press('End your actions');
    expect(tab(`${S2} — to act`).getAttribute('aria-selected')).toBe('true');
    expect(status()).toBe(`seat: ${S2} — Your turn — ${hint('final check')}`);
    expect(seatButtons()).toEqual(['Switch off a card in your operations', 'Switch on a card in your operations']);

    press('Switch off a card in your operations');
    pickNamed('Mobile Wallet');
    expect(status()).toMatch(/Game over/);
    expect(table!.decor![wallet].dim).toBe(true);
    expect(gauges(S2)).toBe('Blue supply 1 / demand 1 · Red supply 0 / demand 0');
    expect(screen.getByTestId(`board-${S2}`).textContent).toContain('Mobile Wallet (tier Tier 1, tag Commerce, sector FinTech, offline)');
  });

  it('Review Focus: draws no gauges for a game whose buttons wait on no pair of values', () => {
    mount({ game: compileGame(COLOR_MATCH, lib).game! });
    expect(screen.queryByTestId(/^gauges-/)).toBeNull();
  });
});

/**
 * How the numbers come (§20.B, §20.C, §5):
 * - The Growth Hacker sits on a product in operations; the rest of the ops team sits on nothing.
 * - The Dating App needs 6 Blue and no Red, none of it worked yet: `[Blue 0/6, Red 0/0]`.
 * - 176 is `CARD_HEIGHT` 140 + `STACK_GAP` 36, as the development team test above has it.
 */
describe('a Growth Hacker hangs under its product', () => {
  const tab = (name: string) => screen.getByRole('tab', { name });
  const boardOf = (seat: string) => screen.getByTestId(`board-${seat}`).textContent;
  /** setUp() with a Dating App in S's operations, the Growth Hacker on it in S's ops team, and S's Junior Software Dev there on nothing. */
  const arranged = () => {
    const set = setUp();
    const [dating, hacker, junior] = [idOf(set, 'Dating App'), idOf(set, 'Growth Hacker'), idOf(set, 'Junior Software Dev', `bench-${S}`)];
    let state = relocate(set, [dating], `operations-${S}`, game);
    state = putOn(state, [hacker], `ops-team-${S}`, dating, game);
    state = relocate(state, [junior], `ops-team-${S}`, game);
    return { state, dating, hacker, junior };
  };
  const BOARD_LINE = 'operations: Dating App (tier Tier 1, tag Social, sector Consumer) [Blue 0/6, Red 0/0] with Growth Hacker · ops team: Junior Software Dev';

  it('draws the Growth Hacker under the product it sits on, and the rest of the ops team in its row', () => {
    const { state, dating, hacker, junior } = arranged();
    mount({ initial: state });
    const def = (id: string) => table!.tableDef.zones.find((z) => z.id === id)!;
    const team = def(`ops-team-${S}`);
    expect(team.layout).toBe('row');
    expect(team.layoutOptions?.keepPlaced).toBe(true);
    const at = computeZoneLayout(def(`operations-${S}`), cardsIn(`operations-${S}`)).get(dating)!;
    const poses = computeZoneLayout(team, cardsIn(`ops-team-${S}`));
    expect({ x: poses.get(hacker)!.x, y: poses.get(hacker)!.y }).toEqual({ x: at.x, y: at.y + 176 });
    // Alone in the row, the Junior stands at the row's own place.
    expect({ x: poses.get(junior)!.x, y: poses.get(junior)!.y }).toEqual({ x: team.transform.x, y: team.transform.y });
  });

  // A guard: this passes before the change, and pins that hanging the card changes neither the Board line nor another seat's tab.
  it("(guard) names the Growth Hacker on its product in the Board line, and draws none of S's ops team on another seat's tab", () => {
    mount({ initial: arranged().state });
    expect(boardOf(S)).toBe(BOARD_LINE);
    fireEvent.click(tab(O));
    expect(cardsIn(`ops-team-${S}`)).toEqual([]);
    expect(boardOf(S)).toBe(BOARD_LINE);
  });
});
