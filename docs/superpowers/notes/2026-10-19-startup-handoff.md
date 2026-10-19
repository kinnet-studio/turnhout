# Startup Simulator: where the work stands (handoff, paused 2026-10-19)

Paused at the owner's request. Everything below is on `claude/peaceful-curie-rdfkow`; HEAD `656d6eb`; 3638 tests pass.

## Done
- Slices 1, 3, 4 (all plans), the long-runs speed-up.
- Slice 5: plan 5-1 (language), 5-2a (talent rules), 5-2b (Strategy, Training, Milestones), 5-3 Task 1 (the taller fitted table, `bbe5c92`).

## Next, in order
1. **Plan 5-3 Tasks 2–4** (the page). Its pre-flight rulings R1–R7 are in the plan's Global Constraints ("Controller amendment (Tasks 2–4 pre-flight …)"). Task 2 was dispatched and stopped before it changed any file; start it again from its text with R1 (`IT_IS_FLAGGED` in `fact-phrases.ts`, `it is {cardflag}` card-only) and R5 (`PERCH_GAME` first). Task 4's checks run over `bbe5c92^..bbe5c92` and `656d6eb..HEAD`, starting from 3638 tests.
2. **Plan 6-1** (language). Before its pre-flight, add a task for 5-2b's gap G1: a reshuffle keeps card ids, so a card seen face up in the public strategy discard can be followed into a hidden Brainstorm or Strategy Hand, and the new deck's order read by slot. Cards shuffled into a pile no one can see take fresh ids from the state's card counter (deterministic, replay exact), pulling forward the re-keying plan 9-1's R1 designs for Face-Down cards (`lang:renamed`) so 9-1 reuses it. The README notes the gap until then.
3. **A "long runs retune" mini plan, after 6-1 and before 6-2a** (not yet written):
   - retune the auto-player so at least 18 of 20 long-run games Launch (5-2b's Brainstorm cadence halved Board play: Launches 45 → 23, games with a Launch 19 → 11), then re-settle the required keys held by one game (ten, six on 3 players seed 4);
   - keep Startup's test file under its 30 s watch (≈27 s now);
   - the free-actions call: the actions phase must not end by itself at 0 AP while a free action is possible — rulebook "Free actions … can be done at any time during your Action Phase (Phase C)"; the player ends their actions (the auto-player presses it), and examples that relied on the automatic end gain that line.
4. Plans 6-1, 6-2a, 6-2b, 6-3; 7-1 … 7-3; 8-1 … 8-3; 9-1 … 9-3; 10-1 … 10-3 (all written; each gets a pre-flight first).

## Notes carried to later pre-flights
- **6-2a / 6-2b:** the Training money check reads the printed price (Online Course Boom makes it $1); the "only a Training card" guard and its example change once Attributes and Utility can be played.
- **7:** `some card on the target card is …` / `some card on it is …` read the cards-on zone through `cardsOn`, which `reportHiddenCardReads` doesn't check; slice 7's narrowing of `cardsOn` by owner won't close it — if slice 7 makes an owner-only zone of cards on a public card, fix it in `mayHideFromPresser`/`reportHiddenCardReads`.
- **9-1:** reuse 6-1's re-keying rather than building it twice.
- **10-3:** its writer's gaps G1–G7 (the Settlement not shown as a number; the Fire Sale price not in the picker; kept turns listed as a count; a long badge possibly covered; …).
- **Page (later):** milestone faces break names mid-word ("Clean Launc|h"); greyed reasons from `Only if one of:` groups have mid-sentence capitals; 4-3's `countsRead` pairs any count named `<colour> <word>` with a column `<colour> <other>`.

## Design calls made for the owner (for the final report)
# Calls worth the owner's eye (Startup Simulator in turnhout)

Running list for the final report. Each is a call made under delegation; none blocked work.

## Rule readings (rulebook silent or ambiguous)
- 1a: a free "End my actions" button; a turn moves on by itself at 0 AP; Ideation refused at a 4th Backlog card (the "Overflow Flush" lets the 4th in, Cleanup cuts to 3).
- 1a: Research leftovers enter the Open Idea Pool in deck order (top card last).
- 1a: the Crash in Research is replaced by the next growth card when the deck isn't empty; a deck holding only the Crash ends Research with nothing kept.
- 1b: Source's passed cards enter the Agency Row one at a time at the left in reveal order (last revealed leftmost), following the Rust engine.
- 1b: only staff with a salary above $0 can be left unpaid at Income (Rust); Salaries skip themselves at $0.
- 1b: Onboarding clears at the start of every turn, whoever's (Rust).
- 3: a product's type follows its cost after the Domain Expertise cut (Rust). With the rulebook's hybrid choice, Smart Grid (2/10) and Bio-Fuel Cell (2/12) cut by 2 Blue become pure Hardware: one Hardware lead Launches them, a Senior Backend alone stalls them. Rust (always −1/−1) never reaches this.
- 3: Domain Expertise applies to Tier 1 too (Rust has no tier test).
- 4: Ops QA removes Bugs from Maintenance products in Launch order (Rust); the rulebook doesn't say who picks.
- 4: modes persist between declarations; the declaration is public (Rust).

## Rulebook kept over the Rust engine (per Ruling #25)
- License payee is the player's choice (Rust: lowest seat).
- 6: Burnout is 0 after every modifier, Events included (Rust adds the Event after the 0, so a burned-out unit makes 1 in Open Source Boom).
- Hybrid Domain Expertise cut is the player's choice (Rust: always −1/−1).

## Engine limits recorded
- A turn that returns to the same seat through an After line or a "goes next" rule doesn't start a new turn (only the "turn passes to the left" effect clears the marker). Startup Simulator always uses the effect.
- A game that eliminates its start player never reaches "the round is finished". Startup Simulator never eliminates.
- 4: Ops QA — the owner chooses which Bugs to clear when it matters (rulebook "from any of your Maintenance products"), overruling Rust's Launch order. (Reverses my first draft's call.)
- 4: taking a product Offline by choice at game end — §12 says all Online when all fit; carried to slice 8 (matters once Scandal scores below 0). Rust's own TODO asks the designer.
- 4: the mode declaration starts from the current modes (UI convenience); Rust starts from defaults each declaration.
- 5: which second token the Mentor graduates (owner's choice; Rust takes the first remaining).
- 5: which Junior earns the Green Pending token when several could (team/attach order, as Rust).
- 5: an Agile PM assigned in the same Assign as pivoted staff doesn't clear their tokens (Rust's reading; Rust's own TODO asks).
- 5: the "Active Player" at the last Milestone check is the seat whose turn ended the round (Rust).
- 5: Milestones aren't claimed from an Online set still being chosen (Rust claims after the whole choice).
- 5: the 22 Strategy cards whose systems come later are in the deck from slice 5 but unplayable until their slice (weak Brainstorm in interim builds).
- 1a: the Market Crash is a row of the growth products table (its card id must not reveal its position).
- 6: Toxic Personality takes ONE cube off its team's total (printed text), Blue first, then Red, then QA; only while the card works; even when the Toxic card makes nothing. Alternative if playtests show it weak vs the free Burnout: every teammate −1 (fits Ruling #25's stated reason better).
- 6: Attributes are counts on the Talent plus a parked card (not attached cards) — departs from the overview's "their attributes" zone; they ride through the Bench, the Job Market and a rehire; firing sends them to the Strategy Discard, Job Market eviction to the box (Rust drops them with the card).
- 7: a placed Consultant is a cross-seat attachment (overview's attachment widened for one marked zone); "the cards on it" reads only the holder owner's cards, so Launch leaves the token on the product and Pivot/sales/Fold return it explicitly.
- 7: a Founder holding the seller's Equity may veto a Secondary Trade of their own token ("cannot prevent this sale" read as "no consent needed", not an exception to the Veto).
- 1a-2: the fitted page needs ~1,130px of height once the canvas draws at 1200×900 (tight on laptops); parked as an owner note.
- 8: Vest and CTO tokens are a mark on the employee plus a parked token (not attached cards); a Vested/CTO employee sold with a product destroys the seller's token (Rust); a Fire Sale keeps it.
- 8: an Integration is the Client attached to its Host inside operations; any sale breaks the stack first.
- 8: no product goes Offline by choice at the game-end check (answers slice 4's carried question; §12 as written).
- 8: the Vest / C&D window opens when the victim has Equity in supply or any Strategy card in hand (public facts only), so it never reveals a C&D.
- 9: a Face-Down Greenlight gives the greenlit card and the rest of the backlog fresh ids, so a publicly drafted bluff can't be followed by id.
- 9: Ghost Progress can never happen in play (no generating on a Stalled project, here and in Rust); pinned by arranged examples only — a rule that never fires in long runs.
- 9: rivals see a Face-Down team's staff tokens and modes but nothing worked out from the hidden card (no Pending Badge, Stalled, need, name in prompts).
- 10: only owners who LOSE Secured Access at a sale (the seller and its Partners) are vulnerable; bluffs the sale didn't cause aren't offered Come Clean; the seller is included (§7.E "Any", widening the spec's "rival"); every exposed owner with any Face-Down project is asked (hides which card needs the Tag). The $0 Partner Come Clean rate can never happen.
- 10: a bankrupt's debt is set aside — only cash above what they owe may be spent (Come Clean, buying in a Market Sale); a second debt joins the first, paid in order.
- 10: Legacy Status clears whenever the card leaves its owner's Board, not only on a sale (Rust clears only on sales).
- 1b-3 dispatch note: carry from 1a-2 — the fitted layout's top/bottom-lines guard, and a wrapped zone name growing upward under the cards above
- 3 (plan 3-1): a License prompt doesn't name the Tag it's for ("Pick who to pay the license to: p1 or p2."); a Tier 3 needing two Licenses shows two alike prompts until plan 3-2's picker shows the Tag.
- 3 (plan 3-1): between plans 3-1 and 3-2 the page refuses a press that needs a choice, with its prompt (no picker yet).
- 3 (plan 3-1): the Domain Expertise cut stays on a Launched product (Rust drops it; nothing in Ops reads it). The single-colour floor min(2, cost−1) is reachable by no printed card.
- 1b: a fired (dismissed) card loses its Onboarding token too (§15.A.3 'lose their tokens'; §18.B's list omits Onboarding).
- Page-plan carries (from 1b-3's final review): m13 (a held card whose holder isn't listed vanishes from Board text — slices 7/8), m16 (a held card whose holder isn't drawn falls on the first Board card — slice 7's Consultant), m17 (a 'some'-marked zone doesn't hang its held cards — slice 8's Client), m18 (STACK_GAP fits two caption lines; CardDecor has no dim/badge; captions read printed columns — plans 3-2, 4-3), m19 (a one-table game with cards on cards shows no stacks/"with" text), m20 (the Board band has no height floor for designers' own games).
- 3 (plan 3-2): a product's face shows tier, Tag and requires (its three face columns); its costs show on hover and as the need in the Board caption. A Tier 3 with two requirements shows only the first on its face.
- 3 (plan 3-2): the page shows a worked flag only when some value line reads it (so Stalled and "efficient in ops" show; leading/fully led/feature complete don't) — shared code can't name game flags.
- 3: Stalled holds only for a project in development (R2's definition read true on talents and launched products; no game outcome changed).
- 4 (plan 4-1): Ops QA removes one Bug per press, with QA used tracked per card and compared with the QA total (one of R3's two routes).
- 4 (plan 4-1): a zone mark may name its holder's zone ("… where every card is on a card in their development"), closing 1b-2's M1 (a Launch that forgets its staff now trips the check).
- 3 (plan 3-1 fix wave): an example may name payees either for just the choices with more than one candidate or for every player choice in line order; other counts are an error naming the allowed counts.
- 3 (plan 3-1 fix wave): the long runs move the Ego Diva from the bench to the ops team on even turns, so the ops-side Ego refusal is reached (a run-only move, through the rules' own button).
- 3 (parked): no Tier 2/3 Launch is reached in long runs at 4–5 players; choice clauses that read another player's private zone have no compile check.
- 4 (plan 4-2): the Ops entry routes keep the rulebook's verbs (assign, hire) with a "… to a card in their operations" form for the Growth Hacker (R5); the example resolver narrows by where the named target card sits (4-1 P16) rather than inventing new verbs.
- 3 (plan 3-2): the page shows a flag that reads the cards on a card only when every cards-on-cards zone in the game is public (a hidden card two levels down could otherwise be identified); Startup is unaffected.
- 3 (plan 3-2): a card face lists its columns in its own row order (a column a rule deletes and later sets again moves to the end; no rule does that today).
- 4 (plan 4-3): a flex Senior working in Blue (the default) shows no mode label; only a declared non-default mode is labelled (R4: Blue is no flag).
- 4 (plan 4-3): Bugs show as a count in the card's corner label, not as a "bugged" badge.
- 4 (plan 4-3): the gauges show every seat's supply and demand to every seat (public totals); slice 9 must leave face-down cards out of them.
- 5 (plan 5-1): every rule about a player asks players in turn order from the seat whose turn last started (not only the new "When a player …" frame), so two rules that read alike never ask in different orders; a game that never starts a turn (Rent Day) keeps seat order. To be verified at 5-1's pre-flight against slices 1–4's examples and long runs.
- 5 (plan 5-1): Training examples read "plays X to Y".
- 5 (plan 5-2b): Brainstorm's button reads "brainstorm after flushing some cards from their strategy hand" (a comma can't sit in a button's words).
- 5 (plan 5-2b): the five Training cards are played through one "train" button whose effect follows the card picked (five buttons with the same words, source and targets couldn't be told apart).
- 5 (plan 5-2a): "under 4 XP" is written as the flag "maxed out" (its xp is more than 3), since card numbers have no "less than".
- 5 (plan 5-3): the Pending Badge flag uses the rulebook's name, 'pending badge'; slice 5's fitted table grows taller when it needs room (5-3 Task 1 runs before 5-2b).
- 6 (plan 6-1): a Debuff's target in a rival's hidden zone is offered face down (the presser picks blind) and no Only-if line can read it; buffs join slice 5's single Training button.
- 6 (plan 6-1): an Event's reveal effects are round-start lines; a game has one set of round-start steps (Angel Investors, Regulation Audit; slice 7's Consultant moves share it).
- 6 (plan 6-2a): a burned-out PM still gives Brainstorm's third card and stays Agile (Burnout zeroes output only, as the Rust engine does).
- 6 (plan 6-2a): Pending XP reads the team before Toxic Personality's cube is taken.
- 6 (plan 6-2b): Angel Investors and Regulation Audit run as one "event check" step at Round Start; a player short of the tax chooses which taxed staff to let go.
- 6 (plan 6-2b): the four Events whose effects belong to later slices are revealed but do nothing until those slices.
- perf watch: Startup test file ~14 s after 4-2 Task 1 (BASE 10 s); if it passes 30 s or 2× its pre-slice time, schedule an engine speed-up (zone lookups per state)
- 6 (plan 6-3): the Event in play shows its §20.D text above the table; a card value that is a sentence stays off the face (shown on hover); a price a button pays shows on the bank line even at 0.
- 4 (plan 4-2): the auto-player may be steered beyond a task's brief when the rules alone would leave a tallied path unreached (e.g. it lets go only of staff its products don't need).
- 7 (plan 7-1): the Veto window opens for a button with a cost once the press is fully judged and paid; players are asked in turn from the actor's left, each may pass or stop it, and a seat sees who pressed and what, with hidden cards shown as that seat sees them.
- 7 (plan 7-2b): the Non-Compete Suit is two presses (file the card, then sue for the token), with a public "court" pile between.
- 7 (plan 7-2a): an Investor is asked at every Round Start whether to move Consultants (pending a language condition to skip players with nothing to move).
- 7 (plan 7-3): an Equity token is named by its Founder ("Equity whose founder is p1") everywhere it is listed; a rival's Consultant token is drawn hanging under the viewer's product, ahead of the product's own staff.
- 8 (plan 8-1): how many cards a hidden zone holds counts as public (a Strategy Hand's size decides whether a poach victim is asked, slice 8 Q4); the cards themselves stay hidden.
- 8 (plan 8-1): a poach is two presses — the counter-offer window comes first, then the destination (no button picks three cards).
- 4 (plan 4-2): at the game-end Ops check, staff still onboarding from the last turn give no bandwidth (the brief's pinned reading of §12.2's 'current staff').
- 8 (plan 8-2a): Crisis Management is its own step before the Engine phase; a Market Sale asks rivals in turn from the seller's left, offered only to those with the cash and bandwidth, otherwise it becomes a Fire Sale.
- 8 (plan 8-2b): a poach's destination is chosen after the fee is paid (one press can't pick three cards); a CTO is promoted by one of two buttons (bench or board).
- 8 (plan 8-3): a picker shows a price before pressing ("Hacker (p1's development team, poach fee 12)"); a Client reads "Vase with Potter, over Statue" on the Board line.
- 9 (plan 9-1): a face-down Greenlight gives fresh ids to the greenlit card and every card left in that backlog (no rival can follow it by id); rivals see "a face-down card" and its staff as they are, never a value worked out from the hidden card.
- 4 (plan 4-3): an off-turn seat's greyed product button shows the first refusal reason the rules give ("There is no card in your operations."), not whose turn it is.
- speed: Startup's test file went 27.6 s → 7.0 s (34.5 s → 7.0 s on a slower run) with identical games, tallies and failure text; Rent Day's test file (~16.6 s) has its own hot spot, not yet looked at.
- 9 (plan 9-3): a face-down card is named by its place ("p0's development, card 2") in pickers and waiting lines; the owner's own Board line reads "(face down …)"; the Stealth Bonus shows as one total.
- 10 (plan 10-1): a Bankruptcy doesn't take the player out of the game — the rulebook says they play on (earlier plans' "seat going out" notes are corrected); debts are kept as bills paid in order to payees fixed when owed.
- 10 (plan 10-2): Fold and Settle costs are recorded as debts paid at once in every phase; a bankrupt player's products are sold one at a time, each offered to the other players before a Fire Sale; a $0 product is kept and a Fold's shortfall is forgiven.
- 10 (plan 10-2): a free Come Clean is offered from the seller's left with the seller last, decided only by public facts; a paid Come Clean costs $3 to the new owner ($5 under Patent Trolls), from cash above what the player owes.
- 10-3: Settle's cover is shown on the page under the gauges (`Cover 10 · Spare capital 1`) instead of the Settlement number, which needs a later language plan; the Fire Sale price is not in the liquidate picker; nested levels are shown as a count and the turn beneath, not each kept turn.
- 5-1 Task 4: the reshuffling deal places cards in the same order as the plain 'deal up to' (a run of the deck at a time), so swapping one phrase for the other never reorders a row.
- 5-2a: the XP and Skill counts are named 'blue xp tokens' / 'blue skill tokens' (the rulebook's 'XP tokens' and 'Skill tokens'), because the page would otherwise pair 'blue xp' with a product's 'blue cost'; a Junior's XP adds only in the colour it is working in (section 11).
- Timing note (5-2a final review): Startup's test file ≈15.6 s; the 2-player seeds 1–5 games are played three times (long run + two replay tests) and 2p s1 twice more; a memoized shared 2-player run would save ≈4 s. Candidate for a later speed-up if the file nears 30 s.
- 5-2b G1: a reshuffle kept card ids, so a rival could name cards in another player's hidden Brainstorm or Strategy Hand after seeing them in the public discard. 5-2b is built as planned (rules text can't fix it); plan 6-1 gains a task giving shuffled cards fresh ids. Until 6-1 lands, the README lists it as not yet handled.
- Timing (5-2b T5): Startup's test file is ≈26.5 s (30.7 s once under load), at the 30 s watch. A speed-up (memoize the shared 2-player runs, ≈4 s per 5-2a's final review) should run before slice 6 adds more.
- 5-2b final review: the actions phase ended at 0 AP, so a free action (e.g. a Training card drawn by the last Brainstorm) couldn't be taken after the last paid action. The rulebook says free actions can be taken at any time during the Action Phase, so a mini plan before slice 6's rules makes the player end their actions themselves.
- 5-3 pre-flight gaps parked for a later page plan: milestone faces break names mid-word ('Clean Launc|h'); greyed reasons from 'Only if one of:' groups read with mid-sentence capitals.

## Files saved beside this note (the SDD workspace and scratchpad are not kept in git)
- `2026-10-19-startup-5-3-preflight-task-1.md` and `2026-10-19-startup-5-3-preflight-tasks-2-4.md`: plan 5-3's pre-flight reports. The plan's "Controller amendment" bullets point at their §4 and §6 for exact texts.
- `2026-10-19-startup-5-3-ledger.md`: plan 5-3's ledger (Task 1 complete; Task 2 not started).
- `2026-10-19-startup-notes-for-<plan>-preflight.md`: the notes carried to each later plan's pre-flight (6, 7, 8, 9, 10, and 5-3's).
