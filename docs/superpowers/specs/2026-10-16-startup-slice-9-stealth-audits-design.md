# Startup Simulator, Slice 9: Stealth and Audits

**Date:** 2026-10-16
**Status:** Settled after its builder check (see "Builder-check rulings" at the end). The user handed over every design call for the full implementation;
the calls below are the builder's.
**Part of:** `2026-10-16-startup-simulator-overview-design.md`. Its decisions, calls, anti-goals and constraints apply.
**Builds on:** slices 1a to 8.
**Rulebook sections:** §2 (Stealth Bonus markers), §5 Phase D step 3, §6 Greenlight (Stealth), Launch (Face-Down
Launch, Stealth Bonus) and Voluntary Disclosure, §7.A–D, §12 line 7, §14.B.3, §17.B.3 (Stealth rights), §20.D
Whistleblower Protection Act and Patent Trolls' Late License, Rulings #4, #11, #17, #21, #25's audit items.

## What this slice is

Players may build in secret. A Face-Down project hides what it is; Launching it earns a Stealth Bonus. Rivals may pay
to Audit a Face-Down project in the owner's Engine phase; a bluff that is caught must Fold or Settle.

The game after this slice:
- **Face-Down Greenlight (§6, §14.B.3).** Any product may be Greenlit Face-Down. It is **legal** with Secured Access to
  every Tag it needs (the player provides it, or is Partners with a provider). Without it the player is **bluffing**,
  which is allowed as long as some player provides each Tag. With no provider at all it can't be Greenlit either way.
  No License is paid Face-Down.
- **What rivals see (the overview's call):** a Face-Down project's staff, but not its identity, cubes or Tier.
- **The Audit window (Phase D step 3, §7.A),** after Generate and Clean and before Commit, on the active player's
  Face-Down projects:
  - An opponent with at least $3 declares an Audit on one Face-Down project; if several want to, the first in turn order
    after the active player does. Bidding opens at $3.
  - Once around the table in turn order from the player after the declarer, each other opponent (never the active
    player) may raise by at least $1 or pass. The declarer doesn't bid again. The highest bidder is the Whistleblower
    and stakes the bid.
  - The card is flipped Face-Up and checked (§7.B):
    - **Ghost Progress (Tier 2/3):** new cubes this turn but no usable Lead (a hybrid needs one matching Lead).
    - **Missing Dependency:** a required Tag that the owner neither provides nor has from a Partner.
  - **Legal:** the Whistleblower pays the bid to the owner; the card stays Face-Up; the new cubes commit.
  - **Illegal:** the bid comes back. If a missing Tag exists nowhere, the owner must Fold; otherwise they choose:
    - **Fold:** the project is scrapped (Open Idea Pool, all cubes gone, staff to the Bench without Onboarding,
      Pending XP and Pending Badges lost, the Diva fired). The owner pays $5: $4 to the Whistleblower, $1 to the bank.
    - **Settle:** the project becomes legal and its new cubes commit. The owner pays the bank $3 plus, per missing Tag,
      $3 to a provider of their choice; Ghost Progress alone costs $3 more to the bank instead. Allowed only if cash
      plus the Fire Sale value of all their Maintenance products covers it. The bank pays the Whistleblower $4 ($8
      during Whistleblower Protection Act).
  - Then any opponent may declare an Audit on another Face-Down project. A card is audited at most once.
  - **Audit Shield:** a project with a working CTO can't be audited.
- **Voluntary Disclosure (0 AP, Phase C):** flip a Face-Down project Face-Up, giving up its Stealth Bonus. Free with
  Secured Access; otherwise a $4 Late License per Tag from a non-Partner ($3 to a provider of their choice, $1 to the
  bank; $5 + $1 during Patent Trolls). Impossible if a needed Tag has no provider.
- **Face-Down Launch (§6):** the card turns Face-Up with no Tag check, and the owner takes a Stealth Bonus marker:
  +5 VP for Tier 2, +10 VP for Tier 3, kept for good.
- **The score gains** Stealth Bonus markers (§12 line 7).

## Calls (the builder's)

- **What this slice leaves out:** Bankruptcy when a Fold or a Settlement can't be paid (slice 10). Until then a Fold
  the owner can't cover is paid as far as cash goes (the Whistleblower first) and the rest forgiven (§7.C), and Settle
  is offered only when cash alone covers it.
- **Cubes become new and committed for real:** Generate adds new cubes; the Audit checks them; Commit moves them.
  Slice 1b already wrote the two steps apart.
- **Declaring an Audit is offered in turn order from the active player's left,** one window per Face-Down project
  still unaudited, and closes when every opponent passes. The auto-player audits now and then, so the rule is played.
- **A Tier 1 product may go Face-Down;** it needs no Tags, so it is always legal, and it earns no Stealth Bonus (§6
  lists bonuses for Tier 2 and Tier 3 only).
- **Rulings pinned as examples:** #4 (the Audit sits between Clean and Commit), #11 (Partners give Secured Access), #17
  (Stealth Bonus markers), #21 (bluffs need a provider somewhere), #25's audit items (Settle per missing Tag; Ghost
  Progress may Settle; bidding and repeat audits; Disclosure only in Phase C; Face-Down Launch has no Tag check; Settle
  needs cash plus Fire Sale value).

## What the language gains

1. **Face-down cards in a public zone,** revealed later (overview item 12), with attached cards still visible: the view
   hides the card and its counts from rivals.
