// Test fixtures for the phrase library. Pure data builders: no engine, no DOM, no clock.
import type { GameState } from '../game-state';
import { makeRng } from '../rng';
import type { CardState, PlayerId } from '../scene';
import type { Json } from '../table-def';
import { standardDeckIdentities, textFaceKey } from './cards';
import { emptyVocab, type PhraseLibrary } from './phrases';
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
  const attributes = new Set<string>();
  const cardValues: Vocab['cardValues'] = [];
  for (const set of game.cards) {
    for (const { attrs } of set.identities) {
      for (const [attribute, value] of Object.entries(attrs)) {
        attributes.add(attribute);
        if (set.kind === 'table' && !cardValues.some((v) => v.attribute === attribute && v.value === value)) {
          cardValues.push({ attribute, value });
        }
      }
    }
  }
  return {
    ...emptyVocab(),
    sharedZones: game.zones.filter((z) => !z.perPlayer).map((z) => z.name),
    playerZones: game.zones.filter((z) => z.perPlayer).map((z) => z.name),
    maxPlayers: players,
    phases: game.phases.map((p) => p.id),
    verbs: [...new Set(game.phases.flatMap((p) => p.moves.map((m) => m.verb)))],
    attributes: [...attributes],
    cardValues,
    standardDeck: game.cards.some((s) => s.kind === 'standard'),
  };
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
