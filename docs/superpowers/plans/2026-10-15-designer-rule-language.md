# Designer Rule Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Designers describe a whole card game in readable, Gherkin-style text; turnhout compiles it onto the existing engine, flags unknown phrases with suggestions and developer stubs, runs the text's examples, and lets the designer playtest every seat on one screen.

**Architecture:** A pure pipeline under `src/engine/core/lang/`: outline parser → phrase matching against a developer-maintained `PhraseLibrary` (patterns with typed `{params}`) → a Json-serializable `CompiledGame` → `build.ts` turns it into the existing `TableDef`, starting cards, `MoveRegistry` (one generic declared-move handler per verb) and `FlowDef` + a four-entry `FlowRegistry` that delegates to a `LangRuntime`. The engine gains two small additive flow features. A designer page (editor, diagnostics, examples, playtest) sits in `src/pages/designer/`. Hearts and Color Match, written in the language, are the proofs.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, PixiJS 8 (pages/pixi only).

**Spec:** `docs/superpowers/specs/2026-10-15-designer-rule-language-design.md`

## Global Constraints

- Branch `claude/trusting-gauss-fkut0p`. Install once with `bun install`. Single test file: `bunx vitest run <path>`; full suite: `bun run test`; types: `bun run typecheck`.
- **No new dependencies.** No Cucumber, no Gherkin parser, no `.feature` files, no editor library.
- `src/engine/core/**` (including `core/lang/`) stays pure: no pixi/react/DOM imports, no `Math.random`/`Date.now`. Randomness only via `state.rng` and `src/engine/core/rng.ts`.
- Everything in `CompiledGame` is `Json`-serializable. Declare compiled shapes with `type` aliases (not `interface`) so they are assignable to `Json`; use `null`, never `undefined`, for absent values inside them.
- Card ids stay opaque (`c0`…`cN`): shuffle identities with the seeded rng before assigning ids.
- Phrase matching is exact (case-insensitive, whitespace-collapsed, one trailing `.` ignored). Fuzzy matching is used only for suggestions. No AI/NLP.
- Designer-facing text (diagnostics, rejection reasons, example results, page) never contains engine vocabulary (`FlowDef`, `NamedRef`, `zoneId`, stack traces).
- English only. Moves are drags only. Zone positions are automatic.
- Existing behaviour unchanged: all 280 current tests keep passing; `src/pages/hearts-demo/**` is not modified.
- Style: 2-space indent, single quotes, chainable `register*`-style registries, `m.foo as string` casts on move fields.
- Commit prefixes: `feat(core):`, `feat(lang):`, `feat(games):`, `feat(pixi):`, `feat(net):`, `feat(designer):`, `docs:`. TDD every task: failing test → watch it fail → implement → pass → commit.

## Review Focus

