# Semantic Zone Model + Serializable Table Schema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn turnhout's presentational zone concept into a serializable, semantic zone model — the foundation (sub-project 1 of 4) for a multiplayer card-game toolkit.

**Architecture:** Split the conflated `Scene` into a static, JSON-serializable `TableDef` (zones with owner/visibility/capacity/accept/ordering) and a dynamic `Placement` (card positions). Acceptance moves from an un-serializable `ZoneState.accepts` function to a named-rule registry evaluated by `canAccept`. Zone drop-bounds become authored/auto-derived geometry instead of a faked multiplier. A `deriveScene` (omniscient identity in SP1) keeps the existing renderer working unchanged.

**Tech Stack:** TypeScript, Vite, React 19, bun, vitest + happy-dom, PixiJS 8.14.0, `@ue-too/*` 0.17.6.

## Global Constraints

- Standalone repo at `/Users/vincent.yy.chang/dev/turnhout/main`; consume `@ue-too/*` from npm.
- `src/engine/core/**` MUST NOT import from `pixi.js`, `react`, `@ue-too/*`, or touch the DOM.
- No `Math.random()` / `Date.now()` in `core/` (determinism). Accept-rules are pure predicates.
- Card world dimensions: `CARD_WIDTH = 100`, `CARD_HEIGHT = 140` (world units), from `src/engine/core/scene.ts`.
- Package manager **bun**; test runner **vitest**. Run one test file with `bunx vitest run <path>`; typecheck with `bun run typecheck`.
- Conventional-commit messages ending with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Work happens on branch `feat/semantic-zone-model` (already created; the design spec is committed there).
- Spec: `docs/superpowers/specs/2026-07-09-semantic-zone-model-design.md`.

## File Structure

| File | New/Changed | Responsibility |
|---|---|---|
| `src/engine/core/scene.ts` | Changed | Add `PlayerId`; add `revealTo` to `CardState`; remove `accepts` from `PlacedZone` (Task 8). |
| `src/engine/core/table-def.ts` | New | `TableDef`, `ZoneDef`, `Placement`, `Json`; `validateTableDef`. |
| `src/engine/core/rules.ts` | New | `RuleRegistry`, `AcceptRule`, `canAccept`. |
| `src/engine/core/rules-library.ts` | New | Starter rules + `registerStarterRules`. |
| `src/engine/core/zone-geometry.ts` | New | `placeZone`, `slotAtPoint`, anchor/auto-bounds math. |
| `src/engine/core/derive-scene.ts` | New | `deriveScene` (omniscient identity). |
| `src/engine/core/hittest.ts` | Changed | Add `resolveDrop` (Task 7); remove `zoneAtPoint` (Task 8). |
| `src/engine/input/table-input-context.ts` | Changed | `TableInputDeps` swaps zone/scene accessors for `getZones`/`getCards`/`registry` (Task 8). |
| `src/engine/input/table-input-tracker.ts` | Changed | Use `resolveDrop` (Task 8). |
| `src/utils/init-app.ts` | Changed | Build registry, hold `TableDef`+cards, `deriveScene` for render, `setTable` (Task 8). |
| `src/app-components.ts` | Changed | `AppComponents`: `setTable` + `registry` (Task 8). |
| `src/engine/react/types.ts` | Changed | `CardTableProps`: `tableDef`+`placement` (Task 8). |
| `src/engine/react/card-table.tsx` | Changed | Call `app.setTable` (Task 8). |
| `src/pages/table-demo/deck.ts` | Changed | Populate `data.rank`/`data.suit` (Task 9). |
| `src/pages/table-demo/table-demo-page.tsx` | Changed | Author `TableDef`+`Placement`; validate (Task 9). |

---

## Task 1: Table schema types + `CardState.revealTo`

**Files:**
- Modify: `src/engine/core/scene.ts`
- Create: `src/engine/core/table-def.ts`
- Test: `src/engine/core/table-def.test.ts`

**Interfaces:**
- Consumes: `LayoutKind`, `LayoutOptions`, `CardState` from `./scene`.
- Produces:
  - `type PlayerId = string` (in `scene.ts`).
  - `CardState.revealTo?: PlayerId[] | 'all'` (in `scene.ts`).
  - `type Json = null | boolean | number | string | Json[] | { [k: string]: Json }`.
  - `interface ZoneDef { id; layout; transform:{x;y;rotation?}; layoutOptions?; bounds?:{width;height;anchor?:{x;y}}; owner?: PlayerId|'shared'; visibility?: 'public'|'owner'|'secret'; capacity?; accept?:{rule:string;params?:Json}; ordering?: 'stack'|'ordered'|'free'; }`
  - `interface TableDef { zones: ZoneDef[]; players?: PlayerId[]; }`
  - `interface Placement { cards: CardState[]; }`

- [ ] **Step 1: Extend `scene.ts` with `PlayerId` and `revealTo`**

In `src/engine/core/scene.ts`, add after the `Vec2` interface:

```ts
export type PlayerId = string;
```

Add the `revealTo` field to `CardState` (after `data`):

```ts
export interface CardState {
  id: string;
  zoneId: string;
  faceUp: boolean;
  faceKey: string;
  slot?: number;
  draggable?: boolean;
  data?: { x?: number; y?: number; [k: string]: unknown };
  revealTo?: PlayerId[] | 'all'; // per-card visibility override (SP3 enforces)
}
```

- [ ] **Step 2: Write the failing test `src/engine/core/table-def.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { Placement, TableDef } from './table-def';

describe('table schema', () => {
  it('is JSON-serializable and round-trips', () => {
    const def: TableDef = {
      players: ['p1', 'p2'],
      zones: [
        { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 }, visibility: 'secret' },
        { id: 'hand', layout: 'fan', transform: { x: 0, y: 300 }, owner: 'p1', visibility: 'owner' },
        {
          id: 'foundation', layout: 'pile', transform: { x: 400, y: 0 },
          capacity: 13, accept: { rule: 'sameSuitAscending' },
          bounds: { width: 100, height: 140, anchor: { x: 0.5, y: 0.5 } },
        },
      ],
    };
    const placement: Placement = {
      cards: [{ id: 'AS', zoneId: 'deck', faceUp: false, faceKey: 'AS', revealTo: ['p1'] }],
    };
    expect(JSON.parse(JSON.stringify(def))).toEqual(def);
    expect(JSON.parse(JSON.stringify(placement))).toEqual(placement);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/table-def.test.ts`
Expected: FAIL — cannot find module `./table-def`.

- [ ] **Step 4: Write `src/engine/core/table-def.ts`**

