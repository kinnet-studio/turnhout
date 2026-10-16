# Startup Simulator, Slice 3: Tiers, Tags and Leads

**Date:** 2026-10-16
**Status:** Draft, waiting for its builder check. The user handed over every design call for the full implementation;
the calls below are the builder's.
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
- **A product's type (Software, Hardware, Hybrid) comes from its cost after the cut**, as in the Rust engine: Smart Lock
  (1 Blue / 5 Red) cut −1/−1 becomes a 0 Blue / 4 Red product.
- **Who leads is data:** a `leads` column in the talent table (software, hardware, both, or blank), from §7.B's table.
  Slices 5 and 6 add the badged Junior and Visionary as derived cases.
- **Tags are text columns:** `tag`, `requires`, `also requires`, as 1a's R8 settled. Matching is by value.
- **Rulings pinned as examples:** #3 (Fusion Reactor needs Robotics and AI, in the data), #5 (an Offline product still
  provides its Tag; Domain Expertise counts Active products only — every product is Active until slice 4, so this one is
  pinned in slice 4), #18 (drafting needs no Tags), #21 (card text wins over the sector trees).

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
| Domain Expertise | an Active Pink product cuts a Pink product's cost by 2 |
| No Expertise for Infrastructure or Concept | full cost |
| The hybrid cut | the player picks −2 Blue, −2 Red or −1/−1 |
| The cut is locked | losing the sector product later doesn't restore the cost |
| The Diva | can't be Reassigned; a Pivot fires her to the Open Job Market |
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

## Left to the builder

- Exact wordings; how choices appear on the page; the auto-player's choices.
