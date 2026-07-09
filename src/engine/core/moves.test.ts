import { describe, expect, it } from 'vitest';
import { MoveRegistry, type MoveHandler } from './moves';

const noop: MoveHandler = { legal: () => true, apply: (s) => s };

describe('MoveRegistry', () => {
  it('registers, gets, and reports presence, and chains', () => {
    const r = new MoveRegistry();
    expect(r.register('a', noop)).toBe(r);
    expect(r.has('a')).toBe(true);
    expect(r.has('b')).toBe(false);
    expect(r.get('a')).toBe(noop);
    expect(r.get('b')).toBeUndefined();
  });
});