```ts
import type { CardState, LayoutKind, LayoutOptions, PlayerId } from './scene';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export interface ZoneDef {
  id: string;
  layout: LayoutKind;
  transform: { x: number; y: number; rotation?: number };
  layoutOptions?: LayoutOptions;
  bounds?: { width: number; height: number; anchor?: { x: number; y: number } };
  owner?: PlayerId | 'shared';
  visibility?: 'public' | 'owner' | 'secret';
  capacity?: number;
  accept?: { rule: string; params?: Json };
  ordering?: 'stack' | 'ordered' | 'free';
}

export interface TableDef {
  zones: ZoneDef[];
  players?: PlayerId[];
}

export interface Placement {
  cards: CardState[];
}
```

- [ ] **Step 5: Run test + typecheck**

Run: `bunx vitest run src/engine/core/table-def.test.ts && bun run typecheck`
Expected: PASS (1 test); typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/engine/core/scene.ts src/engine/core/table-def.ts src/engine/core/table-def.test.ts
git commit -m "feat(core): TableDef/ZoneDef/Placement schema + CardState.revealTo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Rule registry + `canAccept`

**Files:**
- Create: `src/engine/core/rules.ts`
- Test: `src/engine/core/rules.test.ts`

**Interfaces:**
- Consumes: `CardState` from `./scene`; `ZoneDef` from `./table-def`.
- Produces:
  - `type AcceptRule = (args: { card: CardState; zone: ZoneDef; zoneCards: CardState[]; top: CardState | null; params?: Json }) => boolean`
  - `class RuleRegistry { register(name: string, fn: AcceptRule): this; get(name: string): AcceptRule | undefined; has(name: string): boolean }`
  - `function canAccept(zone: ZoneDef, card: CardState, zoneCards: CardState[], registry: RuleRegistry): boolean`

- [ ] **Step 1: Write the failing test `src/engine/core/rules.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { RuleRegistry, canAccept } from './rules';
import type { CardState } from './scene';
import type { ZoneDef } from './table-def';

const card = (id: string): CardState => ({ id, zoneId: 'src', faceUp: true, faceKey: id });
const zone = (extra: Partial<ZoneDef> = {}): ZoneDef => ({ id: 'z', layout: 'pile', transform: { x: 0, y: 0 }, ...extra });

describe('RuleRegistry', () => {
  it('registers, gets, and reports presence', () => {
    const r = new RuleRegistry();
    r.register('yes', () => true);
    expect(r.has('yes')).toBe(true);
    expect(r.has('no')).toBe(false);
    expect(r.get('yes')!({ card: card('a'), zone: zone(), zoneCards: [], top: null })).toBe(true);
  });
});

describe('canAccept', () => {
  const registry = new RuleRegistry().register('rejectAll', () => false);

  it('accepts anything when no accept rule is set', () => {
    expect(canAccept(zone(), card('a'), [], registry)).toBe(true);
  });

  it('enforces capacity before the rule', () => {
    expect(canAccept(zone({ capacity: 1 }), card('a'), [card('x')], registry)).toBe(false);
  });

  it('delegates to the named rule', () => {
    expect(canAccept(zone({ accept: { rule: 'rejectAll' } }), card('a'), [], registry)).toBe(false);
  });

  it('throws on an unknown rule name', () => {
    expect(() => canAccept(zone({ accept: { rule: 'ghost' } }), card('a'), [], registry)).toThrow(/ghost/);
  });

  it('passes top and params to the rule', () => {
    const reg = new RuleRegistry().register('needsTopAndParam', ({ top, params }) => top?.id === 'x' && params === 7);
    const z = zone({ accept: { rule: 'needsTopAndParam', params: 7 } });
    expect(canAccept(z, card('a'), [card('x')], reg)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/rules.test.ts`
Expected: FAIL — cannot find module `./rules`.

- [ ] **Step 3: Write `src/engine/core/rules.ts`**

```ts
import type { CardState } from './scene';
import type { Json, ZoneDef } from './table-def';

export type AcceptRule = (args: {
  card: CardState;
  zone: ZoneDef;
  zoneCards: CardState[];
  top: CardState | null;
  params?: Json;
}) => boolean;

export class RuleRegistry {
  private rules = new Map<string, AcceptRule>();

  register(name: string, fn: AcceptRule): this {
    this.rules.set(name, fn);
    return this;
  }

  get(name: string): AcceptRule | undefined {
    return this.rules.get(name);
  }

  has(name: string): boolean {
    return this.rules.has(name);
  }
}

export function canAccept(
  zone: ZoneDef,
  card: CardState,
  zoneCards: CardState[],
  registry: RuleRegistry,
): boolean {
  if (zone.capacity !== undefined && zoneCards.length >= zone.capacity) return false;
  if (!zone.accept) return true;
  const rule = registry.get(zone.accept.rule);
  if (!rule) throw new Error(`unknown accept rule: ${zone.accept.rule}`);
  const top = zoneCards.length > 0 ? zoneCards[zoneCards.length - 1] : null;
  return rule({ card, zone, zoneCards, top, params: zone.accept.params });
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `bunx vitest run src/engine/core/rules.test.ts && bun run typecheck`
Expected: PASS (6 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/rules.ts src/engine/core/rules.test.ts
git commit -m "feat(core): RuleRegistry + canAccept (capacity + named accept rules)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Starter rule library

**Files:**
- Create: `src/engine/core/rules-library.ts`
- Test: `src/engine/core/rules-library.test.ts`

**Interfaces:**
- Consumes: `AcceptRule`, `RuleRegistry` from `./rules`; `CardState` from `./scene`.
- Produces:
  - Named rules on a registry via `registerStarterRules(registry: RuleRegistry): RuleRegistry`.
  - Rules: `alwaysAccept`, `descAltColor`, `sameSuitAscending`, `matchRankOrSuit`, `byTag`, `emptyOnly`.
  - Convention: cards carry `data.rank` (number 1–13) and `data.suit` (`'S'|'H'|'D'|'C'`); `data.tags` (`string[]`) for `byTag`.

- [ ] **Step 1: Write the failing test `src/engine/core/rules-library.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { RuleRegistry, canAccept } from './rules';
import { registerStarterRules } from './rules-library';
import type { CardState } from './scene';
import type { ZoneDef } from './table-def';

const reg = registerStarterRules(new RuleRegistry());
const card = (suit: string, rank: number, tags: string[] = []): CardState => ({
  id: `${rank}${suit}`, zoneId: 'src', faceUp: true, faceKey: `${rank}${suit}`, data: { suit, rank, tags },
});
const zone = (accept: ZoneDef['accept'], extra: Partial<ZoneDef> = {}): ZoneDef => ({
  id: 'z', layout: 'pile', transform: { x: 0, y: 0 }, accept, ...extra,
});

