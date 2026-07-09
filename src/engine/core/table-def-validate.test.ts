import { describe, expect, it } from 'vitest';
import { validateTableDef, type TableDef } from './table-def';
import { RuleRegistry } from './rules';

const reg = new RuleRegistry().register('ok', () => true);
const base = (zones: TableDef['zones'], players?: string[]): TableDef => ({ zones, players });

describe('validateTableDef', () => {
  it('accepts a valid table', () => {
    const def = base([{ id: 'a', layout: 'pile', transform: { x: 0, y: 0 }, accept: { rule: 'ok' } }]);
    expect(validateTableDef(def, reg)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('errors on duplicate zone ids', () => {
    const def = base([
      { id: 'a', layout: 'pile', transform: { x: 0, y: 0 } },
      { id: 'a', layout: 'pile', transform: { x: 1, y: 1 } },
    ]);
    expect(validateTableDef(def, reg).errors).toContain('duplicate zone id: a');
  });

  it('errors on an unknown accept rule', () => {
    const def = base([{ id: 'a', layout: 'pile', transform: { x: 0, y: 0 }, accept: { rule: 'ghost' } }]);
    const r = validateTableDef(def, reg);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('zone a references unknown rule: ghost');
  });

  it('errors on capacity < 1 and non-positive bounds', () => {
    const def = base([
      { id: 'a', layout: 'pile', transform: { x: 0, y: 0 }, capacity: 0 },
      { id: 'b', layout: 'pile', transform: { x: 0, y: 0 }, bounds: { width: 0, height: 140 } },
    ]);
    const r = validateTableDef(def, reg);
    expect(r.errors).toContain('zone a has capacity < 1');
    expect(r.errors).toContain('zone b has non-positive bounds');
  });

  it('warns when an owner is not a declared player', () => {
    const def = base([{ id: 'a', layout: 'pile', transform: { x: 0, y: 0 }, owner: 'ghost' }], ['p1']);
    expect(validateTableDef(def, reg).warnings).toContain('zone a owner is not a declared player: ghost');
  });
});
