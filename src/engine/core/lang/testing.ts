// Test fixtures for the phrase library and the table layout. Pure: no DOM, no clock.
import type { GameState } from '../game-state';
import { resolveDrop } from '../hittest';
import { computeZoneLayout } from '../layout';
import { makeRng } from '../rng';
import { RuleRegistry } from '../rules';
import type { CardState, PlayerId } from '../scene';
import type { Json, ZoneDef } from '../table-def';
import { placeZone } from '../zone-geometry';
import { standardDeckIdentities, textFaceKey } from './cards';
import { vocabFrom, type PhraseLibrary } from './phrases';
import type {
  CompiledGame, CompiledPhase, DeclaredMove, MoveInfo, PhraseEnv, PhraseKind, Vocab, ZoneRef, ZoneSpec,
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
    setup: [], phases: [], end: null, examples: [],
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

export function fixtureState(cards: CardState[], over: Partial<GameState> = {}): GameState {
  return { cards, data: {}, rng: makeRng(1), ...over };
}

export function fixtureEnv(
  state: GameState,
  opts: { game?: CompiledGame; seats?: PlayerId[]; move?: MoveInfo; check?: PhraseEnv['check'] } = {},
): PhraseEnv {
  return {
    state,
    game: opts.game ?? fixtureGame(),
    seats: opts.seats ?? ['p0', 'p1', 'p2', 'p3'],
    move: opts.move,
    check: opts.check ?? (() => true),
  };
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
    ...over,
  };
}

/** The words a designer could use about this game: its zones, move verbs, card attributes and values. */
export function vocabFor(game: CompiledGame, players: number = game.players.max): Vocab {
  return vocabFrom({
    maxPlayers: players,
    zones: game.zones,
    cards: game.cards,
    phases: game.phases.map((p) => p.id),
    verbs: [...new Set(game.phases.flatMap((p) => p.moves.map((m) => m.verb)))],
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
