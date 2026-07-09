# Per-Player View Projection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `deriveScene` a real per-player projection body (sub-project 3 of 4) — hiding unseen card faces and identity data per viewer, enforcing SP1 zone `visibility` + card `revealTo`.

**Architecture:** A pure `core/` rewrite of `derive-scene.ts`: a reveal predicate (`isRevealed`), per-card masking (`projectCard`, scrubbing `faceKey` + identity `data` and rendering the back), and `deriveScene(def, placement, viewer?)` — identity when `viewer` is undefined (backward-compatible), projected otherwise. A `viewer?` prop threads from `<CardTable>` through `init-app` into the existing `deriveScene` call; the demo adds a View-as toggle. The drop pipeline is untouched (render-only projection).

**Tech Stack:** TypeScript, Vite, React 19, bun, vitest + happy-dom, PixiJS 8.14.0, `@ue-too/*` 0.17.6.

## Global Constraints

- Standalone repo at `/Users/vincent.yy.chang/dev/turnhout/main`; branch `feat/view-projection` (already created; SP3 design committed there).
- `src/engine/core/**` MUST NOT import from `pixi.js`, `react`, `@ue-too/*`, or touch the DOM. No `Math.random`/`Date.now` in `core/`.
- Projection is a PURE function of `(def, placement, viewer)`; it MUST NOT mutate the input placement/cards.
- Reveal rule (verbatim): a card's face is revealed to a **named** viewer iff `card.faceUp === true` OR `(zone.visibility ?? 'public') === 'public'` OR (`zone.visibility === 'owner'` AND `zone.owner === viewer`) OR `card.revealTo === 'all'` OR `card.revealTo` (array) includes the viewer. `viewer === undefined` ⇒ identity (no projection).
- Masking a hidden card: `{ ...card, faceUp: false, faceKey: HIDDEN_FACE_KEY, data: keepPositionalOnly(card.data) }` where `HIDDEN_FACE_KEY = 'back'`; keep `id`/`zoneId`/`slot`/`draggable`; `keepPositionalOnly` keeps only numeric `x`/`y`.
- Reuse SP1/SP2 verbatim: `CardState`/`PlayerId`/`Scene` (`scene.ts`), `TableDef`/`ZoneDef`/`Placement` (`table-def.ts`). The renderer draws the back for any `faceUp:false` card (`pixi-table.ts:45`).
- Package manager **bun**; run one test file with `bunx vitest run <path>` (NOT `bun test`); full suite `bun run test`; typecheck `bun run typecheck`; build `bun run build`. Run `bun run typecheck` before every commit (`noUnusedLocals`/`noUnusedParameters` on).
- Conventional-commit messages ending with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Spec: `docs/superpowers/specs/2026-07-09-view-projection-design.md`.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/engine/core/derive-scene.ts` | Rewrite | `deriveScene` (real body), `isRevealed`, `projectCard`, `keepPositionalOnly`, `HIDDEN_FACE_KEY`. |
| `src/engine/core/derive-scene.test.ts` | Rewrite | reveal predicate + projection + purity tests (keeps an identity test). |
| `src/app-components.ts` | Changed | `setTable` signature gains `viewer?: PlayerId`. |
| `src/utils/init-app.ts` | Changed | `setTable(def, placement, viewer?)` threads viewer into `deriveScene`. |
| `src/engine/react/types.ts` | Changed | `CardTableProps.viewer?: PlayerId`. |
| `src/engine/react/card-table.tsx` | Changed | pass `props.viewer`; effect deps include it. |
| `src/engine/react/card-table.test.tsx` | Changed | assertion updated for the third `setTable` arg. |
| `src/pages/table-demo/table-demo-page.tsx` | Changed | face-down deal, `players:['me','opp']`, View-as toggle. |
| `src/pages/table-demo/table-demo.test.ts` | Changed | add a projection integration test. |

---

## Task 1: `derive-scene.ts` — the real projection

**Files:**
- Rewrite: `src/engine/core/derive-scene.ts`
- Rewrite: `src/engine/core/derive-scene.test.ts`

**Interfaces:**
- Consumes: `CardState`, `PlayerId`, `Scene` from `./scene`; `Placement`, `TableDef`, `ZoneDef` from `./table-def`.
- Produces:
  - `const HIDDEN_FACE_KEY = 'back'`
  - `isRevealed(card: CardState, zone: ZoneDef | undefined, viewer: PlayerId): boolean`
  - `keepPositionalOnly(data: CardState['data']): CardState['data']`
  - `projectCard(card: CardState, zone: ZoneDef | undefined, viewer: PlayerId): CardState`
  - `deriveScene(def: TableDef, placement: Placement, viewer?: PlayerId): Scene`

- [ ] **Step 1: Write the failing test `src/engine/core/derive-scene.test.ts` (replace the whole file)**

```ts
import { describe, expect, it } from 'vitest';
import { HIDDEN_FACE_KEY, deriveScene, isRevealed, keepPositionalOnly, projectCard } from './derive-scene';
import type { CardState } from './scene';
import type { Placement, TableDef, ZoneDef } from './table-def';

