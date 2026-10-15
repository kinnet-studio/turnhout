import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import RENT_DAY from '@/games/rent-day.rules?raw';
import { placePiece, setOwner, setPlayerFact, withBoardData } from '@/engine/core/lang/board-state';
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
const rentDay = compileGame(RENT_DAY, lib).game!;
// With 5 money each, seed 2 rolls p0 a 3 and a 1 onto Income Tax: they cannot pay it and are out on their first turn.
const BROKE_SEED = 2;
const brokeRentDay = compileGame(RENT_DAY.replace('1500 money', '5 money'), lib).game!;
const HINT = 'Play a card matching the color or number, or draw one.';
const SEED = 1;

const drag = (seat: number, cardId: string, from: string, to: string | null) =>
  act(() => drops[seat]({ cardId, fromZoneId: from, toZoneId: to, slot: 0, worldPoint: { x: 0, y: 0 } }));

const mount = (over: Partial<Parameters<typeof Playtest>[0]> = {}) =>
  render(<Playtest game={colorMatch} library={lib} players={3} seed={SEED} onRestart={() => {}} onStop={() => {}} {...over} />);

const mountRentDay = (over: Partial<Parameters<typeof Playtest>[0]> = {}) => mount({ game: rentDay, ...over });
const rollButtons = () => screen.getAllByRole('button', { name: 'Roll the dice' });

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

  it('stays silent when a card is dropped outside every zone', () => {
    mount();
    drag(0, 'c0', 'hand-p0', null);
    expect(screen.queryByText('No rule lets you move a card there.')).toBeNull();
  });

  it('stays silent when a card is dropped back where it came from and nothing rearranges', () => {
    mount();
    drag(0, 'c0', 'draw-pile', 'draw-pile');
    expect(screen.queryByText('No rule lets you move a card there.')).toBeNull();
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

describe('Playtest of a board game', () => {
  it('gives each seat its board, money line and buttons, greyed with the reason', () => {
    mountRentDay();
    expect(screen.getAllByRole('button', { name: 'Roll the dice' })).toHaveLength(3);
    const [p0Roll, p1Roll] = rollButtons();
    expect(p0Roll.getAttribute('aria-disabled')).toBe('false');
    expect(p1Roll.getAttribute('aria-disabled')).toBe('true');
    expect(p1Roll.getAttribute('title')).toBe("It's p0's turn.");
    expect(screen.getAllByText('p0 1,500 money')).toHaveLength(3);
    expect(screen.getAllByTitle(/^Rose Lane — /)).toHaveLength(3);
  });

  it('keeps the status line of each seat, and draws no card table for a board game whose phases move no cards', () => {
    mountRentDay();
    const hint = 'Roll the dice, then buy, build, or end your turn. A double rolls again.';
    expect(screen.getByText(`seat: p0 — Your turn — ${hint}`)).toBeTruthy();
    expect(screen.getByText(`seat: p1 — ${hint} — waiting for p0`)).toBeTruthy();
    expect(rendered).toBe(0);
  });

  it('draws the card table for a board game once a phase moves cards by hand', () => {
    const turns = '  Players take turns.\n';
    expect(RENT_DAY).toContain(turns);
    const byHand = compileGame(RENT_DAY.replace(turns, `${turns}  A player may take a card from the chance pile to their kept cards.\n`), lib);
    expect(byHand.diagnostics).toEqual([]);
    mountRentDay({ game: byHand.game! });
    expect(rendered).toBeGreaterThan(0);
  });

  it('rolls on press, and a greyed button says why instead of sending', () => {
    mountRentDay();
    const [p0Roll, p1Roll] = rollButtons();
    // Building the two decks and shuffling both piles draw on the rng first, so seed 1 then rolls 4 and 2: not a double, so
    // p0 may not roll again.
    fireEvent.click(p0Roll);
    expect(screen.getAllByLabelText('Rolled 4 and 2')).toHaveLength(3);
    expect(rollButtons()[0].getAttribute('title')).toBe('they have not rolled this turn or they rolled a double');
    fireEvent.click(p1Roll);
    expect(screen.getByText("It's p0's turn.")).toBeTruthy();
  });

  it('moves the piece and Undo takes the roll back', () => {
    mountRentDay();
    fireEvent.click(rollButtons()[0]);
    expect(screen.getAllByLabelText(/^Rolled/)).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryAllByLabelText(/^Rolled/)).toHaveLength(0);
    expect(rollButtons()[0].getAttribute('aria-disabled')).toBe('false');
  });

  it('clears the reason a greyed button gave after a moment', () => {
    mountRentDay();
    vi.useFakeTimers();
    fireEvent.click(rollButtons()[1]);
    expect(screen.getByText("It's p0's turn.")).toBeTruthy();
    act(() => vi.advanceTimersByTime(2600));
    expect(screen.queryByText("It's p0's turn.")).toBeNull();
  });

  it('shows a seat that is out as out, greys its buttons, and sends nothing when one is pressed', () => {
    mountRentDay({ game: brokeRentDay, seed: BROKE_SEED });
    fireEvent.click(rollButtons()[0]);
    expect(screen.getAllByText('p0 out')).toHaveLength(3);
    expect(screen.getByText("seat: p0 — You're out.")).toBeTruthy();
    const p0Roll = rollButtons()[0];
    expect(p0Roll.getAttribute('aria-disabled')).toBe('true');
    expect(p0Roll.getAttribute('title')).toBe("You're out of the game.");
    const submit = vi.spyOn(GameServer.prototype, 'submit');
    fireEvent.click(p0Roll);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText("You're out of the game.")).toBeTruthy();
    // The others play on.
    expect(rollButtons()[1].getAttribute('aria-disabled')).toBe('false');
  });

  it('greys every button when the game is over, and sends nothing when one is pressed', () => {
    mountRentDay({ game: brokeRentDay, seed: BROKE_SEED, players: 2 });
    fireEvent.click(rollButtons()[0]);
    expect(screen.getByText('seat: p0 — Game over — p1 wins')).toBeTruthy();
    expect(screen.getByText('seat: p1 — Game over — p1 wins')).toBeTruthy();
    for (const button of rollButtons()) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('title')).toBe('The game is over.');
    }
    const submit = vi.spyOn(GameServer.prototype, 'submit');
    fireEvent.click(rollButtons()[1]);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText('The game is over.')).toBeTruthy();
  });

  it('connects every seat under StrictMode', () => {
    render(<StrictMode><Playtest game={rentDay} library={lib} players={3} seed={SEED} onRestart={() => {}} onStop={() => {}} /></StrictMode>);
    expect(screen.getAllByText('p0 1,500 money')).toHaveLength(3);
    expect(rollButtons()).toHaveLength(3);
  });
});

