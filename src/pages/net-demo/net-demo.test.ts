import { describe, expect, it } from 'vitest';
import { createDemoServer, TABLE } from './game';
import { GameSession } from '@/engine/net/game-session';
import { loopbackChannel } from '@/engine/net/loopback';
import type { ServerMessage } from '@/engine/net/protocol';

const lastView = (msgs: ServerMessage[]) => [...msgs].reverse().find((m) => m.type === 'view') as Extract<ServerMessage, { type: 'view' }>;

describe('net-demo', () => {
  it('deals both hands and hides each hand from the other seat', () => {
    expect(TABLE.zones.map((z) => z.id)).toEqual(['deck', 'discard', 'hand-me', 'hand-opp']);
    const server = createDemoServer();
    const me = lastView([{ type: 'view', view: server.viewFor('me') }]);
    const meHandMe = me.view.scene.cards.filter((c) => c.zoneId === 'hand-me');
    const meHandOpp = me.view.scene.cards.filter((c) => c.zoneId === 'hand-opp');
    expect(meHandMe.length).toBeGreaterThan(0);
    expect(meHandMe.every((c) => c.faceUp === true)).toBe(true);          // I see my hand
    expect(meHandOpp.every((c) => c.faceKey === 'back')).toBe(true);      // opp's hand hidden from me
  });

  it("rejects a move submitted by the seat whose turn it is not", () => {
    const server = createDemoServer();          // turn starts at 'me'
    const s = new GameSession(server);
    const { server: sEnd, client } = loopbackChannel();
    const msgs: ServerMessage[] = [];
    client.onMessage((m) => msgs.push(m));
    s.connect('opp', sEnd);
    // opp tries to play a card from opp's own hand, but it is not opp's turn
    const oppView = lastView(msgs);
    const oppCard = oppView.view.scene.cards.find((c) => c.zoneId === 'hand-opp')!;
    client.send({ type: 'move', move: { type: 'play', cardId: oppCard.id, toZone: 'discard' } });
    expect(msgs.some((m) => m.type === 'rejected')).toBe(true);
  });

  it('lets the on-turn seat play, and both seats see the result', () => {
    const server = createDemoServer();
    const meCard = server.viewFor('me').scene.cards.find((c) => c.zoneId === 'hand-me')!;
    const r = server.submit('me', { type: 'play', cardId: meCard.id, toZone: 'discard' });
    expect(r.ok).toBe(true);
    expect(server.viewFor('opp').scene.cards.find((c) => c.id === meCard.id)!.zoneId).toBe('discard');
  });

  it('lets a seat reorder its own hand off-turn', () => {
    const server = createDemoServer(); // turn starts at 'me'
    const before = server.viewFor('opp').scene.cards.filter((c) => c.zoneId === 'hand-opp').map((c) => c.id);
    const r = server.submit('opp', { type: 'reorder', cardId: before[0], slot: 2 });
    expect(r.ok).toBe(true);
    const after = server.viewFor('opp').scene.cards
      .filter((c) => c.zoneId === 'hand-opp')
      .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
      .map((c) => c.id);
    expect(after).toEqual([before[1], before[2], before[0]]);
  });

  it("rejects reordering another seat's hand", () => {
    const server = createDemoServer();
    const meCard = server.viewFor('me').scene.cards.find((c) => c.zoneId === 'hand-me')!;
    const r = server.submit('opp', { type: 'reorder', cardId: meCard.id, slot: 0 });
    expect(r.ok).toBe(false);
  });
});
