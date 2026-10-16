import { describe, expect, it } from 'vitest';
import STARTUP_SIMULATOR from './startup-simulator.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { runExamples } from '@/engine/core/lang/examples';
import { createEngine, initialState, seatsFor, tableDefFor } from '@/engine/core/lang/build';
import { counterOf, setCounter } from '@/engine/core/lang/board-state';
import { seatExtras, type PickCardView, type SeatExtras } from '@/engine/core/lang/board-view';
import { deckOf, NEXT_CARD_KEY } from '@/engine/core/lang/cards';
import { cardCandidates, hasCost } from '@/engine/core/lang/declared-actions';
import type { LangRuntime } from '@/engine/core/lang/runtime';
import { markTurnStarted, ROUND_KEY, START_PLAYER_KEY, startPlayerOf, TURN_OF_KEY } from '@/engine/core/lang/turns';
import { relocate, zoneIdFor, zoneInfo } from '@/engine/core/lang/zones';
import { HIDDEN_FACE_KEY, deriveScene } from '@/engine/core/derive-scene';
import { cardById, zoneCards, type GameState } from '@/engine/core/game-state';
import type { GameEngine } from '@/engine/core/game-engine';
import type { Move } from '@/engine/core/moves';
import type { CardState, PlayerId } from '@/engine/core/scene';

const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(STARTUP_SIMULATOR, lib);

const JUNIORS = ['Junior Software Dev', 'Junior Hardware Eng', 'Junior QA Tester'];
/** The product columns that hold a number of cubes: C4 says each is a number, 0 where the rulebook prints none of that color. */
const CUBES = ['blue cost', 'red cost', 'blue maint', 'red maint'] as const;
/** The product columns the rulebook's sums are checked over. */
const SUMMED = ['blue cost', 'red cost', 'rev', 'val', 'blue maint', 'red maint'] as const;
/** The Crash goes among the bottom ⌈34 / 5⌉ + 1 cards of the Growth Deck (§4.1). */
const CRASH_REACH = 8;

const fresh = (seed = 1) => initialState(game!, seed);
const nameOf = (card: CardState) => card.data?.name;
const inZone = (cards: CardState[], zoneId: string) => cards.filter((card) => card.zoneId === zoneId);
const sum = (cards: CardState[], column: string) => cards.reduce((total, card) => total + (card.data?.[column] as number), 0);
const sums = (cards: CardState[]) => Object.fromEntries(SUMMED.map((column) => [column, sum(cards, column)]));

/** How many cards there are of each name. */
function nameCounts(cards: CardState[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) counts[nameOf(card) as string] = (counts[nameOf(card) as string] ?? 0) + 1;
  return counts;
}

/** The talent card whose name is `name`, as dealt at seed 1. */
const talent = (name: string) => inZone(fresh().cards, 'talent-deck').find((card) => nameOf(card) === name)!;
/** The product card whose name is `name`, as dealt at seed 1. */
const product = (name: string) => fresh().cards.find((card) => nameOf(card) === name)!;

/** An engine at the start of the game, after Setup. */
function setUp(players: number, seed: number): GameState {
  return createEngine(game!, lib, players, initialState(game!, seed)).engine.getState();
}

/** The id of the first card whose name is `name`, as dealt at seed 1. */
const idOf = (name: string) => fresh().cards.find((card) => nameOf(card) === name)!.id;

/**
 * Two players, p0's turn in the actions phase, as an example arranges a game: every card starts in its own deck, unshuffled, and
 * `zones` says which cards some zones hold instead, bottom first. What those zones held before goes to the box.
 */
function arrange(zones: Record<string, string[]>) {
  let state: GameState = { ...fresh(), turn: { current: 'p0', phase: 'actions' } };
  for (const [zoneId, ids] of Object.entries(zones)) {
    state = relocate(state, zoneCards(state, zoneId).map((card) => card.id), 'box', game!);
    state = relocate(state, ids, zoneId, game!);
  }
  return createEngine(game!, lib, 2, markTurnStarted(state)).engine;
}

const namesIn = (state: GameState, zoneId: string) => zoneCards(state, zoneId).map(nameOf);

/** A long run gives up here; the Crash, among the last 8 growth cards, ends a game long before. */
const MAX_TURNS = 300;
const RECRUITS = ['recruit a junior software dev', 'recruit a junior hardware eng', 'recruit a junior qa tester'];
const RESEARCH_SEED = 'research the seed deck';
const RESEARCH_GROWTH = 'research the growth deck';
const END_ACTIONS = 'end their actions';
// The buttons that pick a card: one for each zone a card is hired, drafted, kept or discarded from.
const HIRE_AGENCY = 'hire a card from the agency row to their bench';
const HIRE_MARKET = 'hire a card from the open job market to their bench';
const DRAFT_SEED = 'draft a card from the seed market to their backlog';
const DRAFT_GROWTH = 'draft a card from the growth market to their backlog';
const DRAFT_POOL = 'draft a card from the open idea pool to their backlog';
const KEEP = 'keep a card in their research';
const DISCARD_BENCH = 'discard a card in their bench';
const DISCARD_BACKLOG = 'discard a card in their backlog';
/** The rows that keep only their 5 newest cards, letting the oldest go to the box. */
const POOLS = ['open-job-market', 'open-idea-pool'];
/** The rows each player has that only they can see. */
const OWN_ROWS = ['bench', 'backlog', 'research'];
/** The row each Cleanup phase discards from, and the button that discards from it. */
const CLEANUPS: Record<string, { row: string; discard: string }> = {
  'bench cleanup': { row: 'bench', discard: DISCARD_BENCH },
  'backlog cleanup': { row: 'backlog', discard: DISCARD_BACKLOG },
};
/** What each card left in a backlog costs at the end, by its tier: vaporware (ruling 24). */
const VAPORWARE: Record<string, number> = { 'Tier 1': 2, 'Tier 2': 5, 'Tier 3': 10 };
/** The actions each player has each turn, as the rules give them: what a seat has when its turn starts. */
const ACTIONS_EACH_TURN = 3;

