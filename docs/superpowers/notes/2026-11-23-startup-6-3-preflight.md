# Pre-flight: plan 6-3 (The page), Tasks 2–5

- **HEAD scanned:** `0e16d25` on `claude/peaceful-curie-rdfkow`. 6-2b is done, and 6-3 Task 1 is done at `92408f7`. I did not touch the repo.
- **Inputs:**
  - the plan `docs/superpowers/plans/2026-10-16-startup-slice-6-3-the-page.md`, Tasks 2–5;
  - the slice 6 spec (its R1–R3 win over its body) and the overview spec;
  - `/home/user/suwa/rulebook.md`: §20.D for the Events, §20.A–B for the Attributes and salaries; suwa's Rust where the rulebook is silent;
  - the notes for 6's pre-flight: l.16–19 (5-3), l.35–37 (6-2a), l.46–48 (speed-up 2), l.50–58 (6-2b, Minors 8–9);
  - the handoff;
  - 6-2b's pre-flight report and its ledger.
- **Probe:** a clone at `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf63/work`, branch `probe`, base `0e16d25`. Each task is one commit as written; each amendment is a commit of its own.

  | Commit | What |
  |---|---|
  | `d1ce82a` | T2 as written |
  | `a737462` | A1 (R1) |
  | `1815046` | A2 (R2) |
  | `bd0b510` | A3 (R4) |
  | `3d3a5dc` | T3 as written |
  | `2037cc5` | A4 (R6) |
  | `ecc2178` | T4 as written |
  | `d60a634` | A5 (R8) |
  | `d978957` | A6 (R9) |
  | `e3f4348` | T5 as written |
  | `ac3ed8a` | A7 (R5 option B), the final commit |

- **Results:**
  - **Full suite** (run with `nice -n 19`):

    | Point | Passing tests |
    |---|---|
    | BASE | 3817 |
    | `bd0b510` | 3831 |
    | `e3f4348` | 3839 |
    | `ac3ed8a` | 3840 |

    The new tests are Task 2's 14, Task 3's 2, Task 4's 6 and A7's 1. Task 3's own Step 4 run of `src/pages/designer src/engine src/games` gave 3778; Task 4's gave 3784.
  - **`tsc`:** clean at A2, T3, T4, A6, T5 and the final commit. It fails at T2 as written (R2).
  - **Browser:** 56/56 with `errors: []` at T5. R12's version passes 57/57 at the final commit.
  - **Task 5 Step 5:** 11 files and 112 tests pass, and Rent Day keeps its 108 examples.
- **Speed:** 6-3 adds one Startup test (4 ms) and nothing to the long runs. The Startup file's `tests` figure was 29.88 s in a lone `nice -n 19` run while other agents were timing tests on this machine, so it is not comparable to a quiet run. Watch it after the mini plan.

## Findings

**R1 (fix-in-plan): `paidNumbers` walks only buttons, but OMEN_GAME pays its fee on a card move.**
- At T2, `paidNumbers(OMEN_GAME)` gives `[]`, not `['fee']`, so 'shows a price at 0' fails too.
- OMEN_GAME's `They pay the fee.` sits in a card move's `Then:` (testing.ts l.907–921).
- `thenRefs(action: DeclaredAction)` can't take a move.

Amendments:
- l.28 (Call 4): "A game number a button or a card move pays to the bank …".
- l.241–242: change the signature to `thenRefs(action: Pick<DeclaredAction, 'effects'>)`, with its doc reading "a button's or a card move's Then: lines".
- l.244–245: the doc reads "a button or a card move pays", and it walks `[...phase.actions, ...phase.moves]`.
- l.601: optionally the same wording.

**R2 (fix-in-plan): `SECOND2` is unused at Task 2's commit.**
- Under `noUnusedLocals`, `tsc` fails until Task 4 reads it.

Amendment, l.317–318: "Press `End your actions` (FIRST2's): `tab(`${SECOND2} — to act`)` is selected, and `inPlayLine()` still names the Whistleblower Protection Act. Press `End your actions` again (SECOND2's):" — and the bullets stay as they are.

**R3 (fix-in-plan, minor): the Server Crash gauge test is not a guard.**
- Before Step 3 it fails on its `inPlayLine()` check; its gauge checks, which come first, pass.

