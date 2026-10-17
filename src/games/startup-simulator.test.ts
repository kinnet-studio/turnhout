import { describe, expect, it } from 'vitest';
import STARTUP_SIMULATOR from './startup-simulator.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { runExamples } from '@/engine/core/lang/examples';
import { createEngine, initialState, seatsFor, tableDefFor } from '@/engine/core/lang/build';
import { COUNTERS_KEY, counterOf, gameNumber, setCounter } from '@/engine/core/lang/board-state';
import { seatExtras, type CardPickView, type SeatExtras } from '@/engine/core/lang/board-view';
import { attachmentProblem, cardsOn, putOn } from '@/engine/core/lang/attach';
import { deckOf, NEXT_CARD_KEY } from '@/engine/core/lang/cards';
import { cardCandidates, hasCost, ontoCandidates, pressChoices } from '@/engine/core/lang/declared-actions';
import { moveZoneId } from '@/engine/core/lang/declared-moves';
import { CHOOSE_ONE, CHOOSE_PLAYER, choicesOf, type AskedChoice, type ChoiceOption } from '@/engine/core/lang/choices';
import { RuleError } from '@/engine/core/lang/diagnostics';
import { LangRuntime } from '@/engine/core/lang/runtime';
import type { ZoneRef } from '@/engine/core/lang/types';
import { markTurnStarted, ROUND_KEY, START_PLAYER_KEY, startPlayerOf, TURN_OF_KEY } from '@/engine/core/lang/turns';
import { HOLDER_KEY, relocate, zoneIdFor, zoneInfo } from '@/engine/core/lang/zones';
import { HIDDEN_FACE_KEY, deriveScene } from '@/engine/core/derive-scene';
import type { GameState } from '@/engine/core/game-state';
import { cardById, zoneCards } from '@/engine/core/lang/zone-index';
import type { GameEngine } from '@/engine/core/game-engine';
import type { Move } from '@/engine/core/moves';
import type { CardState, PlayerId } from '@/engine/core/scene';
import { changeCard } from '@/engine/core/lang/card-facts';
import { shownFlags, standIns } from '@/engine/core/lang/worked-view';
import { dimFlags, gaugePairs, shownPlayerValues } from '@/engine/core/lang/worked-view';
import { parseTextFaceKey } from '@/engine/core/lang/cards';

// The long runs check every rule after every move, thousands of checks a game, and an `expect` costs vitest far more to build than the
// check costs to make. So the checks that run after every move make theirs first and ask vitest only when it fails, with the same matcher
// and the same message: a check that holds is one `expect` would pass, and one that fails is the same `expect` as before, which fails
// as it always did. A message is a function, built only then.
/** Whether `actual` and `expected` are lists of the same length whose values are the same, as `toEqual` finds lists of plain values. */
function sameValues(actual: readonly unknown[], expected: readonly unknown[]): boolean {
  if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) return false;
  for (let i = 0; i < actual.length; i++) if (!Object.is(actual[i], expected[i])) return false;
  return true;
}
/** `expect(actual, message()).toEqual(expected)` for lists of plain values, which `toEqual` compares one by one with Object.is. */
function sameList(actual: readonly unknown[], expected: readonly unknown[], message: () => string): void {
  if (!sameValues(actual, expected)) expect(actual, message()).toEqual(expected);
}
/** `expect(actual, message()).toEqual([])`. */
function noneOf(actual: readonly unknown[], message: () => string): void {
  if (!Array.isArray(actual) || actual.length > 0) expect(actual, message()).toEqual([]);
}
/** `expect(actual, message()).toBe(expected)`, which compares with Object.is. */
function sameAs(actual: unknown, expected: unknown, message: () => string): void {
  if (!Object.is(actual, expected)) expect(actual, message()).toBe(expected);
}

const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(STARTUP_SIMULATOR, lib);

const JUNIORS = ['Junior Software Dev', 'Junior Hardware Eng', 'Junior QA Tester'];
/** The product columns that hold a number of cubes: C4 says each is a number, 0 where the rulebook prints none of that color. */
const CUBES = ['blue cost', 'red cost', 'blue maint', 'red maint'] as const;
/** The product columns the rulebook's sums are checked over. */
const SUMMED = ['blue cost', 'red cost', 'rev', 'val', 'blue maint', 'red maint'] as const;
/** The Crash goes among the bottom ⌈34 / 5⌉ + 1 cards of the Growth Deck (§4.1). */
const CRASH_REACH = 8;

const fresh = (seed = 1) => initialState(game!, seed);
const nameOf = (card: CardState) => card.data?.name;
const inZone = (cards: CardState[], zoneId: string) => cards.filter((card) => card.zoneId === zoneId);
const sum = (cards: CardState[], column: string) => cards.reduce((total, card) => total + (card.data?.[column] as number), 0);
const sums = (cards: CardState[]) => Object.fromEntries(SUMMED.map((column) => [column, sum(cards, column)]));

/** How many cards there are of each name. */
function nameCounts(cards: CardState[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) counts[nameOf(card) as string] = (counts[nameOf(card) as string] ?? 0) + 1;
  return counts;
}

/** The talent card whose name is `name`, as dealt at seed 1. */
const talent = (name: string) => inZone(fresh().cards, 'talent-deck').find((card) => nameOf(card) === name)!;
/** The product card whose name is `name`, as dealt at seed 1. */
const product = (name: string) => fresh().cards.find((card) => nameOf(card) === name)!;

/** An engine at the start of the game, after Setup. */
function setUp(players: number, seed: number): GameState {
  return createEngine(game!, lib, players, initialState(game!, seed)).engine.getState();
}

/** The id of the first card whose name is `name`, as dealt at seed 1. */
const idOf = (name: string) => fresh().cards.find((card) => nameOf(card) === name)!.id;

/**
 * Two players, p0's turn in the actions phase, as an example arranges a game: every card starts in its own deck, unshuffled, and
 * `zones` says which cards some zones hold instead, bottom first. What those zones held before goes to the box.
 */
function arrange(zones: Record<string, string[]>) {
  let state: GameState = { ...fresh(), turn: { current: 'p0', phase: 'actions' } };
  for (const [zoneId, ids] of Object.entries(zones)) {
    state = relocate(state, zoneCards(state, zoneId).map((card) => card.id), 'box', game!);
    state = relocate(state, ids, zoneId, game!);
  }
  return createEngine(game!, lib, 2, markTurnStarted(state)).engine;
}

const namesIn = (state: GameState, zoneId: string) => zoneCards(state, zoneId).map(nameOf);

/** A long run gives up here; the Crash, among the last 8 growth cards, ends a game long before. */
const MAX_TURNS = 300;
const RECRUITS = ['recruit a junior software dev', 'recruit a junior hardware eng', 'recruit a junior qa tester'];
const RESEARCH_SEED = 'research the seed deck';
const RESEARCH_GROWTH = 'research the growth deck';
const END_ACTIONS = 'end their actions';
// The buttons that pick a card: one for each zone a card is hired, drafted, kept or discarded from.
const HIRE_AGENCY = 'hire a card from the agency row to their bench';
const HIRE_MARKET = 'hire a card from the open job market to their bench';
const DRAFT_SEED = 'draft a card from the seed market to their backlog';
const DRAFT_GROWTH = 'draft a card from the growth market to their backlog';
const DRAFT_POOL = 'draft a card from the open idea pool to their backlog';
const KEEP = 'keep a card in their research';
const DISCARD_BENCH = 'discard a card in their bench';
const DISCARD_BACKLOG = 'discard a card in their backlog';
/** The rows that keep only their 5 newest cards, letting the oldest go to the box. */
const POOLS = ['open-job-market', 'open-idea-pool'];
/** The rows each player has that only they can see. */
const OWN_ROWS = ['bench', 'backlog', 'research', 'scouting'];
/** The rows of each player's Board, which everyone can see: projects, products in operation, the staff on projects and the ops staff (§3). */
const BOARD_ROWS = ['development', 'operations', 'development team', 'ops team'];
/**
 * The final check before the score: after the last round each player in turn from the start player switches products off, or back on,
 * until those still online fit their ops team's bandwidth (§12, ruling 25). Only the End's steps reach it, and its moves are no turn.
 */
const FINAL_CHECK = 'final check';
/**
 * The phases of a turn, in order (§5): the declaration of modes and the ops check that open Income (§5 Phase B, §11.C.2), Income,
 * Actions with its two interrupts, the Engine's Generate and Commit, and Cleanup; then the final check, which only the End's steps
 * reach (§12).
 */
const PHASES = [
  'modes', 'ops check', 'income', 'actions', 'research', 'sourcing', 'engine', 'commit', 'bench cleanup', 'backlog cleanup',
  FINAL_CHECK,
];
// The two buttons that pick a card from a project's staff.
const REASSIGN_FROM_PROJECT = 'reassign a card from their development team to a card in their development';
const DISMISS_FROM_PROJECT = 'dismiss a card in their development team';
/** Pivot scraps a project, and Layoff sends staff to the open job market to look at as many cards of the talent deck (§6, §13.B). */
const PIVOT = 'pivot a card in their development';
const LAY_OFF = 'lay off some cards from their bench to the open job market';
const PASS_ON_THE_REST = 'pass on the rest';
/** Income's buttons (§5): let go of a staff member whose salary won't be paid, from a project or the ops team, and pay the rest. */
const LET_GO: Record<string, string> = {
  'development team': 'let go of a card in their development team',
  'ops team': 'let go of a card in their ops team',
};
const PAY_SALARIES = 'pay salaries';
/** The buttons that declare a mode, by the Board row they pick from (§11.C.2). */
const DECLARE: Record<string, string> = {
  'development team': 'declare a card in their development team',
  'ops team': 'declare a card in their ops team',
};
/** The button that ends the declaration, keeping every mode as it is (§11.C.2). */
const CONFIRM_MODES = 'confirm their modes';
/** The modes a declaration leaves on a card as a flag; Blue is neither of them (§11.C.2). */
const MODES = ['red mode', 'qa mode'];
/** The modes each answer of a declaration leaves its card in, and no other: Blue none of them (§11.C.2). */
const MODES_DECLARED: Record<string, string[]> = { Blue: [], Red: ['red mode'], QA: ['qa mode'] };
/**
 * The phases a turn passes through before its Income: the declaration of modes, then the ops check, which Income pays out after
 * (§5 Phase B, §11.C.2).
 */
const PRE_INCOME = ['modes', 'ops check'];
/**
 * The ops check's buttons (§5 Phase B, ruling 19): switch a product in operation off, or back on, and confirm the ones left online
 * once the ops team's bandwidth runs them. The final check has the two switches but no confirm: its step passes on as soon as the
 * products online fit (§12).
 */
const SWITCH_OFF = 'switch off a card in their operations';
const SWITCH_ON = 'switch on a card in their operations';
const CONFIRM_ONLINE = 'confirm the products online';
/**
 * The Engine's button (§5 Phase D, R3): clean one Bug off a product in operation, when the ops team's QA can't clean every Bug and the
 * owner picks which, one Bug a press.
 */
const CLEAN = 'clean a card in their operations';
// The Board's other buttons in the actions phase (§6, rulings 7, 20 and 25).
const HIRE_AGENCY_TO_PROJECT = 'hire a card from the agency row to a card in their development';
const HIRE_AGENCY_TO_OPS = 'hire a card from the agency row to their ops team';
const GREENLIGHT = 'greenlight a card in their backlog';
const ASSIGN_TO_PROJECT = 'assign some cards from their bench to a card in their development';
const ASSIGN_TO_OPS = 'assign some cards from their bench to their ops team';
const REASSIGN_FROM_OPS = 'reassign a card from their ops team to a card in their development';
const RECALL = 'recall some cards from their ops team to their bench';
const DISMISS_FROM_OPS = 'dismiss a card in their ops team';
const LAUNCH = 'launch a card from their development to their operations';
/**
 * The buttons that put a card on a product in operation its owner picks, as the Growth Hacker sits on its product, and send any other
 * card they move to the ops team (§3, §6, §20.B): a hire from the agency row, an assign from the bench, a hire from the scouting, and a
 * reassign of a card on one product to another.
 */
const HIRE_AGENCY_TO_PRODUCT = 'hire a card from the agency row to a card in their operations';
const ASSIGN_TO_PRODUCT = 'assign some cards from their bench to a card in their operations';
const HIRE_SCOUTED_TO_PRODUCT = 'hire some cards from their scouting to a card in their operations';
const REASSIGN_TO_PRODUCT = 'reassign a card from their ops team to a card in their operations';
/**
 * The buttons that reassign staff, each leaving its card onboarding (§6): onto a project from where they work, which the Diva's Ego
 * refuses (§20.B.1), and from one product in operation to another.
 */
const REASSIGNS = [REASSIGN_FROM_PROJECT, REASSIGN_FROM_OPS, REASSIGN_TO_PRODUCT];
/** Sourcing's hires (§13.B): the cards a Layoff found, at their printed cost, to the bench, the ops team, a project or a product. */
const SOURCE_HIRES = [
  'hire some cards from their scouting to their bench',
  'hire some cards from their scouting to their ops team',
  'hire some cards from their scouting to a card in their development',
  HIRE_SCOUTED_TO_PRODUCT,
];
/** The hires from the agency row, which cost the card's cost. */
const AGENCY_HIRES = [HIRE_AGENCY, HIRE_AGENCY_TO_PROJECT, HIRE_AGENCY_TO_OPS, HIRE_AGENCY_TO_PRODUCT];
/** Every button that hires: an agency card that reaches the open job market in any other move was pushed out of its row. */
const HIRES = [...AGENCY_HIRES, HIRE_MARKET, ...SOURCE_HIRES];
/** What the tally calls a product in operation paying its rev at Income (§5). */
const EARNS = 'a product in operation earns its rev';
/** What the tally calls a card pushed out of the agency row into the open job market (§13.B, R7). */
const PUSHED_OUT = 'the agency row pushes a card out to the open job market';
/** The row each Cleanup phase discards from, and the button that discards from it. */
const CLEANUPS: Record<string, { row: string; discard: string }> = {
  'bench cleanup': { row: 'bench', discard: DISCARD_BENCH },
  'backlog cleanup': { row: 'backlog', discard: DISCARD_BACKLOG },
};
/** What each card left in a backlog costs at the end, by its tier: vaporware (ruling 24). */
const VAPORWARE: Record<string, number> = { 'Tier 1': 2, 'Tier 2': 5, 'Tier 3': 10 };
/** The actions each player has each turn, as the rules give them: what a seat has when its turn starts. */
const ACTIONS_EACH_TURN = 3;
/** The tiers of the growth deck's products, which require Tags and need Matching Leads (§3, §14.B.2). */
const GROWTH_TIERS = ['Tier 2', 'Tier 3'];
/** The columns naming the Tags a product requires of some player's operations; a blank cell requires nothing (§14.B.2). */
const REQUIREMENTS = ['requires', 'also requires'];
/** The skills of a Senior Developer who leads each colour of a project: Software or flex for blue, Hardware or flex for red (§3). */
const LEADS: Record<string, string[]> = { blue: ['software', 'flex'], red: ['hardware', 'flex'] };
/** Why the rules refuse to reassign the Diva: her Ego (§6, §20.B.1). */
const EGO_REFUSAL = 'the card is not an Ego card';
/**
 * The phases of a seat's turn before its Engine runs: the declaration of modes, the ops check, Income, Actions and the two phases that
 * interrupt Actions.
 */
const BEFORE_THE_ENGINE = ['modes', 'ops check', 'income', 'actions', 'research', 'sourcing'];
// What the tally calls the paths of slice 3 (see `happenings`), besides the moves themselves.
const LICENSE_TO_THE_ONLY_PROVIDER = 'a license paid to the only provider';
const LICENSE_TO_A_CHOSEN_PROVIDER = 'a license paid to a chosen provider';
const TWO_LICENSES = 'two licenses in one greenlight';
const CUT_FILLED_IN = 'a cut filled in';
const CUT_CHOSEN = 'a cut chosen among options';
const GROWTH_GREENLIT = 'a Tier 2 or 3 card greenlit';
const GROWTH_LAUNCHED = 'a Tier 2 or 3 card launched';
const CUT_LAUNCHED = 'a project launched with a cut';
const STALLED_AT_THE_ENGINE = 'a stalled project at the engine';
const DIVA_PIVOTED = 'the Diva fired by a pivot';
/** What the tally calls the Diva's Ego refusing a reassign, by the button: from a project or from the ops team (§6, §20.B.1). */
const DIVA_REFUSED: Record<string, string> = {
  [REASSIGN_FROM_PROJECT]: 'the Diva refused a reassign from a project',
  [REASSIGN_FROM_OPS]: 'the Diva refused a reassign from the ops team',
};
const ENGINEER_IN_OPS = 'the Engineer paid 1 in the ops team';
// What the tally calls the paths of slice 4 (see `happenings` and the long runs' watch), besides the moves themselves.
/** A declaration, by the mode its answer names: `a mode declared: Red` (§11.C.2). */
const MODE_DECLARED = 'a mode declared';
const MODES_KEPT = 'modes kept by a confirm alone';
const MODE_FORGOTTEN = 'a mode forgotten on a bench';
const MODE_CARRIED = 'a mode carried between teams';
const OFFLINE_AT_INCOME = 'an offline product at Income';
const EARNING_LESS = 'a product earning less for its Bugs';
const GROWTH_HACKER_EARNED = "a Growth Hacker's $3 earned";
const BUG_ON_PROJECT = 'a Bug added to a project';
const BUG_ON_PRODUCT = 'a Bug added to a product in operation';
const CLEANED_ON_PROJECT = 'a Bug cleaned on a project';
const CLEANED_IN_OPS = 'a Bug cleaned in operations by itself';
const SWITCHED_OFF_AT_THE_END = 'a product switched off at the final check';
const SWITCHED_ON_AT_THE_END = 'a product switched on at the final check';
const BACK_ONLINE_AT_THE_END = 'every product back online at the final check';
const BUG_STOPPED = "a Growth Hacker's Bug stopped by the Architect";

/** The button of the phase `state` is in whose move type is `type`, as the game declares it. */
const buttonOf = (state: GameState, type: string) =>
  game!.phases.find((phase) => phase.id === state.turn?.phase)?.actions.find((action) => action.words === type);

/** How many of a kind of cube a card has: a count the game declares on cards, 0 until a rule changes it. */
const cubesOn = (card: CardState, kind: string) => (card.data?.[kind] as number | undefined) ?? 0;
/** How many Bugs a card has: a count read as a number, like the cubes, since a count back at 0 has no key (P6). */
const bugsOn = (card: CardState) => cubesOn(card, 'bugs');
/** `seat`'s products in operation. */
const operationsOf = (state: GameState, seat: PlayerId) => zoneCards(state, zoneIdFor('operations', seat));
/** The rev `product` earns at Income, as the rules work it out in `state` (§5). */
const revOf = (runtime: LangRuntime, state: GameState, product: CardState) => runtime.workedValue(state, product.id, 'rev') as number;
/**
 * Whether a product in operation earns at Income, and so gives a market share: its rev, as the rules work it out, is more than 0
 * (§5, ruling 25).
 */
const earns = (runtime: LangRuntime, state: GameState) => (product: CardState) => revOf(runtime, state, product) > 0;
/**
 * What `seat` pays at Income: the salary of every staff member on its Board, on its projects and in its ops team (§5). A salary is the
 * one the rules work out, since a trait may change the printed one: the Engineer's is $1 in the ops team (§20.B.1).
 */
const payrollOf = (runtime: LangRuntime, state: GameState, seat: PlayerId) =>
  [...zoneCards(state, zoneIdFor('development team', seat)), ...zoneCards(state, zoneIdFor('ops team', seat))]
    .reduce((total, card) => total + (runtime.workedValue(state, card.id, 'salary') as number), 0);
/**
 * The colors `seat` is short of in `state`: its ops team's supply of each is below the maintenance its online products demand, as the
 * rules work both out (§5 Phase B, ruling 19).
 */
const shortOf = (runtime: LangRuntime, state: GameState, seat: PlayerId): ('blue' | 'red')[] =>
  (['blue', 'red'] as const).filter((color) =>
    runtime.playerValue(state, seat, `${color} supply`) < runtime.playerValue(state, seat, `${color} demand`));
/**
 * The colors of cube each skill makes as it joins a project from the bench: the bench forgets every mode, so a flex Senior works in Blue
 * until a declaration says otherwise (§11.C.2, ruling 24), and QA and the Specialists make none.
 */
const COLOR_OF_SKILL: Record<string, string> = { software: 'blue', flex: 'blue', hardware: 'red' };
/**
 * The colors a project's tracks still lack cubes of; none once it is feature complete (§6). A track holds its need: its cost less the cut
 * Domain Expertise gave it at Greenlight (§19.A), which the rules work out.
 */
const lacking = (runtime: LangRuntime, state: GameState, project: CardState) =>
  ['blue', 'red'].filter((color) => cubesOn(project, `${color} cubes`) < (runtime.workedValue(state, project.id, `${color} need`) as number));
/** The colours of cube `project` needs at all: its cost less its cut, as the rules work it out, is above 0 (§19.A). */
const needing = (runtime: LangRuntime, state: GameState, project: CardState) =>
  ['blue', 'red'].filter((color) => (runtime.workedValue(state, project.id, `${color} need`) as number) > 0);
/** The Tags `product` requires of some player's operations, from its requires and also requires cells; a blank cell requires none (§14.B.2). */
const requirementsOf = (product: CardState) =>
  REQUIREMENTS.map((column) => product.data?.[column]).filter((tag): tag is string => typeof tag === 'string');
/** The Tags `seat`'s products in operation provide (§14.B.2). */
const tagsOf = (state: GameState, seat: PlayerId) => new Set(operationsOf(state, seat).map((product) => product.data?.tag));

/**
 * How an auto-player gets its growth ideas: by researching the growth deck, or by drafting from the growth market. A game that
 * drafts them runs the growth deck down only through the market's refills, so the Crash comes out there.
 */
type Style = 'researches' | 'drafts';

/** The answers a move names for the choices its press asks, in order; none for a move that names none. */
const answersOf = (move: Move) => (Array.isArray(move.choices) ? move.choices : []) as (string | null)[];

/** Sees each move of a long run, with the state before it and the state after. */
type Watch = (before: GameState, move: Move, after: GameState) => void;

/** Hears of each press a long run's auto-player tried that the rules refused, with the state it was tried in and the rules' reason. */
type Refused = (state: GameState, move: Move, reason: string) => void;