describe('descAltColor', () => {
  const z = zone({ rule: 'descAltColor' });
  it('accepts a King onto an empty zone', () => {
    expect(canAccept(z, card('S', 13), [], reg)).toBe(true);
  });
  it('rejects a non-King onto an empty zone', () => {
    expect(canAccept(z, card('S', 12), [], reg)).toBe(false);
  });
  it('accepts red 6 on black 7', () => {
    expect(canAccept(z, card('H', 6), [card('S', 7)], reg)).toBe(true);
  });
  it('rejects red 6 on red 7 (same color)', () => {
    expect(canAccept(z, card('H', 6), [card('D', 7)], reg)).toBe(false);
  });
  it('rejects red 5 on black 7 (not one below)', () => {
    expect(canAccept(z, card('H', 5), [card('S', 7)], reg)).toBe(false);
  });
});

describe('sameSuitAscending', () => {
  const z = zone({ rule: 'sameSuitAscending' });
  it('accepts an Ace onto empty', () => {
    expect(canAccept(z, card('S', 1), [], reg)).toBe(true);
  });
  it('accepts same-suit next rank up', () => {
    expect(canAccept(z, card('S', 2), [card('S', 1)], reg)).toBe(true);
  });
  it('rejects a different suit', () => {
    expect(canAccept(z, card('H', 2), [card('S', 1)], reg)).toBe(false);
  });
});

describe('matchRankOrSuit', () => {
  const z = zone({ rule: 'matchRankOrSuit' });
  it('accepts same rank', () => {
    expect(canAccept(z, card('H', 7), [card('S', 7)], reg)).toBe(true);
  });
  it('accepts same suit', () => {
    expect(canAccept(z, card('S', 3), [card('S', 7)], reg)).toBe(true);
  });
  it('rejects a mismatch', () => {
    expect(canAccept(z, card('H', 3), [card('S', 7)], reg)).toBe(false);
  });
});