/** The button of the phase `state` is in whose move type is `type`, as the game declares it. */
const buttonOf = (state: GameState, type: string) =>
  game!.phases.find((phase) => phase.id === state.turn?.phase)?.actions.find((action) => action.words === type);

/**
 * How an auto-player gets its growth ideas: by researching the growth deck, or by drafting from the growth market. A game that
 * drafts them runs the growth deck down only through the market's refills, so the Crash comes out there.
 */
type Style = 'researches' | 'drafts';

/** Sees each move of a long run, with the state before it and the state after. */
type Watch = (before: GameState, move: Move, after: GameState) => void;

/** Makes `move`, which the engine must accept, and shows it to `watch`. */
function play(engine: GameEngine, move: Move, watch: Watch): void {
  const before = engine.getState();
  const outcome = engine.dispatch(move);
  expect(outcome.ok, `${move.by} could not ${move.type} ${move.cardId ?? ''}: ${outcome.reason}`).toBe(true);
  watch(before, move, engine.getState());
}

/**
 * The cards `extras`, the page's view of `seat` in `state`, offers for the button `type`, once the view is checked against the
 * rules: they are the button's candidates, which are the cards of `zoneId` in slot order, each is named by its card's name, and
 * the button is allowed exactly when some card is.
 */
function viewedCards(
  runtime: LangRuntime, extras: SeatExtras, state: GameState, seat: PlayerId, type: string, zoneId: string,
): PickCardView[] {
  const at = `${seat}'s ${type} in ${state.turn!.phase}`;
  const button = extras.actions.find((action) => action.move === type);
  expect(button?.cards, `the cards the view offers for ${at}`).toBeDefined();
  const offered = button!.cards!.cards;
  const zone = zoneCards(state, zoneId);
  expect(cardCandidates(runtime, buttonOf(state, type)!, state, seat), `the candidates of ${at}`).toEqual(zone.map((card) => card.id));
  expect(offered.map((card) => card.id), `the cards the view offers for ${at}`).toEqual(zone.map((card) => card.id));
  expect(offered.map((card) => card.name), `the names the view gives the cards of ${at}`).toEqual(zone.map(nameOf));
  const some = offered.some((card) => card.allowed === true);
  expect(button!.allowed === true, `whether ${at} is allowed, with ${JSON.stringify(offered)}`).toBe(some);
  return offered;
}

/**
 * Takes the turn of the seat whose turn it is, the game's turn `t` (counted from 0), until the turn passes, the game ends or
 * the log holds `moves` moves. `a` counts the actions taken so far in this turn.
 *
 * - The first action is an Ideation, by `t % 4`: a growth idea (0 and 2), draft the growth market's first card (1), or (3) by
 *   `⌊t / 4⌋ % 3` research the seed deck, draft the seed market's first card or draft the open idea pool's first card. A growth
 *   idea researches the growth deck when the `style` researches, and drafts the growth market's first card when it drafts.
 *   When the rules refuse that, it tries researching the growth deck, drafting the growth market's first card, researching the
 *   seed deck and drafting the seed market's first card, in that order, and with none allowed it recruits instead.
 * - Each later action is a recruit, by `(t + a) % 4`: the Junior of kind `(t + a) % 3` (0), the first agency card it can pay
 *   for (1), the open job market's first card (2), or the end of its actions (3). When the rules refuse that, or there is no
 *   such card, it recruits that Junior, else ends its actions.
 * - In research it keeps the research row's card at `t` (mod the row's length); in each Cleanup it discards the row's first card.
 *
 * Without a `runtime` it finds the card a button picks in the zone. With one, it finds it as a player at the page would: among
 * the cards the page's view of the seat offers for the button (checked by `viewedCards`), and the view must allow the card it
 * presses and grey each card it passes over because the engine refuses it. It chooses the same card either way, so a game plays
 * the same.
 */