/** Makes `move`, which the engine must accept, and shows it to `watch`. */
function play(engine: GameEngine, move: Move, watch: Watch): void {
  const before = engine.getState();
  const outcome = engine.dispatch(move);
  sameAs(outcome.ok, true, () => `${move.by} could not ${move.type} ${move.cardId ?? ''}: ${outcome.reason}`);
  watch(before, move, engine.getState());
}

/**
 * How many cards `viewedCards` has checked the targets of, and how many cards of a set button: the long runs that pick through the view
 * count on it, so that the check is known to have looked at some.
 */
const viewChecks = { targets: 0, sets: 0 };

/**
 * The cards `extras`, the page's view of `seat` in `state`, offers for the button `type`, once the view is checked against the
 * rules: they are the button's candidates, which are the cards of `zoneId` in slot order, each is named by its card's name, and
 * the button is allowed exactly when some card is. A button that puts its cards on a card picks that card in `ontoZoneId`, and the
 * view lists for each card the cards it may go on: the button's targets, which are the cards of `ontoZoneId` in slot order, each
 * named by its card's name, and the card is allowed exactly when some target takes it.
 */
function viewedCards(
  runtime: LangRuntime, extras: SeatExtras, state: GameState, seat: PlayerId, type: string, zoneId: string, ontoZoneId: string | null,
): CardPickView {
  const at = `${seat}'s ${type} in ${state.turn!.phase}`;
  const button = extras.actions.find((action) => action.move === type);
  if (button?.cards === undefined) expect(button?.cards, `the cards the view offers for ${at}`).toBeDefined();
  const picking = button!.cards!;
  const offered = picking.cards;
  const zone = zoneCards(state, zoneId);
  sameList(cardCandidates(runtime, buttonOf(state, type)!, state, seat), zone.map((card) => card.id), () => `the candidates of ${at}`);
  sameList(offered.map((card) => card.id), zone.map((card) => card.id), () => `the cards the view offers for ${at}`);
  sameList(offered.map((card) => card.name), zone.map(nameOf), () => `the names the view gives the cards of ${at}`);
  sameAs(picking.onto === null, ontoZoneId === null, () => `whether ${at} puts its cards on a card`);
  if (picking.onto !== null) {
    const targets = zoneCards(state, ontoZoneId!);
    sameList(ontoCandidates(runtime, buttonOf(state, type)!, state, seat), targets.map((card) => card.id), () => `the targets of ${at}`);
    sameList(Object.keys(picking.onto.targets), zone.map((card) => card.id), () => `the cards the view lists targets for in ${at}`);
    for (const card of offered) {
      const goes = picking.onto.targets[card.id];
      const named = targets.map((target) => [target.id, nameOf(target)]);
      // Pairs of plain values: the same pairs when there are as many and each has the same id and the same name.
      if (goes.length !== named.length || !goes.every(({ id, name }, i) => Object.is(id, named[i][0]) && Object.is(name, named[i][1]))) {
        expect(goes.map(({ id, name }) => [id, name]), `the targets the view offers ${card.id} in ${at}`).toEqual(named);
      }
      sameAs(card.allowed === true, goes.some((t) => t.allowed === true), () => `whether ${at} allows ${card.id}, with ${JSON.stringify(goes)}`);
      viewChecks.targets += 1;
    }
  }
  if (picking.some) viewChecks.sets += offered.length;
  const some = offered.some((card) => card.allowed === true);
  sameAs(button!.allowed === true, some, () => `whether ${at} is allowed, with ${JSON.stringify(offered)}`);
  return picking;
}

/**
 * Where a button that puts its cards on a card puts them: on the card `which` finds among the cards of `zoneId` that `card`, the first
 * card picked, may go on.
 */
type Onto = { zoneId: string; which: (targets: CardState[], card: CardState) => CardState | undefined };

/**
 * A press of one card alone, as the view says through it, else as the rules say: whether it is allowed, and the choices it asks, each
 * by its place among the button's choices with its answers.
 */
type Pressing = { allows: (card: CardState) => boolean; asks: (card: CardState) => { at: number; options: string[] }[] };

/** Finds the cards to press a button with among those it offers, knowing what a press of each alone would be. */
type Which<T = CardState[]> = (row: CardState[], pressing: Pressing) => T;

/**
 * The actions `playTurn` falls back on when the one it chose is refused or has nothing to pick: the Board moves 3 to 7 (assign to a
 * project, assign to the ops team, reassign, recall and pivot), which cost no capital, in the cycle's order after `action`.
 */
const boardMovesAfter = (action: number) => Array.from({ length: 8 }, (_, i) => (action + 1 + i) % 9).filter((next) => next >= 3 && next <= 7);

/**
 * Takes the turn of the seat whose turn it is, the game's turn `t` (counted from 0), until the turn passes, the game ends or
 * `stop` says the log holds enough. `a` counts the actions taken so far in this turn. An idea Domain Expertise cuts is a product
 * whose sector an online product in the seat's operations shares, other than Infra and Concept (§19.A, ruling 5); a hybrid is an
 * idea that costs cubes of both colors. Staff the seat can spare from its ops team are those whose leaving keeps the team's Blue and
 * Red bandwidth at its products' load, in each color they give, so that every product stays online at its next Income unless a
 * declaration changes a mode, but never the Growth Hacker on its product, nor QA while a product has Bugs or is viral (see `spare`).
 *
 * - **Modes.** When `t % 4 === 3` it confirms its modes at once. Otherwise it declares each card of its Board the rules call
 *   declarable, once each, the development team's first and then the ops team's, in slot order, and then confirms. Each declaration's
 *   choice is answered as any press's is (see below), so a flex Senior is declared Blue on an even `t` and Red on an odd one, and the
 *   Fixer Red or QA.
 * - **Ops check.** When `t % 3 === 0` its first two presses switch off its first product in operation and switch it on again. Then,
 *   while the rules refuse to confirm the products online, it switches off a product among its online ones with maintenance in a
 *   color it is short of (see `shortOf`), the first of those on an even `t` and the last on an odd one. Then it confirms.
 * - **Income.** While the payroll is more than the seat's capital, or once when `t % 6 === 5`, it lets go of its salaried card
 *   with the highest salary (the first of those), from the development team on an even `t` and the ops team on an odd one, or
 *   from the other when that one has none. Then it pays salaries.
 * - **Free moves** come first in the actions phase, each at most once a turn. While its development has fewer than 3, it greenlights
 *   the first backlog card whose press is allowed, Tier 2 and 3 included, but an idea Domain Expertise cuts before any other. It
 *   dismisses the ops team's first card it can spare when `t % 9 === 4` and the development team's first when `t % 9 === 8`. In the
 *   last round, with the Market Crash in the crash pile, it dismisses on an even `t` the ops team's first card that gives Blue or Red
 *   bandwidth, once a turn (see `lastRound`): a path-driver, not play, that sends a seat short so that the final check has a choice
 *   to make (see below).
 * - **The first action** is an Ideation, by `t % 4`: a growth idea (0 and 2), draft from the growth market (1), or (3) by
 *   `⌊t / 4⌋ % 3` research the seed deck, draft from the seed market or draft the open idea pool's first card. A growth idea
 *   researches the growth deck when the `style` researches, and drafts from the growth market when it drafts. A draft from a market
 *   takes a hybrid Domain Expertise cuts, else an idea it cuts, else the market's first. When the rules refuse that, it tries
 *   researching the growth deck, drafting from the growth market, researching the seed deck and drafting from the seed market, in that
 *   order, and with none allowed it recruits instead.
 * - **Each later action** first tries to reassign the Diva while she works for the seat, which her Ego refuses at no cost
 *   (§20.B.1). Then it launches the first project the engine takes, which a Tier 2 or 3 project needs to be fully led for as well as
 *   complete (P11), so that the Diva may go to the ops team with her team. Else it puts QA on its first project with Bugs that no QA
 *   on it cleans and that isn't Stalled, since a project with Bugs can't Launch (§6): the bench's first card that would clean them
 *   (see `qaForBugs`). Else it hires the agency row's first attaching card it can pay for, the Growth Hacker, onto its first product
 *   in operation (see `hireGrowthHacker`). Else it hires the Hacker from the agency row, when it can pay for him, onto its first
 *   project that needs blue cubes and no red (see `hireHacker`). Else, once a turn when `t % 4 === 1`, it reassigns the first card
 *   of its ops team that sits on a product to its first other product (see `moveGrowthHacker`). Else it pivots the project the Diva
 *   is on, which fires her (ruling 9), and it assigns her from the bench to the ops team, where her Ego refuses a reassign too. With
 *   none of those, it assigns the bench's makers of a color its first Tier 1 project with a cut lacks to that project (see
 *   `buildCut`), else it finds a lead for its first Stalled project (§3): the bench's first Senior Developer who would lead a colour
 *   it needs, assigned to it, else the agency row's first such Senior it can pay for, hired onto it, else the open job market's
 *   first, hired when it has the $1 the hire costs, else a Layoff of the bench's first card, which digs the talent deck for one. With
 *   no Stalled project, it is one by `(t + a) % 9`:
 *   0. recruit the Junior of kind `(t + a) % 3`;
 *   1. hire the first agency Senior Developer it can pay for, else the first agency card it can pay for, to its bench, its first
 *      project or its ops team, by `(t + ⌊t / 9⌋) % 3`; to the ops team by its first product's button when the card attaches or
 *      `⌊t / 9⌋` is odd (see `toAProduct`);
 *   2. hire the open job market's first Senior Developer, else its first card;
 *   3. assign the bench cards whose skill makes a color its first unfinished project with a cut still lacks, or with none such its
 *      first unfinished project (the bench's first card when none does), to that project, leaving an Efficient card on the bench;
 *   4. assign the bench's first two cards (or its one) to the ops team, an Efficient card first, by its first product's button when
 *      one of them attaches or `⌊t / 9⌋` is odd;
 *   5. reassign the first card but an Efficient one the ops team can spare to the first project, else the first development team
 *      card with another project to go on, to the first such project;
 *   6. recall every ops team card it can spare;
 *   7. pivot the first project with no cubes and no staff, else, when `t % 13 === 0`, the first project the Diva is on, else the
 *      first project; on any other `t`, the first project with a card in a mode on it (see `moded`);
 *   8. lay off the bench's first card, or its first two on an odd `t`.
 *
 *   When the rules refuse that, or it has nothing to pick, it makes the first of the Board moves 3 to 7 after it in the cycle that
 *   it can (see `boardMovesAfter`); with none, it recruits a Junior QA Tester while a project that isn't Stalled has Bugs no QA on it
 *   cleans and the bench has no card that would, else a Junior who makes a color the first unfinished project lacks, or with none
 *   lacking the Junior of kind `(t + a) % 3`, else ends its actions.
 * - **Engine.** While the Engine waits on it, its ops team's QA short of the Bugs on its products in operation, it cleans the
 *   product at `t % n` among its n products in operation with Bugs, in slot order (§5 Phase D, R3).
 * - **Final check**, as the seat whose step it is (§12, ruling 25). When `t % 3 === 0` and it has switched nothing on in this step, it
 *   switches on its offline product with the highest val, if it has one. Then, while the step is its, it switches off the product
 *   with the lowest val (the first of those) among its online products with maintenance in a color it is short of (see `shortOf`).
 *   Each step is a `t` of its own, since the step passes to the next seat as the products online fit.
 * - **Sourcing.** It hires the first card in its scouting it can pay for, to its bench, its ops team or its first project, by
 *   `(t + ⌊t / 9⌋) % 3`, or to its ops team while it has a product in operation, by its first product's button as action 1 does.
 *   When the rules refuse that, or it has nothing to pick, it tries the next of those places in that order, and with none it passes
 *   on the rest (see `sourcing`).
 * - In research it keeps a hybrid Domain Expertise cuts, else an idea it cuts, else the research row's card at `t` (mod the row's
 *   length). In the backlog cleanup it discards the first card Domain Expertise doesn't cut, else the row's first; in the bench
 *   cleanup, the row's first.
 *
 * A hire's place goes by `(t + ⌊t / 9⌋) % 3`, not `t % 3`: the action that hires from the agency row comes only when `t % 9` is 0
 * or 8, and the Layoff before a sourcing only when it is 6 or 7, so `t % 3` would never send either to one of its three places.
 * The Board moves come before a recruit as the fallback because a recruit alone spends a seat's capital on Juniors before it can hire
 * staff for its Board, and a seat that can't pay for one ends its turn with actions left; the Board moves cost nothing.
 *
 * It plays slice 3 this way so that the long runs reach its rare paths. A Tier 2 or 3 project gains no cube until a Senior leads it,
 * and a seat seldom has the capital for one, so it looks for a lead before anything but a Launch, takes Seniors first wherever it
 * hires, and recruits Juniors who make what its projects lack. Cuts come only from ideas Domain Expertise cuts, so it keeps and
 * builds those first, hybrids before the rest, which lets hybrids ask their cut often enough to be answered each way. The Diva and the
 * Engineer are single cards: it tries the Diva's reassign whenever she works for it, from a project and from the ops team, launches her
 * project if it can and else pivots it, and keeps the Engineer for the ops team, where his trait makes him cheaper.
 *
 * It plays slice 4 so that its products earn: a Launch sends the project's staff to the ops team, and a seat that then moved them all
 * out again would have its products switched off at every Income, short of the capital its Seniors cost and of the Domain Expertise
 * only an online product gives (ruling 5). So it takes out of the ops team only staff it can spare. A seat still stops in its ops
 * check when a Launch brings too few staff for its product or a let go leaves the team short, and again at each Income until staff
 * join the team. The Growth Hacker earns its product $3 and adds a Bug each turn, which ops QA cleans at the Engine (§20.B, §5
 * Phase D), so it stays on its product and QA stays in the ops team while there are Bugs to clean. Kept that way, every seat's
 * products fit at the end and the final check passes every step at once, so it would never ask a seat to choose. The last round's
 * dismiss is there to drive that path, not as a player's move: letting go of staff that run its products costs a seat their val, but
 * it sends the seat short, and the final check then has it choose what to switch off (§12, ruling 25).
 *
 * A card in a mode would leave the Board only to the open job market, by a let go or a dismiss, so no bench would ever forget a mode.
 * The Pivot of a project whose staff work in a mode is there to drive that path: it sends them to the bench, which forgets it
 * (§11.C.2, ruling 24). And the Hacker adds a Bug to each project he joins (§20.B), but at 2 players a seat seldom has his $6 while
 * he is in the agency row, and its actions go elsewhere when it does, so no 2-player game would see a project's Bug. A seat that
 * can pay for him hires him onto a project that needs only the blue cubes his software output makes. That is a path-driver too, not
 * play (a seat would avoid a Spaghetti Code hire), and the blue-only gate has a second reason: ungated, the hire moves 4 players
 * seed 1 off the Greenlight that asks a choice among several, which the Greenlight replay's `among` needs.
 *
 * Some of slice 3's paths come once or twice in all the long runs, and slice 4's moves change which games reach them. So the Diva
 * goes to the ops team from the bench on any turn, a project with a cut, which Domain Expertise made cheaper to build, gets makers
 * first and a Tier 1 one before a lead is sought for a Stalled project, and a card found by a Layoff goes to the ops team while the
 * seat has a product, since a seat seldom has a product and the capital for a card it found at once.
 *
 * Without `throughView` it finds the cards a button picks in the zones. With it, it finds them as a player at the page would: among
 * the cards the page's view of the seat offers for the button and the cards each may go on (both checked by `viewedCards`). The
 * view must judge each card it picks as the engine judges a press of that card alone, with its target, and allow every card of a
 * press the engine takes. A set is judged whole (R1), so the engine's word on the press is no one card's. It chooses the same
 * cards either way, so a game plays the same. Whether a press of a card alone is allowed, and the choices it asks, come from the
 * view's word on the card through it, else from `pressChoices`, which refuses as the button does before its choices are asked.
 *
 * A press that asks a choice, as a Greenlight asks who is paid each License and how Domain Expertise cuts a hybrid, answers choice
 * `at` with option `(t + at) % options.length`: with `throughView` from the `choices` the view lists for the card, else from
 * `pressChoices`. The answers go on the move before the view's word on it is kept, so that the view is checked on the move the seat
 * makes (P20). Each press the rules refuse is told to `refused`.
 */
