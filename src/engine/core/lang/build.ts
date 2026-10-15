// Turns a compiled game into what the existing engine runs: a table, starting cards, move handlers and a flow
// whose every rule is a phrase the LangRuntime answers.
import type { FlowDef, PhaseDef, TriggerDef } from '../flow';
import { gateMove } from '../flow';
import { FlowRegistry, type NamedRef } from '../flow-registry';
import { GameEngine } from '../game-engine';
import type { GameState } from '../game-state';
import { MoveRegistry, type MoveContext } from '../moves';
import { registerCoreMoves } from '../moves-library';
import { makeRng } from '../rng';
import { RuleRegistry } from '../rules';
import type { PlayerId } from '../scene';
import type { Json, TableDef } from '../table-def';
import { autoLayout } from './auto-layout';
import { withBoardData } from './board-state';
import { buildCards } from './cards';
import { gameIsFor } from './compile-example';
import { declaredActionHandler } from './declared-actions';
import { declaredMoveHandler } from './declared-moves';
import { RuleError } from './diagnostics';
import type { PhraseLibrary } from './phrases';
import { LangRuntime } from './runtime';
import type { CompiledGame, CompiledTrigger, PhraseRef } from './types';

/** The phase the engine starts in: it runs the Setup lines, then goes straight to the game's first phase. */
export const SETUP_PHASE = '__setup';

export function seatsFor(players: number): PlayerId[] {
  return Array.from({ length: players }, (_, i) => `p${i}`);
}

export function tableDefFor(game: CompiledGame, seats: PlayerId[]): TableDef {
  return { players: seats, zones: autoLayout(game.zones, seats) };
}

/** Every card in the zone its set starts in, face down; no turn yet, so the engine starts with Setup. */
export function initialState(game: CompiledGame, seed: number): GameState {
  const { cards, rng } = buildCards(game.cards, makeRng(seed));
  return { cards, data: {}, rng };
}

const cond = (ref: PhraseRef): NamedRef => ({ name: 'lang:cond', params: ref });
const effect = (ref: PhraseRef): NamedRef => ({ name: 'lang:effect', params: ref });
/** A `When …:` rule and the phase it is written under, as the flow hands it back to the runtime. */
type TriggerParams = { phase: string; trigger: CompiledTrigger };
/** The End condition and the rules about a card that it waits for. */
type EndParams = { when: PhraseRef; rules: TriggerParams[] };

export function flowDefFor(game: CompiledGame, seats: PlayerId[]): FlowDef {
  const first = game.phases[0];
  if (!first) throw new RuleError('Add at least one Phase: section.');
  const setup: PhaseDef = { id: SETUP_PHASE, allow: [], onEnter: game.setup.map(effect), advance: { when: 'lang:always', to: first.id } };

  const phases = game.phases.map((phase): PhaseDef => {
    const moveTypes = [...new Set([...phase.moves.map((m) => m.verb), ...phase.actions.map((a) => a.words)])];
    const rearranging = phase.rearrange.length > 0;
    const { goTo, after } = phase;
    return {
      id: phase.id,
      allow: rearranging ? [...moveTypes, 'reorder'] : moveTypes,
      actor: phase.actor,
      ...(rearranging ? { anyActor: ['reorder'] } : {}),
      onEnter: phase.onEnter.map(effect),
      ...(goTo ? { advance: { when: cond(goTo.when), to: goTo.to } } : {}),
      ...(after ? { endTurn: { when: 'lang:always', after: after.moves, next: { name: 'lang:turn', params: after.next } } } : {}),
    };
  });

  // A rule written under a phase only fires while the game is in that phase. The runtime answers both halves, so
  // that the lines of a rule about a player are about the player it picked out.
  const triggers = game.phases.flatMap((phase) => phase.triggers.map((t): TriggerDef => {
    const params: TriggerParams = { phase: phase.id, trigger: t };
    return { id: `line ${t.line}: ${t.text}`, when: { name: 'lang:trigger-when', params }, then: [{ name: 'lang:trigger-then', params }] };
  }));

  // A rule about a card tidies the table, and the game is decided on the tidied table: the flow checks End before it fires any
  // rule, so End would otherwise count a card (at 0 health, say) that such a rule is about to move away. Every rule the flow
  // fires re-checks End, so End holds as soon as no card rule has a card left. Rules about a player or about nothing in
  // particular do not tidy anything the winner depends on, so they never hold End back.
  const cardRules = game.phases.flatMap((phase) => phase.triggers
    .filter((t) => t.when.kind === 'which')
    .map((trigger): TriggerParams => ({ phase: phase.id, trigger })));
  const endWhen = (when: PhraseRef): NamedRef => {
    if (cardRules.length === 0) return cond(when);
    const params: EndParams = { when, rules: cardRules };
    return { name: 'lang:end-when', params };
  };
  const end = game.end ? [{ when: endWhen(game.end.when), result: 'lang:result' }] : [];
  return { turn: { order: seats }, phases: [setup, ...phases], triggers, end };
}