describe('Playtest: building by picking a street', () => {
  const nameAt = (name: string) => rentDay.board!.spaces.findIndex((space) => space.name === name);
  // p0 owns the three orange streets, so on p0's turn "Build a house" has streets to pick from; p1 owns nothing.
  const ownsOrange = ['Rose Lane', 'Lily Lane', 'Iris Road'].reduce(
    (state, name) => setOwner(state, nameAt(name), 'p0'),
    withBoardData(initialState(rentDay, SEED), rentDay, ['p0', 'p1']),
  );
  const mountOwning = () => mountRentDay({ players: 2, initial: ownsOrange });
  const build = (seat: number) => screen.getAllByRole('button', { name: 'Build a house' })[seat];
  const banner = () => screen.queryByRole('status');
  const submit = () => vi.spyOn(GameServer.prototype, 'submit');

  it('opens a banner with the prompt and a Cancel button when the button is pressed, and sends nothing', () => {
    mountOwning();
    const sent = submit();
    expect(banner()).toBeNull();
    fireEvent.click(build(0));
    expect(within(banner()!).getByText('Pick a street you own')).toBeTruthy();
    expect(within(banner()!).getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(sent).not.toHaveBeenCalled();
    // Only the seat that pressed the button is picking.
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^Pick / })).toHaveLength(3);
  });

  it('builds on the street that is picked: the money drops, the street shows the house and the bank has one less', () => {
    mountOwning();
    expect(screen.getAllByText('p0 1,500 money')).toHaveLength(2);
    expect(screen.getAllByText('bank: 32 houses, 12 hotels')).toHaveLength(2);
    fireEvent.click(build(0));
    fireEvent.click(screen.getAllByRole('button', { name: 'Pick Rose Lane' })[0]);
    expect(banner()).toBeNull();
    expect(screen.getAllByText('p0 1,400 money')).toHaveLength(2);
    expect(screen.getAllByTitle(/^Rose Lane — 1 house,/)).toHaveLength(2);
    expect(screen.getAllByText('bank: 31 houses, 12 hotels')).toHaveLength(2);
    expect(screen.getAllByTestId('house')).toHaveLength(2);
    expect(screen.queryAllByRole('button', { name: /^Pick / })).toHaveLength(0);
  });

  it('says why a street cannot be picked when it is clicked, and stays picking', () => {
    mountOwning();
    fireEvent.click(build(0));
    fireEvent.click(screen.getAllByRole('button', { name: 'Pick Rose Lane' })[0]);
    fireEvent.click(build(0));
    // Rose Lane is ahead of the other two orange streets now.
    const refused = screen.getAllByRole('button', { name: 'Pick Rose Lane' })[0];
    expect(refused.getAttribute('aria-disabled')).toBe('true');
    const sent = submit();
    fireEvent.click(refused);
    expect(sent).not.toHaveBeenCalled();
    expect(screen.getByText('no street of its color has fewer buildings')).toBeTruthy();
    expect(banner()).not.toBeNull();
  });

  it('leaves picking on Cancel without sending', () => {
    mountOwning();
    fireEvent.click(build(0));
    const sent = submit();
    fireEvent.click(within(banner()!).getByRole('button', { name: 'Cancel' }));
    expect(banner()).toBeNull();
    expect(screen.queryAllByRole('button', { name: /^Pick / })).toHaveLength(0);
    expect(sent).not.toHaveBeenCalled();
    expect(screen.getAllByText('p0 1,500 money')).toHaveLength(2);
  });

  it('leaves picking when another button is pressed', () => {
    mountOwning();
    fireEvent.click(build(0));
    fireEvent.click(rollButtons()[0]);
    expect(banner()).toBeNull();
  });

  it('greys a button for a seat with no street to pick, with the reason, and opens nothing', () => {
    mountOwning();
    const button = build(1);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('title')).toBe('There is no street you own.');
    const sent = submit();
    fireEvent.click(button);
    expect(banner()).toBeNull();
    expect(sent).not.toHaveBeenCalled();
    expect(screen.getByText('There is no street you own.')).toBeTruthy();
  });

  it('Undo takes a built house back', () => {
    mountOwning();
    fireEvent.click(build(0));
    fireEvent.click(screen.getAllByRole('button', { name: 'Pick Rose Lane' })[0]);
    expect(screen.getAllByText('p0 1,400 money')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getAllByText('p0 1,500 money')).toHaveLength(2);
    expect(screen.queryAllByTestId('house')).toHaveLength(0);
    expect(screen.getAllByText('bank: 32 houses, 12 hotels')).toHaveLength(2);
  });

  it('stops picking when the button can no longer be pressed, and does not start again by itself', () => {
    const brown = ['Mill Lane', 'Ferry Row'].reduce((state, name) => setOwner(state, nameAt(name), 'p1'), ownsOrange);
    mountRentDay({ players: 2, initial: brown });
    fireEvent.click(rollButtons()[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'End your turn' })[0]);
    fireEvent.click(build(1));
    expect(within(banner()!).getByText('Pick a street you own')).toBeTruthy();
    // Undo hands the turn back to p0, so p1's button is greyed and its picking is over.
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(banner()).toBeNull();
    // When it is p1's turn again nothing was waiting to be picked.
    fireEvent.click(screen.getAllByRole('button', { name: 'End your turn' })[0]);
    expect(build(1).getAttribute('aria-disabled')).toBe('false');
    expect(banner()).toBeNull();
  });
});