function playTurn(
  engine: GameEngine, t: number, style: Style, watch: Watch, stop: (log: readonly Move[]) => boolean, runtime: LangRuntime,
  throughView: boolean, refused: Refused = () => {},
): void {
  const by = engine.getState().turn!.current;
  const cards = (zoneId: string) => zoneCards(engine.getState(), zoneId);
  const own = (row: string) => zoneIdFor(row, by);
  const capital = () => counterOf(engine.getState(), 'capital', by);
  const press = (type: string): Move => ({ type, by });
  /** The page's view of the seat, read once for each state a card is picked in. */
  let view: { of: GameState; extras: SeatExtras } | null = null;
  /** The view's word on each card of each move whose cards were found through the view, on the card it goes on when it goes on one. */
  const verdicts = new Map<Move, { id: string; allowed: true | string }[]>();
  /**
   * The cards `type` offers from `zoneId`, and for each the cards of `ontoZoneId` it may go on: the zones' cards, or, through the view,
   * the ones the page's view lists, with the view itself.
   */
  const offers = (type: string, zoneId: string, ontoZoneId: string | null) => {
    const state = engine.getState();
    const byId = (id: string) => cardById(state, id)!;
    if (!throughView) {
      return { row: zoneCards(state, zoneId), targetsOf: (_id: string) => (ontoZoneId === null ? [] : zoneCards(state, ontoZoneId)), seen: null };
    }
    if (view?.of !== state) view = { of: state, extras: seatExtras(engine, runtime, state, by) };
    const seen = viewedCards(runtime, view.extras, state, by, type, zoneId, ontoZoneId);
    return { row: seen.cards.map(({ id }) => byId(id)), targetsOf: (id: string) => seen.onto!.targets[id].map((target) => byId(target.id)), seen };
  };
  /**
   * The move that presses `type` with the cards `which` finds among those it offers from `zoneId`, as a set when `some`, and, for a
   * button that puts them on a card, on the card `onto` finds; null when either finds none. `which` may ask whether a press of a card
   * alone is allowed: as the view says through it, else when the rules don't refuse it before its choices (`pressChoices`).
   */
  const pickFrom = (type: string, zoneId: string, some: boolean, which: Which, onto?: Onto): Move | null => {
    const { row, targetsOf, seen } = offers(type, zoneId, onto?.zoneId ?? null);
    const alone = (card: CardState) => pressChoices(runtime, engine.getState(), { type, by, cardId: card.id });
    const viewOf = (card: CardState) => seen!.cards.find(({ id }) => id === card.id)!;
    const pressing: Pressing = seen === null
      ? {
        allows: (card) => typeof alone(card) !== 'string',
        asks: (card) => {
          const asked = alone(card);
          return typeof asked === 'string' ? [] : asked;
        },
      }
      : {
        allows: (card) => viewOf(card).allowed === true,
        asks: (card) => (viewOf(card).choices ?? []).map(({ at, options }) => ({ at, options: options.map(({ value }) => value) })),
      };
    const picked = which(row, pressing);
    if (picked.length === 0) return null;
    const target = onto?.which(targetsOf(picked[0].id), picked[0]);
    if (onto && !target) return null;
    const pressed: Move = {
      type, by, ...(some ? { cardIds: picked.map((card) => card.id) } : { cardId: picked[0].id }), ...(target ? { onto: target.id } : {}),
    };
    // The choices the press asks, as the view lists them for the card (on its target, when it has one) or as the rules ask them.
    const asked = (): { at: number; options: string[] }[] => {
      if (seen === null) {
        const choices = pressChoices(runtime, engine.getState(), pressed);
        return typeof choices === 'string' ? [] : choices;
      }
      const card = target
        ? seen.onto!.targets[picked[0].id].find(({ id }) => id === target.id)!
        : seen.cards.find(({ id }) => id === picked[0].id)!;
      return (card.choices ?? []).map(({ at, options }) => ({ at, options: options.map(({ value }) => value) }));
    };
    const button = buttonOf(engine.getState(), type);
    const count = button === undefined ? 0 : choicesOf(button).length;
    const asking = count === 0 ? [] : asked();
    const answer = (at: number) => {
      const options = asking.find((choice) => choice.at === at)?.options;
      return options === undefined ? null : options[(t + at) % options.length];
    };
    const choices = Array.from({ length: count }, (_, at) => answer(at));
    const move: Move = asking.length === 0 ? pressed : { ...pressed, choices };
    if (seen !== null) {
      const verdictOf = (id: string) => (target
        ? seen.onto!.targets[id].find((card) => card.id === target.id)!
        : seen.cards.find((card) => card.id === id)!).allowed;
      verdicts.set(move, picked.map(({ id }) => ({ id, allowed: verdictOf(id) })));
    }
    return move;
  };
  const pick = (type: string, zoneId: string, which: Which<CardState | undefined>, onto?: Onto) =>
    pickFrom(type, zoneId, false, (row, pressing) => {
      const card = which(row, pressing);
      return card ? [card] : [];
    }, onto);
  const pickSome = (type: string, zoneId: string, which: Which, onto?: Onto) =>
    pickFrom(type, zoneId, true, which, onto);
  const first = (type: string, zoneId: string) => pick(type, zoneId, (row) => row[0]);
  /** On the project `which` finds in the seat's development, its first by default. */
  const onProject = (which: Onto['which'] = (projects) => projects[0]): Onto => ({ zoneId: own('development'), which });
  /** On the product `which` finds in the seat's operations, its first by default. */
  const onProduct = (which: Onto['which'] = (products) => products[0]): Onto => ({ zoneId: own('operations'), which });
  /** Whether the rules call `card` attaching: it sits on the product it joins the ops team for, as the Growth Hacker does (§20.B). */
  const attaching = (card: CardState) => runtime.workedFlag(engine.getState(), card.id, 'attaching');
  /**
   * Whether a hire or an assign that may go to the ops team goes to a product instead: a card it takes is attaching, which the ops
   * team's own button refuses, or, so that the products' buttons also send cards that don't attach to the pool, `⌊t / 9⌋` is odd.
   */
  const toAProduct = (picked: CardState[]) => picked.some(attaching) || Math.floor(t / 9) % 2 === 1;
  /**
   * Whether the engine accepts `move`. For cards found through the view, the view must say what the engine says of a press of each
   * card alone, on the card it goes on: it allows the cards the seat presses, and greys each one the seat passes over because the
   * engine refuses it. A set is judged whole, so a press the engine takes is made only of cards the view allows, but one it refuses
   * may still be made of them.
   */
  const accepts = (move: Move): boolean => {
    const verdict = engine.canDispatch(move);
    const accepted = verdict === true;
    if (!accepted) refused(engine.getState(), move, verdict);
    const picks = verdicts.get(move) ?? [];
    for (const { id, allowed } of picks) {
      const alone = move.cardIds === undefined ? accepted : engine.canDispatch({ ...move, cardIds: [id] }) === true;
      const onto = move.onto === undefined ? '' : ` on ${move.onto}`;
      sameAs(allowed === true, alone, () => `whether the view allows ${by}'s ${move.type} ${id}${onto}: ${allowed}`);
    }
    if (accepted) noneOf(picks.filter(({ allowed }) => allowed !== true), () => `the cards of ${by}'s ${move.type} the view greys`);
    return accepted;
  };
  const choose = (choices: (Move | null)[]): Move => {
    const move = choices.find((choice) => choice !== null && accepts(choice));
    if (!move) throw new Error(`${by} has no move in turn ${t}, phase ${engine.getState().turn!.phase}.`);
    return move;
  };

  /** A card's salary as the rules work it out, which a trait may change from the printed one (§20.B.1). */
  const salary = (card: CardState) => runtime.workedValue(engine.getState(), card.id, 'salary') as number;
  /** The card in the row with the highest salary above 0, the first of those. */
  const highestPaid = (row: CardState[]) =>
    row.reduce<CardState | undefined>((top, card) => (salary(card) > (top ? salary(top) : 0) ? card : top), undefined);
  const lettingGo = () => (t % 2 === 0 ? ['development team', 'ops team'] : ['ops team', 'development team'])
    .map((row) => pick(LET_GO[row], own(row), highestPaid));
  /** The cards this turn has declared a mode for, each once (§11.C.2). */
  const declared = new Set<string>();
  /**
   * The declaration of the Board's first declarable card not yet declared this turn, the development team's before the ops team's;
   * null with none.
   */
  const declaration = (): Move | null => {
    const declarable = (card: CardState) => !declared.has(card.id) && runtime.workedFlag(engine.getState(), card.id, 'declarable');
    for (const row of ['development team', 'ops team']) {
      const move = pick(DECLARE[row], own(row), (cards) => cards.find(declarable));
      if (move !== null) {
        declared.add(move.cardId as string);
        return move;
      }
    }
    return null;
  };
  /** The presses this turn has made in its ops check, in order (§5 Phase B). */
  const checks: Move[] = [];
  /**
   * The ops check's press before the confirm, or null once the rules allow the confirm: on a `t` divisible by 3 its first product
   * switched off and back on, then a product it runs online in a color it is short of, the first on an even `t` and the last on an odd
   * one (§5 Phase B, ruling 19).
   */
  const opsCheck = (): Move | null => {
    if (t % 3 === 0 && checks.length === 0) return first(SWITCH_OFF, own('operations'));
    if (t % 3 === 0 && checks.length === 1) {
      return pick(SWITCH_ON, own('operations'), (row) => row.find((product) => product.id === checks[0].cardId));
    }
    if (engine.canDispatch(press(CONFIRM_ONLINE)) === true) return null;
    const short = shortOf(runtime, engine.getState(), by);
    const maint = (product: CardState, color: string) => (product.data?.[`${color} maint`] as number | undefined) ?? 0;
    const runs = (product: CardState) => product.data?.offline !== true && short.some((color) => maint(product, color) > 0);
    return pick(SWITCH_OFF, own('operations'), (row) => row.filter(runs).at(t % 2 === 0 ? 0 : -1));
  };
  /** Whether this step of the final check has switched a product on (§12). */
  let switchedOn = false;
  const isOffline = (product: CardState) => product.data?.offline === true;
  /** The product of `row` whose val `beats` every other's, the first of those; undefined for an empty row. */
  const topByVal = (row: CardState[], beats: (val: number, best: number) => boolean) => row.reduce<CardState | undefined>(
    (best, product) => (best === undefined || beats(product.data?.val as number, best.data?.val as number) ? product : best), undefined);
  /** The final check's switch on of the seat's offline product with the highest val, the first of those; null with none (§12). */
  const switchOnBest = (): Move | null =>
    pick(SWITCH_ON, own('operations'), (row) => topByVal(row.filter(isOffline), (val, best) => val > best));
  /**
   * The final check's switch off of the product with the lowest val, the first of those, among the seat's online products with
   * maintenance in a color it is short of (§12, ruling 25). A seat whose step it is is short of some color, so it has one.
   */
  const switchOffLeast = (): Move | null => {
    const short = shortOf(runtime, engine.getState(), by);
    const runsShort = (product: CardState) => !isOffline(product)
      && short.some((color) => ((product.data?.[`${color} maint`] as number | undefined) ?? 0) > 0);
    return pick(SWITCH_OFF, own('operations'), (row) => topByVal(row.filter(runsShort), (val, best) => val < best));
  };
  /**
   * The cards of `team`, the seat's ops team, it can spare, in slot order: each one whose leaving, with those before it, keeps the
   * team's bandwidth in each color the card gives at the maintenance of every product in its operations, offline ones too, since the
   * next Income switches them all back on (§5 Phase B). A card that gives no bandwidth, such as a QA Tester, changes nothing by
   * leaving, so it is spare even from a team already short. But a card on a product, the Growth Hacker, is never spare, for the $3 it
   * adds there (§20.B), and nor is a card that cleans Bugs while a product in operation has Bugs or is viral, so that the Engine
   * cleans them (§5 Phase D).
   */
  const spare = (team: CardState[]): CardState[] => {
    const state = engine.getState();
    const colors = ['blue', 'red'];
    const left = colors.map((color) => runtime.playerValue(state, by, `${color} supply`));
    const load = colors.map((color) => runtime.playerValue(state, by, `${color} load`));
    const bugsToClean = operationsOf(state, by).some((product) => bugsOn(product) > 0 || runtime.workedFlag(state, product.id, 'viral'));
    return team.filter((card) => {
      if (typeof card.data?.[HOLDER_KEY] === 'string' || (bugsToClean && cleans(card))) return false;
      const bandwidth = colors.map((color) => runtime.workedValue(state, card.id, `${color} bandwidth`) as number);
      if (colors.some((_, i) => bandwidth[i] > 0 && left[i] - bandwidth[i] < load[i])) return false;
      colors.forEach((_, i) => { left[i] -= bandwidth[i]; });
      return true;
    });
  };
  /**
   * Whether Domain Expertise would cut `card` for the seat: an online product in its operations shares its sector, not Infra or
   * Concept (§19.A, ruling 5).
   */
  const expertIn = (card: CardState) => !['Infra', 'Concept'].includes(card.data?.sector as string)
    && cards(own('operations')).some((product) => product.data?.offline !== true && product.data?.sector === card.data?.sector);
  /** Whether `card` costs cubes of both colors, so that Domain Expertise may cut it more than one way (§19.A). */
  const hybrid = (card: CardState) => ['blue cost', 'red cost'].every((column) => ((card.data?.[column] as number | undefined) ?? 0) > 0);
  /** The idea of a row Domain Expertise cuts, a hybrid before the rest; undefined with none. */
  const cutIdea = (row: CardState[]) => row.find((card) => expertIn(card) && hybrid(card)) ?? row.find(expertIn);
  /** Whether a choice of the Greenlight's press is the cut Domain Expertise gives: the block of options, not a License's payee. */
  const cutAt = (at: number) => choicesOf(buttonOf(engine.getState(), GREENLIGHT)!)[at].phrase === CHOOSE_ONE;
  const isDiva = (card: CardState) => nameOf(card) === 'Diva';
  /** Whether the Diva is on `project`. */
  const divaOn = (project: CardState) => cardsOn(engine.getState(), project.id).some(isDiva);
  /** The free moves this turn has made, each at most once. */
  const made = new Set<string>();
  /** Whether this is the game's last round: the Market Crash is in the crash pile, so the round's end ends the game (§12). */
  const lastRound = () => cards('crash-pile').length > 0;
  /** Whether `card` gives Blue or Red bandwidth, as the rules work it out (§5 Phase B). */
  const givesBandwidth = (card: CardState) =>
    ['blue', 'red'].some((color) => (runtime.workedValue(engine.getState(), card.id, `${color} bandwidth`) as number) > 0);
  /** The free move to make now, or null. */
  const freeMove = (): Move | null => {
    const dismiss = t % 9 === 4 ? DISMISS_FROM_OPS : t % 9 === 8 ? DISMISS_FROM_PROJECT : null;
    const fromOps = dismiss === DISMISS_FROM_OPS;
    const mayGreenlight = !made.has(GREENLIGHT) && cards(own('development')).length < 3;
    const move = [
      mayGreenlight ? pick(GREENLIGHT, own('backlog'), (row, { allows, asks }) => {
        // A card Domain Expertise cuts costs less to build, so it goes first (§19.A).
        const allowed = row.filter(allows);
        return allowed.find((card) => asks(card).some(({ at }) => cutAt(at))) ?? allowed[0];
      }) : null,
      dismiss !== null && !made.has(dismiss)
        ? pick(dismiss, own(fromOps ? 'ops team' : 'development team'), (row) => (fromOps ? spare(row) : row)[0])
        : null,
      lastRound() && t % 2 === 0 && !made.has(DISMISS_FROM_OPS)
        ? pick(DISMISS_FROM_OPS, own('ops team'), (row) => row.find(givesBandwidth))
        : null,
    ].find((choice) => choice !== null && accepts(choice)) ?? null;
    if (move !== null) made.add(move.type);
    return move;
  };
  const ideation = (): (Move | null)[] => {
    // From a market, the idea Domain Expertise cuts, a hybrid first, else its first.
    const draft = (type: string, zoneId: string) => pick(type, zoneId, (row) => cutIdea(row) ?? row[0]);
    const seedSide = [press(RESEARCH_SEED), draft(DRAFT_SEED, 'seed-market'), first(DRAFT_POOL, 'open-idea-pool')];
    const growth = style === 'drafts' ? draft(DRAFT_GROWTH, 'growth-market') : press(RESEARCH_GROWTH);
    const planned = [growth, draft(DRAFT_GROWTH, 'growth-market'), growth, seedSide[Math.floor(t / 4) % 3]];
    return [planned[t % 4], press(RESEARCH_GROWTH), draft(DRAFT_GROWTH, 'growth-market'), press(RESEARCH_SEED), draft(DRAFT_SEED, 'seed-market')];
  };
  const recruit = (a: number) => press(RECRUITS[(t + a) % 3]);
  /**
   * The seat's first project with Bugs that no QA on it cleans: its qa team output, as the rules work it out, is 0 (§5 Phase D). A
   * Stalled project is passed over, since QA on it cleans nothing until it has its leads (§3).
   */
  const uncleaned = () => cards(own('development')).find((project) =>
    bugsOn(project) > 0 && runtime.workedValue(engine.getState(), project.id, 'qa team output') === 0
    && runtime.workedFlag(engine.getState(), project.id, 'stalled') !== true);
  /** Whether `card` would clean Bugs on a project: its qa output, as the rules work it out, is above 0. */
  const cleans = (card: CardState) => (runtime.workedValue(engine.getState(), card.id, 'qa output') as number) > 0;
  /**
   * The Junior QA Tester while a project that isn't Stalled has Bugs no QA on it cleans and the bench has no one who would (§6: a
   * project with Bugs can't Launch); else the Junior who makes a color the first unfinished project lacks: a Software Dev for blue, a
   * Hardware Eng for red; else as `recruit`.
   */
  const recruitMaker = (a: number) => {
    if (uncleaned() !== undefined && !cards(own('bench')).some(cleans)) return press(RECRUITS[2]);
    const unfinished = cards(own('development')).find((project) => lacks(project).length > 0);
    const color = unfinished === undefined ? undefined : lacks(unfinished)[(t + a) % lacks(unfinished).length];
    return color === undefined ? recruit(a) : press(RECRUITS[color === 'blue' ? 0 : 1]);
  };
  /** Whether the seat can pay for `card`. */
  const canPay = (card: CardState) => (card.data?.cost as number) <= capital();
  /** The first card of a row the seat can pay for. */
  const affordable = (row: CardState[]) => row.find(canPay);
  const senior = (card: CardState) => card.data?.role === 'Senior Developer';
  /** The first Senior Developer of a row the seat can pay for, else its first card the seat can pay for. */
  const seniorFirst = (row: CardState[]) => row.find((card) => senior(card) && canPay(card)) ?? affordable(row);
  /** An Efficient card waits on the bench for the ops team, where it costs $1 less (§20.B.1). */
  const efficient = (card: CardState) => card.data?.trait === 'Efficient';
  /** Which of its three places a hire goes to this turn. */
  const place = (t + Math.floor(t / 9)) % 3;
  const lacks = (project: CardState) => lacking(runtime, engine.getState(), project);
  // A Tier 2 or 3 project Launches only fully led, so the first project the engine takes is launched, not the first one complete (P11).
  const launch = () => pick(LAUNCH, own('development'), (projects) => projects.find((project) =>
    engine.canDispatch({ type: LAUNCH, by, cardId: project.id }) === true));
  /**
   * QA for the seat's first project with Bugs that no QA on it cleans: the bench's first card that would clean them, assigned to it,
   * since the project can't Launch until its Bugs are gone (§5 Phase D, §6). Null with no such project or card.
   */
  const qaForBugs = (): Move | null => {
    const project = uncleaned();
    if (project === undefined) return null;
    return pickSome(ASSIGN_TO_PROJECT, own('bench'), (bench) => bench.filter(cleans).slice(0, 1),
      onProject((targets) => targets.find((target) => target.id === project.id)));
  };
  /** Whether Domain Expertise cut `project` at its Greenlight (§19.A). */
  const isCut = (project: CardState) => cubesOn(project, 'cut blue cubes') + cubesOn(project, 'cut red cubes') > 0;
  /**
   * The bench's makers of a color the seat's first Tier 1 project with a cut still lacks, but an Efficient card, assigned to it: the
   * cut leaves it few cubes to build (§19.A), so it is built before a lead is sought for a Stalled project. Null with no such project
   * or maker.
   */
  const buildCut = (): Move | null => {
    const project = cards(own('development')).find((p) => p.data?.tier === 'Tier 1' && isCut(p) && lacks(p).length > 0);
    if (project === undefined) return null;
    const makes = (card: CardState) => !efficient(card) && lacks(project).includes(COLOR_OF_SKILL[card.data?.skill as string]);
    return pickSome(ASSIGN_TO_PROJECT, own('bench'), (bench) => bench.filter(makes),
      onProject((targets) => targets.find((target) => target.id === project.id)));
  };
  /** The agency row's first attaching card the seat can pay for. */
  const attachingFor = (row: CardState[]) => row.find((card) => attaching(card) && canPay(card));
  /**
   * The Growth Hacker from the agency row onto the seat's first product in operation, when the row holds an attaching card the seat
   * can pay for and the seat has a product (§3, §20.B). Null otherwise.
   */
  const hireGrowthHacker = (): Move | null => {
    if (attachingFor(cards('agency-row')) === undefined || cards(own('operations')).length === 0) return null;
    return pick(HIRE_AGENCY_TO_PRODUCT, 'agency-row', attachingFor, onProduct());
  };
  /**
   * The Hacker from the agency row onto the seat's first project that needs blue cubes and no red, which his software output builds,
   * when the seat can pay for him: his Spaghetti Code adds a Bug to each project he joins (§20.B). Null otherwise. A path-driver, not
   * play (a seat would avoid a Spaghetti Code hire): it puts a Bug on a project in a 2-player game. The gate has two reasons: he makes
   * only blue, and ungated the hire moves 4 players seed 1 off the Greenlight that asks a choice among several.
   */
  const hireHacker = (): Move | null => {
    const hacker = (row: CardState[]) => row.find((card) => card.data?.trait === 'Spaghetti Code' && canPay(card));
    const blueOnly = (project: CardState) => needing(runtime, engine.getState(), project).join() === 'blue';
    if (hacker(cards('agency-row')) === undefined || !cards(own('development')).some(blueOnly)) return null;
    return pick(HIRE_AGENCY_TO_PROJECT, 'agency-row', hacker, onProject((projects) => projects.find(blueOnly)));
  };
  /** Whether this turn has moved a card from one product to another. */
  let movedOnProducts = false;
  /**
   * On a `t` with `t % 4 === 1`, once a turn, the ops team's first card that sits on a product reassigned to the seat's first other
   * product, when it has one (§6, §20.B). Null otherwise.
   */
  const moveGrowthHacker = (): Move | null => {
    const sitting = cards(own('ops team')).find((card) => typeof card.data?.[HOLDER_KEY] === 'string');
    if (t % 4 !== 1 || movedOnProducts || sitting === undefined || cards(own('operations')).length < 2) return null;
    return pick(REASSIGN_TO_PRODUCT, own('ops team'), (row) => row.find((card) => card.id === sitting.id),
      onProduct((products, card) => products.find((product) => product.id !== card.data?.[HOLDER_KEY])));
  };
  /**
   * A lead for the seat's first Stalled project (§3): the bench's first Senior Developer who would lead a color it needs, assigned to
   * it, else the agency row's first such Senior the seat can pay for, hired onto it, else the open job market's first, hired when the
   * seat has the $1 it costs, else a Layoff of the bench's first card, which digs the talent deck for one. Null with no project Stalled.
   */
  const leadForStalled = (): Move | null => {
    const stalled = cards(own('development')).find((project) => runtime.workedFlag(engine.getState(), project.id, 'stalled'));
    if (stalled === undefined) return null;
    const needs = needing(runtime, engine.getState(), stalled);
    const leads = (card: CardState) => senior(card) && needs.some((color) => LEADS[color].includes(card.data?.skill as string));
    const onIt = onProject((targets) => targets.find((target) => target.id === stalled.id));
    return pickSome(ASSIGN_TO_PROJECT, own('bench'), (bench) => bench.filter(leads).slice(0, 1), onIt)
      ?? pick(HIRE_AGENCY_TO_PROJECT, 'agency-row', (row) => row.find((card) => leads(card) && canPay(card)), onIt)
      ?? pick(HIRE_MARKET, 'open-job-market', (row) => (capital() >= 1 ? row.find(leads) : undefined))
      ?? pickSome(LAY_OFF, own('bench'), (bench) => bench.slice(0, 1));
  };
  /**
   * The Diva's reassign, while she works for the seat, from its ops team or its development team to its first project, another than
   * hers when it has one: her Ego refuses it (§20.B.1), and the refusal costs nothing, so the seat tries it before each action.
   */
  const reassignDiva = (): Move | null => pick(REASSIGN_FROM_OPS, own('ops team'), (row) => row.find(isDiva), onProject())
    ?? pick(REASSIGN_FROM_PROJECT, own('development team'), (row) => row.find(isDiva),
      onProject((targets, card) => targets.find((project) => project.id !== card.data?.[HOLDER_KEY]) ?? targets[0]));
  /** Whether a card on `project` works in a mode: Red or QA, as a declaration left it (§11.C.2). */
  const moded = (project: CardState) =>
    cardsOn(engine.getState(), project.id).some((card) => MODES.some((mode) => card.data?.[mode] === true));
  /** A Pivot of the project the Diva is on, which fires her, since no reassign will move her (ruling 9). */
  const pivotDiva = () => pick(PIVOT, own('development'), (row) => row.find(divaOn));
  /** The Diva's assign from the bench to the ops team, where her Ego refuses a reassign as well (§6, §20.B.1). */
  const divaToOps = () => pickSome(ASSIGN_TO_OPS, own('bench'), (bench) => bench.filter(isDiva));
  /** The move the action numbered `action` makes as the turn's action `a`, or null when it has nothing to pick (see above). */
  const boardAction = (action: number, a: number): Move | null => {
    const projects = cards(own('development'));
    const holderOf = (card: CardState) => card.data?.[HOLDER_KEY];
    switch (action) {
      case 0:
        return recruit(a);
      case 1: {
        const hired = seniorFirst(cards('agency-row'));
        return [
          () => pick(HIRE_AGENCY, 'agency-row', seniorFirst),
          () => pick(HIRE_AGENCY_TO_PROJECT, 'agency-row', seniorFirst, onProject()),
          () => (toAProduct(hired === undefined ? [] : [hired])
            ? pick(HIRE_AGENCY_TO_PRODUCT, 'agency-row', seniorFirst, onProduct())
            : pick(HIRE_AGENCY_TO_OPS, 'agency-row', seniorFirst)),
        ][place]();
      }
      case 2:
        return pick(HIRE_MARKET, 'open-job-market', (row) => row.find(senior) ?? row[0]);
      case 3: {
        const unfinished = projects.find((project) => isCut(project) && lacks(project).length > 0)
          ?? projects.find((project) => lacks(project).length > 0);
        if (unfinished === undefined) return null;
        const makers = (bench: CardState[]) => bench.filter((card) => lacks(unfinished).includes(COLOR_OF_SKILL[card.data?.skill as string]));
        const assigning = (bench: CardState[]) => (makers(bench).length > 0 ? makers(bench) : bench.slice(0, 1));
        return pickSome(ASSIGN_TO_PROJECT, own('bench'), (bench) => assigning(bench.filter((card) => !efficient(card))),
          onProject((targets) => targets.find((project) => project.id === unfinished.id)));
      }
      case 4: {
        const pooled = (bench: CardState[]) => [...bench.filter(efficient), ...bench.filter((card) => !efficient(card))].slice(0, 2);
        return toAProduct(pooled(cards(own('bench'))))
          ? pickSome(ASSIGN_TO_PRODUCT, own('bench'), pooled, onProduct())
          : pickSome(ASSIGN_TO_OPS, own('bench'), pooled);
      }
      case 5:
        return pick(REASSIGN_FROM_OPS, own('ops team'), (row) => spare(row).find((card) => !efficient(card)), onProject())
          ?? pick(REASSIGN_FROM_PROJECT, own('development team'),
            (row) => row.find((card) => projects.some((project) => project.id !== holderOf(card))),
            onProject((targets, card) => targets.find((project) => project.id !== holderOf(card))));
      case 6:
        return pickSome(RECALL, own('ops team'), spare);
      case 7: {
        const idle = (project: CardState) =>
          cubesOn(project, 'blue cubes') + cubesOn(project, 'red cubes') === 0 && cardsOn(engine.getState(), project.id).length === 0;
        return pick(PIVOT, own('development'), (row) => row.find(idle) ?? (t % 13 === 0 ? row.find(divaOn) ?? row[0] : row.find(moded)));
      }
      default:
        return pickSome(LAY_OFF, own('bench'), (bench) => bench.slice(0, 1 + (t % 2)));
    }
  };
  /**
   * The hires of the first card in the seat's scouting it can pay for to each of its places, in the order it tries them: its bench, its
   * ops team (by its first product's button, as `toAProduct` says) and its first project, from the place `(t + ⌊t / 9⌋) % 3` names,
   * or from the ops team while it has a product in operation, since a seat seldom has a product and the capital for a card it found
   * at once (§13.B).
   */
  const sourcing = (): (Move | null)[] => {
    const found = (row: CardState[]) => {
      const card = affordable(row);
      return card ? [card] : [];
    };
    const [toBench, toOps, toProject, toProduct] = SOURCE_HIRES;
    const places = [
      () => pickSome(toBench, own('scouting'), found),
      () => (toAProduct(found(cards(own('scouting'))))
        ? pickSome(toProduct, own('scouting'), found, onProduct())
        : pickSome(toOps, own('scouting'), found)),
      () => pickSome(toProject, own('scouting'), found, onProject()),
    ];
    const start = cards(own('operations')).length > 0 ? 1 : place;
    return places.map((_, i) => places[(start + i) % places.length]());
  };

  const going = () => {
    const state = engine.getState();
    return state.result === undefined && state.turn!.current === by && !stop(engine.getLog());
  };
  /** Whether this turn has let a card go at Income. */
  let letGo = false;
  for (let a = 0; going();) {
    const { phase } = engine.getState().turn!;
    if (phase === 'modes') {
      play(engine, choose([t % 4 === 3 ? null : declaration(), press(CONFIRM_MODES)]), watch);
    } else if (phase === 'ops check') {
      const move = choose([opsCheck(), press(CONFIRM_ONLINE)]);
      checks.push(move);
      play(engine, move, watch);
    } else if (phase === 'income') {
      if (payrollOf(runtime, engine.getState(), by) > capital() || (t % 6 === 5 && !letGo)) {
        letGo = true;
        play(engine, choose(lettingGo()), watch);
      } else {
        play(engine, choose([press(PAY_SALARIES)]), watch);
      }
    } else if (phase === 'actions') {
      const free = freeMove();
      if (free !== null) {
        play(engine, free, watch);
        continue;
      }
      const action = (t + a) % 9;
      const board = () => [
        buildCut() ?? leadForStalled() ?? boardAction(action, a), ...boardMovesAfter(action).map((next) => boardAction(next, a)),
      ];
      const planned = a === 0 ? ideation() : [
        reassignDiva(), launch(), qaForBugs(), hireGrowthHacker(), hireHacker(), moveGrowthHacker(), pivotDiva(), divaToOps(), ...board(),
      ];
      const move = choose([...planned, recruitMaker(a), press(END_ACTIONS)]);
      if (move.type === REASSIGN_TO_PRODUCT) movedOnProducts = true;
      play(engine, move, watch);
      a++;
    } else if (phase === 'research') {
      play(engine, choose([pick(KEEP, own('research'), (row) => cutIdea(row) ?? row[t % row.length])]), watch);
    } else if (phase === 'sourcing') {
      play(engine, choose([...sourcing(), press(PASS_ON_THE_REST)]), watch);
    } else if (phase === 'engine') {
      // The Engine waits on the seat only while its ops QA can't clean every Bug on its products, so some product has Bugs (R3).
      const bugged = (row: CardState[]) => row.filter((product) => bugsOn(product) > 0);
      play(engine, choose([pick(CLEAN, own('operations'), (row) => bugged(row)[t % bugged(row).length])]), watch);
    } else if (phase === FINAL_CHECK) {
      const move = choose([t % 3 === 0 && !switchedOn ? switchOnBest() : null, switchOffLeast()]);
      if (move.type === SWITCH_ON) switchedOn = true;
      play(engine, move, watch);
    } else {
      const cleanup = CLEANUPS[phase!];
      if (cleanup === undefined) throw new Error(`The long runs don't play the ${phase} phase.`);
      const kept = (card: CardState) => cleanup.row === 'backlog' && expertIn(card);
      play(engine, choose([pick(cleanup.discard, own(cleanup.row), (row) => row.find((card) => !kept(card)) ?? row[0])]), watch);
    }
  }
}

