# Startup Simulator, Slice 4: Modes, Ops and Bugs

**Date:** 2026-10-16
**Status:** Settled after its builder check (`builder-check-startup-4.md`, D1–D12, adopted in "Builder-check rulings"
below; where they differ from the text above, the rulings win). The user handed over every design call for the full
implementation; the calls below are the builder's.
**Part of:** `2026-10-16-startup-simulator-overview-design.md`. Its decisions, calls, anti-goals and constraints apply.
**Builds on:** slices 1a, 1b and 3.
**Rulebook sections:** §3 (the Ops Zone), §5 Phase B step 1 (Supply vs. Demand) and step 2's Bug Decay, §5 Phase D
step 2 (Clean) and step 7's Growth Hacker, §6 Launch (0 Bugs), §9.A, §11.C.2 (modes), §12 step 2 (the game-end Ops
check), §20.B (the Hacker, the Architect, the Fixer, the flex Seniors, the Growth Hacker, the Junior QA Tester),
§20.E, Rulings #4, #5, #19, #24.

## What this slice is

The Ops Zone starts to matter: products need staff to stay Online. Bugs appear, cost revenue and block Launch, and QA
staff remove them. Flex staff choose what they produce each turn.

The game after this slice:
- **Modes (§11.C.2).** Flex staff work in one mode at a time:
  - Firmware Specialist and Full Stack Ninja: Blue or Red.
  - The Fixer: Red, or QA (removes 1 Bug instead of producing cubes).
  - (Multi-skilled Juniors arrive with Training in slice 5.)
  - At the start of their turn (Phase B step 1) the active player declares the mode of each such staff member on
    their Board. Modes last the whole turn, for Ops bandwidth and for output, and stay until the next declaration.
  - Staff who reach the Board later in the turn work in their native color; with no native color, in their first mode
    (Blue for flex staff).
- **Ops bandwidth (§5 Phase B step 1, ruling #19).** At Income, per color separately:
  - Supply: the total output of the Ops pool's staff working in that color.
  - Demand: the total Maintenance of their products in that color.
  - If both colors fit, every product is Online.
  - Otherwise the player chooses which products go Offline: any set, as long as what stays Online fits both colors. A
    hybrid-maintenance product is Online only if both its colors fit.
  - Products go Offline or come back Online only at Income and at game end. A product Launched mid-turn arrives
    Online, and Recalling Ops staff takes nothing Offline until the next Income.
- **Offline products (§9.A, ruling #5)** earn $0, score 0 VP, earn no Market Share and give no Domain Expertise. They
  still provide their Tag.
- **Bugs.**
  - **Sources:** the Hacker adds 1 Bug to a Development project each time he joins it (Assign, Reassign, a Board hire;
    poaching arrives in slice 8). The Growth Hacker adds 1 Bug to its product at the end of each of its owner's turns
    (Phase D step 7), even when the product is Offline.
  - **Effects:** each Bug costs its product $1 of revenue (never below $0). A project can't Launch with Bugs.
  - **QA (Phase D step 2):** QA output removes Bugs: on its own project for Development staff (not when the project is
    Stalled), or from the Maintenance products for Ops staff. The Junior QA Tester removes 1; the Fixer in QA mode
    removes 1.
- **The Architect (Clean Code):** never generates Bugs, and while working in the Ops pool, Growth Hackers add no Bugs to
  that player's products.
- **The Growth Hacker (Viral Loop):** in the Ops Zone it is attached to one product, which earns +$3 revenue.
- **The game-end Ops check (§12 step 2):** after the last round, each player checks their bandwidth once more with
  their current staff and modes. If all their products fit, all are Online; if their Online products still fit, nothing
  changes; otherwise they choose which go Offline, in turn order from the Start Player. Then the game is scored.

## Calls (the builder's)

- **What this slice leaves out:** QA Engineers, Sales Reps and Pending Green XP (slice 5); Crunch Time and the Events
  (slice 6); Consultants (slice 7); the M&A price's Bug modifier and poaching (slice 8).
- **Modes persist.** The declaration step starts from the current modes, so confirming without a change keeps them.
  The step is skipped when the player has no flex staff on the Board (the Rust engine).
- **Declared modes are public** (the Rust engine; the rulebook says "declare").
- **Ops QA: the owner chooses, but only when it matters** (R3 below). The rulebook's "from any of your Maintenance
  products" reads as the owner's choice, and the Rust engine's Launch order is not neutral (it can clear an Offline
  product's Bug ahead of one costing an Online product $1).
- **The Growth Hacker attaches when it enters the Ops Zone:** to the product being Launched when it is on that team, or
  to a product its owner picks (a target pick) when it is Assigned or hired onto the Board. §6 lets it be Reassigned to
  another Maintenance product (with an Onboarding Token).
- **The Offline choice offers only sets that work:** the player takes products Offline one at a time and confirms when
  the rest fit; confirming is refused until they do.
- **Rulings pinned as examples:** #4 (Phase D order: Generate, Clean, Commit), #5 (Offline products still provide
  Tags but give no revenue, VP or Domain Expertise), #19 (bandwidth per color; a hybrid needs both), #24 (the Offline
  choice; mid-turn arrivals).

