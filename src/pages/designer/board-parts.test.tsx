import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardView } from '@/engine/core/lang/board-view';
import { ActionButtons, BANNER_SLOT, MoneyLine, PlayerPicker } from './board-controls';
import { BoardGrid, factWords } from './board-grid';
import { seatColor } from './seat-colors';

const space = (name: string, over: Partial<BoardView['spaces'][number]> = {}): BoardView['spaces'][number] =>
  ({ name, color: null, details: {}, facts: {}, stripes: [], owner: null, ...over });

const board = (over: Partial<BoardView> = {}): BoardView => ({
  spaces: [space('Go'), space('Mill Lane', { color: 'brown', details: { price: 60, rent: 2 }, owner: 'p1' }), space('Treasury'), space('Ferry Row', { color: 'brown' })],
  pieces: { p0: 1, p1: 1 },
  roll: null,
  counters: [{ name: 'money', values: { p0: 1500, p1: 1234567, p2: 40 } }],
  out: [],
  bank: [],
  playerFacts: {},
  lastDrawn: null,
  playerCards: {},
  playerCardFlags: {},
  owes: {},
  gameNumbers: [],
  interrupted: false,
  ...over,
});

describe('BoardGrid', () => {
  it('names each space and lists what the table says about it on hover', () => {
    render(<BoardGrid board={board()} />);
    expect(screen.getByTitle('Mill Lane — price 60, rent 2')).toBeTruthy();
    expect(screen.getByTitle('Go')).toBeTruthy();
  });

  it('shows a dot per piece in its owner color and a mark in the owner color on an owned space', () => {
    render(<BoardGrid board={board()} />);
    expect(screen.getByTitle('p0').style.backgroundColor).toBe(seatColor('p0'));
    expect(screen.getByTitle('p1').style.backgroundColor).toBe(seatColor('p1'));
    expect(screen.getByTitle('Owned by p1').style.backgroundColor).toBe(seatColor('p1'));
    expect(screen.queryByTitle('Owned by p0')).toBeNull();
  });

  it('paints the color band of a colored space only', () => {
    render(<BoardGrid board={board()} />);
    expect(screen.getAllByTestId('band')).toHaveLength(2);
  });

  it('draws the latest roll in the middle once there is one', () => {
    // Four spaces would fill the square with nothing left in the middle.
    const spaces = Array.from({ length: 12 }, (_, i) => space(`Space ${i}`));
    const { rerender } = render(<BoardGrid board={board({ spaces })} />);
    expect(screen.queryByLabelText(/^Rolled/)).toBeNull();
    rerender(<BoardGrid board={board({ spaces, roll: [3, 4] })} />);
    expect(screen.getByLabelText('Rolled 3 and 4').textContent).toBe('34');
  });
});

