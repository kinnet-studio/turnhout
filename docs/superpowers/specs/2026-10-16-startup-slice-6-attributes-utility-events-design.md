# Startup Simulator, Slice 6: Attributes, Utility Cards and Events

**Date:** 2026-10-16
**Status:** Settled after its builder check (see "Builder-check rulings" at the end). The user handed over every design call for the full implementation;
the calls below are the builder's.
**Part of:** `2026-10-16-startup-simulator-overview-design.md`. Its decisions, calls, anti-goals and constraints apply.
**Builds on:** slices 1a to 5.
**Rulebook sections:** §5 Phase A, §12 line 1 (Hype), §15.C (Attributes), §15.D, §20.A Attributes and Utility, §20.D
(the Event deck), Rulings #13, #23, #25's card and event texts.

## What this slice is

The rest of the Strategy deck that doesn't need Equity, poaching or audits becomes playable, and every round opens with
an Event that changes the rules for everyone until the next round.

The game after this slice:
- **Attributes (§20.A; 0 AP; pay the printed price).** The card is tucked under a Talent card and stays there for good;
  one Talent may hold several. Buffs target one of the player's own employees (Bench or Board); Debuffs target an
  opponent's Board staff (Development or Ops). A fired Talent's Attributes go to the Strategy Discard; a Talent
  discarded from the Bench keeps them.
  - Workaholic ($2, buff): +2 output in its current mode and +$2 salary. PMs, Sales Reps and HR Managers get only the
    salary.
  - Clean Coder ($3, buff): the unit gains Clean Code (as the Architect, slice 4).
  - Visionary ($3, buff): a Software and a Hardware Lead for any Tier, so it can build and Launch a hybrid alone; Tier 2.
  - Toxic Personality ($3, debuff): −1 to its team's total output (ruling #25: its whole team).
  - Burnout ($0, debuff): 0 output; a PM with Burnout gives no Synergy.
  - Flight Risk ($2, debuff): its effect (the poach multiplier) arrives with poaching in slice 8.
- **Utility cards (§20.A; 0 AP):**
  - TechCrunch Feature ($5): +1 Hype on one of the player's Maintenance products. $2 with a Sales Rep attached to that
    product, or during Trade Show; the two discounts don't stack.
  - Design Sprint ($0): draw 5 cards from the Seed Deck into the Backlog (fewer if it runs short); Cleanup then cuts the
    Backlog to 3.
- **Hype (§12):** +5 VP per Hype token on an Active Maintenance product.
- **Events (§5 Phase A, §20.D).** At each Round Start the Start Player reveals the next Event; it applies to all players
  until the next Round Start, then goes to the Event discard. An empty Event deck shuffles its discard. Angel Investors
  and Regulation Audit also act once, when revealed.
  - In effect from this slice: Tech Bubble, Angel Investors, Legacy Code, Regulation Audit, Open Source Boom, Hardware
    Hackathon, Chip Shortage, Crunch Time, Server Crash, Supply Chain Logjam, Intern Season, Online Course Boom, Trade
    Show, and Patent Trolls' Greenlight License.
  - In the deck but not yet in effect: Venture Capital Rain (slice 7), Recruiter Frenzy and Headhunter Holiday
    (slice 8), Whistleblower Protection Act (slice 9), and Patent Trolls' other fees (slices 9 and 10).

## Calls (the builder's)

- **Cease & Desist moves to slice 8** with poaching, its only trigger (the overview lists it in both slices 6 and 8).
- **All 18 Events are in the deck from this slice,** so the round-to-round mix is the real one; those whose systems
  arrive later are revealed and do nothing yet. Each slice that adds a system switches its Events on.
- **Regulation Audit's shortfall is a choice in turn order from the Start Player** at the reveal: each player who can't
  pay lets staff go, choosing whom, until they can (§20.D: "choosing who"; §7: unpaid salaries never bankrupt).
- **Output never goes below 0 for a unit** under Logjam, Burnout or Server Crash, nor a team's total under Toxic
  Personality. (The builder check confirms against the Rust engine.)
- **Crunch Time acts in Generate** on the active player's projects that aren't Stalled: +1 cube (Blue if the project
  still needs Blue, otherwise Red) and +1 Bug unless a working Clean Code unit is on it. Development QA, which comes
  after Generate, can remove that Bug.
- **Angel Investors counts Development and Maintenance products** (§20.D), and like every Round Start effect it never
  runs in the window after the last round (slice 1a, R1.3).
- **Rulings pinned as examples:** #13 (Round Start before the Start Player's turn; Events last until the next Round
  Start), #23 (TechCrunch Feature is the old "PR Campaign"), and #25's fuller card and Event texts.

## What the language gains

1. **Attributes played from a hand onto a Talent,** with own/opponent targeting, read by output, salary and leads. Per
   R2 below they are counts on the Talent card plus a parked card, not attached cards.
