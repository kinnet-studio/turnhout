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

const initAppWithFaces = makeInitApp(standardFaceRenderer, { showEmptyZones: true });

/** Rejection feedback auto-clears after this long. */
const REJECTION_DISPLAY_MS = 2500;

/** One-line instruction for the seat's status bar, derived from the projected view. */
export function seatHint(view: ClientView | null, seat: string): string {
  if (!view) return '';
  if (view.result !== undefined) return `game over — ${JSON.stringify(view.result)}`;
  const phase = view.turn?.phase;
  if (phase === 'passing') {
    const passed = view.scene.cards.filter((c) => c.zoneId === `pass-${seat}`).length;
    return passed >= 3 ? 'passed ✓ — waiting for the other seats' : `passing — drag 3 cards to your pass pile (${passed}/3)`;
  }
  if (phase === 'playing') {
    return view.turn?.current === seat ? 'your turn — drag a card to the center' : `waiting for ${view.turn?.current}`;
  }
  return `phase: ${phase ?? '?'} — turn: ${view.turn?.current ?? '?'}`;
}

function useSeat(
  session: GameSession,
  seat: string,
): { view: ClientView | null; submit: (m: DropIntent) => void; rejection: string | null } {
  const chan = useRef<ClientChannel | null>(null);
  const [view, setView] = useState<ClientView | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const rejectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const { server, client } = loopbackChannel();
    chan.current = client;
    client.onMessage((msg) => {
      if (msg.type === 'view') {
        setView(msg.view);
      } else if (msg.type === 'rejected') {
        if (rejectionTimer.current) clearTimeout(rejectionTimer.current);
        setRejection(msg.reason);
        rejectionTimer.current = setTimeout(() => setRejection(null), REJECTION_DISPLAY_MS);
      }
    });
    const disconnect = session.connect(seat, server);
    return () => {
      disconnect();
      chan.current = null;
      if (rejectionTimer.current) clearTimeout(rejectionTimer.current);
    };
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
  return { view, submit, rejection };
}

// Fixed 800x600 per seat — see the sizing NOTE in net-demo-page.tsx.
const SEAT_WIDTH = 800;
const SEAT_HEIGHT = 600;

function SeatCanvas({ session, seat }: { session: GameSession; seat: string }) {
  const { view, submit, rejection } = useSeat(session, seat);
  const option = useMemo(() => ({ fullScreen: false, limitEntireViewPort: false }), []);
  const placement: Placement = { cards: view?.scene.cards ?? [] };
  return (
    <div style={{ width: SEAT_WIDTH, height: SEAT_HEIGHT, flex: '0 0 auto', position: 'relative', border: '1px solid #ccc' }}>
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, pointerEvents: 'none', font: '14px sans-serif', color: '#eee' }}>
        <div>seat: {seat} — {seatHint(view, seat)}</div>
        {rejection && <div style={{ color: '#ff8a65' }}>{rejection}</div>}
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