describe('cards on a board', () => {
  it('shows the last card drawn in the middle of the board, and nothing before a draw', () => {
    const spaces = Array.from({ length: 12 }, (_, i) => space(`Space ${i}`));
    const { rerender } = render(<BoardGrid board={board({ spaces })} />);
    expect(screen.queryByTestId('last-drawn')).toBeNull();
    rerender(<BoardGrid board={board({ spaces, lastDrawn: { seat: 'p0', zone: 'the lucky pile', name: 'Dividend', says: 'They get 50 money.' } })} />);
    expect(screen.getByTestId('last-drawn').textContent).toBe('p0 drew from the lucky pile: Dividend — They get 50 money.');
    // The picking banner is the page's status; a card drawn is not.
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('lists the cards a seat keeps after its numbers and facts, and nothing after a seat that is out', () => {
    render(<MoneyLine board={board({ out: ['p2'], playerFacts: { p0: { asleep: true } }, playerCards: { p0: ['Free Pass'], p1: ['Free Pass', 'Lucky Charm'], p2: ['Free Pass'] } })} />);
    expect(screen.getByText('p0 1,500 money · asleep · Free Pass')).toBeTruthy();
    expect(screen.getByText('p1 1,234,567 money · Free Pass · Lucky Charm')).toBeTruthy();
    expect(screen.getByText('p2 out')).toBeTruthy();
  });
});

describe('BoardGrid facts', () => {
  const rose = (facts: BoardView['spaces'][number]['facts']) =>
    board({ spaces: [space('Go'), space('Rose Lane', { color: 'orange', details: { price: 180 }, facts }), space('Treasury'), space('Ferry Row')] });

  it('draws a count as that many small marks on the color band', () => {
    render(<BoardGrid board={rose({ houses: 2 })} />);
    expect(screen.getAllByTestId('house')).toHaveLength(2);
    expect(within(screen.getByTitle(/^Rose Lane/)).getAllByTestId('house')).toHaveLength(2);
    expect(screen.queryAllByTestId('flag')).toHaveLength(0);
  });

  it('draws up to 4 marks, and a larger count as one mark and the number', () => {
    const { rerender } = render(<BoardGrid board={rose({ houses: 4 })} />);
    expect(screen.getAllByTestId('house')).toHaveLength(4);
    rerender(<BoardGrid board={rose({ houses: 7 })} />);
    expect(screen.getAllByTestId('house')).toHaveLength(1);
    expect(within(screen.getByTitle(/^Rose Lane/)).getByText('7')).toBeTruthy();
  });

  it('draws a flag that is on as one red block, one for each flag', () => {
    const { rerender } = render(<BoardGrid board={rose({ hotel: true })} />);
    expect(screen.getAllByTestId('flag')).toHaveLength(1);
    expect(screen.queryAllByTestId('house')).toHaveLength(0);
    rerender(<BoardGrid board={rose({ hotel: true, guarded: true })} />);
    expect(screen.getAllByTestId('flag')).toHaveLength(2);
  });

  it('draws marks on a space with no color band too', () => {
    render(<BoardGrid board={board({ spaces: [space('Go', { facts: { houses: 1 } }), space('Mill Lane'), space('Treasury'), space('Ferry Row')] })} />);
    expect(screen.getAllByTestId('house')).toHaveLength(1);
  });

  it('says the facts first on hover, a count in its singular for one', () => {
    const { rerender } = render(<BoardGrid board={rose({ houses: 2, hotel: true })} />);
    expect(screen.getByTitle('Rose Lane — 2 houses, hotel, price 180')).toBeTruthy();
    rerender(<BoardGrid board={rose({ houses: 1 })} />);
    expect(screen.getByTitle('Rose Lane — 1 house, price 180')).toBeTruthy();
    rerender(<BoardGrid board={rose({})} />);
    expect(screen.getByTitle('Rose Lane — price 180')).toBeTruthy();
  });
});

describe('facts about players', () => {
  const jailed = board({ playerFacts: { p0: { 'in jail': true, 'jail turns': 1 }, p1: { 'jail turns': 2 } } });
  it('lists the players on a space with their facts, and rings a piece whose player has a yes/no fact set', () => {
    render(<BoardGrid board={jailed} />);
    expect(screen.getByTitle('Mill Lane — p0 (in jail, 1 jail turn), p1 (2 jail turns), price 60, rent 2')).toBeTruthy();
    expect(screen.getByTitle('p0 (in jail, 1 jail turn)').getAttribute('data-ring')).toBe('true');
    expect(screen.getByTitle('p1 (2 jail turns)').hasAttribute('data-ring')).toBe(false);
  });
  it('puts the facts after the money, and none after a seat that is out', () => {
    render(<MoneyLine board={{ ...jailed, out: ['p2'], playerFacts: { ...jailed.playerFacts, p2: { 'in jail': true } } }} />);
    expect(screen.getByText('p0 1,500 money · in jail · 1 jail turn')).toBeTruthy();
    expect(screen.getByText('p1 1,234,567 money · 2 jail turns')).toBeTruthy();
    expect(screen.getByText('p2 out')).toBeTruthy();
  });
  it('says nothing of a flag that is off or a count of 0, and leaves such a player unlisted and unringed', () => {
    const off = board({ playerFacts: { p0: { 'in jail': false, 'jail turns': 0 } } });
    render(<BoardGrid board={off} />);
    expect(screen.getByTitle('Mill Lane — price 60, rent 2')).toBeTruthy();
    expect(screen.getByTitle('p0').hasAttribute('data-ring')).toBe(false);
    expect(factWords({ 'in jail': false, 'jail turns': 0 })).toEqual([]);
  });
  it('gives the facts in the order given: true flags by name, other counts with their number', () => {
    expect(factWords({ crown: true, 'jail turns': 1, 'in jail': true, bonus: 3, banned: false })).toEqual(['crown', '1 jail turn', 'in jail', '3 bonus']);
  });
  it('never rings a piece for a count alone, and leaves a player with no facts as just the seat', () => {
    render(<BoardGrid board={board({ playerFacts: { p0: { 'jail turns': 2 }, p1: {} } })} />);
    expect(screen.getByTitle('p0 (2 jail turns)').hasAttribute('data-ring')).toBe(false);
    expect(screen.getByTitle('p1')).toBeTruthy();
  });
  it('puts a space\'s own facts after the players and before its details', () => {
    const spaces = [space('Go'), space('Rose Lane', { facts: { houses: 2 }, details: { price: 180 } }), space('Treasury'), space('Ferry Row')];
    render(<BoardGrid board={board({ spaces, pieces: { p0: 1 }, playerFacts: { p0: { 'in jail': true } } })} />);
    expect(screen.getByTitle('Rose Lane — p0 (in jail), 2 houses, price 180')).toBeTruthy();
  });
});

describe('debts and flags no bank item goes with', () => {
  it('names whom a seat owes right after its numbers', () => {
    render(<MoneyLine board={board({
      counters: [{ name: 'money', values: { p0: -4, p1: -20, p2: 40 } }], owes: { p0: 'p1', p1: 'bank' },
      playerFacts: { p0: { asleep: true } }, playerCards: { p0: ['Free Pass'] },
    })} />);
    expect(screen.getByText('p0 -4 money · owes p1 · asleep · Free Pass')).toBeTruthy();
    expect(screen.getByText('p1 -20 money · owes the bank')).toBeTruthy();
    expect(screen.getByText('p2 40 money')).toBeTruthy();
  });
  it('stripes a space for a flag no bank item goes with, and still draws a block for one that does', () => {
    const spaces = [space('Go'), space('Mill Lane', { facts: { pledged: true }, stripes: ['pledged'] }), space('Treasury'), space('Ferry Row', { facts: { hotel: true } })];
    render(<BoardGrid board={board({ spaces })} />);
    const mill = screen.getByTitle('Mill Lane — pledged');
    expect(mill.getAttribute('data-stripes')).toBe('pledged');
    expect(within(mill).queryAllByTestId('flag')).toHaveLength(0);
    const ferry = screen.getByTitle('Ferry Row — hotel');
    expect(ferry.getAttribute('data-stripes')).toBeNull();
    expect(within(ferry).getAllByTestId('flag')).toHaveLength(1);
  });
});

describe('BoardGrid picking', () => {
  const choosing = (over: Partial<NonNullable<ComponentProps<typeof BoardGrid>['picking']>> = {}) => ({
    prompt: 'Pick a street you own',
    spaces: { 1: true as const, 3: 'Ferry Row has fewer buildings.' },
    onPick: vi.fn(),
    onRefused: vi.fn(),
    ...over,
  });
  // Twelve spaces leave a middle to say the prompt in.
  const wide = () => board({ spaces: Array.from({ length: 12 }, (_, i) => space(`Space ${i}`)) });

  it('makes each space the player may pick a button, and picks it by its place on the board', () => {
    const picking = choosing();
    render(<BoardGrid board={board()} picking={picking} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Mill Lane' }));
    expect(picking.onPick).toHaveBeenCalledWith(1);
    expect(picking.onRefused).not.toHaveBeenCalled();
  });

  it('outlines a space that may be picked and dashes one that is refused', () => {
    render(<BoardGrid board={board()} picking={choosing()} />);
    const outline = (name: string) => within(screen.getByRole('button', { name })).getByTestId('pick-outline').style.outline;
    expect(outline('Pick Mill Lane')).toContain('solid');
    expect(outline('Pick Ferry Row')).toContain('dashed');
  });

  it('draws the outline above the stripes of a striped space, so a space that may be picked does not look refused', () => {
    const striped = (name: string) => space(name, { facts: { pledged: true }, stripes: ['pledged'] });
    render(<BoardGrid board={board({ spaces: [space('Go'), striped('Mill Lane'), space('Treasury'), striped('Ferry Row')] })} picking={choosing()} />);
    for (const name of ['Pick Mill Lane', 'Pick Ferry Row']) {
      const picked = screen.getByRole('button', { name });
      const above = Number(within(picked).getByTestId('pick-outline').style.zIndex);
      expect(above, name).toBeGreaterThan(Number(within(picked).getByTestId('stripes').style.zIndex));
    }
  });

  it('picks with the keyboard too', () => {
    const picking = choosing();
    render(<BoardGrid board={board()} picking={picking} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Pick Mill Lane' }), { key: 'Enter' });
    expect(picking.onPick).toHaveBeenCalledWith(1);
  });

  it('keys a space by its place on the board, so spaces that share a name are told apart', () => {
    const twins = board({ spaces: [space('Go'), space('Treasury'), space('Ferry Row'), space('Treasury')] });
    const picking = choosing({ spaces: { 3: true } });
    render(<BoardGrid board={twins} picking={picking} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Treasury' }));
    expect(picking.onPick).toHaveBeenCalledWith(3);
  });

  it('says why a refused space cannot be picked when it is clicked, and picks nothing', () => {
    const picking = choosing();
    render(<BoardGrid board={board()} picking={picking} />);
    const refused = screen.getByRole('button', { name: 'Pick Ferry Row' });
    expect(refused.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(refused);
    expect(picking.onRefused).toHaveBeenCalledWith('Ferry Row has fewer buildings.');
    expect(picking.onPick).not.toHaveBeenCalled();
  });

  it('leaves every other space alone, faded and not a button', () => {
    const picking = choosing();
    render(<BoardGrid board={board()} picking={picking} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    fireEvent.click(screen.getByTitle('Go'));
    expect(picking.onPick).not.toHaveBeenCalled();
    expect(picking.onRefused).not.toHaveBeenCalled();
    expect(screen.getByTitle('Go').style.opacity).toBe('0.35');
    expect(within(screen.getByTitle('Go')).queryByTestId('pick-outline')).toBeNull();
    expect(screen.getByRole('button', { name: 'Pick Mill Lane' }).style.opacity).not.toBe('0.35');
  });

  it('says the prompt in the middle, and is plain without picking', () => {
    const { rerender } = render(<BoardGrid board={wide()} picking={choosing({ spaces: { 2: true } })} />);
    expect(screen.getByText('Pick a street you own')).toBeTruthy();
    rerender(<BoardGrid board={wide()} />);
    expect(screen.queryByText('Pick a street you own')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('MoneyLine', () => {
  it('shows each seat in order with its number, thousands separated, in its color', () => {
    render(<MoneyLine board={board()} />);
    expect(screen.getByText('p0 1,500 money').style.color).toBe(seatColor('p0'));
    expect(screen.getByText('p1 1,234,567 money')).toBeTruthy();
    expect(screen.getByText('p2 40 money')).toBeTruthy();
  });

  it('says out for a seat that is out, and a question mark for a number the seat may not see', () => {
    render(<MoneyLine board={board({ counters: [{ name: 'secrets', values: { p0: 3, p1: null, p2: null } }], out: ['p2'] })} />);
    expect(screen.getByText('p0 3 secrets')).toBeTruthy();
    expect(screen.getByText('p1 ? secrets')).toBeTruthy();
    expect(screen.getByText('p2 out')).toBeTruthy();
  });

  it('keeps seat order past nine seats', () => {
    const values = Object.fromEntries(['p10', 'p2', 'p1', 'p0'].map((s, i) => [s, i]));
    render(<MoneyLine board={board({ counters: [{ name: 'money', values }], out: [] })} />);
    expect(screen.getAllByText(/^p\d+ \d+ money$/).map((e) => e.textContent)).toEqual(['p0 3 money', 'p1 2 money', 'p2 1 money', 'p10 0 money']);
  });

  it('says what the bank has left, in its own words, after the seats', () => {
    render(<MoneyLine board={board({ bank: [{ name: 'houses', count: 31 }, { name: 'hotels', count: 12 }] })} />);
    expect(screen.getByText('bank: 31 houses, 12 hotels')).toBeTruthy();
  });

  it('puts the bank on a line of its own under the seats', () => {
    render(<MoneyLine board={board({ bank: [{ name: 'houses', count: 31 }] })} />);
    const bank = screen.getByText('bank: 31 houses');
    const seat = screen.getByText('p0 1,500 money');
    expect(bank.parentElement).not.toBe(seat.parentElement);
    expect(seat.compareDocumentPosition(bank) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts a bank of one in its singular, and says nothing of a bank the game does not have', () => {
    const { rerender } = render(<MoneyLine board={board({ bank: [{ name: 'houses', count: 1 }, { name: 'hotels', count: 0 }] })} />);
    expect(screen.getByText('bank: 1 house, 0 hotels')).toBeTruthy();
    rerender(<MoneyLine board={board({ bank: [] })} />);
    expect(screen.queryByText(/^bank/)).toBeNull();
  });

  it('lists several numbers of one seat together', () => {
    render(<MoneyLine board={board({ counters: [{ name: 'money', values: { p0: 5 } }, { name: 'lives', values: { p0: 3 } }], out: [] })} />);
    expect(screen.getByText('p0 5 money, 3 lives')).toBeTruthy();
  });
});

describe('ActionButtons', () => {
  const actions = [
    { move: 'roll the dice', label: 'Roll the dice', allowed: true as const, target: null, amount: false, players: null },
    { move: 'end their turn', label: 'End your turn', allowed: 'they have rolled this turn', target: null, amount: false, players: null },
  ];

  it('presses an allowed button and greys the others with the reason', () => {
    const onPress = vi.fn();
    const onRefused = vi.fn();
    render(<ActionButtons actions={actions} onPress={onPress} onPick={vi.fn()} onRefused={onRefused} />);
    const roll = screen.getByRole('button', { name: 'Roll the dice' });
    const end = screen.getByRole('button', { name: 'End your turn' });
    expect(roll.getAttribute('aria-disabled')).toBe('false');
    expect(roll.hasAttribute('title')).toBe(false);
    expect(end.getAttribute('aria-disabled')).toBe('true');
    expect(end.getAttribute('title')).toBe('they have rolled this turn');
    fireEvent.click(roll);
    expect(onPress).toHaveBeenCalledWith('roll the dice');
    fireEvent.click(end);
    expect(onRefused).toHaveBeenCalledWith('they have rolled this turn');
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRefused).toHaveBeenCalledTimes(1);
  });

  it('sends nothing from a button greyed because the game is over', () => {
    const onPress = vi.fn();
    const onRefused = vi.fn();
    render(<ActionButtons actions={[{ move: 'roll the dice', label: 'Roll the dice', allowed: 'The game is over.', target: null, amount: false, players: null }]} onPress={onPress} onPick={vi.fn()} onRefused={onRefused} />);
    fireEvent.click(screen.getByRole('button', { name: 'Roll the dice' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(onRefused).toHaveBeenCalledWith('The game is over.');
  });

  it('A pick button asks to pick: a button that picks another player calls onPick, and sends nothing yet', () => {
    const onPress = vi.fn();
    const onPick = vi.fn();
    const swap = { move: 'swap with another player', label: 'Swap with another player', allowed: true as const, target: null, amount: false, players: { p1: true as const } };
    render(<ActionButtons actions={[swap]} onPress={onPress} onPick={onPick} onRefused={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Swap with another player' }));
    expect(onPick).toHaveBeenCalledWith(swap);
    expect(onPress).not.toHaveBeenCalled();
  });

  describe('a button that picks a space', () => {
    const target = { prompt: 'Pick a street you own', spaces: { 1: true as const } };
    const build = { move: 'build a house on a street they own', label: 'Build a house', allowed: true as const, target, amount: false, players: null };

    it('opens picking when pressed, and sends nothing yet', () => {
      const onPress = vi.fn();
      const onPick = vi.fn();
      render(<ActionButtons actions={[build]} onPress={onPress} onPick={onPick} onRefused={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Build a house' }));
      expect(onPick).toHaveBeenCalledWith(build);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('is greyed with the reason when there is nothing to pick, and opens nothing', () => {
      const none = { ...build, allowed: 'There is no street you own.', target: { ...target, spaces: {} } };
      const onPick = vi.fn();
      const onRefused = vi.fn();
      render(<ActionButtons actions={[none]} onPress={vi.fn()} onPick={onPick} onRefused={onRefused} />);
      const button = screen.getByRole('button', { name: 'Build a house' });
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('title')).toBe('There is no street you own.');
      fireEvent.click(button);
      expect(onRefused).toHaveBeenCalledWith('There is no street you own.');
      expect(onPick).not.toHaveBeenCalled();
    });
  });
});

describe("game numbers and buttons that carry an amount", () => {
  const raise = { move: 'raise an amount', label: 'Raise', allowed: true as const, target: null, amount: true, players: null };
  it('puts the game numbers that are set after the bank, and alone when there is no bank', () => {
    render(<MoneyLine board={board({ bank: [{ name: 'houses', count: 32 }], gameNumbers: [{ name: 'pot', value: 1200 }] })} />);
    expect(screen.getByText('bank: 32 houses · pot 1,200')).toBeTruthy();
    render(<MoneyLine board={board({ gameNumbers: [{ name: 'tally', value: 5 }] })} />);
    expect(screen.getByText('tally 5')).toBeTruthy();
  });
  it('joins several game numbers, and says nothing when there is neither a bank nor a number', () => {
    const { rerender } = render(<MoneyLine board={board({ gameNumbers: [{ name: 'pot', value: 5 }, { name: 'cap', value: -3 }] })} />);
    expect(screen.getByText('pot 5 · cap -3')).toBeTruthy();
    rerender(<MoneyLine board={board()} />);
    expect(screen.queryByText(/pot|cap|bank/)).toBeNull();
    // The seats' own line is all that is left, so nothing else follows it.
    expect(screen.getByText('p0 1,500 money').parentElement!.parentElement!.children).toHaveLength(1);
  });
  it('gives an amount button a number box and sends the number typed in it', () => {
    const onPress = vi.fn();
    render(<ActionButtons actions={[raise]} onPress={onPress} onPick={vi.fn()} onRefused={vi.fn()} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Raise amount' }), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));
    expect(onPress).toHaveBeenLastCalledWith('raise an amount', 50);
  });
  it('Review Focus: sends no amount from an empty box', () => {
    const onPress = vi.fn();
    render(<ActionButtons actions={[raise]} onPress={onPress} onPick={vi.fn()} onRefused={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));
    expect(onPress).toHaveBeenLastCalledWith('raise an amount', null);
  });
  it('is a whole-number box of 0 or more, right before its button, that keeps what was typed after the button is pressed', () => {
    render(<ActionButtons actions={[raise]} onPress={vi.fn()} onPick={vi.fn()} onRefused={vi.fn()} />);
    const box = screen.getByRole('spinbutton', { name: 'Raise amount' }) as HTMLInputElement;
    expect([box.type, box.min, box.step]).toEqual(['number', '0', '1']);
    expect(box.nextElementSibling).toBe(screen.getByRole('button', { name: 'Raise' }));
    fireEvent.change(box, { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));
    expect(box.value).toBe('50');
  });
  it('sends 0 from a box holding 0, which is an amount and not a blank', () => {
    const onPress = vi.fn();
    render(<ActionButtons actions={[raise]} onPress={onPress} onPick={vi.fn()} onRefused={vi.fn()} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Raise amount' }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));
    expect(onPress).toHaveBeenLastCalledWith('raise an amount', 0);
  });
  it('greys the box with its button, and explains instead of sending', () => {
    const onPress = vi.fn();
    const onRefused = vi.fn();
    render(<ActionButtons actions={[{ ...raise, allowed: 'they have rolled this turn' }]} onPress={onPress} onPick={vi.fn()} onRefused={onRefused} />);
    expect((screen.getByRole('spinbutton', { name: 'Raise amount' }) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));
    expect(onRefused).toHaveBeenCalledWith('they have rolled this turn');
    expect(onPress).not.toHaveBeenCalled();
  });
  it('gives the reason on hover over the greyed box too, and none while the button is live', () => {
    const { rerender } = render(<ActionButtons actions={[{ ...raise, allowed: 'they have rolled this turn' }]} onPress={vi.fn()} onPick={vi.fn()} onRefused={vi.fn()} />);
    // Not every browser shows a disabled box's own hover text, so the box and its button share a holder that has the reason.
    const holder = () => screen.getByRole('spinbutton', { name: 'Raise amount' }).parentElement!;
    expect(holder().getAttribute('title')).toBe('they have rolled this turn');
    expect(holder()).toBe(screen.getByRole('button', { name: 'Raise' }).parentElement);
    rerender(<ActionButtons actions={[raise]} onPress={vi.fn()} onPick={vi.fn()} onRefused={vi.fn()} />);
    expect(holder().hasAttribute('title')).toBe(false);
  });
  it('sends the number typed when Enter is pressed in the box, as the button does, and nothing on other keys', () => {
    const onPress = vi.fn();
    render(<ActionButtons actions={[raise]} onPress={onPress} onPick={vi.fn()} onRefused={vi.fn()} />);
    const box = screen.getByRole('spinbutton', { name: 'Raise amount' });
    fireEvent.change(box, { target: { value: '50' } });
    fireEvent.keyDown(box, { key: '5' });
    expect(onPress).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenLastCalledWith('raise an amount', 50);
    expect((box as HTMLInputElement).value).toBe('50');
  });
  it('gives a button that carries no amount no box, and sends only its move', () => {
    const onPress = vi.fn();
    render(<ActionButtons actions={[{ ...raise, amount: false }]} onPress={onPress} onPick={vi.fn()} onRefused={vi.fn()} />);
    expect(screen.queryByRole('spinbutton')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress.mock.calls[0]).toEqual(['raise an amount']);
  });
  it('keeps each amount button its own box', () => {
    const onPress = vi.fn();
    const lower = { ...raise, move: 'lower an amount', label: 'Lower' };
    render(<ActionButtons actions={[raise, lower]} onPress={onPress} onPick={vi.fn()} onRefused={vi.fn()} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Raise amount' }), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lower' }));
    expect(onPress).toHaveBeenLastCalledWith('lower an amount', null);
  });
});

describe('the offer on the board and the money line, and picking another player', () => {
  it('tags a space with each flag it is striped for', () => {
    const spaces = [space('Go'), space('Mill Lane', { facts: { pledged: true, lent: true }, stripes: ['pledged', 'lent'] }), space('Treasury'), space('Ferry Row')];
    render(<BoardGrid board={board({ spaces })} />);
    const mill = screen.getByTitle('Mill Lane — pledged, lent');
    expect(within(mill).getAllByTestId('tag').map((tag) => tag.textContent)).toEqual(['pledged', 'lent']);
    expect(screen.getAllByTestId('tag')).toHaveLength(2);
  });
  it('marks a kept card with the flags set on it', () => {
    render(<MoneyLine board={board({ playerCards: { p0: ['Free Pass', 'Map'] }, playerCardFlags: { p0: [['lent', 'wanted'], []] } })} />);
    expect(screen.getByText('p0 1,500 money · Free Pass (lent, wanted) · Map')).toBeTruthy();
  });
  it('Review Focus: offers each seat listed, greys a refused one with why, and sends only one that may be picked', () => {
    const [onPick, onRefused, onCancel] = [vi.fn(), vi.fn(), vi.fn()];
    render(<PlayerPicker players={{ p10: true, p2: 'they are asleep' }} onPick={onPick} onRefused={onRefused} onCancel={onCancel} />);
    const picker = screen.getByRole('status');
    expect(within(picker).getByText('Pick another player')).toBeTruthy();
    const seats = within(picker).getAllByRole('button', { name: /^Pick p/ });
    expect(seats.map((b) => b.textContent)).toEqual(['p2', 'p10']);
    expect([seats[0].getAttribute('aria-disabled'), seats[0].getAttribute('title')]).toEqual(['true', 'they are asleep']);
    fireEvent.click(seats[0]);
    expect(onRefused).toHaveBeenLastCalledWith('they are asleep');
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.click(seats[1]);
    expect(onPick).toHaveBeenLastCalledWith('p10');
    fireEvent.click(within(picker).getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
  it('keeps each seat on the picker no taller than the room the page keeps for a banner, so the board below it stays put', () => {
    render(<PlayerPicker players={{ p1: true, p2: true }} onPick={vi.fn()} onRefused={vi.fn()} onCancel={vi.fn()} />);
    const picker = screen.getByRole('status');
    for (const seat of within(picker).getAllByRole('button', { name: /^Pick p/ })) {
      // The height takes in the seat's border and padding, and the banner's own room above and below goes on top of it.
      expect(seat.style.boxSizing).toBe('border-box');
      expect(parseFloat(seat.style.height) + parseFloat(picker.style.paddingTop) + parseFloat(picker.style.paddingBottom)).toBeLessThanOrEqual(BANNER_SLOT);
    }
  });
  it('lays the tags of a striped space over its band, above the name, so they never cover a line of it', () => {
    const spaces = [space('Go'), space('Market Square', { color: 'red', facts: { pledged: true, lent: true }, stripes: ['pledged', 'lent'] }), space('Treasury'), space('Ferry Row')];
    render(<BoardGrid board={board({ spaces, pieces: { p0: 1 }, playerFacts: { p0: { asleep: true } } })} />);
    const market = screen.getByTitle(/^Market Square/);
    const tags = within(market).getAllByTestId('tag');
    const top = tags[0].parentElement!.parentElement!;
    // The band and the tags share the top of the space, which grows to hold the tags; the name comes after it, on its own.
    expect(within(top).getByTestId('band')).toBe(within(market).getByTestId('band'));
    expect(top.style.display).toBe('grid');
    expect([within(top).getByTestId('band').style.gridArea, tags[0].parentElement!.style.gridArea]).toEqual(['1 / 1', '1 / 1']);
    const name = [...market.children].find((child) => child.textContent === 'Market Square') as HTMLElement;
    expect(top.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(name.contains(tags[0])).toBe(false);
    // A space with no stripes keeps its band as it was.
    expect(within(screen.getByTitle('Go')).queryByTestId('tag')).toBeNull();
  });
});
