import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import { CardTable } from '@/engine/react';
import type { GameState } from '@/engine/core/game-state';
import { seatExtras, readSeatExtras, type ActionView } from '@/engine/core/lang/board-view';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { moveForDrop } from '@/engine/core/lang/drops';
import { fitsTable, fittedLayout } from '@/engine/core/lang/fit-layout';
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
import { ActionButtons, BANNER_SLOT, BANNER_STYLE, BUTTON_ROW, MoneyLine, PlayerPicker } from './board-controls';
import { BoardGrid } from './board-grid';
import { cardDetail } from './card-detail';
import { CardPicker } from './card-picker';
import { seatStatus, seatToAct } from './seat-status';
import { SeatTabs } from './seat-tabs';
import { Tableaux } from './tableaux';

const initAppWithFaces = makeInitApp(designerFaceRenderer, { showEmptyZones: true });

/** Feedback under a seat's status line auto-clears after this long. */
const NOTICE_DISPLAY_MS = 2500;

const NO_RULE = 'No rule lets you move a card there.';

// Fixed 800x600 per seat, like the Hearts demo page; a board seat is as tall as its board, money line and buttons need.
const SEAT_WIDTH = 800;
const SEAT_HEIGHT = 600;
const PANEL_STYLE = { width: SEAT_WIDTH, flex: '0 0 auto', border: '1px solid #ccc' } as const;
// A game too big for one table shows one seat at a time, on a canvas that draws the 1600 x 1200 world at three quarters.
const FITTED_WIDTH = 1200;
const FITTED_HEIGHT = 900;
const initFittedApp = makeInitApp(designerFaceRenderer, { showEmptyZones: true, size: { width: FITTED_WIDTH, height: FITTED_HEIGHT } });

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

