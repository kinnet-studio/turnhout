# Startup Simulator, Slice 4: Modes, Ops and Bugs

**Date:** 2026-10-16
**Status:** Draft, waiting for its builder check. The user handed over every design call for the full implementation;
the calls below are the builder's.
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
- **Ops QA works through the Maintenance products in the order they were Launched** (the Rust engine). The rulebook says
  "from any of your Maintenance products" without saying who picks; a removed Bug is worth the same $1 almost
  everywhere, and a choice every turn would slow play.
- **The Growth Hacker attaches when it enters the Ops Zone:** to the product being Launched when it is on that team, or
  to a product its owner picks when it is Assigned or hired onto the Board. It stays attached until it leaves the Ops
  Zone.
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

## Left to the builder

- Exact wordings; the gauges' look; the auto-player's choices.
