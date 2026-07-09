import { describe, expect, it } from 'vitest';
import { cardsByZone, validateScene, type Scene } from './scene';

const scene = (cards: Scene['cards'], zones: Scene['zones']): Scene => ({ cards, zones });

describe('validateScene', () => {
  it('accepts a valid scene', () => {
    const s = scene(
      [{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }],
      [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }],
    );
    expect(validateScene(s)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('reports duplicate card ids as errors', () => {
    const s = scene(
      [
        { id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' },
        { id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' },
      ],
      [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }],
    );
    const r = validateScene(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('duplicate card id: a');
  });

  it('warns on unknown zoneId', () => {
    const s = scene(
      [{ id: 'a', zoneId: 'ghost', faceUp: false, faceKey: 'back' }],
      [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }],
    );
    const r = validateScene(s);
    expect(r.ok).toBe(true);
    expect(r.warnings).toContain('card a references unknown zone: ghost');
  });
});

describe('cardsByZone', () => {
  it('groups and sorts by slot then original order', () => {
    const s = scene(
      [
        { id: 'a', zoneId: 'h', faceUp: true, faceKey: 'a', slot: 2 },
        { id: 'b', zoneId: 'h', faceUp: true, faceKey: 'b', slot: 0 },
        { id: 'c', zoneId: 'h', faceUp: true, faceKey: 'c' },
      ],
      [{ id: 'h', layout: 'row', transform: { x: 0, y: 0 } }],
    );
    expect(cardsByZone(s).get('h')!.map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });
});
