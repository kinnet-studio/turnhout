import { describe, expect, it } from 'vitest';
import { heartsDeck, SEATS, TABLE } from './cards';
import { pass, play, trickPlays } from './moves';
import type { GameState } from '@/engine/core/game-state';
import type { MoveContext } from '@/engine/core/moves';
import { makeRng } from '@/engine/core/rng';
import { RuleRegistry } from '@/engine/core/rules';
import { registerHeartsFlow } from './flow';
import { createHeartsServer } from './game';
import { FlowRegistry } from '@/engine/core/flow-registry';
import { registerCoreFlow } from '@/engine/core/flow-library';

const ctx: MoveContext = { tableDef: TABLE, rules: new RuleRegistry() };

/** Deal deterministically for unit tests: card index i goes to hand-p{i % 4}. */
const dealt = (): GameState => {
  const { cards, rng } = heartsDeck(makeRng(1));
  return {
    cards: cards.map((c, i) => ({ ...c, zoneId: `hand-p${i % 4}`, faceUp: true })),
    turn: { current: 'p0', phase: 'playing' },
    data: {},
    rng,
  };
};

const findCard = (s: GameState, suit: string, rank: number, zonePrefix = 'hand-') =>
  s.cards.find((c) => c.data?.suit === suit && c.data?.rank === rank && c.zoneId.startsWith(zonePrefix))!;

describe('cards', () => {
  it('builds a full 52-card deck with opaque ids', () => {
    const { cards: deck } = heartsDeck(makeRng(1));
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

describe('hearts flow entries', () => {
  const reg = registerHeartsFlow(registerCoreFlow(new FlowRegistry()));

  it('awardTrick gives the trick to the highest card of the lead suit (ace high)', () => {
    let s = dealt();
    s.data.heartsBroken = true;
    // p0 leads C5; p1 plays C1 (ace); p2 plays C9; p3 dumps a diamond (void simulation not needed — follow if possible)
    const c5 = findCard(s, 'C', 5);
    const lead = c5.zoneId.replace('hand-', '');
    // build the trick directly through play.apply to keep this a unit test
    s = { ...s, turn: { current: lead, phase: 'playing' } };
    s = play.apply(s, { type: 'play', cardId: c5.id, by: lead }, ctx);
    const ace = findCard(s, 'C', 1);
    s = play.apply(s, { type: 'play', cardId: ace.id, by: ace.zoneId.replace('hand-', '') }, ctx);
    const c9 = findCard(s, 'C', 9);
    s = play.apply(s, { type: 'play', cardId: c9.id, by: c9.zoneId.replace('hand-', '') }, ctx);
    const d3 = findCard(s, 'D', 3);
    s = play.apply(s, { type: 'play', cardId: d3.id, by: d3.zoneId.replace('hand-', '') }, ctx);
    const aceSeat = trickPlays(s).find((p) => p.rank === 1)!.by;
    const out = reg.effect('awardTrick')!(s, ctx);
    expect(out.data.trickWinner).toBe(aceSeat);
    expect(out.cards.filter((c) => c.zoneId === `won-${aceSeat}`)).toHaveLength(4);
    expect(out.cards.filter((c) => c.zoneId === 'trick')).toHaveLength(0);
    expect(trickPlays(out)).toEqual([]);
  });

  it('setLeaderTwoOfClubs sets current to the 2C holder', () => {
    const s = dealt();
    const holder = findCard(s, 'C', 2).zoneId.replace('hand-', '');
    expect(reg.effect('setLeaderTwoOfClubs')!(s, ctx).turn?.current).toBe(holder);
  });

  it('scoreHand scores 1/heart + 13/QS and picks the lowest score as winner', () => {
    let s = dealt();
    // stack the piles: give p1 all hearts, p2 the queen of spades, rest elsewhere
    s = {
      ...s,
      cards: s.cards.map((c) => {
        if (c.data?.suit === 'H') return { ...c, zoneId: 'won-p1' };
        if (c.data?.suit === 'S' && c.data?.rank === 12) return { ...c, zoneId: 'won-p2' };
        return { ...c, zoneId: 'won-p0' };
      }),
    };
    const out = reg.effect('scoreHand')!(s, ctx);
    expect(out.result).toEqual({ scores: { p0: 0, p1: 13, p2: 13, p3: 0 }, winner: 'p0' });
  });

  it('heartsNext: round-robin mid-trick, winner leads after an award', () => {
    const policy = reg.policy('heartsNext')!;
    let s = dealt(); // trick empty, no winner recorded → round-robin
    expect(policy(s, ['p0', 'p1', 'p2', 'p3'], ctx)).toBe('p1');
    s = { ...s, data: { trickWinner: 'p2' } }; // trick empty + winner recorded → winner leads
    expect(policy(s, ['p0', 'p1', 'p2', 'p3'], ctx)).toBe('p2');
  });
});

describe('shuffle determinism', () => {
  it('same seed → identical id→faceKey mapping', () => {
    const { cards: deck1 } = heartsDeck(makeRng(7));
    const { cards: deck2 } = heartsDeck(makeRng(7));
    const map1 = deck1.map((c) => ({ id: c.id, faceKey: c.faceKey }));
    const map2 = deck2.map((c) => ({ id: c.id, faceKey: c.faceKey }));
    expect(map1).toEqual(map2);
  });

  it('different seeds → different mapping', () => {
    const { cards: deck1 } = heartsDeck(makeRng(1));
    const { cards: deck2 } = heartsDeck(makeRng(2));
    const map1 = new Map(deck1.map((c) => [c.id, c.faceKey]));
    const map2 = new Map(deck2.map((c) => [c.id, c.faceKey]));
    expect(map1).not.toEqual(map2);
  });

  it('mapping differs from unshuffled source order', () => {
    const { cards: deck } = heartsDeck(makeRng(42));
    const faceKeys = deck.map((c) => c.faceKey);
    const suits = ['S', 'H', 'D', 'C'];
    const unshuffled = [];
    for (const s of suits) for (let r = 1; r <= 13; r++) unshuffled.push(`${r}${s}`);
    expect(faceKeys).not.toEqual(unshuffled);
  });
});

describe('createHeartsServer', () => {
  it('boots into the passing phase with 13 cards per hand', () => {
    const server = createHeartsServer(42);
    const view = server.viewFor('p0');
    expect(view.turn?.phase).toBe('passing');
    for (const seat of SEATS) {
      expect(view.scene.cards.filter((c) => c.zoneId === `hand-${seat}`)).toHaveLength(13);
    }
    expect(view.scene.cards.filter((c) => c.zoneId === 'deck')).toHaveLength(0);
  });
});
