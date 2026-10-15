import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardView } from '@/engine/core/lang/board-view';
import { ActionButtons, MoneyLine } from './board-controls';
import { BoardGrid } from './board-grid';
import { seatColor } from './seat-colors';

const space = (name: string, over: Partial<BoardView['spaces'][number]> = {}): BoardView['spaces'][number] =>
  ({ name, color: null, details: {}, facts: {}, owner: null, ...over });

const board = (over: Partial<BoardView> = {}): BoardView => ({
  spaces: [space('Go'), space('Mill Lane', { color: 'brown', details: { price: 60, rent: 2 }, owner: 'p1' }), space('Treasury'), space('Ferry Row', { color: 'brown' })],
  pieces: { p0: 1, p1: 1 },
  roll: null,
  counters: [{ name: 'money', values: { p0: 1500, p1: 1234567, p2: 40 } }],
  out: [],
  bank: [],
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
    { move: 'roll the dice', label: 'Roll the dice', allowed: true as const, target: null },
    { move: 'end their turn', label: 'End your turn', allowed: 'they have rolled this turn', target: null },
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
    render(<ActionButtons actions={[{ move: 'roll the dice', label: 'Roll the dice', allowed: 'The game is over.', target: null }]} onPress={onPress} onPick={vi.fn()} onRefused={onRefused} />);
    fireEvent.click(screen.getByRole('button', { name: 'Roll the dice' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(onRefused).toHaveBeenCalledWith('The game is over.');
  });

  describe('a button that picks a space', () => {
    const target = { prompt: 'Pick a street you own', spaces: { 1: true as const } };
    const build = { move: 'build a house on a street they own', label: 'Build a house', allowed: true as const, target };

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