const zone = (extra: Partial<ZoneDef> = {}): ZoneDef => ({ id: 'z', layout: 'pile', transform: { x: 0, y: 0 }, ...extra });
const card = (extra: Partial<CardState> = {}): CardState => ({ id: 'c', zoneId: 'z', faceUp: false, faceKey: 'AS', ...extra });

describe('isRevealed', () => {
  it('faceUp reveals to any viewer', () => {
    expect(isRevealed(card({ faceUp: true }), zone({ visibility: 'secret' }), 'opp')).toBe(true);
  });
  it('public (and the default) reveals to all', () => {
    expect(isRevealed(card(), zone({ visibility: 'public' }), 'opp')).toBe(true);
    expect(isRevealed(card(), zone(), 'opp')).toBe(true);
  });
  it('owner reveals only to the owner', () => {
    expect(isRevealed(card(), zone({ visibility: 'owner', owner: 'me' }), 'me')).toBe(true);
    expect(isRevealed(card(), zone({ visibility: 'owner', owner: 'me' }), 'opp')).toBe(false);
  });
  it('secret hides a face-down card', () => {
    expect(isRevealed(card(), zone({ visibility: 'secret' }), 'me')).toBe(false);
  });
  it('revealTo grants access', () => {
    expect(isRevealed(card({ revealTo: 'all' }), zone({ visibility: 'secret' }), 'opp')).toBe(true);
    expect(isRevealed(card({ revealTo: ['opp'] }), zone({ visibility: 'secret' }), 'opp')).toBe(true);
    expect(isRevealed(card({ revealTo: ['x'] }), zone({ visibility: 'secret' }), 'opp')).toBe(false);
  });
  it('an unknown (undefined) zone is treated as public', () => {
    expect(isRevealed(card(), undefined, 'opp')).toBe(true);
  });
});

describe('keepPositionalOnly', () => {
  it('keeps x/y and drops other keys', () => {
    expect(keepPositionalOnly({ x: 1, y: 2, suit: 'S', rank: 1 })).toEqual({ x: 1, y: 2 });
    expect(keepPositionalOnly({ suit: 'S' })).toEqual({});
    expect(keepPositionalOnly(undefined)).toBeUndefined();
  });
});

const def: TableDef = {
  players: ['me', 'opp'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 }, visibility: 'secret' },
    { id: 'hand', layout: 'fan', transform: { x: 0, y: 0 }, owner: 'me', visibility: 'owner' },
    { id: 'discard', layout: 'pile', transform: { x: 0, y: 0 }, visibility: 'public' },
  ],
};
const placement: Placement = {
  cards: [
    { id: 'h1', zoneId: 'hand', faceUp: false, faceKey: 'AS', slot: 0, data: { suit: 'S', rank: 1 } },
    { id: 'd1', zoneId: 'deck', faceUp: false, faceKey: 'KH', data: { suit: 'H', rank: 13 } },
    { id: 'x1', zoneId: 'discard', faceUp: true, faceKey: 'QC', data: { suit: 'C', rank: 12 } },
  ],
};

describe('deriveScene identity (viewer undefined)', () => {
  it('maps ZoneDefs to render zones and passes cards through unchanged', () => {
    const d: TableDef = { zones: [{ id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 }, visibility: 'secret', capacity: 52 }] };
    const p: Placement = { cards: [{ id: 'AS', zoneId: 'deck', faceUp: false, faceKey: 'AS' }] };
    const scene = deriveScene(d, p);
    expect(scene.zones).toEqual([{ id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 } }]);
    expect(scene.cards).toEqual(p.cards);
  });
});

