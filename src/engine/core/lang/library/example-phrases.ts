import type { GameState } from '../../game-state';
import { zoneCards } from '../zone-index';
import type { CardState } from '../../scene';
import type { Json } from '../../table-def';
import { isSaysColumn } from '../cards';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { STANDARD_RANKS, STANDARD_SUITS } from '../refs';
import { TURN_OF_KEY, usesTurns } from '../turns';
import type {
  ActionFn, CardMatch, CompiledGame, DeclaredMove, EffectFn, ExampleEnv, ExpectFn, PhraseEnv, ZoneRef,
} from '../types';
import { BOX_ZONE, handZoneOf, matchesCard, relocate, resolveZoneIds, topCard } from '../zones';
import { describeZone, seatOf, soleZone } from './support';

/** Lets a reason written by a designer be compared with the friendly one the game gave. */
export function normalizeReason(s: string): string {
  return s.trim().toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\.$/, '');
}

// ---- reading the example's surroundings --------------------------------------------------------

function exampleOf(env: PhraseEnv): ExampleEnv {
  if (!env.example) throw new RuleError('This step only works inside an example.');
  return env.example;
}

/** What happened to the move the example's “When” line made. */
function lastMove(env: PhraseEnv): NonNullable<ExampleEnv['last']> {
  const { last } = exampleOf(env);
  if (!last) throw new RuleError('No move has been made yet. Add a “When …” line before this one.');
  return last;
}

// ---- saying cards and lists the way a designer does --------------------------------------------

const RANK_NAMES = new Map(Object.entries(STANDARD_RANKS).map(([name, rank]) => [rank, name] as const));
const SUIT_NAMES = new Map(Object.entries(STANDARD_SUITS).map(([name, letter]) => [letter, name] as const));

/** “the queen of spades”, “a red 7”. */
export function describeCard(match: CardMatch): string {
  const rank = RANK_NAMES.get(match.rank as number);
  const suit = SUIT_NAMES.get(match.suit as string);
  if (rank !== undefined && suit !== undefined && Object.keys(match).length === 2) return `the ${rank} of ${suit}`;
  const words = Object.values(match).join(' ');
  if (words === '') return 'a card';
  return `${/^[aeiou]/i.test(words) ? 'an' : 'a'} ${words}`;
}

const joinAnd = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

const countOf = (n: number) => `${n} ${n === 1 ? 'card' : 'cards'}`;

/**
 * The attributes that make up a card's face in this game, so bookkeeping like who played it is left out. What a card says is
 * left out too: a card is named by its name, not by its rules.
 */
export function describeCards(cards: CardState[], game: CompiledGame): string {
  const keys = [...new Set(game.cards.flatMap((set) => set.identities.flatMap((i) => Object.keys(i.attrs))))].filter((key) => !isSaysColumn(key));
  return joinAnd(cards.map((card) => describeCard(Object.fromEntries(
    keys.flatMap((key) => (card.data?.[key] === undefined ? [] : [[key, card.data[key] as Json]])),
  ))));
}

/** Can each wanted card be matched to a different card, using up all of them? A general match may stand for a particular card. */
export function coversExactly(cards: CardState[], wanted: CardMatch[]): boolean {
  if (cards.length !== wanted.length) return false;
  const takenBy: number[] = cards.map(() => -1);
  const place = (w: number, tried: boolean[]): boolean =>
    cards.some((card, c) => {
      if (tried[c] || !matchesCard(card, wanted[w])) return false;
      tried[c] = true;
      if (takenBy[c] !== -1 && !place(takenBy[c], tried)) return false;
      takenBy[c] = w;
      return true;
    });
  return wanted.every((_, w) => place(w, cards.map(() => false)));
}

// ---- given: arranging the table ----------------------------------------------------------------

/** The ids of a card for each match, in order, each one no other line of the example has claimed, and the state with any made card in. */
export function claimCards(env: PhraseEnv, wanted: CardMatch[], from: GameState): { ids: string[]; state: GameState } {
  const example = exampleOf(env);
  let state = from;
  const ids: string[] = [];
  // A claim that makes a card hands back the state with it in, which the next claim must see: it takes the next id.
  for (const match of wanted) {
    const claim = example.claim(match, describeCard(match), state);
    ids.push(claim.id);
    state = claim.state;
  }
  return { ids, state };
}