/**
 * How a long run plays: until the log holds `moves` moves or `until` says it holds enough, with `throughView` finding each card
 * to pick through the page's view, and telling `refused` of each press the rules refuse. `finalCheck` gains the log index of each
 * move made in the final check.
 */
type Run = {
  moves?: number; throughView?: boolean; until?: (log: readonly Move[]) => boolean; refused?: Refused; finalCheck?: Set<number>;
};

/**
 * Plays a game of `players` from Setup at `seed`, turn after turn, until it has a result, `MAX_TURNS` turns are played, the log
 * holds `moves` moves or `until` says it holds enough; the engine as it is then. At an odd seed every seat researches the growth
 * deck for its growth ideas, and at an even seed it drafts them from the growth market, so that the Crash comes out of each. With
 * `throughView` each seat finds the cards it picks through the page's view of it, as `playTurn` says. Each step of the final check
 * before the score is played as a turn of its own, and the index of each of its moves goes into `finalCheck`, since they are no turn.
 */
function playGame(
  players: number, seed: number, watch: Watch,
  { moves = Infinity, throughView = false, until = () => false, refused, finalCheck }: Run = {},
): GameEngine {
  const { engine, runtime } = createEngine(game!, lib, players, initialState(game!, seed));
  const style: Style = seed % 2 === 0 ? 'drafts' : 'researches';
  const stop = (log: readonly Move[]) => log.length >= moves || until(log);
  const watching: Watch = (before, move, after) => {
    if (before.turn?.phase === FINAL_CHECK) finalCheck?.add(engine.getLog().length - 1);
    watch(before, move, after);
  };
  for (let t = 0; t < MAX_TURNS && engine.getState().result === undefined && !stop(engine.getLog()); t++) {
    playTurn(engine, t, style, watching, stop, runtime, throughView, refused);
  }
  return engine;
}

/**
 * The seat of each turn in the log, in order, among the moves whose index is not in `skipped`: a turn is a run of moves by one seat,
 * since no seat has two turns running. The long runs skip the moves of the final check, whose steps are no turns (§12).
 */
const turnsIn = (log: readonly Move[], skipped: ReadonlySet<number>): PlayerId[] => {
  const kept = log.filter((_, i) => !skipped.has(i));
  return kept.filter((move, i) => i === 0 || move.by !== kept[i - 1].by).map((move) => move.by as PlayerId);
};

/** The seat whose turn started in the move from `before` to `after`: the turn marker became it, from no seat or from another one. */
function turnStarted(before: GameState, after: GameState): PlayerId | null {
  const turnOf = after.data[TURN_OF_KEY];
  return typeof turnOf === 'string' && turnOf !== before.data[TURN_OF_KEY] ? turnOf : null;
}

/**
 * The seat that reached its Income in the move from `before` to `after`: its turn started in the move or it was in a `PRE_INCOME` phase,
 * and it is now past them with no result. Null for a move that reached none. Income earns as it starts, so this is the move that
 * pays a seat its rev and Market Share (§5 Phase B, R2); a game that ends as the round is finished reaches no Income, and nor does
 * a move that reaches the final check before the score (§12).
 */
function enteredIncome(before: GameState, after: GameState): PlayerId | null {
  const seat = turnStarted(before, after) ?? (PRE_INCOME.includes(before.turn!.phase!) ? before.turn!.current as PlayerId : null);
  if (seat === null || after.result !== undefined) return null;
  const { current, phase } = after.turn!;
  if (phase === FINAL_CHECK) return null;
  return current === seat && !PRE_INCOME.includes(phase!) ? seat : null;
}

/** Whether the Engine ran for `by` in the move from `before` to `after`: its turn was short of the Engine before, and is past it after. */
function ranTheEngine(before: GameState, after: GameState, by: PlayerId): boolean {
  const { current, phase } = after.turn!;
  return before.turn!.current === by && BEFORE_THE_ENGINE.includes(before.turn!.phase!)
    && (after.result !== undefined || current !== by || !BEFORE_THE_ENGINE.includes(phase!));
}

/**
 * The state the Engine generated cubes in, as far as a project's leads go: `after`, with every card onboarding as it was before the
 * move. A reassigned card is onboarding, as the reassign leaves it. A move that spends the last action runs the Engine and may then start
 * the next turn, which lets every card settle in, so `after` alone would show a lead the Engine never had (§6, ruling 8).
 */
function atTheEngine(before: GameState, move: Move, after: GameState): GameState {
  const reassigned = REASSIGNS.includes(move.type) ? move.cardId : undefined;
  const cards = after.cards.map((card) => {
    const was = card.id === reassigned ? true : cardById(before, card.id)?.data?.onboarding;
    if (card.data?.onboarding === was) return card;
    const { onboarding: _now, ...data } = card.data ?? {};
    return { ...card, data: was === undefined ? data : { ...data, onboarding: was } };
  });
  return { ...after, cards };
}

/**
 * What else a move made happen that the tally counts: each card a pool let go of to the box, the Market Crash reaching the
 * crash pile, by where it came from, each card the agency row pushed out to the open job market, and each product in operation
 * that earned as its seat reached Income, by its rev as the rules work it out. A draft from the growth market draws the Crash only
 * through the market's refill, and a research of the growth deck only into the research row, so the move says which way it came. A
 * card leaves the agency row for the open job market only when cards entering the row's left end push it out, never by a hire (R7).
 *
 * Slice 3's paths, read through `runtime`:
 * - **A Greenlight** of a Tier 2 or 3 card, and the choices its press asked on `before`: each License paid to the only provider or to a
 *   provider chosen among several, and both Licenses in one press; the cut filled in or chosen among options, and the cut taken, by its
 *   label (§6, §14.B.2, §19.A).
 * - **A Launch** of a Tier 2 or 3 card, and of a project with a cut.
 * - **The Engine** running on a stalled project of the mover's (§3).
 * - **The Diva** fired to the open job market by a Pivot of her project (ruling 9), and **the Engineer** paid his $1 salary in the ops
 *   team at Income (§20.B.1).
 *
 * Slice 4's paths, read through `runtime` as well (§5 Phase B and D, §11.C.2, §12, §20.B). Counts are read as numbers and flags as
 * `=== true` (P6):
 * - **Modes.** A declaration, by the mode its answer names, or the press's only option (`a mode declared: Red`); each card that was in a
 *   mode and is now in a bench, which forgets it; and each card that moved between a development team and an ops team, keeping its
 *   mode (ruling 24).
 * - **Income**, for the seat that reached it: each product of its operations that is offline, and each online one with Bugs, which
 *   earns $1 less a Bug, or that is viral, which earns the Growth Hacker's $3.
 * - **Bugs.** Each project and each product in operation whose Bugs rose; each project whose Bugs fell in a move that ran the Engine;
 *   and each product in operation whose Bugs fell in a move that is no press of the clean button, as ops QA cleans them as the Engine
 *   starts.
 * - **The final check.** Each switch off and switch on pressed in it, and each product the rules brought back online in a move into,
 *   through or out of it, the switched-on card aside.
 * - **The Architect's shield.** Each viral product of a seat whose turn the move passed with the Architect in its ops team, not
 *   onboarding, whose Bugs did not rise. The Engine's ops QA may clean in the same move, so a product whose Bugs did not rise without
 *   the Architect was cleaned, not shielded.
 */
function happenings(runtime: LangRuntime, before: GameState, move: Move, after: GameState): string[] {
  const boxed = new Set(zoneCards(before, 'box').map((c) => c.id));
  const newInBox = zoneCards(after, 'box').filter((c) => !boxed.has(c.id));
  const keys = POOLS.flatMap((pool) => {
    const held = new Set(zoneCards(before, pool).map((c) => c.id));
    return newInBox.filter((c) => held.has(c.id)).map(() => `${zoneInfo(game!, pool)!.spec.name} lets a card go to the box`);
  });
  if (zoneCards(before, 'crash-pile').length === 0 && zoneCards(after, 'crash-pile').length > 0) {
    const from = move.type === DRAFT_GROWTH ? 'from the growth market'
      : move.type === RESEARCH_GROWTH ? 'from a research row' : `after ${move.type}`;
    keys.push(`the Market Crash reaches the crash pile ${from}`);
  }
  if (!HIRES.includes(move.type)) {
    const agency = new Set(zoneCards(before, 'agency-row').map((c) => c.id));
    keys.push(...zoneCards(after, 'open-job-market').filter((c) => agency.has(c.id)).map(() => PUSHED_OUT));
  }
  const reached = enteredIncome(before, after);
  if (reached !== null) keys.push(...operationsOf(after, reached).filter(earns(runtime, after)).map(() => EARNS));

  const by = move.by as PlayerId;
  const card = typeof move.cardId === 'string' ? cardById(before, move.cardId) : undefined;
  const growth = GROWTH_TIERS.includes(card?.data?.tier as string);
  if (move.type === GREENLIGHT) {
    if (growth) keys.push(GROWTH_GREENLIT);
    const asked = pressChoices(runtime, before, move);
    for (const { at, kind, options } of typeof asked === 'string' ? [] : asked) {
      const one = options.length === 1;
      if (kind === 'player') {
        keys.push(one ? LICENSE_TO_THE_ONLY_PROVIDER : LICENSE_TO_A_CHOSEN_PROVIDER);
        continue;
      }
      keys.push(one ? CUT_FILLED_IN : CUT_CHOSEN, `the cut: ${answersOf(move)[at] ?? options[0]}`);
    }
    if (typeof asked !== 'string' && asked.filter(({ kind }) => kind === 'player').length === 2) keys.push(TWO_LICENSES);
  }
  if (move.type === LAUNCH) {
    if (growth) keys.push(GROWTH_LAUNCHED);
    if (cubesOn(card!, 'cut blue cubes') + cubesOn(card!, 'cut red cubes') > 0) keys.push(CUT_LAUNCHED);
  }
  if (ranTheEngine(before, after, by)) {
    const generating = atTheEngine(before, move, after);
    const stalled = zoneCards(generating, zoneIdFor('development', by)).filter((project) => runtime.workedFlag(generating, project.id, 'stalled'));
    keys.push(...stalled.map(() => STALLED_AT_THE_ENGINE));
  }
  if (move.type === PIVOT) {
    const fired = cardsOn(before, move.cardId as string)
      .filter((staff) => nameOf(staff) === 'Diva' && cardById(after, staff.id)!.zoneId === 'open-job-market');
    keys.push(...fired.map(() => DIVA_PIVOTED));
  }
  if (move.type === PAY_SALARIES) {
    const engineer = zoneCards(before, zoneIdFor('ops team', by)).find((staff) => nameOf(staff) === 'Engineer');
    if (engineer !== undefined && runtime.workedValue(before, engineer.id, 'salary') === 1) keys.push(ENGINEER_IN_OPS);
  }

  // Slice 4's paths.
  if (Object.values(DECLARE).includes(move.type)) {
    const asked = pressChoices(runtime, before, move);
    keys.push(`${MODE_DECLARED}: ${answersOf(move)[0] ?? (typeof asked === 'string' ? undefined : asked[0]?.options[0])}`);
  }
  if (reached !== null) {
    const products = operationsOf(after, reached);
    const online = products.filter((product) => product.data?.offline !== true);
    keys.push(...products.filter((product) => product.data?.offline === true).map(() => OFFLINE_AT_INCOME));
    keys.push(...online.filter((product) => bugsOn(product) > 0).map(() => EARNING_LESS));
    keys.push(...online.filter((product) => runtime.workedFlag(after, product.id, 'viral')).map(() => GROWTH_HACKER_EARNED));
  }
  const wasById = new Map(before.cards.map((c) => [c.id, c]));
  const engineRan = ranTheEngine(before, after, by);
  const inMode = (c: CardState | undefined) => MODES.filter((mode) => c?.data?.[mode] === true);
  for (const c of after.cards) {
    const was = wasById.get(c.id);
    const [row, wasRow] = [zoneInfo(game!, c.zoneId)?.spec.name, was === undefined ? undefined : zoneInfo(game!, was.zoneId)?.spec.name];
    if (row === 'development' || row === 'operations') {
      const bugs = bugsOn(c) - (was === undefined ? 0 : bugsOn(was));
      if (bugs > 0) keys.push(row === 'development' ? BUG_ON_PROJECT : BUG_ON_PRODUCT);
      if (bugs < 0 && row === 'development' && engineRan) keys.push(CLEANED_ON_PROJECT);
      if (bugs < 0 && row === 'operations' && move.type !== CLEAN) keys.push(CLEANED_IN_OPS);
    }
    if (row === 'bench' && inMode(was).length > 0) keys.push(MODE_FORGOTTEN);
    const teams = ['development team', 'ops team'];
    const kept = inMode(was).filter((mode) => inMode(c).includes(mode));
    if (teams.includes(row!) && teams.includes(wasRow!) && row !== wasRow && kept.length > 0) keys.push(MODE_CARRIED);
  }
  if (before.turn!.phase === FINAL_CHECK && move.type === SWITCH_OFF) keys.push(SWITCHED_OFF_AT_THE_END);
  if (before.turn!.phase === FINAL_CHECK && move.type === SWITCH_ON) keys.push(SWITCHED_ON_AT_THE_END);
  // The rule that brings every product back online runs as a seat's step starts, which may be in the move that reaches the final check
  // or in the one that sets the result, whatever phase the game shows after it (§12).
  const atTheEnd = [before.turn!, after.turn!].some(({ phase }) => phase === FINAL_CHECK)
    || (before.result === undefined && after.result !== undefined);
  if (atTheEnd) {
    const back = after.cards.filter((c) => c.data?.offline !== true && wasById.get(c.id)?.data?.offline === true);
    keys.push(...back.filter((c) => !(move.type === SWITCH_ON && c.id === move.cardId)).map(() => BACK_ONLINE_AT_THE_END));
  }
  if (passedTurn(before, after, by)) {
    // The turn passes as the step it ran in ends, before the next turn starts and lets every card settle in: so the cards on its
    // products and in its ops team onboard as they did before the move, as at the Engine.
    const passing = atTheEngine(before, move, after);
    const shielded = zoneCards(passing, zoneIdFor('ops team', by))
      .some((staff) => staff.data?.trait === 'Clean Code' && staff.data?.onboarding !== true);
    const stopped = operationsOf(passing, by).filter((product) => runtime.workedFlag(passing, product.id, 'viral')
      && bugsOn(product) <= bugsOn(wasById.get(product.id) ?? product));
    if (shielded) keys.push(...stopped.map(() => BUG_STOPPED));
  }
  return keys;
}

/**
 * Whether the move from `before` to `after` passed `by`'s turn, as its backlog cleanup ends (§5): the turn was `by`'s before, outside
 * the final check, and after it the turn is another seat's, the game is in the final check or it is over.
 */
function passedTurn(before: GameState, after: GameState, by: PlayerId): boolean {
  if (before.turn!.current !== by || before.turn!.phase === FINAL_CHECK) return false;
  return after.result !== undefined || after.turn!.phase === FINAL_CHECK || after.turn!.current !== by;
}

/**
 * A score as §12 and rulings 5, 24 and 25 count it: a point for every 5 capital, the val of each product in operation that is not
 * offline (§12, ruling 5) and 2 points for each market share, less the backlog's vaporware.
 */
function scoreOf(state: GameState, seat: PlayerId): number {
  const vaporware = zoneCards(state, zoneIdFor('backlog', seat)).reduce((sum, card) => sum + VAPORWARE[card.data?.tier as string], 0);
  const val = sum(operationsOf(state, seat).filter((product) => product.data?.offline !== true), 'val');
  return Math.floor(counterOf(state, 'capital', seat) / 5) + val + 2 * counterOf(state, 'market share', seat) - vaporware;
}

/**
 * A watch that checks, after every move of a game at `seats` played from Setup, reading through `runtime` the values the rules work
 * out for cards, such as a salary:
 *
 * - Money is conserved: each seat's capital changes by what it earned less what it paid. The mover pays the bank 2 for a recruit,
 *   the card's cost for a hire from the agency row, 1 for one from the open job market, the total cost of the picked cards for a
 *   hire from its scouting, its payroll for paying salaries, and nothing for anything else but a Greenlight. The seat that reached its
 *   Income in the move (see `enteredIncome`) earns the total rev of its products in operation, as the rules work it out, and no one
 *   else earns anything.
 * - A Greenlight pays a License for each Tag the card requires that the mover's operations didn't provide, and pays it to the other
 *   seats: the mover pays the license times the Tags missing, each other seat gains a whole number of Licenses, no more than the
 *   missing Tags its operations provided, and together they gain what the mover paid. Some seat provided every Tag the card
 *   requires (§6, §14.B.2).
 * - Market Share changes only for the seat that reached its Income, which gains 1 for each of its products in operation that earned.
 * - No zone holds more than it may: the agency row 4, each market 2, each pool 5 and the crash pile 1; the bench of a player
 *   whose turn it is not 5, their backlog 3 and their research nothing; the player whose turn it is holds at most 4 in their
 *   backlog and 3 in their research, which has cards only in the research phase.
 * - The Board: no development holds more than 3 projects; every card that sits on a card is in a development team, on a project
 *   in the same seat's development, or in an ops team, on a product in the same seat's operations; a card in an ops team sits on one
 *   only when the rules call it attaching, as the Growth Hacker is (§20.B), and every card in a development team sits on one; no card
 *   has more blue or red cubes than its blue or red need. New cubes, and the Bugs ops QA cleaned by a press (fixed bugs), sit on a
 *   card only while its owner's turn is in the Engine, which commits the one and clears the other as it ends (§5 Phase D, R3).
 * - Bugs: only a project or a product in operation has Bugs, no Launch the rules take moves a project that had Bugs (§6), and every
 *   product in operation earns a rev of 0 or more once its Bugs are taken off (§5 Phase B).
 * - The cut: a project's cut is at most its cost in each colour, and leaves it a need of 1 cube or more; no card but a project or a
 *   product in operation keeps a cut (§19.A).
 * - No project gains cubes while it is Stalled, as it was when the Engine generated them (see `atTheEngine`) (§3).
 * - No reassign the rules take moves the Diva, whose trait is Ego (§6, §20.B.1).
 * - Modes: no card off the Board, out of every development team and ops team, is in Red mode or QA mode. Red mode sits only on a card
 *   the rules call declarable, and QA mode only on a QA Skill card. A card's mode changes only in a declaration of that card, or as it
 *   leaves the Board, so a mode stays on a card that moves between a project and the ops team (§11.C.2, ruling 24). A declaration
 *   leaves its card in the mode its answer names and in no other: Blue in neither.
 * - Ops: the seat that reached its Income in the move runs its online products within its ops team's supply, in Blue and in Red
 *   (§5 Phase B, ruling 19). A product goes offline or back online only in its owner's ops check: by a press there, as the check
 *   starts, or on the way through it to Income (ruling 25). At the end, a product goes back online in any move into, through or out
 *   of the final check before the score, but offline only by its owner's switch off in it (§12).
 * - Only the seat in the sourcing phase has cards in its scouting row.
 * - Each market refills at once: the agency row holds 4 and each product market 2 while its deck has cards, and the Market
 *   Crash is never anywhere but the growth deck or the crash pile.
 * - Each pool holds the 5 cards that entered it last, in the order they entered, every card it let go of is in the box, and
 *   nothing else ever goes there.
 * - Each turn that starts is the next seat's after the turn before, the first is the start player's, and a round starts with a
 *   turn exactly when that turn is the start player's.
 * - Every card in a player's bench, backlog, research or scouting shows its back to every other player and its face to its owner.
 */
