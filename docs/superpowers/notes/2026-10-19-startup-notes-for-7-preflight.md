- 7-1 pre-flight: consider a condition "its maker has (a/no) card in their {perzone}" so 7-2a's Round Start Consultant step skips an Investor whose Founders have no product (today every Investor stops at every Round Start).
- 7-1 pre-flight: an example names a player choice only as ", paying p3"; consider ", choosing p3" for a player choice that isn't a payment (7-2b's Secondary Trade buyer).
- 7-2b: the Non-Compete Suit takes two presses (file, then sue) with a public court pile — accepted as a language limit; Immunity waits for slice 8.
- 7-2a: a Consultant's colour is three flags reset by each placement; an unplaced token keeps a stale flag (no effect) — verify no view/badge shows it.
- 7-2a pre-flight (from 7-3's G1): add a card rule that clears a Consultant token's three colour flags when it comes off a product — the page labels a stale flag ("blue consultant") in a portfolio or supply.
- 7-3 pre-flight (G2): check the Invest button's cost line shows the Share Price; if no seat can see the price before pressing, add a way to show it (rulebook: the Share Price is public).
- 7-3 G3: existing card-name pins that read "Stake"/"Equity" for a card naming another seat change; and fittedLayout's two-argument whole-list pins change — both named in the plan.

## From plan 5-1's final review (M2)
- `some card on the target card is …` / `some card on it is …` read the cards-on zone through `cardsOn`, which `reportHiddenCardReads` doesn't check. Slice 7's `cardsOn` narrowing by the holder's owner does NOT close this: an owner-only zone of cards on a public card would let a refused press hint at a hidden flag. Unreachable in games up to slice 6; if slice 7 makes such a zone, fix it in `mayHideFromPresser`/`reportHiddenCardReads`.
- 7-2b (from the long-runs retune): the actions phase no longer ends at 0 actions; the player presses "end their actions", whose Then goes to the Engine. Its Review Focus (l.110), ranTheEngine/atTheEngine note (l.189), Example "a Veto of the Founder's last action …" (l.282–300) and the "a last action vetoed" key (l.757, l.765, l.776) assume the turn moves on by itself after a last action: add the end press, or re-key "a last action vetoed" to the vetoed action that left 0 actions.
- 7-3 (from the long-runs retune): browser step 8 (l.718–719) expects p1's turn to run on to p2's after SELL_BACK at p1's last action; p1 now presses "End your actions" first, and the `p2 — to act` tab is selected only then.

## From plan 6-3's pre-flight (2026-11-23), for 7-3 (the next page plan)
- Faces break names mid-word, now on every Event face too: `Intern Seaso|n`, `Regul|ation Audit`, besides `Clean Launc|h` and `Talent Magne|t` (6-3 pre-flight Gap 1). A `text-faces` fix moves the four other games' face guards, so 6-3 left it; 7-3 owns it (or a page plan of its own).
- A greyed reason that is a whole sentence (`There is no card …`) sits among lowercase clauses (Gap 2).
- Three-line labels: the Diva's (`egotistic, burned out, 1 burnout`) and a stacked card's, whose count falls below the strip the card over it leaves (Gap 3). 6-3's Call 5 accepts it through the hover line; putting lone counts first changes 4-3's and 5-3's label order and pins.
- 6-3's R5 option B adds `labelledFacts(card, game)` as a third reader of `flagsOn` and `countsRead` (beside `keptBadges`/`boardBadges`); merging the three is a natural cleanup.