function playTurn(engine: GameEngine, t: number, style: Style, watch: Watch, moves: number, runtime: LangRuntime | null): void {
  const by = engine.getState().turn!.current;
  const cards = (zoneId: string) => zoneCards(engine.getState(), zoneId);
  const press = (type: string): Move => ({ type, by });
  /** The page's view of the seat, read once for each state a card is picked in. */
  let view: { of: GameState; extras: SeatExtras } | null = null;
  /** The view's word on each move whose card was found through the view. */
  const verdicts = new Map<Move, PickCardView>();
  /** The move that presses `type` with the card `which` finds among the cards of `zoneId`, or null when it finds none. */
  const pick = (type: string, zoneId: string, which: (row: CardState[]) => CardState | undefined): Move | null => {
    if (runtime === null) {
      const card = which(cards(zoneId));
      return card ? { type, cardId: card.id, by } : null;
    }
    const state = engine.getState();
    if (view?.of !== state) view = { of: state, extras: seatExtras(engine, runtime, state, by) };
    const offered = viewedCards(runtime, view.extras, state, by, type, zoneId);
    const card = which(offered.map((candidate) => cardById(state, candidate.id)!));
    if (!card) return null;
    const move: Move = { type, cardId: card.id, by };
    verdicts.set(move, offered.find((candidate) => candidate.id === card.id)!);
    return move;
  };
  const first = (type: string, zoneId: string) => pick(type, zoneId, (row) => row[0]);
  /**
   * Whether the engine accepts `move`. For a card found through the view, the view must say the same: the card the seat presses is
   * one the view allows, and each card it passes over because the engine refuses it is one the view greys.
   */
  const accepts = (move: Move): boolean => {
    const accepted = engine.canDispatch(move) === true;
    const verdict = verdicts.get(move);
    if (verdict) expect(verdict.allowed === true, `whether the view allows ${by}'s ${move.type} ${move.cardId}: ${verdict.allowed}`).toBe(accepted);
    return accepted;
  };
  const choose = (choices: (Move | null)[]): Move => {
    const move = choices.find((choice) => choice !== null && accepts(choice));
    if (!move) throw new Error(`${by} has no move in turn ${t}, phase ${engine.getState().turn!.phase}.`);
    return move;
  };
  const ideation = (): (Move | null)[] => {
    const seedSide = [press(RESEARCH_SEED), first(DRAFT_SEED, 'seed-market'), first(DRAFT_POOL, 'open-idea-pool')];
    const growth = style === 'drafts' ? first(DRAFT_GROWTH, 'growth-market') : press(RESEARCH_GROWTH);
    const planned = [growth, first(DRAFT_GROWTH, 'growth-market'), growth, seedSide[Math.floor(t / 4) % 3]];
    return [planned[t % 4], press(RESEARCH_GROWTH), first(DRAFT_GROWTH, 'growth-market'), press(RESEARCH_SEED), first(DRAFT_SEED, 'seed-market')];
  };
  const recruiting = (a: number): (Move | null)[] => {
    const capital = counterOf(engine.getState(), 'capital', by);
    const junior = press(RECRUITS[(t + a) % 3]);
    const affordable = pick(HIRE_AGENCY, 'agency-row', (row) => row.find((card) => (card.data?.cost as number) <= capital));
    const planned = [junior, affordable, first(HIRE_MARKET, 'open-job-market'), press(END_ACTIONS)];
    return [planned[(t + a) % 4], junior, press(END_ACTIONS)];
  };
  const going = () => {
    const state = engine.getState();
    return state.result === undefined && state.turn!.current === by && engine.getLog().length < moves;
  };
  for (let a = 0; going();) {
    const { phase } = engine.getState().turn!;
    if (phase === 'actions') {
      play(engine, choose(a === 0 ? [...ideation(), ...recruiting(a)] : recruiting(a)), watch);
      a++;
    } else if (phase === 'research') {
      play(engine, choose([pick(KEEP, zoneIdFor('research', by), (row) => row[t % row.length])]), watch);
    } else {
      const cleanup = CLEANUPS[phase!];
      if (cleanup === undefined) throw new Error(`The long runs don't play the ${phase} phase.`);
      play(engine, choose([first(cleanup.discard, zoneIdFor(cleanup.row, by))]), watch);
    }
  }
}

/** How a long run plays: until the log holds `moves` moves, and with `throughView` finding each card to pick through the page's view. */
type Run = { moves?: number; throughView?: boolean };

/**
 * Plays a game of `players` from Setup at `seed`, turn after turn, until it has a result, `MAX_TURNS` turns are played or the
 * log holds `moves` moves; the engine as it is then. At an odd seed every seat researches the growth deck for its growth ideas,
 * and at an even seed it drafts them from the growth market, so that the Crash comes out of each. With `throughView` each seat
 * finds the cards it picks through the page's view of it, as `playTurn` says.
 */
function playGame(players: number, seed: number, watch: Watch, { moves = Infinity, throughView = false }: Run = {}): GameEngine {
  const { engine, runtime } = createEngine(game!, lib, players, initialState(game!, seed));
  const style: Style = seed % 2 === 0 ? 'drafts' : 'researches';
  for (let t = 0; t < MAX_TURNS && engine.getState().result === undefined && engine.getLog().length < moves; t++) {
    playTurn(engine, t, style, watch, moves, throughView ? runtime : null);
  }
  return engine;
}

/** The seat of each turn in the log, in order: a turn is a run of moves by one seat, since no seat has two turns running. */
const turnsIn = (log: readonly Move[]): PlayerId[] =>
  log.filter((move, i) => i === 0 || move.by !== log[i - 1].by).map((move) => move.by as PlayerId);

/**
 * What else a move made happen that the tally counts: each card a pool let go of to the box, and the Market Crash reaching the
 * crash pile, by where it came from. A draft from the growth market draws the Crash only through the market's refill, and a
 * research of the growth deck only into the research row, so the move says which way it came.
 */
function happenings(before: GameState, move: Move, after: GameState): string[] {
  const boxed = new Set(zoneCards(before, 'box').map((c) => c.id));
  const newInBox = zoneCards(after, 'box').filter((c) => !boxed.has(c.id));
  const keys = POOLS.flatMap((pool) => {
    const held = new Set(zoneCards(before, pool).map((c) => c.id));
    return newInBox.filter((c) => held.has(c.id)).map(() => `${zoneInfo(game!, pool)!.spec.name} lets a card go to the box`);
  });
  if (zoneCards(before, 'crash-pile').length === 0 && zoneCards(after, 'crash-pile').length > 0) {
    const from = move.type === DRAFT_GROWTH ? 'from the growth market'
      : move.type === RESEARCH_GROWTH ? 'from a research row' : `after ${move.type}`;
    keys.push(`the Market Crash reaches the crash pile ${from}`);
  }
  return keys;
}