function keepsTheRules(seats: PlayerId[], runtime: LangRuntime): Watch {
  const tableDef = tableDefFor(game!, seats);
  const owners = new Map(seats.flatMap((seat) => OWN_ROWS.map((row) => [zoneIdFor(row, seat), seat] as const)));
  /** The Board's staff rows, the only rows a card keeps a mode in (§11.C.2, ruling 24). */
  const teams = new Set(seats.flatMap((seat) => [zoneIdFor('development team', seat), zoneIdFor('ops team', seat)]));
  /** Each pool's cards in the order they entered it, oldest first, less those taken or let go of. */
  let queues: Record<string, string[]> | null = null;
  /** The cards the pools have let go of. */
  const letGo: string[] = [];
  /** The seat whose turn started last. */
  let lastTurn: PlayerId | null = null;

  return (before, move, after) => {
    const by = move.by as PlayerId;
    const at = `after ${by}'s ${move.type}${move.cardId === undefined ? '' : ` ${move.cardId}`}`;
    const card = typeof move.cardId === 'string' ? cardById(before, move.cardId) : undefined;
    const from = card?.zoneId;
    const size = (zoneId: string) => zoneCards(after, zoneId).length;
    if (queues === null || lastTurn === null) {
      queues = Object.fromEntries(POOLS.map((pool) => [pool, zoneCards(before, pool).map((c) => c.id)]));
      lastTurn = before.data[TURN_OF_KEY] as PlayerId;
      expect(lastTurn, 'the first turn').toBe(startPlayerOf(before, seats));
      expect(before.data[ROUND_KEY], 'the round of the first turn').toBe(1);
    }

    // Money is conserved: paid to the bank by the mover, earned at Income by the seat that reached it.
    const started = turnStarted(before, after);
    const income = enteredIncome(before, after);
    const capital = (state: GameState, seat: PlayerId) => counterOf(state, 'capital', seat);
    const costOf = (ids: string[]) => sum(ids.map((id) => cardById(before, id)!), 'cost');
    const paid = RECRUITS.includes(move.type) ? 2
      : AGENCY_HIRES.includes(move.type) ? (card!.data?.cost as number)
        : move.type === HIRE_MARKET ? 1
          : SOURCE_HIRES.includes(move.type) ? costOf(move.cardIds as string[])
            : move.type === PAY_SALARIES ? payrollOf(runtime, before, by) : 0;
    const earned = (seat: PlayerId) =>
      (seat === income ? operationsOf(after, seat).reduce((total, product) => total + revOf(runtime, after, product), 0) : 0);
    const gained = seats.map((seat) => capital(after, seat) - capital(before, seat));
    if (move.type === GREENLIGHT) {
      // A License for each Tag the mover lacks, paid to the seats that provide it, read as the rules hold the license (§6, §14.B.2).
      const license = gameNumber(before, game!, 'license');
      const required = requirementsOf(card!);
      const missing = required.filter((tag) => !tagsOf(before, by).has(tag));
      noneOf(required.filter((tag) => !seats.some((seat) => tagsOf(before, seat).has(tag))), () => `Tags no seat provides ${at}`);
      const net = (seat: PlayerId) => gained[seats.indexOf(seat)] - earned(seat);
      sameAs(net(by), 0 - license * missing.length, () => `capital ${by} paid in Licenses ${at}`);
      const others = seats.filter((seat) => seat !== by);
      const overpaid = others.flatMap((seat) => {
        const most = license * missing.filter((tag) => tagsOf(before, seat).has(tag)).length;
        return net(seat) >= 0 && net(seat) % license === 0 && net(seat) <= most ? [] : [`${seat} gained ${net(seat)}, at most ${most}`];
      });
      noneOf(overpaid, () => `Licenses received ${at}`);
      sameAs(others.reduce((total, seat) => total + net(seat), 0), license * missing.length, () => `Licenses received in all ${at}`);
    } else {
      sameList(gained, seats.map((seat) => earned(seat) - (seat === by ? paid : 0)), () => `capital gained by ${seats.join(', ')} ${at}`);
    }
    // Market Share: 1 for each product that earned, when its owner reached Income.
    const share = (state: GameState, seat: PlayerId) => counterOf(state, 'market share', seat);
    const shares = seats.map((seat) => share(after, seat) - share(before, seat));
    const earners = (seat: PlayerId) => (seat === income ? operationsOf(after, seat).filter(earns(runtime, after)).length : 0);
    sameList(shares, seats.map(earners), () => `market share gained by ${seats.join(', ')} ${at}`);
    // No one pays what they don't have.
    const inDebt = seats.filter((seat) => capital(after, seat) < 0).map((seat) => `${seat} has ${capital(after, seat)} capital`);
    noneOf(inDebt, () => `capital below 0 ${at}`);

    // No zone over its capacity.
    const atMost = (zoneId: string, most: number) => {
      const held = size(zoneId);
      if (!(held <= most)) expect(held, `${zoneId} ${at}`).toBeLessThanOrEqual(most);
    };
    atMost('agency-row', 4);
    atMost('seed-market', 2);
    atMost('growth-market', 2);
    for (const pool of POOLS) atMost(pool, 5);
    atMost('crash-pile', 1);
    const { current, phase } = after.turn!;
    for (const seat of seats) {
      const own = (row: string) => zoneIdFor(row, seat);
      if (seat === current) {
        atMost(own('backlog'), 4);
        atMost(own('research'), 3);
        if (size(own('research')) > 0) sameAs(phase, 'research', () => `the phase while ${own('research')} has cards ${at}`);
      } else {
        atMost(own('bench'), 5);
        atMost(own('backlog'), 3);
        atMost(own('research'), 0);
      }
      atMost(own('development'), 3);
      // A Layoff's cards wait in scouting only while their seat sources (§13.B).
      if (seat !== current || phase !== 'sourcing') atMost(own('scouting'), 0);
    }

    // The Board: staff sit on their own seat's projects, the Growth Hacker on its own seat's products (§20.B), and the tracks hold at
    // most their need, the cost less the cut (§19.A).
    const projectsOf = new Map(seats.map((seat) => [zoneIdFor('development team', seat), zoneIdFor('development', seat)]));
    /** The zone of the cards each team's cards may sit on: a development team's on projects, an ops team's on products. */
    const holdersOf = new Map([
      ...projectsOf, ...seats.map((seat) => [zoneIdFor('ops team', seat), zoneIdFor('operations', seat)] as const),
    ]);
    const developments = new Set(seats.map((seat) => zoneIdFor('development', seat)));
    const operations = new Set(seats.map((seat) => zoneIdFor('operations', seat)));
    /**
     * The rows a product with a cut or Bugs may be in: a project keeps its cut once Launched, and only a Pivot clears it (R3); its
     * Bugs only a Pivot or QA clears, and a Launch takes none.
     */
    const built = new Set([...developments, ...operations]);
    /** The seat whose development or operations each of those rows is. */
    const ownerOf = new Map(seats.flatMap((seat) => [[zoneIdFor('development', seat), seat], [zoneIdFor('operations', seat), seat]] as const));
    let generating: GameState | null = null;
    /** The state the Engine generated in, made once a project is found to have gained cubes. */
    const atGenerate = () => (generating ??= atTheEngine(before, move, after));
    const board: string[] = [];
    for (const c of after.cards) {
      const which = `${c.id} (${nameOf(c)}) in ${c.zoneId}`;
      const holder = c.data?.[HOLDER_KEY];
      const holderZone = typeof holder === 'string' ? cardById(after, holder)?.zoneId : undefined;
      if (holder !== undefined && (!holdersOf.has(c.zoneId) || holderZone !== holdersOf.get(c.zoneId))) {
        board.push(`${which} is on ${JSON.stringify(holder)}, in ${holderZone}`);
      }
      if (holder !== undefined && !projectsOf.has(c.zoneId) && !runtime.workedFlag(after, c.id, 'attaching')) {
        board.push(`${which} is on ${JSON.stringify(holder)} but is not attaching`);
      }
      if (holder === undefined && projectsOf.has(c.zoneId)) board.push(`${which} is on no card`);
      const need = (color: string) => runtime.workedValue(after, c.id, `${color} need`) as number;
      for (const color of ['blue', 'red']) {
        const cubes = cubesOn(c, `${color} cubes`);
        // Off the Board a card has no cut, so its need is its cost, at least 0: only one with cubes can hold more than it.
        if ((cubes > 0 || built.has(c.zoneId)) && cubes > need(color)) {
          board.push(`${which} has ${cubes} ${color} cubes for a need of ${need(color)}`);
        }
        const cut = c.data?.[`cut ${color} cubes`];
        if (cut !== undefined && !built.has(c.zoneId)) board.push(`${which} keeps a cut of ${cut} ${color} cubes`);
      }
      // The Engine's counts wait on a card only while its owner's turn is in the Engine: the cubes it generated until it commits them,
      // and the Bugs ops QA cleaned by a press until the step ends (§5 Phase D, R3).
      const owner = ownerOf.get(c.zoneId);
      const inTheEngine = owner !== undefined && current === owner && phase === 'engine';
      for (const kind of ['new blue cubes', 'new red cubes', 'fixed bugs']) {
        if (cubesOn(c, kind) !== 0 && !inTheEngine) board.push(`${which} keeps ${cubesOn(c, kind)} ${kind}`);
      }
      if (bugsOn(c) !== 0 && !built.has(c.zoneId)) board.push(`${which} has ${bugsOn(c)} bugs`);
      // A Bug costs its product $1 of revenue, and a product earns at least $0 (§5 Phase B).
      if (operations.has(c.zoneId) && revOf(runtime, after, c) < 0) board.push(`${which} earns ${revOf(runtime, after, c)}`);
      if (!developments.has(c.zoneId)) continue;
      for (const color of ['blue', 'red']) {
        const [cut, cost] = [cubesOn(c, `cut ${color} cubes`), (c.data?.[`${color} cost`] as number | undefined) ?? 0];
        if (cut > cost) board.push(`${which} has a cut of ${cut} ${color} cubes for a cost of ${cost}`);
      }
      if (need('blue') + need('red') < 1) board.push(`${which} needs ${need('blue')} blue and ${need('red')} red cubes`);
      // A project gains cubes only from a team that has its leads, as the team was when the Engine generated them (§3).
      const was = cardById(before, c.id);
      const rose = ['blue', 'red'].some((color) => cubesOn(c, `${color} cubes`) > (was === undefined ? 0 : cubesOn(was, `${color} cubes`)));
      if (rose && runtime.workedFlag(atGenerate(), c.id, 'stalled')) board.push(`${which} gained cubes while it was stalled`);
    }
    noneOf(board, () => `the Board ${at}`);
    // The Diva's Ego keeps her where she works: no reassign the rules take moves her (§6, §20.B.1).
    if (REASSIGNS.includes(move.type) && Object.is(card!.data?.trait, 'Ego')) {
      expect(card!.data?.trait, `the trait of the card ${by} reassigned ${at}`).not.toBe('Ego');
    }
    // A project Launches only with 0 Bugs (§6).
    if (move.type === LAUNCH) sameAs(bugsOn(card!), 0, () => `the Bugs on the project ${by} launched ${at}`);
    // Modes sit only on the Board, on a card that may take them, and change only by a declaration of that card or as it leaves the
    // Board (§11.C.2, ruling 24). A mode is on only when its flag is true: "It is not red mode." may leave the flag false.
    const declared = Object.values(DECLARE).includes(move.type) ? move.cardId as string : undefined;
    const wasById = new Map(before.cards.map((c) => [c.id, c]));
    const modes: string[] = [];
    for (const c of after.cards) {
      const which = `${c.id} (${nameOf(c)}) in ${c.zoneId}`;
      const was = wasById.get(c.id);
      const left = was !== undefined && teams.has(was.zoneId) && !teams.has(c.zoneId);
      for (const mode of MODES) {
        const now = c.data?.[mode] === true;
        if (now && !teams.has(c.zoneId)) modes.push(`${which} is ${mode} off the Board`);
        // Red mode only on a declarable card, QA mode only on a QA Skill card.
        const mayTake = () => (mode === 'red mode' ? runtime.workedFlag(after, c.id, 'declarable') : c.data?.trait === 'QA Skill');
        if (now && !mayTake()) modes.push(`${which} is ${mode}, which it may not be`);
        if (now !== (was?.data?.[mode] === true) && c.id !== declared && !left) modes.push(`${which} became ${now ? '' : 'not '}${mode}`);
      }
    }
    noneOf(modes, () => `the modes ${at}`);
    if (declared !== undefined) {
      // A declaration leaves its card in the mode its answer names, or the press's only option, and in no other (§11.C.2).
      const asked = pressChoices(runtime, before, move);
      const named = answersOf(move)[0] ?? (typeof asked === 'string' ? undefined : asked[0]?.options[0]);
      const held = MODES.filter((mode) => cardById(after, declared)!.data?.[mode] === true);
      sameList(held, MODES_DECLARED[named as string], () => `the modes ${declared} is in once declared ${named} ${at}`);
    }

    // Online fits after every Income: the ops team's supply runs the products left online, in each color (§5 Phase B, ruling 19).
    if (income !== null) noneOf(shortOf(runtime, after, income), () => `the colors ${income} is short of at Income ${at}`);
    // A product's Offline changes only in its owner's ops check: by a press there, as the check starts, or on the way through it to
    // Income (ruling 25). At the end, each step of the final check may bring its seat's products back online as it starts, and may
    // pass on in the move that starts it, up to the move that sets the result; but a product goes offline there only by its owner's
    // switch off (§12). A product is offline only when its flag is true: "It is not offline." may leave it false.
    const offline = (c: CardState | undefined) => c?.data?.offline === true;
    const finalCheck = [before.turn!, after.turn!].some(({ phase }) => phase === FINAL_CHECK)
      || (before.result === undefined && after.result !== undefined);
    const switchedOff = before.turn!.phase === FINAL_CHECK && move.type === SWITCH_OFF ? move.cardId : undefined;
    const checking = (seat: PlayerId) => income === seat
      || [before.turn!, after.turn!].some(({ current, phase }) => current === seat && phase === 'ops check');
    const switched = after.cards.filter((c) => offline(c) !== offline(wasById.get(c.id))).flatMap((c) => {
      const owner = seats.find((seat) => c.zoneId === zoneIdFor('operations', seat));
      if (owner !== undefined && checking(owner)) return [];
      if (owner !== undefined && finalCheck && (!offline(c) || (owner === by && c.id === switchedOff))) return [];
      return [`${c.id} (${nameOf(c)}) in ${c.zoneId} went ${offline(c) ? 'offline' : 'online'}`];
    });
    noneOf(switched, () => `the products switched ${at}`);

    // Markets refill at once.
    const refilled = (row: string, deck: string, full: number) => {
      if (size(deck) > 0) sameAs(size(row), full, () => `${row} while ${deck} has cards ${at}`);
    };
    refilled('agency-row', 'talent-deck', 4);
    refilled('seed-market', 'seed-deck', 2);
    refilled('growth-market', 'growth-deck', 2);
    const crash = after.cards.find((c) => nameOf(c) === 'Market Crash')!;
    if (!['growth-deck', 'crash-pile'].includes(crash.zoneId)) expect(['growth-deck', 'crash-pile'], `where the Market Crash is ${at}`).toContain(crash.zoneId);

    // The pools hold the 5 newest.
    const letGoNow: string[] = [];
    for (const pool of POOLS) {
      const queue = queues[pool];
      // A card hired or drafted from a pool leaves it from wherever it sits.
      if (from === pool) {
        if (!queue.includes(card!.id)) expect(queue, `${pool} ${at}`).toContain(card!.id);
        queue.splice(queue.indexOf(card!.id), 1);
      }
      const held = new Set(zoneCards(before, pool).map((c) => c.id));
      const holds = zoneCards(after, pool).map((c) => c.id);
      queue.push(...holds.filter((id) => !held.has(id)));
      letGoNow.push(...queue.splice(0, Math.max(0, queue.length - 5)));
      sameList(holds, queue, () => `${pool}, oldest first, ${at}`);
    }
    letGo.push(...letGoNow);
    const boxed = new Set(zoneCards(before, 'box').map((c) => c.id));
    const box = zoneCards(after, 'box').map((c) => c.id);
    noneOf(letGo.filter((id) => !box.includes(id)), () => `cards a pool let go of that are not in the box ${at}`);
    // Only the pools fill the box, and only with their oldest cards: a pool that let go of a card the moment it entered would
    // show the same 5 cards as before, so this is what catches it.
    // This assumes only the pools send cards to the box, as in slice 1a; a later slice that boxes cards some other way must widen it.
    sameList(box.filter((id) => !boxed.has(id)).sort(), letGoNow.sort(), () => `cards new in the box ${at}`);

    // Turns: each one that starts is the next seat's.
    const rounds = (after.data[ROUND_KEY] as number) - (before.data[ROUND_KEY] as number);
    if (started !== null) {
      sameAs(started, seats[(seats.indexOf(lastTurn) + 1) % seats.length], () => `the turn that started ${at}`);
      lastTurn = started;
    }
    sameAs(rounds, started !== null && started === startPlayerOf(after, seats) ? 1 : 0, () => `rounds started ${at}`);

    // Hidden zones: only the owner sees the face of a card in their bench, backlog, research or scouting.
    for (const viewer of seats) {
      const wrong = deriveScene(tableDef, { cards: after.cards }, viewer).cards
        .filter((c) => owners.has(c.zoneId) && (c.faceKey === HIDDEN_FACE_KEY) !== (owners.get(c.zoneId) !== viewer))
        .map((c) => `${c.id} in ${c.zoneId}`);
      noneOf(wrong, () => `cards ${viewer} sees wrongly ${at}`);
    }
  };
}

/**
 * A watch that checks, after every move of a game at `seats`, that actions are spent only through cost lines: the mover's actions
 * go down by what the button they pressed costs in the phase it was pressed in, nothing for a button with no cost line, except that
 * ending their actions leaves them none. Every other seat's actions stay as they were, but for the seat whose turn the move started,
 * which has its 3.
 */
function keepsTheBudget(seats: PlayerId[]): Watch {
  return (before, move, after) => {
    const by = move.by as PlayerId;
    const at = `after ${by}'s ${move.type}${move.cardId === undefined ? '' : ` ${move.cardId}`}`;
    const actions = (state: GameState, seat: PlayerId) => counterOf(state, 'actions', seat);
    const cost = buttonOf(before, move.type)?.cost?.amount ?? 0;
    const turnOf = after.data[TURN_OF_KEY];
    const started = typeof turnOf === 'string' && turnOf !== before.data[TURN_OF_KEY] ? turnOf : null;
    const expected = seats.map((seat) => {
      if (seat === by) return move.type === END_ACTIONS ? 0 : actions(before, by) - cost;
      return seat === started ? ACTIONS_EACH_TURN : actions(before, seat);
    });
    sameList(seats.map((seat) => actions(after, seat)), expected, () => `actions of ${seats.join(', ')} ${at}`);
  };
}

