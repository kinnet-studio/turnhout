# Startup Simulator, Slice 8: Selling, Poaching, Hit Piece, Integration and the CTO

**Date:** 2026-10-16
**Status:** Settled after its builder check (see "Builder-check rulings" at the end). The user handed over every design call for the full implementation;
the calls below are the builder's.
**Part of:** `2026-10-16-startup-simulator-overview-design.md`. Its decisions, calls, anti-goals and constraints apply.
**Builds on:** slices 1a to 7.
**Rulebook sections:** §6 Acquisition and Divest (products), §7 Liquidation (M&A Price, Acquisition, Market Sale, Fire
Sale) and the Headhunter summary, §10, §11.D.1 (Crisis Management), §11.G.2 (CTO), §12 line 1 (Scandal, the Host
bonus), §16, §18.B (destroyed Equity), §20.A Warfare and Cease & Desist, §20.B (Mercenary), §20.D Recruiter Frenzy and
Headhunter Holiday, Rulings #6, #15, #16, #22, #24.

## What this slice is

Products and people change hands. Players buy and sell Launched products at a fixed M&A Price, poach staff from rivals'
projects with Strategy cards (and defend with Vest and Cease & Desist), smear rivals with Hit Pieces, stack their own
products into ecosystems, and crown a CTO.

The game after this slice:
- **The M&A Price (§7):** Tier 1 $6, Tier 2 $12, Tier 3 $20; +$5 per Hype and per attached Specialist; −$5 per Scandal
  and −$1 per Bug; never below $0.
