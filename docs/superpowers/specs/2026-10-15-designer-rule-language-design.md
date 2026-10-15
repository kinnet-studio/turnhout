# Designer Rule Language — Design

**Date:** 2026-10-15
**Status:** Approved design, pending implementation plan
**Builds on:** semantic zones, game-state engine, view projection, net sync, and the
rule engine (game flow) — all merged to `main`.

## Why

turnhout can run a card game, but every game is hand-written TypeScript: Hearts is
`cards.ts` (the deck), `game.ts`/`cards.ts` (the table layout), `moves.ts` (what is
legal), and `flow.ts` (turns, triggers, scoring). A board game designer with an idea
cannot try it without a developer coding the whole thing first.

This project lets a **designer describe a whole game in readable, Gherkin-style text**
— the cards, the table, what players may do, how turns and phases work, how it ends
and is scored — and **playtest it in the browser straight away**. The loop we are
optimising is: write a rule → play → notice something off → change the sentence →
play again.

The text is made of **phrases from a library that developers maintain**, each phrase
backed by code. When a designer writes a phrase the library does not have, turnhout
says so with a hint (closest existing phrases, plus a ready-made code stub), and a
developer implements it — the same loop as Cucumber's "undefined step" snippets, but
in our own format.

The same text also holds **examples**: short scenarios ("p2 plays the queen of spades
while holding a club → rejected") that check the rules do what the designer meant.
They run in the editor and in `bun run test`.

### Roadmap position

1. **This project** — designer rule language, phrase library, missing-phrase hints,
   examples, and a playtest page with every seat on one screen (loopback, like the
   Hearts demo).
2. **Later, separate projects** (order to be agreed):
   - **Online play** — a real transport (WebSocket + hosted server; a Cloudflare
     Durable Object per room is the intended fit, per the net-sync spec's deferred
     section) so playtesters on different machines can join.
   - **Tokens, meeples and boards** — non-card pieces, quantities, board spaces.

## Decisions (made by the user)

1. **Designers describe the whole game** in the language: components, table, moves,
   flow, scoring.
2. **Readable like Gherkin, but our own format.** No Cucumber, no Gherkin parser, no
   `.feature` files.
3. **Compile-time phrase check.** The compiler checks every phrase against the
   library. Unknown phrases get a hint; **a developer implements the missing
   phrase**. Designers do not write code.
4. **Both rules and examples.** The language describes the game *and* executable
   examples that check it.
5. **Purpose: quick playtesting in the browser** (and later in an app shell).
6. **Cards only** in this project. Tokens/meeples are a separate project.
7. **Order:** this project first; online play and non-card pieces after.
8. **Two proof games.** Hearts, plus a second, non-Hearts game that exercises what
   Hearts does not (custom cards, other player counts), so the language is not shaped
   around one game.
9. **Editing the rules during a playtest means a full restart.** The game in progress
   is discarded; Play starts a fresh game under the edited rules.

## Calls made in this design

Proposed in conversation and accepted:

- A game with unknown phrases **cannot be played** yet; examples still run where they
  can (see *Examples*).
- **Developers add phrases in TypeScript**, registered by pattern the same way accept
  rules, moves and flow steps are registered today.
- **Hearts is a proof**, rewritten in the language, behaving like the hand-coded
  version (existing Hearts tests are the yardstick).
- **English only** to start.
- **The language compiles to the existing engine.** `GameEngine`, `FlowDef`,
  `gateMove`/`runFlow`, replay/undo, `GameServer`, view projection — all reused. The
  compiler produces a `TableDef`, starting cards, move handlers, and a `FlowDef` +
  `FlowRegistry`. Only small, additive engine changes (listed under *Engine
  additions*).

Made while writing this (the user has not yet weighed in):

- **Matching is exact, never guessed.** A line either matches a library pattern
  (case-insensitive, whitespace-normalised, trailing period optional) or it is
  unknown. Fuzzy matching is used only to *suggest* phrases in hints. No AI or
  natural-language interpretation at compile time.
- **The kind of phrase is decided by where the line sits** (a condition under "Only
  if", an effect under a "When …:" block, a scoring line under "End", …). This keeps
  patterns short and lets the stub generator know what kind of code to write.
- **"And" between conditions is by lines, not words.** Several "Only if" lines must all
  hold; an "Only if one of:" block holds when any of its lines does. No parsing of
  "and"/"or" inside a line, because phrases legitimately contain those words ("the 2
  of clubs and the queen of spades").
- **Moves are drags** in this project: a move is "drag a card from zone A to zone B",
  plus rearranging within a hand. Click/tap actions (flip, draw-by-click) come later.
- **Zone positions are automatic.** Designers say "in the center" or "each player
  has…"; a layout routine places zones around the table by seat. No coordinates in
  the language.
- **Player count** is a number or a range ("Players: 3 to 5"); the playtest picks a
  count within it, and per-player zones expand to that many seats at compile time.
- **Rule text is saved in the browser** (auto-save) with download/upload of the text
  file. No accounts or server storage.
- **The hand-coded Hearts demo stays** as the reference until the compiled version is
  proven; retiring it is a later decision.
- **Rules written under a phase apply only in that phase.** A `When …:` trigger or an
  `After …` line inside `Phase: playing` fires only while the phase is `playing`
  (compiled by combining its condition with a phase check, since `FlowDef` triggers
  are global today). Rules outside any phase apply in every phase.
- **Engine rejections are reworded for players.** Besides the designer's own "Only
  if" sentences, the gate's messages are translated: "not p2's turn" → "It's p1's
  turn", "move pass not allowed in phase playing" → "You can't pass during playing",
  "game is over" → "The game is over".
- **Examples run with the game's player count** (the smallest number when it is a
  range) unless a Given says otherwise ("Given 5 players").
- **The second proof game is Color Match** (described under *Proofs*): an original,
  unbranded shedding game — match the top discard's color or number, or draw — with
  a custom deck and 2 to 5 players.
- **Card tables allow a range in a cell** (`1 to 9`), expanding to one row per value,
  so a 72-card deck is four lines rather than thirty-six.
- **Each card set says where it starts** ("…, starting in the draw pile").

## Goals

- A designer can write Hearts — every rule, from deck to scoring — in the language,
  press Play, and play a full hand with four seats on one screen; and the same for
  Color Match at any count from 2 to 5 players.
- Every unknown phrase is pointed at precisely (line, phrase) with up to three
  closest known phrases and a code stub a developer can paste in.
- A developer can add a phrase with one registration call and a pure function, and
  the designer's text starts working after the app is rebuilt.
- Examples written in the same text run in the editor (pass / fail / blocked, with a
  designer-readable reason) and in `bun run test`.
- When a move is rejected during play, the player sees the designer's own sentence
  ("they follow the led suit when they can"), not an engine message.

## Non-goals

- Online play across machines (next project).
- Tokens, meeples, dice, boards, quantities (separate project).
- Designers writing code, or defining new phrases out of existing ones (phrase macros
  — a possible follow-up).
- Click/tap actions; real-time or timed play.
- Continuing a game in progress after the rules are edited (edits restart).
- Languages other than English.
- Multi-round matches with carried-over scores (e.g. Hearts to 100).
- Accounts, cloud storage, sharing links, version history of rule texts.
- A drag-and-drop or form-based rule builder; the text is the interface.
- Replacing the hand-coded Hearts demo in this project.

## Anti-goals (would make this a failure even if it technically works)

- Designers seeing TypeScript errors, stack traces, or engine vocabulary (`FlowDef`,
  `NamedRef`, `zoneId`) in the editor or during play.
- A phrase that does something other than what it reads, or a line that silently
  matches a different phrase than the designer meant. Ambiguity is an error, never a
  guess.
- A compiled game that is not deterministic (breaks undo, replay, and the online
  project).
- Forking or rewriting the engine instead of compiling to it.
- Pulling in Cucumber/Gherkin libraries or `.feature` files.

## Constraints

- **Pure core.** The parser, phrase matcher, compiler and example runner live under
  `src/engine/core/` (no PixiJS/React/DOM, no `Math.random`/`Date.now`), so they run
  in vitest and later on a server.
- **Deterministic.** Compiling the same text with the same library always yields the
  same game. Phrase functions are pure; randomness only through `state.rng`.
- **Wire-safe output.** Everything the compiler emits is `Json` plus names that
  resolve in the phrase library — same rule as `FlowDef` today — so the online
  project can ship the text (or compiled JSON) to every player and server.
- **Opaque card ids.** Generated cards must follow the existing invariant from
  `heartsDeck`: shuffle the card identities with the seeded rng *before* assigning
  ids, so ids do not reveal hidden cards.
- **Existing behaviour unchanged.** All current tests pass; the hand-coded Hearts,
  net and table demos keep working.
- Stack as today: Bun, TypeScript, Vite, React 19, PixiJS 8, vitest + happy-dom.

## What the designer writes

One text file per game, in sections. The example below is **the intended look**, not
a fixed grammar — the builder settles exact keywords and wording (see *Left to the
builder*) — but the shape is the design: named sections, one phrase per line,
indentation for blocks, `|` tables for card lists, `Example:` blocks with
Given/When/Then.

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

Example: must follow suit
  Given the phase is playing
  And it is p2's turn
  And the trick has the 5 of clubs, played by p1
  And p2 holds the 9 of clubs and the queen of spades
  When p2 plays the queen of spades
  Then it is rejected because "they follow the led suit when they can"
```

Custom cards use a table. Every column becomes an attribute phrases can refer to
("the same color as…", "attack 3 or more"); `copies` (optional, default 1) is how many
of that row to make; an optional `name` column gives cards a name phrases can use ("a
Goblin"); a cell may hold a range (`1 to 9`), making one row per value:

```text
Cards:
  A deck called color cards, starting in the draw pile:
    | color  | number | copies |
    | red    | 1 to 9 | 2      |
    | yellow | 1 to 9 | 2      |
    | green  | 1 to 9 | 2      |
    | blue   | 1 to 9 | 2      |
```

### Sections and what they compile to

| Section | Designer says | Compiles to |
|---|---|---|
| `Game:` / `Players:` | name, player count or range | `TableDef.players`, seat ids `p0…pN-1`, seat order (left = next seat) |
| `Cards:` | standard deck, or named decks with attribute tables | starting cards (`CardState[]`) with attributes in `data`, opaque ids, `faceKey` |
| `Table:` | zones, who owns them, who can see them, rough placement | `TableDef.zones` with `owner`, `visibility`, `layout`, `ordering`; positions from the layout routine |
| `Setup:` | effects run once at the start | the first phase's `onEnter` (as Hearts' `setup` phase does today), advancing to the first `Phase:` |
| `Phase: <name>` | hint, who acts, allowed moves, entry effects, transitions, triggers, end of turn | `PhaseDef` (`allow`, `actor`, `anyActor`, `onEnter`, `advance`, `endTurn`) + `TriggerDef`s + declared moves |
| `A player may <verb> a card from X to Y` + `Only if` / `Then:` | a move, its conditions, its follow-up effects | a declared move type, its handler (see *Engine additions*), and its entry in the phase's `allow` |
| `When <condition>:` + lines | something that happens automatically | `TriggerDef` (`when` = condition, `then` = effects) |
| `When <condition>, go to <phase>` | a phase transition | `PhaseDef.advance` |
| `After a player <verb>s, …` | end of turn | `PhaseDef.endTurn` with `after: [<move type>]` |
| `End:` | end conditions, scoring lines, winner rule | `EndDef` (`when`) + a composed result effect writing `{ scores, winner }` to `state.result` |
| `Example: <name>` | Given / When / Then | an example run (not part of the game) |

`Hint:` lines are shown to the player in the seat status bar for that phase (today's
`seatHint` is hand-written per game).

### References inside phrases

Phrases refer to things the designer named, and the compiler resolves them:

- **Zones:** "the trick", "the deck", "their hand" (the acting player's), "each pass
  pile", "the winner's won pile", "the hand of the player on its owner's left".
- **Players:** `p0`…, "they" (the actor), "the winner", "the player holding the 2 of
  clubs", "the player on X's left".
- **Cards:** "the queen of spades", "the 2 of clubs" (standard deck), or a card name
  from a custom table ("a Goblin"); "the card" (the one being moved).
- **Attributes:** any column from a card table ("attack 3 or more").

A reference to a zone name that `Table:` never defined is an error on that line, with
suggestions from the defined names.

## The phrase library (developer side)

A phrase is a **pattern**, a **kind**, and a **pure function**:

```ts
phrases.condition('the {zone} has {int} cards', (state, ctx, { zone, int }) => …);
phrases.effect('deal {int} cards from {zone} to {zones}', (state, ctx, args) => …);
phrases.moveCondition('they follow the led suit when they can', (state, move, ctx) => …);
```

- **Kinds** (one per place a line can appear): card set, table/zone declaration,
  condition (over state), move condition (over state + the move being tried), effect,
  turn order, scoring, end condition, example Given (arrange), example Then
  (assert). Builder may merge or split kinds as the implementation demands.
- **Parameter types:** `{int}`, `{word}`, `{string}` (quoted), plus types resolved
  against the game being compiled: `{zone}`, `{zones}`, `{player}`, `{card}`,
  `{attribute}`, `{phase}`.
- **Identity:** the pattern string is the phrase's stable name. A compiled reference
  is `{ name: <pattern>, params: <captured values> }` — exactly the existing
  `NamedRef` shape, so conditions/effects/turn orders populate a `FlowRegistry`
  directly.
- **Ambiguity:** if a line matches more than one pattern of its kind, that is a
  library bug: the compiler reports it, and a library test asserts that no line in
  any checked-in game text matches two patterns.
- **Where phrases live:** a built-in library (generic phrases: zones, dealing,
  shuffling, counts, turn order, simple scoring, standard-deck vocabulary) plus
  game-specific phrases that developers add on request (Hearts will likely need a
  few, e.g. "they follow the led suit when they can"). All are app-wide; a designer
  can use any phrase in any game.

### What a developer gets for a missing phrase

The hint for an unknown line carries a stub, generated like Cucumber's snippets —
numbers become `{int}`, quoted text `{string}`, names the game defined become
`{zone}`/`{player}`/`{card}` — with the kind taken from where the line sits:

```ts
// Requested by a designer — game "Hearts", line 31:
//   "The winner draws 2 cards"
phrases.effect('the winner draws {int} cards', (state, ctx, { int }) => {
  throw new Error('not implemented yet');
});
```

The designer copies this with one button and sends it to a developer. Once a
developer adds it and the app is rebuilt, the line compiles.

## Compiler

Pure pipeline in `core/`:

1. **Parse** text → an outline of sections, lines, blocks, and tables, each with its
   line number. Indentation and section keywords are the only syntax.
2. **Resolve names** — zones, players, card sets, attributes, phases defined by the
   text; per-player zones expanded to the seat count.
3. **Match** each line against the phrases of the kind its position calls for.
4. **Build** the compiled game: `TableDef`, starting cards, declared moves, `FlowDef`,
   and the examples; references carry their source line so runtime errors can point
   back at a sentence.
5. **Validate** with what exists (`validateTableDef`, `validateFlowDef`) plus
   language checks: unknown phases in "go to", a phase nothing can reach, a game with
   no `End:` (warning), a move whose zones don't exist.

Result: `{ game?: CompiledGame; diagnostics: Diagnostic[] }`. A diagnostic has a line,
the span of text, severity, a designer-readable message, suggestions, and (for
unknown phrases) the stub. `game` is present whenever there are no errors other than
unknown phrases; unknown phrases compile to **placeholders** that throw a
"not implemented" error if evaluated, which is what lets examples run around them.

A second step turns a `CompiledGame` + seat count + seed into a `GameEngine` and
`GameServer`, the same objects `createHeartsServer` builds today.

## Engine additions

Small and additive; existing behaviour and tests unchanged.

- **Declared moves.** A generic `MoveHandler` built from a declared move: the source
  and target zone references (relative to the actor), the move conditions (all must
  hold; an "one of:" block passes if any holds), and follow-up effects. `legal`
  returns the **text of the first failing condition line** as the rejection reason.
  `apply` moves the card (respecting zone ordering and `faceUp` defaults for the
  target's visibility), records who moved it (phrases like "played by", "the winner"
  need to know who played each card), then runs the follow-up effects.
- **Move-condition registry kind.** Move conditions see the move being tried (actor,
  card, from, to), which `FlowPredicate` does not. Add it alongside the existing
  `FlowRegistry` kinds or as its own small registry — builder's call.
- **"Next player already chosen" in `runFlow`.** In Hearts, the 4th play triggers
  "the winner goes next", and then "after a player plays, the turn passes to the
  left" must *not* also fire. Required semantic: if a trigger or phase-entry effect
  chooses the current player during a `runFlow` call, the end-turn step does not fire
  in that call. (Today's Hearts avoids this with the custom `heartsTurnOver`/
  `heartsNext` pair; the language should not need game-specific turn code for it.)
  Builder chooses the mechanism; existing flow tests must keep passing.
- **Condition combinators** for "Only if one of:" and multi-line "When" conditions
  (`allOf`/`anyOf`), unless the builder composes them inside the compiler instead.
- **Generic text card face.** A `FaceRenderer` for custom cards that draws the card's
  name and attributes; the standard deck keeps `standardFaceRenderer`.
- **Automatic zone layout.** Places per-seat zones around the table by seat count
  (bottom/left/top/right for 4, evenly around for others) and shared zones in the
  center, with drop bounds that stay reachable. Note the existing subtlety in Hearts'
  `TABLE`: `resolveDrop` walks zones in reverse, so small center zones must come
  after the hand fans or the fans' bounds shadow them.

## Examples

Examples are arrange / act / assert:

- **Start state:** the cards as `Cards:` creates them (seeded), all in their starting
  zone, setup not yet run. "Given the game is set up" runs setup and lets flow settle,
  for examples that want a real deal.
- **Given** lines arrange state directly (place specific cards, set the phase, set
  whose turn it is, record who played a card). They do not go through move legality.
- **When** lines submit moves as a given player through a real `GameEngine` built from
  the arranged state — exactly the engine the playtest uses.
- **Then** lines assert: accepted / rejected (optionally with the reason sentence),
  where cards are, zone counts, whose turn, which phase, scores and winner.

Each example reports **pass**, **fail** (with a designer-readable explanation:
"Expected the move to be rejected, but it was accepted"), or **blocked** (it reached a
phrase that is not implemented yet — named in the result). Examples that never touch
an unknown phrase run normally even while other lines are unknown.

The same runner is used in two places:

- **Editor:** all examples re-run on each successful compile; results shown beside
  each example.
- **Tests:** a vitest file compiles every checked-in game text (e.g. Hearts), fails
  on any compile error, and runs its examples, failing on any fail or blocked.

## The designer page

A new page in the app:

- **Rule text editor** on one side, re-checked as the designer types (debounced).
  Problem lines are marked inline; a list shows every diagnostic with its hint. Each
  unknown phrase has a "Copy for developer" action that copies its stub and context.
- **Examples panel** with pass / fail / blocked per example.
- **Play** button, disabled while unknown phrases or errors remain (with the reason
  shown). For a player-count range, the designer picks the count before playing.
  Play opens every seat on one screen via loopback, like the Hearts demo, with
  restart and undo. Editing the rule text ends the playtest in progress; pressing
  Play again starts a fresh game under the new rules. Seat status shows the phase `Hint:` and whose turn it is; a
  rejected move shows the designer's sentence.
- Drags map to declared moves: a drag from zone A to zone B, by the seat that dragged,
  becomes the first declared move in the current phase whose zones match; no match →
  "no rule lets you move a card there". Dragging within a reorderable hand is a
  rearrange.
- **Saving:** auto-save to browser storage; download/upload the text file; the
  Hearts and Color Match texts available as samples to load.

The app has no router today (`src/main.tsx` renders the Hearts page directly); the
builder adds a minimal way to reach both pages.

## Proofs (acceptance)

### Hearts

1. A checked-in Hearts game text compiles with **no diagnostics** against the phrase
   library (including any Hearts-specific phrases developers add as part of this
   project).
2. Its examples cover what `src/pages/hearts-demo/hearts.test.ts` covers today: not
   your card; can't lead hearts before they're broken (unless only hearts); can once
   broken; must follow suit when able; passes limited to 3 and to your own cards; the
   2♣ holder leads after passing; the trick goes to the highest card of the led suit
   (ace high); the winner leads next; 1 point per heart, 13 for the queen of spades,
   lowest score wins.
3. An end-to-end test on the compiled game, like `hearts-e2e.test.ts`: every seat
   passes, then an auto-player completes 52 plays, and the result has scores totalling
   26 and a winner.
4. Same seed → same id-to-card mapping; ids are opaque (the existing deck invariant).
5. The designer page loads the Hearts text, shows all examples passing, and a full
   hand is playable with four seats on one screen.
6. Every existing test still passes; `bun run typecheck` is clean.

Equivalence with the hand-coded Hearts is **behavioural** (same rules, same kinds of
outcomes), not state-identical — card ids and internal `data` keys may differ.

### Color Match

The second game exists to prove what Hearts does not: custom cards with attributes,
a player-count range, automatic layout at 2, 3 and 5 seats, the text card face, a
shared draw pile, and a trigger that refills it. Intended text (same caveat as the
Hearts sample — the builder settles exact wording):

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
    Shuffle the discard pile, except its top card, into the draw pile.
  After a player plays or draws, the turn passes to the left.

End:
  The game ends when a player's hand is empty.
  That player wins.
```

1. The checked-in Color Match text compiles with no diagnostics.
2. Its examples cover: a color match is accepted; a number match is accepted; a card
   matching neither is rejected with the designer's sentence; drawing is rejected
   while a playable card is held and accepted otherwise; the turn passes after a play
   and after a draw; an empty draw pile is refilled from the discard pile, keeping its
   top card; emptying your hand wins.
3. An end-to-end test plays complete games with an auto-player at 2, 3, 4 and 5
   players (fixed seeds) and reaches a result naming the winner.
4. Automatic layout keeps every zone reachable by a drag at 2, 3, 4 and 5 seats
   (a reachability test like Hearts' drop tests).
5. The designer page plays it with a chosen count from 2 to 5, all seats on one
   screen, cards drawn with the text face.

Draw-only-when-stuck plus the refill trigger can make a game long; the end-to-end
test may cap the number of moves, but each seeded game it uses must reach a result.

## Testing

- **Parser:** sections, indentation blocks, tables, line numbers, malformed input
  (designer-readable errors).
- **Phrase matching:** parameter capture per type, case/whitespace/period
  normalisation, unknown vs ambiguous, suggestion ranking, stub generation per kind.
- **Compiler:** each section's output against hand-written expected `TableDef` /
  `FlowDef` fragments; name resolution errors; placeholders for unknown phrases.
- **Engine additions:** declared-move legality/rejection text/apply; "next player
  already chosen" semantic (plus the existing flow tests unchanged); combinators;
  layout reachability (every zone has a reachable drop point — the Hearts drop tests
  are a model).
- **Examples runner:** pass / fail / blocked; Given arrangements; Then assertions.
- **Proofs:** Hearts and Color Match as above, including layout reachability at
  every seat count Color Match allows.
- **Page:** a happy-dom test that the page compiles each sample, lists examples, and
  enables Play; diagnostics render for an unknown phrase; editing the text ends a
  running playtest.

## Left to the builder

- Exact grammar: keyword spellings, how blocks nest, comments, and the precise wording
  of built-in phrases — keeping the shape above.
- The full set of parameter types and how relative references ("their", "the
  winner's", "on its owner's left") are represented in compiled params.
- The fuzzy-suggestion algorithm.
- Editor component (a plain textarea with a diagnostics list is acceptable; a code
  editor library is fine if it earns its weight).
- The layout routine's details, page switching, file names and locations (e.g.
  `src/engine/core/lang/…`, `src/pages/designer/…`, `src/games/hearts.rules`).
- How "who moved this card" is stored, and the exact Given/Then vocabulary.
- Whether `Setup:` compiles to a synthetic first phase (as Hearts does today) or
  another mechanism with the same effect.
- Updating the README (its roadmap and architecture sections are already out of date:
  they omit the game-state engine, flow engine and net layer).

## Out of scope (documented, not built)

- Online play over a real transport (next project).
- Tokens, meeples, dice, boards, quantities (separate project).
- Designer-defined phrases (macros) built from existing phrases.
- Click/tap actions; timers; multi-round matches.
- Non-English rule text.
- Accounts, cloud saves, sharing, version history.
- An app shell beyond the browser.