describe('Startup Simulator (designer language)', () => {
  it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));

  it('passes every example', () => {
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(156);
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
  });

  it('greenlights with a License to a provider of each Tag the player chooses, then the cut Domain Expertise gives, as one of five options (§6, §19.A)', () => {
    const greenlight = game!.phases.find((phase) => phase.id === 'actions')!.actions.find((action) => action.words === GREENLIGHT)!;
    const refs = choicesOf(greenlight);
    // The License for what it requires, the License for what it also requires, and the cut: `choices` 0, 1 and 2 of its press.
    expect(refs.map((ref) => [ref.phrase, ref.args[0]])).toEqual([[CHOOSE_PLAYER, 0], [CHOOSE_PLAYER, 1], [CHOOSE_ONE, 2]]);
    const options = refs[2].args[2] as ChoiceOption[];
    expect(options.map((option) => option.label)).toEqual(['Cut 2 blue', 'Cut 2 red', 'Cut 1 of each', 'Cut 1 blue', 'Cut 1 red']);
  });

  it('works out each product’s need and whether it is Stalled or fully led, the Seniors who lead, and the Engineer’s salary in the ops team (§3, §6, §19.A, §20.B.1)', () => {
    const worked = game!.worked!;
    // The need is the cost less the cut, a number of its own; the salary is the talent table's column, which the Engineer's trait refines.
    expect(worked['blue need']).toMatchObject({ kind: 'number', refines: false });
    expect(worked['red need']).toMatchObject({ kind: 'number', refines: false });
    for (const flag of ['leading software', 'leading hardware', 'stalled', 'fully led', 'efficient in ops']) {
      expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    }
    expect(worked.salary).toMatchObject({ kind: 'number', refines: true });
  });

  it('works out slice 4’s values for cards and players (§5, §11.C.2, §20.B)', () => {
    const worked = game!.worked!;
    // A card's bandwidth is its output in the mode it works in, a number of its own; declarable marks a flex Senior and the Fixer.
    expect(worked['blue bandwidth']).toMatchObject({ kind: 'number', refines: false });
    expect(worked['red bandwidth']).toMatchObject({ kind: 'number', refines: false });
    expect(worked.declarable).toMatchObject({ kind: 'flag' });
    // An offline product earns nothing and scores nothing (§12, ruling 5): its rev refines the column, its portfolio points are its val.
    expect(worked.rev).toMatchObject({ kind: 'number', refines: true });
    expect(worked['portfolio points']).toMatchObject({ kind: 'number' });
    // QA cleans Bugs (§5 Phase D): a card's qa output by its skill or mode, a project's qa team output from the staff on it, and a
    // product's bug mark, 1 while it is bugged, which counts the products that have Bugs (R3).
    expect(worked['qa output']).toMatchObject({ kind: 'number' });
    expect(worked['qa team output']).toMatchObject({ kind: 'number' });
    expect(worked['bug mark']).toMatchObject({ kind: 'number' });
    expect(worked.bugged).toMatchObject({ kind: 'flag' });
    // The Growth Hacker (§20.B): its rev bonus adds to the rev of the product it sits on; it attaches, spreading Bugs while it is not
    // onboarding, and a product with such a card on it is viral.
    expect(worked['rev bonus']).toMatchObject({ kind: 'number' });
    for (const flag of ['attaching', 'spreading bugs', 'viral']) expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    // A player's supply is the bandwidth of their ops team in each color, set against the maintenance their online products demand;
    // the load counts every product in operation, offline ones too (§5 Phase B). Their ops team's QA is set against the Bugs on
    // every product in operation and the Bugs it has cleaned by a press this Engine, and the products that have Bugs are counted
    // (§5 Phase D, R3).
    expect(Object.keys(game!.playerValues!)).toEqual([
      'blue supply', 'red supply', 'blue demand', 'red demand', 'blue load', 'red load', 'qa supply', 'bug load', 'qa spent', 'bugged products',
    ]);
  });

  // The next three tests each add to the rules an example that the rules refuse for naming no button alone, and then an example for each
  // wording the refusal advises. A run plays every example the game has, the rules' own as well, and none of the added examples reads
  // another or the rules' own, so the three add theirs to the rules together and share the one run, each reading its own results. Each
  // test still checks that the wordings the refusal gives are the ones listed here, which are the ones pressed.
  type Advice = { bare: string; lands: object; pressing: (wording: string) => string };
  /** An example `bare` that the rules refuse, the wordings they advise with what pressing each one lands as, and the example that presses one. */
  const advising = <L>(bare: string[], lands: Record<string, L>, pressing: (wording: string, lands: L) => string[]): Advice => ({
    bare: bare.join('\n'), lands, pressing: (wording) => pressing(wording, lands[wording]).join('\n'),
  });
  const hackerGiven = [
    '  Given the phase is actions', '  And the agency row has the Hacker, the Architect, the Veteran and the Diva', "  And p0's operations has a To-Do List",
  ];
  const juniorGiven = [
    '  Given the phase is actions', "  And p0's development has a Dating App and a To-Do List",
    "  And the Dating App in p0's development has a Junior Software Dev on it", "  And p0's operations has a Mobile Wallet",
    "  And p0's ops team has a Junior Software Dev",
  ];
  const advice: Advice[] = [
    advising(
      [
        'Example: a Sales Rep in both rows', '  Given the agency row has the Hacker, the Architect, the Veteran and a Sales Rep',
        '  And the open job market has a Sales Rep', '  When p0 hires a Sales Rep', '  Then it is accepted',
      ],
      {
        "from the agency row to p0's bench": ["Then p0's bench has a Sales Rep", 'And the open job market has a Sales Rep'],
        'from the open job market': ["Then p0's bench has a Sales Rep", 'And the open job market is empty'],
        "to p0's ops team": ["Then p0's ops team has a Sales Rep", 'And the open job market has a Sales Rep'],
      },
      (wording, lands) => [
        `Example: hiring the Sales Rep ${wording}`, '  Given the agency row has the Hacker, the Architect, the Veteran and a Sales Rep',
        '  And the phase is actions',
        '  And the open job market has a Sales Rep', "  And p0's operations has a To-Do List", `  When p0 hires a Sales Rep ${wording}`,
        ...lands.map((line) => `  ${line}`),
      ],
    ),
    advising(
      ['Example: hiring the Hacker', ...hackerGiven, '  When p0 hires the Hacker'],
      { "to p0's bench": "  Then p0's bench has the Hacker", "to p0's ops team": "  Then p0's ops team has the Hacker" },
      (wording, lands) => [`Example: hiring the Hacker ${wording}`, ...hackerGiven, `  When p0 hires the Hacker ${wording}`, lands],
    ),
    advising(
      ['Example: a Junior Software Dev on a project and in the ops team', ...juniorGiven, '  When p0 reassigns a Junior Software Dev to the To-Do List'],
      {
        "from p0's development team to the To-Do List": ["And the Dating App in p0's development has no cards on it", "And p0's ops team has a Junior Software Dev"],
        "from p0's ops team to the To-Do List": ["And the Dating App in p0's development has a Junior Software Dev on it", "And p0's ops team is empty"],
      },
      (wording, lands) => [
        `Example: reassigning the Junior ${wording}`, ...juniorGiven, `  When p0 reassigns a Junior Software Dev ${wording}`, '  Then it is accepted',
        "  And the To-Do List in p0's development has a Junior Software Dev on it", ...lands.map((line) => `  ${line}`),
      ],
    ),
  ];
  /** What `advice[which]` added to the rules, run with the rest of them: the result of its refused example, and of each one pressing a wording. */
  const adviceRan = (() => {
    let ran: { results: ReturnType<typeof runExamples>; pressed: ReturnType<typeof runExamples> }[] | undefined;
    return (which: number) => {
      if (ran === undefined) {
        const added = advice.map(({ bare, lands, pressing }) => [bare, ...Object.keys(lands).map(pressing)]);
        const results = runExamples(compileGame(`${STARTUP_SIMULATOR}\n\n${added.flat().join('\n\n')}\n`, lib).game!, lib).slice(-added.flat().length);
        let next = 0;
        ran = added.map(({ length }) => {
          const mine = results.slice(next, next + length);
          next += length;
          return { results: mine.slice(0, 1), pressed: mine.slice(1) };
        });
      }
      return { lands: advice[which].lands, ...ran[which] };
    };
  })();

  it('asks an example which hire it means when both rows hold the card, in words that each press one button', () => {
    const { lands, results, pressed } = adviceRan(0);
    expect(results.at(-1)!.status).toBe('fail');
    // Three buttons hire from the agency row or to the bench, so neither where the card comes from nor where it goes is enough alone.
    const ask = '. Say which: “… from the agency row to p0\'s bench”, “… from the open job market” or “… to p0\'s ops team”.';
    const message = results.at(-1)!.message!;
    expect(message.slice(-ask.length)).toBe(ask);

    // Each wording the advice gives hires the Sales Rep from where it says, to where it says.
    const wordings = [...message.matchAll(/“… ([^”]+)”/g)].map(([, wording]) => wording);
    expect(wordings.sort()).toEqual(Object.keys(lands).sort());
    expect(pressed.map(({ status, message }) => [status, message])).toEqual(wordings.map(() => ['pass', null]));
  });

  it('asks an example where an agency hire goes, in words that each press one button', () => {
    const { lands, results, pressed } = adviceRan(1);
    expect(results.at(-1)!.status).toBe('fail');
    const ask = ". Say where it goes: “… to p0's bench” or “… to p0's ops team”.";
    const message = results.at(-1)!.message!;
    expect(message.slice(-ask.length)).toBe(ask);

    // Each wording the advice gives hires the Hacker to where it says.
    const wordings = [...message.matchAll(/“… ([^”]+)”/g)].map(([, wording]) => wording);
    expect(wordings.sort()).toEqual(Object.keys(lands).sort());
    expect(pressed.map(({ status, message }) => [status, message])).toEqual(wordings.map(() => ['pass', null]));
  });

  it('asks an example which reassign it means when a project and the ops team both have the staff member, keeping the project it goes to', () => {
    const { lands, results, pressed } = adviceRan(2);
    expect(results.at(-1)!.status).toBe('fail');
    const ask = ". Say where it comes from: “… from p0's development team to the To-Do List” or “… from p0's ops team to the To-Do List”.";
    const message = results.at(-1)!.message!;
    expect(message.slice(-ask.length)).toBe(ask);

    // Each wording the advice gives moves the Junior from where it says onto the To-Do List.
    const wordings = [...message.matchAll(/“… ([^”]+)”/g)].map(([, wording]) => wording);
    expect(wordings.sort()).toEqual(Object.keys(lands).sort());
    expect(pressed.map(({ status, message }) => [status, message])).toEqual(wordings.map(() => ['pass', null]));
  });

  describe('the cards (§20)', () => {
    it('has 87 cards: 22 talent, 30 seed products, and 34 growth products with the Market Crash', () => {
      const { cards } = fresh();
      expect(cards).toHaveLength(87);
      expect(inZone(cards, 'talent-deck')).toHaveLength(22);
      expect(inZone(cards, 'seed-deck')).toHaveLength(30);
      expect(inZone(cards, 'growth-deck')).toHaveLength(35);
    });

    it('has the talent deck of §20.B.1, with its costs and salaries', () => {
      const talents = inZone(fresh().cards, 'talent-deck');
      expect(nameCounts(talents)).toEqual({
        Hacker: 1, Architect: 1, Veteran: 1, Diva: 1, Engineer: 1, Fixer: 1, 'Firmware Specialist': 2, 'Full Stack Ninja': 2,
        'QA Engineer': 3, 'Sales Rep': 3, 'HR Manager': 2, 'Junior PM': 2, 'Senior PM': 1, 'Growth Hacker': 1,
      });
      expect(sum(talents, 'cost')).toBe(122);
      expect(sum(talents, 'salary')).toBe(33);
    });

    it('reads a talent card’s columns, and leaves out the skill a Specialist has none of', () => {
      expect(talent('Hacker').data).toEqual({
        name: 'Hacker', cost: 6, skill: 'software', output: 3, salary: 2, role: 'Senior Developer', trait: 'Spaghetti Code',
      });
      expect(talent('QA Engineer').data).not.toHaveProperty('skill');
    });

    it('has the 30 Tier 1 products of the seed deck (§20.C.1, §20.F.1)', () => {
      const seeds = inZone(fresh().cards, 'seed-deck');
      expect(seeds).toHaveLength(30);
      expect(new Set(seeds.map(nameOf)).size).toBe(30);
      expect(seeds.every((card) => card.data?.tier === 'Tier 1')).toBe(true);
      expect(sums(seeds)).toEqual({ 'blue cost': 122, 'red cost': 36, rev: 58, val: 68, 'blue maint': 23, 'red maint': 8 });
    });

    it('has the 34 Tier 2 and Tier 3 products of the growth deck and the Market Crash (§20.C.2, §20.F.2–3)', () => {
      const growth = inZone(fresh().cards, 'growth-deck');
      expect(growth).toHaveLength(35);
      expect(growth.filter((card) => card.data?.tier === 'Tier 2')).toHaveLength(25);
      expect(growth.filter((card) => card.data?.tier === 'Tier 3')).toHaveLength(9);
      const crashes = growth.filter((card) => nameOf(card) === 'Market Crash');
      expect(crashes.map((card) => card.data)).toEqual([{ name: 'Market Crash' }]);
      const products = growth.filter((card) => nameOf(card) !== 'Market Crash');
      expect(sums(products)).toEqual({ 'blue cost': 315, 'red cost': 170, rev: 188, val: 369, 'blue maint': 45, 'red maint': 30 });
    });

    it('deals the Market Crash as one of the growth products, so its id is one of theirs', () => {
      const growthSets = game!.cards.filter((set) => set.start === 'growth deck');
      expect(growthSets.map((set) => set.identities.length)).toEqual([35]);
      expect(growthSets[0].identities.filter(({ attrs }) => attrs.name === 'Market Crash').map(({ attrs }) => attrs)).toEqual([{ name: 'Market Crash' }]);
    });

    it('gives the Market Crash an id that changes with the seed, so no seat can follow it through the growth deck by its id', () => {
      const crashIds = Array.from({ length: 10 }, (_, i) => fresh(i + 1).cards.find((card) => nameOf(card) === 'Market Crash')!.id);
      expect(new Set(crashIds).size, crashIds.join(', ')).toBeGreaterThanOrEqual(2);
      const growthSet = game!.cards.find((set) => set.start === 'growth deck');
      for (const id of crashIds) expect(deckOf(game!.cards, id), id).toBe(growthSet);
    });

    it('gives every product a number for each cost and maintenance, 0 where it needs none of that color (C4)', () => {
      const { cards } = fresh();
      const products = [...inZone(cards, 'seed-deck'), ...inZone(cards, 'growth-deck')].filter((card) => nameOf(card) !== 'Market Crash');
      expect(products).toHaveLength(64);
      for (const card of products) {
        for (const column of CUBES) expect(typeof card.data?.[column], `${nameOf(card)}'s ${column}`).toBe('number');
      }
    });

    it('reads what a product requires and provides, and leaves out what it has none of', () => {
      expect(product('The Metaverse').data).toMatchObject({ requires: 'Media', 'also requires': 'Cloud', tag: 'Metaverse' });
      expect(product('DAO Nation').data).not.toHaveProperty('tag');
      expect(product('Smart Lock').data).not.toHaveProperty('requires');
    });

    // A face shows a card's name and its first three columns, so the columns that say what a product is come first.
    it('puts a product’s tier, tag and requirements first, so its face shows them', () => {
      const first = (name: string, n: number) => Object.keys(product(name).data!).slice(0, n);
      expect(first('Neobank', 4)).toEqual(['name', 'tier', 'tag', 'requires']);
      expect(first('Fusion Reactor', 5)).toEqual(['name', 'tier', 'tag', 'requires', 'also requires']);
      expect(first('Smart Lock', 4)).toEqual(['name', 'tier', 'tag', 'sector']);
    });

    // A rule that changes a card writes its face key again. The seed deck's rows have no requires, so the columns of every
    // table together put requires last: the face must follow the card's own row.
    it('keeps a product’s tier, tag and requirements first on its face once a rule changes the card', () => {
      const onFace = (card: CardState) => Object.keys(parseTextFaceKey(card.faceKey)!).slice(1, 4);
      const engine = arrange({ 'backlog-p0': [idOf('Neobank')], 'operations-p1': [idOf('Mobile Wallet')] });
      expect(engine.dispatch({ type: GREENLIGHT, by: 'p0', cardId: idOf('Neobank') }).ok).toBe(true);
      const neobank = cardById(engine.getState(), idOf('Neobank'))!;
      expect(neobank.zoneId).toBe('development-p0');
      expect(onFace(neobank)).toEqual(['tier', 'tag', 'requires']);
      const dao = cardById(changeCard(fresh(), idOf('DAO Nation'), { 'cut blue cubes': 1 }, game!), idOf('DAO Nation'))!;
      expect(onFace(dao)).toEqual(['tier', 'requires', 'also requires']);
    });

    it('has the three University stacks, which never run out (§20.B.2)', () => {
      const endless = game!.cards.filter((set) => set.kind === 'endless');
      expect(endless.map((set) => set.identities.map((identity) => identity.attrs.name))).toEqual(JUNIORS.map((name) => [name]));
    });
  });

  it('lays out the table: each player’s bench, backlog, research and scouting are rows only they can see, and their Board rows everyone can', () => {
    const zones = game!.zones.map(({ name, perPlayer, layout, visibility }) => [zoneIdFor(name), perPlayer, layout, visibility]);
    expect(zones).toEqual([
      ['talent-deck', false, 'pile', 'secret'],
      ['agency-row', false, 'row', 'public'],
      ['open-job-market', false, 'row', 'public'],
      ['seed-deck', false, 'pile', 'secret'],
      ['growth-deck', false, 'pile', 'secret'],
      ['seed-market', false, 'row', 'public'],
      ['growth-market', false, 'row', 'public'],
      ['open-idea-pool', false, 'row', 'public'],
      ['crash-pile', false, 'pile', 'public'],
      ['box', false, 'pile', 'secret'],
      ['bench', true, 'row', 'owner'],
      ['backlog', true, 'row', 'owner'],
      ['research', true, 'row', 'owner'],
      ['development', true, 'row', 'public'],
      ['operations', true, 'row', 'public'],
      ['development-team', true, 'row', 'public'],
      ['ops-team', true, 'row', 'public'],
      ['scouting', true, 'row', 'owner'],
    ]);
    // Staff on a project sit on it (§3); the ops team is a pool that runs every product in operation, where only a card that attaches,
    // the Growth Hacker, sits on a product (§20.B).
    const marked = game!.zones.filter((zone) => zone.onCards !== undefined).map(({ name, onCards, holders }) => [name, onCards, holders]);
    expect(marked).toEqual([['development team', 'every', 'development'], ['ops team', 'some', 'operations']]);
  });

  describe('where the buttons of the actions phase move staff', () => {
    const actions = () => game!.phases.find((phase) => phase.id === 'actions')!.actions;
    /** The zone `ref` names for p0's press, in a game of two. */
    const zoneOf = (ref: ZoneRef | null) => (ref === null ? null : moveZoneId(ref, seatsFor(2), 'p0'));
    const pickingFrom = (zoneId: string) => actions().filter((action) => action.pick !== undefined && zoneOf(action.pick.from) === zoneId);

    it('hires from the open job market and the University only to the bench (ruling 20)', () => {
      expect(pickingFrom('open-job-market').map(({ words, pick }) => [words, zoneOf(pick!.to)])).toEqual([[HIRE_MARKET, 'bench-p0']]);
      const recruits = actions().filter((action) => RECRUITS.includes(action.words));
      expect(recruits.map((action) => action.words)).toEqual(RECRUITS);
      expect(recruits.filter((action) => action.pick !== undefined)).toEqual([]);
    });

    it('moves a project’s staff by a press only to another project or out of the company (§6, ruling 25)', () => {
      const fromProjects = pickingFrom('development-team-p0').map(({ words, pick }) => [words, zoneOf(pick!.to), zoneOf(pick!.onto)]);
      expect(fromProjects).toEqual([
        [REASSIGN_FROM_PROJECT, null, 'development-p0'],
        [DISMISS_FROM_PROJECT, null, null],
      ]);
    });
  });

  describe('setup (§4)', () => {
    const counts = [2, 3, 4, 5];
    const seeds = Array.from({ length: 10 }, (_, i) => i + 1);

    it.each(counts)('sets up a table of %i players at every seed', (players) => {
      // A turn starts in modes, skipped with no flex staff on the Board, then the ops check, skipped while the ops team runs every
      // product, then income, which has no salary to pay while every Board is empty, so it goes on to actions.
      expect(game!.phases.map((phase) => phase.id)).toEqual(PHASES);
      for (const seed of seeds) {
        const state = setUp(players, seed);
        const at = `${players} players, seed ${seed}`;
        const start = state.data[START_PLAYER_KEY];
        expect({ current: state.turn?.current, phase: state.turn?.phase }, at).toEqual({ current: start, phase: 'actions' });
        expect(state.data[ROUND_KEY], at).toBe(1);

        const growth = zoneCards(state, 'growth-deck');
        const crashAt = growth.findIndex((card) => nameOf(card) === 'Market Crash');
        expect(crashAt, at).toBeGreaterThanOrEqual(0);
        expect(crashAt, at).toBeLessThan(CRASH_REACH);

        for (let p = 0; p < players; p++) {
          expect(zoneCards(state, `bench-p${p}`).map(nameOf), `${at}, p${p}'s bench`).toEqual(JUNIORS);
          const backlog = zoneCards(state, `backlog-p${p}`);
          expect(backlog.map((card) => [card.faceUp, card.data?.tier]), `${at}, p${p}'s backlog`).toEqual([[false, 'Tier 1']]);
          for (const row of BOARD_ROWS) expect(zoneCards(state, zoneIdFor(row, `p${p}`)), `${at}, p${p}'s ${row}`).toEqual([]);
          expect(zoneCards(state, `scouting-p${p}`), `${at}, p${p}'s scouting`).toEqual([]);
          const counters = state.data[COUNTERS_KEY] as Record<string, Record<string, number>>;
          expect(counters['market share']?.[`p${p}`], `${at}, p${p}'s market share`).toBe(0);
        }
        expect(zoneCards(state, 'agency-row'), at).toHaveLength(4);
        expect(zoneCards(state, 'seed-market'), at).toHaveLength(2);
        expect(zoneCards(state, 'growth-market'), at).toHaveLength(2);
      }
    });

    it('makes the Juniors after the 87 dealt cards, c87 to c95 at 3 players', () => {
      const state = setUp(3, 1);
      const ids = [0, 1, 2].flatMap((p) => zoneCards(state, `bench-p${p}`)).map((card) => Number(card.id.slice(1)));
      expect(ids.sort((a, b) => a - b)).toEqual(Array.from({ length: 9 }, (_, i) => 87 + i));
      expect(state.data[NEXT_CARD_KEY]).toBe(96);
    });

    it('chooses the start player at random', () => {
      const starts = new Set(Array.from({ length: 20 }, (_, i) => setUp(5, i + 1).data[START_PLAYER_KEY]));
      expect(starts.size).toBeGreaterThanOrEqual(3);
    });

    it.each([1, 6])('is for 2 to 5 players, not %i (ruling 25)', (players) => {
      expect(() => createEngine(game!, lib, players, initialState(game!, 1))).toThrow('This game is for 2 to 5 players.');
    });
  });

  describe('decks that run short', () => {
    it('researches a seed deck of 2 cards, shows both and keeps 1 (§14.A.2)', () => {
      const engine = arrange({
        'seed-market': [idOf('Basic Website'), idOf('USB Gadget')],
        'seed-deck': [idOf('To-Do List'), idOf('Flashlight App')],
      });
      expect(engine.dispatch({ type: 'research the seed deck', by: 'p0' }).ok).toBe(true);

      const researching = engine.getState();
      expect(researching.turn).toMatchObject({ current: 'p0', phase: 'research' });
      expect(namesIn(researching, 'research-p0')).toEqual(['To-Do List', 'Flashlight App']);
      expect(zoneCards(researching, 'seed-deck')).toEqual([]);

      expect(engine.dispatch({ type: KEEP, by: 'p0', cardId: idOf('Flashlight App') }).ok).toBe(true);
      const kept = engine.getState();
      expect(namesIn(kept, 'backlog-p0')).toEqual(['Flashlight App']);
      expect(namesIn(kept, 'open-idea-pool')).toEqual(['To-Do List']);
      expect(zoneCards(kept, 'research-p0')).toEqual([]);
      expect(kept.turn).toMatchObject({ current: 'p0', phase: 'actions' });
      expect(counterOf(kept, 'actions', 'p0')).toBe(2);
    });

    it('leaves the agency row at 3 cards when the talent deck is empty (§13)', () => {
      const engine = arrange({ 'talent-deck': [], 'agency-row': ['Hacker', 'Architect', 'Veteran', 'Diva'].map(idOf) });
      expect(engine.dispatch({ type: HIRE_AGENCY, by: 'p0', cardId: idOf('Hacker') }).ok).toBe(true);

      const state = engine.getState();
      expect(namesIn(state, 'agency-row')).toEqual(['Architect', 'Veteran', 'Diva']);
      expect(zoneCards(state, 'talent-deck')).toEqual([]);
      expect(namesIn(state, 'bench-p0')).toEqual(['Hacker']);
    });
  });

  it('sets the Market Crash aside when it is the last growth card, and ends the game once the round is finished (§12)', () => {
    const engine = arrange({
      'growth-market': [idOf('Neobank'), idOf('Search Engine')],
      'growth-deck': [idOf('Market Crash')],
    });
    expect(engine.dispatch({ type: DRAFT_GROWTH, by: 'p0', cardId: idOf('Neobank') }).ok).toBe(true);

    const drafted = engine.getState();
    expect(namesIn(drafted, 'crash-pile')).toEqual(['Market Crash']);
    expect(namesIn(drafted, 'growth-market')).toEqual(['Search Engine']);
    expect(zoneCards(drafted, 'growth-deck')).toEqual([]);
    expect(drafted.result).toBeUndefined();

    expect(engine.dispatch({ type: 'end their actions', by: 'p0' }).ok).toBe(true);
    expect(engine.getState().turn?.current).toBe('p1');
    expect(engine.getState().result).toBeUndefined();
    expect(engine.dispatch({ type: 'end their actions', by: 'p1' }).ok).toBe(true);
    expect(engine.getState().result).toBeDefined();
  });

  it('shows the bench, the backlog and the research row only to their owner (§14)', () => {
    const engine = arrange({
      'bench-p0': [idOf('Hacker'), idOf('Sales Rep')],
      'backlog-p0': [idOf('Smart Lock')],
      'seed-market': [idOf('To-Do List'), idOf('Flashlight App')],
      'seed-deck': [idOf('Dating App'), idOf('Mobile Wallet'), idOf('Messaging App')],
    });
    expect(engine.dispatch({ type: 'research the seed deck', by: 'p0' }).ok).toBe(true);

    const { cards } = engine.getState();
    const tableDef = tableDefFor(game!, seatsFor(2));
    const hidden = ['research-p0', 'bench-p0', 'backlog-p0'];
    const ownCards = cards.filter((card) => hidden.includes(card.zoneId));
    expect(ownCards.map((card) => card.zoneId).sort()).toEqual([
      'backlog-p0', 'bench-p0', 'bench-p0', 'research-p0', 'research-p0', 'research-p0',
    ]);

    const seen = (viewer: string) => deriveScene(tableDef, { cards }, viewer).cards.filter((card) => hidden.includes(card.zoneId));
    expect(seen('p1').map((card) => card.faceKey)).toEqual(ownCards.map(() => HIDDEN_FACE_KEY));
    expect(seen('p0').map((card) => card.faceKey)).toEqual(ownCards.map((card) => card.faceKey));
    expect(ownCards.every((card) => card.faceKey !== HIDDEN_FACE_KEY)).toBe(true);
  });

  it('shows the cards a Layoff finds in the scouting row only to the player who laid off (§13.B, the spec’s anti-goal)', () => {
    const engine = arrange({
      'bench-p0': [idOf('Engineer')],
      'agency-row': ['Hacker', 'Architect', 'Veteran', 'Diva'].map(idOf),
      'talent-deck': ['Sales Rep', 'QA Engineer', 'Fixer'].map(idOf),
    });
    expect(engine.dispatch({ type: LAY_OFF, by: 'p0', cardIds: [idOf('Engineer')] }).ok).toBe(true);

    const state = engine.getState();
    expect(state.turn).toMatchObject({ current: 'p0', phase: 'sourcing' });
    expect(namesIn(state, 'scouting-p0')).toEqual(['Fixer']);
    const [found] = zoneCards(state, 'scouting-p0');
    expect(found.faceKey).not.toBe(HIDDEN_FACE_KEY);
    const tableDef = tableDefFor(game!, seatsFor(2));
    const seen = (viewer: string) => deriveScene(tableDef, { cards: state.cards }, viewer).cards.filter((card) => card.zoneId === 'scouting-p0');
    expect(seen('p1').map((card) => card.faceKey)).toEqual([HIDDEN_FACE_KEY]);
    expect(seen('p0').map((card) => card.faceKey)).toEqual([found.faceKey]);
  });

  it('hands the turn back once the cards a Layoff with the last action found are passed on, and the turn goes on to the next player (Review Focus)', () => {
    const arranged = arrange({
      'bench-p0': [idOf('Engineer')],
      'agency-row': ['Hacker', 'Architect', 'Veteran', 'Diva'].map(idOf),
      'talent-deck': ['Sales Rep', 'QA Engineer', 'Fixer'].map(idOf),
    }).getState();
    const { engine } = createEngine(game!, lib, 2, setCounter(arranged, 'actions', 'p0', 1));
    expect(engine.dispatch({ type: LAY_OFF, by: 'p0', cardIds: [idOf('Engineer')] }).ok).toBe(true);
    const sourcing = engine.getState();
    expect(sourcing.turn).toMatchObject({ current: 'p0', phase: 'sourcing' });
    expect(counterOf(sourcing, 'actions', 'p0')).toBe(0);
    expect(namesIn(sourcing, 'scouting-p0')).toEqual(['Fixer']);

    expect(engine.dispatch({ type: PASS_ON_THE_REST, by: 'p0' }).ok).toBe(true);
    const passed = engine.getState();
    expect(passed.turn).toMatchObject({ current: 'p1', phase: 'actions' });
    expect(counterOf(passed, 'actions', 'p1')).toBe(ACTIONS_EACH_TURN);
    expect(zoneCards(passed, 'scouting-p0')).toEqual([]);
    // The Fixer enters at the left end and pushes the Diva out (R7).
    expect(namesIn(passed, 'agency-row')).toEqual(['Fixer', 'Hacker', 'Architect', 'Veteran']);
    expect(namesIn(passed, 'open-job-market')).toEqual(['Engineer', 'Diva']);
  });

  it('finds nothing wrong with a whole table: after Setup at every count, and with staff on projects and in the ops team', () => {
    for (const players of [2, 3, 4, 5]) expect(attachmentProblem(game!, setUp(players, 1)), `${players} players`).toBeNull();
    let state: GameState = fresh();
    const id = (name: string) => state.cards.find((card) => nameOf(card) === name)!.id;
    state = relocate(state, [id('Dating App'), id('Smart Lock')], 'development-p0', game!);
    state = relocate(state, [id('To-Do List')], 'operations-p0', game!);
    state = putOn(state, [id('Architect'), id('Hacker')], 'development-team-p0', id('Dating App'), game!);
    state = putOn(state, [id('Diva')], 'development-team-p0', id('Smart Lock'), game!);
    state = relocate(state, [id('Veteran')], 'ops-team-p0', game!);
    expect(attachmentProblem(game!, state)).toBeNull();
    // The Growth Hacker sits on a product in operation (§20.B), and a project's staff only on a project.
    state = putOn(state, [id('Growth Hacker')], 'ops-team-p0', id('To-Do List'), game!);
    expect(attachmentProblem(game!, state)).toBeNull();
    const onAProduct = putOn(state, [id('Architect')], 'development-team-p0', id('To-Do List'), game!);
    expect(attachmentProblem(game!, onAProduct)).toBe(
      "The Architect in p0's development team is on the To-Do List, which is now in p0's operations. Move the cards on a card along with it.",
    );
  });

  describe('Review Focus: a Pivot that forgets the staff on its project', () => {
    const forgotten = '      Every card on it goes to their bench.\n';
    const BROKEN = STARTUP_SIMULATOR.replace(forgotten, '');
    const broken = compileGame(BROKEN, lib);
    const LEFT_BEHIND =
      "The Architect in p0's development team is on the Dating App, which is now in the open idea pool. Move the cards on a card along with it.";
    /** The Pivot button's line, which the refusal is on. */
    const PIVOT_LINE = BROKEN.split('\n').indexOf('  A player may pivot a card in their development.') + 1;

    it('is the rules without the line that sends a pivoted project’s staff to the bench, and they compile', () => {
      expect(STARTUP_SIMULATOR.split(forgotten)).toHaveLength(2);
      expect(broken.diagnostics).toEqual([]);
    });

    it('refuses the pivot with both cards named and where the project went, and keeps the state from before it', () => {
      const rules = broken.game!;
      let state: GameState = { ...initialState(rules, 1), turn: { current: 'p0', phase: 'actions' } };
      const id = (name: string) => state.cards.find((card) => nameOf(card) === name)!.id;
      const [app, architect] = [id('Dating App'), id('Architect')];
      state = relocate(state, [app], 'development-p0', rules);
      state = putOn(state, [architect], 'development-team-p0', app, rules);
      const { engine } = createEngine(rules, lib, 2, markTurnStarted(state));
      const before = engine.getState();

      expect(() => engine.dispatch({ type: PIVOT, by: 'p0', cardId: app })).toThrow(new RuleError(LEFT_BEHIND, PIVOT_LINE));
      expect(engine.getState()).toBe(before);
      expect(engine.getLog()).toEqual([]);
    });
  });

  describe('long runs, with every rule kept after every move', () => {
    /** How many times the runs below made each move, by its type, and saw each happening: see `happenings`. */
    const tally: Record<string, number> = {};
    /** The market share every seat ended those runs with, summed. */
    let marketShare = 0;

    it.each([2, 3, 4, 5])('plays %i players, building on the Board, to the Market Crash and a score at seeds 1 to 5, seed 1 through the page’s view', (players) => {
      const seats = seatsFor(players);
      for (let seed = 1; seed <= 5; seed++) {
        const where = `${players} players, seed ${seed}`;
        const runtime = new LangRuntime(game!, lib, seats);
        const rules = keepsTheRules(seats, runtime);
        const budget = keepsTheBudget(seats);
        const checked = { ...viewChecks };
        const count = (key: string) => { tally[key] = (tally[key] ?? 0) + 1; };
        // The Diva's Ego refuses her reassign, which the rules say in that line's words (§6, §20.B.1).
        const refused: Refused = (_state, move, reason) => {
          if (REASSIGNS.includes(move.type) && reason === EGO_REFUSAL) count(DIVA_REFUSED[move.type]);
        };
        const finalCheck = new Set<number>();
        /** The seats that have declared a mode since their turn started (§11.C.2). */
        const declaring = new Set<PlayerId>();
        const engine = playGame(players, seed, (before, move, after) => {
          rules(before, move, after);
          budget(before, move, after);
          for (const key of [move.type, ...happenings(runtime, before, move, after)]) count(key);
          const by = move.by as PlayerId;
          if (Object.values(DECLARE).includes(move.type)) declaring.add(by);
          if (move.type === CONFIRM_MODES && !declaring.has(by)) count(MODES_KEPT);
          const started = turnStarted(before, after);
          if (started !== null) declaring.delete(started);
        }, { throughView: seed === 1, refused, finalCheck });
        if (seed === 1) {
          // The view was checked card by card: the cards each card may go on, and the cards of a set, each judged alone.
          expect(viewChecks.targets - checked.targets, `${where}: cards whose targets the view was checked for`).toBeGreaterThan(0);
          expect(viewChecks.sets - checked.sets, `${where}: cards of a set the view was checked for`).toBeGreaterThan(0);
        }
        const state = engine.getState();
        // The final check's steps are no turns (§12).
        const turns = turnsIn(engine.getLog(), finalCheck);
        expect(state.result, `${where}: the result after ${turns.length} turns`).toBeDefined();
        expect(turns.length, where).toBeLessThanOrEqual(MAX_TURNS);
        expect(namesIn(state, 'crash-pile'), where).toEqual(['Market Crash']);

        // The game ends once the round is finished: every seat has had as many turns, the start player's left neighbour last.
        expect(turns.length % players, `${where}: ${turns.length} turns`).toBe(0);
        const start = seats.indexOf(startPlayerOf(state, seats));
        expect(turns.at(-1), where).toBe(seats[(start + players - 1) % players]);
        // A round was counted for each one played, and none for the one the Crash keeps from starting.
        expect(state.data[ROUND_KEY], `${where}: rounds after ${turns.length} turns`).toBe(turns.length / players);

        // The final check leaves every seat's online products within its ops team's bandwidth, in Blue and in Red (§12, ruling 25).
        for (const seat of seats) {
          expect(shortOf(runtime, state, seat), `${where}: the colors ${seat} is short of at the score`).toEqual([]);
        }
        const scores = Object.fromEntries(seats.map((seat) => [seat, scoreOf(state, seat)]));
        const top = Math.max(...Object.values(scores));
        const winners = seats.filter((seat) => scores[seat] === top);
        expect(state.result, where).toEqual({ scores, winner: winners[0], winners });
        for (const seat of seats) marketShare += counterOf(state, 'market share', seat);
      }
    }, 120_000);

    it('made every move in those runs, and the pools let cards go, the agency row pushed cards out and the Crash came out of the market and of research', () => {
      const every = [
        // Slice 1a's.
        ...RECRUITS, HIRE_AGENCY, HIRE_MARKET, DRAFT_SEED, DRAFT_GROWTH, DRAFT_POOL,
        RESEARCH_SEED, RESEARCH_GROWTH, KEEP, END_ACTIONS, DISCARD_BENCH, DISCARD_BACKLOG,
        // The Board's.
        HIRE_AGENCY_TO_PROJECT, HIRE_AGENCY_TO_OPS, GREENLIGHT, ASSIGN_TO_PROJECT, ASSIGN_TO_OPS,
        REASSIGN_FROM_PROJECT, REASSIGN_FROM_OPS, RECALL, DISMISS_FROM_PROJECT, DISMISS_FROM_OPS,
        // Income's, Launch, Pivot, Layoff and Source.
        ...Object.values(LET_GO), PAY_SALARIES, LAUNCH, PIVOT, LAY_OFF, ...SOURCE_HIRES, PASS_ON_THE_REST,
        // Slice 4's: the declaration of modes, the ops check and the final check's switches, and the buttons that put a card on a
        // product in operation.
        ...Object.values(DECLARE), CONFIRM_MODES, SWITCH_OFF, SWITCH_ON, CONFIRM_ONLINE,
        ASSIGN_TO_PRODUCT, HIRE_AGENCY_TO_PRODUCT, HIRE_SCOUTED_TO_PRODUCT,
        // What the rules make happen on their own.
        'open idea pool lets a card go to the box', 'open job market lets a card go to the box', PUSHED_OUT,
        'the Market Crash reaches the crash pile from the growth market', 'the Market Crash reaches the crash pile from a research row',
      ];
      // A seat almost never holds two products while its Growth Hacker sits on one, so the reassign from one product to another is
      // counted but not required; an arranged test below pins the auto-player's press of it. So is the clean button, which the
      // Engine waits on only when ops QA can't clean every Bug, and only the one Growth Hacker brings Bugs to products in operation.
      expect(every.filter((key) => !(tally[key] > 0)), `never made or seen: ${JSON.stringify(tally)}`).toEqual([]);
    });

    it('played the Board in those runs: products launched and earned, projects were pivoted, staff were let go, and seats ended with market share', () => {
      const played = {
        launches: tally[LAUNCH] ?? 0,
        'products earning': tally[EARNS] ?? 0,
        pivots: tally[PIVOT] ?? 0,
        'let-gos': Object.values(LET_GO).reduce((count, type) => count + (tally[type] ?? 0), 0),
        'market share': marketShare,
      };
      expect(Object.keys(played).filter((what) => !(played[what as keyof typeof played] > 0)), JSON.stringify(played)).toEqual([]);
    });

    it('played slice 3 in those runs: Tier 2 and 3 greenlit and launched, Licenses paid to the only provider and to a chosen one, the cut filled in and chosen three ways and launched, Stalled projects at the Engine, the Diva refused a reassign from a project and from the ops team and fired by a pivot, and the Engineer paid $1 in the ops team', () => {
      const paths = [
        GROWTH_GREENLIT, GROWTH_LAUNCHED, LICENSE_TO_THE_ONLY_PROVIDER, LICENSE_TO_A_CHOSEN_PROVIDER,
        CUT_FILLED_IN, CUT_CHOSEN, 'the cut: Cut 2 blue', 'the cut: Cut 2 red', 'the cut: Cut 1 of each', CUT_LAUNCHED,
        STALLED_AT_THE_ENGINE, ...Object.values(DIVA_REFUSED), DIVA_PIVOTED, ENGINEER_IN_OPS,
      ];
      // Two Licenses in one Greenlight takes a Tier 3 card whose both Tags the mover lacks; it is counted, but not required.
      // Held by one game each: Cut 2 red (2 players, seed 4), the Engineer's $1 in the ops team (2 players, seed 1) and the scouting
      // hire to the bench (5 players, seed 3), to the ops team (2 players, seed 2) and to a product (3 players, seed 2), which the
      // test of every move requires. A failure here means a cadence moved: retune the auto-player, never the rules.
      expect(paths.filter((key) => !(tally[key] > 0)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
    });

    it('played slice 4 in those runs: modes declared and kept, products offline at Income, Bugs added, costing revenue and cleaned, the Growth Hacker’s $3 and the final check', () => {
      const paths = [
        `${MODE_DECLARED}: Blue`, `${MODE_DECLARED}: Red`, `${MODE_DECLARED}: QA`, MODES_KEPT, MODE_FORGOTTEN,
        OFFLINE_AT_INCOME, EARNING_LESS, GROWTH_HACKER_EARNED,
        BUG_ON_PROJECT, BUG_ON_PRODUCT, CLEANED_ON_PROJECT, CLEANED_IN_OPS,
        SWITCHED_OFF_AT_THE_END,
      ];
      // Counted, but not required: a mode carried between teams, the clean button, a product switched on or brought back online at the
      // final check, and the Architect stopping a Growth Hacker's Bug. Only the one Growth Hacker brings Bugs to products in operation,
      // so two such products with Bugs at once are rare, and he seldom shares an ops team with the one Architect. A seat seldom comes to
      // the final check holding a product its last ops check switched off, and seldom then short (to switch it on) or able to run every
      // product (to bring it back). Examples pin each, and the arranged tests below pin the auto-player's clean and final check.
      // Held by one game each: a mode forgotten on a bench (3 players, seed 2, through the Pivot steer), a Bug cleaned in operations
      // by itself (5 players, seed 2) and a mode declared QA (2 players, seed 4). A failure here means a cadence moved: retune the
      // auto-player, never the rules.
      expect(paths.filter((key) => !(tally[key] > 0)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
    });

    it('plays the same game through the page’s view as without it (2 players, seed 1)', () => {
      const plain = playGame(2, 1, () => {});
      const viewed = playGame(2, 1, () => {}, { throughView: true });
      expect(plain.getState().result).toBeDefined();
      // Greenlights that asked choices, answered from the choices the view lists for the card and from the rules alike.
      const answering = plain.getLog().filter((move) => move.choices !== undefined);
      expect(answering.map((move) => move.type), 'the moves that answered choices').toContain(GREENLIGHT);
      expect(viewed.getLog()).toEqual(plain.getLog());
      expect(viewed.getState()).toEqual(plain.getState());
    }, 60_000);

    it('answers the cut a hybrid’s Greenlight asks with its first option through the page’s view and without it, and launches a project once its tracks hold its need (§19.A)', () => {
      // p0 runs a Life Sci product, so the Sleep Monitor (2 blue, 4 red) may be cut three ways; the Viral Video App was cut by 2 blue.
      const arranged = arrange({
        'operations-p0': [idOf('Health Tracker')],
        'backlog-p0': [idOf('Sleep Monitor')],
        'development-p0': [idOf('Viral Video App')],
      }).getState();
      const viral = idOf('Viral Video App');
      const tracks = { 'cut blue cubes': 2, 'blue cubes': 4 };
      const cut = { ...arranged, cards: arranged.cards.map((card) => (card.id === viral ? { ...card, data: { ...card.data, ...tracks } } : card)) };
      const logs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, cut);
        playTurn(engine, 1, 'researches', () => {}, (log) => log.some((move) => move.type === LAUNCH), runtime, throughView);
        return engine.getLog();
      });
      expect(logs[0][0]).toEqual({ type: GREENLIGHT, by: 'p0', cardId: idOf('Sleep Monitor'), choices: [null, null, 'Cut 2 blue'] });
      expect(logs[0].at(-1)).toEqual({ type: LAUNCH, by: 'p0', cardId: viral });
      expect(logs[1]).toEqual(logs[0]);
    });

    it('checks the salaries a seat pays at Income as the rules work them out: the Engineer costs $1 in the ops team (§20.B.1)', () => {
      const seats = seatsFor(2);
      const rules = keepsTheRules(seats, new LangRuntime(game!, lib, seats));
      const engine = arrange({ 'operations-p1': [idOf('Smart Lock')], 'ops-team-p1': [idOf('Engineer')] });
      play(engine, { type: END_ACTIONS, by: 'p0' }, rules);
      // The Engineer's Red runs the Smart Lock, so its $2 rev came in as p1 reached Income, and the $1 payroll keeps p1 there.
      expect(engine.getState().turn).toMatchObject({ current: 'p1', phase: 'income' });
      expect(counterOf(engine.getState(), 'capital', 'p1')).toBe(9);
      play(engine, { type: PAY_SALARIES, by: 'p1' }, rules);
      expect(counterOf(engine.getState(), 'capital', 'p1')).toBe(8);
    });

    it('lets go of the dearest staff by the salary the rules work out: the Engineer costs $1 in the ops team, so the Architect goes first (§20.B.1)', () => {
      const arranged = arrange({ 'operations-p1': [idOf('USB Gadget')], 'ops-team-p1': [idOf('Engineer'), idOf('Architect')] });
      const { engine, runtime } = createEngine(game!, lib, 2, arranged.getState());
      expect(engine.dispatch({ type: END_ACTIONS, by: 'p0' }).ok).toBe(true);
      expect(engine.getState().turn).toMatchObject({ current: 'p1', phase: 'income' });
      // On turn 5 the auto-player lets a card go at Income though it can pay, and on an odd turn it looks in the ops team first.
      playTurn(engine, 5, 'researches', () => {}, (log) => log.length >= 2, runtime, false);
      expect(engine.getLog()[1]).toEqual({ type: LET_GO['ops team'], by: 'p1', cardId: idOf('Architect') });
    });

    it('a refused press spends nothing', () => {
      const setup = setUp(2, 1);
      const start = setup.turn!.current;
      // With no capital the start player can pay for no agency card, though the hire's 1 action is theirs to spend.
      const { engine, runtime } = createEngine(game!, lib, 2, setCounter(setup, 'capital', start, 0));
      const state = engine.getState();
      expect(state.turn).toMatchObject({ current: start, phase: 'actions' });
      expect(counterOf(state, 'actions', start)).toBe(ACTIONS_EACH_TURN);
      expect(hasCost(buttonOf(state, HIRE_AGENCY)!)).toBe(true);
      const agency = zoneCards(state, 'agency-row');
      expect(agency).toHaveLength(4);

      const refusal = "they have at least the card's cost in capital";
      for (const card of agency) {
        expect(engine.canDispatch({ type: HIRE_AGENCY, by: start, cardId: card.id }), `hiring the ${nameOf(card)}`).toBe(refusal);
      }
      const button = seatExtras(engine, runtime, state, start).actions.find((action) => action.move === HIRE_AGENCY)!;
      expect(button.allowed).toBe(refusal);
      expect(button.cards!.cards.map((card) => card.allowed)).toEqual(agency.map(() => refusal));

      const outcome = engine.dispatch({ type: HIRE_AGENCY, by: start, cardId: agency[0].id });
      expect(outcome).toMatchObject({ ok: false, reason: refusal });
      expect(counterOf(engine.getState(), 'actions', start)).toBe(ACTIONS_EACH_TURN);
      expect(engine.getState()).toEqual(state);
    });

    it('takes back every move with undo, and rebuilds the game from its log, through recruits and research (3 players, seed 1)', () => {
      const states: GameState[] = [];
      const engine = playGame(3, 1, (_before, _move, after) => states.push(after), { moves: 40 });
      const log = [...engine.getLog()];
      expect(log).toHaveLength(40);
      expect(states).toHaveLength(40);
      // A recruit makes a Junior whose id comes from the state, and a research deals and keeps a card, so both must replay.
      expect(log.some((move) => RECRUITS.includes(move.type))).toBe(true);
      expect(log.some((move) => move.type === RESEARCH_SEED || move.type === RESEARCH_GROWTH)).toBe(true);

      const fresh = () => createEngine(game!, lib, 3, initialState(game!, 1)).engine;
      const replayed = fresh();
      replayed.loadLog(log);
      expect(replayed.getState()).toEqual(engine.getState());

      for (let i = states.length - 2; i >= 0; i--) {
        engine.undo();
        expect(engine.getState(), `after undoing back to move ${i + 1}`).toEqual(states[i]);
      }
      engine.undo();
      expect(engine.getState()).toEqual(fresh().getState());
    });

    it('takes back every move with undo, and rebuilds the game from its log, across an assign, a launch, a pivot and a reassign (Review Focus: 3 players, seed 1)', () => {
      const made = (log: readonly Move[], types: string[]) => log.some((move) => types.includes(move.type));
      // The brief asks for a launch or a pivot; the Review Focus names both, and the run that has both is still short.
      const board = (log: readonly Move[]) => made(log, [ASSIGN_TO_PROJECT, ASSIGN_TO_OPS]) && made(log, [LAUNCH]) && made(log, [PIVOT])
        && made(log, [REASSIGN_FROM_PROJECT, REASSIGN_FROM_OPS]);
      const states: GameState[] = [];
      const engine = playGame(3, 1, (_before, _move, after) => states.push(after), { until: board });
      const log = [...engine.getLog()];
      expect(board(log), `the moves made: ${[...new Set(log.map((move) => move.type))].join(', ')}`).toBe(true);
      expect(states).toHaveLength(log.length);
      // Staff sat on projects, tracks filled with cubes and reassigned staff were onboarding on the way, so undo has all three to give back.
      const some = (has: (card: CardState) => boolean) => states.some((state) => state.cards.some(has));
      expect(some((card) => typeof card.data?.[HOLDER_KEY] === 'string'), 'a card on a card').toBe(true);
      expect(some((card) => cubesOn(card, 'blue cubes') + cubesOn(card, 'red cubes') > 0), 'a project with cubes').toBe(true);
      expect(some((card) => card.data?.onboarding === true), 'an onboarding card').toBe(true);

      const fresh = () => createEngine(game!, lib, 3, initialState(game!, 1)).engine;
      const replayed = fresh();
      replayed.loadLog(log);
      expect(replayed.getState()).toEqual(engine.getState());

      for (let i = states.length - 2; i >= 0; i--) {
        engine.undo();
        expect(engine.getState(), `after undoing back to move ${i + 1}, ${log[i].type}`).toEqual(states[i]);
      }
      engine.undo();
      expect(engine.getState()).toEqual(fresh().getState());
    }, 120_000);

    it('takes back a Greenlight that asked a choice, and rebuilds it from its log, the payee included, whether the move named its answers or left them to be filled in (Review Focus: 4 players, seeds 1 to 5)', () => {
      const seats = seatsFor(4);
      const runtime = new LangRuntime(game!, lib, seats);
      /** A Greenlight that answered the choices its press asked; the auto-player names no choices for a press that asks none. */
      const answered = (move: Move) => move.type === GREENLIGHT && move.choices !== undefined;
      const seen = { payees: 0, among: 0, filledIn: 0 };
      for (let seed = 1; seed <= 5; seed++) {
        const where = `4 players, seed ${seed}`;
        const states: GameState[] = [];
        const engine = playGame(4, seed, (before) => states.push(before), { until: (log) => log.some(answered) });
        const log = [...engine.getLog()];
        // The run stops at the first such Greenlight, so one that stops short of it is a game whose seats never made one: it ended.
        if (!answered(log.at(-1)!)) {
          expect(engine.getState().result, `${where}: the game with no Greenlight that asked a choice`).toBeDefined();
          continue;
        }
        const [before, after, greenlight] = [states.at(-1)!, engine.getState(), log.at(-1)!];
        // Each payee gained a License for each Tag it was paid for, and the mover paid them all (§6, §14.B.2). The payees answer the
        // choices of a player the press asked; one only a single player qualifies for is that player, named or filled in.
        const license = gameNumber(before, game!, 'license');
        const asked = pressChoices(runtime, before, greenlight) as AskedChoice[];
        const payees = asked.filter(({ kind }) => kind === 'player').map(({ at, options }) => answersOf(greenlight)[at] ?? options[0]);
        const gained = (state: GameState) => seats.map((seat) => counterOf(state, 'capital', seat) - counterOf(before, 'capital', seat));
        const paid = seats.map((seat) => license * (payees.filter((payee) => payee === seat).length - (seat === greenlight.by ? payees.length : 0)));
        expect(gained(after), `${where}: capital gained by ${seats.join(', ')}`).toEqual(paid);

        const fresh = () => createEngine(game!, lib, 4, initialState(game!, seed)).engine;
        const replayed = fresh();
        replayed.loadLog(log);
        expect(replayed.getState(), `${where}: the game rebuilt from its log`).toEqual(after);
        // A press whose every choice has one answer is filled in the same when the move names none, as the page sends it until 3-2.
        const among = asked.some(({ options }) => options.length > 1);
        if (!among) {
          const { choices: _named, ...unnamed } = greenlight;
          const filledIn = fresh();
          filledIn.loadLog([...log.slice(0, -1), unnamed]);
          expect(filledIn.getState(), `${where}: the game rebuilt with the Greenlight's answers filled in`).toEqual(after);
        }

        engine.undo();
        expect(engine.getState(), `${where}: the game with the Greenlight taken back`).toEqual(before);
        expect(gained(engine.getState()), `${where}: capital after the Greenlight is taken back`).toEqual(seats.map(() => 0));
        seen.payees += payees.length;
        seen.among += among ? 1 : 0;
        seen.filledIn += among ? 0 : 1;
      }
      // Some Greenlight paid a License, some chose among several answers, and some had every answer filled in.
      expect(Object.entries(seen).filter(([, times]) => times === 0), JSON.stringify(seen)).toEqual([]);
    }, 120_000);

    it('Review Focus: cleans no more Bugs than its QA when one product is left with Bugs partway through the step (R3)', () => {
      const start = setUp(2, 1);
      const seats = seatsFor(2);
      const S = startPlayerOf(start, seats);
      const O = seats.find((seat) => seat !== S)!;
      const [dating, wallet] = ['Dating App', 'Mobile Wallet'].map(idOf);
      const testers = seats.map((seat) => zoneCards(start, `bench-${seat}`).find((card) => nameOf(card) === 'Junior QA Tester')!.id);
      /** S's products with their Bugs, and both seats' Junior QA Testers in `testersTo`. */
      const arranged = (testersTo: string) => {
        let state = relocate(start, [dating, wallet], `operations-${S}`, game!);
        state = changeCard(state, dating, { bugs: 1 }, game!);
        state = changeCard(state, wallet, { bugs: 2 }, game!);
        return createEngine(game!, lib, 2, relocate(state, testers, testersTo, game!)).engine;
      };
      const bugs = (engine: GameEngine, id: string, kind = 'bugs') => cubesOn(cardById(engine.getState(), id)!, kind);
      const keeps = () => keepsTheRules(seats, new LangRuntime(game!, lib, seats));

      // Two QA for three Bugs on two products: the Engine waits for S to say which Bugs go.
      const engine = arranged(`ops-team-${S}`);
      const rules = keeps();
      play(engine, { type: END_ACTIONS, by: S }, rules);
      expect(engine.getState().turn).toMatchObject({ current: S, phase: 'engine' });
      // Now one product alone has Bugs, no more than the whole QA, but only as the step starts do the rules clean Bugs on their own:
      // here that would clean 2 Bugs with 1 QA left.
      play(engine, { type: CLEAN, by: S, cardId: dating }, rules);
      expect(engine.getState().turn).toMatchObject({ current: S, phase: 'engine' });
      expect(bugs(engine, wallet)).toBe(2);
      expect(bugs(engine, dating, 'fixed bugs')).toBe(1);
      // The second press spends the QA, and the step ends.
      const beforeLast = engine.getState();
      play(engine, { type: CLEAN, by: S, cardId: wallet }, rules);
      expect(engine.getState().turn?.current).toBe(O);
      expect(bugs(engine, wallet)).toBe(1);
      expect(engine.getState().cards.filter((card) => cubesOn(card, 'fixed bugs') !== 0)).toEqual([]);
      // The two presses rebuild from the log, and taking the last back leaves the Engine waiting on the second.
      const replayed = arranged(`ops-team-${S}`);
      replayed.loadLog([...engine.getLog()]);
      expect(replayed.getState()).toEqual(engine.getState());
      engine.undo();
      expect(engine.getState()).toEqual(beforeLast);

      // With no QA in the ops team and Bugs on two products, the Engine goes straight on.
      const benched = arranged(`bench-${S}`);
      play(benched, { type: END_ACTIONS, by: S }, keeps());
      expect(benched.getState().turn?.current).toBe(O);
      expect([bugs(benched, dating), bugs(benched, wallet)]).toEqual([1, 2]);
    });

    it('cleans the Bug the auto-player picks when ops QA can’t clean them all, through the page’s view and without it (R3)', () => {
      const [dating, gateway, fixer] = ['Dating App', 'Payment Gateway', 'Fixer'].map(idOf);
      let state = arrange({ 'operations-p0': [dating, gateway], 'ops-team-p0': [fixer] }).getState();
      state = changeCard(state, dating, { bugs: 1, offline: true }, game!);
      state = changeCard(state, gateway, { bugs: 1 }, game!);
      state = setCounter(changeCard(state, fixer, { 'qa mode': true }, game!), 'actions', 'p0', 1);
      // The Fixer in QA mode cleans 1 of the 2 Bugs: on turn t the seat cleans the product at t % 2 among the two with Bugs.
      for (const [t, cleaned] of [[0, dating], [1, gateway]] as const) {
        const logs = [false, true].map((throughView) => {
          const { engine, runtime } = createEngine(game!, lib, 2, state);
          playTurn(engine, t, 'researches', () => {}, (log) => log.some((move) => move.type === CLEAN), runtime, throughView);
          return engine.getLog();
        });
        expect(logs[0].at(-1), `turn ${t}`).toEqual({ type: CLEAN, by: 'p0', cardId: cleaned });
        expect(logs[1], `turn ${t}`).toEqual(logs[0]);
      }
    });

    it('plays the final check for a seat short of bandwidth, switching products off until the rest fit, and scores only those online (§12)', () => {
      const [neobank, dating, viral, wallet, gateway] =
        ['Neobank', 'Dating App', 'Viral Video App', 'Mobile Wallet', 'Payment Gateway'].map(idOf);
      let state = arrange({
        'crash-pile': [idOf('Market Crash')],
        'operations-p0': [neobank, dating, viral, wallet, gateway],
        'ops-team-p0': [idOf('Architect')],
      }).getState();
      // Each product needs 1 Blue (§20.C) and the Architect gives 3 (§20.B.1). With the Neobank offline the other 4 still need 4, so
      // the last round ends with p0 short.
      state = setCounter(changeCard(state, neobank, { offline: true }, game!), 'actions', 'p0', 1);
      const seats = seatsFor(2);
      const { engine, runtime } = createEngine(game!, lib, 2, state);
      const rules = keepsTheRules(seats, runtime);
      const checked: Move[] = [];
      const watch: Watch = (before, move, after) => {
        rules(before, move, after);
        if (before.turn?.phase === FINAL_CHECK) checked.push(move);
      };
      // p0's last turn, p1's, then each step of the final check as a turn of its own: on t = 3, p0's, it first switches on the
      // offline product with the highest val.
      for (let t = 1; t < 10 && engine.getState().result === undefined; t++) {
        playTurn(engine, t, 'researches', watch, () => false, runtime, false);
      }
      const end = engine.getState();
      expect(end.result).toBeDefined();
      expect(checked).toEqual([
        { type: SWITCH_ON, by: 'p0', cardId: neobank },
        { type: SWITCH_OFF, by: 'p0', cardId: wallet },
        { type: SWITCH_OFF, by: 'p0', cardId: gateway },
      ]);
      const offline = (id: string) => cardById(end, id)!.data?.offline === true;
      expect([neobank, dating, viral].map(offline)).toEqual([false, false, false]);
      expect([wallet, gateway].map(offline)).toEqual([true, true]);
      const { scores } = end.result as { scores: Record<string, number> };
      expect(scores).toEqual(Object.fromEntries(seats.map((seat) => [seat, scoreOf(end, seat)])));
    });

    it('reassigns the Growth Hacker from its product to the seat’s other product once on a turn when t % 4 is 1, through the page’s view and without it (§6, §20.B)', () => {
      // The long runs seldom see a seat with two products while its Growth Hacker sits on one, so this arranges it: the Architect
      // runs both products and stops the Growth Hacker's Bug.
      const [dating, todo, growthHacker] = ['Dating App', 'To-Do List', 'Growth Hacker'].map(idOf);
      const arranged = arrange({ 'operations-p0': [dating, todo], 'ops-team-p0': [idOf('Architect')] }).getState();
      const state = putOn(arranged, [growthHacker], 'ops-team-p0', dating, game!);
      const seats = seatsFor(2);
      for (const t of [0, 1, 4, 5]) {
        const logs = [false, true].map((throughView) => {
          const { engine, runtime } = createEngine(game!, lib, 2, state);
          playTurn(engine, t, 'researches', keepsTheRules(seats, runtime), () => false, runtime, throughView);
          return engine.getLog();
        });
        const reassigns = logs[0].filter((move) => move.type === REASSIGN_TO_PRODUCT);
        const onto = { type: REASSIGN_TO_PRODUCT, by: 'p0', cardId: growthHacker, onto: todo };
        expect(reassigns, `turn ${t}`).toEqual(t % 4 === 1 ? [onto] : []);
        expect(logs[1], `turn ${t}`).toEqual(logs[0]);
      }
    });

    it('takes back the last move and rebuilds whole games from their logs, through declarations, Bugs and the final check (Review Focus: 2 players, seeds 1 to 5)', () => {
      const seats = seatsFor(2);
      const runtime = new LangRuntime(game!, lib, seats);
      const seen = { declarations: 0, 'switches off': 0, 'Bugs added to a project': 0 };
      for (let seed = 1; seed <= 5; seed++) {
        const where = `2 players, seed ${seed}`;
        const states: GameState[] = [];
        const engine = playGame(2, seed, (before, move, after) => {
          states.push(before);
          if (Object.values(DECLARE).includes(move.type)) seen.declarations += 1;
          if (move.type === SWITCH_OFF) seen['switches off'] += 1;
          seen['Bugs added to a project'] += happenings(runtime, before, move, after).filter((key) => key === BUG_ON_PROJECT).length;
        });
        const log = [...engine.getLog()];
        const end = engine.getState();
        expect(end.result, `${where}: the result`).toBeDefined();
        expect(states).toHaveLength(log.length);

        const replayed = createEngine(game!, lib, 2, initialState(game!, seed)).engine;
        replayed.loadLog(log);
        expect(replayed.getState(), `${where}: the game rebuilt from its log`).toEqual(end);
        engine.undo();
        expect(engine.getState(), `${where}: the game with its last move, ${log.at(-1)!.type}, taken back`).toEqual(states.at(-1));
      }
      // Some log declared a mode, switched a product off and added a Bug to a project, so the replays rebuilt each of them. The Bug
      // is in seed 1 only, through `hireHacker`, and a final-check switch-off is the last move taken back in seed 3 only. No log holds
      // a clean press, so the R3 Review Focus test above replays one.
      expect(Object.entries(seen).filter(([, times]) => times === 0), JSON.stringify(seen)).toEqual([]);
    }, 120_000);
  });
});

