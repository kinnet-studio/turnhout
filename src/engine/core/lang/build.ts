// Turns a compiled game into what the existing engine runs: a table, starting cards, move handlers and a flow
// whose every rule is a phrase the LangRuntime answers.
import type { FlowDef, PhaseDef, TriggerDef } from '../flow';
import { gateMove } from '../flow';
import { FlowRegistry, type NamedRef } from '../flow-registry';
import { GameEngine } from '../game-engine';
import type { GameState } from '../game-state';
import { MoveRegistry, type MoveContext, type MoveHandler } from '../moves';
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
import { usesTurns } from './turns';
import type { CompiledGame, CompiledTrigger, PhraseRef } from './types';

/** The phase the engine starts in: it runs the Setup lines, then goes straight to the game's first phase. */
export const SETUP_PHASE = '__setup';
/** The flow's name for the rule that starts each turn, in a game that plays in rounds of turns. */
const TURN_START_RULE = 'a turn starts';

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
/** A line of a phase and the phase it is written under, so that the runtime knows who it is about: see `LangRuntime.turnSubject`. */
type PhaseLineParams = { phase: string; ref: PhraseRef };
const phaseCond = (phase: string, ref: PhraseRef): NamedRef => ({ name: 'lang:phase-cond', params: { phase, ref } satisfies PhaseLineParams });
const phaseEffect = (phase: string, ref: PhraseRef): NamedRef => ({ name: 'lang:phase-effect', params: { phase, ref } satisfies PhaseLineParams });
/** A `When …:` rule and the phase it is written under (null for a rule for every phase), as the flow hands it back to the runtime. */
type TriggerParams = { phase: string | null; trigger: CompiledTrigger };
/** The End condition and the rules about a card that it waits for. */
type EndParams = { when: PhraseRef; rules: TriggerParams[] };

export function flowDefFor(game: CompiledGame, seats: PlayerId[]): FlowDef {
  const first = game.phases[0];
  if (!first) throw new RuleError('Add at least one Phase: section.');
  const setup: PhaseDef = { id: SETUP_PHASE, allow: [], onEnter: game.setup.map(effect), advance: { when: 'lang:always', to: first.id } };

  const phases = game.phases.map((phase): PhaseDef => {
    const moveTypes = [...new Set([...phase.moves.map((m) => m.verb), ...phase.actions.map((a) => a.words)])];
    const rearranging = phase.rearrange.length > 0;
    // Buttons any player may press skip the turn gate, as a rearrange does; the key is left out when there are none.
    const anyActor = [...phase.actions.filter((a) => a.anyone).map((a) => a.words), ...(rearranging ? ['reorder'] : [])];
    const { goTo, after } = phase;
    return {
      id: phase.id,
      allow: rearranging ? [...moveTypes, 'reorder'] : moveTypes,
      actor: phase.actor,
      ...(anyActor.length > 0 ? { anyActor } : {}),
      onEnter: phase.onEnter.map((ref) => phaseEffect(phase.id, ref)),
      ...(goTo ? { advance: { when: phaseCond(phase.id, goTo.when), to: goTo.to } } : {}),
      ...(after ? { endTurn: { when: 'lang:always', after: after.moves, next: { name: 'lang:turn', params: after.next } } } : {}),
    };
  });

  // A rule written under a phase only fires while the game is in that phase, and a rule for every phase in any of the game's
  // phases. The runtime answers both halves, so that the lines of a rule about a player are about the player it picked out.
  const rules: TriggerParams[] = [
    ...game.everyPhase.triggers.map((trigger): TriggerParams => ({ phase: null, trigger })),
    ...game.phases.flatMap((phase) => phase.triggers.map((trigger): TriggerParams => ({ phase: phase.id, trigger }))),
  ];
  const ruleTriggers = rules.map((params): TriggerDef => ({
    id: `line ${params.trigger.line}: ${params.trigger.text}`,
    when: { name: 'lang:trigger-when', params },
    then: [{ name: 'lang:trigger-then', params }],
  }));
  // A turn starts by itself, before any other rule, in a game that plays in rounds of turns. It is a rule, never part of what
  // passes the turn: the flow checks End before it fires any rule, so once the turn has passed there is a moment, before the next
  // turn starts, when the game may end with the round finished.
  const turnStart: TriggerDef[] = usesTurns(game)
    ? [{ id: TURN_START_RULE, when: { name: 'lang:turn-waiting' }, then: [{ name: 'lang:turn-start' }] }]
    : [];
  const triggers = [...turnStart, ...ruleTriggers];

  // A rule about a card tidies the table, and the game is decided on the tidied table: the flow checks End before it fires any
  // rule, so End would otherwise count a card (at 0 health, say) that such a rule is about to move away. Every rule the flow
  // fires re-checks End, so End holds as soon as no card rule has a card left. Rules about a player or about nothing in
  // particular do not tidy anything the winner depends on, so they never hold End back.
  const cardRules = rules.filter(({ trigger }) => trigger.when.kind === 'which');
  const endWhen = (when: PhraseRef): NamedRef => {
    if (cardRules.length === 0) return cond(when);
    const params: EndParams = { when, rules: cardRules };
    return { name: 'lang:end-when', params };
  };
  const end = game.end ? [{ when: endWhen(game.end.when), result: 'lang:result' }] : [];
  return { turn: { order: seats }, phases: [setup, ...phases], triggers, end };
}