function SeatCanvas({ game, session, tableDef, seats, seat, onError, fitted = false, onTurn }: {
  game: CompiledGame;
  session: GameSession;
  tableDef: TableDef;
  seats: PlayerId[];
  seat: PlayerId;
  onError: (message: string | null) => void;
  /** The seat's own table of a game too big for one: its panel lists every player's tableau, and the canvas draws only its zones. */
  fitted?: boolean;
  /** Told the seat the game waits on, each time that changes. */
  onTurn?(seat: PlayerId | null): void;
}) {
  const { view, send, notice, flash } = useSeat(session, seat, onError);
  const toAct = seatToAct(game, view);
  const viewed = view !== null;
  useEffect(() => {
    // Until its first view arrives the seat knows nothing of the turn, which is not the same as no seat having to act.
    if (viewed) onTurn?.(toAct);
  }, [viewed, toAct, onTurn]);
  // The move type of the button this seat is choosing a space, another player or cards for, until they are picked or it is cancelled.
  const [picking, setPicking] = useState<string | null>(null);
  const extras = readSeatExtras(view?.extras);
  // What may be picked is read from the seat's latest view, so a button that has since been greyed (an Undo took the turn
  // back, say) ends the picking instead of leaving a stale board to click.
  const action = picking === null ? undefined : extras?.actions.find((a) => a.move === picking);
  const choosing = action?.allowed === true && action.target !== null ? { move: action.move, ...action.target } : null;
  const choosingPlayer = action?.allowed === true && action.players !== null ? { move: action.move, players: action.players } : null;
  const choosingCards = action?.allowed === true && action.cards !== undefined ? { move: action.move, pick: action.cards } : null;
  const stale = picking !== null && choosing === null && choosingPlayer === null && choosingCards === null;
  useEffect(() => {
    if (stale) setPicking(null);
  }, [stale]);
  const option = useMemo(() => ({ fullScreen: false, limitEntireViewPort: false }), []);
  const drawn = useMemo(() => new Set(tableDef.zones.map((zone) => zone.id)), [tableDef]);
  const cards = view?.scene.cards ?? [];
  // A fitted table leaves the other players' zones off, so their cards have nowhere to stand: they are counted in the tableaux.
  const placement: Placement = { cards: fitted ? cards.filter((card) => drawn.has(card.zoneId)) : cards };
  // A card's face has room for only some of its columns, so a fitted table shows the card under the pointer in full below it.
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredCard = placement.cards.find((card) => card.id === hovered);
  // A face-down card is a back to this seat, so pointing at it shows nothing.
  const detail = hoveredCard?.faceUp ? cardDetail(hoveredCard.faceKey) : null;
  const submit = (intent: DropIntent) => {
    onError(null);
    const move = moveForDrop(game, seats, view?.turn?.phase, seat, intent);
    if (move) send(move);
    // A card let go outside every zone, or back where it came from, just snaps back: nothing to explain.
    else if (intent.toZoneId !== null && intent.toZoneId !== intent.fromZoneId) flash(NO_RULE);
  };
  const status = `seat: ${seat} — ${seatStatus(game, view, seat)}`;
  // A card game always gets its table, and so does a game whose board has no spaces: it has only numbers, so it is a card game
  // however it moves its cards. A board game gets one only when some phase has cards to drag: it moves them by hand, or lets
  // players rearrange theirs. Piles that only rules draw from have nothing to drag. Asking the game, not the view, means nothing
  // mounts before the first view arrives.
  const showsCards = tableDef.zones.length > 0
    && (game.board === null || game.board.spaces.length === 0
      || game.phases.some((phase) => phase.moves.length > 0 || phase.rearrange.length > 0));
  const canvas = showsCards && (
    <Wrapper option={option} initFunction={fitted ? initFittedApp : initAppWithFaces}>
      <CardTable tableDef={tableDef} placement={placement} viewer={undefined} onDrop={submit} onHover={fitted ? setHovered : undefined} />
    </Wrapper>
  );
  // The panel is for a game that has a board, or buttons to press, and for every fitted table, whose panel lists the tableaux;
  // each part of it is drawn only when the game has what it shows, so a card game with a number each player has gets its money
  // line and buttons without a board.
  const hasButtons = game.phases.some((phase) => phase.actions.length > 0);
  const board = extras?.board ?? null;
  if (fitted || (extras && (board !== null || hasButtons))) {
    // A blank box sends no amount at all; the rules answer that with what is missing, and it flashes like any other refusal.
    const press = (move: string, amount?: number | null) => {
      onError(null);
      setPicking(null);
      send(typeof amount === 'number' ? { type: move, amount } : { type: move });
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
    const playerPicker = choosingPlayer && (
      <PlayerPicker
        players={choosingPlayer.players}
        onPick={(player) => {
          onError(null);
          setPicking(null);
          send({ type: choosingPlayer.move, player });
        }}
        onRefused={flash}
        onCancel={() => setPicking(null)}
      />
    );
    // The money line's place on a fitted table goes to every player's tableau, which counts the cards their zones hold.
    const numbers = fitted
      ? view && <Tableaux game={game} seats={seats} board={board} cards={view.scene.cards} />
      : board && (board.counters.length > 0 || game.facts.length > 0 || board.bank.length > 0) && <MoneyLine board={board} />;
    const buttons = hasButtons && extras && <ActionButtons actions={extras.actions} onPress={press} onPick={startPicking} onRefused={flash} />;
    // Keyed by the button, so pressing another that picks cards starts a fresh pick.
    const cardPicker = choosingCards && (
      <CardPicker
        key={choosingCards.move}
        pick={choosingCards.pick}
        onSend={(chosen) => {
          onError(null);
          setPicking(null);
          send({ type: choosingCards.move, ...chosen });
        }}
        onRefused={flash}
        onCancel={() => setPicking(null)}
      />
    );
    const canvasBox = fitted ? { width: FITTED_WIDTH, height: FITTED_HEIGHT } : { height: SEAT_HEIGHT };
    return (
      <div style={{ ...PANEL_STYLE, width: fitted ? FITTED_WIDTH : SEAT_WIDTH, boxSizing: 'content-box', padding: 8, display: 'flex', flexDirection: 'column', gap: 8, font: '14px sans-serif', color: '#eee' }}>
        <div>{status}</div>
        {/* Room for the notice and the banner is kept, so the board does not jump when either appears. */}
        <div style={{ minHeight: BANNER_SLOT, display: 'flex', alignItems: 'center', gap: 12 }}>
          {choosing && (
            <div role="status" style={BANNER_STYLE}>
              <span>{choosing.prompt}</span>
              <button type="button" onClick={() => setPicking(null)}>Cancel</button>
            </div>
          )}
          {playerPicker}
          <span style={{ color: '#ff8a65' }}>{notice}</span>
        </div>
        {board && board.spaces.length > 0 && <BoardGrid board={board} picking={picker} />}
        {numbers}
        {/* A fitted table keeps the buttons' room when a phase has none, so the table under them does not jump. The card picker opens
            inside that room, which grows only while it is open. */}
        {fitted && hasButtons ? (
          <div data-testid="seat-buttons" style={{ minHeight: BUTTON_ROW, display: 'flex', flexDirection: 'column', gap: 8 }}>{buttons}{cardPicker}</div>
        ) : <>{buttons}{cardPicker}</>}
        {canvas && <div style={{ position: 'relative', ...canvasBox }}>{canvas}</div>}
        {fitted && <div data-testid="card-detail" style={{ minHeight: 20 }}>{detail}</div>}
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
  // A game whose zones do not all fit on one table is played one seat at a time, each on a table of its own zones.
  const fitted = useMemo(() => running !== null && !fitsTable(game.zones, running.seats), [game, running]);
  const [selected, setSelected] = useState<PlayerId>(() => running?.seats[0] ?? '');
  const [toAct, setToAct] = useState<PlayerId | null>(null);
  const lastToAct = useRef<PlayerId | null>(null);
  // The tabs follow the turn only when the seat that must act changes, so a player can look at another seat's tab in peace.
  const seen = useCallback((seat: PlayerId | null) => {
    setToAct(seat);
    if (seat !== null && seat !== lastToAct.current) setSelected(seat);
    lastToAct.current = seat;
  }, []);
  const fittedDef = useMemo<TableDef | null>(
    () => (running && fitted ? { players: running.seats, zones: fittedLayout(game.zones, selected) } : null),
    [running, fitted, game, selected],
  );
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
      {running && fittedDef && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', overflow: 'auto' }}>
          <SeatTabs seats={running.seats} selected={selected} toAct={toAct} onSelect={setSelected} />
          <SeatCanvas
            key={selected}
            game={game}
            session={running.session}
            tableDef={fittedDef}
            seats={running.seats}
            seat={selected}
            onError={setProblem}
            fitted
            onTurn={seen}
          />
        </div>
      )}
      {running && !fittedDef && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignContent: 'flex-start', overflow: 'auto' }}>
          {running.seats.map((seat) => (
            <SeatCanvas key={seat} game={game} session={running.session} tableDef={running.tableDef} seats={running.seats} seat={seat} onError={setProblem} />
          ))}
        </div>
      )}
    </div>
  );
}
