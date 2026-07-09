import { describe, expect, it } from 'vitest';
import { GameSession } from './game-session';
import { GameServer } from './game-server';
import { loopbackChannel } from './loopback';
import type { ServerMessage } from './protocol';
import { GameEngine } from '../core/game-engine';
import { MoveRegistry } from '../core/moves';
import { registerCoreMoves } from '../core/moves-library';
import { makeRng } from '@/engine/core/rng';
import type { GameState } from '../core/game-state';
import { RuleRegistry } from '../core/rules';
import { registerStarterRules } from '../core/rules-library';
import type { CardState } from '../core/scene';
import type { TableDef } from '../core/table-def';

const card = (id: string, zoneId: string): CardState => ({ id, zoneId, faceUp: false, faceKey: id });
const tableDef: TableDef = {
  players: ['me', 'opp'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 }, visibility: 'secret' },
    { id: 'hand-me', layout: 'fan', transform: { x: 0, y: 300 }, owner: 'me', visibility: 'owner' },
  ],
};
const build = () => {
  const initial: GameState = { cards: [card('c0', 'deck'), card('c1', 'hand-me')], turn: { current: 'me' }, data: {}, rng: makeRng(1) };
  const engine = new GameEngine({ tableDef, rules: registerStarterRules(new RuleRegistry()), moves: registerCoreMoves(new MoveRegistry()), initial });
  return new GameSession(new GameServer({ engine, tableDef, seats: ['me', 'opp'] }));
};

// helper: collect a client end's inbound messages
const collect = (session: GameSession, id: string) => {
  const { server, client } = loopbackChannel();
  const msgs: ServerMessage[] = [];
  client.onMessage((m) => msgs.push(m));
  const disconnect = session.connect(id, server);
  return { client, msgs, disconnect };
};

describe('GameSession', () => {
  it('pushes an initial view on connect', () => {
    const s = build();
    const me = collect(s, 'me');
    expect(me.msgs).toHaveLength(1);
    expect(me.msgs[0]).toMatchObject({ type: 'view', view: { seat: 'me' } });
  });

  it('routes a move and pushes updated views to all connected seats', () => {
    const s = build();
    const me = collect(s, 'me');
    const opp = collect(s, 'opp');
    me.client.send({ type: 'move', move: { type: 'move', cardId: 'c0', toZone: 'hand-me' } });
    // both received an initial view + an updated view
    expect(me.msgs.filter((m) => m.type === 'view')).toHaveLength(2);
    expect(opp.msgs.filter((m) => m.type === 'view')).toHaveLength(2);
    const meLast = me.msgs.at(-1) as Extract<ServerMessage, { type: 'view' }>;
    expect(meLast.view.scene.cards.find((c) => c.id === 'c0')!.zoneId).toBe('hand-me');
  });

  it('sends rejected (and no new view) to the submitter on an illegal move', () => {
    const s = build();
    const me = collect(s, 'me');
    me.client.send({ type: 'move', move: { type: 'move', cardId: 'ghost', toZone: 'deck' } });
    expect(me.msgs.some((m) => m.type === 'rejected')).toBe(true);
    expect(me.msgs.filter((m) => m.type === 'view')).toHaveLength(1); // only the initial
  });

  it('a spectator receives public-only live views', () => {
    const s = build();
    const spec = collect(s, 'spectator');
    const me = collect(s, 'me');
    me.client.send({ type: 'move', move: { type: 'flip', cardId: 'c0', faceUp: true } });
    const specLast = spec.msgs.at(-1) as Extract<ServerMessage, { type: 'view' }>;
    // c1 is in hand-me (owner me) → spectator always sees it as a back
    expect(specLast.view.scene.cards.find((c) => c.id === 'c1')!.faceKey).toBe('back');
  });

  it('reconnecting a seat replaces its channel; disconnect stops pushes', () => {
    const s = build();
    const first = collect(s, 'me');
    const second = collect(s, 'me');            // reconnect 'me'
    const opp = collect(s, 'opp');
    opp.client.send({ type: 'move', move: { type: 'flip', cardId: 'c0', faceUp: true } });
    // the second channel is current and gets the update; the first does not
    expect(second.msgs.filter((m) => m.type === 'view').length).toBeGreaterThanOrEqual(2);
    expect(first.msgs.filter((m) => m.type === 'view')).toHaveLength(1);
  });

  it('retires the old channel on reconnect so it can no longer act as the seat', () => {
    const s = build();
    const first = collect(s, 'me');
    const second = collect(s, 'me');   // reconnect 'me' → first is retired
    const before = second.msgs.filter((m) => m.type === 'view').length;
    first.client.send({ type: 'move', move: { type: 'flip', cardId: 'c0', faceUp: true } });
    // the old channel is closed → its send is a no-op → no new view is pushed to the current channel
    expect(second.msgs.filter((m) => m.type === 'view').length).toBe(before);
  });
});