/** A score as ruling 24 counts it: a point for every 5 capital, less the backlog's vaporware. */
function scoreOf(state: GameState, seat: PlayerId): number {
  const vaporware = zoneCards(state, zoneIdFor('backlog', seat)).reduce((sum, card) => sum + VAPORWARE[card.data?.tier as string], 0);
  return Math.floor(counterOf(state, 'capital', seat) / 5) - vaporware;
}

/**
 * A watch that checks, after every move of a game at `seats` played from Setup:
 *
 * - Money is only paid to the bank, by the mover: 2 for a recruit, the card's cost for a hire from the agency row and 1 for one
 *   from the open job market, nothing for anything else, and no one else's capital changes.
 * - No zone holds more than it may: the agency row 4, each market 2, each pool 5 and the crash pile 1; the bench of a player
 *   whose turn it is not 5, their backlog 3 and their research nothing; the player whose turn it is holds at most 4 in their
 *   backlog and 3 in their research, which has cards only in the research phase.
 * - Each market refills at once: the agency row holds 4 and each product market 2 while its deck has cards, and the Market
 *   Crash is never anywhere but the growth deck or the crash pile.
 * - Each pool holds the 5 cards that entered it last, in the order they entered, every card it let go of is in the box, and
 *   nothing else ever goes there.
 * - Each turn that starts is the next seat's after the turn before, the first is the start player's, and a round starts with a
 *   turn exactly when that turn is the start player's.
 * - Every card in a player's bench, backlog or research shows its back to every other player and its face to its owner.
 */
function keepsTheRules(seats: PlayerId[]): Watch {
  const tableDef = tableDefFor(game!, seats);
  const owners = new Map(seats.flatMap((seat) => OWN_ROWS.map((row) => [zoneIdFor(row, seat), seat] as const)));
  /** Each pool's cards in the order they entered it, oldest first, less those taken or let go of. */
  let queues: Record<string, string[]> | null = null;
  /** The cards the pools have let go of. */
  const letGo: string[] = [];
  /** The seat whose turn started last. */
  let lastTurn: PlayerId | null = null;

  return (before, move, after) => {
    const by = move.by as PlayerId;
    const at = `after ${by}'s ${move.type}${move.cardId === undefined ? '' : ` ${move.cardId}`}`;
    const card = typeof move.cardId === 'string' ? cardById(before, move.cardId) : undefined;
    const from = card?.zoneId;
    const size = (zoneId: string) => zoneCards(after, zoneId).length;
    if (queues === null || lastTurn === null) {
      queues = Object.fromEntries(POOLS.map((pool) => [pool, zoneCards(before, pool).map((c) => c.id)]));
      lastTurn = before.data[TURN_OF_KEY] as PlayerId;
      expect(lastTurn, 'the first turn').toBe(startPlayerOf(before, seats));
      expect(before.data[ROUND_KEY], 'the round of the first turn').toBe(1);
    }

    // Money is paid to the bank only.
    const capital = (state: GameState, seat: PlayerId) => counterOf(state, 'capital', seat);
    const paid = RECRUITS.includes(move.type) ? 2
      : move.type === HIRE_AGENCY ? (card!.data?.cost as number)
        : move.type === HIRE_MARKET ? 1 : 0;
    const spent = seats.map((seat) => capital(before, seat) - capital(after, seat));
    expect(spent, `capital paid by ${seats.join(', ')} ${at}`).toEqual(seats.map((seat) => (seat === by ? paid : 0)));
    // No one pays what they don't have.
    const inDebt = seats.filter((seat) => capital(after, seat) < 0).map((seat) => `${seat} has ${capital(after, seat)} capital`);
    expect(inDebt, `capital below 0 ${at}`).toEqual([]);

    // No zone over its capacity.
    const atMost = (zoneId: string, most: number) => expect(size(zoneId), `${zoneId} ${at}`).toBeLessThanOrEqual(most);
    atMost('agency-row', 4);
    atMost('seed-market', 2);
    atMost('growth-market', 2);
    for (const pool of POOLS) atMost(pool, 5);
    atMost('crash-pile', 1);
    const { current, phase } = after.turn!;
    for (const seat of seats) {
      const own = (row: string) => zoneIdFor(row, seat);
      if (seat === current) {
        atMost(own('backlog'), 4);
        atMost(own('research'), 3);
        if (size(own('research')) > 0) expect(phase, `the phase while ${own('research')} has cards ${at}`).toBe('research');
      } else {
        atMost(own('bench'), 5);
        atMost(own('backlog'), 3);
        atMost(own('research'), 0);
      }
    }

    // Markets refill at once.
    const refilled = (row: string, deck: string, full: number) => {
      if (size(deck) > 0) expect(size(row), `${row} while ${deck} has cards ${at}`).toBe(full);
    };
    refilled('agency-row', 'talent-deck', 4);
    refilled('seed-market', 'seed-deck', 2);
    refilled('growth-market', 'growth-deck', 2);
    const crash = after.cards.find((c) => nameOf(c) === 'Market Crash')!;
    expect(['growth-deck', 'crash-pile'], `where the Market Crash is ${at}`).toContain(crash.zoneId);

    // The pools hold the 5 newest.
    const letGoNow: string[] = [];
    for (const pool of POOLS) {
      const queue = queues[pool];
      // A card hired or drafted from a pool leaves it from wherever it sits.
      if (from === pool) {
        expect(queue, `${pool} ${at}`).toContain(card!.id);
        queue.splice(queue.indexOf(card!.id), 1);
      }
      const held = new Set(zoneCards(before, pool).map((c) => c.id));
      const holds = zoneCards(after, pool).map((c) => c.id);
      queue.push(...holds.filter((id) => !held.has(id)));
      letGoNow.push(...queue.splice(0, Math.max(0, queue.length - 5)));
      expect(holds, `${pool}, oldest first, ${at}`).toEqual(queue);
    }
    letGo.push(...letGoNow);
    const boxed = new Set(zoneCards(before, 'box').map((c) => c.id));
    const box = zoneCards(after, 'box').map((c) => c.id);
    expect(letGo.filter((id) => !box.includes(id)), `cards a pool let go of that are not in the box ${at}`).toEqual([]);
    // Only the pools fill the box, and only with their oldest cards: a pool that let go of a card the moment it entered would
    // show the same 5 cards as before, so this is what catches it.
    // This assumes only the pools send cards to the box, as in slice 1a; a later slice that boxes cards some other way must widen it.
    expect(box.filter((id) => !boxed.has(id)).sort(), `cards new in the box ${at}`).toEqual(letGoNow.sort());

    // Turns: a turn starts when the turn marker becomes a seat, from no seat or from another one.
    const turnOf = after.data[TURN_OF_KEY];
    const started = typeof turnOf === 'string' && turnOf !== before.data[TURN_OF_KEY];
    const rounds = (after.data[ROUND_KEY] as number) - (before.data[ROUND_KEY] as number);
    if (started) {
      expect(turnOf, `the turn that started ${at}`).toBe(seats[(seats.indexOf(lastTurn) + 1) % seats.length]);
      lastTurn = turnOf;
    }
    expect(rounds, `rounds started ${at}`).toBe(started && turnOf === startPlayerOf(after, seats) ? 1 : 0);

    // Hidden zones: only the owner sees the face of a card in their bench, backlog or research.
    for (const viewer of seats) {
      const wrong = deriveScene(tableDef, { cards: after.cards }, viewer).cards
        .filter((c) => owners.has(c.zoneId) && (c.faceKey === HIDDEN_FACE_KEY) !== (owners.get(c.zoneId) !== viewer))
        .map((c) => `${c.id} in ${c.zoneId}`);
      expect(wrong, `cards ${viewer} sees wrongly ${at}`).toEqual([]);
    }
  };
}

