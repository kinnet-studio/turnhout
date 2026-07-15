# Rule Engine (Game Flow) — Design

**Date:** 2026-07-15
**Branch:** `feat/rule-engine`
**Status:** Approved design, pre-implementation

## Problem

The toolkit can answer "is this single move legal?" (per-move `legal`, per-zone accept
rules) but has no notion of *game flow*. Turn structure, phase-gated legality, triggered
consequences ("trick complete → award trick"), and win/end detection are all ad-hoc game
code — the net demo hand-rolls its own turn check. This sub-project adds a declarative
flow layer covering all three: turn/phase flow, triggers/reactions, and end conditions.

## Decisions (settled during brainstorm)

1. **Scope:** full flow engine — turn structure, triggers, and end conditions, designed
   together.
2. **Authoring model:** declarative + named hooks. Flow is serializable data (`FlowDef`);
   behavior is registered by name in a `FlowRegistry`, exactly like `RuleRegistry` and
   `MoveRegistry`. Game definitions stay wire-safe.
3. **Log model:** the move log records player intents only. Flow (triggers, phase
   advance, end check) runs deterministically inside dispatch after each `apply`, and
   replay re-runs it identically. No system moves in the log; undo/`loadLog`/net sync
   inherit correctness structurally.
4. **Architecture:** flow is interpreted inside `GameEngine` dispatch (approach A).
   The interpreter itself lives in a pure module (`flow.ts`); the engine delegates.
   Rejected: a `FlowEngine` wrapper (cannot inject flow into `GameEngine.replay` without
   swallowing the engine) and per-handler middleware (flow semantics become implicit and
   homeless).
5. **Proof:** a 4-player Hearts demo (one full scored hand) over the loopback net stack.

## Data model

All types below are `Json`-serializable. Behavior is referenced by name:

```ts
// A named reference into the FlowRegistry, with optional serializable params
type NamedRef = string | { name: string; params?: Json };

interface FlowDef {
  turn: {
    order: PlayerId[];        // seat order
    next?: NamedRef;          // turn-order policy; default: round-robin over `order`
  };
  phases: PhaseDef[];         // ordered; first entry is the starting phase
  triggers?: TriggerDef[];    // global condition-based reactions
  end?: EndDef[];             // game-over conditions
}

interface PhaseDef {
  id: string;                               // stored in state.turn.phase
  allow: string[] | 'any';                  // move types legal in this phase
  actor?: 'current' | 'any';                // who may submit (default 'current')
  anyActor?: string[];                      // move types exempt from the actor gate
  onEnter?: NamedRef[];                     // effects run when the phase is entered
  advance?: { when: NamedRef; to: string }; // phase transition, checked post-move
  endTurn?: { when: NamedRef };             // when the turn passes to the policy's pick
}

interface TriggerDef {
  id: string;          // for error messages / debugging
  when: NamedRef;      // predicate over state
  then: NamedRef[];    // effects, applied in order
}

interface EndDef {
  when: NamedRef;      // predicate
  result: NamedRef;    // effect that writes the outcome into state.result
}
```

`FlowRegistry` holds three kinds of named functions (three internal maps, one class,
same register/get/has shape as the existing registries):

```ts
type FlowPredicate = (state: GameState, ctx: MoveContext, params?: Json) => boolean;
type FlowEffect    = (state: GameState, ctx: MoveContext, params?: Json) => GameState; // pure; rng via state.rng
type TurnPolicy    = (state: GameState, order: PlayerId[], ctx: MoveContext, params?: Json) => PlayerId;
```

