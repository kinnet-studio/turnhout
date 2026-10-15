import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import { CardTable } from '@/engine/react';
import type { GameState } from '@/engine/core/game-state';
import { seatExtras, readSeatExtras, type ActionView } from '@/engine/core/lang/board-view';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { moveForDrop } from '@/engine/core/lang/drops';
import { friendlyError, friendlyReason } from '@/engine/core/lang/friendly';
import type { PhraseLibrary } from '@/engine/core/lang/phrases';
import type { CompiledGame } from '@/engine/core/lang/types';
import type { Move } from '@/engine/core/moves';
import type { PlayerId } from '@/engine/core/scene';
import type { Placement, TableDef } from '@/engine/core/table-def';
import type { DropIntent } from '@/engine/input/table-input-context';
import { GameServer } from '@/engine/net/game-server';
import { GameSession } from '@/engine/net/game-session';
import { loopbackChannel } from '@/engine/net/loopback';
import type { ClientChannel, ClientView } from '@/engine/net/protocol';
import { designerFaceRenderer } from '@/engine/pixi/text-faces';
import { makeInitApp } from '@/utils/init-app';
import { ActionButtons, MoneyLine } from './board-controls';
import { BoardGrid } from './board-grid';
import { seatStatus } from './seat-status';

const initAppWithFaces = makeInitApp(designerFaceRenderer, { showEmptyZones: true });

/** Feedback under a seat's status line auto-clears after this long. */
const NOTICE_DISPLAY_MS = 2500;

const NO_RULE = 'No rule lets you move a card there.';

// Fixed 800x600 per seat, like the Hearts demo page; a board seat is as tall as its board, money line and buttons need.
const SEAT_WIDTH = 800;
const SEAT_HEIGHT = 600;
const PANEL_STYLE = { width: SEAT_WIDTH, flex: '0 0 auto', border: '1px solid #ccc' } as const;

type Started = { server: GameServer; session: GameSession; tableDef: TableDef; seats: PlayerId[] } | { error: string };