describe('Playtest: a player in jail', () => {
  const JAIL = rentDay.board!.spaces.findIndex((space) => space.name === 'Jail');
  const jailed = setPlayerFact(setPlayerFact(
    placePiece(withBoardData(initialState(rentDay, SEED), rentDay, ['p0', 'p1']), 'p0', JAIL), 'p0', 'in jail', true), 'p0', 'jail turns', 1);

  it('shows who is in jail and the jail buttons, greyed with reasons, and paying sets them free', () => {
    mountRentDay({ players: 2, initial: jailed });
    expect(screen.getAllByText('p0 1,500 money · in jail · 1 jail turn')).toHaveLength(2);
    expect(screen.getAllByTitle('Jail — p0 (in jail, 1 jail turn), kind jail')).toHaveLength(2);
    expect(screen.getAllByTitle('p0 (in jail, 1 jail turn)').every((piece) => piece.getAttribute('data-ring') === 'true')).toBe(true);
    expect(rollButtons()[0].getAttribute('title')).toBe('they are not in jail');
    const [p0Pay, p1Pay] = screen.getAllByRole('button', { name: 'Pay to leave jail' });
    const [p0ForDouble] = screen.getAllByRole('button', { name: 'Roll for a double' });
    expect([p0Pay.getAttribute('aria-disabled'), p0ForDouble.getAttribute('aria-disabled')]).toEqual(['false', 'false']);
    expect(p1Pay.getAttribute('title')).toBe("It's p0's turn.");
    fireEvent.click(p0Pay);
    expect(screen.getAllByText('p0 1,450 money')).toHaveLength(2);
    expect(screen.queryAllByTitle(/^p0 \(/)).toHaveLength(0);
    expect(rollButtons()[0].getAttribute('aria-disabled')).toBe('false');
  });
});
