import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CardTable } from './card-table';
import type { Placement, TableDef } from '../core/table-def';

const setTable = vi.fn();
const setIntents = vi.fn();

vi.mock('@/hooks/use-app', () => ({
  useApp: () => ({ setTable, setIntents }),
}));

const tableDef: TableDef = { zones: [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }] };
const placement: Placement = { cards: [] };

describe('CardTable', () => {
  it('pushes the table into the engine on mount', () => {
    setTable.mockClear();
    render(<CardTable tableDef={tableDef} placement={placement} />);
    expect(setTable).toHaveBeenCalledWith(tableDef, placement, undefined);
  });

  it('registers intents from props', () => {
    setIntents.mockClear();
    const onDrop = vi.fn();
    render(<CardTable tableDef={tableDef} placement={placement} onDrop={onDrop} />);
    expect(setIntents).toHaveBeenCalled();
    const passed = setIntents.mock.calls.at(-1)![0];
    expect(passed.onDrop).toBe(onDrop);
  });
});
