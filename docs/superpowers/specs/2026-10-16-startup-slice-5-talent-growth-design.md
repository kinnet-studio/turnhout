# Startup Simulator, Slice 5: Talent Growth, Brainstorm and Training, Milestones

**Date:** 2026-10-16
**Status:** Settled after its builder check (`builder-check-startup-5.md`, M1–M12, adopted in "Builder-check rulings"
below; where they differ from the text above, the rulings win). The user handed over every design call for the full
implementation; the calls below are the builder's.
**Part of:** `2026-10-16-startup-simulator-overview-design.md`. Its decisions, calls, anti-goals and constraints apply.
**Builds on:** slices 1a, 1b, 3 and 4.
**Rulebook sections:** §3 (Your Three Hands, Talent Growth), §5 Phase D steps 1–2 (Pending XP) and step 7 (the Strategy
Hand limit), §6 Assign/Reassign/Pivot (Agile), Launch (graduation) and Brainstorm, §11 (all), §12 lines 5–6 and step 3,
§15.C, §20.A Training, §20.B Specialists and the Veteran, §20.G, Rulings #1, #8, #10, #14, #20, #24.

## What this slice is

Employees grow. Juniors learn on the job and graduate XP at Launch; Training cards teach new skills and badges; the
Specialists do their jobs; PMs boost their teams. Players Brainstorm for Strategy cards. Milestones reward the first to
reach a goal. Human Capital and Milestones join the score.

