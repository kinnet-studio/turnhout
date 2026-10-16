import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import STARTUP_SIMULATOR from '@/games/startup-simulator.rules?raw';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { parseTextFaceKey } from '@/engine/core/lang/cards';
import { compileGame } from '@/engine/core/lang/compile';
import { fitsTable, fittedLayout } from '@/engine/core/lang/fit-layout';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import type { CardTableProps } from '@/engine/react';
import { cardDetail } from './card-detail';
import { Playtest } from './playtest';

vi.mock('@/components/PixiCanvas', () => ({ Wrapper: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
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
const drop = (cardId: string, from: string, to: string) =>
  act(() => table!.onDrop!({ cardId, fromZoneId: from, toZoneId: to, slot: 0, worldPoint: { x: 0, y: 0 } }));

beforeEach(() => { table = null; });

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
      expect(lineOf(seat)).toBe(`${seat} 7 capital, 3 actions · bench 3 · backlog 1 · research 0${seat === S ? ' · start player' : ''}`);
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

  it('moves a card dragged on the fitted table', () => {
    mount();
    const card = cardsIn('agency-row').find((c) => Number(parseTextFaceKey(c.faceKey)!.cost) <= 7);
    expect(card, 'seed 1 deals an affordable agency card').toBeDefined();
    const cost = Number(parseTextFaceKey(card!.faceKey)!.cost);
    drop(card!.id, 'agency-row', `bench-${S}`);
    const expected = `${S} ${7 - cost} capital, 2 actions · bench 4`;
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

  it('shows nothing for a card that has since left the table', () => {
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
