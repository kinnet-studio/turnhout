# Networking / Authority / Sync — Design

**Status:** Approved (design), pending implementation plan.
**Sub-project:** 4 of 4 in the turnhout multiplayer card-toolkit roadmap.
**Date:** 2026-07-09.
**Builds on:** SP1 (zones) + SP2 (game-state engine) + SP3 (view projection), all merged to `main`.

## Context

SP2 gave turnhout an authoritative `GameEngine`; SP3 gave it real per-player
`deriveScene` projection. SP4 ties them into a **server-authoritative sync
layer**: a client submits a move, the server (holding the single `GameEngine`)
validates + applies it, projects the new state per player (SP3), and pushes each
client only their own projected view.

### The key model (and what it is NOT)

Untrusted player clients **cannot** replay the authoritative move log: they lack
opponents' hidden cards and the RNG seed (and if they had them they could cheat).
So `GameEngine.loadLog` is the sync primitive only for *trusted* replicas (server
persistence, spectators-of-all) — **not** for player clients. The client-facing
model is server-authoritative push:

```
client → Move  →  server GameEngine: validate (legal) + apply + log
               →  project per player (SP3 deriveScene + turn)
               →  push each client ONLY their own projected view
```

The client is a thin renderer of its projection plus an input source; it holds no
engine.

### Scope (decided in brainstorming)

Build the **transport-agnostic authoritative sync core** + a message protocol +
an **in-process loopback transport**, proven with a **local two-seat side-by-side
demo**. Fully unit-testable and browser-verifiable like SP1–3. The real
WebSocket / Cloudflare Durable Object transport is a documented adapter for a
follow-up — the core is built so it drops in without changes.

### Roadmap position

| # | Sub-project | Status |
|---|---|---|
| 1 | Semantic zone model | ✅ shipped |
| 2 | Game-state + move engine | ✅ shipped |
| 3 | Per-player view projection | ✅ shipped |
| **4** | **Networking / authority / sync** (this spec) | Authoritative `GameServer` + protocol + loopback transport + two-seat demo. |

## Architecture

A new pure `src/engine/net/` layer (same purity rules as `core/`: imports `core/`,
but no `pixi.js`/`react`/`@ue-too/*`/DOM, no `Math.random`/`Date.now`).

### GameServer (`net/game-server.ts`)

Owns the authoritative `GameEngine`; turns per-player submissions into per-player
projected views.

```ts
interface ClientView {
  seat: PlayerId;      // who this view is for
  scene: Scene;        // deriveScene(tableDef, { cards: state.cards }, seat) — SP3 projection
  turn?: TurnState;    // whose turn / phase (public)
}

interface SubmitResult { ok: boolean; reason?: string; }

class GameServer {
  constructor(args: { engine: GameEngine; tableDef: TableDef; seats: PlayerId[] });
  submit(by: PlayerId, move: Move): SubmitResult;
  viewFor(seat: PlayerId): ClientView;
  subscribe(fn: (seat: PlayerId, view: ClientView) => void): () => void; // per-seat, on change
  seats(): PlayerId[];
}
```

**`submit(by, move)` — the authority boundary:**
1. Stamp `move.by = by`, **overwriting any client-supplied `by`** (a client cannot
   forge its identity).
2. `engine.dispatch(stampedMove)`. The engine's `legal` (SP2) enforces game rules;
   a turn/ownership-aware move handler reads `move.by` to reject out-of-turn or
   unauthorized moves.
3. On success: for every seat, compute its `ClientView` and notify subscribers.
   Return `{ ok: true }`.
4. On rejection (illegal): state/log unchanged; return `{ ok: false, reason }`.
   (No push — the submitter's client re-renders its unchanged view, so a dragged
   card snaps back.)

`viewFor(seat)` projects the current state for a seat via SP3 `deriveScene`
(`viewer = seat`); a non-seat id yields a public-only spectator view. `ClientView`
carries **only `scene` + `turn`** — never raw `state.data` or the RNG — so secret
game vars and the seed never reach a client.

**Authority limitation (documented):** because moves are opaque game data
(`{ type, ... }`), the server cannot generically know which cards a move
references, so it cannot universally block "acting on a card you can't see." That
half of authority lives in each game's move `legal` (using `move.by` + zone
owner). The toolkit guarantees the *identity* (`by`) and the projection; the game
expresses its rules.

### Protocol + transport seam (`net/protocol.ts`)

```ts
type ClientMessage = { type: 'move'; move: Move };
type ServerMessage =
  | { type: 'view'; view: ClientView }
  | { type: 'rejected'; reason: string };

interface Channel {
  send(msg: ServerMessage): void;
  onMessage(cb: (msg: ClientMessage) => void): void;
  close(): void;
}
```

All messages are JSON-serializable, so the same protocol runs over a real
WebSocket later. `Channel` is one connection's duplex end; the future
WebSocket/Durable-Object adapter implements `Channel` (`socket message →
onMessage`; `send → socket.send(JSON.stringify(...))`).

### GameSession (`net/game-session.ts`)

Wires a `GameServer` to channels; maps seats ↔ channels.

```ts
class GameSession {
  constructor(server: GameServer);
  connect(seat: PlayerId, channel: Channel): () => void; // returns disconnect
}
```

