import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardView } from '@/engine/core/lang/board-view';
import { ActionButtons, MoneyLine } from './board-controls';
import { BoardGrid } from './board-grid';
import { seatColor } from './seat-colors';

const space = (name: string, over: Partial<BoardView['spaces'][number]> = {}): BoardView['spaces'][number] =>
  ({ name, color: null, details: {}, owner: null, ...over });

const board = (over: Partial<BoardView> = {}): BoardView => ({
  spaces: [space('Go'), space('Mill Lane', { color: 'brown', details: { price: 60, rent: 2 }, owner: 'p1' }), space('Treasury'), space('Ferry Row', { color: 'brown' })],
  pieces: { p0: 1, p1: 1 },
  roll: null,
  counters: [{ name: 'money', values: { p0: 1500, p1: 1234567, p2: 40 } }],
  out: [],
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

  it('lists several numbers of one seat together', () => {
    render(<MoneyLine board={board({ counters: [{ name: 'money', values: { p0: 5 } }, { name: 'lives', values: { p0: 3 } }], out: [] })} />);
    expect(screen.getByText('p0 5 money, 3 lives')).toBeTruthy();
  });
});

describe('ActionButtons', () => {
  const actions = [
    { move: 'roll the dice', label: 'Roll the dice', allowed: true as const },
    { move: 'end their turn', label: 'End your turn', allowed: 'they have rolled this turn' },
  ];

  it('presses an allowed button and greys the others with the reason', () => {
    const onPress = vi.fn();
    const onRefused = vi.fn();
    render(<ActionButtons actions={actions} onPress={onPress} onRefused={onRefused} />);
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
    render(<ActionButtons actions={[{ move: 'roll the dice', label: 'Roll the dice', allowed: 'The game is over.' }]} onPress={onPress} onRefused={onRefused} />);
    fireEvent.click(screen.getByRole('button', { name: 'Roll the dice' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(onRefused).toHaveBeenCalledWith('The game is over.');
  });
});