- **CRLF line endings and tab indentation** in pasted rule text must parse exactly like LF/spaces (a tab counts as 2 spaces). Test in Task 2.
- **Empty or half-written text** (`""`, or only `Game: X`) must produce diagnostics, never throw, and the page's Play button must say why it is disabled. Tests in Task 9 and Task 16.
- **A rule that never settles** (a trigger whose effects don't falsify its condition) must surface as "The rule on line N (“…”) keeps firing…" in examples and playtest, never a crash or a stack trace. Tests in Task 11 and Task 12.
- **Out-of-range players** (`p7` in a 4-player game, `Given 7 players` for a 2–5 game, a playtest started with the wrong count) must give a readable error. Tests in Task 4, Task 10 and Task 11.
- **Curly quotes and capitals pasted from documents** (`Then it is rejected because “They follow…”.`) must still match and compare equal. Tests in Task 3 and Task 12.

---

### Task 1: Engine — "next player already chosen" and per-phase turn order

**Files:**
- Modify: `src/engine/core/game-state.ts` (`TurnState`)
- Modify: `src/engine/core/flow.ts` (`PhaseDef.endTurn`, `pickNext`, `runFlow`)
- Modify: `src/engine/core/flow-def-validate.ts`
- Test: `src/engine/core/flow.test.ts`, `src/engine/core/flow-def-validate.test.ts`

**Interfaces:**
- Produces:
  - `TurnState.chosen?: boolean` — transient. An effect that picks who goes next sets it; `runFlow` then skips its end-turn step for that call and clears the flag on **every** return path (including end and early `result` returns).
  - `PhaseDef.endTurn.next?: NamedRef` — a turn policy for this phase, overriding `FlowDef.turn.next`.

- [ ] **Step 1: Write the failing tests** (append to the `runFlow` describe in `flow.test.ts`, reusing its `reg`, `mk`, `ctx`)

```ts
it('a trigger that chooses the next player suppresses endTurn and the flag is cleared', () => {
  const r = reg().registerEffect('chooseA', (s) => ({ ...s, turn: { ...s.turn!, current: 'a', chosen: true } }));
  const flow: FlowDef = {
    turn: { order: ['a', 'b', 'c'] },
    phases: [{ id: 'main', allow: 'any', endTurn: { when: 'always' } }],
    triggers: [{ id: 'pick', when: 'aHasCards', then: ['drainA', 'chooseA'] }],
  };
  expect(runFlow(mk(), flow, r, ctx).turn).toEqual({ current: 'a', phase: 'main' });
});

it("a phase onEnter that chooses the next player also suppresses endTurn", () => {
  const r = reg().registerEffect('chooseC', (s) => ({ ...s, turn: { ...s.turn!, current: 'c', chosen: true } }));
  const flow: FlowDef = {
    turn: { order: ['a', 'b', 'c'] },
    phases: [
      { id: 'main', allow: 'any', advance: { when: 'always', to: 'next' } },
      { id: 'next', allow: 'any', onEnter: ['chooseC'], endTurn: { when: 'always' } },
    ],
  };
  expect(runFlow(mk(), flow, r, ctx).turn).toEqual({ current: 'c', phase: 'next' });
});

it('without the flag, endTurn still fires after a trigger', () => {
  const flow: FlowDef = {
    turn: { order: ['a', 'b'] },
    phases: [{ id: 'main', allow: 'any', endTurn: { when: 'always' } }],
    triggers: [{ id: 'drain', when: 'aHasCards', then: ['drainA'] }],
  };
  expect(runFlow(mk(), flow, reg(), ctx).turn?.current).toBe('b');
});

it('clears the flag when the game ends', () => {
  const r = reg().registerEffect('chooseAndFinish', (s) => ({ ...s, turn: { ...s.turn!, chosen: true }, result: { done: true } }));
  const flow: FlowDef = { turn: { order: ['a'] }, phases: [{ id: 'main', allow: 'any' }], end: [{ when: 'always', result: 'chooseAndFinish' }] };
  expect(runFlow(mk(), flow, r, ctx).turn).toEqual({ current: 'a', phase: 'main' });
});

it('endTurn.next overrides turn.next for that phase', () => {
  const r = reg().registerPolicy('toC', () => 'c').registerPolicy('toB', () => 'b');
  const flow: FlowDef = {
    turn: { order: ['a', 'b', 'c'], next: 'toC' },
    phases: [{ id: 'main', allow: 'any', endTurn: { when: 'always', next: 'toB' } }],
  };
  expect(runFlow(mk(), flow, r, ctx).turn?.current).toBe('b');
});
```

And in `flow-def-validate.test.ts`:

```ts
it('reports an unknown per-phase endTurn.next policy', () => {
  const flow: FlowDef = { turn: { order: ['a'] }, phases: [{ id: 'main', allow: 'any', endTurn: { when: 'always', next: 'nope' } }] };
  const reg = new FlowRegistry().registerPredicate('always', () => true);
  expect(validateFlowDef(flow, reg).errors).toContain('phase main endTurn.next references unknown policy: nope');
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `bunx vitest run src/engine/core/flow.test.ts src/engine/core/flow-def-validate.test.ts`
Expected: FAIL (type error on `chosen`/`next`, wrong `current`).

- [ ] **Step 3: Implement**

Add `chosen?: boolean` (with the doc comment above) to `TurnState`. Add `next?: NamedRef` to `PhaseDef.endTurn`. `pickNext` takes the current phase and uses `phase.endTurn?.next ?? flow.turn.next`. In `runFlow`, the end-turn step also requires `!s.turn?.chosen`; strip `chosen` from `turn` on every return (a small `clearChosen(s)` helper; return the same object when the flag is absent). Validate `endTurn.next` with the message in the test.

- [ ] **Step 4: Run the whole suite**

Run: `bun run test && bun run typecheck`
Expected: all pass (existing 280 + 6 new).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/flow-def-validate.ts src/engine/core/flow.test.ts src/engine/core/flow-def-validate.test.ts
git commit -m "feat(core): chosen-next-player flag and per-phase turn policy in runFlow"
```

---

### Task 2: Outline parser and diagnostics types

**Files:**
- Create: `src/engine/core/lang/diagnostics.ts`, `src/engine/core/lang/outline.ts`
- Test: `src/engine/core/lang/outline.test.ts`

**Interfaces:**
- Produces:

```ts
// diagnostics.ts
export type Diagnostic = {
  line: number;
  severity: 'error' | 'warning';
  kind: 'unknown-phrase' | 'ambiguous-phrase' | 'invalid' | 'structure';
  message: string;          // designer-readable
  text?: string;            // the offending phrase
  suggestions?: string[];   // up to 3, display form
  stub?: string;            // developer stub (unknown phrases only)
};
export class RuleError extends Error { constructor(message: string, public line?: number, public text?: string) }
export class MissingPhraseError extends RuleError {}

// outline.ts
export type OutlineTable = { columns: string[]; rows: { cells: string[]; line: number }[] };
export type OutlineNode = { text: string; line: number; children: OutlineNode[]; table: OutlineTable | null };
export function parseOutline(text: string): { roots: OutlineNode[]; diagnostics: Diagnostic[] };
```

Rules: split on `/\r?\n/`; expand each tab to 2 spaces; `trimEnd`; skip blank lines and lines whose trimmed text starts with `#`; `line` is 1-based in the original text. A line indented deeper than the previous line is its child. A dedent that matches no open level → `structure` error "This line's indentation doesn't line up with any line above." and the node attaches to the nearest shallower parent. Lines whose trimmed text starts with `|` are table rows of the node they are nested under: first row = `columns`, later rows = `rows`; cells are split on `|`, trimmed, outer empties dropped. A row with a different cell count than the header → error "This row has N cell(s) but the header has M." (singular "cell" when N is 1)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { parseOutline } from './outline';

describe('parseOutline', () => {
  it('nests by indentation and keeps 1-based line numbers', () => {
    const { roots, diagnostics } = parseOutline('Phase: a\n  When x:\n    Do y.\n  Hint: z\nEnd:');
    expect(diagnostics).toEqual([]);
    expect(roots.map((r) => [r.text, r.line])).toEqual([['Phase: a', 1], ['End:', 5]]);
    expect(roots[0].children.map((c) => c.text)).toEqual(['When x:', 'Hint: z']);
    expect(roots[0].children[0].children[0]).toMatchObject({ text: 'Do y.', line: 3 });
  });

  it('treats CRLF and tabs like LF and two spaces', () => {
    expect(parseOutline('A:\r\n\tB\r\n\t\tC').roots).toEqual(parseOutline('A:\n  B\n    C').roots);
  });

  it('skips blank lines and # comments without shifting line numbers', () => {
    const { roots } = parseOutline('# note\n\nA:\n  # inner\n  B');
    expect(roots[0]).toMatchObject({ text: 'A:', line: 3 });
    expect(roots[0].children[0]).toMatchObject({ text: 'B', line: 5 });
  });

  it('attaches table rows to the line they are nested under', () => {
    const { roots } = parseOutline('Cards:\n  A deck:\n    | color | number |\n    | red   | 1 to 9 |');
    expect(roots[0].children[0].table).toEqual({ columns: ['color', 'number'], rows: [{ cells: ['red', '1 to 9'], line: 4 }] });
    expect(roots[0].children[0].children).toEqual([]);
  });

  it('reports a row whose cell count differs from the header', () => {
    const { diagnostics } = parseOutline('A:\n  | a | b |\n  | 1 |');
    expect(diagnostics).toEqual([expect.objectContaining({ line: 3, severity: 'error', message: 'This row has 1 cell but the header has 2.' })]);
  });

  it('reports a dedent that matches no open level', () => {
    const { diagnostics } = parseOutline('A:\n    B\n  C');
    expect(diagnostics[0]).toMatchObject({ line: 3, kind: 'structure' });
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `bunx vitest run src/engine/core/lang/outline.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement** `diagnostics.ts` and `parseOutline` per the rules above (`RuleError` sets `name = 'RuleError'`).
- [ ] **Step 4: Run to verify it passes** — same command → PASS.
- [ ] **Step 5: Commit** — `git add src/engine/core/lang && git commit -m "feat(lang): outline parser and diagnostic types"`

---

### Task 3: Shared types and the phrase library

**Files:**
- Create: `src/engine/core/lang/types.ts`, `src/engine/core/lang/phrases.ts`
- Test: `src/engine/core/lang/phrases.test.ts`

**Interfaces:**
- Consumes: `Json` (`../table-def`), `GameState` (`../game-state`), `Move` (`../moves`), `PlayerId` (`../scene`).
- Produces (`types.ts` — every later task uses these names):

```ts
export type PhraseKind = 'cards' | 'zone' | 'condition' | 'effect' | 'turn' | 'score' | 'winner' | 'given' | 'action' | 'expect';
/** kind 'lang' = compiler built-ins: all | any | phase | always | if | missing */
export type PhraseRef = { kind: PhraseKind | 'lang'; phrase: string; args: Json[]; line: number; text: string };
export type SeatRef = { seat: string } | { who: 'actor' | 'winner' };
export type ZoneRef = { shared: string } | { each: string } | { of: SeatRef; zone: string };
export type CardMatch = { [attr: string]: Json };
export type ZoneSpec = { name: string; perPlayer: boolean; layout: 'pile' | 'row' | 'hand'; visibility: 'secret' | 'owner' | 'public' };
export type CardIdentity = { attrs: { [k: string]: Json }; faceKey: string };
export type CardSetSpec = { kind: 'standard' | 'table'; identities: CardIdentity[]; start: string; acesHigh: boolean };
export type CardTable = { columns: string[]; rows: { cells: string[]; line: number }[] };
export type CondGroup = { mode: 'all' | 'any'; refs: PhraseRef[]; text: string; line: number };
export type DeclaredMove = { verb: string; from: ZoneRef; to: ZoneRef; fromText: string; conditions: CondGroup[]; effects: PhraseRef[]; line: number };
export type CompiledTrigger = { line: number; text: string; when: PhraseRef; conditions: CondGroup[]; effects: PhraseRef[] };
export type CompiledPhase = {
  id: string; line: number; hint: string | null; actor: 'current' | 'any'; rearrange: string[];
  moves: DeclaredMove[]; onEnter: PhraseRef[]; goTo: { when: PhraseRef; to: string; line: number } | null;
  triggers: CompiledTrigger[]; after: { verbs: string[]; next: PhraseRef; line: number } | null;
};
export type CompiledEnd = { line: number; when: PhraseRef; scores: PhraseRef[]; winner: PhraseRef };
export type ExampleStep = { keyword: 'given' | 'when' | 'then'; ref: PhraseRef };
export type CompiledExample = { name: string; line: number; players: number | null; steps: ExampleStep[] };
export type CompiledGame = {
  name: string; players: { min: number; max: number }; zones: ZoneSpec[]; cards: CardSetSpec[];
  setup: PhraseRef[]; phases: CompiledPhase[]; end: CompiledEnd | null; examples: CompiledExample[];
};
export type Vocab = {
  sharedZones: string[]; playerZones: string[]; maxPlayers: number; phases: string[]; verbs: string[];
  attributes: string[]; cardValues: { attribute: string; value: Json }[]; standardDeck: boolean;
};
export interface MoveInfo { verb: string; by: PlayerId; cardId: string; from: string; to: string }
export interface ExampleEnv {
  last: { ok: boolean; reason?: string } | null;
  claim(match: CardMatch, text: string, state: GameState): string;   // returns a card id
  setUp(state: GameState): GameState;
}
export interface PhraseEnv {
  state: GameState; game: CompiledGame; seats: PlayerId[]; move?: MoveInfo;
  check(state: GameState, move: Move): true | string;
  example?: ExampleEnv;
}
export type ConditionFn = (env: PhraseEnv, args: Json[]) => boolean;
export type EffectFn = (env: PhraseEnv, args: Json[]) => GameState;   // also 'given'
export type TurnFn = (env: PhraseEnv, args: Json[]) => PlayerId;
export type ScoreFn = (env: PhraseEnv, args: Json[], seat: PlayerId) => number;
export type WinnerFn = (env: PhraseEnv, args: Json[], scores: Record<PlayerId, number>) => PlayerId;
export type ActionFn = (env: PhraseEnv, args: Json[]) => { by: PlayerId; move: Move };
export type ExpectFn = (env: PhraseEnv, args: Json[]) => true | string;
export type CardsFn = (args: Json[], table: CardTable | null) => CardSetSpec;
export type ZoneFn = (args: Json[]) => ZoneSpec;
export interface ParamType {
  name: string; label: string;                      // label e.g. '[number]', used in suggestions
  source(vocab: Vocab): string;                      // regex source, no capture groups
  resolve(text: string, vocab: Vocab): { value: Json } | { error: string };
  stubOrder?: number;                                // lower = replaced first by stubFor
}
```

- Produces (`phrases.ts`):

```ts
export const STATIC_TYPES: ParamType[];   // int, string, word, name, layout, visibility
export function emptyVocab(): Vocab;
export function normalizeLine(text: string): string;   // trim, collapse whitespace, drop one trailing '.'
export type MatchResult =
  | { status: 'ok'; pattern: string; args: Json[] }
  | { status: 'unknown'; suggestions: string[] }
  | { status: 'ambiguous'; patterns: string[] }
  | { status: 'invalid'; message: string };
export class PhraseLibrary {
  constructor(types: ParamType[]);
  cards(p: string, fn: CardsFn): this; zone(p: string, fn: ZoneFn): this;
  condition(p: string, fn: ConditionFn, opts?: { needsMove?: boolean }): this;
  effect(p: string, fn: EffectFn, opts?: { needsMove?: boolean }): this;
  turn(p: string, fn: TurnFn): this; score(p: string, fn: ScoreFn): this; winner(p: string, fn: WinnerFn): this;
  given(p: string, fn: EffectFn): this; action(p: string, fn: ActionFn): this; expect(p: string, fn: ExpectFn): this;
  get(kind: PhraseKind, pattern: string): { fn: unknown; needsMove: boolean } | undefined;
  match(kind: PhraseKind, text: string, vocab: Vocab): MatchResult;
  types(): ParamType[];
}
export function stubFor(kind: PhraseKind, text: string, vocab: Vocab, types: ParamType[], where: { game: string; line: number }): string;
```

Notes the tests don't fix:
- Method names avoid `then` on purpose (an object with a `then` method is a thenable). The example kinds are `given`/`action`/`expect`.
- Patterns are stored lowercased and are the phrase's stable id. Compile a pattern to `^…$` with flag `i`: literal text escaped, runs of spaces → `\s+`, `(s)` → `(?:s)?`, `{type}` → `(<source(vocab)>)`. Registering a pattern with an unknown `{type}` throws `unknown parameter type {foo} in "<pattern>"`. Cache compiled regexes per vocab object (`WeakMap`).
- `match` runs on `normalizeLine(text)` (case kept, so `{string}` keeps case). Each matching pattern resolves its captures; any `{error}` makes it an `invalid` candidate. Exactly one ok → `ok`; several ok → `ambiguous`; none ok but some invalid → first `invalid`; none → `unknown` with suggestions.
- Suggestions: Dice coefficient of character bigrams between the normalized, lowercased line and the pattern's literal text (params removed, spaces collapsed) — bigrams so typos like "Shufle" still find "shuffle"; keep score ≥ 0.4; top 3, best first; display form = pattern with each `{type}` replaced by its `label`.
- Static types: `int` (`-?\d+` → number, label `[number]`, stubOrder 5), `string` (straight or curly double quotes `["“”]…["“”]` → inner text, label `[text]`, stubOrder 1), `word` (`\S+`), `name` (`.+?` → lowercased, label `[name]`), `layout` (`pile|row|hand`), `visibility` (`no one can see` → `secret`, `only they can see` → `owner`, `everyone can see` → `public`).
- `stubFor`: normalize and lowercase the text, then replace matches of each type with a `stubOrder`, ascending, by `{name}`; emit exactly the format in the test; destructured args are `a1…an`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { PhraseLibrary, STATIC_TYPES, emptyVocab, stubFor } from './phrases';
import type { ParamType } from './types';

const V = emptyVocab();
const lib = () => new PhraseLibrary(STATIC_TYPES);

describe('PhraseLibrary.match', () => {
  it('ignores case, extra spaces and one trailing period', () => {
    const l = lib().effect('deal {int} cards', (env) => env.state);
    expect(l.match('effect', 'Deal  3 cards.', V)).toEqual({ status: 'ok', pattern: 'deal {int} cards', args: [3] });
  });

  it('supports an optional (s)', () => {
    const l = lib().score('scores {int} point(s)', () => 0);
    expect(l.match('score', 'scores 1 point', V).status).toBe('ok');
    expect(l.match('score', 'scores 2 points', V).status).toBe('ok');
  });

  it('{string} accepts straight and curly quotes and keeps case', () => {
    const l = lib().expect('it is rejected because {string}', () => true);
    expect(l.match('expect', 'It is rejected because “They Can’t”.', V)).toMatchObject({ status: 'ok', args: ['They Can’t'] });
    expect(l.match('expect', 'it is rejected because "x"', V)).toMatchObject({ status: 'ok', args: ['x'] });
  });

  it('keeps kinds separate', () => {
    const l = lib().condition('hearts are broken', () => true).effect('hearts are broken', (e) => e.state);
    expect(l.match('condition', 'Hearts are broken', V).status).toBe('ok');
    expect(l.match('effect', 'Hearts are broken', V).status).toBe('ok');
    expect(l.match('turn', 'Hearts are broken', V).status).toBe('unknown');
  });

  it('reports ambiguity', () => {
    const l = lib().effect('move {name}', (e) => e.state).effect('move the {name}', (e) => e.state);
    expect(l.match('effect', 'move the deck', V)).toEqual({ status: 'ambiguous', patterns: ['move {name}', 'move the {name}'] });
  });

  it('suggests the closest phrases of the same kind', () => {
    const l = lib()
      .effect('shuffle {name}', (e) => e.state)
      .effect('deal {int} cards from the deck', (e) => e.state)
      .effect('flip a coin', (e) => e.state);
    const r = l.match('effect', 'Deal 3 card from the deck', V);
    expect(r.status).toBe('unknown');
    if (r.status === 'unknown') {
      expect(r.suggestions[0]).toBe('deal [number] cards from the deck');
      expect(r.suggestions).not.toContain('flip a coin');
    }
  });

  it('reports a parameter that fails to resolve as invalid', () => {
    const even: ParamType = { name: 'even', label: '[even]', source: () => '\\d+', resolve: (t) => (Number(t) % 2 === 0 ? { value: Number(t) } : { error: `${t} is odd` }) };
    const l = new PhraseLibrary([...STATIC_TYPES, even]).condition('{even} things', () => true);
    expect(l.match('condition', '3 things', V)).toEqual({ status: 'invalid', message: '3 is odd' });
  });

  it('rejects unknown parameter types at registration', () => {
    expect(() => lib().effect('do {foo}', (e) => e.state)).toThrow('unknown parameter type {foo} in "do {foo}"');
  });
});

describe('stubFor', () => {
  it('writes a ready-to-paste stub with typed parameters', () => {
    expect(stubFor('effect', 'The winner draws 2 cards.', V, STATIC_TYPES, { game: 'Hearts', line: 31 })).toBe(
      [
        '// Requested by a designer — game "Hearts", line 31:',
        '//   "The winner draws 2 cards"',
        "library.effect('the winner draws {int} cards', (env, [a1]) => {",
        "  throw new Error('not implemented yet');",
        '});',
      ].join('\n'),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `bunx vitest run src/engine/core/lang/phrases.test.ts` → FAIL.
- [ ] **Step 3: Implement** `types.ts` (exactly as above) and `phrases.ts`.
- [ ] **Step 4: Run to verify it passes** — PASS; `bun run typecheck` clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(lang): phrase library with typed patterns, suggestions and stubs"`

---

### Task 4: Vocabulary parameter types and zone/card references

**Files:**
- Create: `src/engine/core/lang/refs.ts`, `src/engine/core/lang/zones.ts`
- Test: `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/zones.test.ts`

**Interfaces:**
- Consumes: Task 3 types; `cardsByZone` (`../scene`), `zoneCards` (`../game-state`).
- Produces (`refs.ts`):
  - `VOCAB_TYPES: ParamType[]` — `zone`, `zones`, `perzone`, `player`, `phase`, `move`, `attribute`, `card`, `cardlist`, `cardclass`. Labels: `[zone]`, `[zones]`, `[zone]`, `[player]`, `[phase]`, `[action]`, `[attribute]`, `[card]`, `[cards]`, `[kind of card]`. stubOrder: card 2, zone 3, player 4.
  - `parseParam(type: string, text: string, vocab: Vocab): { value: Json } | { error: string } | null` (null = the type's regex does not fully match).
  - `thirdPerson(verb: string): string` — `+es` after s/sh/ch/x/z, else `+s`.
  - `STANDARD_RANKS` (`ace`→1, `2`…`10`, `jack`→11, `queen`→12, `king`→13), `STANDARD_SUITS` (`clubs`→`C`, `diamonds`→`D`, `hearts`→`H`, `spades`→`S`; singular forms accepted in `cardclass`).
- Produces (`zones.ts`):

```ts
export const BOX_ZONE = '__box';     // out-of-play zone used by examples
export const WINNER_KEY = 'lang:winner';
export function slug(name: string): string;                          // 'pass pile' → 'pass-pile'
export function zoneIdFor(name: string, seat?: PlayerId): string;    // 'trick' | 'pass-pile-p1'
export function zoneInfo(game: CompiledGame, zoneId: string): { spec: ZoneSpec; seat: PlayerId | null } | null;
export function resolveSeat(ref: SeatRef, env: PhraseEnv, actor?: PlayerId): PlayerId;
export function resolveZoneIds(ref: ZoneRef, env: PhraseEnv, actor?: PlayerId): string[];
export function handZoneOf(game: CompiledGame, seat: PlayerId): string;
export function leftOf(seat: PlayerId, seats: PlayerId[]): PlayerId;
export function matchesCard(card: CardState, match: CardMatch): boolean;
export function topCard(state: GameState, zoneId: string): CardState | undefined;
export function relocate(state: GameState, cardIds: string[], toZoneId: string, game: CompiledGame): GameState;
export function chooseNext(state: GameState, seat: PlayerId): GameState;
```

Reference forms (`zone` type): optional prefix + zone name (names alternated longest first). `the X`/`X` with X shared → `{ shared: X }`; `their X` → `{ of: { who: 'actor' }, zone: X }`; `each X`/`every X` → `{ each: X }`; `the winner's X` → `{ of: { who: 'winner' }, zone: X }`; `pN's X` → `{ of: { seat: 'pN' }, zone: X }`. Errors: a per-player name without an owner ("“the hand” — whose hand? Say “their hand”, “each hand” or “p1's hand”."), an owner on a shared name ("“the trick” is shared, so it has no owner."). `zones` = one or more `zone`s joined by `, ` or ` and `. `player` = `p\d+`, error past `maxPlayers` ("This game only has players p0 to p3."). `card`: standard form `(the )?<rank> of <suit>` when `vocab.standardDeck`; custom form `(a|an|the) <value>( <value>)*` where each value is a card-table value — every value must belong to exactly one attribute ("“7” could be number or cost."), numbers resolve as numbers. `cardlist` = cards joined by `, `/` and `. `cardclass` = `(a |an )?<suit singular|plural>` or `(a |an )?<value>( <value>)*( cards?)?`. `move` = third-person forms of `vocab.verbs` → base verb. `perzone` = a per-player name. `phase`, `attribute` = from vocab.

Runtime helpers: `resolveSeat` — `actor` uses `actor ?? env.move?.by` (RuleError "Only a rule about a player's move can say “their”." if missing); `winner` reads `state.data[WINNER_KEY]` (RuleError "There is no winner yet." if unset). `each` resolves in seat order. `relocate` appends in the given order with `slot` continuing after the zone's existing cards, sets `faceUp = visibility === 'public'` (false for zones not in the game, e.g. `BOX_ZONE`), keeps all other card fields. `chooseNext` sets `turn.current` and `turn.chosen = true`. `matchesCard` compares each match key with `card.data?.[key]`.

- [ ] **Step 1: Write the failing tests**

```ts
// refs.test.ts
import { describe, expect, it } from 'vitest';
import { parseParam, thirdPerson } from './refs';
import { emptyVocab } from './phrases';
import type { Vocab } from './types';

const V: Vocab = {
  ...emptyVocab(),
  sharedZones: ['trick', 'deck', 'draw pile'], playerZones: ['hand', 'pass pile', 'won pile'], maxPlayers: 4,
  phases: ['passing', 'playing'], verbs: ['play', 'pass', 'draw'], attributes: ['color', 'number'], standardDeck: true,
  cardValues: [{ attribute: 'color', value: 'red' }, { attribute: 'color', value: 'blue' }, { attribute: 'number', value: 7 }, { attribute: 'number', value: 2 }],
};

describe('zone references', () => {
  it.each([
    ['the trick', { shared: 'trick' }],
    ['their hand', { of: { who: 'actor' }, zone: 'hand' }],
    ['each pass pile', { each: 'pass pile' }],
    ['every pass pile', { each: 'pass pile' }],
    ["the winner's won pile", { of: { who: 'winner' }, zone: 'won pile' }],
    ["p2's hand", { of: { seat: 'p2' }, zone: 'hand' }],
  ])('%s', (text, value) => expect(parseParam('zone', text, V)).toEqual({ value }));

  it('asks whose zone a per-player name means', () => {
    expect(parseParam('zone', 'the hand', V)).toEqual({ error: '“the hand” — whose hand? Say “their hand”, “each hand” or “p1\'s hand”.' });
  });
  it('rejects an owner on a shared zone', () => {
    expect(parseParam('zone', 'their trick', V)).toEqual({ error: '“the trick” is shared, so it has no owner.' });
  });
  it('parses zone lists', () => {
    expect(parseParam('zones', 'every hand and the trick', V)).toEqual({ value: [{ each: 'hand' }, { shared: 'trick' }] });
  });
});

describe('players, moves and cards', () => {
  it('checks the player count', () => {
    expect(parseParam('player', 'p3', V)).toEqual({ value: 'p3' });
    expect(parseParam('player', 'p7', V)).toEqual({ error: 'This game only has players p0 to p3.' });
  });
  it('maps third-person verbs back to declared verbs', () => {
    expect(parseParam('move', 'passes', V)).toEqual({ value: 'pass' });
    expect([thirdPerson('play'), thirdPerson('pass'), thirdPerson('catch'), thirdPerson('fix')]).toEqual(['plays', 'passes', 'catches', 'fixes']);
  });
  it('reads standard and custom cards', () => {
    expect(parseParam('card', 'the queen of spades', V)).toEqual({ value: { suit: 'S', rank: 12 } });
    expect(parseParam('card', 'the ace of clubs', V)).toEqual({ value: { suit: 'C', rank: 1 } });
    expect(parseParam('card', 'a red 7', V)).toEqual({ value: { color: 'red', number: 7 } });
    expect(parseParam('card', 'a purple 7', V)).toBeNull();
  });
  it('reads card lists and kinds of card', () => {
    expect(parseParam('cardlist', 'a blue 2, a red 7 and the 2 of hearts', V)).toEqual({ value: [{ color: 'blue', number: 2 }, { color: 'red', number: 7 }, { suit: 'H', rank: 2 }] });
    expect(parseParam('cardclass', 'a heart', V)).toEqual({ value: { suit: 'H' } });
    expect(parseParam('cardclass', 'hearts', V)).toEqual({ value: { suit: 'H' } });
  });
});
```

```ts
// zones.test.ts — build a CompiledGame fixture inline with zones:
//   trick (shared row public), deck (shared pile secret), hand (per-player hand owner), won pile (per-player pile public)
// and a PhraseEnv with seats ['p0','p1','p2'], check: () => true.
it('names zones by slug and seat', () => { expect(zoneIdFor('pass pile', 'p1')).toBe('pass-pile-p1'); expect(zoneIdFor('trick')).toBe('trick'); });
it('resolves each/actor/winner refs', () => {
  // each won pile → ['won-pile-p0','won-pile-p1','won-pile-p2']
  // their hand with env.move.by 'p1' → ['hand-p1']; with actor arg 'p2' → ['hand-p2']
  // the winner's won pile with state.data['lang:winner'] = 'p2' → ['won-pile-p2']; unset → throws RuleError 'There is no winner yet.'
});
it('relocate appends after existing cards and turns faces by visibility', () => {
  // trick holds c1 (slot 0); relocate(['c2','c3'], 'trick') → slots 1,2, faceUp true; relocate to 'hand-p0' → faceUp false
});
it('leftOf wraps, chooseNext marks the choice', () => {
  // leftOf('p2', seats) === 'p0'; chooseNext(state,'p1').turn → { current: 'p1', phase: …, chosen: true }
});
```

Write the `zones.test.ts` bodies as the comments state, with concrete `expect` calls.

- [ ] **Step 2: Run to verify they fail** — `bunx vitest run src/engine/core/lang/refs.test.ts src/engine/core/lang/zones.test.ts` → FAIL.
- [ ] **Step 3: Implement** `refs.ts` and `zones.ts`.
- [ ] **Step 4: Run to verify they pass** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(lang): vocabulary parameter types and zone/card references"`

---

### Task 5: Cards and table phrases

**Files:**
- Create: `src/engine/core/lang/cards.ts`, `src/engine/core/lang/library/setup-phrases.ts`
- Test: `src/engine/core/lang/cards.test.ts`, `src/engine/core/lang/library/setup-phrases.test.ts`

**Interfaces:**
- Consumes: `shuffleWithRng`, `RngState` (`../rng`); Task 3/4.
- Produces:

```ts
// cards.ts
export function textFaceKey(attrs: { [k: string]: Json }): string;          // 't:color=red;number=7' (column order, encodeURIComponent on keys/values)
export function parseTextFaceKey(key: string): Record<string, string> | null;
export function standardDeckIdentities(): CardIdentity[];                    // 52, attrs { suit, rank }, faceKey `${rank}${suit}`, suits S,H,D,C × ranks 1..13
export function expandCardTable(table: CardTable): CardIdentity[];
export function buildCards(sets: CardSetSpec[], rng: RngState): { cards: CardState[]; rng: RngState };
// setup-phrases.ts
export function registerSetupPhrases(lib: PhraseLibrary): PhraseLibrary;
```

`expandCardTable`: columns except `copies` become attributes; a cell `a to b` (integers) expands into one row per value; cells that are integers become numbers, others stay strings; `copies` (default 1) repeats the row; a non-integer `copies` throws `RuleError('copies must be a whole number', row.line)`. `buildCards`: concatenate every set's identities, shuffle the identity list with the rng, then assign ids `c0…` in that order; `zoneId = zoneIdFor(set.start)`, `faceUp: false`, `data = { ...attrs }`.

Setup phrases (exact patterns):

| kind | pattern | result |
|---|---|---|
| cards | `a standard 52-card deck, starting in {zone}` | `{ kind: 'standard', identities: standardDeckIdentities(), start, acesHigh: false }` |
| cards | `a standard 52-card deck, aces high, starting in {zone}` | same, `acesHigh: true` |
| cards | `a deck called {name}, starting in {zone}` | `{ kind: 'table', identities: expandCardTable(table), … }`; no table → RuleError "Add a table of cards under this line." |
| zone | `the {name} is a {layout} in the center that {visibility}` | shared `ZoneSpec`; `owner` visibility → RuleError "Only a player's own zone can be “only they can see”." |
| zone | `each player has a {name} that {visibility}` | per-player; layout `hand` if the name is `hand` or ends in ` hand`, else `pile` |

The `{zone}` in a cards phrase must be `{ shared }` (RuleError "Cards must start in a shared zone, like “the deck”."); `start` stores the zone name.

- [ ] **Step 1: Write the failing tests**

```ts
// cards.test.ts
import { describe, expect, it } from 'vitest';
import { buildCards, expandCardTable, parseTextFaceKey, standardDeckIdentities, textFaceKey } from './cards';
import { makeRng } from '../rng';

const COLOR_TABLE = { columns: ['color', 'number', 'copies'], rows: ['red', 'yellow', 'green', 'blue'].map((c, i) => ({ cells: [c, '1 to 9', '2'], line: 10 + i })) };

describe('card tables', () => {
  it('expands ranges and copies, numbers stay numbers', () => {
    const ids = expandCardTable(COLOR_TABLE);
    expect(ids).toHaveLength(72);
    expect(ids[0]).toEqual({ attrs: { color: 'red', number: 1 }, faceKey: 't:color=red;number=1' });
    expect(ids.filter((c) => c.attrs.color === 'blue' && c.attrs.number === 7)).toHaveLength(2);
  });
  it('defaults copies to 1 and rejects bad copies', () => {
    expect(expandCardTable({ columns: ['name'], rows: [{ cells: ['Goblin'], line: 3 }] })).toHaveLength(1);
    expect(() => expandCardTable({ columns: ['name', 'copies'], rows: [{ cells: ['Goblin', 'two'], line: 3 }] })).toThrow('copies must be a whole number');
  });
  it('round-trips text face keys', () => {
    expect(parseTextFaceKey(textFaceKey({ name: 'Big Troll', attack: 4 }))).toEqual({ name: 'Big Troll', attack: '4' });
    expect(parseTextFaceKey('12S')).toBeNull();
  });
});

describe('buildCards', () => {
  const sets = [{ kind: 'standard' as const, identities: standardDeckIdentities(), start: 'deck', acesHigh: true }];
  const mapping = (seed: number) => buildCards(sets, makeRng(seed)).cards.map((c) => `${c.id}:${c.faceKey}`);
  it('assigns opaque ids after shuffling identities', () => {
    const { cards } = buildCards(sets, makeRng(7));
    expect(cards).toHaveLength(52);
    expect(cards.every((c, i) => c.id === `c${i}` && c.zoneId === 'deck' && !c.faceUp)).toBe(true);
    expect(mapping(7)).toEqual(mapping(7));
    expect(mapping(7)).not.toEqual(mapping(8));
    expect(cards.map((c) => c.faceKey)).not.toEqual(standardDeckIdentities().map((c) => c.faceKey));
  });
});
```

```ts
// setup-phrases.test.ts — library = registerSetupPhrases(new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES]))
// vocab with sharedZones ['deck','draw pile'], playerZones ['hand']
it('matches the standard deck with and without aces high', () => { /* match('cards', 'A standard 52-card deck, aces high, starting in the deck.') → ok; call fn → acesHigh true, start 'deck' */ });
it('builds a table deck', () => { /* 'A deck called color cards, starting in the draw pile' with COLOR_TABLE → 72 identities, kind 'table' */ });
it('declares shared and per-player zones', () => {
  // 'The trick is a row in the center that everyone can see' → { name:'trick', perPlayer:false, layout:'row', visibility:'public' }
  // 'Each player has a pass pile that only they can see' → { name:'pass pile', perPlayer:true, layout:'pile', visibility:'owner' }
  // 'Each player has a hand that only they can see' → layout 'hand'
  // 'The deck is a pile in the center that only they can see' → fn throws RuleError
});
```

- [ ] **Step 2: Run to verify they fail** — `bunx vitest run src/engine/core/lang/cards.test.ts src/engine/core/lang/library/setup-phrases.test.ts` → FAIL.
- [ ] **Step 3: Implement** `cards.ts` and `setup-phrases.ts`.
- [ ] **Step 4: Run to verify they pass** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(lang): card sets, opaque card ids and table phrases"`

---

### Task 6: Built-in gameplay phrases and the default library

**Files:**
- Create: `src/engine/core/lang/testing.ts` (test fixtures, pure), `src/engine/core/lang/library/flow-phrases.ts`, `library/move-phrases.ts`, `library/standard-deck.ts`, `library/hearts.ts`, `library/index.ts`
- Test: `library/flow-phrases.test.ts`, `library/move-phrases.test.ts`, `library/standard-deck.test.ts`

**Interfaces:**
- Consumes: Tasks 3–5.
- Produces:
  - `registerFlowPhrases`, `registerMovePhrases`, `registerStandardDeckPhrases`, `registerHeartsPhrases` — each `(lib: PhraseLibrary) => PhraseLibrary`.
  - `createDefaultLibrary(): PhraseLibrary` — `new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])` with setup, flow, move, standard-deck and Hearts phrases (Task 7 adds example phrases).
  - `testing.ts`: `fixtureGame(over?: Partial<CompiledGame>): CompiledGame` (zones: `deck` shared pile secret, `trick` shared row public, `discard pile` shared pile public, `hand`/`pass pile`/`won pile` per-player, standard deck aces high starting in `deck`, no phases); `fixtureEnv(state: GameState, opts?: { game?: CompiledGame; seats?: PlayerId[]; move?: MoveInfo; check?: PhraseEnv['check'] }): PhraseEnv`; `fixtureCard(id: string, zoneId: string, data: Record<string, Json>, over?: Partial<CardState>): CardState`.

Phrases (exact patterns; `*` = registered with `{ needsMove: true }`):

| file | kind | pattern | meaning |
|---|---|---|---|
| flow | condition | `{zone} has {int} card(s)` | `each`: every zone has exactly n; otherwise the zone has n |
| flow | condition | `{zone} has fewer than {int} cards` | same quantifier |
| flow | condition | `{zone} has more than {int} card(s)` | same quantifier |
| flow | condition | `{zone} is empty` / `{zone} is not empty` | same quantifier |
| flow | condition | `{zones} are empty` | every zone of every ref empty |
| flow | condition | `a player's {perzone} is empty` | some seat's zone empty |
| flow | effect | `shuffle {zone}` | `shuffleWithRng`, rewrite slots (as `shuffleZone` does) |
| flow | effect | `deal {int} cards from {zone} to {zone}` | per target zone in seat order, move the top n (`slice(-n)`) via `relocate`; too few → RuleError "Only N cards are left in the deck." |
| flow | effect | `move {zone} to {zone}` | all cards of the source(s) to the single target |
| flow | effect | `move the top card of {zone} to {zone}` | |
| flow | effect | `shuffle {zone}, except its top card, into {zone}` | all but the top card, shuffled, appended to target |
| flow | effect | `each {perzone} goes to the {perzone} of the player on its owner's left` | computed for all seats first, then applied |
| flow | effect | `the winner goes next` | `chooseNext(winner)` |
| flow | effect | `the player holding {card} goes first` | owner seat of the zone holding the matching card → `chooseNext`; not held → RuleError |
| flow | turn | `the turn passes to the left` | `leftOf(current)` |
| flow | score | `each {cardclass} in a player's {perzone} scores {int} point(s)` | matches × n |
| flow | score | `{card} in a player's {perzone} scores {int} point(s)` | n if present |
| flow | winner | `the lowest score wins` / `the highest score wins` | ties → earliest seat |
| flow | winner | `the player with an empty {perzone} wins` | earliest seat with that zone empty |
| move | condition* | `the card is {cardclass}` / `the card is not {cardclass}` | on `env.move.cardId` |
| move | condition* | `the card has the same {attribute} as the top card of {zone}` | true when the zone is empty |
| move | condition* | `they hold only {cardclass}` | every card in `handZoneOf(actor)` matches |
| move | condition* | `they have no card they could play` | for every declared move in the current phase **other than** `env.move.verb`, for each card in its from-zone for the actor (top card only for `pile` zones), `env.check(state, { type, cardId, by })` must not be `true` |
| standard | condition* | `they follow the led suit when they can` | led suit = suit of the first card in `env.move.to`; empty zone, same suit, or no led-suit card in the actor's hand → true |
| standard | effect | `the highest card of the led suit wins {zone}` | among cards of the led suit, highest rank (rank 1 counts 14 when any card set has `acesHigh`); `state.data[WINNER_KEY] = card.data.movedBy`; empty zone → RuleError |
| hearts | condition | `hearts are broken` | `state.data['hearts:broken'] === true` |
| hearts | effect | `hearts are broken` | sets it |

Phrase functions throw `RuleError` for designer-level problems; any other thrown error is a bug.

- [ ] **Step 1: Write the failing tests** — one `it` per row above, using `fixtureEnv`/`fixtureCard`. The rows the plan pins exactly:

```ts
// flow-phrases.test.ts (excerpt; write the rest of the rows in the same style)
const lib = createDefaultLibrary();
const run = (kind: PhraseKind, text: string, env: PhraseEnv, vocab: Vocab) => {
  const m = lib.match(kind, text, vocab);
  if (m.status !== 'ok') throw new Error(JSON.stringify(m));
  return (lib.get(kind, m.pattern)!.fn as (e: PhraseEnv, a: Json[]) => unknown)(env, m.args);
};
// vocab built from fixtureGame(): helper vocabFor(game) in testing.ts

it('every pass pile has 3 cards — every zone must match', () => { /* p0,p1 piles 3 cards, p2 pile 2 → false; give p2 a third → true */ });
it('deal moves the top cards to each seat in order', () => {
  // deck c0..c5 (slots 0..5); 'Deal 2 cards from the deck to each hand' with seats p0,p1,p2
  // → hand-p0 [c4,c5], hand-p1 [c2,c3], hand-p2 [c0,c1]; all faceUp false
});
it('pass piles go left', () => { /* pass-pile-p0 → hand-p1, pass-pile-p2 → hand-p0 (3 seats) */ });
it('lowest score wins with ties to the earliest seat', () => {
  // WinnerFn with scores { p0: 14, p1: 1, p2: 0, p3: 0 } → 'p2'
});
it('the winner goes next marks the choice even for the same player', () => {
  // current p1, data['lang:winner'] = 'p1' → turn { current: 'p1', phase, chosen: true }
});
```

```ts
// standard-deck.test.ts
it('follow suit: must follow when able, free when not', () => {
  // trick holds 5♣ (movedBy p1); p2 hand: 9♣, Q♠; move { verb:'play', by:'p2', cardId: Q♠, from:'hand-p2', to:'trick' } → false
  // p2 hand: 9♦, Q♠ → true; empty trick → true
});
it('highest card of the led suit wins, aces high', () => {
  // trick: 5♣ by p0, A♣ by p1, K♥ by p2, 2♣ by p3 → data['lang:winner'] === 'p1'
});
```

```ts
// move-phrases.test.ts
it('they have no card they could play asks the engine about the other moves', () => {
  // game phases: [{ id:'playing', moves:[play from their hand to the discard pile, draw from the draw pile to their hand] … }]
  // env.move = draw by p0; check returns true only for cardId 'c2' → false; check never true → true
});
it('the card has the same color as the top card, and an empty pile accepts anything', () => {
  // discard pile top: red 7. move card red 2 → true; blue 3 → false; with an empty discard pile, blue 3 → true
});
```

- [ ] **Step 2: Run to verify they fail** — `bunx vitest run src/engine/core/lang/library` → FAIL.
- [ ] **Step 3: Implement** the four registration files, `index.ts`, and `testing.ts` (including `vocabFor(game: CompiledGame, players?: number): Vocab`).
- [ ] **Step 4: Run to verify they pass** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(lang): built-in gameplay phrases and default library"`

---

### Task 7: Example phrases

**Files:**
- Create: `src/engine/core/lang/library/example-phrases.ts`
- Modify: `src/engine/core/lang/library/index.ts` (register them)
- Test: `src/engine/core/lang/library/example-phrases.test.ts`

**Interfaces:**
- Consumes: `PhraseEnv.example` (`ExampleEnv`), Task 4 helpers, `BOX_ZONE`.
- Produces: `registerExamplePhrases(lib: PhraseLibrary): PhraseLibrary` and `export function normalizeReason(s: string): string` (lowercase, curly quotes/apostrophes → straight, trim, drop one trailing `.`). `it is rejected because` compares `normalizeReason(env.example.last.reason)` with `normalizeReason(text)`; the runner (Task 12) stores reasons already passed through `friendlyReason`.

Phrases (exact):

| kind | pattern | meaning |
|---|---|---|
| given | `{int} players` | no-op (the compiler records the count) |
| given | `the game is set up` | `env.example.setUp(state)` |
| given | `the phase is {phase}` / `it is {player}'s turn` | set `turn.phase` / `turn.current` |
| given | `{player} holds {cardlist}` | that player's hand holds exactly these: current hand cards → `BOX_ZONE`, then `claim` each and `relocate` into the hand |
| given | `{zone} has {cardlist}` | same for a single zone; last listed = top |
| given | `{zone} is empty` | its cards → `BOX_ZONE` |
| given | `{player} played {card} to {zone}` | claim, relocate (append), set `data.movedBy` |
| action | `{player} {move} {card}` | first declared move for the verb in the current phase; card = first match in the actor's from-zone, else first match anywhere (id order); returns `{ by, move: { type: verb, cardId } }` |
| action | `{player} {move} a card` | top card of the declared from-zone for that player; empty → RuleError |
| expect | `it is accepted` | else `Expected the move to be accepted, but it was rejected: <reason>` |
| expect | `it is rejected` | else `Expected the move to be rejected, but it was accepted.` |
| expect | `it is rejected because {string}` | rejected and `normalizeReason(reason) === normalizeReason(text)`, else `Expected it to be rejected because “<text>”, but <it was accepted | the reason was “<reason>”>.` |
| expect | `it is {player}'s turn` / `the phase is {phase}` | |
| expect | `{player} holds {int} card(s)` | |
| expect | `{zone} has {cardlist}` | exact contents, any order |
| expect | `the top card of {zone} is {card}` | |
| expect | `{player} scores {int}` / `{player} wins` | read `state.result` (`scores`/`winner`); no result → `The game hasn't ended.` |

Every failure message is designer-readable; a passing expect returns `true`.

- [ ] **Step 1: Write the failing test** — use `fixtureEnv` with an `example` env whose `claim` picks the first unclaimed matching card id (implement that small helper inline in the test) and `last` set per case. Pin:

```ts
it('holds replaces the hand exactly, moving old cards out of play', () => { /* hand-p0 had c9; after 'p0 holds the 2 of clubs and the 3 of clubs' → hand-p0 = [2♣, 3♣], c9 in '__box' */ });
it('played records who played the card', () => { /* data.movedBy === 'p1', zone 'trick', faceUp true */ });
it('rejected because compares friendly text loosely', () => {
  // last = { ok: false, reason: 'They follow the led suit when they can' }
  // 'it is rejected because “they follow the led suit when they can.”' → true
});
it('accepted explains a rejection', () => { /* last { ok:false, reason:'You can only play a card from your hand.' } → 'Expected the move to be accepted, but it was rejected: You can only play a card from your hand.' */ });
it('a card action picks the card from the actor’s own zone first', () => {
  // custom-table game (red 7 × 2 copies) with a phase declaring 'play' from their hand to the discard pile:
  // the lower-id red 7 is in the draw pile, the other in hand-p0 → 'p0 plays a red 7' returns the hand-p0 card's id
});
```

- [ ] **Step 2: Run to verify it fails** — `bunx vitest run src/engine/core/lang/library/example-phrases.test.ts` → FAIL.
- [ ] **Step 3: Implement** `example-phrases.ts`; register in `createDefaultLibrary`.
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(lang): example given/action/expect phrases"`

---

### Task 8: Automatic zone layout

**Files:**
- Create: `src/engine/core/lang/auto-layout.ts`
- Modify: `src/engine/core/lang/testing.ts` (add `unreachableZones`)
- Test: `src/engine/core/lang/auto-layout.test.ts`

**Interfaces:**
- Consumes: `ZoneSpec`, `zoneIdFor`; `placeZone` (`../zone-geometry`), `resolveDrop` (`../hittest`), `computeZoneLayout` (`../layout`), `RuleRegistry`.
- Produces:
  - `autoLayout(zones: ZoneSpec[], seats: PlayerId[]): ZoneDef[]`.
  - `testing.ts`: `unreachableZones(defs: ZoneDef[], handSize: number): string[]` — fills hands with `handSize` cards, rows with 4, piles with 3; returns one message per failure: a zone whose own centre does not resolve to itself (`"<id>: centre goes to <other|nothing>"`), or a hand where fewer than 70% of its laid-out card centres resolve to it (`"<id>: only N of M card centres reachable"`). Task 14 reuses it.

Mapping per zone: `hand` → `layout: 'fan'`, `layoutOptions: { fanAngleDeg: 48, fanRadius: 200 }`, `bounds: { width: 312, height: 178, anchor: { x: 0.5, y: 0.423 } }`, `ordering: 'free'`; `row` → `layout: 'row'`, `layoutOptions: { spacing: 75 }`, `ordering: 'ordered'`; `pile` → `layout: 'pile'`, `ordering: 'stack'`. `owner` = seat for per-player zones, `'shared'` otherwise; `visibility` copied. No `accept` (legality lives in declared moves).

**Output order is part of the contract** (`resolveDrop` walks zones in reverse, so later zones win overlaps): all hands, then the other per-player zones, then shared zones.

Starting geometry (tune the numbers until the reachability tests pass; keep the order rule): seat `i` of `N` sits at angle `θ = π/2 + 2πi/N` on an ellipse `rx = 380, ry = 290` (so p0 is bottom, p1 left, p2 top, p3 right for 4 seats — y grows downward). A seat's hand is at its anchor. Its other per-player zones sit at `0.58 ×` the anchor, spread along the tangent `(−sin θ, cos θ)` 120 apart, centred. Shared zones form one centred horizontal row: piles 120 wide, rows 330 wide, 20 apart.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { autoLayout } from './auto-layout';
import { unreachableZones } from './testing';
import type { ZoneSpec } from './types';

const HEARTS: ZoneSpec[] = [
  { name: 'deck', perPlayer: false, layout: 'pile', visibility: 'secret' },
  { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
  { name: 'pass pile', perPlayer: true, layout: 'pile', visibility: 'owner' },
  { name: 'won pile', perPlayer: true, layout: 'pile', visibility: 'public' },
  { name: 'trick', perPlayer: false, layout: 'row', visibility: 'public' },
];
const COLOR_MATCH: ZoneSpec[] = [
  { name: 'draw pile', perPlayer: false, layout: 'pile', visibility: 'secret' },
  { name: 'discard pile', perPlayer: false, layout: 'pile', visibility: 'public' },
  { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
];
const seats = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

describe('autoLayout', () => {
  it('maps specs to zone defs with ids, owners, layouts and the contract order', () => {
    const defs = autoLayout(HEARTS, seats(4));
    expect(defs.map((d) => d.id)).toEqual([
      'hand-p0', 'hand-p1', 'hand-p2', 'hand-p3',
      'pass-pile-p0', 'won-pile-p0', 'pass-pile-p1', 'won-pile-p1', 'pass-pile-p2', 'won-pile-p2', 'pass-pile-p3', 'won-pile-p3',
      'deck', 'trick',
    ]);
    expect(defs[0]).toMatchObject({ layout: 'fan', owner: 'p0', visibility: 'owner', ordering: 'free' });
    expect(defs.at(-1)).toMatchObject({ layout: 'row', owner: 'shared', ordering: 'ordered', layoutOptions: { spacing: 75 } });
  });

  it('seats p0 at the bottom and p1 on the left for 4 players', () => {
    const [p0, p1] = autoLayout(HEARTS, seats(4));
    expect(Math.abs(p0.transform.x)).toBeLessThan(1);
    expect(p0.transform.y).toBeGreaterThan(0);
    expect(p1.transform.x).toBeLessThan(0);
  });

  it('keeps every Hearts zone reachable at 4 seats', () => expect(unreachableZones(autoLayout(HEARTS, seats(4)), 13)).toEqual([]));
  it.each([2, 3, 4, 5])('keeps every Color Match zone reachable at %i seats', (n) =>
    expect(unreachableZones(autoLayout(COLOR_MATCH, seats(n)), 7)).toEqual([]));

  it('unreachableZones reports a zone shadowed by a later one', () => {
    const defs = autoLayout(COLOR_MATCH, seats(2));
    const shadow = { ...defs[defs.length - 1], id: 'shadow', transform: defs[0].transform, bounds: { width: 2000, height: 2000 } };
    expect(unreachableZones([...defs, shadow], 7)).toContainEqual(expect.stringMatching(/^hand-p0: centre goes to shadow$/));
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `bunx vitest run src/engine/core/lang/auto-layout.test.ts` → FAIL.
- [ ] **Step 3: Implement** `autoLayout`; tune radii/spacing only.
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(lang): automatic zone layout with drop reachability"`

---

### Task 9: Compiler — header, cards, table, setup, end, and phase skeleton

**Files:**
- Create: `src/engine/core/lang/compile.ts`, `src/engine/core/lang/compile-util.ts`
- Test: `src/engine/core/lang/compile.test.ts`

**Interfaces:**
- Consumes: `parseOutline`, `PhraseLibrary`, `stubFor`, setup/flow phrases via `createDefaultLibrary()`.
- Produces:

```ts
// compile.ts
export type CompileResult = { game?: CompiledGame; diagnostics: Diagnostic[] };
export function compileGame(text: string, library: PhraseLibrary): CompileResult;
export function canPlay(result: CompileResult): { ok: true } | { ok: false; reason: string };
// compile-util.ts
export type LineCtx = { library: PhraseLibrary; vocab: Vocab; gameName: string; inMove: boolean; diagnostics: Diagnostic[] };
export function matchLine(kind: PhraseKind, text: string, line: number, ctx: LineCtx, fallback?: PhraseKind): PhraseRef;
export function matchEffectLine(text: string, line: number, ctx: LineCtx): PhraseRef;  // supports "If <condition>, <effect>"
export function missingRef(kind: PhraseKind, text: string, line: number): PhraseRef;   // { kind: 'lang', phrase: 'missing', args: [kind], line, text }
```

Compile order: parse outline → `Game:` (`/^game:\s*(.+)$/i`) and `Players:` (`/^players:\s*(\d+)(?:\s+to\s+(\d+))?$/i`) → `Table:` lines (zone kind, static vocab) → prepass over `Phase:` blocks for phase ids (lowercased names) and verbs (`/^a player may (\w+) a card from /i`) → vocab without cards → `Cards:` lines (cards kind; `table` = the node's outline table; strip a trailing `:`) → full vocab (`standardDeck` = any set `kind === 'standard'`; `attributes`/`cardValues` from table sets) → `Setup:` (effect lines via `matchEffectLine`) → `Phase:` blocks → `End:` → `Example:` blocks (Task 10).

`matchLine` behaviour: `ok` → ref `{ kind, phrase: pattern, args, line, text }`; if the phrase `needsMove` or any arg contains `{ who: 'actor' }` while `!ctx.inMove` → error "“<text>” only makes sense in a rule about a player's move."; `unknown` → if `fallback` matches, use it; else diagnostic `{ kind: 'unknown-phrase', severity: 'error', message: '“<text>” isn't in the phrase library yet.', text, suggestions, stub }` and return `missingRef`; `ambiguous` → error "“<text>” matches more than one phrase: a / b. A developer needs to make one of them more specific."; `invalid` → error with the resolver's message. `text` in refs/diagnostics is the original line without the keyword and trailing period.

`matchEffectLine`: a line starting `If ` is split at each `, ` in turn; the split where the left side matches a condition and the right an effect wins → `{ kind: 'lang', phrase: 'if', args: [condRef, effectRef] }`. No split works → report the condition part (at the first comma) as unknown.

End section: `/^the game ends when (.+)$/i` → condition; other lines → score kind, falling back to winner kind (unknown → stub kind `winner` if the line contains "wins", else `score`). End needs exactly one winner line ("Add a line saying who wins, like “The lowest score wins.”").

Phase skeleton in this task: `Phase: <name>` (id = the name lowercased and trimmed) with `Hint: …` (text kept verbatim after `Hint:`, trimmed — including its period), `Players take turns.`, `Everyone acts at once.`; any other phase line is left for Task 10 (until then report "I don't understand this line in a phase."). `CompiledEnd.line` is the line of `The game ends when …`.

Structural diagnostics (exact messages): missing Game → "Start with a line like “Game: My Game”."; missing/invalid Players → "Say how many players, like “Players: 4” or “Players: 2 to 5”."; missing Cards/Table → "Add a Cards: section." / "Add a Table: section."; no phase → "Add at least one Phase: section."; unknown top-level line → "I don't understand this section. Sections are Game, Players, Cards, Table, Setup, Phase, End and Example."; duplicate zone or phase name → "There are two zones called “X”." / "There are two phases called “X”."; no End → warning "Without an End: section the game never finishes."; unexpected children → "This line shouldn't be indented under the line above.".

`game` is returned when every error diagnostic is `unknown-phrase` (and the header, players and at least one phase parsed). `canPlay`: no errors → ok; only unknown phrases → "1 phrase still needs a developer." / "N phrases still need a developer."; otherwise "Fix N problem(s) in the rules first." (`problem`/`problems`) — when `game` is missing, also not ok.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { canPlay, compileGame } from './compile';
import { createDefaultLibrary } from './library';

const lib = createDefaultLibrary();
const BASE = [
  'Game: Tiny', 'Players: 2 to 3', '', 'Cards:', '  A standard 52-card deck, starting in the deck.', '',
  'Table:', '  The deck is a pile in the center that no one can see.', '  Each player has a hand that only they can see.', '',
  'Setup:', '  Shuffle the deck.', '  Deal 5 cards from the deck to each hand.', '',
  'Phase: main', '  Hint: Do things.', '  Players take turns.', '',
  'End:', '  The game ends when a player\'s hand is empty.', '  The player with an empty hand wins.',
].join('\n');

describe('compileGame', () => {
  it('compiles header, cards, table, setup, phase skeleton and end', () => {
    const { game, diagnostics } = compileGame(BASE, lib);
    expect(diagnostics).toEqual([]);
    expect(game!.name).toBe('Tiny');
    expect(game!.players).toEqual({ min: 2, max: 3 });
    expect(game!.zones.map((z) => z.name)).toEqual(['deck', 'hand']);
    expect(game!.cards[0]).toMatchObject({ kind: 'standard', start: 'deck', acesHigh: false });
    expect(game!.setup.map((r) => [r.phrase, r.line])).toEqual([['shuffle {zone}', 12], ['deal {int} cards from {zone} to {zone}', 13]]);
    expect(game!.phases[0]).toMatchObject({ id: 'main', hint: 'Do things.', actor: 'current', moves: [], goTo: null, after: null });
    expect(game!.end).toMatchObject({ line: 20, winner: { phrase: 'the player with an empty {perzone} wins' } });
    expect(canPlay({ game, diagnostics })).toEqual({ ok: true });
  });

  it('turns an unknown phrase into a placeholder, a hint and a stub', () => {
    const result = compileGame(BASE.replace('Shuffle the deck.', 'Shufle the deck.'), lib);
    expect(result.diagnostics).toEqual([expect.objectContaining({
      line: 12, kind: 'unknown-phrase', severity: 'error', message: '“Shufle the deck” isn\'t in the phrase library yet.',
      suggestions: expect.arrayContaining(['shuffle [zone]']), stub: expect.stringContaining("library.effect('shufle {zone}'"),
    })]);
    expect(result.game!.setup[0]).toMatchObject({ kind: 'lang', phrase: 'missing', line: 12 });
    expect(canPlay(result)).toEqual({ ok: false, reason: '1 phrase still needs a developer.' });
  });

  it('compiles "If <condition>, <effect>"', () => {
    const { game } = compileGame(BASE.replace('Shuffle the deck.', 'If the deck is not empty, shuffle the deck.'), lib);
    expect(game!.setup[0]).toMatchObject({ kind: 'lang', phrase: 'if', args: [{ phrase: '{zone} is not empty' }, { phrase: 'shuffle {zone}' }] });
  });

  it('reports structural problems in plain words', () => {
    expect(compileGame(BASE.replace('Players: 2 to 3', 'Players: lots'), lib).diagnostics).toContainEqual(expect.objectContaining({ message: 'Say how many players, like “Players: 4” or “Players: 2 to 5”.' }));
    expect(compileGame(`${BASE}\nTable:\n  The deck is a pile in the center that no one can see.`, lib).diagnostics).toContainEqual(expect.objectContaining({ message: 'There are two zones called “deck”.' }));
    expect(compileGame(BASE.replace(/End:[\s\S]*/, ''), lib).diagnostics).toContainEqual(expect.objectContaining({ severity: 'warning', message: 'Without an End: section the game never finishes.' }));
  });

  it('never throws on empty or half-written text', () => {
    for (const text of ['', 'Game: X', 'Game: X\nPlayers: 2\nPhase: a']) {
      const r = compileGame(text, lib);
      expect(r.diagnostics.length).toBeGreaterThan(0);
      expect(canPlay(r).ok).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `bunx vitest run src/engine/core/lang/compile.test.ts` → FAIL.
- [ ] **Step 3: Implement** `compile-util.ts` and `compile.ts`.
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(lang): compiler for game header, cards, table, setup and end"`

---

### Task 10: Compiler — phase rules and examples

**Files:**
- Create: `src/engine/core/lang/compile-phase.ts`, `src/engine/core/lang/compile-example.ts`
- Modify: `src/engine/core/lang/compile.ts` (delegate phase lines and `Example:` blocks)
- Test: `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/compile-example.test.ts`

**Interfaces:**
- Consumes: `matchLine`, `matchEffectLine`, `LineCtx`, `parseParam`, `thirdPerson`.
- Produces: `compilePhase(node: OutlineNode, ctx: LineCtx): CompiledPhase`; `compileExample(node: OutlineNode, ctx: LineCtx): CompiledExample`.

Phase line frames, tried in order on the normalized line:
1. `Hint: <text>`; `Players take turns`; `Everyone acts at once` (from Task 9).
2. `Players may rearrange their <perzone> at any time` → `rearrange` (name must be a per-player zone).
3. `A player may <verb> a card from <zone> to <zone>` (regex built from the vocab's zone source) → `DeclaredMove`. `from`/`to` must be shared, `their …` or `pN's …` (`each`/`winner` → error "A move goes from one zone to one zone."). Verb `reorder` → error "“reorder” is reserved; pick another word.". Children: `Only if <condition>` → `{ mode: 'all', refs: [ref], text }`; `Only if one of:` + condition lines → `{ mode: 'any', refs, text: lines joined with ' or ' }`; `Then:` + effect lines. All children compile with `inMove: true`. `fromText` is the original zone text (`their hand`).
4. `When this phase starts:` + effect lines → `onEnter`.
5. `When <condition>, go to <phase>` → `goTo` (unknown phase → error with suggestions from phase names; a second one → "A phase can have only one “go to” rule for now.").
6. `When <condition>:` + children → trigger: `Only if …` children add `conditions`; other children are effects. `text` = the line without the colon (e.g. `When the trick has 4 cards`).
7. `After a player <verbs>, <turn phrase>` where verbs = third-person forms joined by `, ` / ` or ` → `after: { verbs, next }`; a verb not declared in this phase → error; a second After line → error.
8. Anything else → "I don't understand this line in a phase. Phase lines start with Hint:, A player may…, When…, After a player…, Players take turns or Everyone acts at once."

Also: a phase other than the first that no `go to` targets → warning "Nothing leads to the phase “X”.".

Example blocks (`Example: <name>`): lines `Given|When|Then|And|But <rest>`; And/But repeat the previous keyword; the first line must be Given or When ("Start an example with Given or When."). Given → `given` kind with `effect` fallback; When → `action`; Then → `expect` with `condition` fallback. `Given {int} players` also sets `players` (must be within the game's range: "This game is for 2 to 5 players." / "This game is for 4 players."). Example lines compile with `inMove: false`.

- [ ] **Step 1: Write the failing tests**

```ts
// compile-phase.test.ts — extend Task 9's BASE with a full phase
const PHASE = [
  'Phase: main',
  '  Players take turns.',
  '  Players may rearrange their hand at any time.',
  '  A player may play a card from their hand to the deck.',
  '    Only if the card is not a heart.',
  '    Only if one of:',
  '      the deck is empty',
  '      they hold only hearts',
  '    Then:',
  '      If the card is a spade, shuffle the deck.',
  '  When the deck has 10 cards:',
  '    Only if the deck is not empty.',
  '    Shuffle the deck.',
  '  When the deck has 52 cards, go to main.',
  '  After a player plays, the turn passes to the left.',
].join('\n');
it('compiles a declared move with conditions and effects', () => {
  const p = compileGame(withPhase(PHASE), lib).game!.phases[0];
  expect(p.rearrange).toEqual(['hand']);
  expect(p.moves[0]).toMatchObject({ verb: 'play', from: { of: { who: 'actor' }, zone: 'hand' }, to: { shared: 'deck' }, fromText: 'their hand' });
  expect(p.moves[0].conditions.map((g) => [g.mode, g.text])).toEqual([['all', 'the card is not a heart'], ['any', 'the deck is empty or they hold only hearts']]);
  expect(p.moves[0].effects[0]).toMatchObject({ kind: 'lang', phrase: 'if' });
  expect(p.triggers[0]).toMatchObject({ text: 'When the deck has 10 cards', conditions: [{ text: 'the deck is not empty' }] });
  expect(p.goTo).toMatchObject({ to: 'main' });
  expect(p.after).toMatchObject({ verbs: ['play'], next: { phrase: 'the turn passes to the left' } });
});
it('rejects “their” outside a move', () => { /* trigger 'When their hand is empty:' → error 'only makes sense in a rule about a player's move' */ });
it('rejects reserved verbs, each-zones in moves, unknown go-to targets and undeclared After verbs', () => { /* one expect each, exact messages above */ });
it('warns about unreachable phases', () => { /* second phase never targeted */ });
```

```ts
// compile-example.test.ts
it('compiles Given/And/When/Then with fallbacks', () => {
  // Example: x / Given the phase is main / And the deck is empty (given) / When p0 plays the 2 of clubs / Then it is accepted / And the deck is empty (condition fallback)
  // steps kinds: given, given, action, expect, condition
});
it('records and checks Given N players', () => { /* 'Given 3 players' → players 3; 'Given 7 players' → error 'This game is for 2 to 3 players.' */ });
it('requires Given or When first', () => { /* 'Then it is accepted' first → error */ });
```

- [ ] **Step 2: Run to verify they fail** — `bunx vitest run src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/compile-example.test.ts` → FAIL.
- [ ] **Step 3: Implement** both files and wire them in `compile.ts`.
- [ ] **Step 4: Run to verify they pass** — PASS, plus Task 9's tests still pass.
- [ ] **Step 5: Commit** — `git commit -m "feat(lang): compile phase rules, declared moves and examples"`

---

### Task 11: Runtime, declared moves, engine build, drops and friendly messages

**Files:**
- Create: `src/engine/core/lang/runtime.ts`, `declared-moves.ts`, `build.ts`, `drops.ts`, `friendly.ts`
- Test: `runtime.test.ts` (engine-level behaviour through `createEngine`), `drops.test.ts`, `friendly.test.ts`

**Interfaces:**
- Consumes: everything above; `GameEngine`, `MoveRegistry`, `registerCoreMoves`, `FlowRegistry`, `gateMove`, `makeRng`, `RuleRegistry`.
- Produces:

```ts
// runtime.ts
export class LangRuntime {
  constructor(game: CompiledGame, library: PhraseLibrary, seats: PlayerId[]);
  setChecker(check: (state: GameState, move: Move) => true | string): void;
  env(state: GameState, move?: MoveInfo, example?: ExampleEnv): PhraseEnv;
  test(ref: PhraseRef, state: GameState, move?: MoveInfo, example?: ExampleEnv): boolean;   // condition + lang all/any/phase/always/missing
  run(ref: PhraseRef, state: GameState, move?: MoveInfo, example?: ExampleEnv): GameState;  // effect/given + lang if/missing
  pick(ref: PhraseRef, state: GameState): PlayerId;
  act(ref: PhraseRef, state: GameState, example: ExampleEnv): { by: PlayerId; move: Move };
  expect(ref: PhraseRef, state: GameState, example: ExampleEnv): true | string;  // expect kind; condition refs → true | `Expected: ${text}`
  result(state: GameState): GameState;   // end: { scores, winner } or { winner } into state.result
}
// declared-moves.ts
export function declaredMoveHandler(verb: string, runtime: LangRuntime): MoveHandler;
// build.ts
export function seatsFor(players: number): PlayerId[];                 // ['p0', …]
export function tableDefFor(game: CompiledGame, seats: PlayerId[]): TableDef;   // { players: seats, zones: autoLayout(...) }
export function initialState(game: CompiledGame, seed: number): GameState;      // buildCards; data {}; no turn
export function flowDefFor(game: CompiledGame, seats: PlayerId[]): FlowDef;
export function createEngine(game: CompiledGame, library: PhraseLibrary, players: number, initial: GameState): { engine: GameEngine; runtime: LangRuntime; tableDef: TableDef; seats: PlayerId[] };
// drops.ts
export function moveForDrop(game: CompiledGame, seats: PlayerId[], phase: string | undefined, seat: PlayerId, intent: { cardId: string; fromZoneId: string; toZoneId: string | null; slot: number }): Move | null;
// friendly.ts
export function friendlyReason(reason: string, current?: PlayerId): string;
export function friendlyError(e: unknown): string;
```

Runtime rules: a `missing` ref throws `MissingPhraseError('“<text>” isn't implemented yet.', line, text)`. Any non-`RuleError` thrown by a phrase is rethrown as `RuleError(message, ref.line, ref.text)`. `the player has no card they could play` uses `env.check`; the runtime throws `RuleError('Two moves depend on each other through “they have no card they could play”.')` if `check` is re-entered from inside itself.

`flowDefFor`: `turn: { order: seats }`; phases = a synthetic first phase `{ id: '__setup', allow: [], onEnter: setup, advance: { when: 'lang:always', to: <first phase id> } }` (always emitted, even with no Setup) followed by each compiled phase: `allow` = its verbs (+ `'reorder'` when `rearrange` is non-empty), `actor`, `anyActor: ['reorder']` when rearranging, `onEnter`, `advance` from `goTo`, `endTurn: { when: 'lang:always', after: after.verbs, next: { name: 'lang:turn', params: after.next } }`. Triggers from every phase: `{ id: 'line <n>: <text>', when: { name: 'lang:cond', params: <lang all [lang phase(id), when, ...conditions]> }, then: effects as 'lang:effect' }`. `end: [{ when: 'lang:cond'(end.when), result: 'lang:result' }]` or `[]`. Wrap every ref as `{ name: 'lang:cond' | 'lang:effect' | 'lang:turn', params: ref }`; the `FlowRegistry` has exactly `lang:always`, `lang:cond`, `lang:effect`, `lang:turn`, `lang:result`, all delegating to the runtime.

`createEngine`: players outside `game.players` → `RuleError('This game is for 2 to 5 players.')` (or "for 4 players."). `MoveRegistry` = `registerCoreMoves` plus `declaredMoveHandler(verb)` for every declared verb. After constructing the `GameEngine`, call `runtime.setChecker` with `gateMove` + handler `legal`.

Declared move `legal(state, m)` (in this order; return the first failure):
1. `m.by` and a card with `m.cardId` exist ("That card isn't on the table.").
2. Among this phase's declarations for the verb, keep those whose from-zone (for `m.by`) holds the card; none → `You can only <verb> a card from <fromText with leading "their " → "your ">.`
3. If `m.toZone` is given, keep those whose to-zone equals it; none → `You can't <verb> a card there.`
4. From-zone layout `pile` and the card isn't its top → `You can only take the top card of <your text>.`
5. Each condition group in order: `all` fails / `any` with no true ref → the group's `text`.

`apply`: `relocate` to `m.toZone ?? to-zone`, set `data.movedBy = m.by`, then run the effects with `MoveInfo { verb, by, cardId, from, to }`.

`moveForDrop`: no `toZoneId` → null; same zone, zone `ordering` free, and the phase allows rearranging → `{ type: 'reorder', cardId, slot }`; otherwise the first declaration in the phase whose from-zone (for `seat`) is `fromZoneId` and to-zone is `toZoneId` → `{ type: verb, cardId, toZone: toZoneId }`; else null.

`friendlyReason`: `game is over` → `The game is over.`; `not X's turn` → `It's <current>'s turn.` (or `It's not your turn.` without `current`); `move reorder not allowed in phase P` → `You can't rearrange cards during P.`; `move V not allowed in phase P` → `You can't V during P.` (`__setup` shows as `setup`); anything else unchanged.

`friendlyError`: `MissingPhraseError` → `Line N: “text” isn't implemented yet.`; a flow-not-settled error (`/last fired: trigger line (\d+): (.*)\)$/`) → `The rule on line N (“text”) keeps firing. Its effects must change what it checks.`; `RuleError` with a line → `Line N (“text”): message`; `RuleError` without → its message; anything else → `Something went wrong in the rules: <message>` (no stack).

- [ ] **Step 1: Write the failing tests** — use this game text (exact) in `runtime.test.ts`:

```text
Game: Test Duel
Players: 2

Cards:
  A standard 52-card deck, aces high, starting in the deck.

Table:
  The deck is a pile in the center that no one can see.
  The middle is a row in the center that everyone can see.
  Each player has a hand that only they can see.
  Each player has a won pile that everyone can see.

Setup:
  Deal 3 cards from the deck to each hand.

Phase: play
  Players take turns.
  Players may rearrange their hand at any time.
  A player may play a card from their hand to the middle.
    Only if the card is not a heart.
    Only if one of:
      the middle is empty
      they follow the led suit when they can
    Then:
      If the card is a spade, shuffle the deck.
  A player may draw a card from the deck to their hand.
  When the middle has 2 cards:
    The highest card of the led suit wins the middle.
    Move the middle to the winner's won pile.
    The winner goes next.
  After a player plays or draws, the turn passes to the left.

End:
  The game ends when a player's hand is empty.
  The player with an empty hand wins.
```

Arrange states by finding cards by `data.suit/rank` in `initialState(game, 1)`, moving chosen cards into `hand-p0`/`hand-p1`/`middle` (setting `slot` and `data.movedBy` for `middle`; everything else stays in `deck`), setting `turn: { current, phase: 'play' }`, then `createEngine(game, lib, 2, state)`. Always leave both hands non-empty unless the test is about ending (an empty hand ends the game as soon as the state settles). In this text, `When the middle has 2 cards:` is line 27 and `If the card is a spade, shuffle the deck.` is line 25. Pin:

```ts
it('builds the table, deals during setup and starts in the first phase', () => {
  const { engine, tableDef } = createEngine(game, lib, 2, initialState(game, 1));
  expect(tableDef.zones.map((z) => z.id)).toEqual(['hand-p0', 'hand-p1', 'won-pile-p0', 'won-pile-p1', 'deck', 'middle']);
  expect(engine.getState().turn).toEqual({ current: 'p0', phase: 'play' });
  expect(zoneCards(engine.getState(), 'hand-p1')).toHaveLength(3);
});
it('rejects with the designer’s own words', () => {
  // p0 holds 3♣, 7♥, K♠; p1 holds 9♦; current p0:
  //   p0 plays 9♦ (in hand-p1) → 'You can only play a card from your hand.'
  //   p0 plays 7♥ → 'the card is not a heart'
  //   p0 draws a deck card that is not the top one → 'You can only take the top card of the deck.'
  // middle holds 5♣ (movedBy p1); p0 holds 9♣ and Q♠; p1 holds 9♦; current p0:
  //   p0 plays Q♠ → 'the middle is empty or they follow the led suit when they can'
});
it('applies the move, records the mover and runs Then effects', () => {
  // p0 holds K♠ and 3♣, p1 holds 9♦, middle empty; p0 plays K♠ →
  //   card in 'middle', faceUp true, data.movedBy 'p0', state.rng.count greater than before (deck shuffled), turn.current 'p1'
});
it('a trick won by the player who just played does not also pass the turn', () => {
  // p0 holds 3♦; middle has 5♣ (movedBy p0); p1 holds A♣ and 2♦; current p1; p1 plays A♣ →
  //   zoneCards(won-pile-p1) has 2 cards, middle empty, turn { current: 'p1', phase: 'play' } (no chosen flag left)
});
it('ends with a winner', () => { /* p0 holds only 3♣, p1 holds 9♦, middle empty; p0 plays 3♣ → state.result toEqual { winner: 'p0' } */ });
it('scopes triggers to their phase', () => {
  const t = flowDefFor(game, ['p0', 'p1']).triggers![0];
  expect(t.id).toBe('line 27: When the middle has 2 cards');
  expect((t.when as { params: PhraseRef }).params).toMatchObject({ kind: 'lang', phrase: 'all', args: [{ phrase: 'phase', args: ['play'] }, expect.anything()] });
});
it('a missing phrase throws with its line when reached', () => {
  // replace line 25 with '      The winner sings.'; p0 plays a card legally →
  //   dispatch throws MissingPhraseError; friendlyError(e) === 'Line 25: “The winner sings” isn\'t implemented yet.'
});
it('a rule that keeps firing is reported in plain words', () => {
  // insert after line 31: '  When the deck is not empty:' / '    Shuffle the deck.' (so N = 32)
  // createEngine(game, lib, 2, initialState(game, 1)) throws; friendlyError(e) ===
  //   'The rule on line 32 (“When the deck is not empty”) keeps firing. Its effects must change what it checks.'
});
it('rejects a player count outside the range', () => { /* createEngine(game, lib, 3, …) throws 'This game is for 2 players.' */ });
```

```ts
// drops.test.ts — same game
it('maps drags to declared moves, rearranging, or nothing', () => {
  // hand-p0 → middle by p0 in 'play' → { type: 'play', cardId, toZone: 'middle' }
  // deck → hand-p0 → { type: 'draw', … }
  // hand-p0 → hand-p0 → { type: 'reorder', cardId, slot: 2 }
  // hand-p0 → won-pile-p0 → null; toZoneId null → null
});
// friendly.test.ts
it.each([
  ['game is over', undefined, 'The game is over.'],
  ["not p1's turn", 'p0', "It's p0's turn."],
  ['move pass not allowed in phase playing', undefined, "You can't pass during playing."],
  ['move reorder not allowed in phase __setup', undefined, "You can't rearrange cards during setup."],
  ['the card is not a heart', undefined, 'the card is not a heart'],
])('%s', (reason, current, out) => expect(friendlyReason(reason, current)).toBe(out));
```

- [ ] **Step 2: Run to verify they fail** — `bunx vitest run src/engine/core/lang/runtime.test.ts src/engine/core/lang/drops.test.ts src/engine/core/lang/friendly.test.ts` → FAIL.
- [ ] **Step 3: Implement** the five modules.
- [ ] **Step 4: Run to verify they pass** — PASS; then `bun run test && bun run typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "feat(lang): runtime, declared moves and engine build"`

---

### Task 12: Example runner

**Files:**
- Create: `src/engine/core/lang/examples.ts`
- Test: `src/engine/core/lang/examples.test.ts`

**Interfaces:**
- Consumes: `createEngine`, `initialState`, `LangRuntime`, `friendlyReason`, `friendlyError`, `MissingPhraseError`, `BOX_ZONE`.
- Produces:

```ts
export type ExampleResult = { name: string; line: number; status: 'pass' | 'fail' | 'blocked'; message: string | null; atLine: number | null };
export function runExamples(game: CompiledGame, library: PhraseLibrary): ExampleResult[];
```

Per example: players = `example.players ?? game.players.min`; seed 1; start state = `initialState(game, 1)` with `turn: { current: 'p0', phase: <first compiled phase id> }`. The `ExampleEnv`: `claim` returns the lowest-numbered id (`c3` < `c12`) matching and not yet claimed in this example, else `RuleError('No card matches “<text>”.')`; `setUp(state)` = `createEngine(game, library, players, { ...state, turn: undefined }).engine.getState()`. Apply Given steps with `runtime.run` (claim/setUp available). Then build the engine with `createEngine(game, library, players, arranged)`. When steps: `runtime.act` → `engine.dispatch({ ...move, by })`; record `last = { ok, reason: ok ? undefined : friendlyReason(reason, state.turn?.current) }`. Then steps: `runtime.expect` on `engine.getState()`; a string → `fail` with that message at that line. A `MissingPhraseError` anywhere → `blocked`, message `Blocked by “<text>” (line N), which isn't implemented yet.`. Any other error → `fail` with `friendlyError(e)`. No failures → `pass`, `message: null`.

- [ ] **Step 1: Write the failing test** — reuse Task 11's Test Duel text with appended examples:

```text
Example: playing a club is fine
  Given p0 holds the 3 of clubs and the 4 of clubs
  And p1 holds the 9 of diamonds
  When p0 plays the 3 of clubs
  Then it is accepted
  And it is p1's turn

Example: hearts are refused
  Given p0 holds the 3 of hearts and the 4 of clubs
  And p1 holds the 9 of diamonds
  When p0 plays the 3 of hearts
  Then it is rejected because “The card is not a heart.”

Example: a wrong expectation fails
  Given p0 holds the 3 of clubs and the 4 of clubs
  And p1 holds the 9 of diamonds
  When p0 plays the 3 of clubs
  Then it is rejected

Example: blocked by a missing phrase
  Given p0 holds the 3 of clubs and the 4 of clubs
  And the moon is full
  When p0 plays the 3 of clubs
  Then it is accepted
```

```ts
it('reports pass, fail and blocked with designer-readable messages', () => {
  const results = runExamples(game, lib);
  expect(results.map((r) => r.status)).toEqual(['pass', 'pass', 'fail', 'blocked']);
  expect(results[2]).toMatchObject({ message: 'Expected the move to be rejected, but it was accepted.', atLine: expect.any(Number) });
  expect(results[3].message).toMatch(/^Blocked by “the moon is full” \(line \d+\), which isn't implemented yet\.$/);
});
it('fails an example whose rules never settle, in plain words', () => {
  // add the runaway trigger from Task 11 → every result is 'fail' with message matching /keeps firing/
});
it('claims distinct copies for repeated cards', () => {
  // custom-table game (2 copies each): 'Given p0 holds a red 7 and a red 7' → two different ids in hand-p0
});
```

- [ ] **Step 2: Run to verify it fails** — `bunx vitest run src/engine/core/lang/examples.test.ts` → FAIL.
- [ ] **Step 3: Implement** `runExamples`.
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(lang): example runner with pass/fail/blocked results"`

---

### Task 13: Hearts in the language (proof 1)

**Files:**
- Create: `src/games/hearts.rules`, `src/games/hearts.test.ts`, `src/vite-env.d.ts` (`/// <reference types="vite/client" />`, enables `?raw` imports)
- Modify: library files only if a Hearts line needs a phrase they lack (add it with its own unit test in that library's test file)

**Interfaces:**
- Consumes: `compileGame`, `createDefaultLibrary`, `runExamples`, `createEngine`, `initialState`, `seatsFor`, `zoneCards`.
- Produces: `src/games/hearts.rules` (imported elsewhere as `import HEARTS from '@/games/hearts.rules?raw'`).

`src/games/hearts.rules` (exact):

```text
Game: Hearts
Players: 4

Cards:
  A standard 52-card deck, aces high, starting in the deck.

Table:
  The deck is a pile in the center that no one can see.
  Each player has a hand that only they can see.
  Each player has a pass pile that only they can see.
  Each player has a won pile that everyone can see.
  The trick is a row in the center that everyone can see.

Setup:
  Shuffle the deck.
  Deal 13 cards from the deck to each hand.

Phase: passing
  Hint: Drag 3 cards to your pass pile.
  Everyone acts at once.
  Players may rearrange their hand at any time.
  A player may pass a card from their hand to their pass pile.
    Only if their pass pile has fewer than 3 cards.
  When every pass pile has 3 cards, go to playing.

Phase: playing
  Hint: Drag a card to the center.
  When this phase starts:
    Each pass pile goes to the hand of the player on its owner's left.
    The player holding the 2 of clubs goes first.
  Players take turns.
  Players may rearrange their hand at any time.
  A player may play a card from their hand to the trick.
    Only if they follow the led suit when they can.
    Only if one of:
      the trick is not empty
      the card is not a heart
      hearts are broken
      they hold only hearts
    Then:
      If the card is a heart, hearts are broken.
  When the trick has 4 cards:
    The highest card of the led suit wins the trick.
    Move the trick to the winner's won pile.
    The winner goes next.
  After a player plays, the turn passes to the left.

End:
  The game ends when every hand and the trick are empty.
  Each heart in a player's won pile scores 1 point.
  The queen of spades in a player's won pile scores 13 points.
  The lowest score wins.

Example: you can only play your own cards
  Given the phase is playing
  And it is p1's turn
  And p1 holds the 3 of clubs
  And p2 holds the 4 of clubs
  When p1 plays the 4 of clubs
  Then it is rejected because "You can only play a card from your hand"

Example: hearts can't be led before they are broken
  Given the phase is playing
  And it is p1's turn
  And p1 holds the 3 of hearts and the 4 of clubs
  When p1 plays the 3 of hearts
  Then it is rejected

Example: hearts can be led once broken
  Given the phase is playing
  And it is p1's turn
  And hearts are broken
  And p1 holds the 3 of hearts and the 4 of clubs
  When p1 plays the 3 of hearts
  Then it is accepted

Example: a player holding only hearts may lead one
  Given the phase is playing
  And it is p1's turn
  And p1 holds the 3 of hearts and the 9 of hearts
  When p1 plays the 3 of hearts
  Then it is accepted
  And hearts are broken

Example: you must follow suit
  Given the phase is playing
  And it is p2's turn
  And p1 played the 5 of clubs to the trick
  And p2 holds the 9 of clubs and the queen of spades
  When p2 plays the queen of spades
  Then it is rejected because "they follow the led suit when they can"

Example: you may play anything when you cannot follow
  Given the phase is playing
  And it is p2's turn
  And p1 played the 5 of clubs to the trick
  And p2 holds the 9 of diamonds and the queen of spades
  When p2 plays the queen of spades
  Then it is accepted
  And it is p3's turn

Example: at most 3 cards can be passed
  Given the phase is passing
  And p0's pass pile has the 2 of clubs, the 3 of clubs and the 4 of clubs
  And p0 holds the 5 of clubs
  When p0 passes the 5 of clubs
  Then it is rejected because "their pass pile has fewer than 3 cards"

Example: you can only pass your own cards
  Given the phase is passing
  And p0 holds the 5 of clubs
  And p1 holds the 6 of clubs
  When p0 passes the 6 of clubs
  Then it is rejected

Example: passed cards go left and the 2 of clubs leads
  Given the phase is passing
  And p0's pass pile has the 2 of clubs, the 3 of clubs and the 4 of clubs
  And p1's pass pile has the 2 of hearts, the 3 of hearts and the 4 of hearts
  And p2's pass pile has the 2 of spades, the 3 of spades and the 4 of spades
  And p3's pass pile has the 2 of diamonds and the 3 of diamonds
  And p3 holds the 4 of diamonds and the 5 of diamonds
  When p3 passes the 4 of diamonds
  Then the phase is playing
  And p1 holds 3 cards
  And it is p1's turn

Example: the highest card of the led suit wins the trick and leads next
  Given the phase is playing
  And it is p3's turn
  And p0 played the 5 of clubs to the trick
  And p1 played the ace of clubs to the trick
  And p2 played the king of hearts to the trick
  And p3 holds the 2 of clubs and the 3 of spades
  When p3 plays the 2 of clubs
  Then p1's won pile has 4 cards
  And the trick is empty
  And it is p1's turn

Example: scoring at the end of the hand
  Given the phase is playing
  And it is p3's turn
  And p0's won pile has the queen of spades and the 2 of hearts
  And p1's won pile has the 3 of hearts
  And p0 played the 2 of clubs to the trick
  And p1 played the 3 of clubs to the trick
  And p2 played the 4 of clubs to the trick
  And p3 holds the 5 of clubs
  When p3 plays the 5 of clubs
  Then p0 scores 14
  And p1 scores 1
  And p3 scores 0
  And p2 wins
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import HEARTS from './hearts.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { runExamples } from '@/engine/core/lang/examples';
import { createEngine, initialState, seatsFor } from '@/engine/core/lang/build';
import { zoneCards } from '@/engine/core/game-state';

const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(HEARTS, lib);

describe('Hearts (designer language)', () => {
  it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));

  it('passes every example', () => {
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(11);
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
  });

  it('plays a complete seeded hand: pass, 52 plays, 26 points', () => {
    const { engine } = createEngine(game!, lib, 4, initialState(game!, 42));
    for (const seat of seatsFor(4)) {
      for (let i = 0; i < 3; i++) {
        const hand = zoneCards(engine.getState(), `hand-${seat}`);
        expect(engine.dispatch({ type: 'pass', cardId: hand[0].id, by: seat }).ok).toBe(true);
      }
    }
    expect(engine.getState().turn?.phase).toBe('playing');
    for (const seat of seatsFor(4)) expect(zoneCards(engine.getState(), `hand-${seat}`)).toHaveLength(13);
    for (let step = 0; step < 52; step++) {
      const cur = engine.getState().turn!.current;
      const hand = zoneCards(engine.getState(), `hand-${cur}`);
      expect(hand.some((c) => engine.dispatch({ type: 'play', cardId: c.id, by: cur }).ok)).toBe(true);
    }
    const result = engine.getState().result as { scores: Record<string, number>; winner: string };
    expect(Object.values(result.scores).reduce((a, b) => a + b, 0)).toBe(26);
    expect(seatsFor(4)).toContain(result.winner);
  });

  it('same seed → same id-to-card mapping; ids stay opaque', () => {
    const map = (seed: number) => initialState(game!, seed).cards.map((c) => `${c.id}:${c.faceKey}`);
    expect(map(7)).toEqual(map(7));
    expect(map(7)).not.toEqual(map(8));
    expect(initialState(game!, 7).cards.every((c) => /^c\d+$/.test(c.id))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `bunx vitest run src/games/hearts.test.ts` → FAIL (file missing).
- [ ] **Step 3: Add `hearts.rules` and `vite-env.d.ts`**, then fix any phrase gaps the compile or examples reveal (in the library, with tests) — never by weakening the rules text or the test.
- [ ] **Step 4: Run** — `bunx vitest run src/games/hearts.test.ts` → PASS; `bun run typecheck` clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(games): Hearts written in the designer language"`

---

### Task 14: Color Match in the language (proof 2)

**Files:**
- Create: `src/games/color-match.rules`, `src/games/color-match.test.ts`
- Modify: library files only for genuine phrase gaps (with unit tests)

**Interfaces:**
- Consumes: as Task 13, plus `tableDefFor` and `unreachableZones` (`@/engine/core/lang/testing`).

`src/games/color-match.rules` (exact):

```text
Game: Color Match
Players: 2 to 5

Cards:
  A deck called color cards, starting in the draw pile:
    | color  | number | copies |
    | red    | 1 to 9 | 2      |
    | yellow | 1 to 9 | 2      |
    | green  | 1 to 9 | 2      |
    | blue   | 1 to 9 | 2      |

Table:
  The draw pile is a pile in the center that no one can see.
  The discard pile is a pile in the center that everyone can see.
  Each player has a hand that only they can see.

Setup:
  Shuffle the draw pile.
  Deal 7 cards from the draw pile to each hand.
  Move the top card of the draw pile to the discard pile.

Phase: playing
  Hint: Play a card matching the color or number, or draw one.
  Players take turns.
  Players may rearrange their hand at any time.
  A player may play a card from their hand to the discard pile.
    Only if one of:
      the card has the same color as the top card of the discard pile
      the card has the same number as the top card of the discard pile
  A player may draw a card from the draw pile to their hand.
    Only if they have no card they could play.
  When the draw pile is empty:
    Only if the discard pile has more than 1 card.
    Shuffle the discard pile, except its top card, into the draw pile.
  After a player plays or draws, the turn passes to the left.

End:
  The game ends when a player's hand is empty.
  The player with an empty hand wins.

Example: a card of the same color can be played
  Given the discard pile has a red 7
  And p0 holds a red 2 and a blue 3
  And p1 holds a green 5
  When p0 plays a red 2
  Then it is accepted
  And the top card of the discard pile is a red 2
  And it is p1's turn

Example: a card of the same number can be played
  Given the discard pile has a red 7
  And p0 holds a blue 7 and a blue 3
  And p1 holds a green 5
  When p0 plays a blue 7
  Then it is accepted

Example: a card matching neither cannot be played
  Given the discard pile has a red 7
  And p0 holds a blue 3
  And p1 holds a green 5
  When p0 plays a blue 3
  Then it is rejected

Example: you cannot draw while you hold a playable card
  Given the discard pile has a red 7
  And p0 holds a red 2
  And p1 holds a green 5
  When p0 draws a card
  Then it is rejected because "they have no card they could play"

Example: you can draw when stuck, then the turn passes
  Given the discard pile has a red 7
  And p0 holds a blue 3
  And p1 holds a green 5
  When p0 draws a card
  Then it is accepted
  And p0 holds 2 cards
  And it is p1's turn

Example: an empty draw pile is refilled from the discard pile
  Given the draw pile has a red 1
  And the discard pile has a blue 2, a green 3 and a red 9
  And p0 holds a yellow 4
  And p1 holds a green 5
  When p0 draws a card
  Then the draw pile has 2 cards
  And the top card of the discard pile is a red 9

Example: emptying your hand wins
  Given the discard pile has a red 7
  And p0 holds a red 2
  And p1 holds a green 5
  When p0 plays a red 2
  Then p0 wins
```

(Every example gives both default players a card: an empty hand would end the game as soon as the arranged state settles.)

- [ ] **Step 1: Write the failing test**

```ts
const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(COLOR_MATCH, lib);

it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));
it('passes every example', () => {
  const results = runExamples(game!, lib);
  expect(results).toHaveLength(7);
  expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
});
it('has 72 cards drawn with text faces', () => {
  const cards = initialState(game!, 1).cards;
  expect(cards).toHaveLength(72);
  expect(cards.every((c) => c.faceKey.startsWith('t:'))).toBe(true);
});
it.each([2, 3, 4, 5])('plays a complete seeded game with %i players', (n) => {
  const { engine } = createEngine(game!, lib, n, initialState(game!, 100 + n));
  for (let step = 0; step < 3000 && engine.getState().result === undefined; step++) {
    const s = engine.getState();
    const cur = s.turn!.current;
    const played = zoneCards(s, `hand-${cur}`).some((c) => engine.dispatch({ type: 'play', cardId: c.id, by: cur }).ok);
    if (!played) {
      const top = zoneCards(s, 'draw-pile').at(-1);
      expect(top, `${cur} is stuck with nothing to draw`).toBeDefined();
      expect(engine.dispatch({ type: 'draw', cardId: top!.id, by: cur }).ok).toBe(true);
    }
  }
  const result = engine.getState().result as { winner: string };
  expect(result?.winner).toBeDefined();
  expect(zoneCards(engine.getState(), `hand-${result.winner}`)).toHaveLength(0);
});
it.each([2, 3, 4, 5])('every compiled zone is reachable by a drag at %i seats', (n) => {
  expect(unreachableZones(tableDefFor(game!, seatsFor(n)).zones, 7)).toEqual([]);
});
```

If a seed reaches the 3000-move cap or gets stuck, pick a different fixed seed for that count and note it in the test — do not change the rules.

- [ ] **Step 2: Run to verify it fails** — `bunx vitest run src/games/color-match.test.ts` → FAIL.
- [ ] **Step 3: Add `color-match.rules`**; fix genuine phrase gaps in the library (with tests).
- [ ] **Step 4: Run** — PASS; `bun run test && bun run typecheck` → all green.
- [ ] **Step 5: Commit** — `git commit -m "feat(games): Color Match written in the designer language"`

---

### Task 15: Playtest view (text faces, seat status, undo)

**Files:**
- Create: `src/engine/pixi/text-faces.ts`, `src/engine/pixi/text-faces.test.ts`
- Modify: `src/engine/net/game-server.ts` (add `undo`), `src/engine/net/game-server.test.ts`
- Create: `src/pages/designer/seat-status.ts`, `src/pages/designer/seat-status.test.ts`, `src/pages/designer/playtest.tsx`, `src/pages/designer/playtest.test.tsx`

**Interfaces:**
- Consumes: `parseTextFaceKey`, `standardFaceRenderer`, `makeInitApp`, `Wrapper`, `CardTable`, `GameServer`, `GameSession`, `loopbackChannel`, `createEngine`, `initialState`, `moveForDrop`, `friendlyReason`, `friendlyError`.
- Produces:

```ts
// text-faces.ts
export const textFaceRenderer: FaceRenderer;      // for 't:' keys
export const designerFaceRenderer: FaceRenderer;  // 't:' keys → textFaceRenderer, everything else → standardFaceRenderer
// game-server.ts
undo(): void;   // engine.undo() then notify subscribers (so sessions push fresh views)
// seat-status.ts
export function seatStatus(game: CompiledGame, view: ClientView | null, seat: PlayerId): string;
// playtest.tsx
export function Playtest(props: { game: CompiledGame; library: PhraseLibrary; players: number; seed: number; onRestart(): void; onStop(): void }): JSX.Element;
```

Text face: white rounded card like the standard face; a large centred label (`name` if present, else all values joined by a space); the other attributes listed small as `key: value`; when there is a `color` attribute in `{ red: 0xcc2222, yellow: 0xc9a400, green: 0x2e8b57, blue: 0x2255cc, black: 0x222222, purple: 0x7b3fa0, orange: 0xe07b00 }`, use it for the label and border.

`seatStatus` (exact strings): no view → `''`; a result → `Game over — <winner> wins` plus ` (p0 14, p1 1, p2 0, p3 0)` when there are scores; otherwise with `hint = phase.hint ?? phase.id`: actor `any` → `hint`; current seat → `Your turn — <hint>`; else `<hint> — waiting for <current>`.

`Playtest`: on mount, build `createEngine(game, library, players, initialState(game, seed))` → `new GameServer({ engine, tableDef, seats })` → `new GameSession(server)`. Render one canvas per seat (same structure and sizes as `src/pages/hearts-demo/hearts-demo-page.tsx`'s `SeatCanvas`, using `makeInitApp(designerFaceRenderer, { showEmptyZones: true })`), each showing `seat: <id> — <seatStatus>` and the last rejection via `friendlyReason(reason, view.turn?.current)` for 2500 ms. Drops go through `moveForDrop`; `null` shows "No rule lets you move a card there." Wrap `channel.send` in try/catch and show any thrown error with `friendlyError` in a banner above the seats. Buttons: **Undo** (`server.undo()`), **Restart** (`onRestart`), **Stop** (`onStop`).

- [ ] **Step 1: Write the failing tests**

```ts
// text-faces.test.ts
it('draws a text face with the label and colored by the color attribute', () => {
  const draw = textFaceRenderer({ id: 'c1', zoneId: 'z', faceUp: true, faceKey: textFaceKey({ color: 'red', number: 7 }) });
  expect(typeof draw).toBe('function');
  const c = new Container(); (draw as FaceDraw)(c);
  expect(c.children.some((ch) => ch instanceof Text && ch.text === 'red 7')).toBe(true);
});
it('falls back to the standard renderer for other keys', () => {
  const card = { id: 'c1', zoneId: 'z', faceUp: true, faceKey: '12S' };
  expect(designerFaceRenderer(card)).not.toBe(textFaceRenderer(card));
});
// game-server.test.ts
it('undo rewinds the engine and notifies subscribers', () => { /* submit a move, subscribe spy, undo → state back, spy called once */ });
// seat-status.test.ts — compile color-match.rules; cover all five string shapes, e.g.
expect(seatStatus(game, view({ current: 'p0', phase: 'playing' }), 'p0')).toBe('Your turn — Play a card matching the color or number, or draw one.');
expect(seatStatus(game, view({ current: 'p1', phase: 'playing' }), 'p0')).toBe('Play a card matching the color or number, or draw one. — waiting for p1');
expect(seatStatus(game, view({ current: 'p0', phase: 'playing' }, { winner: 'p1' }), 'p0')).toBe('Game over — p1 wins');
```

```tsx
// playtest.test.tsx — mock the canvas layer
vi.mock('@/components/PixiCanvas', () => ({ Wrapper: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
// Seats render in seat order, so the n-th CardTable rendered belongs to p<n>; keep the latest onDrop per index.
const drops: ((i: DropIntent) => void)[] = [];
let rendered = 0;
vi.mock('@/engine/react', () => ({
  CardTable: (p: CardTableProps) => { drops[rendered++ % 3] = p.onDrop!; return null; },
}));
// Render <Playtest game={colorMatch} library={lib} players={3} seed={1} …/>:
it('renders one seat per player with its status line', () => { /* 3 'seat: p…' lines; p0's says 'Your turn — …' */ });
it('shows the friendly reason when a drag is refused', () => { /* p1 drags a card hand-p1 → discard-pile → "It's p0's turn." */ });
it('says when no rule covers a drag', () => { /* p0 drags hand-p0 → draw-pile → 'No rule lets you move a card there.' */ });
```

- [ ] **Step 2: Run to verify they fail** — `bunx vitest run src/engine/pixi/text-faces.test.ts src/engine/net/game-server.test.ts src/pages/designer` → FAIL.
- [ ] **Step 3: Implement** the four modules and `GameServer.undo`.
- [ ] **Step 4: Run to verify they pass** — PASS; `bun run typecheck` clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(designer): playtest view with text faces, seat status and undo"`

---

### Task 16: Designer page, routing and README

**Files:**
- Create: `src/pages/designer/designer-page.tsx`, `rule-editor.tsx`, `examples-panel.tsx`, `samples.ts`, `storage.ts`, `designer-page.test.tsx`
- Modify: `src/main.tsx`, `README.md`

**Interfaces:**
- Consumes: `compileGame`, `canPlay`, `runExamples`, `createDefaultLibrary`, `slug`, `Playtest` (Task 15), the two `.rules` files via `?raw`.
- Produces:

```ts
// samples.ts
export const SAMPLES: { name: string; text: string }[];   // [{ name: 'Hearts', … }, { name: 'Color Match', … }]
// storage.ts — every access wrapped in try/catch
export const STORAGE_KEY = 'turnhout.designer.rules';
export function loadRules(): string | null;
export function saveRules(text: string): void;
// designer-page.tsx
export function DesignerPage(): JSX.Element;
```

Behaviour:
- Initial text: `loadRules() ?? SAMPLES[0].text`. Every edit saves and, if a playtest is running, **ends it** (decision 9 in the spec).
- Compile on a 300 ms debounce; run examples whenever the compile result has a `game`.
- **Rule editor**: a `<textarea aria-label="Rules">` with a line-number gutter beside it, scroll-synced; gutter lines with an error get `data-problem="error"`, warnings `"warning"`.
- **Problems list** under the editor: `Line N: <message>`; suggestions as `Did you mean: a, b, c?`; an unknown phrase has a **Copy for developer** button (`navigator.clipboard.writeText(stub)`; if unavailable, reveal the stub in a `<pre>`).
- **Examples panel**: summary `N of M examples pass`, then each example's name and status (`pass`/`fail`/`blocked`) with its message.
- **Play**: disabled with the `canPlay` reason shown next to it. When `players.min < players.max`, a `<select aria-label="Players">` offers each count (default min). Play mounts `<Playtest>` with a fresh seed (`Date.now() >>> 0`, allowed in pages); Restart remounts with a new seed; Stop unmounts.
- **Samples**: a "Load sample" `<select>` with Hearts and Color Match (replaces the text).
- **Download** (`<slug(game name)>.rules` via a Blob link) and **Upload** (`<input type="file" accept=".rules,.txt">`).
- `src/main.tsx`: a tiny `App` that renders `DesignerPage` when `location.hash === '#designer'`, else `HeartsDemoPage`, updating on `hashchange`.
- `README.md`: add the game-state engine, flow engine, net layer and designer language to Highlights/Architecture; update the Roadmap (game-state engine, view projection, net sync core and rule engine shipped; this project; next: online play, tokens/meeples); add "Designing a game: `bun run dev`, open `/#designer`".

- [ ] **Step 1: Write the failing test** (`designer-page.test.tsx`; mock `./playtest` as `({ players }) => <div>playtest {players}</div>`, use `vi.useFakeTimers()` and `act(() => vi.advanceTimersByTime(300))` after edits, clear `localStorage` in `beforeEach`)

```tsx
it('loads Hearts by default, runs its examples and allows Play', () => {
  render(<DesignerPage />); flush();
  expect(screen.getByLabelText('Rules')).toHaveValue(SAMPLES[0].text);
  expect(screen.getByText('11 of 11 examples pass')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Play' })).not.toBeDisabled();
});
it('flags an unknown phrase with a hint and disables Play', () => {
  render(<DesignerPage />);
  fireEvent.change(screen.getByLabelText('Rules'), { target: { value: SAMPLES[0].text.replace('Shuffle the deck.', 'Shufle the deck.') } }); flush();
  expect(screen.getByText(/Line 15: “Shufle the deck” isn't in the phrase library yet\./)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Copy for developer' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
  expect(screen.getByText('1 phrase still needs a developer.')).toBeTruthy();
});
it('explains why Play is disabled for empty text', () => { /* value '' → Play disabled, a reason is shown, nothing throws */ });
it('offers a player count for Color Match and plays with it', () => {
  // load sample 'Color Match' → select 'Players' has options 2..5 → choose 3 → click Play → 'playtest 3'
});
it('editing the rules ends a running playtest', () => { /* Play → 'playtest 4' visible → change text → gone */ });
it('saves edits', () => { /* after an edit + flush, localStorage['turnhout.designer.rules'] equals the new text */ });
```

(Line 15 is `Shuffle the deck.` in `hearts.rules`; if the file's line numbers differ, use the actual line.)

- [ ] **Step 2: Run to verify it fails** — `bunx vitest run src/pages/designer/designer-page.test.tsx` → FAIL.
- [ ] **Step 3: Implement** the page files, `main.tsx` routing, and the README update.
- [ ] **Step 4: Verify** — `bun run test && bun run typecheck && bun run build` → all green. Then `bun run dev`, open `/#designer`, load each sample, press Play, and play a few moves at each Color Match count; confirm hints, rejections, undo and restart in the real app.
- [ ] **Step 5: Commit** — `git commit -m "feat(designer): designer page with editor, hints, examples and playtest"` (README in the same commit or a following `docs:` commit).
