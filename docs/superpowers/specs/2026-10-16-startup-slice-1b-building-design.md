# Startup Simulator, Slice 1b: Building (Tier 1)

**Date:** 2026-10-16
**Status:** Settled after its builder check (`builder-check-startup-1b.md`, B1–B11, every call adopted in "Builder-check
rulings" below). The user handed over every design call for the full implementation; the calls below are the builder's.
**Part of:** `2026-10-16-startup-simulator-overview-design.md`. Its decisions, calls, anti-goals and constraints apply.
**Builds on:** `2026-10-16-startup-slice-1a-table-money-turns-design.md` (its rulings R1–R11 are settled and stand).
**Rulebook sections:** §3 (the zones and the Board), §5 Phase B (revenue, Market Share, Salaries), §5 Phase D steps 1,
4 and 5, §6 Talent (Recruit to the Board, Assign, Recall, Reassign, Layoff / Source) and Product (Greenlight, Launch,
Pivot), §9.A, §12 lines 1 and 3, §13.A.2 Option B, §13.B, §14.B.1, §15, §18.B.

## What this slice is

Players build and run Tier 1 products. After this slice a game is: hire staff, put them on projects, generate cubes until
a product is complete, Launch it, earn revenue and Market Share at each Income, pay salaries, and score product Val
and Market Share as well as cash and Vaporware.

The game after this slice:
- **The Board (§3).** Each player has a Development Zone of at most 3 projects and an Ops Zone. Both are public.
  - Staff on a Development project are **attached** to that project.
  - Staff in the Ops Zone are a pool. (Attached Sales Reps and Growth Hackers arrive with their effects in slice 5.)
- **The turn (§5)** becomes: Income (Phase B) → Actions (Phase C) → the Engine (Phase D steps 1, 4 and 5) → Cleanup
  (step 7) → the next player.
- **Income, for the active player only (§5 Phase B):**
  - **Revenue:** the sum of their Active products' printed Rev, from the bank.
  - **Market Share:** 1 token for each Active product that earned more than $0.
  - **Salaries:** the active player pays every Board staff member's salary. If they can't, or won't, pay everyone,
    they choose who goes unpaid; each unpaid one is discarded to the Open Job Market (§18.B).
- **New actions (§6):**
  - **Greenlight (0 AP, §14.B):** Backlog → Development, while they have fewer than 3 projects.
  - **Assign (1 AP):** any number of Bench cards onto one team: one Development project, or the Ops Zone.
  - **Reassign (1 AP):** one Board staff member to another Development project. Development staff can only go to
    another Development project, and pooled Ops staff may go to a Development project. They get an Onboarding Token.
  - **Recall (1 AP):** any number of Ops Zone staff back to the Bench. Development staff can't be recalled.
  - **Pivot (1 AP):** scrap a Development project. The product goes to the Open Idea Pool; its staff go back to the
    Bench with Onboarding Tokens. It costs 1 AP even with no staff and no cubes.
  - **Launch (1 AP):** a Feature Complete project moves to the Ops Zone, with all its staff joining the Ops pool.
  - **Dismiss (0 AP, §18.B):** discard any Board staff member to the Open Job Market, on their own turn in Phase C.
  - **Layoff / Source (1 AP, §13.B):** discard X Bench cards (at least 1) to the Open Job Market, look at the top X of
    the Talent Deck (fewer if it runs short), hire any of them at printed cost, and the passed cards enter the Agency Row
    from the left. Existing cards slide right, and any card pushed out of the 4th slot falls into the Open Job Market.
  - **Recruit from the Agency Row** may now put the card straight onto the Board: a Development project, or the Ops Zone
    (§13.A.2 Option B). Source hires may too. University and Open Job Market hires still go to the Bench only (#20).
- **Onboarding Tokens (§6):** a staff member with one produces nothing. It clears at the start of the next turn.
- **The Engine (§5 Phase D):**
  - **Generate (step 1):** each Development team generates new cubes next to its card. A team's Blue is the total Blue
    output of its working staff, and its Red is their total Red output.
  - **Commit (step 4):** new cubes move onto the product's tracks, up to its printed cost in each color. Cubes beyond
    the cost are lost (§6 Assign: "otherwise all the progress work cubes go to waste").
  - **Complete (step 5):** a product with both tracks full is Feature Complete.
- **The score gains (§12):**
  - Product Portfolio: each Active Ops product scores its printed Val.
  - Market Share: 2 VP per token.

## Decisions

1. The user handed over the full implementation; there was no question round.
2. The overview's calls apply, notably:
   - Assign moves staff to one team per action;
   - the Ops Zone takes staff only while it runs a product;
   - a Junior's salary counts Permanent XP only;
   - AP-costing buttons share one shape from this slice (the Veto, slice 7).

## Calls (the builder's)

- **What 1b leaves out, and when it arrives** (the overview's rule that each slice lists what its game omits):
  - **Ops bandwidth and Offline (slice 4):** until then every Launched product is Active. The Ops pool's staff do
    nothing but draw salaries.
  - **Bugs and QA (slice 4):** Launch's "0 Bugs" always holds. QA staff produce nothing yet.
  - **Modes (slice 4):** flex staff (Firmware Specialist, Full Stack Ninja) work in Blue, by §11.C.2's rule for staff
    with no native color.
  - **Pending XP and graduation, and the Specialists' effects (slice 5):** QA Engineers, Sales Reps, HR Managers and PMs
    produce nothing yet. Juniors' salaries are $0 (no XP yet).
  - **The Senior Developers' traits (slice 3):** the Hacker's Bug, the Diva's Ego, the Engineer's Efficient salary, the
    Fixer and the Veteran.
  - **Tier 2/3 (slice 3):** Greenlight takes Tier 1 cards only until Leads, Tags and Licenses exist. Domain Expertise
    also arrives then.
  - **Face-Down Greenlight and the Audit window (slice 9).** Generate and Commit are written as separate steps so the
    Audit window can sit between them.
  - **Dividends (slice 7)**, **Integration (slice 8)**, **the Growth Hacker's Cleanup Bug (slice 4)**.
  - **Hype (+5 VP) and Scandal (−5 VP) in the Product Portfolio (slices 6 and 8):** nothing creates them yet.
- **Onboarding clears at the start of the next turn, whoever's turn it is** (§6 Pivot: "Tokens clear at the start of the
  next turn"). Staff who carry one from a Pivot keep it if Assigned in the same turn (§6 Assign).
- **Salaries skip themselves when the payroll is $0.** The choice to leave staff unpaid only matters when there is a
  salary to save, and Dismiss covers firing at $0. Only staff with a salary above $0 can be left unpaid (the Rust
  engine; a $0 Junior can only be Dismissed in Phase C).
- **A scrapped product loses its cubes.** The rulebook moves the card to the Open Idea Pool; a card drafted from there
  later starts empty.
- **Source's passed cards enter the Agency Row one at a time at the left end, in reveal order**, so the last revealed
  ends up leftmost, and each pushes the rightmost card out when the row is over 4 (the Rust engine; the rulebook says
  only "enter from the Left"). A Source on an empty Talent Deck is still allowed and reveals nothing.
- **Source is a private look**, like Research: the revealed cards go to a row only the sourcing player sees, and the
  turn is interrupted until they finish ("Decide before doing anything else", §13.B.3).
- **Launch moves the whole team into the Ops pool.** Attaching a Sales Rep or Growth Hacker to the product arrives with
  their effects in slice 5.
- **The Agency Row only pushes a card out when it is over 4.** If the Talent Deck ran out and the row is short, passed
  cards fill it without pushing anything.
- **Income must not pay out in the window after the last pass.** Slice 1a's ruling R1.3 makes "the round is finished"
  the moment after the last player passes and before the Start Player's turn begins. Revenue, Market Share and
  Salaries belong to the turn, so they run after the turn starts, never in that window.
- **Rulings pinned in this slice, as examples:**
  - #7 (AP costs: Greenlight 0, Launch 1, Pivot 1);
  - #8's Onboarding part (the Agile PM part arrives with PMs in slice 5);
  - #20's Board part (Agency and Source hires may go to the Board; University and Open Market hires may not);
  - #25's unpaid choice (the owner chooses whom to leave unpaid; "Rulebook kept over the engine");
  - #24's "no Ops product limit" (§3): a Launch into an Ops Zone that already runs several products;
  - #5 (Active): every Ops product is Active in 1b; Offline arrives in slice 4.
  - #25's Talent items that apply: Dismiss is 0 AP; pooled Ops staff may Reassign to a Development project; Source
    hires cost no extra AP.

## What the designer writes (shape only)

The builder settles exact wording. This is how the text should read.

```text
Table:
  …as in 1a, plus…
  Each player has a development row that everyone can see.
  Each player has an operations row that everyone can see.
  Each player has a development team that everyone can see.        (staff attached to projects)
  Each player has an ops team that everyone can see.               (the Ops pool)
  Each player has a scouting row that only they can see.

Players: 2 to 5
  …as in 1a, plus…
  Each player has 0 market share that everyone can see.
  Each card has 0 blue cubes, 0 red cubes, 0 new blue cubes and 0 new red cubes.     (counts on cards)

Values:                                                            (worked out for cards, like Rent:)
  A talent card's blue output is its output when its skill is software or flex, and 0 when it is onboarding.
  A talent card's red output is its output when its skill is hardware, and 0 when it is onboarding.
  A product is feature complete when its blue cubes are its blue cost and its red cubes are its red cost.

Phase: income
  When their turn starts:                                         (never in the round-finished window)
    They get the total rev of the cards in their operations.
    For each card in their operations whose rev is more than 0, they get 1 market share.
  A player may let a staff member go.                             (a card in their development or ops team)
    Then: Move it to the open job market.
  A player may pay salaries.
    Only if they have at least the total salary of their staff in capital.
    Then: They pay the total salary of their staff. Go to actions.
  When the total salary of their staff is 0, go to actions.

Phase: actions
  A player may greenlight a card in their backlog.
    Only if their development has fewer than 3 cards.
    Only if the card is Tier 1.
    Then: Move it to their development.
  A player may assign some cards from their bench to a project in their development.
    It costs 1 action.
    Then: Each picked card goes to their development team, on the project.
  A player may assign some cards from their bench to their operations.
    It costs 1 action.
    Only if their operations is not empty.
    Then: Each picked card goes to their ops team.
  A player may hire a card from the agency row to a project in their development.
    It costs 1 action.
    Only if they have at least the card's cost in capital.
    Then: They pay the card's cost. It goes to their development team, on the project.
  A player may launch a project in their development.
    It costs 1 action.
    Only if it is feature complete.
    Then: Move it to their operations with everything on it; its staff join their ops team.
  A player may pivot a project in their development.
    It costs 1 action.
    Then: Its staff go to their bench and are onboarding. It loses its cubes. Move it to the open idea pool.
  A player may layoff and source with some cards from their bench.
    It costs 1 action.
    Then: Move the picked cards to the open job market. Deal up to as many cards from the talent deck to their
      scouting row. The sourcing phase starts with them.
  …reassign, recall, dismiss, the 1a buttons in the same shape…

Phase: engine
  When this phase starts:
    For each project in their development, it gets new blue cubes equal to the total blue output of its staff, …
    For each project in their development, its new cubes go onto its tracks, up to its cost; the rest are lost.
  Go to bench cleanup.

Phase: sourcing
  A player may hire a card from their scouting row to their bench / a project / their operations.
    Only if they have at least the card's cost in capital.
  A player may pass on the rest.
    Then: Move their scouting row to the left end of the agency row, in order. Go back to the interrupted turn.

In every phase:
  When a player's turn starts: Every card stops being onboarding.
  When the agency row has more than 4 cards: Move the top card of the agency row to the open job market.

End:
  …as in 1a, plus…
  Each card in a player's operations scores its val.
  Each player scores 2 points for each market share.
```

## What the language gains

These are general pieces. None of them mentions Startup Simulator.

1. **One shape for buttons that cost the turn budget.** A line such as "It costs 1 action." under a button both refuses
   the press when the player can't pay and spends the budget first. The engine knows which buttons are actions, so
   slice 7 can open a reaction window at declaration. Slice 1a's AP costs are rewritten in this shape.
2. **Card-pick buttons** (overview item 2): a button that picks one card from a zone, one card plus a target card, or a
   set of cards (at least one). The page picks by clicking cards. Slice 1a's recruiting and drafting card moves become
   card-pick buttons.
3. **Cards attached to cards** (overview item 3): the holder's id in the attached card's data, static per-player team
   zones, "everything on it", and an integrity check after every move.
4. **Counts on cards:** numeric facts such as cubes, with "it gets N …", "it loses its …", and conditions over them.
5. **Values worked out for cards** (overview item 4): the `Rent:` idea applied to cards, for output by color and for
   "feature complete".
6. **Sums and "for each"** (overview items 5 and 6): "the total rev of the cards in their operations", "the total salary
   of their staff", "For each project in their development, …".
7. **A choice step that skips itself** when there is nothing to choose (Salaries at $0).
8. **Interrupts that look at the top N** of a deck, where N is the number of cards picked.
9. **A card entering a row at its left end,** and a row that pushes its rightmost card out when over capacity.
10. **Score lines:** a card scoring its own column ("scores its val"), and points per counter ("2 points for each
    market share").
11. **Example vocabulary:** "Given the Dating App in p0's development has 2 blue cubes", "Given p0's Junior Software
    Dev is on the Dating App", "Then the Dating App is in p0's operations", "When p0 assigns … to the Dating App", and
    so on.

## The page

- **Each player's public tableau gains the Board:** the Development projects, each with its staff stacked under it and
  its cubes shown as "Blue 3/6, Red 0/0" with the new cubes beside them, and the Ops Zone's products and staff pool.
  Market Share joins the counters.
- **Clicking cards:** a card-pick button asks for its picks by clicking cards; a set pick ends with a confirm. Clicking
  a card first offers the buttons that can take it. This is where the overview's "picking cards by clicking" lands.
- **The private strip** shows the scouting row during Source.
- The page's 1a layout (the seat switcher and the fitted table) stays; the tableaux grow taller.

## Examples to cover

| Example | Expect |
|---|---|
| Greenlight is free | Backlog → Development, AP unchanged |
| Three projects at most | a 4th Greenlight is refused |
| Only Tier 1 in this slice | a Tier 2 card can't be Greenlit |
| Assign several | two Bench cards onto one project for 1 AP |
| No Ops staff without a product | assigning to an empty Ops Zone is refused |
| Agency hire onto the Board | straight onto a project, with its cost paid |
| University stays on the Bench | there is no University hire onto the Board |
| Generate | a Junior Software Dev (1) and a Senior Backend (3) put 4 new Blue cubes by their project |
| Commit and waste | 4 new Blue cubes on a project needing 2 more fill it; the other 2 are lost |
| The wrong color | a Hardware Junior on a Blue-only project adds nothing |
| Onboarding | a Reassigned staff member generates nothing this turn and works next turn |
| Pivot | the product goes to the Open Idea Pool with no cubes; its staff go to the Bench, onboarding; 1 AP even when empty |
| Launch | needs both tracks full; product and staff move to Ops; 1 AP |
| Income | revenue is the total Rev of their Ops products; 1 Market Share per product |
| Salaries | the payroll is paid; with too little capital the player lets staff go until they can pay; at $0 the step is skipped |
| Recall | any number from the Ops Zone to the Bench; never from a project |
| Dismiss | free, Board → Open Job Market |
| Source | discard 2, look at 2, hire 1 at printed cost; the other enters the Agency Row at the left and pushes the rightmost card into the Open Job Market |
| Source on a short deck | discard 2 with 1 card left: look at 1 |
| No Income after the last pass | the Crash round ends without paying the Start Player again |
| The score | Val of each Ops product plus 2 per Market Share, with cash and Vaporware |

## Goals

- Startup Simulator (slices 1a + 1b) compiles with no diagnostics and its examples cover the table above.
- Long runs at 2 to 5 players Launch products, earn revenue, pay salaries and reach the Crash. The auto-player
  Greenlights, assigns, Launches, Pivots, Sources and lets staff go.
- Hearts, Color Match, Venom and Rent Day pass unchanged.
- The page shows each Board and plays the slice by clicking, checked in a browser.

## Non-goals (in the next slices)

Everything the "What 1b leaves out" call lists.

## Anti-goals

- **No Startup Simulator words in shared code** (cube, project, Greenlight, Launch, Pivot, salary, Ops, Market Share
  and the like stay in the rules text).
- **A staff member attached to a card that isn't theirs or isn't in play**, which the integrity check must catch.
- **Income paid in the round-finished window.**
- **A rival seeing the scouting row.**

## Proof (acceptance)

1. The examples above pass, with every number checked against the rulebook.
2. Long runs end at every player count, with these invariants in every move: money is conserved (paid to and from the
   bank only); no player has more than 3 projects; every attached card's holder is a card in play with the same owner;
   no product's committed cubes exceed its cost; each player takes exactly one turn per round.
3. Each language piece has unit tests.
4. A browser check of the page, plus happy-dom tests.
5. Hearts, Color Match, Venom and Rent Day pass; `bun run typecheck` is clean.

## Builder-check rulings

The builder check (`builder-check-startup-1b.md`) found nothing that needs the user. Every call below is the builder's,
adopted from its recommendations B1–B11. No protected file changes. Where these rulings and the shape above differ, the
rulings win.

### R1. Card-pick buttons (B1)

- **Grammar.** A line that mentions a card is a card move only when it reads exactly "a card from {zone} to {zone}" and
  has no cost line. Every other card line is a card-pick button:
  - "a card in {zone}" (one card);
  - "a card from {zone} to {zone}" with a cost;
  - "a card from {zone} to a card in {zone}" (a card and a target card);
  - "some cards from {zone} [to {zone} | to a card in {zone}]" (a set of at least one).
- **A press carries** the picked card, plus the target card or the list of cards. The button's lines are compiled
  with a card subject ("it", "the card"), so "Move it to …" and "It gains …" work inside buttons.
- **A set is judged card by card for the view, then once as a whole when pressed.** The view lists verdicts per card
  (and per card and target), never per subset.
- **Examples** read `{player} {action} {card}` and `… {cards} to {card}`, resolved by where the named card lies, so
  1a's "When p0 hires the Hacker" keeps working where one button can take that card.
- **All of Startup Simulator's card lines become buttons,** free ones too (the Research keep, the Cleanup discards), so
  the page has one input: clicking. Card moves and dragging stay for Hearts, Color Match and Venom. A card move and a
  button still can't share a verb.

### R2. Income and the turn's start (B2)

- **Revenue and Market Share are turn-start rules,** written "When a player's turn starts:" under `Phase: income`. The
  1a trigger runs the current phase's own turn-start rules after the `In every phase:` ones, and never during setup.
- **The pass never runs a phase's start lines** (plan 1a-1 carries this), so nothing of Income can run in the
  round-finished window. A compile warning flags "When this phase starts:" under the first phase of a game with turn
  start.
- **A "Go to {phase}." effect** runs the target phase's start lines as an advance would. "Pay salaries" ends with it,
  since the phase's one `go to` is the $0 skip.
- **"Let a staff member go" applies only to staff whose salary is above $0.**
- Income examples use a "When p1's turn starts" step (or 1a's step that finishes a turn), since an arranged turn counts
  as started.

### R3. Attachment (B3)

- **The holder lives in `data['lang:on']`.** Every move clears it; the placing phrase ("It goes to their development
  team, on the project.") sets it after the move. Pivot, Launch, Dismiss, letting go and Recall need no detach wording.
- **Attachment zones are marked in the Table lines** (e.g. "…, holding cards on cards"). After every button, move and
  flow effect the runtime checks: each card with a holder sits in such a zone; its holder exists in a public zone of the
  same seat; each card in a holder-only zone (the development team) has a holder. A failed check throws, and the
  engine keeps its old state.
- The ops team is a plain row in 1b; it gains holders in slice 4 (the Growth Hacker) and slice 5 (Sales Reps).
- **"With everything on it" is deferred to slice 8,** where attached cards first change owner.
- Example steps: "Given p0's Junior Software Dev is on the Dating App", "Then … is on …".

### R4. Card values (B4)

- **A card analogue of `Rent:`:** a section per value, named after a card column (refining it) or a new name, whose
  lines are about a card; every phrase that reads a card's number reads through it.
- **Values now:** salary (from its column) and each project's generated cubes per color ("A project's new blue cubes
  are the total blue output of its staff"), so slices 3, 5 and 6 only add lines (the Engineer's $1, a Junior's $1 at
  2+ XP, Workaholic, Synergy, Toxic Personality, Crunch Time).
- **"Feature complete" is a flag defined by a block of `Only if` lines** (conditions have no "and").
- **Costs and maintenance are 0, not blank,** in the product tables (plan 1a-1 carries this).

### R5. "It costs N {counter}." (B5)

- One `It costs {int} {counter}.` line per button, judged before every `Only if` and spent before the `Then:` lines.
- On buttons only; "is an action" means "has a cost", which is what slice 7's Veto reads.

### R6. Sums and "for each" (B6)

- "For each {card} in {zones}, …" is tried before the player frame; the line runs once per card, about that card,
  with the player kept.
- Sums read "the total {value} of {cards}", where `{cards}` is "the cards in {zones}", "the cards on it", or a filtered
  form ("… whose rev is more than 0"). Two zones are written out ("their development team and their ops team").

### R7. Source (B7)

- Passed cards enter at the left end one at a time in reveal order (the last revealed ends up leftmost); the every-phase
  push-out moves the rightmost card to the Open Job Market each time the row is over 4. A two-card example pins the
  order the bumped cards reach the Open Job Market (the old 4th, then the old 3rd).
- "When their scouting row is empty: Go back to the interrupted turn." covers hiring every revealed card and revealing
  nothing.
- "Deal up to as many cards as they picked", and a left-end entry phrase built on the zone's bottom insert.

### R8. The Engine (B8)

- **Generate and Commit are separate phases** (engine, then commit), so slice 9's Audit window can sit between them.
- **Pivot resets the product's cubes itself** ("It loses its cubes."); card counts otherwise ride with the card.
- Cubes are capped at the printed cost on Commit (the spec's call; Rust completes at "at least", and nothing reads the
  excess).

### R9. Three plans (B11)

- **Plan 1b-1, picks and costs** (about 6 tasks; the 1a game stays playable): the cost line; one-card pick buttons;
  card + target and sets; converting 1a's text and examples; a DOM card picker on the playtest page; 1a's long runs,
  the four games and typecheck.
- **Plan 1b-2, the Board** (about 9 tasks): attachment and the check; counts in arithmetic and "it loses its …"; card
  values; sums and "for each"; phase-scoped turn-start rules, "Go to {phase}." and the warning; Source pieces and the
  two score lines; the rules text in two halves with examples and pinned rulings; long runs with the invariants.
- **Plan 1b-3, the page** (about 4 tasks): the viewer's Board on the canvas with staff stacked under projects and
  "Blue 3/6, Red 0/0", rivals' Boards as DOM text, Market Share among the counters; canvas clicking and the scouting
  row; happy-dom tests and the Hearts check for clicks; the browser check.

## Left to the builder

- Exact phrase wordings, section names and zone names.
- How the page lays out attached staff and cubes.
- The auto-player's choices.