describe('byTag and emptyOnly', () => {
  it('byTag accepts when a required tag is present', () => {
    const z = zone({ rule: 'byTag', params: { tags: ['creature'] } });
    expect(canAccept(z, card('S', 3, ['creature']), [], reg)).toBe(true);
    expect(canAccept(z, card('S', 3, ['land']), [], reg)).toBe(false);
  });
  it('emptyOnly accepts only when the zone is empty', () => {
    const z = zone({ rule: 'emptyOnly' });
    expect(canAccept(z, card('S', 3), [], reg)).toBe(true);
    expect(canAccept(z, card('S', 3), [card('H', 9)], reg)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/rules-library.test.ts`
Expected: FAIL — cannot find module `./rules-library`.

- [ ] **Step 3: Write `src/engine/core/rules-library.ts`**

```ts
import type { AcceptRule, RuleRegistry } from './rules';
import type { CardState } from './scene';

const RED = new Set(['H', 'D']);

function suitOf(c: CardState): string | undefined {
  return typeof c.data?.suit === 'string' ? c.data.suit : undefined;
}
function rankOf(c: CardState): number | undefined {
  return typeof c.data?.rank === 'number' ? c.data.rank : undefined;
}
function tagsOf(c: CardState): string[] {
  return Array.isArray(c.data?.tags) ? (c.data!.tags as string[]) : [];
}
function isRed(c: CardState): boolean {
  const s = suitOf(c);
  return s !== undefined && RED.has(s);
}

const alwaysAccept: AcceptRule = () => true;

const descAltColor: AcceptRule = ({ card, top }) => {
  const cr = rankOf(card);
  if (cr === undefined) return false;
  if (!top) return cr === 13; // only a King starts an empty column
  const tr = rankOf(top);
  return tr !== undefined && isRed(card) !== isRed(top) && cr === tr - 1;
};

const sameSuitAscending: AcceptRule = ({ card, top }) => {
  const cr = rankOf(card);
  if (cr === undefined) return false;
  if (!top) return cr === 1; // Ace starts a foundation
  const tr = rankOf(top);
  return tr !== undefined && suitOf(card) === suitOf(top) && cr === tr + 1;
};

const matchRankOrSuit: AcceptRule = ({ card, top }) => {
  if (!top) return true;
  return suitOf(card) === suitOf(top) || rankOf(card) === rankOf(top);
};

const byTag: AcceptRule = ({ card, params }) => {
  const required = (params as { tags?: string[] } | undefined)?.tags ?? [];
  const have = new Set(tagsOf(card));
  return required.every((t) => have.has(t));
};

const emptyOnly: AcceptRule = ({ zoneCards }) => zoneCards.length === 0;

export function registerStarterRules(registry: RuleRegistry): RuleRegistry {
  return registry
    .register('alwaysAccept', alwaysAccept)
    .register('descAltColor', descAltColor)
    .register('sameSuitAscending', sameSuitAscending)
    .register('matchRankOrSuit', matchRankOrSuit)
    .register('byTag', byTag)
    .register('emptyOnly', emptyOnly);
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `bunx vitest run src/engine/core/rules-library.test.ts && bun run typecheck`
Expected: PASS (13 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/rules-library.ts src/engine/core/rules-library.test.ts
git commit -m "feat(core): starter accept-rule library (solitaire/TCG/shedding)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Zone geometry — `placeZone` + `slotAtPoint`

**Files:**
- Create: `src/engine/core/zone-geometry.ts`
- Test: `src/engine/core/zone-geometry.test.ts`

**Interfaces:**
- Consumes: `computeZoneLayout` from `./layout`; `CARD_WIDTH`, `CARD_HEIGHT`, `CardState`, `PlacedZone`, `Vec2` from `./scene`; `ZoneDef` from `./table-def`.
- Produces:
  - `function placeZone(zone: ZoneDef, cards: CardState[]): PlacedZone` — world-space AABB `{ id, x, y, width, height }` (x/y = box center). Uses `zone.bounds` if present, else auto-derives a tight box from the layout (one-card footprint fallback when empty).
  - `function slotAtPoint(zone: ZoneDef, cards: CardState[], world: Vec2): number` — insertion index. `stack`/`ordered` → `cards.length`; `free` → nearest existing card index (0 when empty).

Note: `PlacedZone` still carries an optional `accepts?` here; `placeZone` simply omits it. Task 8 removes the field.

- [ ] **Step 1: Write the failing test `src/engine/core/zone-geometry.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { placeZone, slotAtPoint } from './zone-geometry';
import { CARD_HEIGHT, CARD_WIDTH, type CardState } from './scene';
import type { ZoneDef } from './table-def';

const card = (id: string, extra: Partial<CardState> = {}): CardState => ({
  id, zoneId: 'z', faceUp: true, faceKey: id, ...extra,
});

describe('placeZone — authored bounds', () => {
  it('centers the box on transform for a centered anchor', () => {
    const z: ZoneDef = { id: 'z', layout: 'pile', transform: { x: 10, y: 20 }, bounds: { width: 100, height: 140, anchor: { x: 0.5, y: 0.5 } } };
    expect(placeZone(z, [])).toEqual({ id: 'z', x: 10, y: 20, width: 100, height: 140 });
  });

  it('offsets the box when the anchor is top-left', () => {
    const z: ZoneDef = { id: 'z', layout: 'grid', transform: { x: 0, y: 0 }, bounds: { width: 100, height: 140, anchor: { x: 0, y: 0 } } };
    // transform is the top-left corner → center is +half-size.
    expect(placeZone(z, [])).toEqual({ id: 'z', x: 50, y: 70, width: 100, height: 140 });
  });
});

describe('placeZone — auto bounds', () => {
  it('falls back to a single card footprint at transform when empty', () => {
    const z: ZoneDef = { id: 'z', layout: 'pile', transform: { x: 5, y: 7 } };
    expect(placeZone(z, [])).toEqual({ id: 'z', x: 5, y: 7, width: CARD_WIDTH, height: CARD_HEIGHT });
  });

  it('encloses a two-card row (default spacing 110)', () => {
    const z: ZoneDef = { id: 'z', layout: 'row', transform: { x: 0, y: 0 } };
    const p = placeZone(z, [card('a'), card('b')]);
    // card centers at x=-55 and x=55; box spans -55-50 .. 55+50 = 210 wide.
    expect(p.x).toBeCloseTo(0);
    expect(p.width).toBeCloseTo(210);
    expect(p.height).toBeCloseTo(CARD_HEIGHT);
  });
});

describe('slotAtPoint', () => {
  it('stack always appends at the top', () => {
    const z: ZoneDef = { id: 'z', layout: 'pile', transform: { x: 0, y: 0 }, ordering: 'stack' };
    expect(slotAtPoint(z, [card('a'), card('b')], { x: 0, y: 0 })).toBe(2);
  });

  it('free returns the nearest existing card index', () => {
    const z: ZoneDef = { id: 'z', layout: 'row', transform: { x: 0, y: 0 }, ordering: 'free' };
    // 'a' centers at x=-55, 'b' at x=55; a point at x=50 is nearest to 'b' (index 1).
    expect(slotAtPoint(z, [card('a'), card('b')], { x: 50, y: 0 })).toBe(1);
  });

  it('free returns 0 for an empty zone', () => {
    const z: ZoneDef = { id: 'z', layout: 'free', transform: { x: 0, y: 0 }, ordering: 'free' };
    expect(slotAtPoint(z, [], { x: 0, y: 0 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/zone-geometry.test.ts`
Expected: FAIL — cannot find module `./zone-geometry`.

- [ ] **Step 3: Write `src/engine/core/zone-geometry.ts`**

```ts
import { computeZoneLayout } from './layout';
import { CARD_HEIGHT, CARD_WIDTH, type CardState, type PlacedZone, type Vec2 } from './scene';
import type { ZoneDef } from './table-def';

function defaultAnchor(zone: ZoneDef): { x: number; y: number } {
  return zone.layout === 'grid' ? { x: 0, y: 0 } : { x: 0.5, y: 0.5 };
}

/** Half-extents of a rotated CARD_WIDTH×CARD_HEIGHT box scaled by `scale`. */
function cardHalfExtents(rotation: number, scale: number): { hx: number; hy: number } {
  const w = CARD_WIDTH * scale;
  const h = CARD_HEIGHT * scale;
  const c = Math.abs(Math.cos(rotation));
  const s = Math.abs(Math.sin(rotation));
  return { hx: (w * c + h * s) / 2, hy: (w * s + h * c) / 2 };
}

export function placeZone(zone: ZoneDef, cards: CardState[]): PlacedZone {
  if (zone.bounds) {
    const anchor = zone.bounds.anchor ?? defaultAnchor(zone);
    const { width, height } = zone.bounds;
    return {
      id: zone.id,
      x: zone.transform.x + (0.5 - anchor.x) * width,
      y: zone.transform.y + (0.5 - anchor.y) * height,
      width,
      height,
    };
  }

  // Auto-bounds: enclose the actual laid-out card rects.
  const poses = [...computeZoneLayout(zone, cards).values()];
  if (poses.length === 0) {
    const { hx, hy } = cardHalfExtents(zone.transform.rotation ?? 0, 1);
    return { id: zone.id, x: zone.transform.x, y: zone.transform.y, width: hx * 2, height: hy * 2 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poses) {
    const { hx, hy } = cardHalfExtents(p.rotation, p.scale);
    minX = Math.min(minX, p.x - hx);
    maxX = Math.max(maxX, p.x + hx);
    minY = Math.min(minY, p.y - hy);
    maxY = Math.max(maxY, p.y + hy);
  }
  return {
    id: zone.id,
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function slotAtPoint(zone: ZoneDef, cards: CardState[], world: Vec2): number {
  if ((zone.ordering ?? 'stack') !== 'free') return cards.length;
  if (cards.length === 0) return 0;
  const poses = computeZoneLayout(zone, cards);
  let bestIndex = 0;
  let bestDist = Infinity;
  cards.forEach((c, i) => {
    const p = poses.get(c.id);
    if (!p) return;
    const d = Math.hypot(p.x - world.x, p.y - world.y);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  });
  return bestIndex;
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `bunx vitest run src/engine/core/zone-geometry.test.ts && bun run typecheck`
Expected: PASS (7 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/zone-geometry.ts src/engine/core/zone-geometry.test.ts
git commit -m "feat(core): placeZone (anchor/auto-bounds) + slotAtPoint

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `validateTableDef`

**Files:**
- Modify: `src/engine/core/table-def.ts`
- Test: `src/engine/core/table-def-validate.test.ts`

**Interfaces:**
- Consumes: `TableDef`, `ZoneDef` (this file); `RuleRegistry` from `./rules`.
- Produces: `function validateTableDef(def: TableDef, registry: RuleRegistry): { ok: boolean; errors: string[]; warnings: string[] }`.

- [ ] **Step 1: Write the failing test `src/engine/core/table-def-validate.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { validateTableDef, type TableDef } from './table-def';
import { RuleRegistry } from './rules';

const reg = new RuleRegistry().register('ok', () => true);
const base = (zones: TableDef['zones'], players?: string[]): TableDef => ({ zones, players });

describe('validateTableDef', () => {
  it('accepts a valid table', () => {
    const def = base([{ id: 'a', layout: 'pile', transform: { x: 0, y: 0 }, accept: { rule: 'ok' } }]);
    expect(validateTableDef(def, reg)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('errors on duplicate zone ids', () => {
    const def = base([
      { id: 'a', layout: 'pile', transform: { x: 0, y: 0 } },
      { id: 'a', layout: 'pile', transform: { x: 1, y: 1 } },
    ]);
    expect(validateTableDef(def, reg).errors).toContain('duplicate zone id: a');
  });

  it('errors on an unknown accept rule', () => {
    const def = base([{ id: 'a', layout: 'pile', transform: { x: 0, y: 0 }, accept: { rule: 'ghost' } }]);
    const r = validateTableDef(def, reg);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('zone a references unknown rule: ghost');
  });

  it('errors on capacity < 1 and non-positive bounds', () => {
    const def = base([
      { id: 'a', layout: 'pile', transform: { x: 0, y: 0 }, capacity: 0 },
      { id: 'b', layout: 'pile', transform: { x: 0, y: 0 }, bounds: { width: 0, height: 140 } },
    ]);
    const r = validateTableDef(def, reg);
    expect(r.errors).toContain('zone a has capacity < 1');
    expect(r.errors).toContain('zone b has non-positive bounds');
  });

  it('warns when an owner is not a declared player', () => {
    const def = base([{ id: 'a', layout: 'pile', transform: { x: 0, y: 0 }, owner: 'ghost' }], ['p1']);
    expect(validateTableDef(def, reg).warnings).toContain('zone a owner is not a declared player: ghost');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/table-def-validate.test.ts`
Expected: FAIL — `validateTableDef` is not exported.

- [ ] **Step 3: Add `validateTableDef` to `src/engine/core/table-def.ts`**

Add the import at the top of the file:

```ts
import type { RuleRegistry } from './rules';
```

Append the function:

```ts
export function validateTableDef(
  def: TableDef,
  registry: RuleRegistry,
): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const players = new Set(def.players ?? []);

  for (const z of def.zones) {
    if (seen.has(z.id)) errors.push(`duplicate zone id: ${z.id}`);
    seen.add(z.id);
    if (z.capacity !== undefined && z.capacity < 1) errors.push(`zone ${z.id} has capacity < 1`);
    if (z.bounds && (z.bounds.width <= 0 || z.bounds.height <= 0)) {
      errors.push(`zone ${z.id} has non-positive bounds`);
    }
    if (z.accept && !registry.has(z.accept.rule)) {
      errors.push(`zone ${z.id} references unknown rule: ${z.accept.rule}`);
    }
    if (z.owner !== undefined && z.owner !== 'shared' && def.players && !players.has(z.owner)) {
      warnings.push(`zone ${z.id} owner is not a declared player: ${z.owner}`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `bunx vitest run src/engine/core/table-def-validate.test.ts && bun run typecheck`
Expected: PASS (5 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/table-def.ts src/engine/core/table-def-validate.test.ts
git commit -m "feat(core): validateTableDef (ids, rules, capacity, bounds, owner)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `deriveScene` (omniscient identity)

**Files:**
- Create: `src/engine/core/derive-scene.ts`
- Test: `src/engine/core/derive-scene.test.ts`

**Interfaces:**
- Consumes: `TableDef`, `Placement` from `./table-def`; `Scene` from `./scene`.
- Produces: `function deriveScene(def: TableDef, placement: Placement, viewer?: PlayerId): Scene` — SP1 ignores `viewer` (omniscient). Maps each `ZoneDef` to a render `ZoneState` (id/layout/transform/layoutOptions) and passes cards through.

- [ ] **Step 1: Write the failing test `src/engine/core/derive-scene.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { deriveScene } from './derive-scene';
import type { Placement, TableDef } from './table-def';

describe('deriveScene (identity)', () => {
  it('maps ZoneDefs to render zones and passes cards through', () => {
    const def: TableDef = {
      zones: [
        { id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 }, visibility: 'secret', capacity: 52 },
      ],
    };
    const placement: Placement = { cards: [{ id: 'AS', zoneId: 'deck', faceUp: false, faceKey: 'AS' }] };
    const scene = deriveScene(def, placement);
    expect(scene.zones).toEqual([
      { id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 } },
    ]);
    expect(scene.cards).toEqual(placement.cards);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/derive-scene.test.ts`
Expected: FAIL — cannot find module `./derive-scene`.

- [ ] **Step 3: Write `src/engine/core/derive-scene.ts`**

```ts
import type { PlayerId, Scene } from './scene';
import type { Placement, TableDef } from './table-def';

/**
 * Project a TableDef + Placement into a renderable Scene.
 * SP1 ships the omniscient identity: the viewer sees everything, so `viewer`
 * is accepted but unused. SP3 replaces the body with per-player hiding.
 */
export function deriveScene(def: TableDef, placement: Placement, _viewer?: PlayerId): Scene {
  return {
    zones: def.zones.map((z) => ({
      id: z.id,
      layout: z.layout,
      transform: z.transform,
      layoutOptions: z.layoutOptions,
    })),
    cards: placement.cards,
  };
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `bunx vitest run src/engine/core/derive-scene.test.ts && bun run typecheck`
Expected: PASS (1 test); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/derive-scene.ts src/engine/core/derive-scene.test.ts
git commit -m "feat(core): deriveScene omniscient identity projection

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `resolveDrop` — the semantic drop resolver

**Files:**
- Modify: `src/engine/core/hittest.ts`
- Test: `src/engine/core/resolve-drop.test.ts`

**Interfaces:**
- Consumes: `placeZone`, `slotAtPoint` from `./zone-geometry`; `canAccept`, `RuleRegistry` from `./rules`; `ZoneDef` from `./table-def`; `CardState`, `Vec2` from `./scene`.
- Produces:
  - `function resolveDrop(pt: Vec2, zones: ZoneDef[], zoneCardsOf: (zoneId: string) => CardState[], card: CardState, registry: RuleRegistry): { zoneId: string; slot: number } | null` — topmost (last in array order) zone whose placed AABB contains `pt` and that `canAccept`s the card; `slot` via `slotAtPoint`.
- Keeps `zoneAtPoint` for now (removed in Task 8).

- [ ] **Step 1: Write the failing test `src/engine/core/resolve-drop.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { resolveDrop } from './hittest';
import { RuleRegistry } from './rules';
import { registerStarterRules } from './rules-library';
import type { CardState } from './scene';
import type { ZoneDef } from './table-def';

const reg = registerStarterRules(new RuleRegistry());
const card = (id: string, suit: string, rank: number): CardState => ({
  id, zoneId: 'src', faceUp: true, faceKey: id, data: { suit, rank },
});

const zones: ZoneDef[] = [
  { id: 'table', layout: 'free', transform: { x: 0, y: 0 }, bounds: { width: 2000, height: 2000 } },
  { id: 'foundation', layout: 'pile', transform: { x: 300, y: 0 }, accept: { rule: 'sameSuitAscending' }, bounds: { width: 100, height: 140 } },
];
const empty = () => [];

describe('resolveDrop', () => {
  it('returns the topmost accepting zone', () => {
    // Ace onto the empty foundation → accepted; foundation is last (topmost).
    expect(resolveDrop({ x: 300, y: 0 }, zones, empty, card('AS', 'S', 1), reg)).toEqual({ zoneId: 'foundation', slot: 0 });
  });

  it('falls through to a lower zone when the top one rejects the card', () => {
    // A 5 is rejected by the foundation (needs Ace on empty) → falls to 'table'.
    expect(resolveDrop({ x: 300, y: 0 }, zones, empty, card('5S', 'S', 5), reg)).toEqual({ zoneId: 'table', slot: 0 });
  });

  it('returns null when the point is outside every zone', () => {
    expect(resolveDrop({ x: 9999, y: 9999 }, zones, empty, card('AS', 'S', 1), reg)).toBeNull();
  });

  it('reports the append slot from the zone occupants', () => {
    const occupants = (zoneId: string): CardState[] => (zoneId === 'table' ? [card('a', 'H', 2), card('b', 'H', 3)] : []);
    // 'table' is ordering-default 'stack' → slot = occupant count = 2.
    expect(resolveDrop({ x: 0, y: 0 }, zones, occupants, card('c', 'H', 4), reg)).toEqual({ zoneId: 'table', slot: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/resolve-drop.test.ts`
Expected: FAIL — `resolveDrop` is not exported.

- [ ] **Step 3: Add `resolveDrop` to `src/engine/core/hittest.ts`**

Add imports at the top (keep the existing import line):

```ts
import { canAccept, type RuleRegistry } from './rules';
import type { ZoneDef } from './table-def';
import { placeZone, slotAtPoint } from './zone-geometry';
```

Append the function (reuses the module-local `inBox`):

```ts
export function resolveDrop(
  pt: Vec2,
  zones: ZoneDef[],
  zoneCardsOf: (zoneId: string) => CardState[],
  card: CardState,
  registry: RuleRegistry,
): { zoneId: string; slot: number } | null {
  for (let i = zones.length - 1; i >= 0; i--) {
    const zone = zones[i];
    const zoneCards = zoneCardsOf(zone.id);
    const placed = placeZone(zone, zoneCards);
    if (!inBox(pt, placed.x, placed.y, placed.width, placed.height)) continue;
    if (!canAccept(zone, card, zoneCards, registry)) continue;
    return { zoneId: zone.id, slot: slotAtPoint(zone, zoneCards, pt) };
  }
  return null;
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `bunx vitest run src/engine/core/resolve-drop.test.ts && bun run typecheck`
Expected: PASS (4 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/hittest.ts src/engine/core/resolve-drop.test.ts
git commit -m "feat(core): resolveDrop (geometry + capacity + rule, topmost-first)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Wire the drop pipeline through input + app; retire the faked bounds

**Files:**
- Modify: `src/engine/core/scene.ts` (remove `accepts` from `PlacedZone`)
- Modify: `src/engine/core/hittest.ts` (remove `zoneAtPoint`)
- Modify: `src/engine/core/hittest.test.ts` (drop the `zoneAtPoint` block)
- Modify: `src/engine/input/table-input-context.ts`
- Modify: `src/engine/input/table-input-tracker.ts`
- Modify: `src/utils/init-app.ts`
- Modify: `src/app-components.ts`
- Modify: `src/engine/react/types.ts`
- Modify: `src/engine/react/card-table.tsx`
- Test: `src/engine/input/table-input-tracker.test.ts` (update to new deps)

**Interfaces:**
- Consumes: `resolveDrop` (`./hittest`), `deriveScene` (`./derive-scene`), `RuleRegistry`/`registerStarterRules`, `TableDef`/`Placement`.
- Produces:
  - `TableInputDeps` gains `getZones: () => ZoneDef[]`, `getCards: () => CardState[]`, `registry: RuleRegistry`; loses `getPlacedZones` and `getScene`.
  - `AppComponents` gains `setTable(def: TableDef, placement: Placement): void` and `registry: RuleRegistry`; loses `setScene`.
  - `CardTableProps` gains `tableDef: TableDef` and `placement: Placement`; loses `scene`.

- [ ] **Step 1: Remove `accepts` from `PlacedZone` in `src/engine/core/scene.ts`**

Change the `PlacedZone` interface to:

```ts
/** A zone placed in world space (for drop hit-testing). */
export interface PlacedZone { id: string; x: number; y: number; width: number; height: number; }
```

- [ ] **Step 2: Remove `zoneAtPoint` from `src/engine/core/hittest.ts`**

Delete the entire `zoneAtPoint` function. Also drop the now-unused `CardState` from the first import line if TypeScript flags it (`noUnusedLocals` is on) — keep `CardState` only if `resolveDrop`'s signature still references it (it does, via the added import block; ensure the top import no longer double-imports `CardState`). The file should import `CardState` exactly once.

- [ ] **Step 3: Update `src/engine/core/hittest.test.ts`**

Delete the `describe('zoneAtPoint', ...)` block and remove `zoneAtPoint` from the import (`import { cardAtPoint } from './hittest'`). Remove the now-unused `PlacedZone` import if present. Leave the `cardAtPoint` tests intact.

- [ ] **Step 4: Run the core suite to confirm green before touching adapters**

Run: `bunx vitest run src/engine/core`
Expected: PASS (all core tests, including `resolve-drop.test.ts`).

- [ ] **Step 5: Rewrite `TableInputDeps` in `src/engine/input/table-input-context.ts`**

Replace the file with:

```ts
import type { CardState, PlacedCard, Vec2 } from '../core/scene';
import type { RuleRegistry } from '../core/rules';
import type { ZoneDef } from '../core/table-def';

export interface DropIntent {
  cardId: string;
  fromZoneId: string;
  toZoneId: string | null;
  slot: number;
  worldPoint: Vec2;
}

export interface TableIntents {
  onDrop?: (intent: DropIntent) => void;
  onCardClick?: (cardId: string) => void;
  onHover?: (cardId: string | null) => void;
}

export interface TableInputDeps {
  clientToWorld: (clientX: number, clientY: number) => Vec2;
  getPlacedCards: () => PlacedCard[];
  getZones: () => ZoneDef[];
  getCards: () => CardState[];
  registry: RuleRegistry;
  beginDrag: (id: string) => void;
  dragTo: (id: string, world: Vec2) => void;
  endDrag: (id: string) => void;
  intents: TableIntents;
}

export type { CardState, PlacedCard, Vec2 };
```

- [ ] **Step 6: Update `src/engine/input/table-input-tracker.ts`**

Change the import on line 1 and the two methods that read cards/zones:

```ts
import { cardAtPoint, resolveDrop } from '../core/hittest';
```

In `pickUpWorld`, replace the `dragFromZone` lookup:

```ts
    this.dragFromZone = this.deps.getCards().find((c) => c.id === id)?.zoneId ?? null;
```

Replace the body of `dropWorld`'s move branch (the last three statements after the `!this.moved` early return):

```ts
    const cards = this.deps.getCards();
    const card = cards.find((c) => c.id === id);
    const zoneCardsOf = (zoneId: string) => cards.filter((c) => c.zoneId === zoneId);
    const hit = card ? resolveDrop(world, this.deps.getZones(), zoneCardsOf, card, this.deps.registry) : null;
    this.deps.intents.onDrop?.({
      cardId: id, fromZoneId: this.dragFromZone ?? '', toZoneId: hit?.zoneId ?? null, slot: hit?.slot ?? 0, worldPoint: world,
    });
```

- [ ] **Step 7: Update `src/utils/init-app.ts`**

Replace the imports of scene/PlacedZone with the schema + registry + deriveScene, adding:

```ts
import type { Vec2 } from '@/engine/core/scene';
import type { Placement, TableDef, ZoneDef } from '@/engine/core/table-def';
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import { deriveScene } from '@/engine/core/derive-scene';
```

Remove the `PlacedZone`, `Scene` imports and the `CARD_WIDTH`/`CARD_HEIGHT` import *only if* they become unused (the `drawToTexture`/`defaultRenderer` code still uses both — keep them).

Replace the state + tracker wiring (the `currentScene`/`currentZones` block and the `TableInputTracker` deps) with:

```ts
  const registry = registerStarterRules(new RuleRegistry());
  let currentDef: TableDef = { zones: [] };
  let currentCards: CardState[] = [];
```

Final imports from scene: `import type { CardState, Vec2 } from '@/engine/core/scene';` plus the existing `import { CARD_WIDTH, CARD_HEIGHT } from '@/engine/core/scene';` value import.

Tracker deps become:

```ts
  const tracker = new TableInputTracker({
    clientToWorld,
    getPlacedCards: () => pixiTable.getPlacedCards(),
    getZones: () => currentDef.zones,
    getCards: () => currentCards,
    registry,
    beginDrag: (id) => pixiTable.beginDrag(id),
    dragTo: (id, world) => pixiTable.dragTo(id, world),
    endDrag: (id) => pixiTable.endDrag(id),
    intents: {
      onDrop: (i) => intents.onDrop?.(i),
      onCardClick: (id) => intents.onCardClick?.(id),
      onHover: (id) => intents.onHover?.(id),
    },
  });
```

Replace `setScene` with `setTable`:

```ts
  const setTable = (def: TableDef, placement: Placement): void => {
    currentDef = def;
    currentCards = placement.cards;
    pixiTable.setScene(deriveScene(def, placement));
  };
```

Update the returned object: replace `setScene,` with `setTable,` and add `registry,`.

- [ ] **Step 8: Update `src/app-components.ts`**

```ts
import type { BaseAppComponents } from '@ue-too/board-pixi-integration';
import type { Vec2 } from '@/engine/core/scene';
import type { Placement, TableDef } from '@/engine/core/table-def';
import type { RuleRegistry } from '@/engine/core/rules';
import type { TableIntents } from '@/engine/input/table-input-context';
import type { TableInputTracker } from '@/engine/input/table-input-tracker';
import type { PixiTable } from '@/engine/pixi/pixi-table';

export type AppComponents = BaseAppComponents & {
  type: 'table';
  pixiTable: PixiTable;
  inputTracker: TableInputTracker;
  registry: RuleRegistry;
  setTable: (def: TableDef, placement: Placement) => void;
  setIntents: (intents: TableIntents) => void;
  clientToWorld: (clientX: number, clientY: number) => Vec2;
};

declare module '@ue-too/board-pixi-react-integration' {
  interface PixiCanvasRegistry {
    components: AppComponents;
  }
}
```

- [ ] **Step 9: Update `src/engine/react/types.ts` and `card-table.tsx`**

`types.ts`:

```ts
import type { Placement, TableDef } from '../core/table-def';
import type { DropIntent } from '../input/table-input-context';

export interface CardTableHandle {
  deal(staggerMs?: number): void;
  shuffle(zoneId: string): void;
}

export interface CardTableProps {
  tableDef: TableDef;
  placement: Placement;
  onDrop?: (intent: DropIntent) => void;
  onCardClick?: (cardId: string) => void;
  onHover?: (cardId: string | null) => void;
}
```

In `card-table.tsx`, replace the scene effect:

```ts
  useEffect(() => {
    if (!app) return;
    app.setTable(props.tableDef, props.placement);
  }, [app, props.tableDef, props.placement]);
```

- [ ] **Step 10: Update `src/engine/input/table-input-tracker.test.ts`**

Update the deps mock to the new shape. Replace `getScene`/`getPlacedZones` with `getZones`/`getCards`/`registry`. Minimal harness:

```ts
import { RuleRegistry } from '../core/rules';
// ...in the deps object used by the test:
//   getZones: () => [{ id: 'hand', layout: 'row', transform: { x: 0, y: 0 } }],
//   getCards: () => cards,            // the same CardState[] the test drives
//   registry: new RuleRegistry(),
// (remove getScene and getPlacedZones)
```

Adjust any assertion that expected the old faked-zone drop to match `resolveDrop` semantics (auto-bounds; a zone with no `accept` accepts anything). If a test asserted a specific `toZoneId` from a drop point, verify the point falls within the auto-bounds of the `getZones()` zone at the driven card count.

- [ ] **Step 11: Run the full suite + typecheck**

Run: `bun run test && bun run typecheck`
Expected: PASS (all tests); typecheck clean.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: serializable drop pipeline (resolveDrop + registry) end to end

Replace ZoneState.accepts/faked bounds with ZoneDef + placeZone + canAccept.
App now takes TableDef+Placement and derives the render Scene; PlacedZone.accepts
and zoneAtPoint are removed.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Migrate the demo to `TableDef` + `Placement`

**Files:**
- Modify: `src/pages/table-demo/deck.ts`
- Modify: `src/pages/table-demo/table-demo-page.tsx`
- Test: `src/pages/table-demo/table-demo.test.ts`

**Interfaces:**
- Consumes: `TableDef`, `Placement`, `validateTableDef` (`@/engine/core/table-def`); `RuleRegistry`/`registerStarterRules`; `standardDeck`.
- Produces: a demo `TABLE: TableDef` and a `standardDeck()` that populates `data.rank`/`data.suit`, validated green against the starter registry.

- [ ] **Step 1: Update `src/pages/table-demo/deck.ts` to carry rank/suit**

```ts
import type { CardState } from '@/engine/core/scene';

const SUITS = ['S', 'H', 'D', 'C'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'] as const;

export function standardDeck(): CardState[] {
  const cards: CardState[] = [];
  for (const s of SUITS) {
    RANKS.forEach((r, i) => {
      cards.push({ id: `${r}${s}`, zoneId: 'deck', faceUp: false, faceKey: `${r}${s}`, data: { suit: s, rank: i + 1 } });
    });
  }
  return cards;
}
```

- [ ] **Step 2: Write the failing test `src/pages/table-demo/table-demo.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import { validateTableDef } from '@/engine/core/table-def';
import { TABLE } from './table-demo-page';
import { standardDeck } from './deck';

describe('demo table', () => {
  it('validates against the starter registry', () => {
    const reg = registerStarterRules(new RuleRegistry());
    expect(validateTableDef(TABLE, reg)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('deals a full 52-card deck into the deck zone', () => {
    const deck = standardDeck();
    expect(deck).toHaveLength(52);
    expect(deck.every((c) => c.zoneId === 'deck' && typeof c.data?.rank === 'number')).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bunx vitest run src/pages/table-demo/table-demo.test.ts`
Expected: FAIL — `TABLE` is not exported from `./table-demo-page`.

- [ ] **Step 4: Rewrite `src/pages/table-demo/table-demo-page.tsx`**

```tsx
import { useMemo, useRef, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import type { Placement, TableDef } from '@/engine/core/table-def';
import { CardTable, type CardTableHandle } from '@/engine/react';
import type { DropIntent } from '@/engine/input/table-input-context';
import { initApp } from '@/utils/init-app';
import { standardDeck } from './deck';

export const TABLE: TableDef = {
  players: ['me'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 }, visibility: 'secret' },
    { id: 'hand', layout: 'fan', transform: { x: 0, y: 300 }, layoutOptions: { fanAngleDeg: 24 }, owner: 'me', visibility: 'owner', ordering: 'free' },
    { id: 'discard', layout: 'pile', transform: { x: 400, y: 0 }, visibility: 'public' },
  ],
};

function DemoContent() {
  const handleRef = useRef<CardTableHandle>(null);
  const [cards, setCards] = useState(standardDeck());
  const placement: Placement = { cards };

  const onDrop = (i: DropIntent) => {
    if (!i.toZoneId) return; // rejected → snaps back automatically
    setCards((cs) => cs.map((c) => (c.id === i.cardId ? { ...c, zoneId: i.toZoneId!, faceUp: i.toZoneId === 'hand' } : c)));
  };

  const onCardClick = (id: string) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, faceUp: !c.faceUp } : c)));
  };

  const deal5 = () => {
    setCards((cs) => {
      let dealt = 0;
      return cs.map((c) => (c.zoneId === 'deck' && dealt < 5 ? (dealt++, { ...c, zoneId: 'hand', faceUp: true }) : c));
    });
  };

  return (
    <>
      <CardTable ref={handleRef} tableDef={TABLE} placement={placement} onDrop={onDrop} onCardClick={onCardClick} />
      {/* The integration's OverlayContainer sets pointer-events:none so pointers reach
          the canvas; interactive HTML overlay UI must re-enable it on itself. */}
      <button
        style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, pointerEvents: 'auto' }}
        onClick={deal5}
      >
        Deal 5
      </button>
    </>
  );
}

export function TableDemoPage() {
  const option = useMemo(() => ({ fullScreen: true, limitEntireViewPort: false }), []);
  return <Wrapper option={option} initFunction={initApp}><DemoContent /></Wrapper>;
}
```

- [ ] **Step 5: Run the test, full suite, and typecheck**

Run: `bunx vitest run src/pages/table-demo/table-demo.test.ts && bun run test && bun run typecheck`
Expected: PASS (2 new tests + whole suite); typecheck clean.

- [ ] **Step 6: Verify the demo runs in the browser**

Run: `bun run dev`, open the served URL, and confirm: cards render in the deck/hand/discard zones; "Deal 5" moves five cards to the hand; dragging a card to the hand or discard drops it there; dragging to empty space snaps it back; clicking a card flips it. Use the `verify` skill / `run` skill if available to drive and screenshot the app.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(demo): author the table as a validated TableDef + Placement

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** TableDef/Placement split (T1), ZoneDef fields + revealTo (T1), visibility fields carried (T1, enforcement deferred to SP3 per spec), geometry/anchor/auto-bounds/empty-fallback/slotAtPoint/rotation-AABB (T4), RuleRegistry/canAccept/unknown-throw (T2), starter library (T3), validateTableDef (T5), deriveScene identity (T6), zoneAtPoint→resolveDrop rewire + PlacedZone.accepts removal + init-app faked-bounds removal (T7–T8), demo migration + round-trip validation (T9). Serialization round-trip is exercised in T1 and T9.
- **Out of scope (unchanged):** move mutation/turn engine/seeded shuffle (SP2), real projection hiding (SP3), networking (SP4), OBB hit-testing, full per-viewer visibility matrix, data-DSL rules.
- **Type consistency:** `AcceptRule` arg shape is identical in T2/T3/T7. `resolveDrop`'s `zoneCardsOf` matches the tracker's `zoneCardsOf` closure in T8. `placeZone`/`slotAtPoint` signatures match their T4 definitions where consumed in T7.