/**
 * A watch that checks, after every move of a game at `seats`, that actions are spent only through cost lines: the mover's actions
 * go down by what the button they pressed costs in the phase it was pressed in, nothing for a button with no cost line, except that
 * ending their actions leaves them none. Every other seat's actions stay as they were, but for the seat whose turn the move started,
 * which has its 3.
 */
function keepsTheBudget(seats: PlayerId[]): Watch {
  return (before, move, after) => {
    const by = move.by as PlayerId;
    const at = `after ${by}'s ${move.type}${move.cardId === undefined ? '' : ` ${move.cardId}`}`;
    const actions = (state: GameState, seat: PlayerId) => counterOf(state, 'actions', seat);
    const cost = buttonOf(before, move.type)?.cost?.amount ?? 0;
    const turnOf = after.data[TURN_OF_KEY];
    const started = typeof turnOf === 'string' && turnOf !== before.data[TURN_OF_KEY] ? turnOf : null;
    const expected = seats.map((seat) => {
      if (seat === by) return move.type === END_ACTIONS ? 0 : actions(before, by) - cost;
      return seat === started ? ACTIONS_EACH_TURN : actions(before, seat);
    });
    expect(seats.map((seat) => actions(after, seat)), `actions of ${seats.join(', ')} ${at}`).toEqual(expected);
  };
}

