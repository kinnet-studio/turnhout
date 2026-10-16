# Startup Simulator, Slice 5: Talent Growth, Brainstorm and Training, Milestones

**Date:** 2026-10-16
**Status:** Draft, waiting for its builder check. The user handed over every design call for the full implementation;
the calls below are the builder's.
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

## Left to the builder

- Exact wordings; the faces' token display; the auto-player's choices.
