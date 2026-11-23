import { describe, expect, it } from 'vitest';
import STARTUP_SIMULATOR from './startup-simulator.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { runExamples } from '@/engine/core/lang/examples';
import { createEngine, initialState, seatsFor, tableDefFor } from '@/engine/core/lang/build';
import { COUNTERS_KEY, counterOf, gameNumber, playerFact, setCounter } from '@/engine/core/lang/board-state';
import { seatExtras, type CardPickView, type SeatExtras } from '@/engine/core/lang/board-view';
import { attachmentProblem, cardsOn, putOn } from '@/engine/core/lang/attach';
import { deckOf, NEXT_CARD_KEY } from '@/engine/core/lang/cards';
import { cardCandidates, hasCost, ontoCandidates, pressChoices } from '@/engine/core/lang/declared-actions';
import { moveZoneId } from '@/engine/core/lang/declared-moves';
import { CHOOSE_ONE, CHOOSE_PLAYER, choicesOf, type AskedChoice, type ChoiceOption } from '@/engine/core/lang/choices';
import { RuleError } from '@/engine/core/lang/diagnostics';
import { LangRuntime } from '@/engine/core/lang/runtime';
import type { ZoneRef } from '@/engine/core/lang/types';
import { markTurnStarted, ROUND_KEY, ROUND_STEPS_KEY, roundStepsOf, START_PLAYER_KEY, startPlayerOf, TURN_OF_KEY } from '@/engine/core/lang/turns';
import { HOLDER_KEY, relocate, zoneIdFor, zoneInfo } from '@/engine/core/lang/zones';
import { HIDDEN_FACE_KEY, deriveScene } from '@/engine/core/derive-scene';
import type { GameState } from '@/engine/core/game-state';
import { cardById, zoneCards } from '@/engine/core/lang/zone-index';
import type { GameEngine } from '@/engine/core/game-engine';
import type { Move } from '@/engine/core/moves';
import type { CardState, PlayerId } from '@/engine/core/scene';
import { changeCard } from '@/engine/core/lang/card-facts';
import { dimFlags, gaugePairs, shownFlags, shownPlayerValues, standIns } from '@/engine/core/lang/worked-view';
import { holderFlags, pressFlags } from '@/engine/core/lang/worked-view';
import { parseTextFaceKey } from '@/engine/core/lang/cards';
import { inPlayZones } from '@/engine/core/lang/worked-view';

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
/**
 * Brainstorm (§6, §15.C): for 1 action a seat draws 2 Strategy cards, 3 with a PM managing on its Board, into its brainstorm row and
 * keeps 1 in its Strategy Hand, the rest going to the strategy discard; the flush first discards cards it picks from its Strategy
 * Hand. The strategy cleanup discards the Strategy Hand down to 3 (§5 Phase D step 7, ruling 10).
 */
const BRAINSTORM = 'brainstorm';
const BRAINSTORM_FLUSHING = 'brainstorm after flushing some cards from their strategy hand';
const KEEP_STRATEGY = 'keep a card in their brainstorm';
const DISCARD_STRATEGY = 'discard a card in their strategy hand';
/**
 * Whether a Strategy card's kind is Training (§20.A). The runs play the Attributes and two Utility cards too (see `isPlayable`), and a
 * Buff through the Training button, so the checks of a Training press ask this of the card played.
 */
const isTraining = (card: CardState) => card.data?.kind === 'Training';
/** The Strategy deck, by name: 30 cards (§20.A). */
const STRATEGY_CARDS: Record<string, number> = {
  'Full Stack Bootcamp': 2, 'QA Certification': 2, 'Sales Seminar': 2, 'Leadership Masterclass': 1, 'Agile Workshop': 1, Headhunter: 4,
  'Corporate Raider': 2, 'Hit Piece': 2, 'Non-Compete Suit': 2, Workaholic: 1, 'Clean Coder': 1, Visionary: 1, 'Toxic Personality': 1,
  Burnout: 1, 'Flight Risk': 1, 'TechCrunch Feature': 2, 'Design Sprint': 2, 'Cease & Desist': 2,
};
/**
 * The 6 Milestones, one card each: Setup reveals 3 in the milestone row and returns the rest to the box, and the first player to meet a
 * revealed one claims it into their milestones row for good (§4.3, §12.5, §20.G).
 */
const MILESTONES = ['First Mover Advantage', 'Talent Magnet', 'Platform Power', 'Revenue Leader', 'Clean Launch', 'Full Stack Founder'];
/** The 18 Events of §20.D, in its order. */
const EVENTS = [
  'Venture Capital Rain', 'Tech Bubble', 'Patent Trolls', 'Angel Investors', 'Legacy Code', 'Regulation Audit', 'Open Source Boom',
  'Hardware Hackathon', 'Chip Shortage', 'Crunch Time', 'Server Crash', 'Supply Chain Logjam', 'Recruiter Frenzy', 'Intern Season',
  'Headhunter Holiday', 'Online Course Boom', 'Whistleblower Protection Act', 'Trade Show',
] as const;
/** The three zones the Events move between (§15.D). */
const EVENT_ZONES = ['event-deck', 'event-in-play', 'event-discard'];
/** The values the outputs check reads of each Board card, the Blue and Red outputs first (see `keepsTheRules`). */
const OUTPUT_NAMES = ['blue output', 'red output', 'qa output', 'blue bandwidth'] as const;
/** The name of the Event in play, or null before the first Round Start (§5 Phase A). */
const eventOf = (state: GameState): string | null => {
  const card = zoneCards(state, 'event-in-play')[0];
  return card === undefined ? null : (nameOf(card) as string);
};
/**
 * Training (§6 Play Strategy Card, §20.A): for its printed price and no action, a seat plays a Training card from its Strategy Hand
 * onto an employee it fits, which gains a Skill token, Training XP or a Badge, and the card goes to the strategy discard.
 */
const PLAY_TRAINING = 'play a card from their strategy hand to a card in their bench, their development team or their ops team';
/** The rows a Training card's target is picked in, in the order the button names them (§20.A: Bench or Board). */
const TRAINING_TARGETS = ['bench', 'development team', 'ops team'];
const PLAY_DEBUFF = "play a card from their strategy hand to a card in another player's development team or another player's ops team";
/** Each Attribute card by name, with the count it puts on a Talent (§20.A, the slice's R2). */
const ATTRIBUTES: Record<string, string> = {
  Workaholic: 'workaholic', 'Clean Coder': 'clean coder', Visionary: 'visionary',
  'Toxic Personality': 'toxic personality', Burnout: 'burnout', 'Flight Risk': 'flight risk',
};
const BUFFS = ['Workaholic', 'Clean Coder', 'Visionary'];
const DEBUFFS = ['Toxic Personality', 'Burnout', 'Flight Risk'];
/** A Strategy card a button of slices 5 and 6 plays: Training, an Attribute, TechCrunch Feature or Design Sprint (§20.A). */
const isPlayable = (card: CardState): boolean =>
  isTraining(card) || card.data?.kind === 'Attribute' || ['TechCrunch Feature', 'Design Sprint'].includes(nameOf(card) as string);
/** The zones a Debuff's target is offered in for `by`, as 6-1 orders them: each other seat's development team from `by`'s left, then each one's ops team. */
const debuffZones = (seats: PlayerId[], by: PlayerId): string[] => {
  const at = seats.indexOf(by);
  const others = [...seats.slice(at + 1), ...seats.slice(0, at)];
  return [...others.map((seat) => zoneIdFor('development team', seat)), ...others.map((seat) => zoneIdFor('ops team', seat))];
};
/** What a project's team makes once Toxic Personality's cube is off, and what each ops-team card adds to its owner's supplies (R1). */
const MADE = ['blue made', 'red made', 'qa made'] as const;
const POOL = ['pool blue', 'pool red', 'pool qa'] as const;
/** What a project's team makes before Toxic Personality's cube comes off, Synergy included (R1). */
const TEAM = ['blue team output', 'red team output', 'qa team output'] as const;
/**
 * What is wrong with the cube Toxic Personality took off `what`, a team or an ops team's pool, as messages (R1). `made` is what it
 * makes before the cube, in Blue, Red and QA, and `left` what it makes once the cube is off; `working` says its Toxic card is not
 * onboarding. Each colour keeps what it made or 1 less, never below 0; a working Toxic card takes exactly 1 cube in all when some
 * colour is made, and none otherwise; and the cube comes off the first of Blue, Red and QA that is made. The deck holds one Toxic
 * Personality (§20.A), so one card at most holds the count, and the team or pool loses 1 cube at most.
 */
function toxicCube(what: string, made: readonly number[], left: readonly number[], working: boolean): string[] {
  const colours = ['Blue', 'Red', 'QA'];
  const wrong = made.flatMap((value, i) => (left[i] < 0 || left[i] > value
    ? [`${what} keeps ${left[i]} ${colours[i]} of the ${value} it makes, expected ${value} or ${value - 1} and never below 0`] : []));
  const first = made.findIndex((value) => value > 0);
  const expected = working && first >= 0 ? 1 : 0;
  const lost = made.reduce((total, value, i) => total + value - left[i], 0);
  if (lost !== expected) {
    const why = !working ? 'its Toxic card is onboarding'
      : first < 0 ? 'it makes nothing' : 'its Toxic card works and it makes some colour';
    wrong.push(`${what} loses ${lost} cubes in all, expected ${expected}, as ${why}`);
  } else if (expected === 1 && made[first] - left[first] !== 1) {
    const off = colours.filter((_, i) => left[i] < made[i]).join(', ');
    wrong.push(`${what} loses its cube off ${off}, expected off ${colours[first]}, the first of Blue, Red and QA it makes`);
  }
  return wrong;
}
const PLAY_TO_PRODUCT = 'play a card from their strategy hand to a card in their operations';
const PLAY_ALONE = 'play a card in their strategy hand';
/** What a TechCrunch Feature on `product` costs: the lower of the card's worked price and the product's, a side without one left out (§20.A). */
const techCrunchPrice = (runtime: LangRuntime, state: GameState, cardId: string, productId: string): number =>
  Math.min(...[runtime.workedValue(state, cardId, 'price'), runtime.workedValue(state, productId, 'price')].filter((p): p is number => typeof p === 'number'));
/** The Attribute counts a card holds. */
/** The Attributes' counts, in `ATTRIBUTES` order, read once: the checks after every move go through them for every card. */
const ATTRIBUTE_COUNTS = Object.values(ATTRIBUTES);
const attributesOn = (card: CardState) => ATTRIBUTE_COUNTS.filter((count) => tokenOn(card, count) > 0);
/** The rows that keep only their 5 newest cards, letting the oldest go to the box. */
const POOLS = ['open-job-market', 'open-idea-pool'];
/** The rows each player has that only they can see: their hands, the rows a step deals into, and the Brainstorm look (§3, §15.C). */
const OWN_ROWS = ['bench', 'backlog', 'research', 'scouting', 'strategy hand', 'brainstorm'];
/** The rows of each player's Board, which everyone can see: projects, products in operation, the staff on projects and the ops staff (§3). */
const BOARD_ROWS = ['development', 'operations', 'development team', 'ops team'];
/**
 * The final check before the score: after the last round each player in turn from the start player switches products off, or back on,
 * until those still online fit their ops team's bandwidth (§12, ruling 25). Only the End's steps reach it, and its moves are no turn.
 */
const FINAL_CHECK = 'final check';
/**
 * The phases of a turn, in order (§5): the declaration of modes and the ops check that open Income (§5 Phase B, §11.C.2), Income,
 * Actions with its four interrupts, the Engine's Generate and Commit, and Cleanup, which enforces the Bench, the Strategy Hand and then
 * the Backlog (§5 Phase D step 7, ruling 10); then the final check, which only the End's steps reach (§12).
 */
const PHASES = [
  'modes', 'ops check', 'income', 'actions', 'research', 'sourcing', 'graduation', 'brainstorm', 'engine', 'commit', 'bench cleanup',
  'strategy cleanup', 'backlog cleanup', FINAL_CHECK, 'event check',
];
/** The step each player takes in turn from the start player as Angel Investors or Regulation Audit is revealed (§5 Phase A, §20.D). */
const EVENT_CHECK = 'event check';
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
/**
 * The modes a declaration of Red or QA leaves on a card as a flag (§11.C.2). A declaration of Blue leaves neither: a card that works Blue
 * natively needs no flag, and a Junior with a blue Skill token takes `BLUE_MODE` instead (ruling 24).
 */
const MODES = ['red mode', 'qa mode'];
/**
 * The modes each answer of a declaration leaves its card in, and no other (§11.C.2): Blue none of them, but for a Junior with a blue Skill
 * token, which it leaves in `BLUE_MODE` alone.
 */
const MODES_DECLARED: Record<string, string[]> = { Blue: [], Red: ['red mode'], QA: ['qa mode'] };
/** The mode a declaration of Blue leaves on a Junior with a blue Skill token, which works Blue only so (§11.C.2, ruling 24). */
const BLUE_MODE = 'blue mode';
/**
 * The counts slice 5 puts on staff (§3, §11): Permanent XP and Skill tokens of each colour, a Specialist's Training XP, and the Pending
 * tokens a Junior learns on a project.
 */
const TOKENS = [
  'blue xp tokens', 'red xp tokens', 'green xp tokens', 'training xp', 'blue skill tokens', 'red skill tokens', 'green skill tokens',
  'pending blue', 'pending red', 'pending green',
] as const;
/** The tokens only a Junior holds: Permanent XP and Skill tokens, of each colour (§3, §11.A). */
const JUNIOR_TOKENS = TOKENS.filter((name) => name.endsWith(' tokens'));
/** The Pending tokens a Junior learns on a project, one of each colour at most (§11.B, ruling 1). */
const PENDING = ['pending blue', 'pending red', 'pending green'] as const;
/** Each track's colour with the names of its cubes and its cut, made once for the checks after every move. */
const TRACK_KEYS = [['blue', 'blue cubes', 'cut blue cubes'], ['red', 'red cubes', 'cut red cubes']] as const;
/** The counts the Engine leaves on a card while its owner's turn is in it (§5 Phase D, R3). */
const ENGINE_COUNTS = ['new blue cubes', 'new red cubes', 'fixed bugs'];
/** The Skill token in the colour each skill works in already, which no card of that skill holds (§11.A.1). */
const NATIVE_SKILL: Record<string, string> = { software: 'blue skill tokens', hardware: 'red skill tokens', qa: 'green skill tokens' };
/** The traits of the only Specialists that earn Training XP, 2 at most: the QA Engineer's and the Sales Rep's (§11.D). */
const TRAINED = ['Bug Hunter', 'Rainmaker'];
/**
 * The step a Launch interrupts Actions with while a Junior of the launched team has a choice to make: which of its Pending tokens it
 * keeps, and which one more the Veteran's Mentor makes Permanent (§11.B.2, §20.B, ruling 25).
 */
const GRADUATION = 'graduation';
/** The buttons that keep one Pending token Permanent, by its colour (§11.B.2). */
const KEEP_PENDING: Record<'blue' | 'red' | 'green', string> = {
  blue: 'keep blue on a card in their ops team',
  red: 'keep red on a card in their ops team',
  green: 'keep green on a card in their ops team',
};
/** The button of the Veteran's Mentor: one Junior that kept a token keeps a second, of a colour its owner picks (§20.B, ruling 25). */
const MENTOR = 'mentor a card in their ops team';
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
 * The flag a seat holds while it chooses which of its products run: from the start of its ops check, or of its step of the final check,
 * until it confirms or the check passes. Platform Power and Full Stack Founder wait on it, so that neither is claimed from products
 * that check brought back online before the player switches some off (§5 Phase B, §12, R1).
 */
const CHOOSING = 'choosing offline products';
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
/**
 * The buttons that fire staff from the Board to the open job market, where they lose their tokens (§5, §18.B): a dismiss from a project
 * or from the ops team, and a let-go at Income of staff whose salary won't be paid.
 */