## What the language gains

These are general pieces. None of them mentions Startup Simulator.

1. **A per-card value from a list** (overview item 15): a mode of Blue, Red or QA, set by a choice and read by output.
2. **A subset choice under a constraint:** taking cards out of play one at a time until a condition holds, with a
   confirm that is refused until it does.
3. **Rules triggered by a card joining a holder** ("When the Hacker joins a project").
4. **Totals by condition over a zone** (output of the cards in a mode, maintenance of the Online cards).
5. **Game-end steps before scoring:** a step in which players choose in turn order after the game is decided and
   before it is scored.
6. **Example vocabulary** for all of the above.

## The page

- Each player's Ops Zone shows Blue and Red bandwidth gauges (supply against demand), the overview's replacement for
  the Server Rack. Offline products are shown dimmed.
- Bugs show as a badge on the product. Each flex staff member shows its mode.
- The mode declaration and the Offline choice appear in the private strip.

## Examples to cover

| Example | Expect |
|---|---|
| Declaring a mode | a Firmware Specialist declared Red adds Red bandwidth this turn |
| Modes persist | the next turn starts with Red; confirming keeps it |
| Mid-turn arrival | a flex Senior hired onto the Board mid-turn works in Blue |
| Bandwidth fits | every product Online |
| Short on Blue | the player picks which product goes Offline; an Offline product earns $0 and no Market Share |
| A hybrid needs both | a 1 Blue + 1 Red product with only Blue bandwidth goes Offline |
| Only at Income | Recalling the Ops pool mid-turn leaves products Online until the next Income |
| Launched products arrive Online | even with no bandwidth left |
| The Hacker | Assigning him to a project adds a Bug |
| Bug decay | a $2 product with 3 Bugs earns $0 |
| Launch needs 0 Bugs | refused with a Bug on the project |
| QA in Development | a Junior QA Tester removes a Bug from its project, not when the project is Stalled |
| QA in Ops | a pooled Junior QA Tester removes a Bug from a Maintenance product |
| The Fixer | in QA mode removes 1 Bug and produces no Red |
| The Growth Hacker | +$3 to its product; a Bug at the end of the owner's turn, even Offline |
| The Architect | a pooled Architect stops the Growth Hacker's Bug |
| Offline still provides its Tag (#5) | an Offline product's Tag still lets a rival avoid a License from someone else |
| No Expertise from Offline (#5) | an Offline Pink product gives no discount |
| The game-end Ops check | a player short after the last round chooses Offline products before scoring |

## Goals

- Startup Simulator through slice 4 compiles with no diagnostics; its examples cover the table above.
- Long runs at 2 to 5 players keep products Online, take some Offline, fight Bugs and reach the Crash.
- Hearts, Color Match, Venom and Rent Day pass unchanged.

## Anti-goals

- No Startup Simulator words in shared code (mode, bandwidth, Bug, QA, Online, Offline and the like).
- A product changing Online state outside Income and the game-end check.
- An Offline set that leaves the Online products over bandwidth.

## Proof (acceptance)

1. The examples above pass, with every number checked against the rulebook.
2. Long runs end at every player count, with the earlier invariants plus: after every Income, the Online products fit
   both colors; no project Launches with a Bug; no product earns below $0.
3. Each language piece has unit tests; the four games and typecheck pass.

## Builder-check rulings

The builder check (`builder-check-startup-4.md`) found nothing that needs the user. Every call below is the builder's,
adopted from D1–D12. Two items go on the list the owner sees: who picks the Bugs Ops QA clears (R3), and whether a player
may take a product Offline by choice at game end (§12 says "If all your products fit, they are all Online"; it only
matters once Scandal can make a product score below 0, so it is carried to slice 8).

### R1. Game-end steps before scoring (D1)

- A new End line names a phase: e.g. "Before the score, each player has the final check, in turn from the start
  player." A game without it is untouched.
- An entry rule built in the rules compiler, placed before the turn-start trigger, fires when End's condition holds
  (round finished included) and the steps haven't begun: it sets the phase, keeps the Start Player current and marks
  `lang:end-steps`. While the steps run, no turn starts.
- In the step, "they" is the seat whose step it is; the phase's start lines run for each seat on entry. "The final check
  passes to the left." moves to the next seat; after the last seat the steps are done and End holds.
- The text: a start line bringing every product back Online when everything fits, a rule passing the step on when the
  Online set fits, and R6's buttons. Hearts and Rent Day are unchanged (unit tests).

### R2. Income rebuilt as phases; what slice 4 changes in 1b and slice 3 (D2)

- Phases: **modes** (first; its go-to skips it when no flex or QA-mode-capable card is on the Board; set-mode buttons
  and a confirm that runs "Go to ops check.") → **ops check** (start lines bring every product back Online; its go-to
  leads to income when everything fits; R6's buttons and a guarded confirm) → **income** (start lines: revenue and
  Market Share, moved from 1b's turn-start rules; Salaries as in 1b) → actions. No phase-start line is a turn-start rule,
  so 1b's R2 window stays safe: End is checked before any go-to.
- Changes to 1b and slice 3: the Income lines; output values (R4); the ops team's zone mark and the Ops entry routes
  (R5); Launch (the Growth Hacker, the 0-Bug guard) and Pivot (Bugs); the score line (R7); slice 3's Domain Expertise
  gains "not offline"; Stalled covers QA; the four 1b examples that cross an Income or game end with Ops products get Ops
  staff or a new expectation; examples that arrange Ops products name their phase.
- Invariants: revenue and Market Share are earned on the move that enters income; a holder may sit in the ops team; the
  score adds only Online products; Online fits after every Income.

### R3. Ops QA (D3)

- Automatic when Ops QA covers every Bug on the player's Maintenance products, or only one product has Bugs. Otherwise a
  short step in the engine phase: the owner removes one Bug per press until the QA is spent or no Bug is left. Ops QA
  reaches Offline products too. Pinned by an example where the Launch order would choose wrong.

### R4. Modes are flags, forgotten off the Board (D5, D11)

- Flags `red mode` and `qa mode` (Blue is every flex card's default); slice 5 adds `blue mode` for a trained QA Junior. A
  list value is not used: "qa" is already a skill value.
- Output values, each line refining the last: Blue (software or flex → its output; red mode → 0; onboarding → 0); Red
  (hardware or red mode → its output; qa mode → 0; onboarding → 0); QA (a qa card → its output; qa mode → 1; onboarding
  → 0). The Junior QA Tester removes its QA output (so slice 5 only adds XP lines).
- Modes are forgotten when staff leave the Board (the Rust engine): a card rule `a card in a {perzone} is {cardflag}`
  (and a shared-zone form) lets `In every phase:` clear the flags on the bench and in the open job market.
- The declaration starts from the current flags (the builder's UI call: confirming without a change keeps them); it is
  public.

### R5. The Growth Hacker in the ops team (D4)

- A `'some'` zone mark for the ops team: a card there may sit on a card in a public zone of its own seat.
- Each Ops entry route (assign, agency hire, Source hire) gains a "… to a card in their operations" form; the Growth
  Hacker goes on the target, other picked cards join the pool; the untargeted forms refuse a Growth Hacker.
- Launch keeps a Growth Hacker on its product ("staying on it"); the §6 Reassign moves an attached one to another
  Maintenance product with an Onboarding Token.
- The Growth Hacker's Bug and the Architect's shield apply only without an Onboarding Token (§20.B, #8).

### R6. The Offline step (D9)

- Offline is a flag on cards that stay in operations, never a zone, so Tags, Bugs, Ops QA and the Growth Hacker still
  see them.
- Buttons: take offline (Only if not offline), bring back online (Only if offline), confirm (Only if the Online set fits
  both colors). At Income the step starts with everything Online and is skipped when everything fits; at game end it
  starts from the current set.

### R7. Values, totals and numbers (D7, D8, D10)

- Values about a player, like card values: "A player's blue supply is the total blue bandwidth of the cards in their ops
  team", demand over the operations cards that are not offline; conditions compare them. The page pairs them for the
  gauges. Per-card `blue bandwidth` / `red bandwidth` start as the output, so slices 6 and 7 only add lines.
- Group flag filters ("… that are not offline") combine with "whose …".
- `rev` is refined: up by the total rev bonus of the cards on it (a Growth Hacker's is 3; slice 5 adds Sales Reps), down
  by its bugs, at least 0, and 0 when offline. Revenue, Market Share and slice 7's dividends read it unchanged.
- The score reads a worked `portfolio points` (its val, 0 when offline), not a refined `val`, so faces keep the printed
  Val.
- A count going down with a floor ("its bugs go down by its qa team output"); Pivot clears Bugs ("It loses its bugs.");
  Launch has "Only if its bugs are 0"; "A stalled card's qa team output is 0."

### R8. The Hacker's Bug is an event (D6)

- A card moment `When a Spaghetti Code card joins a card in a development:` with "The card it joins gains 1 bug.",
  announced once per joining card by the placing effects (never by Givens). Every route adds it, Reassign included
  (the Rust engine).

### R9. Examples (D12) and what else waits

- Add: Pivot clears Bugs; the Hacker on a Reassign and an agency hire onto a project, none in Ops; the Growth Hacker
  Reassigned (no Bug that turn); an onboarding Architect doesn't shield; Ops QA on an Offline product and the R3 case; the
  Fixer in QA mode still leads; a flex Senior Recalled and re-Assigned works Blue; a Fixer arriving mid-turn works Red; no
  declaration without flex staff; $0 revenue earns no Market Share; a product Offline earlier comes back at Income; the
  game-end cases (all fit, Online set fits, a player brings a product back). Reword "a hybrid needs both" with Drone
  Delivery (maintenance 1/1); "Offline still provides its Tag" as p0's Offline Dating App still providing Social.
- Citations: #25 for the game-end check, Offline only at Income and the fuller trait texts; #8 for Onboarding cancelling
  the Growth Hacker and the Architect; #14 for "Clean & Learn".
- Also waiting for later slices: Open Source Boom, Hardware Hackathon, Server Crash, Legacy Code, Clean Coder (6); the
  QA Engineer's 2-XP waiver, the Director of QA, the VP of Sales, the Sales Rep's attachment, Milestones at the game-end
  check (5); the Consultant's bandwidth and QA, share price (7); Integration, Acquisition bandwidth, Bugs travelling with a
  sold product, clearing Offline when a product leaves Ops (8); hiding modes on Face-Down teams (9).

### R10. Three plans (size)

- **4-1, language** (about 6 tasks): values about a player and filters, the card rule for flags; card numbers going
  down, shared totals, the new value shapes; the card moment; the ops team's attachments; game-end steps; example
  vocabulary and the word check (mode, bandwidth, bug, qa, online, offline, maint, supply, demand).
- **4-2, rules text and long runs** (about 5): modes; the Ops check and Offline with the Income rebuild and the 1b/3
  changes; Bugs; the game-end check; long runs with the new invariants and choice tallies.
- **4-3, the page** (about 3, after 3-2): gauges, Offline dimmed, Bug badges and mode labels; the declaration, Offline
  step and final check in the private strip; happy-dom and browser checks.
- Written after plan 3-1 lands.

## Left to the builder

- Exact wordings; the gauges' look; the auto-player's choices.