describe('deriveScene projection', () => {
  it('owner sees their own face-down hand card face-up with identity intact', () => {
    const h1 = deriveScene(def, placement, 'me').cards.find((c) => c.id === 'h1')!;
    expect(h1.faceUp).toBe(true);
    expect(h1.faceKey).toBe('AS');
    expect(h1.data).toEqual({ suit: 'S', rank: 1 });
  });
  it('opponent sees the hand card masked: back, scrubbed data, id+slot preserved', () => {
    const h1 = deriveScene(def, placement, 'opp').cards.find((c) => c.id === 'h1')!;
    expect(h1.faceUp).toBe(false);
    expect(h1.faceKey).toBe(HIDDEN_FACE_KEY);
    expect(h1.id).toBe('h1');
    expect(h1.slot).toBe(0);
    expect(h1.data).toEqual({});
  });
  it('a public discard card is visible to everyone', () => {
    const x1 = deriveScene(def, placement, 'opp').cards.find((c) => c.id === 'x1')!;
    expect(x1.faceUp).toBe(true);
    expect(x1.faceKey).toBe('QC');
  });
  it('a secret deck card is masked for every viewer', () => {
    for (const v of ['me', 'opp']) {
      const d1 = deriveScene(def, placement, v).cards.find((c) => c.id === 'd1')!;
      expect(d1.faceKey).toBe(HIDDEN_FACE_KEY);
      expect(d1.faceUp).toBe(false);
    }
  });
  it('preserves free-layout x/y on a masked card', () => {
    const p: Placement = { cards: [{ id: 'f', zoneId: 'deck', faceUp: false, faceKey: 'AS', data: { x: 5, y: 7, suit: 'S' } }] };
    expect(deriveScene(def, p, 'opp').cards[0].data).toEqual({ x: 5, y: 7 });
  });
  it('does not mutate the input placement', () => {
    const snapshot = JSON.parse(JSON.stringify(placement));
    deriveScene(def, placement, 'opp');
    expect(placement).toEqual(snapshot);
  });
});