On `connect(seat, channel)`:
- immediately `channel.send({ type: 'view', view: server.viewFor(seat) })`;
- route `channel.onMessage`: on `{ type:'move', move }` → `server.submit(seat, move)`;
  if `!ok`, `channel.send({ type:'rejected', reason })`;
- subscribe to the server and, on each per-seat view change, `send` that seat's
  `ClientView` to its channel.

Re-`connect`ing a seat replaces its channel and re-pushes the current view
(**reconnection** falls out). A **spectator** connects with a non-seat id →
public-only view. The returned disconnect removes the channel + its server
subscription.

### Loopback transport (`net/loopback.ts`)

```ts
function loopbackChannel(): { near: Channel; far: Channel };
// near.send delivers to far's onMessage cb; far.send delivers to near's; in-process.
```

Proves the full round-trip deterministically, for tests and the local demo. (Passes
message objects directly; a real transport would JSON round-trip.)

## Client role (thin) & demo

**The client holds no engine.** It renders the projected scene the server pushes
and sends moves up. This needs **no new render API**: the client passes the public
static `tableDef` + `placement = { cards: view.scene.cards }` + `viewer={undefined}`
to `<CardTable>`. Because the server already projected the cards, the
`undefined`-viewer identity path (SP3) renders them as-is — no double projection,
and the client never receives hidden cards. The client's `onDrop` **submits a move
to the server** (`channel.send({ type:'move', move })`) instead of dispatching
locally; the authoritative view returns and re-renders.

### Demo — two seats, side-by-side, live (`net-demo` page)

One page, one shared `GameServer` + `GameSession`, **two `<CardTable>` canvases**
(seats `me` and `opp`), each connected via its own `loopbackChannel`:

- `TABLE` has `players:['me','opp']` with **two hands** (`hand-me` owner `me`,
  `hand-opp` owner `opp`, both `visibility:'owner'`) plus a shared `deck` (secret)
  and `discard` (public).
- Each canvas renders its seat's pushed `ClientView`: it sees **its own** hand
  faces and the **opponent's** hand as backs (SP3 projection, done server-side).
- Dragging a card in the `me` canvas → `onDrop` submits a move on `me`'s channel →
  the server validates + applies + pushes new views to **both** channels → both
  canvases update live. You visibly see `opp`'s hand stay hidden while `me` plays.
- **Authority shown:** the demo registers an ownership-aware move (its `legal`
  requires `move.by` to own — or share — the card's current zone), so a move
  submitted by the wrong seat is **rejected** by the server and the card snaps
  back. The plan will finalize the exact rule and how the demo triggers a
  rejection.

Implementation note (main wiring risk): two Pixi canvases coexisting on one page
means the demo cannot use `fullScreen` — it needs two sized/embedded canvases
side-by-side. The plan handles the `PixiCanvas`/`initApp` sizing.

## Components (units & interfaces)

| Unit | File (new) | Responsibility |
|---|---|---|
| Server | `src/engine/net/game-server.ts` | `GameServer`, `ClientView`, `SubmitResult`. |
| Protocol | `src/engine/net/protocol.ts` | `ClientMessage`, `ServerMessage`, `Channel`. |
| Session | `src/engine/net/game-session.ts` | `GameSession` (connect/reconnect/spectator/disconnect). |
| Loopback | `src/engine/net/loopback.ts` | `loopbackChannel`. |
| Demo | `src/pages/net-demo/*` (new) | two-seat side-by-side demo over loopback. |

## Testing

Pure-core units, `vitest`, deterministic:

- **GameServer:** `submit` stamps `by` (a client-supplied `by` is overwritten — a
  client can't act as another player); a legal move applies and every seat's
  `viewFor` reflects it; an illegal/unauthorized move returns a reason with
  state/log unchanged; `viewFor` projects per seat (owner sees hand faces,
  opponent sees masked backs); a spectator id sees public only; `ClientView`
  never contains `data`/rng; `subscribe` fires per seat on change and the
  unsubscribe stops it.
- **GameSession + loopback:** `connect` pushes the initial view to the channel; a
  `move` sent on a channel routes to `submit` and both seats' channels receive
  updated views; a rejected move sends `{type:'rejected'}` to the submitter's
  channel only (no view push); reconnecting a seat re-pushes the current view;
  disconnect stops further pushes; a spectator channel receives public-only views.
- **Authority:** a move whose payload includes a forged `by` is applied as the
  connection's seat; an ownership-aware demo move rejects a cross-seat submission.
- **Demo:** controller browser-verify — two-seat live sync (a play in `me` updates
  both; `opp`'s hand stays hidden) and a visible authority rejection.

## Out of scope (deferred)

- The real WebSocket / Cloudflare Durable Object adapter + `wrangler` deploy
  (a `Channel` impl + one `GameSession` per room DO — no core changes). Uses the
  durable-objects / wrangler skills.
- Client-side prediction / optimistic UI (SP4 is server-authoritative, no
  prediction; card games tolerate the round-trip).
- Projecting a *public subset* of `state.data` into `ClientView`.
- Server-enforced "can't-touch-unseen-card" (stays a game responsibility).
- Matchmaking / lobbies; persistence beyond the in-memory log; auth/identity of
  real users.
- Carried SP2/SP3 deferred items (fail-closed unknown zones, `getLog` defensive
  copy, `deal.count` validation, masked-card `revealTo` scrub) — fold in
  opportunistically where SP4 touches them.
