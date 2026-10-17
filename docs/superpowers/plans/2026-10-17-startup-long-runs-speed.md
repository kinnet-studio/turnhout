# Startup Simulator Long Runs Speed-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/games/startup-simulator.test.ts` runs about three times faster (about 23 s of test time to about 7 s) with byte-identical behaviour, so slices 5–10 can keep adding rules and long runs.

**Architecture:**
- A profile of the long runs (controller's scratchpad, `perf/proposal.md`, measured at `a9dbedd`) found the zone map rebuilt and sorted on every `zoneCards` call (30% self, 37% total, most of the 15% GC), driven by every `When` rule check in the flow loop.
- `game-state.ts` is protected, so the cache lives in a new language module that reuses game-state's own `cardsByZone`, keyed on the immutable `state.cards` array.
- Three small memos (table columns, `slug`, `attachmentProblem`) and test-side guarded assertions take the rest.
- Run this plan after plan 4-2 and before plan 4-3. Rebase the scratchpad patches (`perf/all-changes.diff`) onto HEAD rather than applying them blindly; plan 4-2 changed the test file since they were made.

**Tech Stack:** TypeScript, vitest.

**Spec:** the overview docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md (its proof: long runs at 2–5 players that check the rules after every move). This plan changes no behaviour, so the spec's rules bind only as "nothing changes".

## Global Constraints

- Develop on `claude/peaceful-curie-rdfkow`; commit by pathspec; every commit message ends with the two lines
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
  and contains no model identifiers.
- Protected files never change: `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- The core stays pure (no pixi/react/DOM in `src/engine/core/**`, no `Math.random`/`Date.now`). State stays Json-only; replay stays exact.
- Behaviour is byte-identical: every existing test passes unchanged (no existing test line changes except the import lines Task 2 names and the assertion lines Task 2 guards); Hearts, Color Match, Venom and Rent Day are unchanged (Rent Day 108 examples); Startup's example count is unchanged.
- Coverage is unchanged: every invariant still runs after every move — nothing is sampled or checked every Nth move.
- A cache is keyed only on objects that are never mutated after they are made (a state's `cards` array, a compiled game's `cards`), and returns a fresh array wherever the uncached function did.
- Measure the Startup test file (best of 3, alternating with BASE) before and after each task and report both.

## Review Focus

1. A caller that mutates the array `zoneCards` returns would corrupt a cache that handed out its own array — the cache must return a copy (test it).
2. Two different states sharing one `cards` array (an effect that returns the same cards) must get the same answers — they do, since the answers depend only on the array (test it).
3. A designer typing in the rules box compiles many games: the `slug` memo must stay bounded (cleared at 1000 names) and the per-game memos must be WeakMaps so old games are collected.
4. A guarded assertion must fail with exactly the same message as the old `expect` (mutation check: break two invariants on purpose and compare the failure text with and without the guard).
5. The four other games and the hearts demo must not change speed or behaviour (run their tests).

---

### Task 1: The engine reads zones and cards through a per-state index

**Files:**
- Create: `src/engine/core/lang/zone-index.ts`, `src/engine/core/lang/zone-index.test.ts`
- Modify (imports only): `src/engine/core/lang/{attach,board-view,declared-actions,declared-moves,runtime,zones}.ts` and `src/engine/core/lang/library/{attach,compare,debt,draw,example,fact,flow,move,queue,standard-deck,support,total}-phrases.ts` — and any other lang module that imports `zoneCards`/`cardById` from `../game-state` at HEAD (grep; plans since `a9dbedd` may have added some).
- Modify: `src/engine/core/lang/card-facts.ts` (`tableColumns`/`faceKeyOf` read a column Set memoized per `game.cards`), `src/engine/core/lang/zones.ts` (`slug` memo), `src/engine/core/lang/attach.ts` (`attachmentProblem` memoized per game and `state.cards`).

**Interfaces:**
- Produces: `zoneCards(state: GameState, zoneId: string): CardState[]` and `cardById(state: GameState, id: string): CardState | undefined` in `zone-index.ts`, with game-state's exact signatures and results. `zoneCards` builds its map with game-state's `cardsByZone` (same code, same order) and returns `cards.slice()`; `cardById` keeps the first card with an id, as `find` does. Both are cached in WeakMaps keyed on `state.cards`.

- [ ] **Step 1: Write the failing tests** in `zone-index.test.ts`: on every state of one Startup long run at seed 1 (or a 3-player game of the existing fixtures if that is enough), `zoneCards` equals game-state's `zoneCards` for every zone id in play and `cardById` equals game-state's for every card id; mutating a returned array doesn't change the next call's result; two states built on the same `cards` array give equal answers. A test that `slug`'s memo is cleared after 1000 distinct names (export a small test hook or check through behaviour). A test that `attachmentProblem` returns the same result for the same `(game, cards)` and recomputes for a new `cards` array.
- [ ] **Step 2: Run them** (`npx vitest run src/engine/core/lang/zone-index.test.ts`): they fail (no module).
- [ ] **Step 3: Implement** `zone-index.ts`, switch the imports, and add the three memos (proposal §1, §3–5).
- [ ] **Step 4: Verify:** the new tests pass; the full suite (`npx vitest run`) and typecheck pass; time the Startup test file (best of 3, alternating with BASE) and the four other games' tests.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/zone-index.ts src/engine/core/lang/zone-index.test.ts <the import-only files> src/engine/core/lang/card-facts.ts src/engine/core/lang/zones.ts src/engine/core/lang/attach.ts
git commit -m "perf(lang): the rules read zones and cards through an index kept per state, and memoize table columns, slugs and the attachment check"
```

### Task 2: The long runs read through the index and check cheaply first

**Files:**
- Modify: `src/games/startup-simulator.test.ts`

**Interfaces:**
- Consumes: Task 1's `zoneCards`/`cardById` from `@/engine/core/lang/zone-index`.

- [ ] **Step 1: Switch the test's `zoneCards`/`cardById` import** to `@/engine/core/lang/zone-index` (one import line; name it in the report).
- [ ] **Step 2: Guard the per-move assertions** in `play`, `viewedCards`, `accepts`, `keepsTheRules` and `keepsTheBudget` (and any per-move helper plans since `a9dbedd` added): each `expect(x, msg).toEqual/toBe/toBeLessThanOrEqual/toContain/toBeDefined` becomes a fast check exactly as strict as the matcher (Object.is element by element plus equal length for lists of plain values), and the same `expect` with the same message runs only when the fast check fails; messages are built lazily. Helpers `sameList`/`noneOf`/`sameAs` in the test file.
- [ ] **Step 3: Mutation check:** break two invariants on purpose (e.g. `atMost('agency-row', …)` and `ACTIONS_EACH_TURN`) and confirm the failure text is identical with and without the guards; restore.
- [ ] **Step 4: Verify:** the full suite and typecheck pass; Startup's example count and every tally are unchanged; time the Startup test file (best of 3, alternating with BASE).
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.test.ts
git commit -m "perf(games): Startup Simulator's long runs read zones through the index and run each check's expect only when its cheap test fails"
```
