import { describe, expect, it } from 'vitest';
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import { validateTableDef } from '@/engine/core/table-def';
import { TABLE } from './table-demo-page';
import { standardDeck } from './deck';

describe('demo table', () => {
  it('validates against the starter registry', () => {
    const reg = registerStarterRules(new RuleRegistry());
    expect(validateTableDef(TABLE, reg)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('deals a full 52-card deck into the deck zone', () => {
    const deck = standardDeck();
    expect(deck).toHaveLength(52);
    expect(deck.every((c) => c.zoneId === 'deck' && typeof c.data?.rank === 'number')).toBe(true);
  });
});