function flowRegistryFor(runtime: LangRuntime): FlowRegistry {
  const ref = (params: Json | undefined) => params as PhraseRef;
  const rule = (params: Json | undefined) => params as TriggerParams;
  const ending = (params: Json | undefined) => params as EndParams;
  return new FlowRegistry()
    .registerPredicate('lang:always', () => true)
    .registerPredicate('lang:cond', (state, _ctx, params) => runtime.test(ref(params), state))
    .registerEffect('lang:effect', (state, _ctx, params) => runtime.run(ref(params), state))
    .registerPredicate('lang:end-when', (state, _ctx, params) => {
      const { when, rules } = ending(params);
      return runtime.test(when, state) && rules.every(({ phase, trigger }) => runtime.triggerSubject(phase, trigger, state) === null);
    })
    .registerPredicate('lang:trigger-when', (state, _ctx, params) => {
      const { phase, trigger } = rule(params);
      return runtime.triggerSubject(phase, trigger, state) !== null;
    })
    .registerEffect('lang:trigger-then', (state, _ctx, params) => {
      const { phase, trigger } = rule(params);
      return runtime.fireTrigger(phase, trigger, state);
    })
    .registerPolicy('lang:turn', (state, _order, _ctx, params) => runtime.pick(ref(params), state))
    .registerEffect('lang:result', (state) => runtime.result(state));
}

/** Throws a RuleError when the game is not for that many players. */
export function checkPlayers(game: CompiledGame, players: number): void {
  if (!Number.isInteger(players) || players < game.players.min || players > game.players.max) {
    throw new RuleError(gameIsFor(game.players));
  }
}

/**
 * An engine playing the game with `players` seats, starting from `initial` (from `initialState`, or a state arranged
 * with a turn already set, which skips Setup). Throws a RuleError when the game is not for that many players.
 */
export function createEngine(
  game: CompiledGame, library: PhraseLibrary, players: number, initial: GameState,
): { engine: GameEngine; runtime: LangRuntime; tableDef: TableDef; seats: PlayerId[] } {
  checkPlayers(game, players);
  const seats = seatsFor(players);
  const tableDef = tableDefFor(game, seats);
  const runtime = new LangRuntime(game, library, seats);
  // Declared verbs come last, so a designer's “move” or “deal” replaces the core move of that name.
  const moves = registerCoreMoves(new MoveRegistry());
  const verbs = new Set(game.phases.flatMap((p) => p.moves.map((m) => m.verb)));
  for (const verb of verbs) moves.register(verb, declaredMoveHandler(verb, runtime));
  // A button's move type is its whole wording, so “pay the fine” and “pay the toll” are two moves.
  const buttonMoves = new Set(game.phases.flatMap((p) => p.actions.map((a) => a.words)));
  for (const move of buttonMoves) moves.register(move, declaredActionHandler(move, runtime));

  const flow = flowDefFor(game, seats);
  const rules = new RuleRegistry();
  // A board game starts with its pieces on the board and its counters full; a state that has them already keeps them.
  const start = withBoardData(initial, game, seats);
  const engine = new GameEngine({ tableDef, rules, moves, initial: start, flow, flowRegistry: flowRegistryFor(runtime) });

  // “They have no card they could play” asks the engine, exactly as a dispatch would, without making the move.
  const ctx: MoveContext = { tableDef, rules };
  runtime.setChecker((state, move) => {
    const gate = gateMove(state, move, flow);
    if (gate !== true) return gate;
    const handler = moves.get(move.type);
    return handler ? handler.legal(state, move, ctx) : `unknown move type: ${move.type}`;
  });
  return { engine, runtime, tableDef, seats };
}