2. **An auction once around the table among players other than the active one** (building on Rent Day's auction).
3. **A check whose outcome branches to a choice** (Fold or Settle) with a forced branch.
4. **Example vocabulary** for all of the above.

## The page

- A Face-Down project shows a card back with its staff; its owner sees it face up.
- The Audit window and the bidding appear in the deciding player's strip; the result shows on the table.
- Stealth Bonus markers join the owner's tableau.

## Examples to cover

| Example | Expect |
|---|---|
| A legal Face-Down Greenlight | with the Tag: no License, hidden from rivals |
| A bluff | without Secured Access but with a provider: allowed |
| No provider | can't be Greenlit Face-Down either |
| Hidden from rivals | rivals see the staff, not the card, cubes or Tier |
| Declaring an Audit | needs $3; the first in turn order after the active player declares |
| Bidding | once around; the declarer doesn't bid again; the highest stakes the bid |
| A legal project | the Whistleblower pays the owner; the card stays Face-Up |
| Ghost Progress | a Tier 2 project with new cubes and no Lead is illegal |
| Untrackable bluff | p1 saw Neobank drafted into p0's backlog; after p0's Face-Down Greenlight, no id in p1's view says which card it was |
| Rivals see the staff | modes, Pending XP, XP and Skills show on a Face-Down team; no Pending Badge, Stalled or need |
| Patent Trolls | the Settlement's Tag fee is $5 during Patent Trolls |
| Fold returns Consultants | a Fold sends the Founder's staff to the Bench and the Investors' tokens back, unplaced |
| Missing Dependency | a bluffed Tag is illegal |
| Forced Fold | a missing Tag that exists nowhere |
| Fold | scrapped, $4 to the Whistleblower, $1 to the bank |
| Settle | $3 + $3 per missing Tag; Ghost Progress only: $6 to the bank; $4 bounty from the bank |
| Settle needs cover | refused when cash plus Fire Sale value is short |
| Audit Shield | a working CTO's project can't be audited |
| Voluntary Disclosure | free with Secured Access; $4 Late License otherwise |
| Face-Down Launch | no Tag check; +5 VP marker for Tier 2 |

## Goals

- Startup Simulator through slice 9 compiles with no diagnostics; its examples cover the table above.
- Long runs at 2 to 5 players Greenlight Face-Down, audit, Fold and Settle, and reach the Crash.
- Hearts, Color Match, Venom and Rent Day pass unchanged; the Hearts demo shows no change from face-down cards in a
  public zone.

## Anti-goals

- **A Face-Down project's identity, cubes or Tier visible to a rival** in any view.
- No Startup Simulator words in shared code (Audit, Whistleblower, Fold, Settle, Stealth and the like).

## Proof (acceptance)

1. The examples above pass, with every number checked against the rulebook.
2. Long runs end at every player count, with the earlier invariants plus: no rival's view contains a Face-Down card's
   name or counts; each card is audited at most once.
3. Each language piece has unit tests; the four games and typecheck pass; a no-regression check of the Hearts demo.

## Left to the builder

- Exact wordings; how hidden projects look; the auto-player's choices.

## Builder-check rulings

The builder check (`builder-check-startup-9.md`) raised three questions and settled three smaller ones. The user handed
every design call to the builder; these are the calls.

- **R1. A Face-Down card can't be followed by its id.** A card keeps one id for its whole life and seat views list hidden
  cards with their ids, so a card a rival saw drafted face up would be identified once played Face-Down, making its
  Audit risk-free. At a Face-Down Greenlight, the greenlit card and every card left in that player's backlog get fresh
  ids (from the game's card counter, `lang:next-card`), keeping slot order, so a rival can't tell which backlog card
  became the project.
  - It is an effect in this game's text ("their backlog's cards are shuffled out of sight" or similar), built as a
    general language effect but used by no other game; no shared view code changes, and Hearts is untouched.
  - Nothing is attached to backlog cards and the greenlit card has nothing on it yet, so no holder needs rewriting. Replay
    stays exact, since the ids come from the counter in the state.
  - If re-keying clashes with something the builder finds (deck bookkeeping, examples that claim cards by id), the
    fall-back is per-viewer aliases in the seat view, switched on only for games with face-down placement.
  - Why: the anti-goal says a Face-Down project's identity is visible to no rival in any view, and 1a R8 already treats
    an id that locates a hidden card as a leak.
- **R2. No faking progress: Stalled applies Face-Down too.** Ghost Progress (new cubes, no usable Lead) is written as
  specified, but the engine never generates on a Stalled project (slice 3 R2; the Rust engine likewise), so it never
  fires in play. It and the Ghost-only Settle are pinned by examples that arrange new cubes in the Audit window. Long
  runs reach Fold and Settle through Missing Dependency. Why: the rulebook states the Lead rule as a prohibition, not a
  bluff (only Tag bluffing is licensed, §14.B.3, #21). On the owner's list, as a rule that never fires in long runs.
- **R3. Rivals see each staff card on a Face-Down project as it is, and nothing worked out from the hidden card.**
  - Shown: declared modes, Pending XP, XP, Skills, Attributes, Onboarding and the `cto`/`vest` marks — tokens and
    declarations a table would show. This answers slice 4 R9 (modes) and slice 5 R12 (Pending tokens).
  - Hidden: the Pending Badge, Stalled, the need, the cut, Feature complete, and the card's name in any prompt, verdict
    reason or tableau line (a Veto prompt for a Face-Down Launch doesn't name the card).
  - Inference from public outcomes is accepted, not engineered away: a Pending XP token appearing, Angel Investors'
    payout, a Launch being declared. The proof's invariant reads: no rival's view contains a Face-Down card's name, its
    counts, or a value worked out from it.
- **R4 (the builder's own).** Patent Trolls' $5 Settlement Tag fee (§20.D) lands here, since no other slice lists it. A
  Fold returns Consultants as Pivot does (slice 7 R1). The declaration offer restarts from the active player's left after
  each verdict, as the Rust engine resets its passes.
