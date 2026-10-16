# Startup Simulator, Slice 3: Tiers, Tags and Leads

**Date:** 2026-10-16
**Status:** Settled after its builder check (`builder-check-startup-3.md`, C1–C11, adopted in "Builder-check rulings"
below; where they differ from the text above, the rulings win). The user handed over every design call for the full
implementation; the calls below are the builder's.
**Part of:** `2026-10-16-startup-simulator-overview-design.md`. Its decisions, calls, anti-goals and constraints apply.
**Builds on:** slices 1a and 1b (their specs and builder-check rulings stand).
**Rulebook sections:** §3 Tech Tiers & Leads, §6 Greenlight (Dependency) and Launch (Lead Check), §7.B's "Who Can Lead
What?" table, §14.B.2, §19 (Domain Expertise and the tech trees), §20.B.1 (the Diva and the Engineer), §20.C.2,
§20.F.2–3, Rulings #3, #5, #18, #21.

## What this slice is

The Growth Deck becomes live. Tier 2 and Tier 3 products can be Greenlit, built and Launched, which needs Tags (from
Launched products) and Matching Leads (Tier 2 talent). Specialising in a sector pays through Domain Expertise.

The game after this slice:
- **Tags (§14.B.2, ruling #5).** Every Launched product in a player's Ops Zone provides its printed Tag, Active or not.
  Products in Development provide nothing. The expansion's Tier 3 cards provide no Tag.
- **Greenlight checks dependencies (§6, §14.B.2).** For each Tag the product requires (one or two, ruling #21):
  - the player provides it: free;
  - otherwise some other player provides it: pay a **$3 License** to one of them, the greenlighting player's choice;
  - nobody provides it: the card can't be Greenlit.
  - (Partners, whose License is $0, arrive in slice 7; Patent Trolls' $5 in slice 6; Face-Down Greenlight in slice 9.)
- **Leads (§3, §7.B).** A Tier 2/3 project needs a Matching Lead on its team:
  - Senior Backend: leads Software. Senior Hardware: leads Hardware. Firmware Specialist and Full Stack Ninja:
    cross-functional, leading both, and a hybrid alone.
  - PMs and Specialists never lead. (Badged Juniors arrive in slice 5, Visionary in slice 6.)
  - A staff member with an Onboarding Token leads nothing that turn (the Rust engine; §6: the token "cancels all the
    effects of the talent").
- **Stalled (§3).** A Tier 2/3 project with no lead it can use generates nothing: the whole team, QA included.
  - Software product: needs a Software or cross-functional lead.
  - Hardware product: needs a Hardware or cross-functional lead.
  - Hybrid: either lead lets it progress.
- **Launch's lead check (§6).** A Tier 2/3 pure product needs one Matching Lead to Launch; a hybrid needs a Software
  and a Hardware lead, or one cross-functional lead.
- **Domain Expertise (§19.A).** If the player has an Active product in a sector (Pink, Gold, Gray or Green; never
  Infrastructure or the White Concept cards), a product of that sector they Greenlight costs 2 cubes less.
  - Single-color products lose 2 of that color. A hybrid's owner chooses: −2 Blue, −2 Red, or −1 of each.
  - No color goes below 0, and the total never goes below 1 cube.
  - The cut is locked at Greenlight.
- **Senior traits whose systems exist now (§20.B.1):**
  - **The Diva (Ego):** can't be Reassigned; a Pivot fires her to the Open Job Market instead of benching her.
  - **The Engineer (Efficient):** salary $1 while in the Ops Zone.

## Calls (the builder's)

- **What this slice leaves out:** Partners (slice 7), Patent Trolls (6), Face-Down and the Audit (9), badged Juniors
  and Mentor (5), Visionary (6), the Hacker's and the Architect's Bug traits and the Fixer's QA mode (4), the Full Stack
  Ninja's poach multiplier (8).
- **The License payee is a choice** when several players provide the Tag (rulebook: "your choice if several do"). The
  Rust engine picks the lowest seat; the rulebook wins. With one provider the payment is automatic.
- **A hybrid's Domain Expertise cut is a choice** among the options that keep every color at 0 or more and the total at
  1 or more (rulebook). The Rust engine always splits −1/−1; the rulebook wins. A single valid option is automatic.
- **A product's type (Software, Hardware, Hybrid) comes from its cost after the cut**, as in the Rust engine
  (`project_rules.rs:549-586`). The live cases are Tier 2: **Smart Grid** (2 Blue / 10 Red) and **Bio-Fuel Cell**
  (2 / 12) cut by 2 Blue become pure Hardware, so one Hardware lead Launches them and a Senior Backend alone stalls them.
  The Rust engine never reaches this (its −1/−1 never empties a Tier 2 color); this call goes on the list for the owner.
- **Who leads is worked out from role and skill** (R2 below), not a column: a `leads` column holding "software" or
  "hardware" breaks the compile, since those values are also skills.
- **Tags are text columns:** `tag`, `requires`, `also requires`, as 1a's R8 settled. Matching is by value.
- **Rulings pinned as examples:** #3 (Fusion Reactor needs Robotics and AI, in the data); #9 (the Diva on a Pivot); #18
  (drafting a Tier 2 needs no Tag); #21 (NFT Marketplace needs Platform, not Commerce: card text wins over the sector
  trees); #25 (the payee choice, the hybrid split, no Domain Expertise for Concept, the cut locked at Greenlight). Both
  halves of #5 need Offline, so #5 is pinned in slice 4.
- **What also waits for later slices** because it reads Tier or Tags: First Mover Advantage, Platform Power, Full Stack
  Founder and the Junior PM's Pending Badge (slice 5); Crunch Time's "not Stalled" and Angel Investors' tier test
  (slice 6); Integration pairings (slice 8); Ghost Progress and Missing Dependency (slice 9).

## What the language gains

These are general pieces. None of them mentions Startup Simulator.

1. **Conditions comparing two cards' columns,** across players' zones: "some other player has a card in their
   operations whose tag is the card's requires".
2. **Derived card properties built from attached cards:** "a project is led when a working card on it leads its kind",
   "a project is stalled when …".
3. **A player pick limited by a condition** (the providers of a Tag) that is skipped when only one player qualifies.
4. **A choice among options at a press,** skipped when only one option is valid (the hybrid cut).
5. **Per-card cost adjustments** stored as counts on the card, read by "feature complete" and by output.
6. **Example vocabulary** for all of the above.

## The page

- Each project shows its Tier, its Tag and requirements, and "Stalled" when it has no usable lead.
- The License payee and the cut choice appear as choices in the private strip.

## Examples to cover

| Example | Expect |
|---|---|
| A Tier 2 Greenlight with the Tag | free when the player provides it |
| Paying a License | $3 to the only provider |
| Choosing whom to pay | two providers: the player picks one |
| Two missing Tags | $3 to a provider of each |
| No provider | the card can't be Greenlit |
| Development provides nothing | a Greenlit-but-unlaunched product doesn't satisfy a Tag |
| Stalled | a Tier 2 Software project with only a Hardware Senior generates nothing |
| Hybrid progress | a hybrid led by one Senior Backend: its Hardware Junior generates Red too |
| Hybrid Launch | refused with one Senior Backend; allowed with a Firmware Specialist |
| An onboarding lead | a Reassigned Senior leads nothing that turn |
| Refused when the Licenses can't be paid | nothing changes (§6: you may only take an action you can pay for) |
| One provider of both Tags | gets $6 |
| A player who has the Tag pays nobody | even when rivals have it too |
| Greenlight without a lead | allowed, and the project is Stalled (§14.B.2) |
| Drafting needs no Tag (#18) | a Tier 2 card drafted with no provider in play |
| Card text wins (#21) | NFT Marketplace needs Platform, not Commerce |
| The type after the cut | Smart Grid cut by 2 Blue Launches with one Senior Hardware; a Senior Backend alone stalls it |
| A lead Reassigned away this turn | the Launch is refused |
| Domain Expertise | an Active Pink product cuts a Pink product's cost by 2, Tier 1 included |
| No Expertise for Infrastructure or Concept | full cost |
| The hybrid cut | on Sleep Monitor (2/4) the player picks −2 Blue, −2 Red or −1/−1 |
| The cut is locked | losing the sector product later doesn't restore the cost |
| Pivot clears the cut | the card drafted back later costs full price |
| Commit stops at the need | cubes beyond the cut cost are lost |
| The Diva | can't be Reassigned, from a project or the Ops pool; can be Recalled; a Pivot fires her to the Open Job Market (#9) |
| The Engineer | $2 salary in Development, $1 in the Ops Zone |
| Fusion Reactor (#3) | needs Robotics and AI |

## Goals

- Startup Simulator through slice 3 compiles with no diagnostics; its examples cover the table above.
- Long runs at 2 to 5 players Greenlight and Launch Tier 2 products, and the Growth Deck drains to the Crash naturally.
- Hearts, Color Match, Venom and Rent Day pass unchanged.

## Anti-goals

- No Startup Simulator words in shared code (Tag, Lead, License, Tier, Stalled, sector and the like).
- A license paid to a player who doesn't provide the Tag, or a Greenlight allowed with no provider.

## Proof (acceptance)

1. The examples above pass, with every number checked against the rulebook.
2. Long runs end at every player count, with the earlier invariants plus: every License goes to a provider of its Tag;
   no Tier 2/3 project gains cubes in a turn it has no usable lead.
3. Each language piece has unit tests; the four games and typecheck pass.

## Builder-check rulings

The builder check (`builder-check-startup-3.md`) found nothing that needs the user. Every call below is the builder's,
adopted from its recommendations C1–C11.

### R1. Choices carried by the press (C1)

- A press carries its choices: a line in a button's `Then:` naming "another player of their choice who …" is a choice
  line, and so is a block of options each with its own `Only if` lines. Choices are keyed by their order; the press
  may carry `choices: [...]` (Json).
- Candidates are judged when the press is checked, after every `Only if` and before any `Then:` line. One valid
  candidate is filled in (the spec's "skipped"); several and none named, or a named one that isn't valid, refuse the
  press with a prompt naming them ("Pick who gets the license for Commerce: p1 or p2."). Undo and replay stay exact.
- The view lists each choice's options with verdicts per card candidate; a card whose only missing piece is a choice
  counts as allowed.
- Examples: "When p0 greenlights the Neobank", "…, paying p2", "…, paying p1 and p2" (line order), "…, choosing cut 2
  blue" (each option has a short label).
- The auto-player picks from the view, and the long runs tally each choice path.
- Slices 4 (Growth Hacker attachment), 9 (Disclosure, Settle) and 10 (Come Clean) reuse this piece.

### R2. Leads worked out from role and skill (C2)

- Worked flags: "Leading software" (a Senior Developer card that is a software or flex card and not onboarding),
  "Leading hardware" (the same with hardware). A cross-functional lead is both flags. Slices 5 and 6 widen the
  `one of` (a badged Junior with the skill; Visionary).
- "Stalled": not a Tier 1 card, and for each color, either its need in that color is 0 or no card on it leads that
  color. "Fully led": for each color, Tier 1, or need 0, or some card on it leads that color. Verified against the
  Rust engine's lead coverage with no mismatch.
- Output: "A stalled card's blue team output is 0." (and red). Launch gains "Only if it is fully led."

### R3. The cut is stored; the need is worked (C3)

- Counts on cards: blue cut and red cut. Worked values: a card's blue need is its blue cost, less its blue cut (and
  red). Feature complete, the Commit cap, Stalled and Fully led read the need; the 1b cubes invariant becomes "cubes
  never exceed the need".
- Greenlight sets the cut every time (0 when no Expertise applies); Pivot clears it.
- Domain Expertise applies to Tier 1 as well (the Rust engine has no tier test); single-color products lose
  `min(2, cost − 1)`; a hybrid's options are the ones keeping each color at 0 or more and the total at 1 or more.

### R4. Licenses must be affordable (C4)

- The Greenlight is refused when the player can't pay the Licenses (§6; the Rust engine refuses before anything
  moves). Written in the text as `Only if one of:` blocks per requirement (and one for both missing at once).
- "The license" is a game number, so slice 6's Patent Trolls is a text change.

### R5. Comparing cards (C5)

- Group filters by equality: "whose {attribute} is {value}" and "whose {attribute} is the card's / its {attribute}"; an
  absent value matches nothing.
- New conditions: "they have a card in {zones} whose …"; "some player / another player has a card in their {perzone}
  whose …" (inside it "their" is that other player); "the card has no {attribute}", "it has no {attribute}".
- Tags and Domain Expertise are button conditions (the press has a player and a card); Stalled and Fully led are
  worked flags (no player needed). Leave room for a flag filter ("… that is not offline") for slice 4.

### R6. Traits and card-subject phrases (C6)

- The Engineer: a worked flag (an Efficient card in an ops team) and a `Salary:` line "An … card's salary is 1."
- The Diva: both reassign buttons gain "Only if the card is not an Ego card."; Pivot first sends "every card on it
  whose trait is Ego" to the open job market (she leaves without an Onboarding Token); Recall stays open to her.
- Card-subject phrases: `it is {cardclass}`, `it is not {cardclass}`, `it is not {cardflag}`, `its {attribute} is
  {int}`, `it is in a {perzone}`, `some card on it is {cardflag}`, `no card on it is {cardflag}`.

### R7. What slice 3 changes in 1b (C7)

- Removed: the Tier 1 Greenlight gate and its example. Rewritten: Feature complete and Commit (R3), Pivot (the cut, the
  Diva), the 1b auto-player's Tier 1 Greenlight. Invariants: money gains player-to-player License flows (each License
  goes to a provider of its Tag); cubes read the need. Any 1b example that Greenlights a product while an Active product
  of its sector is in Ops is re-checked, since Expertise now applies.

### R8. Size and order (C9, C11)

- **Plan 3-1, language and rules** (about 8 tasks): card-subject phrases and value lines; comparing cards; a chosen
  player in a press; choosing among options in a press; rules text A (Tags, Licenses and their guard, Domain Expertise,
  the 1b changes); rules text B (leads, Stalled, Fully led, the Diva, the Engineer); long runs with an auto-player that
  hires Seniors and Greenlights Tier 2/3, choice tallies and the new invariants (keeping 1a's dig for the Growth Deck);
  the word check with slice 3's banned words added (tag, lead, license, tier, stall, sector, expertise).
- **Plan 3-2, the page** (about 3 tasks), written after plan 1b-3 lands: faces and tableaux show tier, Tag, requires,
  the need and "Stalled" (worked values read through the runtime per visible card); payee and cut pickers; happy-dom
  tests and the browser check.

## Left to the builder

- Exact wordings; how choices appear on the page; the auto-player's choices.