const FIRES = [DISMISS_FROM_PROJECT, DISMISS_FROM_OPS, ...Object.values(LET_GO)];
/** Sourcing's hire to the ops team (§13.B), which an arranged test below makes, since no accepted example presses it. */
const HIRE_SCOUTED_TO_OPS = 'hire some cards from their scouting to their ops team';
/** Sourcing's hires (§13.B): the cards a Layoff found, at their printed cost, to the bench, the ops team, a project or a product. */
const SOURCE_HIRES = [
  'hire some cards from their scouting to their bench',
  HIRE_SCOUTED_TO_OPS,
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
  'strategy cleanup': { row: 'strategy hand', discard: DISCARD_STRATEGY },
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
 * The phases of a seat's turn before its Engine runs: the declaration of modes, the ops check, Income, Actions and the four phases
 * that interrupt Actions.
 */
const BEFORE_THE_ENGINE = ['modes', 'ops check', 'income', 'actions', 'research', 'sourcing', 'graduation', 'brainstorm'];
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
// What the tally calls the paths of slice 5 (see `happenings`), besides the moves themselves.
/** A Pending token a card gained, by its colour: `a Pending token gained: blue` (§11.B, ruling 1). */
const PENDING_GAINED = 'a Pending token gained';
const GRADUATED = 'a Junior graduated with no press';
const KEPT_BY_CHOICE = 'a token kept by choice';
const MENTORS_SECOND = "the Mentor's second token";
const PIVOT_RETURNED = 'Pending tokens returned by a pivot';
const STRIPPED = 'tokens stripped from fired staff';
const EXPERIENCED_PAID = 'an experienced Junior paid';
const SYNERGY = 'Synergy at the Engine';
const AGILE_SPARED = 'an onboarding token spared by an Agile PM';
const PROMOTED = 'a Junior PM promoted at a Launch';
const SALES_BONUS = "a Sales Rep's bonus earned";
const QA_ENGINEER_CLEANED = 'a Bug cleaned by a QA Engineer';
/** A Brainstorm, plain or flushing, by how many cards it drew: `a brainstorm drawing 3` (§6, §15.C). */
const BRAINSTORM_DRAWING = 'a brainstorm drawing';
const KEPT_AT_ONCE = 'a single strategy card kept at once';
const RESHUFFLED = 'the strategy discard shuffled into the deck';
const DISCARDED_AT_CLEANUP = 'a strategy card discarded at cleanup';
/** A Training card played, by its name and the kind of its target: `Training: QA Certification on a QA Engineer` (§20.A). */
const TRAINING_ON = 'Training';
/** A declaration of a Junior with a Skill token, by the colour its answer names when that is not the Junior's own (§11.A, §11.C.2). */
const TRAINED_DECLARED = 'a trained Junior declared';
const BADGED_LEADING = 'a badged Junior leading at the Engine';
const DECAY_STOPPED = 'Bug Decay stopped by a QA Engineer';
const DECAY_WAIVED = 'Bug Decay waived by a VP of Sales';
const SALES_XP_BONUS = "a Sales Rep's XP bonus";
/** A Milestone that entered a milestones row, by its name: `a milestone claimed: Clean Launch` (§12.5, §20.G). */
const CLAIMED = 'a milestone claimed';
const CLAIMED_AT_THE_LAST_CHECK = 'a milestone claimed at the last check';
/** An Attribute played on a Talent, by its card's name: `an Attribute played: Burnout` (§20.A, the slice's R2). */
const ATTRIBUTE_PLAYED = 'an Attribute played';
/** Plan 6-2a's other happenings, read through the runtime: see `happenings`. */
const BUFF_ON_BENCH = 'a Buff on a bench card';
const BUFF_ON_BOARD = 'a Buff on a Board card';
const DEBUFF_ON_DEV = 'a Debuff on a development team card';
const DEBUFF_ON_OPS = 'a Debuff on an ops team card';
const ATTRIBUTES_FIRED = 'Attributes discarded with a fired Talent';
const ATTRIBUTES_KEPT = 'Attributes kept through a bench discard';
const ATTRIBUTES_REHIRED = 'Attributes rehired';
const ATTRIBUTES_BOXED = 'Attributes boxed with an evicted Talent';
const WORKAHOLIC_AT_ENGINE = "a Workaholic's +2 at the Engine";
const CLEAN_CODER_HACKER = "Clean Coder stopping the Hacker's Bug";
const CLEAN_CODER_VIRAL = 'Clean Coder shielding a viral product';
const VISIONARY_LEADING = 'a Visionary leading';
const TOXIC_BLUE = 'Toxic: a Blue cube taken';
const TOXIC_RED = 'Toxic: a Red cube taken';
const TOXIC_QA = 'Toxic: a Bug left';
const TOXIC_OPS = 'Toxic in the ops team';
const BURNOUT_IDLE = 'Burnout: a unit idle';
const BURNOUT_PM = 'Burnout: a PM giving no Synergy';
const TECHCRUNCH_5 = 'TechCrunch for $5';
const TECHCRUNCH_2 = 'TechCrunch for $2 with a Sales Rep';
const HYPE_SCORED = 'Hype scored';
const SPRINT_5 = 'Design Sprint dealing 5';
const SPRINT_FEWER = 'Design Sprint dealing fewer';
/** Plan 6-2b's keys: each Event revealed, by its name, and the event discard's reshuffle (§5 Phase A, §15.D). */
const EVENT_REVEALED = 'an Event revealed';
const EVENTS_RESHUFFLED = 'the event discard shuffled into the event deck';
/** The two Events that act once, as they are revealed (§20.D 4 and 6). */
const ANGEL_PAID = 'Angel Investors paid';
const AUDIT_PAID = 'Regulation Audit paid';
const AUDIT_LET_GO = 'Regulation Audit: staff let go';
/** The round-long Events at work (§20.D). */
const BUBBLE_AT_INCOME = 'Tech Bubble at an Income';
const LEGACY_AT_INCOME = 'Legacy Code at an Income';
const BOOM_AT_WORK = 'Open Source Boom at work';
const HACKATHON_AT_WORK = 'Hardware Hackathon at work';
const LOGJAM_AT_WORK = 'Supply Chain Logjam at work';
const CRASH_AT_INCOME = 'Server Crash at an Income';
/** The prices the Events change (§20.D). */
const TROLLS_LICENSE = 'Patent Trolls: a $5 License';
const CHIP_HIRE = 'Chip Shortage: a Hardware hire for $3 more';
const INTERN_RECRUIT = 'Intern Season: a free recruit';
const COURSE_TRAINING = 'Online Course Boom: a Training card for $1';
const SHOW_TECHCRUNCH = 'Trade Show: a TechCrunch Feature for $2';
/** Crunch Time at the Engine (§20.D 10). */
const CRUNCH_CUBE = 'Crunch Time: a cube';
const CRUNCH_BUG = 'Crunch Time: a Bug';
const CRUNCH_STOPPED = 'Crunch Time: a Bug stopped by Clean Code';
/** The colour each skill works in already, as a declaration's answer names it (§11.C.2). */
const NATIVE_ANSWER: Record<string, string> = { software: 'blue', hardware: 'red', qa: 'qa' };
/** The Permanent XP tokens of each colour a Junior holds (§11.A). */
const XP_TOKENS = ['blue xp tokens', 'red xp tokens', 'green xp tokens'];
/** The counts of the workers a PM's Synergy adds to, one for each colour of its team's output (§11.E.1). */
const WORKERS = ['blue workers', 'red workers', 'qa workers'];

/** The button of the phase `state` is in whose move type is `type`, as the game declares it. */
const buttonOf = (state: GameState, type: string) =>
  game!.phases.find((phase) => phase.id === state.turn?.phase)?.actions.find((action) => action.words === type);

/** How many of a kind of cube a card has: a count the game declares on cards, 0 until a rule changes it. */
const cubesOn = (card: CardState, kind: string) => (card.data?.[kind] as number | undefined) ?? 0;
/** How many Bugs a card has: a count read as a number, like the cubes, since a count back at 0 has no key (P6). */
const bugsOn = (card: CardState) => cubesOn(card, 'bugs');
/** How many of a kind of token a card has: a count read as a number, missing as 0, like the cubes. */
const tokenOn = (card: CardState, name: string) => (card.data?.[name] as number | undefined) ?? 0;
/** The tokens and the Badge a card holds, as `2 blue xp tokens, badged`, '' for none: a Badge is on only when its flag is true. */
const holding = (card: CardState) => [
  ...TOKENS.filter((name) => tokenOn(card, name) > 0).map((name) => `${tokenOn(card, name)} ${name}`),
  ...(card.data?.badged === true ? ['badged'] : []),
].join(', ');
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
/** The Regulation Audit's tax on `seat`'s Board in `state`: the total worked payroll tax of its two teams, a card with none counting 0 (§20.D 6). */
const payrollTaxOf = (runtime: LangRuntime, state: GameState, seat: PlayerId) =>
  [...zoneCards(state, zoneIdFor('development team', seat)), ...zoneCards(state, zoneIdFor('ops team', seat))]
    .reduce((total, card) => total + ((runtime.workedValue(state, card.id, 'payroll tax') as number | null) ?? 0), 0);
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
 * named by its card's name, and the card is allowed exactly when some target takes it. A button that picks its target in several
 * zones, as Training does, offers the cards of each zone in turn, in the order `ontoZoneId` lists them.
 */
function viewedCards(
  runtime: LangRuntime, extras: SeatExtras, state: GameState, seat: PlayerId, type: string, zoneId: string,
  ontoZoneId: string | string[] | null,
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
    const targets = [ontoZoneId!].flat().flatMap((onto) => zoneCards(state, onto));
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
 * card picked, may go on. A button that picks its target in several zones offers the cards of each, in turn, in the order of its list.
 */
type Onto = { zoneId: string | string[]; which: (targets: CardState[], card: CardState) => CardState | undefined };

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
 *   the first backlog card whose press is allowed, Tier 2 and 3 included, but an idea Domain Expertise cuts before any other. Then it
 *   plays the first card of its Strategy Hand that has a target the rules take, in its bench, development team or ops team, of the
 *   Training cards on any turn and of the Buffs too on a turn when `t % 3 === 0`: a Leadership Masterclass on the first such target of
 *   the kind `t % 3` names (a Junior, a QA Engineer or a Sales Rep), else on the first such target; a Workaholic on the first that makes
 *   some colour, a Clean Coder on the Hacker, else on an attaching card in the ops team, and a Visionary on a Junior on a Stalled
 *   project, each else on the one at `t` (mod how many) among them, as any other card is (see `training`, §20.A). Then it plays the first
 *   Debuff of its Strategy Hand that has a target the rules take, on the rival card at `t` (mod how many) among them (see `debuffing`).
 *   Then one Utility card at most: a TechCrunch Feature it can pay for, on its first product a working Sales Rep pitches when it can pay
 *   for that one, else on its product at `t` (mod how many) among those it can pay for; else, on a turn when `t % 3 === 0`, a Design
 *   Sprint (see `utility`). It dismisses the ops team's first card it can spare when `t % 9 === 4` and the development team's first
 *   when `t % 9 === 8`. In the last round, with the Market Crash in the crash pile, it dismisses on an even `t` the ops team's first
 *   card that gives Blue or Red bandwidth, once a turn (see `lastRound`): a path-driver, not play, that sends a seat short so that the
 *   final check has a choice to make (see below).
 * - **The first action** launches the first project the engine takes (see `launch`), else it is an Ideation. A seat that researches and
 *   runs no product yet first researches the seed deck, else drafts the seed market's first card, since a Tier 1 card is what it can build
 *   (the retune's D2). Else the Ideation goes by `t % 4`: a growth idea (0 and 2), draft from the growth market (1), or (3) by
 *   `⌊t / 4⌋ % 3` research the seed deck, draft from the seed market or draft the open idea pool's first card. A growth idea researches
 *   the growth deck when the `style` researches, and drafts from the growth market when it drafts. A draft from a market takes a hybrid
 *   Domain Expertise cuts, else an idea it cuts, else the market's first. When the rules refuse that, it tries researching the growth
 *   deck, drafting from the growth market, researching the seed deck and drafting from the seed market, in that order, and with none
 *   allowed it recruits instead.
 * - **Each later action** first tries to reassign the Diva while she works for the seat, which her Ego refuses at no cost
 *   (§20.B.1). Then it launches the first project the engine takes, which a Tier 2 or 3 project needs to be fully led for as well as
 *   complete (P11), so that the Diva may go to the ops team with her team. Else it puts QA on its first project with Bugs that no QA
 *   on it cleans and that isn't Stalled, since a project with Bugs can't Launch (§6): the bench's first card that would clean them
 *   (see `qaForBugs`). Else, when the action by `(t + a) % 9` below is 0, the recruit, it hires instead the agency row's first
 *   attaching card it can pay for, the Growth Hacker or a Sales Rep, onto its first product in operation (see `hireGrowthHacker`).
 *   Else it hires the Hacker from the agency row, when it can pay for him, onto its first project that needs blue cubes and no red
 *   (see `hireHacker`). Else, once a turn when `t % 4 === 1`, it reassigns the first card of its ops team that sits on a product to
 *   its first other product (see `moveGrowthHacker`). Else, when `t % 3 === 1`, it assigns the bench's first PM to its project with
 *   the most cards on it (see `pmToProject`). Else it pivots the project the Diva is on, which fires her (ruling 9), and it
 *   assigns her from the bench to the ops team, where her Ego refuses a reassign too. Else it hires the agency row's Diva onto its first
 *   project when it can pay for her (see `hireDiva`). Else it assigns the bench's makers of a colour its first open project lacks, a
 *   project with a cut first, to that project (see `makersToProject`). Else, when `(t + a) % 5 === 2`, it Brainstorms (see
 *   `brainstorming`). With none of those, it assigns the bench's makers of a color its first Tier 1 project with a cut lacks to that
 *   project (see `buildCut`), else it finds a lead for its first Stalled project (§3): the bench's first Senior Developer who would lead a
 *   colour it needs, assigned to it, else the agency row's first such Senior it can pay for, hired onto it, else the open job market's
 *   first, hired when it has the $1 the hire costs, else a Layoff of the bench's first card, which digs the talent deck for one. With no
 *   Stalled project, it is one by `(t + a) % 9`:
 *   0. recruit the Junior of kind `(t + ⌊t / 9⌋) % 3` (`(t + a) % 3` is 0 whenever `(t + a) % 9` is);
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
 *   lacking the Junior of kind `(t + a) % 3`, else ends its actions. At 0 actions the rules refuse every press but the free ones and
 *   the end, so once the free moves are made it ends its actions there: the phase no longer ends by itself (rulebook l.172–173).
 * - **Engine.** While the Engine waits on it, its ops team's QA short of the Bugs on its products in operation, it cleans the
 *   product at `t % n` among its n products in operation with Bugs, in slot order (§5 Phase D, R3).
 * - **Final check**, as the seat whose step it is (§12, ruling 25). When `t % 3 === 0` and it has switched nothing on in this step, it
 *   switches on its offline product with the highest val, if it has one. Then, while the step is its, it switches off the product
 *   with the lowest val (the first of those) among its online products with maintenance in a color it is short of (see `shortOf`).
 *   Each step is a `t` of its own, since the step passes to the next seat as the products online fit.
 * - **Graduation**, while the step is its (§11.B.2, §20.B, ruling 25). It keeps a Pending token on a Junior that has several, trying
 *   the colours in the order Blue, Red, Green turned by `t % 3`, each on the first card of its ops team the press allows. With none
 *   allowed, it mentors the first card the press allows, answering the colour it asks as any press's choice is answered (see below).
 * - **Sourcing.** It hires the first card in its scouting it can pay for, to its bench, its ops team or its first project, by
 *   `(t + ⌊t / 9⌋) % 3`, or to its ops team while it has a product in operation, by its first product's button as action 1 does.
 *   When the rules refuse that, or it has nothing to pick, it tries the next of those places in that order, and with none it passes
 *   on the rest (see `sourcing`).
 * - In research it keeps a hybrid Domain Expertise cuts, else an idea it cuts, else the research row's card at `t` (mod the row's
 *   length). In the brainstorm step it keeps the row's first card the runs play (a Training card, an Attribute, a TechCrunch Feature or
 *   a Design Sprint: see `isPlayable`), else the row's card at `t` (mod the row's length) (§6). In the backlog cleanup it discards the
 *   first card Domain Expertise doesn't cut, else the row's first; in the strategy cleanup, the first card the runs don't play, else
 *   the row's first; in the bench cleanup, the row's first.
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
   * the ones the page's view lists, with the view itself. Targets in several zones are the cards of each zone in turn.
   */
  const offers = (type: string, zoneId: string, ontoZoneId: string | string[] | null) => {
    const state = engine.getState();
    const byId = (id: string) => cardById(state, id)!;
    if (!throughView) {
      const targetsOf = (_id: string) => (ontoZoneId === null ? [] : [ontoZoneId].flat().flatMap((onto) => zoneCards(state, onto)));
      return { row: zoneCards(state, zoneId), targetsOf, seen: null };
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
   * leaving, so it is spare even from a team already short. But a card on a product, the Growth Hacker or a Sales Rep, is never spare,
   * for the revenue it adds there (§20.B), and nor is a card that cleans Bugs while a product in operation has Bugs or is viral, so that
   * the Engine cleans them (§5 Phase D).
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
  /**
   * Whether the rules take `card`, a Training card or a Buff, played on `target`: the press is refused for none of their reasons before
   * its choices.
   */
  const takes = (card: CardState, target: CardState) =>
    typeof pressChoices(runtime, engine.getState(), { type: PLAY_TRAINING, by, cardId: card.id, onto: target.id }) !== 'string';
  /** What a Masterclass looks for in a target: a Junior by its role, else the card's name (§20.A). */
  const kindOf = (card: CardState) => (card.data?.role === 'Junior' ? 'Junior' : nameOf(card));
  /**
   * The play of the Strategy Hand's first Training card, or on a turn when `t % 3 === 0` its first Training card or Buff, that has a
   * target the rules take, in the seat's bench, development team or ops team (§20.A). A Leadership Masterclass goes on the first taken
   * target of the kind `t % 3` names, a Junior, a QA Engineer or a Sales Rep, else on the first taken target; a Buff on the first taken
   * target where it pays (see below), else on the taken target at `t` (mod how many), as any other card is. The choice a Bootcamp asks
   * of a Junior both colours fit is answered as any press's is, by `t`.
   */
  const training = (): Move | null => {
    const zones = TRAINING_TARGETS.map(own);
    const fits = (card: CardState) => (isTraining(card) || (BUFFS.includes(nameOf(card) as string) && t % 3 === 0))
      && zones.some((zoneId) => cards(zoneId).some((target) => takes(card, target)));
    return pick(PLAY_TRAINING, own('strategy hand'), (row) => row.find(fits), {
      zoneId: zones,
      which: (targets, card) => {
        const taken = targets.filter((target) => takes(card, target));
        if (nameOf(card) === 'Leadership Masterclass') {
          const kind = ['Junior', 'QA Engineer', 'Sales Rep'][t % 3];
          return taken.find((target) => kindOf(target) === kind) ?? taken[0];
        }
        const byT = taken.length === 0 ? undefined : taken[t % taken.length];
        const state = engine.getState();
        // A Buff goes where it pays (§20.A): a Workaholic on a maker, a Clean Coder on the Hacker or an attached card in the ops team, and a
        // Visionary on a Junior whose project is Stalled.
        if (nameOf(card) === 'Workaholic') {
          return taken.find((target) => ['blue output', 'red output', 'qa output'].some((v) => ((runtime.workedValue(state, target.id, v) as number | undefined) ?? 0) > 0)) ?? byT;
        }
        if (nameOf(card) === 'Clean Coder') {
          return taken.find((target) => target.data?.trait === 'Spaghetti Code')
            ?? taken.find((target) => target.zoneId === own('ops team') && attaching(target)) ?? byT;
        }
        if (nameOf(card) === 'Visionary') {
          return taken.find((target) => target.data?.role === 'Junior' && target.zoneId === own('development team')
            && runtime.workedFlag(state, target.data?.[HOLDER_KEY] as string, 'stalled')) ?? byT;
        }
        return byT;
      },
    });
  };
  /** Whether the rules take Debuff `card` played on `target`: the press is refused for none of their reasons before its choices. */
  const takesDebuff = (card: CardState, target: CardState) =>
    typeof pressChoices(runtime, engine.getState(), { type: PLAY_DEBUFF, by, cardId: card.id, onto: target.id }) !== 'string';
  /** The play of the Strategy Hand's first Debuff that has a target the rules take, on the taken target at `t` (mod how many) (§20.A). */
  const debuffing = (): Move | null => {
    const zones = debuffZones(runtime.seats, by);
    const fits = (card: CardState) => DEBUFFS.includes(nameOf(card) as string)
      && zones.some((zoneId) => cards(zoneId).some((target) => takesDebuff(card, target)));
    return pick(PLAY_DEBUFF, own('strategy hand'), (row) => row.find(fits), {
      zoneId: zones,
      which: (targets, card) => {
        const taken = targets.filter((target) => takesDebuff(card, target));
        return taken.length === 0 ? undefined : taken[t % taken.length];
      },
    });
  };
  /**
   * The play of a Utility card (§20.A): a TechCrunch Feature the seat can pay for on its first product a working Sales Rep pitches, else on
   * its product at `t` (mod how many); else, on a turn when `t % 3` is 0, a Design Sprint.
   */
  const utility = (): Move | null => {
    const state = engine.getState();
    const products = cards(own('operations'));
    const pitched = products.find((product) => runtime.workedFlag(state, product.id, 'pitched'));
    const techCrunch = pick(PLAY_TO_PRODUCT, own('strategy hand'), (row) => row.find((card) => nameOf(card) === 'TechCrunch Feature'
      && products.some((product) => techCrunchPrice(runtime, state, card.id, product.id) <= capital())), {
      zoneId: own('operations'),
      which: (targets, card) => {
        const paid = targets.filter((product) => techCrunchPrice(runtime, state, card.id, product.id) <= capital());
        return paid.find((product) => product.id === pitched?.id) ?? (paid.length === 0 ? undefined : paid[t % paid.length]);
      },
    });
    if (techCrunch !== null) return techCrunch;
    return t % 3 === 0 ? pick(PLAY_ALONE, own('strategy hand'), (row) => row.find((card) => nameOf(card) === 'Design Sprint')) : null;
  };
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
      made.has(PLAY_TRAINING) ? null : training(),
      made.has(PLAY_DEBUFF) ? null : debuffing(),
      made.has(PLAY_TO_PRODUCT) || made.has(PLAY_ALONE) ? null : utility(),
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
   * The agency row's first attaching card the seat can pay for, the Growth Hacker or a Sales Rep, onto the seat's first product in
   * operation, when the seat has a product and `action`, the cycle's action this turn (see `playTurn`), is 0, the recruit's (§3, §20.B,
   * ruling 19). Null otherwise. Only in the recruit's place: the three Sales Reps attach as well as the one Growth Hacker, and a seat
   * hiring one at any action it could would take a Sales Rep where the agency row's hire to the ops team then took a QA Engineer (3
   * players seed 4, 4 players seed 3), and would lead 2 players seed 4 off what was then the long runs' only Cut 2 red (plan 5-2a's P9).
   * Every Growth Hacker the long runs hired before the Sales Reps attached came at action 0, so those hires stay as they were.
   */
  const hireGrowthHacker = (action: number): Move | null => {
    if (action !== 0 || attachingFor(cards('agency-row')) === undefined || cards(own('operations')).length === 0) return null;
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
  /**
   * The agency row's Diva, hired onto the seat's first project when it can pay for her: the cheapest Senior (§20.B.1), whom the cycle's
   * hire seldom reaches, so the Diva's Ego and her firing by a pivot are seen in more than one game (D3).
   */
  const hireDiva = (): Move | null => {
    const diva = (row: CardState[]) => row.find((card) => isDiva(card) && canPay(card));
    if (diva(cards('agency-row')) === undefined || cards(own('development')).length === 0) return null;
    return pick(HIRE_AGENCY_TO_PROJECT, 'agency-row', diva, onProject());
  };
  /**
   * The bench's makers of a colour the seat's first open project lacks, assigned to it: a project with a cut first, else the first one,
   * passing over a Stalled project, whose makers make nothing until it has its leads (§3). An Efficient card stays on the bench. Null with
   * no such project or no such maker (D2: a project left waiting for its makers is what kept Launches down).
   */
  const makersToProject = (): Move | null => {
    const open = (project: CardState) => lacks(project).length > 0 && runtime.workedFlag(engine.getState(), project.id, 'stalled') !== true;
    const projects = cards(own('development'));
    const project = projects.find((candidate) => open(candidate) && isCut(candidate)) ?? projects.find(open);
    if (project === undefined) return null;
    const makes = (card: CardState) => !efficient(card) && lacks(project).includes(COLOR_OF_SKILL[card.data?.skill as string]);
    return pickSome(ASSIGN_TO_PROJECT, own('bench'), (bench) => bench.filter(makes),
      onProject((targets) => targets.find((target) => target.id === project.id)));
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
   * On a `t` with `t % 3 === 1`, while some project in the seat's development has a card on it, the bench's first PM, a card whose trait
   * is Synergy or Agile Synergy, assigned to the project with the most cards on it (the first of those), where its Synergy adds to each
   * working teammate's output and an Agile PM spares the staff moved there their Onboarding token (§11.E, R8). Null otherwise. From the
   * bench only (plan 5-2a's P9): hiring a PM from the agency row onto the project as well spends the capital and the actions that the
   * scouting's hires to the ops team and to a product, the Launch of a project with a cut, the Pivot that makes a bench forget a mode and
   * ops QA cleaning a Bug by itself need in the few games that hold each, and the long runs would see none of them.
   */
  const pmToProject = (): Move | null => {
    const projects = cards(own('development'));
    const staffed = (project: CardState) => cardsOn(engine.getState(), project.id).length;
    if (t % 3 !== 1 || !projects.some((project) => staffed(project) > 0)) return null;
    const most = projects.reduce((best, project) => (staffed(project) > staffed(best) ? project : best));
    const pm = (card: CardState) => ['Synergy', 'Agile Synergy'].includes(card.data?.trait as string);
    return pickSome(ASSIGN_TO_PROJECT, own('bench'), (bench) => bench.filter(pm).slice(0, 1),
      onProject((targets) => targets.find((target) => target.id === most.id)));
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
  /** Whether a card on `project` works in a mode: Red, QA or a trained Junior's Blue, as a declaration left it (§11.C.2, ruling 24). */
  const moded = (project: CardState) =>
    cardsOn(engine.getState(), project.id).some((card) => [...MODES, BLUE_MODE].some((mode) => card.data?.[mode] === true));
  /** A Pivot of the project the Diva is on, which fires her, since no reassign will move her (ruling 9). */
  const pivotDiva = () => pick(PIVOT, own('development'), (row) => row.find(divaOn));
  /** The Diva's assign from the bench to the ops team, where her Ego refuses a reassign as well (§6, §20.B.1). */
  const divaToOps = () => pickSome(ASSIGN_TO_OPS, own('bench'), (bench) => bench.filter(isDiva));
  /**
   * A Brainstorm as the turn's action `a`, when `(t + a) % 5 === 2`: on an odd `t`, while the seat's Strategy Hand holds a card the runs
   * don't play (see `isPlayable`), it flushes every such card first, else it Brainstorms plainly (§6, §15.C). Null otherwise. The runs
   * play the Training cards, the Attributes, TechCrunch Feature and Design Sprint, so the Warfare cards and Cease & Desist only fill the
   * hand: flushing them sends cards to the strategy discard, which a Brainstorm on an empty deck shuffles back in, and the strategy
   * cleanup discards whatever is left over 3. A press the rules refuse, on an empty deck and an empty discard, falls through to the next
   * planned move.
   */
  const brainstorming = (a: number): Move | null => {
    if ((t + a) % 5 !== 2) return null;
    const flushed = (hand: CardState[]) => hand.filter((card) => !isPlayable(card));
    if (t % 2 === 1 && flushed(cards(own('strategy hand'))).length > 0) return pickSome(BRAINSTORM_FLUSHING, own('strategy hand'), flushed);
    return press(BRAINSTORM);
  };
  /** The move the action numbered `action` makes, or null when it has nothing to pick (see above). */
  const boardAction = (action: number): Move | null => {
    const projects = cards(own('development'));
    const holderOf = (card: CardState) => card.data?.[HOLDER_KEY];
    switch (action) {
      case 0:
        return press(RECRUITS[(t + Math.floor(t / 9)) % 3]);
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
      // Each press below spends an action or ends them, so a seat still in its actions after 3 presses and the end didn't end them.
      if (a > ACTIONS_EACH_TURN) throw new Error(`${by} at t = ${t}: still in its actions after ${a} presses`);
      const free = freeMove();
      if (free !== null) {
        play(engine, free, watch);
        continue;
      }
      const action = (t + a) % 9;
      const board = () => [
        buildCut() ?? leadForStalled() ?? boardAction(action), ...boardMovesAfter(action).map((next) => boardAction(next)),
      ];
      // A seat that researches takes a seed idea first until it runs a product: a Tier 1 card is the one it can build (D2).
      const ideas = () => (style === 'researches' && cards(own('operations')).length === 0
        ? [press(RESEARCH_SEED), first(DRAFT_SEED, 'seed-market'), ...ideation()]
        : ideation());
      const planned = a === 0 ? [launch(), ...ideas()] : [
        reassignDiva(), launch(), qaForBugs(), hireGrowthHacker(action), hireHacker(), moveGrowthHacker(), pmToProject(), pivotDiva(),
        divaToOps(), hireDiva(), makersToProject(), brainstorming(a), ...board(),
      ];
      const move = choose([...planned, recruitMaker(a), press(END_ACTIONS)]);
      if (move.type === REASSIGN_TO_PRODUCT) movedOnProducts = true;
      play(engine, move, watch);
      a++;
    } else if (phase === 'research') {
      play(engine, choose([pick(KEEP, own('research'), (row) => cutIdea(row) ?? row[t % row.length])]), watch);
    } else if (phase === 'brainstorm') {
      play(engine, choose([pick(KEEP_STRATEGY, own('brainstorm'), (row) => row.find(isPlayable) ?? row[t % row.length])]), watch);
    } else if (phase === 'sourcing') {
      play(engine, choose([...sourcing(), press(PASS_ON_THE_REST)]), watch);
    } else if (phase === GRADUATION) {
      const colours = (['blue', 'red', 'green'] as const).map((_, i, all) => all[(i + t) % all.length]);
      const allowed = (type: string) => pick(type, own('ops team'), (row, { allows }) => row.find(allows));
      play(engine, choose([...colours.map((colour) => allowed(KEEP_PENDING[colour])), allowed(MENTOR)]), watch);
    } else if (phase === 'engine') {
      // The Engine waits on the seat only while its ops QA can't clean every Bug on its products, so some product has Bugs (R3).
      const bugged = (row: CardState[]) => row.filter((product) => bugsOn(product) > 0);
      play(engine, choose([pick(CLEAN, own('operations'), (row) => bugged(row)[t % bugged(row).length])]), watch);
    } else if (phase === EVENT_CHECK) {
      // Short of the Regulation Audit's tax, the seat lets go of one taxed card at a time: the one at t % n among its taxed Board cards,
      // its development team's first, then its ops team's, in slot order (§20.D 6).
      const taxed = ['development team', 'ops team'].flatMap((row) => cards(own(row)).map((card) => ({ row, card })))
        .filter(({ card }) => runtime.workedFlag(engine.getState(), card.id, 'taxed'));
      const { row, card } = taxed[t % taxed.length];
      play(engine, choose([pick(LET_GO[row], own(row), (r) => r.find((c) => c.id === card.id))]), watch);
    } else if (phase === FINAL_CHECK) {
      const move = choose([t % 3 === 0 && !switchedOn ? switchOnBest() : null, switchOffLeast()]);
      if (move.type === SWITCH_ON) switchedOn = true;
      play(engine, move, watch);
    } else {
      const cleanup = CLEANUPS[phase!];
      if (cleanup === undefined) throw new Error(`The long runs don't play the ${phase} phase.`);
      // A backlog keeps the ideas Domain Expertise cuts, and a Strategy Hand the cards the runs play (see `isPlayable`).
      const kept = (card: CardState) => (cleanup.row === 'backlog' && expertIn(card)) || (cleanup.row === 'strategy hand' && isPlayable(card));
      play(engine, choose([pick(cleanup.discard, own(cleanup.row), (row) => row.find((card) => !kept(card)) ?? row[0])]), watch);
    }
  }
}

/**
 * How a long run plays: until the log holds `moves` moves or `until` says it holds enough, with `throughView` finding each card
 * to pick through the page's view, and telling `refused` of each press the rules refuse. `finalCheck` gains the log index of each
 * move made in the final check or in a round's event check.
 */
type Run = {
  moves?: number; throughView?: boolean; until?: (log: readonly Move[]) => boolean; refused?: Refused; finalCheck?: Set<number>;
};

/**
 * Plays a game of `players` from Setup at `seed`, turn after turn, until it has a result, `MAX_TURNS` turns are played, the log
 * holds `moves` moves or `until` says it holds enough; the engine as it is then. At an odd seed every seat researches the growth
 * deck for its growth ideas, and at an even seed it drafts them from the growth market, so that the Crash comes out of each. With
 * `throughView` each seat finds the cards it picks through the page's view of it, as `playTurn` says. Each step of the final check
 * before the score, and of a round's event check, is played as a turn of its own, and the index of each of its moves goes into
 * `finalCheck`, since they are no turn.
 */
function playGame(
  players: number, seed: number, watch: Watch,
  { moves = Infinity, throughView = false, until = () => false, refused, finalCheck }: Run = {},
): GameEngine {
  const { engine, runtime } = createEngine(game!, lib, players, initialState(game!, seed));
  const style: Style = seed % 2 === 0 ? 'drafts' : 'researches';
  const stop = (log: readonly Move[]) => log.length >= moves || until(log);
  const watching: Watch = (before, move, after) => {
    if (before.turn?.phase === FINAL_CHECK || before.turn?.phase === EVENT_CHECK) finalCheck?.add(engine.getLog().length - 1);
    watch(before, move, after);
  };
  for (let t = 0; t < MAX_TURNS && engine.getState().result === undefined && !stop(engine.getLog()); t++) {
    playTurn(engine, t, style, watching, stop, runtime, throughView, refused);
  }
  return engine;
}

/**
 * What the replay tests count in a game: the paths some log must hold so that rebuilding the logs rebuilds them too. The 2-player test
 * requires all but the Design Sprints, which the 3-player test requires with the Debuffs, strips and TechCrunch Features.
 */
const REPLAYED = [
  'declarations', 'switches off', 'Bugs added to a project', 'Pending tokens gained', 'Launches that raised XP', 'reshuffles',
  'Training that asked a choice or had it filled in', 'Milestone claims', 'Debuffs', 'strips', 'TechCrunch Features', 'Design Sprints',
  'Event reshuffles', 'let-gos in the event check',
] as const;

/**
 * Paths (tally keys, and `REPLAYED` counts of the replay tests) that fewer than 2 of the long runs' 20 games hold once the Event deck
 * replays every seeded game (plan 6-2b): counted, not required, as plan 6-2a's precedent has it, each pinned by its examples or the
 * arranged test named here. A later cadence change may promote them.
 * - None: Attributes kept through a bench discard ('a Talent discarded from the bench keeps its Attributes, and the rival who hires it
 *   from the open job market gets them'); Toxic taking a Red cube ('a team that makes no Blue loses a Red cube to Toxic Personality');
 *   the agency row's hire to the bench ('the agency row slides left and refills from the talent deck, which never reshuffles
 *   (section 13)' hires the Architect and the Hacker to the bench, and 'during Chip Shortage Hardware talent costs $3 more from the
 *   University, the agency row and the open job market, and a flex Firmware Specialist its printed price (section 20, section 13)'
 *   hires the Engineer and the Firmware Specialist to it); the Engineer paid $1 in the ops team ('the Engineer's salary is $1 in the ops team'); a TechCrunch Feature in a 3-player log
 *   (the 2-player replay rebuilds one, seed 4; 'TechCrunch Feature adds 1 Hype to one of the player's products for $5 and no
 *   action, or $2 when a working Sales Rep is on that product'); Legacy Code at an Income ('Legacy Code makes each Bug cost $2 of
 *   revenue, …'); a Crunch Time Bug stopped by Clean Code ('Crunch Time gives each project that isn't Stalled 1 more cube, …'); a
 *   TechCrunch Feature under Trade Show ('during Trade Show TechCrunch Feature costs $2, …').
 * - One game: TechCrunch for $5 (2 players seed 4; the TechCrunch example above); a trained Junior declared red (5 players seed 2; 'a Junior Software Dev with 2 Blue
 *   XP and a Red Skill token declared Red makes 1 Red, its Blue XP idle (section 11, the slice's R11)', and 'Hardware Hackathon gives
 *   its 1 more, and Supply Chain Logjam its 1 less, to a Junior trained in Red and declared Red (section 20, section 11)', whose
 *   Junior is a QA Tester); Workaholic played (5 players seed 5; 'Workaholic gives +2 output in the colour its staff member makes and +$2 salary'); the
 *   reassign from the ops team to a product in operation (3 players seed 4; 'the Growth Hacker reassigned to another product is
 *   onboarding, …'); Intern Season's free recruit (2 players seed 4; 'during Intern Season recruiting from the University costs $0,
 *   …'); and Patent Trolls' $5 License (2 players seed 4; 'during Patent Trolls a Greenlight License costs $5, …').
 */
const HELD_BY_FEWER_THAN_TWO = new Set<string>([
  'Attributes kept through a bench discard',
  'Toxic: a Red cube taken',
  'hire a card from the agency row to their bench',
  'the Engineer paid 1 in the ops team',
  'TechCrunch Features',
  'Legacy Code at an Income',
  'Crunch Time: a Bug stopped by Clean Code',
  'Trade Show: a TechCrunch Feature for $2',
  'TechCrunch for $5',
  'a trained Junior declared red',
  'an Attribute played: Workaholic',
  'reassign a card from their ops team to a card in their operations',
  'Intern Season: a free recruit',
  'Patent Trolls: a $5 License',
]);

/** A game kept for the Greenlight test: the moves to its first Greenlight that answered a choice, and the states before and after it. */
type GreenlitGame = { log: Move[]; before: GameState | null; after: GameState };

/** A game kept for the replay and view tests: its log, the state before its last move, its end, the moves watched and its counts. */
type KeptGame = {
  log: Move[]; beforeLast: GameState; end: GameState; watched: number; seen: Record<(typeof REPLAYED)[number], number>;
};

/**
 * A watch for a game played from Setup that keeps what the replay test needs of it: the state before its last move, how many moves it
 * saw, and the counts of `REPLAYED`. A caller that has worked out the move's happenings already passes them as `keys`.
 */
function keepingForReplay(runtime: LangRuntime) {
  const seen = Object.fromEntries(REPLAYED.map((what) => [what, 0])) as KeptGame['seen'];
  let beforeLast: GameState | null = null;
  let watched = 0;
  const watch = (before: GameState, move: Move, after: GameState, keys = happenings(runtime, before, move, after)) => {
    beforeLast = before;
    watched += 1;
    if (Object.values(DECLARE).includes(move.type)) seen.declarations += 1;
    if (move.type === SWITCH_OFF) seen['switches off'] += 1;
    seen['Bugs added to a project'] += keys.filter((key) => key === BUG_ON_PROJECT).length;
    seen.reshuffles += keys.filter((key) => key === RESHUFFLED).length;
    seen['Event reshuffles'] += keys.filter((key) => key === EVENTS_RESHUFFLED).length;
    seen['let-gos in the event check'] += keys.filter((key) => key === AUDIT_LET_GO).length;
    // A Training press asks the colour a Full Stack Bootcamp gives when it fits both, and fills in the one it fits alone (§20.A).
    const asked = move.type === PLAY_TRAINING && isTraining(cardById(before, move.cardId as string)!) ? pressChoices(runtime, before, move) : [];
    if (typeof asked !== 'string' && asked.length > 0) seen['Training that asked a choice or had it filled in'] += 1;
    seen['Milestone claims'] += keys.filter((key) => key.startsWith(`${CLAIMED}: `)).length;
    if (move.type === PLAY_DEBUFF) seen.Debuffs += 1;
    if (move.type === PLAY_TO_PRODUCT) seen['TechCrunch Features'] += 1;
    if (move.type === PLAY_ALONE && nameOf(cardById(before, move.cardId as string)!) === 'Design Sprint') seen['Design Sprints'] += 1;
    seen.strips += keys.filter((key) => key === ATTRIBUTES_FIRED).length;
    const gained = (c: CardState, names: readonly string[]) => {
      const was = cardById(before, c.id);
      return names.some((name) => tokenOn(c, name) > (was === undefined ? 0 : tokenOn(was, name)));
    };
    if (after.cards.some((c) => gained(c, PENDING))) seen['Pending tokens gained'] += 1;
    if (move.type === LAUNCH && after.cards.some((c) => gained(c, XP_TOKENS))) seen['Launches that raised XP'] += 1;
  };
  const kept = (engine: GameEngine): KeptGame =>
    ({ log: [...engine.getLog()], beforeLast: beforeLast!, end: engine.getState(), watched, seen });
  return { watch, kept };
}

/**
 * The seat of each turn in the log, in order, among the moves whose index is not in `skipped`: a turn is a run of moves by one seat,
 * since no seat has two turns running. The long runs skip the moves of the final check, whose steps are no turns (§12).
 */
const turnsIn = (log: readonly Move[], skipped: ReadonlySet<number>): PlayerId[] => {
  const kept = log.filter((_, i) => !skipped.has(i));
  return kept.filter((move, i) => i === 0 || move.by !== kept[i - 1].by).map((move) => move.by as PlayerId);
};

/**
 * The seats whose step in a round's steps has ended in `state`, in turn from the first; null outside the steps. `roundStepsOf(state) ===
 * true` reads as null too: `true` lives only inside a move, and runtime.ts (~425) clears it as the waiting turn starts, so a state a
 * move leaves never holds it. Callers that take `stepsDone(after) ?? seats` therefore read null as "the steps ran out within the move":
 * every seat is done.
 */
function stepsDone(state: GameState, seats: PlayerId[]): PlayerId[] | null {
  const steps = roundStepsOf(state);
  if (steps === null || steps === true) return null;
  const from = seats.indexOf(steps.first);
  const upTo = (seats.indexOf(state.turn!.current as PlayerId) - from + seats.length) % seats.length;
  return Array.from({ length: upTo }, (_, i) => seats[(from + i) % seats.length]);
}

/**
 * The seats whose step in a round's steps ended in the move from `before` to `after`, in turn from the first: none outside them; every
 * seat when they ran out within the move (6-1's round steps).
 */
function stepsEndedIn(before: GameState, after: GameState, seats: PlayerId[]): PlayerId[] {
  const started = (after.data[ROUND_KEY] as number) > (before.data[ROUND_KEY] as number);
  if (!started && roundStepsOf(before) === null) return [];
  const doneBefore = stepsDone(before, seats) ?? [];
  const doneAfter = stepsDone(after, seats) ?? (started && roundStepsOf(after) === null && !['Angel Investors', 'Regulation Audit'].includes(eventOf(after) as string) ? [] : seats);
  return doneAfter.filter((seat) => !doneBefore.includes(seat));
}

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
 * move. A reassigned card is onboarding, as the reassign leaves it. The end of a seat's actions runs the Engine and may then start
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
 *
 * Slice 5's paths, read through `runtime` too (§3, §5, §11, §12, §18.B, §20.B, rulings 1, 8 and 25):
 * - **Pending tokens.** Each card whose Pending token of a colour rose, by the colour (`a Pending token gained: blue`); each card on a
 *   pivoted project holding a Pending token before the Pivot, which returns it.
 * - **Graduation.** Each card whose Permanent XP of some colour rose in a Launch press, which graduates a Junior with one token at once;
 *   each press that keeps a token by choice, and each of the Mentor's; each card a Launch press made badged.
 * - **Firing.** Each card holding a token or a Badge before a dismiss or a let-go that reached the open job market in it, stripped.
 * - **Pay.** Each card of the mover's Board that was experienced before its salaries were paid.
 * - **Synergy**, in a move that ran the mover's Engine: each of its projects not Stalled with a PM managing and a worker of some colour
 *   on it, as the team was when the Engine generated (see `atTheEngine`).
 * - **The Agile spare**, only in a move that starts no turn (P8): the card reassigned onto a project an Agile PM was on before the move
 *   that is not onboarding after it, and each picked card of an assign there that was onboarding before and is not after.
 * - **The Sales Rep**, for the seat that reached its Income: each of its online products with a Rainmaker card on it, not onboarding.
 * - **The QA Engineer**, in a move that ran the mover's Engine: each of its projects with a Bug Hunter card on it whose Bugs fell.
 *
 * Plan 5-2b's paths, read through `runtime` as well (§5 Phase D step 7, §6, §11, §12, §15.C, §20.A, §20.G, rulings 10 and 25):
 * - **Brainstorm.** Each Brainstorm, plain or flushing, by how many cards it drew: those its brainstorm row holds after it, or the one it
 *   kept at once, which it counts as well; and the strategy discard shuffled into the deck, when a card it drew or one left in the deck
 *   was not in the deck before it. Each card the strategy cleanup discards.
 * - **Training.** Each Training card played, by its name and the kind of its target: a Junior, else the target's name.
 * - **Trained Juniors.** Each declaration of a card with a Skill token whose answer is not the colour its skill works in already.
 * - **What Training changes.** In a move that ran the mover's Engine, each of its projects with a badged Junior leading on it, as the
 *   team was when the Engine generated (see `atTheEngine`). For the seat that reached its Income, each of its online products with Bugs
 *   that is not decaying, by what spared it: a VP of Sales on it, or a QA Engineer of 2 XP in its ops team (both may); and each of its
 *   online products with a Sales Rep on it, not onboarding, that has Training XP.
 * - **The Milestones.** Each card that entered a milestones row, by its name, and each one that entered it in the move that set the
 *   result: the last check, after every final Ops check (§12).
 *
 * Plan 6-2a's paths, read through `runtime` as well (§5, §6, §12, §13, §15, §20.A, the slice's R1 to R3). Counts are read as numbers,
 * missing as 0:
 * - **Attributes played.** Each Attribute card played, by its name (`an Attribute played: Burnout`), and the row of its target: a Buff
 *   on a bench or a Board card, a Debuff on a development team or an ops team card.
 * - **Where they go with their Talent.** Each card that held a count before a dismiss, a let-go or a Pivot fired it to the open job
 *   market, which discards its Attributes; each one that went from a bench to the open job market, which keeps them; a hire from the
 *   open job market of a card that holds them; and each one that went to the box, evicted with them.
 * - **Their effects at the Engine**, in a move that ran the mover's Engine, as the team was when the Engine generated (see
 *   `atTheEngine`): each of its projects not Stalled with an overworked card on it that makes some colour; each project not Tier 1
 *   whose only leads hold Visionary; each project Toxic Personality took a Blue cube, a Red cube or a cleaning from; and each burned-out
 *   card on a project, and each of those that is managing, whose Synergy is lost.
 * - **Clean Coder.** Each Hacker holding Clean Coder that a press moved onto a project whose Bugs did not rise; and, as a seat's turn
 *   passes, each of its products with a Viral Loop card on it that a card holding Clean Coder shields, on the product or guarding the
 *   pool (a Clean Coder on another product shields nothing there).
 * - **Toxic Personality in the ops team**, for the seat that reached its Income: each card of its ops team taking one off its supplies.
 * - **Utility.** Each TechCrunch Feature, by its price: $5, or $2 with a working Sales Rep on the product; each Design Sprint, by whether
 *   it dealt 5 cards; and, in the move that set the result, each seat with an online product holding Hype, which scores.
 *
 * Plan 6-2b's paths, read through `runtime` as well (§5 Phase A, §15.D, §20.D):
 * - **Reveals.** Each Event revealed, by its name, in a move in which a round started, and the event discard shuffled into the event
 *   deck when the deck was empty before it; each seat the Angel Investors paid, each seat whose Regulation Audit step ended having paid
 *   above $0, and each let-go press in the event check.
 * - **Round-long effects**, read under the Event in play as the seat reached its Income (`after`) or as the Engine ran (`before`): Tech
 *   Bubble and Legacy Code at an Income with an online product (with Bugs, decaying, for Legacy Code); Open Source Boom, Hardware
 *   Hackathon and Supply Chain Logjam at the Engine on each project not Stalled with a card on it making Blue (the first) or Red; Server
 *   Crash at an Income with a card of the ops team making Blue; and Crunch Time's cube, Bug, or Bug stopped by Clean Code on each project
 *   not Stalled.
 * - **Prices**, under the Event in play before the press: a Greenlight paying a License of 5, a Hardware recruit or hire under Chip
 *   Shortage, a recruit under Intern Season, a Training card under Online Course Boom and a TechCrunch Feature under Trade Show.
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
  const inMode = (c: CardState | undefined) => [...MODES, BLUE_MODE].filter((mode) => c?.data?.[mode] === true);
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

  // Slice 5's paths.
  for (const c of after.cards) {
    const was = wasById.get(c.id);
    for (const name of PENDING) {
      if (tokenOn(c, name) > (was === undefined ? 0 : tokenOn(was, name))) keys.push(`${PENDING_GAINED}: ${name.slice('pending '.length)}`);
    }
    if (move.type === LAUNCH && was !== undefined) {
      if (XP_TOKENS.some((name) => tokenOn(c, name) > tokenOn(was, name))) keys.push(GRADUATED);
      if (c.data?.badged === true && was.data?.badged !== true) keys.push(PROMOTED);
    }
    if (FIRES.includes(move.type) && c.zoneId === 'open-job-market' && was !== undefined && was.zoneId !== c.zoneId && holding(was) !== '') {
      keys.push(STRIPPED);
    }
  }
  if (Object.values(KEEP_PENDING).includes(move.type)) keys.push(KEPT_BY_CHOICE);
  if (move.type === MENTOR) keys.push(MENTORS_SECOND);
  if (move.type === PIVOT) {
    const returning = cardsOn(before, move.cardId as string).filter((staff) => PENDING.some((name) => tokenOn(staff, name) > 0));
    keys.push(...returning.map(() => PIVOT_RETURNED));
  }
  if (move.type === PAY_SALARIES) {
    const board = ['development team', 'ops team'].flatMap((row) => zoneCards(before, zoneIdFor(row, by)));
    keys.push(...board.filter((staff) => runtime.workedFlag(before, staff.id, 'experienced')).map(() => EXPERIENCED_PAID));
  }
  if (engineRan) {
    const generating = atTheEngine(before, move, after);
    const value = (id: string, name: string) => runtime.workedValue(generating, id, name) as number;
    const synergy = zoneCards(generating, zoneIdFor('development', by)).filter((project) =>
      !runtime.workedFlag(generating, project.id, 'stalled') && value(project.id, 'pm count') > 0
      && WORKERS.some((name) => value(project.id, name) > 0));
    keys.push(...synergy.map(() => SYNERGY));
    const hunted = zoneCards(after, zoneIdFor('development', by)).filter((project) =>
      cardsOn(after, project.id).some((staff) => staff.data?.trait === 'Bug Hunter')
      && bugsOn(project) < bugsOn(wasById.get(project.id) ?? project));
    keys.push(...hunted.map(() => QA_ENGINEER_CLEANED));
  }
  // The end of a seat's actions may start the next turn, whose start clears every Onboarding token, so only a move that starts
  // none shows what Agile spared; and Agile is read before the move, since a PM arriving in it spares no one (P8, §11.E.3, ruling 8).
  if (turnStarted(before, after) === null && [REASSIGN_FROM_PROJECT, REASSIGN_FROM_OPS, ASSIGN_TO_PROJECT].includes(move.type)) {
    const agile = cardsOn(before, move.onto as string).some((staff) => runtime.workedFlag(before, staff.id, 'agile'));
    const onboarding = (state: GameState, id: string) => cardById(state, id)?.data?.onboarding === true;
    const spared = !agile ? [] : move.type === ASSIGN_TO_PROJECT
      ? (move.cardIds as string[]).filter((id) => onboarding(before, id) && !onboarding(after, id))
      : [move.cardId as string].filter((id) => !onboarding(after, id));
    keys.push(...spared.map(() => AGILE_SPARED));
  }
  if (reached !== null) {
    const selling = (product: CardState) =>
      cardsOn(after, product.id).some((staff) => staff.data?.trait === 'Rainmaker' && staff.data?.onboarding !== true);
    keys.push(...operationsOf(after, reached).filter((product) => product.data?.offline !== true && selling(product)).map(() => SALES_BONUS));
  }

  // Plan 5-2b's paths: the Strategy deck, Training and the Milestones.
  if ([BRAINSTORM, BRAINSTORM_FLUSHING].includes(move.type)) {
    const hand = (state: GameState) => zoneCards(state, zoneIdFor('strategy hand', by));
    const looking = after.turn!.current === by && after.turn!.phase === 'brainstorm';
    // A single card drawn goes to the Strategy Hand at once (§6, R10): a card new there, or one flushed that a reshuffle brought back.
    const stayed = new Set(hand(before).map((c) => c.id).filter((id) => !((move.cardIds ?? []) as string[]).includes(id)));
    const kept = hand(after).filter((c) => !stayed.has(c.id));
    const drawn = looking ? zoneCards(after, zoneIdFor('brainstorm', by)) : kept;
    keys.push(`${BRAINSTORM_DRAWING} ${drawn.length}`);
    if (!looking) keys.push(KEPT_AT_ONCE);
    // With no reshuffle every card drawn, and every card left in the deck, was in the deck before the press (§15.C).
    const inTheDeck = new Set(zoneCards(before, 'strategy-deck').map((c) => c.id));
    if ([...zoneCards(after, 'strategy-deck'), ...drawn].some((c) => !inTheDeck.has(c.id))) keys.push(RESHUFFLED);
  }
  if (move.type === DISCARD_STRATEGY) keys.push(DISCARDED_AT_CLEANUP);
  if (move.type === PLAY_TRAINING && isTraining(card!)) {
    const target = cardById(before, move.onto as string)!;
    keys.push(`${TRAINING_ON}: ${nameOf(card!)} on a ${target.data?.role === 'Junior' ? 'Junior' : nameOf(target)}`);
  }
  if (Object.values(DECLARE).includes(move.type) && (runtime.workedValue(before, card!.id, 'skills') as number) > 0) {
    const asked = pressChoices(runtime, before, move);
    const answer = (answersOf(move)[0] ?? (typeof asked === 'string' ? undefined : asked[0]?.options[0]))?.toLowerCase();
    if (answer !== NATIVE_ANSWER[card!.data?.skill as string]) keys.push(`${TRAINED_DECLARED} ${answer}`);
  }
  if (engineRan) {
    const generating = atTheEngine(before, move, after);
    const leading = (staff: CardState) => ['leading software', 'leading hardware'].some((flag) => runtime.workedFlag(generating, staff.id, flag));
    const led = zoneCards(generating, zoneIdFor('development', by)).filter((project) =>
      cardsOn(generating, project.id).some((staff) => staff.data?.role === 'Junior' && staff.data?.badged === true && leading(staff)));
    keys.push(...led.map(() => BADGED_LEADING));
  }
  if (reached !== null) {
    const online = operationsOf(after, reached).filter((product) => product.data?.offline !== true);
    const flagged = (flag: string) => (staff: CardState) => runtime.workedFlag(after, staff.id, flag);
    const stopping = zoneCards(after, zoneIdFor('ops team', reached)).some(flagged('stopping decay'));
    for (const product of online.filter((p) => bugsOn(p) > 0 && !runtime.workedFlag(after, p.id, 'decaying'))) {
      if (cardsOn(after, product.id).some(flagged('waiving decay'))) keys.push(DECAY_WAIVED);
      if (stopping) keys.push(DECAY_STOPPED);
    }
    const trained = (product: CardState) => cardsOn(after, product.id).some((staff) => staff.data?.trait === 'Rainmaker'
      && staff.data?.onboarding !== true && tokenOn(staff, 'training xp') > 0);
    keys.push(...online.filter(trained).map(() => SALES_XP_BONUS));
  }
  const ended = before.result === undefined && after.result !== undefined;
  for (const c of after.cards) {
    const was = wasById.get(c.id);
    if (zoneInfo(game!, c.zoneId)?.spec.name !== 'milestones' || was?.zoneId === c.zoneId) continue;
    keys.push(`${CLAIMED}: ${nameOf(c)}`);
    if (ended) keys.push(CLAIMED_AT_THE_LAST_CHECK);
  }

  // Plan 6-2a's paths: the Attributes, their effects, TechCrunch Feature, Hype and Design Sprint.
  const rowOf = (zoneId: string) => zoneInfo(game!, zoneId)?.spec.name;
  if ([PLAY_TRAINING, PLAY_DEBUFF].includes(move.type) && [...BUFFS, ...DEBUFFS].includes(nameOf(card!) as string)) {
    keys.push(`${ATTRIBUTE_PLAYED}: ${nameOf(card!)}`);
    const row = rowOf(cardById(before, move.onto as string)!.zoneId);
    if (move.type === PLAY_TRAINING) keys.push(row === 'bench' ? BUFF_ON_BENCH : BUFF_ON_BOARD);
    else keys.push(row === 'development team' ? DEBUFF_ON_DEV : DEBUFF_ON_OPS);
  }
  const firing = [...FIRES, PIVOT].includes(move.type);
  for (const c of after.cards) {
    const was = wasById.get(c.id);
    if (was === undefined || attributesOn(was).length === 0) continue;
    const [fromRow, toRow] = [rowOf(was.zoneId), rowOf(c.zoneId)];
    if (firing && toRow === 'open job market' && ['development team', 'ops team'].includes(fromRow as string)) keys.push(ATTRIBUTES_FIRED);
    if (fromRow === 'bench' && toRow === 'open job market') keys.push(ATTRIBUTES_KEPT);
    if (move.type === HIRE_MARKET && c.id === move.cardId) keys.push(ATTRIBUTES_REHIRED);
    if (c.zoneId === 'box' && was.zoneId !== 'box') keys.push(ATTRIBUTES_BOXED);
  }
  if (engineRan) {
    const generating = atTheEngine(before, move, after);
    const flagged = (flag: string) => (staff: CardState) => runtime.workedFlag(generating, staff.id, flag);
    const leading = (staff: CardState) => ['leading software', 'leading hardware'].some((flag) => flagged(flag)(staff));
    const makes = (staff: CardState) => ['blue output', 'red output', 'qa output']
      .some((name) => ((runtime.workedValue(generating, staff.id, name) as number | null) ?? 0) > 0);
    const losing = [['losing blue', TOXIC_BLUE], ['losing red', TOXIC_RED], ['losing qa', TOXIC_QA]] as const;
    for (const project of zoneCards(generating, zoneIdFor('development', by))) {
      const staff = cardsOn(generating, project.id);
      if (!runtime.workedFlag(generating, project.id, 'stalled') && staff.some((s) => flagged('overworked')(s) && makes(s))) {
        keys.push(WORKAHOLIC_AT_ENGINE);
      }
      const visionaries = staff.filter((s) => tokenOn(s, 'visionary') === 1 && leading(s));
      if (project.data?.tier !== 'Tier 1' && visionaries.length > 0 && staff.filter(leading).length === visionaries.length) {
        keys.push(VISIONARY_LEADING);
      }
      for (const [flag, key] of losing) if (runtime.workedFlag(generating, project.id, flag)) keys.push(key);
      for (const burnedOut of staff.filter(flagged('burned out'))) {
        keys.push(BURNOUT_IDLE);
        if (flagged('managing')(burnedOut)) keys.push(BURNOUT_PM);
      }
    }
  }
  // No agency hire is here: the agency row's cards come from the talent deck, straight or through a scouting row, and it never
  // reshuffles, so they hold no Attributes (§13).
  if ([ASSIGN_TO_PROJECT, REASSIGN_FROM_PROJECT, REASSIGN_FROM_OPS].includes(move.type)) {
    for (const c of after.cards) {
      const holder = c.data?.[HOLDER_KEY];
      if (c.data?.trait !== 'Spaghetti Code' || tokenOn(c, 'clean coder') !== 1 || typeof holder !== 'string') continue;
      if (wasById.get(c.id)?.data?.[HOLDER_KEY] === holder || rowOf(cardById(after, holder)!.zoneId) !== 'development') continue;
      if (bugsOn(cardById(after, holder)!) <= bugsOn(cardById(before, holder)!)) keys.push(CLEAN_CODER_HACKER);
    }
  }
  if (passedTurn(before, after, by)) {
    // The viral cards spread their Bugs as the backlog cleanup ends, before the turn passes and lets every card settle in (§5).
    const shields = (staff: CardState) => tokenOn(staff, 'clean coder') === 1 && runtime.workedFlag(before, staff.id, 'clean coding');
    const guarding = zoneCards(before, zoneIdFor('ops team', by))
      .some((staff) => shields(staff) && runtime.workedFlag(before, staff.id, 'guarding the pool'));
    const shielded = operationsOf(before, by).filter((product) => {
      const on = cardsOn(before, product.id);
      return on.some((staff) => staff.data?.trait === 'Viral Loop') && (guarding || on.some(shields));
    });
    keys.push(...shielded.map(() => CLEAN_CODER_VIRAL));
  }
  if (reached !== null) {
    const poolLosing = (staff: CardState) =>
      ['pool losing blue', 'pool losing red', 'pool losing qa'].some((flag) => runtime.workedFlag(after, staff.id, flag));
    keys.push(...zoneCards(after, zoneIdFor('ops team', reached)).filter(poolLosing).map(() => TOXIC_OPS));
  }
  if (move.type === PLAY_TO_PRODUCT) {
    // A $2 TechCrunch Feature is the Sales Rep's only when the product's price is $2: Trade Show makes the card's $2 (plan 6-2b).
    const pitched = runtime.workedValue(before, move.onto as string, 'price') === 2;
    const price = techCrunchPrice(runtime, before, move.cardId as string, move.onto as string);
    if (price === 5) keys.push(TECHCRUNCH_5);
    else if (pitched) keys.push(TECHCRUNCH_2);
  }
  if (move.type === PLAY_ALONE) {
    const backlog = zoneIdFor('backlog', by);
    const dealt = zoneCards(after, backlog).filter((c) => cardById(before, c.id)?.zoneId !== backlog);
    keys.push(dealt.length === 5 ? SPRINT_5 : SPRINT_FEWER);
  }
  if (ended) {
    for (const seat of runtime.seats) {
      const hyped = operationsOf(after, seat).some((product) => product.data?.offline !== true && tokenOn(product, 'hype') > 0);
      if (hyped) keys.push(HYPE_SCORED);
    }
  }

  // Plan 6-2b's paths: the Events.
  const seats = runtime.seats as PlayerId[];
  if ((after.data[ROUND_KEY] as number) > (before.data[ROUND_KEY] as number)) {
    const revealed = eventOf(after);
    keys.push(`${EVENT_REVEALED}: ${revealed}`);
    if (zoneCards(before, 'event-deck').length === 0) keys.push(EVENTS_RESHUFFLED);
    if (revealed === 'Angel Investors') {
      const products = (seat: PlayerId) =>
        [...zoneCards(before, zoneIdFor('development', seat)), ...zoneCards(before, zoneIdFor('operations', seat))];
      keys.push(...seats.filter((seat) => products(seat).length > 0 && products(seat).every((product) => product.data?.tier === 'Tier 1'))
        .map(() => ANGEL_PAID));
    }
  }
  if (eventOf(after) === 'Regulation Audit') {
    keys.push(...stepsEndedIn(before, after, seats).filter((seat) => payrollTaxOf(runtime, after, seat) > 0).map(() => AUDIT_PAID));
  }
  if (before.turn?.phase === EVENT_CHECK && Object.values(LET_GO).includes(move.type)) keys.push(AUDIT_LET_GO);
  if (reached !== null) {
    const online = operationsOf(after, reached).filter((product) => product.data?.offline !== true);
    const event = eventOf(after);
    if (event === 'Tech Bubble' && online.length > 0) keys.push(BUBBLE_AT_INCOME);
    if (event === 'Legacy Code' && online.some((product) => bugsOn(product) > 0 && runtime.workedFlag(after, product.id, 'decaying'))) {
      keys.push(LEGACY_AT_INCOME);
    }
    const blueOf = (staff: CardState) => ((runtime.workedValue(after, staff.id, 'blue output') as number | null) ?? 0) > 0;
    if (event === 'Server Crash' && zoneCards(after, zoneIdFor('ops team', reached)).some(blueOf)) keys.push(CRASH_AT_INCOME);
  }
  if (engineRan) {
    const event = eventOf(before);
    const working = zoneCards(before, zoneIdFor('development', by)).filter((project) => !runtime.workedFlag(before, project.id, 'stalled'));
    // A staff card counts only where the Event's +1 or -1 applied to it: it holds the Event's flag and its output line is not zeroed by
    // onboarding, Burnout or a mode of another colour, whose lines come after the Event's (Blue output and Red output).
    const makes = (project: CardState, flag: string, zeroed: string[]) => cardsOn(before, project.id).some((staff) =>
      runtime.workedFlag(before, staff.id, flag) && !['onboarding', 'burned out', ...zeroed].some((name) => runtime.workedFlag(before, staff.id, name)));
    const atWork = { 'Open Source Boom': ['open source boosted', ['red mode', 'qa mode'], BOOM_AT_WORK],
      'Hardware Hackathon': ['hackathon boosted', ['qa mode', 'blue mode'], HACKATHON_AT_WORK],
      'Supply Chain Logjam': ['logjammed', ['qa mode', 'blue mode'], LOGJAM_AT_WORK] } as Record<string, [string, string[], string]>;
    if (event !== null && atWork[event] !== undefined) {
      const [flag, zeroed, key] = atWork[event];
      keys.push(...working.filter((project) => makes(project, flag, zeroed)).map(() => key));
    }
    if (event === 'Crunch Time') {
      for (const project of working) {
        keys.push(CRUNCH_CUBE, runtime.workedFlag(before, project.id, 'crunched') ? CRUNCH_BUG : CRUNCH_STOPPED);
      }
    }
  }
  const priced = eventOf(before);
  if (move.type === GREENLIGHT && priced === 'Patent Trolls' && gameNumber(before, game!, 'license') === 5) {
    const asked = pressChoices(runtime, before, move);
    if (typeof asked !== 'string' && asked.some(({ kind }) => kind === 'player')) keys.push(TROLLS_LICENSE);
  }
  if (priced === 'Chip Shortage') {
    const hired = move.type === RECRUITS[1] ? 1
      : HIRES.includes(move.type) ? [move.cardId, ...((move.cardIds as string[] | undefined) ?? [])]
        .filter((id): id is string => typeof id === 'string' && runtime.workedFlag(before, id, 'chip short')).length : 0;
    for (let i = 0; i < hired; i++) keys.push(CHIP_HIRE);
  }
  if (priced === 'Intern Season' && RECRUITS.includes(move.type)) keys.push(INTERN_RECRUIT);
  if (priced === 'Online Course Boom' && move.type === PLAY_TRAINING && isTraining(card!)) keys.push(COURSE_TRAINING);
  if (priced === 'Trade Show' && move.type === PLAY_TO_PRODUCT) keys.push(SHOW_TECHCRUNCH);
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
 * offline (§12, ruling 5), 2 points for each market share, the face value of each Milestone in the seat's milestones row (§12.5,
 * §20.G) and the Human Capital of every employee on the bench and on the Board (§12.6, ruling 25), less the backlog's vaporware.
 * Human Capital is counted from the cards' tokens, not read through the rules, so that the End's score checks the rules' `Human
 * capital:` section: a point for each Permanent XP token, Skill token and point of Training XP, and 2 for a Badge, whatever the card; a
 * Pending token, a native skill and a printed trait score nothing (§12.6). The invariants keep XP and Skill tokens on Juniors and
 * Training XP on the QA Engineer and the Sales Rep, where that section reads them.
 */
function scoreOf(state: GameState, seat: PlayerId): number {
  const vaporware = zoneCards(state, zoneIdFor('backlog', seat)).reduce((sum, card) => sum + VAPORWARE[card.data?.tier as string], 0);
  const online = operationsOf(state, seat).filter((product) => product.data?.offline !== true);
  // Each Hype on an Active product scores 5 (§12.1).
  const val = sum(online, 'val') + 5 * online.reduce((total, product) => total + tokenOn(product, 'hype'), 0);
  const staff = ['bench', 'development team', 'ops team'].flatMap((row) => zoneCards(state, zoneIdFor(row, seat)));
  const scored = [...JUNIOR_TOKENS, 'training xp'];
  const human = staff.reduce((total, card) =>
    total + scored.reduce((tokens, name) => tokens + tokenOn(card, name), 0) + (card.data?.badged === true ? 2 : 0), 0);
  const milestones = sum(zoneCards(state, zoneIdFor('milestones', seat)), 'vp');
  const capital = Math.floor(counterOf(state, 'capital', seat) / 5);
  return capital + val + 2 * counterOf(state, 'market share', seat) + milestones + human - vaporware;
}

/**
 * A watch that checks, after every move of a game at `seats` played from Setup, reading through `runtime` the values the rules work
 * out for cards, such as a salary:
 *
 * - Money is conserved: each seat's capital changes by what it earned less what it paid. The mover pays the bank 2 for a recruit,
 *   the card's cost for a hire from the agency row, 1 for one from the open job market, the total cost of the picked cards for a
 *   hire from its scouting, its payroll for paying salaries, the played card's price for a Training card or an Attribute, the lower of
 *   the card's price and the product's for a TechCrunch Feature (§20.A), and nothing for anything else but a Greenlight. The seat that
 *   reached its Income in the move (see `enteredIncome`) earns the total rev of its products in operation, as the rules work it out,
 *   and no one else earns anything.
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
 * - Agile: staff moved onto a project, by a reassign or by an assign from the bench, are spared the Onboarding token exactly when some
 *   card on the project was Agile before the move: a reassigned card is onboarding exactly when none was, and a card still onboarding on
 *   the bench, pivoted or recalled this turn, is no longer onboarding once assigned exactly when one was (§6, §11.E.3, ruling 8). Only
 *   where no turn starts in the move, since the end of a seat's actions may start the next turn, whose start clears every token (P8).
 * - Modes: no card off the Board, out of every development team and ops team, is in Red mode, QA mode or Blue mode. Red mode sits only
 *   on a card the rules call declarable, QA mode only on a QA Skill card, a qa card or one with a green Skill token, and Blue mode only
 *   on one with a blue Skill token. A card's mode changes only in a declaration of that card, or as it leaves the Board, so a mode stays
 *   on a card that moves between a project and the ops team (§11.C.2, ruling 24). A declaration leaves its card in the mode its answer
 *   names and in no other: Blue in none, but a card with a blue Skill token in Blue mode alone.
 * - XP and Skill tokens sit only on Juniors, never a Skill token in the colour a card works in already, and a Junior has at most 4 XP
 *   (§3, §11.A, §11.C.3). XP tokens rise only as a Junior graduates: in a Launch, by 1 at most on each card, or in a keep or a Mentor
 *   press, by 1 on the card pressed and on no other (§11.B.2, §20.B, ruling 25).
 * - Training (§6, §20.A): in a Training press the only card that leaves a Strategy Hand for the strategy discard is the one played, and
 *   it is a Training card; the press gives its target exactly one thing, one Skill token, one Training XP or the Badge it lacked, and
 *   changes nothing else of any card's tokens or Badge.
 * - A Buff (§20.A, the slice's R2): its press moves the card from its player's Strategy Hand to the attributes in play and gives its
 *   target 1 of its count, and no other card moves or changes its data.
 * - Pending: a card holds one Pending token of each colour at most, and only a Junior holds one. It gains one only as its owner's Engine
 *   runs, while it sits on a project in their development that was not Stalled as the Engine generated (see `atTheEngine`) (§3, §5
 *   Phase D, §11.B, ruling 1). It holds one only in a development team, or in the ops team of the seat whose turn is in Launch's
 *   graduation step, and a Launch with nothing to choose leaves its team holding none (§11.B.2).
 * - Graduation: a card is graduated, and a seat has mentoring, only while that seat's graduation step runs, the card in its ops team; the
 *   step ends by clearing both (§11.B.2, §20.B).
 * - Staff: Training XP sits only on a QA Engineer or a Sales Rep, 2 at most, and no Senior Developer is badged (§11.D, §11.F). No card is
 *   fired once a move is over. Staff fired from the Board, by a dismiss or a let-go at Income, reach the open job market with no token and
 *   no Badge; staff discarded from a bench, at the bench cleanup or for a Layoff, keep every one (§13.B, §15.A.3, §18.B).
 * - Ops: the seat that reached its Income in the move runs its online products within its ops team's supply, in Blue and in Red
 *   (§5 Phase B, ruling 19). A product goes offline or back online only in its owner's ops check: by a press there, as the check
 *   starts, or on the way through it to Income (ruling 25). At the end, a product goes back online in any move into, through or out
 *   of the final check before the score, but offline only by its owner's switch off in it (§12). A seat is choosing which products
 *   to run only while its turn is in its ops check, or its step in the final check, and always while either waits on it (§5 Phase B,
 *   §12, R1).
 * - Only the seat in the sourcing phase has cards in its scouting row.
 * - The Strategy cards (§3, §5 Phase D step 7, §6, §15.C, §20.A, ruling 10): the strategy deck, its discard, every Strategy Hand and
 *   every brainstorm row hold the 30 cards of §20.A between them, by name. A seat's brainstorm row holds cards, 3 at most, only while its
 *   turn is in the brainstorm step; a seat whose turn it is not holds 3 Strategy cards at most; and the strategy deck gains cards only
 *   in a Brainstorm, plain or flushing, as the discard is shuffled into it.
 * - The Milestones (§4.3, §12.5, §20.G): the milestone row and every milestones row hold 3 of the 6 between them, and the box the other
 *   3, or, in a game arranged without Setup, the milestone deck holds all 6. A card enters a milestones row only from the milestone row,
 *   and never leaves one. First Mover Advantage is claimed only in its seat's Launch of a Tier 2 card, Clean Launch only in its seat's
 *   Launch, and Revenue Leader only by the seat that reached its Income in the move (see `enteredIncome`) with an operational revenue
 *   of 10 or more, as the rules work it out. And each of those three is claimed at its moment whenever it is in the milestone row then:
 *   Clean Launch at any Launch and First Mover Advantage at a Tier 2 Launch, by the seat that launched, and Revenue Leader at an Income
 *   of 10 or more. No move changes how many the milestone deck, those rows and the box hold, so a game holds all 6 in the milestone
 *   deck only if it never ran Setup. Talent Magnet, Platform Power and Full Stack Founder enter a seat's milestones row only in a move
 *   after which that seat meets them, read through the rules: 2 cards on its bench or Board with more than 2 XP, 3 active Tags or more,
 *   and a product in operation on the hardware side and one on the software side (§20.G, ruling 25); and Platform Power and Full Stack
 *   Founder never while their seat is still choosing which products to run (R1).
 * - Each market refills at once: the agency row holds 4 and each product market 2 while its deck has cards, and the Market
 *   Crash is never anywhere but the growth deck or the crash pile.
 * - Each pool holds the 5 cards that entered it last, in the order they entered, every card it let go of is in the box, and
 *   nothing else ever goes there.
 * - Each turn that starts is the next seat's after the turn before, the first is the start player's, and a round starts with a
 *   turn exactly when that turn is the start player's.
 * - Every card in a player's bench, backlog, research, scouting, Strategy Hand or brainstorm row shows its back to every other player
 *   and its face to its owner (§15.C, the spec's anti-goal).
 */
function keepsTheRules(seats: PlayerId[], runtime: LangRuntime): Watch {
  const tableDef = tableDefFor(game!, seats);
  const owners = new Map(seats.flatMap((seat) => OWN_ROWS.map((row) => [zoneIdFor(row, seat), seat] as const)));
  /** The Board's staff rows, the only rows a card keeps a mode in (§11.C.2, ruling 24). */
  const teams = new Set(seats.flatMap((seat) => [zoneIdFor('development team', seat), zoneIdFor('ops team', seat)]));
  /** The benches, whose discards keep their tokens (§15.A.3). */
  const benches = new Set(seats.map((seat) => zoneIdFor('bench', seat)));
  /** Each pool's cards in the order they entered it, oldest first, less those taken or let go of. */
  let queues: Record<string, string[]> | null = null;
  /** The cards the pools have let go of. */
  const letGo: string[] = [];
  /** The seat whose turn started last. */
  let lastTurn: PlayerId | null = null;
  /** The row a zone is, by its name in the rules. */
  const rowOf = (zoneId: string) => zoneInfo(game!, zoneId)?.spec.name;

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
    // Every hiring price is read as the rules hold it before the move: the University's two game numbers, and each card's worked cost
    // and rehire price, which the Event in play may raise (§20.D 9, 14).
    const workedOf = (id: string, name: string) => runtime.workedValue(before, id, name) as number;
    const costOf = (ids: string[]) => ids.reduce((total, id) => total + workedOf(id, 'cost'), 0);
    const paid = move.type === RECRUITS[1] ? gameNumber(before, game!, 'hardware junior price')
      : RECRUITS.includes(move.type) ? gameNumber(before, game!, 'junior price')
      : AGENCY_HIRES.includes(move.type) ? workedOf(card!.id, 'cost')
        : move.type === HIRE_MARKET ? workedOf(card!.id, 'rehire price')
          : SOURCE_HIRES.includes(move.type) ? costOf(move.cardIds as string[])
            : move.type === PAY_SALARIES ? payrollOf(runtime, before, by)
              : [PLAY_TRAINING, PLAY_DEBUFF].includes(move.type) ? (runtime.workedValue(before, move.cardId as string, 'price') as number)
                : move.type === PLAY_TO_PRODUCT ? techCrunchPrice(runtime, before, move.cardId as string, move.onto as string) : 0;
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
      // A move in the round's steps, or one that revealed Angel Investors or Regulation Audit, is checked as a whole (Review Focus 2):
      // $3 to each seat the Angel Investors fund, as it stood before, and the tax of each seat whose step ended in it, on the Board it kept.
      const revealed = (after.data[ROUND_KEY] as number) > (before.data[ROUND_KEY] as number) ? eventOf(after) : null;
      const stepping = [before, after].some((state) => state.data[ROUND_STEPS_KEY] !== undefined)
        || revealed === 'Angel Investors' || revealed === 'Regulation Audit';
      const doneBefore = stepsDone(before, seats) ?? [];
      const ended = stepping ? (stepsDone(after, seats) ?? seats).filter((seat) => !doneBefore.includes(seat)) : [];
      const products = (state: GameState, seat: PlayerId) =>
        [...zoneCards(state, zoneIdFor('development', seat)), ...zoneCards(state, zoneIdFor('operations', seat))];
      const funded = (seat: PlayerId) => revealed === 'Angel Investors' && products(before, seat).length > 0
        && products(before, seat).every((product) => product.data?.tier === 'Tier 1');
      const taxOf = (seat: PlayerId) => (ended.includes(seat) && eventOf(after) === 'Regulation Audit' ? payrollTaxOf(runtime, after, seat) : 0);
      const want = seats.map((seat) => earned(seat) - (seat === by ? paid : 0) + (funded(seat) ? 3 : 0) - taxOf(seat));
      sameList(gained, want, () => `capital gained by ${seats.join(', ')} ${at}`);
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
        // 9 is the auto-player's bound, not the rules': it plays one Utility card a turn at most (see `utility`), so one Design Sprint
        // deals up to 5 past the 4 a turn's research leaves. Two Sprints in one turn could legally take the backlog higher. Cleanup cuts
        // it back to 3 either way (§20.A, §5 Phase D).
        atMost(own('backlog'), 9);
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
      // The Brainstorm look waits in its row only while its seat chooses the card it keeps, and a hand ends its turn at 3 at most
      // (§5 Phase D step 7, §6, ruling 10).
      atMost(own('brainstorm'), 3);
      if (size(own('brainstorm')) > 0) {
        sameAs(`${current} ${phase}`, `${seat} brainstorm`, () => `the turn while ${own('brainstorm')} has cards ${at}`);
      }
      if (seat !== current) atMost(own('strategy hand'), 3);
    }
    // Every Strategy card stays in the strategy deck, its discard, a Strategy Hand or a brainstorm row (§20.A), and only a Brainstorm
    // shuffles the discard back into the deck (§15.C).
    const strategyZones = [
      'strategy-deck', 'strategy-discard', ...seats.flatMap((seat) => [zoneIdFor('strategy hand', seat), zoneIdFor('brainstorm', seat)]),
    ];
    const boxedStrategy = zoneCards(after, 'box').filter((c) => Object.hasOwn(STRATEGY_CARDS, nameOf(c) as string));
    const strategy = nameCounts([...[...strategyZones, 'attributes-in-play'].flatMap((zoneId) => zoneCards(after, zoneId)), ...boxedStrategy]);
    if (Object.keys({ ...strategy, ...STRATEGY_CARDS }).some((name) => strategy[name] !== STRATEGY_CARDS[name])) {
      expect(strategy, `the Strategy cards ${at}`).toEqual(STRATEGY_CARDS);
    }
    const inTheDeck = new Set(zoneCards(before, 'strategy-deck').map((c) => c.id));
    const newInTheDeck = zoneCards(after, 'strategy-deck').filter((c) => !inTheDeck.has(c.id)).map((c) => `${c.id} (${nameOf(c)})`);
    noneOf([BRAINSTORM, BRAINSTORM_FLUSHING].includes(move.type) ? [] : newInTheDeck, () => `cards new in the strategy deck ${at}`);

    // The Milestones: Setup revealed 3 and boxed the rest (§4.3), and a revealed one is claimed into a milestones row for good, only at
    // its moment or once its seat meets it (§12.5, §20.G).
    const claimRows = new Set(seats.map((seat) => zoneIdFor('milestones', seat)));
    /** The milestone deck, the milestone row with the milestones rows, and the box: how many of the 6 each holds in `state`. */
    const splitOf = (state: GameState) => {
      const six = state.cards.filter((c) => MILESTONES.includes(nameOf(c) as string));
      const sixIn = (zoneIds: (zoneId: string) => boolean) => six.filter((c) => zoneIds(c.zoneId)).length;
      return [sixIn((z) => z === 'milestone-deck'), sixIn((z) => z === 'milestone-row' || claimRows.has(z)), sixIn((z) => z === 'box')];
    };
    // A game arranged without Setup, as the arranged tests below are, keeps all 6 in the milestone deck from its first move to its last,
    // and a game played from Setup never puts one back: no move changes the split.
    const split = splitOf(after);
    const where = 'in the milestone deck, the milestone row and the milestones rows, and the box';
    const claims = (sameValues(split, [0, 3, 3]) || sameValues(split, [6, 0, 0])) && sameValues(splitOf(before), split) ? []
      : [`${splitOf(before).join(', ')} before the move and ${split.join(', ')} after it ${where}`];
    for (const seat of seats) {
      const row = zoneIdFor('milestones', seat);
      for (const c of zoneCards(before, row)) {
        if (cardById(after, c.id)?.zoneId !== row) claims.push(`${c.id} (${nameOf(c)}) left ${row}`);
      }
      const launched = move.type === LAUNCH && by === seat;
      const revenue = () => runtime.playerValue(after, seat, 'operational revenue');
      // What a seat must meet after the move to claim the Milestones that wait on no moment (§20.G, ruling 25): 2 employees with 3 XP or
      // more, on the bench or the Board; 3 different Tags among its products online; and products online on both sides of the stack.
      const employees = () => ['bench', 'development team', 'ops team'].flatMap((name) => zoneCards(after, zoneIdFor(name, seat)));
      const experienced = () => employees().filter((c) => ((runtime.workedValue(after, c.id, 'xp') as number | null) ?? 0) > 2).length;
      const onSide = (side: string) => operationsOf(after, seat).some((c) => runtime.workedFlag(after, c.id, side));
      const meets: Record<string, () => boolean> = {
        'Talent Magnet': () => experienced() >= 2,
        'Platform Power': () => runtime.playerValue(after, seat, 'active tags') >= 3,
        'Full Stack Founder': () => onSide('hardware side') && onSide('software side'),
      };
      for (const c of zoneCards(after, row)) {
        const was = cardById(before, c.id)?.zoneId;
        if (was === row) continue;
        const name = nameOf(c) as string;
        const which = `${c.id} (${name}) entered ${row} from ${was}`;
        if (was !== 'milestone-row') claims.push(which);
        if (name === 'First Mover Advantage' && !(launched && card!.data?.tier === 'Tier 2')) claims.push(which);
        if (name === 'Clean Launch' && !launched) claims.push(which);
        if (name === 'Revenue Leader' && !(income === seat && revenue() >= 10)) {
          claims.push(`${which}, with ${revenue()} operational revenue and ${income ?? 'no seat'} reaching Income`);
        }
        if (name in meets && !meets[name]()) claims.push(`${which}, which ${seat} does not meet`);
        // Not from an Offline set its seat is still choosing (R1). Another seat may be choosing by then: a claim made before the turn
        // passed on to it stands.
        if (['Platform Power', 'Full Stack Founder'].includes(name) && playerFact(after, seat, CHOOSING) === true) {
          claims.push(`${which} while ${seat} is ${CHOOSING}`);
        }
      }
    }
    // And each one waiting on a moment is claimed at it while it is in the milestone row: Clean Launch by any Launch, First Mover
    // Advantage by a Launch of a Tier 2 card, both by the seat that launched, and Revenue Leader by the seat whose Income came to 10 or
    // more.
    const due: [string, PlayerId][] = [];
    if (move.type === LAUNCH) due.push(['Clean Launch', by]);
    if (move.type === LAUNCH && card!.data?.tier === 'Tier 2') due.push(['First Mover Advantage', by]);
    if (income !== null && runtime.playerValue(after, income, 'operational revenue') >= 10) due.push(['Revenue Leader', income]);
    for (const [name, seat] of due) {
      const revealed = zoneCards(before, 'milestone-row').some((c) => nameOf(c) === name);
      if (revealed && !zoneCards(after, zoneIdFor('milestones', seat)).some((c) => nameOf(c) === name)) {
        claims.push(`${name}, in the milestone row, not claimed by ${seat} at its moment`);
      }
    }
    noneOf(claims, () => `the Milestones ${at}`);

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
      const which = () => `${c.id} (${nameOf(c)}) in ${c.zoneId}`;
      const holder = c.data?.[HOLDER_KEY];
      const holderZone = typeof holder === 'string' ? cardById(after, holder)?.zoneId : undefined;
      if (holder !== undefined && (!holdersOf.has(c.zoneId) || holderZone !== holdersOf.get(c.zoneId))) {
        board.push(`${which()} is on ${JSON.stringify(holder)}, in ${holderZone}`);
      }
      if (holder !== undefined && !projectsOf.has(c.zoneId) && !runtime.workedFlag(after, c.id, 'attaching')) {
        board.push(`${which()} is on ${JSON.stringify(holder)} but is not attaching`);
      }
      if (holder === undefined && projectsOf.has(c.zoneId)) board.push(`${which()} is on no card`);
      const need = (color: string) => runtime.workedValue(after, c.id, `${color} need`) as number;
      for (const [color, cubesKey, cutKey] of TRACK_KEYS) {
        const cubes = cubesOn(c, cubesKey);
        // Off the Board a card has no cut, so its need is its cost, at least 0: only one with cubes can hold more than it.
        if ((cubes > 0 || built.has(c.zoneId)) && cubes > need(color)) {
          board.push(`${which()} has ${cubes} ${color} cubes for a need of ${need(color)}`);
        }
        const cut = c.data?.[cutKey];
        if (cut !== undefined && !built.has(c.zoneId)) board.push(`${which()} keeps a cut of ${cut} ${color} cubes`);
      }
      // The Engine's counts wait on a card only while its owner's turn is in the Engine: the cubes it generated until it commits them,
      // and the Bugs ops QA cleaned by a press until the step ends (§5 Phase D, R3).
      const owner = ownerOf.get(c.zoneId);
      const inTheEngine = owner !== undefined && current === owner && phase === 'engine';
      for (const kind of ENGINE_COUNTS) {
        if (cubesOn(c, kind) !== 0 && !inTheEngine) board.push(`${which()} keeps ${cubesOn(c, kind)} ${kind}`);
      }
      if (bugsOn(c) !== 0 && !built.has(c.zoneId)) board.push(`${which()} has ${bugsOn(c)} bugs`);
      // A Bug costs its product $1 of revenue, and a product earns at least $0 (§5 Phase B).
      if (operations.has(c.zoneId) && revOf(runtime, after, c) < 0) board.push(`${which()} earns ${revOf(runtime, after, c)}`);
      if (!developments.has(c.zoneId)) continue;
      for (const color of ['blue', 'red']) {
        const [cut, cost] = [cubesOn(c, `cut ${color} cubes`), (c.data?.[`${color} cost`] as number | undefined) ?? 0];
        if (cut > cost) board.push(`${which()} has a cut of ${cut} ${color} cubes for a cost of ${cost}`);
      }
      if (need('blue') + need('red') < 1) board.push(`${which()} needs ${need('blue')} blue and ${need('red')} red cubes`);
      // A project gains cubes only from a team that has its leads, as the team was when the Engine generated them (§3).
      const was = cardById(before, c.id);
      const rose = ['blue', 'red'].some((color) => cubesOn(c, `${color} cubes`) > (was === undefined ? 0 : cubesOn(was, `${color} cubes`)));
      if (rose && runtime.workedFlag(atGenerate(), c.id, 'stalled')) board.push(`${which()} gained cubes while it was stalled`);
    }
    noneOf(board, () => `the Board ${at}`);
    // The Diva's Ego keeps her where she works: no reassign the rules take moves her (§6, §20.B.1).
    if (REASSIGNS.includes(move.type) && Object.is(card!.data?.trait, 'Ego')) {
      expect(card!.data?.trait, `the trait of the card ${by} reassigned ${at}`).not.toBe('Ego');
    }
    // An Agile PM on a project spares the staff moved onto it the Onboarding token, as it was before the move: a PM arriving in the same
    // assign spares no one, and one reassigning itself is onboarding (§6, §11.E.3, ruling 8). The end of a seat's actions may start
    // the next turn, which clears every Onboarding token, so the check reads only a move that starts no turn (P8).
    if (started === null && [REASSIGN_FROM_PROJECT, REASSIGN_FROM_OPS, ASSIGN_TO_PROJECT].includes(move.type)) {
      const agile = cardsOn(before, move.onto as string).some((c) => runtime.workedFlag(before, c.id, 'agile'));
      const onboarding = (state: GameState, id: string) => cardById(state, id)?.data?.onboarding === true;
      const wrong = move.type === ASSIGN_TO_PROJECT
        ? (move.cardIds as string[]).filter((id) => onboarding(before, id) && onboarding(after, id) === agile)
        : [move.cardId as string].filter((id) => onboarding(after, id) === agile);
      noneOf(wrong.map((id) => `${id} (${nameOf(cardById(after, id)!)}) is ${agile ? '' : 'not '}onboarding`),
        () => `the staff moved onto ${move.onto}, which ${agile ? 'had' : 'had no'} Agile PM on it, ${at}`);
    }
    // A project Launches only with 0 Bugs (§6).
    if (move.type === LAUNCH) sameAs(bugsOn(card!), 0, () => `the Bugs on the project ${by} launched ${at}`);
    // Modes sit only on the Board, on a card that may take them, and change only by a declaration of that card or as it leaves the
    // Board (§11.C.2, ruling 24). A mode is on only when its flag is true: "It is not red mode." may leave the flag false.
    const declared = Object.values(DECLARE).includes(move.type) ? move.cardId as string : undefined;
    const wasById = new Map(before.cards.map((c) => [c.id, c]));
    const modes: string[] = [];
    for (const c of after.cards) {
      const which = () => `${c.id} (${nameOf(c)}) in ${c.zoneId}`;
      const was = wasById.get(c.id);
      const left = was !== undefined && teams.has(was.zoneId) && !teams.has(c.zoneId);
      for (const mode of MODES) {
        const now = c.data?.[mode] === true;
        if (now && !teams.has(c.zoneId)) modes.push(`${which()} is ${mode} off the Board`);
        // Red mode only on a declarable card; QA mode only on a QA Skill card, a qa card or one with a green Skill token.
        if (now && !(mode === 'red mode' ? runtime.workedFlag(after, c.id, 'declarable')
          : c.data?.trait === 'QA Skill' || c.data?.skill === 'qa' || tokenOn(c, 'green skill tokens') > 0)) modes.push(`${which()} is ${mode}, which it may not be`);
        if (now !== (was?.data?.[mode] === true) && c.id !== declared && !left) modes.push(`${which()} became ${now ? '' : 'not '}${mode}`);
      }
      // Blue mode only on a Board card with a blue Skill token, and it changes as the other modes do.
      const blue = c.data?.[BLUE_MODE] === true;
      if (blue && !teams.has(c.zoneId)) modes.push(`${which()} is ${BLUE_MODE} off the Board`);
      if (blue && tokenOn(c, 'blue skill tokens') === 0) modes.push(`${which()} is ${BLUE_MODE} with no blue Skill token`);
      if (blue !== (was?.data?.[BLUE_MODE] === true) && c.id !== declared && !left) modes.push(`${which()} became ${blue ? '' : 'not '}${BLUE_MODE}`);
    }
    noneOf(modes, () => `the modes ${at}`);
    if (declared !== undefined) {
      // A declaration leaves its card in the mode its answer names, or the press's only option, and in no other: Blue leaves a card with
      // a blue Skill token in blue mode (§11.C.2).
      const asked = pressChoices(runtime, before, move);
      const named = answersOf(move)[0] ?? (typeof asked === 'string' ? undefined : asked[0]?.options[0]);
      const held = [...MODES, BLUE_MODE].filter((mode) => cardById(after, declared)!.data?.[mode] === true);
      const trained = named === 'Blue' && tokenOn(cardById(before, declared)!, 'blue skill tokens') > 0;
      sameList(held, trained ? [BLUE_MODE] : MODES_DECLARED[named as string], () => `the modes ${declared} is in once declared ${named} ${at}`);
    }
    // XP and Skill tokens sit only on Juniors, never a Skill token in the colour a card works in already, and a Junior has at most 4 XP
    // (§3, §11.A, §11.C.3). XP tokens rise only as a Junior graduates: in a Launch, which graduates each Junior holding one Pending token,
    // by 1 at most on each card; or in a keep or a Mentor press, by 1 on the card pressed and on no other (§11.B.2, §20.B, ruling 25).
    const graduates = Object.values(KEEP_PENDING).includes(move.type) || move.type === MENTOR ? move.cardId : undefined;
    const tokens: string[] = [];
    for (const c of after.cards) {
      const which = () => `${c.id} (${nameOf(c)}) in ${c.zoneId}`;
      const junior = c.data?.role === 'Junior';
      if (!junior) for (const name of JUNIOR_TOKENS) if (tokenOn(c, name) > 0) tokens.push(`${which()} has ${tokenOn(c, name)} ${name}`);
      const native = NATIVE_SKILL[c.data?.skill as string];
      if (native !== undefined && tokenOn(c, native) > 0) tokens.push(`${which()} has ${tokenOn(c, native)} ${native}, its own colour`);
      const xp = junior ? runtime.workedValue(after, c.id, 'xp') as number : 0;
      if (xp > 4) tokens.push(`${which()} has ${xp} xp`);
      const was = wasById.get(c.id);
      const gained = XP_TOKENS.reduce((total, name) => total + Math.max(0, tokenOn(c, name) - (was === undefined ? 0 : tokenOn(was, name))), 0);
      if (c.id === graduates ? gained !== 1 : gained > (move.type === LAUNCH ? 1 : 0)) tokens.push(`${which()} gained ${gained} xp tokens`);
    }
    noneOf(tokens, () => `the XP and Skill tokens ${at}`);
    // Training plays only a Training card, which goes to the strategy discard, and changes nothing but its target's Skill tokens, Training
    // XP or Badge (§6, §20.A): never XP tokens, which rise only as a Junior graduates, nor any other card's tokens.
    if (move.type === PLAY_TRAINING && isTraining(card!)) {
      const hands = new Set(seats.map((seat) => zoneIdFor('strategy hand', seat)));
      const played = after.cards.filter((c) => c.zoneId === 'strategy-discard' && hands.has(wasById.get(c.id)?.zoneId as string));
      sameList(played.map((c) => c.id), [move.cardId], () => `the cards that left a Strategy Hand for the strategy discard ${at}`);
      const notTraining = played.filter((c) => !isTraining(c)).map((c) => `${c.id} (${nameOf(c)})`);
      noneOf(notTraining, () => `the Strategy cards played that are not Training ${at}`);
      const trained = ['blue skill tokens', 'red skill tokens', 'green skill tokens', 'training xp', 'badged'];
      /** A count read as a number, missing as 0, and the Badge as `=== true`, on a card that may not have been there before. */
      const held = (c: CardState | undefined, name: string) =>
        (name === 'badged' ? c?.data?.badged === true : c === undefined ? 0 : tokenOn(c, name));
      const changed = after.cards.flatMap((c) => [...TOKENS, 'badged']
        .filter((name) => held(c, name) !== held(wasById.get(c.id), name) && !(c.id === move.onto && trained.includes(name)))
        .map((name) => `${c.id} (${nameOf(c)}) in ${c.zoneId}: ${name} ${held(wasById.get(c.id), name)} → ${held(c, name)}`));
      noneOf(changed, () => `the tokens and Badges a Training press changed, other than its target's Skill tokens, Training XP or Badge ${at}`);
      // And it gives its target exactly one thing: one Skill token, one point of Training XP, or the Badge it lacked (§20.A).
      const [was, target] = [wasById.get(move.onto as string), cardById(after, move.onto as string)];
      const effects = trained.filter((name) => held(target, name) !== held(was, name));
      const once = (name: string) =>
        (name === 'badged' ? held(target, name) === true : held(target, name) === (held(was, name) as number) + 1);
      if (!(effects.length === 1 && once(effects[0]))) {
        const what = effects.map((name) => `${name} ${held(was, name)} → ${held(target, name)}`).join(', ') || 'nothing';
        sameAs(what, 'one Skill token, one Training XP or the Badge', () => `what ${move.cardId} gave its target ${move.onto} ${at}`);
      }
    }
    // A Buff leaves its player's Strategy Hand for the attributes in play and gives its target 1 of its count (§20.A, the slice's R2),
    // and that is all it does on the table: no other card moves, and no card's tokens, flags or place on a card change but that one
    // count. What it costs is the money check's above, and the hand's other cards only slide along, which their zones and data don't show.
    if (move.type === PLAY_TRAINING && BUFFS.includes(nameOf(card!) as string)) {
      const count = ATTRIBUTES[nameOf(card!) as string];
      /** The data keys whose values differ between `was` and `now`, a key missing on one side included. */
      const differs = (was: CardState, now: CardState) =>
        [...new Set([...Object.keys(was.data ?? {}), ...Object.keys(now.data ?? {})])]
          .filter((key) => JSON.stringify(was.data?.[key]) !== JSON.stringify(now.data?.[key]));
      const buffed: string[] = [];
      for (const c of after.cards) {
        const was = wasById.get(c.id);
        const which = `${c.id} (${nameOf(c)})`;
        if (was === undefined) {
          buffed.push(`${which} appeared in ${c.zoneId}, expected no new card`);
          continue;
        }
        const [from, to] = c.id === move.cardId ? [zoneIdFor('strategy hand', by), 'attributes-in-play'] : [was.zoneId, was.zoneId];
        if (was.zoneId !== from || c.zoneId !== to) {
          buffed.push(`${which} went from ${was.zoneId} to ${c.zoneId}, expected ${from} to ${to}`);
        }
        const changed = differs(was, c);
        const expected = c.id === move.onto ? [count] : [];
        if (!sameValues(changed, expected)) {
          buffed.push(`${which} changed ${changed.join(', ') || 'nothing'}, expected ${expected.join(', ') || 'nothing'}`);
        }
      }
      const [was, target] = [wasById.get(move.onto as string), cardById(after, move.onto as string)];
      const [had, has] = [was === undefined ? 0 : tokenOn(was, count), target === undefined ? 0 : tokenOn(target, count)];
      if (has !== had + 1) buffed.push(`${move.onto} went from ${had} to ${has} ${count}, expected ${had + 1}`);
      noneOf(buffed, () => `what a Buff press changed, other than its card's place and its target's ${count} ${at}`);
    }
    // The Attributes (§15.C, §20.A, the slice's R2): each Attribute card is in the attributes in play exactly when its count is 1 on some
    // card not in the box; no card holds more than 1 of any; only staff hold one; a count rises only on the target of a press of that
    // Attribute, by 1, and a Debuff's target is in another seat.
    const attributes: string[] = [];
    const inPlay = new Set(zoneCards(after, 'attributes-in-play').map((c) => nameOf(c) as string));
    for (const [name, count] of Object.entries(ATTRIBUTES)) {
      const held = after.cards.some((c) => c.zoneId !== 'box' && tokenOn(c, count) === 1);
      if (inPlay.has(name) !== held) attributes.push(`${name} ${inPlay.has(name) ? 'is' : 'is not'} in the attributes in play, ${held ? '' : 'not '}held`);
    }
    const pressed = [PLAY_TRAINING, PLAY_DEBUFF].includes(move.type) ? ATTRIBUTES[nameOf(card!) as string] : undefined;
    for (const c of after.cards) {
      const was = wasById.get(c.id);
      for (const count of ATTRIBUTE_COUNTS) {
        const now = tokenOn(c, count);
        if (now > 1) attributes.push(`${c.id} (${nameOf(c)}) holds ${now} ${count}`);
        if (now > 0 && !['Senior Developer', 'Specialist', 'Junior'].includes(c.data?.role as string)) attributes.push(`${c.id} (${nameOf(c)}) holds ${count}`);
        const rose = now - (was === undefined ? 0 : tokenOn(was, count));
        if (rose > 0 && !(c.id === move.onto && count === pressed && rose === 1)) attributes.push(`${c.id} (${nameOf(c)}) gained ${rose} ${count}`);
      }
      // Where a count falls (§15.A.3–4, §15.C, §18.B, R2): fired from the Board, it leaves and its card goes to the strategy discard;
      // evicted to the box, its card goes there too; benched, laid off or rehired, the card keeps it.
      if (was === undefined) continue;
      const held = attributesOn(was);
      // A card that held no count and holds none has none to keep, leave or lose: every branch below would find nothing.
      if (held.length === 0 && attributesOn(c).length === 0) continue;
      const [fromRow, toRow] = [rowOf(was.zoneId), rowOf(c.zoneId)];
      const fired = ['development team', 'ops team'].includes(fromRow as string) && toRow === 'open job market'
        && [DISMISS_FROM_PROJECT, DISMISS_FROM_OPS, ...Object.values(LET_GO), PIVOT].includes(move.type);
      const evicted = fromRow === 'open job market' && toRow === 'box';
      const kept = (fromRow === 'bench' && toRow === 'open job market' && [DISCARD_BENCH, LAY_OFF].includes(move.type))
        || (['development team', 'ops team'].includes(fromRow as string) && toRow === 'bench' && [RECALL, PIVOT].includes(move.type))
        || (fromRow === 'open job market' && toRow === 'bench' && move.type === HIRE_MARKET);
      const parked = (name: string) => after.cards.find((a) => nameOf(a) === name)?.zoneId;
      const named = (count: string) => Object.keys(ATTRIBUTES).find((name) => ATTRIBUTES[name] === count)!;
      if (fired || evicted) {
        if (attributesOn(c).length > 0) attributes.push(`${c.id} (${nameOf(c)}) still holds ${attributesOn(c).join(', ')} ${fired ? 'fired' : 'evicted'}`);
        for (const count of held) {
          const where = parked(named(count));
          if (where !== (fired ? 'strategy-discard' : 'box')) attributes.push(`${named(count)} is in ${where} after ${c.id} was ${fired ? 'fired' : 'evicted'}`);
        }
      } else if (kept) {
        sameList(attributesOn(c), held, () => `the counts ${c.id} (${nameOf(c)}) kept ${at}`);
      } else {
        const fell = held.filter((count) => tokenOn(c, count) < tokenOn(was, count));
        if (fell.length > 0) attributes.push(`${c.id} (${nameOf(c)}) lost ${fell.join(', ')} from ${fromRow} to ${toRow}`);
      }
    }
    if (move.type === PLAY_DEBUFF && zoneInfo(game!, cardById(before, move.onto as string)!.zoneId)?.seat === by) {
      attributes.push(`a Debuff on ${move.onto}, in ${by}'s own zone`);
    }
    noneOf(attributes, () => `the Attributes ${at}`);
    // Hype (§20.A, §12.1): only on a product in operation; it rises only on a TechCrunch Feature's target, by 1, and never falls. A Design
    // Sprint deals to its player's backlog what the seed deck lost, 5 at most. No Utility card is ever parked with the Attributes.
    const hype: string[] = [];
    for (const c of after.cards) {
      const now = tokenOn(c, 'hype');
      const was = wasById.get(c.id);
      const rose = now - (was === undefined ? 0 : tokenOn(was, 'hype'));
      if (now > 0 && zoneInfo(game!, c.zoneId)?.spec.name !== 'operations') hype.push(`${c.id} (${nameOf(c)}) holds hype in ${c.zoneId}`);
      if (rose < 0) hype.push(`${c.id} (${nameOf(c)}) lost ${-rose} hype`);
      if (rose > 0 && !(move.type === PLAY_TO_PRODUCT && c.id === move.onto && rose === 1)) hype.push(`${c.id} (${nameOf(c)}) gained ${rose} hype`);
    }
    if (move.type === PLAY_ALONE) {
      const backlog = zoneIdFor('backlog', by);
      const lost = zoneCards(before, 'seed-deck').filter((c) => cardById(after, c.id)?.zoneId !== 'seed-deck').map((c) => c.id);
      const dealt = zoneCards(after, backlog).filter((c) => cardById(before, c.id)?.zoneId !== backlog).map((c) => c.id);
      sameList(dealt.sort(), lost.sort(), () => `the seed cards a Design Sprint dealt ${at}`);
      if (dealt.length > 5) hype.push(`a Design Sprint dealt ${dealt.length}`);
    }
    for (const c of zoneCards(after, 'attributes-in-play')) {
      if (['TechCrunch Feature', 'Design Sprint', 'Cease & Desist'].includes(nameOf(c) as string)) hype.push(`${nameOf(c)} in the attributes in play`);
    }
    noneOf(hype, () => `Hype and the Utility cards ${at}`);
    // Workaholic's +$2 salary (§20.A): an overworked card on the Board is paid at least $2.
    const staffZones = new Set(seats.flatMap((seat) => [zoneIdFor('development team', seat), zoneIdFor('ops team', seat)]));
    noneOf(after.cards.filter((c) => staffZones.has(c.zoneId) && runtime.workedFlag(after, c.id, 'overworked')
      && ((runtime.workedValue(after, c.id, 'salary') as number | undefined) ?? 0) < 2).map((c) => `${c.id} (${nameOf(c)})`),
      () => `overworked staff paid less than $2 ${at}`);
    // Burnout (R3): its staff member makes nothing in any colour and gives no Synergy. Toxic Personality (R1): a team's made values and an
    // ops team's supplies are what it makes less exactly 1 cube, off the first colour made, while its Toxic card works (see `toxicCube`).
    const toxicity: string[] = [];
    for (const c of after.cards) {
      if (staffZones.has(c.zoneId) && tokenOn(c, 'burnout') > 0) {
        for (const name of ['blue output', 'red output', 'qa output']) {
          const value = runtime.workedValue(after, c.id, name) as number | null;
          if (value !== null && value !== 0) toxicity.push(`${c.id} (${nameOf(c)}) burned out with ${name} ${value}`);
        }
        if (runtime.workedFlag(after, c.id, 'giving synergy')) toxicity.push(`${c.id} (${nameOf(c)}) burned out giving synergy`);
      }
      // Only a team with a Toxic card on it can make less than its team value, so only such a project is worked out (time).
      const toxic = rowOf(c.zoneId) === 'development'
        ? cardsOn(after, c.id).find((on) => tokenOn(on, 'toxic personality') > 0) : undefined;
      if (toxic !== undefined) {
        const read = (names: readonly string[]) => names.map((name) => runtime.workedValue(after, c.id, name) as number);
        toxicity.push(...toxicCube(`${c.id} (${nameOf(c)})`, read(TEAM), read(MADE), toxic.data?.onboarding !== true));
      }
    }
    // An ops team's supplies likewise, from the Blue and Red bandwidth and the QA output its cards give, which is all a supply adds up
    // before the cube (§5): only a seat with a Toxic card in its ops team is worked out (time).
    for (const seat of seats) {
      const team = zoneCards(after, zoneIdFor('ops team', seat));
      const toxic = team.find((on) => tokenOn(on, 'toxic personality') > 0);
      if (toxic === undefined) continue;
      const given = ['blue bandwidth', 'red bandwidth', 'qa output']
        .map((name) => team.reduce((total, on) => total + ((runtime.workedValue(after, on.id, name) as number | null) ?? 0), 0));
      const supplies = ['blue supply', 'red supply', 'qa supply'].map((name) => runtime.playerValue(after, seat, name));
      toxicity.push(...toxicCube(`${seat}'s ops team`, given, supplies, toxic.data?.onboarding !== true));
    }
    noneOf(toxicity, () => `Toxic Personality and Burnout ${at}`);
    // The Events' output lines (Review Focus 4): no Board card's output or Blue bandwidth is below 0, and a card's Blue or Red output
    // changes only in a move that changed the Event in play or the card itself (its counts, mode flags, onboarding or zone): a modifier
    // never acts outside its round.
    const outputs: string[] = [];
    const eventMoved = eventOf(before) !== eventOf(after);
    for (const c of after.cards) {
      if (!staffZones.has(c.zoneId)) continue;
      // Each value of `after` is read once: the Blue and Red outputs, first, are also what the second half compares.
      const values = OUTPUT_NAMES.map((name) => runtime.workedValue(after, c.id, name) as number | null);
      for (const [i, name] of OUTPUT_NAMES.entries()) {
        const value = values[i];
        if (value !== null && value < 0) outputs.push(`${c.id} (${nameOf(c)}) has ${name} ${value}`);
      }
      if (eventMoved || wasById.get(c.id) !== c) continue;
      for (const [i, name] of ['blue output', 'red output'].entries()) {
        const [was, now] = [runtime.workedValue(before, c.id, name), values[i]];
        if (was !== now) outputs.push(`${c.id} (${nameOf(c)}): ${name} ${was} → ${now}`);
      }
    }
    noneOf(outputs, () => `the outputs ${at}`);
    // The Hacker with Clean Coder adds no Bug to a project he joins (§20.B "unless he has Clean Code himself").
    if ([...REASSIGNS, ...HIRES, ASSIGN_TO_PROJECT].includes(move.type)) {
      for (const c of after.cards) {
        const was = wasById.get(c.id);
        const holder = c.data?.[HOLDER_KEY] as string | undefined;
        if (c.data?.trait !== 'Spaghetti Code' || tokenOn(c, 'clean coder') !== 1 || holder === undefined || was?.data?.[HOLDER_KEY] === holder) continue;
        const project = cardById(after, holder)!;
        if (bugsOn(project) > bugsOn(cardById(before, holder) ?? project)) attributes.push(`${holder} gained a Bug from ${c.id}`);
      }
      noneOf(attributes, () => `the Hacker's Bugs ${at}`);
    }
    // A card holds one Pending token of each colour at most, and gains one only as its owner's Engine runs, while it sits on a project
    // in their development that was not Stalled as the Engine generated, since a Stalled team makes nothing (see `atTheEngine`) (§3, §5
    // Phase D, §11.B, ruling 1). Only a Junior learns, so only a Junior holds one (§11.B). It holds one only in a development team, or in
    // the ops team of the seat whose turn is in Launch's graduation step: the step ends by returning every token its ops team still holds
    // to the supply (§11.B.2).
    const engineRan = ranTheEngine(before, after, by);
    const graduating = phase === GRADUATION ? current as PlayerId : null;
    const developmentTeams = new Set(seats.map((seat) => zoneIdFor('development team', seat)));
    const mayHoldPending = (zoneId: string) => developmentTeams.has(zoneId)
      || (graduating !== null && zoneId === zoneIdFor('ops team', graduating));
    const pending: string[] = [];
    const [byTeam, byDevelopment] = [zoneIdFor('development team', by), zoneIdFor('development', by)];
    for (const c of after.cards) {
      const which = () => `${c.id} (${nameOf(c)}) in ${c.zoneId}`;
      const was = wasById.get(c.id);
      const holder = c.data?.[HOLDER_KEY];
      const onProject = c.zoneId === byTeam && typeof holder === 'string' && cardById(after, holder)?.zoneId === byDevelopment;
      for (const name of PENDING) {
        const held = tokenOn(c, name);
        if (held > 1) pending.push(`${which()} has ${held} ${name}`);
        if (held > 0 && c.data?.role !== 'Junior') pending.push(`${which()} holds ${held} ${name}, though it is no Junior`);
        if (held > 0 && !mayHoldPending(c.zoneId)) pending.push(`${which()} holds ${held} ${name} out of a development team`);
        const rose = held > (was === undefined ? 0 : tokenOn(was, name));
        if (rose && !(engineRan && onProject)) {
          pending.push(`${which()} gained ${name} ${engineRan ? `off a project of ${by}` : `with no Engine run for ${by}`}`);
        }
        if (rose && onProject && runtime.workedFlag(atGenerate(), holder as string, 'stalled')) {
          pending.push(`${which()} gained ${name} on ${holder}, which was stalled`);
        }
      }
      // A Junior is graduated only while its owner's graduation step runs, in their ops team: the step ends by clearing it (§11.B.2).
      if (c.data?.graduated === true && !(graduating !== null && c.zoneId === zoneIdFor('ops team', graduating))) {
        pending.push(`${which()} is graduated, with ${graduating === null ? 'no seat' : graduating} in graduation`);
      }
    }
    // The Veteran's Mentor waits on a seat only through its graduation step, which ends by setting it back to 0 (§20.B).
    for (const seat of seats) {
      const mentoring = (playerFact(after, seat, 'mentoring') as number | null) ?? 0;
      if (mentoring !== 0 && seat !== graduating) pending.push(`${seat} has ${mentoring} mentoring`);
    }
    // A Launch that leaves no choice to make graduates at once, so its team reaches the ops team holding no Pending token (§11.B.2).
    if (move.type === LAUNCH && phase !== GRADUATION) {
      for (const c of after.cards) {
        const held = PENDING.filter((name) => tokenOn(c, name) > 0);
        if (zoneInfo(game!, c.zoneId)?.seat === by && !developmentTeams.has(c.zoneId) && held.length > 0) {
          pending.push(`${c.id} (${nameOf(c)}) in ${c.zoneId} holds ${held.join(', ')} after a Launch with no graduation step`);
        }
      }
    }
    noneOf(pending, () => `the Pending tokens ${at}`);
    // Training XP sits only on a QA Engineer or a Sales Rep, 2 at most, and no Senior Developer earns a Badge (§11.D, §11.F). A card is
    // fired only while the rules strip it, so none is fired once a move is over. Staff fired from the Board, dismissed or let go unpaid,
    // reach the open job market with no token and no Badge; staff discarded from a bench, at the bench cleanup or for a Layoff, keep
    // every one (§13.B, §15.A.3, §18.B).
    const firing = FIRES.includes(move.type);
    const staff: string[] = [];
    for (const c of after.cards) {
      const which = () => `${c.id} (${nameOf(c)}) in ${c.zoneId}`;
      const training = tokenOn(c, 'training xp');
      if (training > 0 && !TRAINED.includes(c.data?.trait as string)) staff.push(`${which()} has ${training} training xp`);
      if (training > 2) staff.push(`${which()} has ${training} training xp, more than 2`);
      if (c.data?.role === 'Senior Developer' && c.data?.badged === true) staff.push(`${which()} is a badged Senior Developer`);
      if (c.data?.fired === true) staff.push(`${which()} is fired`);
      const was = wasById.get(c.id);
      if (c.zoneId !== 'open-job-market' || was === undefined || was.zoneId === c.zoneId) continue;
      if (firing && teams.has(was.zoneId) && holding(c) !== '') staff.push(`${which()}, fired from ${was.zoneId}, holds ${holding(c)}`);
      if (benches.has(was.zoneId) && holding(c) !== holding(was)) {
        staff.push(`${which()}, discarded from ${was.zoneId}, holds ${holding(c) || 'nothing'} where it held ${holding(was) || 'nothing'}`);
      }
    }
    noneOf(staff, () => `the Training XP, Badges and firing of staff ${at}`);

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
    // A seat is choosing which products to run only while its own ops check waits on it, or its own step of the final check: the flag
    // clears as the check passes, by a confirm or on the way through it (§5 Phase B, §12, R1).
    const choosing = seats.filter((seat) => playerFact(after, seat, CHOOSING) === true)
      .filter((seat) => !(seat === current && (phase === 'ops check' || phase === FINAL_CHECK)));
    noneOf(choosing.map((seat) => `${seat} is ${CHOOSING} in ${current}'s ${phase}`), () => `the seats choosing their products ${at}`);
    // And a seat whose ops check, or whose step of the final check, waits on its presses is choosing: the flag is set as each starts.
    const waiting = after.result === undefined && (phase === 'ops check' || phase === FINAL_CHECK) ? [current as PlayerId] : [];
    const undecided = waiting.filter((seat) => playerFact(after, seat, CHOOSING) !== true).map((seat) => `${seat} in its ${phase}`);
    noneOf(undecided, () => `the seats not ${CHOOSING} while their check waits on them ${at}`);

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
    // Besides the pools, only an evicted Talent's Attribute cards go there, from the attributes in play (§15.A.4, R2).
    const parkedBoxed = box.filter((id) => !boxed.has(id) && cardById(before, id)?.zoneId === 'attributes-in-play');
    sameList(box.filter((id) => !boxed.has(id)).sort(), [...letGoNow, ...parkedBoxed].sort(), () => `cards new in the box ${at}`);

    // Turns: each one that starts is the next seat's. A round starts as the start player's turn starts or, when it opens with steps (the
    // event check), as they start: the start player's turn then waits for them, and starts in no new round (6-1's round steps).
    const rounds = (after.data[ROUND_KEY] as number) - (before.data[ROUND_KEY] as number);
    if (started !== null) {
      sameAs(started, seats[(seats.indexOf(lastTurn) + 1) % seats.length], () => `the turn that started ${at}`);
      lastTurn = started;
    }
    const waited = roundStepsOf(before) !== null;
    const stepsStarted = !waited && roundStepsOf(after) !== null;
    sameAs(rounds, stepsStarted || (!waited && started !== null && started === startPlayerOf(after, seats)) ? 1 : 0, () => `rounds started ${at}`);

    // The Events (§5 Phase A, §15.D, the spec's Proof 2): the 18 are conserved, by name, in the event deck, the event in play and the
    // event discard; one is in play once one has been revealed; the one in play changes only in a move in which a round started, the one
    // before then in the discard or, after a reshuffle, in the deck or in play again; and the deck gains cards only then, from empty.
    const eventsIn = (state: GameState) => nameCounts(EVENT_ZONES.flatMap((zoneId) => zoneCards(state, zoneId)));
    const allEvents = eventsIn(after);
    if (Object.keys(allEvents).length !== EVENTS.length || EVENTS.some((name) => allEvents[name] !== 1)) {
      expect(allEvents, `the Events ${at}`).toEqual(Object.fromEntries(EVENTS.map((name) => [name, 1])));
    }
    const [eventBefore, eventAfter] = [eventOf(before), eventOf(after)];
    // A game arranged without Setup starts with none in play, though its first round has started; its next Round Start reveals one.
    if (eventBefore !== null || rounds > 0) sameAs(zoneCards(after, 'event-in-play').length, 1, () => `the Events in play ${at}`);
    // The round's prices (Review Focus 3, the spec's anti-goal): set again at every Round Start, then changed by the Event in play only.
    if (eventAfter !== null) {
      sameAs(gameNumber(after, game!, 'license'), eventAfter === 'Patent Trolls' ? 5 : 3, () => `the license ${at}`);
      sameAs(gameNumber(after, game!, 'junior price'), eventAfter === 'Intern Season' ? 0 : 2, () => `the junior price ${at}`);
      const hardware = eventAfter === 'Intern Season' ? 0 : eventAfter === 'Chip Shortage' ? 5 : 2;
      sameAs(gameNumber(after, game!, 'hardware junior price'), hardware, () => `the hardware junior price ${at}`);
    }
    // Crunch Time (§20.D 10): a move that ran the mover's Engine gave each of their projects that was not Stalled exactly 1 Bug more,
    // unless a working Clean Code unit was on it, before Development QA cleaned what it could.
    if (eventBefore === 'Crunch Time' && ranTheEngine(before, after, by)) {
      const crunched: string[] = [];
      for (const project of zoneCards(before, zoneIdFor('development', by))) {
        const now = cardById(after, project.id);
        if (now === undefined || now.zoneId !== project.zoneId || runtime.workedFlag(before, project.id, 'stalled')) continue;
        const clean = cardsOn(before, project.id).some((c) => runtime.workedFlag(before, c.id, 'clean coding'));
        const want = Math.max(0, bugsOn(project) + (clean ? 0 : 1) - (runtime.workedValue(before, project.id, 'qa made') as number));
        if (bugsOn(now) !== want) crunched.push(`${project.id} (${nameOf(project)}) has ${bugsOn(now)} bugs, not ${want}`);
      }
      noneOf(crunched, () => `Crunch Time's Bugs ${at}`);
    }
    // The event check runs only in the round's steps, under Angel Investors or Regulation Audit; a let-go there takes a taxed card.
    if (after.turn?.phase === EVENT_CHECK) {
      const steps = roundStepsOf(after);
      if (!(steps !== null && steps !== true && steps.phase === EVENT_CHECK)) expect(steps, `the round's steps in the event check ${at}`).toMatchObject({ phase: EVENT_CHECK });
      if (!['Angel Investors', 'Regulation Audit'].includes(eventAfter ?? '')) expect(eventAfter, `the Event in the event check ${at}`).toMatch(/Angel Investors|Regulation Audit/);
    }
    if (before.turn?.phase === EVENT_CHECK && Object.values(LET_GO).includes(move.type)) {
      if (runtime.workedFlag(before, move.cardId as string, 'taxed') !== true) expect.fail(`${move.cardId} let go in the event check untaxed ${at}`);
    }
    const deckNames = (state: GameState) => zoneCards(state, 'event-deck').map(nameOf).sort();
    if (rounds === 0) {
      sameAs(eventAfter, eventBefore, () => `the Event in play ${at}, in which no round started`);
      const gained = deckNames(after).filter((name) => !deckNames(before).includes(name));
      noneOf(gained, () => `Events new in the event deck ${at}, in which no round started`);
    } else {
      if (eventBefore !== null) {
        const went = EVENT_ZONES.find((zoneId) => zoneCards(after, zoneId).some((c) => nameOf(c) === eventBefore));
        const reshuffled = zoneCards(before, 'event-deck').length === 0;
        if (!(went === 'event-discard' || (reshuffled && (went === 'event-deck' || went === 'event-in-play')))) {
          sameAs(went, 'event-discard', () => `where the Event in play before ${at} went`);
        }
      }
      const gained = deckNames(after).filter((name) => !deckNames(before).includes(name));
      if (zoneCards(before, 'event-deck').length > 0) noneOf(gained, () => `Events new in the event deck ${at}, which was not empty`);
    }

    // Hidden zones: only the owner sees the face of a card in their bench, backlog, research, scouting, Strategy Hand or brainstorm row.
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
    // The start player's own step can end a round's steps, and so start its own turn (6-1's round steps).
    const expected = seats.map((seat) => {
      if (seat === started) return ACTIONS_EACH_TURN;
      if (seat === by) return move.type === END_ACTIONS ? 0 : actions(before, by) - cost;
      return actions(before, seat);
    });
    sameList(seats.map((seat) => actions(after, seat)), expected, () => `actions of ${seats.join(', ')} ${at}`);
  };
}

