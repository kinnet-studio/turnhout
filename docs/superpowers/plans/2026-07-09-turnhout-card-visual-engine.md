# turnhout Card Visual Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `turnhout` — a rendering-and-interaction-only card/board visual engine on the ue-too PixiJS + React integration, driven by a declarative scene state.

**Architecture:** A pure, framework-free `core/` (scene types, layout math, diff, hit-testing, tween, choreography, and a `TableModel` reconciler) with three thin adapter layers on top: `pixi/` (a `PixiTable extends Container` view + card sprites + face-texture cache), `input/` (an azabu-style custom KMT stack — Pixi event federation is destroyed), and `react/` (a `<CardTable>` bridge). Game rules live in the consuming app; the engine emits interaction *intents* and never mutates consumer state.

**Tech Stack:** TypeScript, Vite, React 19, bun, vitest + happy-dom, PixiJS 8.14.0, `@ue-too/*` (board, board-pixi-integration, board-pixi-react-integration, being, math).

## Global Constraints

- Standalone repo at `/Users/vincent.yy.chang/dev/turnhout/main`; consume `@ue-too/*` from npm (do **not** add the ue-too monorepo as a workspace).
- Dependency versions (exact/pinned): `@ue-too/being` `0.17.6`, `@ue-too/board` `0.17.6`, `@ue-too/board-pixi-integration` `0.17.6`, `@ue-too/board-pixi-react-integration` `0.17.6`, `@ue-too/math` `0.17.6`, `pixi.js` `8.14.0` (exact — peer dep), `react`/`react-dom` `19.2.x`.
- Package manager: **bun**. Test runner: **vitest**. Commit messages: conventional commits; end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- `core/` MUST NOT import from `pixi.js`, `react`, `@ue-too/*`, or touch the DOM. Enforced by keeping those imports out of `src/engine/core/**`.
- No `Math.random()` / `Date.now()` in `core/` — determinism for tests (use id-hash for jitter, injected clocks for time).
- Card world dimensions constant: `CARD_WIDTH = 100`, `CARD_HEIGHT = 140` (world units).
- Interaction contract: the engine emits intents (`onDrop`, `onCardClick`, `onHover`) and NEVER mutates the consumer's scene. Flip is declarative via `CardState.faceUp`.
- git identity for this repo (already set locally): `niuee <vntchang@gmail.com>`.

---

## Shared type reference (defined in Task 2, `src/engine/core/scene.ts`)

Every later task imports these. Reproduced here so tasks read out of order stay consistent.

```ts
export const CARD_WIDTH = 100;
export const CARD_HEIGHT = 140;

export type LayoutKind = 'pile' | 'fan' | 'row' | 'grid' | 'free';
export interface Vec2 { x: number; y: number; }

export interface CardState {
  id: string;
  zoneId: string;
  faceUp: boolean;
  faceKey: string;
  slot?: number;
  draggable?: boolean;
  data?: { x?: number; y?: number; [k: string]: unknown };
}

export interface LayoutOptions {
  spacing?: number;
  fanAngleDeg?: number;
  fanRadius?: number;
  cols?: number;
  rowSpacing?: number;
  jitter?: number; // radians of max rotation jitter; 0 = none (default)
}

export interface ZoneState {
  id: string;
  layout: LayoutKind;
  transform: { x: number; y: number; rotation?: number };
  layoutOptions?: LayoutOptions;
  accepts?: (card: CardState) => boolean;
}

export interface Scene { cards: CardState[]; zones: ZoneState[]; }

/** Resting/animated pose of a card in world space. */
export interface TargetTransform { x: number; y: number; rotation: number; scale: number; z: number; }

/** A card placed in world space (for hit-testing). */
export interface PlacedCard { id: string; transform: TargetTransform; draggable: boolean; }

/** A zone placed in world space (for drop hit-testing). */
export interface PlacedZone { id: string; x: number; y: number; width: number; height: number; accepts?: (card: CardState) => boolean; }
```

---

## Task 1: Repo scaffold + toolchain

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/engine/core/smoke.test.ts`, `.gitignore`

**Interfaces:**
- Produces: a working `bun test` and `bun dev`; the `src/engine/` tree root.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "turnhout",
  "private": true,
  "type": "module",
  "version": "0.1.0",
  "packageManager": "bun@1.3.13",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@ue-too/being": "0.17.6",
    "@ue-too/board": "0.17.6",
    "@ue-too/board-pixi-integration": "0.17.6",
    "@ue-too/board-pixi-react-integration": "0.17.6",
    "@ue-too/math": "0.17.6",
    "pixi.js": "8.14.0",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  },
  "devDependencies": {
    "@testing-library/react": "16.3.0",
    "@types/react": "19.2.0",
    "@types/react-dom": "19.2.0",
    "@vitejs/plugin-react": "5.2.0",
    "happy-dom": "20.9.0",
    "typescript": "5.9.3",
    "vite": "6.4.3",
    "vitest": "4.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
```

- [ ] **Step 5: Create `index.html` and `src/main.tsx`**

`index.html`:
```html
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>turnhout</title></head>
  <body style="margin:0"><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode><div>turnhout — engine boot placeholder</div></StrictMode>,
);
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules
dist
*.log
```

- [ ] **Step 7: Create a smoke test `src/engine/core/smoke.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 8: Install and verify**

Run: `cd /Users/vincent.yy.chang/dev/turnhout/main && bun install && bun test`
Expected: install succeeds; vitest reports `1 passed`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold turnhout (vite + react 19 + vitest + ue-too deps)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `core/scene` — shared types + validation

**Files:**
- Create: `src/engine/core/scene.ts`
- Test: `src/engine/core/scene.test.ts`

**Interfaces:**
- Produces: all types in the "Shared type reference" above, plus:
  - `validateScene(scene: Scene): { ok: boolean; errors: string[]; warnings: string[] }`
  - `cardsByZone(scene: Scene): Map<string, CardState[]>` — cards grouped by `zoneId`, each group sorted by `slot ?? originalIndex` ascending, stable.

- [ ] **Step 1: Write the failing test `src/engine/core/scene.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { cardsByZone, validateScene, type Scene } from './scene';

const scene = (cards: Scene['cards'], zones: Scene['zones']): Scene => ({ cards, zones });