describe('Startup Simulator (designer language)', () => {
  it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));

  it('passes every example', () => {
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(24);
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
  });

  describe('the cards (§20)', () => {
    it('has 87 cards: 22 talent, 30 seed products, and 34 growth products with the Market Crash', () => {
      const { cards } = fresh();
      expect(cards).toHaveLength(87);
      expect(inZone(cards, 'talent-deck')).toHaveLength(22);
      expect(inZone(cards, 'seed-deck')).toHaveLength(30);
      expect(inZone(cards, 'growth-deck')).toHaveLength(35);
    });

    it('has the talent deck of §20.B.1, with its costs and salaries', () => {
      const talents = inZone(fresh().cards, 'talent-deck');
      expect(nameCounts(talents)).toEqual({
        Hacker: 1, Architect: 1, Veteran: 1, Diva: 1, Engineer: 1, Fixer: 1, 'Firmware Specialist': 2, 'Full Stack Ninja': 2,
        'QA Engineer': 3, 'Sales Rep': 3, 'HR Manager': 2, 'Junior PM': 2, 'Senior PM': 1, 'Growth Hacker': 1,
      });
      expect(sum(talents, 'cost')).toBe(122);
      expect(sum(talents, 'salary')).toBe(33);
    });

    it('reads a talent card’s columns, and leaves out the skill a Specialist has none of', () => {
      expect(talent('Hacker').data).toEqual({
        name: 'Hacker', cost: 6, skill: 'software', output: 3, salary: 2, role: 'Senior Developer', trait: 'Spaghetti Code',
      });
      expect(talent('QA Engineer').data).not.toHaveProperty('skill');
    });

    it('has the 30 Tier 1 products of the seed deck (§20.C.1, §20.F.1)', () => {
      const seeds = inZone(fresh().cards, 'seed-deck');
      expect(seeds).toHaveLength(30);
      expect(new Set(seeds.map(nameOf)).size).toBe(30);
      expect(seeds.every((card) => card.data?.tier === 'Tier 1')).toBe(true);
      expect(sums(seeds)).toEqual({ 'blue cost': 122, 'red cost': 36, rev: 58, val: 68, 'blue maint': 23, 'red maint': 8 });
    });

    it('has the 34 Tier 2 and Tier 3 products of the growth deck and the Market Crash (§20.C.2, §20.F.2–3)', () => {
      const growth = inZone(fresh().cards, 'growth-deck');
      expect(growth).toHaveLength(35);
      expect(growth.filter((card) => card.data?.tier === 'Tier 2')).toHaveLength(25);
      expect(growth.filter((card) => card.data?.tier === 'Tier 3')).toHaveLength(9);
      const crashes = growth.filter((card) => nameOf(card) === 'Market Crash');
      expect(crashes.map((card) => card.data)).toEqual([{ name: 'Market Crash' }]);
      const products = growth.filter((card) => nameOf(card) !== 'Market Crash');
      expect(sums(products)).toEqual({ 'blue cost': 315, 'red cost': 170, rev: 188, val: 369, 'blue maint': 45, 'red maint': 30 });
    });

    it('deals the Market Crash as one of the growth products, so its id is one of theirs', () => {
      const growthSets = game!.cards.filter((set) => set.start === 'growth deck');
      expect(growthSets.map((set) => set.identities.length)).toEqual([35]);
      expect(growthSets[0].identities.filter(({ attrs }) => attrs.name === 'Market Crash').map(({ attrs }) => attrs)).toEqual([{ name: 'Market Crash' }]);
    });

    it('gives the Market Crash an id that changes with the seed, so no seat can follow it through the growth deck by its id', () => {
      const crashIds = Array.from({ length: 10 }, (_, i) => fresh(i + 1).cards.find((card) => nameOf(card) === 'Market Crash')!.id);
      expect(new Set(crashIds).size, crashIds.join(', ')).toBeGreaterThanOrEqual(2);
      const growthSet = game!.cards.find((set) => set.start === 'growth deck');
      for (const id of crashIds) expect(deckOf(game!.cards, id), id).toBe(growthSet);
    });

    it('gives every product a number for each cost and maintenance, 0 where it needs none of that color (C4)', () => {
      const { cards } = fresh();
      const products = [...inZone(cards, 'seed-deck'), ...inZone(cards, 'growth-deck')].filter((card) => nameOf(card) !== 'Market Crash');
      expect(products).toHaveLength(64);
      for (const card of products) {
        for (const column of CUBES) expect(typeof card.data?.[column], `${nameOf(card)}'s ${column}`).toBe('number');
      }
    });

    it('reads what a product requires and provides, and leaves out what it has none of', () => {
      expect(product('The Metaverse').data).toMatchObject({ requires: 'Media', 'also requires': 'Cloud', tag: 'Metaverse' });
      expect(product('DAO Nation').data).not.toHaveProperty('tag');
      expect(product('Smart Lock').data).not.toHaveProperty('requires');
    });

    it('has the three University stacks, which never run out (§20.B.2)', () => {
      const endless = game!.cards.filter((set) => set.kind === 'endless');
      expect(endless.map((set) => set.identities.map((identity) => identity.attrs.name))).toEqual(JUNIORS.map((name) => [name]));
    });
  });

  it('lays out the table: each player’s bench, backlog and research are rows only they can see', () => {
    const zones = game!.zones.map(({ name, perPlayer, layout, visibility }) => [zoneIdFor(name), perPlayer, layout, visibility]);
    expect(zones).toEqual([
      ['talent-deck', false, 'pile', 'secret'],
      ['agency-row', false, 'row', 'public'],
      ['open-job-market', false, 'row', 'public'],
      ['seed-deck', false, 'pile', 'secret'],
      ['growth-deck', false, 'pile', 'secret'],
      ['seed-market', false, 'row', 'public'],
      ['growth-market', false, 'row', 'public'],
      ['open-idea-pool', false, 'row', 'public'],
      ['crash-pile', false, 'pile', 'public'],
      ['box', false, 'pile', 'secret'],
      ['bench', true, 'row', 'owner'],
      ['backlog', true, 'row', 'owner'],
      ['research', true, 'row', 'owner'],
    ]);
  });

  describe('setup (§4)', () => {
    const counts = [2, 3, 4, 5];
    const seeds = Array.from({ length: 10 }, (_, i) => i + 1);

    it.each(counts)('sets up a table of %i players at every seed', (players) => {
      for (const seed of seeds) {
        const state = setUp(players, seed);
        const at = `${players} players, seed ${seed}`;
        const start = state.data[START_PLAYER_KEY];
        expect({ current: state.turn?.current, phase: state.turn?.phase }, at).toEqual({ current: start, phase: 'actions' });
        expect(state.data[ROUND_KEY], at).toBe(1);

        const growth = zoneCards(state, 'growth-deck');
        const crashAt = growth.findIndex((card) => nameOf(card) === 'Market Crash');
        expect(crashAt, at).toBeGreaterThanOrEqual(0);
        expect(crashAt, at).toBeLessThan(CRASH_REACH);

        for (let p = 0; p < players; p++) {
          expect(zoneCards(state, `bench-p${p}`).map(nameOf), `${at}, p${p}'s bench`).toEqual(JUNIORS);
          const backlog = zoneCards(state, `backlog-p${p}`);
          expect(backlog.map((card) => [card.faceUp, card.data?.tier]), `${at}, p${p}'s backlog`).toEqual([[false, 'Tier 1']]);
        }
        expect(zoneCards(state, 'agency-row'), at).toHaveLength(4);
        expect(zoneCards(state, 'seed-market'), at).toHaveLength(2);
        expect(zoneCards(state, 'growth-market'), at).toHaveLength(2);
      }
    });

    it('makes the Juniors after the 87 dealt cards, c87 to c95 at 3 players', () => {
      const state = setUp(3, 1);
      const ids = [0, 1, 2].flatMap((p) => zoneCards(state, `bench-p${p}`)).map((card) => Number(card.id.slice(1)));
      expect(ids.sort((a, b) => a - b)).toEqual(Array.from({ length: 9 }, (_, i) => 87 + i));
      expect(state.data[NEXT_CARD_KEY]).toBe(96);
    });

    it('chooses the start player at random', () => {
      const starts = new Set(Array.from({ length: 20 }, (_, i) => setUp(5, i + 1).data[START_PLAYER_KEY]));
      expect(starts.size).toBeGreaterThanOrEqual(3);
    });

    it.each([1, 6])('is for 2 to 5 players, not %i (ruling 25)', (players) => {
      expect(() => createEngine(game!, lib, players, initialState(game!, 1))).toThrow('This game is for 2 to 5 players.');
    });
  });

  describe('decks that run short', () => {
    it('researches a seed deck of 2 cards, shows both and keeps 1 (§14.A.2)', () => {
      const engine = arrange({
        'seed-market': [idOf('Basic Website'), idOf('USB Gadget')],
        'seed-deck': [idOf('To-Do List'), idOf('Flashlight App')],
      });
      expect(engine.dispatch({ type: 'research the seed deck', by: 'p0' }).ok).toBe(true);

      const researching = engine.getState();
      expect(researching.turn).toMatchObject({ current: 'p0', phase: 'research' });
      expect(namesIn(researching, 'research-p0')).toEqual(['To-Do List', 'Flashlight App']);
      expect(zoneCards(researching, 'seed-deck')).toEqual([]);

      expect(engine.dispatch({ type: KEEP, by: 'p0', cardId: idOf('Flashlight App') }).ok).toBe(true);
      const kept = engine.getState();
      expect(namesIn(kept, 'backlog-p0')).toEqual(['Flashlight App']);
      expect(namesIn(kept, 'open-idea-pool')).toEqual(['To-Do List']);
      expect(zoneCards(kept, 'research-p0')).toEqual([]);
      expect(kept.turn).toMatchObject({ current: 'p0', phase: 'actions' });
      expect(counterOf(kept, 'actions', 'p0')).toBe(2);
    });

    it('leaves the agency row at 3 cards when the talent deck is empty (§13)', () => {
      const engine = arrange({ 'talent-deck': [], 'agency-row': ['Hacker', 'Architect', 'Veteran', 'Diva'].map(idOf) });
      expect(engine.dispatch({ type: HIRE_AGENCY, by: 'p0', cardId: idOf('Hacker') }).ok).toBe(true);

      const state = engine.getState();
      expect(namesIn(state, 'agency-row')).toEqual(['Architect', 'Veteran', 'Diva']);
      expect(zoneCards(state, 'talent-deck')).toEqual([]);
      expect(namesIn(state, 'bench-p0')).toEqual(['Hacker']);
    });
  });

  it('sets the Market Crash aside when it is the last growth card, and ends the game once the round is finished (§12)', () => {
    const engine = arrange({
      'growth-market': [idOf('Neobank'), idOf('Search Engine')],
      'growth-deck': [idOf('Market Crash')],
    });
    expect(engine.dispatch({ type: DRAFT_GROWTH, by: 'p0', cardId: idOf('Neobank') }).ok).toBe(true);

    const drafted = engine.getState();
    expect(namesIn(drafted, 'crash-pile')).toEqual(['Market Crash']);
    expect(namesIn(drafted, 'growth-market')).toEqual(['Search Engine']);
    expect(zoneCards(drafted, 'growth-deck')).toEqual([]);
    expect(drafted.result).toBeUndefined();

    expect(engine.dispatch({ type: 'end their actions', by: 'p0' }).ok).toBe(true);
    expect(engine.getState().turn?.current).toBe('p1');
    expect(engine.getState().result).toBeUndefined();
    expect(engine.dispatch({ type: 'end their actions', by: 'p1' }).ok).toBe(true);
    expect(engine.getState().result).toBeDefined();
  });

  it('shows the bench, the backlog and the research row only to their owner (§14)', () => {
    const engine = arrange({
      'bench-p0': [idOf('Hacker'), idOf('Sales Rep')],
      'backlog-p0': [idOf('Smart Lock')],
      'seed-market': [idOf('To-Do List'), idOf('Flashlight App')],
      'seed-deck': [idOf('Dating App'), idOf('Mobile Wallet'), idOf('Messaging App')],
    });
    expect(engine.dispatch({ type: 'research the seed deck', by: 'p0' }).ok).toBe(true);

    const { cards } = engine.getState();
    const tableDef = tableDefFor(game!, seatsFor(2));
    const hidden = ['research-p0', 'bench-p0', 'backlog-p0'];
    const ownCards = cards.filter((card) => hidden.includes(card.zoneId));
    expect(ownCards.map((card) => card.zoneId).sort()).toEqual([
      'backlog-p0', 'bench-p0', 'bench-p0', 'research-p0', 'research-p0', 'research-p0',
    ]);

    const seen = (viewer: string) => deriveScene(tableDef, { cards }, viewer).cards.filter((card) => hidden.includes(card.zoneId));
    expect(seen('p1').map((card) => card.faceKey)).toEqual(ownCards.map(() => HIDDEN_FACE_KEY));
    expect(seen('p0').map((card) => card.faceKey)).toEqual(ownCards.map((card) => card.faceKey));
    expect(ownCards.every((card) => card.faceKey !== HIDDEN_FACE_KEY)).toBe(true);
  });

  describe('long runs, with every rule kept after every move', () => {
    /** How many times the runs below made each move, by its type, and saw each happening: see `happenings`. */
    const tally: Record<string, number> = {};

    it.each([2, 3, 4, 5])('plays %i players to the Market Crash and a score at seeds 1 to 5, seed 1 through the page’s view', (players) => {
      const seats = seatsFor(players);
      for (let seed = 1; seed <= 5; seed++) {
        const where = `${players} players, seed ${seed}`;
        const rules = keepsTheRules(seats);
        const budget = keepsTheBudget(seats);
        const engine = playGame(players, seed, (before, move, after) => {
          rules(before, move, after);
          budget(before, move, after);
          for (const key of [move.type, ...happenings(before, move, after)]) tally[key] = (tally[key] ?? 0) + 1;
        }, { throughView: seed === 1 });
        const state = engine.getState();
        const turns = turnsIn(engine.getLog());
        expect(state.result, `${where}: the result after ${turns.length} turns`).toBeDefined();
        expect(turns.length, where).toBeLessThanOrEqual(MAX_TURNS);
        expect(namesIn(state, 'crash-pile'), where).toEqual(['Market Crash']);

        // The game ends once the round is finished: every seat has had as many turns, the start player's left neighbour last.
        expect(turns.length % players, `${where}: ${turns.length} turns`).toBe(0);
        const start = seats.indexOf(startPlayerOf(state, seats));
        expect(turns.at(-1), where).toBe(seats[(start + players - 1) % players]);
        // A round was counted for each one played, and none for the one the Crash keeps from starting.
        expect(state.data[ROUND_KEY], `${where}: rounds after ${turns.length} turns`).toBe(turns.length / players);

        const scores = Object.fromEntries(seats.map((seat) => [seat, scoreOf(state, seat)]));
        const top = Math.max(...Object.values(scores));
        const winners = seats.filter((seat) => scores[seat] === top);
        expect(state.result, where).toEqual({ scores, winner: winners[0], winners });
      }
    }, 60_000);

    it('made every move in those runs, and the idea pool let cards go and the Crash came out of the market and of research', () => {
      const every = [
        ...RECRUITS, HIRE_AGENCY, HIRE_MARKET, DRAFT_SEED, DRAFT_GROWTH, DRAFT_POOL,
        RESEARCH_SEED, RESEARCH_GROWTH, KEEP, END_ACTIONS, DISCARD_BENCH, DISCARD_BACKLOG,
        'open idea pool lets a card go to the box',
        'the Market Crash reaches the crash pile from the growth market', 'the Market Crash reaches the crash pile from a research row',
      ];
      expect(every.filter((key) => !(tally[key] > 0)), `never made or seen: ${JSON.stringify(tally)}`).toEqual([]);
    });

    it('a refused press spends nothing', () => {
      const setup = setUp(2, 1);
      const start = setup.turn!.current;
      // With no capital the start player can pay for no agency card, though the hire's 1 action is theirs to spend.
      const { engine, runtime } = createEngine(game!, lib, 2, setCounter(setup, 'capital', start, 0));
      const state = engine.getState();
      expect(state.turn).toMatchObject({ current: start, phase: 'actions' });
      expect(counterOf(state, 'actions', start)).toBe(ACTIONS_EACH_TURN);
      expect(hasCost(buttonOf(state, HIRE_AGENCY)!)).toBe(true);
      const agency = zoneCards(state, 'agency-row');
      expect(agency).toHaveLength(4);

      const refusal = "they have at least the card's cost in capital";
      for (const card of agency) {
        expect(engine.canDispatch({ type: HIRE_AGENCY, by: start, cardId: card.id }), `hiring the ${nameOf(card)}`).toBe(refusal);
      }
      const button = seatExtras(engine, runtime, state, start).actions.find((action) => action.move === HIRE_AGENCY)!;
      expect(button.allowed).toBe(refusal);
      expect(button.cards!.cards.map((card) => card.allowed)).toEqual(agency.map(() => refusal));

      const outcome = engine.dispatch({ type: HIRE_AGENCY, by: start, cardId: agency[0].id });
      expect(outcome).toMatchObject({ ok: false, reason: refusal });
      expect(counterOf(engine.getState(), 'actions', start)).toBe(ACTIONS_EACH_TURN);
      expect(engine.getState()).toEqual(state);
    });

    it('takes back every move with undo, and rebuilds the game from its log, through recruits and research (3 players, seed 1)', () => {
      const states: GameState[] = [];
      const engine = playGame(3, 1, (_before, _move, after) => states.push(after), { moves: 40 });
      const log = [...engine.getLog()];
      expect(log).toHaveLength(40);
      expect(states).toHaveLength(40);
      // A recruit makes a Junior whose id comes from the state, and a research deals and keeps a card, so both must replay.
      expect(log.some((move) => RECRUITS.includes(move.type))).toBe(true);
      expect(log.some((move) => move.type === RESEARCH_SEED || move.type === RESEARCH_GROWTH)).toBe(true);

      const fresh = () => createEngine(game!, lib, 3, initialState(game!, 1)).engine;
      const replayed = fresh();
      replayed.loadLog(log);
      expect(replayed.getState()).toEqual(engine.getState());

      for (let i = states.length - 2; i >= 0; i--) {
        engine.undo();
        expect(engine.getState(), `after undoing back to move ${i + 1}`).toEqual(states[i]);
      }
      engine.undo();
      expect(engine.getState()).toEqual(fresh().getState());
    });
  });
});