describe('Startup Simulator (designer language)', () => {
  it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));

  it('passes every example', () => {
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(307);
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
    // (§5 Phase D, R3). Their operational revenue is the rev of their products in operation, which Revenue Leader reads at Income
    // (§9.A, §20.G). Their active tags are the different Tags of their products online, which Platform Power reads (§20.G, ruling 5).
    expect(Object.keys(game!.playerValues!)).toEqual([
      'blue supply', 'red supply', 'blue demand', 'red demand', 'blue load', 'red load', 'qa supply', 'bug load', 'qa spent', 'bugged products',
      'operational revenue', 'active tags',
    ]);
  });

  it('works out slice 5’s values and flags for cards: XP and Skill tokens, the XP of the colour worked in, the salary bump, Badge points and Human Capital, learning, graduation, the QA Engineer’s and the Sales Rep’s Bug Decay, the PMs’ Synergy and Agile, and the side of the stack a product is on (§3, §5, §11, §12, §20.B, §20.G)', () => {
    const worked = game!.worked!;
    // A Junior's XP and its Skill tokens, of every colour, are numbers of their own: 2 XP or more raise its salary to $1 (§3, §11.A.3),
    // and a Skill token makes it declarable (§11.C.2).
    expect(worked.xp).toMatchObject({ kind: 'number', refines: false });
    expect(worked.skills).toMatchObject({ kind: 'number', refines: false });
    expect(worked.experienced).toMatchObject({ kind: 'flag' });
    // Its XP adds to its output only in the colour it works in (§11.C.3).
    for (const name of ['working blue xp', 'working red xp', 'working green xp']) {
      expect(worked[name], name).toMatchObject({ kind: 'number', refines: false });
    }
    // The salary still refines the talent table's column.
    expect(worked.salary).toMatchObject({ kind: 'number', refines: true });
    // What each card adds to the score: a Badge's 2 points, and its Human Capital, which no column of the talent table holds (§12.6).
    expect(worked['badge points']).toMatchObject({ kind: 'number', refines: false });
    expect(worked['human capital']).toMatchObject({ kind: 'number', refines: false });
    // What a Junior is learning at the Engine: each colour it works in, or cleans Bugs in, while it holds no Pending token of that colour
    // (§5 Phase D, §11.B).
    for (const flag of ['learning blue', 'learning red', 'learning green']) expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    // What Launch's graduation step reads (§11.B.2, §11.E.2, §20.B): a Junior's Pending tokens of every colour, a number of its own;
    // the Veteran coaching, a Junior PM's pending Badge, a Junior at 4 XP maxed out, and whether a Junior graduates by itself, has a
    // token to choose, or may keep a second through the Mentor.
    expect(worked['pending tokens']).toMatchObject({ kind: 'number', refines: false });
    for (const flag of ['coaching', 'pending badge', 'maxed out', 'due to graduate', 'choosing a token', 'mentorable']) {
      expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    }
    // What the QA Engineer and the Sales Rep do (§11.D, §20.B): a QA Engineer with Training XP is practised and cleans 2 Bugs, and one
    // with 2 stops Bug Decay on its owner's products from the ops team, as a badged card waives it on the product it sits on. A
    // product's bug decay, a number of its own, is the revenue its Bugs cost it while it is decaying.
    expect(worked['bug decay']).toMatchObject({ kind: 'number', refines: false });
    for (const flag of ['practised', 'waiving decay', 'stopping decay', 'decaying']) {
      expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    }
    // What the PMs do (§11.E, R8): a project's PMs at work and its workers of each colour, numbers of their own, whose product adds to its
    // team output; a PM not onboarding is managing, and a Senior PM or a badged one managing is Agile.
    for (const name of ['pm count', 'blue workers', 'red workers', 'qa workers']) {
      expect(worked[name], name).toMatchObject({ kind: 'number', refines: false });
    }
    for (const flag of ['managing', 'agile']) expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    // Whom each Training card fits (§20.A, §11, ruling 14): a Junior lacking a Skill token of a colour it doesn't work in already, a QA
    // Engineer or a Sales Rep short of 2 Training XP, an unbadged University Junior, QA Engineer or Sales Rep, and an unbadged Junior PM.
    for (const flag of [
      'blue trainable', 'red trainable', 'green trainable', 'fully trained', 'certifiable', 'seminar ready', 'masterclass ready', 'workshop ready',
    ]) {
      expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    }
    // Which side of the stack a product is on, which Full Stack Founder reads: the hardware side's Tags or the software side's, and
    // neither while it is offline (§20.G, ruling 5).
    for (const flag of ['hardware side', 'software side']) expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    // The Diva's Ego, which her Pivot fires her for, and a card holding any Attribute count, which the box strips (§6, §15, R2).
    for (const flag of ['egotistic', 'holding attributes']) expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    // Workaholic's overwork, Clean Code from the Architect's trait or a Clean Coder count, and a pooled one guarding every product (§20.A, §20.B).
    for (const flag of ['overworked', 'overworked in blue', 'overworked in red', 'overworked in qa', 'clean coding', 'guarding the pool']) expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    // Toxic Personality's cube off a team's made values and off the ops pool, and Burnout (§20.A, the slice's R1 and R3).
    for (const name of [...MADE, ...POOL]) expect(worked[name], name).toMatchObject({ kind: 'number', refines: false });
    for (const flag of ['burned out', 'giving synergy', 'poisoning', 'losing blue', 'losing red', 'losing qa', 'pool losing blue', 'pool losing red', 'pool losing qa']) {
      expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    }
    // TechCrunch Feature's price, which a working Sales Rep on the product lowers to $2 (§20.A, §20.B).
    expect(worked.price).toMatchObject({ kind: 'number', refines: true });
    for (const flag of ['pitching', 'pitched']) expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    // The round-long Events' flags, each reading the Event in play (§20.D 2, 5, 7, 8, 11, 12).
    for (const flag of ['bubbly', 'legacy', 'open source boosted', 'hackathon boosted', 'server crashed', 'logjammed']) {
      expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    }
    // The round's prices (§20.D 9, 16, 18; §13.A): Chip Shortage refines the printed cost, and the open job market's price is worked.
    expect(worked.cost).toMatchObject({ kind: 'number', refines: true });
    expect(worked['rehire price']).toMatchObject({ kind: 'number' });
    for (const flag of ['chip short', 'course priced', 'show priced']) expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    // Crunch Time's cube and Bug (§20.D 10).
    for (const name of ['blue reached', 'blue added', 'red added']) expect(worked[name], name).toMatchObject({ kind: 'number' });
    for (const flag of ['blue covered', 'crunching blue', 'crunching red', 'crunched']) expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
    // Angel Investors' and Regulation Audit's steps (§20.D 4, 6).
    expect(worked['payroll tax']).toMatchObject({ kind: 'number' });
    for (const flag of ['acting once', 'angel funded', 'past tier 1', 'taxed']) expect(worked[flag], flag).toMatchObject({ kind: 'flag' });
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
        'Example: a QA Engineer in both rows', '  Given the agency row has the Hacker, the Architect, the Veteran and a QA Engineer',
        '  And the open job market has a QA Engineer', '  When p0 hires a QA Engineer', '  Then it is accepted',
      ],
      {
        "from the agency row to p0's bench": ["Then p0's bench has a QA Engineer", 'And the open job market has a QA Engineer'],
        'from the open job market': ["Then p0's bench has a QA Engineer", 'And the open job market is empty'],
        "to p0's ops team": ["Then p0's ops team has a QA Engineer", 'And the open job market has a QA Engineer'],
      },
      (wording, lands) => [
        `Example: hiring the QA Engineer ${wording}`, '  Given the agency row has the Hacker, the Architect, the Veteran and a QA Engineer',
        '  And the phase is actions',
        '  And the open job market has a QA Engineer', "  And p0's operations has a To-Do List", `  When p0 hires a QA Engineer ${wording}`,
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
        const advised = compileGame(`${STARTUP_SIMULATOR}\n\n${added.flat().join('\n\n')}\n`, lib).game!;
        // Only the examples added here run: each example plays on a table of its own, so the rules' own would only repeat 'passes every
        // example'.
        const results = runExamples({ ...advised, examples: advised.examples.slice(-added.flat().length) }, lib);
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

    // Each wording the advice gives hires the QA Engineer from where it says, to where it says.
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
    it('has 141 cards: 22 talent, 30 seed products, 34 growth products with the Market Crash, 30 Strategy cards, 6 Milestones and 18 Events', () => {
      const { cards } = fresh();
      expect(cards).toHaveLength(141);
      expect(inZone(cards, 'talent-deck')).toHaveLength(22);
      expect(inZone(cards, 'seed-deck')).toHaveLength(30);
      expect(inZone(cards, 'growth-deck')).toHaveLength(35);
      expect(inZone(cards, 'strategy-deck')).toHaveLength(30);
      expect(inZone(cards, 'milestone-deck')).toHaveLength(6);
      expect(inZone(cards, 'event-deck')).toHaveLength(18);
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

    it('has the Strategy deck of §20.A: 30 cards, 8 of them Training, with their prices', () => {
      const strategy = inZone(fresh().cards, 'strategy-deck');
      expect(nameCounts(strategy)).toEqual(STRATEGY_CARDS);
      const kinds: Record<string, number> = {};
      for (const card of strategy) kinds[card.data?.kind as string] = (kinds[card.data?.kind as string] ?? 0) + 1;
      expect(kinds).toEqual({ Training: 8, Warfare: 10, Attribute: 6, Utility: 6 });
      expect(strategy.filter(isTraining)).toHaveLength(8);
      expect(sum(strategy, 'price')).toBe(63);
    });

    it('has the 6 Milestones of §20.G with their VP', () => {
      const milestones = inZone(fresh().cards, 'milestone-deck');
      expect(nameCounts(milestones)).toEqual(Object.fromEntries(MILESTONES.map((name) => [name, 1])));
      // First Mover 5, Talent Magnet 8, Platform Power 10, Revenue Leader 6, Clean Launch 5, Full Stack Founder 7.
      expect(sum(milestones, 'vp')).toBe(41);
    });

    it('has the Event deck of §20.D: 18 cards, one of each', () => {
      expect(nameCounts(inZone(fresh().cards, 'event-deck'))).toEqual(Object.fromEntries(EVENTS.map((name) => [name, 1])));
    });

    it('shuffles the event deck at Setup, so the Events left after the first reveal are not in the order the deck was dealt in (§4, §15.D)', () => {
      for (const seed of [1, 2, 3]) {
        const set = setUp(2, seed);
        const dealt = namesIn(fresh(seed), 'event-deck').filter((name) => name !== eventOf(set));
        expect(namesIn(set, 'event-deck'), `seed ${seed}`).not.toEqual(dealt);
      }
    });

    it('puts every Tag of §20.G on its side, and no other (§20.G)', () => {
      // Full Stack Founder's lists: these Tags are the hardware side and these the software side; Device, Platform, Data, Bio, Cloud and
      // AI are neither (§20.G).
      const HARDWARE = ['IoT', 'Robotics', 'Energy', 'Fusion', 'Longevity', 'Quantum'];
      const SOFTWARE = ['App', 'Social', 'Commerce', 'Media', 'Crypto', 'Metaverse', 'DeFi'];
      const decks = fresh();
      const tagged = ['seed-deck', 'growth-deck'].flatMap((deck) => inZone(decks.cards, deck))
        .filter((card) => typeof card.data?.tag === 'string');
      // Each product online in an operations row, where the sides are read.
      const state = relocate(decks, tagged.map((card) => card.id), 'operations-p0', game!);
      const runtime = new LangRuntime(game!, lib, seatsFor(2));
      const wrong = tagged.flatMap((card) => {
        const tag = card.data?.tag as string;
        const [hardware, software] = ['hardware side', 'software side'].map((side) => runtime.workedFlag(state, card.id, side) === true);
        const right = hardware === HARDWARE.includes(tag) && software === SOFTWARE.includes(tag);
        return right ? [] : [`${nameOf(card)} (${tag}): hardware side ${hardware}, software side ${software}`];
      });
      expect(wrong).toEqual([]);
      // Every Tag of both lists is on some product, so each one's line is read.
      const tags = new Set(tagged.map((card) => card.data?.tag));
      expect([...HARDWARE, ...SOFTWARE].filter((tag) => !tags.has(tag))).toEqual([]);
    });
  });

  it('lays out the table: each player’s bench, backlog, research, scouting, Strategy Hand and brainstorm are rows only they can see, and their Board rows and claimed Milestones everyone can', () => {
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
      ['strategy-deck', false, 'pile', 'secret'],
      ['strategy-discard', false, 'pile', 'public'],
      ['attributes-in-play', false, 'pile', 'public'],
      ['milestone-deck', false, 'pile', 'secret'],
      ['milestone-row', false, 'row', 'public'],
      ['event-deck', false, 'pile', 'secret'],
      ['event-in-play', false, 'row', 'public'],
      ['event-discard', false, 'pile', 'public'],
      ['box', false, 'pile', 'secret'],
      ['bench', true, 'row', 'owner'],
      ['backlog', true, 'row', 'owner'],
      ['research', true, 'row', 'owner'],
      ['development', true, 'row', 'public'],
      ['operations', true, 'row', 'public'],
      ['development-team', true, 'row', 'public'],
      ['ops-team', true, 'row', 'public'],
      ['scouting', true, 'row', 'owner'],
      ['strategy-hand', true, 'row', 'owner'],
      ['brainstorm', true, 'row', 'owner'],
      ['milestones', true, 'row', 'public'],
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
          // No player starts with a Strategy card: they draw them with Brainstorm (§4.4).
          expect(zoneCards(state, `strategy-hand-p${p}`), `${at}, p${p}'s strategy hand`).toEqual([]);
          expect(zoneCards(state, `milestones-p${p}`), `${at}, p${p}'s milestones`).toEqual([]);
          const counters = state.data[COUNTERS_KEY] as Record<string, Record<string, number>>;
          expect(counters['market share']?.[`p${p}`], `${at}, p${p}'s market share`).toBe(0);
        }
        expect(zoneCards(state, 'agency-row'), at).toHaveLength(4);
        expect(zoneCards(state, 'seed-market'), at).toHaveLength(2);
        expect(zoneCards(state, 'growth-market'), at).toHaveLength(2);
        expect(zoneCards(state, 'strategy-deck'), at).toHaveLength(30);
        // Setup reveals 3 of the 6 Milestones and returns the rest to the box (§4.3).
        expect(zoneCards(state, 'milestone-row'), at).toHaveLength(3);
        expect(zoneCards(state, 'milestone-deck'), at).toEqual([]);
        expect(zoneCards(state, 'box').filter((card) => MILESTONES.includes(nameOf(card) as string)), at).toHaveLength(3);
        // Setup ends by starting the first round, which reveals an Event (§4.1, §5 Phase A).
        expect(zoneCards(state, 'event-in-play'), at).toHaveLength(1);
        expect(zoneCards(state, 'event-deck'), at).toHaveLength(17);
        expect(zoneCards(state, 'event-discard'), at).toEqual([]);
      }
    });

    it('makes the Juniors after the 141 dealt cards, c141 to c149 at 3 players', () => {
      const state = setUp(3, 1);
      const ids = [0, 1, 2].flatMap((p) => zoneCards(state, `bench-p${p}`)).map((card) => Number(card.id.slice(1)));
      expect(ids.sort((a, b) => a - b)).toEqual(Array.from({ length: 9 }, (_, i) => 141 + i));
      expect(state.data[NEXT_CARD_KEY]).toBe(150);
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

  it('shows the Strategy Hand and the Brainstorm look only to their owner, and the strategy discard to everyone (§15.C, the spec’s anti-goal)', () => {
    const engine = arrange({ 'strategy-deck': ['Headhunter', 'Burnout', 'Hit Piece'].map(idOf), 'strategy-hand-p0': [idOf('Visionary')] });
    expect(engine.dispatch({ type: BRAINSTORM, by: 'p0' }).ok).toBe(true);
    const tableDef = tableDefFor(game!, seatsFor(2));
    const seen = (state: GameState, viewer: string, zoneIds: string[]) =>
      deriveScene(tableDef, { cards: state.cards }, viewer).cards.filter((card) => zoneIds.includes(card.zoneId));

    // The deck's top two cards wait in p0's brainstorm row while p0 chooses, beside the Visionary in its hand (§6).
    const looking = engine.getState();
    expect(looking.turn).toMatchObject({ current: 'p0', phase: 'brainstorm' });
    const hidden = ['strategy-hand-p0', 'brainstorm-p0'];
    const own = looking.cards.filter((card) => hidden.includes(card.zoneId));
    expect(own.map((card) => [card.zoneId, nameOf(card)]).sort()).toEqual([
      ['brainstorm-p0', 'Burnout'], ['brainstorm-p0', 'Hit Piece'], ['strategy-hand-p0', 'Visionary'],
    ]);
    expect(own.every((card) => card.faceKey !== HIDDEN_FACE_KEY)).toBe(true);
    expect(seen(looking, 'p1', hidden).map((card) => card.faceKey)).toEqual(own.map(() => HIDDEN_FACE_KEY));
    expect(seen(looking, 'p0', hidden).map((card) => card.faceKey)).toEqual(own.map((card) => card.faceKey));

    // The card p0 doesn't keep goes to the strategy discard, face up to everyone; the hand stays p0's alone (§15.C).
    expect(engine.dispatch({ type: KEEP_STRATEGY, by: 'p0', cardId: idOf('Hit Piece') }).ok).toBe(true);
    const kept = engine.getState();
    expect(namesIn(kept, 'strategy-discard')).toEqual(['Burnout']);
    const [burnout] = zoneCards(kept, 'strategy-discard');
    expect(burnout.faceKey).not.toBe(HIDDEN_FACE_KEY);
    expect(seen(kept, 'p1', ['strategy-discard']).map((card) => card.faceKey)).toEqual([burnout.faceKey]);
    expect(seen(kept, 'p1', hidden).map((card) => card.faceKey)).toEqual([HIDDEN_FACE_KEY, HIDDEN_FACE_KEY]);
  });

  it('hands the turn back to the actions at 0 once the cards a Layoff with the last action found are passed on, and the turn goes on to the next player once the seat ends its actions (Review Focus)', () => {
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
    // Free actions may still be taken at 0, so the turn waits on the seat (rulebook l.172–173).
    expect(passed.turn).toMatchObject({ current: 'p0', phase: 'actions' });
    expect(counterOf(passed, 'actions', 'p0')).toBe(0);
    expect(engine.dispatch({ type: END_ACTIONS, by: 'p0' }).ok).toBe(true);
    const ended = engine.getState();
    expect(ended.turn).toMatchObject({ current: 'p1', phase: 'actions' });
    expect(counterOf(ended, 'actions', 'p1')).toBe(ACTIONS_EACH_TURN);
    expect(zoneCards(passed, 'scouting-p0')).toEqual([]);
    // The Fixer enters at the left end and pushes the Diva out (R7).
    expect(namesIn(passed, 'agency-row')).toEqual(['Fixer', 'Hacker', 'Architect', 'Veteran']);
    expect(namesIn(passed, 'open-job-market')).toEqual(['Engineer', 'Diva']);
  });

  it('waits at 0 actions with the end button and a Greenlight allowed on the page and a recruit greyed by its cost, and ends the actions only on the seat’s press (rulebook l.172–173, Review Focus)', () => {
    const dating = idOf('Dating App');
    const arranged = arrange({ 'backlog-p0': [dating], 'development-p0': [] }).getState();
    const { engine, runtime } = createEngine(game!, lib, 2, setCounter(arranged, 'actions', 'p0', 0));
    const allowed = () => Object.fromEntries(seatExtras(engine, runtime, engine.getState(), 'p0').actions.map((action) => [action.move, action.allowed]));
    expect(allowed()[END_ACTIONS]).toBe(true);
    expect(allowed()[GREENLIGHT]).toBe(true);
    expect(allowed()[RECRUITS[0]]).toBe('they have at least 1 action');
    expect(engine.dispatch({ type: RECRUITS[0], by: 'p0' })).toMatchObject({ ok: false, reason: 'they have at least 1 action' });
    expect(engine.dispatch({ type: GREENLIGHT, by: 'p0', cardId: dating }).ok).toBe(true);
    expect(engine.getState().turn).toMatchObject({ current: 'p0', phase: 'actions' });
    expect(allowed()[END_ACTIONS]).toBe(true);
    expect(engine.dispatch({ type: END_ACTIONS, by: 'p0' }).ok).toBe(true);
    expect(engine.getState().turn).toMatchObject({ current: 'p1', phase: 'actions' });
    // Undo of the end gives back the actions at 0 with the end still allowed, and undo of the Greenlight gives it back too (Review Focus 4).
    engine.undo();
    expect(engine.getState().turn).toMatchObject({ current: 'p0', phase: 'actions' });
    expect(counterOf(engine.getState(), 'actions', 'p0')).toBe(0);
    expect(allowed()[END_ACTIONS]).toBe(true);
    engine.undo();
    expect(allowed()[GREENLIGHT]).toBe(true);
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
    /**
     * The long run's 2- and 3-player games, by `${players} ${seed}`. The replay tests and the view test below reuse them instead of playing
     * them again, and each plays its own when a `-t` filter left the long run out.
     */
    const keptGames = new Map<string, KeptGame>();
    /** The game at `players` and `seed`: the long run's, else played now, plainly. */
    const keptGame = (players: number, seed: number): KeptGame => {
      const at = `${players} ${seed}`;
      if (!keptGames.has(at)) {
        const keeping = keepingForReplay(new LangRuntime(game!, lib, seatsFor(players)));
        keptGames.set(at, keeping.kept(playGame(players, seed, (before, move, after) => keeping.watch(before, move, after))));
      }
      return keptGames.get(at)!;
    };
    const twoPlayerGame = (seed: number): KeptGame => keptGame(2, seed);
    /** A Greenlight that answered the choices its press asked; the auto-player names no choices for a press that asks none. */
    const answeredGreenlight = (move: Move) => move.type === GREENLIGHT && move.choices !== undefined;
    /**
     * The 4-player long run's games, by seed, up to their first Greenlight that answered a choice (`answeredGreenlight`): the moves to it
     * and the states before and after it; a game with none, whole, its end as `after`. The Greenlight test below reuses them instead of
     * playing them again, and plays its own when a `-t` filter left the long run out.
     */
    const greenlitGames = new Map<number, GreenlitGame>();
    /** A watch for a long run that keeps what `greenlitGames` holds of it. */
    const keepingToGreenlight = () => {
      let watched = 0;
      let found: { at: number; before: GameState; after: GameState } | null = null;
      const watch = (before: GameState, move: Move, after: GameState) => {
        watched += 1;
        if (found === null && answeredGreenlight(move)) found = { at: watched, before, after };
      };
      const kept = (engine: GameEngine): GreenlitGame => (found === null
        ? { log: [...engine.getLog()], before: null, after: engine.getState() }
        : { log: engine.getLog().slice(0, found.at), before: found.before, after: found.after });
      return { watch, kept };
    };

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
        const keeping = players <= 3 ? keepingForReplay(runtime) : null;
        const greenlit = players === 4 ? keepingToGreenlight() : null;
        /** The Event revealed at the last Round Start. */
        let revealed: string | null = null;
        const engine = playGame(players, seed, (before, move, after) => {
          if ((after.data[ROUND_KEY] as number) > (before.data[ROUND_KEY] as number)) revealed = eventOf(after);
          rules(before, move, after);
          budget(before, move, after);
          const keys = happenings(runtime, before, move, after);
          for (const key of [move.type, ...keys]) count(key);
          keeping?.watch(before, move, after, keys);
          greenlit?.watch(before, move, after);
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
        // No Event is revealed after the last round: the one in play at the result is the last Round Start's (§12, slice 1a's R1.3).
        // A game that saw no Round Start would skip the check, so a missing one fails here.
        expect(revealed, `${where}: a Round Start was seen`).not.toBeNull();
        expect(eventOf(state), `${where}: the Event in play at the result`).toBe(revealed);

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
        if (keeping !== null) keptGames.set(`${players} ${seed}`, keeping.kept(engine));
        if (greenlit !== null) greenlitGames.set(seed, greenlit.kept(engine));
      }
    }, 120_000);

    it('made every move in those runs but the few the arranged tests below make, Brainstorm, its keep, the strategy cleanup and Training among them, and the pools let cards go, the agency row pushed cards out and the Crash came out of the market and of research', () => {
      const [scoutedToBench, , scoutedToProject] = SOURCE_HIRES;
      const every = [
        // Slice 1a's.
        ...RECRUITS, HIRE_AGENCY, HIRE_MARKET, DRAFT_SEED, DRAFT_GROWTH, DRAFT_POOL,
        RESEARCH_SEED, RESEARCH_GROWTH, KEEP, END_ACTIONS, DISCARD_BACKLOG,
        // The Board's.
        HIRE_AGENCY_TO_PROJECT, GREENLIGHT, ASSIGN_TO_PROJECT, ASSIGN_TO_OPS,
        REASSIGN_FROM_PROJECT, REASSIGN_FROM_OPS, RECALL, DISMISS_FROM_PROJECT, DISMISS_FROM_OPS,
        // Income's, Launch, Pivot, Layoff and Source.
        ...Object.values(LET_GO), PAY_SALARIES, LAUNCH, PIVOT, LAY_OFF, scoutedToBench, scoutedToProject, PASS_ON_THE_REST,
        // Slice 4's: the declaration of modes, the ops check and the final check's switches, and the buttons that put a card on a
        // product in operation, and the reassign and the scouting's hire onto one.
        ...Object.values(DECLARE), CONFIRM_MODES, SWITCH_OFF, SWITCH_ON, CONFIRM_ONLINE,
        ASSIGN_TO_PRODUCT, HIRE_AGENCY_TO_PRODUCT, REASSIGN_TO_PRODUCT, HIRE_SCOUTED_TO_PRODUCT,
        // Plan 5-2b's: Brainstorm, plain and flushing, its keep, the strategy cleanup and Training.
        BRAINSTORM, BRAINSTORM_FLUSHING, KEEP_STRATEGY, DISCARD_STRATEGY, PLAY_TRAINING,
        // Plan 6-2a's: the Debuff, TechCrunch Feature and Design Sprint buttons.
        PLAY_DEBUFF, PLAY_TO_PRODUCT, PLAY_ALONE,
        // Plan 6-2b's: a let-go in the event check.
        AUDIT_LET_GO,
        // What the rules make happen on their own.
        'open idea pool lets a card go to the box', 'open job market lets a card go to the box', PUSHED_OUT,
        'the Market Crash reaches the crash pile from the growth market', 'the Market Crash reaches the crash pile from a research row',
      ];
      // Counted, but not required, each pinned by its examples and by the arranged test below of the auto-player's press named here:
      // - the clean button: the Engine waits on it only when ops QA can't clean every Bug, and only the one Growth Hacker brings Bugs to
      //   products in operation ('cleans the Bug the auto-player picks when ops QA can’t clean them all, …');
      // - the graduation step's keep and Mentor presses: a Junior earns a Pending token of a second colour only by working in it, which
      //   takes a Skill token, and it must then Launch with it (P8) ('makes the graduation choices the auto-player picks, …');
      // - the bench's discard: the retuned seats put their makers on projects first, so no bench overflows (the retune's D3) ('discards
      //   the bench’s first card at the bench cleanup once it ends its actions with more than 5 there, …');
      // - the agency row's hire to the ops team: a seat with a product hires onto it, and the cycle seldom comes to the hire while one
      //   without has a Senior's price (the retune's D3) ('hires the agency row’s first Senior it can pay for to the ops team when it
      //   can’t go to a product, …');
      // - the scouting's hire to the ops team: the Buffs' spending leaves it to two games (3 and 4 players seed 4; it was held by three)
      //   under every Buff cadence that keeps the other tests (plan 6-2a's pre-flight) ('hires the card a Layoff found to the ops team
      //   while it has a product, …').
      // Held by none, the fewest: the agency row's hire to the bench, and by one game: the reassign from one product to another (3
      // players seed 4), both in `HELD_BY_FEWER_THAN_TWO` once plan 6-2b's Event deck replayed every game; by two games: the TechCrunch
      // Feature (2 and 4 players, seed 4); by three each: the scouting's hire onto a product (2, 4 and 5 players seed 4) and the agency
      // row's hire onto a product (3, 4 and 5 players seed 4); by four each: the strategy cleanup's discard (2 players seeds 1 and 2, 3
      // players seed 5, 5 players seed 4) and a let-go in the event check (2 players seeds 1 and 4, 3 players seeds 1 and 3); by five
      // each: the assign onto a product (2 and 3 players seed 4, 4 players seeds 1, 2 and 4) and the ops team's let go (2 players seeds 2
      // and 4, 3 players seeds 2 and 5, 4 players seed 4); by six each: the assign to the ops team and the ops check's switch on; by eight
      // each: the scouting's hire to the bench and the ops check's confirm; the Design Sprint by ten, the flushing Brainstorm by thirteen
      // and the Debuff by fourteen. A failure here means a cadence moved: retune the auto-player, never the rules.
      expect(every.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never made or seen: ${JSON.stringify(tally)}`).toEqual([]);
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

    it('played slice 3 in those runs: Tier 2 and 3 greenlit and launched, Licenses paid to the only provider, the cut filled in and chosen three ways and launched, Stalled projects at the Engine, the Diva refused a reassign from a project and fired by a pivot, and the Engineer paid $1 in the ops team', () => {
      const paths = [
        GROWTH_GREENLIT, GROWTH_LAUNCHED, LICENSE_TO_THE_ONLY_PROVIDER,
        CUT_FILLED_IN, CUT_CHOSEN, 'the cut: Cut 2 blue', 'the cut: Cut 2 red', 'the cut: Cut 1 of each', CUT_LAUNCHED,
        STALLED_AT_THE_ENGINE, DIVA_REFUSED[REASSIGN_FROM_PROJECT], DIVA_PIVOTED, ENGINEER_IN_OPS,
      ];
      // Two Licenses in one Greenlight takes a Tier 3 card whose both Tags the mover lacks; it is counted, but not required, and examples
      // pin it. So are these two, each pinned by its examples and by the arranged test below of the auto-player's press named here:
      // - LICENSE_TO_A_CHOSEN_PROVIDER, a License paid to a provider chosen among several: two rivals must run products of the Tag a
      //   seat's Greenlight lacks, and the Strategy deck's shuffle at Setup replayed every game from plan 5-2b's Task 1 on (P7) ('names
      //   the provider it pays a License to by t when two rivals provide the Tag, …');
      // - DIVA_REFUSED[REASSIGN_FROM_OPS], the Diva refused a reassign from the ops team: she must reach the ops team, from the bench or
      //   with her project's Launch, and the Milestones' shuffle at Setup replayed every game again at plan 5-2b's Task 3 (P7) ('tries
      //   the Diva’s reassign from the ops team before each later action, …').
      // Held by none, the fewest: the Engineer paid $1 in the ops team (in `HELD_BY_FEWER_THAN_TWO` once plan 6-2b's Event deck replayed
      // every game); by two games each: a Tier 2 or 3 card launched (2 and 3 players, seed 4); by three: a project launched with a cut
      // (2 players seeds 2 and 4, 3 players seed 4); by four each: the Diva refused a reassign from a project and fired by a pivot (every
      // player count, seed 3); by five each: Cut 2 red (2 players seeds 2 and 4, 4 players seed 4, 5 players seeds 2 and 4), Cut 2 blue
      // (2 players seed 4, 3 players seeds 2 and 4, 4 players seed 4, 5 players seed 5) and the cut filled in (the same games as Cut 2
      // blue); by six: Cut 1 of each (2 players seed 2, 3 players seeds 4 and 5, 4 players seed 5, 5 players seeds 2 and 4); by nine
      // each: a cut chosen among options and a License paid to the only provider. A failure here means a cadence moved: retune the
      // auto-player, never the rules.
      expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
    });

    it('played slice 4 in those runs: modes declared each way and kept, products offline at Income, Bugs added to projects and cleaned there, and the final check', () => {
      const paths = [
        `${MODE_DECLARED}: Blue`, `${MODE_DECLARED}: Red`, `${MODE_DECLARED}: QA`, MODES_KEPT, MODE_FORGOTTEN, OFFLINE_AT_INCOME,
        BUG_ON_PROJECT, CLEANED_ON_PROJECT, SWITCHED_OFF_AT_THE_END,
      ];
      // Counted, but not required: a mode carried between teams, the clean button, a product switched on or brought back online at the
      // final check, and the Architect stopping a Growth Hacker's Bug. Only the one Growth Hacker brings Bugs to products in operation,
      // so two such products with Bugs at once are rare, and he seldom shares an ops team with the one Architect. A seat seldom comes to
      // the final check holding a product its last ops check switched off, and seldom then short (to switch it on) or able to run every
      // product (to bring it back). Examples pin each, and two arranged tests below pin the auto-player's clean and final check: 'cleans
      // the Bug the auto-player picks when ops QA can’t clean them all, …' and 'plays the final check for a seat short of bandwidth, …'.
      // The Growth Hacker's paths on a product in operation are counted, not required, too: he must reach one, which a seat hires him
      // onto only in the recruit's place, and the Strategy deck's and the Milestones' shuffles at Setup replayed every game at plan
      // 5-2b's Tasks 1 and 3 (P7). Examples pin each, and the arranged test 'runs the Growth Hacker on a product through its owner’s
      // Engine and its next Income: …' below sees each one:
      // - BUG_ON_PRODUCT, a Bug added to a product in operation;
      // - EARNING_LESS, a product earning less for its Bugs;
      // - GROWTH_HACKER_EARNED, the Growth Hacker's $3 earned;
      // - CLEANED_IN_OPS, a Bug cleaned in operations by itself.
      // Held by five games, the fewest: a mode forgotten on a bench (2 players seeds 1 and 4, 3 players seeds 1 and 2, 4 players seed 4);
      // by eight each: a mode declared QA (2 players seeds 1, 4 and 5, 3 players seeds 2, 4 and 5, 5 players seeds 3 and 4), a Bug cleaned
      // on a project and an offline product at Income; by nine each: a mode declared Red and a Bug added to a project; a product switched
      // off at the final check by twelve. A failure here means a cadence moved: retune the auto-player, never the rules.
      expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
    });

    it('played slice 5’s talent in those runs: Pending tokens gained and graduated, returned by pivots and stripped from fired staff, Synergy and the Sales Rep’s bonus', () => {
      const paths = [
        ...PENDING.map((name) => `${PENDING_GAINED}: ${name.slice('pending '.length)}`), GRADUATED, PIVOT_RETURNED, STRIPPED, SYNERGY,
        SALES_BONUS, EXPERIENCED_PAID,
      ];
      // Counted, but not required, each pinned by its examples and by the arranged test below of the auto-player's presses named here:
      // - a token kept by choice and the Mentor's second token: a Junior gains a Pending token of a second colour only by working in it,
      //   which takes a Skill token from Training, and it must then Launch holding both (plan 5-2b's P8) ('makes the graduation choices
      //   the auto-player picks, …');
      // - a Junior PM promoted at a Launch: a Junior PM must be on a Tier 2 or 3 team that Launches ('claims First Mover Advantage,
      //   Platform Power and Full Stack Founder at one auto-player Launch of a Tier 2 card, which promotes its Junior PM, …');
      // - the Agile spare: only the one Senior PM is Agile until Agile Workshop badges a Junior PM, which no run plays (P8), and none of
      //   the runs moves a card onto a team it manages in a move that starts no turn ('reassigns a spare QA Engineer from the ops team
      //   onto the project the Senior PM manages, …').
      // A Bug cleaned by a QA Engineer is counted too: a QA Engineer must be on a project with Bugs. Examples pin it.
      // Held by three games, the fewest: an experienced Junior paid (2 players seeds 2 and 4, 3 players seed 4); by four: the Sales Rep's
      // bonus (every player count 2 to 5, seed 4); by six: Pending tokens returned by a pivot (2 players seeds 1 and 3, 3 players seeds 1
      // and 2, 4 players seeds 2 and 3); Synergy at the Engine by eight. A failure here means a cadence moved: retune the auto-player,
      // never the rules.
      expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
    });

    it('played slice 5’s Strategy and Milestones in those runs: Brainstorms of 2, a reshuffle and the cleanup, Training on Juniors and on a Sales Rep, trained Juniors declared in each colour they lacked, the Sales Rep’s XP bonus, and Clean Launch claimed', () => {
      const paths = [
        `${BRAINSTORM_DRAWING} 2`, DISCARDED_AT_CLEANUP,
        ...['Full Stack Bootcamp', 'QA Certification', 'Leadership Masterclass'].map((name) => `${TRAINING_ON}: ${name} on a Junior`),
        `${TRAINING_ON}: Sales Seminar on a Sales Rep`,
        ...['blue', 'red', 'qa'].map((answer) => `${TRAINED_DECLARED} ${answer}`),
        BADGED_LEADING, SALES_XP_BONUS, `${CLAIMED}: Clean Launch`,
      ];
      // Counted, but not required, each pinned by its examples (plan 5-2b's P8):
      // - the reshuffle: only 2, 4 and 5 players seed 4 run their Strategy deck dry, once each, and 'leaves no id a seat saw face up in the
      //   strategy discard in the strategy deck, …' below pins the reshuffle at 2 players seed 4 (the retune's D3);
      // - a Brainstorm drawing 3: a PM must be working on the seat's Board, and a seat seldom keeps one there;
      // - a single Strategy card kept at once: the deck and its discard must hold one card between them;
      // - QA Certification and Leadership Masterclass on a QA Engineer, the Masterclass on a Sales Rep, and Agile Workshop on a Junior
      //   PM: a seat seldom holds the Specialist a card fits as it plays it, and a Junior is nearly always there to take a Certification
      //   or a Masterclass first, so the arranged test 'plays its %s at t = %i on the %s the target rule picks, …' below plays each;
      // - Bug Decay stopped by a QA Engineer or waived by a VP of Sales: each needs one Training card, or two, on one card that then works
      //   where it matters;
      // - First Mover Advantage, Platform Power and Full Stack Founder: held by two games (2 and 3 players seed 4), one (2 players seed 2)
      //   and four (2 players seeds 2 and 4, 4 players seed 4, 5 players seed 2) (the arranged test 'claims First Mover Advantage,
      //   Platform Power and Full Stack Founder at one auto-player Launch of a Tier 2 card, …' below claims all three, and 'claims
      //   Platform Power only once the seat has chosen which products its ops check runs, …' Platform Power again);
      // - Revenue Leader and Talent Magnet: no run claims either now (an Income comes to $10 seldom, and Setup reveals no Talent Magnet at
      //   seeds 1 to 5) (the arranged test 'claims Talent Magnet and Clean Launch at an auto-player Launch that graduates a second Junior
      //   to 3 XP, and Revenue Leader at its next Income of $10, …' below claims both);
      // - a Milestone claimed at the last check: one must be met only as the final Ops check brings products back online (the arranged
      //   test 'rebuilds and takes back Platform Power claimed at the last check, …' below claims one).
      // Held by one game, the fewest: a trained Junior declared red (5 players seed 2), in `HELD_BY_FEWER_THAN_TWO` once plan 6-2b's
      // Event deck replayed every game; by three each: Sales Seminar on a Sales Rep and the Sales Rep's XP bonus (2, 3 and 4
      // players, seed 4); by four each: a trained Junior declared blue (2 and 3 players, seeds 1 and 2) and a strategy card discarded at
      // cleanup (2 players seeds 1 and 2, 3 players seed 5, 5 players seed 4); by five: a badged Junior leading at the Engine (2, 3 and 4
      // players seed 4, 5 players seeds 2 and 4); by seven: a trained Junior declared qa; Leadership Masterclass on a Junior by ten. A
      // failure here means a cadence moved: retune the auto-player, never the rules.
      expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
    });

    it('played slice 6’s Strategy cards in those runs: every Attribute on its targets, Attributes discarded, kept, rehired and boxed, their effects at work, TechCrunch at both prices, Hype scored and Design Sprints', () => {
      const paths = [
        ...[...BUFFS, ...DEBUFFS].map((name) => `${ATTRIBUTE_PLAYED}: ${name}`), BUFF_ON_BENCH, BUFF_ON_BOARD, DEBUFF_ON_DEV, DEBUFF_ON_OPS,
        ATTRIBUTES_FIRED, ATTRIBUTES_KEPT, TOXIC_RED, BURNOUT_IDLE, TECHCRUNCH_5, HYPE_SCORED, SPRINT_5, SPRINT_FEWER,
      ];
      // Counted, but not required, each held by one game or none, and each pinned by its examples or by the arranged test named here. Each
      // needs a card played on the one kind of target it works on, or a Talent holding Attributes to take one road out, and the runs play
      // few such cards: the Buffs only on turns with t % 3 === 0, the Debuffs on the rival card t picks, a TechCrunch Feature on a pitched
      // product only when a Sales Rep sits on one. Retargeting them cost other tests' keys in plan 6-2a's pre-flight.
      // - Attributes rehired (none): the example 'a Talent discarded from the bench keeps its Attributes, and the rival who hires it from
      //   the open job market gets them, …';
      // - Attributes boxed with an evicted Talent (none): 'Talents evicted from the open job market take their Attributes to
      //   the box, …' and 'a Talent evicted with Flight Risk takes it to the box, …';
      // - a Workaholic's +2 at the Engine (none): 'Workaholic gives +2 output in the colour its staff member makes and +$2
      //   salary, …', 'a Workaholic Junior PM gets only the +$2 salary, …' and 'Workaholic's +2 follows the mode a unit works in: …';
      // - Clean Coder stopping the Hacker's Bug (none): 'the Hacker with Clean Coder adds no Bug to the projects he joins, …';
      // - Clean Coder shielding a viral product (none): 'a Sales Rep with Clean Coder shields only the product it is on, …' and
      //   'a Sales Rep with Clean Coder on the Growth Hacker's own product stops its Bug, …';
      // - a Visionary leading (3 players seed 4): 'a Junior with Visionary leads in both colours, …' and 'Visionary makes any unit a
      //   lead, …';
      // - Toxic Personality taking a Blue cube (2 and 3 players, seed 4) and leaving a Bug (none): 'Toxic Personality takes one cube off its
      //   team's total after Synergy, Blue first, …' and 'a team that makes neither Blue nor Red cleans one Bug fewer for Toxic
      //   Personality, …';
      // - Toxic Personality in the ops team (2 players seed 4): 'in the ops team Toxic Personality takes one off the Blue bandwidth first, …',
      //   'an ops team that makes no Blue loses a Red to Toxic Personality, …' and 'an ops team that makes neither Blue nor Red cleans
      //   one Bug fewer for Toxic Personality, …';
      // - Burnout on a PM giving no Synergy (none): 'a Junior PM with Burnout gives no Synergy, …';
      // - TechCrunch for $2 with a Sales Rep (4 players seed 4; a Trade Show play at $2 on a product no Sales Rep pitches is no longer
      //   counted as one): 'TechCrunch Feature adds 1 Hype to one of the player's products for $5 and no action,
      //   or $2 when a working Sales Rep is on that product, …', and the arranged test 'plays a TechCrunch Feature the auto-player holds
      //   on the product a working Sales Rep pitches, …' below.
      // Held by none, the fewest: Attributes kept through a bench discard and Toxic Personality taking a Red cube; by one game each:
      // Workaholic played (5 players seed 5) and TechCrunch for $5 (2 players seed 4), both in `HELD_BY_FEWER_THAN_TWO` once plan
      // 6-2b's Event deck replayed every game; by two games each: a Buff on a bench card (4 and 5 players, seed 5), Hype scored (2 and 4
      // players, seed 4) and a Debuff on an ops team card (2 players seed 4, 3 players seed 2); by three: Toxic Personality played (2
      // players seed 4, 3 players seeds 1 and 4); by four each: Clean Coder played (2 players seeds 2 and 4, 3 players seed 3, 4
      // players seed 4), Attributes discarded with a fired Talent (2 players seed 4, 3 players seed 5, 4 players seed 2, 5 players seed
      // 4) and a Design Sprint dealing fewer than 5 (2 and 3 players seed 5, 4 players seeds 4 and 5); by six: Visionary played; by seven:
      // a Design Sprint dealing 5; by eight each: a Buff on a Board card, Burnout played and Burnout leaving a unit idle; Flight Risk
      // played by ten and a Debuff on a development team card by fourteen. A failure here means a cadence moved: retune the auto-player,
      // never the rules.
      expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
    });

    it('played slice 6’s Events in those runs: all 18 revealed, the discard reshuffled, Angel Investors and Regulation Audit paid and staff let go, every round-long effect at work, every price changed, and Crunch Time’s cubes and Bugs', () => {
      const paths = [
        ...EVENTS.map((name) => `${EVENT_REVEALED}: ${name}`), EVENTS_RESHUFFLED,
        ANGEL_PAID, AUDIT_PAID, AUDIT_LET_GO,
        BUBBLE_AT_INCOME, LEGACY_AT_INCOME, BOOM_AT_WORK, HACKATHON_AT_WORK, LOGJAM_AT_WORK, CRASH_AT_INCOME,
        TROLLS_LICENSE, CHIP_HIRE, INTERN_RECRUIT, COURSE_TRAINING, SHOW_TECHCRUNCH,
        CRUNCH_CUBE, CRUNCH_BUG, CRUNCH_STOPPED,
      ];
      // Setup reveals the first Event, so a reveal is counted from the second round on. Each Event is revealed in 2 games or more; the
      // fewest are Intern Season (2 players seed 4, 3 players seed 4) and Venture Capital Rain (2 players seeds 2 and 4), then Trade Show
      // (5 games) and Open Source Boom and Server Crash (6 each); Tech Bubble is revealed in 18. The discard shuffled into the event deck in
      // 2 games (2 players seeds 2 and 4), the only games to last the 19 rounds that takes. By game: Regulation Audit paid in 3 (2 players
      // seeds 2 and 4, 5 players seed 4), staff let go in 4 (2 and 3 players, seeds 1 and 4 and seeds 1 and 3), Server Crash at an Income
      // in 4 (2 players seeds 2 and 4, 3 and 4 players seed 4), Online Course Boom's Training card in 5, Tech Bubble at an Income in 7,
      // Crunch Time's cube and Bug in 9, Open Source Boom at work in 9 and Angel Investors paid in 12; Chip Shortage's Hardware hire in 2
      // (2 and 3 players, seeds 2 and 3). Held by none or one game, so counted and not required (`HELD_BY_FEWER_THAN_TWO`), each pinned by
      // its examples: Legacy Code at an Income, a Bug Crunch Time's Clean Code stopped and a TechCrunch Feature at Trade Show's $2
      // (none), and Intern Season's free recruit and Patent Trolls' $5 License (2 players seed 4).
      // A failure here means a cadence moved: retune the auto-player, never the rules.
      expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
    });

    it('plays the same game through the page’s view as without it (2 players, seed 2)', () => {
      // Seed 2 has a Greenlight that asks a choice (a cut, Cut 2 red or Cut 1 of each), which the view must list for the card. The game played without
      // the view is the long run's, which plays seed 2 so.
      const plain = twoPlayerGame(2);
      const viewed = playGame(2, 2, () => {}, { throughView: true });
      expect(plain.end.result).toBeDefined();
      // Greenlights that asked choices, answered from the choices the view lists for the card and from the rules alike.
      const answering = plain.log.filter((move) => move.choices !== undefined);
      expect(answering.map((move) => move.type), 'the moves that answered choices').toContain(GREENLIGHT);
      expect(viewed.getLog()).toEqual(plain.log);
      expect(viewed.getState()).toEqual(plain.end);
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
      // The retuned seats put their makers on projects before they recruit, so the first recruit comes at move 52 (it was within 40; a Design Sprint and its cleanup came before it from plan 6-2a, and the Event deck reshuffled the game from plan 6-2b).
      const both = (log: readonly Move[]) => log.some((move) => RECRUITS.includes(move.type))
        && log.some((move) => move.type === RESEARCH_SEED || move.type === RESEARCH_GROWTH);
      const engine = playGame(3, 1, (_before, _move, after) => states.push(after), { until: both });
      const log = [...engine.getLog()];
      expect(log).toHaveLength(52);
      expect(states).toHaveLength(52);
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

    it('takes back every move with undo, and rebuilds the game from its log, across an assign, a launch, a pivot and a reassign (Review Focus: 3 players, seed 2)', () => {
      const made = (log: readonly Move[], types: string[]) => log.some((move) => types.includes(move.type));
      // The brief asks for a launch or a pivot; the Review Focus names both, and the run that has both is still short.
      const board = (log: readonly Move[]) => made(log, [ASSIGN_TO_PROJECT, ASSIGN_TO_OPS]) && made(log, [LAUNCH]) && made(log, [PIVOT])
        && made(log, [REASSIGN_FROM_PROJECT, REASSIGN_FROM_OPS]);
      const states: GameState[] = [];
      // Seed 2 makes all four by its 83rd move, the soonest of the 3-player seeds 1 to 5 (seed 5 takes 90, and seed 1 launches nothing).
      const engine = playGame(3, 2, (_before, _move, after) => states.push(after), { until: board });
      const log = [...engine.getLog()];
      expect(board(log), `the moves made: ${[...new Set(log.map((move) => move.type))].join(', ')}`).toBe(true);
      expect(states).toHaveLength(log.length);
      // Staff sat on projects, tracks filled with cubes and reassigned staff were onboarding on the way, so undo has all three to give back.
      const some = (has: (card: CardState) => boolean) => states.some((state) => state.cards.some(has));
      expect(some((card) => typeof card.data?.[HOLDER_KEY] === 'string'), 'a card on a card').toBe(true);
      expect(some((card) => cubesOn(card, 'blue cubes') + cubesOn(card, 'red cubes') > 0), 'a project with cubes').toBe(true);
      expect(some((card) => card.data?.onboarding === true), 'an onboarding card').toBe(true);

      const fresh = () => createEngine(game!, lib, 3, initialState(game!, 2)).engine;
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

    it('takes back a Greenlight that asked a choice, and rebuilds it from its log, the payee included, whether the move named its answers or left them to be filled in (Review Focus: 4 players, from seed 1 until each kind is seen, at most seed 30)', () => {
      const seats = seatsFor(4);
      const runtime = new LangRuntime(game!, lib, seats);
      const answered = answeredGreenlight;
      /** The game at `seed` up to its first such Greenlight: the long run's, else played now. */
      const greenlitGame = (seed: number): GreenlitGame => {
        const kept = greenlitGames.get(seed);
        if (kept !== undefined) return kept;
        const states: GameState[] = [];
        const engine = playGame(4, seed, (before) => states.push(before), { until: (log) => log.some(answered) });
        return { log: [...engine.getLog()], before: states.at(-1) ?? null, after: engine.getState() };
      };
      const seen = { payees: 0, among: 0, filledIn: 0 };
      /** Whether some Greenlight has paid a License, some chose among several answers, and some had every answer filled in. */
      const everyKind = () => Object.values(seen).every((times) => times > 0);
      // Each game stops at its first such Greenlight, and the seeds run from 1 until a game of each kind has been seen, which takes the
      // games up to seed 4 since plan 6-2a's Strategy cards replayed every game again; a seed past 30 means the auto-player or the rules
      // moved too far for this to be a seed's matter.
      const lastSeed = 30;
      let seed = 1;
      for (; seed <= lastSeed && !everyKind(); seed++) {
        const where = `4 players, seed ${seed}`;
        const { log, before: kept, after } = greenlitGame(seed);
        // The run stops at the first such Greenlight, so one that stops short of it is a game whose seats never made one: it ended.
        if (!answered(log.at(-1)!)) {
          expect(after.result, `${where}: the game with no Greenlight that asked a choice`).toBeDefined();
          continue;
        }
        const [before, greenlight] = [kept!, log.at(-1)!];
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

        // Undo replays the log without its last move from the start, on the game rebuilt from it as on the one played.
        replayed.undo();
        expect(replayed.getState(), `${where}: the game with the Greenlight taken back`).toEqual(before);
        expect(gained(replayed.getState()), `${where}: capital after the Greenlight is taken back`).toEqual(seats.map(() => 0));
        seen.payees += payees.length;
        seen.among += among ? 1 : 0;
        seen.filledIn += among ? 0 : 1;
      }
      // Some Greenlight paid a License, some chose among several answers, and some had every answer filled in.
      const unseen = Object.entries(seen).filter(([, times]) => times === 0);
      expect(unseen, `the kinds of Greenlight not seen at 4 players in seeds 1 to ${seed - 1}, of at most ${lastSeed}: ${JSON.stringify(seen)}`)
        .toEqual([]);
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

    it('takes back the last move and rebuilds whole games from their logs, through declarations, Bugs, the final check, Pending tokens, graduation, Brainstorms, a reshuffle, Training and Milestone claims, reveals, an Event reshuffle and an event check that waited (Review Focus: 2 players, seeds 1 to 5)', () => {
      // The games are the long run's (see `keptGames`), with what each counted as it was played. Undo takes the last move off the
      // log and plays the rest again from the start, so it gives the same state on the engine rebuilt from the log as on the one that
      // played the game. It requires every path `REPLAYED` counts but the Design Sprints, which the 3-player test below requires.
      type Required = Exclude<(typeof REPLAYED)[number], 'Design Sprints'>;
      const required = REPLAYED.filter((what): what is Required => what !== 'Design Sprints');
      const seen = Object.fromEntries(required.map((what) => [what, 0])) as Record<Required, number>;
      for (let seed = 1; seed <= 5; seed++) {
        const where = `2 players, seed ${seed}`;
        const { log, beforeLast, end, watched, seen: counted } = twoPlayerGame(seed);
        for (const what of required) seen[what] += counted[what];
        expect(end.result, `${where}: the result`).toBeDefined();
        expect(watched, `${where}: the moves watched`).toBe(log.length);

        const replayed = createEngine(game!, lib, 2, initialState(game!, seed)).engine;
        replayed.loadLog(log);
        expect(replayed.getState(), `${where}: the game rebuilt from its log`).toEqual(end);
        replayed.undo();
        expect(replayed.getState(), `${where}: the game with its last move, ${log.at(-1)!.type}, taken back`).toEqual(beforeLast);
      }
      // Some log declared a mode, switched a product off, added a Bug to a project, raised a Pending token at the Engine, graduated one at
      // a Launch, shuffled the strategy discard into the deck, played a Training card that asked a choice or had it filled in, claimed
      // a Milestone, played a Debuff, discarded a fired Talent's Attributes and played a TechCrunch Feature, shuffled the event discard into
      // the event deck and let staff go in an event check that waited, so the replays rebuilt each of them. Every log reveals Events. The
      // declarations are in seeds 1, 2, 4 and 5, the Debuffs in seeds 2 to 5, the reshuffle, the strips and the TechCrunch Feature in seed
      // 4 only, the Event reshuffle in seeds 2 and 4 (only 2-player games last the 19 rounds a reshuffle takes) and a let-go in the event check in seeds 1 and 4. The last move taken back is the end of the
      // actions in seeds 1 to 3, a final-check switch-off in seed 4 and a backlog cleanup's discard in seed 5. No log holds a clean press, so the test
      // 'Review Focus: cleans no more Bugs than its QA when one product is left with Bugs partway through the step (R3)' above replays one;
      // none a keep or Mentor press, so 'makes the graduation choices the auto-player picks, …' below replays those; none moves a card
      // onto an Agile PM's team (P8), so 'reassigns a spare QA Engineer from the ops team onto the project the Senior PM manages, …'
      // below replays the Agile spare; and none claims a Milestone at the last check, so 'rebuilds and takes back Platform Power claimed
      // at the last check, …' below replays one.
      expect(Object.entries(seen).filter(([what, times]) => times === 0 && !HELD_BY_FEWER_THAN_TWO.has(what)), JSON.stringify(seen)).toEqual([]);
    }, 120_000);

    it('takes back the last move and rebuilds whole games from their logs, through Attribute plays, strips, a TechCrunch Feature and a Design Sprint (Review Focus: 3 players, seeds 1 to 5)', () => {
      // The games are the long run's (see `keptGames`), with what each counted as it was played. A Debuff is in every seed's log, the
      // strips (Attributes discarded with a fired Talent) in seed 5 only, no TechCrunch Feature in any (plan 6-2b's Event deck left it to
      // one game, 2 players seed 4: `HELD_BY_FEWER_THAN_TWO`, replayed by the 2-player test above) and a Design Sprint in seeds 2 and 5.
      // The last move taken back is a final-check switch-off in seeds 1, 2, 3 and 5 and a backlog cleanup's discard in seed 4.
      const seen = { Debuffs: 0, strips: 0, 'TechCrunch Features': 0, 'Design Sprints': 0 };
      for (let seed = 1; seed <= 5; seed++) {
        const where = `3 players, seed ${seed}`;
        const { log, beforeLast, end, seen: counted } = keptGame(3, seed);
        for (const what of Object.keys(seen) as (keyof typeof seen)[]) seen[what] += counted[what];
        expect(end.result, `${where}: the result`).toBeDefined();
        const replayed = createEngine(game!, lib, 3, initialState(game!, seed)).engine;
        replayed.loadLog(log);
        expect(replayed.getState(), `${where}: the game rebuilt from its log`).toEqual(end);
        replayed.undo();
        expect(replayed.getState(), `${where}: the game with its last move taken back`).toEqual(beforeLast);
      }
      expect(Object.entries(seen).filter(([what, times]) => times === 0 && !HELD_BY_FEWER_THAN_TWO.has(what)), JSON.stringify(seen)).toEqual([]);
    }, 120_000);

    it('makes the graduation choices the auto-player picks, through the page’s view and without it (§11.B.2, ruling 25)', () => {
      // The long runs press a button of the graduation step once (a keep, at 3 players seed 2): a Junior earns a Pending token of a second
      // colour only by working in it, which takes a Skill token from Training, and it must then Launch holding both (plan 5-2b's P8). So
      // this arranges a Launch with two Juniors holding two Pending tokens each, one in a colour their Skill token lets them work in, and
      // the Veteran on the team to coach them.
      const start = setUp(2, 1);
      const seats = seatsFor(2);
      const S = startPlayerOf(start, seats);
      const benched = (name: string) => zoneCards(start, zoneIdFor('bench', S)).find((card) => nameOf(card) === name)!.id;
      const [cloud, veteran] = ['Cloud Storage', 'Veteran'].map(idOf);
      const [dev, qa] = ['Junior Software Dev', 'Junior QA Tester'].map(benched);
      // The Cloud Storage needs 4 Blue and 4 Red (§20.C.1), so the seat Launches it with its second action, after its Ideation.
      let state = relocate(start, [cloud], zoneIdFor('development', S), game!);
      state = changeCard(state, cloud, { 'blue cubes': 4, 'red cubes': 4 }, game!);
      state = putOn(state, [veteran, dev, qa], zoneIdFor('development team', S), cloud, game!);
      state = changeCard(state, dev, { 'pending blue': 1, 'pending red': 1, 'red skill tokens': 1 }, game!);
      state = changeCard(state, qa, { 'pending blue': 1, 'pending green': 1, 'blue skill tokens': 1 }, game!);
      // On t = 0 the seat tries Blue first, so both Juniors keep Blue and the Mentor gives the Software Dev its Red. On t = 1 it tries
      // Red, then Green, then Blue: the Software Dev keeps Red, the QA Tester Green, and the Mentor gives the Software Dev its Blue.
      const expected: Record<number, { steps: Move[]; xp: number[][] }> = {
        0: {
          steps: [
            { type: KEEP_PENDING.blue, by: S, cardId: dev }, { type: KEEP_PENDING.blue, by: S, cardId: qa },
            { type: MENTOR, by: S, cardId: dev, choices: ['Red'] },
          ],
          xp: [[1, 1, 0], [1, 0, 0]],
        },
        1: {
          steps: [
            { type: KEEP_PENDING.red, by: S, cardId: dev }, { type: KEEP_PENDING.green, by: S, cardId: qa },
            { type: MENTOR, by: S, cardId: dev, choices: ['Blue'] },
          ],
          xp: [[1, 1, 0], [0, 0, 1]],
        },
      };
      const presses = [...Object.values(KEEP_PENDING), MENTOR];
      for (const t of [0, 1]) {
        /** The state before each move of the plain run. */
        const states: GameState[] = [];
        const engines = [false, true].map((throughView) => {
          const { engine, runtime } = createEngine(game!, lib, 2, state);
          const rules = keepsTheRules(seats, runtime);
          playTurn(engine, t, 'researches', (before, move, after) => {
            rules(before, move, after);
            if (!throughView) states.push(before);
          }, (log) => log.some((move) => move.type === MENTOR), runtime, throughView);
          return engine;
        });
        const log = [...engines[0].getLog()];
        expect(log.filter((move) => presses.includes(move.type)), `turn ${t}`).toEqual(expected[t].steps);
        expect(engines[1].getLog(), `turn ${t}`).toEqual(log);
        // The step is over: the turn is back in its actions, and the Juniors hold the Permanent XP they kept and nothing pending.
        const end = engines[0].getState();
        expect([end.turn?.current, end.turn?.phase], `turn ${t}`).toEqual([S, 'actions']);
        const xp = (id: string) => ['blue', 'red', 'green'].map((colour) => tokenOn(cardById(end, id)!, `${colour} xp tokens`));
        expect([dev, qa].map(xp), `turn ${t}`).toEqual(expected[t].xp);
        expect([dev, qa].flatMap((id) => PENDING.map((name) => tokenOn(cardById(end, id)!, name))), `turn ${t}`).toEqual([0, 0, 0, 0, 0, 0]);
        // The log alone rebuilds the presses, and undo takes back the Mentor's and each keep in turn, back to the step's start.
        const replayed = createEngine(game!, lib, 2, state).engine;
        replayed.loadLog(log);
        expect(replayed.getState(), `turn ${t}: the presses rebuilt from the log`).toEqual(end);
        expect(states).toHaveLength(log.length);
        const first = log.findIndex((move) => presses.includes(move.type));
        for (let i = log.length - 1; i >= first; i--) {
          engines[0].undo();
          expect(engines[0].getState(), `turn ${t}: after taking back ${log[i].type}`).toEqual(states[i]);
        }
      }
    });

    it('reassigns a spare QA Engineer from the ops team onto the project the Senior PM manages, which spares it the Onboarding token, through the page’s view and without it, and rebuilds and takes back the move (§6, §11.E.3, ruling 8)', () => {
      // The long runs never move a card onto an Agile PM's team in a move that starts no turn (P8): only the one Senior PM is Agile in
      // them, and it seldom reaches a project. So this puts it on the Dating App, with two QA Engineers in the ops team. On t = 4 the
      // seat's free dismiss takes the first, which the ops team can spare, and its second action is action 5, which reassigns the
      // second onto its first project. The agency row holds Seniors no planned hire takes.
      const [dating, seniorPm] = ['Dating App', 'Senior PM'].map(idOf);
      const qaEngineers = fresh().cards.filter((card) => nameOf(card) === 'QA Engineer').slice(0, 2).map((card) => card.id);
      const arranged = arrange({
        'development-p0': [dating],
        'agency-row': ['Architect', 'Veteran', 'Fixer', 'Engineer'].map(idOf),
        'backlog-p0': [],
      }).getState();
      const state = putOn(relocate(arranged, qaEngineers, 'ops-team-p0', game!), [seniorPm], 'development-team-p0', dating, game!);
      const seats = seatsFor(2);
      const runs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, state);
        const rules = keepsTheRules(seats, runtime);
        const states: GameState[] = [];
        const spared: Move[] = [];
        playTurn(engine, 4, 'researches', (before, move, after) => {
          rules(before, move, after);
          states.push(before);
          if (happenings(runtime, before, move, after).includes(AGILE_SPARED)) spared.push(move);
        }, (log) => log.some((move) => move.type === REASSIGN_FROM_OPS), runtime, throughView);
        return { engine, states, spared };
      });
      const { engine, states, spared } = runs[0];
      const log = [...engine.getLog()];
      const reassign = { type: REASSIGN_FROM_OPS, by: 'p0', cardId: qaEngineers[1], onto: dating };
      expect(log.filter((move) => [DISMISS_FROM_OPS, REASSIGN_FROM_OPS].includes(move.type))).toEqual([
        { type: DISMISS_FROM_OPS, by: 'p0', cardId: qaEngineers[0] }, reassign,
      ]);
      expect(cardById(engine.getState(), qaEngineers[1])!.data?.onboarding === true, 'the QA Engineer onboarding').toBe(false);
      expect(spared).toEqual([reassign]);
      expect(runs[1].engine.getLog()).toEqual(log);
      expect(runs[1].spared).toEqual(spared);
      // The log alone rebuilds the turn, and undo gives the state before the reassign (Review Focus).
      const replayed = createEngine(game!, lib, 2, state).engine;
      replayed.loadLog(log);
      expect(replayed.getState()).toEqual(engine.getState());
      engine.undo();
      expect(engine.getState()).toEqual(states.at(-1));
    });

    it('plays a Training card the auto-player holds on a target it fits, answering the colour by t, through the page’s view and without it (§20.A)', () => {
      // A Full Stack Bootcamp fits a Junior QA Tester in Blue and in Red, so its press asks which; the seat's only other targets, its
      // Junior Software Dev and Junior Hardware Eng, go to the box, so the press has one target. Choice 0 is answered with option
      // (t + 0) % 2: Blue on t = 0, Red on t = 1.
      const start = setUp(2, 1);
      const seats = seatsFor(2);
      const S = startPlayerOf(start, seats);
      const benched = (name: string) => zoneCards(start, zoneIdFor('bench', S)).find((card) => nameOf(card) === name)!.id;
      const bootcamp = idOf('Full Stack Bootcamp');
      const qa = benched('Junior QA Tester');
      let state = relocate(start, [bootcamp], zoneIdFor('strategy hand', S), game!);
      state = relocate(state, [benched('Junior Software Dev'), benched('Junior Hardware Eng')], 'box', game!);
      for (const t of [0, 1]) {
        const runs = [false, true].map((throughView) => {
          const { engine, runtime } = createEngine(game!, lib, 2, state);
          playTurn(engine, t, 'researches', keepsTheRules(seats, runtime), (log) => log.some((move) => move.type === PLAY_TRAINING), runtime, throughView);
          return engine;
        });
        const log = runs[0].getLog();
        expect(log.filter((move) => move.type === PLAY_TRAINING), `turn ${t}`).toEqual([
          { type: PLAY_TRAINING, by: S, cardId: bootcamp, onto: qa, choices: [t === 0 ? 'Blue' : 'Red'] },
        ]);
        const skill = ['blue', 'red'].map((colour) => tokenOn(cardById(runs[0].getState(), qa)!, `${colour} skill tokens`));
        expect(skill, `turn ${t}: the QA Tester's blue and red Skill tokens`).toEqual(t === 0 ? [1, 0] : [0, 1]);
        expect(runs[1].getLog(), `turn ${t}`).toEqual(log);
      }
    });

    it('offers a Debuff only another seat’s Board staff, development teams first, seat by seat from the presser’s left (§20.A, plan 6-1)', () => {
      const seats = seatsFor(3);
      let state: GameState = { ...setUp(3, 1), turn: { current: 'p0', phase: 'actions' } };
      const benched = (seat: PlayerId, name: string) => zoneCards(state, zoneIdFor('bench', seat)).find((card) => nameOf(card) === name)!.id;
      state = relocate(state, [idOf('Burnout')], zoneIdFor('strategy hand', 'p0'), game!);
      const projects = ['Dating App', 'To-Do List', 'Flashlight App'].map(idOf);
      const products = ['Basic Website', 'USB Gadget'].map(idOf);
      seats.forEach((seat, i) => {
        state = relocate(state, [projects[i]], zoneIdFor('development', seat), game!);
        state = putOn(state, [benched(seat, 'Junior Software Dev')], zoneIdFor('development team', seat), projects[i], game!);
      });
      (['p1', 'p2'] as const).forEach((seat, i) => {
        state = relocate(state, [products[i]], zoneIdFor('operations', seat), game!);
        state = relocate(state, [benched(seat, 'Junior QA Tester')], zoneIdFor('ops team', seat), game!);
      });
      const runtime = new LangRuntime(game!, lib, seats);
      const ids = (seat: PlayerId, row: string) => zoneCards(state, zoneIdFor(row, seat)).map((card) => card.id);
      const offered = ontoCandidates(runtime, buttonOf(state, PLAY_DEBUFF)!, state, 'p0');
      expect(offered).toEqual([...ids('p1', 'development team'), ...ids('p2', 'development team'), ...ids('p1', 'ops team'), ...ids('p2', 'ops team')]);
      for (const seat of seats) expect(offered.filter((id) => ids(seat, 'bench').includes(id))).toEqual([]);
      expect(offered.filter((id) => [...ids('p0', 'development team'), ...ids('p0', 'ops team')].includes(id))).toEqual([]);
      expect(offered).toHaveLength(4);
    });

    it('plays a Debuff the auto-player holds on the rival card picked by t, through the page’s view and without it (§20.A)', () => {
      const start = setUp(2, 1);
      const seats = seatsFor(2);
      const S = startPlayerOf(start, seats);
      const O = seats.find((seat) => seat !== S)!;
      const benched = (name: string) => zoneCards(start, zoneIdFor('bench', O)).find((card) => nameOf(card) === name)!.id;
      const burnout = idOf('Burnout');
      const project = idOf('Gig Economy');
      let state = relocate(start, [burnout], zoneIdFor('strategy hand', S), game!);
      state = relocate(state, [project], zoneIdFor('development', O), game!);
      state = putOn(state, [benched('Junior Software Dev'), benched('Junior Hardware Eng')], zoneIdFor('development team', O), project, game!);
      const targets: string[] = [];
      for (const t of [0, 1]) {
        const runs = [false, true].map((throughView) => {
          const { engine, runtime } = createEngine(game!, lib, 2, state);
          playTurn(engine, t, 'researches', keepsTheRules(seats, runtime), (log) => log.some((move) => move.type === PLAY_DEBUFF), runtime, throughView);
          return engine;
        });
        const played = runs[0].getLog().filter((move) => move.type === PLAY_DEBUFF);
        expect(played.map(({ cardId }) => cardId), `turn ${t}`).toEqual([burnout]);
        targets.push(played[0].onto as string);
        expect(runs[1].getLog(), `turn ${t}`).toEqual(runs[0].getLog());
      }
      expect(new Set(targets).size).toBe(2);
    });

    it('plays a TechCrunch Feature the auto-player holds on the product a working Sales Rep pitches, for $2, through the page’s view and without it (§20.A, ruling 23)', () => {
      // The long runs never play a TechCrunch Feature on a product a Sales Rep pitches. Here the seat runs a To-Do List and a Dating App
      // with a working Sales Rep on it, holds a TechCrunch Feature and has $7, so it can pay the Feature's $5 on the To-Do List or its $2
      // on the Dating App (§20.A, ruling 23). Without the pitched pick it would go by t among the products it can pay for, the To-Do List
      // on t = 0, so that turn's Dating App is the Sales Rep's doing; on t = 1, where t picks the Dating App too, the seat still pays $2.
      const seats = seatsFor(2);
      const [toDo, dating, salesRep, feature] = ['To-Do List', 'Dating App', 'Sales Rep', 'TechCrunch Feature'].map(idOf);
      const arranged = arrange({ 'operations-p0': [toDo, dating], [zoneIdFor('strategy hand', 'p0')]: [feature] }).getState();
      const state = putOn(arranged, [salesRep], zoneIdFor('ops team', 'p0'), dating, game!);
      for (const t of [0, 1]) {
        const runs = [false, true].map((throughView) => {
          const { engine, runtime } = createEngine(game!, lib, 2, state);
          const rules = keepsTheRules(seats, runtime);
          const keys: string[] = [];
          playTurn(engine, t, 'researches', (before, move, after) => {
            rules(before, move, after);
            keys.push(...happenings(runtime, before, move, after));
          }, (log) => log.some((move) => move.type === PLAY_TO_PRODUCT), runtime, throughView);
          return { log: engine.getLog(), keys, end: engine.getState() };
        });
        const { log, keys, end } = runs[0];
        expect(log, `turn ${t}`).toEqual([{ type: PLAY_TO_PRODUCT, by: 'p0', cardId: feature, onto: dating }]);
        expect(keys.filter((key) => [TECHCRUNCH_5, TECHCRUNCH_2].includes(key)), `turn ${t}`).toEqual([TECHCRUNCH_2]);
        expect(counterOf(end, 'capital', 'p0'), `turn ${t}: the capital left of $7`).toBe(5);
        expect(tokenOn(cardById(end, dating)!, 'hype'), `turn ${t}: the Dating App's Hype`).toBe(1);
        expect(runs[1].log, `turn ${t}`).toEqual(log);
      }
    });

    it('takes Toxic Personality’s cube only from a colour its team makes, so no made value or supply is ever below 0 (§20.A, the slice’s R1)', () => {
      const start = setUp(2, 1);
      const seats = seatsFor(2);
      const S = startPlayerOf(start, seats);
      const runtime = new LangRuntime(game!, lib, seats);
      const benched = (name: string) => zoneCards(start, zoneIdFor('bench', S)).find((card) => nameOf(card) === name)!.id;
      const toxic = (state: GameState, id: string) => changeCard(state, id, { 'toxic personality': 1 }, game!);
      const onProject = (projectName: string, staff: string[], toxicId: string) => {
        const project = idOf(projectName);
        let state = relocate(start, [project], zoneIdFor('development', S), game!);
        state = toxic(putOn(state, staff, zoneIdFor('development team', S), project, game!), toxicId);
        return MADE.map((name) => runtime.workedValue(state, project, name));
      };
      expect(onProject('Smart Lock', [idOf('Engineer')], idOf('Engineer'))).toEqual([0, 2, 0]);
      expect(onProject('Dating App', [benched('Junior QA Tester'), idOf('QA Engineer')], idOf('QA Engineer'))).toEqual([0, 0, 1]);
      expect(onProject('To-Do List', [idOf('Junior PM')], idOf('Junior PM'))).toEqual([0, 0, 0]);
      // A team that makes Blue or Red and cleans Bugs loses the one cube, not a cleaning too.
      expect(onProject('Dating App', [benched('Junior Software Dev'), benched('Junior QA Tester')], benched('Junior QA Tester'))).toEqual([0, 0, 1]);
      expect(onProject('Smart Lock', [benched('Junior Hardware Eng'), benched('Junior QA Tester')], benched('Junior QA Tester'))).toEqual([0, 0, 1]);
      const supplies = (staff: string[]) => {
        const state = toxic(relocate(start, staff, zoneIdFor('ops team', S), game!), idOf('Junior PM'));
        return ['blue supply', 'red supply', 'qa supply'].map((name) => runtime.playerValue(state, S, name));
      };
      expect(supplies([benched('Junior Software Dev'), benched('Junior QA Tester'), idOf('Junior PM')])).toEqual([0, 0, 1]);
      expect(supplies([benched('Junior Hardware Eng'), benched('Junior QA Tester'), idOf('Junior PM')])).toEqual([0, 0, 1]);
      // A pool that makes nothing loses nothing.
      expect(supplies([idOf('Junior PM')])).toEqual([0, 0, 0]);
    });

    it('claims First Mover Advantage, Platform Power and Full Stack Founder at one auto-player Launch of a Tier 2 card, which promotes its Junior PM, through the page’s view and without it (§11.F, §12.5, §20.G)', () => {
      // The long runs never Launch a Tier 2 card while First Mover Advantage is revealed; only 2 players seed 4 runs 3 Tags, where Setup
      // reveals no Platform Power, and only 2 and 4 players seed 4 run both sides of the stack (plan 5-2b's P8). So this arranges a
      // complete Neobank, Crypto (§20.C.2), led by the Architect with a Junior PM on it, beside a Smart Lock, IoT, and a Health Tracker,
      // Data: its Launch is a Tier 2 Launch with 3 Tags online, on both sides. The agency row holds Seniors, and the other three
      // Milestones are in the box, as Setup would leave them.
      const seats = seatsFor(2);
      const [neobank, lock, health, architect, juniorPm] = ['Neobank', 'Smart Lock', 'Health Tracker', 'Architect', 'Junior PM'].map(idOf);
      const arranged = arrange({
        'development-p0': [neobank], 'operations-p0': [lock, health], 'backlog-p0': [],
        'milestone-row': ['First Mover Advantage', 'Platform Power', 'Full Stack Founder'].map(idOf),
        'agency-row': ['Veteran', 'Diva', 'Engineer', 'Fixer'].map(idOf),
      }).getState();
      const boxed = relocate(arranged, ['Talent Magnet', 'Revenue Leader', 'Clean Launch'].map(idOf), 'box', game!);
      const state = changeCard(putOn(boxed, [architect, juniorPm], 'development-team-p0', neobank, game!), neobank, { 'blue cubes': 10 }, game!);
      const runs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, state);
        const rules = keepsTheRules(seats, runtime);
        const keys: string[] = [];
        playTurn(engine, 1, 'researches', (before, move, after) => {
          rules(before, move, after);
          keys.push(...happenings(runtime, before, move, after));
        }, (log) => log.some((move) => move.type === LAUNCH), runtime, throughView);
        return { log: engine.getLog(), keys, claimed: namesIn(engine.getState(), 'milestones-p0') };
      });
      const won = ['First Mover Advantage', 'Full Stack Founder', 'Platform Power'];
      expect(runs[0].log.at(-1)).toEqual({ type: LAUNCH, by: 'p0', cardId: neobank });
      expect([...runs[0].claimed].sort()).toEqual(won);
      expect(runs[0].keys.filter((key) => key.startsWith(`${CLAIMED}: `)).sort()).toEqual(won.map((name) => `${CLAIMED}: ${name}`));
      expect(runs[0].keys.filter((key) => key === PROMOTED)).toEqual([PROMOTED]);
      expect(cardById(state, juniorPm)!.data?.badged === true).toBe(false);
      expect(runs[1].log).toEqual(runs[0].log);
    });

    it.each([
      ['Leadership Masterclass', 0, 'Junior QA Tester'], ['Leadership Masterclass', 1, 'QA Engineer'], ['Leadership Masterclass', 2, 'Sales Rep'],
      ['QA Certification', 1, 'QA Engineer'], ['Agile Workshop', 0, 'Junior PM'],
    ] as const)('plays its %s at t = %i on the %s the target rule picks, through the page’s view and without it (§20.A)', (name, t, target) => {
      // The long runs spend their QA Certifications and Masterclasses on Juniors, which are nearly always there to take them (a
      // Masterclass reaches a QA Engineer once, at 4 players seed 4), and a seat seldom holds a Junior PM as an Agile Workshop comes
      // (no long run plays one; plan 5-2b's P8). Here the seat's bench holds a Junior QA Tester, a QA Engineer, a Sales Rep and a
      // Junior PM: a Masterclass goes on the kind `t % 3` names, and a QA Certification or an Agile Workshop on the one target it fits.
      const seats = seatsFor(2);
      const start = setUp(2, 1);
      const S = startPlayerOf(start, seats);
      const benched = (junior: string) => zoneCards(start, zoneIdFor('bench', S)).find((card) => nameOf(card) === junior)!.id;
      let state = relocate(start, [idOf(name)], zoneIdFor('strategy hand', S), game!);
      state = relocate(state, [benched('Junior Software Dev'), benched('Junior Hardware Eng')], 'box', game!);
      state = relocate(state, ['QA Engineer', 'Sales Rep', 'Junior PM'].map(idOf), zoneIdFor('bench', S), game!);
      const runs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, state);
        const rules = keepsTheRules(seats, runtime);
        const keys: string[] = [];
        playTurn(engine, t, 'researches', (before, move, after) => {
          rules(before, move, after);
          keys.push(...happenings(runtime, before, move, after));
        }, (log) => log.some((move) => move.type === PLAY_TRAINING), runtime, throughView);
        return { log: engine.getLog(), keys };
      });
      const played = runs[0].log.filter((move) => move.type === PLAY_TRAINING);
      expect(played.map((move) => nameOf(cardById(state, move.onto as string)!))).toEqual([target]);
      const kind = target.startsWith('Junior ') && target !== 'Junior PM' ? 'Junior' : target;
      expect(runs[0].keys.filter((key) => key.startsWith(`${TRAINING_ON}: `))).toEqual([`${TRAINING_ON}: ${name} on a ${kind}`]);
      expect(runs[1].log).toEqual(runs[0].log);
    });

    it('claims Talent Magnet and Clean Launch at an auto-player Launch that graduates a second Junior to 3 XP, and Revenue Leader at its next Income of $10, through the page’s view and without it (§12.5, §20.G, ruling 25)', () => {
      // Setup reveals no Talent Magnet at seeds 1 to 5, and an Income in the long runs comes to $10 only at 2 and 4 players seed 4, so
      // this arranges both, as their examples do: the seat's bench holds a Junior Software Dev of 3 XP, and its complete Smart Lock a
      // Junior Hardware Eng of 2 XP with 1 Pending token, which the Launch graduates to 3 (§11.B.2). Then its App Store, Trading Bot and
      // Smart Lock earn $4, $4 and $2 (§20.C.1), which the Architect's Blue and the Junior's Red run. The other three Milestones go back
      // to the box.
      const seats = seatsFor(2);
      const start = setUp(2, 1);
      const S = startPlayerOf(start, seats);
      const benched = (junior: string) => zoneCards(start, zoneIdFor('bench', S)).find((card) => nameOf(card) === junior)!.id;
      const [software, hardware] = ['Junior Software Dev', 'Junior Hardware Eng'].map(benched);
      const [lock, store, bot, architect] = ['Smart Lock', 'App Store', 'Trading Bot', 'Architect'].map(idOf);
      const won = ['Clean Launch', 'Revenue Leader', 'Talent Magnet'];
      let state = relocate(start, MILESTONES.filter((name) => !won.includes(name)).map(idOf), 'box', game!);
      state = relocate(state, won.map(idOf), 'milestone-row', game!);
      state = changeCard(state, software, { 'blue xp tokens': 3 }, game!);
      state = changeCard(relocate(state, [lock], zoneIdFor('development', S), game!), lock, { 'blue cubes': 1, 'red cubes': 5 }, game!);
      state = putOn(state, [hardware], zoneIdFor('development team', S), lock, game!);
      state = changeCard(state, hardware, { 'red xp tokens': 2, 'pending red': 1 }, game!);
      state = relocate(relocate(state, [store, bot], zoneIdFor('operations', S), game!), [architect], zoneIdFor('ops team', S), game!);
      const runs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, state);
        const rules = keepsTheRules(seats, runtime);
        /** Each move that claimed Milestones, with their names sorted: the order within one move is the cards' order, not the rules'. */
        const claims: [string, string[]][] = [];
        const watch: Watch = (before, move, after) => {
          rules(before, move, after);
          const keys = happenings(runtime, before, move, after).filter((key) => key.startsWith(`${CLAIMED}: `));
          if (keys.length > 0) claims.push([move.type, keys.map((key) => key.slice(`${CLAIMED}: `.length)).sort()]);
        };
        // The seat's turn, which Launches the Smart Lock with its second action; its rival's; and its own up to the salaries it pays.
        playTurn(engine, 1, 'researches', watch, () => false, runtime, throughView);
        playTurn(engine, 2, 'researches', watch, () => false, runtime, throughView);
        playTurn(engine, 3, 'researches', watch, (log) => log.at(-1)?.type === PAY_SALARIES, runtime, throughView);
        return { log: engine.getLog(), claims, end: engine.getState(), runtime };
      });
      const { log, claims, end, runtime } = runs[0];
      expect(log.at(-1)).toEqual({ type: PAY_SALARIES, by: S });
      expect(runtime.playerValue(end, S, 'operational revenue')).toBe(10);
      expect(namesIn(end, zoneIdFor('milestones', S)).sort()).toEqual(won);
      // Talent Magnet and Clean Launch at the Launch, and Revenue Leader in the move that reached the next Income.
      expect(claims).toEqual([[LAUNCH, ['Clean Launch', 'Talent Magnet']], [log.at(-2)!.type, ['Revenue Leader']]]);
      expect(runs[1].log).toEqual(log);
    });

    it('claims Platform Power only once the seat has chosen which products its ops check runs, through the page’s view and without it (§5, the slice’s R1)', () => {
      // As the example of the undecided Offline set has it: the ops check brings the To-Do List and the Health Tracker back online, so
      // the seat runs four Tags but has only the Architect's 3 Blue for 4 Blue of maintenance (§20.C.1). On t = 1 the seat switches off
      // its last online product short of Blue, the Health Tracker, and confirms with three Tags online.
      const seats = seatsFor(2);
      const [dating, wallet, todo, health] = ['Dating App', 'Mobile Wallet', 'To-Do List', 'Health Tracker'].map(idOf);
      // The two offline products join after `arrange`, whose engine would otherwise claim Platform Power as it settles their Tags.
      const arranged = arrange({
        'operations-p1': [dating, wallet], 'ops-team-p1': [idOf('Architect')],
        'milestone-row': ['Platform Power', 'Clean Launch', 'Talent Magnet'].map(idOf),
      }).getState();
      let state = relocate(arranged, ['First Mover Advantage', 'Revenue Leader', 'Full Stack Founder'].map(idOf), 'box', game!);
      state = relocate(state, [todo, health], 'operations-p1', game!);
      state = changeCard(changeCard(state, todo, { offline: true }, game!), health, { offline: true }, game!);
      const runs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, state);
        const rules = keepsTheRules(seats, runtime);
        const claimed: Move[] = [];
        const choosing: boolean[] = [];
        const watch: Watch = (before, move, after) => {
          rules(before, move, after);
          if (happenings(runtime, before, move, after).includes(`${CLAIMED}: Platform Power`)) claimed.push(move);
          if (before.turn?.phase === 'ops check') choosing.push(playerFact(before, 'p1', CHOOSING) === true);
        };
        play(engine, { type: END_ACTIONS, by: 'p0' }, watch);
        playTurn(engine, 1, 'researches', watch, (log) => log.some((move) => move.type === CONFIRM_ONLINE), runtime, throughView);
        return { log: engine.getLog(), claimed, choosing };
      });
      expect(runs[0].log.slice(1)).toEqual([
        { type: SWITCH_OFF, by: 'p1', cardId: health }, { type: CONFIRM_ONLINE, by: 'p1' },
      ]);
      // The seat chose with all four Tags online, and claimed Platform Power only with the confirm.
      expect(runs[0].choosing).toEqual([true, true]);
      expect(runs[0].claimed).toEqual([{ type: CONFIRM_ONLINE, by: 'p1' }]);
      expect(runs[1].log).toEqual(runs[0].log);
    });

    it('rebuilds and takes back Platform Power claimed at the last check, after the final Ops check brings a product back online (Review Focus: §12, the slice’s R1)', () => {
      // As the example of the final Ops check that brings a product back online: the Market Crash is out, so p1's turn ends the round,
      // and p0's step brings its To-Do List back online, which the Architect's 3 Blue runs with the Dating App and the Mobile Wallet
      // (§20.C.1). The last check then finds p0 with three Tags online and claims Platform Power before the score (§12). The To-Do List
      // joins after `arrange`, whose engine would otherwise claim Platform Power as it settles its Tag.
      const seats = seatsFor(2);
      const [dating, wallet, todo] = ['Dating App', 'Mobile Wallet', 'To-Do List'].map(idOf);
      const arranged = arrange({
        'crash-pile': [idOf('Market Crash')], 'operations-p0': [dating, wallet], 'ops-team-p0': [idOf('Architect')],
        'milestone-row': ['Platform Power', 'Clean Launch', 'Talent Magnet'].map(idOf), 'backlog-p0': [], 'backlog-p1': [],
      }).getState();
      let state = relocate(arranged, ['First Mover Advantage', 'Revenue Leader', 'Full Stack Founder'].map(idOf), 'box', game!);
      state = changeCard(relocate(state, [todo], 'operations-p0', game!), todo, { offline: true }, game!);
      const { engine, runtime } = createEngine(game!, lib, 2, state);
      const rules = keepsTheRules(seats, runtime);
      const keys: string[] = [];
      const watch: Watch = (was, move, now) => {
        rules(was, move, now);
        keys.push(...happenings(runtime, was, move, now));
      };
      play(engine, { type: END_ACTIONS, by: 'p0' }, watch);
      const before = engine.getState();
      expect(before.turn).toMatchObject({ current: 'p1', phase: 'actions' });
      play(engine, { type: END_ACTIONS, by: 'p1' }, watch);
      const end = engine.getState();
      expect(namesIn(end, 'milestones-p0')).toEqual(['Platform Power']);
      expect(keys.filter((key) => key.startsWith(CLAIMED))).toEqual([`${CLAIMED}: Platform Power`, CLAIMED_AT_THE_LAST_CHECK]);
      // p0 scores 1 for its 7 capital, 5 + 2 + 1 of val and the Milestone's 10 (§12, §20.G).
      expect(end.result).toMatchObject({ scores: { p0: 19, p1: scoreOf(end, 'p1') } });
      expect(scoreOf(end, 'p0')).toBe(19);
      // The log alone rebuilds the claim, and undo gives the state before the round's last move.
      const replayed = createEngine(game!, lib, 2, state).engine;
      replayed.loadLog([...engine.getLog()]);
      expect(replayed.getState()).toEqual(end);
      engine.undo();
      expect(engine.getState()).toEqual(before);
    });

    it('runs the Growth Hacker on a product through its owner’s Engine and its next Income: ops QA cleaning a Bug by itself, his Bug added, and his $3 earned less a Bug, through the page’s view and without it (§5, §20.B)', () => {
      // The long runs seldom put the Growth Hacker on a product (plan 5-2b's P7), so this sits him on the seat's Dating App, with a
      // Junior Software Dev for its Blue and another for the Mobile Wallet's. His Bug comes as each of the seat's turns ends, in the move
      // that ran its Engine, whose ops QA cleans first and would clean it in that same move: so the Mobile Wallet holds a Bug already,
      // which the seat's Junior QA Tester cleans while the Dating App has none. The Architect, whose Clean Code would stop the Bug, goes
      // to the box, so that no hire brings him to the ops team.
      const seats = seatsFor(2);
      const start = setUp(2, 1);
      const S = startPlayerOf(start, seats);
      const O = seats.find((seat) => seat !== S)!;
      const juniorOf = (seat: PlayerId, junior: string) => zoneCards(start, zoneIdFor('bench', seat)).find((card) => nameOf(card) === junior)!.id;
      const [dating, wallet, growthHacker, architect] = ['Dating App', 'Mobile Wallet', 'Growth Hacker', 'Architect'].map(idOf);
      // The Design Sprints go to the box too: 5 Seed cards would send the seat's turn through backlog cleanup, whose last discard ends
      // the turn after the Engine's move.
      const sprints = start.cards.filter((card) => nameOf(card) === 'Design Sprint').map((card) => card.id);
      let state = relocate(relocate(start, [architect, ...sprints], 'box', game!), [dating, wallet], zoneIdFor('operations', S), game!);
      state = changeCard(state, wallet, { bugs: 1 }, game!);
      const staff = [juniorOf(S, 'Junior Software Dev'), juniorOf(O, 'Junior Software Dev'), juniorOf(S, 'Junior QA Tester')];
      state = putOn(relocate(state, staff, zoneIdFor('ops team', S), game!), [growthHacker], zoneIdFor('ops team', S), dating, game!);
      const paths = [BUG_ON_PRODUCT, GROWTH_HACKER_EARNED, EARNING_LESS, CLEANED_IN_OPS];
      const runs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, state);
        const rules = keepsTheRules(seats, runtime);
        const seen: string[][] = [];
        const watch: Watch = (before, move, after) => {
          rules(before, move, after);
          const keys = happenings(runtime, before, move, after).filter((key) => paths.includes(key));
          if (keys.length > 0) seen.push(keys.sort());
        };
        // The seat's turn, its rival's, and its own again, up to the salaries it pays at Income.
        playTurn(engine, 0, 'researches', watch, () => false, runtime, throughView);
        playTurn(engine, 1, 'researches', watch, () => false, runtime, throughView);
        playTurn(engine, 2, 'researches', watch, (log) => log.at(-1)?.type === PAY_SALARIES, runtime, throughView);
        return { log: engine.getLog(), seen };
      });
      // The Engine's move cleans the Mobile Wallet's Bug, and the turn's end adds one to the Dating App; the next Income earns it less.
      expect(runs[0].seen).toEqual([[CLEANED_IN_OPS, BUG_ON_PRODUCT].sort(), [EARNING_LESS, GROWTH_HACKER_EARNED].sort()]);
      expect(runs[1].log).toEqual(runs[0].log);
    });

    it('tries the Diva’s reassign from the ops team before each later action, which her Ego refuses at no cost, through the page’s view and without it (§6, §20.B.1)', () => {
      // The long runs seldom see the Diva in the ops team (plan 5-2b's P7): here she is in it, with a project to go to.
      const seats = seatsFor(2);
      const [diva, dating] = ['Diva', 'Dating App'].map(idOf);
      const state = arrange({ 'ops-team-p0': [diva], 'development-p0': [dating], 'backlog-p0': [] }).getState();
      const runs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, state);
        const refusals: Move[] = [];
        const refused: Refused = (_state, move, reason) => {
          if (REASSIGNS.includes(move.type) && reason === EGO_REFUSAL) refusals.push(move);
        };
        playTurn(engine, 0, 'researches', keepsTheRules(seats, runtime), () => false, runtime, throughView, refused);
        return { log: engine.getLog(), refusals };
      });
      const reassign = { type: REASSIGN_FROM_OPS, by: 'p0', cardId: diva, onto: dating };
      expect(runs[0].refusals.length).toBeGreaterThan(0);
      expect(runs[0].refusals).toEqual(runs[0].refusals.map(() => reassign));
      expect(runs[1].refusals).toEqual(runs[0].refusals);
      expect(runs[1].log).toEqual(runs[0].log);
    });

    it('pays an experienced Junior’s salary of $1 at Income, through the page’s view and without it (§3, §5, §11)', () => {
      // A Junior keeps one Pending token at each Launch, so it reaches 2 XP only at its second, which the long runs seldom see (plan
      // 5-2b's P7). Here the next seat's ops team holds a Junior Software Dev of 2 XP: its salary, $0 printed, is $1 (§20.B.2).
      const seats = seatsFor(2);
      const start = setUp(2, 1);
      const S = startPlayerOf(start, seats);
      const O = seats.find((seat) => seat !== S)!;
      const software = zoneCards(start, zoneIdFor('bench', O)).find((card) => nameOf(card) === 'Junior Software Dev')!.id;
      const state = changeCard(relocate(start, [software], zoneIdFor('ops team', O), game!), software, { 'blue xp tokens': 2 }, game!);
      const runs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, state);
        const rules = keepsTheRules(seats, runtime);
        const paid: string[] = [];
        const watch: Watch = (before, move, after) => {
          rules(before, move, after);
          paid.push(...happenings(runtime, before, move, after).filter((key) => key === EXPERIENCED_PAID));
        };
        play(engine, { type: END_ACTIONS, by: S }, watch);
        const capital = counterOf(engine.getState(), 'capital', O);
        playTurn(engine, 0, 'researches', watch, (log) => log.at(-1)?.type === PAY_SALARIES, runtime, throughView);
        return { log: engine.getLog(), paid, spent: capital - counterOf(engine.getState(), 'capital', O) };
      });
      expect(runs[0].log.at(-1)).toEqual({ type: PAY_SALARIES, by: O });
      expect(runs[0].paid).toEqual([EXPERIENCED_PAID]);
      expect(runs[0].spent).toBe(1);
      expect(runs[1].log).toEqual(runs[0].log);
    });

    it('hires the agency row’s first Senior it can pay for to the ops team when it can’t go to a product, through the page’s view and without it (§13.A, ruling 20)', () => {
      // The retuned long runs never make this hire (D3). Here t = 8, so the turn's third action, a = 2, is action 1 at place 2 with
      // ⌊t / 9⌋ even, and the seat runs a To-Do List, which the Veteran doesn't attach to, with $13, no project and an empty bench.
      const seats = seatsFor(2);
      const veteran = idOf('Veteran');
      const arranged = arrange({
        'operations-p0': [idOf('To-Do List')], 'backlog-p0': [], 'development-p0': [], 'bench-p0': [],
        'agency-row': ['Veteran', 'Architect', 'Engineer', 'Fixer'].map(idOf),
      }).getState();
      const state = setCounter(arranged, 'capital', 'p0', 13);
      const logs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, state);
        playTurn(engine, 8, 'drafts', keepsTheRules(seats, runtime), (log) => log.some((move) => move.type === HIRE_AGENCY_TO_OPS), runtime,
          throughView);
        return engine.getLog();
      });
      expect(logs[0].map((move) => move.type)).toEqual([DRAFT_GROWTH, RECRUITS[2], HIRE_AGENCY_TO_OPS]);
      expect(logs[0].at(-1)).toEqual({ type: HIRE_AGENCY_TO_OPS, by: 'p0', cardId: veteran });
      expect(logs[1]).toEqual(logs[0]);
    });

    it('discards the bench’s first card at the bench cleanup once it ends its actions with more than 5 there, through the page’s view and without it (rulings 10 and 12)', () => {
      // The retuned long runs never overflow a bench (D3). Here the bench holds 6 cards and the seat has no project, so at t = 2 it
      // drafts its idea, recruits twice and ends its actions with 8 on the bench.
      const seats = seatsFor(2);
      const bench = ['Hacker', 'Architect', 'Veteran', 'Engineer', 'Fixer', 'HR Manager'].map(idOf);
      const state = arrange({ 'bench-p0': bench, 'backlog-p0': [], 'development-p0': [] }).getState();
      const logs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, state);
        playTurn(engine, 2, 'drafts', keepsTheRules(seats, runtime), (log) => log.some((move) => move.type === DISCARD_BENCH), runtime,
          throughView);
        return engine.getLog();
      });
      expect(logs[0].map((move) => move.type)).toEqual([DRAFT_GROWTH, RECRUITS[0], RECRUITS[1], END_ACTIONS, DISCARD_BENCH]);
      expect(logs[0].at(-1)).toEqual({ type: DISCARD_BENCH, by: 'p0', cardId: bench[0] });
      expect(logs[1]).toEqual(logs[0]);
    });

    it('hires the card a Layoff found onto its first product while it has one, through the page’s view and without it (§13.B, §20.B)', () => {
      // The long runs seldom see a Layoff find a card the seat can pay for while it has a product (plan 5-2b's P7): here it lays off its
      // HR Manager and finds a Sales Rep, which attaches, so it goes on the Dating App. The agency row is full, so no refill draws it.
      const seats = seatsFor(2);
      const [dating, hr, salesRep] = ['Dating App', 'HR Manager', 'Sales Rep'].map(idOf);
      const arranged = arrange({
        'operations-p0': [dating], 'bench-p0': [hr], 'talent-deck': [salesRep],
        'agency-row': ['Veteran', 'Diva', 'Engineer', 'Fixer'].map(idOf),
      });
      play(arranged, { type: LAY_OFF, by: 'p0', cardIds: [hr] }, () => {});
      const state = arranged.getState();
      expect(namesIn(state, 'scouting-p0')).toEqual(['Sales Rep']);
      const logs = [false, true].map((throughView) => {
        const { engine, runtime } = createEngine(game!, lib, 2, state);
        playTurn(engine, 0, 'researches', keepsTheRules(seats, runtime), (log) => log.length > 0, runtime, throughView);
        return engine.getLog();
      });
      expect(logs[0]).toEqual([{ type: HIRE_SCOUTED_TO_PRODUCT, by: 'p0', cardIds: [salesRep], onto: dating }]);
      expect(logs[1]).toEqual(logs[0]);
    });

    it('hires the card a Layoff found to the ops team while it has a product, by the product’s button when ⌊t / 9⌋ is odd, through the page’s view and without it (§13.B)', () => {
      // No accepted example presses the scouting's hire to the ops team (the rules' only example of it refuses it), and the long runs
      // make it in one game (5 players seed 3). Here the seat runs a To-Do List, lays off its HR Manager and finds the Veteran, who
      // doesn't attach, for $6 of its $7; the agency row is full, so no refill draws him. While the seat has a product its hire goes to
      // the ops team first: on t = 0 by the ops team's button, and on t = 9, ⌊t / 9⌋ odd, by the button of its first product, which
      // sends a card that doesn't attach to the ops team as well (see `sourcing`).
      const seats = seatsFor(2);
      const [toDo, hr, veteran] = ['To-Do List', 'HR Manager', 'Veteran'].map(idOf);
      const arranged = arrange({
        'operations-p0': [toDo], 'bench-p0': [hr], 'talent-deck': [veteran],
        'agency-row': ['Architect', 'Diva', 'Engineer', 'Fixer'].map(idOf),
      });
      play(arranged, { type: LAY_OFF, by: 'p0', cardIds: [hr] }, () => {});
      const state = arranged.getState();
      expect(namesIn(state, 'scouting-p0')).toEqual(['Veteran']);
      const hires: [number, Move][] = [
        [0, { type: HIRE_SCOUTED_TO_OPS, by: 'p0', cardIds: [veteran] }],
        [9, { type: HIRE_SCOUTED_TO_PRODUCT, by: 'p0', cardIds: [veteran], onto: toDo }],
      ];
      for (const [t, hire] of hires) {
        const runs = [false, true].map((throughView) => {
          const { engine, runtime } = createEngine(game!, lib, 2, state);
          playTurn(engine, t, 'researches', keepsTheRules(seats, runtime), (log) => log.length > 0, runtime, throughView);
          return engine;
        });
        expect(runs[0].getLog(), `turn ${t}`).toEqual([hire]);
        expect(namesIn(runs[0].getState(), 'ops-team-p0'), `turn ${t}: the ops team`).toEqual(['Veteran']);
        expect(runs[1].getLog(), `turn ${t}`).toEqual(runs[0].getLog());
      }
    });

    it('names the provider it pays a License to by t when two rivals provide the Tag, through the page’s view and without it (§6, ruling 25)', () => {
      // At 3 players two rivals may provide the Tag a Greenlight lacks, which the long runs seldom see (plan 5-2b's P7): here one runs a
      // Tech Blog and the other a VPN Service, both Platform, and the seat greenlights a Server Farm, which requires it (§20.C).
      const seats = seatsFor(3);
      const start = setUp(3, 1);
      const S = startPlayerOf(start, seats);
      const [A, B] = seats.filter((seat) => seat !== S);
      const [blog, vpn, farm] = ['Tech Blog', 'VPN Service', 'Server Farm'].map(idOf);
      let state = relocate(start, zoneCards(start, zoneIdFor('backlog', S)).map((card) => card.id), 'box', game!);
      state = relocate(relocate(state, [blog], zoneIdFor('operations', A), game!), [vpn], zoneIdFor('operations', B), game!);
      state = relocate(state, [farm], zoneIdFor('backlog', S), game!);
      const payees = new Set<string>();
      for (const t of [0, 1]) {
        const runs = [false, true].map((throughView) => {
          const { engine, runtime } = createEngine(game!, lib, 3, state);
          const rules = keepsTheRules(seats, runtime);
          const keys: string[] = [];
          playTurn(engine, t, 'researches', (before, move, after) => {
            rules(before, move, after);
            keys.push(...happenings(runtime, before, move, after));
          }, (log) => log.some((move) => move.type === GREENLIGHT), runtime, throughView);
          return { greenlight: engine.getLog().find((move) => move.type === GREENLIGHT)!, keys };
        });
        const { greenlight, keys } = runs[0];
        expect(greenlight, `turn ${t}`).toMatchObject({ type: GREENLIGHT, by: S, cardId: farm });
        expect(keys.filter((key) => key === LICENSE_TO_A_CHOSEN_PROVIDER), `turn ${t}`).toEqual([LICENSE_TO_A_CHOSEN_PROVIDER]);
        expect(runs[1].greenlight, `turn ${t}`).toEqual(greenlight);
        payees.add(answersOf(greenlight)[0] as string);
      }
      // Choice 0 is answered with option t % 2, so the two turns pay each rival once.
      expect([...payees].sort()).toEqual([A, B].sort());
    });
  });

  it('adds exactly one Crunch Time cube to a project that isn’t Stalled, Blue while the project still needs Blue, else Red (§20.D, suwa’s apply_crunch_time_bonus)', () => {
    // A Dating App (6 Blue) unstaffed; a Smart Lock (1 Blue / 5 Red) with its Blue on the track; a Cloud Storage (4 / 4) with 3 Blue on the
    // track and a Junior Software Dev making the fourth; a Neobank with no lead, Stalled (§3, §20.C).
    const seats = seatsFor(2);
    const start = setUp(2, 1);
    const S = startPlayerOf(start, seats);
    const [dating, lock, cloud, neobank, crunch] = ['Dating App', 'Smart Lock', 'Cloud Storage', 'Neobank', 'Crunch Time'].map(idOf);
    const junior = zoneCards(start, zoneIdFor('bench', S)).find((card) => nameOf(card) === 'Junior Software Dev')!.id;
    let state = relocate(start, zoneCards(start, 'event-in-play').map((card) => card.id), 'event-discard', game!);
    state = relocate(state, [crunch], 'event-in-play', game!);
    state = relocate(state, [dating, lock, cloud, neobank], zoneIdFor('development', S), game!);
    state = changeCard(changeCard(state, lock, { 'blue cubes': 1 }, game!), cloud, { 'blue cubes': 3 }, game!);
    state = putOn(state, [junior], zoneIdFor('development team', S), cloud, game!);
    const { runtime } = createEngine(game!, lib, 2, state);
    const projects = [dating, lock, cloud, neobank];
    const values = (at: GameState, names: string[]) => projects.map((id) => names.map((name) => runtime.workedValue(at, id, name)));
    expect(values(state, ['blue added', 'red added'])).toEqual([[1, 0], [0, 1], [1, 1], [0, 0]]);
    const ended = relocate(state, [crunch], 'event-discard', game!);
    expect(values(ended, ['blue added', 'red added'])).toEqual(values(ended, ['blue made', 'red made']));
  });

  it('lets go of the staff the auto-player picks when a Regulation Audit finds it short, through the page’s view and without it (§20.D, the spec’s call)', () => {
    // O's Engineer ($2) and Diva ($1) on a project draw salaries. S ends its actions; O's Income pays them from its $4; O ends its actions
    // at once, and its turn passing back to S starts round 2: the Audit, on top of the event deck, asks O $2 for them of its $1 (§20.B,
    // §20.D 6). Only the seat last in turn order meets the reveal with the Board it left: S's turn would pass to O's Income first.
    const seats = seatsFor(2);
    const start = setUp(2, 1);
    const S = startPlayerOf(start, seats);
    const O = seats.find((seat) => seat !== S)!;
    const [audit, dating, engineer, diva] = ['Regulation Audit', 'Dating App', 'Engineer', 'Diva'].map(idOf);
    let state = relocate(start, [audit], 'event-deck', game!);
    state = relocate(state, [dating], zoneIdFor('development', O), game!);
    state = putOn(state, [engineer, diva], zoneIdFor('development team', O), dating, game!);
    state = setCounter(state, 'capital', O, 4);
    const firsts = [0, 1].map((t) => [false, true].map((throughView) => {
      const { engine, runtime } = createEngine(game!, lib, 2, state);
      const watch = keepsTheRules(seats, runtime);
      play(engine, { type: END_ACTIONS, by: S }, watch);
      playTurn(engine, t, 'researches', watch, (log) => log.at(-1)?.type === PAY_SALARIES, runtime, throughView);
      play(engine, { type: END_ACTIONS, by: O }, watch);
      const lets: string[] = [];
      const seen: Watch = (before, move, after) => {
        watch(before, move, after);
        if (before.turn!.phase === EVENT_CHECK && Object.values(LET_GO).includes(move.type)) lets.push(move.cardId as string);
      };
      playTurn(engine, t, 'researches', seen, () => false, runtime, throughView);
      return { log: engine.getLog(), lets, end: engine.getState() };
    }));
    for (const [without, through] of firsts) expect(through.log).toEqual(without.log);
    expect(firsts[0][0].lets[0]).not.toBe(firsts[1][0].lets[0]);
    for (const [run] of firsts) {
      expect(roundStepsOf(run.end)).toBeNull();
      expect(counterOf(run.end, 'capital', O)).toBe(0);
    }
  });
});

