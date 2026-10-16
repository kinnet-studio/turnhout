import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import RENT_DAY from '@/games/rent-day.rules?raw';
import { zoneCards } from '@/engine/core/game-state';
import { markOut, placePiece, playerFact, queueRoll, setCounter, setOwner, setPlayerFact, withBoardData } from '@/engine/core/lang/board-state';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { CARD_PICK_GAME, COUNTER_GAME } from '@/engine/core/lang/testing';
import { relocate, zoneIdFor } from '@/engine/core/lang/zones';
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
// With 5 money each, seed 2 rolls p0 a 3 and a 1 onto Income Tax on their first turn: they cannot pay it, and give up.
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

describe('Playtest of a game with counters and no board', () => {
  const gemShop = compileGame(COUNTER_GAME, lib).game!;

  it('draws the money line, the buttons and the card table, and no board', () => {
    mount({ game: gemShop, players: 2 });
    expect(screen.queryAllByTestId('board-grid')).toHaveLength(0);
    expect(screen.getAllByText('p0 7 coins')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Pass' })).toHaveLength(2);
    expect(rendered).toBeGreaterThan(0);
  });

  it('draws buttons for a card game with no numbers at all, and no money line', () => {
    const plain = compileGame(COUNTER_GAME.replace('  Each player has 7 coins that everyone can see.\n  Players pay with coins.\n', '').replace('    Then:\n      They pay 1.\n', ''), lib);
    expect(plain.diagnostics).toEqual([]);
    mount({ game: plain.game!, players: 2 });
    expect(screen.getAllByRole('button', { name: 'Pass' })).toHaveLength(2);
    expect(screen.queryByText(/coins/)).toBeNull();
  });

  it('draws the card table for a game with counters whose only lines are buttons', () => {
    const buttonsOnly = compileGame(COUNTER_GAME
      .replace('  A player may buy a card from the shop to their stash.\n    Then:\n      They pay 1.\n', '')
      .replace('After a player buys or passes,', 'After a player passes,'), lib);
    expect(buttonsOnly.diagnostics).toEqual([]);
    mount({ game: buttonsOnly.game!, players: 2 });
    expect(rendered).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Pass' })).toHaveLength(2);
  });

  it('draws the bank line for a game whose only number is the bank', () => {
    const bankOnly = compileGame(COUNTER_GAME
      .replace('  Each player has 7 coins that everyone can see.\n  Players pay with coins.\n', '  The bank has 5 tokens.\n')
      .replace('    Then:\n      They pay 1.\n', ''), lib);
    expect(bankOnly.diagnostics).toEqual([]);
    mount({ game: bankOnly.game!, players: 2 });
    expect(screen.getAllByText('bank: 5 tokens')).toHaveLength(2);
  });
});

describe('Playtest of a board game', () => {
  it('gives each seat its board, money line and buttons, greyed with the reason', () => {
    mountRentDay();
    expect(screen.getAllByTestId('board-grid')).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Roll the dice' })).toHaveLength(3);
    const [p0Roll, p1Roll] = rollButtons();
    expect(p0Roll.getAttribute('aria-disabled')).toBe('false');
    expect(p1Roll.getAttribute('aria-disabled')).toBe('true');
    expect(p1Roll.getAttribute('title')).toBe("It's p0's turn.");
    expect(screen.getAllByText('p0 1,500 money')).toHaveLength(3);
    expect(screen.getAllByTitle(/^Rose Lane — /)).toHaveLength(3);
    // The button that gives a kept card back is on every seat's panel from the start, greyed while there is nothing to give back.
    const useCard = screen.getAllByRole('button', { name: 'Use a Get Out Of Jail Free' });
    expect(useCard).toHaveLength(3);
    expect(useCard[0].getAttribute('aria-disabled')).toBe('true');
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
    const byHand = compileGame(RENT_DAY.replace(turns, `${turns}  A player may pick a card from the chance pile to their kept cards.\n`), lib);
    expect(byHand.diagnostics).toEqual([]);
    mountRentDay({ game: byHand.game! });
    expect(rendered).toBeGreaterThan(0);
  });

  it('draws the card table for a board game whose phase only lets players rearrange their cards', () => {
    const turns = '  Players take turns.\n';
    const rearranging = compileGame(RENT_DAY.replace(turns, `${turns}  Players may rearrange their kept cards at any time.\n`), lib);
    expect(rearranging.diagnostics).toEqual([]);
    expect(rearranging.game!.phases.some((phase) => phase.moves.length > 0)).toBe(false);
    expect(rearranging.game!.phases.some((phase) => phase.rearrange.length > 0)).toBe(true);
    mountRentDay({ game: rearranging.game! });
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
    // p0 lands on Income Tax: they cannot pay it, and give up.
    fireEvent.click(rollButtons()[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Give up' })[0]);
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
    // p0 lands on Income Tax: they cannot pay it, and give up, which leaves p1 the last player in.
    fireEvent.click(rollButtons()[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Give up' })[0]);
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
    // p0's first roll is 4 and 2, onto Ash Street: p1 owns it too, or p0 could not end the turn without buying or auctioning it.
    const brown = ['Mill Lane', 'Ferry Row', 'Ash Street'].reduce((state, name) => setOwner(state, nameAt(name), 'p1'), ownsOrange);
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

describe('Playtest: drawing a card', () => {
  const start = { ...withBoardData(initialState(rentDay, SEED), rentDay, ['p0', 'p1']), turn: { current: 'p0', phase: 'playing' } };
  const named = (name: string) => start.cards.find((c) => c.zoneId === 'chance-pile' && c.data?.name === name)!.id;
  const toTop = (state: typeof start, id: string) => relocate(state, [id], 'chance-pile', rentDay);
  /** p0 on Go with the named card on top of the chance pile and 3 and 4 to roll, onto Chance. */
  const onTop = (name: string) => queueRoll(toTop(start, named(name)), [3, 4]);

  it('shows the card drawn in the middle of every board', () => {
    mountRentDay({ players: 2, initial: onTop('Bank Pays A Dividend') });
    expect(screen.queryAllByTestId('last-drawn')).toHaveLength(0);
    fireEvent.click(rollButtons()[0]);
    expect(screen.getAllByText('p0 drew from the chance pile: Bank Pays A Dividend — They get 50 money.')).toHaveLength(2);
    expect(screen.getAllByText('p0 1,550 money')).toHaveLength(2);
  });
  it('lists a kept card on every money line, and the button greys with its reason', () => {
    mountRentDay({ players: 2, initial: onTop('Get Out Of Jail Free') });
    fireEvent.click(rollButtons()[0]);
    expect(screen.getAllByText('p0 1,500 money · Get Out Of Jail Free')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Use a Get Out Of Jail Free' })[0].getAttribute('title')).toBe('they are in jail');
  });
  it('frees a player in jail who keeps one, and the card leaves their money line', () => {
    const jailed = setPlayerFact(placePiece(relocate(start, [named('Get Out Of Jail Free')], 'kept-cards-p0', rentDay), 'p0', 10), 'p0', 'in jail', true);
    mountRentDay({ players: 2, initial: jailed });
    expect(screen.getAllByText('p0 1,500 money · in jail · Get Out Of Jail Free')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Use a Get Out Of Jail Free' })[0]);
    expect(screen.getAllByText('p0 1,500 money')).toHaveLength(2);
    expect(rollButtons()[0].getAttribute('aria-disabled')).toBe('false');
  });
});

describe('Playtest: raising money', () => {
  const start = { ...withBoardData(initialState(rentDay, SEED), rentDay, ['p0', 'p1', 'p2']), turn: { current: 'p0', phase: 'playing' } };
  const named = (name: string) => screen.getAllByRole('button', { name });

  it('offers a button any player may press to a seat whose turn it is not, and the space it picks is striped on every board', () => {
    mountRentDay({ initial: setOwner(start, 16, 'p1') });
    expect(named('Take a mortgage')[1].getAttribute('aria-disabled')).toBe('false');
    expect(named('Take a mortgage')[0].getAttribute('title')).toBe('There is no space you own.');
    expect(rollButtons()[1].getAttribute('title')).toBe("It's p0's turn.");
    expect(named('Give up')[1].getAttribute('title')).toBe('they have less than 0 money');
    fireEvent.click(named('Take a mortgage')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Rose Lane' }));
    expect(screen.getAllByText('p1 1,590 money')).toHaveLength(3);
    expect(screen.getAllByTitle(/^Rose Lane — mortgaged, /)).toHaveLength(3);
    expect(document.querySelectorAll('[data-stripes="mortgaged"]')).toHaveLength(3);
    expect(rollButtons()[0].getAttribute('aria-disabled')).toBe('false');
  });
  it('names whom a seat owes on every money line, and the turn waits until the debt is paid', () => {
    // p0 on Cedar Avenue with 10 money rolls 3 and 4 onto p1's Rose Lane, whose rent is 14.
    const owing = queueRoll(placePiece(setCounter(setOwner(setOwner(start, 16, 'p1'), 1, 'p0'), 'money', 'p0', 10), 'p0', 9), [3, 4]);
    mountRentDay({ initial: owing });
    fireEvent.click(rollButtons()[0]);
    expect(screen.getAllByText('p0 -4 money · owes p1')).toHaveLength(3);
    expect(named('End your turn')[0].getAttribute('title')).toBe('no player has less than 0 money');
    expect(named('Give up')[0].getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(named('Take a mortgage')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Mill Lane' }));
    expect(screen.getAllByText('p0 26 money')).toHaveLength(3);
    expect(named('End your turn')[0].getAttribute('aria-disabled')).toBe('false');
  });
});

describe('Playtest: an auction', () => {
  const start = { ...withBoardData(initialState(rentDay, SEED), rentDay, ['p0', 'p1', 'p2']), turn: { current: 'p0', phase: 'playing' } };
  // p0 on Cedar Avenue rolls 3 and 4 onto Rose Lane, which nobody owns.
  const landing = queueRoll(placePiece(start, 'p0', 9), [3, 4]);
  const named = (name: string) => screen.getAllByRole('button', { name });
  const boxes = () => screen.getAllByRole('spinbutton', { name: 'Bid amount' });
  const HINT = 'Bid more than the high bid, or drop out.';
  const auction = () => {
    mountRentDay({ initial: landing });
    fireEvent.click(rollButtons()[0]);
    fireEvent.click(named('Auction the space you are on')[0]);
  };

  it('gives every seat the box, names the auction and whose turn it is, and shows the high bid on every bank line', () => {
    auction();
    expect(screen.getByText(`seat: p1 — auction — Your turn — ${HINT}`)).toBeTruthy();
    expect(screen.getByText(`seat: p0 — auction — ${HINT} — waiting for p1`)).toBeTruthy();
    expect(boxes()).toHaveLength(3);
    expect(named('Bid')[1].getAttribute('aria-disabled')).toBe('false');
    expect(named('Bid')[0].getAttribute('title')).toBe("It's p1's turn.");
    fireEvent.change(boxes()[1], { target: { value: '120' } });
    fireEvent.click(named('Bid')[1]);
    expect(screen.getAllByText('bank: 32 houses, 12 hotels · high bid 120')).toHaveLength(3);
    expect(screen.getByText(`seat: p2 — auction — Your turn — ${HINT}`)).toBeTruthy();
  });
  it('Review Focus: sends no amount from an empty box, and flashes why an amount is refused', () => {
    auction();
    const sent = vi.spyOn(GameServer.prototype, 'submit');
    fireEvent.click(named('Bid')[1]);
    expect(sent).toHaveBeenLastCalledWith('p1', { type: 'bid an amount' });
    expect(screen.getByText('Say how much to bid.')).toBeTruthy();
    fireEvent.change(boxes()[1], { target: { value: '0' } });
    fireEvent.click(named('Bid')[1]);
    expect(sent).toHaveBeenLastCalledWith('p1', { type: 'bid an amount', amount: 0 });
    expect(screen.getByText('the amount is more than the high bid')).toBeTruthy();
  });
  it("goes back to the lander's turn once someone wins, and the high bid leaves the bank line", () => {
    auction();
    fireEvent.change(boxes()[1], { target: { value: '50' } });
    fireEvent.click(named('Bid')[1]);
    fireEvent.click(named('Drop out')[2]);
    fireEvent.click(named('Drop out')[0]);
    expect(screen.getAllByText('p1 1,450 money')).toHaveLength(3);
    expect(screen.getAllByText('bank: 32 houses, 12 hotels')).toHaveLength(3);
    expect(screen.getByText('seat: p0 — Your turn — Roll the dice, then buy, build, or end your turn. A double rolls again.')).toBeTruthy();
    expect(named('End your turn')[0].getAttribute('aria-disabled')).toBe('false');
  });
});

describe('Playtest: a trade', () => {
  const start = { ...withBoardData(initialState(rentDay, SEED), rentDay, ['p0', 'p1', 'p2']), turn: { current: 'p0', phase: 'playing' } };
  // p0 owns Mill Lane (1) and p1 owns Rose Lane (16).
  const owning = setOwner(setOwner(start, 1, 'p0'), 16, 'p1');
  const named = (name: string) => screen.getAllByRole('button', { name });
  const HINT = 'Offer and ask for spaces, cash and kept cards, then propose. The other player accepts or declines.';
  const startTrade = (initial = owning) => {
    mountRentDay({ initial });
    fireEvent.click(named('Trade with another player')[0]);
    fireEvent.click(within(screen.getByRole('status')).getByRole('button', { name: 'Pick p1' }));
  };

  it('Review Focus: lists only the other players still in, and starts the trade with the one picked', () => {
    mountRentDay({ initial: markOut(owning, 'p2') });
    fireEvent.click(named('Trade with another player')[0]);
    const picker = screen.getByRole('status');
    expect(within(picker).getAllByRole('button', { name: /^Pick p/ }).map((b) => b.textContent)).toEqual(['p1']);
    fireEvent.click(within(picker).getByRole('button', { name: 'Pick p1' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText(`seat: p0 — trade — Your turn — ${HINT}`)).toBeTruthy();
    expect(screen.getByText(`seat: p1 — trade — ${HINT} — waiting for p0`)).toBeTruthy();
  });
  it('tags a space in the offer on every board, and shows the cash offer on every bank line', () => {
    startTrade();
    fireEvent.click(named('Offer')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Mill Lane' }));
    expect(document.querySelectorAll('[data-stripes="offered"]')).toHaveLength(3);
    expect(screen.getAllByTestId('tag').map((tag) => tag.textContent)).toEqual(['offered', 'offered', 'offered']);
    fireEvent.change(screen.getAllByRole('spinbutton', { name: 'Offer to pay amount' })[0], { target: { value: '100' } });
    fireEvent.click(named('Offer to pay')[0]);
    expect(screen.getAllByText('bank: 32 houses, 12 hotels · cash offer 100')).toHaveLength(3);
  });
  it('marks the kept cards in the offer on every money line', () => {
    const pass = owning.cards.find((card) => card.data?.name === 'Get Out Of Jail Free')!.id;
    startTrade(relocate(owning, [pass], zoneIdFor('kept cards', 'p0'), rentDay));
    fireEvent.click(named('Offer everything you keep')[0]);
    expect(screen.getAllByText('p0 1,500 money · proposing · Get Out Of Jail Free (handed over)')).toHaveLength(3);
  });
  it("hands the turn to the other player once proposed, who accepts, and goes back to the proposer's turn", () => {
    startTrade();
    fireEvent.click(named('Offer')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Mill Lane' }));
    fireEvent.click(named('Propose the trade')[0]);
    expect(screen.getByText(`seat: p1 — trade — Your turn — ${HINT}`)).toBeTruthy();
    expect(named('Accept the trade')[0].getAttribute('title')).toBe("It's p1's turn.");
    expect(named('Decline the trade')[1].getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(named('Accept the trade')[1]);
    expect(document.querySelectorAll('[data-stripes]')).toHaveLength(0);
    expect(screen.getAllByTitle('Owned by p1')).toHaveLength(6);
    expect(screen.getByText('seat: p0 — Your turn — Roll the dice, then buy, build, or end your turn. A double rolls again.')).toBeTruthy();
  });
});

describe('Playtest: picking another player', () => {
  const PLAYING = 'Roll the dice, then buy, build, or end your turn. A double rolls again.';
  const TRADE_BUTTON = 'Trade with another player';
  const seatsOf = (n: number) => ['p0', 'p1', 'p2'].slice(0, n);
  const fresh = (n = 3) => ({ ...withBoardData(initialState(rentDay, SEED), rentDay, seatsOf(n)), turn: { current: 'p0', phase: 'playing' } });
  const picker = () => screen.queryByRole('status');
  /** A seat's whole panel: what holds its status line. */
  const panelOf = (seat: string) => screen.getByText(new RegExp(`^seat: ${seat} `)).parentElement!;
  const tradeOf = (seat: string) => within(panelOf(seat)).getByRole('button', { name: TRADE_BUTTON });
  const submit = () => vi.spyOn(GameServer.prototype, 'submit');

  it('closes on Cancel without sending, and the turn goes on as it was', () => {
    mountRentDay({ initial: fresh() });
    fireEvent.click(tradeOf('p0'));
    // The banner sits in the room kept for it above the board.
    expect(picker()!.parentElement!.style.minHeight).toBe('28px');
    const sent = submit();
    fireEvent.click(within(picker()!).getByRole('button', { name: 'Cancel' }));
    expect(picker()).toBeNull();
    expect(sent).not.toHaveBeenCalled();
    expect(screen.getByText(`seat: p0 — Your turn — ${PLAYING}`)).toBeTruthy();
    expect(tradeOf('p0').getAttribute('aria-disabled')).toBe('false');
  });
  it('flashes why a seat may not be picked when it is pressed, sends nothing, and stays open', () => {
    // A phrase only this test has, so that one seat is refused while another may be picked: no trading with a player in jail.
    const library = createDefaultLibrary().condition(
      'that player is not {playerflag}', (env, [flag]) => playerFact(env.state, env.subject!.picked!, flag as string) !== true, { needsPick: true },
    );
    const gate = '  A player may trade with another player.\n    Only if no player has less than 0 money.\n';
    expect(RENT_DAY).toContain(gate);
    const compiled = compileGame(RENT_DAY.replace(gate, `${gate}    Only if that player is not in jail.\n`), library);
    expect(compiled.diagnostics).toEqual([]);
    const game = compiled.game!;
    const jailed = setPlayerFact({ ...withBoardData(initialState(game, SEED), game, seatsOf(3)), turn: { current: 'p0', phase: 'playing' } }, 'p2', 'in jail', true);
    mountRentDay({ game, library, initial: jailed });
    fireEvent.click(tradeOf('p0'));
    const p2 = within(picker()!).getByRole('button', { name: 'Pick p2' });
    expect([p2.getAttribute('aria-disabled'), p2.getAttribute('title')]).toEqual(['true', 'that player is not in jail']);
    expect(within(picker()!).getByRole('button', { name: 'Pick p1' }).getAttribute('aria-disabled')).toBe('false');
    const sent = submit();
    fireEvent.click(p2);
    expect(sent).not.toHaveBeenCalled();
    expect(within(panelOf('p0')).getByText('that player is not in jail')).toBeTruthy();
    expect(picker()).not.toBeNull();
    expect(screen.getByText(`seat: p0 — Your turn — ${PLAYING}`)).toBeTruthy();
  });
  it('ends once Undo hands the turn back and the button greys, and does not open again by itself', () => {
    // p0 rolls 1 and 3 onto Income Tax, which has no price, so the turn may end at once.
    mountRentDay({ players: 2, initial: queueRoll(fresh(2), [1, 3]) });
    fireEvent.click(within(panelOf('p0')).getByRole('button', { name: 'Roll the dice' }));
    fireEvent.click(within(panelOf('p0')).getByRole('button', { name: 'End your turn' }));
    fireEvent.click(tradeOf('p1'));
    expect(within(panelOf('p1')).getByRole('status')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(tradeOf('p1').getAttribute('title')).toBe("It's p0's turn.");
    expect(picker()).toBeNull();
    fireEvent.click(within(panelOf('p0')).getByRole('button', { name: 'End your turn' }));
    expect(tradeOf('p1').getAttribute('aria-disabled')).toBe('false');
    expect(picker()).toBeNull();
  });
  it('ends once the button greys while it is open: Undo brings back a debt that stops every trade', () => {
    // p1 owes, and settles it by mortgaging Mill Lane, which lets p0 trade; undoing the mortgage puts p1 back in debt.
    const owing = setOwner(setCounter(fresh(2), 'money', 'p1', -10), 1, 'p1');
    mountRentDay({ players: 2, initial: owing });
    expect(tradeOf('p0').getAttribute('title')).toBe('no player has less than 0 money');
    fireEvent.click(within(panelOf('p1')).getByRole('button', { name: 'Take a mortgage' }));
    fireEvent.click(within(panelOf('p1')).getByRole('button', { name: 'Pick Mill Lane' }));
    fireEvent.click(tradeOf('p0'));
    expect(within(panelOf('p0')).getByRole('status')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(tradeOf('p0').getAttribute('title')).toBe('no player has less than 0 money');
    expect(picker()).toBeNull();
    // Settled again, the button is live again, and the pick that was ended stays ended.
    fireEvent.click(within(panelOf('p1')).getByRole('button', { name: 'Take a mortgage' }));
    fireEvent.click(within(panelOf('p1')).getByRole('button', { name: 'Pick Mill Lane' }));
    expect(tradeOf('p0').getAttribute('aria-disabled')).toBe('false');
    expect(picker()).toBeNull();
  });
  it("opens on the pressing seat's panel only: the other seats' panels and buttons are as they were, and a press there leaves it open", () => {
    mountRentDay({ initial: fresh() });
    fireEvent.click(tradeOf('p0'));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(within(panelOf('p0')).getByRole('status')).toBeTruthy();
    for (const seat of ['p1', 'p2']) {
      expect(within(panelOf(seat)).queryByRole('status'), seat).toBeNull();
      expect(within(panelOf(seat)).queryByText('Pick another player'), seat).toBeNull();
      expect(tradeOf(seat).getAttribute('title'), seat).toBe("It's p0's turn.");
    }
    const sent = submit();
    fireEvent.click(tradeOf('p1'));
    expect(sent).not.toHaveBeenCalled();
    expect(within(panelOf('p1')).getByText("It's p0's turn.")).toBeTruthy();
    expect(within(panelOf('p0')).queryByText("It's p0's turn.")).toBeNull();
    expect(within(panelOf('p0')).getByRole('status')).toBeTruthy();
    fireEvent.click(within(panelOf('p0')).getByRole('button', { name: 'Pick p2' }));
    expect(picker()).toBeNull();
    expect(screen.getByText('seat: p2 — trade — Offer and ask for spaces, cash and kept cards, then propose. The other player accepts or declines. — waiting for p0')).toBeTruthy();
  });
});

describe('Playtest: picking cards', () => {
  const pickGame = compileGame(CARD_PICK_GAME, lib).game!;
  const SHOW = 'show a card from their stash to a card in their case';
  const TRADE = 'trade some cards from their stash to the shop';
  const BUY_BUTTON = 'Buy a card from the shop to your stash';
  const COST = "they have at least the card's cost in coins";
  // The money line ends with the cards in p0's case, which everyone can see.
  const CASE = ' · Ruby 3 · Opal 1';
  const started = createEngine(pickGame, lib, 2, initialState(pickGame, SEED)).engine.getState();
  const named = (name: string) => started.cards.filter((c) => c.data?.name === name).map((c) => c.id);
  const [r1, r2, r3] = named('Ruby');
  const [o1, o2, o3] = named('Opal');
  /** After Setup, with the shop holding a Ruby and an Opal, and p0's stash and case each a Ruby and an Opal too. */
  const initial = [['shop', r1, o1], ['stash-p0', r2, o2], ['case-p0', r3, o3]].reduce(
    (state, [zone, ...ids]) => relocate(state, ids, zone, pickGame),
    relocate(started, zoneCards(started, 'shop').map((c) => c.id), 'pile', pickGame),
  );
  const mountPicks = (over: Partial<Parameters<typeof Playtest>[0]> = {}) => mount({ game: pickGame, players: 2, initial, ...over });
  /** A seat's whole panel: what holds its status line. */
  const panelOf = (seat: string) => screen.getByText(new RegExp(`^seat: ${seat} `)).parentElement!;
  const buttonOf = (seat: string, name: string) => within(panelOf(seat)).getByRole('button', { name });
  const submit = () => vi.spyOn(GameServer.prototype, 'submit');
  const picker = () => within(panelOf('p0')).queryByRole('group', { name: 'Pick cards' });
  const pick = (name: string) => fireEvent.click(within(picker()!).getByRole('button', { name }));
  const buttonsOf = (group: HTMLElement) => within(group).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent);

  it('buys the card picked: the picker lists the shop under the buttons, and closes once a card is picked', () => {
    mountPicks();
    expect(picker()).toBeNull();
    fireEvent.click(buttonOf('p0', BUY_BUTTON));
    expect(within(picker()!).getByText('Pick a card from the shop to buy')).toBeTruthy();
    expect(buttonsOf(picker()!)).toEqual(['Pick Ruby', 'Pick Opal', 'Cancel']);
    // It comes right after the row of buttons.
    expect(picker()!.previousElementSibling!.contains(buttonOf('p0', BUY_BUTTON))).toBe(true);
    pick('Pick Ruby');
    expect(picker()).toBeNull();
    expect(screen.getAllByText(`p0 4 coins, 1 move${CASE}`)).toHaveLength(2);
  });
  it('greys a card the player can not pay for, and explains it in the seat\'s panel instead of sending, staying open', () => {
    mountPicks({ initial: setCounter(initial, 'coins', 'p0', 2) });
    fireEvent.click(buttonOf('p0', BUY_BUTTON));
    const ruby = within(picker()!).getByRole('button', { name: 'Pick Ruby' });
    expect([ruby.getAttribute('aria-disabled'), ruby.getAttribute('title')]).toEqual(['true', COST]);
    const sent = submit();
    fireEvent.click(ruby);
    expect(sent).not.toHaveBeenCalled();
    expect(within(panelOf('p0')).getByText(COST)).toBeTruthy();
    expect(picker()).not.toBeNull();
  });
  it('sells the card picked', () => {
    mountPicks();
    fireEvent.click(buttonOf('p0', 'Sell a card in your stash'));
    pick('Pick Opal');
    expect(picker()).toBeNull();
    expect(screen.getAllByText(`p0 8 coins, 2 moves${CASE}`)).toHaveLength(2);
  });
  it('shows a card to a card in the case: the case is listed once the card is picked, with the target the move refuses greyed', () => {
    mountPicks();
    fireEvent.click(buttonOf('p0', 'Show a card from your stash to a card in your case'));
    pick('Pick Opal');
    expect(within(picker()!).getByText('Pick where it goes: a card in your case')).toBeTruthy();
    const ruby = within(picker()!).getByRole('button', { name: 'Pick Ruby' });
    expect([ruby.getAttribute('aria-disabled'), ruby.getAttribute('title')]).toEqual(['true', 'the target card is not a Ruby']);
    const sent = submit();
    pick('Pick Opal');
    expect(sent).toHaveBeenLastCalledWith('p0', expect.objectContaining({ type: SHOW, cardId: o2, onto: o3 }));
    expect(picker()).toBeNull();
  });
  it('trades the cards picked, in the order picked, on Confirm', () => {
    mountPicks();
    fireEvent.click(buttonOf('p0', 'Trade some cards from your stash to the shop'));
    const sent = submit();
    pick('Pick Opal');
    pick('Pick Ruby');
    expect(sent).not.toHaveBeenCalled();
    pick('Confirm');
    expect(sent).toHaveBeenLastCalledWith('p0', expect.objectContaining({ type: TRADE, cardIds: [o2, r2] }));
    expect(picker()).toBeNull();
  });
  it('keeps a set the rules refuse as a whole open with its picks, and closes once a set is taken', () => {
    const r4 = named('Ruby')[3];
    mountPicks({ initial: relocate(initial, [r4], 'stash-p0', pickGame) });
    fireEvent.click(buttonOf('p0', 'Trade some cards from your stash to the shop'));
    const cards = () => within(picker()!).getAllByRole('button', { name: /^Pick / });
    for (const card of cards()) fireEvent.click(card);
    const sent = submit();
    pick('Confirm');
    expect(sent).toHaveBeenLastCalledWith('p0', expect.objectContaining({ type: TRADE, cardIds: [r2, o2, r4] }));
    expect(within(panelOf('p0')).getByText('they picked at most 2 cards')).toBeTruthy();
    expect(cards().map((card) => card.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true']);
    fireEvent.click(cards()[2]);
    pick('Confirm');
    expect(sent).toHaveBeenLastCalledWith('p0', expect.objectContaining({ type: TRADE, cardIds: [r2, o2] }));
    expect(picker()).toBeNull();
    expect(screen.getAllByText(`p0 7 coins, 1 move${CASE}`)).toHaveLength(2);
  });
  it("tells another seat whose turn it is, and opens no picker in that seat's panel", () => {
    mountPicks();
    expect(buttonOf('p1', BUY_BUTTON).getAttribute('title')).toBe("It's p0's turn.");
    const sent = submit();
    fireEvent.click(buttonOf('p1', BUY_BUTTON));
    expect(sent).not.toHaveBeenCalled();
    expect(within(panelOf('p1')).queryByRole('group', { name: 'Pick cards' })).toBeNull();
    expect(within(panelOf('p1')).getByText("It's p0's turn.")).toBeTruthy();
  });
  it('closes when another button is pressed', () => {
    mountPicks();
    fireEvent.click(buttonOf('p0', BUY_BUTTON));
    expect(picker()).not.toBeNull();
    fireEvent.click(buttonOf('p0', 'Stop'));
    expect(picker()).toBeNull();
  });
  it('Review Focus: ends once Undo hands the turn back and the button greys, and does not open again by itself', () => {
    mountPicks();
    const pickerOf = (seat: string) => within(panelOf(seat)).queryByRole('group', { name: 'Pick cards' });
    fireEvent.click(buttonOf('p0', 'Stop'));
    fireEvent.click(buttonOf('p1', BUY_BUTTON));
    expect(pickerOf('p1')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(buttonOf('p1', BUY_BUTTON).getAttribute('title')).toBe("It's p0's turn.");
    expect(pickerOf('p1')).toBeNull();
    fireEvent.click(buttonOf('p0', 'Stop'));
    expect(buttonOf('p1', BUY_BUTTON).getAttribute('aria-disabled')).toBe('false');
    expect(pickerOf('p1')).toBeNull();
  });
  it('Review Focus: drops a card Undo takes out of the stash from the set, and stays open without it', () => {
    mountPicks({ initial: relocate(initial, [r2], 'pile', pickGame) });
    fireEvent.click(buttonOf('p0', BUY_BUTTON));
    pick('Pick Ruby');
    fireEvent.click(buttonOf('p0', 'Trade some cards from your stash to the shop'));
    pick('Pick Opal');
    pick('Pick Ruby');
    const undo = vi.spyOn(GameServer.prototype, 'undo');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    const shop = () => (undo.mock.contexts[0] as GameServer).viewFor('p0').scene.cards.filter((c) => c.zoneId === 'shop').map((c) => c.id);
    expect(shop()).toEqual(expect.arrayContaining([r1, o1]));
    expect(shop()).toHaveLength(2);
    expect(buttonsOf(picker()!)).toEqual(['Pick Opal', 'Confirm', 'Cancel']);
    expect(within(picker()!).getByRole('button', { name: 'Pick Opal' }).getAttribute('aria-pressed')).toBe('true');
    const sent = submit();
    pick('Confirm');
    expect(sent).toHaveBeenLastCalledWith('p0', expect.objectContaining({ type: TRADE, cardIds: [o2] }));
  });
  it('closes on Cancel without sending', () => {
    mountPicks();
    fireEvent.click(buttonOf('p0', BUY_BUTTON));
    const sent = submit();
    pick('Cancel');
    expect(picker()).toBeNull();
    expect(sent).not.toHaveBeenCalled();
    expect(screen.getAllByText(`p0 7 coins, 2 moves${CASE}`)).toHaveLength(2);
  });
  it('opens inside the room kept for the buttons on a table too big for one screen', () => {
    const SHOP = '  The shop is a row in the center that everyone can see.';
    const rows = ['hall', 'yard', 'loft', 'barn'].map((zone) => `  The ${zone} is a row in the center that everyone can see.`);
    const crowded = compileGame(CARD_PICK_GAME.replace(SHOP, [SHOP, ...rows].join('\n')), lib).game!;
    mountPicks({ game: crowded, initial: undefined });
    const room = screen.getByTestId('seat-buttons');
    expect(within(room).queryByRole('group', { name: 'Pick cards' })).toBeNull();
    fireEvent.click(within(room).getByRole('button', { name: BUY_BUTTON }));
    expect(within(room).getByRole('group', { name: 'Pick cards' })).toBeTruthy();
  });
});
