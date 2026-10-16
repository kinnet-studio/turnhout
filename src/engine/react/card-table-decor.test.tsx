import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardTable } from './card-table';
import type { Placement, TableDef } from '../core/table-def';

const setTable = vi.fn();
const setIntents = vi.fn();
const setDecor = vi.fn();

// One app for every render, as the page's canvas is: a fresh object each time would run every effect again.
const app = { setTable, setIntents, setDecor };
vi.mock('@/hooks/use-app', () => ({
  useApp: () => app,
}));

const tableDef: TableDef = { zones: [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }] };
const placement: Placement = { cards: [] };

describe('CardTable decor', () => {
  beforeEach(() => setDecor.mockClear());

  it('hands the canvas the decor it is given', () => {
    const decor = { a: { ring: 'chosen' as const } };
    render(<CardTable tableDef={tableDef} placement={placement} decor={decor} />);
    expect(setDecor).toHaveBeenCalledWith(decor);
  });

  it('hands the canvas a new decor when it changes, and not again when it stays', () => {
    const decor = { a: { ring: 'chosen' as const } };
    const { rerender } = render(<CardTable tableDef={tableDef} placement={placement} decor={decor} />);
    rerender(<CardTable tableDef={tableDef} placement={placement} decor={decor} />);
    expect(setDecor).toHaveBeenCalledTimes(1);
    const next = { a: { caption: 'x' } };
    rerender(<CardTable tableDef={tableDef} placement={placement} decor={next} />);
    expect(setDecor).toHaveBeenCalledTimes(2);
    expect(setDecor).toHaveBeenLastCalledWith(next);
  });

  it('never touches the canvas decor for a page that passes none', () => {
    render(<CardTable tableDef={tableDef} placement={placement} />);
    expect(setDecor).not.toHaveBeenCalled();
  });
});
