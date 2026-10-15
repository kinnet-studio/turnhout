import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import type { DropIntent } from '@/engine/input/table-input-context';
import { GameServer } from '@/engine/net/game-server';
import type { CardTableProps } from '@/engine/react';
import { Playtest } from './playtest';

// The canvas layer needs a real WebGL page; the seats' game logic does not.
vi.mock('@/components/PixiCanvas', () => ({ Wrapper: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
// Seats render in seat order, so the n-th CardTable rendered belongs to p<n>; keep the latest onDrop per index.
const drops: ((i: DropIntent) => void)[] = [];
let rendered = 0;
vi.mock('@/engine/react', () => ({
  CardTable: (p: CardTableProps) => {
    drops[rendered++ % 3] = p.onDrop!;
    return null;
  },
}));

const lib = createDefaultLibrary();
const colorMatch = compileGame(COLOR_MATCH, lib).game!;
const HINT = 'Play a card matching the color or number, or draw one.';
const SEED = 1;

const drag = (seat: number, cardId: string, from: string, to: string) =>
  act(() => drops[seat]({ cardId, fromZoneId: from, toZoneId: to, slot: 0, worldPoint: { x: 0, y: 0 } }));

const mount = (over: Partial<Parameters<typeof Playtest>[0]> = {}) =>
  render(<Playtest game={colorMatch} library={lib} players={3} seed={SEED} onRestart={() => {}} onStop={() => {}} {...over} />);

beforeEach(() => {
  rendered = 0;
  drops.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Playtest', () => {
  it('renders one seat per player with its status line', () => {
    mount();
    expect(screen.getAllByText(/^seat: p/)).toHaveLength(3);
    expect(screen.getByText(`seat: p0 — Your turn — ${HINT}`)).toBeTruthy();
    expect(screen.getByText(`seat: p1 — ${HINT} — waiting for p0`)).toBeTruthy();
    expect(screen.getByText(`seat: p2 — ${HINT} — waiting for p0`)).toBeTruthy();
  });

  it('shows the friendly reason when a drag is refused', () => {
    mount();
    drag(1, 'c0', 'hand-p1', 'discard-pile');
    expect(screen.getByText("It's p0's turn.")).toBeTruthy();
  });

  it('says when no rule covers a drag', () => {
    mount();
    drag(0, 'c0', 'hand-p0', 'draw-pile');
    expect(screen.getByText('No rule lets you move a card there.')).toBeTruthy();
  });

  it('clears the feedback after a moment', () => {
    mount();
    vi.useFakeTimers();
    drag(0, 'c0', 'hand-p0', 'draw-pile');
    expect(screen.getByText('No rule lets you move a card there.')).toBeTruthy();
    act(() => vi.advanceTimersByTime(2400));
    expect(screen.getByText('No rule lets you move a card there.')).toBeTruthy();
    act(() => vi.advanceTimersByTime(100));
    expect(screen.queryByText('No rule lets you move a card there.')).toBeNull();
  });

  it('connects every seat under StrictMode, which mounts effects twice', () => {
    render(<StrictMode><Playtest game={colorMatch} library={lib} players={3} seed={SEED} onRestart={() => {}} onStop={() => {}} /></StrictMode>);
    expect(screen.getByText(`seat: p0 — Your turn — ${HINT}`)).toBeTruthy();
    expect(screen.getByText(`seat: p2 — ${HINT} — waiting for p0`)).toBeTruthy();
  });

  it("a move changes every seat's status and Undo takes it back", () => {
    const { engine } = createEngine(colorMatch, lib, 3, initialState(colorMatch, SEED));
    const playable = engine.getState().cards.find((c) => c.zoneId === 'hand-p0' && engine.canDispatch({ type: 'play', cardId: c.id, by: 'p0' }) === true);
    expect(playable, 'seed 1 deals p0 a playable card').toBeDefined();

    mount();
    drag(0, playable!.id, 'hand-p0', 'discard-pile');
    expect(screen.getByText(`seat: p0 — ${HINT} — waiting for p1`)).toBeTruthy();
    expect(screen.getByText(`seat: p1 — Your turn — ${HINT}`)).toBeTruthy();
    expect(screen.getByText(`seat: p2 — ${HINT} — waiting for p1`)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText(`seat: p0 — Your turn — ${HINT}`)).toBeTruthy();
    expect(screen.getByText(`seat: p1 — ${HINT} — waiting for p0`)).toBeTruthy();
  });

  it('shows an error thrown while the rules run in a banner above the seats', () => {
    vi.spyOn(GameServer.prototype, 'submit').mockImplementation(() => {
      throw new Error('the rules fell over');
    });
    mount();
    drag(0, 'c0', 'hand-p0', 'discard-pile');
    expect(screen.getByRole('alert').textContent).toBe('Something went wrong in the rules: the rules fell over');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says why a game cannot start with that many players', () => {
    mount({ players: 9 });
    expect(screen.getByRole('alert').textContent).toBe('This game is for 2 to 5 players.');
    expect(screen.queryAllByText(/^seat: p/)).toHaveLength(0);
  });

  it('calls back for Restart and Stop', () => {
    const onRestart = vi.fn();
    const onStop = vi.fn();
    mount({ onRestart, onStop });
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