describe('what the view says the rules work out', () => {
  it('stands each need in for its cost, each bandwidth for its output and the portfolio points for the val, and shows Stalled and Efficient in ops, the flags that change a value', () => {
    expect(standIns(game!)).toEqual({
      'blue output': 'blue bandwidth', 'red output': 'red bandwidth', 'blue cost': 'blue need', 'red cost': 'red need',
      val: 'portfolio points',
    });
    // Every line of each reads only the card and the cards on it: its Tier, its need, the leads on it, its trait and its zone.
    expect(shownFlags(game!)).toEqual(['stalled', 'efficient in ops']);
  });

  it('gives a seat the needs and the flags of the cards on a Board, and nothing of a backlog (Review Focus: 3 players, seed 1)', () => {
    const start = setUp(3, 1);
    const seats = seatsFor(3);
    const S = startPlayerOf(start, seats);
    const O = seats.find((seat) => seat !== S)!;
    const [neobank, viral, search, engineer, streaming] = ['Neobank', 'Viral Video App', 'Search Engine', 'Engineer', 'Streaming Service'].map(idOf);
    let state = relocate(start, [neobank, viral], `development-${S}`, game!);
    state = changeCard(state, viral, { 'cut blue cubes': 2 }, game!);
    state = relocate(state, [search], `operations-${S}`, game!);
    state = relocate(state, [engineer], `ops-team-${S}`, game!);
    state = relocate(state, [streaming], `backlog-${O}`, game!);
    const { engine, runtime } = createEngine(game!, lib, 3, state);
    expect(seatExtras(engine, runtime, engine.getState(), O).worked).toEqual({
      [neobank]: { columns: { 'blue cost': 10, 'red cost': 0, val: 10 }, flags: ['stalled'] },
      [viral]: { columns: { 'blue cost': 4, 'red cost': 0, val: 3 }, flags: [] },
      // A Launched product, so never Stalled: before Stalled's zone line it read ['stalled'].
      [search]: { columns: { 'blue cost': 12, 'red cost': 0, val: 8 }, flags: [] },
      [engineer]: { columns: {}, flags: ['efficient in ops'] },
    });
  });
});

