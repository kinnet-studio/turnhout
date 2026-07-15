import { describe, expect, it } from 'vitest';
import { SEATS } from './cards';
import { createHeartsServer } from './game';

/** Pass phase helper: each seat passes its first three cards. */
function passAll(server: ReturnType<typeof createHeartsServer>) {
  for (const seat of SEATS) {
    for (let i = 0; i < 3; i++) {
      const hand = server.viewFor(seat).scene.cards.filter((c) => c.zoneId === `hand-${seat}`);
      expect(server.submit(seat, { type: 'pass', cardId: hand[0].id }).ok).toBe(true);
    }
  }
}

describe('hearts end-to-end (seeded)', () => {
  it('plays a complete hand: pass, 13 tricks, scored result', () => {
    const server = createHeartsServer(42);
    passAll(server);
    expect(server.viewFor('p0').turn?.phase).toBe('playing');
    // every hand is back to 13 after passes resolve
    for (const seat of SEATS) {
      expect(server.viewFor(seat).scene.cards.filter((c) => c.zoneId === `hand-${seat}`)).toHaveLength(13);
    }

    // auto-player: current seat tries each hand card until one is legal
    let plays = 0;
    for (let step = 0; step < 52; step++) {
      const view = server.viewFor('p0');
      expect(view.result).toBeUndefined();
      const cur = view.turn!.current;
      const hand = server.viewFor(cur).scene.cards.filter((c) => c.zoneId === `hand-${cur}`);
      const played = hand.some((c) => server.submit(cur, { type: 'play', cardId: c.id }).ok);
      expect(played).toBe(true);
      plays++;
    }
    expect(plays).toBe(52);

    const final = server.viewFor('p0');
    const result = final.result as { scores: Record<string, number>; winner: string };
    expect(result).toBeDefined();
    expect(Object.values(result.scores).reduce((a, b) => a + b, 0)).toBe(26); // 13 hearts + QS
    expect(SEATS).toContain(result.winner);
    // all 52 cards ended in won piles; hands and trick are empty
    const wonTotal = SEATS.reduce((n, s) => n + final.scene.cards.filter((c) => c.zoneId === `won-${s}`).length, 0);
    expect(wonTotal).toBe(52);

    // game over: further moves are rejected by the gate
    expect(server.submit(result.winner, { type: 'play', cardId: 'c0' })).toMatchObject({ ok: false, reason: 'game is over' });
  });

  it('rejects out-of-turn plays via the gate (no per-game turn code)', () => {
    const server = createHeartsServer(42);
    passAll(server);
    const cur = server.viewFor('p0').turn!.current;
    const other = SEATS.find((s) => s !== cur)!;
    const card = server.viewFor(other).scene.cards.find((c) => c.zoneId === `hand-${other}`)!;
    expect(server.submit(other, { type: 'play', cardId: card.id })).toMatchObject({ ok: false, reason: `not ${other}'s turn` });
  });

  it('rejects playing during the passing phase', () => {
    const server = createHeartsServer(42);
    const card = server.viewFor('p0').scene.cards.find((c) => c.zoneId === 'hand-p0')!;
    expect(server.submit('p0', { type: 'play', cardId: card.id })).toMatchObject({ ok: false, reason: 'move play not allowed in phase passing' });
  });

  it('allows off-turn hand reorder during play (anyActor)', () => {
    const server = createHeartsServer(42);
    passAll(server);
    const cur = server.viewFor('p0').turn!.current;
    const other = SEATS.find((s) => s !== cur)!;
    const hand = server.viewFor(other).scene.cards.filter((c) => c.zoneId === `hand-${other}`);
    expect(server.submit(other, { type: 'reorder', cardId: hand[0].id, slot: 3 }).ok).toBe(true);
  });

  it('a mid-trick off-turn reorder does not advance the turn', () => {
    const server = createHeartsServer(42);
    passAll(server);
    const before = server.viewFor('p0').turn!.current;
    // auto-player: the current seat plays the first legal card in its hand
    const beforeHand = server.viewFor(before).scene.cards.filter((c) => c.zoneId === `hand-${before}`);
    const played = beforeHand.some((c) => server.submit(before, { type: 'play', cardId: c.id }).ok);
    expect(played).toBe(true);

    const after = server.viewFor('p0').turn!.current;
    expect(after).not.toBe(before); // the play itself legitimately passed the turn

    // a different seat now reorders its own hand — this must NOT pass the turn again
    const other = SEATS.find((s) => s !== after)!;
    const otherHand = server.viewFor(other).scene.cards.filter((c) => c.zoneId === `hand-${other}`);
    const result = server.submit(other, { type: 'reorder', cardId: otherHand[0].id, slot: 3 });
    expect(result.ok).toBe(true);
    expect(server.viewFor('p0').turn!.current).toBe(after);
  });
});
