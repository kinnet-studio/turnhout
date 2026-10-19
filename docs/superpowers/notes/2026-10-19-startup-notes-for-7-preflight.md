- 7-1 pre-flight: consider a condition "its maker has (a/no) card in their {perzone}" so 7-2a's Round Start Consultant step skips an Investor whose Founders have no product (today every Investor stops at every Round Start).
- 7-1 pre-flight: an example names a player choice only as ", paying p3"; consider ", choosing p3" for a player choice that isn't a payment (7-2b's Secondary Trade buyer).
- 7-2b: the Non-Compete Suit takes two presses (file, then sue) with a public court pile — accepted as a language limit; Immunity waits for slice 8.
- 7-2a: a Consultant's colour is three flags reset by each placement; an unplaced token keeps a stale flag (no effect) — verify no view/badge shows it.
- 7-2a pre-flight (from 7-3's G1): add a card rule that clears a Consultant token's three colour flags when it comes off a product — the page labels a stale flag ("blue consultant") in a portfolio or supply.
- 7-3 pre-flight (G2): check the Invest button's cost line shows the Share Price; if no seat can see the price before pressing, add a way to show it (rulebook: the Share Price is public).
- 7-3 G3: existing card-name pins that read "Stake"/"Equity" for a card naming another seat change; and fittedLayout's two-argument whole-list pins change — both named in the plan.

## From plan 5-1's final review (M2)
- `some card on the target card is …` / `some card on it is …` read the cards-on zone through `cardsOn`, which `reportHiddenCardReads` doesn't check. Slice 7's `cardsOn` narrowing by the holder's owner does NOT close this: an owner-only zone of cards on a public card would let a refused press hint at a hidden flag. Unreachable in games up to slice 6; if slice 7 makes such a zone, fix it in `mayHideFromPresser`/`reportHiddenCardReads`.