/** Replaces what a zone holds: its cards leave the game, then these cards are claimed and put there in order. */
function fill(env: PhraseEnv, zoneId: string, wanted: CardMatch[]): GameState {
  const emptied = relocate(env.state, zoneCards(env.state, zoneId).map((c) => c.id), BOX_ZONE, env.game);
  const { ids, state } = claimCards(env, wanted, emptied);
  return relocate(state, ids, zoneId, env.game);
}

const phaseIs: EffectFn = (env, args) => ({
  ...env.state,
  turn: { current: env.seats[0], ...env.state.turn, phase: args[0] as string },
});

/** In a game of rounds, the arranged turn has started already: building the engine must not start it again over the Given lines. */
const turnIs: EffectFn = (env, args) => {
  const seat = seatOf(env, args[0]);
  const state: GameState = { ...env.state, turn: { ...env.state.turn, current: seat } };
  return usesTurns(env.game) ? { ...state, data: { ...state.data, [TURN_OF_KEY]: seat } } : state;
};

const holds: EffectFn = (env, args) => {
  const [seat, wanted] = args as [string, CardMatch[]];
  return fill(env, handZoneOf(env.game, seatOf(env, seat)), wanted);
};

const zoneHas: EffectFn = (env, args) => {
  const [ref, wanted] = args as [ZoneRef, CardMatch[]];
  return fill(env, soleZone(ref, env), wanted);
};

const zoneIsEmpty: EffectFn = (env, args) => {
  const ids = resolveZoneIds(args[0] as ZoneRef, env).flatMap((zoneId) => zoneCards(env.state, zoneId).map((c) => c.id));
  return relocate(env.state, ids, BOX_ZONE, env.game);
};

const played: EffectFn = (env, args) => {
  const [seat, match, ref] = args as [string, CardMatch, ZoneRef];
  const by = seatOf(env, seat);
  const zoneId = soleZone(ref, env, by);
  const { id: cardId, state } = exampleOf(env).claim(match, describeCard(match), env.state);
  const moved = relocate(state, [cardId], zoneId, env.game);
  return { ...moved, cards: moved.cards.map((c) => (c.id === cardId ? { ...c, data: { ...c.data, movedBy: by } } : c)) };
};

// ---- action: a player moves a card -------------------------------------------------------------

const CARD_NUMBER = /^c(\d+)$/;

