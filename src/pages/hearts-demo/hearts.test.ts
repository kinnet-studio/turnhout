import { describe, expect, it } from 'vitest';
import { heartsDeck, SEATS, TABLE } from './cards';
import { pass, play, trickPlays } from './moves';
import type { GameState } from '@/engine/core/game-state';
import type { MoveContext } from '@/engine/core/moves';
import { makeRng } from '@/engine/core/rng';
import { RuleRegistry } from '@/engine/core/rules';

const ctx: MoveContext = { tableDef: TABLE, rules: new RuleRegistry() };

/** Deal deterministically for unit tests: card index i goes to hand-p{i % 4}. */
const dealt = (): GameState => ({
  cards: heartsDeck().map((c, i) => ({ ...c, zoneId: `hand-p${i % 4}`, faceUp: true })),
  turn: { current: 'p0', phase: 'playing' },
  data: {},
  rng: makeRng(1),
});

const findCard = (s: GameState, suit: string, rank: number, zonePrefix = 'hand-') =>
  s.cards.find((c) => c.data?.suit === suit && c.data?.rank === rank && c.zoneId.startsWith(zonePrefix))!;

describe('cards', () => {
  it('builds a full 52-card deck with opaque ids', () => {
    const deck = heartsDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    expect(deck.every((c) => c.zoneId === 'deck' && /^c\d+$/.test(c.id))).toBe(true);
  });
  it('declares all hearts zones', () => {
    const ids = TABLE.zones.map((z) => z.id);
    for (const s of SEATS) expect(ids).toEqual(expect.arrayContaining([`hand-${s}`, `pass-${s}`, `won-${s}`]));
    expect(ids).toContain('deck');
    expect(ids).toContain('trick');
  });
});

describe('play move', () => {
  it("rejects a card that is not in the actor's hand", () => {
    const s = dealt();
    const other = s.cards.find((c) => c.zoneId === 'hand-p1')!;
    expect(play.legal(s, { type: 'play', cardId: other.id, by: 'p0' }, ctx)).toBe('not your card');
  });

  it('rejects leading a heart before hearts are broken', () => {
    const s = dealt();
    const heart = s.cards.find((c) => c.zoneId === 'hand-p0' && c.data?.suit === 'H')!;
    expect(play.legal(s, { type: 'play', cardId: heart.id, by: 'p0' }, ctx)).toBe('hearts not broken');
  });

  it('allows leading a heart once broken', () => {
    const s = dealt();
    s.data.heartsBroken = true;
    const heart = s.cards.find((c) => c.zoneId === 'hand-p0' && c.data?.suit === 'H')!;
    expect(play.legal(s, { type: 'play', cardId: heart.id, by: 'p0' }, ctx)).toBe(true);
  });

  it('enforces follow-suit when the hand can follow', () => {
    let s = dealt();
    const lead = s.cards.find((c) => c.zoneId === 'hand-p0' && c.data?.suit === 'C')!;
    s = play.apply(s, { type: 'play', cardId: lead.id, by: 'p0' }, ctx);
    const offSuit = s.cards.find((c) => c.zoneId === 'hand-p1' && c.data?.suit !== 'C')!;
    const club = s.cards.find((c) => c.zoneId === 'hand-p1' && c.data?.suit === 'C')!;
    expect(play.legal(s, { type: 'play', cardId: offSuit.id, by: 'p1' }, ctx)).toBe('must follow C');
    expect(play.legal(s, { type: 'play', cardId: club.id, by: 'p1' }, ctx)).toBe(true);
  });

  it('apply moves the card to the trick face-up, records the play, breaks hearts', () => {
    let s = dealt();
    s.data.heartsBroken = true;
    const heart = findCard(s, 'H', 5);
    const seat = heart.zoneId.replace('hand-', '');
    s = { ...s, turn: { current: seat, phase: 'playing' } };
    const out = play.apply(s, { type: 'play', cardId: heart.id, by: seat }, ctx);
    const moved = out.cards.find((c) => c.id === heart.id)!;
    expect(moved.zoneId).toBe('trick');
    expect(moved.faceUp).toBe(true);
    expect(moved.slot).toBe(0);
    expect(trickPlays(out)).toEqual([{ cardId: heart.id, by: seat, suit: 'H', rank: 5 }]);
    expect(out.data.heartsBroken).toBe(true);
  });
});

describe('pass move', () => {
  it('moves a hand card to the pass pile, max 3', () => {
    let s = dealt();
    s = { ...s, turn: { current: 'p0', phase: 'passing' } };
    const hand = () => s.cards.filter((c) => c.zoneId === 'hand-p0');
    for (let i = 0; i < 3; i++) {
      const c = hand()[0];
      expect(pass.legal(s, { type: 'pass', cardId: c.id, by: 'p0' }, ctx)).toBe(true);
      s = pass.apply(s, { type: 'pass', cardId: c.id, by: 'p0' }, ctx);
    }
    expect(s.cards.filter((c) => c.zoneId === 'pass-p0')).toHaveLength(3);
    expect(pass.legal(s, { type: 'pass', cardId: hand()[0].id, by: 'p0' }, ctx)).toBe('already passed 3 cards');
  });

  it("rejects passing another seat's card", () => {
    const s = dealt();
    const other = s.cards.find((c) => c.zoneId === 'hand-p1')!;
    expect(pass.legal(s, { type: 'pass', cardId: other.id, by: 'p0' }, ctx)).toBe('not your card');
  });
});
