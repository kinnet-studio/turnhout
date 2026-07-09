import { describe, expect, it } from 'vitest';
import { RuleRegistry, canAccept } from './rules';
import type { CardState } from './scene';
import type { ZoneDef } from './table-def';

const card = (id: string): CardState => ({ id, zoneId: 'src', faceUp: true, faceKey: id });
const zone = (extra: Partial<ZoneDef> = {}): ZoneDef => ({ id: 'z', layout: 'pile', transform: { x: 0, y: 0 }, ...extra });

describe('RuleRegistry', () => {
  it('registers, gets, and reports presence', () => {
    const r = new RuleRegistry();
    r.register('yes', () => true);
    expect(r.has('yes')).toBe(true);
    expect(r.has('no')).toBe(false);
    expect(r.get('yes')!({ card: card('a'), zone: zone(), zoneCards: [], top: null })).toBe(true);
  });
});

describe('canAccept', () => {
  const registry = new RuleRegistry().register('rejectAll', () => false);

  it('accepts anything when no accept rule is set', () => {
    expect(canAccept(zone(), card('a'), [], registry)).toBe(true);
  });

  it('enforces capacity before the rule', () => {
    expect(canAccept(zone({ capacity: 1 }), card('a'), [card('x')], registry)).toBe(false);
  });

  it('delegates to the named rule', () => {
    expect(canAccept(zone({ accept: { rule: 'rejectAll' } }), card('a'), [], registry)).toBe(false);
  });

  it('throws on an unknown rule name', () => {
    expect(() => canAccept(zone({ accept: { rule: 'ghost' } }), card('a'), [], registry)).toThrow(/ghost/);
  });

  it('passes top and params to the rule', () => {
    const reg = new RuleRegistry().register('needsTopAndParam', ({ top, params }) => top?.id === 'x' && params === 7);
    const z = zone({ accept: { rule: 'needsTopAndParam', params: 7 } });
    expect(canAccept(z, card('a'), [card('x')], reg)).toBe(true);
  });
});