The game after this slice:
- **Pending XP (§11.B.1, ruling #1).** In Phase D, a Junior on a Development team that generates a cube of a color, or
  removes a Bug (Green), gains a Pending XP token of that color if it has none of that color: at most one per color,
  three in all. Ops work earns none. Pending tokens stay through Reassign.
- **Graduation (§6 Launch, §11.B.2).** At Launch each Junior on the team makes exactly one of its Pending tokens
  Permanent (its owner's choice) and returns the rest. The Veteran's **Mentor** lets one Junior on its team (owner's
  choice) make a second, different one Permanent. A Junior holds at most 4 Permanent XP; at 4 it graduates nothing.
- **Pivot** discards all Pending tokens of the team (§6, §11.B.3).
- **Output (§11.A, §11.C):** a Junior's output in a mode is 1 (its native skill or a Skill token) plus its Permanent XP of
  that color. Salary is $1 at 2 or more Permanent XP, else $0.
- **Multi-skilled Juniors (§11.C):** a Junior with Skill tokens declares a mode like flex staff (slice 4). With no native
  color, mid-turn arrivals work in their first Skill token's color.
- **Rank Badges (§11.G.1):** a Junior with a Gold Badge is a Tier 2 Lead for the colors of its skills, cross-functional
  with both (a QA-only Junior leads nothing). Badged Juniors still gain XP.
- **Specialists (§11.D, §20.B):**
  - **QA Engineer:** removes 1 Bug; 2 at 1 XP; at 2 XP also prevents Revenue Decay on all its owner's Active products
    while in the Ops Zone.
  - **Sales Rep:** in the Ops Zone, attached to one product: +$2 revenue, +$3 at 1 XP, +$4 at 2 XP. A badged Sales Rep
    (VP of Sales) also waives Bug Decay on its product.
  - **Junior PM (Synergy, Development only):** +1 output for each working teammate, in that teammate's own color
    (+1 Bug removed for a QA teammate). Teammates with 0 output or an Onboarding Token don't count; several PMs each add.
    On a Tier 2/3 project it gains a Pending Badge, made Permanent at Launch and lost at a Pivot.
  - **Senior PM, or any badged PM (Agile):** Synergy, and staff Assigned or Reassigned to its team get no Onboarding
    Token; pivoted staff moved there clear theirs. A PM that moves itself gets one.
  - **HR Manager:** no effect until poaching exists (slice 8).
- **The Strategy Hand (§3, §15.C).** Strategy cards are a third hidden hand, limit 3, enforced at Cleanup between the
  Bench and the Backlog; overflow goes to the Strategy Discard. The Strategy Deck reshuffles its discard when it runs out.
- **Brainstorm (1 AP, §6):** discard any number of Strategy cards, draw 2 (3 with a working PM on the Board), keep 1,
  discard the rest.
- **Training cards (§20.A; 0 AP; pay the printed price; target one of their own employees, Bench or Board):**
  - Full Stack Bootcamp ($3): a Junior gains a Blue or Red Skill token it doesn't have.
  - QA Certification ($3): a Junior gains a Green Skill token, or a QA Engineer gains 1 XP (max 2).
  - Sales Seminar ($2): a Sales Rep gains 1 XP (max 2).
  - Leadership Masterclass ($3): a University Junior, QA Engineer or Sales Rep without a Badge gains one.
  - Agile Workshop ($3): a Junior PM without a Badge gains one.
- **Milestones (§12, §20.G):** 3 of the 6 are revealed at setup. The first player to meet one claims it for good,
  checked as play happens. At the same moment, it goes to the Active Player if they meet it, else to the next of them in
  turn order. A last check runs at game end, after the Ops check.
  - First Mover Advantage (5): first to Launch a Tier 2 product (not a Tier 3, not an Acquisition).
  - Talent Magnet (8): 2 or more employees with 3 or more Permanent XP each.
  - Platform Power (10): 3 or more Active products providing different Tags.
  - Revenue Leader (6): at least $10 of Operational Revenue in one Income.
  - Clean Launch (5): the first Launch (ruling #24's note).
  - Full Stack Founder (7): Active products providing a hardware-side and a software-side Tag (the §20.G lists).
- **The score gains (§12):** Milestones at face value; Human Capital: 1 VP per Permanent XP or Skill token (Specialists'
  Training XP included), 2 VP per Gold Badge, on the Bench and the Board.

## Calls (the builder's)

- **What this slice leaves out:** the Strategy cards whose systems arrive later stay in the deck and can be drawn, kept
  and discarded, but not played until their slice: Attributes and Utility (slice 6), Hit Piece, the Headhunter,
  Corporate Raider, the Non-Compete Suit (slices 7–8), Cease & Desist (slice 8). The Director of QA's Scandal removal
  arrives with Scandal (slice 8); the HR Manager's defense with poaching (slice 8).
- **The Strategy deck is in the game from this slice**, all 30 cards, so the deck's mix (and dead draws) is what players
  will meet.
- **Graduation is a choice step at Launch** for each Junior with more than one Pending token, skipped when it has one or
  none. The Mentor's choice follows (§11.B.2; ruling #25: the owner chooses which Junior a Mentor helps).
- **Pending XP goes to Juniors first** when a team removes fewer Bugs than its QA capacity could, as in the Rust engine:
  a Junior who would earn a Green token removes a Bug ahead of Specialists and Seniors.
- **Brainstorm keeps one card through a private look,** like Research (slice 1a, R7).
- **Milestone ties across players at one moment** follow §12: the Active Player, else the next in turn order.
- **Rulings pinned as examples:** #1 (one Pending token per color; choose exactly one), #8 (Onboarding and Agile PMs),
  #10 (the Strategy Hand limit and order), #14 (Training only through Training cards), #20 (talent rules: badged
  Juniors' leads), #24 (Milestones; Clean Launch).

## What the language gains

1. **Tokens on cards by color:** counts per color (Pending XP, Permanent XP, Skill tokens) and a flag (Badge, Pending
   Badge), read by output, salary, leads and scoring.
2. **Cards played from a hand with a price and a target** (Training), with conditions on the target.
3. **A deck that reshuffles its discard partway through a draw** (overview item 11).
4. **Per-card choices at a fixed step** (graduation), skipped when there is nothing to choose.
5. **First-to-claim objectives** checked after every change, with a tie order, and a setup that reveals 3 of 6
   (overview item 17).
6. **Score lines summing tokens** over a player's cards.
7. **Example vocabulary** for all of the above.

## The page

- Talent faces show XP by color, Skill tokens, Pending tokens (marked as pending) and Badges.
- The Strategy Hand sits in the private strip; rivals see its size.
- The revealed Milestones sit on the shared table with their claimant.

## Examples to cover

| Example | Expect |
|---|---|
| Pending XP | a Junior generating Blue gains one Blue Pending token, not two |
| Green from QA | a Junior QA Tester removing a Bug gains a Green Pending token |
| No XP in Ops | Ops work earns nothing |
| Graduation | at Launch a Junior with Blue and Red Pending keeps one, chosen |
| Mentor | the Veteran's team: one Junior keeps two |
| XP cap | a Junior at 4 Permanent XP graduates nothing |
| Pivot loses Pending | all Pending tokens of the team return |
| Output with XP | a Junior Software Dev with 2 Blue XP produces 3 Blue and earns $1 salary |
| Bootcamp | a Junior Hardware Eng gains Blue and declares Blue mode |
| Badged Junior leads | a badged Junior Software Dev leads a Tier 2 Software project |
| QA Engineer | removes 1 Bug; 2 at 1 XP; at 2 XP no Bug Decay on Active products |
| Sales Rep | +$2 to its product; +$4 at 2 XP; VP of Sales ignores Bug Decay |
| Junior PM Synergy | a team of two working Juniors and a PM generates 2 extra |
| Agile | a staff member Reassigned to a Senior PM's team gets no Onboarding Token |
| PM promotion | a Junior PM on a Tier 2 Launch keeps its Badge; a Pivot loses it |
| Brainstorm | draw 2 keep 1; with a working PM draw 3 |
| Strategy Hand limit | 4 Strategy cards at Cleanup: discard 1, after the Bench and before the Backlog |
| Reshuffle | Brainstorm on an empty Strategy Deck shuffles the discard |
| Milestones | First Mover goes to the first Tier 2 Launch; a tie goes to the Active Player |
| Human Capital | 1 VP per XP and Skill token, 2 per Badge |

## Goals

- Startup Simulator through slice 5 compiles with no diagnostics; its examples cover the table above.
- Long runs at 2 to 5 players graduate XP, play Training, claim Milestones and reach the Crash.
- Hearts, Color Match, Venom and Rent Day pass unchanged.

## Anti-goals

- No Startup Simulator words in shared code (XP, Pending, Badge, Mentor, Synergy, Agile, Milestone and the like).
- A rival seeing the Strategy Hand or the Brainstorm look.

## Proof (acceptance)

1. The examples above pass, with every number checked against the rulebook.
2. Long runs end at every player count, with the earlier invariants plus: no Junior over 4 Permanent XP or with two
   Pending tokens of one color; each Milestone claimed at most once; no Strategy Hand over 3 after Cleanup.
3. Each language piece has unit tests; the four games and typecheck pass.

## Builder-check rulings

The builder check (`builder-check-startup-5.md`) found nothing that needs the user. Every call below is the builder's,
adopted from M1–M12. Corrections to the text above: mid-turn arrivals work in their native colour (every Junior has
one); QA Certification needs a Junior with no QA skill and no Green token; the Mentor needs a **working** Veteran and its
second token is the owner's choice; Synergy, Agile, the 2-XP QA Engineer and the Sales Rep need their card **working**
(no Onboarding Token); Agile applies to Development teams only; the Pending Badge is also lost on a Reassign to a Tier 1
project and when fired, and Launch makes the PM Agile; Cease & Desist is playable from slice 8. Citations: #25 (the
Mentor's Junior, Pending on any cube, the Brainstorm PM on the Board, badged-Junior leads, the QA-only Junior, the
Milestone texts, Human Capital on Bench and Board), #5, #19, #4, §18.B, §15.A.3, §13.B, §9.A.

### R1. Milestones (M1)

- Milestones are cards: Setup shuffles the 6, deals 3 to a public milestone row and boxes the rest. A claim moves the card
  to the claimant's public `milestones` row; "Each card in a player's milestones scores its vp."
- Claims at a moment go in that moment's lines: First Mover (Tier 2 exactly) and Clean Launch in Launch; Revenue Leader
  in Income's revenue line.
- Position claims (Talent Magnet, Platform Power, Full Stack Founder) are every-phase rules about a player with three new
  pieces: a `When a player …:` frame whose candidates run in turn order **from the Active Player** (the seat whose turn
  last started); a guard ("Only if no player is choosing offline products") so nothing is claimed from a provisional
  Online set at Income or the final check; and **End waits for every-phase rules about a player**, so the last check
  runs after the final Ops check and before the score (§12 step 3), from the seat whose turn ended the round (the Rust
  engine). Existing games have no `In every phase:` section, so they are untouched.

### R2. Graduation and the Mentor: a step after Launch (M2)

- Launch records "they gain 1 mentoring" when a working Mentor card is on the team, badges each Junior PM on a Tier 2/3
  project, moves the product and team (attaching Sales Reps and Growth Hackers), claims First Mover and Clean Launch, and
  starts the graduation phase with them.
- Card rules with no press: a Junior at 4 XP loses its Pending tokens; a Junior with exactly one Pending token makes it
  Permanent and is marked graduated.
- Buttons only where there is a choice: "keep {colour} on a card in their ops team" (it has that Pending token and more
  than one, isn't graduated, is under 4); "mentor a card …, choosing {colour}" (they have mentoring; the card is
  graduated, under 4 and has that token left; filled in when one option is valid).
- When nothing is left to choose, every card loses its Pending tokens and mark, they lose mentoring, and the turn goes
  back. With no real choice the step opens and closes with no press.

### R3. Language the slice needs (M3)

Replacing "What the language gains": tokens by colour and the 3-of-6 reveal already work. New pieces: counting cards
("the number of {cards}", "at least N cards in {zones} whose …", "the number of different {attribute}s of {cards}");
Synergy's shape (a product of two counts, or "the cards beside it"); owner scope in card values ("its owner has a card in
their {zone} that is …"); target picks across several zones and conditions about the target; a deal that reshuffles the
discard into the deck partway through; "the first N cards …"; text equality about a card subject ("its tag is IoT");
the R1 claim pieces; example vocabulary ("When p0 keeps blue on the Junior Software Dev", "When p0 mentors …, choosing
red", "When p0 plays the Full Stack Bootcamp on …, choosing blue").

### R4. Firing strips tokens; Bench discards keep them (M4)

- Dismiss, letting staff go unpaid and the Diva's Pivot strip XP, Skill, Pending and Badge tokens before the move
  (§18.B). Bench Cleanup and Source discards keep them (§15.A.3, §13.B): another player can hire a trained Junior for $1.

### R5. Juniors, modes and outputs (M5, M11)

- The three University stacks gain a `role` column holding `Junior` ("a Junior card" must read).
- `blue mode` joins the mode flags for any Junior whose native skill isn't Blue; the modes go-to and the forgetting rule
  widen to Juniors with Skill tokens.
- Output: native or Skill token gives 1, plus that colour's Permanent XP; another mode's flag gives 0; onboarding 0.
- Counts: blue/red/green xp (Juniors), `training xp` (QA Engineer, Sales Rep, uncoloured), blue/red/green skill,
  pending blue/red/green; flags badged and the graduation mark; worked `xp`, `skills`, `pending tokens`,
  `human capital`. Salary: an experienced card (a Junior with xp more than 1) earns 1.

### R6. Training (M6)

- Five buttons in the actions phase only, each picking the card from their Strategy Hand and a target across their bench,
  development team and ops team; each has the price guard, pays the price, checks its target, and moves the card to the
  Strategy Discard. Bootcamp's colour is a choice carried by the press. A `kind` column (`Training`) keeps slice 6's
  Online Course Boom a text change.

### R7. Pending XP (M7)

- None on a Stalled project or from an onboarding Junior; any colour counts, even one the project doesn't need; a Junior
  at 4 XP still gains Pending tokens (returned at Launch).
- Green: only Bugs actually removed, Juniors first in team (attach) order, then everyone else — "the first {its bugs}
  Junior cards on it that work in QA and have no pending green".

### R8. PMs (M8)

- Synergy needs a working PM, applies in Development only, and counts QA teammates (+1 Bug removed). Agile is worked: a
  Senior PM, or a badged Synergy card, working and on a Development team; a PM arriving in the same Assign doesn't count
  (the Rust engine's reading; on the owner's call list).
- The Pending Badge is a worked flag (an unbadged Junior PM on a Tier 2/3 project), for the face only; Launch of a Tier
  2/3 project badges every Synergy card on it.

### R9. Specialists in Ops (M9)

- Slice 4's Viral Loop attach routes gain Rainmaker. Values: a Rainmaker card's rev bonus is 2 plus its training XP (0
  when onboarding); a card's bug decay is its bugs, 0 with a working badged Rainmaker on it or when its owner has a
  working 2-XP Bug Hunter in their ops team; `rev` goes down by its bug decay; a Bug Hunter's QA output is 1, plus 1 at 1
  or more XP.

### R10. Brainstorm and the Strategy Hand (M10)

- Two buttons, "brainstorm" and "brainstorm, flushing some cards from their strategy hand"; the flush goes to the discard
  first (so it can be reshuffled back); the reshuffling deal draws 2 (3 with a working PM anywhere on the Board) into a
  private brainstorm row; the interrupt keeps 1; with nothing to draw it is refused; a single card is kept at once.
- A `strategy cleanup` phase between bench cleanup and backlog cleanup.
- The Strategy Discard is public (the Rust engine shows its top card), so the anti-goal covers the draw and the kept card.

### R11. Examples (M12)

Add the examples M1, M2, M4, M6, M7, M8 and M10 list, plus: a Junior Software Dev with 2 Blue XP in Red mode produces 1
Red; Specialists' Training XP scores Human Capital and Pending tokens score nothing; Talent Magnet counts a Bench Junior;
#14 (a QA Engineer on a Launching team gains no XP; no Training card fits a Senior). The "tie goes to the Active Player"
row is built with Givens or comes from the game-end check.

### R12. What still waits for later slices

Slice 6: Online Course Boom, Regulation Audit on 2-XP Juniors, Workaholic on PMs and Sales Reps, Burnout on a PM, Toxic
Personality on a Synergy team, Visionary, Crunch Time's cube, TechCrunch at $2 with a Sales Rep. Slice 7: the
Consultant's cube or Bug (no Pending XP, not a Synergy teammate). Slice 8: Token Value, a poached Junior's Pending tokens
and a Junior PM's Pending Badge, the HR Manager, the Director of QA, CTO on a badged Junior, the M&A +$5 per attached
Sales Rep, Market Sales moving attached Sales Reps, Integration Clients ignoring decay, Milestones met by a non-active
buyer. Slice 9: a Fold's Pending tokens and Badge; a Face-Down team's Pending tokens.

### R13. Three plans

- **5-1, language** (about 8 tasks): counting and text equality; Synergy's shape and owner scope; multi-zone targets;
  the reshuffling deal and "first N"; the `When a player …` frame from the Active Player; End waiting for player rules;
  the graduation step's pieces; example vocabulary and the word check (xp, pending, skill, badge, rank, mentor, synergy,
  agile, graduate, training, brainstorm, strategy, milestone).
- **5-2, rules text and long runs** (about 8; split talent / Strategy-and-Milestones if it grows).
- **5-3, the page** (about 3).
- Each written after the matching slice 4 plan lands, since slice 5 rewrites slice 4's modes, outputs, revenue, Ops
  attachments, Income and end steps.

## Left to the builder

- Exact wordings; the faces' token display; the auto-player's choices.
