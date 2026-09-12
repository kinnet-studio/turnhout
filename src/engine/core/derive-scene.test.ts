import { describe, expect, it } from 'vitest';
import { HIDDEN_FACE_KEY, deriveScene, isRevealed, keepPositionalOnly, projectCard } from './derive-scene';
import type { CardState } from './scene';
import type { Placement, TableDef, ZoneDef } from './table-def';

const zone = (extra: Partial<ZoneDef> = {}): ZoneDef => ({ id: 'z', layout: 'pile', transform: { x: 0, y: 0 }, ...extra });
const card = (extra: Partial<CardState> = {}): CardState => ({ id: 'c', zoneId: 'z', faceUp: false, faceKey: 'AS', ...extra });

describe('isRevealed', () => {
  it('faceUp reveals to any viewer', () => {
    expect(isRevealed(card({ faceUp: true }), zone({ visibility: 'secret' }), 'opp')).toBe(true);
  });
  it('public (and the default) reveals to all', () => {
    expect(isRevealed(card(), zone({ visibility: 'public' }), 'opp')).toBe(true);
    expect(isRevealed(card(), zone(), 'opp')).toBe(true);
  });
  it('owner reveals only to the owner', () => {
    expect(isRevealed(card(), zone({ visibility: 'owner', owner: 'me' }), 'me')).toBe(true);
    expect(isRevealed(card(), zone({ visibility: 'owner', owner: 'me' }), 'opp')).toBe(false);
  });
  it('secret hides a face-down card', () => {
    expect(isRevealed(card(), zone({ visibility: 'secret' }), 'me')).toBe(false);
  });
  it('revealTo grants access', () => {
    expect(isRevealed(card({ revealTo: 'all' }), zone({ visibility: 'secret' }), 'opp')).toBe(true);
    expect(isRevealed(card({ revealTo: ['opp'] }), zone({ visibility: 'secret' }), 'opp')).toBe(true);
    expect(isRevealed(card({ revealTo: ['x'] }), zone({ visibility: 'secret' }), 'opp')).toBe(false);
  });
  it('an unknown (undefined) zone is treated as public', () => {
    expect(isRevealed(card(), undefined, 'opp')).toBe(true);
  });
});

describe('keepPositionalOnly', () => {
  it('keeps x/y and drops other keys', () => {
    expect(keepPositionalOnly({ x: 1, y: 2, suit: 'S', rank: 1 })).toEqual({ x: 1, y: 2 });
    expect(keepPositionalOnly({ suit: 'S' })).toEqual({});
    expect(keepPositionalOnly(undefined)).toBeUndefined();
  });
});

const def: TableDef = {
  players: ['me', 'opp'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 }, visibility: 'secret' },
    { id: 'hand', layout: 'fan', transform: { x: 0, y: 0 }, owner: 'me', visibility: 'owner' },
    { id: 'discard', layout: 'pile', transform: { x: 0, y: 0 }, visibility: 'public' },
  ],
};
const placement: Placement = {
  cards: [
    { id: 'h1', zoneId: 'hand', faceUp: false, faceKey: 'AS', slot: 0, data: { suit: 'S', rank: 1 } },
    { id: 'd1', zoneId: 'deck', faceUp: false, faceKey: 'KH', data: { suit: 'H', rank: 13 } },
    { id: 'x1', zoneId: 'discard', faceUp: true, faceKey: 'QC', data: { suit: 'C', rank: 12 } },
  ],
};

describe('deriveScene identity (viewer undefined)', () => {
  it('maps ZoneDefs to render zones and passes cards through unchanged', () => {
    const d: TableDef = { zones: [{ id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 }, visibility: 'secret', capacity: 52 }] };
    const p: Placement = { cards: [{ id: 'AS', zoneId: 'deck', faceUp: false, faceKey: 'AS' }] };
    const scene = deriveScene(d, p);
    expect(scene.zones).toEqual([{ id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 } }]);
    expect(scene.cards).toEqual(p.cards);
  });
});