Amendment, l.333: "…except the Whistleblower Protection Act and Toxic Personality gauge tests, which pass after Task 1 and are guards. The Server Crash gauge test fails only on its in-play line."

**R4 (fix-in-plan): Minors 8–9 (notes l.52–56) are missing from Task 2.**
A3 applies them. They change no behaviour.

Amendments:
- **l.224, Files:** add `src/engine/core/lang/card-alone.ts` (its header comment only), and add it to the commit at l.342.
- **A new bullet after l.268:**
  - the file header, `standIns` and `shownFlags` say a shown value reads "the card, the cards on it and what a shared zone everyone can see holds". `shownFlags` adds "or one that tests such a zone itself".
  - `readsOnlyCards(game, name, reads: Reads = {}, seen = new Set<string>())`, with `type Reads = { holder?: boolean; owner?: boolean; centre?: boolean }`. Callers pass `{ centre: true }`, `{ holder: true }` or `{ owner: true, centre: true }`. Its doc adds "card-alone.ts never reads so: what such a zone holds changes while the card stays as it is."
  - wrap the `testsCentre` line after `value.kind === 'flag'`.
  - `card-alone.ts`'s header gains: "Nor does a line that tests what a shared zone holds, which `readsOnlyCards` counts with `centre`: the card in play changes while this one stays as it is."

**R5 (ruling-needed): the hover line repeats the label's facts.**
- `faceKeyOf` (card-facts.ts l.88–104) puts every set card fact on the face key, so `cardDetail` lists the counts and kept flags. The browser shows:
  - `… role Junior · workaholic 1 — 1 workaholic`
  - `… offline yes · hype 2 — offline, 2 hype`
  - `… trait Ego · burnout 1 — egotistic, burned out, 1 burnout`
- l.29's example lacks `role Junior` and the count columns.

Options:
- **(A)** Keep the line, and change l.29 to `Junior Software Dev — cost 2 · skill software · output 1 · salary 0 · role Junior · workaholic 1 · burnout 1 — 1 workaholic, 1 burnout`.
- **(B)**, as A7:
  - l.29 becomes `Junior Software Dev — cost 2 · skill software · output 1 · salary 0 · role Junior — 1 workaholic, 1 burnout`.
  - l.83 becomes `{cardDetail less the label's facts} — {label}`.
  - Task 3 also modifies `card-detail.ts`, `board-text.ts` and `board-text.test.ts`.
  - `cardDetail(faceKey, leaveOff: string[] = [])`.
  - `board-text.ts` exports `labelledFacts(card, game)`: the `flagsOn` flags, then the counts that no column reads and that are not 0. It gives `[]` for a face-down card.
  - The hover line becomes `cardDetail(faceKey, label === undefined ? [] : labelledFacts(card, game)) — label`.
  - One new board-text test.
  - l.389 and l.396 pin `` `Junior Software Dev — cost 2 · skill software · output 1 · salary 0 · role Junior — ${label}` ``.
  - The README at l.603 adds "; the flags and counts the label says are left off the columns".
  - Wrap A7's long doc-comment line.

Recommendation: B.

**R6 (fix-in-plan): `'blue xp'` (l.395) is not a count; the declared one is `blue xp tokens` (rules l.160).**
- `changeCard` writes an undeclared key that no label shows, so the label pin fails.

Amendments:
- l.395: `{ 'blue xp tokens': 1, workaholic: 1, burnout: 1 }`.
- l.396: the label is `overworked, overworked in blue, burned out, 1 blue xp token, 1 workaholic, 1 burnout`.

