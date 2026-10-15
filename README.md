# turnhout

A rendering-and-interaction engine for **web-based card & board games**, built on the [@ue-too](https://www.npmjs.com/org/ue-too) PixiJS + React integration and driven by a declarative scene.

turnhout renders cards and zones, animates deals/flips/moves, and emits interaction *intents* (`onDrop`, `onCardClick`, `onHover`). It does **not** own your game rules — you describe a table as data, turnhout draws it and tells you what the player did.

> **Status:** grown from a card *visual engine* into a toolkit for card-game development: a game-state engine, a flow engine, per-player views, a server-authoritative sync core, and a plain-text language for designing games. Online play is next. See [Roadmap](#roadmap).

## Highlights

- **Declarative & serializable.** A table is plain JSON: a static `TableDef` (zones) plus a dynamic `Placement` (cards). Save it, load it, send it over the wire.
- **Semantic zones.** Zones carry `owner`, `visibility` (`public`/`owner`/`secret`), `capacity`, `ordering`, and serializable accept-rules — enough to express trick-takers, TCGs, solitaire, and hidden-role games.
- **Pluggable rules.** Drop-legality lives in a `RuleRegistry` of named, unit-testable predicates (`descAltColor`, `sameSuitAscending`, `matchRankOrSuit`, `byTag`, `emptyOnly`, …). Reference them by name from a `ZoneDef`.
- **Framework-free core.** All layout, geometry, hit-testing, tweening, and reconciliation live in a pure `core/` with no PixiJS/React/DOM imports and no `Math.random`/`Date.now` — deterministic and testable in isolation.
- **Thin adapters.** `pixi/` renders, `input/` handles pointers (a custom KMT stack), `react/` bridges via `<CardTable>`.
- **Game-state engine.** A `GameEngine` owns the full truth: a `GameState` changed only by registered, seeded, deterministic `Move`s, with a move log, undo and replay.
- **Flow engine.** Turn order, phases, triggers and end conditions are declarative data (`FlowDef`) with behavior registered by name in a `FlowRegistry`, so legality and consequences are not hand-rolled in game code.
- **Per-player views.** `deriveScene(tableDef, placement, viewer)` hides the faces a viewer may not see (private zones, face-down cards) while keeping card ids stable for animation.
- **Net layer.** A `GameServer` validates each move and sends every seat only its own projected view over a `Channel`; `GameSession` and the loopback channel run a whole table in one page. (The transport is in-process today; there is no online play yet.)
- **Designer language.** A game is written as plain, readable text (cards, table, setup, phases, moves, scoring and worked `Example:`s), checked against a phrase library with hints for anything it does not know, and playtested on every seat in the browser. See [Designing a game](#designing-a-game).

## Architecture

```
Consumer app  ──(TableDef + Placement)──►  turnhout
                                             │
        ┌────────────────────────────────────┼───────────────────────────────┐
        │  core/  (pure, no pixi/react/DOM)   │                               │
        │   scene · table-def · layout · zone-geometry · rules · diff         │
        │   tween · choreography · hittest · derive-scene · table-model       │
        │   game-state · game-engine · moves · rng · flow (+ registry)        │
        │   lang/  (designer language: outline · phrases · compile · runtime) │
        └───────┬───────────────┬───────────────┬───────────────────────────-┘
                │               │               │
            pixi/  (view)   input/ (KMT)    react/ (<CardTable>)

        net/  GameServer ──(per-seat projected views)──► GameSession / Channel
```

**The central idea:** the authoritative table state and what any one viewer *sees* are separate. The game-state engine holds the full truth; `deriveScene(tableDef, placement, viewer?)` projects it into a renderable `Scene` for one viewer, hiding what that viewer may not see (with no viewer it is the omniscient identity). The net layer sends each seat only its own projection, never the full state. Rendering and drop hit-testing both flow through the same layout math, so drop targets can't drift from what's drawn.

**Games as text.** `core/lang` reads a designer's rules into a compiled game, builds a `GameEngine` and `FlowDef` from it, and runs its `Example:` blocks on the real engine. It stays pure like the rest of `core/`; the designer page in `pages/designer/` is the view on top of it.

## Getting started

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev        # Vite dev server: the Hearts demo and the game designer
bun run test       # vitest (happy-dom)
bun run typecheck  # tsc --noEmit
bun run build      # tsc --noEmit && vite build
```

The app has two pages: the Hearts demo at `/` (four seats over loopback channels), and the game designer at `/#designer`.

## Designing a game

```bash
bun run dev        # then open http://localhost:5173/#designer
```

The designer page is a text editor for the rule language, with a line-numbered editor, a list of problems (each with a hint), and the results of the game's own `Example:`s. It checks the text as you type and keeps it in your browser.

- Start from a sample: **Load sample** has Hearts, Color Match, Rent Day and Venom (`src/games/hearts.rules`, `src/games/color-match.rules`, `src/games/rent-day.rules`, `src/games/venom.rules`).
- A phrase the language doesn't know yet is flagged with the closest phrases it does know. **Copy for developer** copies a stub for a developer to implement; designers don't write code.
- A name the rules never defined (a zone, phase, move, card value or attribute) is flagged with the closest names they do define, for the designer to fix.
- **Play** is available once the rules read cleanly. It puts every seat on one screen (pick the player count first when the game allows a range), with undo and restart. Editing the rules ends the playtest; Play starts a fresh game under the new rules.
- **Download** and **Upload** move the text to and from a `.rules` file.

**Board games.** A game can have a `Board:` section: a table of spaces for the pieces to loop round (a `color` column is drawn as a band on the space), a piece for each player, numbers each player holds (money, say) and dice. In a phase, each `A player may …` line becomes a button on that seat's panel, greyed with the reason on hover while it is not allowed. `When a piece passes …` and `When a player lands on …` rules run as pieces move. Each seat's panel in the playtest draws the board with its pieces and owners, a line with everyone's numbers, and the seat's buttons. `src/games/rent-day.rules` is a 2 to 8 player property-trading game written this way, with 70 examples:

```
Phase: playing
  A player may roll the dice.
    Only if they have not rolled this turn.
    Then:
      Roll the dice.
      Their piece moves forward by the roll.
  When a player lands on a tax space:
    They pay its tax.
```

**Things that change during play.** A game can say what its spaces and cards may come to have, and then rules and examples can use it:

- `Spaces can have houses and a hotel.` A plural noun is a count that starts at 0; "a hotel", or an adjective such as "poisoned", is a yes or no that starts at no. A space's counts are drawn on the board as small squares (up to 4, then one square and the number) and its yes-or-no facts as red blocks, and pointing at the space lists them. A yes or no that no bank item goes with (`Spaces can be mortgaged.`) stripes the space instead of drawing a block, while a yes or no the bank has items for (the hotel) keeps its block.
- `Cards can be poisoned.` The same for cards: a card's face shows what is set, so a card's health and "poisoned" show on it without anything else written. `src/games/venom.rules`, a two-player card game, is built on this: a Viper poisons the other camp, and a poisoned card loses health each time its owner plays.
- `The bank has 32 houses and 12 hotels.` Supplies the game takes from and gives back to; the playtest shows what is left (`bank: 31 houses, 12 hotels`).

**Facts about players.** A game can say what a player may come to be or have: `Players can be in jail.` is a yes or no (that starts at no), `Players can have jail turns.` is a count (that starts at 0), and rules and examples then use them like a space's facts. What is true of a player is public, so every seat sees it: after the player's numbers on the line under the board (`p0 1,450 money · in jail · 1 jail turn`), in the title of the space they stand on, and as a ring round their piece on the board while any of their yes-or-no facts is on. A player who is out shows only `out`.

**Doubles.** `There are two six-sided dice.` makes `they rolled a double` (their own last roll this turn) and `they have rolled 2 doubles this turn`, `3 doubles`, `fewer than 3 doubles` available to the rules. A double needs exactly two dice: a game with another number of dice that says "double" gets an error on that line. An example fixes the rolls to come with `the next roll is 3 and 3` and, after it, `the roll after that is 1 and 2`.

**Cards that say what they do.** A board game may have `Cards:` and `Table:` sections too. A deck's `says` column holds sentences, each a line about the player who draws the card; "it" is the space their piece is on, read again for each sentence. A sentence the library doesn't know is flagged on the card's row. `They draw from the chance pile and do what it says.` puts the card at the bottom of the pile afterwards, unless it said `They keep this card in their kept cards.` A button gives a kept card back with `A Get Out Of Jail Free from their kept cards goes to the bottom of the pile it came from.`, which means the pile its deck starts in. Moves: `Their piece moves forward to Go.` passes every space on the way, Go included; `Their piece moves forward to the nearest station.` goes to the first one ahead; `Their piece moves back 3 spaces.` passes nothing. Money between players: `They pay 50 money to each other player.`, `They get 50 money from each other player.` and `They pay 25 for each of their houses.` In the playtest, the last card drawn is shown in the middle of every board, and kept cards follow the player's numbers (`p0 1,500 money · Get Out Of Jail Free`). A board game whose phases move no cards by hand shows no card table.

**Raising money.** `Any player may …` makes a button every seat may press, whoever's turn it is; its `Only if` lines still decide. It never passes the turn: an After line can't name it, and `they have … this turn` never counts it. A payment that leaves a player below 0 notes whom they owe, a player or the bank; the latest such payment wins, and the debt lasts while they are below 0. Rules and examples can ask `they have less than 0 money`, `no player has less than 0 money` (players who are out don't count) and `they owe the bank`, and an example says `p0 owes p1` or `p0 owes the bank`. `Everything they own goes to the player they owe.` hands a player their spaces, facts and all, and the cards they keep in view; to the bank, spaces become unowned and cards go under their own piles. Percentages round down: `They get 50% of its price.`, `They pay 55% of its price.` and `they have at least 55% of its price in money`. Space flags: `Spaces can be mortgaged.`, then `It is mortgaged.`, `It is not mortgaged.`, `Their spaces are no longer mortgaged.`, `it is mortgaged` and `Rose Lane is mortgaged`. The bank and buildings: `the bank has at least 4 houses`, `it gets 4 houses from the bank`, `one of its houses goes back to the bank`, `its hotel goes back to the bank`, `it has a house` and `no street of its color is mortgaged`. In the playtest, a debt follows the player's numbers (`p0 -4 money · owes p1`), a mortgaged space is striped on every board, and an "Any player may" button is live on every seat that may press it.

**Saying a button was pressed.** `they have rolled this turn` means any roll button was pressed, so a game with `A player may roll the dice.` and `A player may roll for a double.` reads "rolled" as either. To name one, write its whole wording in the past: `they have rolled for a double this turn`.

**Buttons that pick a space.** A button whose line ends in "on a …" (`A player may build a house on a street they own.`) asks the player to pick a space. In the playtest, pressing it puts a banner with the question and a Cancel button above the board; the streets the player may pick are outlined, the ones the rules refuse are dashed (click one to see why) and the rest fade. A button with nothing to pick, because the player owns no street, say, stays greyed and says so on hover.

**Column sections.** A section named after a column of the board table (`Rent:`) says what "its rent" means for each kind of space, so a station's rent can grow with the stations its owner has while a street's comes from its houses:

```
Rent:
  A street's rent depends on its houses and hotel.
  A street in a full set with no buildings has double rent.
  A station's rent is 25, 50, 100 or 200 when its owner has 1, 2, 3 or 4 stations.
```

A taste of the language (from `src/games/color-match.rules`):

```
Game: Color Match
Players: 2 to 5

Phase: playing
  Hint: Play a card matching the color or number, or draw one.
  Players take turns.
  A player may play a card from their hand to the discard pile.
    Only if one of:
      the card has the same color as the top card of the discard pile
      the card has the same number as the top card of the discard pile
```

## Adding a phrase (developers)

A line the library doesn't know comes with **Copy for developer**, a stub ready to paste:

```ts
// Requested by a designer — game "Hearts", line 15:
//   "Shuffle the deck twice"
library.effect('shuffle {zone} twice', (env, [a1]) => {
  throw new Error('not implemented yet');
});
```

1. **Pick the file** in `src/engine/core/lang/library/`. Each has one `register…Phrases(lib)` function, a chain of `lib.<kind>(pattern, fn)` calls: `setup-phrases.ts` (`registerSetupPhrases`: Cards: and Table: lines), `flow-phrases.ts` (`registerFlowPhrases`: zones, effects, turn order, scoring, winners), `move-phrases.ts` (`registerMovePhrases`: the card being moved), `standard-deck.ts` (`registerStandardDeckPhrases`: suits and ranks), `example-phrases.ts` (`registerExamplePhrases`: Given/When/Then) or a game's own file such as `hearts.ts`. A new file's register function goes in `REGISTRARS` in `library/index.ts`.
2. **Paste the stub into the chain** as `.effect('shuffle {zone} twice', (env, [zone]) => …)` and write the body: a pure function of `env` (state, compiled game, seats) and the arguments, already resolved from `{zone}`, `{card}`, `{int}`…; callback types are in `lang/types.ts`. Randomness only through `state.rng`.
3. **`needsMove`.** A condition or effect that reads the move being judged (`env.move`, or `currentMove`/`movedCard` from `library/support.ts`) is registered with `{ needsMove: true }`, so the compiler only allows it under `A player may …`.
4. **Designer problems throw `RuleError`** (`lang/diagnostics.ts`) in plain words, like `throw new RuleError('There are no cards left in the deck.')`: the designer sees that message on the line. Anything else thrown is reported as a bug in the phrase.
5. **Add a unit test** in the file's `.test.ts`: set up cards with `fixtureCard`/`fixtureState`/`fixtureEnv` from `lang/testing.ts` and run the sentence as a designer writes it, `runPhrase(createDefaultLibrary(), 'effect', 'shuffle the deck twice', env)`.

## Describing a table

```ts
import type { TableDef, Placement } from '@/engine/core/table-def';

const table: TableDef = {
  players: ['me'],
  zones: [
    { id: 'deck',    layout: 'pile', transform: { x: -400, y: 0 }, visibility: 'secret' },
    { id: 'hand',    layout: 'fan',  transform: { x: 0, y: 300 }, owner: 'me', visibility: 'owner', ordering: 'free' },
    { id: 'discard', layout: 'pile', transform: { x: 400, y: 0 }, visibility: 'public' },
    // a solitaire foundation: only accepts a same-suit ascending run
    { id: 'foundation', layout: 'pile', transform: { x: 400, y: -300 },
      capacity: 13, accept: { rule: 'sameSuitAscending' } },
  ],
};

const placement: Placement = {
  cards: [{ id: 'AS', zoneId: 'deck', faceUp: false, faceKey: 'AS', data: { suit: 'S', rank: 1 } }],
};
```

Render it with the React bridge:

```tsx
<CardTable
  tableDef={table}
  placement={placement}
  onDrop={(intent) => { /* apply your rules; update state */ }}
  onCardClick={(id) => { /* e.g. flip */ }}
/>
```

turnhout emits a `DropIntent` when a card is released; **you** decide whether/how to mutate your state. Flip is declarative via `CardState.faceUp`.

## Zone layouts & rules

- **Layouts:** `pile`, `fan`, `row`, `grid`, `free` (per-card `data.x`/`data.y`).
- **Accept-rules:** reference a registered rule by name. Register the starter set (or your own) on a `RuleRegistry`:

```ts
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';

const registry = registerStarterRules(new RuleRegistry());
registry.register('myRule', ({ card, top, zoneCards }) => /* boolean */ true);
```

Validate a table before use with `validateTableDef(tableDef, registry)`.

## Project layout

```
src/
  engine/
    core/     pure engine: scene/table-def types, layout, zone-geometry,
              rules(+library), hittest, tween, choreography, diff,
              derive-scene, table-model reconciler,
              game-state, game-engine, moves(+library), rng,
              flow(+registry, library, validation)
      lang/   designer rule language: outline parser, phrase library,
              compiler, example runner, engine build
    net/      GameServer, GameSession, Channel protocol, loopback channel
    pixi/     PixiTable view, card sprites, face-texture cache,
              standard and text card faces
    input/    pointer tracker, KMT state machine + parser (Pixi federation off)
    react/    <CardTable> declarative bridge
  games/              Hearts, Color Match, Rent Day and Venom, written in the designer language
  pages/
    table-demo/       deck + demo page
    hearts-demo/      four-seat Hearts over loopback channels
    net-demo/         net-layer demo game
    designer/         the designer page: editor, problems, examples, playtest
  utils/init-app.ts   app wiring (registry, camera, input, deriveScene)
docs/superpowers/      design specs & implementation plans
```

## Conventions

- **Card world size:** `CARD_WIDTH = 100`, `CARD_HEIGHT = 140` (world units).
- **`core/` is pure:** no `pixi.js`/`react`/`@ue-too/*`/DOM imports; no `Math.random`/`Date.now` (jitter uses an id-hash; time is injected).
- **Interaction contract:** the engine emits intents and never mutates consumer state.

## Roadmap

turnhout is built as dependency-ordered sub-projects, each with its own design spec and plan under `docs/superpowers/`:

1. **Semantic zone model + serializable table schema** — ✅ shipped (this is what the sections above describe).
2. **Authoritative game-state + move engine** — ✅ shipped: full-truth state, deterministic seeded moves, reducer, undo and replay.
3. **Per-player view projection** — ✅ shipped: `deriveScene(state, viewer)` hides unseen faces and private zones.
4. **Net sync core** — ✅ shipped: client move → server validation → per-player projected views, over a transport-agnostic channel (loopback in-process).
5. **Rule engine** — ✅ shipped: declarative turn/phase flow, triggers and end conditions.
6. **Designer rule language** — ✅ shipped: games written as readable text, example checks, and an in-browser playtest page (see [Designing a game](#designing-a-game)).

**Next:**

- **Online play** — a real transport and rooms on top of the net core (a Cloudflare Durable Object per room is the intended fit).
- **Tokens and meeples** — 🚧 in progress: non-card pieces, in the engine and in the designer language. Slice 1 (a board to loop round, pieces, dice, numbers such as money, buttons, and the Rent Day sample to play it), slice 2 (sets and buildings: buttons that pick a space, facts on spaces and cards, a bank, `Rent:` sections, houses and hotels on the board, and the Venom sample), slice 3 (doubles and jail: facts about players, doubles, done-wordings, and jail in Rent Day), slice 4 (Chance and Treasury cards: cards whose `says` column holds rules, drawing, keeping and using a card, moves that pass Go, and money between all players) and slice 5 (raising money: buttons any player may press at any time, debts and whom they are owed to, percentages, yes-or-no space facts such as a mortgage, selling buildings back, and giving up to a player or to the bank) have shipped; the slices after them are laid out in [the board games overview](docs/superpowers/specs/2026-10-15-board-games-overview-design.md).

## Tech stack

TypeScript · Vite · React 19 · PixiJS 8 · Bun · vitest + happy-dom · `@ue-too/*`.