describe('what the view says the rules work out', () => {
  it('stands each need in for its cost, each bandwidth for its output and the portfolio points for the val, and shows the overworked flags, Burned out and Pitched, then Stalled, Efficient in ops, Experienced and Practised, the flags that change a value', () => {
    expect(standIns(game!)).toEqual({
      'blue output': 'blue bandwidth', 'red output': 'red bandwidth', 'blue cost': 'blue need', 'red cost': 'red need',
      val: 'portfolio points',
    });
    // The overworked flags (Workaholic's, and its colours), Burned out and Pitched, then Stalled, Efficient in ops, Experienced and
    // Practised: every line of each reads only the card and the cards on it: its Workaholic and Burnout counts, its skill and its mode,
    // the Sales Rep on it and whether that one is onboarding, its Tier, its need, the leads on it, its trait, its zone, its xp and its
    // training xp. A lead's Badge and Skill lines read the card alone too (`it is a card whose …`), so Stalled still shows. Decaying
    // reads its owner's ops team, so it is not shown.
    expect(shownFlags(game!)).toEqual(['overworked', 'overworked in blue', 'overworked in red', 'overworked in qa', 'burned out', 'pitched', 'stalled', 'efficient in ops', 'experienced', 'practised']);
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

describe('what the page shows of slice 5', () => {
  it('labels Managing, Agile, Coaching, the pending Badge and Attaching, the flags a press reads, and reads the pending Badge through the project it is on', () => {
    // In the rules' order, each read by a button's Then: lines. Managing: Brainstorm's third card. Agile: the Onboarding token an Agile PM
    // spares at Assign and Reassign (§11.E.3). Coaching: the working Veteran's Mentor at Launch (§20). The pending Badge: made Permanent
    // at Launch (§11.E.2). Attaching: the Growth Hacker and the Sales Rep, which a hire, an Assign and Launch put on a product (§20.B).
    expect(pressFlags(game!)).toEqual(['managing', 'agile', 'egotistic', 'coaching', 'pending badge', 'attaching']);
    // The pending Badge reads the project's Tier: a seat that can't see that project is not told it.
    expect(holderFlags(game!)).toEqual(['pending badge']);
  });

  it('(guard) shows the same flags beside a value, and the same values about each player, as before (Call 5)', () => {
    expect(shownFlags(game!)).toEqual(['overworked', 'overworked in blue', 'overworked in red', 'overworked in qa', 'burned out', 'pitched', 'stalled', 'efficient in ops', 'experienced', 'practised']);
    // Operational revenue reads its owner's ops team through each product's rev, and active tags is a count: neither is shown.
    expect(shownPlayerValues(game!)).toEqual([
      'blue supply', 'red supply', 'blue demand', 'red demand', 'blue load', 'red load', 'qa supply', 'bug load', 'qa spent',
    ]);
  });

  it('gives every seat a Junior PM’s Synergy and pending Badge on a Tier 2 project, a Senior PM’s Agile Synergy, and the project Stalled (3 players, seed 1)', () => {
    // §20.B: the Junior PM is Synergy and the Senior PM Agile Synergy. §20.C.2: the Neobank is Tier 2, and with no Senior on it to lead
    // its 10 Blue, it is Stalled. §11.E.2: a Junior PM on a Tier 2 or 3 project carries a pending Badge, and a badged one none. §11.E.3:
    // Agile is a Senior PM, or any badged PM, at work. Ruling 8: an onboarding PM gives nothing.
    const start = setUp(3, 1);
    const seats = seatsFor(3);
    const S = startPlayerOf(start, seats);
    const N = seats[(seats.indexOf(S) + 1) % seats.length];
    const [neobank, juniorPm, seniorPm] = ['Neobank', 'Junior PM', 'Senior PM'].map(idOf);
    let state = relocate(start, [neobank], zoneIdFor('development', N), game!);
    state = putOn(state, [juniorPm], zoneIdFor('development team', N), neobank, game!);
    state = relocate(state, [seniorPm], zoneIdFor('ops team', N), game!);
    /** The flags each seat is given of `card` in `table`, seat by seat. */
    const flagsOf = (table: GameState, card: string) => {
      const { engine, runtime } = createEngine(game!, lib, 3, table);
      return seats.map((viewer) => seatExtras(engine, runtime, engine.getState(), viewer).worked?.[card]?.flags);
    };
    const everySeat = (flags: string[]) => seats.map(() => flags);
    expect(flagsOf(state, juniorPm)).toEqual(everySeat(['managing', 'pending badge']));
    expect(flagsOf(state, seniorPm)).toEqual(everySeat(['managing', 'agile']));
    expect(flagsOf(state, neobank)).toEqual(everySeat(['stalled']));
    expect(flagsOf(changeCard(state, juniorPm, { onboarding: true }, game!), juniorPm)).toEqual(everySeat(['pending badge']));
    expect(flagsOf(changeCard(state, juniorPm, { badged: true }, game!), juniorPm)).toEqual(everySeat(['managing', 'agile']));
    // Review Focus: with the Neobank in N's backlog, which only N sees, its Tier is hidden from the rivals, and so is the pending Badge
    // read from it. The rules never put a team on a backlog card; slice 9's face-down projects will hide a Tier so.
    const hidden = putOn(relocate(start, [neobank], zoneIdFor('backlog', N), game!), [juniorPm], zoneIdFor('development team', N), neobank, game!);
    expect(flagsOf(hidden, juniorPm)).toEqual(seats.map((viewer) => (viewer === N ? ['managing', 'pending badge'] : ['managing'])));
  });
});

describe('Review Focus: a reshuffle no seat can follow (plan 6-1, Task 6)', () => {
  it('leaves no id a seat saw face up in the strategy discard in the strategy deck, a Strategy Hand or a Brainstorm, at 2 players seed 4', () => {
    const seats = seatsFor(2);
    const def = tableDefFor(game!, seats);
    const hidden = new Set(['strategy-deck', ...seats.flatMap((seat) => [zoneIdFor('strategy hand', seat), zoneIdFor('brainstorm', seat)])]);
    let reshuffles = 0;
    let checked = 0;
    playGame(2, 4, (before, move, after) => {
      if (![BRAINSTORM, BRAINSTORM_FLUSHING].includes(move.type)) return;
      // A Brainstorm leaves the discard empty only when it shuffled the discard, and the cards it flushed there, into the deck (§15.C).
      const flushed = (move.cardIds ?? []) as string[];
      if (zoneCards(after, 'strategy-discard').length > 0 || zoneCards(before, 'strategy-discard').length + flushed.length === 0) return;
      reshuffles += 1;
      for (const viewer of seats) {
        // The cards it flushed count as seen too: the presser held them face up, and the press named them going to the public discard.
        const seen = new Set([...deriveScene(def, { cards: before.cards }, viewer).cards
          .filter((c) => c.zoneId === 'strategy-discard' && c.faceKey !== HIDDEN_FACE_KEY).map((c) => c.id), ...flushed]);
        checked += seen.size;
        const followed = deriveScene(def, { cards: after.cards }, viewer).cards.filter((c) => hidden.has(c.zoneId) && seen.has(c.id));
        expect(followed.map((c) => `${c.id} in ${c.zoneId}`), `${viewer} after ${move.by}'s move ${move.type}`).toEqual([]);
      }
    });
    expect(reshuffles).toBe(1);
    expect(checked).toBeGreaterThan(0);
  }, 120_000);
});

describe('what the view reads in the centre', () => {
  it('reads the Event in play as every seat sees it, labels no flag that tests it, and names no new press flag (plan 6-3, Task 1)', () => {
    expect(inPlayZones(game!)).toEqual(['event in play']);
    expect(pressFlags(game!)).toEqual(['managing', 'agile', 'egotistic', 'coaching', 'pending badge', 'attaching']);
    expect(holderFlags(game!)).toEqual(['pending badge']);
    const eventFlags = ['bubbly', 'legacy', 'open source boosted', 'hackathon boosted', 'server crashed', 'logjammed', 'chip short',
      'course priced', 'show priced', 'blue covered', 'crunching blue', 'crunching red', 'crunched', 'acting once', 'angel funded',
      'past tier 1', 'taxed'];
    expect(shownFlags(game!).filter((flag) => eventFlags.includes(flag))).toEqual([]);
  });
});
