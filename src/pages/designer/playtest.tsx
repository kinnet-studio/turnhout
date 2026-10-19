import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import { CardTable } from '@/engine/react';
import type { GameState } from '@/engine/core/game-state';
import { seatExtras, readSeatExtras, type ActionView } from '@/engine/core/lang/board-view';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { comparedColumn } from '@/engine/core/lang/choices';
import { moveForDrop } from '@/engine/core/lang/drops';
import { fitsTable, fittedBounds, fittedLayout, stackOnHolders } from '@/engine/core/lang/fit-layout';
import { friendlyError, friendlyReason } from '@/engine/core/lang/friendly';
import type { PhraseLibrary } from '@/engine/core/lang/phrases';
import type { CompiledGame } from '@/engine/core/lang/types';
import type { Move } from '@/engine/core/moves';
import type { PlayerId } from '@/engine/core/scene';
import { TABLE_BOUNDS } from '@/engine/core/scene';
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
import { boardBadges, boardCaptions, boardDims } from './board-text';
import { cardDetail } from './card-detail';
import { CardOffer } from './card-offer';
import { NOTHING_TAKES, PICK_START, clickCard, liveAt, ringsOf, takersOf, type PickAt, type PickChosen } from './card-pick';
import { CardPicker } from './card-picker';
import { ChoicePicker } from './choice-picker';
import { aboutOf, choicesFor, choicesOfPress, nextChoice, questionOf, type Asking } from './choice-step';
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
// A game too big for one table shows one seat at a time, on a canvas that draws its world at three quarters: the 1600 x 1200
// table, or a taller world when the seat's board needs the room (`fittedBounds`).
const FITTED_WIDTH = 1200;
const FITTED_SCALE = FITTED_WIDTH / (TABLE_BOUNDS.max.x - TABLE_BOUNDS.min.x);

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
): {
  view: ClientView | null; send: (move: Move, onAnswer?: (taken: boolean) => void) => void; notice: string | null; flash: (text: string) => void;
} {
  const chan = useRef<ClientChannel | null>(null);
  const latest = useRef<ClientView | null>(null);
  // Told whether the seat's last press was taken: the server answers a press with the seat's new view, or with why it refused it.
  const answer = useRef<((taken: boolean) => void) | null>(null);
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
    const settle = (taken: boolean) => {
      const told = answer.current;
      answer.current = null;
      told?.(taken);
    };
    client.onMessage((msg) => {
      if (msg.type === 'view') {
        latest.current = msg.view;
        setView(msg.view);
        settle(true);
      } else if (msg.type === 'rejected') {
        flash(friendlyReason(msg.reason, latest.current?.turn?.current));
        settle(false);
      }
    });
    const disconnect = session.connect(seat, server);
    return () => {
      disconnect();
      chan.current = null;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [session, seat, flash]);

  // The server runs the rules inside this call, so a rule that blows up throws here, and then no answer comes.
  const send = (move: Move, onAnswer?: (taken: boolean) => void) => {
    answer.current = onAnswer ?? null;
    try {
      chan.current?.send({ type: 'move', move });
    } catch (e) {
      answer.current = null;
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
  // The cards picked so far for a button that picks cards, shared by its list and clicks on the table. They start over where
  // picking starts and ends, in the same update, so a button chosen for a card clicked on the table opens with that card picked.
  const [pickAt, setPickAt] = useState<PickAt>(PICK_START);
  const openPicker = useCallback((move: string, at: PickAt = PICK_START) => {
    setPicking(move);
    setPickAt(at);
  }, []);
  const closePicker = useCallback(() => {
    setPicking(null);
    setPickAt(PICK_START);
  }, []);
  // The card clicked on the table whose buttons are offered, until one is chosen or the offer closes.
  const [offer, setOffer] = useState<string | null>(null);
  const extras = readSeatExtras(view?.extras);
  // What may be picked is read from the seat's latest view, so a button that has since been greyed (an Undo took the turn
  // back, say) ends the picking instead of leaving a stale board to click.
  const action = picking === null ? undefined : extras?.actions.find((a) => a.move === picking);
  const choosing = action?.allowed === true && action.target !== null ? { move: action.move, ...action.target } : null;
  const choosingPlayer = action?.allowed === true && action.players !== null ? { move: action.move, players: action.players } : null;
  const choosingCards = action?.allowed === true && action.cards !== undefined ? { move: action.move, pick: action.cards } : null;
  const stale = picking !== null && choosing === null && choosingPlayer === null && choosingCards === null;
  useEffect(() => {
    if (stale) closePicker();
  }, [stale, closePicker]);
  // The view can change while cards are picked (an Undo takes one back): a card no longer listed drops out of the picks, so it is
  // never sent or ringed, and stays out if it comes back. Storing the pruned picks while rendering makes React render again at once.
  const livePick = choosingCards === null ? pickAt : liveAt(choosingCards.pick, pickAt);
  if (livePick !== pickAt) setPickAt(livePick);
  const takers = offer === null ? [] : takersOf(extras?.actions ?? [], offer);
  // An offer whose card no button takes any more closes in this render, before anything is drawn, so neither the offer nor its
  // ring outlasts the view that took its takers away: the card may have gone where this seat can't see it.
  const offered = takers.length > 0 ? offer : null;
  if (offered !== offer) setOffer(null);
  // A press whose choices of several answers are asked one at a time, until the last is answered and the press is taken, or it is
  // dropped. What is asked is read from the seat's latest view: the question, its picker and its rings show only while the view
  // still lists a choice to answer, and a press that asks nothing more (an Undo, the turn moving on) closes, sending nothing.
  const [asking, setAsking] = useState<Asking | null>(null);
  const askingAction = asking === null ? undefined : extras?.actions.find((a) => a.move === asking.move);
  const askingChoices = asking === null ? [] : choicesFor(askingAction, asking.chosen);
  const current = asking === null ? null : nextChoice(askingChoices, asking.answers);
  const askedNoMore = asking !== null && current === null;
  useEffect(() => {
    if (askedNoMore) setAsking(null);
  }, [askedNoMore]);
  // The question names the column of the card the choice compares, and its value, from the seat's own sight of the card it picked.
  const askedCard = asking?.chosen && 'cardId' in asking.chosen ? asking.chosen : null;
  const declared = asking === null ? undefined : game.phases.flatMap((p) => p.actions).find((a) => a.words === asking.move);
  const question = current === null ? null : questionOf(current, aboutOf(
    declared === undefined ? null : comparedColumn(declared, current.at),
    askedCard === null ? undefined : view?.scene.cards.find((card) => card.id === askedCard.cardId),
  ));
  const option = useMemo(() => ({ fullScreen: false, limitEntireViewPort: false }), []);
  // The fitted canvas is as tall as its world needs. A table that needs no more room is made with exactly what it was before, with
  // no world. The canvas makes its app once, when it mounts, so this is worked out once for each game.
  const fittedCanvas = useMemo(() => {
    const world = fittedBounds(game.zones);
    const size = { width: FITTED_WIDTH, height: (world.max.y - world.min.y) * FITTED_SCALE };
    const init = makeInitApp(designerFaceRenderer, { showEmptyZones: true, size, ...(world !== TABLE_BOUNDS && { world }) });
    return { size, init };
  }, [game]);
  const drawn = useMemo(() => new Set(tableDef.zones.map((zone) => zone.id)), [tableDef]);
  // A fitted table leaves the other players' zones off, so their cards have nowhere to stand: they are counted in the tableaux.
  // The cards on a card hang under it, placed once for each view rather than on every hover.
  const placed = useMemo(() => {
    const cards = view?.scene.cards ?? [];
    return fitted ? stackOnHolders(tableDef.zones, cards.filter((card) => drawn.has(card.zoneId))) : cards;
  }, [view, fitted, tableDef, drawn]);
  const placement: Placement = { cards: placed };
  // Only a game whose buttons pick cards puts anything on its cards or takes clicks on them, so every other game's table draws and
  // plays as it always has. A card on a seat's Board is captioned with its counts, read against what the rules work out, badged
  // with the flags it keeps, the flags worked out that change what it makes or costs and the counts no caption reads, and faded
  // while a flag leaves it out of a player's total; all of them change only with the view.
  const picksCards = game.phases.some((phase) => phase.actions.some((a) => a.pick !== undefined));
  const worked = extras?.worked;
  const captions = useMemo(
    () => (picksCards && view !== null ? boardCaptions(game, placed, worked) : null),
    [picksCards, view, game, placed, worked],
  );
  // While cards are picked, the cards picked and those to pick next are ringed; while an offer is open, the card it is for; while a
  // question is open, the card it is about and the card it goes to.
  const pickView = choosingCards?.pick ?? null;
  const decor = useMemo(() => {
    if (captions === null) return undefined;
    const asked = current !== null && asking?.chosen && 'cardId' in asking.chosen ? asking.chosen : null;
    const rings: { [cardId: string]: 'choice' | 'chosen' } = pickView !== null ? ringsOf(pickView, livePick)
      : offered !== null ? { [offered]: 'chosen' }
        : asked !== null ? { [asked.cardId]: 'chosen', ...(asked.onto !== undefined && { [asked.onto]: 'chosen' }) }
          : {};
    const badges = boardBadges(game, placed, worked);
    const dims = new Set(boardDims(game, placed));
    const ids = new Set([...Object.keys(captions), ...Object.keys(rings), ...Object.keys(badges), ...dims]);
    return Object.fromEntries([...ids].map((id) => [id, {
      ...(id in rings && { ring: rings[id] }),
      ...(id in captions && { caption: captions[id] }),
      ...(id in badges && { badge: badges[id] }),
      ...(dims.has(id) && { dim: true }),
    }]));
  }, [game, captions, placed, worked, pickView, livePick, offered, asking, current]);
  // A card's face has room for only some of its columns, so a fitted table shows the card under the pointer in full below it.
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredCard = placement.cards.find((card) => card.id === hovered);
  // A face-down card is a back to this seat, so pointing at it shows nothing.
  const detail = hoveredCard?.faceUp ? cardDetail(hoveredCard.faceKey) : null;
  // A press whose view lists a choice of several answers is not sent yet: the offer and the picker close, and its questions open in
  // their place. Any other press goes at once.
  const askOrSend = (move: string, chosen: PickChosen | null, go: () => void) => {
    if (nextChoice(choicesFor(extras?.actions.find((a) => a.move === move), chosen), {}) === null) {
      go();
      return;
    }
    setOffer(null);
    closePicker();
    setAsking({ move, chosen, answers: {} });
  };
  // A press that picks cards ends the picking only once it is taken: a set the rules refuse as a whole keeps its picks, on the list
  // and on the table, to be changed and sent again.
  const sendPick = (move: string, chosen: PickChosen) => {
    onError(null);
    askOrSend(move, chosen, () => send({ type: move, ...chosen }, (taken) => {
      if (taken) closePicker();
    }));
  };
  // A card clicked on the table explains while a question is open, which stays open; it goes to the card picker while one is open;
  // otherwise it is offered to the buttons that take it.
  const clickOnTable = (cardId: string) => {
    if (question !== null) {
      flash(`${question}.`);
      return;
    }
    if (choosingCards !== null) {
      const outcome = clickCard(choosingCards.pick, livePick, cardId);
      if ('send' in outcome) sendPick(choosingCards.move, outcome.send);
      else if ('at' in outcome) setPickAt(outcome.at);
      else flash(outcome.refused);
      return;
    }
    const taken = takersOf(extras?.actions ?? [], cardId).length > 0;
    setOffer(taken ? cardId : null);
    if (!taken) flash(NOTHING_TAKES);
  };
  const submit = (intent: DropIntent) => {
    onError(null);
    const move = moveForDrop(game, seats, view?.turn?.phase, seat, intent);
    // A dropped move drops an open question, as pressing a button does.
    if (move) {
      setAsking(null);
      send(move);
    }
    // In a game whose cards are clicked, a card let go back in its own zone with no rule for that was a click that wobbled.
    else if (picksCards && intent.toZoneId === intent.fromZoneId) clickOnTable(intent.cardId);
    // A card let go outside every zone, or back where it came from, just snaps back: nothing to explain.
    else if (intent.toZoneId !== null && intent.toZoneId !== intent.fromZoneId) flash(NO_RULE);
  };
  const status = `seat: ${seat} — ${seatStatus(game, view, seat)}`;
  // A card game always gets its table, and so does a game whose board has no spaces: it has only numbers, so it is a card game
  // however it moves its cards. A board game gets one only when some phase has cards to drag (it moves them by hand, or lets
  // players rearrange theirs) or a button that picks cards, which are clicked there. Piles that only rules draw from have nothing
  // to drag. Asking the game, not the view, means nothing mounts before the first view arrives.
  const showsCards = tableDef.zones.length > 0
    && (game.board === null || game.board.spaces.length === 0 || picksCards
      || game.phases.some((phase) => phase.moves.length > 0 || phase.rearrange.length > 0));
  const canvas = showsCards && (
    <Wrapper option={option} initFunction={fitted ? fittedCanvas.init : initAppWithFaces}>
      <CardTable
        tableDef={tableDef}
        placement={placement}
        viewer={undefined}
        onDrop={submit}
        onCardClick={picksCards ? clickOnTable : undefined}
        onHover={fitted ? setHovered : undefined}
        decor={decor}
      />
    </Wrapper>
  );
  // The panel is for a game that has a board, or buttons to press, and for every fitted table, whose panel lists the tableaux;
  // each part of it is drawn only when the game has what it shows, so a card game with a number each player has gets its money
  // line and buttons without a board.
  const hasButtons = game.phases.some((phase) => phase.actions.length > 0);
  const board = extras?.board ?? null;
  if (fitted || (extras && (board !== null || hasButtons))) {
    // A blank box sends no amount at all; the rules answer that with what is missing, and it flashes like any other refusal.
    // Pressing a button, or starting to pick for one, closes the offer of a card clicked on the table and an open question; a
    // button without an amount whose press asks a choice asks it.
    const press = (move: string, amount?: number | null) => {
      onError(null);
      setOffer(null);
      closePicker();
      setAsking(null);
      if (amount === undefined) askOrSend(move, null, () => send({ type: move }));
      else send(typeof amount === 'number' ? { type: move, amount } : { type: move });
    };
    // Pressing the button that is picking again keeps its picks.
    const startPicking = ({ move }: ActionView) => {
      onError(null);
      setOffer(null);
      setAsking(null);
      if (move !== picking) openPicker(move);
    };
    const picker = choosing ? {
      prompt: choosing.prompt,
      spaces: choosing.spaces,
      onPick: (space: number) => {
        onError(null);
        closePicker();
        send({ type: choosing.move, target: space });
      },
      onRefused: flash,
    } : undefined;
    const playerPicker = choosingPlayer && (
      <PlayerPicker
        players={choosingPlayer.players}
        onPick={(player) => {
          onError(null);
          closePicker();
          send({ type: choosingPlayer.move, player });
        }}
        onRefused={flash}
        onCancel={closePicker}
      />
    );
    // The money line's place on a fitted table goes to every player's tableau, which counts the cards their zones hold.
    const numbers = fitted
      ? view && <Tableaux game={game} seats={seats} board={board} cards={view.scene.cards} worked={worked} playerValues={extras?.playerValues} />
      : board && (board.counters.length > 0 || game.facts.length > 0 || board.bank.length > 0) && <MoneyLine board={board} />;
    const buttons = hasButtons && extras && <ActionButtons actions={extras.actions} onPress={press} onPick={startPicking} onRefused={flash} />;
    // A button chosen for a card clicked on the table takes the card as a click in its picker would: one card with nowhere else to
    // go is sent at once, and otherwise the picker opens with the card picked.
    const chooseOffered = (cardId: string, move: string) => {
      setOffer(null);
      const pick = extras?.actions.find((a) => a.move === move)?.cards;
      if (pick === undefined) return;
      const outcome = clickCard(pick, PICK_START, cardId);
      onError(null);
      if ('send' in outcome) {
        const chosen = outcome.send;
        askOrSend(move, chosen, () => {
          closePicker();
          send({ type: move, ...chosen });
        });
      } else if ('at' in outcome) {
        openPicker(move, outcome.at);
      } else {
        flash(outcome.refused);
      }
    };
    // The card is named as the first button that takes it sees it.
    const offerName = extras?.actions.flatMap((a) => a.cards?.cards ?? []).find((card) => card.id === offered)?.name ?? '';
    const cardOffer = offered !== null && (
      <CardOffer name={offerName} takers={takers} onChoose={(move) => chooseOffered(offered, move)} onRefused={flash} onCancel={() => setOffer(null)} />
    );
    // It shows the picks this seat shares with clicks on its table, and closes once a press is taken (see sendPick).
    const cardPicker = choosingCards && (
      <CardPicker
        pick={choosingCards.pick}
        at={livePick}
        onAt={setPickAt}
        onSend={(chosen) => sendPick(choosingCards.move, chosen)}
        onRefused={flash}
        onCancel={closePicker}
      />
    );
    // An answer that leaves a question to ask is kept, and the next question shows; the last sends the press. The last is never
    // kept: a press the rules take closes the step, and one they refuse (the seat is told why) leaves it at that question.
    const answer = (value: string) => {
      if (asking === null || current === null) return;
      const answers = { ...asking.answers, [current.at]: value };
      if (nextChoice(askingChoices, answers) !== null) {
        setAsking({ ...asking, answers });
        return;
      }
      onError(null);
      send({ type: asking.move, ...asking.chosen, choices: choicesOfPress(askingChoices, answers) }, (taken) => {
        if (taken) setAsking(null);
      });
    };
    const choicePicker = current !== null && question !== null && (
      <ChoicePicker question={question} choice={current} onAnswer={answer} onRefused={flash} onCancel={() => setAsking(null)} />
    );
    const canvasBox = fitted ? fittedCanvas.size : { height: SEAT_HEIGHT };
    return (
      <div style={{ ...PANEL_STYLE, width: fitted ? FITTED_WIDTH : SEAT_WIDTH, boxSizing: 'content-box', padding: 8, display: 'flex', flexDirection: 'column', gap: 8, font: '14px sans-serif', color: '#eee' }}>
        <div>{status}</div>
        {/* Room for the notice and the banner is kept, so the board does not jump when either appears. */}
        <div style={{ minHeight: BANNER_SLOT, display: 'flex', alignItems: 'center', gap: 12 }}>
          {choosing && (
            <div role="status" style={BANNER_STYLE}>
              <span>{choosing.prompt}</span>
              <button type="button" onClick={closePicker}>Cancel</button>
            </div>
          )}
          {playerPicker}
          <span style={{ color: '#ff8a65' }}>{notice}</span>
        </div>
        {board && board.spaces.length > 0 && <BoardGrid board={board} picking={picker} />}
        {numbers}
        {/* A fitted table keeps the buttons' room when a phase has none, so the table under them does not jump. The card picker, the
            offer of a card clicked on the table, or a press's question, opens inside that room, which grows only while one is open,
            as it does when a phase has more rows of buttons. */}
        {fitted && hasButtons ? (
          <div data-testid="seat-buttons" style={{ minHeight: BUTTON_ROW, display: 'flex', flexDirection: 'column', gap: 8 }}>{buttons}{cardOffer}{cardPicker}{choicePicker}</div>
        ) : <>{buttons}{cardOffer}{cardPicker}{choicePicker}</>}
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