/** Card ids in numeric order: c3 comes before c12. */
export function byCardId(a: CardState, b: CardState): number {
  const [x, y] = [CARD_NUMBER.exec(a.id), CARD_NUMBER.exec(b.id)];
  if (x && y) return Number(x[1]) - Number(y[1]);
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** The first move this phase declares for the verb. */
function declaredMove(env: PhraseEnv, verb: string): DeclaredMove | undefined {
  return env.game.phases.find((p) => p.id === env.state.turn?.phase)?.moves.find((m) => m.verb === verb);
}

/** A named card: from the player's own source zone if it is there, else from anywhere in the game, so the game can refuse it. */
const moveNamedCard: ActionFn = (env, args) => {
  const [seat, verb, match] = args as [string, string, CardMatch];
  const by = seatOf(env, seat);
  const declared = declaredMove(env, verb);
  const own = declared ? resolveZoneIds(declared.from, env, by) : [];
  const inPlay = env.state.cards.filter((c) => c.zoneId !== BOX_ZONE && matchesCard(c, match)).sort(byCardId);
  const card = inPlay.find((c) => own.includes(c.zoneId)) ?? inPlay[0];
  if (!card) throw new RuleError(`I can't find ${describeCard(match)} for ${by} to ${verb}.`);
  return { by, move: { type: verb, cardId: card.id } };
};

/** “a card”: whatever is on top of the zone the move takes from. */
const moveTopCard: ActionFn = (env, args) => {
  const [seat, verb] = args as [string, string];
  const by = seatOf(env, seat);
  const declared = declaredMove(env, verb);
  if (!declared) {
    const phase = env.state.turn?.phase;
    throw new RuleError(`Nobody can ${verb} ${phase === undefined ? 'before a phase has started' : `in the ${phase} phase`}.`);
  }
  const top = topCard(env.state, soleZone(declared.from, env, by));
  if (!top) throw new RuleError(`${by} can't ${verb} a card because ${describeZone(declared.from)} is empty.`);
  return { by, move: { type: verb, cardId: top.id } };
};

// ---- expect: judging the move ------------------------------------------------------------------

const isAccepted: ExpectFn = (env) => {
  const last = lastMove(env);
  if (last.ok) return true;
  return `Expected the move to be accepted, but it was rejected${last.reason ? `: ${last.reason}` : '.'}`;
};

const isRejected: ExpectFn = (env) =>
  lastMove(env).ok ? 'Expected the move to be rejected, but it was accepted.' : true;

const isRejectedBecause: ExpectFn = (env, args) => {
  const text = args[0] as string;
  const last = lastMove(env);
  if (!last.ok && last.reason !== undefined && normalizeReason(last.reason) === normalizeReason(text)) return true;
  const instead = last.ok ? 'it was accepted' : last.reason === undefined ? 'no reason was given' : `the reason was “${last.reason}”`;
  return `Expected it to be rejected because “${text}”, but ${instead}.`;
};

// ---- expect: the state of the table ------------------------------------------------------------

const turnIsExpected: ExpectFn = (env, args) => {
  const seat = seatOf(env, args[0]);
  const current = env.state.turn?.current;
  if (current === seat) return true;
  return `Expected it to be ${seat}'s turn, but ${current === undefined ? "nobody's turn has started" : `it is ${current}'s turn`}.`;
};

const phaseIsExpected: ExpectFn = (env, args) => {
  const phase = env.state.turn?.phase;
  if (phase === args[0]) return true;
  return `Expected the phase to be ${args[0]}, but ${phase === undefined ? 'no phase has started' : `it is ${phase}`}.`;
};

const holdsCount: ExpectFn = (env, args) => {
  const seat = seatOf(env, args[0]);
  const wanted = args[1] as number;
  const have = zoneCards(env.state, handZoneOf(env.game, seat)).length;
  return have === wanted ? true : `Expected ${seat} to hold ${countOf(wanted)}, but they hold ${countOf(have)}.`;
};

const zoneHasExactly: ExpectFn = (env, args) => {
  const [ref, wanted] = args as [ZoneRef, CardMatch[]];
  const cards = zoneCards(env.state, soleZone(ref, env));
  if (coversExactly(cards, wanted)) return true;
  const actual = cards.length === 0 ? 'it is empty' : `it has ${describeCards(cards, env.game)}`;
  return `Expected ${describeZone(ref)} to have ${joinAnd(wanted.map(describeCard))}, but ${actual}.`;
};

/** The zone's cards from the bottom are as many as the wanted ones and each is the kind wanted in its place. */
const zoneHasInOrder: ExpectFn = (env, args) => {
  const [ref, wanted] = args as [ZoneRef, CardMatch[]];
  const cards = zoneCards(env.state, soleZone(ref, env));
  if (cards.length === wanted.length && cards.every((card, at) => matchesCard(card, wanted[at]))) return true;
  const actual = cards.length === 0 ? 'it is empty' : `it has ${describeCards(cards, env.game)}`;
  return `Expected ${describeZone(ref)} to have ${joinAnd(wanted.map(describeCard))}, in that order, but ${actual}.`;
};

/** Whether the first card of that kind, counted from the bottom, is within the bottom few cards of the zone. */
const cardIsAmongBottom: ExpectFn = (env, args) => {
  const [match, count, ref] = args as [CardMatch, number, ZoneRef];
  const place = zoneCards(env.state, soleZone(ref, env)).findIndex((card) => matchesCard(card, match));
  if (place >= 0 && place < count) return true;
  const actual = place < 0
    ? `${describeZone(ref)} has no ${describeCard(match).replace(/^(?:an?|the) /, '')}`
    : `it is card ${place + 1} from the bottom`;
  return `Expected ${describeCard(match)} to be among the bottom ${count} cards of ${describeZone(ref)}, but ${actual}.`;
};

/** Whether the card at one end of a zone is the named one; otherwise what an example should say about it. */
const endCardIs = (end: 'top' | 'bottom', pick: (state: GameState, zoneId: string) => CardState | undefined): ExpectFn => (env, args) => {
  const [ref, match] = args as [ZoneRef, CardMatch];
  const found = pick(env.state, soleZone(ref, env));
  if (found && matchesCard(found, match)) return true;
  const actual = found ? `it is ${describeCards([found], env.game)}` : `${describeZone(ref)} is empty`;
  return `Expected the ${end} card of ${describeZone(ref)} to be ${describeCard(match)}, but ${actual}.`;
};

const topCardIs = endCardIs('top', topCard);

/** The first card in slot order, as the card on top is the last. */
const bottomCardIs = endCardIs('bottom', (state, zoneId) => zoneCards(state, zoneId)[0]);

// ---- expect: how the game ended ----------------------------------------------------------------

const NOT_ENDED = "The game hasn't ended.";

const asRecord = (value: Json | undefined): { [k: string]: Json } | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;

const scoresExpected: ExpectFn = (env, args) => {
  const seat = seatOf(env, args[0]);
  const wanted = args[1] as number;
  if (env.state.result === undefined) return NOT_ENDED;
  const have = asRecord(asRecord(env.state.result)?.scores)?.[seat];
  if (typeof have !== 'number') return `Expected ${seat} to score ${wanted}, but no score was recorded for ${seat}.`;
  return have === wanted ? true : `Expected ${seat} to score ${wanted}, but they scored ${have}.`;
};

/** Who won: every player sharing the win, else the one winner; nobody when the result names none. */
function winnersOf(result: Json | undefined): string[] {
  const record = asRecord(result);
  if (Array.isArray(record?.winners)) return record.winners.filter((seat): seat is string => typeof seat === 'string');
  return typeof record?.winner === 'string' ? [record.winner] : [];
}

/** How the game was won, said after “but”: “p0 won”, “p0 and p1 share the win”. */
function wonBy(winners: string[]): string {
  if (winners.length === 0) return 'the game has no winner';
  return winners.length === 1 ? `${winners[0]} won` : `${joinAnd(winners)} share the win`;
}

/** One player winning alone: a win they share is not theirs alone, even when it names them first. */
const winsExpected: ExpectFn = (env, args) => {
  const seat = seatOf(env, args[0]);
  if (env.state.result === undefined) return NOT_ENDED;
  const winners = winnersOf(env.state.result);
  if (winners.length > 1) return `Expected ${seat} to win alone, but ${joinAnd(winners)} share the win.`;
  const winner = asRecord(env.state.result)?.winner;
  if (winner === seat) return true;
  return `Expected ${seat} to win, but ${wonBy(typeof winner === 'string' ? [winner] : [])}.`;
};

/** Exactly these players won, in any order: all of them sharing the win, or the one winner. */
const playersWinExpected: ExpectFn = (env, args) => {
  const seats = (args[0] as Json[]).map((seat) => seatOf(env, seat));
  if (env.state.result === undefined) return NOT_ENDED;
  const winners = winnersOf(env.state.result);
  const same = new Set(seats).size === winners.length && seats.length === winners.length && seats.every((seat) => winners.includes(seat));
  return same ? true : `Expected ${joinAnd(seats)} to win, but ${wonBy(winners)}.`;
};

const gameIsOverExpected = (wanted: boolean): ExpectFn => (env) => {
  if ((env.state.result !== undefined) === wanted) return true;
  return wanted ? "Expected the game to be over, but it hasn't ended." : 'Expected the game not to be over, but it has ended.';
};

/** The Given, When and Then lines of an example: arranging cards, making a move, and checking what came of it. */
export function registerExamplePhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .given('{int} players', (env) => env.state)
    .given('the game is set up', (env) => exampleOf(env).setUp(env.state))
    .given('the phase is {phase}', phaseIs)
    .given("it is {player}'s turn", turnIs)
    .given('{player} holds {cardlist}', holds)
    .given('{zone} has {cardlist}', zoneHas)
    .given('{zone} is empty', zoneIsEmpty)
    .given('{player} played {card} to {zone}', played)
    .action('{player} {move} {card}', moveNamedCard)
    .action('{player} {move} a card', moveTopCard)
    .expect('it is accepted', isAccepted)
    .expect('it is rejected', isRejected)
    .expect('it is rejected because {string}', isRejectedBecause)
    .expect("it is {player}'s turn", turnIsExpected)
    .expect('the phase is {phase}', phaseIsExpected)
    .expect('{player} holds {int} card(s)', holdsCount)
    .expect('{zone} has {cardlist}', zoneHasExactly)
    .expect('{zone} has {cardlist}, in that order', zoneHasInOrder)
    .expect('the top card of {zone} is {card}', topCardIs)
    .expect('the bottom card of {zone} is {card}', bottomCardIs)
    .expect('{card} is among the bottom {int} cards of {zone}', cardIsAmongBottom)
    .expect('{player} scores {int}', scoresExpected)
    .expect('{player} wins', winsExpected)
    .expect('{players} win', playersWinExpected)
    .expect('the game is over', gameIsOverExpected(true))
    .expect('the game is not over', gameIsOverExpected(false));
}