- **Acquisition (buyer's turn, 1 AP):** name a rival's Maintenance product; the seller must consent and the buyer must
  have spare Ops bandwidth for it in each color after their Online products. The buyer pays the full M&A Price to the
  seller and gets the card, its Hype, Scandal and Bug tokens, and its attached Specialists. It arrives Online. The seller
  keeps its Market Share.
- **Divest a product (seller's turn, 1 AP):** a Market Sale offers it to rivals in turn order at the full M&A Price, to
  the first who consents and has the bandwidth. If none does, a Fire Sale: the bank pays 50% (rounded down), the card
  goes to the Open Idea Pool, attached Specialists go to the seller's Bench, pooled Ops staff stay.
- **A product leaving its owner's Board** breaks its Integration stack and sends Consultants back to their Investors.
- **Poaching (§16; 0 AP; Headhunter $0 or Corporate Raider $2):**
  - Target: a staff member on a rival's Development team. The Bench and the Ops Zone are immune.
  - It fails against: an HR Manager on the team (Corporate Raider ignores it), Investor Immunity (the poacher holds the
    target player's Equity), a Vest token, a CTO, or Headhunter Holiday.
  - The poacher names the destination: one of their Development projects, or their Ops Zone if it runs a product (a Sales
    Rep or Growth Hacker attaches to a named product). Never their Bench.
  - Fee to the bank: (printed cost + Token Value) × multiplier. Token Value: +$2 per XP, Skill, Pending XP token and
    Attribute; +$4 for a Gold Badge on a University Junior (none on Specialists or the Junior PM). Multiplier ×2; ×1.5
    for Corporate Raider or a Full Stack Ninja target; ×1 for Flight Risk or Recruiter Frenzy; the lowest applies; ×1.5
    rounds up.
  - The victim may then cancel it: **Vest** (place one of their own Equity tokens on the employee, locking it) or **Cease
    & Desist** (Strategy card). Either way the poacher gets the fee back, not the card's price.
  - Otherwise the employee moves with everything on it and gets an Onboarding Token (even on an Agile team). Pending XP
    stays; a Junior PM's Pending Badge is lost unless it joins a Tier 2/3 project. Joining a project has Assign's entry
    effects (the Hacker's Bug). A project losing its Lead Stalls.
- **Destroyed Equity (§18.B, ruling #16):** a player's own Equity on an employee (Vest or CTO) is destroyed when that
  employee is fired, dismissed, left unpaid, or discarded from the Bench.
- **Hit Piece ($3):** +1 Scandal on a rival's Maintenance product (not a Founder whose Equity the player holds).
  Scandal is −5 VP each (a product can score below 0) and −$5 on the M&A Price.
- **Crisis Management (§11.D.1):** a Director of QA (badged QA Engineer) in the Ops Zone removes Scandal before Bugs, up
  to its Bug-removal count, from any of its owner's Maintenance products, Offline ones included.
- **Integration (§10; 0 AP):** stack a Client under a Host in the player's own Maintenance Zone, by Tag:
  - Hardware Hosts (Device, IoT, Robotics) host App, Data, Media, AI.
  - Digital Hosts (Platform, Cloud) host Commerce, Crypto, Media.
  - The Metaverse hosts Social, Media, Commerce; the Fusion Reactor hosts Bio, Energy, IoT.
  - One Client per Host; a Client can't be a Host; never two cards of the same Tag.
  - While both are Active: the Client earns +$2 and ignores Bug Decay; at game end the Host scores +5 VP.
- **CTO (1 AP, §11.G.2):** promote a Tier 2 unit on the player's Board: pay $5 to the bank and attach one of their own
  Equity tokens (even the last). At most one per player. The CTO can't be poached; its Development project can't be
  Audited (slice 9) except on a turn it has an Onboarding Token. Firing it destroys the token.

## Calls (the builder's)

- **What this slice leaves out:** the Broken Chain and Come Clean on a sale (slice 10), Bankruptcy's forced sales
  (slice 10), the CTO's Audit Shield in effect (slice 9).
- **Cease & Desist and Vest are offered in a reaction window** after the fee is paid, to the victim only, before the
  transfer (§16.D.2: "immediately"). The window opens when the victim has an Equity token in supply or any Strategy
  card in hand (both public; R4).
- **A Market Sale asks rivals in turn order from the seller's left;** the first who accepts buys. A rival without the
  bandwidth or cash isn't asked.
- **Integration choices** are made by the owner in Phase C (0 AP); a stack whose card leaves breaks at once (§10.D).
- **Rulings pinned as examples:** #6 (the poaching fee), #15 (the poaching procedure), #16 (Equity destroyed on firing),
  #22 (Acquisition needs consent), #24 (×1.5 rounds up; only a Junior's Badge adds Token Value; poach refunds; selling a
  product).

## What the language gains

1. **Cards changing owner with everything on them,** across players' Boards (attachment from slice 1b, now between
   players).
2. **A reaction window for the target of an action** (Vest, Cease & Desist), after payment and before the transfer.
3. **Offers made in turn order** until one player accepts (the Market Sale).
4. **Prices summing tokens and attached cards** with a floor, and multipliers with rounding up.
5. **Pairing two cards** under a compatibility table written in the rules text.
6. **Example vocabulary** for all of the above.

## The page

- Integration stacks show the Client tucked under the Host.
- Vest and CTO tokens show on their employee; Scandal as a badge.
- Reaction windows and offers appear in the deciding player's strip; the switcher jumps to them.

## Examples to cover

| Example | Expect |
|---|---|
| M&A Price | Tier 2 with 1 Hype and 1 Bug: $16 |
| Acquisition | with consent and bandwidth; tokens and attached Specialists move; Market Share stays |
| No bandwidth, no buy | refused |
| Market Sale | the first rival in turn order who accepts buys |
| Fire Sale | nobody buys: 50% rounded down from the bank; the card to the Open Idea Pool |
| Poach | a raw Junior costs $4; a Super Junior $16; a Ninja ×1.5 rounded up |
| Poach defenses | HR Manager, Investor Immunity, Vest, CTO, Headhunter Holiday each stop it; Corporate Raider passes HR |
| Ops and Bench are immune | refused |
| Vest | the poach is cancelled and the fee refunded; the token is locked |
| Cease & Desist | cancelled and refunded |
| The transfer | Onboarding Token even on an Agile team; the Hacker's Bug on joining; the old project Stalls without its Lead |
| Destroyed Equity | a Vested employee fired: the token leaves the game |
| Vest survives the Bench | a Pivot sends a Vested employee to the Bench; the mark and the locked token stay |
| Sold with a Vest | a Vested Sales Rep leaves with an Acquired product: the seller's token leaves the game; a Fire Sale keeps it |
| Integration breaks on sale | selling the Host breaks the stack; the Client stays with its owner |
| No Offline by choice at game end | everything fits: a −5 Scandal product stays Online and scores −5 |
| Window with an empty supply | a victim with no Equity in supply and an empty Strategy Hand: the transfer happens at once |
| Hit Piece | +1 Scandal; not against a Founder whose Equity you hold |
| Scandal scores | −5 VP each, below 0 possible |
| Crisis Management | a Director of QA removes Scandal before Bugs |
| Integration | an App on a Device: +$2 and no Bug Decay for the App, +5 VP for the Device |
| Broken by Offline | either half Offline: no bonuses |
| CTO | $5 and a token on a Tier 2 unit; one per player; can't be poached |

## Goals

- Startup Simulator through slice 8 compiles with no diagnostics; its examples cover the table above.
- Long runs at 2 to 5 players trade products, poach, defend, smear and integrate, and reach the Crash.
- Hearts, Color Match, Venom and Rent Day pass unchanged.

## Anti-goals

- No Startup Simulator words in shared code (poach, Vest, Scandal, Host, Client, CTO, M&A and the like).
- A poach that both transfers the employee and refunds the fee.

## Proof (acceptance)

1. The examples above pass, with every number checked against the rulebook.
2. Long runs end at every player count, with the earlier invariants plus: every card's owner matches its zone after a
   transfer; at most one CTO per player; no Host with two Clients.
3. Each language piece has unit tests; the four games and typecheck pass.

## Left to the builder

- Exact wordings; how stacks and windows look; the auto-player's choices.

## Builder-check rulings

The builder check (`builder-check-startup-8.md`) raised four questions. The user handed every design call to the builder;
these are the calls.

- **R1. Vest and CTO tokens are a mark on the employee plus a parked card (slice 6 R2's pattern), not attached cards.**
  - Vesting or promoting puts `1 vest` or `1 cto` on the employee and moves one of the player's own supply tokens to a
    public per-player "locked equity" pile. Destroying the token strips the mark and boxes one locked card; every locked
    card is the player's own, so any one will do.
  - The mark rides with the employee through Recall, Pivot, the Bench and slice 9's Fold, and hides with it on the Bench,
    as slice 5 R4 and slice 6 R2 provide. Destruction (§18.B: firing or a Bench discard) hooks into the existing "firing
    strips tokens" lines.
  - When a Vested or CTO employee leaves with a product in an Acquisition or Market Sale, the seller's token is
    destroyed (§16.D.2 "can't be sold or moved"; Rust's `release_talent`). A Fire Sale returns the employee to the
    seller's Bench, and the token stays.
  - Why: the employee is often on the hidden Bench, where 1b R3's check forbids a holder; and unlike a Consultant (slice 7
    R1) the token's identity never matters, since it is always its holder's own and never moves or trades.
- **R2. An Integration is attachment inside operations.**
  - The Client stays in "their operations" with its holder (`lang:on`) set to the Host; operations gets slice 4 R5's
    `'some'` mark (a zone where some cards sit on cards). "One Client per Host" is "no product card on it", and "a Client
    sits under only one Host" (§10.A) holds by construction.
  - Every rule that takes a product off its owner's Board first breaks the stack it is in, then returns Consultants
    (slice 7 R1), then moves the product with everything on it. "With everything on it" therefore never carries a
    Client.
  - Lines that count staff on a product name staff ("the talent cards on it"); a product card has no rev bonus value, so
    the existing sums don't change.
  - Why: one attachment mechanism and its check, no zone phrase changes, and the stack breaks by explicit, checked lines.
    The overview's "never in the holder's zone" is amended for this one case.
- **R3. No product goes Offline by choice at the game-end check** (§12 step 2: "If all your products fit, they are all
  Online"). When some product must go Offline, the choice is already any set that leaves the rest fitting (slice 4 R6),
  so a Scandal product may be chosen then. This answers the question slice 4 carried here; pinned by an example.
- **R4. The Vest / Cease & Desist window opens when the victim has an Equity token in supply or any Strategy card in
  hand.** Both are public, so whether the window opens reveals nothing about the hidden hand (the overview's
  hidden-information anti-goal). With neither, the transfer happens at once. The victim may always let it go.