describe('deriveScene projection', () => {
  it('owner sees their own face-down hand card face-up with identity intact', () => {
    const h1 = deriveScene(def, placement, 'me').cards.find((c) => c.id === 'h1')!;
    expect(h1.faceUp).toBe(true);
    expect(h1.faceKey).toBe('AS');
    expect(h1.data).toEqual({ suit: 'S', rank: 1 });
  });
  it('opponent sees the hand card masked: back, scrubbed data, id+slot preserved', () => {
    const h1 = deriveScene(def, placement, 'opp').cards.find((c) => c.id === 'h1')!;
    expect(h1.faceUp).toBe(false);
    expect(h1.faceKey).toBe(HIDDEN_FACE_KEY);
    expect(h1.id).toBe('h1');
    expect(h1.slot).toBe(0);
    expect(h1.data).toEqual({});
  });
  it('a public discard card is visible to everyone', () => {
    const x1 = deriveScene(def, placement, 'opp').cards.find((c) => c.id === 'x1')!;
    expect(x1.faceUp).toBe(true);
    expect(x1.faceKey).toBe('QC');
  });
  it('a secret deck card is masked for every viewer', () => {
    for (const v of ['me', 'opp']) {
      const d1 = deriveScene(def, placement, v).cards.find((c) => c.id === 'd1')!;
      expect(d1.faceKey).toBe(HIDDEN_FACE_KEY);
      expect(d1.faceUp).toBe(false);
    }
  });
  it('preserves free-layout x/y on a masked card', () => {
    const p: Placement = { cards: [{ id: 'f', zoneId: 'deck', faceUp: false, faceKey: 'AS', data: { x: 5, y: 7, suit: 'S' } }] };
    expect(deriveScene(def, p, 'opp').cards[0].data).toEqual({ x: 5, y: 7 });
  });
  it('does not mutate the input placement', () => {
    const snapshot = JSON.parse(JSON.stringify(placement));
    deriveScene(def, placement, 'opp');
    expect(placement).toEqual(snapshot);
  });
});

describe('deriveScene bounds threading', () => {
  const boundsDef: TableDef = {
    players: ['me', 'opp'],
    zones: [
      {
        id: 'hand',
        layout: 'fan',
        transform: { x: 0, y: 0 },
        bounds: { width: 300, height: 180, anchor: { x: 0.5, y: 0.4 } },
        owner: 'me',
        visibility: 'owner',
      },
      { id: 'discard', layout: 'pile', transform: { x: 0, y: 0 }, visibility: 'public' },
    ],
  };
  const boundsPlacement: Placement = { cards: [] };

  it('threads an authored ZoneDef.bounds into the emitted ZoneState (omniscient)', () => {
    const scene = deriveScene(boundsDef, boundsPlacement);
    expect(scene.zones.find((z) => z.id === 'hand')?.bounds).toEqual({ width: 300, height: 180, anchor: { x: 0.5, y: 0.4 } });
    expect(scene.zones.find((z) => z.id === 'discard')?.bounds).toBeUndefined();
  });

  it('keeps the authored bounds for a non-owner viewer projection', () => {
    const scene = deriveScene(boundsDef, boundsPlacement, 'opp');
    expect(scene.zones.find((z) => z.id === 'hand')?.bounds).toEqual({ width: 300, height: 180, anchor: { x: 0.5, y: 0.4 } });
  });
});

describe('projectCard', () => {
  it('revealed → faceUp true; hidden → masked back', () => {
    expect(projectCard(card({ faceUp: true }), zone({ visibility: 'secret' }), 'opp').faceUp).toBe(true);
    expect(projectCard(card({ data: { suit: 'S' } }), zone({ visibility: 'secret' }), 'opp')).toMatchObject({ faceUp: false, faceKey: HIDDEN_FACE_KEY });
  });
});
