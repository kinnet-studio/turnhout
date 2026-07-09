import { useEffect, useMemo, useRef, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import { CardTable } from '@/engine/react';
import type { Placement } from '@/engine/core/table-def';
import type { DropIntent } from '@/engine/input/table-input-context';
import { initApp } from '@/utils/init-app';
import { GameSession } from '@/engine/net/game-session';
import { loopbackChannel } from '@/engine/net/loopback';
import type { ClientChannel, ClientView } from '@/engine/net/protocol';
import { createDemoServer, TABLE } from './game';

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
    chan.current?.send({ type: 'move', move: { type: 'play', cardId: i.cardId, toZone: i.toZoneId, slot: i.slot } });
  };
  return { view, submit };
}

// NOTE on sizing: @ue-too/board-pixi-integration's `InitAppOptions` only supports
// `fullScreen: true` (canvas resizes to `window` via Pixi's `resizeTo`) or a fixed
// default 800x600 raster (Pixi's `ViewSystem` default) — there is no option to size
// the canvas to an arbitrary container element. The `Wrapper` component's own outer
// `<div style={{position:'relative'}}>` also has no explicit height, so CSS like
// `height:'100vh'` on *our* container does not cascade down to it (a block element's
// `height:auto` shrinks to content — it does not inherit an ancestor's height). Rather
// than fight that with `fullScreen:false` + a percentage/flex-stretch chain (which was
// tried and is fragile — CSS-stretching the fixed 800x600 raster also distorts the
// 4:3 aspect the demo's camera-fit assumes), each seat gets a fixed 800x600 box that
// exactly matches Pixi's natural raster size, and the two boxes sit side by side.
const SEAT_WIDTH = 800;
const SEAT_HEIGHT = 600;

function SeatCanvas({ session, seat }: { session: GameSession; seat: string }) {
  const { view, submit } = useSeat(session, seat);
  const option = useMemo(() => ({ fullScreen: false, limitEntireViewPort: false }), []);
  const placement: Placement = { cards: view?.scene.cards ?? [] };
  return (
    <div style={{ width: SEAT_WIDTH, height: SEAT_HEIGHT, flex: '0 0 auto', position: 'relative', border: '1px solid #ccc' }}>
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, pointerEvents: 'none', font: '14px sans-serif', color: '#eee' }}>
        seat: {seat}{view?.turn ? ` — turn: ${view.turn.current}` : ''}
      </div>
      <Wrapper option={option} initFunction={initApp}>
        <CardTable tableDef={TABLE} placement={placement} viewer={undefined} onDrop={submit} />
      </Wrapper>
    </div>
  );
}

export function NetDemoPage() {
  const session = useMemo(() => new GameSession(createDemoServer()), []);
  useEffect(() => () => session.dispose(), [session]);
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#222', overflow: 'auto' }}>
      <SeatCanvas session={session} seat="me" />
      <SeatCanvas session={session} seat="opp" />
    </div>
  );
}