describe('projectCard', () => {
  it('revealed → faceUp true; hidden → masked back', () => {
    expect(projectCard(card({ faceUp: true }), zone({ visibility: 'secret' }), 'opp').faceUp).toBe(true);
    expect(projectCard(card({ data: { suit: 'S' } }), zone({ visibility: 'secret' }), 'opp')).toMatchObject({ faceUp: false, faceKey: HIDDEN_FACE_KEY });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/derive-scene.test.ts`
Expected: FAIL — `isRevealed`/`projectCard`/`keepPositionalOnly`/`HIDDEN_FACE_KEY` are not exported.

- [ ] **Step 3: Rewrite `src/engine/core/derive-scene.ts`**

```ts
import type { CardState, PlayerId, Scene } from './scene';
import type { Placement, TableDef, ZoneDef } from './table-def';

export const HIDDEN_FACE_KEY = 'back';

/** Whether `viewer` (a real player id) may see the true face of `card`. */
export function isRevealed(card: CardState, zone: ZoneDef | undefined, viewer: PlayerId): boolean {
  return (
    card.faceUp === true ||
    (zone?.visibility ?? 'public') === 'public' ||
    (zone?.visibility === 'owner' && zone.owner === viewer) ||
    card.revealTo === 'all' ||
    (Array.isArray(card.revealTo) && card.revealTo.includes(viewer))
  );
}

/** Keep only the positional x/y of a card's data; drop identity-bearing fields. */
export function keepPositionalOnly(data: CardState['data']): CardState['data'] {
  if (!data) return data;
  const out: { x?: number; y?: number } = {};
  if (typeof data.x === 'number') out.x = data.x;
  if (typeof data.y === 'number') out.y = data.y;
  return out;
}

/** Project one card into what `viewer` should see. */
export function projectCard(card: CardState, zone: ZoneDef | undefined, viewer: PlayerId): CardState {
  if (isRevealed(card, zone, viewer)) return { ...card, faceUp: true };
  return { ...card, faceUp: false, faceKey: HIDDEN_FACE_KEY, data: keepPositionalOnly(card.data) };
}

/**
 * Project a TableDef + Placement into the Scene a viewer should see.
 * `viewer === undefined` returns the omniscient identity (backward-compatible);
 * a named viewer gets per-player hiding.
 */
export function deriveScene(def: TableDef, placement: Placement, viewer?: PlayerId): Scene {
  const zones = def.zones.map((z) => ({ id: z.id, layout: z.layout, transform: z.transform, layoutOptions: z.layoutOptions }));
  if (viewer === undefined) return { zones, cards: placement.cards };
  const zoneById = new Map(def.zones.map((z) => [z.id, z]));
  const cards = placement.cards.map((c) => projectCard(c, zoneById.get(c.zoneId), viewer));
  return { zones, cards };
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `bunx vitest run src/engine/core/derive-scene.test.ts && bun run typecheck`
Expected: PASS (all tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/derive-scene.ts src/engine/core/derive-scene.test.ts
git commit -m "feat(core): real per-player deriveScene projection (isRevealed/projectCard)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Thread `viewer` through the app + React

**Files:**
- Modify: `src/app-components.ts`
- Modify: `src/utils/init-app.ts`
- Modify: `src/engine/react/types.ts`
- Modify: `src/engine/react/card-table.tsx`
- Modify: `src/engine/react/card-table.test.tsx`

**Interfaces:**
- Consumes: `deriveScene` (already imported in init-app), `PlayerId` from `@/engine/core/scene` / `../core/scene`.
- Produces: `AppComponents.setTable(def, placement, viewer?: PlayerId)`, `CardTableProps.viewer?: PlayerId`, `<CardTable>` passing `viewer` and re-deriving when it changes.

- [ ] **Step 1: `src/app-components.ts` — add `viewer?` to `setTable`**

The file imports `Vec2` from `@/engine/core/scene` (line 2). Change that import to also bring `PlayerId`:

```ts
import type { PlayerId, Vec2 } from '@/engine/core/scene';
```

Change the `setTable` line in the `AppComponents` type to:

```ts
  setTable: (def: TableDef, placement: Placement, viewer?: PlayerId) => void;
```

- [ ] **Step 2: `src/utils/init-app.ts` — thread `viewer` into `deriveScene`**

The scene import currently is `import type { CardState, Vec2 } from '@/engine/core/scene';`. Add `PlayerId`:

```ts
import type { CardState, PlayerId, Vec2 } from '@/engine/core/scene';
```

Replace the `setTable` definition with:

```ts
  const setTable = (def: TableDef, placement: Placement, viewer?: PlayerId): void => {
    currentDef = def;
    currentCards = placement.cards;
    pixiTable.setScene(deriveScene(def, placement, viewer));
  };
```

(`currentCards` remains the authoritative cards — the drop pipeline is unchanged and must NOT use the projected scene.)

- [ ] **Step 3: `src/engine/react/types.ts` — add the `viewer` prop**

Change the imports line to add `PlayerId`:

```ts
import type { Placement, TableDef } from '../core/table-def';
import type { PlayerId } from '../core/scene';
import type { DropIntent } from '../input/table-input-context';
```

Add to `CardTableProps` (after `placement`):

```ts
  viewer?: PlayerId;
```

- [ ] **Step 4: `src/engine/react/card-table.tsx` — pass `viewer` and re-derive on change**

Replace the second effect with:

```ts
  useEffect(() => {
    if (!app) return;
    app.setTable(props.tableDef, props.placement, props.viewer);
  }, [app, props.tableDef, props.placement, props.viewer]);
```

- [ ] **Step 5: `src/engine/react/card-table.test.tsx` — update the assertion for the third arg**

The mount test currently asserts `expect(setTable).toHaveBeenCalledWith(tableDef, placement)`. Since no `viewer` prop is passed in that test, `setTable` is now called with `undefined` as the third argument. Change that single assertion to:

```ts
    expect(setTable).toHaveBeenCalledWith(tableDef, placement, undefined);
```

(Leave the intents test unchanged.)

- [ ] **Step 6: Run the full suite + typecheck**

Run: `bun run test && bun run typecheck`
Expected: PASS (all tests, including the updated `card-table.test.tsx`); typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add src/app-components.ts src/utils/init-app.ts src/engine/react/types.ts src/engine/react/card-table.tsx src/engine/react/card-table.test.tsx
git commit -m "feat: thread viewer through CardTable -> setTable -> deriveScene

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Demo — face-down hand + View-as toggle

**Files:**
- Modify: `src/pages/table-demo/table-demo-page.tsx`
- Modify: `src/pages/table-demo/table-demo.test.ts`

**Interfaces:**
- Consumes: `deriveScene` (`@/engine/core/derive-scene`), `PlayerId` (`@/engine/core/scene`), the existing demo `TABLE`/engine.
- Produces: a demo whose hand is dealt face-down, with a "View as: me / opp / table" toggle proving projection.

- [ ] **Step 1: Add the projection integration test to `src/pages/table-demo/table-demo.test.ts`**

Add `import { deriveScene } from '@/engine/core/derive-scene';` to the file's top import group, then append this `describe` block (it constructs its own engine inline, so it doesn't depend on any SP2 helper being in scope):

```ts
describe('demo projection', () => {
  const engine = () =>
    new GameEngine({
      tableDef: TABLE,
      rules: registerStarterRules(new RuleRegistry()),
      moves: registerCoreMoves(new MoveRegistry()),
      initial: { cards: standardDeck(), data: {}, rng: makeRng(20260709) },
    });

  it('hides the face-down hand from an opponent but shows it to the owner', () => {
    const e = engine();
    e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 5 }); // face-down
    const cards = e.getState().cards;

    const opp = deriveScene(TABLE, { cards }, 'opp').cards.filter((c) => c.zoneId === 'hand');
    expect(opp).toHaveLength(5);
    expect(opp.every((c) => c.faceKey === 'back' && c.faceUp === false)).toBe(true);

    const me = deriveScene(TABLE, { cards }, 'me').cards.filter((c) => c.zoneId === 'hand');
    expect(me.every((c) => c.faceUp === true)).toBe(true);
  });
});
```

(The imports `GameEngine`, `MoveRegistry`, `registerCoreMoves`, `makeRng`, `RuleRegistry`, `registerStarterRules`, `standardDeck`, `TABLE` already exist in this file from SP2 — add only `deriveScene`.)

- [ ] **Step 2: Run test to verify it passes against current core (projection already exists)**

Run: `bunx vitest run src/pages/table-demo/table-demo.test.ts`
Expected: PASS — projection (Task 1) already backs this; this test locks in the demo's projection contract. Proceed to the page rewrite.

- [ ] **Step 3: Rewrite `src/pages/table-demo/table-demo-page.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import type { PlayerId } from '@/engine/core/scene';
import type { Placement, TableDef } from '@/engine/core/table-def';
import { CardTable } from '@/engine/react';
import { useGameEngine } from '@/engine/react';
import { GameEngine } from '@/engine/core/game-engine';
import { MoveRegistry } from '@/engine/core/moves';
import { registerCoreMoves } from '@/engine/core/moves-library';
import { makeRng } from '@/engine/core/rng';
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import type { DropIntent } from '@/engine/input/table-input-context';
import { initApp } from '@/utils/init-app';
import { standardDeck } from './deck';

export const TABLE: TableDef = {
  players: ['me', 'opp'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 }, visibility: 'secret' },
    { id: 'hand', layout: 'fan', transform: { x: 0, y: 300 }, layoutOptions: { fanAngleDeg: 24 }, owner: 'me', visibility: 'owner', ordering: 'free' },
    { id: 'discard', layout: 'pile', transform: { x: 400, y: 0 }, visibility: 'public' },
  ],
};

const VIEWS: (PlayerId | undefined)[] = ['me', 'opp', undefined];
const viewLabel = (v: PlayerId | undefined): string => v ?? 'table';

const overlayButton = (left: number): React.CSSProperties => ({
  position: 'absolute', top: 12, left, zIndex: 10, pointerEvents: 'auto',
});

function createEngine(): GameEngine {
  return new GameEngine({
    tableDef: TABLE,
    rules: registerStarterRules(new RuleRegistry()),
    moves: registerCoreMoves(new MoveRegistry()),
    initial: { cards: standardDeck(), data: {}, rng: makeRng(20260709) },
  });
}

function DemoContent() {
  const [engine] = useState(createEngine);
  const { state, dispatch, undo } = useGameEngine(engine);
  const [viewIdx, setViewIdx] = useState(0);
  const viewer = VIEWS[viewIdx];
  const placement: Placement = { cards: state.cards };

  const onDrop = (i: DropIntent) => {
    if (!i.toZoneId) return; // rejected → snaps back automatically
    dispatch({ type: 'move', cardId: i.cardId, toZone: i.toZoneId, slot: i.slot });
  };

  const onCardClick = (id: string) => {
    dispatch({ type: 'flip', cardId: id });
  };

  const deal5 = () => dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 5 }); // face-down
  const shuffleDeck = () => dispatch({ type: 'shuffle', zoneId: 'deck' });
  const cycleView = () => setViewIdx((n) => (n + 1) % VIEWS.length);

  return (
    <>
      <CardTable tableDef={TABLE} placement={placement} viewer={viewer} onDrop={onDrop} onCardClick={onCardClick} />
      {/* OverlayContainer sets pointer-events:none; interactive UI must re-enable it. */}
      <button style={overlayButton(12)} onClick={deal5}>Deal 5</button>
      <button style={overlayButton(88)} onClick={shuffleDeck}>Shuffle deck</button>
      <button style={overlayButton(196)} onClick={undo}>Undo</button>
      <button style={overlayButton(260)} onClick={cycleView}>View as: {viewLabel(viewer)}</button>
    </>
  );
}

export function TableDemoPage() {
  const option = useMemo(() => ({ fullScreen: true, limitEntireViewPort: false }), []);
  return <Wrapper option={option} initFunction={initApp}><DemoContent /></Wrapper>;
}
```

Note: dealing is now face-down (no `faceUp`), and `onDrop` no longer flips cards face-up when they land in the hand — the owner sees the face-down hand via projection (`viewer='me'`), while `viewer='opp'` sees backs. Clicking a card still toggles its authoritative `faceUp` (turning it face-up on the table reveals it to all).

- [ ] **Step 4: Run the demo test, full suite, typecheck, and build**

Run: `bunx vitest run src/pages/table-demo/table-demo.test.ts && bun run test && bun run typecheck && bun run build`
Expected: PASS (all tests); typecheck clean; build succeeds.

- [ ] **Step 5: Verify the demo in the browser**

The controller performs this. Confirm: default view is "me" — after **Deal 5**, the hand shows five **face-down** cards that are rendered **face-up to "me"**; clicking **View as** cycles me → opp → table; in **opp** the hand shows **backs** (hidden), in **table** it shows faces (god view); the deck is always backs; **Undo**/**Shuffle** still work; dragging deck→discard still lands a card.

- [ ] **Step 6: Commit**

```bash
git add src/pages/table-demo/table-demo-page.tsx src/pages/table-demo/table-demo.test.ts
git commit -m "feat(demo): face-down hand + View-as toggle to show per-player projection

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** reveal predicate + faceUp-reveals-all + default-public + owner/secret + revealTo (T1 `isRevealed`); masking with `faceKey='back'` + `faceUp:false` + `data` scrub keeping x/y + id/slot preserved (T1 `projectCard`/`keepPositionalOnly`); `undefined` viewer identity / backward-compat (T1 + retained identity test); projected `faceUp = isRevealed` (T1 projection tests); viewer wiring through `CardTable`/`init-app`/`deriveScene` (T2); demo face-down deal + View-as toggle (T3).
- **Purity:** projection never mutates the input placement (T1 test); `derive-scene.ts` stays in `core/` (no pixi/react/DOM, no Math.random/Date.now).
- **Render-only:** the drop pipeline still uses authoritative `currentCards` in `init-app` — Task 2 must NOT route projected cards into drop resolution.
- **Out of scope (unchanged):** full GameState projection / rng+data scrub (SP4); drag authority by seat; id anonymization; Hanabi inversions.
- **Type consistency:** `isRevealed`/`projectCard` signatures identical across T1 uses; `viewer?: PlayerId` identical across `setTable` (app-components/init-app) and `CardTableProps` (T2).
