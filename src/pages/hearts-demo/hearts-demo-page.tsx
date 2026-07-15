import { useEffect, useMemo, useRef, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import { CardTable } from '@/engine/react';
import type { Placement } from '@/engine/core/table-def';
import type { DropIntent } from '@/engine/input/table-input-context';
import { makeInitApp } from '@/utils/init-app';
import { GameSession } from '@/engine/net/game-session';
import { loopbackChannel } from '@/engine/net/loopback';
import type { ClientChannel, ClientView } from '@/engine/net/protocol';
import { standardFaceRenderer } from '@/engine/pixi/standard-faces';
import { createHeartsServer } from './game';
import { SEATS, TABLE } from './cards';

const initAppWithFaces = makeInitApp(standardFaceRenderer);

function useSeat(session: GameSession, seat: string): { view: ClientView | null; submit: (m: DropIntent) => void } {
  const chan = useRef<ClientChannel | null>(null);
  const [view, setView] = useState<ClientView | null>(null);
  useEffect(() => {
    const { server, client } = loopbackChannel();
    chan.current = client;
    client.onMessage((msg) => { if (msg.type === 'view') setView(msg.view); });
    const disconnect = session.connect(seat, server);
    return () => { disconnect(); chan.current = null; };
  }, [session, seat]);
  const submit = (i: DropIntent) => {
    if (!i.toZoneId) return;
    if (i.toZoneId === i.fromZoneId) {
      chan.current?.send({ type: 'move', move: { type: 'reorder', cardId: i.cardId, slot: i.slot } });
    } else if (i.toZoneId === 'trick') {
      chan.current?.send({ type: 'move', move: { type: 'play', cardId: i.cardId } });
    } else if (i.toZoneId === `pass-${seat}`) {
      chan.current?.send({ type: 'move', move: { type: 'pass', cardId: i.cardId } });
    }
  };
  return { view, submit };
}

// Fixed 800x600 per seat — see the sizing NOTE in net-demo-page.tsx.
const SEAT_WIDTH = 800;
const SEAT_HEIGHT = 600;

function SeatCanvas({ session, seat }: { session: GameSession; seat: string }) {
  const { view, submit } = useSeat(session, seat);
  const option = useMemo(() => ({ fullScreen: false, limitEntireViewPort: false }), []);
  const placement: Placement = { cards: view?.scene.cards ?? [] };
  const status = view?.result
    ? `game over — ${JSON.stringify(view.result)}`
    : view?.turn
      ? `phase: ${view.turn.phase ?? '?'} — turn: ${view.turn.current}`
      : '';
  return (
    <div style={{ width: SEAT_WIDTH, height: SEAT_HEIGHT, flex: '0 0 auto', position: 'relative', border: '1px solid #ccc' }}>
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, pointerEvents: 'none', font: '14px sans-serif', color: '#eee' }}>
        seat: {seat}{status ? ` — ${status}` : ''}
      </div>
      <Wrapper option={option} initFunction={initAppWithFaces}>
        <CardTable tableDef={TABLE} placement={placement} viewer={undefined} onDrop={submit} />
      </Wrapper>
    </div>
  );
}

export function HeartsDemoPage() {
  // Page-lifetime session — no dispose effect (StrictMode would unsubscribe it; see net-demo-page).
  const session = useMemo(() => new GameSession(createHeartsServer()), []);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', width: '100vw', height: '100vh', alignContent: 'flex-start', justifyContent: 'center', gap: 12, background: '#222', overflow: 'auto' }}>
      {SEATS.map((seat) => (
        <SeatCanvas key={seat} session={session} seat={seat} />
      ))}
    </div>
  );
}