2. **Round-long modifiers read as conditions on the card in play** (the overview's "Round-long Events, written as
   conditions on the Event in play").
3. **Reveal effects that run once** when a card enters play.
4. **Price modifiers that don't stack** (the cheapest applicable price).
5. **Choices in turn order outside a player's turn** (Regulation Audit).
6. **Example vocabulary** for all of the above.

## The page

- The Event in play sits on the shared table with its text.
- Attributes show under their Talent; Hype shows as a badge on the product.

## Examples to cover

| Example | Expect |
|---|---|
| Workaholic | +2 output in its mode, +$2 salary; a PM gets only the salary |
| Clean Coder | the Hacker with Clean Coder adds no Bug when he joins |
| Visionary | a Visionary Junior builds and Launches a hybrid Tier 2 alone |
| Toxic Personality | the target's team produces 1 less in all |
| Burnout | 0 output; a PM with Burnout adds no Synergy |
| Attributes on firing | a fired Talent's Attributes go to the Strategy Discard |
| Attributes ride along | a Bench discard keeps them; a rehire from the Job Market brings them to the new owner |
| Attributes on eviction | a Talent evicted from the Job Market takes its Attributes to the box |
| Burnout in an Event | a burned-out Blue unit makes 0 in Open Source Boom, earns no Pending XP, gives a PM no Synergy |
| Toxic in a hybrid team | the team loses one Blue, not one Red; none while the Toxic card has an Onboarding Token |
| TechCrunch Feature | +1 Hype for $5; $2 with an attached Sales Rep; $2 in Trade Show, not $0 with both |
| Hype scores | +5 VP per Hype on an Active product, 0 when Offline |
| Design Sprint | 5 Seed cards to the Backlog; Cleanup cuts to 3 |
| An Event lasts a round | Tech Bubble adds $1 to every Active product until the next Round Start |
| Angel Investors | $3 to each player with a Tier 1 product and no Tier 2/3, at the reveal |
| Regulation Audit | $1 per Board employee with salary above $0; a short player lets staff go |
| Legacy Code | $2 per Bug |
| Crunch Time | +1 cube and +1 Bug on each unstalled project; none with a working Clean Code unit |
| Chip Shortage | a Junior Hardware Eng costs $5 from the University; a Firmware Specialist is unaffected |
| Intern Season | a University Junior costs $0 |
| Event deck reshuffle | an empty Event deck shuffles its discard |
| No Event after the last round | the Crash round ends with no new reveal |

## Goals

- Startup Simulator through slice 6 compiles with no diagnostics; its examples cover the table above.
- Long runs at 2 to 5 players reveal Events every round and play Attributes and Utility cards.
- Hearts, Color Match, Venom and Rent Day pass unchanged.

## Anti-goals

- No Startup Simulator words in shared code (Event names, Hype, Attribute and the like).
- An Event's effect leaking past the next Round Start.

## Proof (acceptance)

1. The examples above pass, with every number checked against the rulebook.
2. Long runs end at every player count, with the earlier invariants plus: exactly one Event in play after each Round
   Start; no unit's output below 0.
3. Each language piece has unit tests; the four games and typecheck pass.

## Left to the builder

- Exact wordings; how the Event and Attributes look; the auto-player's choices.

## Builder-check rulings

The builder check (`builder-check-startup-6.md`) raised three questions. The user handed every design call to the builder;
these are the calls, each on the owner's call list.

- **R1. Toxic Personality takes one cube off its team's total, as printed (§20.A: "-1 to its team's total Output").**
  - It is settled without a choice: the team's Blue if it makes any Blue, otherwise its Red, otherwise its QA (one Bug
    fewer removed). The same order holds in a Development team and in the Ops pool's bandwidth. It is taken after
    Synergy and the Event modifiers, and no colour goes below 0. The order echoes Crunch Time, which also prefers Blue.
  - It acts only while the Toxic card works (no Onboarding Token), by Ruling #8.
  - It acts even when the Toxic card itself makes nothing (a PM, a Sales Rep, a Burnout card). That case is what keeps
    Ruling #25's "whole team" apart from the Rust engine's −1 on the unit.
  - Why: the printed text is the rulebook, and the rulebook comes first. The stronger reading (every teammate makes 1
    less) fits #25's stated reason better but is not what the card says. If playtests show a $3 Toxic weaker than the free
    Burnout, that reading is a one-line change and the first thing to try.
- **R2. Attributes are counts on their Talent plus a parked card, not attached cards.**
  - Playing an Attribute puts one count of its kind on the Talent ("1 workaholic") and moves the played card to a public
    "attributes in play" pile. Output, salary and leads read the counts.
  - The counts ride with the Talent wherever it goes, as XP and badges do (slice 5 R4): to the Bench (Recall, Pivot, a
    hidden holder costs nothing because counts hide with their card), into the Open Job Market on a Bench discard, and to
    whoever hires it from there (§15.A.3, §15.C: Attributes stay "until the Talent is Fired").
  - Firing (Dismiss, unpaid salary, the Regulation Audit shortfall, the Diva's Pivot) strips the counts and moves one
    parked card of each counted kind to the Strategy Discard. A Talent evicted from the Job Market strips them and sends
    those cards to the box: eviction is not firing, and the Rust engine drops them with the card.
  - Why: the overview's "their attributes" zone and 1b R3's holder rule (a public zone of the same seat) forbid a hidden
    Bench holder, a holder in a shared zone and an attached card that changes owner, all of which the rulebook needs.
    Counts need none of that and reuse slice 5's carrying and stripping. This departs from the overview's attachment
    picture for Attributes only; staff on products stay attached cards (1b R3).
  - The page shows the counts as badges under the Talent's face.
- **R3. Burnout is absolute: 0 output after every modifier, Events included.** A burned-out unit makes nothing under Open
  Source Boom or Hardware Hackathon, earns no Pending XP and is not a working teammate for a PM's Synergy. Why: the card
  prints "0 Output" and the rulebook says nothing about it meeting an Event; the Rust engine adds the Event after the 0, so
  this keeps the rulebook over the engine. Small effect: one card, 2 of the 18 Events.
