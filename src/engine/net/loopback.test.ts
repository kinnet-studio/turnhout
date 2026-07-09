import { describe, expect, it, vi } from 'vitest';
import { loopbackChannel } from './loopback';
import type { ClientMessage, ServerMessage } from './protocol';

describe('loopbackChannel', () => {
  it('delivers client→server and server→client messages', () => {
    const { server, client } = loopbackChannel();
    const toServer: ClientMessage[] = [];
    const toClient: ServerMessage[] = [];
    server.onMessage((m) => toServer.push(m));
    client.onMessage((m) => toClient.push(m));

    client.send({ type: 'move', move: { type: 'x' } });
    server.send({ type: 'rejected', reason: 'nope' });

    expect(toServer).toEqual([{ type: 'move', move: { type: 'x' } }]);
    expect(toClient).toEqual([{ type: 'rejected', reason: 'nope' }]);
  });

  it('stops delivering after close', () => {
    const { server, client } = loopbackChannel();
    const seen = vi.fn();
    client.onMessage(seen);
    client.close();
    server.send({ type: 'rejected', reason: 'late' });
    expect(seen).not.toHaveBeenCalled();
  });
});