/**
 * The flow's side of the language. Every effect that runs the designer's lines leaves the table whole, or throws, so that a rule which
 * moves a card and forgets the cards on it is refused with the cards named; `lang:result` only scores, and moves nothing.
 */
function flowRegistryFor(runtime: LangRuntime): FlowRegistry {
  const ref = (params: Json | undefined) => params as PhraseRef;
  const rule = (params: Json | undefined) => params as TriggerParams;
  const ending = (params: Json | undefined) => params as EndParams;
  const phaseLine = (params: Json | undefined) => params as PhaseLineParams;
  return new FlowRegistry()
    .registerPredicate('lang:always', () => true)
    .registerPredicate('lang:cond', (state, _ctx, params) => runtime.test(ref(params), state))
    .registerEffect('lang:effect', (state, _ctx, params) => runtime.checkAttachments(runtime.run(ref(params), state)))
    .registerPredicate('lang:phase-cond', (state, _ctx, params) => {
      const { phase, ref: line } = phaseLine(params);
      return runtime.testInPhase(phase, line, state);
    })
    .registerEffect('lang:phase-effect', (state, _ctx, params) => {
      const { phase, ref: line } = phaseLine(params);
      return runtime.checkAttachments(runtime.runInPhase(phase, line, state));
    })
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
      return runtime.checkAttachments(runtime.fireTrigger(phase, trigger, state));
    })
    .registerPredicate('lang:turn-waiting', (state) => runtime.turnWaiting(state))
    .registerEffect('lang:turn-start', (state) => runtime.checkAttachments(runtime.startTurn(state)))
    .registerPolicy('lang:turn', (state, _order, _ctx, params) => runtime.pick(ref(params), state))
    .registerEffect('lang:result', (state) => runtime.result(state));
}

/**
 * A declared move or button whose result must leave the table whole: one that strands a card on a card gone elsewhere throws, so the
 * engine keeps the state from before the press. Only the result is checked, since the lines in between may move a card before the cards
 * on it. The core moves are not the designer's, and are not checked.
 */
function checked(handler: MoveHandler, runtime: LangRuntime): MoveHandler {
  return {
    legal: (state, m, ctx) => handler.legal(state, m, ctx),
    apply: (state, m, ctx) => runtime.checkAttachments(handler.apply(state, m, ctx)),
  };
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
  for (const verb of verbs) moves.register(verb, checked(declaredMoveHandler(verb, runtime), runtime));
  // A button's move type is its whole wording, so “pay the fine” and “pay the toll” are two moves.
  const buttonMoves = new Set(game.phases.flatMap((p) => p.actions.map((a) => a.words)));
  for (const move of buttonMoves) moves.register(move, checked(declaredActionHandler(move, runtime), runtime));

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