**Core library** (`flow-library.ts`, mirroring `rules-library.ts`/`moves-library.ts`):
generic predicates (`always`, `zoneEmpty`, `zonesEmpty`, `zoneCount`, `zonesCount`),
effects (`moveZone`, `setData`, `deal`, `shuffleZone`), and the `roundRobin` policy
(also the built-in default when `turn.next` is omitted). Zone-count predicates are
deliberately generic: Hearts' "trick complete" is just `zoneCount {zone:'trick',
count:4}` and "all passed" is `zonesCount {zones:[...], count:3}`. Game-specific
entries (e.g. Hearts' `awardTrick`, `scoreHand`, `heartsNext`) register from game code,
proving the extension seam.

**`GameState` change:** one addition — `result?: Json`, `undefined` while the game is
live. Set by an `EndDef`'s `result` effect; the gate rejects all moves once set.
First-class (not a magic `state.data` key) so the net layer projects it explicitly.

### Semantic commitments

- **Triggers are condition-based, not event-based.** `when` is a predicate over state,
  re-evaluated to fixpoint after each apply. This is what makes "log = player intents"
  replay-safe — there is no event bus to persist. Discipline: a trigger's effects must
  falsify its own condition (e.g. `awardTrick` empties the trick zone, so
  `trickComplete` goes false), else the engine throws at the iteration cap.
- **`advance.to` is explicit**, not "next in list" — games with round loops need
  arbitrary jumps.

## Interpreter semantics (`flow.ts`)

Pure functions, each taking `(state, flowDef, flowRegistry, ctx)` — no engine coupling.

### `gateMove(...) → true | string` — before the move's own `legal`

1. `state.result` set → reject `"game is over"`.
2. Current phase (`state.turn.phase`) looked up in `flowDef.phases`; unknown or missing
   phase → reject (**fail-closed**, the SP3 review lesson applied from day one).
3. Phase gate: `move.type` must be in the phase's `allow` (or `allow: 'any'`).
4. Actor gate: unless `phase.actor === 'any'` or `move.type` is listed in
   `phase.anyActor`, `move.by` must equal `state.turn.current`; a missing `by` fails.
   Strict on purpose — this makes server authority over turn order uniform instead of
   per-move-handler. `anyActor` exists because some move types are legitimately
   off-turn (the hand-reorder feature: any seat may reorder its own hand at any time);
   such moves stay phase-gated via `allow` and owner-checked in their own `legal`.

### `runFlow(...) → GameState` — after every successful `apply`

A bounded loop. Each iteration checks, in fixed order, and fires the **first** match,
then restarts the loop:

1. **End check:** first `EndDef` whose `when` is true → run its `result` effect, set
   `state.result`, stop permanently. Checked first so a finished game cannot keep firing
   triggers or rotating turns.
2. **Triggers:** first `TriggerDef` (list order) whose `when` is true → apply its `then`
   effects in order.
3. **Phase advance:** current phase has `advance` and its `when` is true → set
   `turn.phase = to`, run the target phase's `onEnter` effects.
4. **End turn:** current phase has `endTurn`, its `when` is true, and it has not yet
   fired during this `runFlow` invocation → `turn.current =` turn policy's pick.
5. Nothing fired → done.

Iteration cap (~100); exceeding it throws with the id of the last-fired trigger — a
misconfigured flow (a trigger that does not falsify its own condition) fails loudly.

**Why `endTurn` is at-most-once per invocation:** triggers must falsify their own
condition, but passing the turn does not falsify a typical `endTurn` predicate (e.g.
"trick has 1–3 cards" stays true after the turn passes), which would loop forever. A
turn passing at most once per player action is also the correct game semantics.
`advance` needs no such cap — changing phase moves evaluation to the *new* phase's
`advance` clause, so it self-falsifies structurally.

**Sharp edge:** `runFlow` runs after EVERY accepted move, not just the move that
"should" end the turn. If a phase allows an off-turn move (e.g. an `anyActor`
`reorder`), that move also triggers a `runFlow`, and if `endTurn.when` is still
true at that point the turn advances with nothing having been played. An
`endTurn` predicate must therefore be written to be false again immediately
after it fires and stay false until the next turn-ending action — e.g. by
checking that the *last* recorded action was taken by the current turn-holder,
not merely that "the trick/round is mid-progress." The hearts demo hit this:
`heartsTurnOver` originally returned true for the whole 1–3-play window of a
trick, so a mid-trick `reorder` by a different seat re-fired `endTurn` and
skipped a turn; the fix ties the mid-trick clause to `plays[n-1].by ===
state.turn.current`.

### `initFlow(state, ...)` — once at construction/`reset`

Fills in `turn` (`current = order[0]`, `phase = phases[0].id`) if the initial state did
not set it, runs the first phase's `onEnter` effects, then one `runFlow`. Setup like
"deal 13 to each" becomes an `onEnter` effect instead of imperative demo code.

### `validateFlowDef(flow, registry)` — at engine construction

Every `NamedRef` resolves; every `advance.to` names a real phase; `turn.order`
non-empty; phase ids unique; every `anyActor` entry appears in that phase's `allow`.
Throw at load, not mid-game (the SP1 follow-up lesson).

### Determinism / replay

Replay = `initFlow(initial)`, then per logged move `apply + runFlow` — the exact
dispatch pipeline minus gates (the log only contains accepted moves, same reasoning as
today's replay skipping `legal`). Predicates/effects are pure and randomness lives in
`state.rng`, so replay reproduces byte-identical state; undo, `loadLog`, and net sync
inherit correctness.

## `GameEngine` integration

Small, backward compatible:

- `NewGameArgs` gains `flow?: FlowDef` and `flowRegistry?: FlowRegistry` (must come
  together; constructor runs `validateFlowDef` immediately).
- Constructor stores `this.initial = flow ? initFlow(args.initial, …) : args.initial`.
  The *effective* initial is post-init, so `reset()`, `undo()`'s replay, and `loadLog`
  keep their current shapes.
- `dispatch`: `gateMove` (if flow; failure returns `{ok: false, reason}` like a `legal`
  failure) → `legal` → `apply` → `runFlow` → push to log, notify.
  `canDispatch` = gate + legal.
- `replay()`: one added `runFlow` call after each `apply` when flow is present.

No `flow` supplied → every added line is skipped; existing tests and demos run
unchanged. `MoveContext` is untouched — predicates/effects receive the same
`{tableDef, rules}` ctx as move handlers; the engine passes the `FlowRegistry` to the
flow functions itself.

## Net layer impact

- `GameServer.submit` already stamps `move.by` unforgeably, which is exactly what the
  actor gate consumes. **Zero changes to submit/session/channel logic.**
- One additive change: `ClientView` (currently scene + turn) also carries `result`, so
  clients learn the game ended and the outcome — added in `projectFor` and the protocol
  type. `result` content is authored by the game's `result` effect, so games control
  what is revealed (a hidden-role game can write a redacted result).
- The net demo's hand-rolled turn check is **deleted**, replaced by the flow gate.

## Files

**New** (all in `src/engine/core/` unless noted, mirroring existing naming):
`flow.ts` (types + `gateMove`/`runFlow`/`initFlow`), `flow-registry.ts`,
`flow-def-validate.ts`, `flow-library.ts`, plus `.test.ts` twins.
**Modified:** `game-engine.ts` (~15 lines), `game-state.ts` (`result?: Json`),
`net/game-server.ts` + `net/protocol.ts` (project `result`).
**Demo:** `src/pages/hearts-demo/`.

## Hearts demo (the proof)

One full hand of 4-player Hearts over loopback: server + `GameSession`, thin clients,
following the net-demo pattern. Start with four smaller canvases side by side; fall back
to one canvas with a seat-switcher (SP3's "View as" toggle) if four Pixi instances feel
heavy. Deliberately **not** multi-round play to 100 points — one scored hand exercises
every primitive.

Coverage of the `FlowDef` surface:

- **Phases:** `setup` (onEnter: shuffle + deal 13 to each) → `passing`
  (`allow: ['pass', 'reorder']`, `actor: 'any'` — simultaneous; `pass` moves one card
  to the seat's pass pile, drag-friendly, three per seat; advance when all four pass
  piles hold 3) → `playing` (`allow: ['play', 'reorder']`, `actor: 'current'`,
  `anyActor: ['reorder']` so hands stay reorderable off-turn).
- **Division of labor:** follow-suit and hearts-broken rules live in a game-specific
  `play` move handler's `legal` — *flow* decides who may move and which move types;
  *moves* decide card-level legality.
- **Trigger:** `trickComplete` (4 cards in trick zone) → `awardTrick` (cards to the
  winner's won-pile, record leader).
- **Turn policy:** `trickWinnerLeads` — the named-policy seam proven with a real
  dynamic order.
- **End:** `handsEmpty` → `scoreHand` writes per-player points (queen of spades +
  hearts) into `result`; clients render it.

All Hearts-specific predicates/effects/policies register from the demo directory —
games extend the toolkit without touching `src/engine/`.

## Testing

- **Unit (TDD):** `gateMove` (each rejection reason, `actor: 'any'`, missing `by`,
  game-over), `runFlow` (ordering end → trigger → advance → endTurn; fixpoint;
  iteration-cap throw carrying the trigger id), `initFlow`, `validateFlowDef` (each
  failure mode), each `flow-library` entry.
- **Engine integration:** flow-enabled dispatch pipeline; **replay determinism** — play
  a seeded sequence, `loadLog` into a fresh engine, assert deep-equal state; undo
  through a trigger firing; no-flow engine behavior identical to today (existing suite
  stays green, untouched).
- **Hearts end-to-end (keystone):** scripted seeded full hand through a headless
  engine — pass resolution, 13 tricks awarded, dynamic leads, final `result` scores.
- **Net:** 4-seat loopback — out-of-turn `play` rejected *by the gate* (not per-game
  code); `result` arrives in every `ClientView`.
- **Browser verification** before merge, per house standard.

## Out of scope (documented, not built)

- Multi-round Hearts (play to 100) — the demo plays one scored hand.
- Event-based triggers / an event bus — condition-based triggers are the model.
- Simultaneous-reveal mechanics beyond `actor: 'any'` (e.g. hidden simultaneous
  commitment with staged reveal).
- Client-side legality hints ("which moves can I make?") in `ClientView`.
- The real WebSocket/Durable-Object channel (still the SP4 deferred item; unaffected).