describe('validateScene', () => {
  it('accepts a valid scene', () => {
    const s = scene(
      [{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }],
      [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }],
    );
    expect(validateScene(s)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('reports duplicate card ids as errors', () => {
    const s = scene(
      [
        { id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' },
        { id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' },
      ],
      [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }],
    );
    const r = validateScene(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('duplicate card id: a');
  });

  it('warns on unknown zoneId', () => {
    const s = scene(
      [{ id: 'a', zoneId: 'ghost', faceUp: false, faceKey: 'back' }],
      [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }],
    );
    const r = validateScene(s);
    expect(r.ok).toBe(true);
    expect(r.warnings).toContain('card a references unknown zone: ghost');
  });
});

describe('cardsByZone', () => {
  it('groups and sorts by slot then original order', () => {
    const s = scene(
      [
        { id: 'a', zoneId: 'h', faceUp: true, faceKey: 'a', slot: 2 },
        { id: 'b', zoneId: 'h', faceUp: true, faceKey: 'b', slot: 0 },
        { id: 'c', zoneId: 'h', faceUp: true, faceKey: 'c' },
      ],
      [{ id: 'h', layout: 'row', transform: { x: 0, y: 0 } }],
    );
    expect(cardsByZone(s).get('h')!.map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/core/scene.test.ts`
Expected: FAIL — cannot find module `./scene`.

- [ ] **Step 3: Write `src/engine/core/scene.ts`**

Include every type from "Shared type reference" above, then:

```ts
export function validateScene(scene: Scene): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const zoneIds = new Set(scene.zones.map((z) => z.id));
  for (const c of scene.cards) {
    if (seen.has(c.id)) errors.push(`duplicate card id: ${c.id}`);
    seen.add(c.id);
    if (!zoneIds.has(c.zoneId)) warnings.push(`card ${c.id} references unknown zone: ${c.zoneId}`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function cardsByZone(scene: Scene): Map<string, CardState[]> {
  const groups = new Map<string, { card: CardState; index: number }[]>();
  scene.cards.forEach((card, index) => {
    const list = groups.get(card.zoneId) ?? [];
    list.push({ card, index });
    groups.set(card.zoneId, list);
  });
  const out = new Map<string, CardState[]>();
  for (const [zoneId, list] of groups) {
    list.sort((a, b) => {
      const sa = a.card.slot ?? a.index;
      const sb = b.card.slot ?? b.index;
      return sa - sb || a.index - b.index;
    });
    out.set(zoneId, list.map((e) => e.card));
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/engine/core/scene.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/scene.ts src/engine/core/scene.test.ts
git commit -m "feat(core): scene types, validateScene, cardsByZone

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `core/layout` — placement strategies

**Files:**
- Create: `src/engine/core/layout.ts`
- Test: `src/engine/core/layout.test.ts`

**Interfaces:**
- Consumes: `ZoneState`, `CardState`, `TargetTransform`, `CARD_WIDTH` from `./scene`.
- Produces: `computeZoneLayout(zone: ZoneState, cards: CardState[], zBase?: number): Map<string, TargetTransform>` — cards are the already-ordered members of `zone`; returns each card id → resting `TargetTransform`. `zBase` defaults to `0`; card i gets `z = zBase + i`.

- [ ] **Step 1: Write the failing test `src/engine/core/layout.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { computeZoneLayout } from './layout';
import type { CardState, ZoneState } from './scene';

const card = (id: string, extra: Partial<CardState> = {}): CardState => ({
  id, zoneId: 'z', faceUp: true, faceKey: id, ...extra,
});

describe('computeZoneLayout', () => {
  it('pile stacks at the anchor with a small per-card y offset and increasing z', () => {
    const zone: ZoneState = { id: 'z', layout: 'pile', transform: { x: 10, y: 20 } };
    const m = computeZoneLayout(zone, [card('a'), card('b')], 100);
    expect(m.get('a')).toEqual({ x: 10, y: 20, rotation: 0, scale: 1, z: 100 });
    expect(m.get('b')).toEqual({ x: 10, y: 20.4, rotation: 0, scale: 1, z: 101 });
  });

  it('row centers cards horizontally with default spacing 110', () => {
    const zone: ZoneState = { id: 'z', layout: 'row', transform: { x: 0, y: 0 } };
    const m = computeZoneLayout(zone, [card('a'), card('b')]);
    expect(m.get('a')!.x).toBeCloseTo(-55);
    expect(m.get('b')!.x).toBeCloseTo(55);
    expect(m.get('a')!.y).toBe(0);
  });

  it('grid lays out by columns', () => {
    const zone: ZoneState = { id: 'z', layout: 'grid', transform: { x: 0, y: 0 }, layoutOptions: { cols: 2 } };
    const m = computeZoneLayout(zone, [card('a'), card('b'), card('c')]);
    expect(m.get('a')).toMatchObject({ x: 0, y: 0 });
    expect(m.get('b')).toMatchObject({ x: 110, y: 0 });
    expect(m.get('c')).toMatchObject({ x: 0, y: 150 });
  });

  it('fan: single card sits at the anchor with no rotation', () => {
    const zone: ZoneState = { id: 'z', layout: 'fan', transform: { x: 5, y: 5 } };
    const m = computeZoneLayout(zone, [card('a')]);
    expect(m.get('a')!.x).toBeCloseTo(5);
    expect(m.get('a')!.y).toBeCloseTo(5);
    expect(m.get('a')!.rotation).toBeCloseTo(0);
  });

  it('fan: symmetric outer cards mirror each other', () => {
    const zone: ZoneState = { id: 'z', layout: 'fan', transform: { x: 0, y: 0 }, layoutOptions: { fanAngleDeg: 30 } };
    const m = computeZoneLayout(zone, [card('a'), card('b'), card('c')]);
    expect(m.get('b')!.rotation).toBeCloseTo(0);
    expect(m.get('a')!.rotation).toBeCloseTo(-m.get('c')!.rotation);
    expect(m.get('a')!.x).toBeCloseTo(-m.get('c')!.x);
  });

  it('free: reads x/y from card.data, falling back to the anchor', () => {
    const zone: ZoneState = { id: 'z', layout: 'free', transform: { x: 1, y: 2 } };
    const m = computeZoneLayout(zone, [card('a', { data: { x: 40, y: 50 } }), card('b')]);
    expect(m.get('a')).toMatchObject({ x: 40, y: 50 });
    expect(m.get('b')).toMatchObject({ x: 1, y: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/core/layout.test.ts`
Expected: FAIL — cannot find module `./layout`.

- [ ] **Step 3: Write `src/engine/core/layout.ts`**

```ts
import { CARD_WIDTH, type CardState, type TargetTransform, type ZoneState } from './scene';

const PILE_DY = 0.4;
const DEFAULT_ROW_SPACING = CARD_WIDTH * 1.1; // 110
const DEFAULT_GRID_ROW = 150;
const DEFAULT_FAN_ANGLE = 30;
const DEFAULT_FAN_RADIUS = 600;

/** Deterministic pseudo-jitter in [-1, 1] from a card id (no Math.random). */
function idJitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h % 1000) / 1000) * 2 - 1;
}

export function computeZoneLayout(
  zone: ZoneState,
  cards: CardState[],
  zBase = 0,
): Map<string, TargetTransform> {
  const out = new Map<string, TargetTransform>();
  const { x: zx, y: zy, rotation: zr = 0 } = zone.transform;
  const opts = zone.layoutOptions ?? {};
  const n = cards.length;

  cards.forEach((card, i) => {
    const z = zBase + i;
    let t: TargetTransform;
    switch (zone.layout) {
      case 'pile': {
        const jitter = (opts.jitter ?? 0) * idJitter(card.id);
        t = { x: zx, y: zy + i * PILE_DY, rotation: zr + jitter, scale: 1, z };
        break;
      }
      case 'row': {
        const spacing = opts.spacing ?? DEFAULT_ROW_SPACING;
        t = { x: zx + (i - (n - 1) / 2) * spacing, y: zy, rotation: zr, scale: 1, z };
        break;
      }
      case 'grid': {
        const cols = opts.cols ?? 4;
        const sx = opts.spacing ?? DEFAULT_ROW_SPACING;
        const sy = opts.rowSpacing ?? DEFAULT_GRID_ROW;
        t = { x: zx + (i % cols) * sx, y: zy + Math.floor(i / cols) * sy, rotation: zr, scale: 1, z };
        break;
      }
      case 'fan': {
        const total = ((opts.fanAngleDeg ?? DEFAULT_FAN_ANGLE) * Math.PI) / 180;
        const radius = opts.fanRadius ?? DEFAULT_FAN_RADIUS;
        const step = n > 1 ? total / (n - 1) : 0;
        const angle = n > 1 ? -total / 2 + i * step : 0;
        t = {
          x: zx + radius * Math.sin(angle),
          y: zy - radius * Math.cos(angle) + radius,
          rotation: zr + angle,
          scale: 1,
          z,
        };
        break;
      }
      case 'free': {
        t = { x: card.data?.x ?? zx, y: card.data?.y ?? zy, rotation: zr, scale: 1, z };
        break;
      }
    }
    out.set(card.id, t);
  });
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/engine/core/layout.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/layout.ts src/engine/core/layout.test.ts
git commit -m "feat(core): zone layout strategies (pile/row/grid/fan/free)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `core/diff` — scene reconciliation ops

**Files:**
- Create: `src/engine/core/diff.ts`
- Test: `src/engine/core/diff.test.ts`

**Interfaces:**
- Consumes: `Scene`, `CardState` from `./scene`.
- Produces:
  ```ts
  export type DiffOp =
    | { type: 'remove'; id: string }
    | { type: 'add'; card: CardState }
    | { type: 'move'; id: string; fromZoneId: string; toZoneId: string }
    | { type: 'flip'; id: string; faceUp: boolean }
    | { type: 'reface'; id: string; faceKey: string }
    | { type: 'update'; id: string };
  export function reconcile(prev: Scene | null, next: Scene): DiffOp[];
  ```
- Ordering guarantee: `remove` ops first (sorted by id), then `add` ops (sorted by id), then per-id modification ops sorted by id; for a single id the modification order is `move`, `flip`, `reface`, `update`.

- [ ] **Step 1: Write the failing test `src/engine/core/diff.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { reconcile } from './diff';
import type { CardState, Scene } from './scene';

const c = (id: string, e: Partial<CardState> = {}): CardState => ({
  id, zoneId: 'deck', faceUp: false, faceKey: 'back', ...e,
});
const s = (cards: CardState[]): Scene => ({ cards, zones: [] });

describe('reconcile', () => {
  it('adds every card when prev is null', () => {
    expect(reconcile(null, s([c('a')]))).toEqual([{ type: 'add', card: c('a') }]);
  });

  it('removes cards absent from next', () => {
    expect(reconcile(s([c('a')]), s([]))).toEqual([{ type: 'remove', id: 'a' }]);
  });

  it('emits a move when zoneId changes', () => {
    const ops = reconcile(s([c('a', { zoneId: 'deck' })]), s([c('a', { zoneId: 'hand' })]));
    expect(ops).toEqual([{ type: 'move', id: 'a', fromZoneId: 'deck', toZoneId: 'hand' }]);
  });

  it('emits a flip when faceUp changes', () => {
    const ops = reconcile(s([c('a', { faceUp: false })]), s([c('a', { faceUp: true })]));
    expect(ops).toEqual([{ type: 'flip', id: 'a', faceUp: true }]);
  });

  it('emits reface when faceKey changes without a flip', () => {
    const ops = reconcile(s([c('a', { faceKey: 'x' })]), s([c('a', { faceKey: 'y' })]));
    expect(ops).toEqual([{ type: 'reface', id: 'a', faceKey: 'y' }]);
  });

  it('orders removes, then adds, then modifications', () => {
    const prev = s([c('gone'), c('mover', { zoneId: 'deck' })]);
    const next = s([c('mover', { zoneId: 'hand' }), c('fresh')]);
    expect(reconcile(prev, next)).toEqual([
      { type: 'remove', id: 'gone' },
      { type: 'add', card: c('fresh') },
      { type: 'move', id: 'mover', fromZoneId: 'deck', toZoneId: 'hand' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/core/diff.test.ts`
Expected: FAIL — cannot find module `./diff`.

- [ ] **Step 3: Write `src/engine/core/diff.ts`**

```ts
import type { CardState, Scene } from './scene';

export type DiffOp =
  | { type: 'remove'; id: string }
  | { type: 'add'; card: CardState }
  | { type: 'move'; id: string; fromZoneId: string; toZoneId: string }
  | { type: 'flip'; id: string; faceUp: boolean }
  | { type: 'reface'; id: string; faceKey: string }
  | { type: 'update'; id: string };

export function reconcile(prev: Scene | null, next: Scene): DiffOp[] {
  const prevMap = new Map((prev?.cards ?? []).map((c) => [c.id, c]));
  const nextMap = new Map(next.cards.map((c) => [c.id, c]));

  const removes: DiffOp[] = [];
  const adds: DiffOp[] = [];
  const mods: DiffOp[] = [];

  for (const id of [...prevMap.keys()].sort()) {
    if (!nextMap.has(id)) removes.push({ type: 'remove', id });
  }
  for (const id of [...nextMap.keys()].sort()) {
    const nc = nextMap.get(id)!;
    const pc = prevMap.get(id);
    if (!pc) {
      adds.push({ type: 'add', card: nc });
      continue;
    }
    if (pc.zoneId !== nc.zoneId) mods.push({ type: 'move', id, fromZoneId: pc.zoneId, toZoneId: nc.zoneId });
    if (pc.faceUp !== nc.faceUp) mods.push({ type: 'flip', id, faceUp: nc.faceUp });
    else if (pc.faceKey !== nc.faceKey) mods.push({ type: 'reface', id, faceKey: nc.faceKey });
    if (pc.slot !== nc.slot || pc.draggable !== nc.draggable) mods.push({ type: 'update', id });
  }
  return [...removes, ...adds, ...mods];
}
```

Note: a `flip` implies the face texture will change; we suppress a separate `reface` when a flip is present (the flip animation swaps the texture at its midpoint).

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/engine/core/diff.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/diff.ts src/engine/core/diff.test.ts
git commit -m "feat(core): scene reconcile diff (add/remove/move/flip/reface/update)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `core/hittest` — card & zone picking

**Files:**
- Create: `src/engine/core/hittest.ts`
- Test: `src/engine/core/hittest.test.ts`

**Interfaces:**
- Consumes: `Vec2`, `PlacedCard`, `PlacedZone`, `CardState`, `CARD_WIDTH`, `CARD_HEIGHT` from `./scene`.
- Produces:
  - `cardAtPoint(pt: Vec2, cards: PlacedCard[], opts?: { draggableOnly?: boolean }): string | null` — topmost (highest `z`) card whose axis-aligned box (centered at its transform, size `scale*CARD_WIDTH` × `scale*CARD_HEIGHT`; rotation ignored in v1) contains `pt`. `draggableOnly` filters to `draggable` cards.
  - `zoneAtPoint(pt: Vec2, zones: PlacedZone[], card?: CardState): { zoneId: string; slot: number } | null` — last zone in array order whose box contains `pt` and (if `card` given and `accepts` defined) accepts it. `slot` is `0` in v1.

- [ ] **Step 1: Write the failing test `src/engine/core/hittest.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { cardAtPoint, zoneAtPoint } from './hittest';
import type { PlacedCard, PlacedZone } from './scene';

const pc = (id: string, x: number, y: number, z: number, draggable = true): PlacedCard => ({
  id, draggable, transform: { x, y, rotation: 0, scale: 1, z },
});

describe('cardAtPoint', () => {
  it('returns the topmost card under the point', () => {
    const cards = [pc('low', 0, 0, 0), pc('high', 0, 0, 5)];
    expect(cardAtPoint({ x: 10, y: 10 }, cards)).toBe('high');
  });

  it('returns null when the point is outside every card', () => {
    expect(cardAtPoint({ x: 999, y: 999 }, [pc('a', 0, 0, 0)])).toBeNull();
  });

  it('skips non-draggable cards when draggableOnly is set', () => {
    expect(cardAtPoint({ x: 0, y: 0 }, [pc('a', 0, 0, 0, false)], { draggableOnly: true })).toBeNull();
  });
});

describe('zoneAtPoint', () => {
  const zones: PlacedZone[] = [
    { id: 'table', x: 0, y: 0, width: 1000, height: 1000 },
    { id: 'discard', x: 100, y: 100, width: 120, height: 160 },
  ];

  it('returns the last (topmost) matching zone', () => {
    expect(zoneAtPoint({ x: 100, y: 100 }, zones)).toEqual({ zoneId: 'discard', slot: 0 });
  });

  it('returns null outside all zones', () => {
    expect(zoneAtPoint({ x: 5000, y: 5000 }, zones)).toBeNull();
  });

  it('respects a zone accepts predicate', () => {
    const guarded: PlacedZone[] = [{ id: 'foundation', x: 0, y: 0, width: 200, height: 200, accepts: () => false }];
    const card = { id: 'a', zoneId: 'x', faceUp: true, faceKey: 'a' };
    expect(zoneAtPoint({ x: 10, y: 10 }, guarded, card)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/core/hittest.test.ts`
Expected: FAIL — cannot find module `./hittest`.

- [ ] **Step 3: Write `src/engine/core/hittest.ts`**

```ts
import { CARD_HEIGHT, CARD_WIDTH, type CardState, type PlacedCard, type PlacedZone, type Vec2 } from './scene';

function inBox(pt: Vec2, cx: number, cy: number, w: number, h: number): boolean {
  return pt.x >= cx - w / 2 && pt.x <= cx + w / 2 && pt.y >= cy - h / 2 && pt.y <= cy + h / 2;
}

export function cardAtPoint(
  pt: Vec2,
  cards: PlacedCard[],
  opts: { draggableOnly?: boolean } = {},
): string | null {
  let best: PlacedCard | null = null;
  for (const c of cards) {
    if (opts.draggableOnly && !c.draggable) continue;
    const w = CARD_WIDTH * c.transform.scale;
    const h = CARD_HEIGHT * c.transform.scale;
    if (inBox(pt, c.transform.x, c.transform.y, w, h)) {
      if (best === null || c.transform.z > best.transform.z) best = c;
    }
  }
  return best?.id ?? null;
}

export function zoneAtPoint(
  pt: Vec2,
  zones: PlacedZone[],
  card?: CardState,
): { zoneId: string; slot: number } | null {
  for (let i = zones.length - 1; i >= 0; i--) {
    const z = zones[i];
    if (!inBox(pt, z.x, z.y, z.width, z.height)) continue;
    if (card && z.accepts && !z.accepts(card)) continue;
    return { zoneId: z.id, slot: 0 };
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/engine/core/hittest.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/hittest.ts src/engine/core/hittest.test.ts
git commit -m "feat(core): card + zone hit-testing

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `core/tween` — motion & flip math

**Files:**
- Create: `src/engine/core/tween.ts`
- Test: `src/engine/core/tween.test.ts`

**Interfaces:**
- Consumes: `TargetTransform` from `./scene`.
- Produces:
  - `stepToward(current: TargetTransform, target: TargetTransform, dtSeconds: number, tau?: number): TargetTransform` — exponential smoothing per field; `tau` default `0.08`.
  - `flipScaleX(progress: number): number` — `|cos(progress*π)|`.
  - `advanceFlip(progress: number, dtSeconds: number, durationSeconds: number): number` — `min(1, progress + dt/duration)`.
  - `resolveFlipVisual(progress: number, faceUp: boolean): { scaleX: number; showFaceUp: boolean }` — during a flip, the displayed side is the *destination* side once `progress >= 0.5`, else the origin side.

- [ ] **Step 1: Write the failing test `src/engine/core/tween.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { advanceFlip, flipScaleX, resolveFlipVisual, stepToward } from './tween';
import type { TargetTransform } from './scene';

const t = (x: number): TargetTransform => ({ x, y: 0, rotation: 0, scale: 1, z: 0 });

describe('stepToward', () => {
  it('does not move with dt=0', () => {
    expect(stepToward(t(0), t(10), 0).x).toBe(0);
  });
  it('moves toward the target and overshoots never', () => {
    const r = stepToward(t(0), t(10), 0.016);
    expect(r.x).toBeGreaterThan(0);
    expect(r.x).toBeLessThan(10);
  });
  it('is effectively at target after a long step', () => {
    expect(stepToward(t(0), t(10), 10).x).toBeCloseTo(10, 3);
  });
});

describe('flip math', () => {
  it('flipScaleX is 1 at 0, 0 at midpoint, 1 at 1', () => {
    expect(flipScaleX(0)).toBeCloseTo(1);
    expect(flipScaleX(0.5)).toBeCloseTo(0);
    expect(flipScaleX(1)).toBeCloseTo(1);
  });
  it('advanceFlip clamps to 1', () => {
    expect(advanceFlip(0.9, 1, 0.3)).toBe(1);
  });
  it('resolveFlipVisual swaps side at the midpoint', () => {
    expect(resolveFlipVisual(0.4, true).showFaceUp).toBe(false);
    expect(resolveFlipVisual(0.6, true).showFaceUp).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/core/tween.test.ts`
Expected: FAIL — cannot find module `./tween`.

- [ ] **Step 3: Write `src/engine/core/tween.ts`**

```ts
import type { TargetTransform } from './scene';

export function stepToward(
  current: TargetTransform,
  target: TargetTransform,
  dtSeconds: number,
  tau = 0.08,
): TargetTransform {
  if (dtSeconds <= 0) return { ...current };
  const a = 1 - Math.exp(-dtSeconds / tau);
  const lerp = (c: number, t: number) => c + (t - c) * a;
  return {
    x: lerp(current.x, target.x),
    y: lerp(current.y, target.y),
    rotation: lerp(current.rotation, target.rotation),
    scale: lerp(current.scale, target.scale),
    z: target.z,
  };
}

export function flipScaleX(progress: number): number {
  return Math.abs(Math.cos(progress * Math.PI));
}

export function advanceFlip(progress: number, dtSeconds: number, durationSeconds: number): number {
  return Math.min(1, progress + dtSeconds / durationSeconds);
}

export function resolveFlipVisual(progress: number, faceUp: boolean): { scaleX: number; showFaceUp: boolean } {
  // Before the midpoint we still show the origin side (the opposite of the destination).
  const showFaceUp = progress >= 0.5 ? faceUp : !faceUp;
  return { scaleX: flipScaleX(progress), showFaceUp };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/engine/core/tween.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/tween.ts src/engine/core/tween.test.ts
git commit -m "feat(core): tween smoothing + flip math

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `core/choreography` — deal & shuffle timing

**Files:**
- Create: `src/engine/core/choreography.ts`
- Test: `src/engine/core/choreography.test.ts`

**Interfaces:**
- Produces:
  - `planDeal(cardIds: string[], staggerMs: number): { releaseAtMs: Map<string, number>; totalMs: number }` — card i is released at `i*staggerMs`; `totalMs = (n-1)*staggerMs` (0 for empty).
  - `planShuffle(cardIds: string[], opts?: { amplitude?: number; cycles?: number }): Map<string, number[]>` — per id, a list of transient x-offset keyframes of length `2*cycles+1` starting and ending at `0`; `amplitude` default `30`, `cycles` default `2`.

- [ ] **Step 1: Write the failing test `src/engine/core/choreography.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { planDeal, planShuffle } from './choreography';

describe('planDeal', () => {
  it('staggers releases and reports total duration', () => {
    const r = planDeal(['a', 'b', 'c'], 100);
    expect(r.releaseAtMs.get('a')).toBe(0);
    expect(r.releaseAtMs.get('b')).toBe(100);
    expect(r.releaseAtMs.get('c')).toBe(200);
    expect(r.totalMs).toBe(200);
  });
  it('handles the empty case', () => {
    expect(planDeal([], 100)).toEqual({ releaseAtMs: new Map(), totalMs: 0 });
  });
});

describe('planShuffle', () => {
  it('produces symmetric keyframes that start and end at zero', () => {
    const m = planShuffle(['a'], { amplitude: 30, cycles: 2 });
    const frames = m.get('a')!;
    expect(frames).toHaveLength(5);
    expect(frames[0]).toBe(0);
    expect(frames[frames.length - 1]).toBe(0);
    expect(Math.max(...frames.map(Math.abs))).toBeLessThanOrEqual(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/core/choreography.test.ts`
Expected: FAIL — cannot find module `./choreography`.

- [ ] **Step 3: Write `src/engine/core/choreography.ts`**

```ts
export function planDeal(cardIds: string[], staggerMs: number): { releaseAtMs: Map<string, number>; totalMs: number } {
  const releaseAtMs = new Map<string, number>();
  cardIds.forEach((id, i) => releaseAtMs.set(id, i * staggerMs));
  return { releaseAtMs, totalMs: cardIds.length > 0 ? (cardIds.length - 1) * staggerMs : 0 };
}

export function planShuffle(
  cardIds: string[],
  opts: { amplitude?: number; cycles?: number } = {},
): Map<string, number[]> {
  const amplitude = opts.amplitude ?? 30;
  const cycles = opts.cycles ?? 2;
  const count = 2 * cycles + 1;
  const out = new Map<string, number[]>();
  cardIds.forEach((id, cardIndex) => {
    const dir = cardIndex % 2 === 0 ? 1 : -1;
    const frames: number[] = [];
    for (let k = 0; k < count; k++) {
      // sine envelope: 0 at both ends, peak in the middle
      frames.push(dir * amplitude * Math.sin((k / (count - 1)) * Math.PI) * (k % 2 === 0 ? 1 : -1));
    }
    frames[0] = 0;
    frames[count - 1] = 0;
    out.set(id, frames);
  });
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/engine/core/choreography.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/choreography.ts src/engine/core/choreography.test.ts
git commit -m "feat(core): deal + shuffle choreography timing

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `core/table-model` — the reconciler

**Files:**
- Create: `src/engine/core/table-model.ts`
- Test: `src/engine/core/table-model.test.ts`

**Interfaces:**
- Consumes: `cardsByZone` (scene), `computeZoneLayout` (layout), `stepToward`/`advanceFlip` (tween), `Scene`/`TargetTransform`/`PlacedCard` (scene).
- Produces:
  ```ts
  export interface CardRenderState {
    id: string;
    faceUp: boolean;          // destination side
    faceKey: string;          // destination faceKey
    draggable: boolean;
    current: TargetTransform;
    target: TargetTransform;
    ownedByDrag: boolean;
    flipProgress: number;     // 1 = settled (no flip in progress)
  }
  export class TableModel {
    setScene(scene: Scene): void;
    advance(dtSeconds: number): void;
    beginDrag(id: string): void;
    dragTo(id: string, world: Vec2): void;
    endDrag(id: string): void;
    getRenderStates(): CardRenderState[];
    getPlacedCards(): PlacedCard[];
  }
  ```
- Behavior: on `setScene`, cards are grouped by zone (`cardsByZone`), each zone laid out with `computeZoneLayout(zone, cards, zoneIndex*1000)`; new cards spawn with `current == target`; a `faceUp` change starts a flip (`flipProgress` reset to 0); cards `ownedByDrag` keep the drag target and skip layout. `advance` smooths `current`→`target` (skipping drag-owned cards' position but still resolving flips) and advances flips with a fixed `0.3s` duration.

- [ ] **Step 1: Write the failing test `src/engine/core/table-model.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { TableModel } from './table-model';
import type { Scene } from './scene';

const scene = (cards: Scene['cards'], zones: Scene['zones']): Scene => ({ cards, zones });
const deckAndHand: Scene['zones'] = [
  { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } },
  { id: 'hand', layout: 'row', transform: { x: 500, y: 400 } },
];

describe('TableModel', () => {
  it('spawns new cards already at their layout target', () => {
    const m = new TableModel();
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }], deckAndHand));
    const rs = m.getRenderStates()[0];
    expect(rs.current).toEqual(rs.target);
    expect(rs.current.x).toBe(0);
  });

  it('retargets a card when it moves zones and advances toward the new target', () => {
    const m = new TableModel();
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }], deckAndHand));
    m.setScene(scene([{ id: 'a', zoneId: 'hand', faceUp: false, faceKey: 'back' }], deckAndHand));
    const before = m.getRenderStates()[0].current.x;
    m.advance(0.1);
    const after = m.getRenderStates()[0].current.x;
    expect(m.getRenderStates()[0].target.x).toBe(500);
    expect(after).toBeGreaterThan(before);
  });

  it('starts a flip when faceUp changes', () => {
    const m = new TableModel();
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }], deckAndHand));
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: true, faceKey: 'AS' }], deckAndHand));
    expect(m.getRenderStates()[0].flipProgress).toBeLessThan(1);
    m.advance(1);
    expect(m.getRenderStates()[0].flipProgress).toBe(1);
  });

  it('drag ownership pins the card and exempts it from layout retargeting', () => {
    const m = new TableModel();
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }], deckAndHand));
    m.beginDrag('a');
    m.dragTo('a', { x: 123, y: 456 });
    m.setScene(scene([{ id: 'a', zoneId: 'hand', faceUp: false, faceKey: 'back' }], deckAndHand));
    m.advance(0.1);
    const rs = m.getRenderStates()[0];
    expect(rs.current.x).toBeCloseTo(123);
    expect(rs.current.y).toBeCloseTo(456);
    m.endDrag('a');
    m.advance(0.1);
    expect(m.getRenderStates()[0].current.x).toBeGreaterThan(123);
  });

  it('drops cards that disappear from the scene', () => {
    const m = new TableModel();
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }], deckAndHand));
    m.setScene(scene([], deckAndHand));
    expect(m.getRenderStates()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/core/table-model.test.ts`
Expected: FAIL — cannot find module `./table-model`.

- [ ] **Step 3: Write `src/engine/core/table-model.ts`**

```ts
import { computeZoneLayout } from './layout';
import { cardsByZone, type PlacedCard, type Scene, type TargetTransform, type Vec2 } from './scene';
import { advanceFlip, stepToward } from './tween';

const FLIP_DURATION_S = 0.3;

export interface CardRenderState {
  id: string;
  faceUp: boolean;
  faceKey: string;
  draggable: boolean;
  current: TargetTransform;
  target: TargetTransform;
  ownedByDrag: boolean;
  flipProgress: number;
}

export class TableModel {
  private states = new Map<string, CardRenderState>();

  setScene(scene: Scene): void {
    const grouped = cardsByZone(scene);
    const nextTargets = new Map<string, TargetTransform>();
    const nextCards = new Map(scene.cards.map((c) => [c.id, c]));

    scene.zones.forEach((zone, zoneIndex) => {
      const members = grouped.get(zone.id) ?? [];
      const layout = computeZoneLayout(zone, members, zoneIndex * 1000);
      for (const [id, t] of layout) nextTargets.set(id, t);
    });

    // Remove departed cards.
    for (const id of [...this.states.keys()]) {
      if (!nextCards.has(id)) this.states.delete(id);
    }

    // Add / update present cards.
    for (const card of scene.cards) {
      const target = nextTargets.get(card.id) ?? { x: 0, y: 0, rotation: 0, scale: 1, z: 0 };
      const existing = this.states.get(card.id);
      if (!existing) {
        this.states.set(card.id, {
          id: card.id,
          faceUp: card.faceUp,
          faceKey: card.faceKey,
          draggable: card.draggable ?? true,
          current: { ...target },
          target,
          ownedByDrag: false,
          flipProgress: 1,
        });
        continue;
      }
      if (existing.faceUp !== card.faceUp) existing.flipProgress = 0;
      existing.faceUp = card.faceUp;
      existing.faceKey = card.faceKey;
      existing.draggable = card.draggable ?? true;
      if (!existing.ownedByDrag) existing.target = target;
    }
  }

  advance(dtSeconds: number): void {
    for (const s of this.states.values()) {
      if (!s.ownedByDrag) s.current = stepToward(s.current, s.target, dtSeconds);
      if (s.flipProgress < 1) s.flipProgress = advanceFlip(s.flipProgress, dtSeconds, FLIP_DURATION_S);
    }
  }

  beginDrag(id: string): void {
    const s = this.states.get(id);
    if (s) s.ownedByDrag = true;
  }

  dragTo(id: string, world: Vec2): void {
    const s = this.states.get(id);
    if (!s || !s.ownedByDrag) return;
    s.current = { ...s.current, x: world.x, y: world.y, z: 100000 };
    s.target = s.current;
  }

  endDrag(id: string): void {
    const s = this.states.get(id);
    if (s) s.ownedByDrag = false;
  }

  getRenderStates(): CardRenderState[] {
    return [...this.states.values()];
  }

  getPlacedCards(): PlacedCard[] {
    return [...this.states.values()].map((s) => ({ id: s.id, transform: s.current, draggable: s.draggable }));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/engine/core/table-model.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the whole core suite**

Run: `bun test src/engine/core`
Expected: PASS (all core tests green).

- [ ] **Step 6: Commit**

```bash
git add src/engine/core/table-model.ts src/engine/core/table-model.test.ts
git commit -m "feat(core): TableModel reconciler (setScene/advance/drag)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `pixi/face-texture-cache` — memoized card faces

**Files:**
- Create: `src/engine/pixi/face-texture-cache.ts`
- Test: `src/engine/pixi/face-texture-cache.test.ts`

**Interfaces:**
- Consumes: `CardState` from `../core/scene`; `Texture`, `Graphics` types from `pixi.js`.
- Produces:
  ```ts
  export type FaceDraw = (g: Graphics) => void;
  export type FaceRenderer = (card: CardState) => Texture | FaceDraw;
  export class FaceTextureCache {
    constructor(renderer: FaceRenderer, drawToTexture: (draw: FaceDraw) => Texture);
    get(card: CardState): Texture;   // memoized by card.faceKey
    clear(): void;
  }
  ```
- The `drawToTexture` seam lets tests avoid a real GPU; production supplies a real Pixi renderer-backed implementation (wired in Task 14).

- [ ] **Step 1: Write the failing test `src/engine/pixi/face-texture-cache.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { FaceTextureCache } from './face-texture-cache';
import type { CardState } from '../core/scene';

const card = (faceKey: string): CardState => ({ id: 'x', zoneId: 'z', faceUp: true, faceKey });

describe('FaceTextureCache', () => {
  it('renders once per faceKey and memoizes', () => {
    const fakeTexture = { id: 'tex' } as never;
    const renderer = vi.fn(() => fakeTexture);
    const drawToTexture = vi.fn();
    const cache = new FaceTextureCache(renderer, drawToTexture);

    expect(cache.get(card('AS'))).toBe(fakeTexture);
    expect(cache.get(card('AS'))).toBe(fakeTexture);
    expect(renderer).toHaveBeenCalledTimes(1);
  });

  it('routes a draw callback through drawToTexture', () => {
    const drawn = { id: 'drawn' } as never;
    const draw = () => {};
    const cache = new FaceTextureCache(() => draw, () => drawn);
    expect(cache.get(card('back'))).toBe(drawn);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/pixi/face-texture-cache.test.ts`
Expected: FAIL — cannot find module `./face-texture-cache`.

- [ ] **Step 3: Write `src/engine/pixi/face-texture-cache.ts`**

```ts
import type { Graphics, Texture } from 'pixi.js';
import type { CardState } from '../core/scene';

export type FaceDraw = (g: Graphics) => void;
export type FaceRenderer = (card: CardState) => Texture | FaceDraw;

export class FaceTextureCache {
  private cache = new Map<string, Texture>();

  constructor(
    private renderer: FaceRenderer,
    private drawToTexture: (draw: FaceDraw) => Texture,
  ) {}

  get(card: CardState): Texture {
    const existing = this.cache.get(card.faceKey);
    if (existing) return existing;
    const result = this.renderer(card);
    const texture = typeof result === 'function' ? this.drawToTexture(result) : result;
    this.cache.set(card.faceKey, texture);
    return texture;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/engine/pixi/face-texture-cache.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/pixi/face-texture-cache.ts src/engine/pixi/face-texture-cache.test.ts
git commit -m "feat(pixi): memoized face-texture cache with drawToTexture seam

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `pixi/card-sprite` — the card display object

**Files:**
- Create: `src/engine/pixi/card-sprite.ts`
- Test: `src/engine/pixi/card-sprite.test.ts`

**Interfaces:**
- Consumes: `Container`, `Sprite`, `Texture` from `pixi.js`; `CardRenderState` from `../core/table-model`; `resolveFlipVisual` from `../core/tween`; `CARD_WIDTH`, `CARD_HEIGHT` from `../core/scene`.
- Produces:
  ```ts
  export class CardSprite extends Container {
    constructor();
    setFaces(faceUpTex: Texture, faceDownTex: Texture): void;
    applyRenderState(rs: CardRenderState): void; // position/rotation/scale/z + flip visibility
  }
  ```
- `applyRenderState` sets `position`, `rotation`, `zIndex`, applies `scale.x = rs.current.scale * flipScaleX`, `scale.y = rs.current.scale`, and toggles the up/down face sprite visibility from `resolveFlipVisual(rs.flipProgress, rs.faceUp)`.

- [ ] **Step 1: Write the failing test `src/engine/pixi/card-sprite.test.ts`**

```ts
import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { CardSprite } from './card-sprite';
import type { CardRenderState } from '../core/table-model';

const rs = (over: Partial<CardRenderState> = {}): CardRenderState => ({
  id: 'a', faceUp: true, faceKey: 'AS', draggable: true,
  current: { x: 12, y: 34, rotation: 0.5, scale: 1, z: 7 },
  target: { x: 12, y: 34, rotation: 0.5, scale: 1, z: 7 },
  ownedByDrag: false, flipProgress: 1, ...over,
});

describe('CardSprite', () => {
  it('applies transform from a render state', () => {
    const s = new CardSprite();
    s.setFaces(Texture.EMPTY, Texture.EMPTY);
    s.applyRenderState(rs());
    expect(s.x).toBeCloseTo(12);
    expect(s.y).toBeCloseTo(34);
    expect(s.rotation).toBeCloseTo(0.5);
    expect(s.zIndex).toBe(7);
  });

  it('shows the up face when settled face-up, the down face when face-down', () => {
    const s = new CardSprite();
    s.setFaces(Texture.EMPTY, Texture.EMPTY);
    s.applyRenderState(rs({ faceUp: true, flipProgress: 1 }));
    expect(s.faceUpVisible).toBe(true);
    s.applyRenderState(rs({ faceUp: false, flipProgress: 1 }));
    expect(s.faceUpVisible).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/pixi/card-sprite.test.ts`
Expected: FAIL — cannot find module `./card-sprite`.

- [ ] **Step 3: Write `src/engine/pixi/card-sprite.ts`**

```ts
import { Container, Sprite, type Texture } from 'pixi.js';
import { CARD_HEIGHT, CARD_WIDTH } from '../core/scene';
import type { CardRenderState } from '../core/table-model';
import { resolveFlipVisual } from '../core/tween';

export class CardSprite extends Container {
  private faceUpSprite = new Sprite();
  private faceDownSprite = new Sprite();

  constructor() {
    super();
    for (const s of [this.faceDownSprite, this.faceUpSprite]) {
      s.anchor.set(0.5);
      s.width = CARD_WIDTH;
      s.height = CARD_HEIGHT;
      this.addChild(s);
    }
  }

  /** Test/inspection helper. */
  get faceUpVisible(): boolean {
    return this.faceUpSprite.visible;
  }

  setFaces(faceUpTex: Texture, faceDownTex: Texture): void {
    this.faceUpSprite.texture = faceUpTex;
    this.faceDownSprite.texture = faceDownTex;
  }

  applyRenderState(rs: CardRenderState): void {
    const { scaleX, showFaceUp } = resolveFlipVisual(rs.flipProgress, rs.faceUp);
    this.position.set(rs.current.x, rs.current.y);
    this.rotation = rs.current.rotation;
    this.scale.set(rs.current.scale * scaleX, rs.current.scale);
    this.zIndex = rs.current.z;
    this.faceUpSprite.visible = showFaceUp;
    this.faceDownSprite.visible = !showFaceUp;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/engine/pixi/card-sprite.test.ts`
Expected: PASS (2 tests).

If Pixi cannot construct `Sprite`/`Texture.EMPTY` under happy-dom (no GPU), the failure will be an import/constructor error, not a logic error — in that case, mark this test `it.skip` with a comment pointing to the demo (Task 16) for visual verification, and keep the implementation. Do NOT change the logic to satisfy the environment.

- [ ] **Step 5: Commit**

```bash
git add src/engine/pixi/card-sprite.ts src/engine/pixi/card-sprite.test.ts
git commit -m "feat(pixi): CardSprite display object with flip visibility

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: `pixi/pixi-table` — the Container view

**Files:**
- Create: `src/engine/pixi/pixi-table.ts`
- Test: `src/engine/pixi/pixi-table.test.ts`

**Interfaces:**
- Consumes: `Container` from `pixi.js`; `TableModel` from `../core/table-model`; `CardSprite` from `./card-sprite`; `FaceTextureCache` from `./face-texture-cache`; `Scene`, `Vec2`, `PlacedCard` from `../core/scene`.
- Produces:
  ```ts
  export interface PixiTableDeps {
    faces: FaceTextureCache;
    createSprite?: () => CardSprite;   // injectable for tests
  }
  export class PixiTable extends Container {
    constructor(deps: PixiTableDeps);
    setScene(scene: Scene): void;      // reconcile model + sprite set
    advance(dtSeconds: number): void;  // step model + push transforms to sprites
    getPlacedCards(): PlacedCard[];
    beginDrag(id: string): void;
    dragTo(id: string, world: Vec2): void;
    endDrag(id: string): void;
    get spriteCount(): number;
  }
  ```
- `setScene` stores the scene (needed to look up `CardState` for face textures), calls `model.setScene`, then adds a `CardSprite` for each new card id (calling `setFaces` from the cache with the up/down `faceKey`) and removes sprites for departed ids. `advance` runs `model.advance` then `applyRenderState` on each sprite.

- [ ] **Step 1: Write the failing test `src/engine/pixi/pixi-table.test.ts`**

```ts
import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { PixiTable } from './pixi-table';
import { FaceTextureCache } from './face-texture-cache';
import { CardSprite } from './card-sprite';
import type { Scene } from '../core/scene';

const faces = () => new FaceTextureCache(() => Texture.EMPTY, () => Texture.EMPTY);
const scene = (ids: string[]): Scene => ({
  cards: ids.map((id) => ({ id, zoneId: 'deck', faceUp: false, faceKey: 'back' })),
  zones: [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }],
});

describe('PixiTable', () => {
  it('creates one sprite per card and removes departed sprites', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite() });
    table.setScene(scene(['a', 'b']));
    expect(table.spriteCount).toBe(2);
    table.setScene(scene(['a']));
    expect(table.spriteCount).toBe(1);
  });

  it('advances the model so placed cards are available for hit-testing', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite() });
    table.setScene(scene(['a']));
    table.advance(0.016);
    expect(table.getPlacedCards().map((c) => c.id)).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/pixi/pixi-table.test.ts`
Expected: FAIL — cannot find module `./pixi-table`.

- [ ] **Step 3: Write `src/engine/pixi/pixi-table.ts`**

```ts
import { Container } from 'pixi.js';
import type { PlacedCard, Scene, Vec2 } from '../core/scene';
import { TableModel } from '../core/table-model';
import { CardSprite } from './card-sprite';
import type { FaceTextureCache } from './face-texture-cache';

export interface PixiTableDeps {
  faces: FaceTextureCache;
  createSprite?: () => CardSprite;
}

export class PixiTable extends Container {
  private model = new TableModel();
  private sprites = new Map<string, CardSprite>();
  private faces: FaceTextureCache;
  private createSprite: () => CardSprite;

  constructor(deps: PixiTableDeps) {
    super();
    this.sortableChildren = true;
    this.faces = deps.faces;
    this.createSprite = deps.createSprite ?? (() => new CardSprite());
  }

  setScene(scene: Scene): void {
    this.model.setScene(scene);
    const present = new Set(scene.cards.map((c) => c.id));

    for (const [id, sprite] of [...this.sprites]) {
      if (!present.has(id)) {
        this.removeChild(sprite);
        sprite.destroy();
        this.sprites.delete(id);
      }
    }

    for (const card of scene.cards) {
      let sprite = this.sprites.get(card.id);
      if (!sprite) {
        sprite = this.createSprite();
        this.sprites.set(card.id, sprite);
        this.addChild(sprite);
      }
      const upTex = this.faces.get({ ...card, faceUp: true });
      const downTex = this.faces.get({ ...card, faceKey: 'back', faceUp: false });
      sprite.setFaces(upTex, downTex);
    }
  }

  advance(dtSeconds: number): void {
    this.model.advance(dtSeconds);
    for (const rs of this.model.getRenderStates()) {
      this.sprites.get(rs.id)?.applyRenderState(rs);
    }
  }

  getPlacedCards(): PlacedCard[] {
    return this.model.getPlacedCards();
  }

  beginDrag(id: string): void {
    this.model.beginDrag(id);
  }

  dragTo(id: string, world: Vec2): void {
    this.model.dragTo(id, world);
  }

  endDrag(id: string): void {
    this.model.endDrag(id);
  }

  get spriteCount(): number {
    return this.sprites.size;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/engine/pixi/pixi-table.test.ts`
Expected: PASS (2 tests). (If Pixi cannot construct under happy-dom, apply the same `it.skip` note as Task 10 Step 4 and rely on the demo.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/pixi/pixi-table.ts src/engine/pixi/pixi-table.test.ts
git commit -m "feat(pixi): PixiTable Container view over TableModel

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: `input/table-input-tracker` — pointer logic + intents

**Files:**
- Create: `src/engine/input/table-input-context.ts`, `src/engine/input/table-input-tracker.ts`
- Test: `src/engine/input/table-input-tracker.test.ts`

**Interfaces:**
- Consumes: `cardAtPoint`, `zoneAtPoint` from `../core/hittest`; `PlacedCard`, `PlacedZone`, `Vec2`, `CardState`, `Scene` from `../core/scene`.
- Produces (`table-input-context.ts`):
  ```ts
  export interface DropIntent { cardId: string; fromZoneId: string; toZoneId: string | null; slot: number; worldPoint: Vec2; }
  export interface TableIntents {
    onDrop?: (i: DropIntent) => void;
    onCardClick?: (cardId: string) => void;
    onHover?: (cardId: string | null) => void;
  }
  export interface TableInputDeps {
    clientToWorld: (clientX: number, clientY: number) => Vec2;
    getPlacedCards: () => PlacedCard[];
    getPlacedZones: () => PlacedZone[];
    getScene: () => Scene;
    beginDrag: (id: string) => void;
    dragTo: (id: string, world: Vec2) => void;
    endDrag: (id: string) => void;
    intents: TableIntents;
  }
  ```
- Produces (`table-input-tracker.ts`): `class TableInputTracker` with `hoverAt(world)`, `tryPickUp(world): boolean`, `dragTo(world)`, `drop(world)`, plus `pointerDown/Move/Up(clientX, clientY)` convenience wrappers used by the parser. Tracks the active drag id and its origin zone; a pointer-up with no movement past a 5px threshold emits `onCardClick` instead of a drop.

- [ ] **Step 1: Write the failing test `src/engine/input/table-input-tracker.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { TableInputTracker } from './table-input-tracker';
import type { TableInputDeps } from './table-input-context';
import type { PlacedCard, PlacedZone, Scene, Vec2 } from '../core/scene';

function makeDeps(over: Partial<TableInputDeps> = {}): TableInputDeps {
  const placedCards: PlacedCard[] = [{ id: 'a', draggable: true, transform: { x: 0, y: 0, rotation: 0, scale: 1, z: 0 } }];
  const placedZones: PlacedZone[] = [{ id: 'hand', x: 300, y: 0, width: 200, height: 200 }];
  const scene: Scene = { cards: [{ id: 'a', zoneId: 'deck', faceUp: true, faceKey: 'AS' }], zones: [] };
  return {
    clientToWorld: (x: number, y: number): Vec2 => ({ x, y }),
    getPlacedCards: () => placedCards,
    getPlacedZones: () => placedZones,
    getScene: () => scene,
    beginDrag: vi.fn(),
    dragTo: vi.fn(),
    endDrag: vi.fn(),
    intents: {},
    ...over,
  };
}

describe('TableInputTracker', () => {
  it('picks up a draggable card on pointer down and drags it', () => {
    const deps = makeDeps();
    const t = new TableInputTracker(deps);
    t.pointerDown(0, 0);
    expect(deps.beginDrag).toHaveBeenCalledWith('a');
    t.pointerMove(50, 60);
    expect(deps.dragTo).toHaveBeenCalledWith('a', { x: 50, y: 60 });
  });

  it('emits a drop intent with the resolved zone on release after moving', () => {
    const onDrop = vi.fn();
    const deps = makeDeps({ intents: { onDrop } });
    const t = new TableInputTracker(deps);
    t.pointerDown(0, 0);
    t.pointerMove(300, 0);
    t.pointerUp(300, 0);
    expect(onDrop).toHaveBeenCalledWith({
      cardId: 'a', fromZoneId: 'deck', toZoneId: 'hand', slot: 0, worldPoint: { x: 300, y: 0 },
    });
    expect(deps.endDrag).toHaveBeenCalledWith('a');
  });

  it('emits a click (not a drop) when released without moving', () => {
    const onCardClick = vi.fn();
    const onDrop = vi.fn();
    const deps = makeDeps({ intents: { onCardClick, onDrop } });
    const t = new TableInputTracker(deps);
    t.pointerDown(0, 0);
    t.pointerUp(2, 2);
    expect(onCardClick).toHaveBeenCalledWith('a');
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('reports hover changes', () => {
    const onHover = vi.fn();
    const deps = makeDeps({ intents: { onHover } });
    const t = new TableInputTracker(deps);
    t.pointerMove(0, 0);
    t.pointerMove(999, 999);
    expect(onHover).toHaveBeenNthCalledWith(1, 'a');
    expect(onHover).toHaveBeenNthCalledWith(2, null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/input/table-input-tracker.test.ts`
Expected: FAIL — cannot find module `./table-input-tracker`.

- [ ] **Step 3: Write `src/engine/input/table-input-context.ts`**

```ts
import type { CardState, PlacedCard, PlacedZone, Scene, Vec2 } from '../core/scene';

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
  getPlacedZones: () => PlacedZone[];
  getScene: () => Scene;
  beginDrag: (id: string) => void;
  dragTo: (id: string, world: Vec2) => void;
  endDrag: (id: string) => void;
  intents: TableIntents;
}

export type { CardState, PlacedCard, PlacedZone, Scene, Vec2 };
```

- [ ] **Step 4: Write `src/engine/input/table-input-tracker.ts`**

```ts
import { cardAtPoint, zoneAtPoint } from '../core/hittest';
import type { Vec2 } from '../core/scene';
import type { TableInputDeps } from './table-input-context';

const CLICK_THRESHOLD = 5;

export class TableInputTracker {
  private dragId: string | null = null;
  private dragFromZone: string | null = null;
  private downWorld: Vec2 | null = null;
  private moved = false;
  private hoverId: string | null = null;

  constructor(private deps: TableInputDeps) {}

  pointerDown(clientX: number, clientY: number): void {
    const world = this.deps.clientToWorld(clientX, clientY);
    this.downWorld = world;
    this.moved = false;
    const id = cardAtPoint(world, this.deps.getPlacedCards(), { draggableOnly: true });
    if (id == null) return;
    this.dragId = id;
    this.dragFromZone = this.deps.getScene().cards.find((c) => c.id === id)?.zoneId ?? null;
    this.deps.beginDrag(id);
  }

  pointerMove(clientX: number, clientY: number): void {
    const world = this.deps.clientToWorld(clientX, clientY);
    if (this.dragId) {
      if (this.downWorld && Math.hypot(world.x - this.downWorld.x, world.y - this.downWorld.y) > CLICK_THRESHOLD) {
        this.moved = true;
      }
      this.deps.dragTo(this.dragId, world);
      return;
    }
    const id = cardAtPoint(world, this.deps.getPlacedCards());
    if (id !== this.hoverId) {
      this.hoverId = id;
      this.deps.intents.onHover?.(id);
    }
  }

  pointerUp(clientX: number, clientY: number): void {
    const world = this.deps.clientToWorld(clientX, clientY);
    const id = this.dragId;
    if (id == null) return;
    this.deps.endDrag(id);
    this.dragId = null;

    if (!this.moved) {
      this.deps.intents.onCardClick?.(id);
      return;
    }
    const card = this.deps.getScene().cards.find((c) => c.id === id);
    const hit = zoneAtPoint(world, this.deps.getPlacedZones(), card);
    this.deps.intents.onDrop?.({
      cardId: id,
      fromZoneId: this.dragFromZone ?? '',
      toZoneId: hit?.zoneId ?? null,
      slot: hit?.slot ?? 0,
      worldPoint: world,
    });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test src/engine/input/table-input-tracker.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/engine/input/table-input-context.ts src/engine/input/table-input-tracker.ts src/engine/input/table-input-tracker.test.ts
git commit -m "feat(input): pointer tracker with drop/click/hover intents

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: `input/table-kmt-state-machine` + `table-kmt-parser`

**Files:**
- Create: `src/engine/input/table-kmt-state-machine.ts`, `src/engine/input/table-kmt-parser.ts`
- Test: `src/engine/input/table-kmt-state-machine.test.ts`

**Interfaces:**
- Consumes: `BaseContext`, `TemplateState`, `TemplateStateMachine`, `EventReactions`, `NO_OP`, `DefaultOutputMapping`, `StateMachine` from `@ue-too/being`; `VanillaKMTEventParser` from `@ue-too/board`; `TableInputTracker` from `./table-input-tracker`; `Vec2` from `../core/scene`.
- Produces:
  - `table-kmt-state-machine.ts`:
    ```ts
    export type TableInputStates = 'IDLE' | 'DRAGGING';
    export interface TableInputSMContext extends BaseContext {
      pickUp(world: Vec2): void;
      dragTo(world: Vec2): void;
      drop(world: Vec2): void;
      hoverAt(world: Vec2): void;
    }
    export type TableInputEvents = {
      pointerDown: { world: Vec2 };
      pointerMove: { world: Vec2 };
      pointerUp: { world: Vec2 };
    };
    export function createTableInputStateMachine(context: TableInputSMContext):
      StateMachine<TableInputEvents, TableInputSMContext, TableInputStates, DefaultOutputMapping<TableInputEvents>>;
    export function trackerToSMContext(tracker: TableInputTracker): TableInputSMContext;
    ```
  - `table-kmt-parser.ts`:
    ```ts
    export class TableKmtParser extends VanillaKMTEventParser { /* overrides pointer handlers to drive the SM */ }
    ```
- The state machine is intentionally lightweight: `IDLE` handles `pointerMove` (hover) and `pointerDown` (pickUp → transition to `DRAGGING`); `DRAGGING` handles `pointerMove` (dragTo) and `pointerUp` (drop → transition to `IDLE`). `trackerToSMContext` maps the SM context methods onto `TableInputTracker`'s `pointerDown/Move/Up` by re-deriving client coords is NOT needed — the parser converts and the SM carries world points; the context calls tracker methods that already accept world via a thin adapter (see Step 3).

- [ ] **Step 1: Write the failing test `src/engine/input/table-kmt-state-machine.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createTableInputStateMachine, type TableInputSMContext } from './table-kmt-state-machine';

function ctx(): TableInputSMContext & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    setup: () => {},
    cleanup: () => {},
    pickUp: () => calls.push('pickUp'),
    dragTo: () => calls.push('dragTo'),
    drop: () => calls.push('drop'),
    hoverAt: () => calls.push('hoverAt'),
  };
}

describe('table input state machine', () => {
  it('transitions IDLE -> DRAGGING -> IDLE and routes actions', () => {
    const c = ctx();
    const sm = createTableInputStateMachine(c);
    expect(sm.currentState).toBe('IDLE');
    sm.happens('pointerMove', { world: { x: 0, y: 0 } });
    sm.happens('pointerDown', { world: { x: 0, y: 0 } });
    expect(sm.currentState).toBe('DRAGGING');
    sm.happens('pointerMove', { world: { x: 5, y: 5 } });
    sm.happens('pointerUp', { world: { x: 5, y: 5 } });
    expect(sm.currentState).toBe('IDLE');
    expect(c.calls).toEqual(['hoverAt', 'pickUp', 'dragTo', 'drop']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/input/table-kmt-state-machine.test.ts`
Expected: FAIL — cannot find module `./table-kmt-state-machine`.

- [ ] **Step 3: Write `src/engine/input/table-kmt-state-machine.ts`**

```ts
import {
  type BaseContext,
  type DefaultOutputMapping,
  type EventReactions,
  NO_OP,
  type StateMachine,
  TemplateState,
  TemplateStateMachine,
} from '@ue-too/being';
import type { Vec2 } from '../core/scene';
import type { TableInputTracker } from './table-input-tracker';

export type TableInputStates = 'IDLE' | 'DRAGGING';

export interface TableInputSMContext extends BaseContext {
  pickUp(world: Vec2): void;
  dragTo(world: Vec2): void;
  drop(world: Vec2): void;
  hoverAt(world: Vec2): void;
}

export type TableInputEvents = {
  pointerDown: { world: Vec2 };
  pointerMove: { world: Vec2 };
  pointerUp: { world: Vec2 };
};

type SM = StateMachine<TableInputEvents, TableInputSMContext, TableInputStates, DefaultOutputMapping<TableInputEvents>>;

class IdleState extends TemplateState<TableInputEvents, TableInputSMContext, TableInputStates, DefaultOutputMapping<TableInputEvents>> {
  protected _eventReactions: EventReactions<TableInputEvents, TableInputSMContext, TableInputStates, DefaultOutputMapping<TableInputEvents>> = {
    pointerMove: { action: (context, payload) => context.hoverAt(payload.world) },
    pointerDown: { action: (context, payload) => context.pickUp(payload.world), defaultTargetState: 'DRAGGING' },
    pointerUp: { action: NO_OP },
  };
}

class DraggingState extends TemplateState<TableInputEvents, TableInputSMContext, TableInputStates, DefaultOutputMapping<TableInputEvents>> {
  protected _eventReactions: EventReactions<TableInputEvents, TableInputSMContext, TableInputStates, DefaultOutputMapping<TableInputEvents>> = {
    pointerMove: { action: (context, payload) => context.dragTo(payload.world) },
    pointerUp: { action: (context, payload) => context.drop(payload.world), defaultTargetState: 'IDLE' },
    pointerDown: { action: NO_OP },
  };
}

export function createTableInputStateMachine(context: TableInputSMContext): SM {
  return new TemplateStateMachine({ IDLE: new IdleState(), DRAGGING: new DraggingState() }, 'IDLE', context);
}

/**
 * Adapts a TableInputTracker to the SM context. The tracker's public methods take
 * client coords, but here we already have world points — so we call the tracker's
 * world-level primitives directly.
 */
export function trackerToSMContext(tracker: TableInputTracker): TableInputSMContext {
  return {
    setup: NO_OP,
    cleanup: NO_OP,
    pickUp: (world) => tracker.pickUpWorld(world),
    dragTo: (world) => tracker.dragToWorld(world),
    drop: (world) => tracker.dropWorld(world),
    hoverAt: (world) => tracker.hoverAtWorld(world),
  };
}
```

- [ ] **Step 4: Add the world-level primitives to `TableInputTracker`**

Refactor `src/engine/input/table-input-tracker.ts` so `pointerDown/Move/Up` delegate to new public world-level methods (this keeps Task 12's tests passing AND gives the SM a world-coordinate entry point). Add these methods and update the three wrappers:

```ts
  // --- world-level primitives (used by the state machine) ---
  pickUpWorld(world: Vec2): void {
    this.downWorld = world;
    this.moved = false;
    const id = cardAtPoint(world, this.deps.getPlacedCards(), { draggableOnly: true });
    if (id == null) return;
    this.dragId = id;
    this.dragFromZone = this.deps.getScene().cards.find((c) => c.id === id)?.zoneId ?? null;
    this.deps.beginDrag(id);
  }

  dragToWorld(world: Vec2): void {
    if (this.dragId) {
      if (this.downWorld && Math.hypot(world.x - this.downWorld.x, world.y - this.downWorld.y) > CLICK_THRESHOLD) {
        this.moved = true;
      }
      this.deps.dragTo(this.dragId, world);
      return;
    }
    const id = cardAtPoint(world, this.deps.getPlacedCards());
    if (id !== this.hoverId) {
      this.hoverId = id;
      this.deps.intents.onHover?.(id);
    }
  }

  hoverAtWorld(world: Vec2): void {
    if (this.dragId) return;
    const id = cardAtPoint(world, this.deps.getPlacedCards());
    if (id !== this.hoverId) {
      this.hoverId = id;
      this.deps.intents.onHover?.(id);
    }
  }

  dropWorld(world: Vec2): void {
    const id = this.dragId;
    if (id == null) return;
    this.deps.endDrag(id);
    this.dragId = null;
    if (!this.moved) {
      this.deps.intents.onCardClick?.(id);
      return;
    }
    const card = this.deps.getScene().cards.find((c) => c.id === id);
    const hit = zoneAtPoint(world, this.deps.getPlacedZones(), card);
    this.deps.intents.onDrop?.({
      cardId: id, fromZoneId: this.dragFromZone ?? '', toZoneId: hit?.zoneId ?? null, slot: hit?.slot ?? 0, worldPoint: world,
    });
  }

  pointerDown(clientX: number, clientY: number): void { this.pickUpWorld(this.deps.clientToWorld(clientX, clientY)); }
  pointerMove(clientX: number, clientY: number): void { this.dragToWorld(this.deps.clientToWorld(clientX, clientY)); }
  pointerUp(clientX: number, clientY: number): void { this.dropWorld(this.deps.clientToWorld(clientX, clientY)); }
```

Remove the old `pointerDown/Move/Up` bodies (now thin wrappers above) and the now-unused private `pickUp/tryPickUp` names if present. Re-run Task 12's test to confirm no regression:

Run: `bun test src/engine/input/table-input-tracker.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write `src/engine/input/table-kmt-parser.ts`**

```ts
import { type InputOrchestrator, VanillaKMTEventParser } from '@ue-too/board';
import type { KmtInputStateMachine } from '@ue-too/board';
import type { Vec2 } from '../core/scene';

type WorldSink = {
  happens: (event: 'pointerDown' | 'pointerMove' | 'pointerUp', payload: { world: Vec2 }) => void;
};

/**
 * A KMT parser for the fixed card table. It extends VanillaKMTEventParser for
 * house-style parity, but overrides the pointer handlers to drive the card input
 * state machine instead of the camera-pan pipeline (the table does not pan).
 */
export class TableKmtParser extends VanillaKMTEventParser {
  private cardSM: WorldSink;
  private toWorld: (clientX: number, clientY: number) => Vec2;

  constructor(
    baseStateMachine: KmtInputStateMachine,
    canvas: HTMLCanvasElement,
    orchestrator: InputOrchestrator,
    cardSM: WorldSink,
    toWorld: (clientX: number, clientY: number) => Vec2,
  ) {
    super(baseStateMachine, orchestrator, canvas);
    this.cardSM = cardSM;
    this.toWorld = toWorld;
  }

  override pointerDownHandler(e: PointerEvent): void {
    if (this.disabled || e.button !== 0) return;
    this.cardSM.happens('pointerDown', { world: this.toWorld(e.clientX, e.clientY) });
  }

  override pointerMoveHandler(e: PointerEvent): void {
    if (this.disabled) return;
    this.cardSM.happens('pointerMove', { world: this.toWorld(e.clientX, e.clientY) });
  }

  override pointerUpHandler(e: PointerEvent): void {
    if (this.disabled || e.button !== 0) return;
    this.cardSM.happens('pointerUp', { world: this.toWorld(e.clientX, e.clientY) });
  }
}
```

Note: exact member names on `VanillaKMTEventParser` (`disabled`, `pointerDownHandler`, etc.) were confirmed against `@ue-too/board` `0.17.6` and azabu's `ExtendedKMTEventParser`. If a member is `protected` and the override signature differs, match the base class signature exactly (see azabu `src/utils/kmt-parser/extended-kmt-parser.ts`).

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun test src/engine/input`
Expected: PASS (state-machine test + tracker test green).

- [ ] **Step 7: Commit**

```bash
git add src/engine/input/table-kmt-state-machine.ts src/engine/input/table-kmt-parser.ts src/engine/input/table-kmt-state-machine.test.ts src/engine/input/table-input-tracker.ts
git commit -m "feat(input): card input state machine + KMT parser

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: App wiring — `initApp`, `useApp`, `PixiCanvas`, registry augmentation

**Files:**
- Create: `src/utils/init-app.ts`, `src/hooks/use-app.ts`, `src/components/PixiCanvas.tsx`, `src/app-components.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `baseInitApp`, `BaseAppComponents`, `InitAppOptions` from `@ue-too/board-pixi-integration`; `usePixiCanvas`, `PixiCanvasRegistry`, `Wrapper` from `@ue-too/board-pixi-react-integration`; converters `convertFromWindow2Canvas`, `convertFromViewport2World` (and viewport conversion) from `@ue-too/board`; `PixiTable`, `FaceTextureCache`, `TableInputTracker`, `createTableInputStateMachine`, `trackerToSMContext`, `TableKmtParser` from `../engine/*`; `RenderTexture`/`Graphics` from `pixi.js`.
- Produces (`src/app-components.ts`):
  ```ts
  export type AppComponents = BaseAppComponents & {
    type: 'table';
    pixiTable: PixiTable;
    inputTracker: TableInputTracker;
    setScene: (scene: Scene) => void;
    setIntents: (intents: TableIntents) => void;
    clientToWorld: (clientX: number, clientY: number) => Vec2;
  };
  declare module '@ue-too/board-pixi-react-integration' {
    interface PixiCanvasRegistry { components: AppComponents }
  }
  ```
- Produces (`src/utils/init-app.ts`): `initApp(canvas, option): Promise<AppComponents>` following azabu's recipe.

- [ ] **Step 1: Create `src/app-components.ts`**

```ts
import type { BaseAppComponents } from '@ue-too/board-pixi-integration';
import type { Scene, Vec2 } from '@/engine/core/scene';
import type { PixiTable } from '@/engine/pixi/pixi-table';
import type { TableIntents } from '@/engine/input/table-input-context';
import type { TableInputTracker } from '@/engine/input/table-input-tracker';

export type AppComponents = BaseAppComponents & {
  type: 'table';
  pixiTable: PixiTable;
  inputTracker: TableInputTracker;
  setScene: (scene: Scene) => void;
  setIntents: (intents: TableIntents) => void;
  clientToWorld: (clientX: number, clientY: number) => Vec2;
};

declare module '@ue-too/board-pixi-react-integration' {
  interface PixiCanvasRegistry {
    components: AppComponents;
  }
}
```

- [ ] **Step 2: Create `src/hooks/use-app.ts`** (azabu parity)

```ts
import { usePixiCanvas } from '@ue-too/board-pixi-react-integration';
import { useMemo } from 'react';
import type { AppComponents } from '@/app-components';

export function useApp(): AppComponents | null {
  const { result } = usePixiCanvas();
  return useMemo(() => {
    if (!result.initialized || !result.success || !result.components?.app?.renderer) return null;
    return result.components as AppComponents;
  }, [result]);
}
```

- [ ] **Step 3: Create `src/components/PixiCanvas.tsx`** (azabu parity)

```tsx
export { Wrapper } from '@ue-too/board-pixi-react-integration';
```

- [ ] **Step 4: Create `src/utils/init-app.ts`**

```ts
import { convertFromViewport2World, convertFromWindow2Canvas } from '@ue-too/board';
import { type BaseAppComponents, type InitAppOptions, baseInitApp } from '@ue-too/board-pixi-integration';
import { Graphics, Rectangle, RenderTexture, type Texture } from 'pixi.js';
import type { AppComponents } from '@/app-components';
import type { Scene, Vec2 } from '@/engine/core/scene';
import { CARD_HEIGHT, CARD_WIDTH } from '@/engine/core/scene';
import type { TableIntents } from '@/engine/input/table-input-context';
import { TableInputTracker } from '@/engine/input/table-input-tracker';
import { createTableInputStateMachine, trackerToSMContext } from '@/engine/input/table-kmt-state-machine';
import { TableKmtParser } from '@/engine/input/table-kmt-parser';
import { FaceTextureCache, type FaceRenderer } from '@/engine/pixi/face-texture-cache';
import { PixiTable } from '@/engine/pixi/pixi-table';

const TABLE_BOUNDS = { min: { x: -800, y: -600 }, max: { x: 800, y: 600 } };

// A neutral default face renderer; the demo (Task 16) overrides this per game.
const defaultRenderer: FaceRenderer = (card) => (g: Graphics) => {
  g.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8)
    .fill(card.faceUp ? 0xffffff : 0x1e3a5f)
    .stroke({ color: 0x333333, width: 2 });
};

export const initApp = async (
  canvas: HTMLCanvasElement,
  option: Partial<InitAppOptions> = { fullScreen: true, limitEntireViewPort: false, boundaries: TABLE_BOUNDS },
): Promise<AppComponents> => {
  const base: BaseAppComponents = await baseInitApp(canvas, option);

  // Custom input: destroy Pixi's event federation; drive input through KMT.
  base.app.renderer.events.destroy();

  const drawToTexture = (draw: (g: Graphics) => void): Texture => {
    const g = new Graphics();
    draw(g);
    const tex = RenderTexture.create({ width: CARD_WIDTH, height: CARD_HEIGHT });
    // Draw is centered on the origin; shift so it lands inside the texture.
    g.position.set(CARD_WIDTH / 2, CARD_HEIGHT / 2);
    base.app.renderer.render({ container: g, target: tex });
    g.destroy();
    return tex;
  };

  const faces = new FaceTextureCache(defaultRenderer, drawToTexture);
  const pixiTable = new PixiTable({ faces });
  base.app.stage.addChild(pixiTable);
  base.app.ticker.add((t) => pixiTable.advance(t.deltaMS / 1000));

  const clientToWorld = (clientX: number, clientY: number): Vec2 => {
    const canvasPt = convertFromWindow2Canvas({ x: clientX, y: clientY }, base.canvasProxy);
    const viewport = { x: canvasPt.x - base.camera.viewPortWidth / 2, y: canvasPt.y - base.camera.viewPortHeight / 2 };
    return convertFromViewport2World(viewport, base.camera.position, base.camera.zoomLevel, base.camera.rotation);
  };

  let intents: TableIntents = {};
  const tracker = new TableInputTracker({
    clientToWorld,
    getPlacedCards: () => pixiTable.getPlacedCards(),
    getPlacedZones: () => currentZones,
    getScene: () => currentScene,
    beginDrag: (id) => pixiTable.beginDrag(id),
    dragTo: (id, world) => pixiTable.dragTo(id, world),
    endDrag: (id) => pixiTable.endDrag(id),
    intents: { onDrop: (i) => intents.onDrop?.(i), onCardClick: (id) => intents.onCardClick?.(id), onHover: (id) => intents.onHover?.(id) },
  });

  const sm = createTableInputStateMachine(trackerToSMContext(tracker));

  // Fixed table: replace base pan/zoom parsers with our card parser.
  base.kmtParser.tearDown();
  const parser = new TableKmtParser(base.kmtInputStateMachine, canvas, base.inputOrchestrator, sm, clientToWorld);
  parser.setUp();
  base.touchParser.tearDown();

  // Fit camera to the table bounds; lock zoom (fixed table).
  const fit = Math.min(base.camera.viewPortWidth / (TABLE_BOUNDS.max.x - TABLE_BOUNDS.min.x), base.camera.viewPortHeight / (TABLE_BOUNDS.max.y - TABLE_BOUNDS.min.y));
  base.camera.setPosition({ x: 0, y: 0 });
  base.camera.zoomBoundaries = { min: fit, max: fit };
  base.camera.setZoomLevel(fit);

  let currentScene: Scene = { cards: [], zones: [] };
  let currentZones: AppComponents['pixiTable'] extends never ? never : { id: string; x: number; y: number; width: number; height: number; accepts?: Scene['zones'][number]['accepts'] }[] = [];

  const setScene = (scene: Scene): void => {
    currentScene = scene;
    currentZones = scene.zones.map((z) => ({
      id: z.id,
      x: z.transform.x,
      y: z.transform.y,
      width: (z.layoutOptions?.spacing ?? CARD_WIDTH) * 4,
      height: CARD_HEIGHT * 2,
      accepts: z.accepts,
    }));
    pixiTable.setScene(scene);
  };

  return {
    ...base,
    type: 'table',
    pixiTable,
    inputTracker: tracker,
    setScene,
    setIntents: (next) => { intents = next; },
    clientToWorld,
  };
};
```

Note: the `currentZones` type annotation above is verbose to satisfy the tracker's `getPlacedZones` return type — if TypeScript complains, extract a named `PlacedZone[]` import from `@/engine/core/scene` and type it `let currentZones: PlacedZone[] = []`. Prefer the named import.

- [ ] **Step 5: Replace `src/main.tsx` with a mount that renders the demo page (created in Task 16)**

For now, point `main.tsx` at a placeholder that renders the `Wrapper` so the app boots:

```tsx
import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Wrapper } from '@/components/PixiCanvas';
import { initApp } from '@/utils/init-app';

function App() {
  const option = useMemo(() => ({ fullScreen: true, limitEntireViewPort: false }), []);
  return <Wrapper option={option} initFunction={initApp} />;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
```

- [ ] **Step 6: Typecheck and boot**

Run: `bun run typecheck`
Expected: no type errors. Fix the `currentZones`/`PlacedZone[]` typing per the note if flagged.

Run: `bun dev` then open the printed URL.
Expected: a blank Pixi canvas renders full-screen with no console errors. (No cards yet — that's Task 16.)

- [ ] **Step 7: Commit**

```bash
git add src/app-components.ts src/hooks/use-app.ts src/components/PixiCanvas.tsx src/utils/init-app.ts src/main.tsx
git commit -m "feat: app wiring (initApp, useApp, registry augmentation, camera fit)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: `react/card-table` — the declarative bridge

**Files:**
- Create: `src/engine/react/types.ts`, `src/engine/react/card-table.tsx`
- Test: `src/engine/react/card-table.test.tsx`

**Interfaces:**
- Consumes: `useApp` from `@/hooks/use-app`; `Scene` from `../core/scene`; `TableIntents`, `DropIntent` from `../input/table-input-context`; React.
- Produces (`types.ts`):
  ```ts
  export interface CardTableHandle { deal(staggerMs?: number): void; shuffle(zoneId: string): void; }
  export interface CardTableProps {
    scene: Scene;
    onDrop?: (intent: DropIntent) => void;
    onCardClick?: (cardId: string) => void;
    onHover?: (cardId: string | null) => void;
  }
  ```
- Produces (`card-table.tsx`): `const CardTable = forwardRef<CardTableHandle, CardTableProps>(...)` — on mount and whenever `scene` changes, calls `app.setScene(scene)`; wires intents via `app.setIntents(...)`; renders nothing (the canvas is owned by `Wrapper`).

- [ ] **Step 1: Write the failing test `src/engine/react/card-table.test.tsx`**

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CardTable } from './card-table';
import type { Scene } from '../core/scene';

const setScene = vi.fn();
const setIntents = vi.fn();

vi.mock('@/hooks/use-app', () => ({
  useApp: () => ({ setScene, setIntents }),
}));

const scene: Scene = { cards: [], zones: [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }] };

describe('CardTable', () => {
  it('pushes the scene into the engine on mount', () => {
    setScene.mockClear();
    render(<CardTable scene={scene} />);
    expect(setScene).toHaveBeenCalledWith(scene);
  });

  it('registers intents from props', () => {
    setIntents.mockClear();
    const onDrop = vi.fn();
    render(<CardTable scene={scene} onDrop={onDrop} />);
    expect(setIntents).toHaveBeenCalled();
    const passed = setIntents.mock.calls.at(-1)![0];
    expect(passed.onDrop).toBe(onDrop);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/engine/react/card-table.test.tsx`
Expected: FAIL — cannot find module `./card-table`.

- [ ] **Step 3: Write `src/engine/react/types.ts`**

```ts
import type { Scene } from '../core/scene';
import type { DropIntent } from '../input/table-input-context';

export interface CardTableHandle {
  deal(staggerMs?: number): void;
  shuffle(zoneId: string): void;
}

export interface CardTableProps {
  scene: Scene;
  onDrop?: (intent: DropIntent) => void;
  onCardClick?: (cardId: string) => void;
  onHover?: (cardId: string | null) => void;
}
```

- [ ] **Step 4: Write `src/engine/react/card-table.tsx`**

```tsx
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useApp } from '@/hooks/use-app';
import type { CardTableHandle, CardTableProps } from './types';

export const CardTable = forwardRef<CardTableHandle, CardTableProps>(function CardTable(props, ref) {
  const app = useApp();

  useEffect(() => {
    if (!app) return;
    app.setIntents({ onDrop: props.onDrop, onCardClick: props.onCardClick, onHover: props.onHover });
  }, [app, props.onDrop, props.onCardClick, props.onHover]);

  useEffect(() => {
    if (!app) return;
    app.setScene(props.scene);
  }, [app, props.scene]);

  useImperativeHandle(ref, () => ({
    deal: (_staggerMs?: number) => { /* wired to pixiTable choreography in a follow-up */ },
    shuffle: (_zoneId: string) => { /* wired to pixiTable choreography in a follow-up */ },
  }), []);

  return null;
});
```

Note: `deal`/`shuffle` are stubbed here because the choreography-to-`PixiTable` wiring is a follow-up (`core/choreography` exists from Task 7; hooking it into `TableModel` as a release schedule is tracked in the plan's Follow-ups). The declarative path (drag/flip/move) is fully functional.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test src/engine/react/card-table.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/engine/react/types.ts src/engine/react/card-table.tsx src/engine/react/card-table.test.tsx
git commit -m "feat(react): CardTable declarative bridge

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Demo page — exercise all interactions

**Files:**
- Create: `src/pages/table-demo/table-demo-page.tsx`, `src/pages/table-demo/deck.ts`
- Modify: `src/main.tsx` (render the demo)

**Interfaces:**
- Consumes: `Wrapper` from `@/components/PixiCanvas`; `CardTable`, `CardTableHandle` from `@/engine/react/*`; `Scene`, `CardState` from `@/engine/core/scene`; React state.
- Produces: a runnable demo with a deck (pile, face-down), a hand (fan, face-up), and a discard (pile). Dragging deck→hand moves a card; clicking a hand card flips it; a "Deal 5" button moves five deck cards into the hand.

- [ ] **Step 1: Write `src/pages/table-demo/deck.ts`**

```ts
import type { CardState } from '@/engine/core/scene';

const SUITS = ['S', 'H', 'D', 'C'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'] as const;

export function standardDeck(): CardState[] {
  const cards: CardState[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      cards.push({ id: `${r}${s}`, zoneId: 'deck', faceUp: false, faceKey: `${r}${s}` });
    }
  }
  return cards;
}
```

- [ ] **Step 2: Write `src/pages/table-demo/table-demo-page.tsx`**

```tsx
import { useMemo, useRef, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import type { Scene } from '@/engine/core/scene';
import { CardTable, type CardTableHandle } from '@/engine/react';
import type { DropIntent } from '@/engine/input/table-input-context';
import { initApp } from '@/utils/init-app';
import { standardDeck } from './deck';

const ZONES: Scene['zones'] = [
  { id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 } },
  { id: 'hand', layout: 'fan', transform: { x: 0, y: 300 }, layoutOptions: { fanAngleDeg: 24 } },
  { id: 'discard', layout: 'pile', transform: { x: 400, y: 0 } },
];

function DemoContent() {
  const handleRef = useRef<CardTableHandle>(null);
  const [cards, setCards] = useState(standardDeck());
  const scene: Scene = { cards, zones: ZONES };

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
      <CardTable ref={handleRef} scene={scene} onDrop={onDrop} onCardClick={onCardClick} />
      <button style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }} onClick={deal5}>Deal 5</button>
    </>
  );
}

export function TableDemoPage() {
  const option = useMemo(() => ({ fullScreen: true, limitEntireViewPort: false }), []);
  return <Wrapper option={option} initFunction={initApp}><DemoContent /></Wrapper>;
}
```

- [ ] **Step 3: Add a barrel `src/engine/react/index.ts`**

```ts
export { CardTable } from './card-table';
export type { CardTableHandle, CardTableProps } from './types';
```

- [ ] **Step 4: Point `src/main.tsx` at the demo**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TableDemoPage } from '@/pages/table-demo/table-demo-page';

createRoot(document.getElementById('root')!).render(<StrictMode><TableDemoPage /></StrictMode>);
```

- [ ] **Step 5: Typecheck + full test suite**

Run: `bun run typecheck && bun test`
Expected: no type errors; all tests pass.

- [ ] **Step 6: Manual verification (the real proof)**

Run: `bun dev` and open the URL. Verify:
1. 52 face-down cards render stacked at the deck (left).
2. Dragging a deck card to the hand (bottom) moves it there and it flips face-up; releasing over empty space snaps it back.
3. Clicking a hand card flips it (animated).
4. "Deal 5" moves five cards deck→hand, each animating into the fan.

Record the result. If a step fails, debug with superpowers:systematic-debugging before proceeding — do not mark the task complete on a failing demo.

- [ ] **Step 7: Commit**

```bash
git add src/pages src/engine/react/index.ts src/main.tsx
git commit -m "feat: card table demo (deck/hand/discard, drag/flip/deal)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Follow-ups (post-plan, tracked not implemented)

These are deliberately deferred (design spec §14) and are NOT required for the plan's deliverable:

- **Choreography wiring:** feed `core/choreography` `planDeal`/`planShuffle` into `TableModel` as a release schedule + transient offsets, and connect `CardTableHandle.deal/shuffle` (currently stubbed in Task 15).
- **Rotation-aware hit-testing:** `core/hittest` uses AABBs; add oriented-box testing if fanned cards need precise picking.
- **Touch parser:** a touch-input expansion mirroring azabu's `ExtendedTouchEventParser` for one-finger drag on mobile.
- **Slot-precise drops:** `zoneAtPoint` returns `slot: 0`; compute the true insertion slot for ordered zones.
- **Engine extraction:** move `src/engine/` to its own npm package if reuse across games is wanted.

---

## Self-Review Notes

- **Spec coverage:** scope/rendering-only (Tasks 2–16, no rules), PixiJS + integration (Tasks 1,14), declarative scene + intents (Tasks 8,12,15), four interactions — drag/drop (12,16), hover (12), flip (6,8,16), deal (7,16 + follow-up for full choreography), fixed camera (14), pluggable faces (9,14), custom KMT/no federation (13,14), azabu structure (14), vitest core (2–8), happy-dom bridge test (15). Deal's full flourish timing is split: timing math is built and tested (Task 7) but the model wiring is a tracked follow-up — the demo still deals via declarative state changes.
- **Placeholders:** none — every code step contains full source. The two stubbed `deal/shuffle` handles are explicitly labelled and covered by a Follow-up.
- **Type consistency:** `TargetTransform`, `CardRenderState`, `DropIntent`, `Scene`, `PlacedCard`, `PlacedZone`, `TableIntents` names are used identically across tasks; `setScene`/`setIntents` on `AppComponents` match their use in `CardTable`.