describe('what the view says about each player', () => {
  it('shows the values that add up cards everyone sees, gauges each color’s bandwidth against the maintenance it runs, and fades a product switched off', () => {
    expect(shownPlayerValues(game!)).toEqual([
      'blue supply', 'red supply', 'blue demand', 'red demand', 'blue load', 'red load', 'qa supply', 'bug load', 'qa spent',
    ]);
    // Bugged products is not there: it reads the bug mark, which reads Bugged, whose “its bugs are more than 0” the view doesn't count as
    // reading only the card (G1).
    // The ops check's confirm waits on both colors' supply reaching their demand (§5 Phase B); the phase's “When …” lines press no button.
    expect(gaugePairs(game!)).toEqual([['blue supply', 'blue demand'], ['red supply', 'red demand']]);
    // Demand leaves out a product switched off.
    expect(dimFlags(game!)).toEqual(['offline']);
  });

  it('gives every seat the same values of each player, which follow a declared mode, a product switched off and its Bugs (3 players, seed 1)', () => {
    // The Firmware Specialist is flex with output 2, so Blue until declared Red (§20.B); the Dating App's maintenance is 1 Blue and 0
    // Red, and the Smart Lock's 0 Blue and 1 Red (§20.C).
    const start = setUp(3, 1);
    const seats = seatsFor(3);
    const S = startPlayerOf(start, seats);
    const N = seats[(seats.indexOf(S) + 1) % seats.length];
    const [dating, lock, firmware] = ['Dating App', 'Smart Lock', 'Firmware Specialist'].map(idOf);
    const state = relocate(relocate(start, [dating, lock], `operations-${N}`, game!), [firmware], `ops-team-${N}`, game!);
    /** What each seat is given of N's values in `table`. */
    const valuesOfN = (table: GameState) => {
      const { engine, runtime } = createEngine(game!, lib, 3, table);
      return seats.map((viewer) => seatExtras(engine, runtime, engine.getState(), viewer).playerValues![N]);
    };
    const values = {
      'blue supply': 2, 'red supply': 0, 'blue demand': 1, 'red demand': 1, 'blue load': 1, 'red load': 1, 'qa supply': 0, 'bug load': 0,
      'qa spent': 0,
    };
    expect(valuesOfN(state)).toEqual(seats.map(() => values));
    // Declared Red, it runs no Blue; switched off, the Dating App asks for none, though its maintenance stays in the load.
    const switched = changeCard(changeCard(state, firmware, { 'red mode': true }, game!), dating, { offline: true }, game!);
    const declared = {
      'blue supply': 0, 'red supply': 2, 'blue demand': 0, 'red demand': 1, 'blue load': 1, 'red load': 1, 'qa supply': 0, 'bug load': 0,
      'qa spent': 0,
    };
    expect(valuesOfN(switched)).toEqual(seats.map(() => declared));
    expect(valuesOfN(changeCard(switched, lock, { bugs: 2 }, game!)).map((theirs) => theirs['bug load'])).toEqual([2, 2, 2]);
  });
});