**R7 (fix-in-plan, minor): Task 3 is unpinned.**
Amendments:
- l.367: define in Task 3's describe `PLAY`, `DEBUFF`, `TO_PRODUCT`, `ALONE`, and `FLUSH = 'Brainstorm after flushing some cards from your strategy hand'`.
- l.381, l.388 and l.393: add "then back to `tab(`${S} — to act`)`". Without it the next click misses.
- l.384: `offered()` is `[[PLAY, true], [DEBUFF, "There is no card in another player's development team or another player's ops team."], [TO_PRODUCT, 'the card is a TechCrunch Feature'], [ALONE, 'it is a Design Sprint card'], [FLUSH, true]]`.
- l.385: the label is `overworked, overworked in blue, 1 workaholic`.
- l.386: `with Junior Software Dev (overworked, overworked in blue) [1 workaholic]`.
- l.391: the decor is `{ caption: 'Blue 0/6\nRed 0/0', badge: '1 hype' }`.
- Add helpers `faceOf(id)` (the placed card's `faceKey`) and `nameOf` = `parseTextFaceKey(card.faceKey)!.name`.

**R8 (fix-in-plan): `placesOf`'s 3-player JINX engine throws `There are no cards left in the pile.`**
- CREW_GAME's Setup deals 2 to each stash from 4 jobs.

Amendment, l.442: "…on `initialState(jinx, 1)` with no Setup (as 6-1's JINX tests arrange): p1's workshop holds a Vase with a Potter `putOn` it in `crew-p1`, p2's workshop a Statue, p0's workshop a Vase, p1's stash the other Statue, and the hall its hands." The face-down copy is then of that stashed Statue.

**R9 (fix-in-plan): the event check is never short.**
- The Engineer's salary is $1 in Ops (Efficient; rulebook §20.B.1 l.1273; rules l.702).
- With capital 4: 4 − 2 = 2 left, and the Audit's $2 is paid in full.

Amendments:
- l.469: capital **3**.
- l.486: "§20.B: the Diva's salary is $1, and the Engineer's $2 but $1 in Ops (Efficient); §5 Phase B: 3 − 2 = 1 at Income;".

**R10 (fix-in-plan, minor): Task 4 consumes names Tasks 2–3 don't provide.**
Amendments:
- l.451: `DEBUFF` is defined as in Task 3.
- l.425: `setCounter` is imported beside Task 2's `setGameNumber`: `import { setCounter, setGameNumber } from '@/engine/core/lang/board-state'`.
- l.465: `with Engineer (burned out) [1 burnout]`.
- l.467: the Engineer's label is `burned out, 1 burnout`.

**R11 (fix-in-plan, minor): Step 4's last check prints a widened import line.**
- It prints `card-pick.test.ts`'s widened import line; under B it also prints `board-text.test.ts`'s.
- The constraint at l.74–76 already forbids widening; this was the probe's slip.
- Pin it at l.442: `import { placesOf } from './card-pick';` on its own line. Under B, use `import { labelledFacts } from './board-text';` the same way.

**R12 (fix-in-plan): the browser check never shows a label on a card in a stack (Call 5's case), so the judgement at l.591 has nothing to judge.**
The variant puts the Workaholic on the Hacker hanging under the To-Do List. It passes 57/57, and every later step is unchanged.
- The Hacker's three-line label `overworked, overworked in blue, 1 workaholic` is cut by the Veteran after `overworked in blue`, so `1 workaholic`, R2's badge, isn't seen in the strip.
- The label also covers the end of the corner index (`Ha…`).
- The hover line names it whole: `Hacker — cost 6 · skill software · output 3 · salary 2 · role Senior Developer · trait Spaghetti Code — overworked, overworked in blue, 1 workaholic`.

Amendments:
- l.559: "pick the Hacker (in the development team, under the To-Do List)".
- l.560–562: "the Hacker is labelled `overworked, overworked in blue, 1 workaholic`, and `board-p0` contains `with Hacker (overworked, overworked in blue) [1 workaholic]`; the Veteran hanging over it covers the label after `overworked in blue`; hovering its strip shows the whole label; p0's line starts `p0 5 capital`; the attributes in play shows the Workaholic".
- l.597: "(each salary above $0; the Hacker's is $4 with the Workaholic)".
- After l.536 (Setup): "With the probe's rules the page reads `305 of 307 examples pass`; Play stays enabled. Carry on."

**R13 (ruling-needed): 6-2a's "decide at 6-3" items (notes l.35–36) have no call.**
- **(a) The Diva's permanent `egotistic` press label.** It shows on the Board line as `Diva (egotistic)`, as a corner label, and on the hover line. With a Burnout it makes a three-line label.
- **(b) The Strategy buttons.** Every Strategy card shows all four Strategy buttons, three greyed with reasons, plus the Brainstorm flush.

Recommendation: keep both, and add two Calls.
- Call 10: "A press flag stays a label even when nothing can change it: 5-3's press labels are decided by the rules alone."
- Call 11: "Every button a card can be pressed with shows, greyed with its reason (3-2's convention)."
- Changing either needs a new shared rule in `pressFlags`, or a way to tell a card-kind guard from any other `Only if`.

## S1–S4 (applied at `2228e05`)

All four still hold in the text at HEAD:
- **S1:** l.123–124 split the Assumed items. Every Task 2–5 item exists at HEAD.
- **S2:** l.192 pins `inPlayZones(game)` as `[]` while Task 1 runs ahead, and 6-2b re-pinned it to `['event in play']`.
- **S3:** the `'blue made': 'blue reached'` sentence is gone.
- **S4:** l.511's `SCRATCH` path is right, and `browser-5-3/check.cjs` exists with every helper, including `at()`'s scroll into view.

## The mini plan before Task 2

These 6-3 steps read the current text of the files the mini plan touches:
- **Task 2's appended Startup test** uses `fresh()`, `setUp(5, 1)`, `zoneCards`, `EVENTS`, `game` and the existing `parseTextFaceKey` import, and adds `isSentence` and `paidNumbers` on new lines. It goes after Task 1's `describe('what the view reads in the centre')`. Re-check the names, signatures and the file's tail after speed-up 3.
- **Task 2 Step 4** says the example count is unchanged. Read it at HEAD after the mini plan; it is 307 today.
- **R4's `card-alone.ts` sentence:** re-anchor it if speed-up 3 rewrites the header, or drop it if the new header already says this.
- **BASE2** (l.97) is recorded after the mini plan.
- **The Startup speed watch:** compare after the mini plan.
- **Not affected:**
  - 6-3 touches no `runtime.ts`.
  - It adds no phrase to the card-number, card-value or card-subject libraries (`PAY_NUMBER` is in game-numbers, `CENTRE_HAS` in queue-phrases), so the card-alone rule at notes l.47 doesn't apply.

## Gaps (with homes)

1. **Ga, now on every Event face:** `Intern Seaso|n`, `Regul|ation Audit`, as well as `Clean Launc|h` and `Talent Magne|t`. The home is the next page plan, because a `text-faces` fix moves the four games' face guards; or fold it into Task 2 by ruling.
2. **Gb:** a greyed reason that is a whole sentence (`There is no card …`) sits among lowercase clauses. Home: the next page plan.
3. **Gc and R12:** three-line labels: the Diva's at 07, and the stacked Hacker's, whose count falls below the strip. Call 5 accepts this through the hover line. Putting lone counts first would change 4-3's and 5-3's order and their pins. Home: the next page plan.
4. **Gd:** not reached by 6-3's check; still parked.
5. **G3 (the reshuffle glide):** untouched; a later page plan.
6. **Parked minors:** the `keptBadges`/`boardBadges` loops and the `pressFlags` memo are untouched. Under B, `labelledFacts` is a third reader of `flagsOn` and `countsRead`, so merging the three would be a natural cleanup.
7. **The task briefs:** cut Tasks 2–5's briefs again from the amended plan. R5 changes Task 3's Files, Interfaces, pins and README text.

## Checked and clean

- **Assumed names:** every one exists at HEAD.
- **The Event table:**
  - each `effect` matches the rulebook's §20.D;
  - Startup compiles with `[]`, with no reading that goes two ways and the example count unchanged;
  - the rules diff is exactly the header and 18 rows (38 lines).
- **Faces:**
  - a sentence is left off every face;
  - the four games' face tests pass unchanged;
  - Rent Day's `says` text is drawn nowhere.
- **Hidden cards:** no whole-page text check finds a hidden name in the in-play line.
- **Prices (after R1):** `paidNumbers` gives OMEN `['fee']`, PRICE `[]`, Rent Day `[]`, Startup `['junior price', 'hardware junior price']`.
- **Task 2's page checks** hold apart from R2.
- **Task 4:**
  - the Debuff list's order is right (`Engineer (p2's development team)`, `Junior Software Dev (p0's development team)`, `Junior QA Tester (p0's ops team)`, `Cancel`);
  - a click on your own card sends nothing;
  - the decor holds no rival card;
  - after R9, the event check, the greyed let-go and Undo all work, and the Angel test passes.
- **The browser check as written** passes every listed expectation in 01–12.
- **The probe** passes at seeds 1–10.
- **Task 5 Step 4's checks** print nothing except the 38 lines of the Event table and R11's import lines.
- **Global Constraints:** no new state key, data key or move field; the view's shapes are unchanged; and no page state is added.
