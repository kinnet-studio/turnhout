// Test fixtures for the phrase library, the table layout and games run on the engine. Pure: no DOM, no clock.
import type { GameState } from '../game-state';
import { resolveDrop } from '../hittest';
import { computeZoneLayout } from '../layout';
import { makeRng } from '../rng';
import { RuleRegistry } from '../rules';
import type { CardState, PlayerId } from '../scene';
import type { Json, ZoneDef } from '../table-def';
import { placeZone } from '../zone-geometry';
import { withBoardData } from './board-state';
import { standardDeckIdentities, textFaceKey } from './cards';
import { vocabFrom, type PhraseLibrary } from './phrases';
import type {
  CompiledGame, CompiledPhase, DeclaredMove, MoveInfo, PhraseEnv, PhraseKind, SpaceSpec, Subject, Vocab, ZoneRef, ZoneSpec,
} from './types';

const FIXTURE_ZONES: ZoneSpec[] = [
  { name: 'deck', perPlayer: false, layout: 'pile', visibility: 'secret' },
  { name: 'trick', perPlayer: false, layout: 'row', visibility: 'public' },
  { name: 'discard pile', perPlayer: false, layout: 'pile', visibility: 'public' },
  { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
  { name: 'pass pile', perPlayer: true, layout: 'pile', visibility: 'owner' },
  { name: 'won pile', perPlayer: true, layout: 'pile', visibility: 'public' },
];

/** A Hearts-shaped table: standard deck (aces high) in the deck, no phases. */
export function fixtureGame(over: Partial<CompiledGame> = {}): CompiledGame {
  return {
    name: 'Fixture',
    players: { min: 2, max: 4 },
    zones: FIXTURE_ZONES.map((z) => ({ ...z })),
    cards: [{ kind: 'standard', identities: standardDeckIdentities(), start: 'deck', acesHigh: true }],
    setup: [], phases: [], end: null, examples: [], board: null, facts: [], columns: {}, says: {},
    ...over,
  };
}

const colorIdentity = (color: string, number: number) => ({ attrs: { color, number }, faceKey: textFaceKey({ color, number }) });

/** A Color Match-shaped table: a custom deck of colored, numbered cards in a draw pile, a discard pile, and hands. */
export function fixtureColorGame(over: Partial<CompiledGame> = {}): CompiledGame {
  return fixtureGame({
    name: 'Color Fixture',
    zones: [
      { name: 'draw pile', perPlayer: false, layout: 'pile', visibility: 'secret' },
      { name: 'discard pile', perPlayer: false, layout: 'pile', visibility: 'public' },
      { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
    ],
    cards: [{
      kind: 'table', start: 'draw pile', acesHigh: false,
      identities: [colorIdentity('red', 2), colorIdentity('red', 7), colorIdentity('blue', 3), colorIdentity('blue', 7)],
    }],
    ...over,
  });
}

/**
 * A small two-player trick game written the way a designer would, used to run compiled rules on the engine.
 * `When the middle has 2 cards:` is line 27, `If the card is a spade, shuffle the deck.` is line 25 and the
 * `After a player …` line is line 31.
 */
export const TEST_DUEL = [
  'Game: Test Duel',
  'Players: 2',
  '',
  'Cards:',
  '  A standard 52-card deck, aces high, starting in the deck.',
  '',
  'Table:',
  '  The deck is a pile in the center that no one can see.',
  '  The middle is a row in the center that everyone can see.',
  '  Each player has a hand that only they can see.',
  '  Each player has a won pile that everyone can see.',
  '',
  'Setup:',
  '  Deal 3 cards from the deck to each hand.',
  '',
  'Phase: play',
  '  Players take turns.',
  '  Players may rearrange their hand at any time.',
  '  A player may play a card from their hand to the middle.',
  '    Only if the card is not a heart.',
  '    Only if one of:',
  '      the middle is empty',
  '      they follow the led suit when they can',
  '    Then:',
  '      If the card is a spade, shuffle the deck.',
  '  A player may draw a card from the deck to their hand.',
  '  When the middle has 2 cards:',
  '    The highest card of the led suit wins the middle.',
  "    Move the middle to the winner's won pile.",
  '    The winner goes next.',
  '  After a player plays or draws, the turn passes to the left.',
  '',
  'End:',
  "  The game ends when a player's hand is empty.",
  '  The player with an empty hand wins.',
].join('\n');

/**
 * A board game written the way a designer would, down to its first phase line: four spaces, a piece, a counter that
 * pays for things and two dice. Line 4 is `Board:` and the last line is `  Players take turns.`; rules go below it.
 */
export const TINY_BOARD_HEAD = [
  'Game: Tiny Board', 'Players: 2 to 4', '', 'Board:',
  '  The board is a loop of spaces, starting at Go:',
  '    | space      | kind   | color  | price | rent | tax |',
  '    | Go         | go     |        |       |      |     |',
  '    | Mill Lane  | street | brown  | 60    | 2    |     |',
  '    | Income Tax | tax    |        |       |      | 200 |',
  '    | Rose Lane  | street | orange | 180   | 14   |     |',
  '  Each player has a piece that starts on Go.',
  '  Each player has 1500 money that everyone can see.',
  '  Players pay with money.',
  '  There are two six-sided dice.',
  '', 'Phase: playing', '  Players take turns.',
].join('\n');

/**
 * TINY_BOARD_HEAD played to the end: rolling, buying and ending a turn, collecting on Go, rent, tax and going out.
 * `When a player lands on a tax space:` is line 37 and `When a player has less than 0 money:` is line 39.
 */
export const TINY_BOARD = [
  TINY_BOARD_HEAD,
  '  A player may roll the dice.',
  '    Only if they have not rolled this turn.',
  '    Then:',
  '      Roll the dice.',
  '      Their piece moves forward by the roll.',
  '  A player may buy the space they are on.',
  '    Only if they have rolled this turn.',
  '    Only if it has a price.',
  '    Only if no one owns it.',
  '    Only if they have at least its price in money.',
  '    Then:',
  '      They pay its price.',
  '      They own it.',
  '  A player may end their turn.',
  '    Only if they have rolled this turn.',
  '  When a piece passes Go:',
  '    Its player gets 200 money.',
  '  When a player lands on a street someone else owns:',
  '    They pay its rent to its owner.',
  '  When a player lands on a tax space:',
  '    They pay its tax.',
  '  When a player has less than 0 money:',
  '    They are out.',
  '    Their spaces go back to the bank.',
  '  After a player ends their turn, the turn passes to the left.',
  '',
  'End:',
  '  The game ends when one player is left.',
  '  That player wins.',
].join('\n');

/**
 * A board game whose two decks say what their cards do. `lucky` and `fate` are the tables under each deck line, header row
 * first; `rules` are lines under `Phase: playing`, indented as written there. Lines: the lucky table starts on line 6 (its
 * first card on line 7); the fate deck line is line 6 + lucky.length and its first card line 8 + lucky.length. The loop is
 * Go 0, Mill Lane 1, Lucky 2, North Station 3, Rose Lane 4, Lucky 5, Fate 6, Power Works 7.
 */
export function deckGameText(lucky: string[], fate: string[], rules: string[] = []): string {
  return [
    'Game: Deck Board', 'Players: 2 to 4', '', 'Cards:',
    '  A deck called lucky cards, starting in the lucky pile:', ...lucky.map((row) => `    ${row}`),
    '  A deck called fate cards, starting in the fate pile:', ...fate.map((row) => `    ${row}`),
    '', 'Table:',
    '  The lucky pile is a pile in the center that no one can see.',
    '  The fate pile is a pile in the center that no one can see.',
    '  Each player has a kept cards row that everyone can see.',
    '', 'Board:',
    '  The board is a loop of spaces, starting at Go:',
    '    | space         | kind    | color  | price | rent |',
    '    | Go            | go      |        |       |      |',
    '    | Mill Lane     | street  | brown  | 60    | 2    |',
    '    | Lucky         | lucky   |        |       |      |',
    '    | North Station | station |        | 200   | 25   |',
    '    | Rose Lane     | street  | orange | 180   | 14   |',
    '    | Lucky         | lucky   |        |       |      |',
    '    | Fate          | fate    |        |       |      |',
    '    | Power Works   | utility |        | 150   | 10   |',
    '  Each player has a piece that starts on Go.',
    '  Each player has 1500 money that everyone can see.',
    '  Players pay with money.',
    '  There are two six-sided dice.',
    '  Spaces can have houses and a hotel.',
    '  The bank has 32 houses and 12 hotels.',
    '', 'Phase: playing', '  Players take turns.',
    '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
    '      Their piece moves forward by the roll.',
    '  A player may end their turn.', '    Only if they have rolled this turn.',
    '  When a piece passes Go:', '    Its player gets 200 money.',
    '  When a player lands on a space someone else owns:', '    They pay its rent to its owner.',
    '  When a player has less than 0 money:', '    They are out.', '    Their spaces go back to the bank.',
    ...rules,
    '  After a player ends their turn, the turn passes to the left.',
    '', 'End:', '  The game ends when one player is left.', '  That player wins.',
  ].join('\n');
}

/** The loop of the board fixtures: a start, two streets, a tax, a station, a utility and two chance spaces. */
export const FIXTURE_SPACES: SpaceSpec[] = [
  { name: 'Go', attrs: { kind: 'go' } },
  { name: 'Mill Lane', attrs: { kind: 'street', color: 'brown', price: 60, rent: 2 } },
  { name: 'Income Tax', attrs: { kind: 'tax', tax: 200 } },
  { name: 'North Station', attrs: { kind: 'station', price: 200, rent: 25 } },
  { name: 'Chance', attrs: { kind: 'chance' } },
  { name: 'Rose Lane', attrs: { kind: 'street', color: 'orange', price: 180, rent: 14 } },
  { name: 'Power Works', attrs: { kind: 'utility', price: 150 } },
  { name: 'Chance', attrs: { kind: 'chance' } },
];

/** A board game with no cards: eight spaces, a piece each, two dice and a public counter that pays for things. */
export function fixtureBoardGame(over: Partial<CompiledGame> = {}): CompiledGame {
  return fixtureGame({
    name: 'Board Fixture',
    players: { min: 2, max: 4 },
    zones: [],
    cards: [],
    board: {
      spaces: FIXTURE_SPACES,
      pieces: { start: 0 },
      counters: [{ name: 'money', start: 1500, visibility: 'public' }],
      dice: { count: 2, sides: 6 },
      payWith: 'money',
      bank: [],
    },
    ...over,
  });
}

export function fixtureState(cards: CardState[], over: Partial<GameState> = {}): GameState {
  return { cards, data: {}, rng: makeRng(1), ...over };
}

export function fixtureEnv(
  state: GameState,
  opts: {
    game?: CompiledGame; seats?: PlayerId[]; move?: MoveInfo; check?: PhraseEnv['check']; subject?: Subject; announce?: PhraseEnv['announce'];
    columnValue?: PhraseEnv['columnValue'];
  } = {},
): PhraseEnv {
  return {
    state,
    game: opts.game ?? fixtureGame(),
    seats: opts.seats ?? ['p0', 'p1', 'p2', 'p3'],
    move: opts.move,
    check: opts.check ?? (() => true),
    subject: opts.subject,
    announce: opts.announce,
    columnValue: opts.columnValue,
  };
}

/** A board game's state as a new game starts: pieces on the start space, counters at their start values, p0 to move. */
export function fixtureBoardState(game: CompiledGame = fixtureBoardGame(), seats: PlayerId[] = ['p0', 'p1']): GameState {
  return { ...withBoardData(fixtureState([]), game, seats), turn: { current: 'p0', phase: 'playing' } };
}

export function fixtureCard(id: string, zoneId: string, data: Record<string, Json>, over: Partial<CardState> = {}): CardState {
  return { id, zoneId, faceUp: false, faceKey: `k-${id}`, data, ...over };
}

export function fixtureMove(verb: string, from: ZoneRef, to: ZoneRef, over: Partial<DeclaredMove> = {}): DeclaredMove {
  return { verb, from, to, fromText: '', conditions: [], effects: [], line: 1, ...over };
}

export function fixturePhase(id: string, moves: DeclaredMove[], over: Partial<CompiledPhase> = {}): CompiledPhase {
  return {
    id, line: 1, hint: null, actor: 'current', rearrange: [], moves, onEnter: [], goTo: null, triggers: [], after: null,
    actions: [], moments: [],
    ...over,
  };
}

/** The words a designer could use about this game: its zones, move verbs, card attributes and values, and its facts. */
export function vocabFor(game: CompiledGame, players: number = game.players.max): Vocab {
  return vocabFrom({
    maxPlayers: players,
    zones: game.zones,
    cards: game.cards,
    phases: game.phases.map((p) => p.id),
    verbs: [...new Set(game.phases.flatMap((p) => p.moves.map((m) => m.verb)))],
    board: game.board,
    actions: game.phases.flatMap((p) => p.actions.map((a) => ({ verb: a.verb, words: a.words, base: a.base, targeted: a.target !== null }))),
    facts: game.facts,
  });
}

/**
 * Reads `text` as a phrase of `kind` and calls it, as the compiled game will. `extra` is whatever
 * follows the arguments: the seat for a score phrase, the scores for a winner phrase.
 */
export function runPhrase<T = unknown>(
  lib: PhraseLibrary, kind: PhraseKind, text: string, env: PhraseEnv, ...extra: unknown[]
): T {
  const m = lib.match(kind, text, vocabFor(env.game));
  if (m.status !== 'ok') throw new Error(`“${text}” → ${JSON.stringify(m)}`);
  const fn = lib.get(kind, m.pattern)!.fn as (...a: unknown[]) => unknown;
  return fn(env, m.args, ...extra) as T;
}

const ROW_CARDS = 4;
const PILE_CARDS = 3;
/** A hand counts as reachable when at least this share of its cards can be dropped onto. */
const HAND_REACHABLE = 0.7;

/**
 * Which zones a drag cannot reach, as designer-readable messages. Fills hands with `handSize` cards, rows with 4
 * and piles with 3, then drops at each zone's centre (it must land in that zone) and at each hand card's centre
 * (at least 70% must land in the hand). A later zone that covers an earlier one's centre is what usually fails.
 */
export function unreachableZones(defs: ZoneDef[], handSize: number): string[] {
  const registry = new RuleRegistry();
  const held = new Map(defs.map((d) => {
    const count = d.layout === 'fan' ? handSize : d.layout === 'row' ? ROW_CARDS : PILE_CARDS;
    return [d.id, Array.from({ length: count }, (_, i) => fixtureCard(`${d.id}#${i}`, d.id, {}))] as const;
  }));
  const zoneCardsOf = (zoneId: string) => held.get(zoneId) ?? [];
  const dragged = fixtureCard('dragged', '__hand', {});
  const dropOn = (pt: { x: number; y: number }) => resolveDrop(pt, defs, zoneCardsOf, dragged, registry)?.zoneId ?? null;

  const problems: string[] = [];
  for (const def of defs) {
    const cards = zoneCardsOf(def.id);
    const centre = placeZone(def, cards);
    const landed = dropOn(centre);
    if (landed !== def.id) problems.push(`${def.id}: centre goes to ${landed ?? 'nothing'}`);
    if (def.layout !== 'fan') continue;
    const poses = [...computeZoneLayout(def, cards).values()];
    const reachable = poses.filter((pose) => dropOn(pose) === def.id).length;
    if (reachable < HAND_REACHABLE * poses.length) {
      problems.push(`${def.id}: only ${reachable} of ${poses.length} card centres reachable`);
    }
  }
  return problems;
}
