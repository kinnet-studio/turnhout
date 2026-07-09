import type { PlayerId } from '../core/scene';
import type { GameServer } from './game-server';
import type { Channel } from './protocol';

export class GameSession {
  private conns = new Map<PlayerId, Channel>();
  private unsub: () => void;

  constructor(private server: GameServer) {
    this.unsub = server.subscribe(() => {
      for (const [id, ch] of this.conns) ch.send({ type: 'view', view: this.server.viewFor(id) });
    });
  }

  connect(id: PlayerId, channel: Channel): () => void {
    const existing = this.conns.get(id);
    if (existing && existing !== channel) existing.close();
    this.conns.set(id, channel);
    channel.onMessage((msg) => {
      if (msg.type === 'move') {
        const res = this.server.submit(id, msg.move);
        if (!res.ok) channel.send({ type: 'rejected', reason: res.reason ?? 'rejected' });
      }
    });
    channel.send({ type: 'view', view: this.server.viewFor(id) });
    return () => {
      if (this.conns.get(id) === channel) this.conns.delete(id);
      channel.close();
    };
  }

  dispose(): void {
    this.unsub();
  }
}
