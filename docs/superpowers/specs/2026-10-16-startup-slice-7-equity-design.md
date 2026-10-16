# Startup Simulator, Slice 7: Equity and the Stock Market

**Date:** 2026-10-16
**Status:** Settled after its builder check (see "Builder-check rulings" at the end). The user handed over every design call for the full implementation;
the calls below are the builder's.
**Part of:** `2026-10-16-startup-simulator-overview-design.md`. Its decisions (notably the Veto and "Equity tokens are
cards"), calls, anti-goals and constraints apply.
**Builds on:** slices 1a to 6.
**Rulebook sections:** §2 (Equity Tokens), §4 (3 Equity per player), §5 Phase A (Consultants) and Phase B step 3
(Dividends), §6 Invest, Secondary Trade, Buyback and Divest (Equity), §8, §9, §12 line 4, §17, §20.A Non-Compete Suit,
§20.D Venture Capital Rain, Rulings #11, #16, #22, #25's Equity items.

## What this slice is

Players invest in each other. Holding a rival's Equity pays dividends, makes the two Partners for free licensing, lends
a Consultant to their products, and gives a Veto over their actions. Equity can be bought back, sold on, or forced back
with a lawsuit, and each rival token held scores 5 VP.

The game after this slice:
- **Equity tokens are cards** (the overview's call): three per player, each naming its Founder. A player's unsold tokens
  are their supply.
- **Invest (1 AP, §17.A):** buy one Equity token from any opponent's supply, paying them the Share Price: $5 if their
  highest Active product is Tier 1 or they have none, $10 at Tier 2, $15 at Tier 3. A Founder never sells the last token
  in their supply (§17.D), so at most 2 of each player's tokens are ever for sale. When bought, the token may be placed
  as a Consultant (below).
- **Dividends (§9, §17.B.1):** at each Founder's Income, after revenue, the bank pays every holder of their Equity, per
  token: $0 when their Operational Revenue is $0, $1 for $1–$10, $2 for $11–$20, $3 for $21 or more. Operational
  Revenue is the revenue the Founder just collected from Active products; dividends and cash on hand don't count.
- **Immunity (§17.B.2):** an Investor can't play a Headhunter or a Hit Piece against their Founder (those arrive in
  slice 8; the condition is written now).
- **Partners (§17.B.3, ruling #11):** two players are Partners while either holds the other's Equity. Partners use each
  other's Tags for free: the Greenlight License is $0. (The Stealth rights arrive with slice 9.)
- **The Consultant (§17.B.4):** a held token may sit on one of the Founder's product cards, Development or
  Maintenance, giving +1 output in a color the Investor picks when placing it (Blue, Red or QA):
  - on a Development project: +1 cube of that color in the Engine (none while Stalled), or +1 Bug removed;
  - on a Maintenance product: +1 Ops bandwidth of that color at the Founder's Income, or +1 Bug removed by Ops QA.
  - If the product leaves the Founder's Board, the token comes back to the Investor, unplaced.
  - At each Round Start the Investor may move it to another of the Founder's product cards (and pick its color again).
  - Two tokens may sit on one card (+2) or on two cards.
- **The Veto (§17.B.5, the overview's ruling):** when a Founder declares an action that costs AP, any holder of their
  Equity may burn one token (it goes back to the Founder's supply) to cancel the action before anything is paid or
  agreed. The AP is spent and nothing else happens. Free actions and the steps of Phases B and D can't be vetoed.
- **Losing and moving Equity (§17.C):**
  - **Buyback (1 AP):** the Founder offers to buy one of their tokens back from an Investor at the current Share Price;
    the Investor accepts or declines.
  - **Secondary Trade (1 AP):** an Investor offers a token to a third player (never its Founder) at the current Share
    Price; the buyer accepts or declines. The Founder can't stop it.
  - **Non-Compete Suit (Strategy card, $4):** the Founder pays an Investor holding their Equity $5, and the Investor
    must return 1 token.
- **Portfolio (§12 line 4):** 5 VP per opponent Equity token held. A player's own tokens score nothing.
- **Venture Capital Rain (§20.D)** comes into effect: an Invest this round pays the Founder +$3 from the bank.

## Calls (the builder's)

- **What this slice leaves out:** Vest and the CTO (slice 8), Immunity's targets (slice 8), Partners' Stealth rights
  (slice 9), Bankruptcy's seizure (slice 10).
- **The Consultant is placed when the token is bought, or later at a Round Start** (the overview's call), never on a
  Talent card. Moving it picks its color again.
- **The Veto window opens for each AP action of a Founder who has an Investor**, at declaration, and asks each holder in
  turn order from the Founder's left; the first to veto cancels it, and the action goes ahead when all pass. The
  auto-player passes. The window cost (one press per holder per action) is accepted for faithfulness.
- **A vetoed action spends its AP even if it would have been refused for another reason later** (the overview's ruling:
  nothing is paid before the window).
- **Buyback and Secondary Trade use the Rent Day consent pattern** (propose, accept or decline), and a decline costs the
  proposer their AP (the action was taken).
- **The hard cap counts the supply only:** a player whose last token is in their supply can't sell it, but Vest and CTO
  (slice 8) may use it.
- **Rulings pinned as examples:** #11 (Partners and fees), #16 (the hard cap; own tokens score 0), #22 (consent), #25's
  Equity items (a Consultant on a Maintenance product adds bandwidth; a Secondary Trade is started by the seller; the
  Veto cancels a declared action; Consultants move at Round Start and two stack).

## What the language gains

1. **Cards created per player at setup** with a column naming their owner (the Founder).
2. **Prices from lookups:** the Share Price from a player's highest Active Tier; the dividend from revenue ranges.
3. **A reaction window at declaration** that can cancel an action (overview items 14 and 7's "before an action
   resolves"), opened only when someone could react.
4. **Relations between players read from held cards** ("they hold an Equity card of X", "Partners").
5. **Score lines per held card by condition.**
6. **Example vocabulary** for all of the above.

## The page

- Each tableau shows the Equity it holds (with Founders) and its supply.
- Consultants show on the product cards they sit on, with their color.
- The Veto window and consent prompts appear in the deciding player's strip; the switcher jumps to them.

## Examples to cover

| Example | Expect |
|---|---|
| Invest | $5 to a Founder with only Tier 1; $10 with an Active Tier 2 |
| The hard cap | the third token can't be bought |
| Dividends | Founder revenue $12: each token pays $2 from the bank |
| No dividend on dividends | a Founder's own dividend income doesn't count toward their revenue |
| Partners | a Partner's Tag makes the Greenlight License $0, both ways |
| Consultant in Development | +1 Blue cube on the project; none while Stalled |
| Consultant in Ops | +1 Red bandwidth at the Founder's Income |
| Consultant returns | the product is scrapped: the token comes back unplaced |
| Moving a Consultant | at Round Start the Investor moves it and picks a new color |
| Veto | the Founder's Recruit is cancelled, its AP spent, the token back in the Founder's supply |
| No Veto on free actions | a Greenlight opens no window |
| Buyback | at the current Share Price, with consent |
| Secondary Trade | to a third player, with the buyer's consent; the Founder can't stop it |
| Founder vetoes a trade of their own token | A holds B's token; B offers A's token to C; A vetoes with B's token, which goes back to B |
| Launch keeps the Consultant | a Launch moves the Founder's staff to Ops; the Investor's token stays on the product |
| Pivot returns the Consultant | a Pivot sends the Founder's staff to the Bench and the Investor's token back to the Investor, unplaced |
| Non-Compete Suit | $4 card, $5 to the Investor, the token returns |
| Portfolio | 5 VP per rival token; own tokens 0 |
| Venture Capital Rain | +$3 to the Founder on an Invest this round |

## Goals

- Startup Simulator through slice 7 compiles with no diagnostics; its examples cover the table above.
- Long runs at 2 to 5 players invest, pay dividends, veto and trade Equity, and reach the Crash.
- Hearts, Color Match, Venom and Rent Day pass unchanged.

## Anti-goals

- No Startup Simulator words in shared code (Equity, Founder, Investor, dividend, Veto, Consultant and the like).
- A vetoed action that pays or moves anything.
- More than 3 Equity tokens of one Founder in play, or a Founder selling their last.

## Proof (acceptance)

1. The examples above pass, with every number checked against the rulebook.
2. Long runs end at every player count, with the earlier invariants plus: each Founder's three tokens are always
   accounted for (supply, held, placed); money is conserved through dividends (bank-paid) and trades.
3. Each language piece has unit tests; the four games and typecheck pass.

## Left to the builder

- Exact wordings; the look of tokens and windows; the auto-player's choices.

## Builder-check rulings

The builder check (`builder-check-startup-7.md`) raised two questions. The user handed every design call to the builder;
these are the calls.

- **R1. A placed Consultant is a cross-seat attachment: one attachment mechanism, widened for marked zones.**
  - The placed token keeps the holder reference (`lang:on`) and stays in the Investor's own per-player zone ("their
    consultants"). That zone is marked as one whose cards sit on other players' cards.
  - The integrity check accepts a holder in another seat only for a card in such a marked zone, and only in a public
    zone of the seat the holder had when the token was placed (stored with the token). A product sold to a third player
    with the token still on it therefore trips the check, which catches a forgotten return.
  - "The cards on it" and "every card on it" mean the cards on it that belong to the holder's owner. A separate phrase
    reads the others ("the consultants on it", "every other player's card on it"). So every 1b–6 line keeps its
    meaning: Launch moves the Founder's staff and leaves the token; team totals, Stalled, leads, Synergy and graduation
    never see it. The Consultant's +1 is its own value line.
  - Rules that take a product off its Founder's Board return the tokens on it explicitly, unplaced: Pivot in this
    slice, product sales in slice 8, Fold and Liquidation in slice 10.
  - Ownership stays the zone's seat, so dividends, Partners, the Veto window, Portfolio scoring and trades read only the
    Investor's zones.
  - The page draws a rival's token on the viewer's product in the viewer's Board, and lists the viewer's own placed
    tokens with the product they sit on in the viewer's tableau line.
  - Why: it keeps the overview's single attachment mechanism and its check, where a second placement relation (a
    parallel mechanism) or a token moved to the Founder's side (breaking ownership by zone) would not. Slice 6 R2's
    counts don't carry over, because a token's identity matters (whose it is, which one moves on a trade).
  - The overview's attachment bullet is amended to match.
- **R2. A Founder may veto a Secondary Trade of their own token** when they hold the seller's Equity. The Veto is a perk
  of holding the seller's Equity, paid for with one of the seller's tokens. "The Founder cannot prevent this sale"
  (§17.C.5) says the Founder's consent isn't needed, as against Buyback; it isn't an exception to the Veto, which
  covers every AP action (§17.B.5). The Veto window stays uniform: every AP action, every holder. Pinned by an example.