/** Everything one playtest runs on, or why the rules cannot start (wrong player count, rules that never settle). */
function start(game: CompiledGame, library: PhraseLibrary, players: number, seed: number, initial?: GameState): Started {
  try {
    const { engine, runtime, tableDef, seats } = createEngine(game, library, players, initial ?? initialState(game, seed));
    // The board and each seat's buttons are not on the table, so the server adds them to every view it sends.
    const server = new GameServer({ engine, tableDef, seats, extras: (state, seat) => seatExtras(engine, runtime, state, seat) });
    return { server, session: new GameSession(server), tableDef, seats };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

function useSeat(
  session: GameSession,
  seat: PlayerId,
  onError: (message: string) => void,
): { view: ClientView | null; send: (move: Move) => void; notice: string | null; flash: (text: string) => void } {
  const chan = useRef<ClientChannel | null>(null);
  const latest = useRef<ClientView | null>(null);
  const [view, setView] = useState<ClientView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_DISPLAY_MS);
  }, []);

  useEffect(() => {
    const { server, client } = loopbackChannel();
    chan.current = client;
    client.onMessage((msg) => {
      if (msg.type === 'view') {
        latest.current = msg.view;
        setView(msg.view);
      } else if (msg.type === 'rejected') {
        flash(friendlyReason(msg.reason, latest.current?.turn?.current));
      }
    });
    const disconnect = session.connect(seat, server);
    return () => {
      disconnect();
      chan.current = null;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [session, seat, flash]);

  // The server runs the rules inside this call, so a rule that blows up throws here.
  const send = (move: Move) => {
    try {
      chan.current?.send({ type: 'move', move });
    } catch (e) {
      onError(friendlyError(e));
    }
  };
  return { view, send, notice, flash };
}

function SeatCanvas({ game, session, tableDef, seats, seat, onError }: {
  game: CompiledGame;
  session: GameSession;
  tableDef: TableDef;
  seats: PlayerId[];
  seat: PlayerId;
  onError: (message: string | null) => void;
}) {
  const { view, send, notice, flash } = useSeat(session, seat, onError);
  // The move type of the button this seat is choosing a space for, until a space is picked or it is cancelled.
  const [picking, setPicking] = useState<string | null>(null);
  const extras = readSeatExtras(view?.extras);
  // What may be picked is read from the seat's latest view, so a button that has since been greyed (an Undo took the turn
  // back, say) ends the picking instead of leaving a stale board to click.
  const action = picking === null ? undefined : extras?.actions.find((a) => a.move === picking);
  const choosing = action?.allowed === true && action.target !== null ? { move: action.move, ...action.target } : null;
  const stale = picking !== null && choosing === null;
  useEffect(() => {
    if (stale) setPicking(null);
  }, [stale]);
  const option = useMemo(() => ({ fullScreen: false, limitEntireViewPort: false }), []);
  const placement: Placement = { cards: view?.scene.cards ?? [] };
  const submit = (intent: DropIntent) => {
    onError(null);
    const move = moveForDrop(game, seats, view?.turn?.phase, seat, intent);
    if (move) send(move);
    // A card let go outside every zone, or back where it came from, just snaps back: nothing to explain.
    else if (intent.toZoneId !== null && intent.toZoneId !== intent.fromZoneId) flash(NO_RULE);
  };
  const status = `seat: ${seat} — ${seatStatus(game, view, seat)}`;
  // A card game always gets its table. A board game gets one only when some phase has cards to drag: it moves them by hand, or
  // lets players rearrange theirs. Piles that only rules draw from have nothing to drag. Asking the game, not the view, means
  // nothing mounts before the first view arrives.
  const showsCards = tableDef.zones.length > 0
    && (game.board === null || game.phases.some((phase) => phase.moves.length > 0 || phase.rearrange.length > 0));
  const canvas = showsCards && (
    <Wrapper option={option} initFunction={initAppWithFaces}>
      <CardTable tableDef={tableDef} placement={placement} viewer={undefined} onDrop={submit} />
    </Wrapper>
  );
  if (extras?.board) {
    const press = (move: string) => {
      onError(null);
      setPicking(null);
      send({ type: move });
    };
    const startPicking = ({ move }: ActionView) => {
      onError(null);
      setPicking(move);
    };
    const picker = choosing ? {
      prompt: choosing.prompt,
      spaces: choosing.spaces,
      onPick: (space: number) => {
        onError(null);
        setPicking(null);
        send({ type: choosing.move, target: space });
      },
      onRefused: flash,
    } : undefined;
    return (
      <div style={{ ...PANEL_STYLE, boxSizing: 'content-box', padding: 8, display: 'flex', flexDirection: 'column', gap: 8, font: '14px sans-serif', color: '#eee' }}>
        <div>{status}</div>
        {/* Room for the notice and the banner is kept, so the board does not jump when either appears. */}
        <div style={{ minHeight: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
          {choosing && (
            <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 8px', background: '#78350f', color: '#fff' }}>
              <span>{choosing.prompt}</span>
              <button type="button" onClick={() => setPicking(null)}>Cancel</button>
            </div>
          )}
          <span style={{ color: '#ff8a65' }}>{notice}</span>
        </div>
        <BoardGrid board={extras.board} picking={picker} />
        <MoneyLine board={extras.board} />
        <ActionButtons actions={extras.actions} onPress={press} onPick={startPicking} onRefused={flash} />
        {canvas && <div style={{ position: 'relative', height: SEAT_HEIGHT }}>{canvas}</div>}
      </div>
    );
  }
  return (
    <div style={{ ...PANEL_STYLE, height: SEAT_HEIGHT, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, pointerEvents: 'none', font: '14px sans-serif', color: '#eee' }}>
        <div>{status}</div>
        {notice && <div style={{ color: '#ff8a65' }}>{notice}</div>}
      </div>
      {canvas}
    </div>
  );
}

/** Every seat of a game on one screen, played over loopback channels exactly as an online table would be. */
export function Playtest({ game, library, players, seed, initial, onRestart, onStop }: {
  game: CompiledGame;
  library: PhraseLibrary;
  players: number;
  seed: number;
  /** A game state to start from instead of the shuffled start; for tests, which arrange who owns what. */
  initial?: GameState;
  onRestart(): void;
  onStop(): void;
}) {
  // Page-lifetime session — no dispose effect (StrictMode would unsubscribe it; see hearts-demo-page).
  const started = useMemo(() => start(game, library, players, seed, initial), [game, library, players, seed, initial]);
  const [problem, setProblem] = useState<string | null>(null);
  const running = 'error' in started ? null : started;
  const banner = 'error' in started ? started.error : problem;
  const undo = () => {
    setProblem(null);
    running?.server.undo();
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12, background: '#222', font: '14px sans-serif', color: '#eee' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={!running} onClick={undo}>Undo</button>
        <button type="button" onClick={onRestart}>Restart</button>
        <button type="button" onClick={onStop}>Stop</button>
      </div>
      {banner && <div role="alert" style={{ padding: '8px 12px', background: '#7f1d1d', color: '#fff' }}>{banner}</div>}
      {running && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignContent: 'flex-start', overflow: 'auto' }}>
          {running.seats.map((seat) => (
            <SeatCanvas key={seat} game={game} session={running.session} tableDef={running.tableDef} seats={running.seats} seat={seat} onError={setProblem} />
          ))}
        </div>
      )}
    </div>
  );
}
